# Phase 65: Iframe Effect Preview API - Validation

**Refreshed:** 2026-04-22
**Status:** Backfill evidence refreshed for Phase 69 execution

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom; Node built-in test runner for `tests/scriptEngine.test.js` |
| Config file | `vitest.config.js` |
| Focused rerun command | `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionPreview.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js` |
| Runtime compatibility command | `node --test tests/scriptEngine.test.js` |
| Build gate | `npm run build` |

## Phase Requirements → Evidence Map

| Req ID | Shipped behavior now being backfilled | Focused command | Existing evidence anchors | Backfill artifact |
|--------|---------------------------------------|-----------------|--------------------------|-------------------|
| ANIM-04 | Character animation replay works through the iframe runtime without starting full play | `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js` | `65-01-SUMMARY.md`; `65-02-SUMMARY.md`; `tests/pageEditorEffectPreviewState.test.js`; `tests/iframeEffectPreviewWiring.test.js` | `65-VERIFICATION.md` requirement row for `ANIM-04` |
| TRAN-03 | Transition preview stays runtime-backed, same-page, and non-navigating | `npx vitest run tests/backgroundTransitionPreview.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionWiring.test.js` | `65-02-SUMMARY.md`; `src/main.js`; `src/ui/BackgroundLayer.js`; `tests/backgroundTransitionPreview.test.js`; `tests/iframeEffectPreviewWiring.test.js` | `65-VERIFICATION.md` requirement row for `TRAN-03` |
| PREV-02 | Disabled reasons and runtime failure reasons remain explicit across character, camera, and transition preview | `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js` | `65-01-SUMMARY.md`; `65-02-SUMMARY.md`; `tests/pageEditorEffectPreviewState.test.js`; `tests/iframeEffectPreviewWiring.test.js` | `65-VERIFICATION.md` requirement row for `PREV-02` |
| PREV-03 | Preview completion, cancel, stop, and failure paths restore the pre-preview page state | `npx vitest run tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js && node --test tests/scriptEngine.test.js` | `65-02-SUMMARY.md`; `src/main.js`; `tests/iframeEffectPreviewWiring.test.js`; `tests/backgroundTransitionWiring.test.js`; `tests/cameraCleanupWiring.test.js` | `65-VERIFICATION.md` requirement row for `PREV-03` |

## Sampling Rate

- **Phase 69 Task 2 rerun:** `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionPreview.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js`
- **Runtime compatibility proof:** `node --test tests/scriptEngine.test.js`
- **Packaging/build confidence:** `npm run build`

## Backfill Scope Guardrails

- This file is now a **post-execution Nyquist backfill map**, not a "ready for execution" plan.
- Scope is limited to Phase 65 requirement evidence for `ANIM-04`, `TRAN-03`, `PREV-02`, and `PREV-03`.
- Evidence stays docs-only: no editor/runtime/test implementation changes are part of this backfill.
- Deferred debt remains out of scope, especially preview preflight deduplication, repo-wide unrelated Vitest failures, and Phase 66 PageInspector placement work.

## Evidence Sources To Cite In Verification

- `65-01-SUMMARY.md` — editor-side preflight reasons, shared request envelope, and result bookkeeping.
- `65-02-SUMMARY.md` — runtime preview orchestration, same-page transition replay, snapshot restore, and cancellation semantics.
- `src/main.js` — `preview-effect` / `preview-effect-stop`, snapshot restore, and runtime-backed transition preview.
- `src/ui/BackgroundLayer.js` — same-page preview variant cleanup and replay support.
- `tests/pageEditorEffectPreviewState.test.js`
- `tests/iframeEffectPreviewWiring.test.js`
- `tests/backgroundTransitionPreview.test.js`
- `tests/backgroundTransitionWiring.test.js`
- `tests/cameraCleanupWiring.test.js`
- `tests/scriptEngine.test.js`

---

*Phase: 65-iframe-effect-preview-api*  
*Validation refreshed: 2026-04-22 for Phase 69 backfill*
