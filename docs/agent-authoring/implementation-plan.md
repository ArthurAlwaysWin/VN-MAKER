# External Agent Authoring Implementation Plan

This document is the cross-session development plan for making Galgame Maker work well with external AI agents such as Codex, Claude, opencode, and GitHub Copilot.

Read this before continuing the branch. The goal is to keep future sessions aligned even when conversational context is lost.

## Product Goal

Users create or open a project in the Galgame Maker editor, then talk to an external AI agent. The agent edits the same project through repo-owned authoring APIs, CLI commands, project contracts, validation, preview planning, author-check, and handoff artifacts. The editor remains the human review, preview, polish, and export surface.

The agent is not an in-editor AI assistant. Do not build an in-editor chat panel as the primary integration path.

## Operating Model

Current development model:

- The editor is launched from this repo during development with `npm run dev`.
- The user creates or opens a project through the existing GUI.
- The external agent runs from the editor repo folder, for example `E:\projects\my-awesome-project`.
- The target visual novel project is addressed by passing its `script.json` path to CLI commands.
- The project folder remains the source of truth for `project.json`, `script.json`, `assets/`, saves, player profile data, and `agent-handoff.json`.

Future packaged model:

- Users should open Galgame Maker by double-clicking an app, not by typing `npm run dev`.
- External agent tooling should hide the editor repo/install path and let users choose a visual novel project folder.
- A future project-scoped command such as `galgame-maker-author --project <project>` may wrap repo-local `tools/vn-author`.

## Current Capability Snapshot

Implemented and usable:

- Structured draft import: `import-draft`.
- Structured draft to plan conversion: `draft-plan`.
- Transactional apply-plan operations for story content.
- Validation, layout lint, export readiness, preview planning, author-check.
- Handoff artifact generation via `agent-handoff.json`.
- Project Settings reads handoff artifacts and shows gates, transaction summary, changed paths, preview targets, review items, and local review item lifecycle state.
- PageEditor scene tree surfaces agent-changed scenes/pages and review counts.
- Scene/page authoring commands cover scenes, pages, dialogue, choices, variables, characters, page media, character staging, camera, transitions, and choice effects.
- Novel adaptation workflow is documented: prose must first become a human-readable adaptation preview before structured draft/plan creation.
- A concrete example adaptation preview is documented for a short prose excerpt.
- Asset naming guidelines are documented for agent-visible filename token matching.
- Screen UI reference-screenshot workflow is documented: screen UI should become editor-owned structured config, not arbitrary HTML/CSS.
- Asset library inventory is available through `list-assets`.
- Title screen authoring commands are available for `ui.titleScreen`: `set-title-screen`, `add-title-element`, `update-title-element`, and `remove-title-element`.
- Screen layout authoring is available for `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, and `ui.backlogScreen` through `set-screen-layout`.
- Shared UI authoring commands are available for `ui.dialogueBox`, `ui.theme`, and `ui.widgetStyles` through `set-dialogue-box`, `set-theme`, and `set-widget-styles`.
- `author-check --transaction` and handoff artifacts include preview targets for changed scene pages and supported screen UI paths, and Project Settings surfaces those targets for visual review.
- Handoff review items include categories for missing assets, unused assets, skipped asset checks, and screen UI preview review.
- Handoff also flags explicitly placeholder-like and highly ambiguous referenced asset names so humans can replace or rename them before final review.
- Handoff can carry reference screenshot fidelity notes from `apply-plan` result metadata into structured review items without allowing arbitrary HTML/CSS.
- The editor detects external `script.json` changes, blocks stale saves, and shows a reload warning to avoid overwriting agent-authored edits.

Not implemented yet:

- Asset library semantic metadata beyond filename tokens.
- Full CG gallery page and ending list page.
- CLI/API commands for registering endings and CG entries.
- Packaged app entry that hides terminal usage from ordinary users.

## Non-Goals For The Current Authoring Layer

Do not expand scope into these unless the user explicitly asks:

- In-editor AI chat assistant.
- Arbitrary agent-written HTML/CSS as the default UI authoring model.
- A separate hidden project format for agents.
- Bypassing validation or handoff for meaningful edits.
- Replacing the GUI creation flow for new projects before the main agent workflow is stable.
- Building CG gallery/ending list screens before existing editor screen UI is agent-addressable.

## Guiding Principles

1. Preserve no-code editability. Agent output must stay editable in the GUI.
2. Prefer structured config over raw code injection.
3. Prefer official authoring APIs/CLI commands over direct JSON edits.
4. Validate after every meaningful mutation.
5. Treat runtime preview as visual truth.
6. Use handoff artifacts to tell humans what changed and what needs review.
7. Treat missing assets as explicit review items.
8. Keep changes scoped; do not turn this branch into a general engine rewrite.

## Priority Roadmap

### P0: Asset Inventory For Agents

Why:

Novel adaptation and screen UI design depend on knowing which backgrounds, character expressions, audio files, fonts, and UI images already exist. File names and metadata determine whether an agent can map "rainy school gate" or "Sakura nervous" to real assets.

Deliverables:

- Add a CLI command such as `list-assets`.
- It should inspect a project asset root and return JSON grouped by category:
  - backgrounds
  - characters
  - audio
  - voices
  - ui
  - fonts
- Include path, basename, extension, size when cheap, and semantic hints derived from names.
- Accept explicit project/script paths.
- Reuse existing asset scanning and project path conventions where possible.
- Add tests in `tests/vnAuthorCli.test.js`.
- Document asset naming guidelines.

Expected command shape:

```bash
npm run vn -- list-assets --project "D:/VNProjects/MyStory" --json
npm run vn -- list-assets --script "D:/VNProjects/MyStory/script.json" --json
```

Expected JSON shape:

```json
{
  "projectPath": "D:/VNProjects/MyStory",
  "assetRoot": "D:/VNProjects/MyStory/assets",
  "assets": {
    "backgrounds": [
      {
        "path": "backgrounds/rainy_school_gate.png",
        "name": "rainy_school_gate",
        "tokens": ["rainy", "school", "gate"],
        "extension": ".png"
      }
    ],
    "characters": [],
    "audio": [],
    "voices": [],
    "ui": [],
    "fonts": []
  }
}
```

Acceptance:

- Agents can list assets without guessing filesystem layout.
- Missing asset handoff can compare desired assets to existing assets.
- The command never mutates the project.

### P0: Novel Adaptation Preview Contract

Why:

When a user gives raw prose, the agent should not silently paste prose into dialogue boxes. It should first present an adaptation breakdown with concrete backgrounds, character expressions, BGM/SE, page beats, choices, variable effects, and missing assets.

Deliverables:

- Convert `docs/agent-authoring/novel-adaptation-skill.md` into a tighter prompt contract if needed.
- Add an example adaptation preview document for a short prose excerpt.
- Extend `structured-draft-contract.md` with guidance for asset intent fields if the existing schema is insufficient.
- Optionally add draft fields for `assetIntent` or `missingAssets` only if they are consumed by CLI output or handoff.

Acceptance:

- The workflow clearly says: prose -> adaptation preview -> human confirmation -> structured draft -> draft-plan -> apply-plan.
- The adaptation preview includes resource names and missing resources.
- The structured draft path remains compatible with current CLI tests.

### P0: Structured Screen UI Authoring Commands

Why:

The editor already supports title, settings, game menu, save/load, and backlog screens. External agents cannot safely automate these through official commands yet. This is the largest mismatch between editor capability and agent capability.

Deliverables:

- Add authoring-layer helpers in `src/authoring/projectSession.js` or a small screen-specific module.
- Add apply-plan operations and direct CLI commands for:
  - `set-title-screen`
  - `add-title-element`
  - `update-title-element`
  - `remove-title-element`
  - `set-screen-layout`
  - `set-dialogue-box`
  - `set-theme`
  - `set-widget-styles`
- Keep all commands structured; do not accept arbitrary HTML/CSS.
- Validate screen ids against supported editor/runtime screen ids.
- Preserve title screen BGM ownership when applying visual-only theme changes.
- Generate changed paths under `ui.*`.
- Ensure `author-check --transaction` can produce screen preview targets for changed `ui.*` paths.
- Update `command-reference.md`, `plan-manifest.md`, `workflow.md`, and tests.

Supported screen ids:

```text
titleScreen
settingsScreen
gameMenu
saveLoadScreen
backlogScreen
```

Expected command shape:

```bash
npm run vn -- set-title-screen --script path/to/script.json --background ui/title/background.png --bgm audio/title.ogg --force --checkpoint --json
npm run vn -- add-title-element --script path/to/script.json --type text --content "Moonlit Letter" --x 640 --y 170 --anchor center --force --json
npm run vn -- set-screen-layout --script path/to/script.json --screen gameMenu --config .tmp/game-menu-layout.json --force --json
```

Acceptance:

- Agents can implement "make the title page" without raw JSON edits.
- Agents can implement reference-screenshot inspired screen designs as structured config.
- Project Settings handoff can route `ui.titleScreen` to the title tab and other `ui.*` paths to their closest editor surface.
- Tests cover direct CLI and apply-plan operations.

### P0: Asset Naming And Metadata Guidance

Why:

Agent quality depends heavily on resource semantics. Good file names help; explicit metadata is better.

Deliverables:

- Add documentation for asset naming:
  - `backgrounds/rainy_school_gate.png`
  - `characters/sakura_nervous.png`
  - `audio/rain_theme.ogg`
  - `audio/rain_loop.ogg`
  - `ui/title_logo.png`
- Add upload-time guidance later in the editor UI if requested.
- Plan a project-local asset metadata file, but do not implement it before `list-assets` unless needed.

Possible future metadata shape:

```json
{
  "assets": {
    "characters/sakura_nervous.png": {
      "type": "character-expression",
      "characterId": "sakura",
      "expression": "nervous",
      "tags": ["樱", "紧张", "雨天"],
      "description": "樱的紧张表情立绘"
    }
  }
}
```

Acceptance:

- Docs tell users why semantic names matter.
- Agents can mention bad or ambiguous asset names in handoff.

### P1: External File Change Safety

Why:

If the editor is open while an external agent modifies `script.json`, the editor may hold stale state and later overwrite agent changes on autosave/manual save.

Deliverables:

- Detect external `script.json` changes while a project is open.
- Warn the user in the editor.
- Provide reload or compare guidance.
- Make Project Settings handoff refresh explicit.
- Avoid surprising autosave overwrites after external changes.

Acceptance:

- External agent edits do not silently disappear because the editor saved older state.
- Tests cover project store or IPC behavior where practical.

### P1: Handoff For Asset And Screen Review

Why:

Once agents touch assets and screen UI, handoff should identify exactly what the human needs to inspect.

Deliverables:

- Add review item categories for:
  - missing asset (done)
  - unused asset (done)
  - skipped asset check (done)
  - screen UI preview required (done)
  - placeholder asset (done for referenced path heuristics)
  - ambiguous asset match (done for generic referenced filename heuristics)
  - reference screenshot fidelity note (done through `handoff.referenceScreenshotNotes`)
- Add preview target support for screen ids. Done.
- Extend Project Settings grouping for `ui.*` and `assets.*` paths if needed.

Acceptance:

- Human reviewers can see which assets to import or rename.
- Handoff can locate changed screen UI sections.

### P2: Ending And CG Registry Authoring

Why:

The data contract already has `systems.endings`, `systems.gallery.cg`, `unlock:ending`, and `unlock:cg`, but no complete editor/agent workflow.

Deliverables:

- Add editor UI for ending and CG registry only after confirming product shape.
- Add CLI/API commands:
  - `add-ending`
  - `update-ending`
  - `remove-ending`
  - `add-cg`
  - `update-cg`
  - `remove-cg`
- Keep validation aligned with registered unlocks.

Acceptance:

- Agents can register endings/CG before referencing unlock effects.
- Validation warnings are actionable.

### P2: Runtime CG Gallery And Ending List Screens

Why:

These are standard galgame features, but they are not part of the current editor screen set.

Deliverables:

- Runtime gallery screen.
- Runtime ending list screen.
- Editor tabs or screen layout editors for these pages.
- Title/game menu entry buttons.
- Export/readiness coverage.

Acceptance:

- Users can review unlocked CG/endings in game.
- Editor can visually configure these pages.

### P2: Packaged App Entry

Why:

Ordinary users should not have to run `npm run dev`.

Deliverables:

- Decide packaging/distribution flow.
- Create Windows app/installer or portable build.
- Ensure external agent docs distinguish developer source checkout from packaged app use.

Acceptance:

- Non-technical users can open the editor by launching an app.
- Agent docs no longer depend on users knowing terminal commands except for agent-side development/debug workflows.

## Implementation Order For The Next Sessions

Recommended next sequence:

1. Implement `list-assets`. Done.
2. Document asset naming guidelines and link them from novel adaptation skill. Done.
3. Add title screen authoring commands first. Done.
4. Add `set-screen-layout` for existing major screens. Done.
5. Add screen preview target support to author-check/handoff. Done.
6. Add tests and docs for screen UI plan operations. Done for title screen, screen layout, and shared UI commands.
7. Add external file change safety. Done for mtime/size detection, save blocking, and reload warning.
8. Revisit ending/CG registry once the existing screen gap is closed.

Do not start with CG gallery screens. The editor itself does not have those pages yet, and existing editor screens are the immediate gap.

## Concrete Next Task: `list-assets`

Files likely involved:

- `tools/vn-author/index.js`
- `tests/vnAuthorCli.test.js`
- `docs/agent-authoring/workflow.md`
- `docs/agent-authoring/novel-adaptation-skill.md`
- possibly `src/engine/scanAssets.js` if reusable helpers are useful

Design notes:

- `scanAssets(script)` returns assets referenced by the script, not all files in the asset library. `list-assets` should list actual files under project `assets/`.
- Derive project path from:
  - explicit `--project`;
  - parent directory of explicit `--script`;
  - current default only as fallback.
- Use stable JSON output.
- Do not require project to be open in Electron.
- Keep read-only.

Minimum test cases:

- Lists files across categories.
- Handles missing category folders gracefully.
- Derives project path from `--script`.
- Tokenizes semantic names such as `rainy_school_gate.png`.
- Does not include files outside `assets/`.

## Concrete Next Task: Title Screen Commands

Files likely involved:

- `src/authoring/projectSession.js`
- `tools/vn-author/index.js`
- `tests/vnAuthorCli.test.js`
- `docs/agent-authoring/command-reference.md`
- `docs/agent-authoring/screen-ui-skill.md`

Suggested API:

```js
session.setTitleScreen({ background, bgm, elements, merge })
session.addTitleElement(element)
session.updateTitleElement({ elementId, index, patch })
session.removeTitleElement({ elementId, index })
```

Rules:

- `elements[]` entries must be plain objects with supported `type`.
- Supported title element types should match current editor/runtime support: text, button, image.
- Button actions should match runtime support: start, continue/load, settings, quit if runtime supports it.
- Do not invent HTML.
- Ensure changed paths point to `ui.titleScreen`.

Minimum test cases:

- Direct command sets background/BGM.
- Direct command adds text/button/image elements.
- apply-plan can set title screen and add elements transactionally.
- Validation and author-check still pass for a simple title screen.
- Handoff changed paths include `ui.titleScreen`.

## Concrete Next Task: Screen Layout Commands

Files likely involved:

- `src/authoring/projectSession.js`
- `tools/vn-author/index.js`
- `tests/vnAuthorCli.test.js`
- `src/editor/utils/agentHandoff.js`
- `docs/agent-authoring/command-reference.md`

Suggested API:

```js
session.setScreenLayout({ screenId, config, merge })
```

Rules:

- Allow only existing screen ids:
  - settingsScreen
  - gameMenu
  - saveLoadScreen
  - backlogScreen
- Optional later support for titleScreen should stay in title-specific commands unless the schema is unified.
- Config must be JSON object.
- Path should be `ui.<screenId>`.

Minimum test cases:

- Reject unsupported screen id.
- Set each supported screen config.
- Handoff navigation maps each `ui.<screenId>` to the right editor tab.

## Validation Commands To Run

For docs-only changes:

```bash
git diff --check
```

For CLI/API changes:

```bash
npx vitest run tests/vnAuthorCli.test.js tests/projectSession.test.js tests/agentHandoffEditor.test.js
npm run test:focused
npm run build
```

Before PR readiness:

```bash
npm run verify
git status --short --branch
git stash list
```

## Stash And Branch Notes

Current branch should remain:

```text
codex/agent-authoring-layer
```

Known stash that should not be restored unless the user explicitly asks:

```text
stash@{0}: On (no branch): workspace cleanup before continuing (code and tests only)
```

## PR Readiness Checklist

- No docs imply an in-editor AI assistant as the primary path.
- Existing editor GUI remains the human surface.
- Agent changes use official APIs/CLI.
- `list-assets` exists before novel adaptation depends on asset matching.
- Screen UI commands exist before claiming agents can build title/settings/menu/save-load/backlog screens.
- Handoff tells humans exactly what to review.
- Tests cover new commands and failure modes.
- Worktree is clean except intended changes.
