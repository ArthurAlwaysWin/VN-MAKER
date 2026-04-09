# Phase 32: Desktop Game Runtime - Research

**Researched:** 2025-07-15
**Domain:** Electron game runtime — environment detection, IPC save system, window management
**Confidence:** HIGH

## Summary

Phase 32 creates the runtime infrastructure for exported desktop games: a minimal Electron main process (`game-main.js`), a secure preload script (`game-preload.js`), and engine modifications that detect the 'desktop' environment. This phase produces **standalone, testable files** — NOT the export pipeline (Phase 33 consumes these as templates).

The core architectural insight is that the desktop game is a **hybrid environment**: it uses web-style relative paths for asset loading (same as `ENV='web'`) but Electron IPC for saves (same as `ENV='electron'`). This means the engine's `SaveManager.js` works **completely unmodified** — the game's main process implements the same 8 IPC channel names but routes saves to `app.getPath('userData')` instead of the project directory. The only engine-side changes are ~10 lines in `assetPath.js` (add desktop detection before electron check) and ~5 lines in `src/main.js` (handle `env === 'desktop'` in bootstrap).

The game-main.js template (~120 lines) implements: BrowserWindow creation at project-configured resolution, all 8 SaveManager IPC channels with atomic writes, screenshot capture, window mode switching (fullscreen/windowed/borderless), window state persistence (D-02), and crash error handling (D-08). Everything reuses existing patterns from `electron/main.js` with the key difference of save directory being `app.getPath('userData')/GalgameMaker/{sanitized-title}/saves/`.

**Primary recommendation:** Develop game-main.js and game-preload.js as independent files first (in `electron/game/`), extend assetPath.js with 4-way detection, then have Phase 33 embed them as template strings in exportDesktop.js.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 默认以窗口模式启动（使用项目配置的分辨率，默认 1280×720），玩家可在游戏内设置中切换全屏/无边框
- **D-02:** 记住上次窗口状态（位置、大小、窗口模式），存储在 `userData/window-state.json`。启动时用 `screen.getDisplayMatching()` 验证保存位置是否仍在屏幕范围内，若超出则回退到默认居中
- **D-03:** 使用标准系统标题栏（非无框窗口），原生感、无额外拖拽/关闭按钮实现
- **D-04:** 每个导出游戏在 `app.getPath('userData')` 下有独立文件夹，以游戏标题命名。路径格式：`{userData}/GalgameMaker/{游戏名}/saves/`
- **D-05:** 游戏标题中的文件系统非法字符（`:*?"<>|`）统一替换为下划线 `_`
- **D-06:** 不做单实例锁定，允许多开（类 RPGMaker 行为）
- **D-07:** 导出游戏不开放 DevTools，无调试快捷键入口
- **D-08:** 未捕获异常/崩溃时使用 `dialog.showErrorBox()` 显示简单弹窗，同时将错误信息写入 `userData/crash.log`

### Agent's Discretion
- window-state.json 的防抖写入间隔
- crash.log 的具体格式和轮转策略
- game-preload.js 中 IPC channel 白名单的精确列表（参考 editor preload.js）

### Deferred Ideas (OUT OF SCOPE)
- macOS/Linux 平台支持 — v0.9+
- ASAR 打包（代码保护） — v0.9+
- 游戏启动画面/加载动画 — 保持简单，不在 v0.8 范围
- DevTools 隐藏快捷键（制作者调试用） — 可后续版本考虑
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUNTIME-01 | 导出的游戏双击 .exe 独立运行，无需安装任何依赖 | game-main.js uses only Electron built-in modules (app, BrowserWindow, ipcMain, screen, dialog, fs, path). Zero node_modules. `"type": "module"` in generated package.json. |
| RUNTIME-02 | 游戏存档保存到 app.getPath('userData')，跨会话持久化 | game-main.js implements all 8 IPC channels writing to `{userData}/GalgameMaker/{title}/saves/`. SaveManager.js unchanged — same IPC contract. |
| RUNTIME-03 | 导出的游戏支持全屏/窗口/无边框窗口模式切换 | game-main.js `set-window-mode` handler ports exact logic from editor main.js lines 682-703. Engine's settingDefs.js already defines window-mode select component. |
| CUSTOM-03 | 导出游戏窗口尺寸从项目设置读取（默认 1280×720） | game-main.js template accepts width/height params baked in at generation time. Window state persistence (D-02) remembers last-used size. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 41.2.0 | Desktop runtime for exported game | Same major version as editor — guarantees API compatibility |
| Node.js built-in `fs/promises` | — | Save file I/O in game main process | No external deps, atomic write pattern from editor |
| Node.js built-in `path` | — | Cross-platform path resolution | Standard for Electron main process |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `electron` (`screen` module) | 41.2.0 | Window state validation, borderless mode bounds | D-02 monitor validation, borderless display bounds |
| `electron` (`dialog` module) | 41.2.0 | Crash error dialog | D-08 uncaught exception handling |

### No New Dependencies
This phase introduces **zero new npm dependencies**. The game-main.js uses only Electron built-in modules and Node.js standard library. This is a key architectural property — the exported game must run standalone.

## Architecture Patterns

### Recommended File Structure
```
electron/
├── game/
│   ├── main.js          # Game main process (standalone, testable)
│   └── preload.js       # Game preload script (IPC whitelist + __DESKTOP_GAME)
├── main.js              # Editor main process (existing, unchanged)
├── preload.js           # Editor preload (existing, unchanged)
└── exportGame.js        # Web export pipeline (existing, unchanged)

src/
├── engine/
│   ├── assetPath.js     # MODIFIED: 4-way env detection (add 'desktop' before 'electron')
│   ├── SaveManager.js   # UNCHANGED — same IPC contract
│   ├── WebSaveManager.js # UNCHANGED
│   └── ConfigManager.js # UNCHANGED — uses localStorage, works in BrowserWindow
├── main.js              # MODIFIED: handle env='desktop' in bootstrap()
└── ...
```

### Pattern 1: 4-Way Environment Detection
**What:** Extend `assetPath.js` `detectEnvironment()` to detect `window.__DESKTOP_GAME` flag BEFORE the `window.ipcRenderer` check.
**When:** Always — the flag is set by game-preload.js, must be checked before ipcRenderer (which is also present in desktop mode).
**Detection order:**
1. `window.__DESKTOP_GAME === true` → `'desktop'` (new)
2. `window.ipcRenderer` exists → `'electron'` (editor)
3. `window.parent !== window` + handshake → `'preview'`
4. Default → `'web'`

**Example (assetPath.js modification):**
```javascript
export async function detectEnvironment() {
  // Per v0.8 D-01: Check __DESKTOP_GAME first (set by game-preload.js)
  if (window.__DESKTOP_GAME) {
    ENV = 'desktop';
    BASE_PATH = './assets/';
    SCRIPT_PATH = './script.json';
    return 'desktop';
  }

  // Existing checks follow unchanged...
  if (window.ipcRenderer) {
    ENV = 'electron';
    // ...
  }
}
```

**Impact on bootstrap()** in `src/main.js`:
```javascript
// Desktop uses IPC-based SaveManager (same as editor), NOT WebSaveManager
if (env === 'electron' || env === 'desktop') {
  saveManager = new SaveManager();
} else if (env === 'web') {
  saveManager = new WebSaveManager();
}
```

### Pattern 2: Same IPC Contract, Different Storage Backend
**What:** game-main.js implements the exact same IPC channel names as editor's main.js, but routes saves to `app.getPath('userData')` instead of `currentProjectPath`.
**Why:** SaveManager.js calls `window.ipcRenderer.invoke('save-slot', ...)` — it doesn't care whether the main process stores files in the project dir or userData. The contract is identical.

**8 IPC channels to implement:**
| Channel | Editor Behavior | Game Behavior | Key Difference |
|---------|----------------|---------------|----------------|
| `save-slot` | Writes to `{project}/saves/slot_NNN.json` | Writes to `{userData}/GalgameMaker/{title}/saves/slot_NNN.json` | Save directory path |
| `load-slot` | Reads from `{project}/saves/` | Reads from `{userData}/GalgameMaker/{title}/saves/` | Save directory path |
| `delete-slot` | Deletes from `{project}/saves/` | Deletes from `{userData}/GalgameMaker/{title}/saves/` | Save directory path |
| `list-saves` | Lists `{project}/saves/` | Lists `{userData}/GalgameMaker/{title}/saves/` | Save directory path |
| `save-quickslot` | Writes `{project}/saves/quicksave.json` | Writes `{userData}/.../quicksave.json` | Save directory path |
| `load-quickslot` | Reads `{project}/saves/quicksave.json` | Reads `{userData}/.../quicksave.json` | Save directory path |
| `capture-screenshot` | Captures preview/main window | Captures game window | Window reference (simpler) |
| `set-window-mode` | Changes editor window | Changes game window | Window reference (simpler) |

### Pattern 3: Atomic File Writes for Saves
**What:** Write to `.tmp` file → rename over target. Same `atomicWrite()` pattern from editor.
**Why:** Prevents data loss on crash/power loss during save. Already proven in editor main.js line 68-75.

```javascript
async function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  const bak = filePath + '.bak';
  await fs.writeFile(tmp, content, 'utf-8');
  try { await fs.rename(filePath, bak); } catch {}
  await fs.rename(tmp, filePath);
  try { await fs.unlink(bak); } catch {}
}
```

### Pattern 4: Window State Persistence (D-02)
**What:** Save window position, size, and mode to `{userData}/window-state.json`. Restore on launch with monitor bounds validation.
**When:** Every window move/resize (debounced), and on mode change.

**Key logic:**
```javascript
// On launch: restore saved state with bounds validation
function loadWindowState(defaultWidth, defaultHeight) {
  try {
    const raw = fs.readFileSync(windowStatePath, 'utf-8');
    const state = JSON.parse(raw);
    // Validate position is still on a connected display
    const display = screen.getDisplayMatching({
      x: state.x, y: state.y,
      width: state.width, height: state.height,
    });
    const bounds = display.bounds;
    // Check if saved position is within display bounds
    if (state.x >= bounds.x && state.y >= bounds.y &&
        state.x + state.width <= bounds.x + bounds.width &&
        state.y + state.height <= bounds.y + bounds.height) {
      return state;
    }
  } catch {}
  return { width: defaultWidth, height: defaultHeight }; // fallback to defaults
}

// On resize/move: debounce and persist
let saveTimeout;
function scheduleStateSave(win) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const bounds = win.getBounds();
    const state = {
      x: bounds.x, y: bounds.y,
      width: bounds.width, height: bounds.height,
      mode: win.isFullScreen() ? 'fullscreen' : 'windowed',
    };
    fs.writeFileSync(windowStatePath, JSON.stringify(state));
  }, 500); // 500ms debounce — agent discretion
}
```

### Pattern 5: Game-Preload.js Channel Whitelist
**What:** Minimal preload exposing only game-runtime IPC channels + `__DESKTOP_GAME` flag.
**Reference:** Editor preload.js (lines 4-16) — exact same pattern, narrower whitelist.

```javascript
import { ipcRenderer, contextBridge } from 'electron';

const ALLOWED_CHANNELS = [
  'save-slot', 'load-slot', 'delete-slot', 'list-saves',
  'save-quickslot', 'load-quickslot',
  'capture-screenshot', 'set-window-mode',
];

contextBridge.exposeInMainWorld('__DESKTOP_GAME', true);

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...data) => {
    if (!ALLOWED_CHANNELS.includes(channel)) throw new Error(`Blocked IPC channel: ${channel}`);
    return ipcRenderer.invoke(channel, ...data);
  },
});
```

**Note:** No `send` or `on` needed — game runtime only uses `invoke` (request-response). No `webUtils` needed — game doesn't upload files.

### Pattern 6: Save Path Construction (D-04, D-05)
**What:** Each game gets its own saves directory under `app.getPath('userData')`.
**Path format:** `{userData}/GalgameMaker/{sanitized-title}/saves/`

```javascript
function sanitizeTitle(title) {
  return title.replace(/[<>:"|?*]/g, '_').trim() || 'Untitled';
}

function getSavesDir(gameTitle) {
  return path.join(
    app.getPath('userData'),
    'GalgameMaker',
    sanitizeTitle(gameTitle),
    'saves'
  );
}
```

**Important:** The game title is baked into game-main.js at export time (not read from script.json at runtime). This is the same approach as the window title and resolution.

### Anti-Patterns to Avoid
- **Don't create a DesktopSaveManager class:** The existing `SaveManager.js` works unmodified. The IPC contract is the interface. Implementing different storage on the main process side is the correct pattern.
- **Don't use `asset://` protocol in game:** `win.loadFile()` makes relative paths work for `fetch('./assets/...')`. Custom protocol adds complexity with zero benefit (ARCHITECTURE.md anti-pattern).
- **Don't check `currentProjectPath` in game-main.js:** Editor IPC handlers guard against `!currentProjectPath`. Game has no concept of "current project" — the saves dir is determined by the baked-in game title.
- **Don't use `require('electron')` in ESM:** Editor main.js uses `require('electron')` for lazy `screen` import (line 691). Game-main.js must use ESM `import { screen } from 'electron'` at the top level since it uses `"type": "module"`.
- **Don't use `isInsideProject()` path validation:** Editor validates paths stay within project dir. Game-main.js must validate paths stay within its own saves dir instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic file writes | Custom sync/async write logic | Copy editor's `atomicWrite()` pattern | Already proven, handles edge cases (tmp → bak → rename) |
| Window state persistence | Custom serialization | JSON file + `screen.getDisplayMatching()` | Electron built-in API handles multi-monitor correctly |
| Path sanitization | Custom regex for each character | Reuse D-05 pattern (`/[<>:"|?*]/g` → `_`) | Covers all Windows-illegal filename chars |
| Screenshot capture | Canvas-based screenshot | `webContents.capturePage()` → resize → JPEG | Electron native capture is simpler and faster |

## Common Pitfalls

### Pitfall 1: Desktop Env Detected as 'electron' Instead of 'desktop'
**What goes wrong:** If `__DESKTOP_GAME` check comes AFTER `window.ipcRenderer` check in `detectEnvironment()`, the desktop game falls into the `'electron'` path and uses `asset://` protocol (which won't exist in the game's main process).
**Why it happens:** Both desktop and editor have `window.ipcRenderer`. The distinguishing factor is `window.__DESKTOP_GAME`.
**How to avoid:** In `assetPath.js`, check `window.__DESKTOP_GAME` FIRST, before `window.ipcRenderer`. Order matters.
**Warning signs:** Asset loading fails (404s for `asset://` URLs), fonts don't load, backgrounds are blank.

### Pitfall 2: Font Loading Fails with Relative Paths
**What goes wrong:** `fontLoader.js` receives `BASE_PATH = './assets/'` in desktop mode. The `FontFace` API constructs URL `./assets/fonts/myfont.ttf` which resolves relative to the HTML file loaded via `win.loadFile()`.
**Why it happens:** `win.loadFile('index.html')` sets the base URL to `file:///path/to/app/index.html`. Relative paths resolve correctly from this base. This SHOULD work, but needs verification.
**How to avoid:** Verify that `FontFace(family, "url('./assets/fonts/x.ttf')")` works when the page is loaded via `loadFile()`. If it doesn't, the game-preload.js could expose `__dirname` as a base path helper.
**Warning signs:** Console errors from FontLoader, fallback fonts rendering.

### Pitfall 3: Save Directory Not Created Before First Write
**What goes wrong:** First save attempt fails because `{userData}/GalgameMaker/{title}/saves/` doesn't exist.
**Why it happens:** `app.getPath('userData')` exists but subdirectories don't.
**How to avoid:** Call `fs.mkdir(savesDir, { recursive: true })` in every save handler (same as editor pattern at main.js line 502), AND create the directory in `app.whenReady()` as a safety net.
**Warning signs:** First save fails, error logged but player may not notice.

### Pitfall 4: Window State Restoration Points to Disconnected Monitor
**What goes wrong:** Player used the game on an external monitor, then disconnects it. Next launch restores window position off-screen.
**Why it happens:** Saved bounds reference a display that no longer exists.
**How to avoid:** Use `screen.getDisplayMatching(savedBounds)` and verify the saved position is within the matched display's workArea. If not, fall back to default centered position (D-02).
**Warning signs:** Game window appears to not launch (it's off-screen).

### Pitfall 5: `set-window-mode` Handler Uses `require('electron')` in ESM Context
**What goes wrong:** Editor's set-window-mode handler (line 691) does `const { screen } = require('electron')` — this is CJS. The game-main.js uses ESM (`"type": "module"`), so `require` is not available.
**Why it happens:** Copy-pasting from editor without adapting to ESM.
**How to avoid:** Import `screen` at the top of game-main.js: `import { app, BrowserWindow, ipcMain, screen, dialog } from 'electron'`.
**Warning signs:** `ReferenceError: require is not defined` when player changes window mode.

### Pitfall 6: ConfigManager localStorage Scoped Per Origin
**What goes wrong:** `ConfigManager` stores settings in `localStorage` with key `galgame-maker-config`. In the exported game loaded via `file://`, localStorage is scoped to the `file://` origin — meaning ALL Electron apps loaded via `file://` could potentially share localStorage.
**Why it happens:** `file://` URLs all share the same origin in Chromium.
**How to avoid:** This is actually fine in practice because each exported game is its own Electron app with its own userData/Chromium profile. Electron's `app.getPath('userData')` isolates the localStorage store per app. The game's package.json `name` field determines the userData directory, ensuring isolation.
**Warning signs:** None expected — Electron handles this correctly. Mention for awareness only.

### Pitfall 7: Crash Log Path When userData Doesn't Exist
**What goes wrong:** D-08 requires writing crash info to `userData/crash.log`, but if the uncaught exception happens very early (before saves dir is created), `userData` itself may not exist.
**Why it happens:** `app.getPath('userData')` returns a path that Electron creates on first use of certain APIs, but it's not guaranteed to exist at the moment of an early crash.
**How to avoid:** In the crash handler, use `fs.mkdirSync(path.dirname(crashLogPath), { recursive: true })` before writing. Use sync operations since the process may be about to die.
**Warning signs:** Crash log file not found after a crash.

## Code Examples

### game-main.js Template Structure (verified from editor patterns)
```javascript
/**
 * Game Main Process — Standalone exported game runtime.
 * Generated by Galgame Maker export pipeline.
 */
import { app, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Game Configuration (baked at export time) ─────────
const GAME_TITLE = '${gameTitle}';
const GAME_WIDTH = ${width};
const GAME_HEIGHT = ${height};

// ─── Paths ─────────────────────────────────────────────
function sanitizeTitle(title) {
  return title.replace(/[<>:"|?*]/g, '_').trim() || 'Untitled';
}

const savesDir = path.join(
  app.getPath('userData'), 'GalgameMaker',
  sanitizeTitle(GAME_TITLE), 'saves'
);
const windowStatePath = path.join(
  app.getPath('userData'), 'window-state.json'
);
const crashLogPath = path.join(
  app.getPath('userData'), 'crash.log'
);

// ─── Crash Handler (D-08) ──────────────────────────────
process.on('uncaughtException', (err) => {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${err.stack || err.message}\n`;
  try {
    mkdirSync(path.dirname(crashLogPath), { recursive: true });
    // Append to existing crash log (rotation: keep last 100KB)
    let existing = '';
    try { existing = readFileSync(crashLogPath, 'utf-8'); } catch {}
    const combined = existing + entry;
    // Simple rotation: keep tail if over 100KB
    const MAX_SIZE = 100 * 1024;
    const trimmed = combined.length > MAX_SIZE
      ? combined.slice(combined.length - MAX_SIZE)
      : combined;
    writeFileSync(crashLogPath, trimmed, 'utf-8');
  } catch {}
  dialog.showErrorBox('游戏错误', `发生了一个错误：\n${err.message}`);
});

// ─── Window State Persistence (D-02) ───────────────────
// [loadWindowState / saveWindowState functions — see Pattern 4]

// ─── App Ready ─────────────────────────────────────────
app.whenReady().then(async () => {
  // Ensure saves directory exists
  await fs.mkdir(savesDir, { recursive: true });

  const state = loadWindowState(GAME_WIDTH, GAME_HEIGHT);
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    title: GAME_TITLE,
    autoHideMenuBar: true,  // D-03: standard title bar, no menu
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // D-07: No DevTools
  win.webContents.on('devtools-opened', () => win.webContents.closeDevTools());

  // Window state tracking (debounced)
  win.on('resize', () => scheduleStateSave(win));
  win.on('move', () => scheduleStateSave(win));

  // Restore fullscreen if that was the last mode
  if (state.mode === 'fullscreen') win.setFullScreen(true);

  win.loadFile(path.join(__dirname, 'index.html'));

  // ─── Save IPC Handlers ─────────────────────────────
  // [All 8 handlers — see Pattern 2 table]
});

app.on('window-all-closed', () => app.quit());
```

### game-preload.js Template (verified from editor preload.js)
```javascript
/**
 * Game Preload — Exposes minimal IPC bridge for exported game runtime.
 */
import { ipcRenderer, contextBridge } from 'electron';

const ALLOWED_CHANNELS = [
  'save-slot', 'load-slot', 'delete-slot', 'list-saves',
  'save-quickslot', 'load-quickslot',
  'capture-screenshot', 'set-window-mode',
];

// Environment flag — checked by assetPath.js detectEnvironment()
contextBridge.exposeInMainWorld('__DESKTOP_GAME', true);

// IPC bridge — matches editor's window.ipcRenderer interface
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...data) => {
    if (!ALLOWED_CHANNELS.includes(channel))
      throw new Error(`Blocked IPC channel: ${channel}`);
    return ipcRenderer.invoke(channel, ...data);
  },
});
```

### assetPath.js Modification (source: existing code line 41-66)
```javascript
export async function detectEnvironment() {
  // NEW: Desktop game check (v0.8 — must come before ipcRenderer check)
  if (window.__DESKTOP_GAME) {
    ENV = 'desktop';
    BASE_PATH = './assets/';
    SCRIPT_PATH = './script.json';
    return 'desktop';
  }

  // Existing: Editor Electron check
  if (window.ipcRenderer) {
    ENV = 'electron';
    BASE_PATH = 'asset://';
    SCRIPT_PATH = '/game/script.json';
    return 'electron';
  }

  // Existing: Preview iframe check
  if (window.parent !== window) {
    // ... unchanged
  }

  // Existing: Web fallback
  ENV = 'web';
  BASE_PATH = './assets/';
  SCRIPT_PATH = './script.json';
  return 'web';
}
```

### src/main.js Bootstrap Modification (source: existing code line 736-761)
```javascript
async function bootstrap() {
  const env = await detectEnvironment();
  console.log(`[GalgameMaker] Environment: ${env}`);

  background.basePath = BASE_PATH;
  characters.basePath = BASE_PATH;
  audio.basePath = BASE_PATH;

  // Desktop uses IPC-based SaveManager (same as editor)
  if (env === 'electron' || env === 'desktop') {
    saveManager = new SaveManager();
  } else if (env === 'web') {
    saveManager = new WebSaveManager();
  }
  // preview: saveManager stays null

  saveLoadScreen.saveManager = saveManager;

  if (env === 'preview') {
    initPreview();
  } else {
    init();
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3-way env detection (electron/preview/web) | 4-way detection (desktop/electron/preview/web) | v0.8 (this phase) | Desktop games use web-style asset paths + IPC saves |
| Editor-only save handlers in main.js | Same IPC contract implemented in game-main.js | v0.8 (this phase) | SaveManager.js works unmodified across editor and game |
| `require('electron')` lazy imports | ESM `import` at top of module | v0.8 game-main.js | Game uses "type": "module" — must use ESM throughout |

## Open Questions

1. **FontFace API with file:// relative paths**
   - What we know: `win.loadFile()` sets base URL to `file:///path/to/app/index.html`. `fetch('./assets/...')` resolves correctly relative to this.
   - What's unclear: Whether `FontFace(family, "url('./assets/fonts/x.ttf')")` resolves the same way. Chromium should handle this identically to `fetch`, but edge cases with `file://` origin are possible.
   - Recommendation: Test during implementation. If it fails, game-preload.js can expose `__dirname` as `window.__APP_PATH` and fontLoader.js can use it as a fallback base URL in desktop mode.

2. **`contextBridge.exposeInMainWorld('__DESKTOP_GAME', true)` — primitive value exposure**
   - What we know: `contextBridge.exposeInMainWorld` typically exposes objects/functions. Exposing a primitive boolean directly may work differently across Electron versions.
   - What's unclear: Whether it creates `window.__DESKTOP_GAME === true` or wraps it somehow.
   - Recommendation: Verify during implementation. Alternative: expose as part of an object: `window.__DESKTOP_GAME = { flag: true }`. Or simply set it via `webContents.executeJavaScript('window.__DESKTOP_GAME = true')` before page load.

3. **Window state debounce interval**
   - Agent's discretion per CONTEXT.md.
   - Recommendation: 500ms debounce on `resize`/`move` events. This balances responsiveness with disk I/O.

4. **Crash log rotation strategy**
   - Agent's discretion per CONTEXT.md.
   - Recommendation: Simple tail-truncation — keep last 100KB. Append each crash entry with timestamp. No external log rotation library needed for this simple use case.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (project has no test framework) |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUNTIME-01 | Game main.js uses only Electron built-ins, creates BrowserWindow, loads index.html | manual | Assemble test game dir, launch with electron . | ❌ Manual |
| RUNTIME-02 | 8 IPC channels write/read saves to userData directory | manual | Launch test game, save/load/verify files in userData | ❌ Manual |
| RUNTIME-03 | set-window-mode handler switches fullscreen/windowed/borderless | manual | Launch test game, trigger mode changes from settings | ❌ Manual |
| CUSTOM-03 | BrowserWindow created at project-configured resolution | manual | Launch test game, verify window dimensions | ❌ Manual |

### Sampling Rate
- **Per task commit:** Manual verification — launch test game dir with `npx electron electron/game/main.js`
- **Per wave merge:** Full manual walkthrough: launch → save → quit → relaunch → load → verify saves persist → toggle window modes
- **Phase gate:** All 4 requirements verified via manual testing

### Wave 0 Gaps
- No automated test infrastructure exists in this project
- Manual testing is the only verification path — assemble a test game directory with pre-built engine output and verify each IPC channel
- Consider: create a minimal `tests/game-runtime/` directory with a shell script that assembles a test game and launches it

## Sources

### Primary (HIGH confidence)
- `electron/main.js` lines 498-703 — editor IPC handler implementations (save-slot, load-slot, delete-slot, list-saves, save-quickslot, load-quickslot, capture-screenshot, set-window-mode, atomicWrite)
- `electron/preload.js` lines 1-39 — channel whitelist pattern, contextBridge usage
- `src/engine/assetPath.js` — current 3-way environment detection logic
- `src/engine/SaveManager.js` — 8 IPC channel signatures, response format `{success, error?, data?}`
- `src/main.js` lines 736-761 — bootstrap() env-conditional SaveManager selection
- `src/engine/settingDefs.js` — window-mode select with 3 options (windowed/fullscreen/borderless)
- `src/engine/ConfigManager.js` — localStorage-based settings persistence
- `src/engine/fontLoader.js` — FontFace API usage with BASE_PATH parameter

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — game-main.js template pattern, save path isolation, anti-patterns
- `.planning/research/PITFALLS.md` — 14 pitfalls with prevention strategies
- `.planning/research/SUMMARY.md` — v0.8 architecture decisions synthesis
- npm registry: electron@41.2.0, @electron/packager@19.1.0 — current versions verified

### Tertiary (LOW confidence)
- `contextBridge.exposeInMainWorld` with primitive boolean — needs runtime verification
- `FontFace` API with `file://` relative paths — needs runtime verification

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript
- **Design**: All game logic engine-built-in, developer does visual design only
- **Style**: Dark theme, pure CSS, Chinese UI
- **Code conventions**: 2-space indent, single quotes, semicolons, named exports, PascalCase classes, camelCase methods, `_` prefix for private, `[ModuleName]` prefix console logging
- **Error handling**: IPC returns `{ success: boolean, error?: string }`, never throw across IPC boundary
- **Imports**: Explicit `.js` extensions, relative paths, no path aliases, ESM exclusively
- **Security**: contextBridge + channel whitelist pattern, context isolation enabled, no nodeIntegration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all Electron built-ins verified against existing editor code
- Architecture: HIGH — 4-way env detection and same-IPC-contract patterns validated against codebase; all 8 channels mapped to editor implementations
- Pitfalls: HIGH — 7 pitfalls identified with specific prevention strategies; critical ones (env detection order, save dir creation, ESM/CJS) are code-verifiable

**Research date:** 2025-07-15
**Valid until:** 2025-08-15 (stable — Electron 41.x, no fast-moving dependencies)
