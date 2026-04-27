---
phase: 73-button-family-image-rollout
plan: 02
subsystem: ui
tags: [button-families, theme-manager, css-injection, underlay, runtime]
requires:
  - phase: 73-01
    provides: frozen button-family contract and ThemeManager selector registry
provides:
  - runtime button-family CSS injection via ::before pseudo-element underlays
  - selector-safe close hooks for structured and custom settings layouts
  - gm-tab .active parity for widget-style settings tabs
  - applyButtonFamilies wired into all theme update paths (init, preview, update-theme)
affects: [Phase 73-03, theme editor button-family preview, runtime button skinning]
tech-stack:
  added: []
  patterns:
    - button-family imagery uses ::before pseudo-element underlays below text/SVG content
    - shared base rule emits position:relative + isolation:isolate for stacking context
    - CSS helpers in style.css define content/inset/z-index/pointer-events for underlay pseudo-elements
key-files:
  created:
    - tests/quickActionBarButtonFamily.test.js
  modified:
    - src/engine/ThemeManager.js
    - src/main.js
    - src/style.css
    - src/ui/widgets/TabWidget.js
    - src/ui/SettingsScreen.js
    - tests/themeManagerUiImage.test.js
    - tests/gameMenuLayout.test.js
    - tests/saveLoadScreenLayout.test.js
    - tests/configurableTabs.test.js
    - tests/settingsStructured.test.js
key-decisions:
  - "Button-family CSS uses ::before pseudo-element underlays rather than direct background-image, preserving text/SVG readability and click targets."
  - "A shared base rule for position:relative + isolation:isolate is emitted for all selectors that have active button-family entries."
patterns-established:
  - "Button-family states map to CSS pseudo-classes via BUTTON_FAMILY_PSEUDO_MAP (normal=::before, hover=:hover::before, pressed=:active::before, selected=.active::before)."
requirements-completed: [BTN-01, BTN-02, BTN-03]
duration: 3min
completed: 2026-04-23
---

# Phase 73 Plan 02: Button-Family CSS Injection and Runtime Wiring Summary

**Runtime button-family ::before underlay injection across all five frozen families with selector-safe close hooks and gm-tab active parity.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-23T15:31:00Z
- **Completed:** 2026-04-23T15:36:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Normalized DOM hooks: gm-tab `.active` toggle already in place; structured footer close buttons get `.settings-structured-footer-close`; custom layout close buttons get `.settings-custom-close`.
- Refactored ThemeManager `buildButtonFamilyCSS` to emit `::before` pseudo-element underlays instead of direct `background-image`, keeping labels, SVGs, and click targets intact.
- Added shared base rule emitting `position: relative; isolation: isolate` for all selectors with active button-family entries.
- Wired `applyButtonFamilies` into all three theme update paths in `main.js`: preview snapshot, runtime init, and `update-theme` message handler.
- Added CSS helpers in `style.css` for underlay pseudo-element positioning (`content`, `inset`, `z-index: -1`, `pointer-events: none`).
- Created `tests/quickActionBarButtonFamily.test.js` proving QAB active/disabled/SVG semantics are preserved alongside button-family underlay CSS.

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize selected and close-role hooks before skinning**
   - `5ec53bf` (`test`) RED: failing tests for settings tab and close hooks
   - `d2882cd` (`feat`) GREEN: normalize settings tab and close hooks
2. **Task 2: Wire button-family CSS injection through runtime and lock semantic regressions**
   - `47bf829` (`test`) RED: failing tests for button-family underlays
   - `bf56701` (`feat`) GREEN: wire button-family CSS injection through runtime

## Files Created/Modified
- `src/engine/ThemeManager.js` - refactored button-family CSS builder to use ::before underlay pattern with shared base rule
- `src/main.js` - wired applyButtonFamilies at preview, runtime init, and update-theme paths
- `src/style.css` - added button-family ::before underlay positioning helpers
- `src/ui/widgets/TabWidget.js` - gm-tab .active toggle (already present, verified)
- `src/ui/SettingsScreen.js` - settings-structured-footer-close and settings-custom-close hooks (already present, verified)
- `tests/themeManagerUiImage.test.js` - extended with ::before underlay assertions and selected-state mapping
- `tests/gameMenuLayout.test.js` - added button-family preservation test
- `tests/saveLoadScreenLayout.test.js` - added close and pager selector preservation test
- `tests/quickActionBarButtonFamily.test.js` - new: QAB active/disabled/SVG regression with underlay CSS
- `tests/configurableTabs.test.js` - added createTabBar .active parity test
- `tests/settingsStructured.test.js` - added close-role hook selector tests

## Decisions Made
- Used `::before` pseudo-element underlays so button-family imagery stays below text/SVG content without replacing DOM or intercepting clicks.
- Mapped button-family states through a frozen `BUTTON_FAMILY_PSEUDO_MAP` for consistent CSS generation across all five families.

## Deviations from Plan

None - plan executed exactly as written. Task 1 DOM hooks (gm-tab .active, close-role classes) were already implemented by prior commits in the TDD RED/GREEN cycle.

## Known Stubs

None.

## Verification Evidence

- `npx vitest run tests/themeManagerUiImage.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/quickActionBarButtonFamily.test.js tests/settingsStructured.test.js` -- 147 tests passed
- `node --test tests/configurableTabs.test.js` -- 21 tests passed

## Self-Check: PASSED
