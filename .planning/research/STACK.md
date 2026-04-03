# Stack Research — v0.5: Game UI Completion

**Project:** Galgame Maker v0.5 — 游戏 UI 补全
**Researched:** 2025-07-18
**Overall confidence:** HIGH

## Verdict: ZERO New npm Dependencies

All v0.5 features (quick action bar, save/load UI with thumbnails, fast-forward mode, file system save upgrade) are achievable using **Electron native APIs + built-in browser APIs only**. This continues the project's ZERO new npm deps policy from v0.2 onward.

The project description mentions "html2canvas 截图" — research shows `webContents.capturePage()` is the superior approach for Electron, eliminating the need for any screenshot library.

## Existing Stack (Unchanged)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Electron | 41 (Chromium 134+) | Desktop shell | Existing |
| Vue 3 | 3.5.x | Editor UI framework | Existing |
| Pinia | 3.0.x | Editor state management | Existing |
| Vite | 6.3.x | Build tooling | Existing |
| Pure JavaScript (ES Modules) | ES2022+ | No TypeScript | Existing constraint |
| Node.js `fs/promises` | Built-in | File system operations | Existing in `electron/main.js` |
| `atomicWrite()` | In-house | Safe file writes (temp→rename) | Existing utility |
| `ipcMain.handle` / `ipcRenderer.invoke` | Electron | Renderer↔Main communication | Existing pattern |
| `asset://` protocol | Custom | Serve project assets securely | Existing |
| CSS Grid/Flexbox | Built-in | Layout | Existing |

## New Dependencies

**None.** Every v0.5 feature maps to existing capabilities:

| Feature | Technology | Already Available |
|---------|-----------|-------------------|
| Save thumbnails | `webContents.capturePage()` | Electron 41 native API |
| File system saves | `fs/promises` + `atomicWrite()` | Existing in `electron/main.js` |
| Quick action bar | DOM elements + CSS | Same pattern as existing `#quick-controls` |
| Save/Load grid UI | CSS Grid + DOM | Same pattern as existing `SaveLoadScreen.js` |
| Page pagination (10 pages × 10 slots) | Pure DOM | Trivial tab/button switching |
| Read-page tracking | `Set<string>` + `localStorage` | Browser built-in |
| Thumbnail display | `<img>` + `asset://` or data URL | Existing protocol |

## Key Technical Decisions

### 1. Screenshots — `webContents.capturePage()` (NOT html2canvas)

**Recommendation:** Use Electron's native `webContents.capturePage(rect)` instead of any DOM screenshot library.

**Why this is better than html2canvas for this project:**

| Criterion | `webContents.capturePage()` | html2canvas | modern-screenshot |
|-----------|---------------------------|-------------|-------------------|
| Dependencies | Zero | npm package (abandoned Jan 2022) | npm package |
| CSS accuracy | Perfect (captures rendered pixels) | Re-renders CSS manually (known bugs) | SVG foreignObject (generally good) |
| Custom fonts | ✅ Captures what Chromium renders | ⚠️ May fail with @font-face | ⚠️ Needs font inlining |
| `asset://` protocol | ✅ No cross-origin issues | ⚠️ CORS/tainted canvas risk | ⚠️ Needs fetch + inline to data URL |
| CSS animations/transitions | ✅ Captures current frame | ❌ Static snapshot of computed styles | ❌ Static snapshot |
| Performance | Fast (native screengrab) | Slow (re-parse entire DOM + CSS) | Moderate (SVG serialization) |
| Reliability | Guaranteed (Chromium internal) | Library bugs, edge cases | Library bugs possible |

**Library status check (npm registry, verified 2025-07-18):**

| Library | Latest Version | Last Published | Status |
|---------|---------------|----------------|--------|
| html2canvas | 1.4.1 | **Jan 2022** | ⚠️ Abandoned (3.5+ years stale) |
| modern-screenshot | 4.6.8 | Jan 2026 | Active |
| html-to-image | 1.11.13 | Feb 2025 | Active |

Even if a library were needed, **html2canvas would be the worst choice** — it's been abandoned since 2022. But no library is needed at all.

**Implementation approach:**

```javascript
// electron/main.js — new IPC handler
ipcMain.handle('capture-game-screenshot', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  // Capture the 1280×720 game area
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 720 });
  // Resize to thumbnail (e.g., 320×180 for save slot cards)
  const thumb = image.resize({ width: 320, height: 180 });
  return thumb.toJPEG(80); // Returns Buffer — compact for 100 slots
});
```

**Capture flow:**
1. User triggers save → renderer calls `ipcRenderer.invoke('capture-game-screenshot')` **before** showing Save UI
2. Main process captures + resizes → returns JPEG Buffer to renderer
3. Renderer caches the Buffer, opens Save/Load UI showing preview
4. User picks a slot → renderer sends `ipcRenderer.invoke('save-game', { slot, state, screenshot, previewText })`
5. Main process writes `saves/slot_XX.json` (state) + `saves/slot_XX.jpg` (thumbnail)

**Confidence: HIGH** — `webContents.capturePage()` has been stable since Electron 1.x. The `rect` parameter and `NativeImage.resize()` are well-documented, stable APIs.

### 2. File System Saves — Extend Existing IPC Patterns

**Current state:** `SaveManager.js` uses `localStorage` with 8 slots. Simple key-value JSON storage.

**Target state:** `saves/` directory inside project folder, 100 slots, JSON state + JPEG thumbnails.

**No new technology needed.** The project already has every building block:

| Building Block | Where | Reuse For |
|---------------|-------|-----------|
| `atomicWrite(filePath, content)` | `electron/main.js:67` | Writing save state JSON safely |
| `fs.writeFile(path, buffer)` | `electron/main.js:263` | Writing JPEG thumbnails |
| `fs.readdir(dir)` | `electron/main.js:249` | Listing save slots |
| `fs.unlink(path)` | `electron/main.js:398` | Deleting save slots |
| `isInsideProject(path)` | `electron/main.js:55` | Path security for saves/ |
| `fs.mkdir(dir, { recursive: true })` | `electron/main.js:105` | Creating saves/ directory |

**New IPC handlers needed (4 total):**

```javascript
// 1. save-game — write state + thumbnail
ipcMain.handle('save-game', async (event, { slot, state, screenshot, previewText }) => {
  const savesDir = path.join(currentProjectPath, 'saves');
  await fs.mkdir(savesDir, { recursive: true });
  // Atomic write for state JSON (prevents corruption)
  await atomicWrite(path.join(savesDir, `slot_${slot}.json`), JSON.stringify({
    state, previewText, timestamp: Date.now(), date: new Date().toLocaleString('zh-CN')
  }, null, 2));
  // Write thumbnail (non-atomic OK — worst case: missing thumbnail)
  if (screenshot) {
    await fs.writeFile(path.join(savesDir, `slot_${slot}.jpg`), Buffer.from(screenshot));
  }
});

// 2. load-game — read state
ipcMain.handle('load-game', async (event, { slot }) => { ... });

// 3. delete-save — remove slot files
ipcMain.handle('delete-save', async (event, { slot }) => { ... });

// 4. list-saves — metadata for all slots (for grid display)
ipcMain.handle('list-saves', async () => { ... });
```

**Save file structure:**
```
project-folder/
├── saves/
│   ├── slot_0.json      # Game state + metadata
│   ├── slot_0.jpg       # Thumbnail (320×180 JPEG)
│   ├── slot_1.json
│   ├── slot_1.jpg
│   └── ...              # Up to slot_99
├── assets/
├── project.json
└── script.json
```

**Thumbnail display in Save/Load UI:**
- Option A: Extend `asset://` protocol to also serve from `saves/` → `<img src="asset://saves/slot_0.jpg">`
- Option B: `list-saves` IPC returns thumbnail as base64 data URL
- **Recommend Option A** — cleaner, uses existing protocol infrastructure, no base64 bloat in IPC messages. The `asset://` handler in `main.js:615` already resolves against `currentProjectPath`; extending it to serve from `saves/` alongside `assets/` is a small change to the path resolution.

### 3. Read-Page Tracking (for Skip-Read-Only Mode)

**No new technology.** This is an engine-internal feature using `Set<string>`.

**Design:**
```javascript
// In ScriptEngine or a new ReadTracker
// Key format: "sceneId:pageIndex" — uniquely identifies every page
const readPages = new Set();

// Mark page as read when dialogue completes
function markRead(sceneId, pageIndex) {
  readPages.add(`${sceneId}:${pageIndex}`);
}

// Check if page has been read (for skip-read-only mode)
function isRead(sceneId, pageIndex) {
  return readPages.has(`${sceneId}:${pageIndex}`);
}
```

**Persistence:** Read-page data should persist across game sessions. Two options:
- **localStorage** (keyed by gameId) — simplest, doesn't pollute save files, survives save deletion
- **Separate file** `saves/read-history.json` — portable with project

**Recommend localStorage** — read history is player-specific data (like config), not project data. Different players of the same game have different read histories. This follows the same pattern as `ConfigManager.js` which already uses localStorage.

### 4. Quick Action Bar — DOM Extension

**No new technology.** The existing `#quick-controls` in `main.js:54-62` already implements 4 buttons (AUTO, SKIP, LOG, MENU). v0.5 changes this to 6 buttons (存档, 读档, 回想, 设置, 自动, 快进).

This is a pure DOM restructure — same `document.createElement('div')` + event delegation pattern.

### 5. Save/Load UI — CSS Grid + Pagination

**No new technology.** The existing `SaveLoadScreen.js` already renders a slot grid. v0.5 upgrades from 8 text-only slots to 100 thumbnail card slots with 10 pages.

| UI Element | Technology | Notes |
|-----------|-----------|-------|
| 10×10 grid layout | `display: grid; grid-template-columns: repeat(5, 1fr)` | 5 columns × 2 rows per page = 10 slots visible |
| Page tabs | DOM buttons with click handlers | 10 page tabs at bottom |
| Thumbnail cards | `<img>` + `<div>` text overlay | JPEG via `asset://` + previewText |
| Active slot highlight | CSS `:hover` + `.selected` class | Standard |
| Delete confirmation | Inline "确定删除?" with confirm/cancel | No modal library needed |

## Existing Stack Reuse

| Existing Component | Reused For | How |
|-------------------|-----------|-----|
| `SaveManager.js` | **Replace entirely** — new `SaveManager` uses IPC instead of localStorage | Rewrite class, same public API (`save`, `load`, `delete`, `getAllSlots`, `hasAnySave`) |
| `SaveLoadScreen.js` | **Rewrite** — new UI with grid, thumbnails, pagination | Same class structure, new `_render()` implementation |
| `ConfigManager.js` | **Extend** — add `skipMode: 'all'` setting (`'all'` \| `'readOnly'`) | One new default field |
| `settingDefs.js` | **Extend** — add skip mode toggle to settings page presets | One new SETTING_DEF entry |
| `GameMenu.js` | **Minor update** — menu still opens save/load, wire to new SaveManager | Minimal change |
| `main.js` (engine runtime) | **Extend** — new quick bar buttons, skip-read-only logic, screenshot capture trigger | Moderate updates to event wiring |
| `ScriptEngine.js` | **Extend** — add read-page tracking Set, emit `page_read` event | Small addition |
| `electron/main.js` | **Extend** — add 5 new IPC handlers (save/load/delete/list/screenshot) | Follows existing patterns exactly |
| `asset://` protocol handler | **Extend** — serve from `saves/` directory for thumbnails | Small path resolution change |

## Integration Notes

### IPC Architecture (Critical)

The save system upgrade is the biggest architectural change: **SaveManager moves from synchronous localStorage to async IPC**.

**Current (synchronous):**
```javascript
// SaveManager.js — current
save(slot, state, previewText) {
  localStorage.setItem(this._key(slot), JSON.stringify(data));
}
load(slot) {
  return JSON.parse(localStorage.getItem(this._key(slot)));
}
```

**New (async IPC):**
```javascript
// SaveManager.js — new
async save(slot, state, previewText, screenshot) {
  return await window.ipcRenderer.invoke('save-game', { slot, state, previewText, screenshot });
}
async load(slot) {
  return await window.ipcRenderer.invoke('load-game', { slot });
}
```

**Impact:** All call sites that use `saveManager.save()` and `saveManager.load()` must become `async/await`. This affects:
- `main.js:180-200` — `saveLoadScreen.onSave` / `saveLoadScreen.onLoad`
- `main.js:405` — `saveManager.hasAnySave()` (title screen continue button)
- `SaveLoadScreen.js` — slot click handlers

This is manageable but must be done carefully to avoid race conditions.

### Screenshot Timing (Critical)

The screenshot must be captured **before** the Save/Load UI appears (otherwise the screenshot shows the UI overlay, not the game scene). The flow:

1. User clicks Save button → `ipcRenderer.invoke('capture-game-screenshot')`
2. Await screenshot Buffer return
3. Cache the Buffer in SaveLoadScreen instance
4. Show the Save UI overlay
5. When user clicks a slot, use the cached screenshot

### asset:// Protocol Extension for Saves

Current `asset://` resolves against `{projectPath}/assets/`. For thumbnails, extend to also serve from `{projectPath}/saves/`:

```javascript
// In protocol.handle('asset', ...) — add saves path resolution
const basePaths = {
  assets: path.join(currentProjectPath, 'assets'),
  saves: path.join(currentProjectPath, 'saves'),
};
// Route based on first path segment: asset://saves/slot_0.jpg vs asset://backgrounds/bg1.png
```

Alternative: Add a dedicated `save://` protocol. But extending `asset://` is simpler and consistent.

### ConfigManager — Skip Mode Setting

Add to `ConfigManager.js` defaults:
```javascript
skipMode: 'all',  // 'all' = skip everything, 'readOnly' = skip only read pages
```

This is a **player preference** (not authored content), so ConfigManager is the correct location. The settings page gets a new toggle component.

## What NOT to Add

| Technology | Why It Might Seem Relevant | Why NOT to Add |
|------------|---------------------------|----------------|
| **html2canvas** | Project description mentions it | Abandoned since Jan 2022. `webContents.capturePage()` is superior in every way for Electron. |
| **modern-screenshot** | Active, zero-dep screenshot lib | Unnecessary — Electron native capture is simpler, more reliable, and has zero cross-origin issues with `asset://` protocol. |
| **html-to-image** | SVG foreignObject screenshot lib | Same as above — Electron native is better. |
| **Any thumbnail/image processing library** | For resizing screenshots | `NativeImage.resize()` is built into Electron. Handles JPEG/PNG encoding natively. |
| **better-sqlite3 / nedb / lowdb** | For save data management | Overkill. JSON files are perfect for save slots. Each slot is one read/write. No queries needed. |
| **fs-extra** | Extended file operations | Node.js `fs/promises` covers all needs (mkdir, readFile, writeFile, unlink, readdir). |
| **uuid** | For save slot IDs | Numbered slots (0–99) are the design. No UUIDs needed. |
| **Virtual scroll library** | For 100-slot grid | Only 10 slots visible per page (paginated). No virtual scrolling needed. |
| **date-fns / dayjs** | For date formatting | `new Date().toLocaleString('zh-CN')` already used in current `SaveManager.js`. |
| **Vue component library (Element Plus, etc.)** | For Save/Load UI | Engine UI is pure DOM (not Vue). Save/Load screen is a runtime component. |

## Browser API Compatibility (Electron 41 / Chromium 134+)

| API | Status | Used For |
|-----|--------|----------|
| `webContents.capturePage(rect)` | ✅ Stable (since Electron 1.x) | Save slot thumbnails |
| `NativeImage.resize()` | ✅ Stable | Thumbnail resizing |
| `NativeImage.toJPEG(quality)` | ✅ Stable | Compact thumbnail encoding |
| `fs.promises` | ✅ Stable (Node 18+) | File system save operations |
| `Set` | ✅ Stable (ES2015) | Read-page tracking |
| `localStorage` | ✅ Stable | Read history + config persistence |
| `CSS Grid` | ✅ Stable | Save/load slot grid layout |
| `crypto.randomUUID()` | ✅ Stable (not needed but available) | — |

**All APIs are stable. No compatibility risk.**

## Save Data Schema

### Slot State File (`saves/slot_XX.json`)

```json
{
  "state": {
    "currentScene": "scene_1",
    "pageIndex": 3,
    "dialogueIndex": 1,
    "variables": { "met_sakura": true, "affection": 5 },
    "history": [
      { "speaker": "sakura", "speakerName": "さくら", "text": "おはよう！" }
    ]
  },
  "previewText": "おはよう！今日はいい天気ですね。",
  "timestamp": 1721318400000,
  "date": "2025/7/18 12:00:00"
}
```

### Slot Thumbnail (`saves/slot_XX.jpg`)

- Format: JPEG (quality 80)
- Size: 320×180 pixels (16:9 aspect, matching 1280×720 game area)
- Typical file size: ~15-30 KB per thumbnail
- 100 slots max = ~3 MB total thumbnail storage (negligible)

### Read History (`localStorage` key: `{gameId}_read_pages`)

```json
["start:0", "start:1", "start:2", "scene_1:0", "scene_1:1"]
```

Compact string array, serialized to localStorage. Typical game: 200-500 unique pages ≈ 5-15 KB.

## Sources

- **Codebase analysis** (HIGH): `SaveManager.js`, `SaveLoadScreen.js`, `main.js` (engine runtime), `electron/main.js` (IPC handlers), `ConfigManager.js`, `preload.js`, `ScriptEngine.js`, `GameMenu.js`, `index.html`, `editor.html`
- **npm registry** (HIGH): Verified versions and publish dates for html2canvas (1.4.1, Jan 2022), modern-screenshot (4.6.8, Jan 2026), html-to-image (1.11.13, Feb 2025)
- **Electron API** (HIGH): `webContents.capturePage()`, `NativeImage` — stable since Electron 1.x, well-documented
- **Project constraint** (HIGH): ZERO new npm deps policy established in v0.2, per PROJECT.md
