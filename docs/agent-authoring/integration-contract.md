# AI Agent Integration Contract

**Status:** Active  
**Date:** 2026-05-23  
**Audience:** maintainers, external AI agents, CLI/tooling authors, editor feature developers

This document consolidates the agent-facing contract that currently spans the project contract, plan manifest, command reference, validation rules, preview workflow, and handoff artifact.

The short version:

> Agents are first-class authoring clients. They should edit Galgame Maker projects through stable structured operations, not GUI clicking and not private JSON conventions.

## 1. Scope

This contract covers:

- canonical project data;
- agent operation manifests;
- transaction results;
- validation diagnostics;
- preview targets;
- handoff artifacts;
- editor conflict/reload behavior;
- extension rules for new systems.

This contract does not define:

- an in-editor chat assistant;
- arbitrary plugin execution;
- arbitrary HTML/CSS/JavaScript injection;
- a second project format for agents.

## 2. Contract Stack

| Contract | Active document | Purpose |
| --- | --- | --- |
| Project data | `docs/agent-authoring/project-contract.md` | Shape of `script.json` and author-owned data |
| Plan operations | `docs/agent-authoring/plan-manifest.md` | Multi-operation transaction envelope |
| Commands | `docs/agent-authoring/command-reference.md` | CLI and apply-plan operation parameters |
| Validation | `docs/agent-authoring/validation-rules.md` | Error/warning codes and handoff gates |
| Workflow | `docs/agent-authoring/workflow.md` | Recommended agent sequence |
| Integration | this file | Cross-cutting rules and extension requirements |

## 3. Source Of Truth

| File/Artifact | Owner | Agent Access | Editor Access |
| --- | --- | --- | --- |
| `script.json` | Author data | Read/write through authoring API or CLI | Read/write through editor stores |
| `project.json` | Project shell metadata | Read, limited write only through supported commands | Read/write through project settings |
| `assets/` | Project asset library | Read through `list-assets`; future writes through asset commands | Read/write through asset manager |
| `player-data/profile.json` | Persistent player progress | Inspect/reset through explicit commands only | Runtime/editor profile tools |
| `saves/` | Save slots | Usually read-only for agents | Runtime save/load |
| `agent-handoff.json` | Review artifact | Written by `handoff-report` | Read by editor Project Settings |

Agents must not invent hidden state outside these artifacts.

## 4. Required Agent Workflow

The standard workflow is:

```text
inspect -> validate -> plan -> validate-only -> dry-run -> apply with checkpoint -> author-check -> preview -> handoff
```

Recommended commands:

```bash
npm run vn:inspect -- --json
npm run validate:project -- --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
npm run vn:author-check -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
npm run vn:handoff-report -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-editor-handoff --json
```

Agents may use direct single commands for tiny edits, but meaningful edits should still produce validation and handoff output.

## 5. Operation Contract

Plan operations have this canonical shape:

```json
{
  "id": "short-stable-operation-id",
  "command": "add-page",
  "params": {
    "scene": "start",
    "type": "normal"
  },
  "provenance": {
    "sourceRef": "outline.scene_1.beat_2"
  }
}
```

Rules:

- `command` is required.
- `params` is preferred over `args`.
- `id` is optional but strongly recommended.
- `provenance` must never affect execution.
- Operations run in order against one in-memory session.
- The script is written once after final validation unless `--allow-invalid` is explicitly used.
- Unsupported commands must return `unsupported-apply-plan-command`.
- Missing parameters must return `missing-apply-plan-param`.

## 6. Transaction Result Contract

Successful write results must include:

```json
{
  "transaction": {
    "status": "written",
    "wrote": true,
    "scriptPath": "public/game/script.json",
    "operationCount": 3,
    "rollback": {
      "command": "restore-checkpoint",
      "checkpointPath": "public/game/.checkpoints/script.timestamp.json",
      "scriptPath": "public/game/script.json"
    }
  },
  "operations": [
    {
      "index": 0,
      "id": "add-start",
      "command": "add-scene",
      "status": "applied",
      "changedPaths": ["scenes.start"]
    }
  ],
  "changeSummary": {
    "changedPaths": ["scenes.start"],
    "changedPathCount": 1,
    "writeStatus": "written"
  },
  "validation": {
    "ok": true,
    "errors": [],
    "warnings": []
  }
}
```

Failure results must include:

- `transaction.status: "failed"`;
- `transaction.wrote: false`;
- `operationFailure`;
- stable `operationFailure.code`;
- `operationFailure.suggestedAction.repairHint` when possible.

## 7. Diagnostics Contract

Diagnostics use this shape:

```json
{
  "severity": "error",
  "code": "missing-scene-target",
  "message": "Scene target \"good_end\" does not exist.",
  "path": ["scenes", "start", "pages", 2, "options", 0, "target"],
  "pathString": "scenes.start.pages.2.options.0.target",
  "target": "good_end"
}
```

Rules:

- `severity` is `error` or `warning`.
- `code` is stable and machine-readable.
- `pathString` must be suitable for editor navigation or grouping.
- Add structured fields such as `target`, `assetPath`, `variableId`, or `sceneId` when useful.
- Do not require agents to parse prose messages.

## 8. Preview Target Contract

Preview targets let the editor and agents know what should be visually reviewed.

```json
{
  "kind": "scene-page",
  "sceneId": "start",
  "pageIndex": 0,
  "pathString": "scenes.start.pages.0",
  "reason": "changed-page"
}
```

Supported kinds:

- `scene-page`
- `screen-ui`
- `gallery`
- `ending-list`
- `branch-graph`

For `screen-ui`:

```json
{
  "kind": "screen-ui",
  "screenId": "gameMenu",
  "pathString": "ui.gameMenu",
  "reason": "changed-screen-layout"
}
```

New systems that affect visuals must add preview targets.

## 9. Handoff Contract

`agent-handoff.json` is the bridge back to the human editor.

It must include:

- `kind: "agent-authoring-handoff"`;
- `projectId`;
- validation/readiness gates;
- transaction summary when available;
- changed paths;
- preview targets;
- review items;
- checkpoint/rollback information when available.

Review items must include:

```json
{
  "category": "validation",
  "severity": "warning",
  "code": "unreachable-scene",
  "pathString": "scenes.route_unused",
  "summary": "Scene route_unused is unreachable.",
  "suggestedAction": {
    "summary": "Connect this scene from a choice/next link or delete it."
  }
}
```

Editor local review state may track acknowledged/resolved status, but gameplay truth must not depend on it.

## 10. Conflict And Reload Contract

When the editor saves and detects that `script.json` changed on disk, it must refuse stale writes.

Conflict shape:

```json
{
  "success": false,
  "conflict": true,
  "scriptFileState": {
    "path": "D:/Project/script.json",
    "mtimeMs": 123,
    "size": 456
  },
  "expectedScriptFileState": {
    "path": "D:/Project/script.json",
    "mtimeMs": 100,
    "size": 400
  }
}
```

Rules:

- The editor should show reload guidance.
- Agents should not edit while the user is actively editing without telling the user to reload.
- Future merge tooling must consume the same file-state information.

## 11. Extension Rules For New Systems

Every new feature must answer this checklist before implementation:

1. What is the canonical `script.json` or profile shape?
2. What shared normalizer owns it?
3. What runtime behavior or fallback exists?
4. What authoring API method creates/updates/deletes it?
5. What CLI/apply-plan command exposes it?
6. What validation codes cover bad references and bad types?
7. What changed paths are emitted?
8. What preview targets are required?
9. What handoff review items are required?
10. What editor navigation target handles its path?
11. What tests prove GUI and agent output converge?

If any answer is "none", document why.

## 12. Implemented System Extensions

### Variables And Affection

Paths:

- `systems.variables.<variableId>`
- `scenes.<sceneId>.pages.<pageIndex>.conditions.<conditionIndex>`
- `scenes.<sceneId>.pages.<pageIndex>.options.<optionIndex>.effects.<effectIndex>`

Required commands:

- `add-variable`
- `update-variable`
- `rename-variable`
- `delete-variable`
- `add-affection-variable`
- `set-condition-page`
- `add-choice-effect`
- `set-choice-effect`
- `remove-choice-effect`

Required diagnostics:

- `invalid-variable-registry`
- `invalid-variable-id`
- `duplicate-variable-id`
- `invalid-variable-entry`
- `unregistered-variable-effect`
- `unregistered-condition-variable`
- `variable-type-mismatch`
- `affection-character-missing`
- `condition-missing-targets`

### Endings

Paths:

- `systems.endings.<endingId>`
- `scenes.<sceneId>.pages.<pageIndex>.effects.<effectIndex>` for terminal normal-page `unlock:ending` effects
- `player-data/profile.json.unlocks.endings.<endingId>`

Required commands:

- `add-ending`
- `update-ending`
- `remove-ending`
- `add-ending-unlock`
- `list-endings`

Required diagnostics:

- `invalid-ending-registry`
- `invalid-ending-id`
- `duplicate-ending-id`
- `invalid-ending-entry`
- `unregistered-ending-unlock`
- `ending-never-unlocked`
- `no-reachable-ending`
- `missing-ending-thumbnail`
- `unsupported-page-enter-effect`

### CG Gallery

Paths:

- `systems.gallery.cg.<cgId>`
- `player-data/profile.json.unlocks.cg.<cgId>`

Required commands:

- `add-cg`
- `update-cg`
- `remove-cg`
- `add-cg-unlock`
- `list-cg`

Required diagnostics:

- `invalid-cg-registry`
- `invalid-cg-id`
- `duplicate-cg-id`
- `invalid-cg-entry`
- `unregistered-cg-unlock`
- `cg-never-unlocked`
- `missing-cg-image`
- `missing-cg-thumbnail`

### Branch Graph And Asset Analysis

M4 is implemented end to end. `analysis.sceneGraph` is a review/navigation target rather than canonical author data; it is derived from scenes and effects each time a report is requested. Reports and export readiness expose repair-ready missing-target edges and unlock reachability; handoff review items carry repair guidance; Story Systems routes route, unlock, and asset findings back to exact authoring locations.

Paths:

- `analysis.sceneGraph`
- `analysis.assetGraph`
- diagnostics still point to canonical project paths.

Required commands:

- `graph-report`
- `find-dead-ends`
- `find-unused-assets`
- `find-missing-assets`
- `repair-scene-target`
- `clear-scene-references`

Required diagnostics:

- `unreachable-scene`
- `dead-end-scene`
- `cycle-without-exit`
- `condition-always-false`
- `condition-always-true`
- `duplicate-condition-comparison`
- `condition-identical-targets`
- `ending-unlock-unreachable`
- `cg-unlock-unreachable`
- `unused-asset`
- `missing-asset-reference`

### Transition Catalog

M5 is implemented as a shared, discoverable catalog over the existing cinematic fields. The complete background candidate set, character motion set, and camera set are runtime/editor-supported: this includes zoom/flash/iris/crossfade-pan backgrounds, `pop`/`scale-in`/`blur-in` character motion, and `vignette`/`letterbox` camera overlays. For compatibility, character transition commands write the established `animation` field rather than introducing a second character staging field, and screen/camera polish remains in `camera.effect`. Unknown future background ids are preserved and safely fall back to `fade`; unknown character animations and camera effects are preserved but not played.

Paths:

- `scenes.<sceneId>.pages.<pageIndex>.transition`
- `scenes.<sceneId>.pages.<pageIndex>.characters.<characterIndex>.animation`
- `scenes.<sceneId>.pages.<pageIndex>.camera`

Required commands:

- `list-transitions`
- `set-page-transition`
- `set-page-transitions`
- `set-character-transition`
- `set-camera-effect`

Required diagnostics:

- `unknown-transition-type`
- `unknown-camera-effect`
- `unknown-character-animation`
- `unsupported-transition-target`
- `invalid-transition-param`

## 13. Non-Negotiable Constraints

- Agents do not click the GUI as the primary integration path.
- Agents do not write raw HTML/CSS/JS into project data.
- Agents do not bypass validation for handoff-ready work.
- Editor-only data does not become canonical author data.
- Runtime-only hacks do not become project contract.
- Profile progress is not stored in save slots.
- Asset paths do not escape the project asset root.
- New commands must be documented and tested.
- Superseded plans must be archived, not left beside active guidance as if still current.
