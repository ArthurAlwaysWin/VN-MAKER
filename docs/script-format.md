# Galgame Maker — Script Format Specification

## Overview

Game scripts are stored as a single JSON file with the following top-level structure:

```json
{
  "meta": { ... },
  "characters": { ... },
  "scenes": { ... }
}
```

## `meta` — Game Metadata

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Game title |
| `version` | string | Script version |
| `author` | string | Author name |
| `resolution` | `{ width, height }` | Game resolution (default: 1280×720) |

## `characters` — Character Definitions

Keyed by character ID:

```json
"sakura": {
  "name": "樱",
  "color": "#FF9CAE",
  "expressions": {
    "normal": "characters/sakura_normal.png",
    "smile": "characters/sakura_smile.png"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name in dialogue box |
| `color` | string | Name color in dialogue box |
| `expressions` | object | Map of expression name → image path (relative to `public/game/`) |

## `scenes` — Scene Definitions

Keyed by scene ID. Each scene has a `name` and a `commands` array:

```json
"start": {
  "name": "Scene Title",
  "commands": [ ... ]
}
```

## Command Types

### `dialogue`
```json
{ "type": "dialogue", "speaker": "sakura", "text": "Hello!" }
```
- `speaker`: character ID or `null` for narration

### `show_character`
```json
{ "type": "show_character", "id": "sakura", "expression": "normal", "position": "center", "transition": "fade", "duration": 600 }
```
- `position`: `"left"`, `"center"`, `"right"`
- `transition`: `"fade"`, `"slide_left"`, `"slide_right"`, `"none"`

### `hide_character`
```json
{ "type": "hide_character", "id": "sakura", "transition": "fade", "duration": 400 }
```

### `set_expression`
```json
{ "type": "set_expression", "id": "sakura", "expression": "smile" }
```

### `set_background`
```json
{ "type": "set_background", "image": "backgrounds/school.png", "transition": "fade", "duration": 1000 }
```
- `transition`: `"fade"`, `"none"`

### `play_bgm`
```json
{ "type": "play_bgm", "file": "audio/bgm.mp3", "volume": 0.6, "fadeIn": 2000 }
```

### `stop_bgm`
```json
{ "type": "stop_bgm", "fadeOut": 1000 }
```

### `play_se`
```json
{ "type": "play_se", "file": "audio/se.mp3" }
```

### `choice`
```json
{
  "type": "choice",
  "prompt": "What do you do?",
  "options": [
    { "text": "Option A", "jump": "scene_a", "setVariable": { "key": 1 } },
    { "text": "Option B", "jump": "scene_b" }
  ]
}
```

### `jump`
```json
{ "type": "jump", "target": "scene_id" }
```

### `set_variable`
```json
{ "type": "set_variable", "name": "key", "value": 1 }
```

### `condition`
```json
{
  "type": "condition",
  "variable": "key",
  "operator": ">=",
  "value": 1,
  "trueJump": "scene_a",
  "falseJump": "scene_b"
}
```
- `operator`: `"=="`, `"!="`, `">"`, `">="`, `"<"`, `"<="`

### `end`
```json
{ "type": "end" }
```
Ends the game and returns to title screen.
