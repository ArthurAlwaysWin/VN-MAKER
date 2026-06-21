# Third-Party Audit Verification Report

Date: 2026-06-17

Source report: `E:\projects\review.md`

Scope: This document records Codex's independent verification of the third-party audit report against the current `E:\projects\my-awesome-project` codebase. The original report was not treated as authoritative; findings below were checked against source, CodeGraph, CLI behavior, targeted test runs, and small repro commands where practical.

## Overall Conclusion

- Audit report reliability: Medium
- Fully confirmed issues: 60
- Partially confirmed issues: 22
- False positives: 9
- Unconfirmed / needs more context: 1
- Highest priority fixes: S4, S10, S7/S16, S12, S11, B2, P15, Q18, M13, S8

The report is useful, but it overstates several local CLI or hardening concerns as P0 security vulnerabilities. The most credible immediate risks are renderer-reachable file import behavior, vulnerable dependencies, CSS URL construction, theme ZIP decompression bounds, symlink-aware path checks, and a few robustness gaps with straightforward tests.

## Verification Evidence

Commands run during verification:

```powershell
git status --short --branch
npm audit --json
npx vitest run tests/vnAuthorCli.test.js tests/projectValidator.test.js tests/sceneGraph.test.js tests/scriptHistory.test.js tests/pageEditorEffectPreviewState.test.js tests/themePackageInstaller.test.js tests/audioManager.test.js tests/playerDataRepository.test.js tests/effectDsl.test.js
npm run test:node
node tools/vn-author/index.js list-effect-packs --json
node tools/vn-author/index.js validate --script E:\projects\review.md --json
```

Targeted repros also covered:

- `WebSaveManager._getDb()` concurrent calls opened IndexedDB twice (`opens=2`, `same=false`).
- `EventEmitter.emit()` stopped after the first listener threw.
- `SaveManager.save()` threw before IPC when passed a cyclic state object.
- `setLegacySetVariableCompat({}, 'x', 'abc')` accepted invalid numeric input as `0`.
- `ScriptEngine._enterScene()` threw when called before script load.
- CLI `--target background` filtered transition results, while `--target=background` was ignored.
- `createScriptDiffSummary()` overflowed the call stack on a deeply nested object.
- `list-effect-packs --json` succeeded, disproving the report's claim that it crashes.
- `ensureGalgameContract({ systems })` did not mutate the caller's original `systems` object.
- `TEXT_TEMPLATE_PATTERN.lastIndex` pollution caused `collectTextTemplateVariableIds()` to miss matches.

Test results:

- Vitest targeted run: 8 files, 172 tests passed.
- Node test run: 287 tests passed.
- `npm audit --json`: 3 high severity dependency advisories confirmed (`vite`, `esbuild`, `tmp`).

## Repair Status Update

Updated: 2026-06-20

The first repair pass has been completed and validated. It covered the highest-confidence security and robustness items from the priority plan:

- Completed: S4, S10, S7/S16, S12, S11, B2, B11, P15, M13.
- Completed in the second repair pass: Q18, S8, B7, B10, B12, B13, B17, S5, S20, S21, M5, M11, P13, P14, and remaining P18 grant cleanup.
- Completed in the third repair pass: S13, M9, M14.
- Completed in the fourth repair pass: S9, B8, B15, B19, P2, P6, P8, P9, P10.
- Completed in the fifth repair pass: desktop B11 parity, the remaining S13 theme-preflight return path, thumbnail helper deduplication and boundary coverage, P16, S15, and S18.
- Completed in the sixth repair pass: Q6 shared atomic writes, M4 content-hashed script file state, and Q12 shared condition-row helpers. B1 was confirmed with delayed persistence, and P1/P3 were benchmarked at three project sizes.
- Completed in the seventh repair pass: P1 patch-based undo history and P3 revision-based editor change notification.
- Completed in the eighth repair pass: B1 choice unlock persistence ordering, P1/P3 desktop-editor smoke verification, and the Vite 8 Electron `inlineDynamicImports` compatibility cleanup.
- Completed in the ninth repair pass: Q5 lexical path-containment helper consolidation across Electron and project scaffolding.
- Completed in the tenth repair pass: Q17 response envelopes for the export UI's fallible file/directory IPC boundary.
- Completed in the eleventh repair pass: Q10 CLI command registry, Q9 shared JSON/text result emission, and Q11 apply-plan operation registry.
- Completed in the twelfth repair pass: Q19 shared hex conversion, Q13/Q14/Q15/M12 named limits and documentation, Q16 changed-path omission metadata, M6 shared object-map key defense, and B16/M1 legacy editor removal. M3 was analyzed only.
- Completed in the thirteenth repair pass: M3 save-lifecycle race hardening with mounted-App behavior coverage and a revision-aware dirty-clear rule.

Repair validation:

```powershell
node --check electron/main.js
node --check electron/themePackageInstaller.js; node --check electron/themePackageExporter.js; node --check electron/exportGame.js; node --check electron/exportDesktop.js; node --check electron/pathSecurity.js
node --check src/engine/fontLoader.js; node --check src/engine/cssEscape.js; node --check src/engine/WebSaveManager.js; node --check src/editor/utils/scriptDiff.js; node --check tools/vn-author/index.js
npx vitest run tests/cssEscape.test.js tests/fontLoader.test.js tests/pathSecurity.test.js tests/scriptDiff.test.js tests/webSaveManager.test.js tests/themePackageInstaller.test.js tests/importAssetSecurity.test.js tests/vnAuthorCli.test.js tests/themeManagerUiImage.test.js tests/videoAuthoringEditor.test.js tests/playerDataRepository.test.js tests/themePackageImportUx.test.js tests/themePackageInstallFlow.test.js
npm audit --json
npm run build
npm run build:web
npm test
```

Repair validation results:

- `npm audit --json`: 0 vulnerabilities after upgrading `vite` to `^8.0.16` and `tmp` to `0.2.7`.
- Targeted Vitest repair run: 13 files, 172 tests passed.
- `npm run build`: passed on Vite 8.0.16. Note: Vite emitted a deprecation warning for `inlineDynamicImports`; this is not a failing condition but should be cleaned up in build config later.
- `npm run build:web`: passed.
- Full `npm test`: Vitest 117 files / 1054 tests passed; Node test run 287 tests passed.

Second repair validation:

```powershell
node --check src/main.js
node --check electron/main.js
node --check electron/game/main.js
node --check electron/exportGame.js
node --check electron/exportDesktop.js
node --check tools/vn-author/index.js
npx vitest run tests/projectSession.test.js tests/runtimeResilience.test.js tests/fontLoader.test.js tests/textTemplate.test.js tests/thumbnailSecurity.test.js tests/runtimeInitializationError.test.js tests/pageEditorEffectPreviewState.test.js tests/playerDataRepository.test.js tests/webSaveManager.test.js tests/importAssetSecurity.test.js tests/exportGame.test.js tests/vnAuthorCli.test.js
node --test tests/effectDsl.test.js tests/scriptEngine.test.js tests/exportDesktop.test.js
npm audit --json
npm run build
npm run build:web
npm test
```

Second repair validation results:

- Targeted Vitest run: 12 files, 204 tests passed.
- Targeted Node test run: 90 tests passed.
- `npm audit --json`: 0 vulnerabilities.
- `npm run build`: passed on Vite 8.0.16. Vite still emits the existing `inlineDynamicImports` deprecation warning.
- `npm run build:web`: passed.
- Full `npm test`: Vitest 120 files / 1068 tests passed; Node test run 290 tests passed.

Third repair validation:

```powershell
node --check electron/main.js
node --check electron/game/main.js
node --check src/engine/ConfigManager.js
npx vitest run tests/runtimeResilience.test.js tests/electronIpcHardening.test.js
npx vitest run tests/runtimeResilience.test.js tests/electronIpcHardening.test.js tests/importAssetSecurity.test.js tests/playerDataRepository.test.js tests/exportGame.test.js
node --test tests/exportDesktop.test.js
npm audit --json
npm run build
npm run build:web
npm test
```

Third repair validation results:

- Initial targeted Vitest run: 2 files, 7 tests passed.
- Broader targeted Vitest run: 5 files, 54 tests passed.
- Targeted Node export test run: 28 tests passed.
- `npm audit --json`: 0 vulnerabilities.
- `npm run build`: passed on Vite 8.0.16. Vite still emits the existing `inlineDynamicImports` deprecation warning.
- `npm run build:web`: passed.
- Full `npm test`: Vitest 121 files / 1072 tests passed; Node test run 290 tests passed.

Fourth repair validation:

```powershell
node --check src/editor/utils/previewMessaging.js
node --check src/engine/ScriptEngine.js
node --check src/engine/PlayerDataRepository.js
node --check src/shared/sceneGraph.js
node --check src/shared/projectValidator.js
node --check electron/main.js
npx vitest run tests/pageEditorEffectPreviewState.test.js tests/previewMessaging.test.js tests/agentHandoffEditor.test.js tests/electronIpcHardening.test.js tests/playerDataRepository.test.js tests/projectValidator.test.js tests/sceneGraph.test.js
node --test tests/scriptEngine.test.js
npm audit --json
npm run build
npm run build:web
npm test
```

Fourth repair validation results:

- Syntax checks passed for touched JS entry points.
- Targeted Vitest run: 7 files, 89 tests passed.
- Targeted Node test run: 58 tests passed.
- `npm audit --json`: 0 vulnerabilities.
- `npm run build`: passed on Vite 8.0.16. Vite still emits the existing `inlineDynamicImports` deprecation warning.
- `npm run build:web`: passed.
- Full `npm test`: Vitest 122 files / 1080 tests passed; Node test run 291 tests passed.

Fifth repair validation:

```powershell
node --check src/shared/sceneGraph.js
node --check src/ui/themeIconHelpers.js
node --check src/ui/QuickActionBar.js
npx vitest run tests/sceneGraph.test.js tests/themeIconHelpers.test.js tests/quickActionBarThemeIcon.test.js tests/projectValidator.test.js
npm audit --json
npm run build
npm run build:web
npm test
```

Fifth repair validation results:

- Targeted Vitest run: 4 files, 50 tests passed.
- A direct 10,000-scene cyclic-graph repro completed without overflowing the call stack and returned one 10,000-member closed cycle.
- A Mermaid label containing a node-closing bracket and newline remained inside one encoded label instead of injecting an additional statement.
- `npm audit --json`: 0 vulnerabilities.
- `npm run build`: passed on Vite 8.0.16. The existing `inlineDynamicImports` deprecation warning remains a separate dependency-maintenance item.
- `npm run build:web`: passed.
- Full `npm test`: Vitest 122 files / 1087 tests passed; Node test run 292 tests passed.

Sixth repair verification and measurement:

- B1 confirmed: with a deliberately delayed ending repository, `selectChoice()` entered the target scene and returned before the ending unlock persisted. Synchronous variable effects still apply before routing, so the residual risk is limited to asynchronous unlock persistence/events.
- P1/P3 benchmark setup: Node 24.13.1, actual Pinia script store `pushState()`, Vue deep watcher, 20 mutations per size, and generated projects containing 10 pages per scene.
- 500 pages / 0.13 MiB JSON: `pushState()` median 7.35 ms, p95 9.65 ms; deep watcher median 6.75 ms, p95 14.49 ms.
- 2,500 pages / 0.64 MiB JSON: `pushState()` median 39.60 ms, p95 44.72 ms; deep watcher median 47.60 ms, p95 64.46 ms.
- 10,000 pages / 2.57 MiB JSON: `pushState()` median 261.55 ms, p95 305.73 ms; deep watcher median 319.84 ms, p95 362.49 ms.
- Twenty additional 10,000-page undo snapshots increased retained heap by about 129.08 MiB after garbage collection. P1 and P3 should therefore be treated as measured large-project bottlenecks and addressed in a dedicated performance change.
- Q6/M4 targeted Vitest run: 4 files, 139 tests passed; desktop export Node test run: 30 tests passed.
- Q12 targeted Vitest run: 3 files, 42 tests passed.
- `npm audit --json`: 0 vulnerabilities.
- `npm run build`: passed on Vite 8.0.16 with the existing `inlineDynamicImports` deprecation warning.
- `npm run build:web`: passed.
- Full `npm test`: Vitest 124 files / 1091 tests passed; Node test run 293 tests passed.

Seventh repair verification and measurement:

- The script store now tracks direct nested `set`/`delete` operations as forward and inverse path patches while preserving Vue nested reactivity. `pushState()` commits only pending patches; undo applies inverse patches, redo applies forward patches, redo branches are truncated after a new edit, and history remains capped at 50 entries.
- `App.vue` now watches the O(1) `changeRevision` notification rather than traversing all of `script.data`. The same notification continues to drive dirty state, the 500 ms undo transaction boundary, and 2 s autosave. Existing editor preview composables retain their direct reactive updates.
- Tracking metadata remains editor-only and is not added to the canonical `script.json` contract or Agent authoring data.
- Benchmark setup remained 20 mutations per size with 10 pages per generated scene. The optimized measurements were produced by `npm run benchmark:script-history` on Node 24.13.1.

| Pages | Before `pushState()` median / p95 | After patch commit median / p95 | Before deep watcher median / p95 | After revision notification median / p95 |
|---:|---:|---:|---:|---:|
| 500 | 7.35 / 9.65 ms | 0.002 / 0.012 ms | 6.75 / 14.49 ms | 0.005 / 0.020 ms |
| 2,500 | 39.60 / 44.72 ms | 0.002 / 0.002 ms | 47.60 / 64.46 ms | 0.003 / 0.007 ms |
| 10,000 | 261.55 / 305.73 ms | 0.002 / 0.005 ms | 319.84 / 362.49 ms | 0.005 / 0.005 ms |

- Twenty additional 10,000-page history entries retained about 0.017 MiB after garbage collection, down from about 129.08 MiB for the previous full snapshot history.
- Targeted editor/history run: 9 files, 44 tests passed. Added coverage includes direct nested edits, revision and nested reactive notification, array/object/delete patches, reorder-then-edit paths, undo/redo, pending-edit undo, branch truncation, the 50-entry limit, autosave wiring, and 10,000-page time/space bounds.
- `npm audit --json`: 0 vulnerabilities.
- `npm run build`: passed on Vite 8.0.16 with the existing `inlineDynamicImports` deprecation warning.
- `npm run build:web`: passed.
- Full `npm test`: Vitest 124 files / 1097 tests passed; Node test run 293 tests passed.

Eighth repair verification and measurement:

- P1/P3 were exercised in a real built Electron editor against a disposable project, not only through store-level tests. Direct nested edits covered page transition data, dialogue text, choice prompt/options, character registry data, video asset metadata, theme tokens, dialogue UI, and settings-screen configuration.
- The Electron smoke run confirmed immediate dirty state and reactive dialogue preview, no undo commit before 500 ms, one transaction after 500 ms, and autosave completion at 2032 ms. It also covered pending-edit undo, redo, redo-branch truncation, the 50-entry limit, HTML5 page drag reorder followed by editing the moved page by stable ID, and disk/in-memory consistency after close and reopen.
- `npm run benchmark:script-history` remained effectively size-independent: 500 pages notification 0.006 / 0.023 ms and patch commit 0.002 / 0.009 ms; 2,500 pages 0.003 / 0.007 ms and 0.002 / 0.005 ms; 10,000 pages 0.003 / 0.004 ms and 0.003 / 0.004 ms (median / p95).
- B1 now treats a choice as one routing transaction: synchronous variable effects still apply immediately, `selectChoice()` waits for every ending/CG write to settle before entering the target scene (including mixed failure/delay cases), failed persistence is logged without trapping the player on the choice, and `waiting` prevents duplicate selection while writes are pending. Navigation still precedes the `ending_unlocked` notification, preserving the prior relative event order.
- B1 regression coverage includes immediate success, delayed persistence, failure, repeat selection, synchronous variable effects, event ordering, and repository-backed ending/CG durability.
- The Vite 8 warning was traced to `vite-plugin-electron@0.29.1` configuring deprecated `inlineDynamicImports`. The existing patch-package patch now uses the official Rolldown `codeSplitting: false` replacement for preload output. The main Electron build externalizes `png-to-ico`, so its CommonJS dependencies execute in Node instead of leaving bare `require("util")` calls inside the ESM main bundle.
- Targeted Node run: 66 tests passed. Targeted Vitest run: 3 files / 26 tests passed. The actual Electron smoke run passed.
- `npm audit --json`: 0 vulnerabilities.
- `npm run build`: passed on Vite 8.0.16 with no `inlineDynamicImports` warning; the generated Electron main process also launched successfully.
- `npm run build:web`: passed.
- Full `npm test`: Vitest 124 files / 1097 tests passed; Node test run 296 tests passed.

Post-eighth-pass packaging follow-up:

- Externalizing `png-to-ico` initially fixed the Electron ESM/CommonJS startup failure in the source checkout but exposed a separate portable-package dependency gap: the custom Windows packager did not copy application `node_modules`.
- `png-to-ico` is now a declared runtime dependency. The Windows editor packager recursively copies its installed dependency closure from package manifests instead of maintaining a fragile manual list, and the generated packaged-app manifest records `png-to-ico`.
- Added Node regression coverage for the packaged dependency closure, runtime manifest, and rejection of a development-only declaration. A freshly generated portable editor contained the complete five-package closure and remained running after a five-second packaged-EXE startup smoke check instead of failing module resolution.
- `npm run package:editor:win:dir` passed, including warning-free `npm run build` and `npm run build:web`. Full `npm test` passed with Vitest 124 files / 1097 tests and Node 299 tests.
- `npm audit --json`: 0 vulnerabilities after moving `png-to-ico` into runtime dependencies.

Ninth repair validation:

- Q5 is now closed: the remaining project-scaffolding `isPathInside()` duplicate was replaced by shared `src/shared/pathContainment.js`; `electron/pathSecurity.js` re-exports the same lexical helper while retaining realpath-aware symlink/junction checks locally.
- The shared helper documents its lexical-only contract, and regression coverage confirms that Electron uses the shared function, rejects traversal, preserves missing-descendant handling, and rejects symlink escapes.
- Targeted Vitest run: 2 files / 116 tests passed. Targeted desktop-export Node run: 30 tests passed.
- `npm run build`: passed on Vite 8.0.16, including the Electron main and preload builds.
- Full `npm test`: Vitest 131 files / 1148 tests passed; Node test run 305 tests passed.

Tenth repair validation:

- Q17 is now closed with a bounded contract: export UI file/directory selection and file-content reads consistently return `{ success, data }`, `{ success: false, canceled: true }`, or `{ success: false, error }` instead of mixing raw strings and `null` for success, cancellation, permission rejection, and I/O failure.
- `ExportModal` consumes the envelope explicitly, including cancel-safe directory selection and base64 icon preview reads. Business-specific RPCs such as the unsaved-changes action prompt retain their typed action result rather than being forced into an unrelated payload shape.
- Added shared response constructors plus regression coverage for all three envelope states, source coverage preventing legacy `null` returns in the migrated handlers, and DOM coverage for canceled directory selection.
- Targeted Vitest run: 4 files / 131 tests passed.
- `npm run build`: passed on Vite 8.0.16, including the Electron main and preload builds.
- Full `npm test`: Vitest 131 files / 1150 tests passed; Node test run 305 tests passed.

Eleventh repair validation:

- Q10 is closed in `aaaf8b9`: `main()` now dispatches through an explicit 105-name command-handler registry, including project create/open forwarding, the character-transition alias, and author-check/handoff exit-code extraction. Registry parity plus no-command/unknown-command exit behavior are regression-covered.
- Q9 is closed in `4d9bb49`: the minimal `emitResult()` helper owns JSON/text selection across mutation, query/catalog/report, DSL, preview, and export command families while command-specific callbacks retain the existing text and stderr content. Representative mutation, catalog, and DSL commands are exercised in both modes; `runWithJsonSafeConsole()` and export progress collection/silencing remain unchanged.
- Q11 is closed in `8b25466`: all 68 apply-plan operations now live in a domain-grouped handler registry, and `SUPPORTED_APPLY_PLAN_COMMANDS` is derived from its keys. Existing aliases/defaults/`requireParam()` calls and structured missing-command, unsupported-command, and missing-param repair metadata remain covered by the apply-plan regression surface.
- Per-slice checks: `node --check tools/vn-author/index.js` passed, and `npx vitest run tests/vnAuthorCli.test.js` passed after each slice (Q10 114 tests, Q9 115 tests, Q11 116 tests).
- Final `npm run build`: passed on Vite 8.0.16, including Electron main and preload builds.
- Final full `npm test`: Vitest 131 files / 1153 tests passed; Node test run 305 tests passed.
- Residual risk: Q1 remains open because both registries intentionally stay in `tools/vn-author/index.js`. Output wording is still command-owned by design, so future commands must add a registry entry and choose an explicit text emitter; completeness tests guard the current inventories against silent drift.

Twelfth repair validation and M3 analysis:

- Q19 is closed in `b836fbd`: `src/shared/color.js` now owns the existing six-digit `hexToRgb()` behavior used by color harmony, contrast, and the preset generator. The helper intentionally preserves hash-optional parsing, tuple output, and permissive `NaN` channels for malformed input; no short-hex or normalization semantics were added. Targeted run: 1 file / 4 tests passed.
- Q13/Q14/Q15/M12 are closed in `e2e485b`: the condition editor limit remains 3, the validator's 120-code-unit warning threshold is documented together with `longDialogueLimit` override usage, the handoff checkpoint default remains 5, and patch undo history remains capped at 50. Targeted run: 4 files / 152 tests passed; `npm run build` passed.
- Q16 is closed in `abad8a3`: both handoff artifacts and `author-check` transaction summaries retain `changedPaths` and `changedPathCount` while adding stable `omittedChangedPathCount` metadata. Tests cover no truncation (`0`) and 25-to-20 / 22-to-20 truncation, including CLI JSON and the written handoff artifact. Targeted run: 2 files / 133 tests passed.
- M6 is closed in `b0633c5`: `src/shared/objectMapKey.js` owns the Object.prototype collision check reused by stable IDs, video, variable, text-template, ending, and CG contracts. Their ID patterns, normalization, and error messages are unchanged. Player profile cleanup and effect-pack manifest checks were deliberately not migrated because they enforce different contracts. Targeted prototype-pollution run: 7 files / 63 tests passed.
- B16/M1 are closed in `779ec79`: CodeGraph and literal import checks showed that `Scenes.vue`, `Characters.vue`, `Assets.vue`, `useCanvasState.js`, `CanvasPreview.vue`, and `AssetPanel.vue` had no runtime, dynamic-import, test, build-entry, or documentation dependency beyond the legacy cluster itself. The active scenes route remains `PageEditor.vue`; shared `DraggableElement.vue` remains live through `PageCanvas` and `TitleDesigner`. The six unreachable files (1,422 lines) were deleted. Targeted editor run: 5 files / 40 tests passed; `npm run build` passed.
- M3 remains analysis-only. `changeRevision` currently marks dirty immediately, restarts a 500 ms patch-transaction timer, and restarts a 2 s autosave timer. Manual, shortcut, go-home, external-open, and Electron-close saves converge through one in-flight `attemptSave()`, clear autosave, flush pending patches, enforce the condition-page gate, and then call `project.saveProject()`. Go-home/external-open/reload/unmount clear both timers; Electron close uses awaitable renderer globals before teardown.
- Existing M3 coverage is uneven: `scriptHistory.test.js` behaviorally covers patch grouping/undo/redo/truncation, and a prior Electron smoke covered dirty state, the 500 ms/2 s timing, close/reopen, and persisted consistency. `editorSaveClose.test.js`, however, only asserts source strings, and the committed App mount tests do not exercise timer/save races.
- A dedicated composable is worthwhile only as a bounded persistence-lifecycle extraction, with injected `script`/`project`, configurable 500/2000 ms delays, and an API such as `saving`, `attemptSave`, `flushPendingTransaction`, `cancelPendingTimers`, `hasDirtyProject`, `saveCurrentProject`, and `dispose`. It must preserve the condition repair callback/source labels and the single-active-save contract.
- Required behavior tests before extraction: fake-timer transaction/autosave reset, manual-save flush, save deduplication, failed/blocked save retaining dirty state, edit-during-save revision handling, go-home save/discard/cancel, external-open/reload cancellation, and unmount cleanup. Electron smoke should edit during an intentionally delayed save, close before the next autosave, then reopen and verify the newest revision on disk; it should also repeat the normal 500 ms/2 s and external-conflict paths.
- M3 residual risk: `project.saveProject()` clears `isDirty` on any successful response. If a new edit occurs after the saved snapshot is cloned but before that response, the response can temporarily clear the newer dirty state. A later autosave normally repairs disk state, but closing in that window can miss the newer edit. Timer extraction should not proceed without a save-revision token or equivalent dirty-after-save rule.
- Final validation: `npm run build` passed on Vite 8.0.16, full `npm test` passed with Vitest 134 files / 1165 tests and Node 305 tests, and `git diff --check` passed.

Thirteenth repair validation and M3 completion:

- The race was reproduced before implementation with a mounted `App`, real Pinia project/script stores, fake timers, and a delayed `save-project` IPC Promise: edit A started a save whose cloned payload contained A; edit B incremented `changeRevision` while that save remained pending; the successful A response then set `isDirty = false`; the awaitable Electron close query consequently resolved `false` before the 2 s autosave could persist B.
- The minimal repair gives `project.saveProject()` an internal dirty-generation token and also records `script.changeRevision` after pending patch flush for the App lifecycle call. A successful response still refreshes file state and clears external-conflict metadata, but clears dirty only when both the store generation and live script revision still match the save start. If B occurs in flight, the old response cannot mark the project clean; Electron close sees dirty and its save path sends a new payload containing B. Direct store callers receive the generation guard by default.
- No persistence-lifecycle composable was extracted. The bounded revision guard fixes the correctness defect without moving navigation, external-open/reload, preview, or condition-repair control flow. Extraction would enlarge this repair and should be reconsidered only if another lifecycle change needs the same seam.
- `editorSaveClose.test.js` now has mounted-App behavior coverage for immediate dirty tracking, 500 ms transaction grouping, 2 s autosave debounce, save-button and Ctrl+S timer cancellation plus pending-patch flush, concurrent save deduplication, the condition-page gate and source label, failure/conflict dirty retention, go-home save/discard/cancel, external-open/reload/unmount timer cleanup, the delayed-save revision race, newest-revision close save, and the awaitable Electron close bridge. The two Electron-main bridge expressions remain checked as wiring evidence, not as the race acceptance test.
- Targeted validation passed: all involved JavaScript files passed `node --check`; `npx vitest run tests/editorSaveClose.test.js tests/variableRegistryWorkspace.test.js tests/scriptHistory.test.js` passed 3 files / 40 tests; `npm run build` passed; full `npm test` passed with Vitest 134 files / 1179 tests and Node 305 tests; `git diff --check` passed.
- Electron smoke was not run because the repository has no Electron E2E seam that can intentionally delay `save-project` while driving close/reopen. The deterministic mounted-App test covers the exact timing window and serialized IPC payloads, but a future repo-owned Electron harness should repeat delayed save, immediate close, disk reopen, normal autosave, and external-conflict flows.
- Remaining risk is limited to integration beyond the renderer harness: the Electron main close bridge is still source-verified rather than driven end to end under an intentionally delayed native IPC save. Direct `project.saveProject()` callers are generation-guarded; the App lifecycle adds the stronger script-revision check, while the export path retains its synchronous save-before-export behavior.

Remaining-fix recommendation:

Not every remaining confirmed item should be fixed immediately. The worthwhile path is to defer broad refactors and measurement-sensitive performance changes rather than chase every informational, false-positive, or architecture cleanup item as part of this hardening pass. Recommended buckets:

- Worth doing in a dedicated architecture pass when justified: Q1/Q2/Q4.
- Do not spend immediate hardening time on: false positives, informational findings, broad architecture cleanup such as Q1/Q2/Q4 unless a separate refactor milestone is planned, or low-value optional cleanups now marked "Not planned for audit hardening".
- Not planned for audit hardening: S6, S14, S19, P5, P11, P17, M10, M15.
- Residual risk after the thirteenth pass: Q9-Q19 and M3 are closed without taking on Q1/Q2/Q4 decomposition. M3's remaining risk is the unavailable delayed-save Electron close/reopen smoke described above, not a known renderer dirty-state defect.

## Priority Repair Plan

| Priority | Issue | Status | Severity | Cost | Recommended action |
|---:|---|---|---|---|---|
| 1 | S4 `import-assets` lacks dialog grant validation | Completed | High | Medium | Added preload-issued one-time import grants plus dialog-grant fallback before native file reads. |
| 2 | S10 dependency advisories | Completed | High | Medium | Upgraded vulnerable dependency chain; `npm audit --json` now reports 0 vulnerabilities. |
| 3 | S7/S16 CSS URL construction injection | Completed | Medium | Low | Added shared CSS URL/string escaping and used it in `ThemeManager` and `fontLoader`. |
| 4 | S12 theme ZIP decompression has no size limit | Completed | Medium | Medium | Added compressed-size, uncompressed-size, and file-count bounds to theme ZIP parsing/install. |
| 5 | S11 path containment checks do not resolve symlinks | Completed | Medium | Medium | Added shared realpath-aware path utility and migrated security-sensitive import/export call sites. |
| 6 | B2 `WebSaveManager._getDb()` concurrent open race | Completed | Medium | Low | Cached pending `_dbPromise` and added concurrency regression coverage. |
| 7 | P15 `scriptDiff` recursion can stack overflow | Completed | Medium | Medium | Added max-depth and cycle-pair protection with regression tests. |
| 8 | Q18 CLI IDs are only non-empty strings | Completed | Medium | Medium | Added shared stable ID validation and applied it to authoring session/CLI entity ID entry points for scenes, characters, variables, endings, CG, and videos. |
| 9 | M13 CLI does not parse `--flag=value` | Completed | Low | Low | Added equals-form parsing for values and booleans with CLI regression coverage. |
| 10 | S8 initialization error message uses `innerHTML` | Completed | Low | Very low | Replaced initialization failure HTML interpolation with DOM node creation and `textContent`; added source regression coverage. |

## Detailed Issue Matrix

### Bugs and Potential Errors

| Issue | Judgment | Severity | Evidence / notes | Fix direction | Add test |
|---|---|---|---|---|---|
| B1: choice effects fire-and-forget | Completed | Low | A delayed-repository repro first confirmed routing before persistence. `selectChoice()` now applies variables synchronously, locks repeat selection, awaits ending/CG persistence before routing, continues after logged persistence failure, and preserves scene-enter before ending-unlock notification order. | Done. | Added success, delay, failure, repeat, sync-variable, ordering, and repository durability coverage. |
| B2: `WebSaveManager._getDb()` race | Completed | Medium | Fixed with pending `_dbPromise` reuse; concurrent regression test added. | Done. | Added. |
| B3: `Scenes.vue` / `Characters.vue` call nonexistent store APIs | Closed by dead-code removal | Informational | The claim was false for the historical files because compatibility shims existed. The unreachable legacy views were subsequently removed with B16/M1 after reachability proof; current routes use `PageEditor.vue` and `ResourceLibrary.vue`. | Done. | Covered by current-route tests/build. |
| B4: `listEffectPacksCommand()` crashes because it passes script directly | False positive | Informational | `createProjectSession()` accepts bare script or `{ script }`; CLI command succeeded. | No fix. | No. |
| B5: `cloneJsonValue(null)` returns `{}` in `galgameContract` | Partially true | Low | Behavior exists, but helper is private and current null contract normalization works. | Consider only special-casing `undefined`; confirm callers. | Yes. |
| B6: `normalizeSystems()` mutates input | False positive | Informational | `ensureGalgameContract()` clones before normalizing; repro showed caller object unchanged. | No fix. | No. |
| B7: `Number(value) || 0` hides invalid numbers | Completed | Low | `setLegacySetVariableCompat()` now rejects non-finite numeric edits instead of silently coercing invalid values to `0`. | Done. | Added. |
| B8: `_enterScene()` has no null guard | Completed | Low | `_enterScene()` now returns safely with a logged error when called before a script is loaded. | Done. | Added. |
| B9: first scene fallback uses `Object.keys()[0]` | Partially true | Informational | JS order is deterministic insertion order, not random; product may still need explicit start scene. | Add explicit `startScene` contract if desired. | Yes, if adding field. |
| B10: save slot range not validated in managers | Completed | Low | `SaveManager` and `WebSaveManager` now reject invalid regular slots before IPC/IndexedDB access. | Done. | Added. |
| B11: cyclic save state throws before catch | Completed | Low | Web and desktop save/quickSave paths now catch JSON cloning failures and return structured failures; cyclic-state regression coverage exercises both desktop operations. | Done. | Added. |
| B12: `EventEmitter.emit()` stops after thrown handler | Completed | Low | Listener callbacks are isolated; thrown listener errors are logged and later listeners still run. | Done. | Added. |
| B13: CLI `readScript()` raw JSON.parse error | Completed | Low | `readScript()` wraps parse failures with script path context, and generic `--json` CLI failures now return structured JSON. | Done. | Added. |
| B14: `ackPendingOpenProjectRequest` empty catch | False positive | Informational | Function not present in current `project.js`; likely stale report. | No fix. | No. |
| B15: `saveAgentReviewState()` non-atomic double write | Completed | Low | Agent review state now writes the project artifact first and updates localStorage only after IPC success; browser/no-IPC fallback still uses localStorage. | Done. | Added. |
| B16: `useCanvasState` legacy `commands[]` | Completed | Low | CodeGraph and import/build evidence proved the legacy view cluster unreachable. Removed `useCanvasState`, its only caller `Scenes.vue`, unique `CanvasPreview`/`AssetPanel` dependencies, and the similarly unreachable `Characters.vue`/`Assets.vue`; the current pages editor remains unchanged. | Done. | Current route/UI/build coverage passed. |
| B17: effect preview provenance Map not cleaned | Completed | Low | Terminal effect-preview results retain their provenance on the result object, then delete the request entry from the provenance Map. | Done. | Added. |
| B18: title preview listener registered at module top level | False positive | Informational | Listener is inside `useTitlePreview()` and removed on unmount. | No fix. | No. |
| B19: macOS `win` stale on `window-all-closed` | Completed | Low | `win = null` now runs before platform-specific quit handling, including macOS. | Done. | Added. |

### Performance Findings

| Issue | Judgment | Severity | Evidence / notes | Fix direction | Add test |
|---|---|---|---|---|---|
| P1: undo snapshots full JSON | Completed | Medium | Replaced full duplicate JSON snapshots with forward/inverse path patches. At 10,000 pages the latest patch commit measured 0.003 ms median / 0.004 ms p95; Electron smoke covered 500 ms grouping, pending undo, redo, branch truncation, drag-then-edit, the 50-entry cap, and close/reopen persistence. | Done. | Added and desktop-smoked. |
| P2: graph report computed twice | Completed | Low | `validateProject()` now computes one branch graph report per reachability-enabled validation pass and passes it into branch and ending progression checks. | Done. | Added. |
| P3: deep watcher on entire script | Completed | Medium | Replaced the whole-script deep watcher with explicit `changeRevision` notification emitted by tracked direct nested mutations. At 10,000 pages the latest notification measured 0.003 ms median / 0.004 ms p95; Electron smoke covered dirty, reactive preview, 2 s autosave, and page/dialogue/choice/character/asset/theme/UI nested edits. | Done. | Added and desktop-smoked. |
| P4: SE Audio cleanup | Partially true | Low | Creates `new Audio`; not DOM garbage, and GC should collect, but long sessions can retain until playback finishes. | Optional pool / ended cleanup. | Optional. |
| P5: fixed 20 fade steps | Not planned for audit hardening | Informational | `_fadeVolume()` fixed `steps = 20`; mostly quality, not performance. Impact is visual-tuning level and should not be changed without product/UX intent. | Defer unless tuning nearby fade behavior. | No. |
| P6: `isPageRead()` O(n) | Completed | Low | `PlayerDataRepository` now maintains a read-page Set alongside normalized profile pages; read checks and duplicate guards use the Set. | Done. | Added. |
| P7: profile double stringify | True | Low | Compares stored and normalized with `JSON.stringify`. | Dirty flag / migration marker. | Optional. |
| P8: sceneGraph adjacency dedupe O(E*D) | Completed | Low | Scene graph adjacency now uses Set-backed dedupe while preserving edge-count semantics. | Done. | Added. |
| P9: ending completion nested loop | Completed | Low | Choice-option target edges are pre-indexed for ending completion resolution. | Done. | Added. |
| P10: edge count by repeated filter | Completed | Low | Incoming/outgoing edge counts are precomputed in one pass before node summary generation. | Done. | Added. |
| P11: repeated `normalizeEffects` | Not planned for audit hardening | Informational | Some repeated normalization exists, but small and not proven hot. The churn risk is higher than the unmeasured performance benefit. | Defer unless profiling identifies it. | No. |
| P12: preview script deep clone | True | Low | `buildScriptSnapshot()` clones whole script for preview. | Send minimal scene/page or cache snapshot. | Optional. |
| P13: font loading serial | Completed | Low | `loadAllFonts()` now loads fonts concurrently with `Promise.allSettled` while preserving the existing loaded/failed result shape. | Done. | Added. |
| P14: read history debounce loses close-time writes | Completed | Low | `ReadHistory` now flushes pending debounced writes on `beforeunload` and hidden `visibilitychange`, with explicit teardown support. | Done. | Added. |
| P15: scriptDiff recursion stack overflow | Completed | Medium | Fixed with max-depth and cycle-pair protection; deep-object and cyclic-object tests added. | Done. | Added. |
| P16: recursive Tarjan stack risk | Completed | Low | Replaced recursive Tarjan traversal with an explicit traversal stack; 5,000-scene test coverage and a direct 10,000-scene cyclic-graph repro complete without call-stack overflow. | Done. | Added. |
| P17: transition catalog clones every call | Not planned for audit hardening | Informational | True, but only 56 entries; clone also protects catalog from caller mutation. | Defer unless measured hot. | No. |
| P18: dialog grant Sets never clear | Completed | Low | Project close now clears dialog file grants, dialog directory grants, import grants, and project path grants. | Done. | Added. |

### Security Findings

| Issue | Judgment | Severity | Evidence / notes | Fix direction | Add test |
|---|---|---|---|---|---|
| S1: CLI paths can read outside repo | Partially true | Low | CLI resolves user-provided paths against repo root without containment checks. This is local CLI authority, not P0 remote exploit. | Add containment/confirmation for project-scoped paths. | Yes. |
| S2: recursive directory traversal follows symlinks | False positive | Informational | `Dirent.isDirectory()` does not follow symlink entries. Root symlink remains separate concern. | No fix for stated issue. | Optional. |
| S3: unvalidated editor binary spawn | False positive | Informational | `--editor` and env var are explicit local execution controls. Not a vulnerability by itself. | Optional UX warning. | No. |
| S4: `import-assets` accepts arbitrary native paths | Completed | High | Fixed with preload-issued one-time import grants consumed by `import-assets`; source-level wiring regression added. | Done. | Added. |
| S5: shell string build command | Completed | Medium | Web and desktop export builds now invoke Vite through `execFile` with argv, avoiding shell string construction. | Done. | Added. |
| S6: BrowserWindow security flags not explicit | Not planned for audit hardening | Informational | Flags are not explicit, but Electron defaults are secure. This is documentation-by-code hardening rather than a confirmed behavior bug. | Defer unless touching BrowserWindow construction. | No. |
| S7: ThemeManager CSS URL injection | Completed | Medium | Fixed with shared `cssUrl()` / CSS string escaping in `ThemeManager`; escaping regression added. S7 and S16 were grouped because both were CSS string-construction injection risks. | Done. | Added. |
| S8: `err.message` inside `innerHTML` | Completed | Low | Runtime initialization failure rendering now uses DOM nodes and `textContent` for the error message. | Done. | Added. |
| S9: postMessage wildcard origin | Completed | Low | Editor preview senders now use shared preview messaging helpers that target the current concrete origin, falling back to `*` only for opaque/file origins; source coverage prevents literal wildcard target origins in editor preview code. | Done. | Added. |
| S10: npm audit high vulnerabilities | Completed | High | Fixed by upgrading dependency chain to `vite@^8.0.16` and `tmp@0.2.7`; `npm audit --json` reports 0 vulnerabilities. | Done. | Verified by audit, build, web build, and full tests. |
| S11: path containment ignores symlinks | Completed | Medium | Added shared realpath-aware path utility and migrated audited import/export call sites; symlink containment regression added. | Done. | Added. |
| S12: theme ZIP decompression bomb | Completed | Medium | Theme ZIP parsing/install now bounds compressed bytes, total uncompressed bytes, and file count; regression added. | Done. | Added. |
| S13: IPC leaks `e.message` | Completed | Low | IPC catch paths and the theme-package preflight structured-error path now log details in the main process but return a generic public error response instead of raw exception messages. | Done. | Added. |
| S14: global console replacement | Not planned for audit hardening | Low | `runWithJsonSafeConsole()` mutates global console, but CLI commands run in a short single-command lifecycle. Refactoring logger injection is not worth the audit-hardening churn. | Defer unless CLI logging is refactored. | No. |
| S15: Mermaid escaping incomplete | Completed | Low | Mermaid labels now normalize control whitespace and encode ampersands, quotes, angle brackets, and square brackets; regression coverage prevents label text from injecting another graph statement. | Done. | Added. |
| S16: FontFace URL single-quote injection | Completed | Medium | Fixed with shared `cssUrl()` in `fontLoader`; FontFace source escaping regression added. S7 and S16 were grouped because both were CSS string-construction injection risks. | Done. | Added. |
| S17: CSS sanitizer blacklist bypass | Unconfirmed | Informational | Blacklist is limited, but most usage is via `style.setProperty`; no concrete exploit path confirmed. | Prefer allowlists for high-risk fields. | Needs threat model. |
| S18: SVG fallback passthrough | Completed | Low | Fallback markup is escaped by default; the Quick Action Bar must explicitly opt into `trustedSvgFallback` for its code-owned SVG constants. | Done. | Added. |
| S19: `executeJavaScript` bypasses isolation | Not planned for audit hardening | Informational | Fixed internal snippets are used for dirty/save checks; no user data interpolation was found. Replacing with IPC would be architectural cleanup, not a confirmed security fix. | Defer to architecture cleanup. | No. |
| S20: thumbnail bytes not JPEG-validated | Completed | Low | Save IPC now uses one shared helper to normalize bounded JPEG bytes before writing `.jpg` thumbnails in editor and exported game main processes; tests cover Buffer, Uint8Array, non-JPEG, and oversized input. | Done. | Added. |
| S21: `process.noAsar` global mutation | Completed | Low | Desktop exports that mutate `process.noAsar` are serialized through an export mutex; restore coverage remains in place. | Done. | Added. |

### Code Quality Findings

| Issue | Judgment | Severity | Evidence / notes | Fix direction |
|---|---|---|---|---|
| Q1: `tools/vn-author/index.js` giant file | True | Medium | 8137 lines with parsing, dispatch, commands, helpers. | Split commands, operations, and utils. |
| Q2: `projectValidator.js` God module | True | Medium | 1674 lines mixing validation domains. | Split domain validators. |
| Q3: duplicated helper functions | Partially true | Low | Duplication is real, but count/impact is overstated in places. | Extract shared utility carefully. |
| Q4: `electron/main.js` giant file | True | Medium | 1830 lines with IPC, protocol, window, state, export. | Split into modules. |
| Q5: duplicated `isInsidePath` | Completed | Low | Lexical containment now lives in shared `src/shared/pathContainment.js` and is reused by Electron path security and project scaffolding; realpath-aware checks remain in `electron/pathSecurity.js`. | Done. |
| Q6: duplicated `atomicWrite` | Completed | Low | Editor and exported-game main processes now import `electron/atomicWrite.js`; desktop export copies and rewrites the shared helper import. | Done. |
| Q7: iframe preview duplication | True | Low | Similar postMessage lifecycle in multiple composables. | Extract preview composable. |
| Q8: screen editor view duplication | True | Low | Game menu, save/load, backlog editors are similar wrappers. | Parameterized screen editor. |
| Q9: CLI JSON output duplication | Completed | Low | Shared `emitResult()` now owns JSON/text selection across command families while preserving command-specific text, stderr, exit codes, JSON-safe console handling, and export progress behavior. | Done. |
| Q10: CLI main dispatch if-chain | Completed | Low | Replaced the 105-name dispatch chain with an explicit command-handler registry, preserving aliases, project forwarding, special exit-code extraction, and help exit behavior. | Done. |
| Q11: plan operation dispatch if-chain | Completed | Low | Replaced all 68 operation branches with a domain-grouped handler registry; the supported-command list is generated from registry keys and structured repair errors remain intact. | Done. |
| Q12: condition row helper duplication | Completed | Low | Canonical/legacy row extraction, condition value compatibility, and comparison helpers now live in `branchingContract` and are reused by condition analysis and project validation. | Done. |
| Q13: condition row limit magic number | Completed | Informational | The editor's unchanged three-row limit now has a semantic constant/helper and exact-boundary behavior coverage. | Done. |
| Q14: long dialogue limit undocumented | Completed | Informational | The existing `DEFAULT_LONG_DIALOGUE_LIMIT = 120` now documents its JavaScript string code-unit unit, warning purpose, and `validateProject(..., { longDialogueLimit })` override. It remains private because no reuse requires export. | Done. |
| Q15: checkpoint limit magic number | Completed | Informational | The unchanged default of 5 now uses `DEFAULT_HANDOFF_CHECKPOINT_LIMIT`; CLI coverage verifies default and `--checkpoint-limit 2`. | Done. |
| Q16: changedPaths truncation | Completed | Informational | Existing fields remain intact and both summary producers now report `omittedChangedPathCount`, including stable zero when nothing is omitted. | Done. |
| Q17: IPC response shapes inconsistent | Completed | Low | Export UI file/directory dialogs and file-content reads now share explicit success, canceled, and failure envelopes; typed business RPCs retain domain-specific payloads. | Done. |
| Q18: ID validation too weak | Completed | Medium | Added `src/shared/stableId.js` and applied stable ID checks to project-session/CLI entity ID entry points. |
| Q19: `hexToRgb` duplicated | Completed | Low | Three identical implementations, including the preset generator, now use `src/shared/color.js` without changing parsing tolerance or adding color normalization. | Done. |

### Maintainability Findings

| Issue | Judgment | Severity | Evidence / notes | Fix direction |
|---|---|---|---|---|
| M1: legacy views use old `commands[]` | Completed | Low | The unreachable legacy views/composable and their unique dependencies were removed after CodeGraph/import/build proof; no `commands[]` migration was introduced. | Done. |
| M2: `onBeforeUnmount` outside factory | False positive | Informational | Checked related composables; cleanup is registered inside factory functions. | No fix. |
| M3: manual debounce timers | Completed | Informational | Mounted-App fake-timer tests now cover the save lifecycle and reproduce the edit-during-save race. Dirty-generation and saved-revision guards prevent an older successful response from clearing dirty after a newer edit, without changing the 500/2000 ms delays or IPC payload. | Done; composable extraction deferred because it would expand scope without improving the bounded fix. |
| M4: file state compares only mtime and size | Completed | Low | Script file state now includes SHA-256 and shared comparison prefers hashes while retaining compatibility with pre-hash mtime/size states. | Done. |
| M5: exported global regex lastIndex | Completed | Low | Text template operations reset the exported global regex before use. |
| M6: unsafe key set duplicated | Completed | Low | Stable ID, video, variable, text-template, ending, and CG contracts now share `isSafeObjectMapKey()` while retaining their distinct format/normalization/error rules. | Done. |
| M7: `unique().filter(Boolean)` drops falsy values | Partially true | Informational | True but current call sites mostly expect strings. | Rename or preserve semantics. |
| M8: fallback project ID collision | Partially true | Informational | Theoretical; default crypto UUID path is fine, fallback 10000-run repro had no collision. | Optional longer random/counter. |
| M9: ConfigManager set accepts any key/value | Completed | Low | `ConfigManager` now applies a key/type/range schema when loading persisted settings and when setting values at runtime; invalid and unknown keys are ignored with regression coverage. | Done. |
| M10: EventEmitter lacks `once/removeAllListeners` | Not planned for audit hardening | Informational | Missing convenience API, not a correctness or security defect. | Add only when a real caller needs it. |
| M11: BGM fadeIn ignored | Completed | Low | `ScriptEngine` now emits `page.bgm.fadeIn ?? 0` in `play_bgm` events. |
| M12: undo limit 50 magic number | Completed | Informational | The unchanged patch-history cap now uses `MAX_UNDO_HISTORY_ENTRIES`; existing undo/redo, branch truncation, and 50-entry behavior coverage passed. | Done. |
| M13: CLI lacks `--flag=value` parsing | Completed | Low | CLI helpers now parse equals-form values and boolean flags; `list-transitions --target=background` regression added. | Done. |
| M14: `getMainWindow()` may return wrong fallback | Completed | Low | `getMainWindow()` now returns only the tracked main `win` and rejects missing/destroyed windows; source regression coverage prevents focused/all-window fallback from returning. | Done. |
| M15: Chinese UI strings hard-coded | Not planned for audit hardening | Informational | Many hard-coded strings. Product may be Chinese-first, so i18n is a product milestone rather than an audit repair. | Defer unless localization becomes a product goal. |

## Suggested Next Session Start

1. Do not restart with Q5, Q6, Q9, Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19, S8, B1, B7, B8, B10, B11, B12, B13, B15, B16, B17, B19, S5, S9, S13, S15, S18, S20, S21, M1, M3, M4, M5, M6, M9, M11, M12, M14, P1, P2, P3, P6, P8, P9, P10, P13, P14, P16, or P18; these are now completed and regression-covered. The Vite Electron `inlineDynamicImports` warning is also closed.
2. Do not continue with S6, S14, S19, P5, P11, P17, M10, or M15 unless nearby product work makes one of them relevant.
3. Defer broad refactors unless a separate architecture milestone is approved: Q1/Q2/Q4 and major IPC response-shape consolidation. Do not extract the M3 persistence lifecycle unless a future scoped change justifies the additional seam.
4. For each future repair batch, keep the pattern from the first two passes: add minimal repro/regression tests, run targeted suites, run `npm audit --json` if dependencies or supply-chain surfaces changed, then finish with full `npm test`.
