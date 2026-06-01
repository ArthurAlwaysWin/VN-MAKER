# Agent Mini-Workflows

Use these compact workflows when an external agent is making a focused change rather than importing a whole draft. For the full lifecycle, see [workflow.md](./workflow.md). For plan command parameters, see [command-reference.md](./command-reference.md).

The default pattern is:

1. Inspect the project.
2. Make the smallest plan that expresses the change.
3. Run `apply-plan --validate-only`.
4. Run `apply-plan --dry-run`.
5. Write with `--force --checkpoint --result-out`.
6. Run `author-check --transaction`.
7. Write a handoff report.

## Add One Scene

```json
{
  "version": 1,
  "operations": [
    { "id": "add-scene", "command": "add-scene", "params": { "id": "chapter_2", "name": "Chapter 2" } },
    { "id": "add-page", "command": "add-page", "params": { "scene": "chapter_2", "type": "normal", "dialogues": [{ "speaker": null, "text": "The station lights flickered awake." }] } },
    { "id": "link", "command": "set-scene-next", "params": { "scene": "chapter_1", "next": "chapter_2" } }
  ]
}
```

Then run:

```bash
npm run vn:apply-plan -- .tmp/add-scene-plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/add-scene-plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- .tmp/add-scene-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
npm run vn:author-check -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
```

## Revise Dialogue

Use `set-dialogue` for targeted rewrites and `add-dialogue` for new beats. Preserve speaker ids and expressions unless the user asked to change staging.

```json
{
  "version": 1,
  "operations": [
    {
      "id": "revise-line",
      "command": "set-dialogue",
      "params": {
        "scene": "start",
        "page": 0,
        "dialogue": 1,
        "text": "I thought I had more time."
      }
    }
  ]
}
```

## Stage Characters

Use `set-page-characters` to replace the page's visible cast. Prefer known ids and expressions from `inspect` or `export-report`.

```json
{
  "version": 1,
  "operations": [
    {
      "id": "stage-duo",
      "command": "set-page-characters",
      "params": {
        "scene": "start",
        "page": 0,
        "characters": [
          { "id": "sakura", "expression": "smile", "position": "left" },
          { "id": "haruki", "expression": "normal", "position": "right" }
        ]
      }
    }
  ]
}
```

## Add Background Or BGM

Use `set-page-media` when background and audio should change together. Use `null` to clear optional audio.

```json
{
  "version": 1,
  "operations": [
    {
      "id": "set-media",
      "command": "set-page-media",
      "params": {
        "scene": "start",
        "page": 0,
        "background": "backgrounds/classroom.svg",
        "bgm": { "file": "audio/morning.ogg", "volume": 0.55 },
        "se": null
      }
    }
  ]
}
```

Run `author-check --transaction` after writing so layout/readiness output focuses on the changed page.

## Add Page Atmosphere

Use particle commands for built-in weather/atmosphere. Keep human-facing edits no-code: do not paste raw JSON into the editor.

```json
{
  "version": 1,
  "operations": [
    {
      "id": "soft-sakura",
      "command": "set-page-particles",
      "params": {
        "scene": "start",
        "page": 0,
        "preset": "sakura",
        "density": 0.4,
        "speed": 0.6,
        "wind": 0.2
      }
    },
    {
      "id": "stop-inside",
      "command": "clear-page-particles",
      "params": { "scene": "start", "page": 4 }
    }
  ]
}
```

Use `inherit-page-particles` to keep the same particle state later in the same scene. When crossing to another scene, set particles explicitly on the destination scene's first atmospheric page.

## Tune UI Motion

Use `set-ui-motion` for title, dialogue, choice, and menu motion presets. This writes only canonical `ui.motion` dropdown values and routes the result to major screen previews.

```json
{
  "version": 1,
  "operations": [
    {
      "id": "suspense-motion",
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

## Apply UI Style Preset

Use `apply-ui-style-preset` for a no-code visual pass across existing UI sections. Presets are recipes: they do not persist `ui.stylePreset`, and the resulting theme, widget, screen, dialogue, and motion config stays editable.

```json
{
  "version": 1,
  "operations": [
    {
      "id": "style-pass",
      "command": "apply-ui-style-preset",
      "params": {
        "preset": "suspense-noir",
        "scope": "all"
      }
    }
  ]
}
```

Use `scope: "dialogue"` for frame/nameplate polish only, `scope: "choices"` for choice buttons only, and `scope: "screens"` for game menu, save/load, backlog, and settings panels. Review the command result `impactSummary.sections` before presenting or applying a broad preset; it lists the normal UI blocks that will be updated.

## Add A Branch

Branch edits usually need a choice page, one or more target scenes, and optional variable effects.

```json
{
  "version": 1,
  "operations": [
    { "id": "route-a", "command": "add-scene", "params": { "id": "route_a", "name": "Route A" } },
    { "id": "route-b", "command": "add-scene", "params": { "id": "route_b", "name": "Route B" } },
    {
      "id": "choice",
      "command": "set-choice-page",
      "params": {
        "scene": "start",
        "page": 1,
        "prompt": "Which way do you go?",
        "options": [
          { "text": "Follow Sakura", "target": "route_a", "effects": [{ "type": "var:add", "id": "sakura_affection", "value": 1 }] },
          { "text": "Stay behind", "target": "route_b" }
        ]
      }
    }
  ]
}
```

Before deleting or merging branches, inspect references:

```bash
npm run vn:scene-references -- --all --script public/game/script.json --json
```

## Prepare Handoff

After writing any meaningful change:

```bash
npm run vn:author-check -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
npm run vn:handoff-report -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-editor-handoff --note "Review changed branch pages and placeholder assets." --json
```

Tell the human reviewer which scenes changed, which checkpoint can restore the previous state, and which warnings remain.
