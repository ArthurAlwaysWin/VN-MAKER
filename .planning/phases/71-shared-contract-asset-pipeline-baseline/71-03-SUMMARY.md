---
phase: 71-shared-contract-asset-pipeline-baseline
plan: 03
subsystem: ui
tags: [ui-images, scan-assets, export, layout-editor, vitest, node-test]
requires:
  - phase: 71-01
    provides: shared canonical ui image contract and picker helper
  - phase: 71-02
    provides: runtime-safe canonical ui image handling for theme nine-slice
provides:
  - shared picker wiring for screen and decoration ui image entry points
  - registry-driven ui image scan bucket
  - web and desktop export coverage for ui assets
affects: [Phase 72, Phase 74, asset export pipeline]
tech-stack:
  added: []
  patterns:
    - layout image fields show current value read-only and mutate through shared pick/clear helpers
    - scanAssets delegates canonical ui image collection to shared registry and returns a dedicated ui bucket
    - web and desktop export pipelines copy assetDict.ui alongside existing asset classes
key-files:
  created:
    - tests/screenUiImageEntryWiring.test.js
  modified:
    - src/editor/components/layout/DecorationSection.vue
    - src/editor/components/layout/PanelBackgroundSection.vue
    - src/editor/components/layout/BacklogSection.vue
    - src/editor/components/layout/GameMenuSection.vue
    - src/editor/components/layout/SaveLoadSection.vue
    - src/shared/uiImageContract.js
    - src/engine/scanAssets.js
    - electron/exportGame.js
    - electron/exportDesktop.js
    - tests/scanAssets.test.js
    - tests/exportGame.test.js
    - tests/exportDesktop.test.js
key-decisions:
  - "PanelBackgroundSection now writes the settings screen root object directly instead of the incorrect nested settingsScreen.background path."
  - "The first shared scan registry only accepts canonical ui/... values into the ui bucket, leaving legacy paths readable at runtime without reclassifying them as new canonical assets."
  - "Save/load slot backgroundImage joins the shared picker flow now so scan/export and editor entry points stay aligned for a supported runtime field."
patterns-established:
  - "Screen and decor image entry surfaces should never persist freeform path edits as the primary write path; use pickUiImage()/clearUiImage() and owner callbacks."
  - "Future phases extend UI_IMAGE_SCAN_REGISTRY instead of editing scanAssets() conditionals directly."
requirements-completed: [AST-01, AST-05, AST-06]
completed: 2026-04-22
---

# Phase 71 Plan 03: Screen Entry and Export Baseline Summary

**Phase 71 now closes the remaining screen/decor UI image entry gaps and guarantees canonical `ui/...` assets are scanned and exported in both web and desktop flows**

## Accomplishments

- Rewired `DecorationSection.vue`, `PanelBackgroundSection.vue`, `BacklogSection.vue`, `GameMenuSection.vue`, and `SaveLoadSection.vue` so image fields use the shared pick/clear helpers instead of freeform text writes.
- Fixed the settings panel background schema bug by writing `background` and `backgroundOpacity` on the real settings screen root object.
- Expanded `uiImageContract.js` with default collectors for theme, screen chrome, and widget-style runtime image fields.
- Updated `scanAssets()` to emit a dedicated `ui` bucket from the shared registry and extended both export pipelines to copy `assetDict.ui`.
- Added focused regression coverage for source wiring, ui asset scanning, and ui asset export copying.

## Task Commits

Execution completed with two plan commits:

1. **Plan 71-03 implementation and focused coverage** - `fb9bfb6` (`feat`)
2. **Plan 71-03 summary and state update** - `pending` (`docs`)

## Files Created/Modified

- `src/editor/components/layout/DecorationSection.vue` - switches decoration image writes to shared picker helpers.
- `src/editor/components/layout/PanelBackgroundSection.vue` - switches background selection to shared helpers and fixes settings root writes.
- `src/editor/components/layout/BacklogSection.vue` - routes backlog and header background images through shared helpers.
- `src/editor/components/layout/GameMenuSection.vue` - routes game menu background image through shared helpers.
- `src/editor/components/layout/SaveLoadSection.vue` - routes background, header background, and slot background image through shared helpers.
- `src/shared/uiImageContract.js` - seeds shared collectors for theme, screen chrome, and widget-style UI image scan paths.
- `src/engine/scanAssets.js` - adds registry-driven `ui` bucket output.
- `electron/exportGame.js` - copies `assetDict.ui` into web export output.
- `electron/exportDesktop.js` - copies `assetDict.ui` into desktop staging output.
- `tests/screenUiImageEntryWiring.test.js` - locks section-level helper wiring and the settings root fix.
- `tests/scanAssets.test.js` - locks the dedicated `ui` bucket and runtime-supported collector coverage.
- `tests/exportGame.test.js` / `tests/exportDesktop.test.js` - lock ui asset copying during export.

## Decisions Made

- Kept the editor display field read-only for image paths so legacy values remain visible without reintroducing text-entry writes as the main mutation path.
- Added shared registry collectors in the contract file instead of embedding field-specific knowledge inside `scanAssets()`, so later phases can append collectors without reopening export logic.

## Deviations from Plan

None - plan executed within the intended scope.

## Issues Encountered

- Existing repo-wide unrelated changes required scoped staging so only Phase 71 files are carried into commits.

## User Setup Required

None - no migration or external setup required.

## Known Stubs

None.

## Next Phase Readiness

- Phase 72 can reuse the now-complete screen/export baseline without reopening canonical path or asset copy semantics.
- Later UI image rollout phases only need to add new surfaces and collectors, not a new asset export path.

## Verification Evidence

- `node --test tests/scanAssets.test.js tests/exportDesktop.test.js tests/decorLayoutEditor.test.js`
- `npx vitest run tests/screenUiImageEntryWiring.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/gameMenuLayout.test.js tests/exportGame.test.js`
- `npm run build`

## Self-Check: PASSED

---
*Phase: 71-shared-contract-asset-pipeline-baseline*
*Completed: 2026-04-22*
