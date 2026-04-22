---
phase: 72-dialogue-box-picture-loop
plan: 03
subsystem: editor-preview
tags: [dialogue-box, editor, preview, iframe, ui-images, vitest]
requires:
  - phase: 72-01
    provides: dialogue-box schema and collector baseline
  - phase: 72-02
    provides: runtime underlay and renderPreviewLine owner
provides:
  - dialogue image controls in DialogueBoxSettings
  - ProjectSettings-owned show-dialogue-preview iframe flow
  - focused preview routing regression coverage
affects: [Phase 72, ProjectSettings iframe preview, future Phase 73 preview reuse]
tech-stack:
  added: []
  patterns:
    - dialogue-specific image writes reuse pickUiImage and clearUiImage instead of local file loaders
    - ProjectSettings remains the single iframe preview owner and posts a stable dialogue sample into runtime
key-files:
  created:
    - tests/dialogueBoxPreviewWiring.test.js
  modified:
    - src/editor/components/DialogueBoxSettings.vue
    - src/editor/views/ProjectSettings.vue
    - src/main.js
    - tests/uiImageFieldFlow.test.js
key-decisions:
  - "The local mini preview remains a form aid only; runtime-backed iframe preview is the completion signal for dialogue image changes."
  - "Dialogue preview routing reuses the real DialogueBox runtime owner instead of adding an editor-side renderer."
patterns-established:
  - "Future ProjectSettings preview features should keep message ownership in the view and route through stable postMessage types."
requirements-completed: [DLG-01, DLG-03]
completed: 2026-04-22
---

# Phase 72 Plan 03: Dialogue Editor and Preview Wiring Summary

**Phase 72 now closes the editor/runtime loop: dialogue image fields are editable through the shared picker helpers, and the right-side iframe can render a stable runtime dialogue sample on demand**

## Accomplishments

- Extended `DialogueBoxSettings.vue` with a nameplate background image field, decoration row management, and per-row `x` / `y` / `width` / `height` controls.
- Routed every dialogue image write through `pickUiImage()` / `clearUiImage()` and persisted updates back to `ui.dialogueBox` via the existing store owner.
- Added a ProjectSettings-owned `show-dialogue-preview` callback that starts the preview engine, flushes current state, and posts a stable sample speaker/text into the iframe.
- Added a dedicated preview branch in `main.js` so preview mode hides conflicting UI, reapplies `ui.dialogueBox` styling, and renders the sample through `dialogueBox.renderPreviewLine(...)`.
- Locked the new editor/preview ownership model with focused wiring tests and passed the full Phase 72 focused gate plus build.

## Task Commits

Execution completed with two plan commits:

1. **Plan 72-03 implementation and focused coverage** - `e7421cc` (`feat`)
2. **Plan 72-03 summary and phase state update** - `pending` (`docs`)

## Files Created/Modified

- `src/editor/components/DialogueBoxSettings.vue` - adds dialogue image controls, decoration row editing, and shared picker wiring.
- `src/editor/views/ProjectSettings.vue` - owns the stable dialogue preview payload and provides the iframe callback.
- `src/main.js` - handles `show-dialogue-preview` in preview mode and renders the sample through the real DialogueBox runtime.
- `tests/uiImageFieldFlow.test.js` - locks DialogueBoxSettings helper wiring and ProjectSettings preview ownership.
- `tests/dialogueBoxPreviewWiring.test.js` - locks the new ProjectSettings → iframe → runtime message path.

## Decisions Made

- Kept the mini preview in `DialogueBoxSettings.vue` as a quick visual aid, but moved completion truth to the runtime iframe so image layering is validated against the real DOM/CSS owner.
- Reused the existing preview transport in `main.js` instead of coupling dialogue preview to the project’s first scene or to stale preview routing tests.

## Deviations from Plan

None - plan executed within the intended scope.

## Issues Encountered

- Because the repo already contained unrelated dirty files, the implementation and docs commits were staged narrowly to keep Phase 72 history clean.

## User Setup Required

None.

## Known Stubs

None.

## Next Phase Readiness

- Phase 73 can reuse the same ProjectSettings iframe ownership pattern when button-family image states need real runtime verification.
- Dialogue image fields, runtime layering, and preview transport are now all locked together, so later phases can build on them without reopening Phase 72 decisions.

## Verification Evidence

- `npx vitest run tests/uiImageFieldFlow.test.js tests/dialogueBoxPreviewWiring.test.js`
- `node --test tests/scanAssets.test.js && npx vitest run tests/dialogueBoxSchemaFlow.test.js tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/dialogueBoxUiSkin.test.js tests/dialogueBoxPreviewWiring.test.js && npm run build`

## Self-Check: PASSED

---
*Phase: 72-dialogue-box-picture-loop*
*Completed: 2026-04-22*
