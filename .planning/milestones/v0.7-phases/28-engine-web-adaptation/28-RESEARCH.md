# Phase 28: Engine Web Adaptation - Research

**Researched:** 2025-07-22
**Domain:** Browser runtime adaptation, IndexedDB storage, environment detection
**Confidence:** HIGH

## Summary

Phase 28 decouples the game engine from Electron dependencies so it runs in a standalone browser. The codebase has two Electron-specific coupling points: (1) SaveManager, which uses `window.ipcRenderer.invoke()` for all 8 public methods, and (2) the `asset://` custom protocol used as basePath for resource loading. Everything else — ConfigManager, ReadHistory, AudioManager, ScriptEngine — already uses standard browser APIs (localStorage, HTML5 Audio, fetch, DOM).

The work splits cleanly into three concerns: **environment detection** (new `assetPath.js` module), **Web save system** (new `WebSaveManager` class using IndexedDB), and **asset path parameterization** (replacing 5 hardcoded `asset://` references with `resolvePath()` calls, and wiring basePath from the new module). The `main.js` init flow needs refactoring from 2-path (Electron/preview) to 3-path (Electron/preview/Web) detection.

**Primary recommendation:** Implement in three sequential waves — (1) assetPath.js with environment detection, (2) WebSaveManager with IndexedDB backend, (3) main.js init refactor and hardcoded path replacements — validating each wave works before proceeding.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 使用 IndexedDB 作为 Web 模式的存档后端，保留 108 个存档槽 + 1 个快速存档，与 Electron 版完全一致的槽位数量
- **D-02:** Web 版存档不包含缩略图（`capture-screenshot` 是 Electron 专有 IPC），存档槽仅显示文字预览信息（场景名、对话文字、时间戳）
- **D-03:** 功能检测优先 — `window.ipcRenderer` 存在 = Electron 模式，不存在则检查 iframe 上下文
- **D-04:** iframe 内通过 postMessage 握手区分编辑器预览和 itch.io 嵌入：收到 `{type: 'start'}` 消息 = 编辑器预览模式（SaveManager 禁用），超时或无握手 = itch.io/Web 独立模式（WebSaveManager 启用）
- **D-05:** 新建 `src/engine/assetPath.js` 模块，作为环境检测和资源路径解析的单一真相源
- **D-06:** 导出 `BASE_PATH` 常量 — Electron/预览模式为 `asset://`，Web 模式为 `./assets/`。BackgroundLayer/CharacterLayer/AudioManager 的 basePath 属性在引擎初始化时统一赋值为 `BASE_PATH`，内部代码不动
- **D-07:** 导出 `resolvePath(relativePath)` 函数 — 处理散落的硬编码 `asset://` 引用。自动跳过已经是完整 URL 的路径（http/https/data:）。用于 SettingsScreen.js（2处）、TitleScreen.js（2处）、SaveLoadScreen.js（1处）的硬编码替换
- **D-08:** TitleScreen.js 中现有的前缀判断逻辑（`asset://`/`http`/`/game/`）在改用 `resolvePath` 后可以清理，由 resolvePath 内部统一处理

### Agent's Discretion
- WebSaveManager 的内部实现细节（IndexedDB schema 设计、事务管理等）
- 环境检测的具体超时时长（postMessage 握手等待时间）
- resolvePath 函数的 edge case 处理（空字符串、undefined 等）

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WEBRT-01 | 导出的游戏可在浏览器中完整运行（对话、选项、角色、背景、音频均正常） | assetPath.js BASE_PATH + resolvePath handles all resource paths; ScriptEngine.load() uses fetch (already browser-compatible); Audio/Background/Character layers use basePath parameter |
| WEBRT-02 | 玩家可在浏览器中存档/读档（WebSaveManager + IndexedDB 后端） | WebSaveManager implements identical 8-method async API using IndexedDB; 108 slots + quicksave; no thumbnails per D-02 |
| WEBRT-03 | 设置页和标题页的自定义背景/图片在浏览器中正常显示（basePath 参数化） | resolvePath() replaces 5 hardcoded asset:// references in TitleScreen (2), SettingsScreen (2), SaveLoadScreen (1) |
| WEBRT-04 | 导出的游戏在 itch.io iframe 中可正常运行（区分编辑器预览 vs 外部嵌入） | postMessage handshake with timeout distinguishes editor preview from itch.io iframe per D-04 |
| WEBRT-05 | 引擎自动检测运行环境（Electron/Preview/Web），选择对应的 SaveManager 和 basePath | assetPath.js detects environment via feature detection (D-03) + postMessage handshake (D-04); main.js conditionally instantiates SaveManager or WebSaveManager |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript migration
- **Code style**: 2 spaces, single quotes, semicolons always, PascalCase classes, camelCase methods, underscore-prefix for private
- **Named exports only**: `export class ClassName` pattern, no default exports
- **File-level JSDoc**: Every module starts with a JSDoc block describing purpose
- **Engine modules**: Vanilla JS classes in `src/engine/`, UI components in `src/ui/`
- **Error handling**: `{ success: boolean, error?: string }` return objects for async operations; console.error with `[ModuleName]` prefix
- **Import style**: Explicit `.js` extensions, relative paths, ESM exclusively

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | ^6.3.0 | Build tool | Already configured for dual HTML entry (game + editor) |
| Electron | ^41.0.4 | Desktop shell | Existing — Web adaptation makes engine independent of it |

### Browser APIs Used (Zero Dependencies)
| API | Purpose | Browser Support |
|-----|---------|-----------------|
| IndexedDB | WebSaveManager storage backend | All modern browsers, 50MB+ quota |
| localStorage | ConfigManager + ReadHistory (already used) | All browsers, 5-10MB quota |
| fetch | ScriptEngine.load() (already used) | All modern browsers |
| HTML5 Audio | AudioManager (already used) | All modern browsers |
| FontFace | fontLoader (already used) | All modern browsers |
| postMessage | Editor preview handshake (already used) | All browsers |

**Installation:** No new dependencies. Zero npm packages needed.

## Architecture Patterns

### New/Modified File Map
```
src/
├── engine/
│   ├── assetPath.js        # NEW — environment detection + BASE_PATH + resolvePath()
│   ├── WebSaveManager.js   # NEW — IndexedDB save backend (108 slots + quicksave)
│   ├── SaveManager.js      # UNCHANGED — Electron IPC backend
│   ├── AudioManager.js     # UNCHANGED — already accepts basePath
│   ├── ConfigManager.js    # UNCHANGED — already uses localStorage
│   ├── ReadHistory.js      # UNCHANGED — already uses localStorage
│   ├── fontLoader.js       # UNCHANGED — already accepts baseUrl param
│   └── ScriptEngine.js     # UNCHANGED — fetch() is browser-native
├── ui/
│   ├── TitleScreen.js      # MODIFIED — import resolvePath, replace 2 hardcoded paths
│   ├── SettingsScreen.js   # MODIFIED — import resolvePath, replace 2 hardcoded paths
│   ├── SaveLoadScreen.js   # MODIFIED — import resolvePath, replace 1 hardcoded path
│   ├── BackgroundLayer.js  # UNCHANGED — basePath set at init time
│   └── CharacterLayer.js   # UNCHANGED — basePath set at init time
├── main.js                 # MODIFIED — 3-way init, conditional SaveManager, basePath from assetPath
└── style.css               # UNCHANGED
```

### Pattern 1: Environment Detection (assetPath.js)
**What:** Single-truth-source module that detects runtime environment and exports path constants
**When to use:** At module load time (top-level const evaluation) and during init

```javascript
// src/engine/assetPath.js

/**
 * assetPath — Environment detection and asset path resolution.
 * Single source of truth for runtime mode and resource path prefix.
 *
 * Environments:
 *   'electron' — window.ipcRenderer exists (Electron main window)
 *   'preview'  — iframe receiving postMessage {type:'start'} from editor
 *   'web'      — standalone browser (itch.io, static server, etc.)
 */

/** @type {'electron'|'preview'|'web'} Runtime environment */
export let ENV = 'web'; // Default, refined during init

/** @type {string} Base path prefix for all asset URLs */
export let BASE_PATH = './assets/'; // Default for web

/**
 * Detect environment and set BASE_PATH.
 * Called once from main.js before any rendering.
 * @returns {Promise<'electron'|'preview'|'web'>}
 */
export async function detectEnvironment() {
  // D-03: Feature detection — ipcRenderer = Electron
  if (window.ipcRenderer) {
    ENV = 'electron';
    BASE_PATH = 'asset://';
    return ENV;
  }

  // D-04: iframe context — distinguish editor preview vs itch.io
  if (window.parent !== window) {
    const isEditor = await _waitForEditorHandshake();
    if (isEditor) {
      ENV = 'preview';
      BASE_PATH = 'asset://';
      return ENV;
    }
  }

  // Default: standalone web
  ENV = 'web';
  BASE_PATH = './assets/';
  return ENV;
}

/**
 * Resolve any asset path to a fully-qualified URL.
 * Handles: bare relative paths, asset:// prefixed, /game/ prefixed, full URLs.
 * @param {string} path — raw path from script data or layout config
 * @returns {string} resolved URL
 */
export function resolvePath(path) {
  if (!path) return '';
  // Full URLs — pass through
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  // Strip known Electron/dev prefixes, re-apply current BASE_PATH
  if (path.startsWith('asset://')) {
    return BASE_PATH + path.slice(8); // 'asset://'.length === 8
  }
  if (path.startsWith('/game/')) {
    return BASE_PATH + path.slice(6); // '/game/'.length === 6
  }
  // Bare relative path
  return BASE_PATH + path;
}

/**
 * Wait for editor postMessage handshake with timeout.
 * @returns {Promise<boolean>} true if editor preview detected
 * @private
 */
function _waitForEditorHandshake() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(false); // Timeout — not editor preview
    }, 200); // Agent's discretion: 200ms timeout

    function handler(e) {
      if (e.data?.type === 'start') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(true);
      }
    }
    window.addEventListener('message', handler);
  });
}
```

**Critical note on the handshake pattern:** The current `initPreview()` listens for `{type:'start'}` to begin playback. The detection handshake needs to coexist with this — the `start` message must still be processed for its payload. The planner should ensure the detection only peeks at whether the message arrives, and the full start handler still runs afterward.

### Pattern 2: WebSaveManager (IndexedDB Backend)
**What:** Drop-in replacement for SaveManager with identical async API, backed by IndexedDB
**When to use:** When ENV === 'web' (standalone browser)

```javascript
// src/engine/WebSaveManager.js

/**
 * WebSaveManager — IndexedDB-based save/load for standalone Web mode.
 *
 * Mirrors the SaveManager public API (8 async methods) but uses IndexedDB
 * instead of Electron IPC. 108 regular slots + 1 quicksave slot.
 * No thumbnails in Web mode (D-02).
 */
export class WebSaveManager {
  constructor() {
    /** @type {number} Maximum save slots */
    this.slotCount = 108;
    /** @type {IDBDatabase|null} */
    this._db = null;
    /** @type {number} Kept for API compat with SaveManager */
    this._lastMigrationCount = 0;
  }

  // ─── Database initialization ───────────────────────────

  /**
   * Open (or create) the IndexedDB database.
   * @returns {Promise<IDBDatabase>}
   * @private
   */
  async _getDb() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('galgame-saves', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'slot' });
        }
      };
      request.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // ─── Public API (mirrors SaveManager) ──────────────────

  async save(slot, state, previewText, thumbnail = null) {
    // thumbnail ignored in Web mode (D-02)
    const plainState = JSON.parse(JSON.stringify(state));
    if (plainState.history?.length > 50) {
      plainState.history = plainState.history.slice(-50);
    }
    try {
      const db = await this._getDb();
      const record = {
        slot,
        state: plainState,
        previewText: previewText || '',
        sceneName: plainState.currentScene || '',
        timestamp: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        hasThumbnail: false, // Always false in Web mode
      };
      await this._put(db, 'saves', record);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async load(slot) { /* IDB get by slot key */ }
  async delete(slot) { /* IDB delete by slot key */ }
  async getAllSlots() { /* IDB getAll, return metadata array */ }
  async hasAnySave() { /* getAllSlots().length > 0 */ }
  async quickSave(state, previewText, thumbnail = null) { /* save with slot='quick' */ }
  async quickLoad() { /* load with slot='quick' */ }
  async hasQuickSave() { /* check if slot='quick' exists */ }

  // ─── IndexedDB helpers ─────────────────────────────────

  /** @private Wrap IDB put in a Promise */
  _put(db, storeName, record) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }
}
```

### Pattern 3: Conditional Init in main.js
**What:** Three-way initialization flow replacing current two-path detection
**When to use:** At engine startup (bottom of main.js)

Current code (lines 887-892):
```javascript
if (window.parent !== window) {
  initPreview();
} else {
  init();
}
```

New pattern:
```javascript
import { detectEnvironment, ENV, BASE_PATH } from './engine/assetPath.js';
import { WebSaveManager } from './engine/WebSaveManager.js';

// At top-level, SaveManager is declared but assigned conditionally:
// const saveManager = new SaveManager(); → replaced with conditional

async function bootstrap() {
  const env = await detectEnvironment();
  
  // Set basePath on all components from assetPath module
  background.basePath = BASE_PATH;
  characters.basePath = BASE_PATH;
  audio.basePath = BASE_PATH;
  
  if (env === 'electron') {
    init();           // Existing Electron init
  } else if (env === 'preview') {
    initPreview();    // Existing preview init (saves disabled)
  } else {
    initWeb();        // New Web standalone init
  }
}

bootstrap();
```

**Important:** The SaveManager instantiation at line 38 (`const saveManager = new SaveManager()`) must become conditional. Since it's used by SaveLoadScreen constructor (line 48), the refactor needs to either:
- Defer SaveLoadScreen construction until after detection, OR
- Use a `let saveManager` that's assigned after detection, with SaveLoadScreen receiving it later

Recommended approach: declare `let saveManager;` at top, assign in bootstrap, pass to SaveLoadScreen via a setter or reconstruct. The simpler option is to construct both conditionally inside bootstrap.

### Pattern 4: Script Loading Path in Web Mode
**What:** `engine.load()` path differs between Electron and Web
**Current:** `await engine.load('/game/script.json')` — Electron serves this via Vite dev server
**Web mode:** `await engine.load('./script.json')` — script.json sits alongside index.html in the export bundle

This path should also be derived from environment:
```javascript
const scriptPath = ENV === 'web' ? './script.json' : '/game/script.json';
await engine.load(scriptPath);
```

### Anti-Patterns to Avoid
- **Don't create a base class/interface for SaveManager and WebSaveManager.** They share the same duck-typed API. Adding a formal interface in plain JS adds complexity with no type-safety benefit. Just ensure both implement the same 8 methods.
- **Don't lazy-detect environment on every call.** Detect once at startup, store in module-level `ENV` and `BASE_PATH`. The environment doesn't change during a session.
- **Don't modify BackgroundLayer/CharacterLayer/AudioManager internals.** Their basePath is already a simple property — just assign it from BASE_PATH at construction time.
- **Don't use `navigator.userAgent` for environment detection.** Feature detection (`window.ipcRenderer`) is reliable and future-proof per D-03.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async key-value storage | Custom file-based storage or complex localStorage wrapper | IndexedDB (browser built-in) | 50MB+ quota, async by nature, handles structured data, survives page reloads |
| Promise wrapper for IndexedDB | Complex abstraction layer (idb, dexie, localforage) | Simple 3-method wrapper (_getDb, _put, _get) | Only need put/get/delete/getAll — 4 operations. A full library is overkill for this scope |
| Environment detection framework | Complex UA sniffing or multi-step detection | Single `window.ipcRenderer` check + iframe check | Two boolean conditions cover all three environments |

**Key insight:** The existing SaveManager API is already the abstraction. WebSaveManager just provides a different backend behind the same 8 methods. The engine code that calls save/load never needs to know which backend it's using.

## Common Pitfalls

### Pitfall 1: Module-Level Side Effects with Async Detection
**What goes wrong:** Environment detection is async (postMessage handshake), but module-level code like `const saveManager = new SaveManager()` runs synchronously at import time
**Why it happens:** ES modules evaluate top-level code immediately; you can't await at the top level of a non-top-level-await module
**How to avoid:** Move all construction into an async `bootstrap()` function. The current `init()`/`initPreview()` already does this partially — extend the pattern to cover SaveManager construction and basePath assignment
**Warning signs:** `SaveManager` constructed before environment is known; basePath still `/game/` when Web mode renders

### Pitfall 2: PostMessage Race Condition in Preview Detection
**What goes wrong:** The editor sends `{type: 'start'}` before the engine's message listener is attached, so the handshake times out and engine incorrectly enters Web mode inside the editor
**Why it happens:** The editor iframe may send `start` very fast after iframe load, and the async detection adds a small delay
**How to avoid:** The current preview protocol already handles this — the engine sends `{type: 'ready'}` first, and the editor waits for `ready` before sending `start`. Preserve this handshake. The detection should listen for `start` with the existing `ready` → `start` flow intact. Critical: the `ready` message must be sent BEFORE starting the handshake timeout
**Warning signs:** Preview works intermittently; sometimes game launches in Web mode inside the editor

### Pitfall 3: IndexedDB Schema Versioning on Upgrade
**What goes wrong:** Changing the IndexedDB schema after users already have saves causes `onupgradeneeded` to fire, potentially losing data if not handled properly
**Why it happens:** IndexedDB version number determines schema migration
**How to avoid:** Start with version 1, design the schema to be forward-compatible (single `saves` object store with `slot` keyPath). Don't add indices unless needed. If future versions need schema changes, increment version and add migration logic in `onupgradeneeded`
**Warning signs:** Console errors about blocked/aborted IDB transactions after update

### Pitfall 4: QuickSave Slot Key Type Mismatch
**What goes wrong:** Regular slots use numeric keys (1-108), but quicksave needs a distinct key. Mixing `number` and `string` keys in the same object store can cause lookup failures
**Why it happens:** IndexedDB is type-sensitive for keys — `'quick'` !== any number
**How to avoid:** Use string `'quick'` for the quicksave slot key. Since regular slots use numbers 1-108, there's no collision. The keyPath `slot` accepts any type. Just ensure `getAllSlots()` filters out the quicksave record when listing regular slots
**Warning signs:** Quicksave appears as slot "NaN" in the grid; getAllSlots returns 109 items

### Pitfall 5: Forgetting script.json Load Path Difference
**What goes wrong:** Web mode tries to `fetch('/game/script.json')` which returns 404 on a static server
**Why it happens:** `/game/` is a Vite dev server route, not a real directory in the export bundle
**How to avoid:** In Web mode, load from `./script.json` (relative to index.html). In Electron mode, keep `/game/script.json`. The path should be derived from ENV
**Warning signs:** "Failed to load script: 404" error in browser console

### Pitfall 6: SaveLoadScreen Thumbnail Rendering in Web Mode
**What goes wrong:** SaveLoadScreen tries to render `<img src="asset://saves/slot_001.jpg">` for occupied slots, which 404s in Web mode
**Why it happens:** `slotData.hasThumbnail` from Electron saves is `true`, but Web saves always have `hasThumbnail: false`
**How to avoid:** WebSaveManager always sets `hasThumbnail: false` (per D-02). The SaveLoadScreen already conditionally renders the `<img>` only when `slotData.hasThumbnail` is true, so Web saves naturally skip it. However, the `asset://saves/...` path should still use `resolvePath()` for robustness in mixed-environment scenarios (e.g., Electron saves viewed in Web mode — unlikely but defensive)
**Warning signs:** Broken image icons in save slots

### Pitfall 7: Font Loading URL in Web Mode
**What goes wrong:** `loadAllFonts(fonts, 'asset://')` fails because `asset://` protocol doesn't exist in browser
**Why it happens:** The font loader explicitly receives `'asset://'` as baseUrl in `init()` (line 745)
**How to avoid:** Pass `BASE_PATH` instead of hardcoded `'asset://'` to `loadAllFonts()`
**Warning signs:** Console errors `Failed to load font: ...`, all text renders in default system font

## Code Examples

### IndexedDB Promise Wrapper (Verified Pattern)
```javascript
// Standard pattern for wrapping IndexedDB operations in Promises
// Source: MDN IndexedDB API documentation

/** Open database with schema creation */
function openDb(name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = onUpgrade;
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Put a record (insert or update) */
function putRecord(db, storeName, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get a record by key */
function getRecord(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/** Delete a record by key */
function deleteRecord(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all records */
function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

### resolvePath Usage in TitleScreen (Before/After)
```javascript
// BEFORE (TitleScreen.js line 73):
const bgUrl = bgPath.startsWith('asset://') || bgPath.startsWith('http') || bgPath.startsWith('/game/')
  ? bgPath
  : `/game/${bgPath}`;

// AFTER:
import { resolvePath } from '../engine/assetPath.js';
const bgUrl = resolvePath(bgPath);
```

### Conditional SaveManager Construction
```javascript
// In bootstrap() after detectEnvironment():
import { SaveManager } from './engine/SaveManager.js';
import { WebSaveManager } from './engine/WebSaveManager.js';
import { ENV } from './engine/assetPath.js';

let saveManager;
if (ENV === 'electron') {
  saveManager = new SaveManager();
} else if (ENV === 'web') {
  saveManager = new WebSaveManager();
} else {
  // Preview mode — save operations are no-ops
  saveManager = null; // SaveLoadScreen checks are guarded
}
```

### SettingsScreen asset:// Replacement
```javascript
// BEFORE (line 72):
bgLayer.style.backgroundImage = `url("asset://${safeBg}")`;

// AFTER:
import { resolvePath } from '../engine/assetPath.js';
bgLayer.style.backgroundImage = `url("${resolvePath(safeBg)}")`;

// BEFORE (line 214):
img.src = `asset://${safeSrc}`;

// AFTER:
img.src = resolvePath(safeSrc);
```

## Existing Code Compatibility Analysis

### Already Web-Compatible (No Changes Needed)
| Module | Why It Works |
|--------|-------------|
| ConfigManager | Pure localStorage — `get()`, `set()`, `save()` use only browser APIs |
| ReadHistory | Pure localStorage with Set serialization — zero Electron deps |
| ScriptEngine | `fetch()` for loading, pure JS state machine, EventEmitter is custom |
| DialogueBox | Pure DOM manipulation, no external deps |
| ChoiceMenu | Pure DOM manipulation |
| GameMenu | Pure DOM manipulation |
| QuickActionBar | Pure DOM manipulation |
| BacklogScreen | Pure DOM manipulation + Audio |
| ThemeManager | Pure DOM style manipulation |

### Needs basePath Assignment Only (No Code Changes)
| Module | Current basePath | Source of basePath |
|--------|-----------------|-------------------|
| BackgroundLayer | Constructor param, default `/game/` | Set from main.js at init |
| CharacterLayer | Constructor param, default `/game/` | Set from main.js at init |
| AudioManager | Constructor param, default `/game/` | Set from main.js at init |

### Needs `resolvePath` Import (Small Edits)
| Module | Lines | Change |
|--------|-------|--------|
| TitleScreen.js | 73, 158 | Replace prefix-check logic with `resolvePath()` call |
| SettingsScreen.js | 72, 214 | Replace `asset://${...}` with `resolvePath(...)` |
| SaveLoadScreen.js | 159 | Replace `asset://saves/...` with `resolvePath(...)` |

### Needs Major Refactor
| Module | Change |
|--------|--------|
| main.js | 3-way detection, conditional SaveManager, basePath from assetPath, script.json path |

## Electron-Only Features — Graceful Degradation

Features that only work in Electron but must not crash in Web mode:

| Feature | Current Guard | Web Behavior |
|---------|--------------|-------------|
| `capture-screenshot` | `if (!window.ipcRenderer) return null` (line 110) | Returns null — save slots show no thumbnail ✓ |
| `set-window-mode` | `if (window.ipcRenderer)` (line 152) | Skipped entirely — no window mode changes ✓ |
| Window mode settings UI | Rendered in settings screen | Buttons have no effect in Web (harmless) — agent may choose to hide them |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage saves (8 slots) | File system saves (108 slots via IPC) | Phase 19 (v0.5) | WebSaveManager reverts to client-side storage but with IndexedDB for capacity |
| Single basePath hardcoded | basePath as constructor param | Phase 14 (v0.3) | Already parameterized — just needs correct value per environment |
| `asset://` custom protocol | Still current in Electron | Phase 3A | Web mode replaces with `./assets/` prefix |

## Open Questions

1. **Preview mode SaveManager: null or no-op stub?**
   - What we know: In preview mode (editor iframe), saves are currently disabled because SaveManager uses IPC which isn't available. The current code doesn't crash because `initPreview()` never calls save methods.
   - What's unclear: Should `saveManager` be `null` in preview mode (requiring null checks), or a no-op stub that returns `{ success: false }` for all operations?
   - Recommendation: Use a no-op stub or keep existing SaveManager (which already guards with `if (!window.ipcRenderer) return 0` in `_checkMigration`). The SaveLoadScreen is never shown in preview mode since there's no game menu. A null assignment is simplest.

2. **Window mode settings visibility in Web mode**
   - What we know: The default settings screen renders "窗口模式" (windowed/fullscreen/borderless) buttons. These use `ipcRenderer.invoke('set-window-mode')` which is guarded.
   - What's unclear: Should these buttons be hidden in Web mode, or left visible but non-functional?
   - Recommendation: Leave as-is for Phase 28. The buttons are harmless (config saves to localStorage but has no effect). Future phase could add `document.fullscreenElement` API support for Web fullscreen.

3. **Script.json load path: `./script.json` vs `./assets/script.json`**
   - What we know: In the export bundle (Phase 30), script.json placement is TBD. Currently in Electron, it's loaded from `/game/script.json`.
   - What's unclear: Where exactly will script.json sit in the export bundle — alongside index.html or inside assets/?
   - Recommendation: Use `./script.json` (alongside index.html). This is the simplest deployment. Phase 30 will place it there. Make this configurable via a constant in assetPath.js so Phase 30 can adjust if needed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — no test framework configured in project |
| Config file | none |
| Quick run command | Manual browser testing |
| Full suite command | Manual browser testing |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WEBRT-01 | Engine runs in browser (dialogue, choices, characters, background, audio) | manual | Open index.html in browser, verify title screen renders with BGM | ❌ Manual |
| WEBRT-02 | Save/load works via IndexedDB | manual | Save to slot, reload page, load from slot, verify state restored | ❌ Manual |
| WEBRT-03 | Custom backgrounds/images display via basePath | manual | Verify title screen and settings screen custom images render | ❌ Manual |
| WEBRT-04 | Works in iframe (itch.io) | manual | Embed in iframe on different origin, verify game plays | ❌ Manual |
| WEBRT-05 | Auto-detects environment correctly | manual | Test in Electron (ipcRenderer present), editor preview (iframe), browser (standalone) | ❌ Manual |

### Sampling Rate
- **Per task commit:** Manual verification — open a test project in both Electron and browser
- **Per wave merge:** Full manual walkthrough of all 5 success criteria
- **Phase gate:** All 5 success criteria verified in plain browser before `/gsd-verify-work`

### Wave 0 Gaps
- No test framework exists and none is needed for this phase — all requirements involve runtime browser behavior that requires manual verification
- A simple test HTML page could be created to load the engine in standalone mode for manual testing, but this is Phase 30's concern (the export pipeline produces the deployable bundle)
- **Practical validation approach:** During development, run `npx vite` and access `http://localhost:3000/index.html` — this serves the engine outside of Electron. With a test `script.json` at `/game/script.json` (already served by Vite), the engine should work in browser after Phase 28 changes

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** — Direct reading of all 15+ source files listed in CONTEXT.md canonical references
- **MDN IndexedDB API** — Standard browser API documentation (stable, well-documented)
- **MDN postMessage API** — Standard browser API for cross-origin iframe communication

### Secondary (MEDIUM confidence)
- **IndexedDB storage limits** — Browsers typically grant 50MB+ without user prompt; varies by browser but well above our ~1MB needs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all browser built-ins verified via codebase
- Architecture: HIGH — patterns derived directly from existing codebase analysis (14 source files read)
- Pitfalls: HIGH — identified from actual code paths and integration points in the codebase
- IndexedDB API: HIGH — stable browser API, unchanged for 10+ years

**Research date:** 2025-07-22
**Valid until:** 2025-08-22 (stable domain — no fast-moving dependencies)
