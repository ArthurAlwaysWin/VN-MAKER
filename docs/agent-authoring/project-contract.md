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

Optional ending videos use `endingVideo` and must reference canonical video project data:

```json
{
  "systems": {
    "endings": {
      "good_end": {
        "title": "Good End",
        "endingVideo": { "videoId": "ed_good", "play": "after-unlock" }
      }
    }
  }
}
```

`endingVideo.play` supports `after-unlock` and `manual`. `after-unlock` plays only after the ending unlock is durably saved; playback failure must not roll back the unlock. `manual` is for preview/replay surfaces and does not change unlock state.

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

## Video Assets

Video files are canonical project assets under `videos/...` and are stored on disk under the project asset root as `assets/videos/...`. Do not store `public/game/videos/...`, absolute paths, remote URLs, data URLs, arbitrary HTML/CSS/JS, shader data, or plugin metadata in `script.json`.

```json
{
  "assets": {
    "videos": {
      "op_main": {
        "file": "videos/op_main.mp4",
        "poster": "videos/op_main.poster.png",
        "label": "Main Opening",
        "kind": "op"
      }
    }
  },
  "ui": {
    "titleScreen": {
      "openingVideo": { "videoId": "op_main", "play": "after-start", "oncePerProfile": true }
    }
  }
}
```

Supported first-pass video file extensions are `.mp4` and `.webm`. `kind` is advisory and may be `op`, `ed`, `story`, or `other`. A video reference may use `videoId` into `assets.videos` or a direct `file`, but generated data should prefer `videoId`.

Reusable video references support `skippable`, `controls`, `volume`, `audioMode`, `fit`, and `loop`. `audioMode` is one of `replace`, `duck`, or `mix`; `fit` is one of `contain`, `cover`, or `native`; `volume` is `0..1`. Opening videos additionally support `play: "after-start" | "before-title" | "manual"` and `oncePerProfile`; `before-title` should be reviewed because browsers may require a click-to-play gate for unmuted playback.

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

## Video Page

```json
{
  "id": "op_page",
  "type": "video",
  "video": { "videoId": "op_main", "fit": "contain", "audioMode": "replace" },
  "autoAdvance": true,
  "target": "chapter_1",
  "effects": []
}
```

Video pages are story pages, not runtime plugin code. `target` is a scene id used after completion when `autoAdvance` is true. `loop: true` cannot be combined with `autoAdvance: true`. Page-enter `effects` may use the same supported terminal effect contract as normal pages.

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

## Game UI Style Presets

Game UI style presets are built-in authoring recipes, not stored project state. Do not add `ui.stylePreset` to a script. Agents use `list-ui-style-presets` to inspect the catalog and `apply-ui-style-preset` to write normal editable sections:

- `ui.theme`
- `ui.titleScreen`
- `ui.dialogueBox`
- `ui.widgetStyles`
- `ui.gameMenu`
- `ui.saveLoadScreen`
- `ui.backlogScreen`
- `ui.settingsScreen`
- `ui.motion`

Built-in preset ids are `classic-adv`, `glass-school`, `dark-cinema`, `suspense-noir`, `sci-fi-hud`, and `soft-romance`. Supported scopes are `all`, `dialogue`, `choices`, and `screens`; `screens` covers title plus major screens.

The no-code Project Settings preset cards use the same shared contract as agents. Applying a preset is rollback-friendly because it mutates only these canonical UI sections; validation warns if an opaque `ui.stylePreset` field appears. Title screen preset patches are limited to asset-free text/button `ui.titleScreen.elements`, not BGM, particles, HTML/CSS, or a layout DSL. Preset application returns an `impactSummary` with section labels, changed paths, and whether existing config will be touched; UI and agent flows should present that summary before applying broad visual changes.

## Agent Effect Packs

Milestone 11 shipped a manifest-only + built-in adapter thin slice; see [milestone-11-effect-packs-feasibility-security-audit.md](../milestone-11-effect-packs-feasibility-security-audit.md). Effect-pack project assets are data-only declarations under `assets.effectPacks`, and page references live at `scenes.<sceneId>.pages.<pageIndex>.effectPacks`.

Supported manifest fields include `id`, `kind: "postprocess"`, `version: 1`, `label`, `adapter`, `paramsSchema`, `defaults`, `files`, `performance`, and `capabilities`. Manifest `files[]` entries are objects such as `{ "path": "effects/old_film/preview.png", "role": "preview" }` and must stay inside `effects/<id>/`. The only shipped runtime adapter is `canvas2d:film-flicker`; unknown adapters validate with warnings and do not run.

Agents may use `register-effect-pack`, `list-effect-packs`, `set-page-effect-pack`, and `clear-page-effect-packs`, including through `apply-plan`. Changed page paths route to author-check preview targets and `effect-pack-preview` handoff review items. Export scans the `effects` bucket and copies only manifest-listed referenced files.

Agents must not add project-local `runtime.js` references, arbitrary JavaScript, CSS/HTML snippets, WebGL/shader code, plugin marketplace metadata, generic visual DSL data, or AI chat fields to `script.json`. The runtime boundary remains built-in Canvas 2D adapters only.
