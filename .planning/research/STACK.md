# Technology Stack — v1.4 演出力升级

**Project:** Galgame Maker v1.4 — cinematic presentation upgrade  
**Researched:** 2026-04-21  
**Scope:** Only stack additions/changes required for preset character animation, page-level camera effects, editor-side preview, and expanded background transitions. Existing page engine, iframe preview path, Vue/Pinia editor stack, and Electron/Vite foundation are already validated.

## Executive Recommendation

**Required npm dependencies: 0. Required stack migrations: 0.**

v1.4 should be built with the **existing Electron 41 + Vue 3 + Pinia + Vite + pure JS DOM runtime stack**, plus a few **new internal runtime modules** and **targeted DOM/CSS structure changes**:

1. **CSS keyframes + transitions** for character presets and background transitions  
2. **A dedicated stage/camera wrapper** so camera transforms do not fight dialogue/UI layers  
3. **A small `CameraController` runtime module** for shake/zoom/pan/flash lifecycle + cleanup  
4. **A character animation preset registry** so editor/runtime share one canonical enum table  
5. **More preview messages on the existing iframe path**, not a second preview implementation

The main technical conclusion: **browser/Electron primitives are already sufficient**. Do **not** add GSAP, anime.js, PixiJS, a timeline engine, canvas/WebGL rendering, or a general animation scripting system for v1.4.

**Overall confidence: HIGH** — based on direct inspection of current runtime/editor code and milestone docs. The current codebase already uses DOM layers, CSS transitions, `requestAnimationFrame`, iframe `postMessage`, and jsdom/Vitest. v1.4 is an extension of those patterns, not a platform change.

## Current Baseline (keep unchanged)

| Technology | Current Version | Keep? | Why |
|---|---:|---|---|
| Electron | 41.0.4 | Yes | Modern Chromium desktop shell; enough for CSS transforms, keyframes, opacity, filter-based effects |
| Vue | 3.5.31 | Yes | Editor inspector/preview controls fit existing Composition API patterns |
| Pinia | 3.0.4 | Yes | Page schema/UI state changes stay in existing stores |
| Vite | 6.3.0 | Yes | No build-system change needed |
| Vitest | 4.1.4 | Yes | Enough for timing/lifecycle tests with fake timers |
| jsdom | 29.0.2 | Yes | Enough for controller/class cleanup tests |
| Pure JS ES modules | current | Yes | Matches project constraint; no TypeScript migration needed |

## Must-Have Stack Changes

These are the **actual** additions needed for v1.4.

### 1. Add a dedicated stage wrapper for camera effects

**Why needed:** Current DOM has `#background-layer`, `#character-layer`, `#dialogue-layer`, `#ui-overlay` directly under `#game-container`. If camera transforms hit `#game-container`, they risk moving dialogue/UI too. That makes preview less stable and creates transform conflicts.

**Recommended structure:**

```html
<div id="game-container">
  <div id="stage-layer">
    <div id="background-layer"></div>
    <div id="character-layer"></div>
    <div id="camera-flash-layer"></div>
  </div>
  <div id="dialogue-layer"></div>
  <div id="ui-overlay"></div>
</div>
```

**Use:**  
- `#stage-layer` → camera `shake / zoom / pan`  
- `#camera-flash-layer` → `flash` overlay  
- `#dialogue-layer` + `#ui-overlay` stay outside camera transforms

**Why this is better than adding a library:** It solves the real problem: layer ownership.

### 2. Split character positioning from character motion

**Why needed:** `CharacterLayer` currently uses `transform` for centering/custom scaling. New preset animations also want `transform`. If both write to the same element, they will overwrite each other.

**Required change:** Introduce a motion child/wrapper.

**Recommended pattern:**

```html
<div class="character-sprite pos-center">
  <div class="character-motion char-anim-shake">
    <img class="char-img-a" />
    <img class="char-img-b" />
  </div>
</div>
```

**Responsibility split:**  
- outer `.character-sprite` → layout position / base scale  
- inner `.character-motion` → preset animation classes

**Result:** no transform collisions between position, scale, and animation.

### 3. Add internal runtime modules, not external packages

| Internal Module | Needed? | Purpose | Why |
|---|---|---|---|
| `src/ui/characterAnimationPresets.js` | Must | Canonical preset table shared by editor + runtime | Prevent enum drift and unknown-value bugs |
| `src/ui/CameraController.js` | Must | Own stage effects, flash overlay, cleanup, replay rules | Keeps `main.js` from becoming effect spaghetti |
| `src/ui/resetRuntimeVisualState.js` | Must | Shared cleanup for preview stop / replay / fast page changes | v1.4 will otherwise leak classes/transforms |
| `src/ui/runtimeCameraBinding.js` | Nice-to-have | Small adapter from engine events to controller | Keeps event wiring isolated and testable |

**Package.json change:** none.

### 4. Extend the existing page schema only

**Required data additions:**

```json
{
  "characters": [
    { "id": "hero", "expression": "smile", "animation": "breathe" }
  ],
  "camera": {
    "effect": "shake",
    "durationMs": 300,
    "intensity": "medium",
    "direction": "horizontal",
    "trigger": "onEnter"
  },
  "transition": {
    "type": "dissolve",
    "duration": 800
  }
}
```

**Do not add:** timeline tracks, arbitrary easing objects, nested animation graphs, or freeform keyframe JSON.

### 5. Expand the existing iframe preview contract

**Why needed:** The preview path is already the validated authority. v1.4 needs more commands, not a new preview system.

**Recommended additions to postMessage contract:**

| Message | Purpose |
|---|---|
| `start` | existing full page preview |
| `stop` | existing preview stop |
| `replay-character-animation` | replay one character preset on current page |
| `preview-camera` | replay current page camera effect |
| `preview-transition` | preview page transition without real navigation |
| `cancel-preview-effect` | cancel running effect and restore state |

**Rule:** preview messages must drive the same runtime classes/controllers used by exported runtime.

## Browser / CSS / DOM Primitives to Rely On

These are sufficient for v1.4.

| Feature | Primitive | Use It For | Notes |
|---|---|---|---|
| Character preset motion | CSS `@keyframes` | `shake`, `nod`, `bounce`, `breathe` | Best fit for named presets |
| Character enter effects | CSS transitions + keyframes | `fade-in`, `slide-in-left/right` | Reuse existing class-trigger model |
| Camera motion | CSS `transform` on `#stage-layer` | `shake`, `zoom`, `pan` | Controlled by one runtime owner |
| Flash | absolutely-positioned overlay div + opacity animation | `flash` | Cleaner than brightness/filter hacks |
| Background dissolve | dual-layer opacity transition | `dissolve` | Current `BackgroundLayer` already almost does this |
| Background scale | CSS `transform: scale()` | `scale` transition | Apply on incoming/outgoing bg layer only |
| Background blur | CSS `filter: blur()` + opacity | `blur` transition | Fine in Electron 41; keep durations short |
| Wipe | CSS `clip-path` **or** reveal wrapper with `overflow:hidden` | `wipe` | Prefer simple CSS reveal; degrade to fade if needed |
| Reliable replay | `requestAnimationFrame()` reflow/restart pattern | replay same class/effect twice | Necessary for editor “重播” buttons |
| Cleanup | `animationend`, `transitionend`, plus guarded timeouts | remove one-shot classes/inline styles | Must support fast navigation/cancel |

## Lightweight Dependency Recommendation

## Required

**None.**

Native DOM/CSS is enough for all v1.4 target effects.

## Optional Nicety (not recommended for v1.4)

If the team later decides CSS-only orchestration is too awkward for chained effects, the **only defensible lightweight candidate** is:

| Package | Current Version | Status | Why / Why Not |
|---|---:|---|---|
| `motion` | 12.38.0 | **Do not add in v1.4** | Small and modern, but still unnecessary for the current preset-only scope |

**Recommendation:** keep this out of v1.4. Add it only if a later milestone genuinely needs richer sequencing than CSS classes + controller timers can handle.

## Explicitly Do NOT Add in v1.4

| Library / Approach | Why Not |
|---|---|
| **GSAP (`gsap` 3.15.0)** | Powerful, but overkill for 6-8 presets + 4 camera effects; adds imperative animation layer the project does not need |
| **anime.js (`animejs` 4.3.6)** | Same problem: extra abstraction for effects CSS can already do |
| **PixiJS / Phaser / canvas/WebGL renderer** | Wrong rendering model; would fork the DOM runtime and break editor/runtime parity |
| **Lottie** | Solves vector timeline animation, not scene/character motion |
| **General timeline editor / ATL-like system** | Explicitly out of scope; turns v1.4 into a platform rewrite |
| **Per-frame JS animation loops** | Harder to clean up, more bug-prone under fast navigation/preview cancel |
| **Animation logic inside theme system** | Theme config is not the right ownership boundary for page runtime motion |
| **TypeScript migration** | Not needed for this milestone; violates current project constraint |
| **CSS/animation framework** | Native CSS is enough; frameworks add bulk without solving layer/lifecycle problems |

## Integration Guidance by Feature

### Character preset animations

**Implement with:** CSS keyframes + preset registry + `CharacterLayer` class management

**Needed code changes:**
- extend `show_character` event payload with `animation`
- add preset lookup in `CharacterLayer`
- apply one-shot classes on enter/replay
- keep loop class (`breathe`) active until page exit / replacement / preview cancel

**Important constraint:** animate the motion wrapper, not the positioned root container.

### Camera effects

**Implement with:** one `CameraController` owning `#stage-layer`

**Needed code changes:**
- `ScriptEngine` emits page camera contract on page activation
- `CameraController` applies only one active effect at a time
- all camera cleanup runs through shared reset helper

**Important constraint:** never let `BackgroundLayer`, `CharacterLayer`, and page transition code each write stage transforms independently.

### Expanded transitions

**Implement with:** existing dual background layer model + extra transition classes

**Recommended mapping:**
- `dissolve` → opacity crossfade
- `wipe` → clip/reveal animation
- `scale` → incoming layer scale + opacity
- `blur` → blur + opacity crossfade

**Important constraint:** keep transition ownership in `BackgroundLayer`; do not create a second transition subsystem.

### Editor preview

**Implement with:** existing iframe `postMessage` path only

**Needed code changes:**
- add preview helper methods in `usePageEditor.js`
- add preview buttons in `PageInspector.vue`
- disable buttons when iframe not ready
- ensure preview cancel fully restores runtime state

**Important constraint:** canvas mode remains static editing only; runtime iframe remains preview authority.

## Compatibility Constraints

| Constraint | Requirement |
|---|---|
| Existing projects | Old pages without `character.animation` or `page.camera` must keep working |
| Unknown enum values | Preserve in editor data; runtime should no-op + warn in dev |
| Fast navigation | Effects must be cancellable and fully cleaned up on page change |
| Skip/auto mode | one-shot effects may shorten/skip, but must not leave stale classes/styles |
| Web export | Use standards-based CSS/DOM only; if a transition proves unstable in some browsers, degrade that transition to `fade` rather than add a dependency |
| Editor/runtime parity | Preview must call the same runtime code paths as export/runtime |

## Testing Stack (sufficient as-is)

| Tool | Version | Use |
|---|---:|---|
| Vitest | 4.1.4 | controller and lifecycle tests |
| jsdom | 29.0.2 | DOM class/cleanup assertions |

**Do not add for v1.4:** Playwright/Cypress visual regression just for these effects. Unit/integration timing tests are enough at this milestone.

## Implementation Summary

| Category | Recommendation |
|---|---|
| New npm runtime deps | **0** |
| New dev deps | **0** |
| New internal modules | 3-4 small JS files |
| DOM change | add dedicated stage/camera wrapper + flash layer |
| CSS change | add keyframes/classes for presets, camera, and transitions |
| Engine change | extend `show_character` + page camera contract |
| Editor change | extend PageInspector + usePageEditor preview helpers |

## Installation

```bash
# No new packages required for v1.4
```

## Final Recommendation for REQUIREMENTS / ROADMAP

1. **Do not add any runtime animation library.**
2. **Add one dedicated stage/camera wrapper before implementing effects.**
3. **Add one dedicated character motion wrapper before implementing presets.**
4. **Keep all motion preset-based and enum-driven.**
5. **Use existing iframe preview infrastructure; only extend the message contract.**
6. **Treat any effect that needs a heavyweight library as out of scope for v1.4.**

## Sources

High-confidence direct codebase sources:

- `.planning/PROJECT.md`
- `docs/gap-analysis-vs-mature-engines.md`
- `docs/superpowers/plans/2026-04-21-v1.4-cinematic-upgrade.md`
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md`
- `package.json`
- `index.html`
- `src/main.js`
- `src/style.css`
- `src/engine/ScriptEngine.js`
- `src/ui/CharacterLayer.js`
- `src/ui/BackgroundLayer.js`
- `src/editor/stores/script.js`
- `src/editor/composables/usePageEditor.js`
- `src/editor/components/page-editor/PageInspector.vue`
- `src/editor/views/PageEditor.vue`

Version spot-checks for optional-but-not-recommended packages:

- `npm view motion version` → `12.38.0`
- `npm view animejs version` → `4.3.6`
- `npm view gsap version` → `3.15.0`
