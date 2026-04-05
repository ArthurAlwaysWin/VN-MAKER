---
phase: 19-save-system-upgrade
plan: 02
subsystem: engine
tags: [save-system, ipc, async, electron, migration, screenshot]

# Dependency graph
requires:
  - phase: 19-01
    provides: IPC handlers (save-slot, load-slot, delete-slot, list-saves, capture-screenshot, migrate-legacy-saves), asset://saves/ protocol
provides:
  - Async IPC-based SaveManager with 100 slots, history truncation, Proxy-safe deep clone
  - Async caller migration in main.js and SaveLoadScreen.js
  - Screenshot capture flow (hide UI → capture → cache → pass to save)
  - Toast notification utility for save errors and migration
  - Legacy localStorage migration with marker flags
affects: [21-save-load-ui, 22-skip-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [async-ipc-save, screenshot-before-save, lazy-migration, toast-notification]

key-files:
  created: []
  modified:
    - src/engine/SaveManager.js
    - src/main.js
    - src/ui/SaveLoadScreen.js

key-decisions:
  - "SaveManager constructor takes no args — IPC handles path resolution in main process"
  - "All SaveManager methods async — callers MUST use await"
  - "Deep-clone state via JSON.parse(JSON.stringify) to strip Vue Proxy wrappers"
  - "History truncated to 50 entries before IPC send to limit file size"
  - "Screenshot captured before save screen opens, cached, passed to save()"
  - "SaveLoadScreen renders 8 slots (1-based) for backward compatibility — Phase 21 expands to 100"
  - "Migration toast shown once after successful legacy save migration"

patterns-established:
  - "Async IPC save pattern: renderer → ipcRenderer.invoke → main process atomicWrite"
  - "Screenshot flow: hide dialogue → requestAnimationFrame → capturePage → restore UI"
  - "Toast notification: absolute positioned div with opacity transition, auto-remove"
  - "Lazy migration: check localStorage on first getAllSlots(), set marker flag after migration"

requirements-completed: [SAVE-03, SAVE-05, SAVE-08]

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 19 Plan 02: Async SaveManager + Caller Migration Summary

**Async IPC-based SaveManager (100 slots) with deep-clone, history truncation, screenshot capture flow, toast notifications, and legacy localStorage migration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T06:24:41Z
- **Completed:** 2026-04-04T06:30:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Complete SaveManager rewrite from sync localStorage (8 slots) to async IPC (100 slots)
- All callers in main.js and SaveLoadScreen.js migrated to async/await
- Screenshot capture flow: hide dialogue/controls → capture → cache → pass to save
- Toast notification utility for save errors and migration feedback
- Lazy legacy migration from localStorage with one-time marker flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite SaveManager.js as async IPC-based class** - `26ea726` (feat)
2. **Task 2: Migrate all callers in main.js to async + screenshot flow + toast + SaveLoadScreen async** - `c1bb29c` (feat)

## Files Created/Modified
- `src/engine/SaveManager.js` - Complete rewrite: async IPC-based class with 100 slots, migration, history truncation, Proxy-safe deep clone
- `src/main.js` - showToast(), captureGameScreenshot(), async onSave/onLoad/showTitle, migration toast
- `src/ui/SaveLoadScreen.js` - async _render() with await getAllSlots(), 1-based slot Map lookup

## Decisions Made
- SaveManager constructor takes no args (IPC handles path resolution in main process)
- Deep-clone state via JSON.parse(JSON.stringify) before IPC send (prevents Proxy serialization errors)
- Truncate history to last 50 entries in save() to limit file size
- Screenshot captured before save screen opens (hide dialogue + quick controls for clean capture)
- SaveLoadScreen still renders 8 slots for backward compatibility (Phase 21 will expand to 100)
- Migration check happens lazily on first getAllSlots() call — avoids startup delay

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — all data paths are wired to IPC handlers from Plan 19-01.

## Next Phase Readiness
- Save system pipeline complete: renderer → async SaveManager → IPC → file system
- Phase 20 (Quick Action Bar) can proceed — save/load callbacks are async-ready
- Phase 21 (Save/Load UI) will expand SaveLoadScreen from 8 to 100 slots with thumbnail grid

---
*Phase: 19-save-system-upgrade*
*Completed: 2026-04-04*
