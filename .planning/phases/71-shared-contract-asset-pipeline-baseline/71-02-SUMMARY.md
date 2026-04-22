---
phase: 71-shared-contract-asset-pipeline-baseline
plan: 02
subsystem: ui
tags: [ui-images, nine-slice, theme, runtime, vitest]
requires:
  - phase: 71-01
    provides: shared canonical ui image helper and editor-side picker contract
provides:
  - ThemeManager nine-slice runtime path resolution for canonical ui image paths
  - NineSliceModal wiring to shared picker and clear helpers
  - focused regression coverage for canonical and legacy nine-slice reads
affects: [71-03-PLAN.md, Phase 72, theme preview/runtime]
tech-stack:
  added: []
  patterns:
    - runtime nine-slice css uses shared asset path resolution before emitting urls
    - nine-slice editor surfaces reuse shared pick and clear helpers instead of FileReader persistence
key-files:
  created:
    - tests/themeManagerUiImage.test.js
  modified:
    - src/engine/ThemeManager.js
    - src/editor/components/theme/NineSliceModal.vue
    - tests/uiImageFieldFlow.test.js
key-decisions:
  - "ThemeManager resolves normal, hover, and active sources at CSS generation time so canonical ui/... values work without changing selector behavior."
  - "NineSliceModal keeps using the existing preview owner and close-to-commit flow, but selection and clear now route through shared helpers."
patterns-established:
  - "Any runtime-consumed UI image source should pass through resolvePath() before being interpolated into CSS or DOM urls."
  - "Theme editor image pickers should reuse pickUiImage()/clearUiImage() and avoid FileReader-based persistence."
requirements-completed: [AST-01, AST-02, AST-05, AST-06]
duration: 6 min
completed: 2026-04-23
---

# Phase 71 Plan 02: Nine-Slice Runtime and Picker Wiring Summary

**Theme nine-slice now accepts canonical `ui/...` paths at runtime while the editor modal writes new selections through the shared picker contract instead of persisting base64 data URLs**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-23T01:14:00+10:00
- **Completed:** 2026-04-23T01:19:15+10:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Updated `ThemeManager.js` so nine-slice normal, hover, and active sources all pass through `resolvePath()` before CSS generation.
- Rewired `NineSliceModal.vue` to use `pickUiImage()` and `clearUiImage()` for standard UI asset selection and clearing, removing `FileReader` persistence.
- Added focused regression coverage for runtime CSS generation, legacy data URL compatibility, and modal source wiring.

## Task Commits

Execution completed with one plan commit:

1. **Plan 71-02 runtime and modal wiring** - `53a10e7` (`feat`)

## Files Created/Modified

- `src/engine/ThemeManager.js` - Resolves nine-slice image sources before emitting `border-image` CSS for normal and button states.
- `src/editor/components/theme/NineSliceModal.vue` - Replaces FileReader persistence with shared picker and clear helpers while keeping preview-on-change and commit-on-close behavior.
- `tests/themeManagerUiImage.test.js` - Covers canonical path resolution, legacy data URL compatibility, and safe omission of optional state rules.
- `tests/uiImageFieldFlow.test.js` - Adds regression coverage that the modal source now references shared picker helpers and no longer contains FileReader persistence.

## Decisions Made

- Kept the modal’s commit point on close so this change stays inside Phase 71’s asset-path scope rather than rewriting theme-editor save semantics.
- Added an editor-side preview source adapter for canonical and legacy paths so the modal thumbnail still has a direct display source after the persistence format changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest in this repo does not parse `.vue` SFC imports in the focused harness, so the modal regression is locked via a source-level wiring assertion instead of a mounted component test.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- `71-03` can now reuse the same canonical-path semantics when converting screen and decor entry points.
- Scan/export changes can assume canonical `ui/...` nine-slice values are already runtime-safe and no longer need data-URL-only handling for new writes.

## Self-Check: PASSED

---
*Phase: 71-shared-contract-asset-pipeline-baseline*
*Completed: 2026-04-23*
