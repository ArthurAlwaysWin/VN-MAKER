# External Agent Checklist

Paste this checklist into Codex, Claude, opencode, GitHub Copilot, or another external agent when it edits a Galgame Maker project.

## Boundary

- The human talks to the external agent; the desktop editor remains the human review surface.
- Do not build or imply an in-editor AI chat assistant.
- Edit through repo-owned authoring APIs, CLI commands, contracts, validation, preview, and handoff artifacts.
- Preserve user work. Do not restore stashes or revert unrelated changes unless the human explicitly asks.

## Start Here

```bash
git status --short --branch
npm run vn:inspect -- --json
npm run vn:report -- --json
npm run validate:project -- --json
```

Read the current project shape before making changes.

For prose adaptation, staging, or screen UI work, also inspect assets:

```bash
npm run vn -- list-assets --script public/game/script.json --json
```

Use semantic asset names from `docs/agent-authoring/asset-naming-guidelines.md`; mention ambiguous or missing assets in the handoff.

## Choose The Edit Path

- Prose or outline input: first show an adaptation preview like `docs/agent-authoring/example-adaptation-preview.md`, then create a structured draft that follows `docs/agent-authoring/structured-draft-contract.md`.
- Multi-step project edit: create an apply-plan manifest that follows `docs/agent-authoring/plan-manifest.md`.
- Small targeted edit: use `tools/vn-author/index.js` commands or `src/authoring/projectSession.js`.
- Avoid raw `script.json` edits unless no API or CLI command can express the change.

## Draft To Plan

```bash
npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --dry-run --json
```

Review:

- `operations[]`
- `warnings[]`
- `changeSummary.changedPaths`
- `changeSummary.validation`

## Apply

```bash
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

Rules:

- Use `--checkpoint` for multi-step writes.
- Keep `.tmp/apply-plan-result.json`; later gates consume it.
- If validation blocks the write, repair the plan instead of using `--allow-invalid` unless the user explicitly asked for an intermediate invalid state.

## Check

```bash
npm run validate:project -- --json
npm run vn:author-check -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
npm run vn:lint-layout -- --json
npm run vn:readiness -- --json
```

`author-check --transaction` focuses changed scenes/pages and supported changed screen UI paths, then writes a preview plan without needing a browser.

## Preview

When Playwright and Chromium are available:

```bash
npm run vn:render-preview -- --script public/game/script.json --scene start --page 0 --out .tmp/preview.png --json
```

When browser preview is unavailable:

```bash
npm run vn:render-preview -- --script public/game/script.json --scene start --page 0 --out .tmp/preview.png --dry-run --write-plan --json
```

Treat runtime preview as the visual source of truth. Repair blank, low-variety, or wrong-target previews before handoff.

## Handoff

```bash
npm run vn:handoff-report -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-editor-handoff --note "Review the external-agent changes." --json
```

The editor reads `agent-handoff.json` and shows gates, changed paths, review items, checkpoint information, and locate actions.

## Final Response To Human

Include:

- Scenes/pages/characters/variables changed.
- `changeSummary.changedPaths`.
- Remaining validation, layout, readiness, or preview warnings.
- Checkpoint path and rollback command when available.
- What the human should review in the no-code editor.

## Do Not

- Do not invent unsupported script fields, effects, or `commands[]`.
- Do not build CG gallery, ending list, or in-editor AI assistant flows unless the human explicitly asks for that scope.
- Do not skip validation after meaningful edits.
- Do not finish with validation errors or readiness blockers unless the human explicitly accepts them.
- Do not treat a dry-run preview plan as visual confirmation when actual screenshot rendering is available.
