---
phase: 72-dialogue-box-picture-loop
plan: 01
subsystem: dialogue-box
tags: [dialogue-box, ui-images, schema, scan-assets, pinia, vitest, node-test]
requires:
  - phase: 71-03
    provides: shared ui image registry and export baseline
provides:
  - stable dialogue-box image schema on ui.dialogueBox
  - canonical dialogue-box image collection in the shared ui bucket
  - focused regression coverage for store defaults and scan behavior
affects: [Phase 72, Phase 73, runtime preview wiring, ui asset export]
tech-stack:
  added: []
  patterns:
    - getDialogueBox normalizes legacy dialogueBox objects in place instead of replacing them
    - dialogue-box specific image paths are collected by extending UI_IMAGE_SCAN_REGISTRY rather than scanAssets conditionals
key-files:
  created:
    - tests/dialogueBoxSchemaFlow.test.js
  modified:
    - src/editor/stores/script.js
    - src/shared/uiImageContract.js
    - tests/scanAssets.test.js
key-decisions:
  - "The main dialogue frame image owner stays at ui.theme.nineSlice.dialogueBox; ui.dialogueBox only holds dialogue-specific image fields."
  - "Legacy non-canonical image strings remain readable in store state and are filtered out at scan time instead of being auto-migrated on load."
patterns-established:
  - "Future dialogue-box image fields should extend the dialogueBox owner object and the shared collector registry together."
requirements-completed: [DLG-01]
completed: 2026-04-22
---

# Phase 72 Plan 01: Dialogue Schema and Collector Baseline Summary

**Phase 72 now freezes the dialogue-box image field contract, so editor/runtime work can build on one stable `ui.dialogueBox` schema and one shared UI asset collector**

## Accomplishments

- Extended `getDialogueBox()` to guarantee `nameplateStyle`, `nameplateBackgroundImage`, and `decorations` while preserving existing typography and color fields for legacy data.
- Kept `ui.theme.nineSlice.dialogueBox` as the only main frame image owner and locked that boundary with regression coverage.
- Added a dialogue-box collector in `uiImageContract.js` for canonical `nameplateBackgroundImage` and `decorations[].src` values.
- Expanded `tests/scanAssets.test.js` so dialogue-box canonical `ui/...` paths enter the `ui` bucket while legacy/non-canonical values stay excluded.

## Task Commits

Execution completed with two plan commits:

1. **Plan 72-01 implementation and focused coverage** - `f0b56ed` (`feat`)
2. **Plan 72-01 summary** - `pending` (`docs`)

## Files Created/Modified

- `src/editor/stores/script.js` - normalizes `ui.dialogueBox` in place and adds the Phase 72 image defaults.
- `src/shared/uiImageContract.js` - registers dialogue-box nameplate/decor image collectors in the shared UI scan registry.
- `tests/dialogueBoxSchemaFlow.test.js` - locks store defaults, owner boundaries, and decoration row round-trip behavior.
- `tests/scanAssets.test.js` - locks dialogue-box asset collection and non-canonical filtering behavior.

## Decisions Made

- Used in-place normalization on the Pinia owner so legacy projects gain the new fields without losing prior dialogue settings or triggering an eager migration.
- Reused the shared registry extension pattern from Phase 71 instead of adding dialogue-specific branching inside `scanAssets()`.

## Deviations from Plan

None - plan executed within the intended scope.

## Issues Encountered

- The worktree was already dirty, so the implementation commit was staged narrowly to avoid pulling unrelated changes into the plan history.

## User Setup Required

None.

## Known Stubs

None.

## Next Phase Readiness

- `72-02` can now rely on fixed `ui.dialogueBox` fields for runtime layering and fallback logic.
- `72-03` can wire editor pickers and preview messaging without reopening schema ownership decisions.

## Verification Evidence

- `npx vitest run tests/dialogueBoxSchemaFlow.test.js`
- `node --test tests/scanAssets.test.js`

## Self-Check: PASSED

---
*Phase: 72-dialogue-box-picture-loop*
*Completed: 2026-04-22*
