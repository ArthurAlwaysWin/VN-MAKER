# Visual Effects, Transitions, And Game UI Polish Plan

**Status:** Active implementation plan
**Date:** 2026-05-31
**Scope owner:** Visual polish, page atmosphere, transition richness, and game UI feel
**Supersedes for this topic:** historical cinematic/theme plans under `docs/archive/superpowers-legacy/` and the non-authoritative AI review notes under `docs/archive/ai-review-2026-05-31/`

This plan is written for AI agents and human maintainers who need to implement the next visual-polish cycle without guessing. Follow the existing agent-first architecture:

- Human creators use the no-code editor: forms, dropdowns, sliders, presets, preview buttons.
- AI agents may use structured commands, scripts, and code-level implementation work when that produces better performance or richer effects.
- Both paths must converge on canonical project data, validation, preview, export, and handoff.

Do not treat this plan as permission to add arbitrary user-facing code editors, unvalidated JSON fields, or private agent-only project formats.

For the prompt-level workflow agents should follow when a user asks for visual polish, use `docs/agent-authoring/visual-polish-skill.md`.

## Product Goal

Make Galgame Maker outputs feel more like finished games by improving three high-impact surfaces:

1. Page atmosphere: built-in weather/particle effects such as sakura, snow, rain, dust, fireflies, sparkles, leaves, and bubbles.
2. Page-to-page transitions: a richer transition catalog that agents and humans can discover, preview, validate, and export.
3. Runtime UI feel: title screen, dialogue box, choices, game menu, save/load, settings, backlog, and quick-action UI should have polished default motion and reusable style presets.

Natural-language target examples:

- "I want this page to fade softly into the next page."
- "Add light sakura petals to this park scene, but keep it subtle."
- "Make the title screen feel like a suspense movie: slower menu entrance, dark panels, faint glow."
- "Use a dramatic shutter transition before the confession CG."

The agent should translate these into official operations, not manual JSON edits.

## Current Architecture Facts

Keep these facts in mind before editing:

- Page transitions are cataloged in `src/shared/transitionCatalog.js`.
- Runtime background transitions are implemented by `src/ui/BackgroundLayer.js`.
- Page data is rendered by `src/engine/ScriptEngine.js`.
- `ScriptEngine._renderPage()` emits page visual events.
- Page inspector transition controls live in `src/editor/components/page-editor/PageInspector.vue`.
- Cinematic normalization and UI option helpers live in `src/shared/cinematicContract.js`.
- External agent commands and apply-plan operation support live in `tools/vn-author/index.js`.
- Validation lives in `src/shared/projectValidator.js`.
- Export asset scanning lives in `src/engine/scanAssets.js`.
- Handoff/readiness/preview planning live under `src/authoring/`.
- The current direct CLI includes `list-transitions`, `set-page-transition`, and `set-page-transitions`.
- Existing transition ids include background `fade`, `none`, `dissolve`, wipes, slide, scale, blur, zoom, flash, iris, and `crossfade-pan`.

## Non-Goals For This Cycle

Do not implement these while following this plan unless a later user explicitly changes scope:

- Full rich-text dialogue markup.
- A Ren'Py/Yarn/Ink style text DSL.
- PixiJS, Three.js, or a full WebGL renderer dependency.
- Live2D or Spine runtime integration.
- Marketplace/plugin distribution.
- In-editor AI chat.
- Arbitrary HTML/CSS/JS entered by human users.
- Mandatory screenshot review for every edit. Keep screenshot evidence opt-in through existing preview gates.

## Global Rules

### No-Code Human Rule

Every feature exposed to humans must be represented as:

- dropdowns;
- sliders;
- color pickers;
- checkboxes/toggles;
- preset cards;
- preview buttons;
- short helper text.

Do not expose raw JSON, CSS, JS, or shader code in the normal editor UI.

### Agent High-Ceiling Rule

Agents are allowed to use code-level implementation details and structured command surfaces, but agent output must still be:

- stored in canonical `script.json` fields or documented project-owned assets;
- normalized by shared code;
- editable or at least safely visible in the GUI;
- validated with stable diagnostic codes;
- included in preview targets and handoff where visual review is needed;
- exportable to Web and Electron desktop;
- safely skipped/cleared during skip, preview stop, title return, load, and replay flows.

### Performance Rule

Default implementation must add zero new npm runtime dependencies.

Budgets:

- Particle layer: Canvas 2D, one canvas, no DOM node per particle.
- Default particle cap: 100 active particles total.
- Low-end target: stable 60 fps at 1280x720 for normal pages with default density.
- Skip mode: particles clear immediately; transitions resolve instantly or duration 0.
- Hidden tab: particle animation pauses on `document.hidden`.
- Reduced motion: respect `prefers-reduced-motion` and future `ui.motion.intensity = "off"`.
- No per-frame `getImageData()`, `toDataURL()`, layout thrashing, or unbounded allocations.

### Contract-First Rule

For every new system, implement in this order:

1. Shared contract and normalizer in `src/shared/`.
2. Runtime behavior or safe fallback.
3. Authoring API session methods in `src/authoring/projectSession.js`.
4. Direct CLI and apply-plan command support in `tools/vn-author/index.js`.
5. Validation diagnostics and changed-path reporting.
6. Editor GUI.
7. Preview/handoff integration.
8. Tests and docs.

Do not ship a GUI-only feature. Do not ship an agent-only feature that the editor cannot preserve and route for review.

## Data Model Decisions

### Page Particles

Add page-level particles under:

```json
{
  "scenes": {
    "start": {
      "pages": [
        {
          "type": "normal",
          "background": "backgrounds/park.png",
          "particles": {
            "preset": "sakura",
            "density": 0.45,
            "speed": 0.6,
            "wind": 0.2,
            "opacity": 0.8,
            "color": "#ffc6d9"
          }
        }
      ]
    }
  }
}
```

Semantics:

| Value | Meaning |
| --- | --- |
| object | Start or update page particles using the normalized config. |
| `null` or `false` | Stop particles on this page. |
| omitted | Inherit the last particle state earlier in the same scene; if none exists in the scene, clear particles. |

Why same-scene inheritance only:

- It is easy to explain in the editor.
- It avoids graph traversal across branching routes.
- Restore/preview can resolve the effective particle state by scanning pages `0..pageIndex` within the current scene.
- Agents can make cross-scene persistence explicit by setting particles on the first page of the next scene.

### Future Title Screen Particles

Do not author this field until the full title-screen particle contract milestone exists. The intended future shape is:

```json
{
  "ui": {
    "titleScreen": {
      "particles": {
        "preset": "sparkle",
        "density": 0.35,
        "speed": 0.4
      }
    }
  }
}
```

Do not put title particles under `ui.theme.particles`. Theme owns visual tokens and reusable style assets; title screen particles are screen behavior/config.

### Motion Intensity

For the first UI polish milestone, add tasteful default CSS motion without changing schema.

For configurable motion, add a later optional shared config:

```json
{
  "ui": {
    "motion": {
      "intensity": "standard",
      "title": "soft-rise",
      "dialogue": "soft-pop",
      "choices": "stagger-rise",
      "menus": "panel-slide"
    }
  }
}
```

Allowed `intensity` values:

- `off`
- `subtle`
- `standard`
- `dramatic`

Do not implement `ui.motion` before the default runtime polish and particle MVP are stable.

## Milestone 0: Documentation Cleanup

Status: done when this plan lands.

Actions:

- Archive non-authoritative AI analysis notes into `docs/archive/ai-review-2026-05-31/`.
- Archive historical superpowers execution plans/specs into `docs/archive/superpowers-legacy/`.
- Update active documentation entry points so future agents start from this plan for visual polish work.

Acceptance:

- No active doc tells agents that rich text, DSL, or WebGL is the immediate priority for this cycle.
- No active doc asks agents to follow obsolete superpowers execution instructions.
- Archived docs remain available for historical context but are clearly non-authoritative.

## Milestone 1: Runtime UI Polish Baseline

Status: implemented on 2026-05-31 as a schema-free runtime baseline. This milestone added default CSS motion tokens, reduced-motion handling, choice/title/menu/screen entrance polish, and focused regression coverage. It does not introduce `ui.motion`, particle data, or new agent commands.

Purpose: improve game feel quickly without schema changes.

### 1.1 Add Shared Motion CSS Tokens

Modify:

- `src/style.css`

Add CSS variables on `:root` or the runtime root:

```css
--gm-motion-fast: 140ms;
--gm-motion-medium: 260ms;
--gm-motion-slow: 420ms;
--gm-motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--gm-motion-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

Add a reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

Keep this block narrow if global override causes test or preview issues.

### 1.2 Choice Menu Motion

Modify:

- `src/ui/ChoiceMenu.js`
- `src/style.css`

Expected behavior:

- When choices appear, option buttons enter with a small upward motion and stagger.
- Hover/focus gets a subtle highlight or sheen.
- Keyboard/gamepad focus must remain visible.
- Skip mode should not leave choices invisible because of delayed animations.

Implementation constraints:

- Prefer CSS classes over JS timers.
- If `ChoiceMenu.show()` currently rebuilds children, add a stable visible class after children are appended.
- Do not put HTML from project data into `innerHTML`; keep `textContent`.

Tests:

- Existing choice menu tests must pass.
- Add a focused test if current test style supports source/DOM checks:
  - choice buttons are created with stable classes;
  - visible class is applied during show;
  - no option text uses `innerHTML`.

### 1.3 Title Screen Motion

Modify:

- `src/ui/TitleScreen.js`
- `src/style.css`

Expected behavior:

- Title background can have a very slow Ken Burns style motion.
- Buttons enter with a gentle stagger.
- Custom title elements should not break.
- Existing title screen layout and background config still win.

Constraints:

- Disable or reduce motion under `prefers-reduced-motion`.
- Avoid animating `background-size` if it causes measurable performance issues; use a pseudo-layer transform if needed.

### 1.4 Game Menu And Major Screen Panel Motion

Modify as needed:

- `src/ui/GameMenu.js`
- `src/ui/SaveLoadScreen.js`
- `src/ui/SettingsScreen.js`
- `src/ui/BacklogScreen.js`
- `src/style.css`

Expected behavior:

- Panels enter with subtle opacity/translate motion.
- Buttons/list rows have consistent hover/focus motion.
- No existing screen layout tests regress.

Acceptance:

- `npm run test:vitest -- tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js`
- `npm run test:node -- tests/configurableTabs.test.js tests/widgetDefaults.test.js` if touched.
- Manual preview: title, choices, menu, save/load, settings, backlog.

## Milestone 2: Particle Shared Contract

Status: implemented on 2026-05-31. `src/shared/particleContract.js` now defines the canonical built-in particle presets, field schema, normalizers, and same-scene effective-state resolver. Runtime/editor/agent command surfaces are intentionally still pending later milestones.

Purpose: define canonical particle data before runtime/editor/agent work.

### 2.1 New Shared Contract

Add:

- `src/shared/particleContract.js`

Exports:

```javascript
export const PARTICLE_PRESETS;
export const PARTICLE_PRESET_DEFS;
export const PARTICLE_FIELD_SCHEMA;
export function isKnownParticlePreset(preset);
export function normalizeParticleConfig(config, options = {});
export function normalizePageParticles(value, options = {});
export function resolveEffectivePageParticles(script, sceneId, pageIndex);
export function formatParticleLabel(preset);
```

Initial preset set:

| Preset | Label | Default density | Cap | Notes |
| --- | --- | ---: | ---: | --- |
| `sakura` | 樱花 | 0.45 | 35 | Rotating soft petals. |
| `snow` | 雪 | 0.55 | 60 | Round flakes, slow drift. |
| `rain` | 雨 | 0.65 | 100 | Fast streak lines. |
| `firefly` | 萤火 | 0.35 | 18 | Glowing dots. |
| `dust` | 尘埃 | 0.35 | 35 | Subtle floating dots. |
| `sparkle` | 星光 | 0.35 | 24 | Cross sparkle. |
| `leaves` | 落叶 | 0.35 | 28 | Rotating leaf ellipses. |
| `bubbles` | 气泡 | 0.30 | 24 | Upward circles. |

Canonical fields:

| Field | Type | Range | Default |
| --- | --- | --- | --- |
| `preset` | enum | preset ids | required |
| `density` | number | `0..1` | preset default |
| `speed` | number | `0..2` | `1` |
| `wind` | number | `-1..1` | `0` |
| `opacity` | number | `0..1` | `1` |
| `color` | string | `#rgb` or `#rrggbb` | preset default |
| `direction` | enum | `down`, `up`, `left`, `right` | preset default |

Normalizer behavior:

- Return `undefined` for inherited/omitted value where the caller needs to preserve omission.
- Return `null` for explicit stop values `null` or `false`.
- Return normalized object for valid configs.
- Clamp numeric fields.
- Fall back unknown preset to `dust` for runtime safety, but expose validation warning.
- Strip unknown fields for canonical writes unless `options.preserveUnknown === true`.

### 2.2 Tests

Add:

- `tests/particleContract.test.js`

Cover:

- Every preset normalizes.
- Unknown preset falls back safely.
- Numeric fields clamp.
- `null` and `false` normalize to stop.
- `undefined` remains inherited/omitted.
- `resolveEffectivePageParticles()` scans same-scene previous pages only.
- First page omitted resolves to `null`.
- A later page after explicit `null` resolves to `null` until another object appears.

Acceptance:

```bash
npm run test:vitest -- tests/particleContract.test.js
```

## Milestone 3: Particle Runtime

Status: implemented on 2026-05-31 for page particles. Runtime now has a procedural Canvas 2D `ParticleLayer`, ScriptEngine `set_particles`/`stop_particles` events, skip/reset/load/preview cleanup, and focused runtime tests. Title-screen particles remain pending until their own shared contract, validation, commands, editor controls, and handoff routing are added.

Purpose: render built-in page atmosphere efficiently.

### 3.1 Add ParticleLayer

Add:

- `src/ui/ParticleLayer.js`

Constructor:

```javascript
new ParticleLayer(container, options = {})
```

Public API:

```javascript
play(config)
stop(fadeOutMs = 600)
clear()
resize()
destroy()
```

Requirements:

- Use one `<canvas id="particle-canvas">`.
- Canvas sits between background and character layers.
- Use `requestAnimationFrame`.
- Pause when `document.hidden`.
- Resize to runtime viewport without stretching artifacts.
- Use `devicePixelRatio`, capped to `2`.
- Keep particles in an array with a hard cap from preset definition.
- Recycle particles instead of creating unbounded objects.
- Do not access project assets in MVP; all presets are procedural.

Layering:

- Background layer remains behind particles.
- Character layer remains above particles.
- Dialogue/UI remains above characters.

If current DOM structure makes the exact insertion point awkward, add a wrapper or append particle canvas to `#game-container` with CSS z-index. Do not place particles above dialogue UI.

### 3.2 ScriptEngine Events

Modify:

- `src/engine/ScriptEngine.js`

Add event docs:

```javascript
 *   'set_particles'   — { config, sceneId, pageIndex }
 *   'stop_particles'  — { sceneId, pageIndex }
```

In `_renderPage(page)`:

- Resolve effective particles for current `sceneId` and `pageIndex`.
- Emit `set_particles` with normalized config if effective config exists.
- Emit `stop_particles` if effective config is `null`.

Important:

- Restore/preview must render the correct effective particle state even when the current page inherits from an earlier page.
- Condition pages do not render or contribute inherited particle state.
- Page particles should not alter save state; current save restore re-renders current page.

### 3.3 Runtime Wiring

Modify:

- `src/main.js`

Add:

- instantiate `ParticleLayer`;
- wire `engine.on('set_particles', ...)`;
- wire `engine.on('stop_particles', ...)`;
- clear particles on title return, replay cleanup, preview stop, load, game end, and skip start as appropriate.

Skip behavior:

- On skip start: `particleLayer.clear()`.
- During skip: ignore `set_particles` and `stop_particles`, or apply only final clear/state without animation.
- On skip stop: render/replay current page already restores the correct page visuals; if not, explicitly call a helper to apply current effective particles.

### 3.4 Title Screen Particles

Modify:

- `src/ui/TitleScreen.js` or `src/main.js`, whichever owns screen lifecycle more cleanly.

Behavior:

- Pending future work: when title-screen particles become authorable, add the shared contract and validation before runtime playback.
- When leaving a particle-enabled title screen, stop/clear it before story particles start.
- If the title screen has no particles, do nothing.

Keep title particles independent from story page particle inheritance.

### 3.5 Runtime Tests

Add:

- `tests/particleLayer.test.js`
- `tests/particleRuntimeWiring.test.js`

Cover:

- `ParticleLayer.play()` creates one canvas and starts state.
- `clear()` removes particles and stops animation safely.
- Unknown/invalid config does not throw.
- `ScriptEngine` emits particle events for object/null/inherited pages.
- Restore/direct render produces same effective particle event for inherited page.
- Main wiring clears particles during skip or reset flows. If direct DOM test is difficult, use source-level regression tests consistent with existing runtime wiring tests.

Acceptance:

```bash
npm run test:vitest -- tests/particleContract.test.js tests/particleLayer.test.js tests/particleRuntimeWiring.test.js
```

## Milestone 4: Particle Editor UI

Status: implemented on 2026-05-31. Page Inspector now includes a no-code `ParticlePanel` with inherit/stop/play modes, preset controls, sliders, color picker, and iframe particle preview. It writes canonical page `particles` data and never exposes raw JSON to human editors.

Purpose: expose particles to humans without code.

### 4.1 ParticlePanel Component

Add:

- `src/editor/components/page-editor/ParticlePanel.vue`

Human UI modes:

- `继承上一页`
- `停止粒子`
- `播放粒子`

Fields when playing:

- preset dropdown;
- density slider;
- speed slider;
- wind slider;
- opacity slider;
- color picker;
- direction dropdown if useful for rain/bubbles/leaves;
- preview button;
- clear button.

Rules:

- The component must preserve omission for inherit mode. Do not write `{}`.
- Stop mode writes `particles: null`.
- Play mode writes normalized object.
- Every committed change calls the existing undo path once.
- Preview should not commit.

### 4.2 Integrate With PageInspector

Modify:

- `src/editor/components/page-editor/PageInspector.vue`

Add `ParticlePanel` near page transition/camera settings in the page properties section.

Add `sections.particles` only if needed; otherwise keep within props section.

### 4.3 Editor Preview

Modify:

- `src/editor/composables/usePageEditor.js`
- preview iframe message handling in `src/main.js` if needed.

Add a preview path consistent with transition/camera preview:

```javascript
editor.previewParticleEffect({ config })
```

Preview behavior:

- Requires preview iframe to be running.
- Plays particles over current preview page for a short period.
- Does not write data.
- Reports busy/success/error state in the panel.

Acceptance:

- Human can choose "sakura", adjust density/wind, preview, and save.
- Human can set inherit/stop/play without touching JSON.
- Undo/redo works.
- Existing PageInspector tests continue passing.

Tests:

- Add `tests/pageInspectorParticleControls.test.js` if current test harness can mount the component.
- Otherwise add source-level tests similar to existing editor wiring tests.

## Milestone 5: Particle Agent Surface

Status: implemented on 2026-05-31. `createProjectSession()` now exposes `setPageParticles`, `clearPageParticles`, and `inheritPageParticles`; `tools/vn-author` supports `list-particles`, direct page particle mutation commands, and matching `apply-plan` operations with changed path reporting.

Purpose: let natural language map to stable operations.

### 5.1 Authoring API

Modify:

- `src/authoring/projectSession.js`

Add methods:

```javascript
setPageParticles({ sceneId, pageIndex, particles })
clearPageParticles({ sceneId, pageIndex })
inheritPageParticles({ sceneId, pageIndex })
```

Return structured result:

```javascript
{
  ok: true,
  sceneId,
  pageIndex,
  pathString: "scenes.start.pages.0.particles",
  particles: normalizedOrNullOrUndefined
}
```

Changed path:

- `scenes.<sceneId>.pages.<pageIndex>.particles`

### 5.2 Direct CLI Commands

Modify:

- `tools/vn-author/index.js`

Add commands:

```bash
npm run vn -- list-particles --json
npm run vn -- set-page-particles --scene start --page 0 --preset sakura --density 0.45 --speed 0.6 --wind 0.2 --script public/game/script.json --force --json
npm run vn -- clear-page-particles --scene start --page 0 --script public/game/script.json --force --json
npm run vn -- inherit-page-particles --scene start --page 0 --script public/game/script.json --force --json
```

Direct command behavior:

- `list-particles` is read-only.
- `set-page-particles` validates required scene/page/preset.
- `clear-page-particles` writes `null`.
- `inherit-page-particles` deletes the `particles` own property.
- Support `--dry-run`, `--force`, `--backup`, `--checkpoint`, `--out`, and `--json` consistently with nearby mutation commands.

### 5.3 Apply-Plan Operations

Add supported apply-plan commands:

- `set-page-particles`
- `clear-page-particles`
- `inherit-page-particles`

Manifest examples:

```json
{
  "id": "park-sakura",
  "command": "set-page-particles",
  "params": {
    "scene": "start",
    "page": 0,
    "preset": "sakura",
    "density": 0.45,
    "wind": 0.2
  }
}
```

```json
{
  "id": "stop-rain",
  "command": "clear-page-particles",
  "params": {
    "scene": "start",
    "page": 4
  }
}
```

### 5.4 Natural-Language Mapping Guidance

Update:

- `docs/agent-authoring/command-reference.md`
- `docs/agent-authoring/mini-workflows.md`
- `docs/agent-authoring/skill.md`

Add examples:

| User says | Agent operation |
| --- | --- |
| "Add soft sakura petals to this page." | `set-page-particles` with `preset=sakura`, `density=0.3..0.5`. |
| "Make it snow heavily here." | `set-page-particles` with `preset=snow`, `density=0.7..0.9`, `speed=0.7`. |
| "Stop the rain when they go inside." | `clear-page-particles`. |
| "Keep the same atmosphere on the next page." | `inherit-page-particles` if previous page has the desired state, or explicit `set-page-particles` if crossing scenes. |

Acceptance:

- `npm run vn -- list-particles --json` returns presets and field ranges.
- `apply-plan` result includes changed path.
- Operation failures include supported command hints.
- `author-check --transaction` focuses changed particle pages.

## Milestone 6: Particle Validation, Preview, Handoff, Export

Status: implemented on 2026-05-31. Validation now warns for invalid/unknown page particle configs without blocking export; `author-check --transaction` focuses changed particle pages and emits particle preview review issues; handoff reports add scene-page preview targets and `particle-preview` review items for `scenes.<sceneId>.pages.<pageIndex>.particles`.

### 6.1 Validation

Modify:

- `src/shared/projectValidator.js`

Add warning codes:

| Code | Severity | Meaning |
| --- | --- | --- |
| `unknown-particle-preset` | warning | Preset is not in `PARTICLE_PRESETS`; runtime will fall back. |
| `invalid-particle-config` | warning | Particles field is not object/null/false/undefined. |
| `invalid-particle-density` | warning | Density was outside range or not numeric. |
| `invalid-particle-speed` | warning | Speed was outside range or not numeric. |
| `invalid-particle-wind` | warning | Wind was outside range or not numeric. |
| `invalid-particle-color` | warning | Color is not accepted hex. |

Do not block export for unknown future particle presets unless runtime cannot fall back.

### 6.2 Export Readiness

Modify if needed:

- `src/authoring/exportReadiness.js`
- `src/engine/scanAssets.js`

MVP procedural particles reference no asset files, so `scanAssets()` should not add anything.

Future custom particle images must be added to `scanAssets()` under `ui` or a new documented bucket.

### 6.3 Handoff And Preview Targets

Modify:

- `src/authoring/agentHandoff.js`
- `src/authoring/projectReport.js` if report counts include particle pages.
- `src/editor/utils/agentHandoff.js` if path routing needs custom label.

When changed path matches:

- `scenes.<sceneId>.pages.<pageIndex>.particles`

Add preview target:

```json
{
  "kind": "scene-page",
  "sceneId": "start",
  "pageIndex": 0,
  "reason": "changed-particles",
  "pathString": "scenes.start.pages.0.particles"
}
```

Review item category:

- `particle-preview`

Use it only for visual review reminders, not as a validation error.

Acceptance:

- `author-check --transaction result.json --write-preview-plan --json` emits scene-page targets for particle edits.
- Project Settings can route the changed path to the edited page.

## Milestone 7: Transition Catalog Expansion

Status: implemented on 2026-05-31. The background transition catalog now carries category/render-mode/description metadata and includes the CSS-only `diagonal-wipe`, `cross-wipe`, `diamond`, `circle-open`, `circle-close`, `curtain-open`, `curtain-close`, `blinds-h`, `blinds-v`, `clock-wipe`, `radial-wipe`, `fade-white`, `fade-black`, `glitch-lite`, and `pixelate-lite` ids. Runtime CSS classes/keyframes, same-page preview, editor option discovery, direct CLI, and apply-plan setters all reuse the existing transition path.

Purpose: increase page-to-page expressive range while reusing current transition architecture.

### 7.1 Extend Catalog Metadata

Modify:

- `src/shared/transitionCatalog.js`

Add optional fields to `defineTransition()` with backward-compatible defaults:

```javascript
category = 'basic'
renderMode = 'css'
description = ''
```

Return these fields from `listTransitionCatalog()`.

Categories:

- `basic`
- `slide`
- `wipe`
- `shape`
- `curtain`
- `flash`
- `stylized`
- `canvas-mask`

Render modes:

- `css`
- `canvas-mask`

### 7.2 CSS-Only Transition Batch

Add these background transitions first:

| ID | Label | Category | Render mode | Fallback |
| --- | --- | --- | --- | --- |
| `diagonal-wipe` | 对角擦除 | wipe | css | `wipe` |
| `cross-wipe` | 十字展开 | wipe | css | `wipe` |
| `diamond` | 菱形展开 | shape | css | `iris-in` |
| `circle-open` | 圆形展开 | shape | css | `iris-in` |
| `circle-close` | 圆形收束 | shape | css | `iris-out` |
| `curtain-open` | 开幕 | curtain | css | `wipe` |
| `curtain-close` | 闭幕 | curtain | css | `wipe` |
| `blinds-h` | 水平百叶窗 | curtain | css | `wipe` |
| `blinds-v` | 垂直百叶窗 | curtain | css | `wipe` |
| `clock-wipe` | 时钟擦除 | shape | css | `iris-in` |
| `radial-wipe` | 径向擦除 | shape | css | `iris-in` |
| `fade-white` | 经白淡入 | flash | css | `flash` |
| `fade-black` | 经黑淡入 | flash | css | `fade` |
| `glitch-lite` | 轻故障 | stylized | css | `dissolve` |
| `pixelate-lite` | 轻像素化 | stylized | css | `blur` |

Avoid `clip-path: path()` for MVP because support and authoring readability are weaker than polygon/inset/radial/conic approaches.

### 7.3 Runtime CSS Classes

Modify:

- `src/ui/BackgroundLayer.js`
- `src/style.css`
- `src/shared/cinematicContract.js`

For every new id:

- catalog entry exists;
- runtime normalization recognizes it;
- `BackgroundLayer._clearLayerState()` removes both in/out classes;
- CSS defines incoming and outgoing classes;
- duration uses `--bg-transition-duration`;
- duration 0 and skip still cut immediately.

Naming convention:

- incoming: `.bg-transition-<id>`
- outgoing: `.bg-transition-<id>-out`

### 7.4 Editor Transition Grouping

Modify:

- `src/shared/cinematicContract.js`
- `src/editor/components/page-editor/PageInspector.vue`

If current `getTransitionUiOptions()` returns a flat array, either:

- keep flat list for compatibility; or
- add grouped metadata while preserving old consumers.

Human UI should show readable group labels if the select implementation supports it:

- 基础
- 滑动
- 擦除
- 形状
- 帘幕
- 闪光
- 风格化

Do not block transition implementation on grouped UI. Catalog discoverability matters more.

### 7.5 CLI And Agent Behavior

No new transition command is required.

Existing commands must work:

```bash
npm run vn -- list-transitions --target background --supported-only --json
npm run vn -- set-page-transition --scene start --page 0 --type fade-white --duration 700 --force --json
```

Update docs/help text so new ids appear in examples or accepted lists.

Natural-language mapping:

| User says | Transition |
| --- | --- |
| "淡入淡出" | `fade` |
| "闪白一下" | `flash` or `fade-white` |
| "像电影黑场一样切过去" | `fade-black` |
| "百叶窗打开" | `blinds-h` or `blinds-v` |
| "从中心展开" | `circle-open` or `diamond` |
| "有点故障感" | `glitch-lite` |

### 7.6 Tests

Add or update:

- `tests/transitionCatalogExtended.test.js`
- `tests/backgroundLayerTransitions.test.js`
- `tests/backgroundTransitionPreview.test.js`
- `tests/vnAuthorCli.test.js`

Cover:

- Every new id is listed by `list-transitions`.
- Every new id is runtime/editor supported.
- Unknown transition still falls back safely.
- `set-page-transition` accepts new ids.
- `BackgroundLayer._clearLayerState()` knows every new CSS id.
- Preview path does not reject new ids.

Acceptance:

```bash
npm run test:vitest -- tests/transitionCatalogExtended.test.js tests/backgroundLayerTransitions.test.js tests/backgroundTransitionPreview.test.js tests/vnAuthorCli.test.js
```

## Milestone 8: Canvas-Mask Transition Add-On

Purpose: add a small number of high-impact transitions that CSS cannot express well.

Do this only after Milestone 7 is stable.

### 8.1 Add TransitionMask

Add:

- `src/ui/TransitionMask.js`

Public API:

```javascript
export async function runCanvasMaskTransition({
  incoming,
  outgoing,
  type,
  duration,
  signal,
})
```

Supported ids:

- `noise-dissolve`
- `ripple`
- `burn`

Performance rules:

- Do not run at 60 fps if mask generation is expensive; 15-24 fps is acceptable for mask updates.
- Prefer CSS variables and precomputed frames.
- Avoid `toDataURL()` per frame if possible.
- If browser API support is awkward, implement `noise-dissolve` first and defer `ripple`/`burn`.
- Always release canvas/resources after transition.
- Always support cancellation from `BackgroundLayer._cancelActiveTransition()`.

### 8.2 Catalog Entries

Add:

| ID | Label | Category | Render mode | Fallback |
| --- | --- | --- | --- | --- |
| `noise-dissolve` | 噪点溶解 | canvas-mask | canvas-mask | `dissolve` |
| `ripple` | 水波纹 | canvas-mask | canvas-mask | `crossfade-pan` |
| `burn` | 燃烧 | canvas-mask | canvas-mask | `fade-white` |

### 8.3 BackgroundLayer Integration

Modify:

- `src/ui/BackgroundLayer.js`

Behavior:

- Look up transition entry by target/id.
- If `renderMode === 'canvas-mask'`, call `TransitionMask`.
- Fall back to entry fallback if `TransitionMask` throws.
- Preserve current Promise completion behavior.
- Cancellation must resolve pending promises exactly once.

Tests:

- Canvas-mask ids route to `TransitionMask`.
- Failure falls back.
- Cancellation does not leave stale styles.

## Milestone 9: Configurable Runtime UI Motion

Status: implemented on 2026-06-01. `ui.motion` now has a shared contract and normalizer, runtime root motion classes, no-code Project Settings controls, `set-ui-motion` direct/apply-plan support, validation warnings, all-major-screen preview/handoff routing, and focused regression coverage.

Purpose: make UI feel configurable through no-code presets and agent commands.

Do this after default UI motion, particles, and transition expansion are stable.

### 9.1 Shared Motion Contract

Add:

- `src/shared/uiMotionContract.js`

Exports:

```javascript
export const UI_MOTION_INTENSITIES;
export const UI_MOTION_PRESETS;
export function normalizeUiMotion(config);
export function getUiMotionClassNames(config);
```

Initial presets:

| Field | Values |
| --- | --- |
| `intensity` | `off`, `subtle`, `standard`, `dramatic` |
| `title` | `none`, `soft-rise`, `cinematic-slow`, `glow-pulse` |
| `dialogue` | `none`, `soft-pop`, `slide-up`, `glass-fade` |
| `choices` | `none`, `stagger-rise`, `card-pop`, `suspense-delay` |
| `menus` | `none`, `panel-fade`, `panel-slide`, `sidebar-sweep` |

### 9.2 Runtime Application

Modify:

- `src/main.js`
- major UI classes as needed
- `src/style.css`

Apply motion classes to root:

```text
gm-motion-intensity-standard
gm-motion-title-soft-rise
gm-motion-dialogue-soft-pop
gm-motion-choices-stagger-rise
gm-motion-menus-panel-slide
```

Default if absent:

```json
{
  "intensity": "standard",
  "title": "soft-rise",
  "dialogue": "soft-pop",
  "choices": "stagger-rise",
  "menus": "panel-fade"
}
```

### 9.3 Editor UI

Add to a suitable screen/layout/theme editor area:

- "动效强度" dropdown.
- "标题页动效" dropdown.
- "对话框动效" dropdown.
- "选项动效" dropdown.
- "菜单动效" dropdown.
- Preview button.

No code/JSON textareas.

### 9.4 Agent Commands

Add direct/apply-plan command:

- `set-ui-motion`

Example:

```bash
npm run vn -- set-ui-motion --intensity dramatic --title cinematic-slow --choices suspense-delay --force --json
```

Changed path:

- `ui.motion`

Preview target:

- affected screen target or all major screens if transaction only says `ui.motion`.

## Milestone 10: Game UI Style Presets

Status: in progress after the 2026-06-01 thin slice. The first pass added a shared preset contract, no-code Project Settings preview/apply cards, `list-ui-style-presets`, `apply-ui-style-preset`, apply-plan support, a validation warning for noncanonical `ui.stylePreset`, preview/handoff path routing through normal UI sections, and focused tests/docs. The next pass adds shared impact-summary metadata, CLI/session result reporting, and Project Settings confirmation before updating existing UI config. Asset-backed title-screen recipes remain deferred.

Purpose: make complete games feel designed, not assembled.

This milestone should build on current theme/widget/screen config, not replace it.

### 10.1 Preset Shape

Add built-in style recipes under a new editor/runtime-owned module:

- `src/editor/builtinUiStylePresets.js` or similar.
- Implemented as `src/shared/uiStylePresetContract.js` so editor, authoring API, CLI/apply-plan, validation-adjacent tests, and preview routing share one contract.

Preset categories:

- `classic-adv`
- `glass-school`
- `dark-cinema`
- `suspense-noir`
- `sci-fi-hud`
- `soft-romance`

Each preset may include:

- theme token overrides;
- dialogue box settings;
- choice/menu widget style settings;
- major screen panel settings;
- motion preset.

Do not make presets opaque. Applying a preset should write normal existing config sections so humans can edit the result.

Implemented thin slice:

- applies only canonical `ui.theme`, `ui.dialogueBox`, `ui.widgetStyles`, major screen config, and `ui.motion`;
- keeps recipes asset-free for export safety;
- warns on noncanonical `ui.stylePreset` instead of treating it as project state.

Implemented follow-up:

- `src/shared/uiStylePresetContract.js` exposes impact sections and `impactSummary` data for preset application;
- authoring session/direct CLI/apply-plan results can report the same changed UI blocks before humans review the transaction;
- Project Settings shows the affected editable UI blocks for the selected scope before applying a card;
- style preset recipes now use runtime-supported nameplate and major-screen fields only;
- choice-scope presets route explicit `ui.widgetStyles.button` values into `ChoiceMenu` without applying unrelated widget defaults.

Title-screen recipe assessment:

- Low-risk contract-first path: extend the shared preset recipe with normal `ui.titleScreen` patches, add `ui.titleScreen` to changed paths/impact summary, route preview/handoff to `titleScreen`, then expose no-code Project Settings copy.
- Do not add asset-backed title-screen recipes yet. They need asset scanning/export readiness, validation, and review routing before they are safe.
- Continue not storing the selected preset as `ui.stylePreset`.

### 10.2 Human UX

Add:

- preview cards;
- "apply to current project";
- "apply only dialogue/choices";
- "apply only major screens";
- impact summary before replacing existing UI config.

Implemented thin slice:

- Project Settings cards list all built-in presets;
- preview posts a preset-applied script snapshot into the existing iframe preview;
- apply uses the editor store undo stack and marks the project dirty;
- scopes cover all UI, dialogue, choices, and major screens.

Implemented follow-up:

- selected scope shows the affected editable UI sections;
- cards warn when existing UI config will be updated;
- applying a preset asks for confirmation when existing config is present.

Deferred:

- richer custom modal copy for replace-mode/bulk operations beyond the current shared impact summary.

### 10.3 Agent UX

Add:

- `list-ui-style-presets`
- `apply-ui-style-preset`

Implemented for direct CLI and `apply-plan`, with changed paths suitable for validation, preview targeting, handoff reporting, and rollback/checkpoint flows.

Natural-language examples:

| User says | Agent action |
| --- | --- |
| "Make the UI feel like a suspense movie." | Apply `suspense-noir`, then tune `ui.motion`. |
| "Use a clean school romance style." | Apply `glass-school` or `soft-romance`. |
| "Make choices feel more like dramatic branching cards." | Apply choice-only preset or widget style patch. |

## Milestone 11: Agent Advanced Effect Packs

Purpose: allow agents to implement higher-ceiling effects with code while preserving safety and no-code human UX.

This is intentionally later than built-in particles/transitions. Do not implement it first.

### 11.1 Rationale

Human no-code UX should not cap agent capability. Agents may be able to create performant procedural visuals that are too specialized for built-in presets.

However, arbitrary project-local JS is risky. It can hurt export, security, determinism, and editor preservation.

### 11.2 Proposed Safe Shape

Effect packs should be project assets with manifest, not raw script fields:

```text
assets/effects/my-effect/
  effect.json
  runtime.js
  preview.png
```

Manifest:

```json
{
  "id": "old-film-flicker",
  "kind": "particle",
  "label": "旧胶片闪烁",
  "version": 1,
  "entry": "runtime.js",
  "paramsSchema": {
    "intensity": { "type": "number", "minimum": 0, "maximum": 1, "default": 0.5 }
  },
  "performance": {
    "maxParticles": 0,
    "usesCanvas": true,
    "supportsSkip": true
  }
}
```

Rules:

- No network.
- No filesystem.
- No `eval`.
- No arbitrary DOM outside the provided canvas/container.
- Runtime receives a narrow API object.
- Export copies effect pack files.
- Validator checks manifest.
- Editor shows it as a named preset with parameters.

This milestone requires a dedicated security/design review before implementation.

## Required Documentation Updates Per Milestone

Update docs as features land:

- `docs/agent-authoring/project-contract.md`
- `docs/agent-authoring/command-reference.md`
- `docs/agent-authoring/validation-rules.md`
- `docs/agent-authoring/mini-workflows.md`
- `docs/agent-authoring/skill.md`
- `docs/agent-authoring/workflow.md`
- `docs/script-format.md`

Do not document a command before tests prove it works.

## Required Test Gates

For small milestones:

```bash
npm run test:vitest -- <focused tests>
npm run test:node -- <focused node tests if touched>
```

Before closing a major milestone:

```bash
npm run test
npm run build
npm run build:web
```

Before handing off an agent-authored example project:

```bash
npm run verify:agent-example -- --out .tmp/agent-example-project --force --json
```

## Implementation Checklist Summary

Use this checklist for each feature:

- [ ] Shared contract exists.
- [ ] Normalizer clamps/falls back safely.
- [ ] Runtime handles valid, missing, and malformed data.
- [ ] Editor can preserve unknown/future-safe data where applicable.
- [ ] Human UI is no-code.
- [ ] Agent direct CLI exists if humans might ask for the feature by natural language.
- [ ] Apply-plan operation exists for transaction workflows.
- [ ] Validation emits stable codes.
- [ ] Changed paths are exact.
- [ ] `author-check --transaction` creates the right preview target.
- [ ] Handoff can route the path back to editor review.
- [ ] Web export and Electron desktop export work.
- [ ] Skip/auto/load/replay/title-return do not leave stale visual state.
- [ ] Tests cover runtime, editor/CLI surface, validation, and docs examples.

## Recommended Build Order

1. Milestone 1: Runtime UI polish baseline.
2. Milestones 2-3: Particle contract and runtime.
3. Milestones 4-6: Particle editor, agent surface, validation/handoff.
4. Milestone 7: CSS-only transition expansion.
5. Milestone 8: Canvas-mask transitions.
6. Milestone 9: Configurable UI motion.
7. Milestone 10: Game UI style presets.
8. Milestone 11: Agent advanced effect packs.

Reasoning:

- UI polish gives immediate game-feel improvement with low schema risk.
- Particles are the largest atmosphere win and need a new contract.
- CSS transitions reuse the existing transition system and are safer than canvas-mask work.
- Agent advanced effect packs should wait until built-in effects establish the safety and preview pattern.
