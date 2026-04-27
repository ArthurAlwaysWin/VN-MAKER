---
phase: 73-button-family-image-rollout
plan: 01
subsystem: ui
tags: [ui-images, theme-manager, scan-assets, vitest, node-test]
requires:
  - phase: 71-03
    provides: shared UI image scan registry and canonical ui/... asset pipeline
  - phase: 72
    provides: runtime-backed preview and UI image layering conventions
provides:
  - canonical ui.theme.buttonFamilies scan coverage for the five locked button families
  - centralized ThemeManager selector registry for game menu, QAB, close, pager, and settings tabs
  - dedicated button-family CSS injection entry point separate from nine-slice styling
affects: [Phase 73-02, Phase 73-03, button-family runtime rollout, theme editor wiring]
tech-stack:
  added: []
  patterns:
    - ui.theme.buttonFamilies owns the frozen five-family image contract and feeds scanAssets through the shared registry
    - ThemeManager emits button-family state CSS from a single selector registry and maps selected imagery onto existing .active semantics
key-files:
  created:
    - .planning/phases/73-button-family-image-rollout/73-01-SUMMARY.md
  modified:
    - src/shared/uiImageContract.js
    - src/engine/ThemeManager.js
    - tests/uiImageContract.test.js
    - tests/scanAssets.test.js
    - tests/themeManagerUiImage.test.js
key-decisions:
  - "The button-family contract stays under ui.theme.buttonFamilies and only scans the five locked Phase 73 families."
  - "ThemeManager owns one selector registry for button families and uses .active for selected-state CSS instead of introducing a new state machine."
patterns-established:
  - "Future button-family asset expansion should extend the shared buttonFamilies contract instead of adding per-screen roots."
  - "Button-family theme CSS should live in the dedicated galgame-button-families style tag, not in nine-slice or per-screen inline styles."
requirements-completed: [BTN-01, BTN-02]
duration: 3min
completed: 2026-04-23
---

# Phase 73 Plan 01: Button Family Contract and ThemeManager Registry Summary

**Frozen `ui.theme.buttonFamilies` scan coverage and a dedicated ThemeManager button-family CSS registry for the five locked button families.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-23T03:02:32Z
- **Completed:** 2026-04-23T03:05:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended the shared UI image contract so scan/export now sees canonical button-family assets for the five approved families only.
- Added focused regression coverage proving button-family image states stay canonical and legacy-safe in the `ui` asset bucket.
- Introduced a centralized ThemeManager selector registry plus a separate button-family style tag that maps selected imagery through existing `.active` semantics.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the canonical button-family contract and collector**
   - `7ddf702` (`test`) RED: failing contract and scan coverage for the five button families
   - `494dd08` (`feat`) GREEN: shared `ui.theme.buttonFamilies` collector implementation
2. **Task 2: Freeze the ThemeManager selector registry and CSS-builder interface**
   - `cb62368` (`test`) RED: failing selector-registry and button CSS generation coverage
   - `2713cc6` (`feat`) GREEN: button-family selector registry and dedicated style-tag application path

**Plan metadata:** `pending` (`docs`)

## Files Created/Modified
- `src/shared/uiImageContract.js` - adds locked button-family state collection into the shared UI image scan registry.
- `src/engine/ThemeManager.js` - adds the five-family selector registry plus dedicated button-family CSS apply/reset helpers.
- `tests/uiImageContract.test.js` - locks button-family contract collection and legacy-safe filtering behavior.
- `tests/scanAssets.test.js` - proves scanAssets includes canonical button-family paths in the `ui` bucket.
- `tests/themeManagerUiImage.test.js` - proves ThemeManager registry coverage, close-family multi-selector output, and `.active` selected-state mapping.

## Decisions Made
- Kept button-family state ownership inside `ui.theme.buttonFamilies` so later runtime/editor tasks target one shared contract instead of per-screen fields.
- Mapped `selected` image states to existing `.active` selectors for pager and settings tabs to preserve current runtime semantics.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Existing unrelated working-tree changes required scoped staging so only Phase 73-01 files were included in task commits.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness
- Phase 73-02 can now wire runtime button-family imagery against a frozen contract and selector registry without redefining family keys.
- Phase 73-03 can attach editor fields and preview routing to the same shared `buttonFamilies` schema and ThemeManager interface.

## Verification Evidence

- `node --test tests/uiImageContract.test.js tests/scanAssets.test.js`
- `npx vitest run tests/themeManagerUiImage.test.js`

## Self-Check: PASSED

