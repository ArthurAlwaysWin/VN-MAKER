# External Agent Authoring Roadmap

This roadmap tracks the external AI agent authoring layer. For the active product/system roadmap covering variables, affection, endings, CG gallery, branch graph analysis, and transition expansion, see `docs/agent-first-vn-systems-plan.md`.

The older high-level plan now lives in `docs/archive/agent-authoring-architecture.md`. It is historical context only; follow `docs/agent-authoring/integration-contract.md` for current integration rules.

For cross-session development details, concrete task order, and acceptance criteria, see `docs/agent-authoring/implementation-plan.md`.

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
- Generated plan operations include provenance metadata for source characters, variables, scenes, beats, choices, source ids, and prose spans when present.
- A novel adaptation skill documents the required human-readable breakdown before turning raw prose into structured draft operations.
- A concrete adaptation preview example documents resource matching, choices, variables, and missing assets before draft creation.

Gaps:

- Prose-to-draft guidance is now linked across workflow, skill docs, and an example preview; it is not enforced by CLI because prose interpretation remains an external-agent responsibility.

### 2. Transaction Execution

Current:

- `apply-plan` supports ordered multi-operation edits, dry-run, checkpoint, result capture, validation-blocked writes, and rollback descriptors.
- Operation failures return structured `operationFailure` payloads for unsupported commands and missing params.
- Common operation failures include machine-readable `suggestedAction.repairHint` payloads so external agents can patch a plan and retry.
- `--result-out` persists both success and operation failure payloads.
- `apply-plan --validate-only` executes a manifest in memory, runs validation, and can save a non-mutating validation artifact.
- A dedicated command reference documents supported `apply-plan` operations, required params, aliases, and repair hints.

### 3. Quality Gates

Current:

- Validation, layout lint, export readiness, preview dry-run, and `author-check` exist.
- Scene reference diagnostics are included in `author-check` and handoff review items.
- Example workflows run through dry-run, apply, author-check, and handoff.
- `author-check --transaction result.json` reads changed paths from an apply result, focuses changed scene/page diagnostics, and plans preview targets for all changed scene pages while preserving a primary preview target for compatibility.
- `author-check --transaction result.json` also plans screen preview targets for changed title/settings/menu/save-load/backlog `ui.*` paths.
- CG registry changes produce gallery preview targets and review items for Story Systems and runtime gallery review.

Gaps:

- Handoff and author-check are adjacent rather than one continuous command that consumes an apply result and checks exactly changed content.
- Preview screenshot quality is available, but the workflow still tolerates dry-run preview in common paths.

Priority:

### 4. Human Handoff

Current:

- `handoff-report` writes `agent-handoff.json`.
- Project Settings shows gates, transaction summary, changed paths, preview targets, and review items.
- Project Settings groups handoff changed paths and review items by scene/path category.
- Project Settings can track local review item lifecycle state: open, acknowledged, and resolved.
- PageEditor scene tree shows agent-changed scenes, changed pages, incoming reference counts, and review counts.
- Project Settings can locate scene/page paths in PageEditor.
- Project Settings can route non-scene paths such as variables, characters, assets, and UI paths to the closest editor surface.
- Handoff artifacts include `previewTargets` for changed scene pages and supported screen UI paths, and Project Settings surfaces those targets for visual review.
- Handoff review items include categories for missing assets, unused assets, skipped asset checks, and required screen UI preview review.
- Handoff flags placeholder-like and highly ambiguous referenced asset names for human replacement or rename review.
- Handoff can carry reference screenshot fidelity notes from an apply-plan result into structured review items for Project Settings.
- Story Systems supports registered endings, terminal normal-page arrival unlocks and choice unlocks, plus a read-only, refreshable player-profile status so creators can distinguish authored unlock points from runtime unlock progress.
- Story Systems exposes editable CG registry entries with project asset selection for images/thumbnails and read-only, refreshable player-profile progress; choice effects can select registered `unlock:cg` targets, and the runtime gallery browses multi-image unlocked entries.
- Transition authoring exposes the shared catalog in page-inspector controls, supports directional background wipe rendering/preview and catalog-declared background fallbacks, and allows agents to apply background transitions to a scene, an inclusive page range, or bounded page-type/background predicates through `set-page-transitions`.
- Story Systems flow review exposes repair-ready broken scene links, unreachable ending/CG unlocks, asset handoff findings, per-scene review badges, and exact page/system navigation; CLI repair commands can retarget or clear references to missing target ids.

Gaps:

- Review item lifecycle state is local to the editor and is not written back into the handoff artifact.

### 4.5. External File Change Safety

Current:

- The editor records the loaded `script.json` file state.
- Saves are blocked when `script.json` changed on disk after load/save, preventing stale editor state from overwriting external agent edits.
- The editor polls for external `script.json` changes and shows a reload warning.

Gaps:

- The warning does not yet offer a structured diff/merge view.

Priority:

### 5. Agent Documentation And Examples

Current:

- Workflow, plan manifest, validation rules, layout rules, skill docs, example draft, example plan, and end-to-end example exist.
- Asset naming guidance documents semantic filename patterns for agent-visible `list-assets` tokens.
- A screen UI authoring skill draft captures the reference-screenshot workflow for title/settings/menu/save-load/backlog UI, while keeping output constrained to editor-owned structured config.
- Example plan and example draft are tested against the CLI.
- The end-to-end example uses the generated draft plan for dry-run and apply steps.
- A compact external-agent checklist maps Codex, Claude, opencode, and GitHub Copilot to the same command contract.
- External-agent docs use the shared `npm run vn -- <command>` style for generic CLI commands.
- README links to the external-agent authoring workflow.
- Focused mini-workflows cover adding scenes, revising dialogue, staging characters, setting media, adding branches, and preparing handoff.
- Screen UI authoring is documented as a skill workflow. `ui.titleScreen` has structured CLI/API commands; `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, and `ui.backlogScreen` can be edited through `set-screen-layout`; shared UI sections can be edited through `set-dialogue-box`, `set-theme`, and `set-widget-styles`.
- An executable multi-ending example plan now covers affection, terminal ending unlocks, CG gallery unlocks, condition routing, and transition authoring, with a human editor review tutorial and Phase 83 migration guide.
- `npm run verify:agent-example` materializes that plan as an editor-openable project with example assets and runs the apply, graph, author-check, handoff, and export-readiness acceptance chain.

Gaps:

- No P0 documentation gaps remain for the current structured screen UI authoring layer.

### 6. Regression Protection

Current:

- Focused tests cover authoring API, CLI, draft import, draft-plan, plan examples, handoff, editor handoff display, and scene graph helpers.
- A full-chain CLI artifact test covers `draft-plan -> apply-plan --result-out -> author-check -> handoff-report --write-editor-handoff`.
- `npm run test:focused` and `npm run build` are the current closure gates for this branch.

Gaps:

- Mounted editor tests cover Story Systems flow navigation for broken targets and unreachable unlock entries; broader Project Settings handoff lifecycle interactions remain primarily source-level.

Priority:

- P2: add component-level handoff UX tests when test harness support is ready.

## Current Branch Closure Gate

Before considering this branch ready for review:

- `npm run test:focused` passes.
- `npm run build` passes.
- Docs name the external-agent path clearly and do not imply an in-editor AI assistant.
