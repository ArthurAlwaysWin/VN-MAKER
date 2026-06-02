# Milestone 10 Release Note: Game UI Style Presets

Milestone 10 completes the first contract-first pass for game UI style presets.
Authors can apply one of six presets across editable UI sections, preview the
result in Project Settings, and hand the change off through the agent workflow.

## What ships

- Six preset recipes: classic ADV, soft romance, dark cinema, glass school,
  sci-fi HUD, and suspense noir.
- Preset application writes normal editable UI sections only:
  `ui.theme`, `ui.titleScreen`, `ui.dialogueBox`, `ui.widgetStyles`,
  `ui.gameMenu`, `ui.saveLoadScreen`, `ui.backlogScreen`,
  `ui.settingsScreen`, and `ui.motion`.
- Title screen recipes use asset-free `ui.titleScreen.elements` fields only.
  They do not require a new asset pipeline, title art dependency, layout DSL, or
  runtime-only structure.
- Project Settings previews and impact summaries use the same preset recipes as
  apply-plan and runtime handoff.
- Runtime wiring covers title screen, choice buttons, dialogue, game menu,
  save/load, backlog, settings, and configurable UI motion.
- Validation warns if a project contains a persisted `ui.stylePreset`, because
  presets are authoring recipes rather than canonical runtime state.

## Acceptance sample

The Milestone 10 acceptance sample is generated under
`.tmp/milestone10-style-preset-qa/`:

- `apply-ui-style-preset-plan.json` - natural-language style apply-plan sample.
- `apply-plan-validation.json` - validate-only result.
- `apply-plan-result.json` - checkpointed apply result.
- `author-check.json` - preview-plan output.
- `agent-handoff.skip-assets.json` - handoff report with asset checks skipped for
  the existing sample project's missing assets.
- `visual-qa-preview-summary.json` - six-preset Project Settings-style preview QA
  summary.
- `screenshots-preview/` - screenshots for title, dialogue, choices, settings,
  game menu, save/load, and backlog surfaces.

The default handoff report still records the sample project's pre-existing
missing asset warnings. With asset checks skipped, the preset workflow gates are
green and the preview targets match the actual apply result.

## Why `ui.stylePreset` is not persisted

`ui.stylePreset` would be derived state. Once a preset is applied, authors can
edit individual colors, button styles, title elements, and screen layouts. A
stored preset id would quickly drift from those editable fields and make export,
undo, merge, validation, preview, and old-project compatibility ambiguous.

The stable contract is the materialized UI configuration itself. Presets are
one-time authoring recipes that write those fields; runtime consumes only the
canonical editable sections.

## Deferred

- Asset-backed title art, title BGM, and generated preset thumbnails.
- Rich title layout DSL, plugin marketplace, WebGL, Live2D, rich text, and built-in
  AI chat.
- Milestone 8 canvas-mask transitions shipped as a two-preset procedural thin
  slice that keeps the existing transition contract small and runtime-safe.
- A future milestone should focus on preset thumbnails, lightweight visual
  regression fixtures, and optional authored effect packs without expanding the
  current UI preset contract.
