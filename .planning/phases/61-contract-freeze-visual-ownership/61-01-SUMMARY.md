---
phase: 61-contract-freeze-visual-ownership
plan: 01
subsystem: ui
tags: [dom, runtime, export, vitest, camera-scope]
requires: []
provides:
  - "Runtime and export shells isolate stage visuals inside #stage-layer"
  - "CharacterLayer separates layout ownership from future motion ownership"
  - "Ownership regression tests protect runtime/export parity"
affects: [phase-62, phase-63, phase-64, camera, character-animation, export]
tech-stack:
  added: [vitest-config]
  patterns: [stage-owned DOM scope, character-motion wrapper, export/runtime shell parity]
key-files:
  created: [tests/stageLayerOwnership.test.js, vitest.config.js]
  modified: [index.html, src/main.js, src/style.css, src/ui/CharacterLayer.js, electron/exportGame.js, tests/exportGame.test.js]
key-decisions:
  - "Reserved #stage-layer as the only future page-camera scope while leaving dialogue and overlay UI as direct game-container children."
  - "Inserted .character-motion between .character-sprite and imgA/imgB so future motion transforms do not interfere with layout or crossfade ownership."
patterns-established:
  - "Runtime HTML and exported HTML must share the same stage-layer ownership boundary."
  - "CharacterLayer keeps layout and enter transforms on .character-sprite, future motion on .character-motion, and expression crossfade on imgA/imgB."
requirements-completed: [CAM-05]
duration: 1 min
completed: 2026-04-21
---

# Phase 61 Plan 01: Stage DOM ownership and character motion wrapper Summary

**Stage-scoped runtime/export shells with a reserved CharacterLayer motion wrapper that keeps dialogue and overlay UI outside future camera transforms.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-21T05:27:12Z
- **Completed:** 2026-04-21T05:28:27Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added `#stage-layer` to both runtime and exported HTML so only background and character visuals are inside the future camera scope.
- Refactored `CharacterLayer` DOM creation to emit `.character-sprite > .character-motion > imgA/imgB` without changing existing crossfade behavior.
- Added ownership regression coverage for runtime shell, export shell, and CharacterLayer DOM structure using the exact plan verification command.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write ownership regression tests before refactor** - `82728fc` (test)
2. **Task 2: Refactor runtime/export DOM ownership to satisfy the tests** - `c648a39` (feat)

## Files Created/Modified
- `tests/stageLayerOwnership.test.js` - Guards runtime shell ownership, `main.js` stage lookup, and CharacterLayer motion-wrapper structure.
- `tests/exportGame.test.js` - Migrated export tests to Vitest and added exported shell ownership assertions.
- `vitest.config.js` - Excludes nested `.worktrees` copies so the required Vitest command targets the intended test files.
- `index.html` - Wraps background and character hosts in `#stage-layer`.
- `src/main.js` - Adds explicit `#stage-layer` lookup while keeping dialogue and overlay hosts outside stage scope.
- `src/style.css` - Styles `#stage-layer` and `.character-motion` without changing dialogue/UI layering.
- `src/ui/CharacterLayer.js` - Inserts `.character-motion` between `.character-sprite` and `imgA`/`imgB`.
- `electron/exportGame.js` - Generates exported HTML with the same stage ownership boundary as runtime.

## Decisions Made
- Introduced `#stage-layer` as the future page-camera owner instead of moving camera scope to `#game-container`, preserving dialogue and overlay readability.
- Kept background transition ownership in `BackgroundLayer` and limited this plan to DOM ownership scaffolding only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded nested worktree tests from Vitest discovery**
- **Found during:** Task 1 (Write ownership regression tests before refactor)
- **Issue:** The required command `npx vitest run tests/stageLayerOwnership.test.js tests/exportGame.test.js` also discovered `.worktrees/v1.4-cinematic-upgrade/tests/exportGame.test.js`, causing unrelated suite failures.
- **Fix:** Added `vitest.config.js` with `.worktrees/**` excluded and migrated `tests/exportGame.test.js` to Vitest so the mandated command exercised only the intended regression suite.
- **Files modified:** `tests/exportGame.test.js`, `vitest.config.js`
- **Verification:** `npx vitest run tests/stageLayerOwnership.test.js tests/exportGame.test.js` failed in RED for ownership assertions, then passed after implementation.
- **Committed in:** `82728fc`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required to make the plan’s exact verification command reliable. No product scope changed.

## Issues Encountered
- Vitest initially picked up a duplicate nested worktree test file; excluding `.worktrees/**` restored deterministic task verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 62 can attach future character preset motion to `.character-motion` without disturbing layout or crossfade ownership.
- Phase 63 can target `#stage-layer` for camera effects while keeping dialogue, menus, settings, backlog, and title overlays readable.

## Self-Check
PASSED

- Found `.planning/phases/61-contract-freeze-visual-ownership/61-01-SUMMARY.md`
- Found task commits `82728fc` and `c648a39`

---
*Phase: 61-contract-freeze-visual-ownership*
*Completed: 2026-04-21*
