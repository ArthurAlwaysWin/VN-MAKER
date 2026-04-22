# Phase 67: Integration & Regression Gate - Validation

**Refreshed:** 2026-04-22
**Status:** Backfill evidence refreshed for Phase 70 execution

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom |
| Config file | `vitest.config.js` |
| Focused rerun command | `npx vitest run tests/cinematicRegressionGate.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js tests/pageEditorEffectPreviewState.test.js tests/characterMotionPlayback.test.js tests/cameraRuntimePlayback.test.js tests/backgroundTransitionPreview.test.js` |
| Build gate | `npm run build` |

## Phase Requirements → Evidence Map

| Req ID | Shipped behavior now being backfilled | Focused command | Existing evidence anchors | Backfill artifact |
|--------|---------------------------------------|-----------------|--------------------------|-------------------|
| PREV-05 | Skip and auto flows stop before stable replay so character motion classes, stage camera transforms, and flash residue do not leak into the next settled page state | `npx vitest run tests/cinematicRegressionGate.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js tests/characterMotionPlayback.test.js tests/cameraRuntimePlayback.test.js` | `67-01-SUMMARY.md`; `67-02-SUMMARY.md`; `tests/cinematicRegressionGate.test.js`; `tests/backgroundTransitionWiring.test.js`; `tests/cameraCleanupWiring.test.js`; `tests/characterMotionPlayback.test.js`; `tests/cameraRuntimePlayback.test.js` | `67-VERIFICATION.md` requirement row for `PREV-05` |
| PREV-05 | Load and return-to-title flows now share the same shipped cleanup symmetry before re-entry, proving normal load no longer leaves behind stage residue | `npx vitest run tests/cinematicRegressionGate.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js tests/backgroundTransitionPreview.test.js` | `67-01-SUMMARY.md`; `67-02-SUMMARY.md`; `tests/cinematicRegressionGate.test.js`; `tests/backgroundTransitionWiring.test.js`; `tests/cameraCleanupWiring.test.js`; `tests/backgroundTransitionPreview.test.js` | `67-VERIFICATION.md` requirement row for `PREV-05` |
| PREV-05 | Preview stop and rapid effect supersede restore a clean page before the next effect runs, without reopening the Phase 65/66 preview protocol | `npx vitest run tests/cinematicRegressionGate.test.js tests/iframeEffectPreviewWiring.test.js tests/pageEditorEffectPreviewState.test.js tests/backgroundTransitionPreview.test.js` | `67-01-SUMMARY.md`; `67-02-SUMMARY.md`; `tests/cinematicRegressionGate.test.js`; `tests/iframeEffectPreviewWiring.test.js`; `tests/pageEditorEffectPreviewState.test.js`; `tests/backgroundTransitionPreview.test.js` | `67-VERIFICATION.md` requirement row for `PREV-05` |

## Sampling Rate

- **Phase 70 Task 1 refresh + Task 2 rerun:** `npx vitest run tests/cinematicRegressionGate.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js tests/pageEditorEffectPreviewState.test.js tests/characterMotionPlayback.test.js tests/cameraRuntimePlayback.test.js tests/backgroundTransitionPreview.test.js`
- **Packaging/build confidence:** `npm run build`

## Backfilled PREV-05 Coverage

- This file is now a **post-execution Nyquist backfill map**, not a "ready for execution" checklist.
- Scope is limited to `PREV-05` only and reuses the focused regression gate plus owner cleanup suites already shipped in Phase 67.
- The backfill language is intentionally post-fix: `67-01-SUMMARY.md` supplies the RED regression matrix, `67-02-SUMMARY.md` supplies the green cleanup closure, and Phase 70 only documents the auditable evidence chain.
- Coverage explicitly stays bounded to the shipped skip, auto, load, return-to-title, preview-stop, and rapid supersede cleanup surfaces.
- Evidence stays docs-only: no runtime, editor, or test implementation changes are part of this backfill.

## Scope Guardrails

- `npm run build` is recorded here as the lightweight build confidence check that accompanies the focused PREV-05 suites.
- repo-wide `npx vitest run` remains deferred per `deferred-items.md`; it is **not** the phase gate for this closeout and must not be used as the proof point for `PREV-05`.
- Deferred tech debt remains out of scope, especially preview preflight deduplication and the unrelated `No test suite found` / `tests/mainConfigRouting.test.js` failures logged in `deferred-items.md`.

## Evidence Sources To Cite In Verification

- `67-01-SUMMARY.md` — RED regression matrix and focused suite anchors for skip, auto, load, title return, preview stop, and supersede cleanup.
- `67-02-SUMMARY.md` — shipped `src/main.js` orchestration repair that added the missing normal-load cleanup symmetry and turned the gate green.
- `deferred-items.md` — explicit note that unrelated repo-wide Vitest failures stay out of scope for `PREV-05`.
- `tests/cinematicRegressionGate.test.js`
- `tests/iframeEffectPreviewWiring.test.js`
- `tests/backgroundTransitionWiring.test.js`
- `tests/cameraCleanupWiring.test.js`
- `tests/pageEditorEffectPreviewState.test.js`
- `tests/characterMotionPlayback.test.js`
- `tests/cameraRuntimePlayback.test.js`
- `tests/backgroundTransitionPreview.test.js`

---

*Phase: 67-integration-regression-gate*  
*Validation refreshed: 2026-04-22 for Phase 70 backfill*
