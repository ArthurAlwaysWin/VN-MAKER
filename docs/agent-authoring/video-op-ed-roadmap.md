# Video, OP, and ED Roadmap

**Status:** Proposed roadmap; V0 complete
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

## Milestone Overview

| Milestone | Name | Primary Outcome |
| --- | --- | --- |
| V0 | Decisions And Contract Lock | Complete: canonical video data shape finalized. |
| V1 | Assets, Validation, And Export | Video files become known, validated, preview-served, and exportable assets. |
| V2 | Runtime Video Playback | The engine can play blocking videos safely. |
| V3 | Story, OP, And ED Flows | Video pages, opening movies, and ending movies work in gameplay. |
| V4 | Editor Surfaces | Human authors can configure video without hand-editing JSON. |
| V5 | Agent Authoring Surface | CLI, apply-plan, Agent DSL, preview, and handoff support video changes. |
| V6 | Hardening And Release Docs | Full tests, docs, readiness guidance, and audit cleanup. |

## V0 - Decisions And Contract Lock

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

- `video-op-ed-plan.md` records the locked V0 decisions;
- planned contract changes are small, explicit, and compatible with existing project data;
- no runtime/editor implementation starts with unresolved data-shape questions.

## V1 - Assets, Validation, And Export

**Goal:** Make video a first-class asset category before playback behavior depends on it.

**Status:** complete.

Deliver:

- complete: add `videos` to asset category handling;
- complete: add `videos` to editor/IPC/agent asset category lists;
- complete: add video MIME types to preview/static serving;
- complete: add project-relative path validation for video files;
- complete: validate unknown video IDs, missing files, unsupported extensions, and unsafe paths;
- complete: include referenced videos and posters in export;
- complete: projectSession/apply-plan helpers are not required for V1 because canonical video data can already be represented directly in project JSON and test fixtures;
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

## V2 - Runtime Video Playback

**Goal:** Add a runtime-owned blocking video player that can be reused by pages, OP, and ED.

Deliver:

- create a video playback module owned by the engine/runtime;
- resolve project asset URLs through existing asset path logic;
- support ended, skipped, and error outcomes;
- support `skippable`, `controls`, `volume`, `audioMode`, and `fit`;
- pause, duck, replace, or mix BGM according to `audioMode`;
- provide graceful fallback UI on media load/play errors.

Tests:

- playback resolves with `ended`;
- skip resolves with `skipped`;
- media error does not crash the engine;
- BGM behavior is restored after playback;
- global mute/volume still affects video audio.

Acceptance:

- runtime video playback exists without project-local executable code;
- the engine can play one blocking video and return cleanly to the previous flow.

## V3 - Story, OP, And ED Flows

**Goal:** Wire video playback into actual visual novel flows.

Deliver:

- add `type: "video"` page runtime handling;
- support video page auto-advance and route validation;
- support optional scene-level video page targets if V0 includes them;
- support OP playback from title/start flow;
- support ED playback from ending unlock flow;
- persist OP once-per-profile state;
- preserve `playedMedia` through profile normalization;
- preserve ending unlock durability when ED playback fails.

Tests:

- video page loads, plays, skips, and advances;
- save/load on a video page restarts playback from the page;
- OP `after-start` plays before entering the first page;
- OP `oncePerProfile` prevents repeated playback;
- ED `after-unlock` plays after the ending is saved;
- ED `manual` can be previewed or replayed without changing unlock state;
- ED playback failure does not lose the unlocked ending.

Acceptance:

- a real project can use a story video page, an OP, and an ED through canonical project data.

## V4 - Editor Surfaces

**Goal:** Make video features fully editable by human authors.

Deliver:

- add video asset library support;
- add a reusable video picker;
- add video page editing controls;
- support `video` in page-type switching and page canvas placeholders;
- add title OP settings;
- add ending ED settings;
- add safe preview affordances that do not autoplay unexpectedly in inspector views.

Tests:

- editor can display missing or partial video metadata without crashing;
- video picker can choose, clear, and preview video references;
- page inspector edits all video page fields;
- converting to and from `video` pages preserves only fields valid for the selected page type;
- title settings edit OP configuration;
- ending settings edit ED configuration;
- editor saves canonical `script.json` data only.

Acceptance:

- no video feature requires hand-editing JSON for normal authoring;
- editor remains stable when media files are missing during review.

## V5 - Agent Authoring Surface

**Goal:** Let agents author the same video features through supported commands and DSL compilation.

Deliver:

- add CLI commands for video registry entries;
- add CLI commands for OP and ED video configuration;
- add CLI commands for video pages;
- complete apply-plan operations for the same changes;
- add Agent DSL syntax that lowers to apply-plan operations;
- add changed paths, preview metadata, source-map provenance, and handoff review items.

Tests:

- CLI commands write valid canonical project data;
- apply-plan validate/dry-run/write gates work for video operations;
- DSL video syntax compiles deterministically;
- source maps point to video-related changed paths;
- author-check, handoff-report, and review-handoff agree on video warnings;
- no DSL fields are written into runtime project data.

Acceptance:

- agents can create, revise, validate, preview, and hand off OP/ED/video-page changes without bypassing the editor contract.

## V6 - Hardening And Release Docs

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

1. V0 is complete; use the locked decisions in `video-op-ed-plan.md` as the baseline for implementation.
2. V1 is next, because validation and export should know videos before playback depends on them.
3. V2, because OP, ED, and video pages should share one runtime player.
4. V3, because gameplay flow proves the contract.
5. Land any remaining minimal projectSession/apply-plan helpers needed to generate canonical fixtures before editor work depends on hand-edited JSON.
6. V4, because editor UX should be built against working runtime behavior.
7. V5, because full CLI, DSL, preview, and handoff support should target stable canonical operations.
8. V6, because docs and audit should reflect final behavior.

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
