# CODEBUDDY.md

This file provides project guidance for CodeBuddy Code when working in this repository.

## Project Overview

Galgame Maker is a visual novel creation tool with:

- a no-code, PPT-style desktop editor built with Vue 3 + Pinia;
- a vanilla JavaScript runtime engine;
- an Electron shell for project files, preview, export, and portable editor packaging;
- an external-agent authoring layer for safe AI-assisted game creation through CLI/API, validation, preview planning, and handoff artifacts.

The editor remains the human review and polish surface. External agents should edit projects through repo-owned contracts and commands, not by inventing project-local code.

## Mandatory Game Authoring Entry

When the user asks CodeBuddy to create, continue, adapt, or edit a Galgame Maker game, this file is not enough by itself. First read and follow:

```text
AGENTS.md
.agent/skills/galgame-maker-authoring/SKILL.md
```

If the request starts from prose, an outline, or a chapter draft, also read the prose-to-plan skill before planning edits:

```text
.agent/skills/galgame-maker-prose-to-plan/SKILL.md
```

Hard requirements for game-authoring tasks:

- Start with `git status --short --branch`.
- Resolve or create the target project before inspecting or editing any `script.json`.
- For a new game, first run `npm run vn -- projects recommend-create --title "Game Title" --json`, show the recommended project library and full project path, and ask the user to confirm the location.
- After confirmation, create with `npm run vn -- projects create --title "Game Title" --out "<confirmedProjectPath>" --open --launch --json`.
- Use the returned `project.scriptPath` for all inspect, asset, validate, apply-plan, handoff, preview, and export commands.
- Do not inspect, list assets from, or edit `public/game/script.json` for a new user game. That path is only the built-in example project and may be used only when the user explicitly asks to work on the built-in example.
- Do not invent a project path from the editor checkout location. The recommended project directory is chosen by `projects create`, with `GALGAME_MAKER_PROJECTS_DIR` as the user's override.
- Packaged editor metadata is portable and lives beside the packaged editor under `data/`; game projects should still live in the user-confirmed project library, not inside the editor release directory.

## Current Agent Boundary

Agents may create and revise Galgame Maker projects, but must keep output editable in the no-code editor.

Required boundaries:

- Prefer `tools/vn-author` commands, apply-plan manifests, and `src/authoring/*` APIs over raw JSON edits.
- Preserve user content and unrelated working-tree changes.
- Write canonical `pages[]`, `systems.*`, `effects[]`, UI config, transition, particle, and effect-pack data.
- Never create legacy `commands[]`.
- Do not add project-local JavaScript, `runtime.js`, shaders/WebGL, raw CSS/HTML, plugin marketplace metadata, AI chat fields, arbitrary DOM access, network/filesystem access, or generic visual DSL fields.
- Effect packs are manifest-only and built-in-adapter-only. Use reviewed Canvas2D adapters only.

## CodeBuddy Skills

Project skills for CodeBuddy live in:

```text
.codebuddy/skills/<skill-name>/SKILL.md
```

Use the Galgame Maker skills there for product authoring tasks:

- `galgame-maker-authoring` — default entry point for creating/editing projects.
- `galgame-maker-prose-to-plan` — raw prose/outline to adaptation preview, structured draft, and apply-plan.
- `galgame-maker-asset-intake` — asset inventory, missing assets, placeholders, and naming.
- `galgame-maker-screen-ui` — title/settings/menu/save/load/backlog/dialogue/choice UI.
- `galgame-maker-visual-polish` — atmosphere, transitions, particles, UI feel, and safe built-in effect packs.
- `galgame-maker-project-qa` — validation, branch graph, unlocks, previews, handoff, and readiness.
- `galgame-maker-release-export` — web/desktop export, portable editor packaging, and release checks.

Recommended high-level flow for an already resolved project:

1. Inspect the resolved project using the returned `project.scriptPath`.
2. For prose input, produce an adaptation preview and wait for user approval.
3. Convert approved work to structured draft or apply-plan.
4. Run validate-only and dry-run.
5. Apply with checkpoint and result output.
6. Run review/handoff.
7. Run QA/readiness.
8. Export when requested.

## Commands

Install and development:

```bash
npm install
npm run dev
npm run build
npm run build:web
npm run test
npm run verify
```

Focused tests:

```bash
npm run test:vitest -- tests/vnAuthorCli.test.js
npm run test:vitest -- tests/exportGame.test.js
node --test tests/exportDesktop.test.js
node --test tests/scriptEngine.test.js
```

Core agent inspection and validation:

```bash
npm run vn -- projects list --json
npm run vn -- projects resolve "Project Name" --json
npm run vn -- projects recommend-create --title "Game Title" --json
npm run vn -- projects create --title "Game Title" --out "<confirmedProjectPath>" --open --launch --json
npm run vn -- inspect --script "<scriptPath>" --json
npm run vn -- validate --script "<scriptPath>" --json
npm run vn -- export-report --script "<scriptPath>" --json
npm run vn -- export-readiness --script "<scriptPath>" --asset-root "<projectPath>" --json
npm run vn -- list-assets --script "<scriptPath>" --json
```

Plan workflow:

```bash
npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --require-adaptation-preview --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script "<scriptPath>" --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script "<scriptPath>" --dry-run --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script "<scriptPath>" --force --checkpoint --result-out .tmp/apply-plan-result.json --json
npm run vn:review-handoff -- --script "<scriptPath>" --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --review-out .tmp/review-handoff.json --json
```

Export:

```bash
npm run vn:export-web -- --script "<scriptPath>" --out "D:/out/web" --zip --json
npm run vn:export-desktop -- --script "<scriptPath>" --out "D:/out/desktop" --zip --json
npm run package:editor:win
```

`export-web` and `export-desktop` run export readiness first and refuse to export when blockers exist. Use `--allow-readiness-blockers` only for an explicitly accepted intermediate build.

## Architecture

Runtime engine:

- `src/engine/ScriptEngine.js` interprets canonical scene/page data and emits playback events.
- `src/ui/` contains DOM-rendered runtime UI components.
- `src/main.js` is the runtime entry.
- Runtime code is vanilla JavaScript and should not depend on Vue.

Editor:

- `src/editor/` is Vue 3 + Pinia.
- `src/editor/stores/` owns project/script/assets state, undo/redo, dirty tracking, and IPC flows.
- `src/editor/views/` and `src/editor/components/` implement the no-code editing surface.

Electron:

- `electron/main.js` owns app lifecycle, IPC, project files, preview windows, export, and `asset://`.
- `electron/exportGame.js` exports static web builds.
- `electron/exportDesktop.js` exports Windows Electron game builds.

Authoring layer:

- `tools/vn-author/index.js` is the deterministic CLI for agent workflows.
- `src/authoring/` contains project mutation/session/report/readiness/handoff utilities.
- `docs/agent-authoring/` contains the canonical agent contracts.

Shared contracts:

- `src/shared/` contains framework-free contract modules used by runtime, editor, tests, and CLI.

## Data Model

Project on disk:

```text
project-dir/
  project.json
  script.json
  assets/
    backgrounds/
    characters/
    audio/
    voices/
    ui/
    fonts/
    effects/
```

Canonical `script.json` uses:

- `projectId`
- `contractVersion`
- `meta`
- `characters`
- `scenes.<sceneId>.pages[]`
- `systems.variables`
- `systems.endings`
- `systems.gallery.cg`
- `ui.*`
- `assets.effectPacks`

Pages are `normal`, `choice`, or `condition`. Do not write legacy `commands[]`.

Important docs:

- `docs/agent-authoring/project-contract.md`
- `docs/agent-authoring/integration-contract.md`
- `docs/agent-authoring/workflow.md`
- `docs/agent-authoring/command-reference.md`
- `docs/agent-authoring/validation-rules.md`

## Build Targets

- `vite.config.js` builds the editor/runtime desktop app artifacts.
- `vite.web.config.js` builds standalone web runtime artifacts into `dist-web/engine.js` and `dist-web/engine.css`.
- `scripts/package-editor-win.js` builds a green/no-install Windows editor package under `release/`.

## Test Structure

- Vitest covers contracts, editor wiring, CLI workflows, and integration behavior.
- Node built-in tests cover engine/export/shared utility behavior.
- `npm run test` runs both suites.

## CodeGraph

This project has a CodeGraph MCP server configured for structural code queries. Prefer CodeGraph for symbol, caller/callee, impact, and architecture questions. Use native search for literal text or file contents.

See `.cursor/rules/codegraph.mdc` for the local CodeGraph usage guide.
