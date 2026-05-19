# Agent Authoring Workflow

## 1. Inspect

```bash
npm run vn:inspect -- --json
npm run vn:report -- --json
```

Read the current project shape before changing anything.

## 2. Validate

```bash
npm run validate:project -- --json
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

## 4. Import Or Mutate

Use one of:

```bash
node tools/vn-author/index.js import-draft draft.json --fresh --out public/game/script.json --json
```

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

For small edits:

```bash
node tools/vn-author/index.js add-scene --id chapter_1 --name "Chapter 1" --script public/game/script.json --force --checkpoint --json
node tools/vn-author/index.js add-character --id sakura --name "Sakura" --expression normal=characters/sakura_normal.svg --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-variable --id affection --type number --initial 0 --label "Affection" --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-page --scene chapter_1 --type choice --prompt "Answer?" --options '[{"text":"Continue","target":"chapter_2"}]' --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-dialogue --scene chapter_1 --page 0 --speaker sakura --text "Hello." --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-dialogue --scene chapter_1 --page 0 --dialogue-index 0 --text "Hello again." --script public/game/script.json --force --backup --json
node tools/vn-author/index.js move-dialogue --scene chapter_1 --page 0 --from 2 --to 1 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js remove-dialogue --scene chapter_1 --page 0 --dialogue-index 3 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-choice-option --scene chapter_1 --page 1 --text "Ask about the letter" --target chapter_2 --effects '[{"type":"var:add","id":"affection","value":1}]' --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-choice-option --scene chapter_1 --page 1 --option 0 --text "Ask about the envelope" --target chapter_2 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js move-choice-option --scene chapter_1 --page 1 --from 2 --to 0 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js remove-choice-option --scene chapter_1 --page 1 --option 3 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-condition-page --scene chapter_1 --page 2 --condition-mode any --conditions '[{"variableId":"affection","operator":">=","value":3}]' --true-target chapter_2 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-scene-next --scene chapter_1 --next chapter_2 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-page-characters --scene chapter_1 --page 0 --preset duo-left-right --character sakura:smile --character haruki:normal --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-choice-effect --scene chapter_1 --page 1 --option 0 --effect-type var:add --effect-id affection --value 1 --script public/game/script.json --force --backup --json
```

## 5. Validate Again

```bash
npm run validate:project -- --json
npm run vn:lint-layout -- --json
npm run vn:readiness -- --json
```

Do not finish with validation errors or readiness blockers.

## 6. Preview When Available

Use runtime screenshot rendering when Playwright is installed in the workspace:

```bash
npm run vn:render-preview -- --scene start --page 0 --out .tmp/preview.png --json
```

The command starts a lightweight Vite runtime server, captures a PNG with Chromium, and returns a `quality` object in JSON output. Quality checks currently verify screenshot dimensions, transparent coverage, and blank/near-solid captures so agents do not treat an empty frame as a successful visual review.

If Playwright is installed but Chromium is missing, install the browser once:

```bash
npx playwright install chromium
```

Without Playwright, verify the render payload:

```bash
npm run vn:render-preview -- --scene start --page 0 --out .tmp/preview.png --dry-run --write-plan --json
```

## 7. Summarize

Tell the human creator:

- The `changeSummary.changedPaths` and any `transaction.checkpointPath`.
- What scenes/pages were created.
- Which assets are placeholders.
- Which warnings remain.
- What should be reviewed visually in the editor.
