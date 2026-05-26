# Structured Draft Contract

This contract is the external-agent input shape for prose-derived visual novel work.

Use it when a user describes story content in natural language and an external agent needs a reviewable intermediate artifact before editing `script.json`.

Supported commands:

```bash
npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --require-adaptation-preview --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --dry-run --json
```

`import-draft` can still create or merge a script directly, but `draft-plan -> apply-plan` is preferred for reviewable external-agent work because it produces ordered operations, dry-runs, checkpoints, and a transaction result.

## Top-Level Shape

```json
{
  "projectId": "gm_example_agent_draft",
  "title": "Spring Promise",
  "version": "0.1.0",
  "author": "External Agent",
  "adaptationPreview": {
    "approved": true,
    "assetsReviewed": true,
    "pageBeatCount": 2,
    "choiceCount": 1,
    "missingAssets": ["characters/sakura_smile.svg"]
  },
  "characters": [],
  "variables": [],
  "locations": [],
  "scenes": []
}
```

Required for useful output:

- `projectId`: stable project id used when importing a fresh draft.
- `scenes`: ordered scene array. Each scene can contain `beats`.

Optional but recommended:

- `title`: plan title and fresh script title.
- `characters`: character definitions used by dialogue and staged character ids.
- `variables`: variable registry entries used by choice effects.
- `locations`: reusable background hints for beats.
- `adaptationPreview`: non-canonical review metadata proving a human-readable prose breakdown was approved and assets were inspected before conversion.

For prose-derived delivery, pass `--require-adaptation-preview`. The gate requires `adaptationPreview.approved: true`, `assetsReviewed: true`, `pageBeatCount >= 1`, `choiceCount >= 0`, and an array-valued `missingAssets`. This metadata is carried into plan source provenance only; it is not written into `script.json`.

Unknown fields are preserved only when the lower-level operation accepts them. Do not rely on arbitrary draft metadata surviving into the final project.

`draft-plan` copies supported source metadata into each generated operation's `provenance` object. Use this when converting a large prose outline and you need to trace a failed operation or handoff item back to the original beat. Supported source metadata fields are `sourceId`, `sourceBeatId`, `sourceRef`, `sourceSpan`, and `proseSpan`.

## IDs

Every user-addressable object should have a stable lowercase id using `a-z`, `0-9`, `_`, or `-`.

If an id is missing, the importer slugifies the name or creates a fallback like `character_1`, `scene_1`, or `p1`. External agents should provide ids anyway so later plans, validation output, and handoff reports are easier to connect back to the user's request.

Chinese characters are accepted by the current slugifier, but ASCII ids are preferred for cross-tool compatibility.

## Characters

```json
{
  "id": "sakura",
  "name": "Sakura",
  "expressionHints": ["normal", "smile", "sad"],
  "expressions": {
    "smile": "characters/sakura_smile.svg"
  }
}
```

Fields:

- `id`: character id.
- `name`: display name.
- `expressionHints`: expression ids to create when `expressions` does not provide explicit asset paths.
- `expressions`: optional map of expression id to asset path.

Defaults:

- Missing `expressionHints` becomes `["normal"]`.
- Missing expression asset paths become `characters/<character_id>_<expression_id>.svg`.

## Variables

Preferred shape:

```json
{
  "id": "sakura_affection",
  "type": "number",
  "initial": 0,
  "label": "Sakura Affection"
}
```

Compatibility shape:

```json
{
  "systems": {
    "variables": {
      "sakura_affection": {
        "type": "number",
        "initial": 0,
        "label": "Sakura Affection"
      }
    }
  }
}
```

Use `variables[]` for new drafts. `systems.variables` is accepted so agents can convert or patch existing project-shaped snippets.

Supported variable types follow the project variable registry, currently including `number` and `bool`.

## Locations

```json
{
  "id": "school_gate",
  "name": "School Gate",
  "backgroundHint": "backgrounds/school_gate.svg"
}
```

Fields:

- `id`: location id referenced by `beat.location` or `beat.locationId`.
- `name`: human label.
- `background` or `backgroundHint`: asset path used as the beat/page background.

If both `background` and `backgroundHint` exist, `background` wins.

## Scenes

```json
{
  "id": "start",
  "name": "Spring Encounter",
  "next": "chapter_1",
  "beats": []
}
```

Fields:

- `id`: scene id.
- `name`: scene label.
- `next`: optional default next scene target.
- `beats`: ordered content beats. Each beat becomes one normal page, plus an optional choice page.

## Beats

```json
{
  "id": "p1",
  "sourceBeatId": "outline-beat-1",
  "proseSpan": { "start": 120, "end": 260 },
  "location": "school_gate",
  "background": "backgrounds/school_gate.svg",
  "characters": [
    { "id": "sakura", "expression": "smile" },
    "haruki"
  ],
  "dialogues": [
    { "speaker": null, "text": "Spring wind moved through the school gate." },
    { "speaker": "sakura", "text": "You came earlier than I expected.", "expression": "smile" }
  ],
  "bgm": "audio/spring_theme.ogg",
  "bgmVolume": 0.6,
  "se": "audio/bell.ogg",
  "transition": { "type": "fade", "duration": 800 },
  "choice": {
    "prompt": "How should Haruki answer?",
    "options": []
  }
}
```

Fields:

- `id`: page id. Defaults to `p<beat_number>`.
- `sourceBeatId`, `sourceRef`, `sourceSpan`, `proseSpan`: optional provenance metadata copied into generated plan operations.
- `location` or `locationId`: looks up a `locations[]` entry.
- `background`: direct page background path. This wins over location background.
- `backgroundHint`: fallback background path if no direct background or location background resolves.
- `characters`: staged character ids or objects with `{ "id", "expression" }`.
- `dialogues`: ordered dialogue lines.
- `bgm`: background music file path.
- `bgmVolume`: volume for `bgm`; defaults to `0.6`.
- `se`: sound effect file path.
- `transition`: page transition; defaults to `{ "type": "fade", "duration": 800 }`.
- `choice` or `choices`: optional choice block.

Character staging uses the repo's layout presets. Up to three characters are staged automatically; more than three produces a warning and only the first three are staged.

## Dialogues

```json
{
  "speaker": "sakura",
  "text": "You came earlier than I expected.",
  "expression": "smile",
  "voice": "voices/sakura/p1.ogg"
}
```

Fields:

- `speaker`: character id, or `null` for narration.
- `text`: dialogue text.
- `expression`: optional expression cue for the speaker.
- `voice`: optional voice asset path.

If a dialogue has both `speaker` and `expression`, that expression also informs character staging for the beat.

## Choices

```json
{
  "prompt": "How should Haruki answer?",
  "options": [
    {
      "text": "I wanted to see you.",
      "target": "start",
      "effects": [
        { "type": "var:add", "id": "sakura_affection", "value": 1 }
      ]
    }
  ]
}
```

Fields:

- `prompt`: choice prompt text.
- `options`: ordered options.
- `options[].text`: visible option label.
- `options[].target`: target scene id, or `null` for no jump.
- `options[].effects`: choice effects copied into the generated choice page.

When a beat has a choice, `draft-plan` emits two page operations: a normal page for the beat, then a choice page using the same background and character staging.

## Conversion Rules

`draft-plan` emits operations in this order:

1. `add-variable` for each variable.
2. `add-character` for each character.
3. `add-scene` for each scene.
4. `add-page` for each beat normal page.
5. `add-page` for each beat choice page.

The generated plan includes:

```json
{
  "version": 1,
  "title": "Spring Promise",
  "source": {
    "kind": "novel-draft",
    "projectId": "gm_example_agent_draft"
  },
  "operations": [
    {
      "id": "add-page-start-p1",
      "command": "add-page",
      "provenance": {
        "kind": "beat",
        "sceneId": "start",
        "sceneIndex": 0,
        "beatId": "p1",
        "beatIndex": 0,
        "sourceBeatId": "outline-beat-1",
        "proseSpan": { "start": 120, "end": 260 }
      }
    }
  ],
  "warnings": []
}
```

Review `warnings[]` before applying. Common warning:

- `too-many-characters-for-preset`: a beat listed more than three characters, so automatic staging is partial.

## Agent Checklist

Before handing off a draft:

- Use stable ids for characters, variables, locations, scenes, and beats.
- Define every dialogue speaker in `characters[]`.
- Define variables before referencing them in choice effects.
- Prefer `location` plus `locations[]` for repeated backgrounds.
- Keep dialogue and choice text concise enough for layout lint.
- Run `draft-plan --require-adaptation-preview`, then `apply-plan --dry-run`, before writing prose-derived work.

See `docs/agent-authoring/example-draft.json` for a complete small draft.
