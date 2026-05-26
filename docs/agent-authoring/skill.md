# Galgame Maker Agent Authoring Skill

Use this skill when an AI agent needs to create or edit a Galgame Maker visual novel project.

This skill doc overlaps with `workflow.md` by design. It is intended for injection into external agent prompts where the full workflow reference may not be available.

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
8. Register endings with `add-ending` before writing `unlock:ending`, and register CG entries with `add-cg` before writing `unlock:cg`.
9. Validate after every meaningful change.
10. Treat runtime preview as the visual source of truth when preview is available.
11. Use `apply-plan` for multi-step edits so checkpoint, validation, and summary are atomic.

See also:

- `docs/agent-authoring/agent-checklist.md`
- `docs/agent-authoring/asset-naming-guidelines.md`
- `docs/agent-authoring/example-adaptation-preview.md`
- `docs/agent-authoring/example-plan.json`
- `docs/agent-authoring/human-review-tutorial.md`
- `docs/agent-authoring/layout-rules.md`
- `docs/agent-authoring/novel-adaptation-skill.md`
- `docs/agent-authoring/phase-83-migration.md`
- `docs/agent-authoring/screen-ui-skill.md`
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
npm run vn -- inspect --script public/game/script.json --json
npm run vn -- validate --script public/game/script.json --json
npm run vn -- validate --script public/game/script.json --check-assets --json
npm run vn -- lint-layout --script public/game/script.json --json
npm run vn -- export-report --script public/game/script.json --json
npm run vn -- export-readiness --script public/game/script.json --json
npm run vn -- render-preview --script public/game/script.json --scene start --page 0 --out .tmp/preview.png --json
```

## Draft Import

When converting prose or an outline, first produce a structured draft JSON, then import it.
Follow `docs/agent-authoring/structured-draft-contract.md` for supported fields, defaults, and conversion rules.
For raw novel prose, first show the human an adaptation preview: concrete background, character expressions, page beats, choices, variable effects, BGM/SE, and missing asset notes. Follow `docs/agent-authoring/novel-adaptation-skill.md`.
Before naming concrete assets, run `list-assets` and prefer semantic filenames documented in `docs/agent-authoring/asset-naming-guidelines.md`.

```bash
npm run vn -- import-draft draft.json --fresh --out public/game/script.json --json
```

For reviewable prose-derived edits, convert that structured draft into an apply-plan manifest first:

```bash
npm run vn -- draft-plan draft.json --out .tmp/draft-plan.json --json
npm run vn -- apply-plan .tmp/draft-plan.json --script public/game/script.json --dry-run --json
```

Use `--fresh` for a new generated project. Omit `--fresh` when importing into an existing script and preserving current content is intended.

`--out` refuses to overwrite existing files unless `--force` is present. Use `--checkpoint` before larger edits and `--backup` with `--force` when overwriting important scripts:

```bash
npm run vn -- import-draft draft.json --fresh --out public/game/script.json --force --checkpoint --backup --json
```

Mutation JSON includes:

- `transaction`: whether the command wrote, plus `checkpointPath` / `backupPath`.
- `changeSummary`: target identifiers, changed contract paths, before/after/delta counts, and validation counts.

## Plan Manifests

For multi-step changes, create a plan manifest and dry-run it before writing:

```bash
npm run vn -- apply-plan plan.json --script public/game/script.json --dry-run --json
npm run vn -- apply-plan plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json
```

See `docs/agent-authoring/plan-manifest.md` for the manifest shape, `docs/agent-authoring/command-reference.md` for operation params, and `docs/agent-authoring/mini-workflows.md` for focused task examples. If validation fails, `apply-plan` does not write unless `--allow-invalid` is present. When `--checkpoint` is used, JSON output includes a rollback descriptor for `restore-checkpoint`.

See `docs/agent-authoring/end-to-end-example.md` for a complete prose-to-plan-to-handoff example.
Use `docs/agent-authoring/example-plan.json` when you need an executable reference route covering affection, endings, CG unlocks, branch analysis, and transitions together.
To create a complete editor-review project from that plan and exercise its handoff/readiness gates, run:

```bash
npm run verify:agent-example -- --out .tmp/agent-example-project --json
```

The generated directory includes project metadata, illustrative SVG assets, the applied script, `agent-handoff.json`, and review artifacts.

## Incremental Edits

For small changes, prefer incremental commands:

```bash
npm run vn -- add-scene --id chapter_1 --name "Chapter 1" --script public/game/script.json --force --backup --json
npm run vn -- rename-scene --scene chapter_1 --new-id chapter_01 --name "Chapter 01" --script public/game/script.json --force --backup --json
npm run vn -- delete-scene --scene unused_branch --script public/game/script.json --force --backup --json
npm run vn -- add-character --id sakura --name "Sakura" --expression normal=characters/sakura_normal.svg --script public/game/script.json --force --backup --json
npm run vn -- add-variable --id sakura_affection --type number --initial 0 --label "Sakura Affection" --script public/game/script.json --force --backup --json
npm run vn -- add-page --scene chapter_1 --type normal --preset solo-center --character sakura:normal --dialogues '[{"speaker":"sakura","text":"Hello."}]' --script public/game/script.json --force --backup --json
npm run vn -- move-page --scene chapter_1 --from 2 --to 0 --script public/game/script.json --force --backup --json
npm run vn -- remove-page --scene chapter_1 --page 3 --script public/game/script.json --force --backup --json
npm run vn -- add-dialogue --scene chapter_1 --page 0 --speaker sakura --text "Welcome back." --script public/game/script.json --force --backup --json
npm run vn -- set-page-background --scene chapter_1 --page 0 --background backgrounds/classroom.svg --script public/game/script.json --force --backup --json
npm run vn -- set-page-media --scene chapter_1 --page 0 --background backgrounds/classroom.svg --bgm audio/theme.ogg --bgm-volume 0.6 --clear-se --script public/game/script.json --force --backup --json
npm run vn -- set-page-characters --scene chapter_1 --page 0 --preset speaker-emphasis --character sakura:smile --script public/game/script.json --force --backup --json
npm run vn -- set-page-camera --scene chapter_1 --page 0 --effect shake --direction both --intensity medium --duration-ms 450 --script public/game/script.json --force --backup --json
npm run vn -- set-page-transition --scene chapter_1 --page 0 --type dissolve --duration 500 --script public/game/script.json --force --backup --json
npm run vn -- set-character-animation --scene chapter_1 --page 0 --character sakura --animation breathe --script public/game/script.json --force --backup --json
npm run vn -- list-transitions --target background --supported-only --json
npm run vn -- set-camera-effect --scene chapter_1 --page 0 --effect shake --direction both --intensity medium --duration-ms 450 --script public/game/script.json --force --backup --json
npm run vn -- set-character-transition --scene chapter_1 --page 0 --character sakura --transition breathe --script public/game/script.json --force --backup --json
npm run vn -- add-choice-effect --scene chapter_1 --page 1 --option 0 --effect-type var:add --effect-id sakura_affection --value 1 --script public/game/script.json --force --backup --json
npm run vn -- add-ending --id good_end --title "Good End" --category main --order 1 --script public/game/script.json --force --backup --json
npm run vn -- add-ending-unlock --scene chapter_1 --page 1 --option 0 --id good_end --script public/game/script.json --force --backup --json
npm run vn -- add-ending-unlock --scene good_ending --page 0 --id good_end --script public/game/script.json --force --checkpoint --json
npm run vn -- add-cg --id cg_confession --title "Confession" --images '["backgrounds/cg/confession.png"]' --thumbnail backgrounds/cg/confession_thumb.png --script public/game/script.json --force --backup --json
npm run vn -- add-cg-unlock --scene chapter_1 --page 1 --option 0 --id cg_confession --script public/game/script.json --force --backup --json
npm run vn -- set-choice-page --scene chapter_1 --page 1 --prompt "What do you ask?" --script public/game/script.json --force --backup --json
```

Use `rename-scene` instead of direct JSON edits when a scene id changes; it updates scene flow, choice targets, and condition targets. `delete-scene` is guarded against deleting externally referenced scenes unless `--force-references` is explicitly used.

Inspect and repair scene references before deleting or merging branch scenes:

```bash
npm run vn -- scene-references --all --script public/game/script.json --json
npm run vn -- scene-references --scene old_route --script public/game/script.json --json
npm run vn -- retarget-scene --from old_route --to new_route --script public/game/script.json --force --checkpoint --json
npm run vn -- graph-report --script public/game/script.json --json
npm run vn -- find-dead-ends --script public/game/script.json --json
npm run vn -- clear-scene-references --scene unused_route --script public/game/script.json --force --checkpoint --json
```

Use `--dry-run` to inspect the validation result without writing:

```bash
npm run vn -- add-scene --id chapter_1 --name "Chapter 1" --dry-run --json
```

Use `author-check` as the preferred handoff gate after meaningful edits:

```bash
npm run vn -- author-check --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json
```

The command aggregates validation, layout lint, export readiness, preview dry-run planning, issues, and suggestions into one JSON payload. With `--transaction`, it reads changed paths from the apply result, focuses changed scene/page checks, plans preview targets for changed scenes and supported screen UI paths, and emits screen UI preview review items; add `--scene` and `--page` only to override that target list.

Generate a handoff report when returning work to the no-code editor or a human reviewer:

```bash
npm run vn -- handoff-report --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-editor-handoff --note "Review newly authored branch." --json
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
- `ending-never-unlocked`
- `no-reachable-ending`
- `unregistered-cg-unlock`
- `dead-end-scene`
- `cycle-without-exit`
- `ending-unlock-unreachable`
- `cg-unlock-unreachable`
- `invalid-transition-param`
- `long-dialogue-text`

## Current Limits

- Preview screenshot automation requires optional Playwright support; use `render-preview --dry-run --write-plan` to verify the render payload without a browser.
- Layout lint is heuristic-only; runtime preview remains the visual source of truth.
- Advanced agent-only effects should not be invented until a shared contract exists.
- Importing prose directly is the external agent's responsibility; this repo currently imports structured draft JSON.
- CG gallery registry authoring is supported through `add-cg`, `update-cg`, `remove-cg`, `add-cg-unlock`, and `list-cg`; do not invent gallery fields or flows outside the shared contract.
- Branch flow analysis is supported through `graph-report`, `find-dead-ends`, `find-missing-assets`, and `find-unused-assets`; reports include repair-ready broken targets and unreachable unlock review, while Story Systems exposes exact route/asset navigation. Flow reports are derived review data, not fields to write into `script.json`.
- Cinematic catalog discovery is supported through `list-transitions`; write only runtime-supported ids unless an explicit fallback is acceptable, and treat `set-character-transition` as the `characters[].animation` compatibility surface.
