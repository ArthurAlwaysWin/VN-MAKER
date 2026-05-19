# End-To-End Agent Authoring Example

This example shows the intended external-agent flow:

1. Turn prose into a structured plan.
2. Dry-run the plan.
3. Apply it with checkpoint and result capture.
4. Run author-check.
5. Generate `agent-handoff.json` for the no-code editor.

## User Request

> Add a small opening branch: Sakura meets the player at the school gate, the player can smile back, and that raises Sakura affection before entering her route.

## Plan

Use the checked-in sample:

```bash
docs/agent-authoring/example-plan.json
```

## Dry Run

```bash
npm run vn:apply-plan -- docs/agent-authoring/example-plan.json --script public/game/script.json --dry-run --json
```

Review:

- `transaction.status`
- `operations[]`
- `changeSummary.changedPaths`
- `changeSummary.validation`

## Apply

```bash
npm run vn:apply-plan -- docs/agent-authoring/example-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

The result file is useful because `handoff-report` can attach the transaction summary later.

## Check

```bash
npm run vn:author-check -- --script public/game/script.json --scene start --page 0 --write-preview-plan --json
```

If this returns issues or suggestions, repair with another small plan or direct CLI mutation.

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
