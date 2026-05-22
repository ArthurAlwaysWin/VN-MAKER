# Asset Naming Guidelines For External Agents

Good asset names make agent-authored visual novels easier to adapt, validate, preview, and review. `list-assets` exposes filename tokens to agents, so names should describe what the asset is and when to use it.

## Naming Rules

- Use lowercase, ASCII, and underscores: `rainy_school_gate.png`.
- Put files under the editor-owned category folders:
  - `assets/backgrounds/`
  - `assets/characters/`
  - `assets/audio/`
  - `assets/voices/`
  - `assets/ui/`
  - `assets/fonts/`
- Prefer semantic names over numbered dumps. Use `sakura_nervous.png`, not `IMG_0042.png`.
- Include the most useful matching words: subject, location, mood, time, expression, or UI role.
- Keep names stable after agents reference them in `script.json`.
- Avoid spaces, punctuation-heavy names, and ambiguous one-word names like `bg.png` or `button.png`.

## Recommended Patterns

| Category | Pattern | Example |
| --- | --- | --- |
| Backgrounds | `<location>_<mood_or_time>.<ext>` | `backgrounds/school_gate_rainy.png` |
| Character expressions | `<character>_<expression>.<ext>` | `characters/sakura_nervous.png` |
| BGM | `<mood_or_scene>_theme.<ext>` | `audio/rain_theme.ogg` |
| SE | `<sound_or_action>.<ext>` | `audio/rain_loop.ogg` |
| Voices | `<character>_<scene_or_line>.<ext>` | `voices/sakura_line_001.wav` |
| UI images | `<screen_or_widget>_<role>.<ext>` | `ui/title_logo.png` |
| Fonts | `<family_or_style>.<ext>` | `fonts/story_serif.ttf` |

## Agent Matching

Before planning prose adaptation, staging, or screen UI work, run:

```bash
npm run vn -- list-assets --script path/to/script.json --json
```

The output includes entries like:

```json
{
  "path": "backgrounds/school_gate_rainy.png",
  "name": "school_gate_rainy",
  "tokens": ["school", "gate", "rainy"],
  "extension": ".png",
  "size": 42144
}
```

Agents should match story needs against `tokens`, then cite the exact `path` in adaptation previews, draft plans, and handoff notes.

## Ambiguous Or Missing Assets

When names are unclear:

- mention the ambiguity in the adaptation preview or handoff;
- prefer the closest existing asset only if the visual meaning is still honest;
- ask for a human decision when several files are plausible;
- keep the project playable when possible, but mark missing or placeholder assets explicitly.

Examples:

- `characters/sakura.png` is ambiguous if the scene needs Sakura nervous.
- `backgrounds/bg01.png` should be renamed or documented before agent matching depends on it.
- `ui/button.png` is ambiguous; prefer `ui/game_menu_button_normal.png`.

## Future Metadata

Filename tokens are the current supported semantic layer. A future project-local metadata file may add explicit tags, descriptions, character ids, and expression names, but agents should not require that file until the authoring layer implements it.

Possible future shape:

```json
{
  "assets": {
    "characters/sakura_nervous.png": {
      "type": "character-expression",
      "characterId": "sakura",
      "expression": "nervous",
      "tags": ["sakura", "nervous", "rainy"],
      "description": "Sakura's nervous expression for rainy school scenes."
    }
  }
}
```
