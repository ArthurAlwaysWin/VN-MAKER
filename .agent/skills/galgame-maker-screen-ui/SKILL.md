---
name: galgame-maker-screen-ui
description: Design or revise Galgame Maker screen UI through structured editor-owned configuration. Use when the user asks for title screen, settings, game menu, save/load, backlog, dialogue box, choice UI, quick action bar, theme styling, or asks an AI agent to recreate a reference screenshot as editable Galgame Maker UI.
---

# Galgame Maker Screen UI

Use structured UI config and official commands. Keep the no-code editor as the review and polish surface.

## Intake

If the user asks for a screen design, ask for a reference screenshot or a short style direction unless they already provided one.

Capture:

- Screen type.
- Mood and palette.
- Required text.
- Required assets.
- Layout reference.
- Fallbacks for anything unsupported.

## Implement

Prefer:

- `set-title-screen`
- `add-title-element`
- `update-title-element`
- `remove-title-element`
- `set-screen-layout`
- `set-dialogue-box`
- `set-theme`
- `set-widget-styles`
- `apply-ui-style-preset` when available and appropriate.

Use apply-plan for multi-step UI changes and include reference screenshot notes in `handoff.referenceScreenshotNotes` when applicable.

## Verify

After writing:

```bash
npm run vn:author-check -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --review-out .tmp/review-handoff.json --json
```

When screenshot capture is required and available, add `--require-preview-screenshot`.

For an explicit whole-project canonical UI migration, never use a real project as an unconfirmed test fixture. Run `migrate-ui-project` with `--validate-only`, then `--dry-run`, then `--force --checkpoint --result-out`; review exact changed paths and finish by exercising `restore-checkpoint`. Opening a project must not perform this migration. Include all seven screens and the Text Input, Confirmation, and Video Controls overlays in preview/handoff review.

## References

- `../../../docs/agent-authoring/screen-ui-skill.md` for full screen UI workflow.
- `../../../docs/agent-authoring/command-reference.md` for supported UI commands.
- `../../../docs/agent-authoring/layout-rules.md` for layout safety.
- `../../../docs/agent-authoring/visual-polish-skill.md` when screen UI is part of a broader polish pass.

## Do Not

- Do not write arbitrary HTML or CSS into project data.
- Do not invent unsupported `ui.*` fields.
- Do not overwrite existing title buttons, BGM, or custom elements without intent.
- Do not claim reference fidelity until preview evidence or human review confirms it.
