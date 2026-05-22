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

## Read-Only Project Commands

These commands are not plan operations. Use them to inspect the project before drafting or applying changes.

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `list-assets` | | `project`, `script`, `json` | Lists files under `assets/backgrounds`, `assets/characters`, `assets/audio`, `assets/voices`, `assets/ui`, and `assets/fonts`. Each entry includes `path`, `name`, `tokens`, `extension`, and `size`. `--script` derives the project path from the script parent folder. |

```bash
npm run vn -- list-assets --script public/game/script.json --json
npm run vn -- list-assets --project "D:/VNProjects/MyStory" --json
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

## Title Screen Commands

These commands edit `ui.titleScreen` using the same structured config used by the editor title designer. They are safe for `apply-plan`; do not use raw HTML/CSS.

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `set-title-screen` | | `background`, `bgm`, `elements`, `config`, `merge`, `clearBackground`, `clearBgm` | Updates title screen background, BGM, or full element list. `merge` defaults to `true`; pass `false` to replace the section. Aliases: `clear-background`, `clear-bgm`. |
| `add-title-element` | `type` | `id`, `content`, `text`, `label`, `action`, `src`, `x`, `y`, `anchor`, `width`, `height`, `fontSize`, `fontFamily`, `color`, `backgroundColor`, `border`, `borderRadius`, `hoverColor`, `letterSpacing`, `textShadow`, `element` | Adds a `text`, `button`, or `image` element. `label` normalizes to button `text`; button action `load` normalizes to `continue`. |
| `update-title-element` | `elementId` or `index` | `patch`, plus the same element fields accepted by `add-title-element` | Updates one existing element by id or index. Aliases: `id`, `element-id`, `element-index`. |
| `remove-title-element` | `elementId` or `index` | | Removes one title element by id or index. Aliases: `id`, `element-id`, `element-index`. |

Direct CLI examples:

```bash
npm run vn -- set-title-screen --script public/game/script.json --background ui/title/background.png --bgm audio/title.ogg --force --checkpoint --json
npm run vn -- add-title-element --script public/game/script.json --type text --content "Moonlit Letter" --x 640 --y 170 --anchor center --force --json
npm run vn -- add-title-element --script public/game/script.json --type button --label "Start" --action start --x 640 --y 430 --anchor center --force --json
```

Plan manifest example:

```json
{
  "version": 1,
  "operations": [
    {
      "id": "title-base",
      "command": "set-title-screen",
      "params": { "background": "ui/title/background.png", "bgm": "audio/title.ogg", "merge": false }
    },
    {
      "id": "title-logo",
      "command": "add-title-element",
      "params": { "type": "text", "content": "Moonlit Letter", "x": 640, "y": 170, "anchor": "center" }
    }
  ]
}
```

## Screen Layout Commands

These commands edit existing editor-owned screen layout sections. They are safe for `apply-plan` and intentionally exclude `titleScreen`, which uses the title-specific commands above.

Supported screen ids:

- `settingsScreen`
- `gameMenu`
- `saveLoadScreen`
- `backlogScreen`

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `set-screen-layout` | `screenId`, `config` | `merge` | Sets structured config for one supported screen. `merge` defaults to `true`; pass `false` to replace the section. Aliases: `screen`. |

Direct CLI examples:

```bash
npm run vn -- set-screen-layout --script public/game/script.json --screen gameMenu --config .tmp/game-menu-layout.json --force --checkpoint --json
npm run vn -- set-screen-layout --script public/game/script.json --screen settingsScreen --config-json "{\"header\":{\"title\":{\"text\":\"Settings\"}}}" --force --json
```

Plan manifest example:

```json
{
  "version": 1,
  "operations": [
    {
      "id": "settings-layout",
      "command": "set-screen-layout",
      "params": {
        "screen": "settingsScreen",
        "merge": false,
        "config": {
          "header": { "title": { "text": "Settings" } },
          "tabBar": { "tabs": [{ "label": "Audio", "settingKeys": ["master-volume"] }] }
        }
      }
    }
  ]
}
```

`author-check --transaction` turns changed `ui.titleScreen`, `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, and `ui.backlogScreen` paths into screen preview targets. `handoff-report` also includes `previewTargets` for changed screen UI paths. If the plan includes `handoff.referenceScreenshotNotes`, `handoff-report --transaction` turns those notes into `reference-screenshot-fidelity` review items.

## Shared UI Commands

These commands edit shared editor-owned UI sections as structured JSON objects. They do not accept arbitrary HTML/CSS. `merge` defaults to `true`; pass `false` in apply-plan or `--replace` in direct CLI to replace the whole section.

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `set-dialogue-box` | `config` | `merge` | Sets `ui.dialogueBox`, including dialogue frame and nameplate style config. |
| `set-theme` | `config` | `merge` | Sets `ui.theme`, including tokens, icons, cursors, nine-slice, and button families. |
| `set-widget-styles` | `config` | `merge` | Sets `ui.widgetStyles`, including reusable widget visual config. |

Direct CLI examples:

```bash
npm run vn -- set-dialogue-box --script public/game/script.json --config .tmp/dialogue-box.json --force --checkpoint --json
npm run vn -- set-theme --script public/game/script.json --config-json "{\"tokens\":{\"accent\":\"#88ccff\"}}" --force --json
npm run vn -- set-widget-styles --script public/game/script.json --config .tmp/widget-styles.json --replace --force --json
```

Plan manifest example:

```json
{
  "version": 1,
  "operations": [
    {
      "id": "dialogue-frame",
      "command": "set-dialogue-box",
      "params": {
        "config": {
          "nameplateStyle": { "backgroundImage": "ui/dialogue/nameplate.png" }
        }
      }
    },
    {
      "id": "shared-theme-icons",
      "command": "set-theme",
      "params": {
        "config": {
          "icons": { "close": "ui/icons/close.png" }
        }
      }
    }
  ]
}
```

## Repair Hints

When an operation fails before validation, `apply-plan --json` includes `operationFailure.suggestedAction.repairHint`. Common actions are:

| Action | Meaning |
| --- | --- |
| `add-command` | Add a missing `operations[n].command`. |
| `replace-command` | Replace an unsupported command with supported commands. |
| `add-param` | Add the required param or one of its aliases. |

Patch the manifest, rerun `--validate-only`, then rerun `--dry-run` before writing.
