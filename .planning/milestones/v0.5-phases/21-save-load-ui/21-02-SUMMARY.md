---
phase: 21-save-load-ui
plan: 02
subsystem: ui
tags: [save-load, integration, esc-priority, close-routing, toast]

# Dependency graph
requires:
  - phase: 21-save-load-ui
    plan: 01
    provides: "SaveLoadScreen with show(mode, source), hide(skipRoute), onClose API"
provides:
  - "Wired save/load integration with source-routed close, ESC priority fix, save toast"
affects: [main.js, game-menu-flow, quick-action-bar-flow, title-screen-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Source-routed close: onClose(source) dispatches to correct UI context", "ESC/right-click priority: SaveLoad > Settings > Backlog > GameMenu"]

key-files:
  created: []
  modified:
    - src/main.js

key-decisions:
  - "SaveLoad screen has highest ESC/right-click priority per SLUI-06"
  - "onClose routes only menu source to gameMenu.show(); bar and title are no-ops"
  - "Load callback unchanged — SaveLoadScreen internally calls hide(true) to skip onClose routing"

patterns-established:
  - "Source-routed close pattern: show(mode, source) → hide() → onClose(source) for context-aware return"

requirements-completed: [SLUI-06, SLUI-07]

# Metrics
duration: 1min
completed: 2026-04-05
---

# Phase 21 Plan 02: Save/Load main.js Integration Summary

**Wired 5 SaveLoadScreen callsites with source params, onClose menu routing, ESC/right-click priority reorder, and save success toast**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-05T08:13:22Z
- **Completed:** 2026-04-05T08:14:23Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- All 5 `saveLoadScreen.show()` callsites pass correct source parameter ('menu', 'bar', or 'title')
- `onClose` callback routes 'menu' source back to `gameMenu.show()`; 'bar' and 'title' are no-ops
- ESC priority chain reordered: SaveLoad > Settings > Backlog > GameMenu (was Settings > Backlog > SaveLoad > GameMenu)
- Right-click priority chain reordered to match ESC: SaveLoad > Settings > Backlog > GameMenu (was Backlog > SaveLoad > Settings > GameMenu)
- Save success toast '存档完成' added to onSave callback
- Load callback unchanged — SaveLoadScreen internally calls `hide(true)` (skipRoute) preventing GameMenu re-opening after load

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire source params, onClose routing, ESC priority fix, and save toast** - `b0408f9` (feat)

## Files Created/Modified
- `src/main.js` — 9 targeted edits: 5 source params, onClose callback, save toast, ESC reorder, right-click reorder

## Decisions Made
- SaveLoad screen takes highest ESC/right-click priority (SLUI-06)
- onClose routing: only 'menu' source dispatches to gameMenu.show(); 'bar' and 'title' are silent returns
- Existing onLoad callback untouched — SaveLoadScreen hide(true) skip mechanism prevents Pitfall 2

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None — no external service configuration required.

## Known Stubs

None — all callsites fully wired with correct source parameters.

---
*Phase: 21-save-load-ui*
*Completed: 2026-04-05*
