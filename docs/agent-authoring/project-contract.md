# Agent Project Contract

Agents author the same canonical `script.json` used by the editor and runtime. Prefer `tools/vn-author` or `createProjectSession` instead of direct JSON edits.

## Top Level

```json
{
  "projectId": "gm_example",
  "contractVersion": 1,
  "meta": {
    "title": "Example",
    "version": "0.1.0",
    "author": "AI Draft",
    "resolution": { "width": 1280, "height": 720 }
  },
  "characters": {},
  "scenes": {},
  "systems": {
    "variables": {},
    "endings": {},
    "gallery": { "cg": {} }
  }
}
```

`projectId` must be stable. New agent writes should preserve existing `projectId` unless intentionally creating a fresh project.

## Characters

```json
{
  "characters": {
    "sakura": {
      "name": "Sakura",
      "color": "#ff99aa",
      "expressions": {
        "normal": "characters/sakura_normal.svg",
        "smile": "characters/sakura_smile.svg"
      }
    }
  }
}
```

Register expressions before using them on a page or dialogue.

## Variables

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

Supported variable types are `number` and `bool`.

## Scenes

```json
{
  "scenes": {
    "start": {
      "name": "Start",
      "next": "chapter_2",
      "pages": []
    }
  }
}
```

`next` is optional. If present, it must target an existing scene.

## Normal Page

```json
{
  "id": "p1",
  "type": "normal",
  "background": "backgrounds/school_gate.svg",
  "characters": [
    { "id": "sakura", "expression": "smile", "position": "center", "x": null, "y": null, "scale": 1 }
  ],
  "bgm": null,
  "se": null,
  "dialogues": [
    { "speaker": "sakura", "text": "Hello.", "expression": "smile", "voice": null }
  ],
  "transition": { "type": "fade", "duration": 800 }
}
```

Narration uses `"speaker": null`.

## Choice Page

```json
{
  "id": "p2",
  "type": "choice",
  "prompt": "What do you say?",
  "options": [
    {
      "text": "Be kind",
      "target": "good_route",
      "effects": [
        { "type": "var:add", "id": "sakura_affection", "value": 1 }
      ]
    }
  ]
}
```

Use canonical `effects[]`. Do not write legacy `setVariable` in new content.

## Condition Page

```json
{
  "id": "p3",
  "type": "condition",
  "conditionMode": "all",
  "conditions": [
    { "variableId": "sakura_affection", "operator": ">=", "value": 1 }
  ],
  "trueTarget": "good_ending",
  "falseTarget": "normal_ending"
}
```

Supported condition modes are `all` and `any`. Supported operators are `==`, `!=`, `>`, `>=`, `<`, `<=`.

## Effects

Supported effect types:

```json
{ "type": "var:set", "id": "flag", "value": true }
{ "type": "var:add", "id": "affection", "value": 1 }
{ "type": "var:sub", "id": "affection", "value": 1 }
{ "type": "unlock:ending", "id": "good_end" }
{ "type": "unlock:cg", "id": "cg_001" }
```

Register variables, endings, and CG entries before referencing them in effects.

## Advanced Staging

Agents may author runtime-supported cinematic fields before every editor surface exposes them:

```json
{
  "camera": { "effect": "shake", "direction": "both", "intensity": "high", "durationMs": 450 },
  "transition": { "type": "dissolve", "duration": 500 },
  "characters": [
    { "id": "sakura", "expression": "normal", "position": "center", "animation": "breathe" }
  ]
}
```

Prefer the authoring API or CLI:

```bash
node tools/vn-author/index.js set-page-camera --scene start --page 0 --effect shake --direction both --intensity high --duration-ms 450 --force --json
node tools/vn-author/index.js set-page-transition --scene start --page 0 --type dissolve --duration 500 --force --json
node tools/vn-author/index.js set-character-animation --scene start --page 0 --character sakura --animation breathe --force --json
```

Unknown camera effects are ignored at runtime, unknown transitions fall back to `fade`, and unknown character animations are preserved but not played. `validate --json` reports these as warnings so agents can keep future-compatible data without breaking export.
