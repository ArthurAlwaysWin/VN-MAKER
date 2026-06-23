# Unified Screen Designer Roadmap

**Status:** Phase 0-3 complete; Phase 4+ not started
**Date:** 2026-06-23
**Planning base:** `main` at `7cf2e9a`
**Phase 1 completion:** `fa11d14`
**Architecture:** [unified-screen-designer-architecture.md](./unified-screen-designer-architecture.md)

## Purpose

Deliver a UE-inspired Unified Screen Designer as a sequence of independently testable vertical slices, while preserving current projects, runtime behavior, no-code editing, agent authoring, preview, and export.

This roadmap covers exactly seven primary UI surfaces:

1. title;
2. gameplay UI;
3. game menu;
4. settings;
5. save/load;
6. backlog/history;
7. gallery.

Text input, confirmation prompts, and video controls are shared overlays. Backlog means dialogue history; this roadmap does not introduce a separate story-replay screen.

## Global Invariants

Every phase must preserve these rules:

1. `script.json` remains the canonical editable project contract.
2. Current `main` is the implementation base; old backups are evidence only.
3. The product is Agent-first and Editor-completable: the CLI is a controlled creation superset, while the desktop editor must render, inspect, preserve, and safely polish every shipped capability.
4. Runtime and editor preview converge on one renderer; no new screen-specific preview imitation is accepted.
5. Story-page authoring remains owned by Page Editor; Unified Screen Designer owns gameplay UI chrome.
6. No arbitrary HTML, CSS, JavaScript, expressions, shaders, or project-local executable plugins enter project data.
7. Actions, bindings, widgets, states, style properties, predicates, animations, and built-in adapters remain typed, allowlisted, and understood by the shared renderer before the Agent CLI may write them.
8. Existing projects continue to load. Migration is explicit, checkpointed, reportable, and rollback-friendly.
9. Patch-based undo/redo and `changeRevision` semantics remain intact.
10. Interactive acceptance requires behavior or browser evidence; source-string `toContain()` assertions are not sufficient.
11. Each phase stops at its stated boundary and updates this roadmap when complete.
12. Keep work local unless the user explicitly asks to commit, push, or open a PR.

## Phase Overview

| Phase | Name | Outcome | Risk | Status |
| --- | --- | --- | --- | --- |
| 0 | Scope And Decision Lock | Seven screens, overlays, terminology, boundaries, and non-goals are fixed. | Low | Complete in docs |
| 1 | Baseline And Parity Harness | Current screen behavior and visual baselines are captured before structural change. | Medium | Complete |
| 2 | Canonical UI Document Contract | Versioned nodes, layout, actions, bindings, validation, and legacy adapters exist. | High | Complete |
| 3 | Shared Renderer And Semantic Widget Host | Runtime and preview can render canonical documents through one path. | High | Complete |
| 4 | Unified Editor Shell | Palette, hierarchy, canvas, inspector, context menu, keyboard, geometry, and undo work. | High | Not started |
| 5 | Title Vertical Slice | Title becomes the first end-to-end canonical screen and proves migration. | High | Not started |
| 6 | Game Menu And Shared Confirmation | Menu navigation and reusable confirmation overlay migrate safely. | Medium/High | Not started |
| 7 | Save/Load And Backlog | Stateful list screens migrate without breaking persistence, pagination, or voice replay. | High | Not started |
| 8 | Settings | Structured settings widgets migrate without weakening ConfigManager or accessibility. | High | Not started |
| 9 | Gameplay UI | Dialogue, nameplate, choices, and quick actions migrate while story staging stays separate. | High | Not started |
| 10 | Gallery And Remaining Overlays | Gallery, text input, and video controls join the canonical system. | Medium/High | Not started |
| 11 | Migration, Authoring, Export, And Release Closure | All paths converge; legacy removal is gated by evidence. | High | Not started |

## Phase 0 - Scope And Decision Lock

**Status:** Complete in these planning documents.

Locked decisions:

- seven primary UI surfaces are in scope;
- backlog means dialogue history;
- save and load are variants of one screen;
- gallery remains the CG/ending collection surface;
- game menu is a first-class screen;
- gameplay story staging and gameplay UI editing remain separate;
- text input, confirmation, and video controls are shared overlays;
- AI agents are the primary screen-creation surface; humans review and polish through the editor;
- advanced Agent capabilities may precede bespoke GUI controls only when the editor can render, inspect, preserve, explain, and safely disable or reset them;
- the product borrows UE's hierarchy/canvas/inspector model without adopting Blueprint Graph or arbitrary runtime scripting;
- implementation is phased migration, not a simultaneous rewrite.

Acceptance:

- architecture and roadmap agree on names and boundaries;
- no implementation begins with unresolved screen-count or backlog terminology;
- every later phase has a stop boundary and evidence gate.

## Phase 1 - Baseline And Parity Harness

**Goal:** Establish evidence for current behavior before replacing any rendering or editing path.

**Status:** Complete on 2026-06-22. See [unified-screen-designer-phase-1-baseline.md](./unified-screen-designer-phase-1-baseline.md).

Deliver:

- enumerate canonical fields, runtime states, editor controls, actions, and asset references for all seven screens and shared overlays;
- add representative legacy fixtures, including minimally configured and heavily customized projects;
- capture deterministic runtime fixtures for settings, populated/empty save slots, save/load modes, backlog with/without voice, locked/unlocked gallery entries, menu entry sources, title button variants, and gameplay UI states;
- add screenshot targets at 1280x720 and at least one alternate aspect ratio;
- add DOM behavior tests for navigation, focus, close routing, destructive confirmation, pagination, async refresh, and relevant keyboard input;
- record a parity ledger linking each current behavior to a future semantic widget or explicit retirement decision.

Primary areas:

- `src/ui/*.js`
- `src/editor/views/*Editor.vue`
- `src/editor/composables/useScreenLayoutEditor.js`
- `src/main.js`
- `src/shared/*Contract.js`
- preview renderer and existing screen-layout tests

Acceptance:

- no runtime or contract behavior changes in this phase;
- each primary screen has a fixture, behavior checklist, and preview target;
- later renderer work can distinguish intended change from regression;
- baseline screenshots and fixtures stay outside committed output unless intentionally added as stable test assets.

**Stop boundary:** Do not introduce the new document schema or renderer in Phase 1.

Completion evidence:

- added a deterministic legacy fixture catalog spanning all seven primary screens, settings modes, save/load data and routes, Backlog voice states, Gallery lock/multi-image/ending states, gameplay UI, and shared overlays;
- added or strengthened DOM behavior coverage for title actions, gameplay UI owners, text-input focus/Enter submission, menu actions, save/load confirmation and source routing, Gallery empty/mixed states, Backlog empty/voiced states, Settings fixture modes, and video Escape skipping;
- directly related UI suite passed: 13 files, 256 tests;
- Browser verified title identity, non-blank DOM, settings open/close interaction, and a clean current-page console;
- screenshots captured under `.tmp` at 1280x720 and 1440x900; in-app screenshot capture timed out, so only screenshot capture used the installed Playwright CLI fallback;
- recorded current focus, preview-fixture, standalone sample-project, and editor/runtime parity gaps without changing runtime or contract behavior.
- closure batch aligned the populated Save/Load fixture with runtime `previewText` and added rendered preview text, timestamp, and inline-thumbnail assertions.

Remaining non-blocking prerequisite carried forward:

- `public/game/script.json` has no stable `projectId`, so Phase 3 must establish a repeatable runnable browser fixture before renderer/browser acceptance depends on it.

## Phase 2 - Canonical UI Document Contract

**Goal:** Define the safe, versioned data model before building a general editor around it.

**Status:** Complete on 2026-06-22.

Deliver:

- add shared contracts for screen documents, nodes, hierarchy, layout constraints, style references, typed overrides, states, variants, semantic data slots, and allowlisted actions;
- lock one canonical action namespace with typed parameters and a complete, screen-aware mapping from current runtime action strings;
- define the contract perimeter between `ui.screens` / `ui.overlays`, `ui.theme`, `ui.motion`, shared or legacy widget styles, and external asset registries;
- define per-screen authority states so canonical and legacy layouts never act as simultaneous editable writers;
- define stable ids and deterministic node ordering;
- define primitive and semantic widget registries with field schemas and required parts;
- define capability tiers for common editor operations, advanced Agent composition, and registered built-in adapters;
- define the seven screen registry and shared overlay registry;
- normalize and validate anchors, pivot, offsets, sizes, constraints, padding, alignment, and safe areas;
- add resolution-aware, pure legacy-to-document adapters for existing title, game menu, settings, save/load, backlog, dialogue, widget-style, theme, and motion data;
- produce migration diagnostics for data that cannot yet map without loss;
- add changed-path and asset-reference collection for proposed canonical documents;
- define minimum canonical contract envelopes and capability gates for reusable component instances, responsive variants, bounded context predicates, and typed animation tracks rather than opaque Agent metadata;
- define a closed runtime context-key registry and bounded predicate operators; screen-specific keys may be added only with matching renderer and validator support;
- define the relationship and precedence requirements between `ui.motion`, typed animation tracks, runtime widget state, and reduced-motion preferences;
- define the theme-owned `.gmtheme` projection for canonical screen documents without treating the package as a second project schema;
- keep layout recipes and procedural component expansion compile-to-plan only; they may not become runtime dependencies and mutation commands remain gated until their normalized output is renderable and validated;
- update `project-contract.md` and `validation-rules.md` with the new read-only canonical shape, authority rules, and stable diagnostic codes; mutation command documentation remains gated with mutation support;
- expose read-only inspect/list operations to the authoring layer; mutation may remain gated until Phase 4.

Tests:

- schema and hierarchy validation;
- cycles, missing parents, duplicate ids, unknown widget/action/binding types, unsafe style fields, and invalid assets are rejected or warned consistently;
- legacy normalization is deterministic and does not mutate input;
- normalization is idempotent;
- fixtures preserve meaningful legacy configuration;
- unsupported fields are reported rather than silently dropped.
- every current action maps to one canonical action or produces an explicit diagnostic;
- the same screen cannot resolve both legacy and canonical composition as active writers;
- advanced capability data is rejected until its renderer and validator capability is registered;
- `.gmtheme` projection excludes transient runtime state and reports unsupported canonical screen detail.

Acceptance:

- the document model can represent all seven target surfaces and overlays;
- advanced Agent-authored data is renderable, inspectable, preservable, and rejectable by normal contracts before any mutation command ships;
- no runtime screen is switched to the new renderer yet;
- `script.json` does not gain arbitrary executable or presentation strings;
- the migration report is good enough for human review before a write.
- Phase 2 decision gates are recorded in the architecture and resolved in contract tests rather than deferred as implicit renderer behavior.

**Stop boundary:** Do not build the editor shell or persist automatic migrations in Phase 2.

Completion evidence:

- added shared action, layout, document, authority, capability, and legacy-adapter contracts;
- locked seven screens, three overlays, ordered stable nodes, protected semantic parts, typed actions/bindings/styles/assets, and version 2 semantics;
- integrated canonical diagnostics into `validateProject` without changing production renderer selection;
- added pure resolution-aware legacy inspection for all seven screens and shared overlay envelopes, with explicit unsupported/loss diagnostics;
- added pure `.gmtheme` canonical-screen projection excluding transient/action/binding data; persisted round-trip remains Phase 5;
- added read-only screen/node/schema session and CLI inspection; no canonical mutation or migration command was added;
- Phase 2 focused contract/adapter/inspection tests pass without source-string acceptance assertions;
- Phase 1 six-file matrix remains 195 passing tests.

## Phase 3 - Shared Renderer And Semantic Widget Host

**Goal:** Render canonical documents through one implementation usable by runtime and editor preview.

**Status:** Complete on 2026-06-23.

Deliver:

- create the shared renderer host and node lifecycle;
- prototype and measure the editor host, then lock an in-process, iframe, or hybrid integration without introducing a second renderer implementation;
- render primitive layout/visual widgets;
- add `data-gm-ui-node-id` or an equivalent stable selection bridge;
- implement typed style resolution and theme precedence;
- implement action routing and named data-source injection;
- define semantic-widget host boundaries and required-part enforcement;
- provide reusable host-level focus acquisition, restoration, accessible-name, and modal primitives for later semantic widgets;
- add deterministic editor fixtures and runtime adapters;
- support incremental screen updates without retaining stale listeners or async work;
- extend preview messaging with document snapshots, fixtures, renderer diagnostics, and safe action reporting.

Tests:

- runtime and preview render the same normalized document structure;
- mount, update, and unmount do not leak listeners;
- theme defaults, screen references, node overrides, and state styles resolve in order;
- unknown future-safe data degrades predictably;
- destructive/persistent actions are inert or diagnostic in ordinary preview mode;
- focus and accessible names survive renderer updates.
- renderer-host measurements cover snapshot size, update frequency, pointer-gesture behavior, and selection latency before the editor host mode is locked.

Acceptance:

- a synthetic document renders identically through runtime and preview hosts;
- semantic widgets can be added one screen at a time;
- current production screens still use their existing renderer paths.

**Stop boundary:** Do not migrate a production screen or remove legacy rendering in Phase 3.

Completion evidence:

- added `SharedUiRenderer` plus runtime and preview hosts that share one DOM renderer and differ only by host policy;
- rendered primitive nodes, semantic-widget placeholders, stable `data-gm-ui-node-id`, typed layout, typed style/state precedence, and accessible names;
- added canonical action routing, named data-source injection, preview-safe diagnostics for persistent/destructive actions, and semantic required-part enforcement;
- added host-level focus acquisition/restoration, modal trap primitives, lifecycle/update abort signals, incremental update reuse, unmount cleanup, and selection-latency measurements;
- added deterministic renderer fixtures and a stable browser fixture at `/ui-renderer-fixture.html`;
- fixed the committed sample `public/game/script.json` prerequisite by adding a stable `projectId`;
- integrated canonical preview snapshot/update/unmount messages through the existing preview dispatch seam without switching any production screen;
- focused renderer/host tests pass and browser evidence confirms runtime/preview node parity plus preview-safe diagnostics.

Remaining boundary:

- no production screen uses the shared renderer yet;
- no Unified Editor Shell, Title vertical slice, migration write path, or production screen migration was started.

## Phase 4 - Unified Editor Shell

**Goal:** Build the reusable authoring experience before migrating individual screens.

Internal delivery boundary: Phase 4 may be completed as two separately reviewed sessions while remaining one roadmap phase.

### Phase 4a - Canvas, Hierarchy, And Inspection

Deliver:

- screen selector and viewport toolbar;
- primitive/semantic palette;
- stable hierarchy tree with reorder and valid nesting rules;
- renderer-backed canvas with selection overlay;
- typed inspector generated from widget and field schemas;
- synchronized canvas/hierarchy selection;
- validation and migration-diagnostic panels;
- advanced-feature badges and read-only inspector summaries that prove unknown/advanced fields survive unrelated edits.

**Phase 4a stop boundary:** A synthetic fixture can be rendered, selected, inspected, and patched without implementing geometry gestures or migrating a production screen.

### Phase 4b - Interaction, Geometry, And Undo

Deliver:

- context menu that selects its target before offering valid actions;
- duplicate, delete, reorder, wrap/group, reset override, copy/paste, and keyboard nudge where valid;
- anchors, pivot, resize, snapping, grid, safe-area, zoom, scrolling, and letterbox-aware coordinate conversion;
- focus-safe Delete/Backspace and shortcuts;
- one patch-history transaction per completed gesture;
- schema-aware path patches that preserve fields the GUI does not directly edit and warn only when an operation would intentionally delete, reset, replace, or flatten them.

Tests:

- browser interaction tests for selection, right-click, duplicate/delete, hierarchy reorder, drag, resize, anchors, zoom, scroll, letterboxing, keyboard focus, and undo/redo;
- required semantic parts cannot be removed or invalidly nested;
- a completed gesture creates one undo step, while pointer moves do not flood history;
- renderer node ids remain stable across unrelated edits.

Acceptance:

- the shell can edit a synthetic fixture end to end;
- runtime preview and authoring canvas remain the same renderer path;
- no production screen is migrated solely to demonstrate the shell.

**Stop boundary:** Stop before Title migration and review the interaction model in a real browser.

## Phase 5 - Title Vertical Slice

**Goal:** Prove the full contract-renderer-editor-migration-authoring loop on the most mature existing screen.

Deliver:

- map existing title text, image, and button elements to canonical nodes;
- preserve title actions, BGM, opening-video behavior, custom fonts, backgrounds, motion, and theme assets;
- replace the direct Vue visual interpretation with the shared renderer;
- expose title hierarchy, palette, canvas, inspector, right-click, keyboard, layer order, anchors, and responsive preview;
- add canonical add/update/move/duplicate/remove operations with validate-only, dry-run, checkpoint, and result output;
- add explicit title migration preview and write paths;
- implement the canonical Title theme-owned `.gmtheme` projection and import preference rules;
- route canonical Title assets through export/readiness and packaged/web runtime collection;
- retain legacy read compatibility.

Tests:

- default, preset, and customized legacy title fixtures preserve behavior;
- every built-in title action routes correctly;
- right-click deletion and keyboard deletion operate on the intended selected element;
- migration round-trip and rollback preserve data;
- `.gmtheme` export/import preserves the theme-owned canonical Title composition without reviving legacy data as a second writer;
- export/readiness and packaged/web runtime collect every referenced canonical Title asset;
- runtime/editor parity screenshots cover multiple aspect ratios;
- opening-video policy remains unchanged.

Acceptance:

- Title is fully editable only through the shared shell and canonical renderer;
- no title behavior requires raw JSON editing;
- migration is explicit and non-lossy for supported legacy data;
- legacy Title rendering is not removed until compatibility gates pass.

**Stop boundary:** Review the vertical slice before migrating any other screen.

## Phase 6 - Game Menu And Shared Confirmation

**Goal:** Migrate a bounded navigation screen and establish reusable modal confirmation.

Deliver:

- canonical game-menu document and semantic navigation actions;
- preserve Escape/right-click behavior, focus, source-aware close routing, icons, and built-in destinations;
- migrate panel/button configuration into nodes and style references;
- introduce the shared confirmation overlay with protected required parts and typed confirm/cancel actions;
- use the confirmation overlay in at least one real destructive flow without broadening unrelated behavior;
- add editor and authoring operations for both templates.

Tests:

- open/close from every supported source returns correctly;
- mouse, keyboard, and gamepad focus routing remain deterministic;
- disabled/unavailable destinations expose the correct state;
- confirmation traps/restores focus and invokes exactly one action;
- browser interaction and runtime parity evidence pass.

Acceptance:

- game menu uses the canonical renderer in runtime and editor;
- confirmation is reusable and does not embed screen-specific callbacks in project data.

**Stop boundary:** Do not begin save/load migration in this phase.

## Phase 7 - Save/Load And Backlog

**Goal:** Migrate the two stateful list screens while preserving engine-owned data behavior.

Phase 7 is delivered through two independent internal slices so each stateful screen has its own evidence and stop boundary.

### Phase 7a - Save/Load

Deliver:

- canonical save/load document with `save` and `load` variants;
- semantic save-slot grid with protected pagination, thumbnail, empty-slot, metadata, and mode-correct action parts;
- preserve async refresh cancellation, cached slot behavior, source routing, save/load/delete callbacks, and confirmation;
- migrate existing background, header, grid, pagination, decoration, icon, and style fields;
- add Save/Load authoring operations, migration reports, accessibility, export, and `.gmtheme` projection evidence.

**Phase 7a stop boundary:** Save/Load passes its persistence, confirmation, routing, browser, migration, and export gates before Backlog migration begins.

### Phase 7b - Backlog

Deliver:

- canonical backlog document and semantic history list;
- preserve scrolling, speaker/text presentation, empty state, voice replay, and playback errors;
- migrate existing background, header, list, decoration, icon, and style fields;
- expose valid slots/parts in hierarchy and inspector without allowing invariants to be deleted;
- add Backlog authoring operations, migration reports, accessibility, export, and `.gmtheme` projection evidence.

**Phase 7b stop boundary:** Backlog passes voice lifecycle, browser, migration, and export gates before Settings migration begins.

Tests:

- empty/populated/full save grids;
- save and load modes render correct actions and titles;
- pagination and superseded async renders remain correct;
- delete confirmation and focus restoration work;
- backlog ordering, scrolling, empty state, and voice replay work;
- old configuration maps without silent loss;
- browser and screenshot parity pass.

Acceptance:

- persistence and player data formats remain unchanged;
- the screen designer never owns save records or backlog runtime contents;
- both screens use the shared renderer and editor shell.

**Stop boundary:** Do not migrate Settings in Phase 7.

## Phase 8 - Settings

**Goal:** Migrate the most structurally complex existing UI without weakening engine setting semantics.

Deliver:

- canonical settings screen and semantic settings-group/control widgets;
- generate controls only from registered setting definitions;
- preserve tabbed and single-page modes, deterministic assignment normalization, reset/close/title actions, theme icons, and widget styles;
- expose grouping, ordering, labels, layout, and style parts without accepting unknown setting keys;
- map existing panels, tab bar, footer, decorations, backgrounds, and custom declarative elements;
- preserve `ConfigManager` ownership of values, persistence, defaults, and reset;
- add settings-specific authoring and migration diagnostics.

Tests:

- every known setting renders once in both layout modes;
- unknown and duplicate assignments normalize as currently specified;
- tab CRUD, reset, close, and title routing remain correct;
- toggles, sliders, buttons, and focus behavior pass DOM/browser tests;
- migration retains custom supported elements and reports unsupported detail;
- runtime/editor parity passes across aspect ratios.

Acceptance:

- all supported settings behavior is editable through the shared shell;
- project data cannot invent executable controls or bypass `ConfigManager`;
- legacy Settings editor remains only as an explicit compatibility fallback until closure.

**Stop boundary:** Do not fold Page Editor story staging into the screen designer.

## Phase 9 - Gameplay UI

**Goal:** Unify persistent gameplay chrome while keeping story content authoring separate.

Deliver:

- canonical gameplay UI document with a protected story-viewport boundary;
- semantic dialogue box, nameplate, choice list, quick action bar, and skip/status indicator widgets;
- preserve typewriter progression, voice, dialogue decoration, choice semantics, badges, quick actions, auto/skip state, input propagation, and page transitions;
- integrate a UI-edit mode with Page Editor preview without moving backgrounds, characters, camera, particles, or video-page authoring into the screen document;
- migrate existing dialogue box and widget-style configuration;
- provide deterministic fixtures for narration, voiced dialogue, long text, choices, disabled actions, and different page types;
- add authoring operations and preview routing.

Tests:

- UI editing never mutates story page content;
- story progression and choice effects remain unchanged;
- dialogue click, quick-action click, and choice click do not interfere;
- long text and choices expose layout warnings;
- focus, keyboard, auto/skip, and reduced-motion behavior pass;
- runtime/editor parity covers representative story states.

Acceptance:

- gameplay UI is editable in the shared shell;
- Page Editor remains authoritative for story staging;
- no runtime story behavior depends on editor-only metadata.

**Stop boundary:** Do not introduce new story page types or a visual scripting graph.

## Phase 10 - Gallery And Remaining Overlays

**Goal:** Complete screen coverage and consolidate remaining system UI.

Deliver:

- first canonical gallery screen layout and editor;
- semantic gallery grid/focus viewer bound to registered CG and ending data;
- preserve locked/unlocked presentation, multi-image navigation, empty state, ordering, thumbnails, descriptions, and ending-video replay;
- canonical text-input overlay with protected prompt/input/confirm/cancel/validation parts;
- canonical video-control overlay respecting each video's skippable/controls/audio/loop policy;
- shared overlay preview fixtures and editor operations;
- route gallery and overlay assets through validation, preview, handoff, and export.

Tests:

- empty, locked, unlocked, multi-image, and ending entries render correctly;
- unlock state remains player data and is never written by the screen editor;
- text input validates and commits only through the existing variable flow;
- video controls cannot expose forbidden actions for the active playback policy;
- modal focus and input routing pass;
- browser and screenshot parity pass.

Acceptance:

- all seven primary screens and named shared overlays use the canonical renderer;
- gallery finally has a first-class screen editor;
- no new gallery content registry is introduced alongside the existing systems data.

**Stop boundary:** Do not remove legacy fields until Phase 11 migration evidence is complete.

## Phase 11 - Migration, Authoring, Export, And Release Closure

**Goal:** Audit and close every integration path, fill only remaining cross-screen gaps, and decide legacy retirement from evidence. Per-screen CLI, accessibility, asset collection, and package support must already have shipped with their owning screen phases.

Deliver:

- explicit whole-project migration command and desktop workflow with validate-only, dry-run, checkpoint, result artifact, changed paths, warnings, and rollback guidance;
- audit node-level CLI/apply-plan operations delivered by P4-P10 and fill only identified gaps;
- optional Agent DSL compile-to-plan syntax only if the normal operation contract is stable;
- complete cross-screen tooling that could not belong to one vertical slice: batch refactors, impact reports, fixture-matrix generation, and reusable/layout recipe ergonomics;
- audit responsive variants, bounded visibility rules, and typed animation tracks already enabled by earlier screen phases; do not introduce their first runtime implementation here;
- update project contract, validation rules, command reference, screen UI skill, examples, preview plans, and review handoff;
- run whole-project asset-reference, `.gmtheme`, export, desktop packaging, and web runtime audits over the per-screen coverage established in P5-P10;
- run the final accessibility and gamepad audit across all screens and overlays, fixing only gaps against per-screen acceptance;
- performance audit for renderer updates, editor gestures, list screens, hidden-screen cleanup, and preview messaging;
- run full Vitest, Node, browser, preview, export, and production build gates;
- use migration telemetry from fixtures and supported samples to decide whether legacy writers/renderers can be removed;
- if removal is justified, delete compatibility code in a separate reviewed batch with before/after evidence.

Acceptance:

- old projects open without silent data loss;
- migrated projects round-trip through editor, agent CLI, export, and runtime;
- runtime and editor preview are renderer-identical for all seven screens;
- every screen is editable without raw JSON;
- all release gates pass;
- roadmap, release notes, and a paste-ready external review prompt are complete;
- any retained compatibility path has an owner and explicit retirement condition.

**Stop boundary:** Do not commit, push, tag, or publish without explicit user instruction.

## Cross-Phase Test Matrix

| Evidence | P1 | P2 | P3 | P4 | P5-P10 | P11 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Contract/unit | Baseline | Required | Required | Required | Required | Full |
| Migration fixtures | Baseline | Required | Required | Diagnostic | Per screen | Full round-trip |
| Renderer DOM behavior | Baseline | N/A | Required | Required | Required | Full |
| Editor component behavior | Baseline | N/A | Host only | Required | Required | Full |
| Browser interaction | Baseline | N/A | Host smoke | Required | Required | Full |
| Screenshot parity | Baseline | N/A | Synthetic | Shell fixture | Per screen | Full matrix |
| Agent CLI/apply-plan | Inventory | Inspect | Preview | Synthetic mutation | Per screen | Full |
| Export/packaging | Baseline | References | Synthetic | N/A | Per screen assets | Full |
| Performance/accessibility | Baseline | Contract | Renderer | Interaction | Per screen | Full audit |

## Recommended Session Boundaries

- Implement only one phase per session unless the user explicitly expands scope.
- Phase 4a/4b and Phase 7a/7b are explicit internal stop boundaries and may be implemented in separate sessions without renumbering the roadmap.
- Start each continuation with `git status --short --branch`, recent `git log`, this roadmap, the architecture document, and CodeGraph context for the phase.
- Keep the roadmap status and completion evidence current in the same change that closes a phase.
- End each phase with exact files changed, commands run, evidence obtained, known risks, and a paste-ready next-phase prompt.
- Treat visual or browser blockers as phase blockers; do not replace missing interaction evidence with source-text assertions.

## Release Definition

The feature family is complete only when:

- seven primary screens and the named overlays use the versioned canonical document model;
- one shared renderer serves runtime and editor preview;
- one shared editor shell provides hierarchy, canvas, inspector, context menu, keyboard, responsive layout, and undo;
- legacy projects migrate explicitly and safely;
- story staging remains separate from gameplay UI authoring;
- the Agent CLI is a validated creation superset, and the editor faithfully renders, inspects, preserves, explains, and safely polishes its output;
- visual, behavioral, accessibility, performance, migration, export, and regression gates pass;
- no high-risk compatibility code is removed without evidence and a rollback plan.
