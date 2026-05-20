# External Agent Authoring Roadmap

This roadmap is the working plan for the external AI agent authoring layer.

The older high-level plan lives in `docs/agent-authoring-architecture.md`, especially Phase I. This file turns that architecture into a prioritized implementation and audit checklist for the current branch.

## Product Boundary

Goal: users talk to external agents such as Codex, Claude, opencode, or GitHub Copilot. Those agents edit the same no-code visual novel project through repo-owned APIs, CLI commands, contracts, validation, preview, author-check, and handoff artifacts.

Non-goal: an in-editor AI chat assistant. The editor remains the human review and polishing surface.

## Completion Map

### 1. Input And Planning

Current:

- Structured draft import exists through `import-draft`.
- Structured draft to apply-plan conversion exists through `draft-plan`.
- Checked-in draft and plan examples are covered by CLI tests.

Gaps:

- Draft schema is documented by examples, not yet a formal schema reference.
- Prose-to-draft guidance is spread across workflow/skill docs instead of a compact prompt contract.
- Generated plan metadata does not yet include enough provenance for large multi-scene drafts, such as source beat ids and prose spans.

Priority:

- P1: document the structured draft contract.
- P2: add richer provenance to `draft-plan` operations.

### 2. Transaction Execution

Current:

- `apply-plan` supports ordered multi-operation edits, dry-run, checkpoint, result capture, validation-blocked writes, and rollback descriptors.
- Operation failures return structured `operationFailure` payloads for unsupported commands and missing params.
- `--result-out` persists both success and operation failure payloads.

Gaps:

- Operation failure payloads do not yet include a machine-readable repair suggestion.
- There is no standalone plan schema validator command.
- Supported command docs are partly embedded in help text and examples.

Priority:

- P1: add plan schema/command reference docs.
- P1: add `validate-plan` or `apply-plan --validate-only`.
- P2: add repair suggestions for common failures.

### 3. Quality Gates

Current:

- Validation, layout lint, export readiness, preview dry-run, and `author-check` exist.
- Scene reference diagnostics are included in `author-check` and handoff review items.
- Example workflows run through dry-run, apply, author-check, and handoff.

Gaps:

- `author-check` checks a selected scene/page for preview/reference diagnostics, but not all changed paths from a transaction.
- Handoff and author-check are adjacent rather than one continuous command that consumes an apply result and checks exactly changed content.
- Preview screenshot quality is available, but the workflow still tolerates dry-run preview in common paths.

Priority:

- P1: let `author-check` accept `--transaction result.json` and focus checks on changed scenes/pages.
- P2: add all-changed-scenes preview planning.

### 4. Human Handoff

Current:

- `handoff-report` writes `agent-handoff.json`.
- Project Settings shows gates, transaction summary, changed paths, and review items.
- PageEditor scene tree shows agent-changed scenes, changed pages, incoming reference counts, and review counts.
- Project Settings can locate scene/page paths in PageEditor.

Gaps:

- Review items have no lifecycle in the editor, such as acknowledged/resolved.
- The editor does not yet group handoff items by scene in a dedicated review panel.
- Non-scene changed paths, such as characters or variables, do not have locate actions.

Priority:

- P1: group Project Settings handoff review by scene/path with clearer actions.
- P2: add locate actions for characters, variables, and assets.
- P3: add local acknowledgement state if the handoff review flow needs it.

### 5. Agent Documentation And Examples

Current:

- Workflow, plan manifest, validation rules, layout rules, skill docs, example draft, example plan, and end-to-end example exist.
- Example plan and example draft are tested against the CLI.

Gaps:

- Docs do not yet clearly map Codex/Claude/opencode/Copilot workflows to the same command contract.
- There is no compact "external agent checklist" that agents can paste into their own task context.
- Some command examples still use `node tools/...` while others use npm scripts.

Priority:

- P1: add an agent checklist doc.
- P2: normalize command style across docs.

### 6. Regression Protection

Current:

- Focused tests cover authoring API, CLI, draft import, draft-plan, plan examples, handoff, editor handoff display, and scene graph helpers.
- `npm run test:focused` and `npm run build` are the current closure gates for this branch.

Gaps:

- No single test asserts the complete draft-plan -> apply-plan -> author-check -> handoff-report chain with written artifacts.
- Editor tests are mostly static/source-level for handoff UX rather than mounted component tests.

Priority:

- P1: add one end-to-end CLI artifact test for the full external-agent chain.
- P2: add component-level handoff UX tests when test harness support is ready.

## Next Implementation Order

1. Add a tested full-chain CLI artifact example: `draft-plan -> apply-plan --result-out -> author-check -> handoff-report --write-editor-handoff`.
2. Add `author-check --transaction` so quality checks can focus on changed scenes/pages.
3. Add a formal structured draft contract doc.
4. Add plan schema validation or validate-only mode.
5. Improve Project Settings handoff grouping and non-scene path location.
6. Normalize external-agent docs into a compact checklist.

## Current Branch Closure Gate

Before considering this branch ready for review:

- `npm run test:focused` passes.
- `npm run build` passes.
- The full-chain CLI artifact example is tested.
- Docs name the external-agent path clearly and do not imply an in-editor AI assistant.
