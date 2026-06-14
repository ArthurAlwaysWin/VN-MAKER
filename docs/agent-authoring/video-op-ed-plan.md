# Video, OP, and ED Adaptation Plan

**Status:** Proposed full-scope implementation plan  
**Audience:** maintainers, AI implementers, editor/runtime reviewers  
**Scope:** first-class video support for opening movies, ending movies, and story video moments

**Roadmap:** `docs/agent-authoring/video-op-ed-roadmap.md`

## 1. Purpose

Many visual novels use an OP, or opening movie, as the opening theme sequence and an ED, or ending movie, as the closing theme sequence after a route or ending. Galgame Maker should support these workflows as first-class project data rather than as ad hoc assets or custom runtime code.

This plan adds video support across the canonical project contract, runtime, editor, CLI authoring layer, validation, preview, export, and Agent DSL. It deliberately keeps these existing invariants:

1. `script.json` remains the canonical editable project contract.
2. Agent DSL remains an authoring source format only.
3. Agent DSL compiles to supported apply-plan operations.
4. The runtime never interprets Agent DSL source files.
5. Projects do not gain arbitrary JavaScript, CSS, HTML, shaders, or plugin metadata.
6. All authored video behavior remains editable in the no-code desktop editor.

## 2. Goals

- Add video assets as a supported asset category.
- Support OP playback from title/start flows.
- Support ED playback from ending flows.
- Support blocking story video pages for in-route cinematic moments.
- Preserve deterministic save/load, preview, validation, export, and handoff behavior.
- Let agents and human authors configure video behavior through existing authoring surfaces.
- Make video references explicit and inspectable in `script.json`.
- Keep rendering behavior in the engine/editor, not in project-local executable code.

## 3. Non-Goals

- No project-local video player plugins.
- No arbitrary embedded HTML, CSS, JS, WebGL, shader, or iframe content.
- No remote URL video sources in project data.
- No DRM, streaming, or adaptive bitrate system.
- No in-engine transcoding pipeline.
- No runtime dependency on Agent DSL files or source maps.
- No replacement of existing audio, title, ending, or page systems.

## 4. Terminology

- **OP:** Opening movie or opening theme sequence. It usually plays after the player starts the game, or from a title screen command.
- **ED:** Ending movie or ending theme sequence. It usually plays after a route reaches an ending.
- **Video asset:** A file under the project asset root, normally `videos/...`, referenced by canonical project data.
- **Video registry entry:** Optional reusable metadata for a video asset, such as label, kind, poster image, and recommended playback options.
- **Blocking video:** A full-screen video moment that owns the UI until it ends or is skipped.
- **Ambient video layer:** A background or overlay video that plays while normal page UI remains active. This is useful but should be implemented after blocking OP/ED/story playback is stable.

## 5. Project Contract

### 5.1 Asset Category

Add a `videos` asset category alongside existing project asset categories.

Recommended file location:

```text
public/game/videos/
```

Recommended supported extensions:

- `.mp4` for broad browser and desktop compatibility.
- `.webm` for high-quality web delivery.
- `.ogv` only if the runtime and preview stack explicitly support it.

The asset resolver should treat video files like other project assets: project-relative, portable, and exportable. Absolute paths, path traversal, data URLs, and remote URLs must remain invalid.

### 5.2 Video Registry

Add an optional `assets.videos` registry:

```json
{
  "assets": {
    "videos": {
      "op_main": {
        "file": "videos/op_main.mp4",
        "label": "Main Opening",
        "kind": "op",
        "poster": "videos/op_main.poster.png",
        "durationMs": 92000,
        "tags": ["opening", "theme"]
      },
      "ed_good": {
        "file": "videos/ed_good.webm",
        "label": "Good Ending Movie",
        "kind": "ed",
        "poster": "videos/ed_good.poster.png"
      }
    }
  }
}
```

Rules:

- Registry entries are metadata and reusable references, not executable behavior.
- A video can be referenced by `videoId` or by direct `file`.
- Validators should normalize direct file references and registry references through one resolver.
- Unknown registry IDs are errors.
- Missing files are validation errors.
- Missing posters are warnings unless the specific editor surface requires a poster.

### 5.3 Shared Video Reference Shape

Use a common object shape for OP, ED, and page video references:

```json
{
  "videoId": "op_main",
  "file": "videos/op_main.mp4",
  "poster": "videos/op_main.poster.png",
  "skippable": true,
  "controls": false,
  "volume": 1,
  "audioMode": "replace",
  "fit": "contain"
}
```

Fields:

| Field | Meaning |
| --- | --- |
| `videoId` | Optional ID into `assets.videos`. |
| `file` | Optional direct project-relative file path. Required when `videoId` is absent. |
| `poster` | Optional poster image. |
| `skippable` | Whether user input can skip playback. |
| `controls` | Whether browser/native video controls are visible. Defaults to `false` for OP/ED. |
| `volume` | Video volume multiplier from `0` to `1`. |
| `audioMode` | `replace`, `duck`, or `mix` relative to current BGM. |
| `fit` | `contain`, `cover`, or `native`. |

Exactly one of `videoId` or `file` should be preferred in generated data. If both are present, `videoId` resolves metadata first and `file` may be used only as an explicit override after validation.

### 5.4 OP Contract

Add opening video configuration under title/start UI data:

```json
{
  "ui": {
    "titleScreen": {
      "openingVideo": {
        "videoId": "op_main",
        "play": "after-start",
        "oncePerProfile": true,
        "skippable": true,
        "returnToTitle": false,
        "audioMode": "replace",
        "fit": "contain"
      }
    }
  }
}
```

Recommended `play` values:

| Value | Behavior |
| --- | --- |
| `after-start` | Plays after the player presses Start/New Game. This is the safest default because it follows a user gesture. |
| `before-title` | Plays before the title screen. This may require muted autoplay or a click-to-play gate. |
| `manual` | Exposed as a title menu action but does not autoplay. |

Browser autoplay restrictions make `after-start` the recommended default for unmuted OP playback.

### 5.5 ED Contract

Extend ending registry entries with optional ending video data:

```json
{
  "systems": {
    "endings": {
      "good": {
        "title": "Good Ending",
        "category": "route",
        "description": "Reached the good ending.",
        "endingVideo": {
          "videoId": "ed_good",
          "play": "after-unlock",
          "oncePerProfile": false,
          "skippable": true,
          "returnToTitle": true,
          "audioMode": "replace",
          "fit": "contain"
        }
      }
    }
  }
}
```

Recommended `play` values:

| Value | Behavior |
| --- | --- |
| `after-unlock` | Plays after an `unlock:ending` effect succeeds. |
| `before-unlock` | Plays before the ending is unlocked. Use only when the route must not count as complete until playback finishes. |
| `manual` | Available from ending gallery or editor preview only. |

`after-unlock` is the safest default because profile state is already durable before playback starts.

### 5.6 Story Video Pages

Add a blocking video page type:

```json
{
  "id": "op_story_bridge",
  "type": "video",
  "video": {
    "videoId": "op_main",
    "skippable": true,
    "controls": false,
    "audioMode": "replace",
    "fit": "contain"
  },
  "autoAdvance": true,
  "next": "prologue_start",
  "effects": []
}
```

Rules:

- `type: "video"` pages do not require `dialogues`.
- `video` is required.
- `autoAdvance: true` requires a valid `next` target unless the page is terminal.
- `loop: true` is incompatible with `autoAdvance: true`.
- Page effects are allowed only through existing supported effect commands.
- Video pages must remain reachable through normal route validation.

### 5.7 Ambient Video Layers

Ambient video layers are useful for animated backgrounds, monitor screens, and title flourishes, but they should be separate from blocking video pages.

Proposed future shape:

```json
{
  "type": "normal",
  "background": "bg_room_evening",
  "videoLayer": {
    "file": "videos/rain_window.webm",
    "placement": "background",
    "loop": true,
    "muted": true,
    "fit": "cover",
    "opacity": 0.65
  },
  "dialogues": []
}
```

This should be implemented only after the core OP, ED, and blocking video page path is reliable, because ambient playback touches compositing, performance, and editor canvas behavior.

## 6. Runtime Design

### 6.1 Video Player Service

Create a runtime-owned video playback module, for example `src/ui/VideoPlayer.js`, that manages:

- creating and disposing `<video>` elements;
- resolving project asset URLs;
- full-screen layout inside the game viewport;
- poster display before metadata is ready;
- fade-in/fade-out hooks;
- skip input;
- end/error events;
- audio interaction with BGM and global volume settings;
- returning a structured playback result.

The player should expose a small API:

```js
await videoPlayer.play({
  source,
  poster,
  skippable,
  controls,
  volume,
  audioMode,
  fit,
  reason: 'opening' | 'ending' | 'page'
})
```

Return result:

```json
{
  "status": "ended",
  "skipped": false,
  "error": null
}
```

Errors should be surfaced as project validation or preview warnings where possible. Runtime playback errors should fail gracefully with a user-visible fallback action rather than crashing the game.

### 6.2 OP Flow

Recommended flow:

1. Title screen loads normally.
2. Player presses Start/New Game.
3. Runtime checks `ui.titleScreen.openingVideo`.
4. If `play` is `after-start` and profile rules allow it, BGM is stopped or ducked according to `audioMode`.
5. Video plays as a blocking overlay.
6. Runtime records `oncePerProfile` playback state if needed.
7. Game proceeds to the configured first scene/page.

For `before-title`, the runtime should show a click-to-play gate if unmuted autoplay is blocked.

### 6.3 ED Flow

Recommended flow:

1. A supported page effect unlocks an ending.
2. Runtime persists the ending unlock before video playback when `play` is `after-unlock`.
3. Runtime resolves `systems.endings.<id>.endingVideo`.
4. Video plays as a blocking overlay.
5. Runtime applies `returnToTitle` or resumes the existing ending display flow.

The ED flow must not make ending unlocks depend on a fragile media playback event unless the project explicitly chooses `before-unlock`.

### 6.4 Story Video Page Flow

When the current page has `type: "video"`:

1. Hide normal dialogue and choice controls.
2. Resolve the video reference.
3. Apply BGM behavior from `audioMode`.
4. Play the video.
5. On end or skip, run supported page effects.
6. If `autoAdvance` is enabled, navigate to `next`.
7. Otherwise show a continue affordance owned by the engine.

Save/load should store page identity, not current playback time, by default. Loading a save on a video page restarts the video unless a future explicit resume field is added.

### 6.5 Audio Behavior

Supported `audioMode` values:

| Value | Behavior |
| --- | --- |
| `replace` | Stop or pause current BGM while video plays. |
| `duck` | Lower current BGM volume while video plays. |
| `mix` | Keep current BGM and video audio together. |

Video volume should still obey global master mute and volume settings. A separate video volume slider can be added later, but initial behavior should not bypass existing audio preferences.

### 6.6 Accessibility And Controls

The runtime should support:

- keyboard skip where `skippable` is true;
- mouse/touch skip affordance where `skippable` is true;
- pause/resume where `controls` or project settings allow it;
- `playsinline` for mobile and embedded desktop webviews;
- visible fallback text if a video cannot load;
- future captions through project-relative `.vtt` files.

## 7. Editor Design

### 7.1 Asset Library

Add a `videos` category to the editor asset library:

- import/copy video files into `public/game/videos/`;
- display filename, label, kind, size, and extension;
- show poster thumbnail when available;
- allow optional metadata editing for registry entries;
- warn about unsupported extensions and very large files.

### 7.2 Video Picker

Add a reusable video picker component parallel to existing media pickers:

- choose from registered videos or direct project video files;
- preview poster and basic metadata;
- avoid autoplay in compact inspector views;
- expose a deliberate preview/play button;
- return canonical video reference objects.

### 7.3 Page Editor

Add a `video` page type to the page editor:

- video picker;
- poster picker;
- skippable toggle;
- controls toggle;
- volume input;
- fit mode selector;
- audio mode selector;
- auto-advance toggle;
- next target selector;
- validation hints for missing next target, invalid file, and loop/advance conflicts.

Canvas preview should show the poster or first available frame with a clear play affordance. It should not silently autoplay while the user is editing.

### 7.4 Title Screen Settings

Extend title screen settings with an OP panel:

- video reference;
- play mode;
- once-per-profile toggle;
- skippable toggle;
- return-to-title toggle;
- audio mode;
- fit mode;
- preview button.

The UI should explain autoplay constraints through concise field help or warnings, not by hiding valid options.

### 7.5 Ending Settings

Extend ending editing surfaces with ED controls:

- attach or clear ending video;
- set play mode;
- configure skippable and return-to-title behavior;
- preview the ED for that ending;
- keep existing ending unlock and gallery metadata visible.

The ending list should indicate when an ending has an ED video without requiring the user to open every ending.

## 8. CLI And Apply-Plan Design

All command behavior should write canonical `script.json` data through existing authoring APIs.

### 8.1 Video Asset Commands

Proposed commands:

```bash
npm run vn -- list-videos --script public/game/script.json --json
npm run vn -- register-video --script public/game/script.json --id op_main --file videos/op_main.mp4 --label "Main Opening" --kind op --json
npm run vn -- update-video --script public/game/script.json --id op_main --poster videos/op_main.poster.png --json
npm run vn -- remove-video --script public/game/script.json --id op_main --json
```

### 8.2 OP Commands

```bash
npm run vn -- set-opening-video --script public/game/script.json --video op_main --play after-start --skippable true --once-per-profile true --json
npm run vn -- clear-opening-video --script public/game/script.json --json
```

### 8.3 ED Commands

```bash
npm run vn -- set-ending-video --script public/game/script.json --ending good --video ed_good --play after-unlock --json
npm run vn -- clear-ending-video --script public/game/script.json --ending good --json
```

### 8.4 Page Commands

```bash
npm run vn -- add-video-page --script public/game/script.json --scene prologue --id op_story_bridge --video op_main --next prologue_start --json
npm run vn -- set-page-video --script public/game/script.json --scene prologue --page op_story_bridge --video op_main --json
npm run vn -- clear-page-video --script public/game/script.json --scene prologue --page op_story_bridge --json
```

### 8.5 Apply-Plan Operations

Add plan operations matching the CLI commands:

- `registerVideo`
- `updateVideo`
- `removeVideo`
- `setOpeningVideo`
- `clearOpeningVideo`
- `setEndingVideo`
- `clearEndingVideo`
- `addVideoPage`
- `setPageVideo`
- `clearPageVideo`

Each operation should produce precise changed paths for preview, review, and handoff:

- `assets.videos.<videoId>`
- `ui.titleScreen.openingVideo`
- `systems.endings.<endingId>.endingVideo`
- `scenes.<sceneId>.pages.<pageIndex>`
- `scenes.<sceneId>.pages.<pageIndex>.video`

## 9. Agent DSL Design

Agent DSL should compile video declarations and usage into the apply-plan operations above. It must not introduce runtime scripts.

Example syntax:

```text
video op_main "Main Opening" file "videos/op_main.mp4" kind op poster "videos/op_main.poster.png"
video ed_good "Good Ending Movie" file "videos/ed_good.webm" kind ed

opening video op_main play after-start skippable once-per-profile

ending good "Good Ending" category route video ed_good play after-unlock return-title

scene prologue:
  page op_story_bridge video op_main skippable next prologue_start
```

Lowering rules:

- `video` declarations lower to `registerVideo` or `updateVideo`.
- `opening video` lowers to `setOpeningVideo`.
- `ending ... video` lowers to ending metadata plus `setEndingVideo`.
- `page ... video` lowers to `addVideoPage` or `setPageVideo` depending on context.
- Source maps should connect DSL video declarations and page statements to the canonical changed paths.

Validation should happen both at DSL semantic-check level and at apply-plan validation level.

## 10. Validation And Readiness

Add diagnostics for:

- missing video file;
- unsupported extension;
- absolute, remote, data URL, or traversal path;
- unknown `videoId`;
- unknown ending ID for ED video;
- OP `before-title` with unmuted autoplay risk;
- `type: "video"` page without `video`;
- `autoAdvance` page without `next`;
- `loop` combined with `autoAdvance`;
- invalid `volume`;
- invalid `audioMode`;
- invalid `fit`;
- missing poster warning for OP/ED if editor preview quality suffers;
- very large file warning for web export readiness.

Diagnostics should distinguish:

- **errors** that make project data invalid;
- **warnings** that affect playback reliability, export size, or presentation quality;
- **readiness notes** that guide polish but should not fail validation.

Video validation failures must not be reported as Agent DSL source map failures unless the actual source map is invalid.

## 11. Preview, Handoff, And Author Check

Preview targets should gain metadata for video changes without changing rendering unless a preview surface explicitly supports video playback.

Recommended preview target types:

- `title-opening-video`
- `ending-video`
- `video-page`

Preview metadata should include:

- resolved video file;
- poster file;
- reason (`opening`, `ending`, `page`);
- changed path;
- source provenance when generated from Agent DSL;
- readiness warnings.

Handoff review items should call out:

- OP/ED video configuration changes;
- story video pages added or changed;
- missing or risky media assets;
- whether the change came from Agent DSL source spans.

Author checks should verify video references consistently with `handoff-report` and `review-handoff`. Source maps remain review metadata only and should never be required at runtime.

## 12. Export And Packaging

Export should include:

- referenced video files;
- posters;
- future caption files;
- any video registry metadata already stored in `script.json`.

Export readiness should warn about:

- files outside the asset root;
- unsupported extensions;
- missing referenced files;
- very large files for web builds;
- codec/container combinations known to be unreliable in target runtimes.

The export pipeline should not transcode video unless a separate explicit build tool is introduced later.

## 13. Testing Plan

### 13.1 Unit Tests

- video reference normalization;
- video asset path validation;
- OP contract validation;
- ED contract validation;
- video page validation;
- changed-path generation;
- DSL lowering for video declarations and uses.

### 13.2 Runtime Tests

- OP plays after start and then enters the first page;
- OP once-per-profile state prevents repeat playback;
- ED plays after ending unlock and preserves the unlock;
- video page auto-advances;
- skip path resolves like natural video end;
- playback errors fall back without crashing.

### 13.3 Editor Tests

- video picker tolerates missing or partial metadata;
- page inspector edits video page fields;
- title settings display and update OP metadata;
- ending settings display and update ED metadata;
- project settings do not require actual media playback during render tests.

### 13.4 CLI And Apply-Plan Tests

- `register-video` writes `assets.videos`;
- `set-opening-video` writes title OP config;
- `set-ending-video` writes ending ED config;
- `add-video-page` creates a valid video page;
- apply-plan validation rejects invalid files and unknown IDs;
- JSON output stays machine-readable and stable.

### 13.5 Integration Tests

- Agent DSL video source compiles to an apply-plan manifest;
- apply-plan writes canonical `script.json`;
- author-check, handoff-report, and review-handoff produce matching video diagnostics;
- export includes all referenced video files;
- preview plans include video metadata but do not require runtime DSL data.

## 14. Implementation Phases

This is not an MVP sequence. Each phase should leave the repo coherent and reviewable.

### P1 - Contract And Validation

Deliver:

- `assets.videos` schema support;
- shared video reference resolver;
- OP, ED, and video page contract validation;
- project contract and validation docs.

Acceptance:

- invalid video references fail validation;
- valid direct-file and registry references pass;
- no runtime/editor dependency on Agent DSL is introduced.

### P2 - Asset Discovery And Export

Deliver:

- `videos` asset category in asset scanners;
- video files included in missing/unused asset reporting;
- export copies referenced video and poster files;
- preview renderer serves video MIME types.

Acceptance:

- exported projects include every referenced video;
- missing videos are caught before export;
- existing image/audio/font exports still pass.

### P3 - Runtime Video Player

Deliver:

- runtime video playback module;
- asset URL resolution;
- skip/end/error handling;
- BGM interaction through `audioMode`;
- full-screen viewport layout.

Acceptance:

- direct runtime tests cover ended, skipped, and failed playback;
- runtime does not execute project-local code.

### P4 - Story Video Pages

Deliver:

- `type: "video"` page runtime handling;
- route navigation and auto-advance support;
- save/load behavior for video pages;
- page validation and preview metadata.

Acceptance:

- a story video page can be authored, validated, loaded, played, skipped, and advanced.

### P5 - Opening Movie Flow

Deliver:

- title/start integration for `openingVideo`;
- `after-start`, `before-title`, and `manual` modes;
- once-per-profile state;
- editor preview affordance.

Acceptance:

- OP playback does not break title screen BGM, start flow, or saved profile loading.

### P6 - Ending Movie Flow

Deliver:

- ending registry `endingVideo`;
- `after-unlock`, `before-unlock`, and `manual` modes;
- return-to-title behavior;
- profile-safe ending unlock order.

Acceptance:

- ED playback cannot lose an ending unlock if media playback fails after an `after-unlock` effect.

### P7 - Editor Surfaces

Deliver:

- video asset library support;
- video picker;
- video page inspector;
- OP title settings panel;
- ED ending settings panel.

Acceptance:

- human authors can create, inspect, edit, clear, and preview video configuration without hand-editing JSON.

### P8 - CLI And Apply-Plan

Deliver:

- video asset commands;
- OP/ED commands;
- video page commands;
- apply-plan operations;
- JSON output docs and tests.

Acceptance:

- agents can author the complete video feature through repo-owned commands.

### P9 - Agent DSL Integration

Deliver:

- video declarations;
- opening video syntax;
- ending video syntax;
- video page syntax;
- source maps and stale-region handling for generated video changes.

Acceptance:

- DSL-generated video changes compile to apply-plan operations and remain editable in the editor.

### P10 - Preview, Handoff, And Readiness Polish

Deliver:

- video preview target metadata;
- author-check and handoff review items;
- readiness warnings for web export and autoplay risk;
- documentation examples.

Acceptance:

- reviewers can see what video behavior changed, which DSL source produced it, and what media risks remain.

## 15. Open Decisions

These should be decided before P1 implementation:

1. Should direct video file references be allowed everywhere, or should OP/ED require registry IDs?
2. Should `before-title` OP default to muted autoplay with click-to-unmute, or should it always show a click-to-play gate?
3. Should ED `before-unlock` be allowed in the first implementation, or reserved until UX copy makes the behavior obvious?
4. Should captions use `.vtt` in the first full pass or be documented as a later extension?
5. Should profile state use a generic `playedMedia` map or OP/ED-specific maps?
6. Should video pages allow terminal ending unlock effects directly, or should ED playback remain attached only to ending registry metadata?

## 16. Recommended Defaults

- OP default `play`: `after-start`.
- ED default `play`: `after-unlock`.
- `skippable`: `true`.
- `controls`: `false`.
- `audioMode`: `replace`.
- `fit`: `contain`.
- video page `autoAdvance`: `true` when `next` is provided.
- profile replay tracking: generic `playedMedia` map keyed by stable project data paths.

These defaults match common visual novel behavior while respecting browser autoplay limits and save-data durability.

## 17. Risk Register

| Risk | Mitigation |
| --- | --- |
| Browser blocks unmuted autoplay | Prefer `after-start`; use click-to-play gate for `before-title`. |
| Codec support differs across targets | Validate extensions and document recommended codecs. |
| Large videos bloat web exports | Add readiness warnings and export size reporting. |
| ED playback failure loses ending unlock | Default to `after-unlock` and persist before playback. |
| Editor tests become flaky due media playback | Use poster/static rendering in editor tests; test runtime playback separately. |
| Agent DSL leaks into runtime | Keep DSL lowering compile-time only and assert no DSL fields are written to runtime-only surfaces. |
| Ambient video hurts performance | Implement only after blocking playback is stable and measurable. |

## 18. Documentation Updates Required

When implementation starts, update these documents with concrete behavior:

- `docs/agent-authoring/project-contract.md`
- `docs/agent-authoring/validation-rules.md`
- `docs/agent-authoring/command-reference.md`
- `docs/agent-authoring/plan-manifest.md`
- `docs/agent-authoring/agent-dsl.md`
- `docs/agent-authoring/agent-dsl-architecture.md`
- `docs/agent-authoring/agent-checklist.md`

This plan should remain the architectural guide until the feature is implemented, then move into historical implementation context.
