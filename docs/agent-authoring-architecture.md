# Agent Authoring Architecture

> Purpose: keep Galgame Maker's no-code creator experience intact while adding a stable, high-ceiling authoring interface for AI agents such as Codex, Claude Code, opencode, and GitHub Copilot.

## Product Intent

Galgame Maker remains a no-code visual novel editor for human creators. Human users should continue to work through the GUI: canvas editing, page inspector, resource library, theme editor, story systems, export dialogs, and runtime preview.

The long-term product target is a mature visual novel engine and editor in the same category of ambition as Ren'Py or Kirikiri-style workflows, while keeping the creator-facing editor no-code. Human creators should be able to build and polish a game visually; advanced logic and engine details should remain approachable through GUI affordances, presets, inspectors, and previews.

The agent layer is a second authoring entry point for external AI agent products such as Codex, Claude Code, opencode, and GitHub Copilot. Agents do not need a no-code UI and should not be required to click through the editor. They need structured commands, a canonical data contract, validation, and preview feedback. The product goal is:

> Human gives a natural-language story or novel draft; an AI agent builds a playable, editable visual novel draft; the human creator reviews, directs, and polishes it in the visual editor.

The two entry points must share the same project data and runtime. Do not fork the engine, invent a second project format, or make the agent layer a separate hidden editor.

The agent layer is not an in-product AI chat assistant. The expected user workflow is: the user talks to an external AI agent, the agent uses Galgame Maker's authoring API / CLI / project contract to edit the project, then the user opens the no-code editor to inspect, preview, adjust, and export.

## Design Principles

1. Human GUI first, agent API second.
2. AI edits the same canonical `script.json` that the editor and runtime use.
3. Agent operations go through stable authoring APIs instead of ad hoc JSON surgery.
4. Every agent workflow must end with validation.
5. Runtime preview is the visual source of truth.
6. Advanced agent-only controls are allowed, but they must degrade safely in the editor and runtime.
7. The no-code editor should not expose complexity just because the agent API can use it.
8. Historical compatibility is read-only protection; new writes should use current canonical schema.
9. Agent-facing capabilities should expand toward production authoring: dialogue writing, character blocking, backgrounds, BGM/SE/voice, transitions, camera, variables, branches, CG/ending unlocks, validation, and preview feedback.
10. Do not treat an in-editor AI panel as the primary agent integration path.

## High-Level Architecture

```text
Human Creator
  -> No-Code Editor UI
  -> Editor Stores / Project Services
  -> Canonical Project Contract
  -> Runtime Engine / Preview / Export

AI Agent
  -> External Agent Product
  -> Agent Skill / CLI / MCP Tool
  -> Agent Authoring API
  -> Canonical Project Contract
  -> Validator / Preview / Export
```

The core dependency direction is:

```text
src/shared           contract, normalization, validation
src/authoring        safe project mutation API for editor and agents
tools/vn-author      CLI wrapper for external agents
docs/agent-authoring skill/workflow documentation for agents
src/editor           human GUI using shared contract and, where practical, authoring API
src/engine           runtime playback and preview authority
```

The current external-agent surface includes:

- Single-command mutations for small edits.
- `apply-plan` for atomic multi-operation manifests with one validation/write/checkpoint boundary.
- `restore-checkpoint` for rollback through the same authoring layer.
- `scene-references`, `retarget-scene`, and `clear-scene-references` for branch graph repair.
- `author-check` for aggregate validation, layout lint, readiness, and preview dry-run planning.
- `handoff-report` for structured review artifacts with optional transaction summaries, consumed by humans and surfaced in Project Settings when saved as project-root `agent-handoff.json`.

## Existing Foundations

Keep and extend these modules:

- `src/shared/galgameContract.js`: top-level contract, `projectId`, `systems.*`.
- `src/shared/effectDsl.js`: canonical `effects[]`, variable effects, unlock effects.
- `src/shared/variableRegistry.js`: variable registry normalization and references.
- `src/shared/branchingContract.js`: condition page normalization and evaluation.
- `src/shared/cinematicContract.js`: animation, camera, transition compatibility.
- `src/engine/ScriptEngine.js`: page-based runtime playback.
- `src/engine/PlayerDataRepository.js`: cross-save profile truth.
- `src/editor/stores/script.js`: current editor mutation surface.

The first implementation should reuse these pieces. Avoid a rewrite unless a module blocks a stable authoring API.

## Canonical Contract Layer

Target files:

```text
src/shared/
  galgameContract.js
  authoringContract.js
  projectValidator.js
  layoutContract.js
  effectDsl.js
  variableRegistry.js
  branchingContract.js
  cinematicContract.js
```

Responsibilities:

- Normalize top-level script shape.
- Normalize scenes and pages.
- Normalize choice effects.
- Normalize condition pages.
- Validate project integrity.
- Report actionable warnings and errors for humans and agents.
- Keep validation independent from Vue, Electron, and browser DOM.

### Project Validator

Add `src/shared/projectValidator.js`.

Validator output should be structured:

```js
{
  ok: false,
  errors: [
    {
      code: 'missing-scene-target',
      message: 'Choice target "good_end" does not exist.',
      path: ['scenes', 'start', 'pages', 3, 'options', 0, 'target'],
      severity: 'error',
    },
  ],
  warnings: []
}
```

Initial validator checks:

- Top-level shape has `characters`, `scenes`, `systems`.
- Scene IDs are non-empty.
- Scene `next` targets exist.
- Page arrays are valid.
- Page type is one of `normal`, `choice`, `condition`.
- Normal page dialogues are valid.
- Character references exist.
- Character expressions exist or have a safe fallback.
- Background, BGM, SE, voice, and UI asset references are either known or reported as warnings.
- Choice targets exist when present.
- Choice `effects[]` normalize successfully.
- Condition variables are registered or reported.
- Condition targets exist when present.
- `unlock:ending` references are registered in `systems.endings`.
- `unlock:cg` references are registered in `systems.gallery.cg`.
- Empty pages are warned.
- Excessively long dialogue text is warned.

Later validator checks:

- Scene graph reachability.
- Dead scenes.
- Unused assets.
- Missing fonts.
- Theme asset coverage.
- Layout safety: role overlap, dialogue obstruction, text overflow.
- Export readiness.

## Agent Authoring API

Target files:

```text
src/authoring/
  projectSession.js
  sceneAuthoring.js
  pageAuthoring.js
  characterAuthoring.js
  assetAuthoring.js
  effectAuthoring.js
  layoutPresets.js
  novelDraftImport.js
  validationReport.js
```

The authoring API is the agent's safe mutation layer. It should also become available to editor stores over time so GUI and agent workflows do not drift.

### Session Shape

```js
const session = createProjectSession({
  script,
  projectRoot,
});

session.addCharacter({ id, name, color, expressions });
session.addScene({ id, name, next });
session.addNormalPage({ sceneId, page });
session.addChoicePage({ sceneId, page });
session.addConditionPage({ sceneId, page });
session.addDialogue({ sceneId, pageIndex, dialogue });
session.setPageCharacters({ sceneId, pageIndex, characters });
session.setPageBackground({ sceneId, pageIndex, background });
session.addChoiceEffect({ sceneId, pageIndex, optionIndex, effect });
session.validate();
session.toJSON();
```

Rules:

- API methods must normalize after mutation.
- API methods must preserve unrelated data.
- API methods must be deterministic.
- API methods must return enough detail for agents to continue, such as created IDs and warnings.
- API methods should prefer explicit IDs from agents, but provide slug generation helpers.
- API methods must not depend on Vue reactivity.

### Layout Presets

Agents should start with simple VN blocking instead of arbitrary coordinates.

Initial presets:

- `solo-center`
- `duo-left-right`
- `trio-left-center-right`
- `speaker-emphasis`
- `narration-no-character`
- `choice-focus`

Each preset should output canonical page character entries:

```js
[
  { id: 'sakura', expression: 'smile', position: 'left', x: null, y: null, scale: 1 },
  { id: 'haruki', expression: 'normal', position: 'right', x: null, y: null, scale: 1 }
]
```

Later presets may use `x`, `y`, and `scale` for finer visual direction.

## Agent CLI

Target files:

```text
tools/vn-author/
  index.js
  commands/
    inspect.js
    validate.js
    add-scene.js
    add-page.js
    import-draft.js
    render-preview.js
    export-report.js
```

Package scripts:

```json
{
  "scripts": {
    "validate:project": "node tools/vn-author/index.js validate",
    "vn:inspect": "node tools/vn-author/index.js inspect"
  }
}
```

Initial commands:

```bash
node tools/vn-author/index.js inspect
node tools/vn-author/index.js validate
node tools/vn-author/index.js add-scene --id chapter_1 --name 第一章
node tools/vn-author/index.js import-draft draft.json
```

Production workflow commands now also include:

```bash
node tools/vn-author/index.js apply-plan plan.json --dry-run --json
node tools/vn-author/index.js apply-plan plan.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
node tools/vn-author/index.js restore-checkpoint public/game/.checkpoints/script.timestamp.json --force --backup --json
node tools/vn-author/index.js scene-references --scene old_route --json
node tools/vn-author/index.js retarget-scene --from old_route --to new_route --force --checkpoint --json
node tools/vn-author/index.js author-check --scene start --page 0 --write-preview-plan --json
node tools/vn-author/index.js handoff-report --out public/game/agent-handoff.json --json
```

CLI output should support:

- Human readable text by default.
- `--json` for agent parsing.
- Non-zero exit code on validation errors.
- Stable error codes.

## Agent Skill Documentation

Target files:

```text
docs/agent-authoring/
  skill.md
  workflow.md
  project-contract.md
  layout-rules.md
  validation-rules.md
  examples/
    short-story-draft.json
    generated-script-notes.md
```

Skill guidance for agents:

1. Inspect before editing.
2. Use authoring API or CLI; avoid hand-writing large raw JSON patches.
3. Preserve existing project data.
4. Use canonical `pages[]`, `systems.*`, and `effects[]`.
5. Never write new `commands[]`.
6. Prefer layout presets before custom coordinates.
7. Register variables before conditions or effects reference them.
8. Register endings and CG before unlock effects reference them.
9. Validate after every meaningful change.
10. If preview is available, inspect screenshot and revise.

This skill can later be packaged for Codex/Claude/opencode. The repo-local version should come first.

## Novel-To-VN Draft Workflow

The agent should not convert a whole novel directly into final `script.json` in one pass. Use an intermediate draft format.

Draft shape:

```json
{
  "title": "Example",
  "characters": [
    {
      "id": "sakura",
      "name": "樱",
      "description": "Quiet but warm classmate",
      "expressionHints": ["normal", "smile", "sad"]
    }
  ],
  "locations": [
    {
      "id": "school_gate",
      "name": "校门",
      "backgroundHint": "backgrounds/school_gate.svg"
    }
  ],
  "scenes": [
    {
      "id": "chapter_1",
      "name": "第一章",
      "beats": [
        {
          "location": "school_gate",
          "mood": "spring quiet",
          "characters": ["sakura"],
          "dialogues": [
            { "speaker": null, "text": "春风吹过校门。" },
            { "speaker": "sakura", "text": "又是一年春天呢。", "expression": "smile" }
          ]
        }
      ]
    }
  ]
}
```

Import rules:

- One beat usually becomes one normal page.
- Long narration should be split into readable dialogue entries.
- Missing assets should become warnings, not fatal errors.
- Unknown expressions should fall back to the first known expression and report a warning.
- Branches should be explicit in the draft before generating choice/condition pages.

## Advanced Agent-Only Capabilities

Agents may use advanced authoring controls before the GUI exposes them, as long as runtime fallback is safe.

Candidate APIs:

```js
session.addCameraEffect({ sceneId, pageIndex, effect });
session.addCharacterAnimation({ sceneId, pageIndex, characterId, animation });
session.addScreenEffect({ sceneId, pageIndex, effect });
session.addTextEffect({ sceneId, pageIndex, dialogueIndex, effect });
session.addTimedLayerEffect({ sceneId, pageIndex, layerEffect });
```

Guardrails:

- Any new effect must have a shared contract.
- Unknown effects must be ignored or downgraded safely by runtime.
- Editor should preserve unsupported advanced fields instead of deleting them.
- Validator should warn when a field is runtime-supported but GUI-unsupported.

## Preview And Visual Feedback

Agents need a feedback loop.

Phase 1 preview feedback:

- Text validation.
- Asset validation.
- Scene graph validation.
- Layout heuristic warnings.

Phase 2 preview feedback:

```bash
node tools/vn-author/index.js render-preview --scene start --page 0 --out .tmp/preview.png
```

Preview should eventually provide:

- Screenshot path.
- DOM or layout boxes.
- Warnings for blank stage.
- Warnings for character overlap.
- Warnings for dialogue obstruction.
- Warnings for text overflow.

Implementation should use the runtime preview where possible. Do not build a second renderer for screenshots unless the runtime path is unavailable.

## Backup And Branching Policy

Before implementing this architecture:

1. Preserve the current working state in Git.
2. Create a baseline branch or tag, such as `v1.7-before-agent-layer`.
3. Develop on a feature branch, such as `codex/agent-authoring-layer`.
4. Use small commits by layer:
   - docs baseline
   - validator
   - authoring API
   - CLI
   - skill docs
   - preview feedback

Do not start broad refactors until the baseline is captured.

## Implementation Phases

### Phase A: Baseline And Architecture

Goal: make the plan durable and protect the current project state.

Tasks:

- Create this architecture document.
- Link it from README.
- Capture baseline branch/tag after user approval.
- Confirm current docs and script contract are coherent.

Exit criteria:

- Architecture doc exists.
- README points to it.
- Baseline branch/tag is available before code work begins.

### Phase B: Project Validator

Goal: agent changes can be checked immediately.

Tasks:

- Add `src/shared/projectValidator.js`.
- Add structured validation report format.
- Add tests for valid project, missing target, missing character, missing expression, invalid effects, invalid condition references, and unlock registry mismatch.
- Add CLI-accessible validation path.
- Add `npm run validate:project`.

Exit criteria:

- Validator catches broken graph and reference errors.
- Validator returns stable codes.
- Tests cover the first validation matrix.

### Phase C: Authoring API

Goal: agents can mutate projects safely.

Tasks:

- Add `src/authoring/projectSession.js`.
- Add scene/page/character/effect helpers.
- Add layout presets.
- Add normalization after mutation.
- Add tests for creating scenes, normal pages, choice pages, condition pages, and variable effects.
- Start migrating editor store internals only where the move is low-risk.

Exit criteria:

- A test can build a small playable VN script through the API only.
- Result validates successfully.
- Existing editor behavior is not changed.

### Phase D: Agent CLI

Goal: external coding agents can use the project without importing app internals manually.

Tasks:

- Add `tools/vn-author/index.js`.
- Implement `inspect`.
- Implement `validate`.
- Implement minimal `add-scene` and `import-draft`.
- Expand mutation commands for production authoring: `add-character`, `add-page`, `set-page-background`, `set-page-audio`, `set-page-characters`, `add-dialogue`, `add-choice`, `add-condition`, and advanced staging setters where contracts already exist.
- Support `--json`.
- Add README or docs examples.

Exit criteria:

- CLI can inspect and validate `public/game/script.json`.
- CLI returns non-zero exit on validation errors.
- CLI output is stable enough for agents.
- Agents can perform common VN authoring work without ad hoc JSON surgery.

### Phase E: Agent Skill Pack

Goal: make Codex/Claude/opencode workflows repeatable.

Tasks:

- Add `docs/agent-authoring/skill.md`.
- Add workflow and validation docs.
- Add examples.
- Define agent rules: inspect, mutate through API/CLI, validate, preview, summarize.

Exit criteria:

- A fresh agent can follow the repo-local skill docs to add a small scene.
- Skill docs point to the CLI and authoring API, not raw JSON editing.
- Initial repo-local docs live under `docs/agent-authoring/`.

### Phase F: Novel Draft Import

Goal: natural language stories can become editable VN drafts.

Tasks:

- Define draft JSON schema.
- Implement `novelDraftImport`.
- Generate characters, scenes, normal pages, basic layout presets, and optional choices.
- Report missing assets as warnings.
- Add examples and tests.

Exit criteria:

- A short story draft imports into a valid playable script.
- Human can open the result in the editor and continue editing.

### Phase G: Advanced Effects

Goal: agents can author richer staging without overwhelming the no-code UI.

Tasks:

- Add shared contracts for any new effect type.
- Extend runtime fallback behavior.
- Add authoring API methods for advanced effects.
- Preserve GUI-unsupported fields through editor saves.
- Validate unsupported or risky fields with warnings.

Exit criteria:

- Advanced fields survive editor round trips.
- Runtime handles unknown values safely.
- Tests cover fallback and preservation.

### Phase H: Preview Screenshot And Layout Lint

Goal: agents can see and correct visual results.

Tasks:

- Add preview render command.
- Use runtime preview as the rendering authority.
- Save screenshots under `.tmp/`.
- Add layout heuristics for blank stage, character overlap, dialogue obstruction, and text overflow.

Exit criteria:

- Agent can render a specific scene/page to an image.
- Layout report identifies obvious visual issues.

### Phase I: External Agent Workflow Hardening

Goal: make external agent products reliable day-to-day authoring clients for Galgame Maker projects.

Tasks:

- Add transactional CLI workflows: inspect current project, apply planned changes, validate, and write only when gates pass.
- Add `apply-plan` manifests for ordered multi-operation edits with dry-run support, aggregate summaries, and validation-blocked writes.
- Add `restore-checkpoint` rollback using timestamped `.checkpoints/` files.
- Add scene reference diagnostics and retarget/clear helpers so agents can safely merge, rename, or delete branch scenes.
- Add `handoff-report` artifacts containing gates, project counts, scene graph reachability, recent checkpoints, and review items.
- Add machine-readable change summaries so agents can explain what changed to the user. Initial CLI mutation output now includes `transaction` and `changeSummary` objects for dry-run and write paths.
- Add checkpoint/backup guidance before larger agent edits. Initial CLI support uses `--checkpoint` for timestamped `.checkpoints/` copies and keeps `--backup` for the latest `.bak` copy.
- Expand render-preview output with screenshot paths, quality checks, and layout lint findings.
- Document complete external-agent workflows for common tasks: draft import, adding a scene, revising dialogue, staging characters, adding BGM/backgrounds, adding a branch, and preparing handoff to a human editor.
- Keep the editor as the human review and polishing surface; do not add a built-in AI chat surface as part of this phase.

Exit criteria:

- An external agent can complete a common scene-authoring task through CLI/API, validate it, render or lint a preview, summarize the changes, and leave the result editable in the no-code editor.
- Agent workflows never bypass validation or overwrite unrelated project data.
- Human creators remain in control by reviewing the generated project in the existing editor.

## Near-Term Execution Order

1. Finish docs baseline.
2. Capture backup branch/tag.
3. Build validator.
4. Build authoring API.
5. Build CLI.
6. Write agent skill docs.
7. Add novel draft import.
8. Add preview screenshot loop.
9. Add advanced effects.
10. Harden external-agent production workflows.

## Non-Goals For The First Pass

- Do not build a full AI chat product first.
- Do not require agents to operate the GUI by clicking.
- Do not build an in-editor AI assistant panel as the primary integration path.
- Do not rewrite the runtime.
- Do not replace the no-code editor with an AI-only workflow.
- Do not add network/model-provider dependencies to core authoring modules.
- Do not make advanced effects mandatory for human-created projects.

## Working Definition Of Success

The first complete milestone is successful when an external coding agent can:

1. Inspect the project.
2. Import a short story draft.
3. Generate characters, scenes, pages, dialogue, and one branch.
4. Validate the result.
5. Render or preview the generated page.
6. Leave the project editable in the existing no-code editor.
