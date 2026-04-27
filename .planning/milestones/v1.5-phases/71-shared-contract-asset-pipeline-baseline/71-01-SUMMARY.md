---
phase: 71-shared-contract-asset-pipeline-baseline
plan: 01
subsystem: ui
tags: [ui-images, contract, assets, pinia, vitest, node-test]
requires: []
provides:
  - shared canonical and legacy UI image contract helpers
  - reusable editor-side UI image pick and clear helper
  - focused persistence coverage for canonical ui path round-trips
affects: [71-02-PLAN.md, 71-03-PLAN.md, Phase 72, Phase 73, Phase 74, Phase 75]
tech-stack:
  added: []
  patterns:
    - shared canonical ui image path helpers reused by editor, runtime, and export
    - owner-driven ui image picking that reuses existing asset-store selection and commit callbacks
key-files:
  created:
    - src/shared/uiImageContract.js
    - src/editor/utils/uiImageField.js
    - tests/uiImageContract.test.js
    - tests/uiImageFieldFlow.test.js
  modified: []
key-decisions:
  - "Canonical UI image values are strictly project-relative ui/... paths; assets/ui/... and absolute paths remain non-canonical legacy values."
  - "The editor helper only rewrites values after explicit selection and delegates preview or commit to existing owners instead of adding a second asset flow."
patterns-established:
  - "Use classifyUiImageValue() and normalizeUiImageSelection() instead of hand-rolling path checks in each surface."
  - "Surface components should call pickUiImage()/clearUiImage() with owner callbacks rather than reading files or persisting text paths directly."
requirements-completed: [AST-01, AST-02, AST-05, AST-06]
duration: 4 min
completed: 2026-04-23
---

# Phase 71 Plan 01: Shared Contract and Editor Helper Summary

**Shared UI image contract rules plus an owner-driven picker helper now lock canonical `ui/...` writes, legacy compatibility, and save-reload path stability for the rest of Phase 71**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-23T01:07:00+10:00
- **Completed:** 2026-04-23T01:10:54+10:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `src/shared/uiImageContract.js` to freeze canonical path checks, legacy classification, schema roots, and the registry entry point for future scan/export work.
- Added `src/editor/utils/uiImageField.js` so editor surfaces can reuse one canonical pick and clear flow backed by the existing asset store and owner callbacks.
- Added focused Node and Vitest coverage proving canonical `ui/...` round-trips stay stable after save/reload while legacy values stay untouched until explicit reselect.

## Task Commits

Execution completed with one plan commit:

1. **Plan 71-01 implementation and coverage** - `8eb850d` (`feat`)

## Files Created/Modified

- `src/shared/uiImageContract.js` - Adds canonical UI image path checks, legacy classification, shared schema roots, and registry helpers.
- `src/editor/utils/uiImageField.js` - Adds reusable pick/clear/display helpers that route through the existing asset store and owner callbacks.
- `tests/uiImageContract.test.js` - Covers canonical path acceptance, legacy classification, root exports, and registry entrypoint behavior.
- `tests/uiImageFieldFlow.test.js` - Covers canonical write flow, cancel behavior, non-canonical rejection, clear flow, and save/reload persistence.

## Decisions Made

- Kept the canonical rule intentionally strict so Phase 71 surfaces and later export logic can treat `ui/...` as the only new-write format.
- Made the helper callback-driven so NineSlice and screen owners can plug in their own preview or commit behavior without cloning asset-selection logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Git index lock collapsed the planned test/feat split into one commit**
- **Found during:** Plan commit recording
- **Issue:** Concurrent git invocation hit `.git/index.lock`, so the intended separate `test` and `feat` commits could not both be recorded safely.
- **Fix:** Retried with a single Phase 71-01 commit that includes both the new tests and the minimal implementation, then documented the deviation instead of pretending the split occurred.
- **Files modified:** `src/shared/uiImageContract.js`, `src/editor/utils/uiImageField.js`, `tests/uiImageContract.test.js`, `tests/uiImageFieldFlow.test.js`
- **Verification:** `node --test tests/uiImageContract.test.js` and `npx vitest run tests/uiImageFieldFlow.test.js`
- **Committed in:** `8eb850d`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Commit granularity is less ideal than planned, but delivered behavior, focused coverage, and downstream readiness are unchanged.

## Issues Encountered

- A transient git index lock appeared while recording commits; the safe recovery was to keep one scoped plan commit and continue.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- `71-02` can now wire NineSlice to the shared picker helper and rely on the canonical path rules without re-deciding legacy semantics.
- `71-03` can reuse the same contract file as the scan/export registry anchor instead of inventing a second UI image schema.

## Self-Check: PASSED

---
*Phase: 71-shared-contract-asset-pipeline-baseline*
*Completed: 2026-04-23*
