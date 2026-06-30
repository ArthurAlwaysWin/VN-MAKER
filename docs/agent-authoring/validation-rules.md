# Agent Validation Rules

Every agent workflow should finish with validation. Diagnostic shape and stability requirements are defined in [integration-contract.md](./integration-contract.md).

```bash
npm run vn -- validate --script public/game/script.json --json
npm run vn -- lint-layout --script public/game/script.json --json
npm run vn -- export-readiness --script public/game/script.json --json
```

Use asset validation before export or handoff:

```bash
npm run vn -- validate --script public/game/script.json --check-assets --json
```

## Validation Result

Validator output is structured for agents:

```json
{
  "ok": true,
  "errors": [],
  "warnings": []
}
```

Errors mean the project contract is broken and should be fixed before handoff. Warnings mean the project can usually run, but the authoring quality, persistence safety, or export readiness needs review.

## Common Error Codes

| Code | Meaning |
| --- | --- |
| `invalid-script` | Script root is not an object. |
| `invalid-scenes` | Top-level `scenes` is not an object. |
| `invalid-scene-pages` | Scene `pages` is not an array. |
| `unknown-page-type` | Page type is not `normal`, `choice`, `input`, `condition`, or `video`. |
| `missing-scene-target` | A scene, choice, or condition target does not exist. |
| `missing-page-character` | A staged character id is not registered. |
| `missing-dialogue-speaker` | A dialogue speaker id is not registered. |
| `invalid-variable-registry` | `systems.variables` is not an object map. |
| `invalid-variable-id` | A variable id or variable reference uses an unsupported id shape. |
| `duplicate-variable-id` | Two registry keys collide after normalization. |
| `invalid-variable-entry` | A variable registry entry is not an object. |
| `invalid-ending-registry` | `systems.endings` is not an object map. |
| `invalid-ending-id` | An ending id or ending reference uses an unsupported id shape. |
| `duplicate-ending-id` | Two ending registry keys collide after normalization. |
| `invalid-ending-entry` | An ending registry entry is not an object. |
| `invalid-cg-registry` | `systems.gallery.cg` is not an object map. |
| `invalid-cg-id` | A CG id or CG reference uses an unsupported id shape. |
| `duplicate-cg-id` | Two CG registry keys collide after normalization. |
| `invalid-cg-entry` | A CG registry entry is not an object. |
| `invalid-effects` | A choice or normal page entry effect cannot normalize. |
| `unsupported-effect` | Effect type is outside the shared DSL. |
| `unsupported-page-enter-effect` | A normal page entry effect is not `unlock:ending`; page-enter effects are intentionally limited to ending progression. |
| `invalid-video-registry` | `assets.videos` is present but is not an object map. |
| `invalid-video-id` | A video registry id or video reference id uses an unsupported id shape. |
| `duplicate-video-id` | Two video registry keys collide after normalization. |
| `invalid-video-entry` | A video registry entry is not an object. |
| `missing-video-file` | A video registry entry has no `file`. |
| `invalid-video-reference` | A video reference is not an object. |
| `missing-video-source` | A video reference has neither `videoId` nor `file`. |
| `unknown-video-id` | A video reference points at an undeclared `assets.videos` id. |
| `unsupported-video-extension` | A video file is not `.mp4` or `.webm`. |
| `unsafe-video-path` | A video path is absolute, remote, data/blob/file URL, empty-segment, or traversal-based. |
| `invalid-video-root` | A video path does not start with canonical `videos/`. |
| `missing-video-asset-reference` | Asset validation could not find a referenced video file; this is an error before export. |
| `missing-video-page-video` | A `type: "video"` page has no `video` reference. |
| `invalid-video-play-mode` | An OP/ED video reference uses an unsupported `play` value. |
| `invalid-video-volume` | Video `volume` is outside `0..1`. |
| `invalid-video-audio-mode` | Video `audioMode` is not `replace`, `duck`, or `mix`. |
| `invalid-video-fit` | Video `fit` is not `contain`, `cover`, or `native`. |
| `invalid-video-boolean` | A boolean video option is not a boolean. |
| `invalid-video-auto-advance` | A video page `autoAdvance` value is not boolean. |
| `invalid-video-loop` | A video page `loop` value is not boolean. |
| `video-loop-auto-advance-conflict` | A video page combines `loop: true` and `autoAdvance: true`. |

## Common Warning Codes

| Code | Meaning |
| --- | --- |
| `missing-project-id` | Script has no stable `projectId`. |
| `missing-dialogue-expression` | Dialogue expression is not registered on the speaker. |
| `missing-page-character-expression` | Staged expression is not registered on the character. |
| `unregistered-variable-effect` | Choice effect references an unregistered variable. |
| `unregistered-condition-variable` | Condition page references an unregistered variable. |
| `variable-type-mismatch` | A variable effect or condition compares/sets a bool/number with an incompatible operator or value. |
| `affection-character-missing` | An affection variable does not point at an existing character. |
| `condition-missing-targets` | A configured condition page has neither a true nor false target. |
| `condition-always-false` | Same-variable comparisons on an `all` condition page can never take the true route. |
| `condition-always-true` | Same-variable comparisons on an `any` condition page always take the true route. |
| `duplicate-condition-comparison` | A condition page repeats the same variable comparison. |
| `condition-identical-targets` | A condition page sends both outcomes to the same target scene. |
| `unregistered-ending-unlock` | Ending unlock references an unregistered ending. |
| `ending-never-unlocked` | An ending is registered but no `unlock:ending` effect references it. |
| `no-reachable-ending` | No registered ending unlock is reachable from the entry scene. |
| `missing-ending-thumbnail` | A hidden ending lacks a thumbnail for ending-list review. |
| `unregistered-cg-unlock` | CG unlock references an unregistered CG. |
| `cg-never-unlocked` | A registered CG has no `unlock:cg` effect. |
| `missing-cg-image` | A registered CG has no full gallery image. |
| `missing-cg-thumbnail` | A registered CG has no thumbnail for gallery review. |
| `missing-asset-reference` | Asset validation could not find a referenced asset. |
| `unknown-video-kind` | A video registry `kind` is outside `op`, `ed`, `story`, or `other`. |
| `opening-video-before-title-autoplay-risk` | `ui.titleScreen.openingVideo.play` uses `before-title`, which requires a click-to-play gate for unmuted playback. |
| `empty-normal-page` | Normal page has no useful content. |
| `long-dialogue-text` | Dialogue text is longer than the validator limit. |
| `unreachable-scene` | Scene cannot be reached from `start` or the selected entry scene. |
| `dead-end-scene` | A reachable terminal route in a project with registered endings has no ending resolution. |
| `cycle-without-exit` | A reachable route cycle in a project with registered endings has no exit and no ending resolution. |
| `ending-unlock-unreachable` | An ending has unlock effects, but all of them are on unreachable scenes. |
| `cg-unlock-unreachable` | A CG has unlock effects, but all of them are on unreachable scenes. |
| `unknown-camera-effect` | Page camera effect is preserved but ignored at runtime. |
| `unknown-transition-type` | Page transition type is not in the shared runtime catalog; it is preserved but falls back to a declared compatible id when available, otherwise `fade`. |
| `unknown-character-animation` | Character animation is preserved but ignored at runtime. |
| `invalid-transition-param` | Cinematic duration, intensity, or direction is outside the shared catalog contract and will be clamped or safely defaulted at runtime. |
| `invalid-ui-motion-config` | `ui.motion` is not an object; runtime uses default motion presets. |
| `invalid-ui-motion-intensity` | `ui.motion.intensity` is not one of `off`, `subtle`, `standard`, or `dramatic`; runtime falls back safely. |
| `invalid-ui-motion-preset` | One of the `ui.motion` preset fields is unsupported; runtime falls back to the field default. |
| `noncanonical-ui-style-preset-field` | `ui.stylePreset` was stored as data. Apply presets through `apply-ui-style-preset` so normal editable UI sections are written instead. |
| `invalid-settings-screen-config` | `ui.settingsScreen` is not an object. |
| `invalid-settings-tab-mode` | `ui.settingsScreen.tabBar.enabled` is present but is not boolean. |
| `invalid-settings-button-action` | A custom settings button action is not `close` or `reset`. |
| `invalid-settings-footer-action` | A structured settings footer action is not `close`, `title`, or `reset`. |
| `invalid-effect-pack-registry` | `assets.effectPacks` is not an object. |
| `invalid-effect-pack-manifest` | A data-only effect-pack manifest is malformed or contains blocked executable fields. |
| `invalid-effect-pack-file-path` | A manifest file path is unsafe or outside `effects/<id>/`. |
| `unsupported-effect-pack-adapter` | The manifest adapter is not built into the app; validation preserves it but runtime no-ops. |
| `unsupported-effect-pack-kind` | The manifest kind is unsupported and is treated as `postprocess`. |
| `effect-pack-id-mismatch` | The registry key and manifest id differ. |
| `condition-page-effect-packs` | A condition page tried to declare effect packs; condition pages do not render them. |
| `invalid-page-effect-packs` | A page `effectPacks` field is present but is not an array. |
| `invalid-page-effect-pack-entry` | A page effect-pack reference is malformed. |
| `invalid-page-effect-pack-id` | A page effect-pack reference id is not a stable identifier. |
| `effect-pack-reference-missing` | A page references an effect pack that is not registered in `assets.effectPacks`. |
| `invalid-effect-pack-params` | A page effect-pack reference contains unsupported params; known params are normalized through the manifest schema. |

## Canonical UI Diagnostic Codes

| Code | Meaning |
| --- | --- |
| `ui-schema-version-invalid` | Canonical UI schema is not supported version 2. |
| `ui-registry-invalid` / `ui-registry-key-unknown` | A screen/overlay registry or id is invalid. |
| `ui-authority-invalid` / `ui-authority-conflict` / `ui-authority-document-missing` | Authority is unknown, dual-writer, or missing its canonical document. |
| `ui-document-*` | Canonical document envelope, id, or kind is invalid. |
| `ui-node-id-invalid` / `ui-node-id-duplicate` | Node identity is unstable or duplicated. |
| `ui-root-*` / `ui-node-parent-missing` / `ui-node-unreachable` / `ui-hierarchy-cycle` | Hierarchy root, parent, reachability, or acyclic rules failed. |
| `ui-node-order-invalid` | Deterministic node order is invalid. |
| `ui-widget-type-unknown` / `ui-required-part-missing` | Widget type is unknown or a protected semantic part is missing. |
| `ui-layout-*` | Typed anchor, pivot, offset, size, constraint, padding, or alignment failed. |
| `ui-style-*` / `ui-state-*` | Typed style or lifecycle state data is unsafe or unknown. |
| `ui-action-*` | Canonical action id or typed parameters are invalid. |
| `ui-binding-unknown` | Binding source is outside the closed semantic registry. |
| `ui-asset-reference-invalid` | Asset kind/path/id is invalid or unsafe. |
| `ui-capability-unregistered` | Advanced data was persisted before matching renderer/validator support. |
| `ui-component-instance-invalid` / `ui-variant-invalid` / `ui-predicate-invalid` / `ui-animation-track-invalid` | An enabled advanced envelope violates its bounded schema. |
| `ui-legacy-field-unsupported` / `ui-legacy-value-loss` | Pure legacy normalization found unsupported or lossy data and did not silently drop it. |
| `ui-legacy-source-empty` / `ui-legacy-overlay-synthetic` | Read-only inspection used an empty/synthetic compatibility envelope. |
| `ui-theme-projection-unsupported` | Phase 2 `.gmtheme` projection excluded advanced detail pending its vertical slice. |

All canonical UI diagnostics contain stable `severity`, `code`, `path`, `pathString`, and actionable `message`. Diagnostics never trigger automatic migration writes.

## Effect Pack Boundary

Milestone 11 effect packs are manifest-only. Validator support exists for data-only manifests under `assets.effectPacks`, page references under `scenes.*.pages.*.effectPacks`, and path-safe files under `effects/<id>/`.

Do not treat project-local `runtime.js`, arbitrary JavaScript, shader/WebGL code, raw CSS/HTML, plugin metadata, AI chat fields, or generic effect DSL data as supported project data. Unknown adapters may be preserved with a warning, but only built-in allowlisted adapters run.

## Handoff Checklist

Before handing a project back to the human creator:

1. `validate --json` returns `ok: true`.
2. `validate --check-assets --json` has no unexpected missing assets.
3. `lint-layout --json` has no unresolved warnings.
4. `export-report --json` shows the expected character, scene, page, and variable counts.
5. `export-report --json` shows `sceneGraph.unreachableSceneIds: []`.
6. `export-readiness --json` returns `ready: true`.

## Export Readiness

`export-readiness` is the final agent handoff gate:

```bash
npm run vn:readiness -- --json
```

It combines:

- Validator errors.
- Missing asset references, including ending thumbnails and CG gallery artwork.
- Layout lint warnings.
- Scene graph reachability.
- Referenced asset counts by category.
- Unused project assets discovered during asset checks.
- Theme asset coverage for locked cursor/icon/badge/button-family slots.

Example:

```json
{
  "ready": true,
  "blockers": [],
  "warnings": [],
  "assets": {
    "checked": true,
    "missing": [],
    "unused": []
  },
  "theme": {
    "coverage": ["theme", "dialogueBox"],
    "missingCoverage": ["widgetStyles", "saveLoadScreen"],
    "warningCount": 0
  }
}
```

When `ready` is `false`, fix every `blockers[]` entry before handoff.

`unused-asset` and `theme-*-partial-coverage` entries are warnings. They do not block export, but agents should either remove unused files, reference them intentionally, or tell the human creator why they remain. Theme partial coverage means a locked asset group was started but not completed; for example, a `pageTabPager` button family should provide `normal`, `hover`, `pressed`, and `selected`.

## Handoff Review Categories

`handoff-report` enriches review items with a `category` field so Project Settings and external agents can distinguish human tasks:

| Category | Meaning |
| --- | --- |
| `missing-asset` | A referenced asset path does not exist in known project assets. The item includes `assetPath`, `assetKind`, and a suggested `list-assets` / `validate --check-assets` follow-up. |
| `unused-asset` | A file exists under the asset root but is not referenced by the script. The human should confirm whether to reference, rename, or remove it. |
| `asset-check` | Handoff did not run with known assets, so missing files may not have been detected. |
| `placeholder-asset` | A referenced asset path appears to be a placeholder, such as `placeholder`, `todo`, or `dummy`. Replace it with final art/audio or explicitly accept it. |
| `ambiguous-asset` | A referenced asset path has a generic filename such as `bg01.png`, `img02.png`, or `button.png`, which may confuse future agent matching. |
| `screen-ui-preview` | A supported screen UI path changed and needs visual review in Project Settings preview targets. `ui.motion` and broad UI style preset scopes create targets for title and major screens. |
| `ending-list-preview` | `systems.endings` changed and needs review in Story Systems. |
| `gallery-preview` | `systems.gallery.cg` changed and needs review in Story Systems and the runtime gallery. |
| `branch-graph-preview` | `scenes.*` changed and needs review in the Story Systems branch flow panel. |
| `video-preview` | `assets.videos`, `ui.titleScreen.openingVideo`, `systems.endings.*.endingVideo`, or `scenes.*.pages.*.video` changed and needs OP/ED/story video playback review. |
| `particle-preview` | `scenes.*.pages.*.particles` changed and needs visual review in page/runtime preview. |
| `transition-preview` | `scenes.*.pages.*.transition` changed and needs visual review in page/runtime preview. |
| `effect-pack-preview` | `scenes.*.pages.*.effectPacks` changed and needs visual review in page/runtime preview. |
| `reference-screenshot-fidelity` | A plan used a reference screenshot and includes notes about what matched and what still needs human visual comparison. |
| `layout`, `readiness`, `validation` | Existing structural and quality gates that should be resolved or explicitly accepted before handoff. |

## Scene Graph

`graph-report` and `export-report` include derived scene graph data; `graph-report --mermaid` prints a Mermaid flowchart:

```json
{
  "sceneGraph": {
    "entrySceneId": "start",
    "graph": {
      "start": ["route_a", "route_b"],
      "route_a": ["ending_check"]
    },
    "reachableSceneIds": ["start", "route_a", "route_b"],
    "unreachableSceneIds": [],
    "missingTargetEdges": [],
    "deadEndSceneIds": [],
    "cyclesWithoutExit": [],
    "endings": { "unreachableUnlockIds": [] },
    "cgs": { "unreachableUnlockIds": [] }
  }
}
```

By default, validation starts graph traversal from `start` when it exists, otherwise the first scene in the script. `missingTargetEdges` retain exact author paths and `repair-scene-target` hints; the repair and clear commands also accept references to an absent target id. Dead-end and closed-cycle validation warnings apply once the project has explicit registered endings; basic drafts can still inspect those graph findings without making validation noisy. Partial drafts can suppress reachability warnings through the authoring API with `checkReachability: false`, but handoff-ready projects should have no unresolved graph findings. Story Systems > Flow presents these route findings together with unreachable unlock and asset handoff review navigation.

## Whole-project UI migration gates

Run `migrate-ui-project --validate-only` before dry-run or write. Invalid canonical documents refuse the entire transaction. A successful transaction must report only exact `ui.*` changed paths, pass project validation, preserve non-UI JSON semantics, and create a checkpoint before write. Repeated migration must return no changed paths. Export readiness remains authoritative after migration; missing business assets may not be bypassed with `--allow-readiness-blockers` for release closure.
