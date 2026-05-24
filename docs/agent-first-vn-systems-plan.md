# Agent-First VN Systems Development Plan

**Status:** Active plan  
**Date:** 2026-05-23  
**Supersedes:** `docs/archive/v1.7-planning-report.md`, `docs/archive/gap-analysis-vs-mature-engines.md`, and the older high-level plan in `docs/archive/agent-authoring-architecture.md`

This plan defines the next development cycle for Galgame Maker. The product direction is:

> Human creators use the no-code editor to review, polish, preview, and export. AI agents use stable structured interfaces to author, analyze, and repair projects at a higher ceiling than a no-code UI can expose.

The editor and agent layer must share the same canonical project model. The GUI is one client. The agent CLI/API is another client. Neither should own a private project format.

## 1. Product Commitments

### 1.1 Dual Authoring Entry Points

Galgame Maker now has two first-class authoring paths:

- **Human path:** Vue editor, drag/drop layout, visual tabs, guided forms, preview, export.
- **Agent path:** project contract, authoring API, apply-plan operations, diagnostics, preview targets, handoff artifacts.

The two paths must converge on the same files:

- `project.json`
- `script.json`
- `assets/`
- `player-data/profile.json`
- save files
- `agent-handoff.json`

### 1.2 Agent Capability Is Not Limited By No-Code UX

No-code is for human usability. It is not a ceiling for agents.

Agents may use richer structured commands and bulk operations that would be awkward in the GUI, as long as:

- output remains editable in the GUI;
- runtime/export understand it or degrade safely;
- validators report unsupported or risky data;
- preview/handoff tells humans what changed.

### 1.3 Contract Before UI

For every new system, build in this order:

1. Shared data contract and normalizer.
2. Runtime behavior or safe runtime fallback.
3. Authoring API operation.
4. CLI/apply-plan command.
5. Validation, diagnostics, and changed-path reporting.
6. Editor GUI.
7. Preview/handoff integration.
8. Tests and docs.

The GUI must not become the only way to create or modify a feature.

## 2. Development Framework

### 2.1 Layer Ownership

| Layer | Path | Responsibility | Constraints |
| --- | --- | --- | --- |
| Shared contract | `src/shared/` | Schemas, normalization, validation, graph analysis, effect DSL, transition catalogs | No Vue, no Electron, no DOM, deterministic pure functions where possible |
| Authoring API | `src/authoring/` | Safe mutation sessions used by agents and eventually editor stores | Preserve unrelated data, normalize after edits, return structured results |
| CLI | `tools/vn-author/` | External agent command surface | JSON output, stable error codes, dry-run and checkpoint support |
| Editor | `src/editor/` | Human review and no-code editing | Use shared contracts; avoid private schema forks |
| Runtime | `src/engine/`, `src/ui/` | Playback, profile writes, gallery screens, transitions | Do not trust malformed author data; fallback safely |
| Electron | `electron/` | Project IO, profile files, export, IPC, asset protocol | Path safe, atomic writes, conflict-aware saves |
| Docs | `docs/` | Active contracts, workflows, examples | Archive superseded plans instead of leaving conflicting guidance |

### 2.2 Data Authority Rules

| Data | Authority | Must Not |
| --- | --- | --- |
| Author story/config | `script.json` | Store player progress here |
| Project shell metadata | `project.json` | Duplicate story systems here |
| Persistent player progress | `player-data/profile.json` | Store route-local save snapshots here |
| Save snapshots | `saves/` | Store global unlock truth here |
| Agent review state | `agent-handoff.json` plus local editor state | Mutate gameplay data directly |
| Assets | `assets/<category>/...` | Reference files outside project assets |

### 2.3 Required Feature Shape

Every meaningful feature must ship all of:

- shared schema;
- normalizer;
- validator rules;
- authoring operation;
- CLI/apply-plan command;
- editor surface or explicit editor fallback;
- runtime behavior or explicit safe no-op;
- transaction changed paths;
- author-check/handoff behavior where relevant;
- tests for shared, authoring, CLI, runtime/editor as applicable;
- docs update.

### 2.4 Stable Path Strings

Diagnostics and changed paths must use stable dot paths, for example:

- `systems.variables.sakura_affection`
- `systems.endings.good_end`
- `systems.gallery.cg.cg_001`
- `scenes.start.pages.2.conditions.0`
- `scenes.start.pages.3.options.1.effects.0`
- `ui.titleScreen.elements.0`

Agents and the editor use these paths for navigation, review grouping, and repair hints.

## 3. Milestone Roadmap

### M0 — Integration Contract Consolidation

**Goal:** Turn the existing agent authoring pieces into one explicit integration contract.

Deliverables:

- Add `docs/agent-authoring/integration-contract.md`.
- Link it from README, roadmap, workflow, and project contract.
- Define operation, transaction, diagnostics, preview target, handoff, and conflict shapes.
- Mark old high-level plans as archived.

Acceptance:

- A new developer can identify the active contract docs in under two minutes.
- Old roadmap documents no longer compete with active docs.
- New systems can point to a single checklist before implementation starts.

### M1 — Variable Registry + Condition GUI + Affection Preset

**Goal:** Make variables and conditions production-grade for humans and agents.

Data contract:

- Keep `systems.variables` as the registry.
- Extend entries to support:
  - `type`: `number` or `bool`
  - `initial`
  - `label`
  - `group`
  - `notes`
  - optional `kind`: `generic` or `affection`
  - optional `characterId` for affection variables
  - optional `min`, `max`, `step` for numeric UX

Runtime:

- Ensure variable defaults seed from registry.
- Preserve legacy values where safe.
- Reject or warn on type-incompatible effects.

Authoring API/CLI:

- `add-variable`
- `update-variable`
- `rename-variable`
- `delete-variable`
- `add-affection-variable`
- `set-condition-page`
- `add-choice-effect`
- `set-choice-effect`
- `remove-choice-effect`

Editor:

- Variables tab or project systems panel.
- Variable inspector with references.
- Affection preset button from character page.
- Condition builder with variable picker.
- Choice effect editor with add/sub/set controls.

Validation:

- unregistered variable references;
- type mismatch in conditions/effects;
- duplicate/invalid variable ids;
- affection variable with missing character;
- unsafe delete when references exist;
- condition with no true/false target.

Agent adaptation:

- Agents must be able to register variables before using them.
- Agents must receive reference rewrite counts on rename.
- Handoff should flag variable changes and route them to the variable UI.

Tests:

- Shared registry normalization.
- Runtime variable default seeding.
- Authoring operation tests.
- CLI command tests.
- Editor source or component tests for variable navigation.
- Validation fixtures for bad conditions and effects.

Definition of done:

- A human can create affection from the GUI.
- An agent can create the same affection variable via apply-plan.
- Both paths produce identical canonical `script.json`.

### M2 — Ending Registry + Persistent Profile Progression

**Goal:** Implement explicit ending tracking with clean save/profile separation.

Data contract:

- Keep `systems.endings`.
- Ending entry fields:
  - `id`
  - `title`
  - `category`
  - `order`
  - `description`
  - optional `thumbnail`
  - optional `hiddenUntilUnlocked`

Runtime/profile:

- `unlock:ending` writes to `player-data/profile.json`.
- Track:
  - unlocked state;
  - first unlocked timestamp;
  - unlock count.
- Save slots must not be the authority for ending unlock truth.

Authoring API/CLI:

- `add-ending`
- `update-ending`
- `remove-ending`
- `add-ending-unlock`
- `list-endings`

Editor:

- Ending registry panel.
- Minimal ending status/debug surface in preview/editor.
- Ending unlock effect picker.

Validation:

- `unlock:ending` references missing ending;
- registered ending is never unlocked;
- ending id invalid/duplicate;
- no reachable ending unlock in a handoff-ready project;
- ending thumbnail missing.

Agent adaptation:

- Agents can infer endings from outline and register them.
- Agents can add explicit unlock effects at route conclusions.
- Handoff reports newly registered endings and routes needing review.

Tests:

- Profile write and reset tests.
- Export/runtime persistence parity.
- Validator and authoring API tests.
- CLI tests for ending operations.

Definition of done:

- Deleting a save slot does not delete ending progress.
- Reset profile clears ending progress through explicit reset flow.
- Agent-created endings appear in editor review surfaces.

### M3 — CG Registry + Gallery

**Goal:** Add explicit CG registration, unlocks, and a minimal gallery.

Data contract:

- Keep `systems.gallery.cg`.
- CG entry fields:
  - `id`
  - `title`
  - `images`
  - `thumbnail`
  - `lockedThumbnail`
  - `category`
  - `order`
  - `description`

Runtime/profile:

- `unlock:cg` writes to profile.
- Gallery reads registry plus profile.
- Missing image files show locked/error fallback instead of breaking.

Authoring API/CLI:

- `add-cg`
- `update-cg`
- `remove-cg`
- `add-cg-unlock`
- `list-cg`

Editor:

- CG registry panel.
- Minimal gallery preview.
- Unlock effect picker.
- Asset picker integration for thumbnails/images.

Validation:

- `unlock:cg` references missing CG;
- CG image missing;
- thumbnail missing;
- registered CG is never unlocked;
- CG references unused/missing assets.

Agent adaptation:

- Agents can create CG candidates from major scene beats.
- Agents must explicitly register and unlock CGs.
- Handoff flags placeholder CGs and missing art.

Tests:

- Profile unlock tests.
- Gallery rendering tests.
- Validator and CLI tests.
- Export asset scanning includes gallery assets.

Definition of done:

- A player can unlock a CG in one run and view it after returning to title/gallery.
- Agent-created CG entries are editable and reviewable in GUI.

### M4 — Branch Flow Graph + Dead-End + Asset Analysis

**Goal:** Make long projects analyzable by humans and agents.

Shared analysis:

- Build graph from:
  - scene `next`;
  - choice targets;
  - condition true/false targets.
- Include page-level graph where useful.
- Export machine-readable graph and Mermaid.

Diagnostics:

- unreachable scenes;
- dead ends without explicit ending/unlock;
- missing targets;
- cycles without obvious exit;
- conditions with impossible or suspicious comparisons;
- registered endings never reachable;
- registered CGs never unlockable;
- missing assets;
- unused assets.

Authoring API/CLI:

- `graph-report`
- `find-dead-ends`
- `find-unused-assets`
- `find-missing-assets`
- `repair-scene-target`
- extend `author-check` and `handoff-report`.

Editor:

- Branch flow view.
- Scene node badges:
  - unreachable;
  - dead end;
  - ending route;
  - has review item.
- Click graph node to navigate to scene/page.

Agent adaptation:

- Agents can ask for graph JSON before major route edits.
- Agents can use repair hints to retarget or clear references.
- Handoff includes graph summary.

Tests:

- Shared graph fixtures.
- CLI JSON and Mermaid snapshot tests.
- Handoff grouping tests.
- Editor navigation tests.

Definition of done:

- A project with an unreachable route is flagged before handoff.
- A human can open the graph and jump to the problem scene.
- An agent receives exact repair commands or repair hints.

### M5 — Transition Catalog Expansion

**Goal:** Add more visual polish while keeping transitions contract-safe.

Contract:

- Introduce a transition catalog in `src/shared/cinematicContract.js` or a new `transitionCatalog.js`.
- Each transition has:
  - `id`
  - `label`
  - `target`: background, character, screen, camera
  - `paramsSchema`
  - defaults
  - runtime support flag
  - editor support flag
  - fallback id

Candidate transitions:

- background: `fade`, `dissolve`, `wipe-left`, `wipe-right`, `wipe-up`, `wipe-down`, `zoom-in`, `zoom-out`, `blur`, `flash`, `iris-in`, `iris-out`, `crossfade-pan`
- character: `fade`, `slide-left`, `slide-right`, `pop`, `scale-in`, `blur-in`
- screen/camera: `shake`, `flash`, `vignette`, `letterbox`, `pan`, `zoom`

Runtime:

- Unknown transitions fall back safely.
- Invalid params clamp to safe ranges.
- Transitions must not block input indefinitely.

Authoring API/CLI:

- `list-transitions`
- `set-page-transition`
- `set-character-transition`
- `set-camera-effect`

Editor:

- Transition picker grouped by target.
- Parameter controls generated from schema.
- Preview per page.

Validation:

- unknown transition id;
- unsupported target;
- invalid duration/easing/params;
- transition asset missing where applicable.

Agent adaptation:

- Agents can bulk apply transitions by scene, page range, or predicate.
- Agents can inspect available transition catalog before writing.

Tests:

- Catalog normalization tests.
- Runtime fallback tests.
- CLI transition command tests.
- Build/export tests.

Definition of done:

- Transition ids are discoverable and safe for agents.
- GUI and CLI share the same transition list.

### M6 — Release Hardening And Examples

**Goal:** Make the new systems usable outside development sessions.

Deliverables:

- Example project covering variables, affection, endings, CGs, branch graph, and transitions.
- Agent example plan that builds a small multi-ending route.
- Human tutorial for reviewing agent output.
- Export readiness gate updated for new systems.
- Migration notes from Phase 83 projects.

Acceptance:

- A fresh agent can use docs to add a two-ending route with one affection variable and one CG unlock.
- A human can inspect that result in the editor without reading JSON.

## 4. Global Engineering Constraints

### 4.1 Contract And Schema

- New data must be normalized in `src/shared`.
- New data must be documented in `docs/agent-authoring/project-contract.md` or a linked system contract.
- New data must include validation rules.
- New data must include safe defaults.
- Unknown future-compatible values may be preserved only if runtime fallback is explicit and validation warns.

### 4.2 Agent Operations

- Agents should not be required to click the GUI.
- Agents should not directly edit JSON when an authoring operation exists.
- Every new GUI-only feature must either add an agent operation or explicitly document why no agent surface is needed.
- `apply-plan` operations must be deterministic.
- Operation failures must include stable error codes and repair hints.
- Multi-operation writes must support dry-run, validate-only, checkpoint, result-out, and changed paths.

### 4.3 Editor Integration

- Editor stores should use shared normalizers.
- Editor-specific temporary UI state must not leak into `script.json`.
- If editor and agent can both edit a domain, they must converge on the same canonical shape.
- The editor must continue blocking stale saves after external agent changes.
- Handoff navigation should support every new top-level system path.

### 4.4 Runtime And Profile

- Author data and player data must stay separate.
- Cross-run progression belongs in profile, not save slots.
- Save slots may contain current variable state but not canonical unlock history.
- Runtime profile writes must be caught and reported without crashing gameplay.
- Reset operations must name their scope: contract, profile, saves, or all.

### 4.5 Security And File Safety

- Asset paths must stay under project `assets/`.
- Export must never copy from or write to paths escaped by `..` or absolute paths.
- Electron IPC must validate paths and file categories.
- Agent commands must not execute arbitrary shell, HTML, CSS, or JavaScript from project data.
- Structured UI config is allowed; raw HTML/CSS injection is not.

### 4.6 Tests And Gates

Minimum closure gates for every milestone:

```bash
npm run test
npm run build
npm run build:web
npm audit --audit-level=moderate
```

When a milestone touches export, profile, or Electron IPC, add targeted tests and run them explicitly before full gates.

### 4.7 Documentation

- Active plans live under `docs/` or `docs/agent-authoring/`.
- Superseded plans move to `docs/archive/`.
- README should link only active guidance.
- Historical reports may stay if they are clearly marked as completed reports.

## 5. Cut Lines

If scope grows too large, protect these in order:

1. Data contract clarity.
2. Authoring API/CLI parity.
3. Runtime/profile correctness.
4. Validation and handoff.
5. Minimal editor GUI.
6. Visual polish.

Do not ship a visually nice GUI that produces data agents cannot validate or edit.

## 6. Immediate Next Steps

Recommended implementation order:

1. Finish M0 docs and update links.
2. Implement M1 variable/condition/affection operation parity.
3. Extend editor routing for `systems.variables.*`.
4. Add ending registry commands before ending UI.
5. Add graph diagnostics before graph visualization.
6. Expand transition catalog only after graph/system contracts are stable.
