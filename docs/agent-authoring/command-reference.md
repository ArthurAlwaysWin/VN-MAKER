# Agent Command Reference

This reference documents the deterministic `apply-plan` commands external agents can use inside a plan manifest. For the manifest envelope, transaction behavior, failure payloads, and checkpoints, see [plan-manifest.md](./plan-manifest.md). For the cross-cutting integration rules that every command must follow, see [integration-contract.md](./integration-contract.md).

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
npm run vn:apply-plan -- .tmp/agent-dsl-plan.json --script public/game/script.json --source-map .tmp/agent-dsl-source-map.json --source-map-out .tmp/agent-dsl-source-map.applied.json --dry-run --json
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --json
```

## Workflow Gate Commands

These commands run outside an apply-plan manifest:

| Command | Purpose | Strict options |
| --- | --- | --- |
| `review-handoff` | Runs `author-check` and `handoff-report` as one continuous gate, optionally writes the combined result with `--review-out`, and supports `--write-editor-handoff`. | `--capture-preview` captures screenshots; `--require-preview-screenshot` requires captured preview targets to pass quality checks. Pass `--source-map .tmp/agent-dsl-source-map.applied.json` to include Agent DSL provenance and stale generated-region warnings in author-check and handoff output. |
| `draft-plan` | Converts a structured prose-derived draft into deterministic operations. | `--require-adaptation-preview` requires approved adaptation-preview metadata before conversion. |
| `dsl-plan` | Converts agent-facing DSL source or `project.gmdsl.json` into a deterministic apply-plan manifest. | Compile-time macros/includes/namespaces, P8.1 `mood` presets, P8.2 reusable sequences, and P8.3 route templates only; output must still pass `apply-plan --validate-only`. Pass `--source-map-out path` to also write the first P5 source map artifact. |
| `dsl-check` | Checks agent-facing DSL source or `project.gmdsl.json` without writing source, plan, source-map, or project files. | Parses, binds, analyzes, emits the plan in memory, and when `--script` is present applies the generated operations to an in-memory project session for validate-only reporting. |
| `dsl-diff` | Compares a P5 enriched Agent DSL source map against the current `script.json` without writing files. | Pass `--source-map` to select the enriched map; otherwise the command reads `.tmp/agent-dsl-source-map.applied.json`. Reports safe, changed/stale, missing, and untracked generated regions. |
| `dsl-build` | Runs the DSL compile pipeline and optional apply-plan gates without writing project data by default. | `--out`, `--source-map-out`, and `--check-out` write artifacts. `--validate-only` and `--dry-run` run in memory. Project writes require explicit `--write` or `--apply`; when `--source-map` is provided, stale generated regions block the write. |
| `dsl-format` | Formats one `.dsl` or `.gmdsl` source file with the deterministic Agent DSL formatter. | Check-only mode is the default and does not write. Pass `--write` to update the source file; manifest formatting is intentionally rejected until multi-file formatting semantics are defined. |
| `dsl-skeleton` | Creates starter Agent DSL source from an existing `script.json`. | Requires `--script` and `--out`; writes only the requested DSL file, creates no source map, and refuses to overwrite an existing output unless `--force` is passed. Pass `--report-out` to write the unsupported/lossy conversion report. Current P7 coverage includes declarations, scene shells, scene next routes, normal dialogue/media/staging/camera/particle pages, choices, option targets/effects, and flat condition pages. Unsupported/lossy data is reported in comments and JSON output. |
| `export-web` | Exports the current project as a static web game through the same export contract as the editor. | Requires `--out`; runs readiness first and blocks on blockers unless `--allow-readiness-blockers` is passed. |
| `export-desktop` | Exports the current project as a desktop game through the same export contract as the editor. | Requires `--out`; runs readiness first and blocks on blockers unless `--allow-readiness-blockers` is passed. |

`review-handoff` preserves the existing individual `author-check` and `handoff-report` commands for scripts that need separate artifacts. `author-check --source-map` is optional P9 metadata: it reads an enriched Agent DSL source map, adds source file/line/mapping ids to focused preview targets, carries the same metadata into written preview plans, and reports source-map staleness in JSON output. `handoff-report --source-map` adds `agent-dsl` review items for generated changes, annotates handoff preview targets, and reports stale/missing/untracked generated regions without writing DSL data into `script.json`.

```bash
npm run vn -- dsl-plan agent-src/project.gmdsl.json --out .tmp/plan.json --json
npm run vn -- dsl-plan agent-src/project.gmdsl.json --out .tmp/plan.json --source-map-out .tmp/agent-dsl-source-map.json --json
npm run vn -- dsl-check agent-src/project.gmdsl.json --script public/game/script.json --json
npm run vn -- dsl-diff agent-src/project.gmdsl.json --script public/game/script.json --source-map .tmp/agent-dsl-source-map.applied.json --json
npm run vn -- dsl-build agent-src/project.gmdsl.json --script public/game/script.json --out .tmp/plan.json --source-map-out .tmp/agent-dsl-source-map.json --validate-only --json
npm run vn -- dsl-format agent-src/main.gmdsl --write --json
npm run vn -- dsl-skeleton --script public/game/script.json --out agent-src/main.gmdsl --report-out .tmp/agent-dsl-skeleton-report.json --json
npm run vn -- apply-plan .tmp/plan.json --script public/game/script.json --source-map .tmp/agent-dsl-source-map.json --source-map-out .tmp/agent-dsl-source-map.applied.json --dry-run --json
npm run vn -- author-check --script public/game/script.json --transaction .tmp/apply-plan-result.json --source-map .tmp/agent-dsl-source-map.applied.json --write-preview-plan --json
npm run vn -- handoff-report --script public/game/script.json --transaction .tmp/apply-plan-result.json --source-map .tmp/agent-dsl-source-map.applied.json --write-editor-handoff --json
```

P8.1 mood preset example:

```text
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
  camera shake low 450

scene start "Start":
  preset mood rainy_school
  say "Rain tapped against the glass."
```

`dsl-plan` expands the preset before emitting the plan, so `apply-plan` receives ordinary `add-page` data and `script.json` remains the canonical editable project contract.

P8.2 sequence example:

```text
sequence dramatic_entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450

scene start "Start":
  sequence dramatic_entrance("sakura", "smile")
```

`dsl-plan` expands the sequence before emitting the plan. Scene-body sequences become ordinary page data; option-body sequences can become ordinary choice effects.

P8.3 route template example:

```text
character sakura "Sakura"

route sakura:
  affection variable sakura_affection
  good_end sakura_good
  normal_end sakura_normal
```

`dsl-plan` lowers the route to ordinary `add-affection-variable`, `add-ending`, `add-scene`, and `add-page` operations.

## Read-Only Project Commands

These commands are not plan operations. Use them to inspect the project before drafting or applying changes.

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `list-assets` | | `project`, `script`, `json` | Lists files under `assets/backgrounds`, `assets/characters`, `assets/audio`, `assets/voices`, `assets/ui`, `assets/fonts`, and `assets/effects`. Each entry includes `path`, `name`, `tokens`, `extension`, and `size`. `--script` derives the project path from the script parent folder. |
| `graph-report` | | `script`, `entry`, `mermaid`, `json` | Reports attributed scene edges, repair-ready missing targets, reachability, terminal/dead-end routes, closed cycles, unlock reachability, and Mermaid flowchart text. |
| `find-dead-ends` | | `script`, `entry`, `json` | Returns missing target edges, terminal routes without an ending resolution, and closed cycles without an exit. |
| `find-missing-assets` | | `script`, `asset-root`, `json` | Returns referenced assets absent from the checked asset root. |
| `find-unused-assets` | | `script`, `asset-root`, `json` | Returns files in the checked asset root that are not referenced by the script. |
| `list-transitions` | | `target`, `supported-only`, `json` | Lists shared cinematic catalog entries with target, parameter schema, support flags, defaults, and fallback id. `target` is `background`, `character`, or `camera`. |
| `list-particles` | | `json` | Lists built-in page particle/weather presets and numeric field ranges. |

```bash
npm run vn -- list-assets --script public/game/script.json --json
npm run vn -- list-assets --project "D:/VNProjects/MyStory" --json
npm run vn -- graph-report --script public/game/script.json --json
npm run vn -- graph-report --script public/game/script.json --mermaid
npm run vn -- find-dead-ends --script public/game/script.json --json
npm run vn -- find-missing-assets --script public/game/script.json --json
npm run vn -- find-unused-assets --script public/game/script.json --json
npm run vn -- list-transitions --target background --supported-only --json
npm run vn -- list-particles --json
```

## Scene Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `add-scene` | `id` | `name`, `next` | Creates an empty scene. Aliases: `sceneId`, `scene` for `id`. |
| `rename-scene` | `sceneId`, `newSceneId` | `name` | Updates scene references in `next`, choice targets, and condition targets. Aliases: `scene`, `id`; `newId`, `new-id`, `to`. |
| `delete-scene` | `sceneId` | `forceReferences` | Refuses to delete referenced scenes unless forced. Aliases: `scene`, `id`, `force-references`. |
| `set-scene-next` | `sceneId` | `next` | Set `next` to `null` by omitting it or passing `null`. Aliases: `scene`, `id`. |
| `retarget-scene` | `fromSceneId`, `toSceneId` | | Retargets all references from one scene to another. Aliases: `from`, `scene`; `to`, `target`. |
| `repair-scene-target` | `fromSceneId`, `toSceneId` | | Repair-oriented alias that retargets all references to a missing or obsolete scene target. Aliases: `from`, `scene`; `to`, `target`. |
| `clear-scene-references` | `sceneId` | | Clears references to a scene, making those jumps terminal/unset. Aliases: `scene`, `id`. |

## Character And Variable Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `add-character` | `id` | `name`, `color`, `expressions` | `expressions` is an object map like `{ "normal": "characters/sakura.svg" }`. Aliases: `characterId`, `character`. |
| `add-variable` | `id` | `type`, `initialValue`, `label`, `group`, `notes`, `kind`, `characterId`, `min`, `max`, `step` | `type` defaults to `number`; `initialValue` defaults to `0`. Aliases: `variableId`, `variable`, `initial`, `character`. |
| `update-variable` | `id` | `patch`, `type`, `initial`, `label`, `group`, `notes`, `kind`, `characterId`, `min`, `max`, `step` | Updates one registry entry through the shared variable normalizer. Aliases: `variableId`, `variable`, `character`. |
| `rename-variable` | `id`, `newVariableId` | | Rewrites choice effects and condition rows. Aliases: `variableId`, `variable`, `newId`, `new-id`, `to`. |
| `delete-variable` | `id` | `forceReferences` | Refuses to delete referenced variables unless forced; forced deletes remove variable effects and condition rows. Aliases: `variableId`, `variable`, `force-references`. |
| `add-affection-variable` | `characterId` | `id`, `initial`, `label`, `group`, `notes`, `min`, `max`, `step` | Creates a number variable preset linked to a character. Aliases: `character`, `variableId`, `variable`. |

## Ending Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `list-endings` | | | Lists normalized `systems.endings` entries sorted by `order`, then title. |
| `add-ending` | `id` | `title`, `category`, `order`, `description`, `thumbnail`, `hiddenUntilUnlocked` | Registers a new ending. Aliases: `endingId`, `ending`, `name`, `hidden-until-unlocked`. |
| `update-ending` | `id` | `patch`, `title`, `category`, `order`, `description`, `thumbnail`, `hiddenUntilUnlocked` | Updates one ending through the shared ending normalizer. Aliases: `endingId`, `ending`, `name`, `hidden-until-unlocked`. |
| `remove-ending` | `id` | `forceReferences` | Refuses to remove endings still referenced by `unlock:ending` effects unless forced; forced removes those effects. Aliases: `endingId`, `ending`, `force-references`. |
| `add-ending-unlock` | `sceneId`, `pageIndex`, `endingId` | `optionIndex` | Without `optionIndex`, adds a page-enter `{ "type": "unlock:ending" }` effect to a normal terminal page. With `optionIndex`, adds the existing choice option effect. Aliases: `scene`, `page`, `option`, `id`, `ending`. |

Changed ending registry paths use `systems.endings.<endingId>`. Unlock effects report an exact path such as `scenes.good_end.pages.0.effects.0` for terminal-page arrival or `scenes.start.pages.2.options.0.effects.0` for a choice.

## CG Gallery Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `list-cg` | | | Lists normalized `systems.gallery.cg` entries sorted by `order`, then title. |
| `add-cg` | `id` | `title`, `images`, `thumbnail`, `lockedThumbnail`, `category`, `order`, `description` | Registers a new gallery entry. `images` is a JSON array. Aliases: `cgId`, `cg`, `locked-thumbnail`. |
| `update-cg` | `id` | `patch`, `title`, `images`, `thumbnail`, `lockedThumbnail`, `category`, `order`, `description` | Updates one entry through the shared CG normalizer. Aliases: `cgId`, `cg`, `locked-thumbnail`. |
| `remove-cg` | `id` | `forceReferences` | Refuses to remove entries still referenced by `unlock:cg` effects unless forced; forced removes those effects. Aliases: `cgId`, `cg`, `force-references`. |
| `add-cg-unlock` | `sceneId`, `pageIndex`, `optionIndex`, `cgId` | | Adds `{ "type": "unlock:cg" }` to one choice option. Aliases: `scene`, `page`, `option`, `id`, `cg`. |

Changed CG registry paths use `systems.gallery.cg.<cgId>`. Unlock effects report their exact choice effect path.

## Page Commands

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `add-page` | `sceneId` | `type`, `id`, `page`, `background`, `characters`, `bgm`, `se`, `transition`, `dialogues`, `prompt`, `options`, `conditionMode`, `conditions`, `trueTarget`, `falseTarget` | `type` defaults to `normal`. Use `page` for a full page object, including terminal normal-page `effects`. Aliases: `scene`, `condition-mode`, `true-target`, `false-target`. |
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
| `set-choice-effect` | `sceneId`, `pageIndex`, `optionIndex`, `effectIndex` | `effect`, `effectType`, `effectId`, `value` | Replaces one choice effect through the shared effect DSL. Aliases: `scene`, `page`, `option`, `effect-index`, `effect`, `effect-type`, `effect-id`, `variable`. |
| `remove-choice-effect` | `sceneId`, `pageIndex`, `optionIndex`, `effectIndex` | | Removes one choice effect and reports the changed effect path. Aliases: `scene`, `page`, `option`, `effect-index`, `effect`. |

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
| `set-page-camera` | `sceneId`, `pageIndex` | `camera`, `effect`, `direction`, `intensity`, `durationMs`, `clearCamera` | Legacy-compatible camera setter. Aliases: `scene`, `page`, `duration-ms`, `clear-camera`. |
| `set-camera-effect` | `sceneId`, `pageIndex` | `effect`, `camera`, `direction`, `intensity`, `durationMs`, `clearCamera` | Catalog-oriented alias for `set-page-camera`; requires `effect`, `camera`, or `clearCamera`, and clamps duration to `0..2000` ms. Aliases: `scene`, `page`, `id`, `duration-ms`, `clear-camera`. |
| `set-page-transition` | `sceneId`, `pageIndex` | `transition`, `type`, `duration`, `clearTransition` | Aliases: `scene`, `page`, `clear-transition`. |
| `set-page-transitions` | `sceneId` | `transition`, `type`, `duration`, `clearTransition`, `fromPageIndex`, `toPageIndex`, `pageType`, `hasBackground`, `predicate` | Applies one transition to matching pages in a scene; range endpoints are inclusive. `predicate` is restricted to `pageType` and `hasBackground`, never executable code. Aliases: `scene`, `from-page`, `to-page`, `page-type`, `has-background`, `clear-transition`. |
| `set-page-particles` | `sceneId`, `pageIndex`, `preset` | `particles`, `density`, `speed`, `wind`, `opacity`, `color`, `direction` | Writes canonical `scenes.<sceneId>.pages.<pageIndex>.particles`. `particles`/`config` may provide a full object in apply-plan; CLI accepts `--particles` JSON. Aliases: `scene`, `page`. |
| `clear-page-particles` | `sceneId`, `pageIndex` | | Writes `particles: null` to stop the current same-scene particle state on this page. Aliases: `scene`, `page`. |
| `inherit-page-particles` | `sceneId`, `pageIndex` | | Deletes the page's own `particles` property so it inherits the previous same-scene particle state. Aliases: `scene`, `page`. |
| `set-character-animation` | `sceneId`, `pageIndex`, `characterId` | `animation` | `animation` defaults to `none`. Aliases: `scene`, `page`, `character`. |
| `set-character-transition` | `sceneId`, `pageIndex`, `characterId` | `transition` | Catalog-oriented compatibility alias for `set-character-animation`; writes canonical `animation`. Aliases: `scene`, `page`, `character`, `animation`, `id`. |

`set-page-transition` and `set-page-transitions` clamp background transition duration to `0..5000` ms. The background catalog includes fades, slides, directional wipes, zoom, flash, iris, crossfade-pan, CSS-only shape/curtain transitions such as `diamond`, `circle-open`, `blinds-h`, `fade-black`, `fade-white`, `glitch-lite`, and `pixelate-lite`, plus the procedural canvas-mask ids `noise-dissolve`, `ripple`, and `burn`; the character catalog includes `pop`, `scale-in`, and `blur-in`; camera effects include `vignette` and `letterbox`. All are exposed by the same shared catalog and editor controls. Use `list-transitions --supported-only` before writing effects; unknown future ids remain safe through runtime fallback or no-op behavior.

Changed page transition paths are routed to `author-check --transaction --write-preview-plan` scene-page targets and `transition-preview` review items so CSS and canvas-mask transitions can be visually reviewed before handoff.

Example bounded bulk operation:

```json
{
  "command": "set-page-transitions",
  "params": {
    "scene": "chapter_1",
    "fromPageIndex": 0,
    "toPageIndex": 8,
    "predicate": { "pageType": "normal", "hasBackground": true },
    "type": "wipe-right",
    "duration": 700
  }
}
```

## Title Screen Commands

These commands edit `ui.titleScreen` using the same structured config used by the editor title designer. They are safe for `apply-plan`; do not use raw HTML/CSS.

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `set-title-screen` | | `background`, `bgm`, `elements`, `config`, `merge`, `clearBackground`, `clearBgm` | Updates title screen background, BGM, or full element list. `merge` defaults to `true`; pass `false` to replace the section. Aliases: `clear-background`, `clear-bgm`. |
| `add-title-element` | `type` | `id`, `content`, `text`, `label`, `action`, `src`, `x`, `y`, `anchor`, `width`, `height`, `fontSize`, `fontFamily`, `color`, `backgroundColor`, `border`, `borderRadius`, `hoverColor`, `letterSpacing`, `textShadow`, `element` | Adds a `text`, `button`, or `image` element. `label` normalizes to button `text`; button action `load` normalizes to `continue`; `gallery` opens the CG gallery. |
| `update-title-element` | `elementId` or `index` | `patch`, plus the same element fields accepted by `add-title-element` | Updates one existing element by id or index. Aliases: `id`, `element-id`, `element-index`. |
| `remove-title-element` | `elementId` or `index` | | Removes one title element by id or index. Aliases: `id`, `element-id`, `element-index`. |

Direct CLI examples:

```bash
npm run vn -- set-title-screen --script public/game/script.json --background ui/title/background.png --bgm audio/title.ogg --force --checkpoint --json
npm run vn -- add-title-element --script public/game/script.json --type text --content "Moonlit Letter" --x 640 --y 170 --anchor center --force --json
npm run vn -- add-title-element --script public/game/script.json --type button --label "Start" --action start --x 640 --y 430 --anchor center --force --json
npm run vn -- add-title-element --script public/game/script.json --type button --label "Gallery" --action gallery --x 640 --y 500 --anchor center --force --json
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

`author-check --transaction` turns changed `ui.titleScreen`, `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, and `ui.backlogScreen` paths into screen preview targets. Changed `ui.motion` paths create preview targets for all major screens. Changed `systems.endings.*` paths become an `ending-list` preview target, changed `systems.gallery.cg.*` paths become a `gallery` preview target, and changed `scenes.*` paths also create a `branch-graph` target at `analysis.sceneGraph` for Story Systems review. `handoff-report` also includes these `previewTargets`. If the plan includes `handoff.referenceScreenshotNotes`, `handoff-report --transaction` turns those notes into `reference-screenshot-fidelity` review items.

## Shared UI Commands

These commands edit shared editor-owned UI sections as structured JSON objects. They do not accept arbitrary HTML/CSS. `merge` defaults to `true`; pass `false` in apply-plan or `--replace` in direct CLI to replace the whole section.

Configurable runtime UI motion is stored under `ui.motion` and normalized by `src/shared/uiMotionContract.js`. Human editors use dropdowns only; agents use `set-ui-motion`. The changed path is always `ui.motion`, and handoff routes it to all major screen previews.

Game UI style presets are shared recipes in `src/shared/uiStylePresetContract.js`. They do not create an opaque `ui.stylePreset` field. `apply-ui-style-preset` writes normal editable sections (`ui.theme`, `ui.titleScreen`, `ui.dialogueBox`, `ui.widgetStyles`, major screen configs, and `ui.motion`) according to the selected scope. Title recipe patches are asset-free text/button `ui.titleScreen.elements` only. Results include `impactSummary.sections`, so agents and the Project Settings UI can show which editable UI blocks will be updated before committing.

Page particle commands normalize through `src/shared/particleContract.js`. Built-in presets are `sakura`, `snow`, `rain`, `firefly`, `dust`, `sparkle`, `leaves`, and `bubbles`; unknown preset ids warn in validation and fall back at runtime. Commands target normal/choice pages only; condition pages do not render or inherit particle state. Changed particle paths are routed to `author-check` preview targets and handoff `particle-preview` review items.

Effect-pack commands normalize through `src/shared/effectPackContract.js`. This is a manifest-only Milestone 11 thin slice: manifests are data-only, files must stay under `effects/<id>/`, and runtime dispatches only to built-in adapters compiled with the app. The only shipped adapter is `canvas2d:film-flicker`. Do not write project-local `runtime.js`, arbitrary JavaScript, shader/WebGL code, raw CSS/HTML, plugin metadata, AI chat fields, or generic effect DSL fields into a plan.

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `list-effect-packs` | | | Direct CLI only. Lists validated `assets.effectPacks` manifests plus built-in adapters. |
| `register-effect-pack` | `manifest` | | Stores a validated data-only manifest at `assets.effectPacks.<id>`. Direct CLI uses `--manifest-json`; apply-plan uses `params.manifest`. |
| `set-page-effect-pack` | `sceneId`, `pageIndex`, `effectPackId` | `params`, `enabled` | Writes one canonical page reference at `scenes.<sceneId>.pages.<pageIndex>.effectPacks`. Aliases: `scene`, `page`, `id`, `effect-pack`. |
| `clear-page-effect-packs` | `sceneId`, `pageIndex` | | Removes page effect-pack references and reports the same changed path. Aliases: `scene`, `page`. |

Direct CLI examples:

```bash
npm run vn -- set-page-particles --scene start --page 0 --preset sakura --density 0.45 --speed 0.6 --wind 0.2 --script public/game/script.json --force --json
npm run vn -- clear-page-particles --scene start --page 4 --script public/game/script.json --force --json
npm run vn -- inherit-page-particles --scene start --page 5 --script public/game/script.json --force --json
npm run vn -- register-effect-pack --script public/game/script.json --manifest-json "{\"id\":\"old_film\",\"label\":\"Old Film\",\"kind\":\"postprocess\",\"version\":1,\"adapter\":\"canvas2d:film-flicker\",\"paramsSchema\":{\"intensity\":{\"type\":\"number\",\"minimum\":0,\"maximum\":1,\"default\":0.45}},\"files\":[{\"path\":\"effects/old_film/effect.json\",\"role\":\"manifest\"},{\"path\":\"effects/old_film/preview.png\",\"role\":\"preview\"}]}" --force --json
npm run vn -- set-page-effect-pack --scene start --page 0 --id old_film --params-json "{\"intensity\":0.5}" --script public/game/script.json --force --json
```

Plan manifest examples:

```json
{
  "command": "set-page-particles",
  "params": {
    "scene": "start",
    "page": 0,
    "preset": "sakura",
    "density": 0.45,
    "wind": 0.2
  }
}
```

```json
{
  "command": "clear-page-particles",
  "params": { "scene": "start", "page": 4 }
}
```

```json
{
  "command": "register-effect-pack",
  "params": {
    "manifest": {
      "id": "old_film",
      "label": "Old Film",
      "kind": "postprocess",
      "version": 1,
      "adapter": "canvas2d:film-flicker",
      "paramsSchema": {
        "intensity": { "type": "number", "minimum": 0, "maximum": 1, "default": 0.45 }
      },
      "files": [
        { "path": "effects/old_film/effect.json", "role": "manifest" },
        { "path": "effects/old_film/preview.png", "role": "preview" }
      ]
    }
  }
}
```

```json
{
  "command": "set-page-effect-pack",
  "params": {
    "scene": "start",
    "page": 0,
    "effectPackId": "old_film",
    "params": { "intensity": 0.5 }
  }
}
```

Natural-language mapping:

| User says | Agent operation |
| --- | --- |
| "Add soft sakura petals to this page." | `set-page-particles` with `preset=sakura`, `density=0.3..0.5`. |
| "Make it snow heavily here." | `set-page-particles` with `preset=snow`, `density=0.7..0.9`, `speed=0.7`. |
| "Stop the rain when they go inside." | `clear-page-particles`. |
| "Keep the same atmosphere on the next page." | `inherit-page-particles` if staying in the same scene, or explicit `set-page-particles` when crossing scenes. |

| Command | Required params | Optional params | Notes |
| --- | --- | --- | --- |
| `set-dialogue-box` | `config` | `merge` | Sets `ui.dialogueBox`, including dialogue frame and nameplate style config. |
| `set-theme` | `config` | `merge` | Sets `ui.theme`, including tokens, icons, cursors, nine-slice, and button families. |
| `set-widget-styles` | `config` | `merge` | Sets `ui.widgetStyles`, including reusable widget visual config. |
| `set-ui-motion` | none | `intensity`, `title`, `dialogue`, `choices`, `menus`, `config`, `merge` | Sets canonical `ui.motion`. Values are dropdown-style preset ids, not CSS. |
| `list-ui-style-presets` | none | none | Lists built-in no-code UI style presets and scopes. |
| `apply-ui-style-preset` | `preset` | `scope`, `merge` | Applies `classic-adv`, `glass-school`, `dark-cinema`, `suspense-noir`, `sci-fi-hud`, or `soft-romance` by writing normal UI config sections. Scopes: `all`, `dialogue`, `choices`, `screens`; `screens` covers title plus major screens. JSON output includes an impact summary with paths and labels. |

Direct CLI examples:

```bash
npm run vn -- set-dialogue-box --script public/game/script.json --config .tmp/dialogue-box.json --force --checkpoint --json
npm run vn -- set-theme --script public/game/script.json --config-json "{\"tokens\":{\"accent\":\"#88ccff\"}}" --force --json
npm run vn -- set-widget-styles --script public/game/script.json --config .tmp/widget-styles.json --replace --force --json
npm run vn -- set-ui-motion --script public/game/script.json --intensity dramatic --title cinematic-slow --choices suspense-delay --force --json
npm run vn -- list-ui-style-presets --json
npm run vn -- apply-ui-style-preset --script public/game/script.json --preset suspense-noir --scope all --force --checkpoint --json
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
    },
    {
      "id": "style-preset",
      "command": "apply-ui-style-preset",
      "params": {
        "preset": "suspense-noir",
        "scope": "all"
      }
    },
    {
      "id": "dramatic-motion",
      "command": "set-ui-motion",
      "params": {
        "intensity": "dramatic",
        "title": "cinematic-slow",
        "dialogue": "soft-pop",
        "choices": "suspense-delay",
        "menus": "panel-slide"
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
