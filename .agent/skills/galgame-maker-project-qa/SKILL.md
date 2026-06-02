---
name: galgame-maker-project-qa
description: Run final quality review, playtest planning, validation, branch graph checks, unlock checks, preview planning, handoff review, and export-readiness for Galgame Maker projects. Use when the user asks whether a game is complete, ready to publish, ready for demo video, safe to export, or wants an AI agent to find remaining authoring issues before release.
---

# Galgame Maker Project QA

Use this before declaring a Galgame Maker project complete.

## Run Gates

```bash
git status --short --branch
npm run validate:project -- --json
npm run vn:lint-layout -- --json
npm run vn:readiness -- --json
npm run vn -- graph-report --script public/game/script.json --json
npm run vn -- find-dead-ends --script public/game/script.json --json
npm run vn -- find-missing-assets --script public/game/script.json --asset-root public/game --json
npm run vn -- find-unused-assets --script public/game/script.json --asset-root public/game --json
```

If there is an apply transaction, also run:

```bash
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --review-out .tmp/review-handoff.json --json
```

If this is final visual QA and screenshots are available, require screenshots:

```bash
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --require-preview-screenshot --review-out .tmp/review-handoff.json --json
```

## Review Checklist

Check:

- Validation errors.
- Export-readiness blockers.
- Missing assets.
- Dead ends and broken choice targets.
- Unreachable endings.
- Unreachable CG unlocks.
- Variables used before registration.
- Conditions that reference unknown variables or scenes.
- Layout warnings on changed pages.
- Preview targets for changed scenes, screens, gallery, endings, particles, transitions, and effect packs.

## Output

Lead with findings by severity. Say "no blocker found" only when validation, readiness, and route checks have no blockers. Include remaining warnings and human review items.

## References

- `../../../docs/agent-authoring/validation-rules.md` for gate meanings.
- `../../../docs/agent-authoring/human-review-tutorial.md` for editor review flow.
- `../../../docs/agent-authoring/workflow.md` for full lifecycle gates.
- `../../../docs/agent-authoring/agent-checklist.md` for compact command order.

## Do Not

- Do not call a project release-ready with validation errors or readiness blockers.
- Do not hide warnings that need human review.
- Do not treat planned preview targets as screenshot proof when screenshot capture was required.
