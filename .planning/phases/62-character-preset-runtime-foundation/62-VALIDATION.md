# Phase 62: Character Preset Runtime Foundation - Validation

**Generated:** 2026-04-22
**Status:** Refreshed Nyquist backfill

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom 29.0.2; existing Node `node:test` for `tests/scriptEngine.test.js` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/characterAnimationContract.test.js tests/characterMotionPlayback.test.js tests/cinematicContractCompatibility.test.js tests/stageLayerOwnership.test.js` |
| Full phase gate | `npx vitest run tests/characterAnimationContract.test.js tests/characterMotionPlayback.test.js tests/cinematicContractCompatibility.test.js tests/stageLayerOwnership.test.js && node --test tests/scriptEngine.test.js && npm run build` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Planned Artifact |
|--------|----------|-----------|-------------------|------------------|
| ANIM-01 | Each page character can carry a runtime animation preset contract on `show_character` | unit / contract | `npx vitest run tests/characterAnimationContract.test.js` | Reuse shipped `tests/characterAnimationContract.test.js` from `62-01-SUMMARY.md` |
| ANIM-02 | The locked preset list remains available and unknown non-empty animation enums still survive the contract boundary | unit / compatibility | `npx vitest run tests/characterAnimationContract.test.js` | Reuse shipped `tests/characterAnimationContract.test.js` from `62-01-SUMMARY.md` |
| ANIM-02 | Supported presets remain aligned with runtime owner and stage ownership scaffolding | jsdom / focused regression | `npx vitest run tests/characterMotionPlayback.test.js tests/characterAnimationContract.test.js tests/cinematicContractCompatibility.test.js tests/stageLayerOwnership.test.js` | Reuse shipped `tests/characterMotionPlayback.test.js` plus existing compatibility/ownership suites from `62-02-SUMMARY.md` |
| ANIM-03 | One-shot animations self-clean, `breathe` loops only while active, and cleanup happens on replace / clear | jsdom lifecycle | `npx vitest run tests/characterMotionPlayback.test.js tests/characterAnimationContract.test.js tests/cinematicContractCompatibility.test.js tests/stageLayerOwnership.test.js` | Reuse shipped `tests/characterMotionPlayback.test.js` from `62-02-SUMMARY.md` |
| ANIM-03 | Runtime script replay still tolerates unknown cinematic values while character animation playback stays safe | existing Node regression | `node --test tests/scriptEngine.test.js` | Reuse existing `tests/scriptEngine.test.js` coverage consumed by Phase 62 |
| ANIM-01, ANIM-02, ANIM-03 | Shipped runtime/editor bundle still builds without new animation dependencies | build gate | `npm run build` | Reuse existing build pipeline; no new dependency or test artifact |

## Sampling

- **Per requirement refresh:** rerun the exact focused suites named in `62-01-SUMMARY.md` and `62-02-SUMMARY.md`.
- **Backfill gate:** rerun the combined Phase 62 focused suite, then `node --test tests/scriptEngine.test.js`, then `npm run build`.
- **Out of scope:** preview APIs, camera playback, transition expansion, and repo-wide deferred failures remain outside this foundation backfill.

## Planned Artifact Refresh

- `tests/characterAnimationContract.test.js` - contract proof for locked presets, `none` default, `show_character.animation`, and unknown non-empty passthrough.
- `tests/characterMotionPlayback.test.js` - runtime owner proof for motion playback, one-shot cleanup, and `breathe` lifecycle cleanup.
- `tests/cinematicContractCompatibility.test.js` - compatibility proof that unknown animation values remain preserved/no-op safe.
- `tests/stageLayerOwnership.test.js` - ownership proof that motion stays on `.character-motion` under the Phase 61 stage boundary.
- `tests/scriptEngine.test.js` - runtime regression proof that unknown cinematic values do not crash page playback.
- `62-VERIFICATION.md` - auditable evidence report linking requirements, summaries, rerun commands, and actual outcomes.

Phase 68 refreshes Nyquist coverage for already-shipped Phase 62 behavior. It does **not** add new animation presets, new runtime dependencies, or new test files.

---

*Phase: 62-character-preset-runtime-foundation*
*Validation refreshed: 2026-04-22*
