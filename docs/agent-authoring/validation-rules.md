# Agent Validation Rules

Every agent workflow should finish with validation:

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
| `invalid-effects` | A choice effect cannot normalize. |
| `unsupported-effect` | Effect type is outside the shared DSL. |

## Common Warning Codes

| Code | Meaning |
| --- | --- |
| `missing-project-id` | Script has no stable `projectId`. |
| `missing-dialogue-expression` | Dialogue expression is not registered on the speaker. |
| `missing-page-character-expression` | Staged expression is not registered on the character. |
| `unregistered-variable-effect` | Choice effect references an unregistered variable. |
| `unregistered-condition-variable` | Condition page references an unregistered variable. |
| `unregistered-ending-unlock` | Ending unlock references an unregistered ending. |
| `unregistered-cg-unlock` | CG unlock references an unregistered CG. |
| `missing-asset-reference` | Asset validation could not find a referenced asset. |
| `empty-normal-page` | Normal page has no useful content. |
| `long-dialogue-text` | Dialogue text is longer than the validator limit. |
| `unreachable-scene` | Scene cannot be reached from `start` or the selected entry scene. |
| `unknown-camera-effect` | Page camera effect is preserved but ignored at runtime. |
| `unknown-transition-type` | Page transition type is preserved but falls back to `fade` at runtime. |
| `unknown-character-animation` | Character animation is preserved but ignored at runtime. |

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
- Missing asset references.
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
| `screen-ui-preview` | A supported screen UI path changed and needs visual review in Project Settings preview targets. |
| `reference-screenshot-fidelity` | A plan used a reference screenshot and includes notes about what matched and what still needs human visual comparison. |
| `layout`, `readiness`, `validation` | Existing structural and quality gates that should be resolved or explicitly accepted before handoff. |

## Scene Graph

`export-report` includes scene graph data:

```json
{
  "sceneGraph": {
    "entrySceneId": "start",
    "graph": {
      "start": ["route_a", "route_b"],
      "route_a": ["ending_check"]
    },
    "reachableSceneIds": ["start", "route_a", "route_b"],
    "unreachableSceneIds": []
  }
}
```

By default, validation starts graph traversal from `start` when it exists, otherwise the first scene in the script. Partial drafts can suppress reachability warnings through the authoring API with `checkReachability: false`, but handoff-ready projects should have no unreachable scenes.
