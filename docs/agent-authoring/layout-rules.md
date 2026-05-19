# Agent Layout Rules

Use layout presets before custom coordinates. Presets keep agent-authored pages editable in the no-code editor and predictable in runtime preview.

## Presets

| Preset | Use For | CLI Example |
| --- | --- | --- |
| `solo-center` | One visible speaker | `--preset solo-center --character sakura:smile` |
| `duo-left-right` | Two-person dialogue | `--preset duo-left-right --character sakura:smile --character haruki:normal` |
| `trio-left-center-right` | Three-person scene | `--preset trio-left-center-right --character a --character b --character c` |
| `speaker-emphasis` | Speaker centered and slightly larger | `--preset speaker-emphasis --speaker sakura --character sakura:smile --character haruki` |
| `narration-no-character` | Establishing narration page | `--preset narration-no-character` |
| `choice-focus` | Choice page staging | `--preset choice-focus --character sakura:normal` |

Preset output is canonical page character data:

```json
[
  { "id": "sakura", "expression": "smile", "position": "left", "x": null, "y": null, "scale": 1 },
  { "id": "haruki", "expression": "normal", "position": "right", "x": null, "y": null, "scale": 1 }
]
```

## Layout Lint

Run layout lint after meaningful page edits:

```bash
node tools/vn-author/index.js lint-layout --script public/game/script.json --json
```

`export-report` also includes a `layout` section:

```bash
node tools/vn-author/index.js export-report --script public/game/script.json --json
```

## Current Warning Codes

| Code | Meaning | Usual Fix |
| --- | --- | --- |
| `layout-blank-page` | Normal page has no visible or textual content. | Add background, characters, or dialogue. |
| `layout-dialogue-on-blank-stage` | Dialogue exists but the stage is visually empty. | Add a background or character blocking. |
| `layout-too-many-characters` | More than 3 characters are staged. | Split the beat or use custom coordinates deliberately. |
| `layout-overlapping-character-position` | Two characters share the same position. | Use a preset or distinct `left`/`center`/`right` positions. |
| `layout-dialogue-text-overflow-risk` | Dialogue text may overflow. | Split the line into shorter dialogue entries. |
| `layout-choice-missing-prompt` | Choice page has options but no prompt. | Add `--prompt`. |
| `layout-too-many-choice-options` | Choice page has more than 4 options. | Split choices or review visually. |
| `layout-choice-text-overflow-risk` | Choice option text may wrap poorly. | Shorten option text. |

Layout lint is heuristic. Runtime preview remains the visual source of truth once screenshot rendering is available.

## Runtime Preview

Render a specific scene/page when Playwright is available:

```bash
node tools/vn-author/index.js render-preview --script public/game/script.json --scene start --page 0 --out .tmp/preview.png --json
```

The command uses the runtime iframe preview protocol:

1. Start a local Vite server.
2. Load `index.html` inside a preview harness iframe.
3. Respond to the runtime `ready` handshake with `ack-preview`.
4. Send the canonical script plus `sceneId` and `pageIndex`.
5. Capture the rendered page screenshot.
6. Run PNG quality checks for viewport size, transparency, and blank/near-solid frames.

Successful JSON output includes `quality.ok: true`. If Playwright is installed but the browser binary is missing, run:

```bash
npx playwright install chromium
```

Use `--dry-run --write-plan` to confirm the target and output path without launching a browser.
