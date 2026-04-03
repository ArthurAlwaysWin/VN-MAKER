# Architecture Research — v0.5: 游戏 UI 补全

**Domain:** Visual novel engine game UI features
**Researched:** 2025-07-18
**Overall confidence:** HIGH — Based on direct codebase analysis, all integration points verified against source.

---

## Integration Map

| Feature | New Components | Modified Components | Data Flow Changes |
|---------|---------------|--------------------|--------------------|
| **Save System Upgrade** | `save-game` / `load-game` / `delete-game-save` / `list-game-saves` IPC handlers; `saves/` directory structure | `SaveManager.js` (rewrite to async IPC), `electron/main.js` (add handlers), `electron/preload.js` (no change — already exposes invoke) | localStorage → IPC → file system; save data includes screenshot blob |
| **Quick Action Bar** | `QuickActionBar.js` (new UI class in `src/ui/`) | `main.js` (replace inline `quickControls` div), `DialogueBox.js` (minor — bar positioned relative to dialogue), `style.css` (new styles) | No data flow change — wires to existing callbacks |
| **Save/Load UI** | Complete rewrite of `SaveLoadScreen.js`; html2canvas dependency | `main.js` (screenshot capture before save, pagination state), `style.css` (new grid layout) | Save data now includes `thumbnail` (base64 PNG); SaveManager API becomes async |
| **Fast-Forward / Skip** | `ReadHistory.js` (new engine module in `src/engine/`) | `ScriptEngine.js` (emit read-page tracking), `main.js` (skip logic upgrade), `settingDefs.js` (new skip-mode setting), `ConfigManager.js` (new default) | New persistent read-history data (per-game, file-based or localStorage) |

---

## Save System Upgrade (Foundation)

This is the **foundational feature** — Save/Load UI and screenshots depend on it. Build first.

### Current State

```
SaveManager.js
├── constructor(gameId) → namespace prefix for localStorage keys
├── save(slot, state, previewText) → localStorage.setItem
├── load(slot) → localStorage.getItem + JSON.parse
├── delete(slot) → localStorage.removeItem
├── getAllSlots() → returns array of 8 slot objects
└── hasAnySave() → boolean check
```

**Callers in `main.js`:**
- `saveLoadScreen.onSave` → calls `saveManager.save(slot, state, previewText)`
- `saveLoadScreen.onLoad` → calls `saveManager.load(slot)`
- `titleScreen.onContinue` → opens saveLoadScreen in 'load' mode
- `showTitle()` → calls `saveManager.hasAnySave()` for "继续游戏" button visibility

### New IPC Handlers (electron/main.js)

Add these IPC handlers to `electron/main.js`:

```javascript
// New handlers needed:
ipcMain.handle('save-game', async (event, { slot, data, thumbnail }) => { ... })
ipcMain.handle('load-game', async (event, { slot }) => { ... })
ipcMain.handle('delete-game-save', async (event, { slot }) => { ... })
ipcMain.handle('list-game-saves', async () => { ... })
ipcMain.handle('has-any-save', async () => { ... })
```

**Directory structure:**
```
{projectPath}/
└── saves/
    ├── slot-001.json     // { state, previewText, timestamp, date }
    ├── slot-001.png      // thumbnail screenshot (separate file, not inline base64)
    ├── slot-002.json
    ├── slot-002.png
    └── ...up to slot-100
```

**Why separate JSON + PNG files (not base64 in JSON):**
- JSON with inline base64 screenshots would be 200KB+ per slot → 100 slots = 20MB single-file reads for `list-game-saves`
- Separate PNG files: list operation only reads JSON metadata (fast), thumbnails loaded on-demand
- Thumbnails served via `asset://` protocol (already supports arbitrary project-relative paths) or a new `save://` scheme
- Atomic write pattern already exists in codebase (`atomicWrite` function) — reuse for save JSON

### Data Format Changes

**Current save slot data:**
```json
{
  "state": {
    "currentScene": "start",
    "pageIndex": 2,
    "dialogueIndex": 1,
    "variables": { "affection": 3 },
    "history": [...]
  },
  "previewText": "今天天气真好...",
  "timestamp": 1700000000000,
  "date": "2025/1/1 12:00:00"
}
```

**New save slot data (v0.5):**
```json
{
  "version": 2,
  "state": {
    "currentScene": "start",
    "pageIndex": 2,
    "dialogueIndex": 1,
    "variables": { "affection": 3 },
    "history": [...]
  },
  "previewText": "今天天气真好...",
  "sceneName": "第一章",
  "timestamp": 1700000000000,
  "date": "2025/1/1 12:00:00",
  "hasThumbnail": true
}
```

Changes:
- Added `version: 2` for forward compatibility
- Added `sceneName` for display in save slot UI
- Added `hasThumbnail` flag (PNG file may or may not exist)
- `history` array **truncated** in save data — only keep last 50 entries (full history can be very large)
- Thumbnail stored as separate `slot-NNN.png` file (not inline)

### SaveManager.js Rewrite Strategy

**Make SaveManager async with IPC/localStorage dual-mode:**

```javascript
export class SaveManager {
  constructor(gameId = 'galgame-maker') {
    this.gameId = gameId;
    this.slotCount = 100;  // upgraded from 8
    this._useIpc = !!window.ipcRenderer;  // auto-detect
  }

  async save(slot, state, previewText, thumbnail) { ... }
  async load(slot) { ... }
  async delete(slot) { ... }
  async getAllSlots() { ... }   // returns metadata only, no thumbnails
  async hasAnySave() { ... }
  getThumbnailUrl(slot) { ... } // returns asset:// URL or data: URL
}
```

**Critical:** All callers in `main.js` that call SaveManager methods must become `async`. Currently they're synchronous. This is the biggest ripple effect.

### Migration Strategy (localStorage → files)

**Approach:** Lazy migration on first access.

1. On `list-game-saves` IPC call, check if `saves/` directory exists
2. If not, check localStorage for old saves (`galgame-maker_save_0` through `_save_7`)
3. If old saves found, migrate them to `saves/slot-001.json` through `slot-008.json`
4. Delete localStorage entries after successful migration
5. Create `saves/.migrated` marker file

**Migration is one-way** — once files exist, localStorage is ignored. No screenshot thumbnails for migrated saves (they'll show "无截图" placeholder).

### IPC Availability Analysis

| Context | `window.ipcRenderer` | Save Strategy |
|---------|----------------------|---------------|
| Editor window (`editor.html`) | ✅ Yes (preload.mjs) | File-based via IPC |
| Engine game window (standalone) | ❌ No (no preload on preview BrowserWindow) | localStorage fallback |
| Engine in iframe (editor preview) | ❌ No (iframe, preview mode) | Saves disabled (`_previewMode`) |
| Future: exported game (Electron) | ✅ Yes (will have preload) | File-based via IPC |

**Note:** The `open-preview` handler in `electron/main.js` (line 541) creates a BrowserWindow WITHOUT a preload script. For file-based saves to work in the standalone preview window, **add preload to the preview BrowserWindow config.** This is a one-line fix:

```javascript
previewWin = new BrowserWindow({
  width: 1280, height: 720,
  autoHideMenuBar: true,
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),  // ADD THIS
  },
});
```

---

## Quick Action Bar

### Current State

Currently implemented as an **inline DOM snippet** in `main.js` (lines 54-62):

```javascript
const quickControls = document.createElement('div');
quickControls.id = 'quick-controls';
quickControls.innerHTML = `
  <button class="quick-btn" data-action="auto">AUTO</button>
  <button class="quick-btn" data-action="skip">SKIP</button>
  <button class="quick-btn" data-action="backlog">LOG</button>
  <button class="quick-btn" data-action="menu">MENU</button>
`;
dialogueLayer.appendChild(quickControls);
```

**Current position:** Top-right corner, opacity 0 until hover over game container.

**V0.5 target:** Bottom of dialogue box, 6 buttons (存档/读档/回想/设置/自动/快进), always visible when dialogue box is showing.

### Engine Integration Points

1. **Placement:** Move from `dialogueLayer` (top-right) to inside/adjacent to `#dialogue-box`. Two options:
   - **Option A:** Append inside DialogueBox DOM structure (tight coupling but consistent show/hide)
   - **Option B:** Separate component positioned relative to dialogue box (cleaner separation)
   - **Recommend Option B** — QuickActionBar as its own UI class, appended to `dialogueLayer`, positioned at bottom via CSS. Shows/hides in sync with dialogue box visibility.

2. **Callback wiring in `main.js`:**
   ```javascript
   quickBar.onSave = () => saveLoadScreen.show('save');
   quickBar.onLoad = () => saveLoadScreen.show('load');
   quickBar.onBacklog = () => { /* same as gameMenu.onBacklog */ };
   quickBar.onSettings = () => settingsScreen.show();
   quickBar.onAuto = () => toggleAuto();
   quickBar.onSkip = () => toggleSkip();
   ```

3. **State sync:** Auto/Skip active indicators must update when toggled via keyboard (A/S keys) or via other means. Use a `setActiveStates({ auto, skip })` method called from `updateQuickBtnStates()`.

4. **Visibility sync with DialogueBox:** Bar should hide when:
   - Dialogue box is hidden (choice screen, end of game, title)
   - Any overlay is showing (save/load, settings, backlog, game menu)
   - Preview mode restrictions apply

### Component Design

```javascript
// src/ui/QuickActionBar.js
export class QuickActionBar {
  constructor(container) {
    this.container = container;  // dialogueLayer
    this.el = document.createElement('div');
    this.el.id = 'quick-action-bar';
    // 6 buttons: 存档, 读档, 回想, 设置, 自动, 快进
    this.el.innerHTML = `
      <button class="qab-btn" data-action="save">存档</button>
      <button class="qab-btn" data-action="load">读档</button>
      <button class="qab-btn" data-action="backlog">回想</button>
      <button class="qab-btn" data-action="settings">设置</button>
      <button class="qab-btn" data-action="auto">自动</button>
      <button class="qab-btn" data-action="skip">快进</button>
    `;
    this.container.appendChild(this.el);
    // Callbacks
    this.onSave = null;
    this.onLoad = null;
    this.onBacklog = null;
    this.onSettings = null;
    this.onAuto = null;
    this.onSkip = null;
    // Click delegation
    this.el.addEventListener('click', (e) => { ... });
  }

  show() { this.el.classList.add('visible'); }
  hide() { this.el.classList.remove('visible'); }
  setAutoActive(active) { ... }
  setSkipActive(active) { ... }
}
```

### main.js Modifications

**Remove:** Lines 54-62 (inline `quickControls` creation), lines 237-255 (inline event handler), and `updateQuickBtnStates()` function.

**Replace with:**
```javascript
import { QuickActionBar } from './ui/QuickActionBar.js';
const quickBar = new QuickActionBar(dialogueLayer);
// Wire callbacks...
```

**Update `updateQuickBtnStates()`** to call `quickBar.setAutoActive(autoMode)` and `quickBar.setSkipActive(skipMode)`.

**Update click exclusion list** (line 300): add `#quick-action-bar` to the `target.closest()` checks.

### CSS Positioning

```css
#quick-action-bar {
  position: absolute;
  bottom: 0;           /* Anchor to bottom of dialogue-layer */
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;          /* Above dialogue-box (z-index 3 implied) */
  display: flex;
  gap: 8px;
  /* Show/hide synced with dialogue box */
}
```

**Alternative:** Position below/inside dialogue box. Since dialogue box uses `position: absolute; bottom: 20px`, the bar could be `bottom: 0` or integrated into the dialogue box bottom edge.

---

## Save/Load UI

### Current State

`SaveLoadScreen.js` — 87 lines, simple implementation:
- 8 slots in a 4-column grid
- Text-only preview (previewText + date)
- Synchronous rendering (re-renders on every save)
- Fullscreen overlay (z-index 200, same stacking context as SettingsScreen)

### V0.5 Target

- 100 slots (10 pages × 10 slots per page)
- Thumbnail screenshots per slot
- Page navigation (1-10)
- Slot card: thumbnail + preview text + scene name + date
- Delete functionality per slot
- Shared UI for save AND load modes

### Layer Architecture

**Keep existing pattern** — `SaveLoadScreen` appended to `gameContainer` (same as BacklogScreen, SettingsScreen). Z-index 200. Same show/hide pattern (hidden → visible class toggle).

```
#game-container
├── #background-layer (z:1)
├── #character-layer (z:2)
├── #dialogue-layer (z:3)
│   ├── #dialogue-box
│   └── #quick-action-bar
├── #ui-overlay (z:10)
│   ├── #choice-menu
│   └── #game-menu
├── #save-load-screen (z:200)   ← REWRITE
├── #backlog-screen (z:200)
├── #settings-screen (z:200)
└── #title-screen (z:100)
```

**No z-index conflict:** Only one of save-load/backlog/settings can be visible at a time (enforced by UX flow — clicking save in game menu hides menu and shows save screen).

### State Serialization

**Current `ScriptEngine.getState()`** (line 154):
```javascript
getState() {
  return {
    currentScene: this.currentScene,
    pageIndex: this.pageIndex,
    dialogueIndex: this.dialogueIndex,
    variables: Object.fromEntries(this.variables),
    history: [...this.history],
  };
}
```

**Needed changes for v0.5:**
1. **History truncation** — `history` can grow unbounded. For save files, cap at 50 entries. Full history stays in-memory for backlog.
2. **Add render state** — Currently `_currentBg`, `_currentBgmFile`, `_prevPageCharIds` are tracked but NOT saved. After `restoreState()`, `resetRenderState()` clears them so `renderCurrentPage()` replays everything. This works fine — no change needed.
3. **Scene name** — For save slot display, grab `engine.script.scenes[engine.currentScene].name` at save time (in `main.js`, not in engine).

**Verdict:** `ScriptEngine.getState()` is fine as-is. Truncation happens at the `main.js` level before passing to SaveManager.

### Screenshot Pipeline

**Technology: html2canvas**

Why html2canvas:
- Mature, well-tested library for DOM-to-canvas rendering
- The engine uses DOM rendering (not <canvas>), so html2canvas is the natural fit
- Works with CSS transforms, absolute positioning, background images — all used by the engine
- ~40KB gzipped, acceptable for an Electron app

**Alternative considered: Native Electron `webContents.capturePage()`**
- Captures the entire BrowserWindow, not just the game container
- Would need cropping logic
- BUT: much simpler, no extra dependency, handles cross-origin images better
- **Problem:** In iframe preview mode, `capturePage()` isn't available
- **Problem:** Captures UI overlays too (dialogue box, etc.) — actually we WANT the dialogue visible

**Recommendation: html2canvas** for the engine-side screenshot, because:
1. Engine runs in its own document context (index.html), may be in iframe
2. Can target `#game-container` specifically
3. Exclude specific elements (e.g., quick action bar, game menu) via `ignoreElements` option
4. No Electron API dependency — works if engine is ever web-deployed

**Pipeline:**

```
1. User clicks "Save" on a slot
2. main.js captures screenshot:
   - Hide quick action bar, game menu, save-load screen temporarily
   - html2canvas(gameContainer, {
       width: 1280, height: 720,
       scale: 0.25,           // 320×180 thumbnail
       useCORS: true,
       ignoreElements: (el) => el.id === 'save-load-screen' || el.id === 'game-menu'
     })
3. Canvas → blob → base64 string (or ArrayBuffer for IPC)
4. SaveManager.save(slot, state, previewText, thumbnailData)
5. IPC handler writes JSON + PNG to saves/ directory
6. SaveLoadScreen re-renders the updated slot
```

**Screenshot timing concern:** The save-load screen itself is fullscreen overlay. If we capture while it's open, we get the overlay. Solutions:
- **Option A:** Capture the screenshot BEFORE opening the save-load screen, store it in memory. When user picks a slot, use the pre-captured image. ← **Recommend this.**
- **Option B:** Use `ignoreElements` to skip the overlay. Risk: may not fully work with backdrop-filter.

**Recommended flow:**
1. User triggers save (quick bar or game menu) → capture screenshot immediately
2. Store screenshot in a temporary variable: `let pendingScreenshot = null`
3. Open SaveLoadScreen with the pending screenshot
4. When user clicks a slot → save state + pending screenshot
5. Clear `pendingScreenshot`

### SaveLoadScreen.js Rewrite

```javascript
export class SaveLoadScreen {
  constructor(container, saveManager) {
    this.container = container;
    this.saveManager = saveManager;
    this.el = document.createElement('div');
    this.el.id = 'save-load-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);

    this.mode = 'save';         // 'save' | 'load'
    this.currentPage = 1;       // 1-10
    this.slotsPerPage = 10;
    this.totalPages = 10;
    this.slotsCache = [];       // metadata cache from getAllSlots()
    this.pendingScreenshot = null;  // pre-captured screenshot for save mode

    this.onSave = null;   // (slot, thumbnail) => void
    this.onLoad = null;   // (slot) => void
    this.onDelete = null;  // (slot) => void
  }

  async show(mode = 'save', screenshot = null) {
    this.mode = mode;
    this.pendingScreenshot = screenshot;
    this.currentPage = 1;
    this.slotsCache = await this.saveManager.getAllSlots();
    this._render();
    // show animation...
  }

  _render() {
    // Header: title + page navigation (1-10) + close button
    // Grid: 2 rows × 5 columns = 10 slots per page
    // Each slot: thumbnail (320×180) + preview text + scene name + date
    // Slot click → save or load depending on mode
  }
}
```

### Thumbnail Display

For file-based saves, thumbnails are stored as PNG files in `saves/`. To display them:

**Option A: `asset://` protocol extension**
- Extend the asset:// handler to also resolve `saves/` paths
- Thumbnail URL: `asset://saves/slot-001.png`
- Pro: Uses existing infrastructure
- Con: asset:// currently maps to `{projectPath}/assets/`, not `{projectPath}/saves/`

**Option B: New IPC for thumbnail data**
- `ipcMain.handle('get-save-thumbnail', (_, { slot }) => ...)` → returns base64
- Pro: Clean separation
- Con: Extra IPC call per visible slot

**Option C: Extend asset:// to map project root**
- Change asset:// handler to resolve relative to `{projectPath}/` not `{projectPath}/assets/`
- Then `asset://saves/slot-001.png` just works
- Con: Breaks existing asset paths that assume `assets/` base

**Recommendation: Option A with a specific saves mapping.** Add a special case in the asset:// protocol handler:
```javascript
// In electron/main.js asset protocol handler:
if (filePath.startsWith('saves/')) {
  const fullPath = path.resolve(path.join(currentProjectPath, filePath));
  // security check...
  return net.fetch(pathToFileURL(fullPath).toString());
}
// Otherwise, normal assets/ resolution
```

This is ~5 lines of code, zero breaking changes.

---

## Fast-Forward / Skip Mode

### Current State

**Skip is already partially implemented** in `main.js`:

```javascript
let skipMode = false;

// In engine.on('dialogue'):
if (skipMode) {
  setTimeout(() => engine.next(), 50);
}

function toggleSkip() {
  skipMode = !skipMode;
  autoMode = false;
  updateQuickBtnStates();
  if (skipMode && engine.waiting) {
    engine.next();
  }
}
```

This skips **all** pages unconditionally with a 50ms delay.

### V0.5 Requirements

1. **Skip All mode** — current behavior, skip everything regardless
2. **Skip Read Only mode** — only skip pages the player has already seen
3. **Setting toggle** — ConfigManager setting for which mode to use
4. **Read tracking** — persistent record of which pages the player has visited

### Engine State Tracking — ReadHistory

**New module: `src/engine/ReadHistory.js`**

```javascript
export class ReadHistory {
  constructor(gameId = 'galgame-maker') {
    this.gameId = gameId;
    this._readPages = new Set();  // Set of "sceneId:pageIndex" keys
    this._useIpc = !!window.ipcRenderer;
  }

  // Mark a page as read
  markRead(sceneId, pageIndex) {
    this._readPages.add(`${sceneId}:${pageIndex}`);
  }

  // Check if a page has been read
  isRead(sceneId, pageIndex) {
    return this._readPages.has(`${sceneId}:${pageIndex}`);
  }

  // Persist to storage (debounced, called periodically)
  async save() { ... }

  // Load from storage
  async load() { ... }
}
```

**Storage location:**
- File-based (IPC available): `{projectPath}/saves/read-history.json`
- localStorage fallback: `galgame-maker_read_history`

**Data format:**
```json
{
  "version": 1,
  "pages": ["start:0", "start:1", "start:2", "chapter1:0", ...]
}
```

**Performance note:** A typical visual novel has 100-2000 pages. Even at 2000, the Set size is ~60KB serialized. No performance concern.

### Integration with ScriptEngine

**Hook into `page_enter` event** (already emitted by ScriptEngine at line 287-291):

```javascript
// In main.js:
engine.on('page_enter', ({ sceneId, pageIndex }) => {
  readHistory.markRead(sceneId, pageIndex);
});
```

No changes needed to ScriptEngine itself. The `page_enter` event already provides exactly the data needed.

### Speed Control Integration

**Modified skip logic in `main.js`:**

```javascript
engine.on('dialogue', (data) => {
  // ... existing code ...

  if (skipMode) {
    const skipAll = config.get('skipMode') === 'all';
    const isRead = readHistory.isRead(engine.currentScene, engine.pageIndex);

    if (skipAll || isRead) {
      setTimeout(() => engine.next(), 50);
    } else {
      // Stop skipping — reached unread content in "read only" mode
      stopSkip();
    }
  }
});
```

### New Settings

**settingDefs.js addition:**

```javascript
'skip-mode': {
  type: 'select',
  settingKey: 'skipMode',
  label: '快进模式',
  options: [
    { value: 'all', label: '全部跳过' },
    { value: 'read', label: '仅跳过已读' },
  ],
  default: 'read',
}
```

**ConfigManager.js addition:**
```javascript
this.defaults = {
  // ... existing ...
  skipMode: 'read',  // 'all' | 'read'
};
```

**SettingsScreen:** No code change needed — the SETTING_DEFS registry + renderer system automatically picks up the new entry. Just need to add it to the settings screen layout (either default or custom).

### Edge Cases

1. **Skip mode on choice pages:** Already handled — choices stop auto/skip (line 131-133 in main.js)
2. **Skip mode on unread page in "read only":** Stop skip, wait for player input
3. **Read history across sessions:** Persisted per game — survives page reload, game restart
4. **Read history NOT per save slot:** Read history is global for the game, not per save. This matches industry standard (Ren'Py, Kirikiri, etc.)

---

## Suggested Build Order

### Phase 1: Save System Upgrade (Foundation) ← BUILD FIRST

**Rationale:** Both Save/Load UI and screenshot pipeline depend on the new save infrastructure. Fast-forward's read history also benefits from the file-based persistence pattern.

**Steps:**
1. Add save IPC handlers to `electron/main.js`
2. Add preload to preview BrowserWindow
3. Rewrite `SaveManager.js` to async with IPC/localStorage dual-mode
4. Update all callers in `main.js` to async
5. Extend asset:// protocol for `saves/` path
6. Add `saves/` directory creation to `create-project` IPC handler
7. Implement localStorage → file migration
8. Test: save/load 100 slots, verify backward compat with old 8-slot saves

**Risk:** Making SaveManager async ripples through all callers. The `hasAnySave()` call in `showTitle()` becomes async — this affects the init flow.

### Phase 2: Quick Action Bar

**Rationale:** Simple, self-contained, no dependencies on other v0.5 features. Good parallel workstream or quick win.

**Steps:**
1. Create `QuickActionBar.js` in `src/ui/`
2. Wire callbacks in `main.js` (replace inline quickControls)
3. CSS: position at bottom of dialogue area
4. Sync visibility with dialogue box show/hide
5. Add click exclusion in gameContainer click handler

**Risk:** Low. Pure UI, well-understood pattern (follows GameMenu/BacklogScreen callback style).

### Phase 3: Save/Load UI Rewrite

**Rationale:** Depends on Phase 1 (async SaveManager, IPC handlers). The UI itself is independent of screenshot capture — can ship with "no thumbnail" state first, add screenshots after.

**Steps:**
1. Install html2canvas: `npm install html2canvas`
2. Rewrite `SaveLoadScreen.js` with 10-page pagination
3. Implement screenshot capture in `main.js` (pre-capture before opening save screen)
4. Wire thumbnail display using asset:// saves/ path
5. Add delete slot functionality
6. CSS: new grid layout with thumbnail cards

**Risk:** Medium. html2canvas with `asset://` protocol images may have cross-origin issues. Test early.

### Phase 4: Fast-Forward / Skip Mode Upgrade

**Rationale:** Can be done in parallel with Phase 3. Only dependency is the save system (for read-history persistence), but can use localStorage fallback initially.

**Steps:**
1. Create `ReadHistory.js` in `src/engine/`
2. Hook into `page_enter` event in `main.js`
3. Add `skip-mode` to settingDefs.js + ConfigManager defaults
4. Modify skip logic in `main.js` dialogue handler
5. Persist read history (file-based if IPC available, else localStorage)
6. Add skip-mode setting to default settings screen layout

**Risk:** Low. Core logic is simple. Edge case around "stop skip at unread page" needs careful timing to avoid skipping one extra page.

### Dependency Graph

```
Phase 1: Save System Upgrade
    │
    ├──→ Phase 3: Save/Load UI (requires async SaveManager)
    │       │
    │       └──→ Screenshot pipeline (requires save infrastructure)
    │
    └──→ Phase 4: Fast-Forward (benefits from file persistence pattern)

Phase 2: Quick Action Bar (independent, can parallel with anything)
```

### Recommended execution:

```
Week 1:  Phase 1 (Save System) + Phase 2 (Quick Action Bar) in parallel
Week 2:  Phase 3 (Save/Load UI) + Phase 4 (Fast-Forward) in parallel
Week 3:  Integration testing, screenshot pipeline polish, edge cases
```

---

## Risk Areas

### 1. html2canvas + asset:// Protocol (MEDIUM risk)

**Risk:** html2canvas renders DOM to canvas. Background images loaded via `asset://` custom protocol may be treated as cross-origin, causing canvas tainting.

**Detection:** If `canvas.toDataURL()` throws a SecurityError after html2canvas render.

**Mitigation options:**
- Set `useCORS: true` and `allowTaint: true` in html2canvas options
- If still fails: use Electron's `webContents.capturePage()` as fallback — works for the standalone game window (not iframe preview, but save isn't available in preview anyway)
- Nuclear option: convert asset:// URLs to data: URLs before capture (slow but guaranteed to work)

### 2. Async SaveManager Ripple Effect (MEDIUM risk)

**Risk:** Changing `SaveManager` from sync to async touches every caller. The `hasAnySave()` call during `init()` is particularly sensitive — it gates the "继续游戏" button on the title screen.

**Mitigation:**
- `showTitle()` already called after `await engine.load()`, so making it async fits naturally
- `titleScreen.show(hasSave)` already takes the boolean — just need `const hasSave = await saveManager.hasAnySave()`
- Pre-load slot metadata during init and cache in-memory; subsequent calls read from cache

### 3. Screenshot Timing (LOW risk)

**Risk:** Capturing screenshot at the wrong moment (UI overlay visible, transition in progress).

**Mitigation:** Pre-capture approach — take screenshot the moment user triggers save action, BEFORE opening the save-load screen overlay. The dialogue box should be visible (intended — shows context).

### 4. Read History Data Growth (LOW risk)

**Risk:** Read history grows indefinitely for long games.

**Mitigation:** At 2000 pages × ~20 chars per key = ~40KB. Negligible. No action needed. If paranoid, could set a 10,000-entry cap.

### 5. Preview Mode Interference (LOW risk)

**Risk:** New features (quick bar, save, skip) showing in editor iframe preview where they shouldn't.

**Mitigation:** Already handled — `engine._previewMode` flag exists. Quick action bar and save buttons should check this flag:
```javascript
if (engine._previewMode) return;  // No save/load in preview
```
The existing quickControls already gate menu toggle on `!engine._previewMode` (line 253).

### 6. ConfigManager Also Uses localStorage (LOW risk but worth noting)

**Risk:** `ConfigManager.js` also uses localStorage for game settings (volumes, text speed, etc.). Not part of v0.5 scope but worth flagging for future: should game settings also migrate to file-based storage?

**Recommendation:** Leave ConfigManager on localStorage for v0.5. Settings are global (not per-save), small data, and localStorage works fine. Migrate in a future milestone if needed.

---

## Sources

- Direct codebase analysis — all files examined with full content
- Confidence: **HIGH** — every integration point verified against actual source code
- html2canvas assessment based on library's documented capabilities and DOM rendering approach of this engine
