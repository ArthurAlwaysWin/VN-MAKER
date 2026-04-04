---
phase: 19-save-system-upgrade
plan: "01"
subsystem: electron-main
tags: [ipc, save-system, file-io, protocol, preview]
dependency_graph:
  requires: []
  provides: [save-slot-ipc, load-slot-ipc, delete-slot-ipc, list-saves-ipc, capture-screenshot-ipc, migrate-legacy-saves-ipc, asset-saves-protocol, preview-preload]
  affects: [electron/main.js]
tech_stack:
  added: []
  patterns: [atomic-write-for-saves, slot-file-naming, capturePage-screenshot, protocol-extension]
key_files:
  created: []
  modified: [electron/main.js]
decisions:
  - "D-05/06/07/08: save-slot handler uses version:2 JSON + atomicWrite + JPEG thumbnail"
  - "D-01/04: capture-screenshot uses capturePage + resize 320x180 JPEG quality 80"
  - "D-09/10: migrate-legacy-saves writes .migrated marker to prevent re-migration"
  - "SAVE-06: asset://saves/ branch resolves before assets/ with path traversal protection"
  - "P10: Preview BrowserWindow gets preload for IPC access"
metrics:
  duration: "2.6 min"
  completed: "2026-04-04"
  tasks: 2
  files_modified: 1
---

# Phase 19 Plan 01: Save System IPC Infrastructure Summary

**One-liner:** 6 IPC handlers for file-system save/load/delete/list/screenshot/migrate + asset:// saves/ protocol extension + preview window preload fix + saves/ auto-creation on project open

## What Was Done

### Task 1: Save-system IPC handlers + preview preload fix + saves/ auto-creation
**Commit:** `a6617a4`

Added 6 new IPC handlers in `electron/main.js` under a `// ─── Save System IPC ───` section:

1. **`save-slot`** — Writes `slot_NNN.json` (version:2 format) via `atomicWrite()` + optional `slot_NNN.jpg` thumbnail to `{project}/saves/`
2. **`load-slot`** — Reads slot JSON, returns parsed data or `null` for ENOENT
3. **`delete-slot`** — Removes both JSON and JPEG files for a slot
4. **`list-saves`** — Batch returns metadata array of all occupied slots (slot number, previewText, sceneName, timestamp, date, hasThumbnail)
5. **`capture-screenshot`** — Uses `webContents.capturePage()` on preview/main window, resizes to 320×180, returns JPEG buffer at quality 80
6. **`migrate-legacy-saves`** — Upgrades localStorage saves to file-system format, writes `.migrated` marker to prevent re-runs

Also:
- Fixed preview `BrowserWindow` to include `webPreferences.preload` for IPC access (P10 fix)
- Added `saves/` directory auto-creation in `load-project` handler (SAVE-08)

### Task 2: Extend asset:// protocol for saves/ directory
**Commit:** `ba8ceb7`

Inserted a `saves/` prefix early-return branch in the `protocol.handle('asset', ...)` handler:
- `asset://saves/slot_001.jpg` → resolves to `{projectPath}/saves/slot_001.jpg`
- Path traversal protection: validates resolved path stays within `{projectPath}/saves/`
- Returns 404 when no project loaded, 403 for path traversal attempts
- Existing `assets/` resolution code remains completely unchanged below

## Verification Results

| Check | Result |
|-------|--------|
| `npx vite build` | ✓ exits code 0 |
| ipcMain.handle count | 25 (was 19, +6 new) |
| save-slot handler | ✓ registered with version:2 + atomicWrite |
| load-slot handler | ✓ registered with ENOENT → null |
| delete-slot handler | ✓ registered, removes both JSON + JPG |
| list-saves handler | ✓ registered, regex slot_(\d{3})\.json |
| capture-screenshot handler | ✓ 320×180 JPEG quality 80 |
| migrate-legacy-saves handler | ✓ .migrated marker |
| Preview preload | ✓ webPreferences.preload present |
| saves/ auto-creation | ✓ in load-project handler |
| asset:// saves/ branch | ✓ before assets/ resolution |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all handlers are fully implemented with real file I/O.

## Commits

| Task | Hash | Description |
|------|------|-------------|
| 1 | `a6617a4` | feat(19-01): add save-system IPC handlers + preview preload fix + saves/ auto-creation |
| 2 | `ba8ceb7` | feat(19-01): extend asset:// protocol for saves/ directory |
