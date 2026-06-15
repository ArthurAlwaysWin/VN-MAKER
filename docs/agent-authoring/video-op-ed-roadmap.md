# Video, OP, and ED Roadmap

**Status:** Phase 0-4 complete; Phase 5 pending
**Architecture plan:** `docs/agent-authoring/video-op-ed-plan.md`  
**Scope:** first-class video assets, opening movies, ending movies, and story video pages

This roadmap is intentionally smaller than the Agent DSL roadmap. Video support touches many surfaces, but it is an extension of existing project data, runtime rendering, editor controls, and authoring commands. It should not become a second scripting system or a new project format.

## Global Invariants

Every milestone must preserve these rules:

1. `script.json` remains the canonical project contract.
2. Agent DSL remains compile-to-plan authoring source only.
3. The runtime must not read or interpret Agent DSL files.
4. No project-local arbitrary JS, CSS, HTML, shaders, iframe embeds, or plugin metadata.
5. Video behavior must be editable in the no-code desktop editor.
6. Existing image, audio, title, ending, route, preview, and export behavior must keep working.
7. Validation failures should be clear project-data diagnostics, not runtime crashes.

## Phase Overview

| Phase | Name | Primary Outcome |
| --- | --- | --- |
| Phase 0 | Decisions And Contract Lock | Complete: canonical video data shape finalized. |
| Phase 1 | Assets, Validation, And Export | Complete: video files are known, validated, preview-served, and exportable assets. |
| Phase 2 | Runtime Video Playback And Gameplay Flows | Complete: blocking video playback, video pages, OP/ED gameplay hooks, replay/profile persistence, and manual ED semantics are implemented. |
| Phase 3 | Editor Authoring UI For Videos | Complete: human authors can configure video without hand-editing JSON. |
| Phase 4 | Agent Authoring Surface | Complete: projectSession, apply-plan, direct CLI, changed paths, handoff preview review, Agent DSL syntax, and source-map provenance support canonical video changes. |
| Phase 5 | Hardening And Release Docs | Pending: final docs, readiness guidance, and release audit cleanup. |

## Phase 0 - Decisions And Contract Lock

**Status:** Complete
**Goal:** Decide the exact canonical shape before implementation begins.

Deliver:

- complete: OP/ED may use direct `file` references, but generated data should prefer `assets.videos` IDs;
- complete: OP config lives at `ui.titleScreen.openingVideo`;
- complete: ED config lives at `systems.endings.<id>.endingVideo`;
- complete: `type: "video"` pages are included in the first implementation;
- complete: canonical script paths use `videos/...` while editor files live under the project asset root as `assets/videos/...`;
- complete: video pages may auto-advance linearly and may optionally jump to a scene-level `target`;
- complete: page-level jump targets are out of scope;
- complete: supported first-pass extensions are `.mp4` and `.webm`;
- complete: recommended codecs are H.264/AAC for `.mp4` and VP9/Opus for `.webm`;
- complete: OP defaults to `after-start`;
- complete: OP `before-title` uses a click-to-play gate for unmuted playback;
- complete: manual title OP replay uses the title action `play-opening-video`;
- complete: ED defaults to `after-unlock`;
- complete: ED `before-unlock` is reserved for a later effect-scheduling phase;
- complete: profile replay state uses a generic `playedMedia` map keyed by stable project data paths;
- complete: captions are a later `.vtt` extension;
- complete: video pages may use terminal effects such as `unlock:ending`, with ED playback still attached to ending registry metadata.

Acceptance:

- `video-op-ed-plan.md` records the locked Phase 0 decisions;
- planned contract changes are small, explicit, and compatible with existing project data;
- no runtime/editor implementation starts with unresolved data-shape questions.

## Phase 1 - Assets, Validation, And Export

**Goal:** Make video a first-class asset category before playback behavior depends on it.

**Status:** complete.

Deliver:

- complete: add `videos` to asset category handling;
- complete: add `videos` to editor/IPC/agent asset category lists;
- complete: add video MIME types to preview/static serving;
- complete: add project-relative path validation for video files;
- complete: validate unknown video IDs, missing files, unsupported extensions, and unsafe paths;
- complete: include referenced videos and posters in export;
- complete: projectSession/apply-plan helpers are not required for Phase 1 because canonical video data can already be represented directly in project JSON and test fixtures;
- complete: update project contract and validation docs.

Tests:

- complete: valid `.mp4` and `.webm` paths pass;
- complete: absolute, remote, data URL, and traversal paths fail;
- complete: missing videos fail validation;
- complete: referenced videos are included in export manifests/output;
- complete: existing audio/image/font asset behavior remains unchanged.

Acceptance:

- complete: projects can reference videos as data;
- complete: invalid video references are caught before runtime;
- complete: export does not silently omit referenced video files.

## Phase 2 - Runtime Video Playback And Gameplay Flows

**Status:** Complete.
**Goal:** Add a runtime-owned blocking video player and wire it into video pages, OP playback, and ED playback.

Deliver:

- complete: create a video playback module owned by the engine/runtime;
- complete: resolve project asset URLs through existing asset path logic;
- complete: support ended, skipped, and error outcomes;
- complete: support `skippable`, `controls`, `volume`, `audioMode`, and `fit`;
- complete: pause, duck, replace, or mix BGM according to `audioMode`;
- complete: provide graceful fallback UI on media load/play errors.
- complete: add `type: "video"` page runtime handling;
- complete: support video page auto-advance and route validation;
- complete: support optional scene-level video page targets if Phase 0 includes them;
- complete: support OP playback from title/start flow;
- complete: support ED playback from ending unlock flow;
- complete: persist OP once-per-profile state;
- complete: preserve `playedMedia` through profile normalization;
- complete: preserve ending unlock durability when ED playback fails.

Tests:

- complete: playback resolves with `ended`;
- complete: skip resolves with `skipped`;
- complete: media error does not crash the engine;
- complete: BGM behavior is restored after playback;
- complete: global mute/volume still affects video audio;
- complete: video page loads, plays, skips, and advances;
- complete: save/load on a video page restarts playback from the page;
- complete: OP `after-start` plays before entering the first page;
- complete: OP `oncePerProfile` prevents repeated playback;
- complete: ED `after-unlock` plays after the ending is saved;
- complete: ED `manual` can be previewed or replayed without changing unlock state;
- complete: ED playback failure does not lose the unlocked ending.

Acceptance:

- complete: runtime video playback exists without project-local executable code;
- complete: the engine can play one blocking video and return cleanly to the previous flow;
- complete: a real project can use a story video page, an OP, and an ED through canonical project data.

## Phase 3 - Editor Authoring UI For Videos

**Status:** Complete for Phase 3 editor authoring UI.
**Goal:** Make video features fully editable by human authors.

Deliver:

- complete: add video asset library support;
- complete: add a reusable video picker;
- complete: add video page editing controls;
- complete: support `video` in page-type switching and page canvas placeholders;
- complete: add title OP settings;
- complete: add ending ED settings;
- complete: add safe preview affordances that do not autoplay unexpectedly in inspector views.

Tests:

- complete: editor can display missing or partial video metadata without crashing;
- complete: video picker can choose and clear video references;
- complete: page inspector edits all video page fields;
- complete: converting to and from `video` pages preserves only fields valid for the selected page type;
- complete: title settings edit OP configuration;
- complete: ending settings edit ED configuration;
- complete: editor saves canonical `script.json` data only.

Acceptance:

- complete: no video feature requires hand-editing JSON for normal authoring;
- complete: editor remains stable when media files are missing during review.

## Phase 4 - Agent Authoring Surface

**Status:** Complete.
**Goal:** Let agents author the same video features through supported commands and DSL compilation.

Deliver:

- complete: add dedicated CLI commands for video registry entries;
- complete: add CLI commands for OP and ED video configuration;
- complete: support video pages through canonical `add-page type: "video"` authoring;
- complete: complete apply-plan operations for the same changes;
- complete: add changed paths, preview metadata, and handoff review items for video registry, OP, ED, and video-page changes;
- complete: add Agent DSL syntax that lowers to apply-plan operations;
- complete: add video-specific Agent DSL source-map provenance for video registry, OP, ED, and video pages.

Tests:

- complete: CLI commands write valid canonical project data;
- complete: apply-plan validate/dry-run/write gates work for video operations;
- complete: DSL video syntax compiles deterministically;
- complete: source maps point to video-related changed paths;
- complete: author-check and handoff-report emit video preview/review warnings for canonical video changed paths;
- complete: no DSL fields are written into runtime project data.

Acceptance:

- complete: agents can create, revise, validate, preview, and hand off OP/ED/video-page changes without bypassing the editor contract.

## Phase 5 - Hardening And Release Docs

**Status:** Pending.
**Goal:** Polish the feature into a mergeable, auditable state.

Deliver:

- complete docs for project contract, validation rules, command reference, plan manifest, and Agent DSL;
- add authoring checklist guidance for OP/ED usage;
- add sample project or fixture coverage;
- run full test suite;
- perform focused code audit for runtime/editor/authoring boundary leaks;
- update roadmap status after completion.

Tests:

- `npm run test`;
- targeted CLI integration tests;
- targeted editor tests;
- export/readiness tests;
- at least one end-to-end authoring path from DSL or apply-plan to editor handoff.

Acceptance:

- full test suite passes;
- docs describe implemented behavior, not aspirational syntax;
- no arbitrary code or runtime DSL dependency is introduced;
- feature is ready for external audit and merge.

## Suggested Implementation Order

1. Phase 0, Phase 1, and Phase 3 are complete.
2. Phase 4 Agent DSL video syntax and video-specific source-map provenance are complete.
3. Close Phase 5 with final docs, full readiness guidance, release audit, and any end-to-end fixtures needed for external review.

## Smaller Follow-Up Extensions

These should stay out of the core roadmap unless explicitly pulled in:

- ambient video backgrounds;
- captions and subtitle styling;
- video gallery/replay room;
- per-video thumbnail extraction;
- export-time transcoding;
- platform-specific codec recommendations;
- animated title screen layers backed by muted looping video.

They are useful, but the core OP/ED work is complete once blocking video pages, OP playback, ED playback, editor editing, agent authoring, validation, preview, handoff, and export are all supported.
