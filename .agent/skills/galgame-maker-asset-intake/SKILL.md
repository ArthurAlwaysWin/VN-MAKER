---
name: galgame-maker-asset-intake
description: Inspect, classify, match, and plan Galgame Maker project assets for AI-authored visual novels. Use when a user has raw story text, missing art/audio, ambiguous filenames, placeholder assets, character expression needs, background/CG/BGM/SE needs, or asks what assets are required before an agent builds or polishes a game.
---

# Galgame Maker Asset Intake

Use this skill before prose adaptation, staging, UI work, or release QA when asset availability is unknown.

## Inspect

Run:

```bash
npm run vn -- list-assets --script public/game/script.json --json
npm run vn -- find-missing-assets --script public/game/script.json --asset-root public/game --json
npm run vn -- find-unused-assets --script public/game/script.json --asset-root public/game --json
```

If the project path differs, use the actual `script.json` and asset root.

## Match Assets

Map story needs to exact asset paths using filename tokens and semantics:

- Backgrounds: location, mood, time.
- Characters: character id, expression, pose if available.
- CG: major story beat or gallery unlock.
- BGM: mood, route, scene.
- SE: sound or action.
- UI: screen or widget role.

Prefer existing assets when they honestly fit. If several assets are plausible, mark the choice as ambiguous instead of guessing silently.

## Produce An Asset Plan

For each needed asset, report:

- Intended use.
- Preferred path.
- Whether it already exists.
- Placeholder status.
- Blocking status for preview/export.
- Handoff note for the human.

Use paths and naming from `asset-naming-guidelines.md`.

## References

- `../../../docs/agent-authoring/asset-naming-guidelines.md` for naming and matching.
- `../../../docs/agent-authoring/project-contract.md` for supported asset buckets.
- `../../../docs/agent-authoring/validation-rules.md` for missing asset handling.
- `../../../docs/agent-authoring/novel-adaptation-skill.md` when assets are derived from prose.

## Do Not

- Do not claim an asset exists unless `list-assets` or filesystem inspection confirms it.
- Do not hide missing assets by inventing paths.
- Do not block a playable draft only because final art is missing; record placeholders and handoff items when allowed.
