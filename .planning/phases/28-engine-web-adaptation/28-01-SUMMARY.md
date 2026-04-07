---
phase: 28-engine-web-adaptation
plan: 01
subsystem: engine
tags: [environment-detection, indexeddb, save-system, path-resolution, web-runtime]

# Dependency graph
requires: []
provides:
  - "assetPath.js — environment detection (electron/preview/web) and path resolution"
  - "WebSaveManager.js — IndexedDB save backend with 108 slots + quicksave"
  - "resolvePath() — universal asset path resolver for all environments"
  - "_capturedStartMsg — editor handshake capture for preview mode coexistence"
affects: [28-02-main-js-integration, asset-path-consumers, save-system]

# Tech tracking
tech-stack:
  added: [IndexedDB]
  patterns: [environment-detection, path-resolution-module, idb-promise-wrapper]

key-files:
  created:
    - src/engine/assetPath.js
    - src/engine/WebSaveManager.js
  modified: []

key-decisions:
  - "200ms timeout for editor handshake detection — fast enough for local postMessage, avoids blocking web init"
  - "Captured start message pattern — _capturedStartMsg prevents race between detection and initPreview()"
  - "String 'quick' key for quicksave in IndexedDB — matches Electron version's separate file approach"
  - "hasThumbnail always false in Web mode per D-02 — no capture-screenshot IPC available"

patterns-established:
  - "Environment detection: feature-detect window.ipcRenderer → iframe handshake → web fallback"
  - "Path resolution: resolvePath() as single function handling asset://, /game/, http/https, data:, bare relative"
  - "IndexedDB promise wrappers: _put/_get/_delete/_getAll pattern for clean async IDB operations"

requirements-completed: [WEBRT-02, WEBRT-04, WEBRT-05]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 28 Plan 01: Web Runtime Foundation Modules Summary

**Environment detection module (assetPath.js) with 3-way detection and path resolution, plus IndexedDB save backend (WebSaveManager.js) as drop-in SaveManager replacement**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-07T14:36:47Z
- **Completed:** 2026-04-07T14:40:00Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Created assetPath.js with 3-way environment detection (electron/preview/web) and universal path resolution
- Created WebSaveManager.js as complete IndexedDB-based drop-in replacement for SaveManager with all 8 public methods
- resolvePath() handles all 5 path variants found in the codebase (asset://, /game/, http/https, data:, bare relative)
- Editor handshake detection captures start message for seamless initPreview() coexistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Create assetPath.js — environment detection and path resolution** - `22c6fc9` (feat)
2. **Task 2: Create WebSaveManager.js — IndexedDB save backend** - `df67a06` (feat)

## Files Created/Modified
- `src/engine/assetPath.js` — Environment detection (ENV, BASE_PATH, SCRIPT_PATH), detectEnvironment(), resolvePath(), _capturedStartMsg
- `src/engine/WebSaveManager.js` — IndexedDB save/load class with 108 slots + quicksave, identical API to SaveManager

## Decisions Made
- 200ms timeout for editor handshake detection — fast for local postMessage, doesn't block web init
- Captured start message in _capturedStartMsg so initPreview() can process it later (avoids race condition)
- String 'quick' key for quicksave slot in IndexedDB (per research Pitfall 4)
- hasThumbnail always false in Web mode (per D-02 — no capture-screenshot IPC)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Known Stubs

None — both modules are complete and ready for integration in Plan 02.

## Next Phase Readiness
- Both modules ready for consumption by main.js in Plan 02
- assetPath.js exports are all functional and verified
- WebSaveManager mirrors SaveManager's 8-method public API exactly
- _capturedStartMsg pattern ready for initPreview() integration

## Self-Check: PASSED

All files created and all commits verified.

---
*Phase: 28-engine-web-adaptation*
*Completed: 2026-04-07*
