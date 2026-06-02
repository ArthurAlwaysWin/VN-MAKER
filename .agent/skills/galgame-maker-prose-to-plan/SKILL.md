---
name: galgame-maker-prose-to-plan
description: Turn raw novel prose, chapter drafts, outlines, or story notes into a Galgame Maker visual novel plan. Use when the user provides fiction text and wants an AI agent to make a game, scene, route, or VN draft. This skill requires a human-readable adaptation preview with characters, scenes, pages, dialogue, choices, variables, conditions, endings, and CG before any file mutation.
---

# Galgame Maker Prose To Plan

Use this when the user's main input is prose or an outline rather than an existing structured plan.

## First Response

Do not write files first. Produce an adaptation preview for human approval.

The preview must include:

- Characters and expression needs.
- Scenes and backgrounds.
- Page beats.
- Dialogue and narration shape.
- Choices and route targets.
- Variables and effects.
- Conditions.
- Endings.
- CG unlocks or major CG needs.
- Missing or placeholder assets.

Ask for confirmation before converting the preview into a draft when the adaptation invents choices, rewrites meaning, adds dialogue, or depends on missing assets.

## After Approval

1. Inspect assets before choosing concrete filenames:

```bash
npm run vn -- list-assets --script public/game/script.json --json
```

2. Create a structured draft that follows `structured-draft-contract.md`.
3. Include `adaptationPreview` metadata with approval, reviewed asset status, beat count, choice count, and missing assets.
4. Convert the draft into an apply-plan:

```bash
npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --require-adaptation-preview --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --review-out .tmp/review-handoff.json --json
```

## References

- `../../../docs/agent-authoring/novel-adaptation-skill.md` for the full adaptation workflow.
- `../../../docs/agent-authoring/example-adaptation-preview.md` for the preview shape.
- `../../../docs/agent-authoring/structured-draft-contract.md` for draft fields.
- `../../../docs/agent-authoring/asset-naming-guidelines.md` for asset names.
- `../../../docs/agent-authoring/end-to-end-example.md` for a complete route example.

## Do Not

- Do not paste long prose verbatim into dialogue by default.
- Do not invent concrete asset paths without noting whether they exist.
- Do not register ending or CG unlock effects before the ending/CG registry entry exists.
- Do not skip the adaptation preview gate for prose-derived work.
