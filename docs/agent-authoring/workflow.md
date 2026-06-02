# Agent Authoring Workflow

For the active visual-polish roadmap, see [../visual-effects-ui-agent-plan.md](../visual-effects-ui-agent-plan.md). For visual polish requests such as "make the game UI look good", use [visual-polish-skill.md](./visual-polish-skill.md). For the completed agent-first systems roadmap, see [../agent-first-vn-systems-plan.md](../agent-first-vn-systems-plan.md). For cross-cutting operation, transaction, diagnostic, preview, handoff, and conflict rules, use [integration-contract.md](./integration-contract.md). For cross-session development details, use [implementation-plan.md](./implementation-plan.md). For a compact prompt-friendly version of this workflow, use [agent-checklist.md](./agent-checklist.md). For focused edits, use [mini-workflows.md](./mini-workflows.md). For prose-to-VN adaptation, use [novel-adaptation-skill.md](./novel-adaptation-skill.md) and [example-adaptation-preview.md](./example-adaptation-preview.md). For the executable multi-ending example and editor review steps, use [example-plan.json](./example-plan.json) and [human-review-tutorial.md](./human-review-tutorial.md). Existing Phase 83 projects should follow [phase-83-migration.md](./phase-83-migration.md). For asset names that agents can match reliably, use [asset-naming-guidelines.md](./asset-naming-guidelines.md). For screen UI design from a style prompt or reference screenshot, use [screen-ui-skill.md](./screen-ui-skill.md). For plan command parameters, use [command-reference.md](./command-reference.md).

Milestone 11 effect packs are manifest-only; see [../milestone-11-effect-packs-feasibility-security-audit.md](../milestone-11-effect-packs-feasibility-security-audit.md). You may use validated `assets.effectPacks` manifests, page `effectPacks` references, and built-in adapters such as `canvas2d:film-flicker`. Do not add project-local JavaScript, `runtime.js`, shaders/WebGL, raw CSS/HTML, plugin metadata, AI chat fields, or generic visual DSLs to a workflow.

## 1. Inspect

```bash
npm run vn:inspect -- --json
npm run vn:report -- --json
```

Read the current project shape before changing anything.

List the project asset library before planning prose adaptation, staging, or screen visuals:

```bash
npm run vn -- list-assets --script public/game/script.json --json
npm run vn -- list-assets --project "D:/VNProjects/MyStory" --json
```

The command is read-only and returns `assets/backgrounds`, `characters`, `audio`, `voices`, `ui`, `fonts`, and `effects` entries with semantic tokens derived from file names.

Use semantic asset names such as `backgrounds/school_gate_rainy.png`, `characters/sakura_nervous.png`, and `ui/game_menu_button_normal.png` so `list-assets` tokens can support honest matching. See `docs/agent-authoring/asset-naming-guidelines.md`.

## 2. Validate

```bash
npm run validate:project -- --json
npm run vn:author-check -- --json
npm run validate:project -- --check-assets --json
npm run vn:lint-layout -- --json
npm run vn:readiness -- --json
```

Resolve validation errors before adding large new content. Warnings can be carried if the user intentionally accepts them, but agent-created content should normally avoid them.

## 3. Plan The Draft

For prose input, split into:

- Characters
- Locations
- Scenes
- Beats
- Dialogues
- Choices
- Variables
- Unlocks

Use a structured draft JSON before touching `script.json`.

Before creating that structured draft, show the human a concise adaptation preview with concrete backgrounds, character expressions, page beats, choices, variable effects, BGM/SE, and missing asset notes. See `docs/agent-authoring/novel-adaptation-skill.md` and `docs/agent-authoring/example-adaptation-preview.md`.

See `docs/agent-authoring/structured-draft-contract.md` for the supported draft fields, defaults, and conversion rules.

## 4. Import Or Mutate

Use one of:

```bash
npm run vn -- import-draft draft.json --fresh --out public/game/script.json --json
```

or convert the structured draft into a transactional plan manifest first:

```bash
npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --require-adaptation-preview --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --dry-run --json
```

Use `draft-plan --require-adaptation-preview` when prose-derived work should be inspected as operations before anything is written; it confirms the accepted breakdown and asset review were recorded without adding fields to `script.json`. Use `apply-plan --validate-only` before writing when an external agent needs a saved artifact that proves the plan can be applied and pass validation without mutating the project.

or code:

```js
import { createProjectSession } from './src/authoring/projectSession.js';
```

Avoid direct JSON edits unless the API cannot express the operation yet.

When overwriting an existing script, use explicit intent:

```bash
npm run vn -- import-draft draft.json --fresh --out public/game/script.json --force --checkpoint --backup --json
```

Use `--checkpoint` before larger edits. It writes a timestamped copy under `.checkpoints/` before the script is changed. `--backup` still writes the latest `.bak` copy for quick manual recovery. JSON output includes `transaction` and `changeSummary` blocks so external agents can report the exact target, changed paths, count deltas, validation status, and checkpoint path.

For multi-step edits, prefer an atomic plan manifest:

```json
{
  "version": 1,
  "operations": [
    { "id": "scene", "command": "add-scene", "params": { "id": "chapter_1", "name": "Chapter 1" } },
    { "id": "page", "command": "add-page", "params": { "scene": "chapter_1", "type": "normal", "dialogues": [{ "speaker": null, "text": "The bell rang." }] } },
    { "id": "media", "command": "set-page-media", "params": { "scene": "chapter_1", "page": 0, "background": "backgrounds/classroom.svg" } }
  ]
}
```

For title screen work, use the structured title commands instead of direct JSON edits:

```bash
npm run vn -- set-title-screen --script public/game/script.json --background ui/title/background.png --bgm audio/title.ogg --force --checkpoint --json
npm run vn -- add-title-element --script public/game/script.json --type text --content "Moonlit Letter" --x 640 --y 170 --anchor center --force --json
npm run vn -- add-title-element --script public/game/script.json --type button --label "Start" --action start --x 640 --y 430 --anchor center --force --json
npm run vn -- add-title-element --script public/game/script.json --type button --label "Gallery" --action gallery --x 640 --y 500 --anchor center --force --json
```

For existing settings, game menu, save/load, and backlog screens, use `set-screen-layout` with a structured JSON config:

```bash
npm run vn -- set-screen-layout --script public/game/script.json --screen gameMenu --config .tmp/game-menu-layout.json --force --checkpoint --json
npm run vn -- set-screen-layout --script public/game/script.json --screen settingsScreen --config .tmp/settings-layout.json --force --json
```

For shared UI styling, use the structured shared UI commands:

```bash
npm run vn -- set-dialogue-box --script public/game/script.json --config .tmp/dialogue-box.json --force --checkpoint --json
npm run vn -- set-theme --script public/game/script.json --config .tmp/theme.json --force --json
npm run vn -- set-widget-styles --script public/game/script.json --config .tmp/widget-styles.json --replace --force --json
```

For cinematic staging, inspect the shared catalog before authoring transitions. The complete M5 background, character-motion, and camera catalog is available as safe runtime/editor selections:

```bash
npm run vn -- list-transitions --target background --supported-only --json
npm run vn -- set-page-transition --scene chapter_1 --page 0 --type crossfade-pan --duration 700 --script public/game/script.json --force --json
npm run vn -- set-camera-effect --scene chapter_1 --page 0 --effect vignette --intensity medium --duration-ms 450 --script public/game/script.json --force --json
npm run vn -- set-character-transition --scene chapter_1 --page 0 --character sakura --transition pop --script public/game/script.json --force --json
```

`set-character-transition` writes the compatible `characters[].animation` field. Background durations are limited to `0..5000` ms and camera effect durations to `0..2000` ms; direct out-of-contract project data is reported as `invalid-transition-param`.

When an apply result changes `ui.titleScreen`, `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, or `ui.backlogScreen`, `author-check --transaction` plans screen preview targets and reports `screen-ui-preview-required` issues/suggestions. It also creates an `ending-list` target for changed endings, a `gallery` target for changed `systems.gallery.cg` entries, and a `branch-graph` target for changed scene flow:

```bash
npm run vn:author-check -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
```

For reference-screenshot-based screen work, include `handoff.referenceScreenshotNotes` in the plan manifest so `handoff-report --transaction` creates a structured fidelity review item for the human reviewer.

If the editor is open while an external agent changes `script.json`, the editor detects the changed file state, blocks stale saves, and shows a read-only structured path diff before reload. Reload the project before continuing GUI edits so agent-authored changes are not overwritten.

Then dry-run and apply it:

```bash
npm run vn:apply-plan -- plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

`apply-plan` reads the script once, applies operations in order, validates the final result, and writes once. If validation has errors it refuses to write unless `--allow-invalid` is present. JSON output includes each operation result plus one aggregate `transaction` and `changeSummary`. If an operation itself fails, JSON output includes `operationFailure` with the failed index, id, command, diagnostic code, and supported commands when available; `--result-out` saves that failure payload too.

See [plan-manifest.md](./plan-manifest.md) for the full manifest shape and [command-reference.md](./command-reference.md) for supported command parameters.
See [end-to-end-example.md](./end-to-end-example.md) for a complete prose-to-plan-to-handoff walkthrough.

When `--checkpoint` is used, the transaction includes a rollback descriptor. To restore it:

```bash
npm run vn:restore-checkpoint -- public/game/.checkpoints/script.2026-05-19T10-00-00-000Z.json --script public/game/script.json --force --backup --json
```

For small edits:

```bash
npm run vn -- add-scene --id chapter_1 --name "Chapter 1" --script public/game/script.json --force --checkpoint --json
npm run vn -- rename-scene --scene chapter_1 --new-id chapter_01 --name "Chapter 01" --script public/game/script.json --force --backup --json
npm run vn -- delete-scene --scene unused_branch --script public/game/script.json --force --backup --json
npm run vn -- add-character --id sakura --name "Sakura" --expression normal=characters/sakura_normal.svg --script public/game/script.json --force --backup --json
npm run vn -- add-variable --id affection --type number --initial 0 --label "Affection" --script public/game/script.json --force --backup --json
npm run vn -- add-page --scene chapter_1 --type choice --prompt "Answer?" --options '[{"text":"Continue","target":"chapter_2"}]' --script public/game/script.json --force --backup --json
npm run vn -- move-page --scene chapter_1 --from 2 --to 0 --script public/game/script.json --force --backup --json
npm run vn -- remove-page --scene chapter_1 --page 3 --script public/game/script.json --force --backup --json
npm run vn -- add-dialogue --scene chapter_1 --page 0 --speaker sakura --text "Hello." --script public/game/script.json --force --backup --json
npm run vn -- set-dialogue --scene chapter_1 --page 0 --dialogue-index 0 --text "Hello again." --script public/game/script.json --force --backup --json
npm run vn -- move-dialogue --scene chapter_1 --page 0 --from 2 --to 1 --script public/game/script.json --force --backup --json
npm run vn -- remove-dialogue --scene chapter_1 --page 0 --dialogue-index 3 --script public/game/script.json --force --backup --json
npm run vn -- add-choice-option --scene chapter_1 --page 1 --text "Ask about the letter" --target chapter_2 --effects '[{"type":"var:add","id":"affection","value":1}]' --script public/game/script.json --force --backup --json
npm run vn -- set-choice-page --scene chapter_1 --page 1 --prompt "What do you ask?" --script public/game/script.json --force --backup --json
npm run vn -- set-choice-option --scene chapter_1 --page 1 --option 0 --text "Ask about the envelope" --target chapter_2 --script public/game/script.json --force --backup --json
npm run vn -- move-choice-option --scene chapter_1 --page 1 --from 2 --to 0 --script public/game/script.json --force --backup --json
npm run vn -- remove-choice-option --scene chapter_1 --page 1 --option 3 --script public/game/script.json --force --backup --json
npm run vn -- set-condition-page --scene chapter_1 --page 2 --condition-mode any --conditions '[{"variableId":"affection","operator":">=","value":3}]' --true-target chapter_2 --script public/game/script.json --force --backup --json
npm run vn -- set-scene-next --scene chapter_1 --next chapter_2 --script public/game/script.json --force --backup --json
npm run vn -- set-page-characters --scene chapter_1 --page 0 --preset duo-left-right --character sakura:smile --character haruki:normal --script public/game/script.json --force --backup --json
npm run vn -- set-page-media --scene chapter_1 --page 0 --background backgrounds/classroom.svg --bgm audio/theme.ogg --bgm-volume 0.6 --clear-se --script public/game/script.json --force --backup --json
npm run vn -- set-page-transitions --scene chapter_1 --from-page 0 --to-page 8 --page-type normal --has-background --type wipe-right --duration 700 --script public/game/script.json --force --checkpoint --json
npm run vn -- add-choice-effect --scene chapter_1 --page 1 --option 0 --effect-type var:add --effect-id affection --value 1 --script public/game/script.json --force --backup --json
npm run vn -- add-cg --id cg_confession --title "Confession" --images '["backgrounds/cg/confession.png"]' --thumbnail backgrounds/cg/confession_thumb.png --script public/game/script.json --force --backup --json
npm run vn -- add-cg-unlock --scene chapter_1 --page 1 --option 0 --id cg_confession --script public/game/script.json --force --backup --json
npm run vn -- add-ending-unlock --scene good_ending --page 0 --id good_end --script public/game/script.json --force --checkpoint --json
```

`rename-scene` updates scene references in `next`, choice option targets, and condition targets. `delete-scene` refuses to delete scenes referenced from other scenes unless `--force-references` is present.

Before deleting or merging branch scenes, inspect references:

```bash
npm run vn:scene-references -- --all --script public/game/script.json --json
npm run vn:scene-references -- --scene chapter_1_old_route --script public/game/script.json --json
npm run vn -- retarget-scene --from chapter_1_old_route --to chapter_1_new_route --script public/game/script.json --force --checkpoint --json
npm run vn -- repair-scene-target --from missing_route --to chapter_1_new_route --script public/game/script.json --force --checkpoint --json
npm run vn -- clear-scene-references --scene unused_branch --script public/game/script.json --force --checkpoint --json
```

`scene-references` reports exact `pathString` values for scene `next`, choice targets, and condition targets, plus suggested repair commands. Use `retarget-scene` when preserving an existing route, `repair-scene-target` when references point to a missing target id, and `clear-scene-references` when those jumps should become terminal or intentionally unset; repair and clear both accept missing target ids.

Inspect route and asset analysis before handoff:

```bash
npm run vn -- graph-report --script public/game/script.json --json
npm run vn -- graph-report --script public/game/script.json --mermaid
npm run vn -- find-dead-ends --script public/game/script.json --json
npm run vn -- find-missing-assets --script public/game/script.json --json
npm run vn -- find-unused-assets --script public/game/script.json --json
```

The desktop editor exposes the same derived report under Story Systems > Flow, including broken links, unreachable ending/CG unlocks, asset handoff findings, review badges, and exact route/system navigation. A `branch-graph` handoff target navigates there without writing analysis data into `script.json`.

## 5. Validate Again

```bash
npm run validate:project -- --json
npm run vn:author-check -- --transaction .tmp/apply-plan-result.json --write-preview-plan --json
npm run vn:lint-layout -- --json
npm run vn:readiness -- --json
```

Do not finish with validation errors or readiness blockers. `author-check` is the preferred external-agent gate because it aggregates validation, layout lint, export readiness, and preview dry-run planning into one JSON payload. Use `--transaction` after `apply-plan --result-out` so the check focuses layout/readiness and scene reference review on changed scenes/pages, writes preview targets for changed scenes/screens, and emits screen UI preview review items. Pass `--scene` and `--page` only when you need to override that target list.

For a final handoff, run the continuous gate instead of issuing two separate commands:

```bash
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --review-out .tmp/review-handoff.json --json
```

For releases that require captured visual evidence, add `--require-preview-screenshot`; the command will render screenshots and fail unless every renderable preview target passes the screenshot quality checks.

When `lint-layout --json` returns warnings, read `suggestions[]` before editing again. Each suggestion carries the page location and repair command templates where the CLI can express the fix.

## 6. Preview When Available

Use runtime screenshot rendering when Playwright is installed in the workspace:

```bash
npm run vn:render-preview -- --scene start --page 0 --out .tmp/preview.png --json
```

The command starts a lightweight Vite runtime server, captures a PNG with Chromium, and returns a `quality` object in JSON output. Quality checks currently verify screenshot dimensions, transparent coverage, and blank/near-solid captures so agents do not treat an empty frame as a successful visual review.

If preview quality fails, inspect `quality.suggestions[]`. Blank or near-solid screenshots usually mean the wrong scene/page was rendered or the page needs visible background/character staging.

If Playwright is installed but Chromium is missing, install the browser once:

```bash
npx playwright install chromium
```

Without Playwright, verify the render payload:

```bash
npm run vn:render-preview -- --scene start --page 0 --out .tmp/preview.png --dry-run --write-plan --json
```

## 7. Summarize

Generate a handoff artifact for the no-code editor or human reviewer:

```bash
npm run vn:handoff-report -- --script public/game/script.json --write-editor-handoff --note "Review newly authored route and placeholder assets." --json
```

If you saved a previous mutation result, attach it so the editor can show changed paths:

```bash
npm run vn:handoff-report -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-editor-handoff --json
npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --json
```

The handoff report includes validation/layout/readiness gates, project counts, scene graph reachability/dead ends/closed cycles, recent checkpoints from `.checkpoints/`, transaction summaries, preview targets, and review items with suggested actions where available. Review items include categories such as `missing-asset`, `unused-asset`, `placeholder-asset`, `ambiguous-asset`, `screen-ui-preview`, and `branch-graph-preview` so humans can see what to import, rename, remove, replace, or inspect. When a desktop project contains `agent-handoff.json` at the project root, Project Settings shows a compact external-agent handoff panel with links into changed pages, supported screens, galleries, endings, and branch flow; acknowledged/resolved review lifecycle state is saved separately in `agent-review-state.json`.

Tell the human creator:

- The `changeSummary.changedPaths` and any `transaction.checkpointPath`.
- What scenes/pages were created.
- Which assets are placeholders.
- Which warnings remain.
- What should be reviewed visually in the editor.
