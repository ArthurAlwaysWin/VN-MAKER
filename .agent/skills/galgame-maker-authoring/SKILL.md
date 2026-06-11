---
name: galgame-maker-authoring
description: Create or edit Galgame Maker visual novel projects through the project-owned authoring CLI, apply-plan manifests, validation, preview planning, and handoff artifacts. Use when an AI agent is asked to make a galgame, revise story content, add scenes/pages/dialogue/choices/variables/endings/CG, or perform any general Galgame Maker project authoring task while keeping the no-code editor editable and safe.
---

# Galgame Maker Authoring

Use this as the default entry skill for Galgame Maker project work.

## Core Rule

Keep the human creator in control and keep the project editable in the Galgame Maker no-code editor. Use repo-owned CLI/API surfaces instead of raw `script.json` edits whenever possible.

## Start

1. Check the workspace:

```bash
git status --short --branch
```

2. Resolve the target project before inspecting `script.json`.

If the user asks to continue an existing project by name, use the editor-maintained project registry:

```bash
npm run vn -- projects list --json
npm run vn -- projects resolve "Project Name" --json
```

If the user asks to make a new game, create a separate project directory instead of overwriting `public/game/script.json`:

```bash
npm run vn -- projects recommend-create --title "Project Name" --json
```

Tell the user the recommended `createPath.projectPath` and ask for confirmation before creating any project directory. After the user confirms, run:

```bash
npm run vn -- projects create --title "Project Name" --out "<confirmedProjectPath>" --open --launch --json
```

The recommended project library comes from the editor's project library setting, `GALGAME_MAKER_PROJECTS_DIR`, or the user's Documents-based `Galgame Maker/Projects` folder. Do not create projects in the Galgame Maker source checkout, packaged editor release folders, `node_modules`, `dist*`, or temporary folders.

Packaged editor metadata is portable and lives beside the packaged editor under `data/`; game projects should still live in the user-confirmed project library, not inside the editor release directory.

`--open` writes the pending editor open request. `--launch` additionally tries to start the packaged editor; if it cannot find the executable, set `GALGAME_MAKER_EDITOR_EXE` or pass `--editor`.

Use the returned `project.scriptPath` for all later commands. Only fall back to `public/game/script.json` when the user explicitly asks to edit the built-in example project.

3. Inspect the resolved project:

```bash
npm run vn -- inspect --script "<scriptPath>" --json
npm run vn -- export-report --script "<scriptPath>" --json
npm run vn -- validate --script "<scriptPath>" --json
```

4. If the task involves prose, use `galgame-maker-prose-to-plan`.
5. If the task involves missing or ambiguous assets, use `galgame-maker-asset-intake`.
6. If the task involves title/settings/menu/save/load/backlog/dialogue/choice UI, use `galgame-maker-screen-ui`.
7. If the task involves visual quality, atmosphere, transitions, particles, or effect packs, use `galgame-maker-visual-polish`.
8. If the task is final review or pre-release verification, use `galgame-maker-project-qa`.
9. If the task is export, package, or release delivery, use `galgame-maker-release-export`.

## Edit Path

Prefer this chain for meaningful work:

```bash
npm run vn:dsl-plan -- story.dsl --out .tmp/plan.json --json
npm run vn:apply-plan -- .tmp/plan.json --script "<scriptPath>" --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/plan.json --script "<scriptPath>" --dry-run --json
npm run vn:apply-plan -- .tmp/plan.json --script "<scriptPath>" --force --checkpoint --result-out .tmp/apply-plan-result.json --json
npm run vn:review-handoff -- --script "<scriptPath>" --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --review-out .tmp/review-handoff.json --json
```

Use Agent DSL when the agent needs reusable authoring source, macros, route scaffolding, or a maintainable story layer. Compile it with `vn:dsl-plan`, then apply the generated plan through the same validation gate above. Agent DSL is not a runtime script format; `script.json` remains the canonical project contract and must stay editable in the no-code editor.

For small targeted edits, use `npm run vn -- <command>` from the command reference. Do not invent unsupported fields.

## Required References

Read only the files needed for the task:

- `../../../docs/agent-authoring/skill.md` for the full authoring rules.
- `../../../docs/agent-authoring/command-reference.md` for supported commands.
- `../../../docs/agent-authoring/agent-dsl.md` for agent-facing DSL syntax and compile-to-plan workflow.
- `../../../docs/agent-authoring/agent-dsl-architecture.md` for mature DSL boundaries, compiler architecture, diagnostics, IR, source maps, and safety rules.
- `../../../docs/agent-authoring/agent-dsl-roadmap.md` for phase-by-phase implementation tasks and acceptance gates.
- `../../../docs/agent-authoring/plan-manifest.md` for apply-plan shape.
- `../../../docs/agent-authoring/structured-draft-contract.md` for draft imports.
- `../../../docs/agent-authoring/validation-rules.md` for gates and warning meaning.
- `../../../docs/agent-authoring/mini-workflows.md` for focused edit examples.

## Do Not

- Do not create `commands[]`.
- Do not write arbitrary JavaScript, CSS, HTML, shaders, WebGL, plugin metadata, AI chat fields, or project-local runtime code.
- Do not skip validation after meaningful edits.
- Do not finish with validation errors or export-readiness blockers unless the human explicitly accepts them.
- Do not overwrite user work or revert unrelated changes.
