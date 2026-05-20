# Agent Authoring Workflow

For the current implementation plan and gap audit, see [roadmap.md](./roadmap.md).

## 1. Inspect

```bash
npm run vn:inspect -- --json
npm run vn:report -- --json
```

Read the current project shape before changing anything.

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

See `docs/agent-authoring/structured-draft-contract.md` for the supported draft fields, defaults, and conversion rules.

## 4. Import Or Mutate

Use one of:

```bash
node tools/vn-author/index.js import-draft draft.json --fresh --out public/game/script.json --json
```

or convert the structured draft into a transactional plan manifest first:

```bash
npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --dry-run --json
```

Use `draft-plan` when prose-derived work should be inspected as operations before anything is written. Use `apply-plan --validate-only` before writing when an external agent needs a saved artifact that proves the plan can be applied and pass validation without mutating the project.

or code:

```js
import { createProjectSession } from './src/authoring/projectSession.js';
```

Avoid direct JSON edits unless the API cannot express the operation yet.

When overwriting an existing script, use explicit intent:

```bash
node tools/vn-author/index.js import-draft draft.json --fresh --out public/game/script.json --force --checkpoint --backup --json
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

Then dry-run and apply it:

```bash
npm run vn:apply-plan -- plan.json --script public/game/script.json --dry-run --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json
npm run vn:apply-plan -- plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

`apply-plan` reads the script once, applies operations in order, validates the final result, and writes once. If validation has errors it refuses to write unless `--allow-invalid` is present. JSON output includes each operation result plus one aggregate `transaction` and `changeSummary`. If an operation itself fails, JSON output includes `operationFailure` with the failed index, id, command, diagnostic code, and supported commands when available; `--result-out` saves that failure payload too.

See [plan-manifest.md](./plan-manifest.md) for the full manifest shape and supported commands.
See [end-to-end-example.md](./end-to-end-example.md) for a complete prose-to-plan-to-handoff walkthrough.

When `--checkpoint` is used, the transaction includes a rollback descriptor. To restore it:

```bash
npm run vn:restore-checkpoint -- public/game/.checkpoints/script.2026-05-19T10-00-00-000Z.json --script public/game/script.json --force --backup --json
```

For small edits:

```bash
node tools/vn-author/index.js add-scene --id chapter_1 --name "Chapter 1" --script public/game/script.json --force --checkpoint --json
node tools/vn-author/index.js rename-scene --scene chapter_1 --new-id chapter_01 --name "Chapter 01" --script public/game/script.json --force --backup --json
node tools/vn-author/index.js delete-scene --scene unused_branch --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-character --id sakura --name "Sakura" --expression normal=characters/sakura_normal.svg --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-variable --id affection --type number --initial 0 --label "Affection" --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-page --scene chapter_1 --type choice --prompt "Answer?" --options '[{"text":"Continue","target":"chapter_2"}]' --script public/game/script.json --force --backup --json
node tools/vn-author/index.js move-page --scene chapter_1 --from 2 --to 0 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js remove-page --scene chapter_1 --page 3 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-dialogue --scene chapter_1 --page 0 --speaker sakura --text "Hello." --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-dialogue --scene chapter_1 --page 0 --dialogue-index 0 --text "Hello again." --script public/game/script.json --force --backup --json
node tools/vn-author/index.js move-dialogue --scene chapter_1 --page 0 --from 2 --to 1 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js remove-dialogue --scene chapter_1 --page 0 --dialogue-index 3 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-choice-option --scene chapter_1 --page 1 --text "Ask about the letter" --target chapter_2 --effects '[{"type":"var:add","id":"affection","value":1}]' --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-choice-page --scene chapter_1 --page 1 --prompt "What do you ask?" --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-choice-option --scene chapter_1 --page 1 --option 0 --text "Ask about the envelope" --target chapter_2 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js move-choice-option --scene chapter_1 --page 1 --from 2 --to 0 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js remove-choice-option --scene chapter_1 --page 1 --option 3 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-condition-page --scene chapter_1 --page 2 --condition-mode any --conditions '[{"variableId":"affection","operator":">=","value":3}]' --true-target chapter_2 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-scene-next --scene chapter_1 --next chapter_2 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-page-characters --scene chapter_1 --page 0 --preset duo-left-right --character sakura:smile --character haruki:normal --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-page-media --scene chapter_1 --page 0 --background backgrounds/classroom.svg --bgm audio/theme.ogg --bgm-volume 0.6 --clear-se --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-choice-effect --scene chapter_1 --page 1 --option 0 --effect-type var:add --effect-id affection --value 1 --script public/game/script.json --force --backup --json
```

`rename-scene` updates scene references in `next`, choice option targets, and condition targets. `delete-scene` refuses to delete scenes referenced from other scenes unless `--force-references` is present.

Before deleting or merging branch scenes, inspect references:

```bash
npm run vn:scene-references -- --all --script public/game/script.json --json
npm run vn:scene-references -- --scene chapter_1_old_route --script public/game/script.json --json
node tools/vn-author/index.js retarget-scene --from chapter_1_old_route --to chapter_1_new_route --script public/game/script.json --force --checkpoint --json
node tools/vn-author/index.js clear-scene-references --scene unused_branch --script public/game/script.json --force --checkpoint --json
```

`scene-references` reports exact `pathString` values for scene `next`, choice targets, and condition targets, plus suggested repair commands. Use `retarget-scene` when preserving branch flow; use `clear-scene-references` only when those jumps should become terminal or intentionally unset.

## 5. Validate Again

```bash
npm run validate:project -- --json
npm run vn:author-check -- --transaction .tmp/apply-plan-result.json --write-preview-plan --json
npm run vn:lint-layout -- --json
npm run vn:readiness -- --json
```

Do not finish with validation errors or readiness blockers. `author-check` is the preferred external-agent gate because it aggregates validation, layout lint, export readiness, and a preview dry-run plan into one JSON payload. Use `--transaction` after `apply-plan --result-out` so the check focuses layout/readiness and scene reference review on changed scenes/pages; pass `--scene` and `--page` only when you need to override the preview target.

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
```

The handoff report includes validation/layout/readiness gates, project counts, scene graph reachability, recent checkpoints from `.checkpoints/`, transaction summaries, and review items with suggested actions where available. When a desktop project contains `agent-handoff.json` at the project root, Project Settings shows a compact external-agent handoff panel for human review.

Tell the human creator:

- The `changeSummary.changedPaths` and any `transaction.checkpointPath`.
- What scenes/pages were created.
- Which assets are placeholders.
- Which warnings remain.
- What should be reviewed visually in the editor.
