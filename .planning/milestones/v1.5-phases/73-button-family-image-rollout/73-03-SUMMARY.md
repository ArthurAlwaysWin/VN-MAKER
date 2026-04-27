---
phase: 73-button-family-image-rollout
plan: 03
subsystem: editor
tags: [button-family, theme-editor, preview-routing, vitest]
requires:
  - phase: 73-01
    provides: frozen ui.theme.buttonFamilies contract and ThemeManager selector registry
provides:
  - centralized button-family image editor surface under global theme
  - preview routing via existing runtime-backed owners for all five families
affects: [button-family runtime rendering, theme editor UX, iframe preview targets]
tech-stack:
  added: []
  patterns:
    - ButtonFamilyImageSettings.vue uses pickUiImage/clearUiImage shared helpers exclusively
    - buttonFamilyPreviewMap routes families to existing show-screen/show-dialogue-preview targets
key-files:
  created:
    - src/editor/components/theme/ButtonFamilyImageSettings.vue
    - tests/buttonFamilyPreviewWiring.test.js
  modified:
    - src/editor/views/ProjectSettings.vue
    - tests/uiImageFieldFlow.test.js
key-decisions:
  - "Button-family editor is mounted in the global theme section of ProjectSettings, not in per-screen editors."
  - "Preview routing uses existing runtime owners: gameMenu, saveLoadScreen, settingsScreen, and show-dialogue-preview for QAB."
  - "No new iframe message types or sandbox renderers are introduced."
patterns-established:
  - "Future button-family UI expansions should extend ButtonFamilyImageSettings.vue and the buttonFamilyPreviewMap."
requirements-completed: [BTN-01, BTN-02, BTN-03]
duration: 4min
completed: 2026-04-23
---

# Phase 73 Plan 03: Button-Family Editor Surface and Preview Routing Summary

**Centralized five-family image editor with preview routing through existing runtime-backed owners (gameMenu, saveLoadScreen, settingsScreen, dialogue preview).**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-23T05:31:57Z
- **Completed:** 2026-04-23T05:36:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created ButtonFamilyImageSettings.vue exposing all five locked families (gameMenuButton, qab, closeButton, pageTabPager, settingsTab) with correct state keys (3-state for buttons, 4-state for tabs).
- Mounted the component in ProjectSettings.vue inside the global theme section.
- Implemented buttonFamilyPreviewMap routing each family to its runtime-backed owner screen.
- All image fields use the shared pickUiImage/clearUiImage canonical helpers with no FileReader fallback.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the centralized button-family editor surface under ui.theme**
   - `c9a075e` (`test`) RED: failing tests for button-family editor surface
   - `f9e000a` (`feat`) GREEN: centralized button-family image editor surface

2. **Task 2: Reuse runtime-backed preview owners for each family**
   - `37c0049` (`test`) RED: failing tests for button-family preview routing
   - `9e582ae` (`feat`) GREEN: button-family preview routing via existing runtime owners

## Files Created/Modified
- `src/editor/components/theme/ButtonFamilyImageSettings.vue` - five-family image state editor with pick/clear flows.
- `src/editor/views/ProjectSettings.vue` - mounts ButtonFamilyImageSettings, adds buttonFamilyPreviewMap routing.
- `tests/uiImageFieldFlow.test.js` - extended with button-family editor surface tests.
- `tests/buttonFamilyPreviewWiring.test.js` - preview routing regression coverage.

## Decisions Made
- Kept all button-family editing in one global theme panel rather than per-screen forms.
- Preview routing reuses existing show-screen and show-dialogue-preview message types.
- QAB family routes to dialogue preview since QAB buttons appear on the dialogue surface.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Known Stubs

None.

## TDD Gate Compliance

Verified in git log:
1. Task 1: `test(73-03)` commit (c9a075e) before `feat(73-03)` commit (f9e000a) - PASS
2. Task 2: `test(73-03)` commit (37c0049) before `feat(73-03)` commit (9e582ae) - PASS

## Next Phase Readiness
- All five button families are now editable from a single global theme panel.
- Preview routing is wired to existing runtime owners - no new sandbox needed.
- Phase 73-02 runtime underlays will render the images set through this editor surface.

## Verification Evidence

- `npx vitest run tests/uiImageFieldFlow.test.js tests/buttonFamilyPreviewWiring.test.js` - 18 tests passed

## Self-Check: PASSED
