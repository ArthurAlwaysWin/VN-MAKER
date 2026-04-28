---
phase: 83
plan: 02
subsystem: galgame-core-contract-persistence
tags:
  - persistence
  - profile
  - saves
  - runtime
dependency_graph:
  requires:
    - .planning/phases/83-galgame-core-contract-persistence/83-02-PLAN.md
    - .planning/phases/83-galgame-core-contract-persistence/83-01-SUMMARY.md
  provides:
    - src/engine/PlayerDataRepository.js
    - src/engine/ReadHistory.js profile-backed persistence
    - electron/main.js player profile IPC/reset/rebuild handlers
    - src/engine/SaveManager.js named reset/rebuild entrypoints
  affects:
    - runtime player profile boot
    - slot persistence boundaries
    - development reset semantics
tech_stack:
  added: []
  patterns:
    - projectId-keyed player profile repository
    - profile-backed read history
    - slot-only save IPC with separate profile IPC
key_files:
  created:
    - src/engine/PlayerDataRepository.js
  modified:
    - src/engine/ReadHistory.js
    - src/engine/SaveManager.js
    - src/engine/WebSaveManager.js
    - src/main.js
    - electron/main.js
    - electron/preload.js
    - tests/playerDataRepository.test.js
decisions:
  - Runtime player progress now normalizes through a dedicated PlayerDataRepository keyed by script.json.projectId before ReadHistory is constructed.
  - Electron keeps slot save files under saves/ while profile truth lives in player-data/profile.json behind separate IPC handlers and explicit reset/rebuild operations.
  - Web mode reuses the same repository boundary, storing profile truth separately from IndexedDB save slots and delegating reset/rebuild through named SaveManager methods.
metrics:
  duration: 5m
  completed_at: 2026-04-28T21:16:30Z
  tasks_completed: 2
  files_changed: 8
---

# Phase 83 Plan 02: Persistence Boundary Summary

Separated cross-run player profile truth from run-owned save slots by introducing a projectId-keyed `PlayerDataRepository`, wiring runtime read history through it, and exposing named reset/rebuild entrypoints through dedicated profile IPC.

## Completed Tasks

| Task | Name | Commits | Result |
| --- | --- | --- | --- |
| 1 | Add repository tests and implement the projectId-keyed profile/save separation facade | `5250ab6`, `9a7e857` | Added a versioned player profile repository plus profile-backed read history and tolerant restore/reset behavior |
| 2 | Wire profile-backed persistence through runtime bootstrap and slot IPC without collapsing the boundary | `0133839`, `3b433bc` | Bootstrapped runtime player data from `script.projectId`, kept slot IPC slot-only, and added named reset/rebuild surfaces |

## Verification

- `npx vitest run tests/playerDataRepository.test.js`
- `npx vitest run tests/playerDataRepository.test.js && npm run build`

## Decisions Made

- Player progression now loads before gameplay through `PlayerDataRepository`, so read history no longer depends on mutable title-derived keys.
- Save slot handlers remain responsible only for run snapshots; persistent profile truth moved to `player-data/profile.json` via `load-player-profile` / `save-player-profile`.
- Development reset flows stay explicit: `resetPlayerData(scope)` handles narrow profile/save scopes, while `rebuildPlayerData()` refreshes the contract-backed player-data boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added preload IPC allowlist entries for the new player-data surface**
- **Found during:** Task 2
- **Issue:** The new profile/reset/rebuild IPC handlers were unreachable from the renderer because `electron/preload.js` still blocked those channels.
- **Fix:** Added `load-player-profile`, `save-player-profile`, `reset-player-data`, and `rebuild-player-data` to the preload allowlist.
- **Files modified:** `electron/preload.js`
- **Commit:** `3b433bc`

## Auth Gates

None.

## Known Stubs

None.

## Self-Check: PASSED

- Verified summary and all key implementation files exist.
- Verified task commits `5250ab6`, `9a7e857`, `0133839`, and `3b433bc` exist in git history.
