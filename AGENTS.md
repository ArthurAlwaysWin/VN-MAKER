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
npm run vn -- projects create --out "D:/Galgame-Maker/Projects/MyStory" --title "My Story" --open --json
```

4. If the user asks to open or continue a project in the editor:

```bash
npm run vn -- projects open "Project Name" --json
```

`projects open` writes an editor open request. If the desktop editor is already running, it will open the project through its request watcher. If the editor is launched later, it will consume the pending request on startup. Use `--launch --editor "path/to/Galgame Maker.exe"` or set `GALGAME_MAKER_EDITOR_EXE` when the agent should also start the packaged editor.

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
- `docs/agent-authoring/project-contract.md`
- `docs/agent-authoring/validation-rules.md`
- `docs/agent-authoring/agent-checklist.md`

## Common Commands

Inspect and validate a resolved project:

```bash
npm run vn -- inspect --script "D:/Galgame-Maker/Projects/MyStory/script.json" --json
npm run vn -- validate --script "D:/Galgame-Maker/Projects/MyStory/script.json" --json
npm run vn -- export-report --script "D:/Galgame-Maker/Projects/MyStory/script.json" --json
```

Apply a multi-step plan:

```bash
npm run vn:apply-plan -- .tmp/plan.json --script "D:/Galgame-Maker/Projects/MyStory/script.json" --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/plan.json --script "D:/Galgame-Maker/Projects/MyStory/script.json" --dry-run --json
npm run vn:apply-plan -- .tmp/plan.json --script "D:/Galgame-Maker/Projects/MyStory/script.json" --force --checkpoint --result-out .tmp/apply-plan-result.json --json
npm run vn:review-handoff -- --script "D:/Galgame-Maker/Projects/MyStory/script.json" --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --json
```

Final response to the human should summarize changed scenes/pages/systems, validation or readiness results, generated handoff artifacts, and what to review in the editor.
