# Migrating Phase 83 Projects

Phase 83 introduced stable `projectId`, `contractVersion`, `systems.variables`, `systems.endings`, `systems.gallery.cg`, and the profile/save authority boundary. Current agent authoring builds on that shape; it does not require replacing a valid Phase 83 script.

## Authority Rules

Preserve these boundaries during migration:

| Existing data | Keep it in | Do not move it into |
| --- | --- | --- |
| Variable, ending, and CG definitions | `script.json` under `systems.*` | save files or profile unlock history |
| Cross-run ending/CG unlock state | `player-data/profile.json` | `script.json` or a save slot |
| Route-local variable snapshot | save slots | the persistent profile as canonical authored data |

Do not regenerate `projectId` for an existing project. Player progression is associated with that stable project identity.

## Incremental Upgrade Path

1. Inspect and validate the existing project before making edits:

```bash
npm run vn:inspect -- --json
npm run validate:project -- --json
npm run vn:readiness -- --json
```

2. Ensure variable references are registered. Prefer `add-affection-variable` when a numeric character relationship should become visible in Story Systems.
3. Register endings with `add-ending`, then attach `unlock:ending` either to an existing choice or to an existing terminal normal page.
4. Register gallery entries with `add-cg`, then attach `unlock:cg` to the relevant choice option.
5. Inspect routes with `graph-report` and repair unresolved terminal routes or unreachable unlocks.
6. Apply supported transitions through the shared catalog only after story routing validates.
7. Re-run readiness with asset checks and produce a handoff report for editor review.

For terminal normal pages, page-entry `effects` may contain only `unlock:ending`. Do not migrate arbitrary choice effects into normal-page entry effects.

## Example Upgrade Plan

[example-plan.json](./example-plan.json) is an executable reference for adding a new multi-ending slice to a project. It demonstrates:

- an affection preset linked to a character;
- two registered endings with terminal arrival unlocks;
- one registered CG unlocked on a choice;
- condition-driven branch routing;
- catalog-backed transition polish, including a directional background wipe plus `crossfade-pan`, `pop`, and `vignette` examples from the completed M5 surface.

Dry-run it against a disposable script or adapt its operations to the existing scene ids:

```bash
npm run vn:apply-plan -- docs/agent-authoring/example-plan.json --script public/game/script.json --validate-only --result-out .tmp/migration-validation.json --json
npm run vn:apply-plan -- docs/agent-authoring/example-plan.json --script public/game/script.json --dry-run --json
```

To inspect the upgraded systems and handoff flow without modifying an existing project, generate the standalone reference project first:

```bash
npm run verify:agent-example -- --out .tmp/agent-example-project --json
```

Do not apply it unchanged to a project that already contains `sakura`, `start`, or the example registry ids.

## Verification

After an upgrade:

```bash
npm run vn -- graph-report --script public/game/script.json --json
npm run vn -- export-readiness --script public/game/script.json --json
npm run vn:handoff-report -- --script public/game/script.json --write-editor-handoff --json
```

In the editor, follow [human-review-tutorial.md](./human-review-tutorial.md) to inspect Story Systems, route flow, assets, and runtime progression without editing JSON.
