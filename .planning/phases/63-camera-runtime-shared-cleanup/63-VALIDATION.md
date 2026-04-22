# Phase 63: Camera Runtime & Shared Cleanup - Validation

**Generated:** 2026-04-22
**Status:** Refreshed Nyquist backfill

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom 29.0.2; existing Node `node:test` for `tests/scriptEngine.test.js` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/cameraContract.test.js tests/cameraRuntimePlayback.test.js tests/cameraCleanupWiring.test.js` |
| Full phase gate | `npx vitest run tests/cameraContract.test.js tests/cameraRuntimePlayback.test.js tests/cameraCleanupWiring.test.js tests/characterMotionPlayback.test.js tests/stageLayerOwnership.test.js && node --test tests/scriptEngine.test.js && npm run build` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Planned Artifact |
|--------|----------|-----------|-------------------|------------------|
| CAM-01 | Each page can carry one page-level camera contract on `page_enter` without mutating raw page ownership | unit / contract | `npx vitest run tests/cameraContract.test.js` | Reuse shipped `tests/cameraContract.test.js` from `63-01-SUMMARY.md` |
| CAM-02 | The shared camera contract exposes exactly `shake`, `zoom`, `pan`, and `flash` as the locked effect set | unit / contract | `npx vitest run tests/cameraContract.test.js` | Reuse shipped `tests/cameraContract.test.js` from `63-01-SUMMARY.md` |
| CAM-02 | Runtime playback supports the locked effect set on the reserved stage scope while remaining safe on unsupported values | jsdom / owner playback | `npx vitest run tests/cameraRuntimePlayback.test.js tests/cameraCleanupWiring.test.js` | Reuse shipped `tests/cameraRuntimePlayback.test.js` and `tests/cameraCleanupWiring.test.js` from `63-02-SUMMARY.md` |
| CAM-03 | Camera contract preserves duration, intensity, and direction semantics, including directionless `zoom` / `flash` normalization | unit / contract | `npx vitest run tests/cameraContract.test.js` | Reuse shipped `tests/cameraContract.test.js` from `63-01-SUMMARY.md` |
| CAM-03 | Runtime playback applies duration, intensity, and direction variables through `CameraController` and stage CSS tokens | jsdom / focused regression | `npx vitest run tests/cameraRuntimePlayback.test.js tests/cameraCleanupWiring.test.js` | Reuse shipped `tests/cameraRuntimePlayback.test.js` and `tests/cameraCleanupWiring.test.js` from `63-02-SUMMARY.md` |
| CAM-04 | Camera effects trigger on page entry, stay single-active, and clean up across replay/title/load/preview/end reset paths | focused integration | `npx vitest run tests/cameraContract.test.js tests/cameraRuntimePlayback.test.js tests/cameraCleanupWiring.test.js tests/characterMotionPlayback.test.js tests/stageLayerOwnership.test.js` | Reuse the exact focused combined gate recorded in `63-02-SUMMARY.md` |
| CAM-04 | Runtime script playback continues safely through focused regressions after the camera backfill | existing Node regression | `node --test tests/scriptEngine.test.js` | Reuse existing `tests/scriptEngine.test.js` coverage consumed by Phase 63 |
| CAM-01, CAM-02, CAM-03, CAM-04 | Shipped runtime/editor bundle still builds with the camera contract, controller, and cleanup wiring intact | build gate | `npm run build` | Reuse existing build pipeline; no new dependency or test artifact |

## Sampling

- **Per requirement refresh:** rerun only the exact focused suites already shipped in `63-01-SUMMARY.md` and `63-02-SUMMARY.md`.
- **Backfill gate:** rerun the combined focused camera suites, then `node --test tests/scriptEngine.test.js`, then `npm run build` so `63-VERIFICATION.md` records current evidence instead of orphaned summary claims.
- **Out of scope:** preview preflight deduplication, repo-wide unrelated Vitest failures, milestone-audit rewrites, and any new camera feature work remain outside this Phase 68 docs-only backfill.

## Planned Artifact Refresh

- `tests/cameraContract.test.js` - contract proof for single page camera ownership, locked effects, normalized trigger semantics, and unknown-safe passthrough.
- `tests/cameraRuntimePlayback.test.js` - runtime owner proof for stage-only playback, per-effect CSS variables, single-active replacement, and cleanup-first no-op paths.
- `tests/cameraCleanupWiring.test.js` - orchestration proof that replay/title/load/preview/end flows clear camera state adjacent to existing stage reset owners.
- `tests/characterMotionPlayback.test.js` - focused neighboring owner guardrail reused from the shipped combined gate.
- `tests/stageLayerOwnership.test.js` - supporting ownership proof that page-enter camera playback stays on `#stage-layer` rather than UI overlays.
- `tests/scriptEngine.test.js` - existing runtime regression proof that page playback remains stable alongside camera contract consumption.
- `63-VERIFICATION.md` - auditable evidence report linking CAM-01 through CAM-04 to summaries, source artifacts, rerun commands, and actual outcomes.

Phase 68 refreshes Nyquist coverage for already-shipped Phase 63 camera behavior. It does **not** reopen Phase 63 scope, add new camera tests, or touch deferred preview/runtime tech debt.

---

*Phase: 63-camera-runtime-shared-cleanup*
*Validation refreshed: 2026-04-22*
