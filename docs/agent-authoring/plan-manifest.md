# Agent Plan Manifest

External agents can batch related authoring edits into a single JSON manifest and apply it with `vn-author apply-plan`. For a command-by-command parameter reference, see [command-reference.md](./command-reference.md).

```bash
npm run vn:apply-plan -- plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

See `docs/agent-authoring/example-plan.json` for an executable multi-ending route covering affection, ending unlocks, a CG unlock, condition routing, and transitions. Follow it with `docs/agent-authoring/human-review-tutorial.md` for no-code editor review. If you start from a structured draft, follow `docs/agent-authoring/structured-draft-contract.md` and generate a plan first:

```bash
npm run vn:draft-plan -- docs/agent-authoring/example-draft.json --out .tmp/example-draft-plan.json --json
```

## Shape

```json
{
  "version": 1,
  "title": "Chapter 1 branch polish",
  "operations": [
    {
      "id": "add-route-scene",
      "command": "add-scene",
      "params": {
        "id": "chapter_1_route_a",
        "name": "Chapter 1 Route A"
      }
    }
  ]
}
```

`operations` is required and must be a non-empty array. Operations run in order against one in-memory session. The script is written once after all operations pass authoring API checks and final validation.

`id` is optional but recommended. It is echoed in JSON output so agents can connect operation results back to their own plan steps.

`provenance` is optional and ignored by the executor. `draft-plan` uses it to record where generated operations came from, such as source scene ids, beat ids, indexes, or prose spans.

`params` and `args` are accepted as aliases. Prefer `params` in new manifests.

`handoff.referenceScreenshotNotes` is optional. Use it when a screen UI operation is based on a reference screenshot and the human reviewer should compare the editor preview against that image. These notes are preserved in `apply-plan --result-out` and become handoff review items when `handoff-report --transaction` reads the result. They do not write HTML/CSS or mutate the project contract.

```json
{
  "version": 1,
  "handoff": {
    "referenceScreenshotNotes": [
      {
        "screenId": "gameMenu",
        "reference": "references/game-menu.png",
        "summary": "Matched the left-side menu column using editable layout config.",
        "matched": ["menu alignment", "cool translucent panel"],
        "gaps": ["exact glow intensity needs human preview"]
      }
    ]
  },
  "operations": [
    {
      "command": "set-screen-layout",
      "params": {
        "screenId": "gameMenu",
        "config": { "panel": { "width": 360 } }
      }
    }
  ]
}
```

Supported `screenId` values for fidelity notes are `titleScreen`, `settingsScreen`, `gameMenu`, `saveLoadScreen`, and `backlogScreen`.

## Supported Commands

Plan command names match the CLI command names:

- `add-character`
- `add-variable`
- `update-variable`
- `rename-variable`
- `delete-variable`
- `add-affection-variable`
- `add-scene`
- `rename-scene`
- `delete-scene`
- `set-scene-next`
- `retarget-scene`
- `repair-scene-target`
- `clear-scene-references`
- `add-page`
- `remove-page`
- `move-page`
- `add-dialogue`
- `set-dialogue`
- `remove-dialogue`
- `move-dialogue`
- `set-choice-page`
- `add-choice-option`
- `set-choice-option`
- `remove-choice-option`
- `move-choice-option`
- `add-choice-effect`
- `set-choice-effect`
- `remove-choice-effect`
- `set-condition-page`
- `set-page-background`
- `set-page-media`
- `set-page-characters`
- `set-page-audio`
- `set-page-camera`
- `set-camera-effect`
- `set-page-transition`
- `set-page-transitions`
- `set-character-animation`
- `set-character-transition`
- `set-title-screen`
- `add-title-element`
- `update-title-element`
- `remove-title-element`
- `set-screen-layout`
- `set-dialogue-box`
- `set-theme`
- `set-widget-styles`

## Parameter Style

Use JSON-native names where possible:

```json
{
  "command": "set-dialogue",
  "params": {
    "scene": "start",
    "page": 0,
    "dialogue": 1,
    "text": "I changed my mind."
  }
}
```

The manifest parser also accepts common API names such as `sceneId`, `pageIndex`, `dialogueIndex`, `optionIndex`, `fromIndex`, and `toIndex`.

For structured payloads, pass the object or array directly:

```json
{
  "command": "set-page-media",
  "params": {
    "scene": "start",
    "page": 0,
    "background": "backgrounds/classroom.svg",
    "bgm": { "file": "audio/theme.ogg", "volume": 0.6 },
    "se": null
  }
}
```

## Safety

Run `--dry-run --json` before writing. Dry-run output includes:

- `transaction.status: "planned"`
- `operations[]` with per-step results
- aggregate `changeSummary.changedPaths`
- count deltas for characters, scenes, pages, and variables
- final validation status

When writing, use `--checkpoint` for multi-step edits:

```bash
npm run vn:apply-plan -- plan.json --script public/game/script.json --force --checkpoint --json
```

Use `--validate-only` to execute the plan in memory, run final project validation, and save a machine-readable validation artifact without writing or checkpointing the script. Unlike `--dry-run`, validate-only returns `transaction.status: "validated"` for valid plans and `"invalid"` for plans that would fail project validation.

Use `--result-out` to save the transaction result for `author-check --transaction` and `handoff-report --transaction`.

If validation fails, `apply-plan` returns non-zero and does not write unless `--allow-invalid` is present. Use `--allow-invalid` only for deliberate intermediate states that a follow-up plan will immediately repair.

If an operation cannot be executed, for example because the command is unsupported or required parameters are missing, `apply-plan --json` returns a structured failure without writing the script:

```json
{
  "transaction": { "status": "failed", "wrote": false },
  "operationFailure": {
    "index": 1,
    "id": "bad-op",
    "command": "paint-scene",
    "code": "unsupported-apply-plan-command",
    "message": "Unsupported apply-plan command: paint-scene",
    "supportedCommands": ["add-scene", "add-page", "set-dialogue"],
    "suggestedAction": {
      "summary": "Replace this operation with one or more supported apply-plan commands.",
      "commands": [],
      "repairHint": {
        "action": "replace-command",
        "path": "operations[1].command",
        "unsupportedCommand": "paint-scene",
        "supportedCommands": ["add-scene", "add-page", "set-dialogue"]
      }
    }
  },
  "operations": [
    { "index": 0, "id": "create-start", "command": "add-scene", "status": "applied" },
    { "index": 1, "id": "bad-op", "command": "paint-scene", "status": "failed" }
  ],
  "changeSummary": {
    "writeStatus": "failed",
    "completedOperationCount": 1,
    "failedOperationIndex": 1
  }
}
```

For missing parameters, `operationFailure.code` is `"missing-apply-plan-param"` and includes `missingParam` plus any accepted aliases in `acceptedParams`, for example `["sceneId", "scene"]`. The `suggestedAction.repairHint` object is machine-readable so an external agent can patch the manifest and retry. Common `repairHint.action` values are `"add-command"`, `"replace-command"`, and `"add-param"`.

When using `--result-out`, the same failure payload is saved for later handoff/debugging.

When a checkpoint is created, output includes:

```json
{
  "transaction": {
    "rollback": {
      "command": "restore-checkpoint",
      "checkpointPath": "public/game/.checkpoints/script.2026-05-19T10-00-00-000Z.json",
      "scriptPath": "public/game/script.json"
    }
  }
}
```

Restore it with:

```bash
npm run vn:restore-checkpoint -- public/game/.checkpoints/script.2026-05-19T10-00-00-000Z.json --script public/game/script.json --force --backup --json
```
