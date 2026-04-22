# Phase 64: Background Transition Expansion - Validation

**Refreshed:** 2026-04-22
**Status:** Backfill evidence refreshed for Phase 69 execution

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom; Node built-in test runner for `tests/scriptEngine.test.js` |
| Config file | `vitest.config.js` |
| Focused rerun command | `npx vitest run tests/cinematicContractCompatibility.test.js tests/backgroundLayerTransitions.test.js tests/backgroundTransitionWiring.test.js` |
| Runtime compatibility command | `node --test tests/scriptEngine.test.js` |
| Build gate | `npm run build` |

## Phase Requirements → Evidence Map

| Req ID | Shipped behavior now being backfilled | Focused command | Existing evidence anchors | Backfill artifact |
|--------|---------------------------------------|-----------------|--------------------------|-------------------|
| TRAN-01 | Locked transition selector covers `none`, `fade`, `slide-left`, `slide-right`, `dissolve`, `wipe`, `scale`, `blur` and keeps unknown values visible until runtime consumption | `npx vitest run tests/cinematicContractCompatibility.test.js tests/backgroundLayerTransitions.test.js` | `64-01-SUMMARY.md`; `src/shared/cinematicContract.js`; `tests/cinematicContractCompatibility.test.js`; `tests/backgroundLayerTransitions.test.js` | `64-VERIFICATION.md` requirement row for `TRAN-01` |
| TRAN-02 | `BackgroundLayer` remains the sole owner for legacy and new expressive transitions, including cleanup and replacement paths | `npx vitest run tests/backgroundLayerTransitions.test.js` | `64-01-SUMMARY.md`; `src/ui/BackgroundLayer.js`; `tests/backgroundLayerTransitions.test.js` | `64-VERIFICATION.md` requirement row for `TRAN-02` |
| TRAN-04 | `main.js` keeps page-enter fan-out behind the background gate so character, camera, dialogue, and choice release in stable order | `npx vitest run tests/backgroundTransitionWiring.test.js && node --test tests/scriptEngine.test.js` | `64-02-SUMMARY.md`; `src/main.js`; `tests/backgroundTransitionWiring.test.js`; `tests/scriptEngine.test.js` | `64-VERIFICATION.md` requirement row for `TRAN-04` |

## Sampling Rate

- **Phase 69 Task 1 rerun:** `npx vitest run tests/cinematicContractCompatibility.test.js tests/backgroundLayerTransitions.test.js tests/backgroundTransitionWiring.test.js`
- **Runtime fallback proof:** `node --test tests/scriptEngine.test.js`
- **Packaging/build confidence:** `npm run build`

## Backfill Scope Guardrails

- This file is now a **post-execution Nyquist backfill map**, not a "ready for execution" checklist.
- Scope is limited to Phase 64 requirement evidence for `TRAN-01`, `TRAN-02`, and `TRAN-04`.
- Evidence stays docs-only: no runtime, editor, or test code changes are part of this backfill.
- Deferred debt remains out of scope, especially preview preflight deduplication and unrelated repo-wide Vitest failures.

## Evidence Sources To Cite In Verification

- `64-01-SUMMARY.md` — transition registry expansion plus `BackgroundLayer` ownership handoff.
- `64-02-SUMMARY.md` — background transition gate sequencing in `main.js`.
- `src/shared/cinematicContract.js` — locked transition option list and runtime fallback helper.
- `src/ui/BackgroundLayer.js` — completion-aware owner, same two-layer DOM, cleanup/reset semantics.
- `src/main.js` — gate buffers, flush order, and cancellation/reset paths.
- `tests/cinematicContractCompatibility.test.js`
- `tests/backgroundLayerTransitions.test.js`
- `tests/backgroundTransitionWiring.test.js`
- `tests/scriptEngine.test.js`

---

*Phase: 64-background-transition-expansion*  
*Validation refreshed: 2026-04-22 for Phase 69 backfill*
