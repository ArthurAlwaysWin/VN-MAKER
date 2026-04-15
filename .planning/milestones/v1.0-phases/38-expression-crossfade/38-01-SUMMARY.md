---
phase: 38-expression-crossfade
plan: 01
subsystem: engine
tags: [crossfade, css-transition, img-decode, preload, skipMode]

requires:
  - phase: 37-characterlayer-dom
    provides: Dual-layer A/B DOM structure (imgA/imgB + activeImg tracking)
provides:
  - Expression crossfade with CSS opacity transition (300ms)
  - img.decode() preload gate preventing flash-white
  - Generation counter for rapid-switch cancellation
  - Skip mode instant swap (0ms) for set_expression and show_character
affects: [39-scene-transition, 40-expression-editor, 41-integration]

tech-stack:
  added: []
  patterns: [A/B crossfade with generation counter, img.decode() preload]

key-files:
  created: []
  modified:
    - src/ui/CharacterLayer.js
    - src/style.css
    - src/main.js

key-decisions:
  - "D-01: Fixed 300ms crossfade duration (CSS transition: opacity 0.3s ease)"
  - "D-02: Cross-page expression changes also crossfade (wasVisible characters)"
  - "D-03: No per-event configurability — hardcoded global 300ms"

patterns-established:
  - "A/B crossfade: flip activeImg, toggle .active class, setTimeout cleanup"
  - "Preload gate: await img.decode() before class swap"
  - "Generation counter: _crossfadeGen increments on each call, stale callbacks check gen===current"

requirements-completed: [ENG-02, ENG-03]

duration: 5min
completed: 2025-07-22
---

# Phase 38-01: Expression Crossfade Summary

**A/B layer crossfade with img.decode() preload, 300ms CSS opacity transition, generation-counter cancellation, and skipMode 0ms instant swap**

## Performance

- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- CSS `transition: opacity 0.3s ease` on dual-layer `.char-img-a/.char-img-b`
- `_crossfade()` method: async preload via `img.decode()`, A/B class toggle, timer cleanup
- Generation counter prevents stale crossfade callbacks on rapid expression changes
- `setExpression()` same-image skip + crossfade for changed expressions
- `show()` crossfades existing characters with changed expression (D-02)
- `hide()/clear()` cancel pending crossfade timers
- `set_expression` + `show_character` handlers pass `skip: true` in skipMode

## Task Commits

1. **Task 1: CSS transition + CharacterLayer crossfade** — `b0c795b` (feat)
2. **Task 2: main.js skipMode integration** — `b89685f` (feat)

## Files Created/Modified
- `src/ui/CharacterLayer.js` — Full crossfade engine: _crossfade(), updated show/hide/setExpression/clear
- `src/style.css` — Added transition: opacity 0.3s ease to char-img-a/b
- `src/main.js` — skipMode checks for set_expression, skip: true on show_character

## Decisions Made
None — followed plan as specified. All 3 user decisions (D-01/D-02/D-03) from CONTEXT.md honored.

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- CharacterLayer crossfade complete, BackgroundLayer crossfade already existed
- Ready for Phase 39 (scene transition) which builds on both layers
- Entry type now includes currentImage, _crossfadeGen, _crossfadeTimer

---
*Phase: 38-expression-crossfade*
*Completed: 2025-07-22*
