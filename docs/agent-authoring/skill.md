# Galgame Maker Agent Authoring Skill

Use this skill when an AI agent needs to create or edit a Galgame Maker visual novel project.

## Mission

Build editable visual novel drafts for human creators. The human creator remains the director. The agent should produce a valid project that opens in the no-code editor and can be revised visually.

## Golden Rules

1. Inspect before editing.
2. Prefer `tools/vn-author` and `src/authoring/*` APIs over raw JSON edits.
3. Preserve existing user content.
4. Write canonical `pages[]`, `systems.*`, and `effects[]`.
5. Never create new `commands[]`.
6. Use layout presets before custom coordinates.
7. Register variables before effects or conditions reference them.
8. Register endings and CG before unlock effects reference them.
9. Validate after every meaningful change.
10. Treat runtime preview as the visual source of truth when preview is available.
11. Use `apply-plan` for multi-step edits so checkpoint, validation, and summary are atomic.

See also:

- `docs/agent-authoring/layout-rules.md`
- `docs/agent-authoring/validation-rules.md`

## First Commands

```bash
npm run vn:inspect -- --json
npm run validate:project -- --json
npm run vn:report -- --json
npm run validate:project -- --check-assets --json
npm run vn:lint-layout -- --json
npm run vn:readiness -- --json
```

Use direct CLI when you need specific paths:

```bash
node tools/vn-author/index.js inspect --script public/game/script.json --json
node tools/vn-author/index.js validate --script public/game/script.json --json
node tools/vn-author/index.js validate --script public/game/script.json --check-assets --json
node tools/vn-author/index.js lint-layout --script public/game/script.json --json
node tools/vn-author/index.js export-report --script public/game/script.json --json
node tools/vn-author/index.js export-readiness --script public/game/script.json --json
node tools/vn-author/index.js render-preview --script public/game/script.json --scene start --page 0 --out .tmp/preview.png --json
```

## Draft Import

When converting prose or an outline, first produce a structured draft JSON, then import it.

```bash
node tools/vn-author/index.js import-draft draft.json --fresh --out public/game/script.json --json
```

Use `--fresh` for a new generated project. Omit `--fresh` when importing into an existing script and preserving current content is intended.

`--out` refuses to overwrite existing files unless `--force` is present. Use `--checkpoint` before larger edits and `--backup` with `--force` when overwriting important scripts:

```bash
node tools/vn-author/index.js import-draft draft.json --fresh --out public/game/script.json --force --checkpoint --backup --json
```

Mutation JSON includes:

- `transaction`: whether the command wrote, plus `checkpointPath` / `backupPath`.
- `changeSummary`: target identifiers, changed contract paths, before/after/delta counts, and validation counts.

## Plan Manifests

For multi-step changes, create a plan manifest and dry-run it before writing:

```bash
node tools/vn-author/index.js apply-plan plan.json --script public/game/script.json --dry-run --json
node tools/vn-author/index.js apply-plan plan.json --script public/game/script.json --force --checkpoint --json
```

See `docs/agent-authoring/plan-manifest.md` for the manifest shape. If validation fails, `apply-plan` does not write unless `--allow-invalid` is present. When `--checkpoint` is used, JSON output includes a rollback descriptor for `restore-checkpoint`.

## Incremental Edits

For small changes, prefer incremental commands:

```bash
node tools/vn-author/index.js add-scene --id chapter_1 --name "Chapter 1" --script public/game/script.json --force --backup --json
node tools/vn-author/index.js rename-scene --scene chapter_1 --new-id chapter_01 --name "Chapter 01" --script public/game/script.json --force --backup --json
node tools/vn-author/index.js delete-scene --scene unused_branch --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-character --id sakura --name "Sakura" --expression normal=characters/sakura_normal.svg --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-variable --id sakura_affection --type number --initial 0 --label "Sakura Affection" --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-page --scene chapter_1 --type normal --preset solo-center --character sakura:normal --dialogues '[{"speaker":"sakura","text":"Hello."}]' --script public/game/script.json --force --backup --json
node tools/vn-author/index.js move-page --scene chapter_1 --from 2 --to 0 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js remove-page --scene chapter_1 --page 3 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-dialogue --scene chapter_1 --page 0 --speaker sakura --text "Welcome back." --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-page-background --scene chapter_1 --page 0 --background backgrounds/classroom.svg --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-page-media --scene chapter_1 --page 0 --background backgrounds/classroom.svg --bgm audio/theme.ogg --bgm-volume 0.6 --clear-se --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-page-characters --scene chapter_1 --page 0 --preset speaker-emphasis --character sakura:smile --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-page-camera --scene chapter_1 --page 0 --effect shake --direction both --intensity medium --duration-ms 450 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-page-transition --scene chapter_1 --page 0 --type dissolve --duration 500 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-character-animation --scene chapter_1 --page 0 --character sakura --animation breathe --script public/game/script.json --force --backup --json
node tools/vn-author/index.js add-choice-effect --scene chapter_1 --page 1 --option 0 --effect-type var:add --effect-id sakura_affection --value 1 --script public/game/script.json --force --backup --json
node tools/vn-author/index.js set-choice-page --scene chapter_1 --page 1 --prompt "What do you ask?" --script public/game/script.json --force --backup --json
```

Use `rename-scene` instead of direct JSON edits when a scene id changes; it updates scene flow, choice targets, and condition targets. `delete-scene` is guarded against deleting externally referenced scenes unless `--force-references` is explicitly used.

Inspect and repair scene references before deleting or merging branch scenes:

```bash
node tools/vn-author/index.js scene-references --scene old_route --script public/game/script.json --json
node tools/vn-author/index.js retarget-scene --from old_route --to new_route --script public/game/script.json --force --checkpoint --json
node tools/vn-author/index.js clear-scene-references --scene unused_route --script public/game/script.json --force --checkpoint --json
```

Use `--dry-run` to inspect the validation result without writing:

```bash
node tools/vn-author/index.js add-scene --id chapter_1 --name "Chapter 1" --dry-run --json
```

Use `author-check` as the preferred handoff gate after meaningful edits:

```bash
node tools/vn-author/index.js author-check --script public/game/script.json --scene start --page 0 --write-preview-plan --json
```

The command aggregates validation, layout lint, export readiness, preview dry-run planning, issues, and suggestions into one JSON payload.

Generate a handoff report when returning work to the no-code editor or a human reviewer:

```bash
node tools/vn-author/index.js handoff-report --script public/game/script.json --transaction .tmp/apply-plan-result.json --out public/game/agent-handoff.json --note "Review newly authored branch." --json
```

## Draft Shape

```json
{
  "projectId": "gm_example",
  "title": "Example",
  "characters": [
    {
      "id": "sakura",
      "name": "Sakura",
      "expressionHints": ["normal", "smile"]
    }
  ],
  "variables": [
    {
      "id": "sakura_affection",
      "type": "number",
      "initial": 0,
      "label": "Sakura Affection"
    }
  ],
  "locations": [
    {
      "id": "school_gate",
      "name": "School Gate",
      "backgroundHint": "backgrounds/school_gate.svg"
    }
  ],
  "scenes": [
    {
      "id": "start",
      "name": "Start",
      "beats": [
        {
          "location": "school_gate",
          "characters": [
            { "id": "sakura", "expression": "smile" }
          ],
          "dialogues": [
            { "speaker": null, "text": "Spring wind moves through the school gate." },
            { "speaker": "sakura", "text": "You came.", "expression": "smile" }
          ]
        }
      ]
    }
  ]
}
```

## Authoring API

For code-based edits, use `createProjectSession`:

```js
import { createProjectSession } from './src/authoring/projectSession.js';

const session = createProjectSession({ script });
session.addCharacter({ id: 'sakura', name: 'Sakura', expressions: { normal: 'characters/sakura_normal.svg' } });
session.addScene({ id: 'start', name: 'Start' });
session.addNormalPage({ sceneId: 'start', dialogues: [{ speaker: 'sakura', text: 'Hello.' }] });
const report = session.validate();
```

## Validation Response

Validation returns:

```json
{
  "ok": false,
  "errors": [],
  "warnings": []
}
```

Errors mean the project is structurally broken. Warnings mean the project may still run, but authoring quality or future persistence may be poor.

Common warnings:

- `missing-project-id`
- `unregistered-variable-effect`
- `unregistered-condition-variable`
- `unregistered-ending-unlock`
- `unregistered-cg-unlock`
- `long-dialogue-text`

## Current Limits

- Preview screenshot automation requires optional Playwright support; use `render-preview --dry-run --write-plan` to verify the render payload without a browser.
- Layout lint is heuristic-only; runtime preview remains the visual source of truth.
- Advanced agent-only effects should not be invented until a shared contract exists.
- Importing prose directly is a model task; this repo currently imports structured draft JSON.
