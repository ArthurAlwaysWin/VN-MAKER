# Agent Authoring Docs

This directory contains the active contracts, workflows, references, and historical notes for external-agent authoring in Galgame Maker.

Start here before opening individual files. Most tasks need only one workflow guide plus one reference document.

## Read First

| Need | Read |
| --- | --- |
| Compact agent checklist | [agent-checklist.md](./agent-checklist.md) |
| Full authoring workflow | [workflow.md](./workflow.md) |
| CLI and apply-plan command surface | [command-reference.md](./command-reference.md) |
| Cross-cutting integration rules | [integration-contract.md](./integration-contract.md) |

## Agent DSL

Agent DSL is an authoring source format only. It compiles to apply-plan operations; `script.json` remains the canonical project contract.

| Need | Read |
| --- | --- |
| DSL syntax and day-to-day usage | [agent-dsl.md](./agent-dsl.md) |
| Compiler architecture and safety boundaries | [agent-dsl-architecture.md](./agent-dsl-architecture.md) |
| Completed P0-P9 phase history and acceptance criteria | [agent-dsl-roadmap.md](./agent-dsl-roadmap.md) |

Use the roadmap as historical implementation context, not as a daily operating manual.

## Contracts

| Contract | Read |
| --- | --- |
| Canonical `script.json` shape | [project-contract.md](./project-contract.md) |
| Multi-operation plan manifest | [plan-manifest.md](./plan-manifest.md) |
| Structured draft import shape | [structured-draft-contract.md](./structured-draft-contract.md) |
| Validation, readiness, and diagnostic rules | [validation-rules.md](./validation-rules.md) |
| Layout safety rules | [layout-rules.md](./layout-rules.md) |
| Asset naming conventions | [asset-naming-guidelines.md](./asset-naming-guidelines.md) |

## Task Workflows

| Task | Read |
| --- | --- |
| General authoring rules for prompt injection | [skill.md](./skill.md) |
| Focused edits and short command chains | [mini-workflows.md](./mini-workflows.md) |
| Prose or outline adaptation | [novel-adaptation-skill.md](./novel-adaptation-skill.md) |
| Title/settings/menu/save/load/backlog UI | [screen-ui-skill.md](./screen-ui-skill.md) |
| Visual polish, transitions, particles, effect packs | [visual-polish-skill.md](./visual-polish-skill.md) |
| Human editor review | [human-review-tutorial.md](./human-review-tutorial.md) |

## Examples

| Example | Use |
| --- | --- |
| [example-plan.json](./example-plan.json) | Executable multi-ending apply-plan reference |
| [example-draft.json](./example-draft.json) | Structured draft example |
| [example-adaptation-preview.md](./example-adaptation-preview.md) | Prose-to-VN preview shape |
| [end-to-end-example.md](./end-to-end-example.md) | Full route from draft/plan to handoff |

## Completed Plans And Migration Notes

These documents preserve completed roadmap context and extension guidance. Prefer the active contracts above when guidance overlaps.

| Document | Role |
| --- | --- |
| [roadmap.md](./roadmap.md) | Completed external-agent authoring roadmap |
| [implementation-plan.md](./implementation-plan.md) | Completed implementation plan and extension framework |
| [phase-83-migration.md](./phase-83-migration.md) | Migration notes for older Phase 83 project data |

## Maintenance Rules

- Add new behavior to the smallest relevant active contract instead of creating a new top-level doc by default.
- Keep phase plans and release notes historical once their work is complete.
- When command behavior changes, update [command-reference.md](./command-reference.md) and any affected workflow.
- When project data changes, update [project-contract.md](./project-contract.md) and [validation-rules.md](./validation-rules.md).
- Do not document Agent DSL as runtime scripting. It remains compile-to-plan authoring source.
