# Phase 61: Contract Freeze & Visual Ownership - Validation

**Generated:** 2026-04-22
**Status:** Refreshed Nyquist backfill

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + existing Node `node:test` for `tests/scriptEngine.test.js` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/stageLayerOwnership.test.js tests/exportGame.test.js tests/cinematicContractCompatibility.test.js` |
| Full phase gate | `npx vitest run tests/stageLayerOwnership.test.js tests/exportGame.test.js tests/cinematicContractCompatibility.test.js && node --test tests/scriptEngine.test.js && npm run build` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Planned Artifact |
|--------|----------|-----------|-------------------|------------------|
| CAM-05 | Camera scope stays on stage visuals only, leaving dialogue and overlay UI readable | unit / export parity | `npx vitest run tests/stageLayerOwnership.test.js tests/exportGame.test.js` | Reuse shipped `tests/stageLayerOwnership.test.js` and `tests/exportGame.test.js` from `61-01-SUMMARY.md` |
| PREV-04 | Unknown cinematic enums survive editor round-trips and runtime falls back safely only at consumption time | compatibility + runtime regression | `npx vitest run tests/cinematicContractCompatibility.test.js` | Reuse shipped `tests/cinematicContractCompatibility.test.js` from `61-02-SUMMARY.md` |
| PREV-04 | Unknown transition values do not crash runtime playback and known values still pass through | existing Node regression | `node --test tests/scriptEngine.test.js` | Reuse existing `tests/scriptEngine.test.js` coverage extended in Phase 61 |
| PREV-04 | Contract-freeze changes still compile in the shipped app bundle | build gate | `npm run build` | Reuse existing build pipeline; no new test artifact |

## Sampling

- **Per requirement refresh:** run only the focused suites tied to `61-01-SUMMARY.md` and `61-02-SUMMARY.md`.
- **Backfill gate:** rerun all four focused commands together so the new `61-VERIFICATION.md` records current evidence instead of stale summary claims.
- **Out of scope:** repo-wide Vitest cleanup and later-phase preview/camera/transition expansion remain outside this Phase 61 backfill.

## Planned Artifact Refresh

- `tests/stageLayerOwnership.test.js` - current ownership proof for runtime shell, `main.js` mounting, and `.character-motion` wrapper shape.
- `tests/exportGame.test.js` - current ownership proof that exported HTML matches runtime stage scoping.
- `tests/cinematicContractCompatibility.test.js` - current unknown-enum round-trip and unknown-safe UI helper proof.
- `tests/scriptEngine.test.js` - current runtime fallback proof for unknown transition consumption.
- `61-VERIFICATION.md` - auditable Phase 61 evidence report tying requirements to summaries, artifacts, and rerun outcomes.

Phase 68 refreshes Nyquist coverage for already-shipped Phase 61 behavior. It does **not** introduce new runtime/editor features or new tests.

---

*Phase: 61-contract-freeze-visual-ownership*
*Validation refreshed: 2026-04-22*
