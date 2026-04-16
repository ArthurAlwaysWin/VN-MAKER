---
phase: 43-screenlayouts
plan: 03
subsystem: ui
tags: [game-menu, layout-config, dom-rendering, css-sanitization]
requires:
  - phase: 42-screenlayouts
    provides: sanitize.js utilities (sanitizeCssValue, clampField)
provides:
  - "GameMenu.setLayout(config) method for config-driven menu rendering"
  - "Config-driven panel styles: position/width/background/backgroundImage/borderRadius/backdropBlur/buttonGap"
  - "Config-driven button text and icon rendering from ui.gameMenu schema"
affects: [45-integration, main.js wiring]
tech-stack:
  added: []
  patterns: [config-branching-in-render, event-delegation-in-constructor, default-labels-fallback]
key-files:
  created:
    - tests/gameMenuLayout.test.js
  modified:
    - src/ui/GameMenu.js
key-decisions:
  - "Moved click handler from _render() to constructor to prevent duplicate listeners on re-render"
  - "DEFAULT_LABELS uses simplified Chinese matching codebase (not traditional from design spec)"
  - "Used clampField('borderRadius') for backdropBlur and clampField('padding') for buttonGap (closest bounds)"
patterns-established:
  - "Config-branching in _render(): null→hardcoded, object→config-driven (same as SettingsScreen)"
  - "Event delegation in constructor survives innerHTML rebuilds"
requirements-completed: [SCREEN-03, COMPAT-02]
duration: 7min
completed: 2026-04-16
---

# Phase 43 Plan 03: GameMenu.setLayout() Summary

**Config-driven GameMenu rendering with position/background/button-text/icon support via setLayout(config), null-config COMPAT-02 preserved**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-16T22:25:19Z
- **Completed:** 2026-04-16T22:31:45Z
- **Tasks:** 4
- **Files modified:** 2

## Accomplishments

- Added `setLayout(config)` method to GameMenu with config storage and re-render trigger
- Config-driven _render() path applies all Section 5.2 schema properties: position, width, background, backgroundImage, borderRadius, backdropBlur, buttonGap
- Config-driven button rendering with custom text, icon support, and DEFAULT_LABELS fallback
- Null-config path preserves byte-for-byte original hardcoded HTML (COMPAT-02 verified)
- 33 unit tests covering all config properties, COMPAT-02 compatibility, CSS sanitization, and click delegation

## Task Commits

Each task was committed atomically:

1. **Tasks 1-3: Add setLayout() + config-driven _render() + button text/icons** - `c6782fc` (feat)
2. **Task 4: Unit tests** - `d8cc58d` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/ui/GameMenu.js` — Added imports (sanitize.js, assetPath.js), DEFAULT_LABELS/BUTTON_ORDER constants, _layoutConfig field, setLayout() method, config-driven _render() branch with panel styles and button generation, moved click handler to constructor
- `tests/gameMenuLayout.test.js` — 33 vitest+jsdom tests: setLayout storage (5), COMPAT-02 default rendering (6), config-driven panel styles (12), button text/icons (6), click delegation after re-render (3), full config integration (1)

## Decisions Made

- **Click handler moved to constructor:** Since setLayout() triggers _render() which rebuilds innerHTML, the event listener was moved from _render() to the constructor. Event delegation via `closest('[data-action]')` works regardless of innerHTML changes, preventing duplicate listener accumulation.
- **DEFAULT_LABELS uses simplified Chinese:** The actual codebase uses simplified characters (读, 设) not traditional (読, 設) from the design spec. DEFAULT_LABELS matches the codebase to ensure consistency.
- **Clamping field reuse:** Used `clampField('borderRadius')` for backdropBlur (0-500 range) and `clampField('padding')` for buttonGap (0-200 range) as the closest predefined bounds in sanitize.js.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Implementation already committed by parallel agent**
- **Found during:** Task 1
- **Issue:** A parallel agent executing plan 43-02 had already committed the full GameMenu.js implementation changes in commit `c6782fc` (incorrectly bundled with BacklogScreen test commit)
- **Fix:** Verified the implementation matches plan requirements exactly, skipped redundant commit, proceeded to write tests
- **Files affected:** src/ui/GameMenu.js
- **Committed in:** c6782fc (prior agent)

---

**Total deviations:** 1 (implementation pre-committed by parallel agent)
**Impact on plan:** No functional impact. Implementation is correct and complete. Only the test commit is new from this execution.

## Issues Encountered

- jsdom normalizes CSS values differently from browsers: `rgba(0,0,0,0.75)` → `rgba(0, 0, 0, 0.75)`, `background-position: center` → `center center`, shorthand `background` sets `background-image` to `none`. Tests adjusted to use `toContain` for these values.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GameMenu.setLayout(config) is ready for Phase 45 integration (CONFIG-01 wiring in main.js)
- All 3 screen layout plans (43-01: SaveLoadScreen, 43-02: BacklogScreen, 43-03: GameMenu) provide setLayout() methods
- No blockers or concerns

---
*Phase: 43-screenlayouts*
*Completed: 2026-04-16*
