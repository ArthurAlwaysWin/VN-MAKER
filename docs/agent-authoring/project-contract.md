# Agent Project Contract

Agents author the same canonical `script.json` used by the editor and runtime. Prefer `tools/vn-author` or `createProjectSession` instead of direct JSON edits.

For cross-cutting operation, transaction, diagnostic, preview, handoff, and conflict rules, see [integration-contract.md](./integration-contract.md).

## Top Level

```json
{
  "projectId": "gm_example",
  "contractVersion": 1,
  "meta": {
    "title": "Example",
    "version": "0.1.0",
    "author": "External Agent",
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
        "label": "Sakura Affection",
        "group": "Affection",
        "kind": "affection",
        "characterId": "sakura",
        "min": 0,
        "max": 100,
        "step": 1
      }
    }
  }
}
```

Supported variable types are `number` and `bool`. Optional UI metadata is `label`, `group`, and `notes`. Number variables may define `min`, `max`, and `step` for editor controls. Affection presets use `kind: "affection"` and `characterId`, and should be created with `add-affection-variable` so GUI and agent output stay normalized.

## Endings

```json
{
  "systems": {
    "endings": {
      "good_end": {
        "title": "Good End",
        "category": "main",
        "order": 1,
        "description": "Clear the good route.",
        "thumbnail": "ui/endings/good.png",
        "hiddenUntilUnlocked": true
      }
    }
  }
}
```

Ending ids use the same stable id shape as variables. Register endings before writing `unlock:ending` effects. Runtime unlock progress is stored in `player-data/profile.json.unlocks.endings`, not in save slots or `script.json`. Story Systems can read and refresh this player progress for debugging, but editing an ending never writes unlock progress back into author data.

## CG Gallery

```json
{
  "systems": {
    "gallery": {
      "cg": {
        "cg_confession": {
          "title": "Confession",
          "images": ["backgrounds/cg/confession.png"],
          "thumbnail": "backgrounds/cg/confession_thumb.png",
          "lockedThumbnail": "ui/gallery/locked.png",
          "category": "main",
          "order": 1,
          "description": "A route memory."
        }
      }
    }
  }
}
```

CG ids use the stable registry id shape. Register a CG with `add-cg` before writing `unlock:cg` effects. Runtime unlock progress is stored in `player-data/profile.json.unlocks.cg`, and Story Systems can read and refresh it for debugging without writing author data. For legacy data, a single `image` field normalizes to the first canonical `images` item and the default thumbnail. A title button with action `"gallery"` opens the runtime gallery; unlocked multi-image entries can be browsed there, and missing artwork shows a fallback rather than breaking playback.

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
  "effects": [
    { "type": "unlock:ending", "id": "good_end" }
  ],
  "transition": { "type": "fade", "duration": 800 }
}
```

Narration uses `"speaker": null`. For a terminal normal page, `effects` may contain `unlock:ending`; it runs when the player enters the page during story traversal, not when a saved page is merely redrawn after load.

### Page Particles

Page particles are a canonical page-level visual field owned by `src/shared/particleContract.js`:

```json
{
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

Omitted or `undefined` means inherit the last particle state earlier in the same scene. `null` or `false` means explicitly stop particles. Condition pages do not render or contribute inherited particle state. The built-in presets are `sakura`, `snow`, `rain`, `firefly`, `dust`, `sparkle`, `leaves`, and `bubbles`; unknown preset ids are preserved for validation warnings and fall back to `dust` at runtime without blocking export.

Author through no-code editor controls or structured commands only:

- `list-particles`
- `set-page-particles`
- `clear-page-particles`
- `inherit-page-particles`

Changed paths use `scenes.<sceneId>.pages.<pageIndex>.particles` and are routed to preview/handoff as particle review targets.

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

Choice option `effects` support the full DSL above. Normal page entry `effects` are reserved for `unlock:ending`, so a route conclusion can unlock naturally on arrival without introducing an extra confirmation choice.

## Advanced Staging

Agents may author runtime-supported cinematic fields before every editor surface exposes them:

```json
{
  "camera": { "effect": "shake", "direction": "both", "intensity": "high", "durationMs": 450 },
  "transition": { "type": "wipe-right", "duration": 500 },
  "characters": [
    { "id": "sakura", "expression": "normal", "position": "center", "animation": "breathe" }
  ]
}
```

Prefer the authoring API or CLI:

```bash
npm run vn -- set-page-camera --scene start --page 0 --effect shake --direction both --intensity high --duration-ms 450 --force --json
npm run vn -- set-page-transition --scene start --page 0 --type wipe-right --duration 500 --force --json
npm run vn -- set-character-animation --scene start --page 0 --character sakura --animation breathe --force --json
npm run vn -- list-transitions --target background --supported-only --json
npm run vn -- set-camera-effect --scene start --page 0 --effect shake --direction both --duration-ms 450 --force --json
npm run vn -- set-character-transition --scene start --page 0 --character sakura --transition breathe --force --json
```

The shared transition catalog is fully implemented for M5 through existing project fields. Background support includes directional wipes, `zoom-in`, `zoom-out`, `flash`, `iris-in`, `iris-out`, and `crossfade-pan`, all rendered and previewed through `transition.type`. Character motion supports `fade`, `slide-left`, `slide-right`, `pop`, `scale-in`, and `blur-in` through `characters[].animation`; `set-character-transition` does not add a second schema field. Camera support includes `vignette` and `letterbox` through `camera.effect`. Background transition durations clamp to `0..5000` ms and camera durations clamp to `0..2000` ms. Unknown transitions fall back to `fade`; unknown camera effects and character animations are preserved but not played. `validate --json` reports unknown future-compatible data as warnings without breaking export.

## Runtime UI Motion

The runtime applies default CSS-only motion and focus/hover polish to the title screen, choices, game menu, save/load, settings, and backlog screens. Projects may now configure that motion through canonical `ui.motion` presets:

```json
{
  "ui": {
    "motion": {
      "intensity": "standard",
      "title": "soft-rise",
      "dialogue": "soft-pop",
      "choices": "stagger-rise",
      "menus": "panel-fade"
    }
  }
}
```

Allowed values:

| Field | Values |
| --- | --- |
| `intensity` | `off`, `subtle`, `standard`, `dramatic` |
| `title` | `none`, `soft-rise`, `cinematic-slow`, `glow-pulse` |
| `dialogue` | `none`, `soft-pop`, `slide-up`, `glass-fade` |
| `choices` | `none`, `stagger-rise`, `card-pop`, `suspense-delay` |
| `menus` | `none`, `panel-fade`, `panel-slide`, `sidebar-sweep` |

Use `set-ui-motion` or the no-code Project Settings controls. Do not write CSS, HTML, or JSON textareas for human authors. Changed `ui.motion` routes to all major screen preview targets.
