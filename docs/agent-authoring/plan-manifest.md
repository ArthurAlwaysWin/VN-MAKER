# Agent Plan Manifest

External agents can batch related authoring edits into a single JSON manifest and apply it with `vn-author apply-plan`.

```bash
npm run vn:apply-plan -- plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

See `docs/agent-authoring/example-plan.json` for a complete small visual novel branch plan.

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

`params` and `args` are accepted as aliases. Prefer `params` in new manifests.

## Supported Commands

Plan command names match the CLI command names:

- `add-character`
- `add-variable`
- `add-scene`
- `rename-scene`
- `delete-scene`
- `set-scene-next`
- `retarget-scene`
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
- `set-condition-page`
- `set-page-background`
- `set-page-media`
- `set-page-characters`
- `set-page-audio`
- `set-page-camera`
- `set-page-transition`
- `set-character-animation`
- `add-choice-effect`

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

Use `--result-out` to save the transaction result for `handoff-report --transaction`.

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
    "supportedCommands": ["add-scene", "add-page", "set-dialogue"]
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
