# Unified Screen Designer Phase 11 Audit Ledger

**Status:** Complete. Implementation, migration, readiness, Web export, and Windows desktop export are audited.
**Evidence date:** 2026-06-30 (Australia/Sydney)

Earlier AI completion claims were treated as hypotheses and rechecked against the live checkout, tests, CLI transactions, browser DOM, screenshots, export readiness, and packaging gates.

## Integration Ledger

| Surface | Current owner | Canonical path | Compatibility path | Editor / CLI | Coverage | Result | Retirement condition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Title | `TitleScreen` | `ui.screens.title` | `ui.titleScreen` + adapter/runtime fallback | Unified shell; full title node commands; migration | validation/theme/assets/export/runtime/browser | Pass | Supported legacy samples migrate and no release telemetry requires `legacy-only` title |
| Gameplay | `GameplayUi` + engine owners | `ui.screens.gameplay` | dialogue/widget/theme adapter | Page Editor UI mode; safe node updates; migration | story stage excluded; runtime/editor/browser | Pass | Legacy dialogue/widget projection has no supported consumer |
| Game Menu | `GameMenu` | `ui.screens.gameMenu` | `ui.gameMenu` | Unified shell; full node commands; migration | runtime/editor/browser/confirmation | Pass | Supported legacy menu fixtures migrate |
| Settings | `SettingsScreen` + `ConfigManager` | `ui.screens.settings` | `ui.settingsScreen` | Unified shell; safe node updates; migration | registered keys/runtime/editor/browser | Pass | Settings legacy fixtures and packaged samples migrate |
| Save/Load | `SaveLoadScreen` + save manager | `ui.screens.saveLoad` | `ui.saveLoadScreen` | Unified shell; safe node updates; migration | modes/confirmation/runtime/editor | Pass | Old layouts migrate; save data is never migration input |
| Backlog | `BacklogScreen` + audio owner | `ui.screens.backlog` | `ui.backlogScreen` | Unified shell; safe node updates; migration | empty/populated/voice cleanup | Pass | Old backlog layouts migrate |
| Gallery | `GalleryScreen` + CG/ending registries | `ui.screens.gallery` | deterministic adapter | Unified shell; safe node updates; migration | locked/unlocked/multi-image/ending/browser | Pass | Supported samples persist canonical Gallery |
| Text Input | `TextInputScreen` + `ScriptEngine.submitInput()` | `ui.overlays.textInput` | synthetic adapter | Unified shell; overlay commands; migration | keyboard/IME/focus/runtime/editor | Pass | Supported projects persist the overlay |
| Confirmation | `SharedConfirmationOverlay` | `ui.overlays.confirmation` | synthetic adapter/default document | Unified shell; confirmation commands; migration | named dialog/focus/responsive/runtime/editor | Pass | Legacy projects no longer need a synthetic document |
| Video Controls | `VideoPlayer` | `ui.overlays.videoControls` | synthetic adapter | Unified shell; overlay commands; migration | policy/media cleanup/responsive/runtime/editor | Pass | Supported samples persist the overlay |

## Migration Evidence

`migrate-ui-project` reuses `projectSession`, validation, checkpoint, result-out, preview, handoff, and restore-checkpoint infrastructure. It preserves valid canonical documents even under mixed authority, adapts only missing documents, returns exact paths, and is idempotent. Project Settings exposes validate, dry-run, confirmed write with checkpoint/result artifact, and rollback. Project load resolves compatibility in memory without persisting canonical migration data.

`.tmp/phase11-migration/matrix-report.json` covers minimal legacy, customized legacy, mixed authority, fully canonical, repeated migration, invalid refusal, non-UI preservation, and an actual CLI checkpoint/restore transaction. The customized fixture changes exactly 18 UI paths. The generated `checkpoint-rollback` entry records the checkpoint/result artifact paths, before/migrated/restored SHA-256 values, semantic equality, and byte equality; no transient hash is hard-coded in this document.

## Accessibility, Performance, Browser, And Release

- Gallery navigation preserves focus after DOM rebuild and returns it to the originating card.
- Shared gamepad input uses D-pad/axes to navigate, A to activate, and B for modal cancel or canonical close; unmount stops polling.
- Reduced-motion browser emulation matched the global policy with `0s` root animation duration.
- `.tmp/phase11-performance.json`: 301-node cold mount 102.92 ms; warm update median 42.61 ms, p95 60.37 ms; 1,000 editor patches averaged 0.061 ms; 1,000 gamepad moves averaged 1.717 ms; unmount left zero entries/root children.
- The in-app Browser verified Gallery interaction/focus and Confirmation runtime/editor behavior. Repeated multi-route screenshot capture timed out, so repository Playwright produced the remaining DOM/bounding-box matrix and screenshots under `.tmp/phase11-browser-fallback/`. The final console is clean.
- The three `sakura_affection` warnings were a real missing registry entry and are fixed.
- Intended audio files were supplied for `audio/bgm_spring.mp3`, `audio/bgm_peaceful.mp3`, and `audio/se_footstep.mp3`. Readiness now reports `ready: true`, zero blockers, zero warnings, and no missing or unused assets.
- The CLI export path now passes its resolved `assetRoot` through to both Web and desktop asset copying, so readiness and packaging inspect the same files. Focused Web and desktop export tests cover an explicit external asset root.
- A fresh Web build plus Web ZIP export and Windows desktop ZIP export completed without readiness bypasses or export warnings under `.tmp/phase11-release/`. All three packaged audio files are byte-identical to their source assets, and the exported Windows executable remained alive through the launch smoke-test window.

## Legacy Decision

All legacy readers, writers, render fallbacks, and adapters are retained. Owner: `src/shared/uiLegacyAdapters.js` plus each runtime screen owner. Removal now would strand supported legacy projects and synthetic overlay migration. Retirement requires supported-sample migration, editor/CLI/runtime/theme/export round trips, release telemetry showing no required `legacy-only` consumer, and a separately reviewed removal batch with checkpoint plus full browser/export/package reruns.
