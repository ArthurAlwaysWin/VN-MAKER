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
| `unknown-page-type` | Page type is not `normal`, `choice`, or `condition`. |
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
| `empty-normal-page` | Normal page has no useful content. |
| `long-dialogue-text` | Dialogue text is longer than the validator limit. |
| `unreachable-scene` | Scene cannot be reached from `start` or the selected entry scene. |
| `dead-end-scene` | A reachable terminal route in a project with registered endings has no ending resolution. |
| `cycle-without-exit` | A reachable route cycle in a project with registered endings has no exit and no ending resolution. |
| `ending-unlock-unreachable` | An ending has unlock effects, but all of them are on unreachable scenes. |
| `cg-unlock-unreachable` | A CG has unlock effects, but all of them are on unreachable scenes. |
| `unknown-camera-effect` | Page camera effect is preserved but ignored at runtime. |
| `unknown-transition-type` | Page transition type is not in the completed M5 runtime catalog; it is preserved but falls back to a declared compatible id when available, otherwise `fade`. |
| `unknown-character-animation` | Character animation is preserved but ignored at runtime. |
| `invalid-transition-param` | Cinematic duration, intensity, or direction is outside the shared catalog contract and will be clamped or safely defaulted at runtime. |
| `invalid-ui-motion-config` | `ui.motion` is not an object; runtime uses default motion presets. |
| `invalid-ui-motion-intensity` | `ui.motion.intensity` is not one of `off`, `subtle`, `standard`, or `dramatic`; runtime falls back safely. |
| `invalid-ui-motion-preset` | One of the `ui.motion` preset fields is unsupported; runtime falls back to the field default. |

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
| `screen-ui-preview` | A supported screen UI path changed and needs visual review in Project Settings preview targets. `ui.motion` creates targets for all major screens. |
| `ending-list-preview` | `systems.endings` changed and needs review in Story Systems. |
| `gallery-preview` | `systems.gallery.cg` changed and needs review in Story Systems and the runtime gallery. |
| `branch-graph-preview` | `scenes.*` changed and needs review in the Story Systems branch flow panel. |
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
