---
name: galgame-maker-visual-polish
description: Improve Galgame Maker visual quality, atmosphere, transitions, particles, screen presentation, title mood, dialogue/choice feel, and built-in effect pack usage. Use when the user asks an AI agent to make a project look more finished, cinematic, romantic, suspenseful, polished, atmospheric, rainy, snowy, sakura-filled, or to add supported Canvas2D transitions/effects without expanding the safety boundary.
---

# Galgame Maker Visual Polish

Use this for visual style and game-feel work that must remain editable, validated, previewable, and exportable.

## Boundary

Use only structured commands, apply-plan manifests, supported UI config, supported transitions, supported particles, and reviewed built-in Canvas2D effect adapters.

Milestone 11 effect packs are manifest-only and built-in-adapter-only. Do not add project-local code.

## Inspect

```bash
git status --short --branch
npm run vn -- inspect --script public/game/script.json --json
npm run vn -- export-report --script public/game/script.json --json
npm run vn -- list-assets --script public/game/script.json --json
npm run vn -- list-transitions --target background --supported-only --json
npm run validate:project -- --json
```

## Apply

For broad polish, create one coherent apply-plan covering the relevant surfaces:

- Theme and widget styles.
- Dialogue box and choice UI.
- Title screen and major screens.
- Page transitions.
- Page particles.
- Manifest-only effect packs using built-in adapters.

For screen-heavy requests, use `galgame-maker-screen-ui`.

## Verify

```bash
npm run vn:apply-plan -- .tmp/visual-polish-plan.json --script public/game/script.json --validate-only --result-out .tmp/visual-polish-validation.json --json
npm run vn:apply-plan -- .tmp/visual-polish-plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- .tmp/visual-polish-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/visual-polish-result.json --json
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/visual-polish-result.json --write-preview-plan --write-editor-handoff --review-out .tmp/visual-polish-handoff.json --json
```

## References

- `../../../docs/agent-authoring/visual-polish-skill.md` for visual workflow details.
- `../../../docs/agent-authoring/screen-ui-skill.md` for screen UI.
- `../../../docs/agent-authoring/mini-workflows.md` for transitions, particles, and effect packs.
- `../../../docs/milestone-11-effect-packs-feasibility-security-audit.md` for effect-pack safety boundary.
- `../../../docs/agent-authoring/command-reference.md` for supported commands.

## Do Not

- Do not write project-local JavaScript, runtime files, shaders, WebGL, raw CSS/HTML, plugin marketplace metadata, AI chat fields, or generic visual DSL fields.
- Do not invent unsupported transition, particle, or effect-pack ids.
- Do not claim visual quality from dry-run output alone when screenshot preview is available.
