# Agent Command Reference

This reference documents the deterministic `apply-plan` commands external agents can use inside a plan manifest. For the manifest envelope, transaction behavior, failure payloads, and checkpoints, see [plan-manifest.md](./plan-manifest.md).

Use `params` in new plans. The parser also accepts `args`. Aliases are listed where they are commonly useful.

## Planning Pattern

```json
{
  "version": 1,
  "operations": [
    {
      "id": "add-opening-page",
      "command": "add-page",
      "params": {
        "scene": "start",
        "type": "normal",
        "background": "backgrounds/classroom.svg",
        "dialogues": [{ "speaker": null, "text": "The morning bell rang." }]
      }
    }
  ]
}
```

Run the plan through the normal gate:

```bash
npm run vn:apply-plan -- plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

## Scene Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `add-scene` | `id` | `name`, `next` | Creates an empty scene. Aliases: `sceneId`, `scene` for `id`. |
| `rename-scene` | `sceneId`, `newSceneId` | `name` | Updates scene references in `next`, choice targets, and condition targets. Aliases: `scene`, `id`; `newId`, `new-id`, `to`. |
| `delete-scene` | `sceneId` | `forceReferences` | Refuses to delete referenced scenes unless forced. Aliases: `scene`, `id`, `force-references`. |
| `set-scene-next` | `sceneId` | `next` | Set `next` to `null` by omitting it or passing `null`. Aliases: `scene`, `id`. |
| `retarget-scene` | `fromSceneId`, `toSceneId` | | Retargets all references from one scene to another. Aliases: `from`, `scene`; `to`, `target`. |
| `clear-scene-references` | `sceneId` | | Clears references to a scene, making those jumps terminal/unset. Aliases: `scene`, `id`. |

## Character And Variable Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `add-character` | `id` | `name`, `color`, `expressions` | `expressions` is an object map like `{ "normal": "characters/sakura.svg" }`. Aliases: `characterId`, `character`. |
| `add-variable` | `id` | `type`, `initialValue`, `label` | `type` defaults to `number`; `initialValue` defaults to `0`. Aliases: `variableId`, `variable`, `initial`. |

## Page Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `add-page` | `sceneId` | `type`, `id`, `page`, `background`, `characters`, `bgm`, `se`, `transition`, `dialogues`, `prompt`, `options`, `conditionMode`, `conditions`, `trueTarget`, `falseTarget` | `type` defaults to `normal`. Use `page` for a full page object. Aliases: `scene`, `condition-mode`, `true-target`, `false-target`. |
| `remove-page` | `sceneId`, `pageIndex` | | Aliases: `scene`, `page`. |
| `move-page` | `sceneId`, `fromIndex`, `toIndex` | | Aliases: `scene`, `from`, `to`. |

## Dialogue Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `add-dialogue` | `sceneId`, `pageIndex` | `dialogue`, `speaker`, `text`, `expression`, `voice` | `dialogue` can provide the full object; shortcut fields merge over it. Aliases: `scene`, `page`. |
| `set-dialogue` | `sceneId`, `pageIndex`, `dialogueIndex` | `dialogue`, `speaker`, `text`, `expression`, `voice` | Aliases: `scene`, `page`, `dialogue`. |
| `remove-dialogue` | `sceneId`, `pageIndex`, `dialogueIndex` | | Aliases: `scene`, `page`, `dialogue`. |
| `move-dialogue` | `sceneId`, `pageIndex`, `fromIndex`, `toIndex` | | Aliases: `scene`, `page`, `from`, `to`. |

## Choice Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `set-choice-page` | `sceneId`, `pageIndex` | `prompt`, `options` | Converts or updates a choice page. Aliases: `scene`, `page`. |
| `add-choice-option` | `sceneId`, `pageIndex` | `option`, `text`, `target`, `effects` | `option` can provide the full object. Aliases: `scene`, `page`. |
| `set-choice-option` | `sceneId`, `pageIndex`, `optionIndex` | `option`, `text`, `target`, `clearTarget`, `effects` | Aliases: `scene`, `page`, `option`, `clear-target`. |
| `remove-choice-option` | `sceneId`, `pageIndex`, `optionIndex` | | Aliases: `scene`, `page`, `option`. |
| `move-choice-option` | `sceneId`, `pageIndex`, `fromIndex`, `toIndex` | | Aliases: `scene`, `page`, `from`, `to`. |
| `add-choice-effect` | `sceneId`, `pageIndex`, `optionIndex` | `effect`, `effectType`, `effectId`, `value` | Defaults to a `var:add` effect when `effect` is omitted. Aliases: `scene`, `page`, `option`, `effect-type`, `effect-id`, `variable`. |

## Condition Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `set-condition-page` | `sceneId`, `pageIndex` | `conditionMode`, `conditions`, `trueTarget`, `falseTarget`, `clearTrueTarget`, `clearFalseTarget` | `conditionMode` defaults to `all`. Aliases: `scene`, `page`, `condition-mode`, `true-target`, `false-target`, `clear-true-target`, `clear-false-target`. |

## Media And Staging Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `set-page-background` | `sceneId`, `pageIndex` | `background` | Clears the background when `background` is omitted. Aliases: `scene`, `page`. |
| `set-page-characters` | `sceneId`, `pageIndex` | `characters` | Replaces staged characters for the page. Aliases: `scene`, `page`. |
| `set-page-audio` | `sceneId`, `pageIndex` | `bgm`, `se` | Replaces page audio fields where provided. Aliases: `scene`, `page`. |
| `set-page-media` | `sceneId`, `pageIndex` | `background`, `bgm`, `se` | Sets background and audio together. Aliases: `scene`, `page`. |
| `set-page-camera` | `sceneId`, `pageIndex` | `camera`, `clearCamera` | Aliases: `scene`, `page`, `clear-camera`. |
| `set-page-transition` | `sceneId`, `pageIndex` | `transition`, `clearTransition` | Aliases: `scene`, `page`, `clear-transition`. |
| `set-character-animation` | `sceneId`, `pageIndex`, `characterId` | `animation` | `animation` defaults to `none`. Aliases: `scene`, `page`, `character`. |

## Repair Hints

When an operation fails before validation, `apply-plan --json` includes `operationFailure.suggestedAction.repairHint`. Common actions are:

| Action | Meaning |
| --- | --- |
| `add-command` | Add a missing `operations[n].command`. |
| `replace-command` | Replace an unsupported command with supported commands. |
| `add-param` | Add the required param or one of its aliases. |

Patch the manifest, rerun `--validate-only`, then rerun `--dry-run` before writing.
