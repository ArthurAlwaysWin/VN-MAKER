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
- A formal structured draft contract documents supported fields, defaults, and conversion rules.

Gaps:

- Prose-to-draft guidance is spread across workflow/skill docs instead of a compact prompt contract.
- Generated plan metadata does not yet include enough provenance for large multi-scene drafts, such as source beat ids and prose spans.

Priority:

- P2: add richer provenance to `draft-plan` operations.

### 2. Transaction Execution

Current:

- `apply-plan` supports ordered multi-operation edits, dry-run, checkpoint, result capture, validation-blocked writes, and rollback descriptors.
- Operation failures return structured `operationFailure` payloads for unsupported commands and missing params.
- Common operation failures include machine-readable `suggestedAction.repairHint` payloads so external agents can patch a plan and retry.
- `--result-out` persists both success and operation failure payloads.
- `apply-plan --validate-only` executes a manifest in memory, runs validation, and can save a non-mutating validation artifact.
- A dedicated command reference documents supported `apply-plan` operations, required params, aliases, and repair hints.

Gaps:

Priority:

### 3. Quality Gates

Current:

- Validation, layout lint, export readiness, preview dry-run, and `author-check` exist.
- Scene reference diagnostics are included in `author-check` and handoff review items.
- Example workflows run through dry-run, apply, author-check, and handoff.
- `author-check --transaction result.json` reads changed paths from an apply result, focuses changed scene/page diagnostics, and plans preview targets for all changed scene pages while preserving a primary preview target for compatibility.

Gaps:

- Handoff and author-check are adjacent rather than one continuous command that consumes an apply result and checks exactly changed content.
- Preview screenshot quality is available, but the workflow still tolerates dry-run preview in common paths.

Priority:

### 4. Human Handoff

Current:

- `handoff-report` writes `agent-handoff.json`.
- Project Settings shows gates, transaction summary, changed paths, and review items.
- Project Settings groups handoff changed paths and review items by scene/path category.
- Project Settings can track local review item lifecycle state: open, acknowledged, and resolved.
- PageEditor scene tree shows agent-changed scenes, changed pages, incoming reference counts, and review counts.
- Project Settings can locate scene/page paths in PageEditor.
- Project Settings can route non-scene paths such as variables, characters, assets, and UI paths to the closest editor surface.

Gaps:

- Review item lifecycle state is local to the editor and is not written back into the handoff artifact.

Priority:

### 5. Agent Documentation And Examples

Current:

- Workflow, plan manifest, validation rules, layout rules, skill docs, example draft, example plan, and end-to-end example exist.
- Example plan and example draft are tested against the CLI.
- The end-to-end example uses the generated draft plan for dry-run and apply steps.
- A compact external-agent checklist maps Codex, Claude, opencode, and GitHub Copilot to the same command contract.
- External-agent docs use the shared `npm run vn -- <command>` style for generic CLI commands.
- README links to the external-agent authoring workflow.
- Focused mini-workflows cover adding scenes, revising dialogue, staging characters, setting media, adding branches, and preparing handoff.

Gaps:

Priority:

### 6. Regression Protection

Current:

- Focused tests cover authoring API, CLI, draft import, draft-plan, plan examples, handoff, editor handoff display, and scene graph helpers.
- A full-chain CLI artifact test covers `draft-plan -> apply-plan --result-out -> author-check -> handoff-report --write-editor-handoff`.
- `npm run test:focused` and `npm run build` are the current closure gates for this branch.

Gaps:

- Editor tests are mostly static/source-level for handoff UX rather than mounted component tests.

Priority:

- P2: add component-level handoff UX tests when test harness support is ready.

## Current Branch Closure Gate

Before considering this branch ready for review:

- `npm run test:focused` passes.
- `npm run build` passes.
- Docs name the external-agent path clearly and do not imply an in-editor AI assistant.
