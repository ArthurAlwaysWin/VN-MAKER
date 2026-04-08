---
phase: 31-export-ui
plan: "01"
subsystem: editor-export-ui
tags: [export, modal, ipc, vue-component]
dependency_graph:
  requires: [30-01-export-pipeline]
  provides: [export-modal, open-folder-ipc, dialog-open-file-ipc, export-button]
  affects: [electron/main.js, electron/preload.js, src/editor/views/ProjectSettings.vue]
tech_stack:
  added: []
  patterns: [3-state-modal, teleport-overlay, ipc-progress-listener]
key_files:
  created:
    - src/editor/components/ExportModal.vue
  modified:
    - electron/main.js
    - electron/preload.js
    - src/editor/views/ProjectSettings.vue
decisions:
  - "ExportModal follows BgRemovalModal pattern: Teleport to body, fixed overlay, centered modal"
  - "Progress listener uses stored unsub function for cleanup on unmount and visibility change"
  - "Cancel during export returns to config state, ignoring background result"
metrics:
  duration: 2min
  completed: 2026-04-08
  tasks: 3
  files: 4
---

# Phase 31 Plan 01: Export UI Modal Summary

3-state export modal (config → exporting → done) with 2 new IPC handlers, wired into ProjectSettings tab via 导出游戏 button

## What Was Done

### Task 1: Add open-folder and dialog-open-file IPC handlers
- Added `shell` to Electron import destructuring in `electron/main.js`
- Registered `open-folder` handler using `shell.openPath()` to open export output in system explorer
- Registered `dialog-open-file` handler using `dialog.showOpenDialog()` for favicon file picker
- Whitelisted both `open-folder` and `dialog-open-file` channels in `electron/preload.js` ALLOWED_CHANNELS
- **Commit:** `206fd88`

### Task 2: Create ExportModal.vue component (461 lines)
- 3-state modal: `config` (form), `exporting` (progress bar), `done` (success/failure)
- Config form: game title (pre-filled from project name), output directory picker, favicon file picker, ZIP toggle
- Progress state: animated progress bar with Chinese step name and percentage, driven by `export-progress` IPC events
- Done/success: ✅ icon, output path, ZIP path, collapsible warnings list (D-10)
- Done/failure: ❌ icon, error message, retry button (D-11)
- Cancel during export returns to config (D-05), close prevented during export
- IPC integrations: `export-game`, `export-progress`, `dialog-open-directory`, `dialog-open-file`, `open-folder`
- Cleanup: `progressUnsub` tracked and cleaned up on visibility change and `onBeforeUnmount`
- Dark theme CSS: `#1e1e1e` bg, `#444` borders, `#007acc` accent, `z-index: 2000` overlay
- **Commit:** `5d4c79c`

### Task 3: Wire ExportModal into ProjectSettings tab
- Added `📦 导出游戏` button with `#007acc` accent styling in `.export-section`
- Imported `ExportModal` component and `ref` from Vue
- Wired `showExport` ref to toggle modal visibility
- Export section placed between `</form>` and `<DialogueBoxSettings />`
- **Commit:** `2b1a7e0`

## Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| EXUI-01 | Export entry point in editor | ✅ Button in ProjectSettings tab |
| EXUI-02 | Game title input | ✅ Pre-filled from project name |
| EXUI-03 | Output directory picker | ✅ Native Electron folder dialog |
| EXUI-04 | Favicon file picker | ✅ dialog-open-file with ico/png filter |
| EXUI-05 | ZIP toggle | ✅ Checkbox in config form |
| EXUI-06 | Progress + completion info | ✅ Progress bar + success/failure views |

## Decisions Made

1. **Modal pattern:** Teleport to body, fixed overlay with click-to-close, centered modal — matches BgRemovalModal pattern (D-03)
2. **Progress listener cleanup:** Store unsubscribe function in module-level variable, clean up on both visibility change and component unmount
3. **Cancel behavior:** Sets state back to config, background export result is silently ignored (D-05)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired to real IPC calls.
