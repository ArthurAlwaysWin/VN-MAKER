# AGENTS.md

This is the entry document for AI agents working in Galgame Maker.

Galgame Maker is a no-code visual novel editor plus a deterministic external-agent authoring layer. The desktop editor is the human review and polish surface. Agents should create and revise projects through repo-owned CLI commands, contracts, validation, preview planning, and handoff artifacts.

## Start Here

1. Check the workspace:

```bash
git status --short --branch
```

If dependencies are missing, install them. If `node_modules/` already exists and the package files have not changed, skip installation:

```bash
npm install
```

2. If the user refers to an existing game by name, resolve it from the editor-maintained recent-project registry before asking for a `script.json` path:

```bash
npm run vn -- projects list --json
npm run vn -- projects resolve "Project Name" --json
```

Use the returned `project.scriptPath` for later authoring commands.

3. If the user asks to create a new game project:

```bash
npm run vn -- projects recommend-create --title "My Story" --json
```

Show the recommended `createPath.projectPath` to the user and ask for confirmation before creating the directory. After the user confirms the location, create and open the project:

```bash
npm run vn -- projects create --title "My Story" --out "<confirmedProjectPath>" --open --launch --json
```

The recommended project library is the editor's project library setting, with `GALGAME_MAKER_PROJECTS_DIR` as an override and the user's Documents-based `Galgame Maker/Projects` folder as the default. Avoid creating projects inside this source checkout, packaged editor release folders, `node_modules`, `dist*`, or temporary directories.

Packaged editor metadata is portable: recent projects, project library settings, and pending open requests live beside the packaged editor under `data/`, not under AppData. Game projects themselves should still live in the project library chosen by the user.

4. If the user asks to open or continue a project in the editor:

```bash
npm run vn -- projects open "Project Name" --json
```

`projects open` writes an editor open request. `--open` on `projects create` does the same. If the desktop editor is already running, it will open the project through its request watcher. If the editor is launched later, it will consume the pending request on startup. Add `--launch` when the agent should also try to start the packaged editor. If the executable is not found, pass `--editor "path/to/Galgame Maker.exe"` or set `GALGAME_MAKER_EDITOR_EXE`; JSON output includes this hint.

## Choose The Right Skill

Read only the skill needed for the task:

- General creation or editing: `.agent/skills/galgame-maker-authoring/SKILL.md`
- Prose, outline, or chapter draft to VN plan: `.agent/skills/galgame-maker-prose-to-plan/SKILL.md`
- Asset inventory, placeholders, and naming: `.agent/skills/galgame-maker-asset-intake/SKILL.md`
- Title/settings/menu/save/load/backlog/dialogue/choice UI: `.agent/skills/galgame-maker-screen-ui/SKILL.md`
- Visual polish, atmosphere, transitions, particles, effect packs: `.agent/skills/galgame-maker-visual-polish/SKILL.md`
- Validation, route checks, previews, handoff, readiness: `.agent/skills/galgame-maker-project-qa/SKILL.md`
- Web/desktop export and release packaging: `.agent/skills/galgame-maker-release-export/SKILL.md`

## Core Rules

- Prefer `npm run vn -- <command>`, apply-plan manifests, and `src/authoring/*` APIs over raw `script.json` edits.
- For agent-authored reusable story logic, macros, or route scaffolding, prefer Agent DSL source compiled through `npm run vn:dsl-plan -- story.dsl --out .tmp/plan.json --json`, then run the normal apply-plan validation/dry-run/write gate. Agent DSL is an authoring source format only; `script.json` remains the canonical editable project contract.
- Preserve user content and unrelated working-tree changes.
- Keep output editable in the no-code desktop editor.
- Never create legacy `commands[]`.
- Do not add project-local JavaScript, arbitrary CSS/HTML, shaders/WebGL, plugin marketplace metadata, AI chat fields, or unsupported script fields.
- Validate after meaningful changes.
- For multi-step edits, prefer `apply-plan` with `--validate-only`, `--dry-run`, `--force`, `--checkpoint`, and `--result-out`.

## Key References

- `docs/agent-authoring/skill.md`
- `docs/agent-authoring/workflow.md`
- `docs/agent-authoring/command-reference.md`
- `docs/agent-authoring/agent-dsl.md`
- `docs/agent-authoring/agent-dsl-architecture.md`
- `docs/agent-authoring/agent-dsl-roadmap.md`
- `docs/agent-authoring/project-contract.md`
- `docs/agent-authoring/validation-rules.md`
- `docs/agent-authoring/agent-checklist.md`

## Common Commands

Inspect and validate a resolved project:

```bash
npm run vn -- inspect --script "<scriptPath>" --json
npm run vn -- validate --script "<scriptPath>" --json
npm run vn -- export-report --script "<scriptPath>" --json
npm run vn -- dsl-check agent-src/main.gmdsl --script "<scriptPath>" --json
npm run vn -- dsl-diff agent-src/main.gmdsl --script "<scriptPath>" --source-map .tmp/agent-dsl-source-map.applied.json --json
```

Apply a multi-step plan:

```bash
npm run vn:dsl-plan -- story.dsl --out .tmp/plan.json --json
npm run vn:apply-plan -- .tmp/plan.json --script "<scriptPath>" --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/plan.json --script "<scriptPath>" --dry-run --json
npm run vn:apply-plan -- .tmp/plan.json --script "<scriptPath>" --force --checkpoint --result-out .tmp/apply-plan-result.json --json
npm run vn:review-handoff -- --script "<scriptPath>" --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --json
```

Final response to the human should summarize changed scenes/pages/systems, validation or readiness results, generated handoff artifacts, and what to review in the editor.
