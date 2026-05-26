# End-To-End Agent Authoring Example

This example shows the intended external-agent flow:

1. Turn prose into a structured plan.
2. Dry-run the plan.
3. Apply it with checkpoint and result capture.
4. Run the continuous review/handoff gate.
5. Open the generated `agent-handoff.json` in the no-code editor.

For the release-hardening example that exercises affection, two endings, one CG unlock, condition routing, and transitions together, use [example-plan.json](./example-plan.json). The human review steps are in [human-review-tutorial.md](./human-review-tutorial.md).

## Executable Multi-Ending Route

To generate an editor-openable example project with illustrative assets and run the whole acceptance chain in one command:

```bash
npm run verify:agent-example -- --out .tmp/agent-example-project --json
```

The output directory contains `project.json`, `script.json`, `assets/`, `agent-handoff.json`, and review artifacts under `review/`. Pass `--force` to rebuild that generated directory after the initial run; the verifier refuses to replace directories it did not generate.

The checked-in plan can be validated and applied to a fresh or disposable project shell:

```bash
npm run vn:apply-plan -- docs/agent-authoring/example-plan.json --script public/game/script.json --validate-only --result-out .tmp/multi-ending-validation.json --json
npm run vn:apply-plan -- docs/agent-authoring/example-plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- docs/agent-authoring/example-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/multi-ending-result.json --json
```

The resulting route is:

```text
start -- choice/effect --> route_check -- affection >= 1 --> good_ending + good_end unlock
                                      \-- otherwise -----> quiet_ending + quiet_end unlock
```

The honest choice also unlocks `cg_confession`; supported transition operations polish the visible pages. The one-command verifier creates the referenced SVG example assets and completes `author-check`, `handoff-report`, graph analysis, and `export-readiness`. When adapting the plan to another project, register real assets and run the same gates against that project.

## User Request

> Add a small opening branch: Sakura meets the player at the school gate, the player can smile back, and that raises Sakura affection before entering her route.

## Draft Plan

An external agent can either write the plan directly or first convert a structured draft. The draft path is useful when the user starts with prose and the agent wants a visible intermediate artifact:

```bash
npm run vn:draft-plan -- docs/agent-authoring/example-draft.json --out .tmp/example-draft-plan.json --require-adaptation-preview --json
```

Review the generated plan before applying it:

```bash
.tmp/example-draft-plan.json
```

## Dry Run

```bash
npm run vn:apply-plan -- .tmp/example-draft-plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/example-draft-plan.json --script public/game/script.json --dry-run --json
```

Review:

- `transaction.status`
- `operations[]`
- `changeSummary.changedPaths`
- `changeSummary.validation`

`--validate-only` writes no project files or checkpoints. It is useful when the agent wants a saved proof artifact before the real apply step.

## Apply

```bash
npm run vn:apply-plan -- .tmp/example-draft-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

The result file is useful because `handoff-report` can attach the transaction summary later.

## Review And Handoff

```bash
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --review-out .tmp/review-handoff.json --note "Review Sakura opening branch and placeholder assets." --json
```

With `--transaction`, the continuous gate reads `changeSummary.changedPaths`, focuses layout/readiness review on changed scenes/pages, writes preview targets, and generates the editor handoff in one run. Add `--require-preview-screenshot` for delivery that must include captured quality-checked preview images.

Open the project in the desktop editor. Project Settings will show the external-agent handoff panel when `agent-handoff.json` exists at the project root.

## Summary For The Human

Tell the creator:

- Which scenes and pages were created.
- Which paths changed.
- Which checkpoint can be restored.
- Which warnings remain.
- What to review visually in the editor.
