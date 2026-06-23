# Unified Screen Designer Architecture

**Status:** Phase 0-3 complete; Phase 4 complete; Phase 5 not started
**Date:** 2026-06-23
**Planning baseline:** `7cf2e9a`
**Phase 1 completion:** `fa11d14`
**Roadmap:** [unified-screen-designer-roadmap.md](./unified-screen-designer-roadmap.md)

## Purpose

Define a UE-inspired, Galgame Maker-native architecture for editing the complete in-game UI without turning project data into arbitrary HTML, CSS, JavaScript, or a general visual-programming system.

The target is one coherent no-code editor model across seven primary UI surfaces:

1. title screen;
2. gameplay UI;
3. game menu;
4. settings screen;
5. save/load screen;
6. backlog screen (dialogue history);
7. gallery screen.

Shared overlays such as text input, confirmation prompts, and video controls belong to the same UI system but are not counted as primary screens.

## Product Decisions Already Locked

- `BacklogScreen` is the **backlog/history screen**. It is not a separate story-replay feature.
- Save and load are two runtime modes of one screen family, not two unrelated editors.
- Gallery remains the collection/review surface for CG and ending replay content.
- Game menu is a first-class primary screen even though it is presented as an overlay at runtime.
- Gameplay authoring is split into two responsibilities:
  - the existing Page Editor owns story content such as backgrounds, characters, camera, dialogue progression, particles, and videos;
  - the Unified Screen Designer owns persistent gameplay UI such as the dialogue box, nameplate, choice presentation, and quick action bar.
- Shared system overlays are edited as reusable screen templates rather than promoted to independent navigation destinations.
- The product is **Agent-first and Editor-completable**: AI agents are expected to create and substantially compose screens, while humans review, understand, adjust, and polish the result in the desktop editor.
- The Agent CLI is a controlled superset of the common GUI workflow. Advanced Agent-authored features must remain canonical, validated, previewable, preserved by the editor, and visible to human reviewers even when the editor initially offers only focused adjustments for them.
- Agent actions remain declarative and allowlisted. No Blueprint Graph equivalent, project-local runtime code, arbitrary CSS/HTML, or generic expression language is introduced.

## Why This Is A Large Refactor, But Not A Rewrite

The current codebase already has useful seams:

- `TitleDesigner.vue` has a real canvas and editable title elements.
- `SettingsPageEditor.vue` exposes structured settings configuration.
- `SaveLoadEditor.vue`, `BacklogEditor.vue`, and `GameMenuEditor.vue` share preview/update plumbing through `useScreenLayoutEditor.js`.
- Runtime screens already accept structured data through methods such as `setLayout()`.
- Theme tokens, widget styles, screen backgrounds, icons, nine-slice assets, UI motion, preview routing, authoring commands, validation, and export collection already exist.

The missing part is a common document model and renderer. Current screen editors expose different fixed forms, while runtime screens construct their own DOM independently. A true unified canvas therefore crosses the project contract, runtime rendering, editor interaction, preview protocol, migration, authoring CLI, and tests.

This is a horizontal UI-platform refactor. The story engine, save data engine, route model, asset library, and desktop packaging remain in place.

## Current-State Summary

| Surface | Current editor | Current runtime | Main gap |
| --- | --- | --- | --- |
| Title | Direct Vue canvas plus runtime preview | `TitleScreen` | Canvas interaction incomplete; editor and runtime have separate visual interpretations |
| Gameplay UI | Page canvas plus separate theme/dialogue settings | `DialogueBox`, `ChoiceMenu`, `QuickActionBar` | Persistent UI has no unified hierarchy or canvas |
| Game menu | Fixed configuration form plus runtime iframe | `GameMenu` | No element hierarchy or direct manipulation |
| Settings | Rich structured form plus runtime iframe | `SettingsScreen` and widget helpers | No unified canvas; large bespoke schema |
| Save/load | Fixed configuration form plus runtime iframe | `SaveLoadScreen` | No direct manipulation; mode-specific behavior is embedded in runtime code |
| Backlog | Fixed configuration form plus runtime iframe | `BacklogScreen` | No direct manipulation; history list is runtime-owned |
| Gallery | Registry editing only; runtime review | `GalleryScreen` | No screen-layout contract or editor |
| Shared overlays | No common editor | `TextInputScreen`, confirmation DOM, video controls | Styling and layout are fragmented or hard-coded |

## Architecture Principles

### 1. One canonical UI document

Each primary screen is represented by a canonical, versioned, structured document. The document contains stable node ids, hierarchy, layout, style references, safe overrides, semantic data slots, states, and allowlisted actions.

`script.json` remains the canonical editable project contract. The editor, agent CLI, runtime, preview renderer, validation, and export tooling all operate on the same document model.

### 2. Agent-first, Editor-completable

The Agent CLI is the primary high-throughput creation surface. It may expose advanced canonical operations before every operation receives a bespoke GUI control, but it may not bypass the project contract or renderer.

The desktop editor remains the human review and polish surface. It must always:

- render Agent-authored output faithfully;
- show advanced features in the hierarchy and inspector;
- preserve fields it does not directly edit;
- explain which features are advanced or Agent-authored;
- let the human select, move, restyle, disable, reset, or replace the result where the operation is safe;
- warn before an edit would flatten or discard advanced configuration.

This is intentionally not strict feature parity. The CLI is a controlled superset; the editor is never allowed to become an incomplete or destructive reader of that superset.

### 3. One renderer, multiple hosts

The runtime and editor preview must use the same renderer implementation. The editor must not maintain a second Vue-only approximation of the final UI.

The renderer mounts a screen document into a host and marks rendered nodes with stable ids such as `data-gm-ui-node-id`. The runtime host supplies live data and actions; the editor host supplies deterministic fixtures and selection instrumentation.

### 4. Editor chrome stays outside project UI

Selection outlines, resize handles, snapping guides, locked/hidden authoring state, rulers, and context menus are editor concerns. They are not rendered into the game and should not pollute canonical runtime content unless the field has real author intent.

### 5. Primitive and semantic widgets are different

The palette has two families:

- **layout/visual primitives:** panel, stack, grid, text, image, button, spacer, and named slot;
- **semantic widgets:** dialogue box, nameplate, choice list, quick action bar, settings group, settings control, save-slot grid, backlog list, gallery grid, and tab bar.

Semantic widgets own runtime behavior and data. Their internal required structure may expose safe slots and style parts, but authors cannot delete invariants required for saving, loading, accessibility, input routing, or story progression.

### 6. Actions and bindings are allowlisted

Buttons use built-in actions such as:

- `start-game`;
- `continue-game`;
- `open-screen` with a known screen id;
- `close-screen`;
- `save-slot`;
- `load-slot`;
- `delete-slot`;
- `reset-settings`;
- `quit-game`;
- `replay-ending-video`.

Widgets bind only to named runtime data sources such as `save.slots`, `backlog.entries`, `gallery.items`, `settings.controls`, or `choice.options`. The contract does not accept arbitrary expressions, selectors, event handlers, or executable strings.

The ids above are semantic design targets, not a claim that current runtime strings already use those names. Current legacy surfaces use screen-local strings such as `start`, `continue`, `load`, `settings`, `gallery`, `play-opening-video`, `quit`, `save`, `backlog`, `title`, `close`, and `reset`.

Phase 2 must lock one public canonical action contract before the shared router is implemented:

- define whether canonical ids retain current names or use semantic names with typed parameters;
- define a pure, screen-aware legacy-to-canonical mapping for every supported current action;
- distinguish actions that share a legacy word but have different context, such as title `load` and save-slot `load`;
- reject unknown ids and parameters through the normal validator;
- keep preview actions on the same router while substituting safe diagnostics for destructive or persistent effects;
- avoid exposing two long-lived public action vocabularies after migration.

### 7. State styling follows real lifecycles

Common style states may include `default`, `hover`, `pressed`, `focused`, `disabled`, and `selected`. A widget exposes a state only when runtime semantics own that lifecycle. The contract must not add decorative state fields that no runtime component can enter or leave deterministically.

### 8. Responsive layout is constraint-based

Nodes use anchors, pivot, offsets, size constraints, padding, alignment, and container layout rather than relying only on absolute 1280x720 coordinates.

The editor provides viewport presets and safe-area visualization. Absolute placement remains available where visual-novel composition needs it, but it resolves through the same anchor/pivot model.

### 9. Compatibility is explicit

Existing `ui.titleScreen`, `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, `ui.backlogScreen`, `ui.dialogueBox`, and `ui.widgetStyles` data must continue to load during migration.

Legacy configuration is normalized through pure adapters. Migration must support validation, dry-run reporting, checkpointed writes, and changed-path summaries. No phase may silently drop unsupported legacy detail.

## Contract Perimeter And Authority

`ui.screens` and `ui.overlays` own canonical screen composition: node hierarchy, layout, semantic widget placement, variants, typed overrides, data-slot bindings, and allowlisted actions. They reference rather than embed project assets.

Shared project UI remains a dependency layer unless a later migration decision explicitly replaces it:

- `ui.theme` owns project tokens, icon families, button families, and theme asset references;
- `ui.motion` owns current surface motion presets until the animation-track contract defines a validated relationship with them;
- `ui.widgetStyles` remains a shared legacy/style dependency while its consumers migrate screen by screen;
- `assets.fonts`, `assets.videos`, and `assets.effectPacks` remain canonical asset registries outside screen documents.

Each screen has exactly one authoritative composition writer at a time:

1. **legacy-only:** the current screen-specific `ui.*` field is authoritative and a pure adapter may produce an in-memory canonical document;
2. **canonical-active:** an explicit migration has persisted `ui.screens.<id>` or `ui.overlays.<id>`, which becomes the only composition writer for that surface; retained legacy data is compatibility/rollback evidence, not a second editable schema;
3. **retired:** legacy read support is removed only after migration, export, preview, and rollback gates pass.

Opening a project never changes its authority state. Migration is explicit and reports changed paths and unsupported detail. Runtime, editor, CLI, preview, and export must resolve the same authority for a given screen.

`.gmtheme` is a theme exchange format, not a second canonical project contract. Phase 2 must define the theme-owned projection of canonical screens. The first persisted screen migration must prove that projection through export/import round-trip tests. Do not blindly package complete runtime state or indefinitely dual-write full canonical and legacy screen documents.

## Proposed Canonical Contract

The following shape is a design target, not a currently supported field:

```json
{
  "ui": {
    "screenSchemaVersion": 2,
    "screens": {
      "title": { "rootId": "title.root", "nodes": {} },
      "gameplay": { "rootId": "gameplay.root", "nodes": {} },
      "gameMenu": { "rootId": "game-menu.root", "nodes": {} },
      "settings": { "rootId": "settings.root", "nodes": {} },
      "saveLoad": { "rootId": "save-load.root", "nodes": {}, "variants": {} },
      "backlog": { "rootId": "backlog.root", "nodes": {} },
      "gallery": { "rootId": "gallery.root", "nodes": {} }
    },
    "overlays": {
      "textInput": { "rootId": "text-input.root", "nodes": {} },
      "confirmation": { "rootId": "confirmation.root", "nodes": {} },
      "videoControls": { "rootId": "video-controls.root", "nodes": {} }
    }
  }
}
```

`screenSchemaVersion: 2` is provisional until Phase 2 locks the persisted shape. Existing projects are currently unversioned at the screen-document level; Phase 2 must define their legacy interpretation and must not assume that an undocumented persisted version 1 already exists.

A representative node shape is:

```json
{
  "id": "title.start",
  "type": "button",
  "parentId": "title.menu",
  "name": "Start Button",
  "layout": {
    "anchor": { "minX": 0.5, "minY": 0.5, "maxX": 0.5, "maxY": 0.5 },
    "pivot": { "x": 0.5, "y": 0.5 },
    "offset": { "x": 0, "y": 80 },
    "size": { "width": 280, "height": 56 }
  },
  "styleRef": "buttons.primary",
  "style": {},
  "content": { "text": "开始游戏" },
  "action": { "type": "start-game" }
}
```

Contract rules:

- ids are stable within a screen and never derived from array position;
- hierarchy must be acyclic and reachable from `rootId`;
- node types, fields, actions, bindings, and style properties are allowlisted;
- asset paths remain canonical project-relative paths;
- style overrides are typed values, not CSS declarations;
- variants contain bounded overrides, not duplicate free-form documents;
- screen documents contain author intent only; transient runtime state stays outside `script.json`.

## Screen-Specific Composition

### Title

Title is the first migration slice because it already has editable elements. Existing title text, image, and button elements map to primitive nodes. Built-in actions remain declarative. Opening-video configuration stays a screen behavior, not an arbitrary canvas node.

### Gameplay UI

The gameplay screen document describes UI layered over the story stage. The stage itself remains owned by `PageEditor` and the scene/page contract.

The gameplay root exposes a protected `storyViewport` slot plus editable semantic widgets for dialogue, nameplate, choices, quick actions, skip indicators, and other persistent chrome. A user may move and style those widgets but cannot make story progression depend on arbitrary UI script.

### Game menu

Game menu uses a panel or full-screen root with allowlisted navigation buttons. It must preserve keyboard focus, Escape/right-click close behavior, and source-aware return routing.

### Settings

Settings uses semantic setting controls generated from engine setting definitions. Authors may group, order, label, style, and position controls, but cannot invent setting keys or bypass `ConfigManager`.

### Save/load

Save/load is one document with `save` and `load` variants. The slot grid remains semantic and owns pagination, thumbnails, slot metadata, async refresh, confirmation, and mode-correct actions.

### Backlog

Backlog is dialogue history. Its semantic list owns history data, scrolling, speaker/text formatting, and voice replay. The screen designer controls surrounding layout and exposed list style parts.

### Gallery

Gallery receives its first canonical screen-layout document. Its semantic grid binds to CG and ending entries already registered under project systems. Unlock state remains player data, not author data.

## Shared Overlays

Shared overlays use the same renderer and theme system but have stricter required parts:

- text input: prompt, input control, confirm, cancel, validation message;
- confirmation: title/body, confirm action, cancel action;
- video controls: progress, play/pause, skip, volume where the active video policy permits them.

Overlays must remain keyboard accessible, modal when required, and deterministic under mouse, keyboard, and gamepad input routing.

## Editor Architecture

The Unified Screen Designer has five persistent regions:

1. **Palette:** supported primitive and semantic widget types.
2. **Hierarchy:** stable node tree, ordering, visibility, and selection.
3. **Canvas:** runtime renderer host plus editor interaction overlay.
4. **Inspector:** typed layout, content, style, state, data-slot, and action fields.
5. **Toolbar:** undo/redo, viewport, zoom, grid, snapping, preview mode, and validation status.

Required interaction contract:

- click and hierarchy selection remain synchronized;
- right-click selects the target before opening its context menu;
- context menu includes valid operations such as duplicate, delete, move in hierarchy, wrap/group, and reset override;
- Delete/Backspace, copy/paste, duplicate, arrow-key nudge, and Escape follow focus-safe rules;
- drag, resize, reorder, and multi-property gestures create one undoable transaction per completed gesture;
- operations that would remove required semantic parts are disabled with an explanation;
- canvas scale, scrolling, letterboxing, pointer capture, snapping, and coordinate conversion share one tested geometry utility.

## Runtime And Preview Architecture

The proposed shared modules are conceptually:

```text
src/shared/uiDocumentContract.js
src/shared/uiActionContract.js
src/shared/uiLayoutContract.js
src/ui/renderer/*
src/ui/widgets/*
src/editor/components/screen-designer/*
src/editor/composables/useUnifiedScreenDesigner.js
```

Exact filenames may change during implementation, but ownership must remain clear:

- shared contracts normalize and validate data without DOM access;
- renderer modules produce runtime DOM from normalized documents;
- semantic widgets own data and behavior;
- the editor owns authoring commands and interaction overlays;
- preview messaging carries canonical snapshots, fixtures, selection events, and renderer diagnostics.

Runtime and preview must both exercise the same action router. Preview replaces destructive or persistent actions with safe diagnostics unless a dedicated test explicitly enables them.

Phase 3 locks the host integration as **in-process** for the synthetic renderer host. Runtime and preview hosts both instantiate `SharedUiRenderer`; the host mode changes action side-effect policy, deterministic data sources, diagnostics, and selection instrumentation, not the DOM renderer implementation. Production legacy screens remain on their existing paths until their owning migration phases.

## Theme And Style Ownership

Theme precedence is:

1. engine widget defaults;
2. project theme tokens and widget families;
3. screen-level style references;
4. node-level typed overrides;
5. runtime state selected by the widget lifecycle.

Existing theme assets and widget-style contracts should be adapted, not duplicated. Screen documents reference theme families by stable names. Missing references fall back predictably and produce validation warnings.

Animation ownership must also remain singular and testable. `ui.motion` currently selects surface-level presets. Typed node animation tracks are not a second unrestricted animation engine; before tracks may be persisted or written by the CLI, Phase 2 and Phase 3 must define and prove:

- allowlisted properties, triggers, durations, easing, sequencing, and reduced-motion behavior;
- precedence between engine defaults, `ui.motion`, node tracks, and runtime widget state;
- deterministic normalization and validation;
- one renderer path for runtime and preview;
- predictable behavior when a track is unsupported by a host or semantic widget.

Phase 2 locks the precedence model and validation contract. Phase 3 must prove it in the shared renderer before any mutation command may write tracks; if renderer evidence forces a contract change, the contract and fixtures are revised before that write gate opens.

## Agent Authoring

Agents are expected to be the primary creators of complete screen compositions. They must support all common safe editor operations:

- list screens and node trees;
- inspect widget/action schemas;
- add, update, move, duplicate, and remove nodes;
- set layout constraints and style references;
- apply templates or presets;
- validate, dry-run, checkpoint, render previews, and write handoff artifacts.

The CLI may additionally expose advanced canonical capabilities that would be cumbersome to author by hand:

- reusable component definitions and parameterized instances;
- bulk hierarchy generation and layout recipes that compile to normal nodes;
- responsive constraint sets and breakpoint/viewport variants;
- typed state and variant matrices;
- bounded visibility predicates over registered runtime context keys;
- typed animation tracks using allowlisted properties, triggers, durations, easing, and sequencing;
- semantic data-slot composition and fixture generation;
- built-in effect or behavior adapters selected by registered id;
- batch refactors with impact reports, checkpoints, and preview matrices.

Advanced capability rules:

1. Advanced output is stored as normal versioned contract data, never as an opaque Agent-only blob.
2. The shared renderer and validator must understand it before the CLI may write it.
3. The editor must render, inspect, preserve, and identify it even if detailed GUI authoring arrives later.
4. Humans must be able to disable, reset, replace, or safely adjust the surrounding composition.
5. Preview, handoff, and validation must name advanced features and their affected screens.
6. No capability may contain executable project code, arbitrary selectors, arbitrary expressions, or unregistered runtime hooks.

Multi-step changes should compile to normal apply-plan operations. Agent DSL may provide ergonomic source syntax later, but remains compile-to-plan only; procedural layout recipes are authoring sources, not runtime dependencies.

## Migration Strategy

Migration is adapter-first and screen-by-screen:

1. capture legacy fixtures and rendered baselines;
2. normalize one legacy screen into the new in-memory document;
3. render the document through the shared renderer;
4. prove behavioral and visual parity;
5. expose editing through the unified designer;
6. add canonical authoring operations;
7. only then allow explicit migration writes for that screen;
8. retain legacy read support until every screen and export path is closed.

No whole-project automatic rewrite occurs merely by opening a project. Migration must be explicit, report changed paths, create a checkpoint, and preserve a rollback path.

## Validation And Evidence

Source-string assertions are not sufficient acceptance for interactive UI work.

Required evidence layers:

- contract normalization and validation unit tests;
- migration fixture and round-trip tests;
- renderer DOM behavior tests;
- editor component behavior tests;
- browser tests for selection, context menus, drag/resize, hierarchy reorder, undo/redo, keyboard focus, and viewport scaling;
- runtime action tests for each semantic widget;
- screenshot evidence at project resolution plus at least one different aspect ratio;
- preview/runtime parity checks;
- authoring CLI/apply-plan tests;
- export/readiness and asset-reference tests;
- full regression and production build at release closure.

## Accessibility And Input

- semantic controls use correct roles and accessible names;
- keyboard focus order follows document hierarchy and explicit safe overrides;
- modal overlays trap and restore focus;
- gamepad cardinal navigation is generated from layout or explicit neighbors;
- reduced-motion preferences remain respected;
- selected, focused, disabled, and locked states are not communicated by color alone;
- destructive operations require appropriate confirmation without blocking normal authoring undo.

## Performance Constraints

- document normalization and validation are pure and incremental where practical;
- editor gestures do not serialize the whole project on every pointer move;
- renderer updates are scoped to changed nodes or one screen snapshot;
- runtime semantic lists virtualize or paginate when existing behavior requires it;
- preview fixtures are bounded and deterministic;
- hidden screens do not retain unnecessary listeners or stale asynchronous work.

## Explicit Non-Goals

- No arbitrary HTML, CSS, JavaScript, WebGL, shader, or project-local plugin execution.
- No general Blueprint Graph or expression language.
- No opaque Agent-only data that the editor cannot render, preserve, or explain.
- No replacement of story route/page authoring with the screen designer.
- No silent conversion of all projects on load.
- No simultaneous rewrite of all seven screens before the first usable vertical slice.
- No claim of visual parity from build success or source inspection alone.
- No removal of legacy readers until migration and export compatibility are proven.
- No commit, push, or publication merely because a roadmap phase completes.

## Decision Gates

These questions must be answered during the named roadmap phases rather than guessed now:

- **Phase 2:** exact persisted shape for node ordering and variants;
- **Phase 2:** canonical action ids, typed parameters, and complete legacy mappings;
- **Phase 2:** per-screen authority markers and the boundary between screen documents, `ui.theme`, `ui.motion`, and shared/legacy widget styles;
- **Phase 2:** resolution-aware legacy layout/style mapping and loss diagnostics;
- **Phase 2:** minimum contract shapes and capability gates for responsive variants, bounded predicates, typed animation tracks, and reusable component instances;
- **Phase 2/P4:** whether editor-only lock/visibility state belongs in portable project metadata or local editor state;
- **Phase 2 and each widget slice:** how much internal structure each semantic widget safely exposes;
- **Phase 3:** resolved for the synthetic host as in-process; later editor canvas work may add chrome around the same renderer but must not introduce a second renderer implementation;
- **Phase 5:** the `.gmtheme` theme-owned projection and round-trip behavior for canonical screens;
- **Phase 10:** whether gallery uses one mixed grid or explicit CG/ending tabs;
- **Phase 10:** which video controls are authorable for each playback policy;
- **Phase 11:** when a project is considered fully migrated and eligible for legacy-field cleanup.

## Phase 2 Canonical Decisions

- Persisted schema version is `2`; legacy projects are unversioned.
- `nodes[]` is the persisted shape. Stable `id` is identity; `parentId` is hierarchy; non-negative `order` plus id is deterministic sibling ordering.
- The public action namespace is semantic and typed. Legacy action strings are adapter input only, with screen context distinguishing title/game-menu/save-slot `load`.
- Seven screens and three overlays are closed registries. Primitive, semantic-widget, binding, lifecycle-state, style, action, context-key, and predicate registries are also closed.
- Semantic widgets declare protected `parts`; missing required parts are contract errors.
- Authority is `legacy-only`, `canonical-active`, or `retired`. Canonical-active requires a canonical document and is the only editable writer. Project open is read-only.
- Layout uses one anchor/pivot/offset/size/constraint model. Legacy pixel layout is resolved against project resolution; CSS-like values are converted only when typed and otherwise produce loss diagnostics.
- Component instances, responsive variants, predicates, and animation tracks are bounded envelopes gated by registered renderer/validator capabilities. No Phase 2 mutation path enables them.
- Motion precedence is engine defaults, `ui.motion`, registered node tracks, runtime widget state, then reduced-motion policy.
- `.gmtheme` receives a pure theme-owned projection, excluding actions, bindings, runtime/player data, and unregistered advanced detail. Persisted round-trip integration remains Phase 5.
- Layout recipes remain compile-to-plan inputs, never runtime dependencies.
- Phase 2 exposes read-only screen/node/schema inspection only. Renderer, editor shell, production migration, and automatic writes remain absent.

## Phase 4a Editor Shell Evidence

Phase 4a adds the first reusable Unified Editor Shell for synthetic canonical documents only. It provides a screen selector, viewport toolbar, read-only palette, hierarchy tree, renderer-backed canvas, synchronized canvas/hierarchy selection, typed inspector summary, advanced/unknown field badges, and safe synthetic patching for explicit editor-state fields.

The canvas uses `SharedUiRenderer` through the preview host. It does not introduce a second renderer implementation, switch production screens, persist migrations, or write production `ui.screens`.

Completion evidence:

- synthetic canonical fixture renders in the shell and browser fixture;
- canvas `pointerdown` selection selects the deepest renderer node and syncs hierarchy plus inspector state;
- hierarchy selection updates editor-only canvas selection chrome;
- inspector reads selected node id, type, layout, style/styleRef, action, binding/data, semantic parts, and unknown/advanced fields;
- synthetic patches are limited to explicit safe paths and preserve unknown/advanced node fields;
- Phase 4a focused shell tests and Phase 3 renderer/host/bridge tests pass with DOM behavior assertions.

## Phase 4b Interaction Evidence

Phase 4b extends the synthetic Unified Editor Shell with interaction, geometry, and undo behavior only. Context menus select the target node before showing valid synthetic operations. Duplicate, delete, hierarchy reorder, wrap-in-stack, and reset-overrides operate on the synthetic fixture document and keep unknown/advanced fields preserved unless the selected operation intentionally removes a node or override.

The shell now has a synthetic history stack independent of production `script.pushState()`. Completed context-menu operations, inspector patches, keyboard nudge, keyboard delete, undo, and redo update the same `SharedUiRenderer` preview host without mutating production screens or executing migration writes.

Completion evidence:

- right-click canvas and hierarchy targets select before opening the operation menu;
- synthetic duplicate/delete/reorder/wrap/reset operations are schema-normalized and undoable;
- Delete/Backspace and arrow-key nudge are focus-safe and ignore text/select inputs;
- geometry utilities cover anchor/pivot canvas origin, zoom/letterbox point conversion, nudge, and resize calculations;
- one synthetic history transaction is recorded per completed operation;
- Phase 4a shell tests remain green with Phase 4b additions, and Phase 3 renderer/host/bridge tests remain on the shared renderer path.

## Definition Of Architecture Complete

This architecture is implemented only when:

- all seven primary surfaces render from the versioned canonical document model;
- runtime and editor preview use the same renderer path;
- all seven surfaces are editable through the shared shell;
- gameplay story content remains correctly separated from gameplay UI;
- shared overlays use the same typed style/layout system;
- old project data migrates explicitly without loss;
- agents have a validated CLI superset for creation and advanced composition, while humans can faithfully review, inspect, preserve, and polish all resulting screens in the editor;
- behavior, browser interaction, visual parity, accessibility, export, and regression gates pass.
