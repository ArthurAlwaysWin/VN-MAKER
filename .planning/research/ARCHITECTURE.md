# Architecture Research — v1.4 演出力升级

**Scope:** Existing Electron/Vue VN maker, milestone-only architecture guidance for preset character animation, page camera, richer background transitions, and editor preview wiring  
**Researched:** 2026-04-21  
**Confidence:** HIGH — based on direct codebase inspection plus milestone plan/spec in:
- `.planning/PROJECT.md`
- `docs/gap-analysis-vs-mature-engines.md`
- `docs/superpowers/plans/2026-04-21-v1.4-cinematic-upgrade.md`
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md`

## Executive Recommendation

Integrate v1.4 as an **additive runtime-effects layer**, not as a new animation system. Keep the current page-based engine contract intact and only add:

1. `page.characters[].animation`
2. `page.camera`
3. expanded `page.transition.type`

The safest architecture is:

- **ScriptEngine emits contracts**
- **CharacterLayer owns character motion**
- **CameraController owns stage camera**
- **BackgroundLayer owns transition rendering**
- **PageInspector/usePageEditor only write data + trigger iframe preview**

Two structural changes are worth doing early because they prevent most future bugs:

1. **Add a stage wrapper (`#stage-layer`) and bind camera there, not `#game-container`**  
   Current `#game-container` also hosts dialogue/menu/title/settings overlays (`index.html`, `src/main.js`). If camera binds to it directly, UI will shake/zoom too.

2. **Add a per-character motion wrapper inside `CharacterLayer`**  
   Current character container already uses `transform` for position/scale and enter transitions (`src/ui/CharacterLayer.js`, `src/style.css`). Preset animation transforms on that same element will conflict. Motion should live on an inner wrapper, not the positioned container.

---

## Architecture Decision Summary

### Keep

- Page-based script model
- `ScriptEngine -> main.js -> UI layer` event flow
- Existing iframe + postMessage preview path
- Existing `CharacterLayer` expression crossfade model
- Existing `BackgroundLayer` dual-layer transition model

### Add

- One dedicated camera controller
- One shared visual reset helper
- One canonical preset registry for character animation
- One stage wrapper DOM layer
- Targeted iframe preview commands for cinematic effects

### Do Not Add

- No ATL/timeline/freeform animation language
- No second editor-only animation renderer
- No camera logic inside `BackgroundLayer`, `DialogueBox`, or editor canvas
- No generic “page compositor” rewrite

---

## New Files to Add

## 1. `src/ui/CameraController.js`

**Responsibility:** Own all page-level camera effects on the runtime stage.

**Why new file:** Camera logic does not belong in `main.js` or `BackgroundLayer`. It needs its own lifecycle, cleanup, timers, and flash overlay handling.

**Public surface should stay small:**

```js
play(cameraConfig)
clear()
preview(cameraConfig)
```

**Owns:**
- stage transform / filter classes
- duration clamp
- intensity/direction mapping
- single-active-effect replacement
- flash overlay creation/removal

**Must not own:**
- page parsing
- editor UI logic
- background transition logic

## 2. `src/ui/resetRuntimeVisualState.js`

**Responsibility:** One shared cleanup path for replay/preview-stop/title-return/load/fast navigation.

**Why new file:** `src/main.js` currently duplicates visual resets in multiple places (`replayCurrentPage()`, preview `stop`, game end, title return). v1.4 adds more temporary runtime state, so duplicated cleanup will drift.

**This helper should clear:**
- CharacterLayer animations / temporary classes
- CameraController state
- BackgroundLayer temporary transition classes/timers
- dialogue/choice transient display only if caller asks

## 3. `src/ui/characterAnimationPresets.js`

**Responsibility:** Canonical registry of supported character animation presets.

**Why new file:** Runtime and editor must share the same stable enum list. One registry prevents `PageInspector` and `CharacterLayer` from diverging.

**Should contain:**
- preset key
- label
- CSS class name
- loop vs one-shot
- previewability flag if needed

---

## Existing Files to Modify

## Runtime / Engine

### `index.html`
**Modify:** add `#stage-layer` wrapper.

**Recommended shape:**

```html
<div id="game-container">
  <div id="stage-layer">
    <div id="background-layer"></div>
    <div id="character-layer"></div>
  </div>
  <div id="dialogue-layer"></div>
  <div id="ui-overlay"></div>
</div>
```

**Reason:** camera should affect scene visuals, not dialogue/menu/title/settings overlays.

### `src/style.css`
**Modify:** add:
- `#stage-layer` layout styles
- camera keyframes/classes
- flash overlay styles
- richer background transition classes
- character motion wrapper animation classes

**Important:** keep transforms separated by layer:
- `#stage-layer` = camera
- `.character-sprite` = position/scale/enter
- `.character-motion` = preset animation
- `.char-img-a/.char-img-b` = expression crossfade

### `src/engine/ScriptEngine.js`
**Modify:** additive contract emission only.

**Should do:**
- pass `animation` through on `show_character`
- emit new `page_camera` event when `page.camera` exists
- keep old page flow valid when fields are absent

**Should not do:**
- preset validation
- CSS mapping
- effect timing logic beyond event ordering

### `src/ui/CharacterLayer.js`
**Modify heavily:** keep current expression crossfade, add motion wrapper and animation lifecycle.

**Recommended DOM per character:**

```html
<div class="character-sprite" data-character-id="hero">
  <div class="character-motion">
    <img class="char-img-a active">
    <img class="char-img-b">
  </div>
</div>
```

**Boundary:**
- outer container = layout
- inner motion wrapper = animation classes
- imgs = expression swap only

### `src/ui/BackgroundLayer.js`
**Modify moderately:** expand transition registry in-place.

**Recommendation:** keep transition ownership here; do **not** build a second page transition subsystem.

**Additive transitions:**
- `dissolve`
- `wipe`
- `scale`
- `blur`

**Fallback:** unknown transition => warn in dev + downgrade to `fade`.

### `src/main.js`
**Modify:** orchestration only.

**Add:**
- instantiate `CameraController`
- bind `page_camera`
- call shared visual reset helper everywhere a hard reset happens
- add preview message handlers for cinematic preview requests

**Do not move business logic here.** `main.js` should remain a wire-up layer.

## Editor

### `src/editor/stores/script.js`
**Modify lightly:**
- `createDefaultPage()` => include `camera: null`
- keep old pages valid when `camera` missing

**Do not add migration code.** Old projects should load as-is.

### `src/editor/components/page-editor/CharacterPicker.vue`
**Modify lightly:** new characters should initialize with `animation: 'none'`.

### `src/editor/components/page-editor/PageInspector.vue`
**Modify heavily:**
- character animation select + replay button
- page camera section
- expanded transition options
- unknown-value preservation UI
- disabled-state messaging for preview buttons

### `src/editor/composables/usePageEditor.js`
**Modify heavily:** add targeted iframe preview commands.

**Important existing constraint:** `PageEditor.vue` makes inspector/sidebar `pointer-events: none` when `isPreviewMode` is true. So inspector replay buttons cannot depend on full “试玩” mode.

**Recommendation:** reuse the same iframe, but split:
- **full play preview** (`start` / `stop`)  
- **targeted effect preview** while editor stays interactive

That means cinematic preview commands should work when the iframe is loaded and ready, even if `isPreviewMode === false`.

---

## Canonical Data Contracts

## 1. Page JSON contract

### Character animation

```json
{
  "id": "hero",
  "expression": "smile",
  "position": "custom",
  "x": 640,
  "y": 200,
  "scale": 1,
  "animation": "breathe"
}
```

**Rules:**
- optional field
- absence == `none`
- store raw string for forward compatibility

### Page camera

```json
{
  "camera": {
    "effect": "shake",
    "durationMs": 300,
    "intensity": "medium",
    "direction": "horizontal",
    "trigger": "onEnter"
  }
}
```

**Rules:**
- `camera` is optional / nullable
- v1.4 editor only writes `trigger: "onEnter"`
- preserve unknown enum values when loading/saving unless user explicitly changes them

### Transition

```json
{
  "transition": {
    "type": "dissolve",
    "duration": 800
  }
}
```

**Expanded enum:** `none | fade | slide-left | slide-right | dissolve | wipe | scale | blur`

> Keep existing `slide-left` / `slide-right` naming for backward compatibility with current editor data, even if UI copy says “slide”.

## 2. Runtime event contract

### Existing event extended

```js
show_character: {
  id,
  expression,
  position,
  x,
  y,
  scale,
  animation,
  transition,
  duration,
  image
}
```

### New event

```js
page_camera: {
  sceneId,
  pageIndex,
  camera
}
```

**Recommendation:** emit raw `camera` object rather than a heavily normalized payload. Validation/no-op belongs in `CameraController`, not `ScriptEngine`.

## 3. Preview message contract

Use the existing iframe, but add targeted commands:

```js
{ type: 'preview-character-animation', script, sceneId, pageIndex, charId }
{ type: 'preview-camera', script, sceneId, pageIndex }
{ type: 'preview-transition', script, sceneId, pageIndex }
```

**Why include `script` every time:** lowest-risk path. Each preview request can boot from a clean snapshot, so previews do not depend on hidden iframe state staying perfectly synced.

**Expected iframe replies:**

```js
{ type: 'preview-ok', previewType }
{ type: 'preview-error', previewType, reason }
```

---

## Recommended Runtime Flow

## Page enter order

For minimum disruption, keep current `ScriptEngine` sequencing but make the order explicit:

1. `page_enter`
2. `set_background`
3. `hide_character` diffs
4. `show_character` diffs/updates
5. `page_camera`
6. `dialogue` or `choice`

This is compatible with current engine structure and keeps dialogue behavior unchanged.

## Visual ownership by layer

| Layer | Owns | Must not own |
|---|---|---|
| `BackgroundLayer` | background image swaps + transition classes | camera, dialogue, character motion |
| `CharacterLayer` | sprite DOM, expression crossfade, preset animation classes | page camera, background transition |
| `CameraController` | stage shake/zoom/pan/flash | character animation, page parsing |
| `main.js` | event wiring + lifecycle resets | effect implementation details |

---

## Recommended Editor / Preview Flow

## Principle

**Iframe runtime is the authority. Canvas stays mostly static.**

Current canvas preview is good for placement, not for lifecycle-accurate cinematic behavior.

## Flow for inspector replay buttons

```text
PageInspector button
  -> usePageEditor.previewX()
  -> deep-copy current script snapshot
  -> postMessage to iframe
  -> iframe resets visual state
  -> iframe restoreState(scene/page)
  -> engine.renderCurrentPage()
  -> replay requested effect
  -> iframe sends ok/error
  -> editor shows failure reason if needed
```

## Canvas mode recommendation

Do not simulate runtime camera/animation in canvas mode.

At most, add static hints:
- character chip: `动画: breathe`
- page chip: `镜头: shake`
- transition label: `dissolve`

That keeps parity clean and avoids two effect engines.

---

## Backward Compatibility Rules

## Old projects/pages

- missing `page.camera` => no-op
- missing `character.animation` => runtime treats as `none`
- existing `transition.type` values keep working unchanged
- no migration step required

## Unknown values

Editor must preserve:
- unknown character animation enum
- unknown camera enum
- unknown transition enum

UI behavior:
- show placeholder option like `未知效果：legacy-spin`
- do not silently rewrite to `none`

Runtime behavior:
- unknown character animation => no-op + dev warning
- unknown camera effect => no-op + dev warning
- unknown transition => fallback `fade` + dev warning

---

## Critical Integration Risks

## Risk 1: Transform collisions

**Where it comes from:**  
Current `CharacterLayer` already uses `transform` for center positioning, custom scale, and enter-slide. Camera will also use transform. New preset animations also want transform.

**Prevention:** strict transform ownership:
- stage transform only in `CameraController`
- character layout transform only on `.character-sprite`
- character motion transform only on `.character-motion`

## Risk 2: Camera affecting UI overlays

**Where it comes from:**  
Current DOM places all layers under `#game-container`.

**Prevention:** add `#stage-layer`; keep dialogue/UI/title/settings as siblings outside the camera target.

## Risk 3: Preview and runtime drift

**Where it comes from:**  
Current full preview mode disables inspector interaction; phase 63 needs inspector-triggered replay.

**Prevention:** targeted preview commands using the same iframe runtime, not a second preview implementation.

## Risk 4: Reset leakage

**Where it comes from:**  
`main.js` already has multiple manual reset paths. v1.4 adds more temporary classes/timers/overlay state.

**Prevention:** one `resetRuntimeVisualState()` helper reused everywhere.

---

## Implementation Order That Minimizes Risk

## Step 1 — Freeze contracts and layer ownership

Do first:
- page data contract
- runtime event contract
- `#stage-layer` DOM wrapper decision
- `.character-motion` wrapper decision

**Reason:** these choices affect all later code and avoid transform rewrites.

## Step 2 — Character runtime foundation

Build:
- preset registry
- `CharacterLayer` motion wrapper
- animation apply/cleanup lifecycle

**Reason:** isolated from editor; easiest first runtime win.

## Step 3 — Camera runtime foundation

Build:
- `CameraController`
- `page_camera` event wiring
- shared reset helper

**Reason:** preview, replay, skip, and title-return all need cleanup semantics before editor exposure.

## Step 4 — Expanded background transitions

Build in `BackgroundLayer`.

**Reason:** independent of animation/camera UI, but should align with final cleanup order before preview work.

## Step 5 — Iframe targeted preview API

Build:
- preview message types
- iframe handlers
- reply/error contract
- `usePageEditor` helpers

**Reason:** editor UI should consume stable runtime behavior, not define it.

## Step 6 — Editor controls

Build:
- `PageInspector` controls
- `CharacterPicker` default animation
- unknown-value preservation
- disabled-state reasons

**Reason:** now the UI only writes existing contracts and calls existing preview APIs.

---

## Test Plan by Layer

## 1. Contract / engine tests

**Files:** `ScriptEngine.js`, script store

Must verify:
- old pages still render without new fields
- `show_character.animation` is emitted
- `page_camera` emits after character visual events and before dialogue/choice
- unknown raw enum values pass through engine untouched

## 2. Runtime DOM tests

### CharacterLayer
Must verify:
- one-shot animation class applied then cleaned
- loop animation persists until clear/hide/replacement
- expression crossfade still works while animation is active
- custom scale/position remains correct

### CameraController
Must verify:
- only one camera effect active at a time
- `clear()` removes transforms/flash overlay
- stage only is affected, not sibling UI layers
- quick replay replaces previous effect cleanly

### BackgroundLayer
Must verify:
- new transition class assignment
- timer/class cleanup after transition
- unknown transition falls back safely

## 3. Preview integration tests

**Files:** `usePageEditor.js`, iframe message handlers in `main.js`

Must verify:
- preview buttons disable when iframe not ready
- each preview command sends a fresh script snapshot
- new preview request cancels/overrides old one
- preview failure returns explicit reason
- preview cleanup restores steady state

## 4. Editor form tests

**Files:** `PageInspector.vue`, `CharacterPicker.vue`

Must verify:
- animation select writes `character.animation`
- camera field visibility changes by effect type
- transition list includes new values
- unknown enums display but are preserved on save

## 5. Regression smoke tests

Must verify:
- old project opens with no migration
- play mode / skip mode / auto mode still behave
- load/save/replay/title return clear all cinematic state
- editor preview and exported runtime behave the same for one sample page per effect

---

## Roadmap Implications

Recommended milestone build order:

1. **Runtime contracts + DOM ownership refactor**
2. **Character animation runtime**
3. **Camera runtime + shared cleanup**
4. **Background transition expansion**
5. **Iframe effect preview API**
6. **Editor controls + preservation UX**
7. **Full regression pass across preview/runtime/export**

This order is safest because the editor is a consumer here, not the source of truth.

---

## Sources

- `.planning/PROJECT.md` — milestone scope, engine/editor constraints
- `docs/gap-analysis-vs-mature-engines.md` — confirms animation/camera/transition gap is real and priority-worthy
- `docs/superpowers/plans/2026-04-21-v1.4-cinematic-upgrade.md` — intended file touch points and phase breakdown
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` — target contract and preview principles
- `index.html` — current layer DOM structure
- `src/main.js` — current runtime wiring, preview message handling, duplicated reset points
- `src/engine/ScriptEngine.js` — current page render ordering and emitted events
- `src/ui/CharacterLayer.js` — current transform/crossfade behavior
- `src/ui/BackgroundLayer.js` — current transition ownership
- `src/style.css` — current transform responsibilities
- `src/editor/stores/script.js` — default page schema
- `src/editor/components/page-editor/PageInspector.vue` — current page-level editing surface
- `src/editor/components/page-editor/CharacterPicker.vue` — current character insert contract
- `src/editor/composables/usePageEditor.js` — current iframe preview API
- `src/editor/views/PageEditor.vue` — current preview/read-only behavior
