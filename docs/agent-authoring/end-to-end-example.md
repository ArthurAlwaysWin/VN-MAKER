# End-To-End Agent Authoring Example

This example shows the intended external-agent flow:

1. Turn prose into a structured plan.
2. Dry-run the plan.
3. Apply it with checkpoint and result capture.
4. Run author-check.
5. Generate `agent-handoff.json` for the no-code editor.

## User Request

> Add a small opening branch: Sakura meets the player at the school gate, the player can smile back, and that raises Sakura affection before entering her route.

## Draft Plan

An external agent can either write the plan directly or first convert a structured draft. The draft path is useful when the user starts with prose and the agent wants a visible intermediate artifact:

```bash
npm run vn:draft-plan -- docs/agent-authoring/example-draft.json --out .tmp/example-draft-plan.json --json
```

Review the generated plan before applying it:

```bash
.tmp/example-draft-plan.json
```

## Dry Run

```bash
npm run vn:apply-plan -- .tmp/example-draft-plan.json --script public/game/script.json --dry-run --json
```

Review:

- `transaction.status`
- `operations[]`
- `changeSummary.changedPaths`
- `changeSummary.validation`

## Apply

```bash
npm run vn:apply-plan -- .tmp/example-draft-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

The result file is useful because `handoff-report` can attach the transaction summary later.

## Check

```bash
npm run vn:author-check -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
```

With `--transaction`, author-check reads `changeSummary.changedPaths`, focuses layout/readiness review on changed scenes/pages, and plans preview for the first changed page unless `--scene` and `--page` are provided. If this returns issues or suggestions, repair with another small plan or direct CLI mutation.

## Handoff

```bash
npm run vn:handoff-report -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-editor-handoff --note "Review Sakura opening branch and placeholder assets." --json
```

Open the project in the desktop editor. Project Settings will show the external-agent handoff panel when `agent-handoff.json` exists at the project root.

## Summary For The Human

Tell the creator:

- Which scenes and pages were created.
- Which paths changed.
- Which checkpoint can be restored.
- Which warnings remain.
- What to review visually in the editor.
