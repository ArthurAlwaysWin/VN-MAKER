# Phase 19: Save System Upgrade - Research

**Researched:** 2026-04-04
**Domain:** Electron IPC file system saves, screenshot capture, async migration, protocol extension
**Confidence:** HIGH

## Summary

Phase 19 upgrades the save system from 8-slot localStorage to 100-slot file system storage with screenshot thumbnails. The foundation is well-prepared: all building blocks exist in the codebase (`atomicWrite()`, `isInsideProject()`, `ipcMain.handle()` patterns, `asset://` protocol with stream support). Zero new npm dependencies are needed — Electron's native `webContents.capturePage()` + `NativeImage.resize()` + `toJPEG()` handles the screenshot pipeline, and `fs/promises` handles all file operations.

The biggest technical change is making SaveManager fully asynchronous. Today it's a 72-line class using synchronous `localStorage.getItem/setItem`. After rewrite, every method becomes `async` returning Promises via IPC. This ripples into 6+ call sites in `src/main.js` (save callback, load callback, `showTitle()` → `hasAnySave()`, plus all menu wiring). The migration from localStorage is a lazy one-time operation with a `.migrated` marker file.

The `asset://` protocol handler (electron/main.js:614-674) currently resolves paths only under `assets/`. It needs a small extension to also serve `saves/` directory files, enabling `<img src="asset://saves/slot_001.jpg">` for thumbnail display. The preview BrowserWindow (line 546) lacks a preload script — a critical one-line fix required for IPC to work in standalone game mode.

**Primary recommendation:** Build in three layers: (1) IPC handlers + saves/ directory management in electron/main.js, (2) async SaveManager rewrite in src/engine/SaveManager.js, (3) caller migration + screenshot pipeline + protocol extension. Keep SaveLoadScreen.js API-compatible — Phase 21 rewrites the UI.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 使用 `webContents.capturePage()` 截取游戏画面，NOT html2canvas
- **D-02:** 截图内容为背景+角色（隐藏对话框后截取），产生更干净的缩略图
- **D-03:** 截图时机：打开存档界面前，隐藏对话框 → capturePage → 缓存在内存；用户选择槽位后写入文件；用户取消则丢弃缓存
- **D-04:** 缩略图尺寸 320×180 JPEG quality 80（~15-30KB/张）
- **D-05:** 每槽独立文件：`slot_NNN.json` + `slot_NNN.jpg`，存放在项目 `saves/` 目录
- **D-06:** Save JSON 包含 `version: 2` 字段，预留后续格式升级
- **D-07:** 历史记录截断为 50 条（完整历史保留在内存中）
- **D-08:** 使用现有 `atomicWrite()` 模式确保写入原子性
- **D-09:** 首次执行 `list-saves` 时 lazy 迁移旧 localStorage 8 槽存档
- **D-10:** 迁移完成后写入 `.migrated` 标记防止重复迁移
- **D-11:** 迁移时显示一次性 toast 通知："检测到旧存档，已自动迁移"
- **D-12:** 存档写入失败时显示游戏内 toast 提示，不打断游戏流程
- **D-13:** 编辑器内联试玩（iframe 预览）中禁用存读档功能，按钮置灰
- **D-14:** 扩展 `asset://` 协议支持 `saves/` 前缀路径

### Agent's Discretion

- IPC handler 具体命名和参数设计
- SaveManager 内部缓存策略
- 错误重试逻辑细节
- toast 通知的具体样式和消失时间

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAVE-01 | 存档数据保存到项目 `saves/` 目录，每槽独立文件，使用原子写入 | atomicWrite() at electron/main.js:67-74; slot_NNN.json + slot_NNN.jpg naming; mkdir recursive on project open |
| SAVE-02 | 提供 IPC handlers（save-slot / load-slot / delete-slot / list-saves / capture-screenshot） | Follow existing ipcMain.handle pattern (8+ handlers as templates); return `{ success, data?, error? }` |
| SAVE-03 | SaveManager 重写为异步模式，支持 100 槽位 | Current SaveManager is 72 lines sync; rewrite to async IPC; 6+ callers in main.js need async/await |
| SAVE-04 | 使用 capturePage() 截取游戏画面，缩放为 320×180 JPEG quality 80 | Electron NativeImage.resize() + toJPEG(80); capture from game BrowserWindow's webContents |
| SAVE-05 | 首次运行时自动迁移旧 localStorage 8 槽存档 | Lazy migration on list-saves; read localStorage keys `galgame-maker_save_0..7`; write .migrated marker |
| SAVE-06 | 扩展 asset:// 协议支持 saves/ 目录 | asset:// handler at electron/main.js:614-674; add saves/ branch resolving to `currentProjectPath/saves/` |
| SAVE-07 | 存档 JSON 包含 version: 2 字段 | Add `version: 2` to save data schema; on load check `!data.version || data.version === 1` for compat |
| SAVE-08 | 打开项目时自动创建 saves/ 目录；历史截断 50 条 | Add `fs.mkdir(saves/, {recursive: true})` in load-project handler; truncate `state.history.slice(-50)` in save |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack:** JavaScript (ES Modules) + Vue 3 + Electron — NO TypeScript migration
- **Module pattern:** One class per file, named exports only (`export class`), PascalCase filenames
- **Import style:** Always use explicit `.js` extensions for JS imports; relative paths throughout
- **Error handling:** IPC handlers return `{ success: boolean, error?: string }` — never throw across IPC boundary
- **Logging:** Bracket-prefix tags: `[SaveManager]`, `[GalgameMaker]`
- **Code style:** 2 spaces, single quotes, semicolons, trailing commas in multi-line
- **Security:** `isInsideProject()` for all file paths, `path.basename()` for user-provided filenames
- **File I/O:** All operations use `fs/promises` (NOT sync versions), wrapped in try/catch
- **Atomic writes:** `.tmp`/`.bak` pattern via `atomicWrite()` for critical data
- **No new dependencies:** Zero new npm packages (project policy established v0.2)

## Standard Stack

### Core (Already Available — No Installation)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | ^41.0.4 (installed) | `webContents.capturePage()`, `NativeImage`, `ipcMain.handle()` | Native screenshot + IPC — zero deps |
| `fs/promises` | Node.js built-in | File read/write/delete for save slots | Existing pattern throughout electron/main.js |
| `path` | Node.js built-in | Path resolution, security validation | Used by all existing IPC handlers |

### Electron APIs Used

| API | Purpose | Stability |
|-----|---------|-----------|
| `webContents.capturePage(rect?)` | Capture visible page as NativeImage | Stable since Electron 1.x |
| `NativeImage.resize({ width, height })` | Scale screenshot to 320×180 | Stable since Electron 1.x |
| `NativeImage.toJPEG(quality)` | Convert to JPEG Buffer (quality 0-100) | Stable since Electron 1.x |
| `ipcMain.handle(channel, handler)` | Request-response IPC from renderer | Stable, used throughout codebase |
| `BrowserWindow.webContents` | Access webContents for screenshot | Stable, well-documented |

### Do NOT Add

| Technology | Why Tempting | Why Wrong |
|------------|-------------|-----------|
| html2canvas | Project history mentions it | Abandoned Jan 2022; can't resolve `asset://`; freezes UI thread |
| modern-screenshot / html-to-image | Active DOM screenshot libs | Unnecessary — Electron native capture is superior |
| sharp / jimp | Image processing | `NativeImage.resize()` + `toJPEG()` built into Electron |
| better-sqlite3 / lowdb | Save data management | Overkill — individual JSON files per slot are perfect |
| fs-extra | Extended file operations | `fs/promises` covers all needs |

**Installation:** None required. All APIs are built-in.

## Architecture Patterns

### Recommended Project Structure

```
electron/
├── main.js              # ADD: 5 IPC handlers, extend asset:// protocol
└── preload.js           # NO CHANGE (already exposes invoke/send/on)

src/engine/
├── SaveManager.js       # REWRITE: sync localStorage → async IPC (100 slots)
└── ConfigManager.js     # NO CHANGE (stays on localStorage)

src/ui/
└── SaveLoadScreen.js    # MINIMAL CHANGE: update API calls to async (Phase 21 rewrites UI)

src/main.js              # MODIFY: async/await all save/load callers + screenshot flow

Project saves/ directory:
saves/
├── slot_001.json        # Save state data
├── slot_001.jpg         # Screenshot thumbnail (320×180 JPEG)
├── slot_002.json
├── slot_002.jpg
├── ...
└── .migrated            # Migration marker file (empty)
```

### Pattern 1: IPC Handler Design

**What:** Five new IPC handlers following existing `{ success, data?, error? }` pattern
**When to use:** All save/load operations from renderer to main process

```javascript
// Source: Derived from existing patterns at electron/main.js:101-150, 232-243
// Handler naming convention: verb-noun, matching existing handlers

ipcMain.handle('save-slot', async (event, { slot, state, previewText, thumbnail }) => {
  // slot: number (1-100)
  // state: plain object (game state from ScriptEngine.getState())
  // previewText: string (truncated dialogue text)
  // thumbnail: Buffer (JPEG bytes) or null
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const savesDir = path.join(currentProjectPath, 'saves');
    await fs.mkdir(savesDir, { recursive: true });

    const paddedSlot = String(slot).padStart(3, '0');
    const jsonPath = path.join(savesDir, `slot_${paddedSlot}.json`);
    const jpgPath = path.join(savesDir, `slot_${paddedSlot}.jpg`);

    // Security check
    if (!isInsideProject(jsonPath) || !isInsideProject(jpgPath)) {
      return { success: false, error: 'Invalid path' };
    }

    const data = {
      version: 2,
      state,
      previewText,
      sceneName: state.currentScene || '',
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
    };

    await atomicWrite(jsonPath, JSON.stringify(data, null, 2));

    if (thumbnail) {
      await fs.writeFile(jpgPath, thumbnail);
    }

    return { success: true };
  } catch (e) {
    console.error('[save-slot] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-slot', async (event, { slot }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const paddedSlot = String(slot).padStart(3, '0');
    const jsonPath = path.join(currentProjectPath, 'saves', `slot_${paddedSlot}.json`);
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };
    const raw = await fs.readFile(jsonPath, 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  } catch (e) {
    if (e.code === 'ENOENT') return { success: true, data: null };
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-slot', async (event, { slot }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const paddedSlot = String(slot).padStart(3, '0');
    const jsonPath = path.join(currentProjectPath, 'saves', `slot_${paddedSlot}.json`);
    const jpgPath = path.join(currentProjectPath, 'saves', `slot_${paddedSlot}.jpg`);
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };
    await fs.unlink(jsonPath).catch(() => {});
    await fs.unlink(jpgPath).catch(() => {});
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('list-saves', async () => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const savesDir = path.join(currentProjectPath, 'saves');
    await fs.mkdir(savesDir, { recursive: true });

    const files = await fs.readdir(savesDir);
    const slots = [];

    for (const file of files) {
      const match = file.match(/^slot_(\d{3})\.json$/);
      if (!match) continue;
      const slotNum = parseInt(match[1], 10);
      const raw = await fs.readFile(path.join(savesDir, file), 'utf-8');
      const data = JSON.parse(raw);
      slots.push({
        slot: slotNum,
        previewText: data.previewText || '',
        sceneName: data.sceneName || data.state?.currentScene || '',
        timestamp: data.timestamp,
        date: data.date,
        hasThumbnail: files.includes(`slot_${match[1]}.jpg`),
      });
    }

    return { success: true, data: slots };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('capture-screenshot', async () => {
  // Capture from the game window (preview window or main window running game)
  try {
    const targetWin = previewWin || getMainWindow();
    if (!targetWin) return { success: false, error: 'No window' };

    const image = await targetWin.webContents.capturePage();
    const resized = image.resize({ width: 320, height: 180 });
    const jpegBuffer = resized.toJPEG(80);
    return { success: true, data: jpegBuffer };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
```

### Pattern 2: Async SaveManager Rewrite

**What:** Complete rewrite of SaveManager from sync localStorage to async IPC
**When to use:** This replaces the current 72-line SaveManager entirely

```javascript
// Source: Derived from current SaveManager.js + IPC patterns
/**
 * SaveManager — Async file-system save/load via Electron IPC
 */
export class SaveManager {
  constructor() {
    this.slotCount = 100;
    /** @type {Map<number, Object|null>} In-memory cache of slot metadata */
    this._cache = new Map();
    this._cacheValid = false;
    this._migrationChecked = false;
  }

  /**
   * Save game state to a slot (async)
   * @param {number} slot — slot number (1-100)
   * @param {Object} state — engine state (plain object, NOT Proxy)
   * @param {string} previewText
   * @param {Buffer|null} thumbnail — JPEG bytes from capture-screenshot
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async save(slot, state, previewText, thumbnail = null) {
    // Deep-clone to strip any Proxy wrappers (P11 prevention)
    const plainState = JSON.parse(JSON.stringify(state));

    // Truncate history to 50 entries (D-07)
    if (plainState.history && plainState.history.length > 50) {
      plainState.history = plainState.history.slice(-50);
    }

    const result = await window.ipcRenderer.invoke('save-slot', {
      slot,
      state: plainState,
      previewText,
      thumbnail,
    });

    if (result.success) {
      // Update local cache
      this._cache.set(slot, {
        slot,
        previewText,
        sceneName: plainState.currentScene || '',
        timestamp: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        hasThumbnail: !!thumbnail,
      });
    }

    return result;
  }

  /**
   * Load game state from a slot (async)
   * @param {number} slot
   * @returns {Promise<Object|null>}
   */
  async load(slot) {
    const result = await window.ipcRenderer.invoke('load-slot', { slot });
    if (!result.success) return null;
    return result.data;
  }

  /**
   * Delete a save slot (async)
   * @param {number} slot
   * @returns {Promise<{success: boolean}>}
   */
  async delete(slot) {
    const result = await window.ipcRenderer.invoke('delete-slot', { slot });
    if (result.success) {
      this._cache.delete(slot);
    }
    return result;
  }

  /**
   * Get all save slots info — single IPC call (P15 prevention)
   * @returns {Promise<Array<Object|null>>}
   */
  async getAllSlots() {
    if (!this._migrationChecked) {
      await this._checkMigration();
    }
    const result = await window.ipcRenderer.invoke('list-saves');
    if (!result.success) return [];

    // Build cache
    this._cache.clear();
    for (const slot of result.data) {
      this._cache.set(slot.slot, slot);
    }
    this._cacheValid = true;

    return result.data;
  }

  /**
   * Check if any saves exist (async — for "继续游戏" button on title)
   * @returns {Promise<boolean>}
   */
  async hasAnySave() {
    const slots = await this.getAllSlots();
    return slots.length > 0;
  }

  /**
   * @private — Lazy migration from localStorage (D-09, D-10)
   */
  async _checkMigration() {
    this._migrationChecked = true;
    // Migration runs in main process via list-saves handler
    // or can be triggered by a dedicated IPC call
  }
}
```

### Pattern 3: asset:// Protocol Extension for saves/

**What:** Extend the existing `asset://` handler to serve files from `saves/` directory
**When to use:** Thumbnails load as `<img src="asset://saves/slot_001.jpg">`

```javascript
// Source: Existing handler at electron/main.js:614-674
// Insert BEFORE the existing base resolution (around line 618-621)

app.whenReady().then(() => {
  protocol.handle('asset', async (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.hostname + url.pathname);

    // ─── saves/ prefix: resolve from project saves directory ───
    if (filePath.startsWith('saves/') || filePath.startsWith('saves\\')) {
      if (!currentProjectPath) {
        return new Response('No project loaded', { status: 404 });
      }
      const fullPath = path.resolve(path.join(currentProjectPath, filePath));
      const resolvedBase = path.resolve(path.join(currentProjectPath, 'saves'));
      if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(fullPath).toString());
    }

    // ─── Existing assets/ resolution (unchanged) ───
    const base = currentProjectPath
      ? path.join(currentProjectPath, 'assets')
      : path.join(process.env.APP_ROOT, 'public', 'game');
    // ... rest of existing handler ...
  });
});
```

### Pattern 4: Screenshot Capture Flow

**What:** Capture game screen → resize → JPEG → cache → write on save
**When to use:** When user opens save screen (before showing UI overlay)

```javascript
// Source: Electron API - webContents.capturePage()
// In main.js (renderer), before showing save screen:

async function captureGameScreenshot() {
  if (!window.ipcRenderer) return null; // iframe preview guard (D-13)

  // D-02: Hide dialogue box for cleaner screenshot
  dialogueBox.hide();
  quickControls.style.display = 'none';

  // Wait one frame for DOM update
  await new Promise(r => requestAnimationFrame(r));

  const result = await window.ipcRenderer.invoke('capture-screenshot');

  // Restore UI
  // (DialogueBox restore happens when save screen closes)

  if (!result.success) {
    console.error('[GalgameMaker] Screenshot failed:', result.error);
    return null;
  }

  return result.data; // JPEG Buffer — cached until user confirms or cancels
}
```

### Pattern 5: Lazy Migration in Main Process

**What:** Migrate localStorage saves during `list-saves` IPC call
**When to use:** First time `list-saves` is called after upgrade

```javascript
// In main process, inside list-saves handler:
// The renderer sends localStorage data via a separate IPC call

ipcMain.handle('migrate-legacy-saves', async (event, { saves }) => {
  // saves: Array<{ slot: number, data: Object }> from localStorage
  try {
    if (!currentProjectPath) return { success: false };

    const savesDir = path.join(currentProjectPath, 'saves');
    await fs.mkdir(savesDir, { recursive: true });

    const migratedPath = path.join(savesDir, '.migrated');
    if (existsSync(migratedPath)) return { success: true, migrated: 0 };

    let count = 0;
    for (const { slot, data } of saves) {
      const paddedSlot = String(slot + 1).padStart(3, '0'); // 0-based → 1-based
      const jsonPath = path.join(savesDir, `slot_${paddedSlot}.json`);

      // Upgrade to version 2 format
      const upgraded = {
        version: 2,
        state: data.state,
        previewText: data.previewText || '',
        sceneName: data.state?.currentScene || '',
        timestamp: data.timestamp,
        date: data.date,
      };

      await atomicWrite(jsonPath, JSON.stringify(upgraded, null, 2));
      count++;
    }

    // Write migration marker
    await fs.writeFile(migratedPath, '', 'utf-8');
    return { success: true, migrated: count };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
```

### Anti-Patterns to Avoid

- **Sync file operations in renderer:** NEVER use `fs.readFileSync()` — all I/O through async IPC
- **Passing Proxy objects through IPC:** Always `JSON.parse(JSON.stringify(data))` before `ipcRenderer.invoke()` (P11)
- **Capturing screenshot with UI overlays visible:** Hide dialogue box and quick controls BEFORE `capturePage()` (D-02)
- **Reading 100 files individually via IPC:** Use single batch `list-saves` handler (P15)
- **Hardcoding saves path in renderer:** All path resolution happens in main process (P12)
- **Base64 encoding thumbnails in IPC:** Pass Buffers directly — Electron's structured clone handles Buffer natively
- **Forgetting `.migrated` marker:** Without it, migration re-runs every time (D-10)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Screenshot capture | Canvas-based DOM capture | `webContents.capturePage()` | Native Electron API, handles `asset://` images, no freezing |
| Image resizing | Manual canvas resize | `NativeImage.resize()` | Built into Electron, hardware-accelerated |
| JPEG encoding | Third-party image codec | `NativeImage.toJPEG(quality)` | Built into Electron |
| Atomic file writes | Custom tmp/rename logic | Existing `atomicWrite()` | Already battle-tested in codebase (electron/main.js:67-74) |
| Path security | Manual string checking | Existing `isInsideProject()` | Already covers path traversal (electron/main.js:55-59) |
| IPC bridge | Direct Node.js in renderer | Existing `preload.js` + `contextBridge` | Security model already established |
| File change watching | Custom polling | None needed | Save/load are explicit user actions, no need for watchers |

**Key insight:** This phase is 100% "wire existing tools together" — no novel algorithms, no new dependencies, no complex state machines. The risk is in integration correctness, not in any individual building block.

## Common Pitfalls

### Pitfall 1: Preview BrowserWindow Has No IPC (P10 — CRITICAL)

**What goes wrong:** The preview window at electron/main.js:546 creates a BrowserWindow without `webPreferences.preload`. `window.ipcRenderer` is undefined. All file save operations fail silently.
**Why it happens:** Preview window was added in Phase 14 for test play — didn't need IPC at the time.
**How to avoid:** Add `webPreferences: { preload: path.join(__dirname, 'preload.mjs') }` to the preview BrowserWindow config.
**Warning signs:** "window.ipcRenderer is undefined" in console when saving in standalone preview mode.

```javascript
// FIX: electron/main.js line 546-549
previewWin = new BrowserWindow({
  width: 1280, height: 720,
  autoHideMenuBar: true,
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
  },
});
```

### Pitfall 2: Reactive Proxy Serialization Failure (P11 — HIGH)

**What goes wrong:** If game state passes through any Vue reactive wrapper before IPC, `ipcRenderer.invoke()` throws "An object could not be cloned". Known past bug in this project.
**Why it happens:** Electron's structured clone algorithm cannot serialize Vue Proxy objects.
**How to avoid:** SaveManager's `save()` method must deep-clone state: `JSON.parse(JSON.stringify(state))` before any IPC call.
**Warning signs:** "An object could not be cloned" error in DevTools console.

### Pitfall 3: Old localStorage Saves Become Invisible (P14 — CRITICAL)

**What goes wrong:** After upgrade, new SaveManager reads from `saves/` directory. Old saves in localStorage keys `galgame-maker_save_0` through `_save_7` become invisible.
**Why it happens:** Different storage backend, no migration bridge.
**How to avoid:** Lazy migration on first `list-saves` call. Read localStorage in renderer, pass data to main process via `migrate-legacy-saves` IPC, write `.migrated` marker.
**Warning signs:** "继续游戏" button doesn't appear after upgrade despite having saves.

### Pitfall 4: saves/ Path Resolution Across Contexts (P12 — HIGH)

**What goes wrong:** Path to saves/ directory varies: editor mode has `currentProjectPath`, standalone dev mode may not, iframe preview has no IPC.
**Why it happens:** Multiple execution contexts for the same game engine.
**How to avoid:** All path resolution in main process. If `currentProjectPath` is null, return error. Iframe preview disables save entirely (D-13). Runtime check: `if (!window.ipcRenderer) { /* disable save UI */ }`.
**Warning signs:** Saves appear in wrong directory or "No project loaded" errors.

### Pitfall 5: Screenshot Captures UI Overlays

**What goes wrong:** If dialogue box or quick controls are visible during `capturePage()`, the thumbnail includes UI elements.
**Why it happens:** `capturePage()` captures the entire visible page including all overlays.
**How to avoid:** D-02/D-03: Hide dialogue box + quick controls → wait one frame (`requestAnimationFrame`) → capture → cache result. Restore UI after capture or when save screen closes.
**Warning signs:** Thumbnails showing dialogue text or button overlays.

### Pitfall 6: Async showTitle() Race Condition

**What goes wrong:** `showTitle()` currently calls `saveManager.hasAnySave()` synchronously. After rewrite, it's async but the title screen rendering may proceed before the result arrives.
**Why it happens:** `showTitle()` is called from `init()` and from "return to title" — both need `await`.
**How to avoid:** Make `showTitle()` async, `await` the `hasAnySave()` call before calling `titleScreen.show()`. Ensure `init()` already awaits `showTitle()`.
**Warning signs:** "继续游戏" button never appears, or appears delayed after title screen is visible.

### Pitfall 7: thumbnail Buffer Transfer via IPC

**What goes wrong:** JPEG Buffer from `capture-screenshot` IPC needs to be passed back into `save-slot` IPC. If the Buffer is accidentally converted to a string or base64, file size bloats.
**Why it happens:** Electron's structured clone handles Buffer natively, but intermediate processing could corrupt it.
**How to avoid:** Keep the JPEG data as a Buffer/Uint8Array throughout. In the renderer, store the capture result directly: `const thumbnail = result.data;` then pass it to `save-slot` as-is.
**Warning signs:** Thumbnail files are much larger than expected (>100KB for 320×180) or corrupted.

## Code Examples

### Save Data v2 Schema

```javascript
// Source: Derived from current SaveManager.save() + D-06 version field
{
  version: 2,                       // D-06: schema version for future migration
  state: {
    currentScene: 'start',          // ScriptEngine.getState() fields
    pageIndex: 3,
    dialogueIndex: 1,
    variables: { affection: 5 },    // Map → Object via Object.fromEntries()
    history: [                      // D-07: truncated to last 50 entries
      { speaker: 'char1', speakerName: '少女', text: '你好...' },
      // ...
    ],
  },
  previewText: '你好...',            // First 60 chars of last dialogue
  sceneName: 'start',               // For display in save slot card
  timestamp: 1712246400000,         // Date.now()
  date: '2026/4/4 12:00:00',       // Localized display string
}
```

### Caller Migration Map (main.js async changes)

```javascript
// BEFORE (sync):
saveLoadScreen.onSave = (slot) => {
  const state = engine.getState();
  const lastDialogue = engine.history.length > 0
    ? engine.history[engine.history.length - 1].text : '';
  saveManager.save(slot, state, lastDialogue.substring(0, 60));
};

// AFTER (async with screenshot):
let cachedScreenshot = null;

saveLoadScreen.onSave = async (slot) => {
  const state = engine.getState();
  const lastDialogue = engine.history.length > 0
    ? engine.history[engine.history.length - 1].text : '';
  const result = await saveManager.save(
    slot, state, lastDialogue.substring(0, 60), cachedScreenshot,
  );
  if (!result.success) {
    showToast(`存档失败：${result.error}`);  // D-12
  }
};

// BEFORE:
saveLoadScreen.onLoad = (slot) => {
  const data = saveManager.load(slot);
  if (!data) return;
  // ...
};

// AFTER:
saveLoadScreen.onLoad = async (slot) => {
  const data = await saveManager.load(slot);
  if (!data) return;
  titleScreen.hide();
  audio.stopVoice();  // P9: stop lingering voice
  engine.restoreState(data.state);
  isPlaying = true;
  replayCurrentPage();
};

// BEFORE:
function showTitle() {
  // ...
  titleScreen.show(saveManager.hasAnySave());
}

// AFTER:
async function showTitle() {
  const titleLayout = engine.script?.ui?.titleScreen;
  if (titleLayout?.bgm) {
    audio.playBgm({ file: titleLayout.bgm, volume: 1, loop: true });
  }
  const hasSaves = await saveManager.hasAnySave();
  titleScreen.show(hasSaves);
}
```

### saves/ Directory Auto-Creation (in load-project handler)

```javascript
// Source: Add to existing load-project handler at electron/main.js:222 (after fonts mkdir)
// D-08: Auto-create saves directory
await fs.mkdir(path.join(projectPath, 'saves'), { recursive: true });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage saves (8 slots) | File system saves via IPC (100 slots) | Phase 19 | Foundation for entire v0.5 milestone |
| Sync SaveManager API | Async/await throughout | Phase 19 | All 6+ callers must become async |
| No save thumbnails | JPEG screenshots via capturePage() | Phase 19 | Enables visual save/load UI in Phase 21 |
| `asset://` serves only `assets/` | `asset://` also serves `saves/` | Phase 19 | Thumbnails load via standard img tags |
| No save schema version | `version: 2` in all new saves | Phase 19 | Future-proofs save format migration |

**Deprecated/outdated:**
- html2canvas: Abandoned January 2022, cannot resolve `asset://` protocol, freezes UI — do not use
- Sync localStorage SaveManager: Replaced entirely by this phase

## Open Questions

1. **Screenshot capture target window**
   - What we know: `capture-screenshot` IPC needs a target BrowserWindow. Game can run in preview window (standalone) OR the main editor window (via iframe preview, but D-13 disables saves).
   - What's unclear: When game runs in standalone preview window, should `capture-screenshot` capture from `previewWin`? What about when there's no preview window open (running from dev Vite server)?
   - Recommendation: Use `previewWin` if it exists, otherwise `getMainWindow()`. For dev mode (Vite URL in main window), the main window IS the game window. The `capture-screenshot` handler already exists in main process and has access to both references.

2. **Toast notification implementation (D-11, D-12)**
   - What we know: Need toast for migration notice and save errors. No toast system exists in the engine currently.
   - What's unclear: Whether to build a minimal toast utility now or defer to Phase 21 which may need more UI infrastructure.
   - Recommendation: Build a tiny `showToast(msg, duration?)` utility function in main.js (not a full class). ~20 lines: create div, append to game container, auto-remove after timeout. This is agent's discretion per CONTEXT.md.

3. **Migration: Renderer-to-Main localStorage relay**
   - What we know: localStorage is only accessible in the renderer. The main process can't read it. Migration needs renderer to read old saves, send via IPC to main process for file writing.
   - What's unclear: Exact triggering mechanism — should SaveManager.getAllSlots() automatically check and migrate, or should it be a separate init step?
   - Recommendation: SaveManager checks `localStorage.getItem('galgame-maker_migrated')` before first `list-saves` call. If not migrated, reads old saves from localStorage, sends to main process via `migrate-legacy-saves` IPC, then sets migration flag in both localStorage and `.migrated` file on disk.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no test framework installed |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAVE-01 | File writes to saves/ with atomic pattern | manual + smoke | Manual: save game → check file system | ❌ |
| SAVE-02 | IPC handlers respond correctly | manual + smoke | Manual: invoke each handler via DevTools | ❌ |
| SAVE-03 | Async SaveManager works end-to-end | manual + smoke | Manual: save → load → verify state restored | ❌ |
| SAVE-04 | Screenshot captured as 320×180 JPEG | manual + smoke | Manual: save → check slot_NNN.jpg dimensions | ❌ |
| SAVE-05 | Migration from localStorage | manual + smoke | Manual: create old saves → upgrade → verify migration | ❌ |
| SAVE-06 | asset://saves/ loads thumbnails | manual + smoke | Manual: `<img src="asset://saves/slot_001.jpg">` loads | ❌ |
| SAVE-07 | version: 2 in save JSON | manual + smoke | Manual: save → read JSON → check version field | ❌ |
| SAVE-08 | saves/ created on project open; history truncated | manual + smoke | Manual: open project → verify dir; save with 60+ history → verify 50 | ❌ |

### Wave 0 Gaps

No test framework is installed in this project. All validation is manual through the running Electron application. This is consistent with previous milestones (v0.1-v0.4 all used manual verification).

- No automated test infrastructure — validation through manual smoke testing in the running app
- Recommend: add smoke test checklist to each plan's verification steps

## Sources

### Primary (HIGH confidence)

- **Codebase analysis**: `electron/main.js` (IPC handlers, atomicWrite, isInsideProject, asset:// protocol), `src/engine/SaveManager.js` (current implementation), `src/ui/SaveLoadScreen.js` (current UI), `src/main.js` (all callers), `electron/preload.js` (IPC bridge), `src/engine/ScriptEngine.js` (getState/restoreState API), `src/engine/ConfigManager.js` (localStorage pattern reference)
- **Electron API**: `webContents.capturePage()`, `NativeImage.resize()`, `NativeImage.toJPEG()` — stable APIs since Electron 1.x, verified available in Electron 41.x
- **Project research**: `.planning/research/SUMMARY.md`, `.planning/research/PITFALLS.md` — comprehensive pre-research conducted for v0.5 milestone

### Secondary (MEDIUM confidence)

- **IPC handler naming**: Derived from existing handler naming conventions in the codebase (`save-project`, `load-project`, `delete-asset`, `list-assets`) — pattern is clear but new names are agent's discretion

### Tertiary (LOW confidence)

- None — all findings verified against codebase and/or Electron documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all Electron built-in APIs, verified against installed version
- Architecture: HIGH — every integration point verified against actual source code line numbers
- Pitfalls: HIGH — 7 pitfalls from direct codebase analysis, corroborated by pre-research in PITFALLS.md
- Code examples: HIGH — derived directly from existing patterns in the codebase

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable — no fast-moving dependencies)
