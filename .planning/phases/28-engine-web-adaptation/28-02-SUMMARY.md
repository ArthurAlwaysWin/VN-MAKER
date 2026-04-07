---
phase: 28-engine-web-adaptation
plan: 02
subsystem: engine
tags: [bootstrap, environment-detection, asset-path, indexeddb, save-manager, web-mode]

# Dependency graph
requires:
  - phase: 28-01
    provides: assetPath.js (ENV, BASE_PATH, SCRIPT_PATH, detectEnvironment, resolvePath) and WebSaveManager.js (IndexedDB save backend)
provides:
  - 3-way bootstrap in main.js (Electron / preview / Web)
  - Conditional SaveManager selection (IPC vs IndexedDB)
  - resolvePath-based path resolution in TitleScreen, SettingsScreen, SaveLoadScreen
affects: [29-export-pipeline, 30-export-editor-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [3-way environment bootstrap, conditional module instantiation, centralized path resolution via resolvePath]

key-files:
  created: []
  modified:
    - src/main.js
    - src/ui/TitleScreen.js
    - src/ui/SettingsScreen.js
    - src/ui/SaveLoadScreen.js

key-decisions:
  - "Shared init() for Electron and Web — both use SCRIPT_PATH/BASE_PATH, no separate initWeb() needed"
  - "saveManager starts null, wired via bootstrap() before any rendering"
  - "Ready handshake moved to assetPath.js — initPreview handles _capturedStartMsg for race-free detection"

patterns-established:
  - "3-way bootstrap: detectEnvironment() → set basePaths → create SaveManager variant → call init/initPreview"
  - "resolvePath() replaces all hardcoded asset:// prefix-check logic in UI files"

requirements-completed: [WEBRT-01, WEBRT-02, WEBRT-03, WEBRT-04, WEBRT-05]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 28 Plan 02: Engine Web Integration Summary

**3-way bootstrap wiring assetPath.js + WebSaveManager into main.js, replacing all hardcoded asset:// paths in 3 UI components with resolvePath()**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-07T14:42:54Z
- **Completed:** 2026-04-07T14:46:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Refactored main.js from 2-path (Electron/preview) to 3-path bootstrap (Electron/preview/Web)
- Conditional SaveManager: Electron uses IPC-based SaveManager, Web uses IndexedDB-based WebSaveManager, preview leaves null
- All component basePaths now set from assetPath.BASE_PATH (no hardcoded '/game/' or 'asset://')
- Replaced 5 hardcoded asset:// references in TitleScreen, SettingsScreen, SaveLoadScreen with resolvePath()
- initPreview handles captured start message from assetPath detection handshake (race-free)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor main.js — 3-way bootstrap with conditional SaveManager** - `e8adbd1` (feat)
2. **Task 2: Replace hardcoded asset:// paths in TitleScreen, SettingsScreen, SaveLoadScreen** - `0d5c8d2` (feat)

## Files Created/Modified
- `src/main.js` - 3-way bootstrap via detectEnvironment(), conditional SaveManager, SCRIPT_PATH/BASE_PATH usage
- `src/ui/TitleScreen.js` - resolvePath for background and image elements, removed prefix-check logic
- `src/ui/SettingsScreen.js` - resolvePath for background layer and image src
- `src/ui/SaveLoadScreen.js` - resolvePath for thumbnail image paths

## Decisions Made
- Shared `init()` for both Electron and Web modes — after SCRIPT_PATH/BASE_PATH changes, init() is environment-agnostic; no separate initWeb() needed since WebSaveManager has `_lastMigrationCount = 0`
- saveManager starts as `null` at module scope, constructed in `bootstrap()` before any rendering occurs
- Ready handshake (`window.parent.postMessage({ type: 'ready' })`) moved to assetPath.js during detection; initPreview processes `_capturedStartMsg` if editor already responded

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Engine now runs in 3 environments: Electron (IPC saves), preview (no saves), Web (IndexedDB saves)
- All asset paths resolved via assetPath.js — ready for export pipeline (Phase 29)
- No hardcoded `asset://` or `/game/` paths remain in modified UI files

---
*Phase: 28-engine-web-adaptation*
*Completed: 2026-04-07*
