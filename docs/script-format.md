# Galgame Maker — Script Format Specification

## Overview

Game scripts are stored as a single JSON file with the following top-level structure:

```json
{
  "meta": { ... },
  "characters": { ... },
  "scenes": { ... },
  "ui": { ... }
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

Modern page-based scripts may also store visual fields directly on page objects. `particles` is the canonical page atmosphere field:

```json
{
  "type": "normal",
  "background": "backgrounds/park.png",
  "particles": {
    "preset": "sakura",
    "density": 0.45,
    "speed": 0.6,
    "wind": 0.2,
    "opacity": 0.8,
    "color": "#ffc6d9",
    "direction": "down"
  }
}
```

Omit `particles` to inherit the last particle state earlier in the same scene. Use `null` or `false` to stop particles. Built-in preset ids are `sakura`, `snow`, `rain`, `firefly`, `dust`, `sparkle`, `leaves`, and `bubbles`.

## Command Types

### `dialogue`
```json
{ "type": "dialogue", "speaker": "sakura", "text": "Hello!" }
```
- `speaker`: character ID or `null` for narration

**Optional style override** — customize dialogue box position and appearance:

```json
{
  "type": "dialogue",
  "speaker": "sakura",
  "text": "Hello!",
  "style": {
    "x": 100,
    "y": 500,
    "width": 1080,
    "height": 180,
    "fontSize": 18,
    "fontFamily": "Noto Serif SC",
    "textColor": "#ffffff",
    "backgroundColor": "rgba(0, 0, 0, 0.8)",
    "borderRadius": 12,
    "padding": 20
  }
}
```

| Style Field | Type | Description |
|-------------|------|-------------|
| `x` | number | Left position in pixels (game coordinates) |
| `y` | number | Top position in pixels |
| `width` | number | Box width in pixels |
| `height` | number | Box height in pixels |
| `fontSize` | number | Text font size in pixels |
| `fontFamily` | string | CSS font family |
| `textColor` | string | Text color (CSS color value) |
| `backgroundColor` | string | Box background color |
| `borderRadius` | number | Corner radius in pixels |
| `padding` | number | Inner padding in pixels |

All style fields are optional. When omitted, the default dialogue box style is used.

### `show_character`
```json
{ "type": "show_character", "id": "sakura", "expression": "normal", "position": "center", "transition": "fade", "duration": 600 }
```
- `position`: `"left"`, `"center"`, `"right"`, or `"custom"` (requires `x`/`y`)
- `transition`: `"fade"`, `"slide_left"`, `"slide_right"`, `"none"`

**Optional free positioning** — place character at exact pixel coordinates:

```json
{
  "type": "show_character",
  "id": "sakura",
  "expression": "smile",
  "position": "custom",
  "x": 400,
  "y": 100,
  "scale": 1.2
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `x` | number | — | Left position in pixels (game coordinates) |
| `y` | number | — | Top position in pixels |
| `scale` | number | 1 | Scale factor (1.0 = original size) |

When `x` and `y` are provided, `position` is ignored and the character is placed at the exact coordinates. When omitted, the preset positions (`left`/`center`/`right`) are used.

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

**Optional custom layout** — freely position the choice menu and individual buttons:

```json
{
  "type": "choice",
  "prompt": "What do you do?",
  "layout": "custom",
  "style": {
    "x": 400,
    "y": 200
  },
  "options": [
    {
      "text": "Option A",
      "jump": "scene_a",
      "style": {
        "x": 0,
        "y": 0,
        "width": 300,
        "height": 50,
        "fontSize": 18,
        "fontFamily": "Noto Sans SC",
        "color": "#ffffff",
        "backgroundColor": "rgba(0, 0, 0, 0.6)",
        "borderRadius": 8
      }
    },
    {
      "text": "Option B",
      "jump": "scene_b",
      "style": { "x": 0, "y": 70, "width": 300, "height": 50 }
    }
  ]
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `layout` | string | `"default"` | `"default"` (centered flex) or `"custom"` (free positioning) |
| `style.x` | number | — | Menu container X position |
| `style.y` | number | — | Menu container Y position |

Per-option `style` fields (only used when `layout` is `"custom"`):

| Option Style | Type | Description |
|-------------|------|-------------|
| `x`, `y` | number | Position relative to container |
| `width`, `height` | number | Button dimensions |
| `fontSize` | number | Font size in pixels |
| `fontFamily` | string | CSS font family |
| `color` | string | Text color |
| `backgroundColor` | string | Button background |
| `borderRadius` | number | Corner radius |

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

---

## `ui` — UI Configuration (Optional)

Top-level UI overrides for customizing built-in screens.

### `ui.titleScreen`

Configure the title screen layout with freely positioned text and button elements, similar to building a PowerPoint slide.

```json
{
  "ui": {
    "titleScreen": {
      "background": "backgrounds/title_bg.png",
      "elements": [
        {
          "type": "text",
          "content": "My Visual Novel",
          "x": 640,
          "y": 200,
          "anchor": "center",
          "font": "36px 'Noto Serif SC', serif",
          "color": "#ffffff"
        },
        {
          "type": "button",
          "action": "start",
          "label": "New Game",
          "x": 640,
          "y": 400,
          "anchor": "center",
          "font": "18px 'Noto Sans SC', sans-serif",
          "color": "rgba(255,255,255,0.8)",
          "size": { "width": 200, "height": 44 }
        },
        {
          "type": "button",
          "action": "load",
          "label": "Continue",
          "x": 640,
          "y": 460,
          "anchor": "center"
        }
      ]
    }
  }
}
```

#### Title Element Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"text"` or `"button"` |
| `content` / `label` | string | Display text (`content` for text, `label` for buttons) |
| `action` | string | Button action: `"start"`, `"load"` (alias: `"continue"`), `"settings"` |
| `x` | number | X position in game coordinates |
| `y` | number | Y position in game coordinates |
| `anchor` | string | `"top-left"` (default) or `"center"` |
| `font` | string | CSS font shorthand (e.g. `"24px 'Noto Sans SC'"`) |
| `color` | string | Text/button color |
| `size` | object | Button dimensions: `{ width, height }` |

When `ui.titleScreen` is not defined, the default centered title screen is displayed.
