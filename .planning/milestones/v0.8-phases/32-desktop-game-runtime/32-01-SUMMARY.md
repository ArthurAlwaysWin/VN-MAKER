---
phase: 32-desktop-game-runtime
plan: "01"
subsystem: desktop-game-runtime
tags: [electron, ipc, runtime, environment-detection, save-manager, window-management]
dependency_graph:
  requires: []
  provides:
    - electron/game/preload.js — game preload bridge with __DESKTOP_GAME flag
    - electron/game/main.js — standalone game main process with 8 IPC handlers
    - 4-way environment detection (desktop/electron/preview/web)
    - desktop-aware SaveManager bootstrap in src/main.js
  affects:
    - src/engine/assetPath.js (4-way detection)
    - src/main.js (desktop SaveManager branch)
tech_stack:
  added: []
  patterns:
    - contextBridge.exposeInMainWorld for __DESKTOP_GAME flag
    - 8-channel IPC whitelist (game-only subset of editor channels)
    - atomicWrite for save persistence
    - screen.getDisplayMatching() for window state validation
    - 500ms debounced window state save
    - crash log with 100KB rotation
key_files:
  created:
    - electron/game/preload.js
    - electron/game/main.js
  modified:
    - src/engine/assetPath.js
    - src/main.js
decisions:
  - "Desktop detection via __DESKTOP_GAME flag must come BEFORE ipcRenderer check (both present in game context)"
  - "Desktop game uses web-style relative paths (./assets/) — no asset:// protocol needed"
  - "Game main process uses ESM exclusively — no require() calls"
  - "Zero npm dependencies — only Electron built-ins and Node.js std lib"
  - "DevTools blocked via devtools-opened listener in exported game"
  - "Crash handler writes to userData with 100KB rotation + error dialog"
metrics:
  duration: "~4 minutes"
  completed: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 32 Plan 01: Desktop Game Runtime Summary

**One-liner:** Minimal Electron game runtime with 4-way env detection, 8 IPC save handlers, window state persistence, and crash logging — zero external dependencies.

## What Was Built

### electron/game/preload.js (New)
Minimal game preload bridge that:
- Sets `window.__DESKTOP_GAME = true` via contextBridge (detected by assetPath.js)
- Exposes `window.ipcRenderer.invoke()` with 8 whitelisted channels only
- No `send` or `on` methods (game only uses request-response invoke)
- No `webUtils` exposure (game doesn't upload files)

### electron/game/main.js (New)
Complete standalone Electron main process for exported games:
- **Save System (RUNTIME-02):** All 8 IPC handlers matching SaveManager.js contract exactly — save-slot, load-slot, delete-slot, list-saves, save-quickslot, load-quickslot, capture-screenshot, set-window-mode
- **Save Path:** `{userData}/GalgameMaker/{sanitizedTitle}/saves/` with path traversal protection via `isInsideSaves()`
- **Atomic Writes:** `.tmp → .bak → rename` pattern (same as editor) for data safety
- **Window Management (RUNTIME-03):** 3 modes (fullscreen/borderless/windowed) via set-window-mode IPC
- **Window Persistence (D-02):** Position/size/mode saved to `window-state.json` with 500ms debounce; disconnected-monitor fallback via `screen.getDisplayMatching()`
- **Crash Handler (D-08):** `uncaughtException` → crash.log (100KB rotation) + `dialog.showErrorBox()`
- **Security (D-07):** DevTools blocked via `devtools-opened` listener
- **Configuration:** `GAME_TITLE`, `GAME_WIDTH`, `GAME_HEIGHT` constants — Phase 33 will replace these at export time

### src/engine/assetPath.js (Modified)
- **4-way detection:** `desktop → electron → preview → web` (was 3-way)
- Desktop check (`window.__DESKTOP_GAME`) inserted BEFORE `window.ipcRenderer` check — critical because desktop games have both flags
- Desktop uses web-style paths: `BASE_PATH = './assets/'`, `SCRIPT_PATH = './script.json'`

### src/main.js (Modified)
- Bootstrap `SaveManager` condition updated: `env === 'electron' || env === 'desktop'`
- Desktop uses IPC-based SaveManager (matching game-main.js handlers), not WebSaveManager

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| __DESKTOP_GAME before ipcRenderer | Desktop game has both flags; order prevents misidentification as editor |
| Web-style paths for desktop | win.loadFile() makes relative paths just work — no custom protocol needed |
| ESM throughout game-main.js | Exported package.json has "type": "module"; no require() calls |
| Zero npm dependencies | Exported game folder needs no node_modules |
| 500ms window state debounce | Matches editor pattern; prevents excessive disk I/O during resize |
| 100KB crash log rotation | Prevents unbounded log growth while keeping enough context |

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a04d8a7 | Game preload bridge + 4-way environment detection |
| 2 | 77110c1 | Game main process with IPC handlers + window management |

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| electron/game/main.js | `GAME_TITLE = 'My Game'` | Placeholder — Phase 33 export pipeline will replace with actual game title |
| electron/game/main.js | `GAME_WIDTH = 1280`, `GAME_HEIGHT = 720` | Placeholder — Phase 33 will bake project resolution at export time |

These stubs are intentional design: game-main.js is developed as a real runnable file that Phase 33 will embed as a template string with string replacement for these constants.

## Verification Results

- ✅ All 4 files created/modified
- ✅ 4-way detection order verified (desktop at index 180, ipcRenderer at index 249)
- ✅ All 8 IPC channels matched between preload whitelist and main handlers
- ✅ No changes to editor files (electron/main.js, electron/preload.js, SaveManager.js)
- ✅ ESM-only in game-main.js (no require() in non-comment lines)
- ✅ contextIsolation: true, nodeIntegration: false in BrowserWindow config
