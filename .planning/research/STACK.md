# Technology Stack — Settings Page Designer

**Project:** Galgame Maker — Settings Page Designer milestone
**Researched:** 2025-07-17
**Overall confidence:** HIGH

## Verdict: Zero New Dependencies

The Settings Page Designer requires **no new libraries**. The existing codebase already contains every building block needed: a proven drag-and-drop canvas system (`DraggableElement.vue` + `CanvasPreview.vue`), reactive state management (Pinia with undo/redo), a custom-layout rendering pattern in the runtime (`TitleScreen.js`), and CSS sanitization utilities (`sanitize.js`). Adding external libraries would break the project's zero-dependency philosophy and introduce integration complexity for zero benefit.

---

## Recommended Stack (All Existing)

### Core Framework — No Changes

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vue 3 | ^3.5.31 | Editor UI — SettingsDesigner.vue + property panel + component palette | Already used for all editor views; Composition API `<script setup>` is the project standard |
| Pinia | ^3.0.4 | State management — settings layout stored in `script.data.ui.settingsPage` | Already manages all editor state with undo/redo via JSON snapshots in `useScriptStore` |
| Electron | ^41.0.4 | Desktop shell, IPC file I/O | Unchanged — settings data flows through existing `save-project` IPC handler |
| Vite | ^6.3.0 | Build tool | Unchanged |

**Confidence: HIGH** — These are the installed, working versions. No upgrades needed.

### Reusable Editor Infrastructure — Already Built

| Component | Location | Reuse For Settings Designer | Adaptation Needed |
|-----------|----------|---------------------------|-------------------|
| `DraggableElement.vue` | `src/editor/components/canvas/` | Wrapping each settings component on the canvas — drag + resize | None. Already supports `x`, `y`, `width`, `height`, `canvasScale`, `resizable`, `select`, `move`, `resize` events |
| `CanvasPreview.vue` pattern | `src/editor/components/canvas/` | 1280×720 artboard with `ResizeObserver` auto-scaling | Extract scaling logic into a composable or build a parallel `SettingsCanvas.vue` that follows the same `artboardStyle` + `canvasScale` pattern |
| `useScriptStore` | `src/editor/stores/script.js` | Undo/redo for settings layout edits via existing `pushState()` + JSON snapshot history | None. Settings data lives under `script.data.ui.settingsPage`, automatically covered by the deep watcher |
| `sanitize.js` | `src/ui/sanitize.js` | CSS value sanitization for user-chosen colors/fonts in settings components | None. `sanitizeCssValue()` and `clampField()` already cover all needed field types |
| `AssetPanel.vue` | `src/editor/components/` | Reference for the component palette sidebar pattern (140px sidebar with draggable items) | Conceptual reuse — the palette uses the same sidebar layout pattern |

**Confidence: HIGH** — Verified by reading every file. The DraggableElement already handles canvas-scale-aware dragging, which is the hardest part.

### Runtime Engine Infrastructure — Extend Existing

| Component | Location | What Changes | Why |
|-----------|----------|--------------|-----|
| `SettingsScreen.js` | `src/ui/SettingsScreen.js` | Refactor to read `ui.settingsPage` from `script.json` and render custom layout (like `TitleScreen.js` does) | Currently renders a hardcoded layout. Needs the same `setLayout()` → `_renderCustom()` / `_renderDefault()` pattern that `TitleScreen.js` already implements |
| `ConfigManager.js` | `src/engine/ConfigManager.js` | Add 3 new config keys: `fullscreen` (boolean), `skipRead` (boolean), `dialogueAlpha` (number 0-1) | Currently only has `bgmVolume`, `seVolume`, `textSpeed`, `autoSpeed`. The 3 new settings from PROJECT.md requirements need engine-side defaults |
| `sanitize.js` | `src/ui/sanitize.js` | Possibly add `opacity` to BOUNDS map | Minor — for `dialogueAlpha` clamping |

**Confidence: HIGH** — `TitleScreen.js` lines 38-84 are a working reference implementation of exactly this pattern: check for custom layout → render with positioned DOM elements → fall back to default.

---

## Architecture Approach: DOM-Based Component Rendering

### Why DOM, Not HTML5 Canvas API

The project uses **DOM elements styled with CSS** for all visual rendering — both in the editor (Vue components) and in the runtime engine (imperative `document.createElement`). The settings designer must follow this same pattern.

| Approach | Verdict | Rationale |
|----------|---------|-----------|
| **DOM-based (Vue + CSS)** | ✅ USE THIS | Matches every existing component. DraggableElement wraps DOM children. Runtime SettingsScreen creates DOM elements. Interactive controls (sliders, toggles) are native HTML elements styled with CSS. |
| HTML5 Canvas (2D context) | ❌ REJECT | Would require reimplementing hit testing, text rendering, accessibility, input handling. Native `<input type="range">` and `<input type="checkbox">` work out of the box in DOM. The editor's canvas is not a literal `<canvas>` — it's a scaled `<div>`. |
| SVG | ❌ REJECT | Adds complexity for no benefit over styled DOM. The components need interactive behavior (slider input events) that DOM handles natively. |

**Confidence: HIGH** — This is an architecture fact, not a choice. The entire codebase is DOM-based.

### Pre-Made Settings Component Model

Each settings component is defined as a **type + configKey** pair. The `type` determines visual rendering (slider, toggle, label, button). The `configKey` maps to a `ConfigManager` key whose logic is engine-built-in. Developers only customize visual properties (position, size, colors, fonts).

**Editor-side data model** (stored in `script.data.ui.settingsPage.elements[]`):

```javascript
// Slider component example
{
  id: "bgm-volume",
  type: "slider",           // Rendering type: slider | toggle | label | button
  configKey: "bgmVolume",   // Engine config key — logic is built-in
  label: "BGM 音量",        // Display label
  x: 200, y: 150,          // Position on 1280×720 canvas
  width: 400, height: 40,  // Dimensions
  style: {                  // Visual customization only
    trackColor: "#333",
    fillColor: "#4a9eff",
    thumbColor: "#fff",
    labelColor: "#e0e0e0",
    fontSize: 16,
    fontFamily: "'Noto Sans SC', sans-serif"
  }
}

// Toggle component example
{
  id: "fullscreen-toggle",
  type: "toggle",
  configKey: "fullscreen",
  label: "全屏模式",
  x: 200, y: 400,
  width: 60, height: 30,
  style: {
    onColor: "#4a9eff",
    offColor: "#555",
    labelColor: "#e0e0e0",
    fontSize: 16
  }
}

// Static label example
{
  id: "settings-title",
  type: "label",
  text: "设 定",
  x: 640, y: 50,
  anchor: "center",
  style: {
    color: "#ffffff",
    fontSize: 32,
    fontFamily: "'Noto Serif SC', serif",
    textShadow: "0 2px 8px rgba(0,0,0,0.5)"
  }
}

// Close button example
{
  id: "close-btn",
  type: "button",
  action: "close",           // Engine-handled: close settings screen
  text: "返回",
  x: 640, y: 650,
  width: 160, height: 44,
  anchor: "center",
  style: {
    color: "#ccc",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 16,
    hoverColor: "#fff"
  }
}
```

**Confidence: HIGH** — This mirrors the `ui.titleScreen.elements[]` pattern exactly (see `script-format.md` lines 259-321) with the addition of `configKey` for interactive components.

---

## What NOT to Use (and Why)

### External Drag-and-Drop Libraries

| Library | Why Not |
|---------|---------|
| `vuedraggable` / `sortablejs` | Designed for **list reordering**, not **free-form canvas positioning**. The existing `DraggableElement.vue` does exactly what's needed: absolute positioning with mouse delta / canvas-scale correction. Adding vuedraggable would fight the coordinate system. |
| `@dnd-kit/core` (Vue port) | Over-engineered for this use case. DraggableElement is 131 lines and handles drag + resize. dnd-kit adds a sensor system, collision detection, and accessibility layers that aren't needed for a visual design canvas. |
| `interact.js` | 15KB+ for touch/gesture support we don't need in an Electron desktop app. Mouse-only drag is already implemented. |

**Confidence: HIGH** — DraggableElement.vue is verified working with the exact canvas-scale-aware math needed.

### UI Component Libraries

| Library | Why Not |
|---------|---------|
| Element Plus / Naive UI / Vuetify | The project has **zero UI library dependencies** by design. Every editor component is custom CSS. Adding a component library for a property panel would create a visual mismatch with the existing dark theme and add 200KB+ to the bundle. |
| Headless UI (@headlessui/vue) | Closer to the project's philosophy (unstyled), but still unnecessary. The property panel only needs basic inputs: `<input type="color">`, `<input type="range">`, `<input type="number">`, `<select>`. Native HTML elements + custom CSS match the existing pattern. |

**Confidence: HIGH** — Verified: `package.json` has zero utility/UI dependencies. This is intentional.

### Color Picker Libraries

| Library | Why Not |
|---------|---------|
| `vue-color` / `@simonwep/pickr` | `<input type="color">` is a native HTML element that works perfectly in Electron (Chromium). It provides a full color picker with hex/rgb input. For the few color properties (track color, fill color, label color), native is sufficient and adds zero bytes. |

**Confidence: HIGH** — Chromium's native color picker is feature-complete.

### State Management Alternatives

| Library | Why Not |
|---------|---------|
| Separate Pinia store for settings layout | Over-architected. Settings layout data lives naturally under `script.data.ui.settingsPage` — the existing deep watcher on `script.data` handles auto-save, and `pushState()` handles undo/redo automatically. A separate store would duplicate concerns. |
| Vuex | Project uses Pinia v3. Vuex is legacy. |

**Confidence: HIGH** — The `useScriptStore` undo/redo system uses JSON snapshots of the entire `script.data` tree. Any change to `script.data.ui.settingsPage` is automatically captured.

---

## New Code to Write (Not Install)

These are **new Vue components and JS modules** to author, not libraries to install:

### Editor Side (Vue 3)

| New Component/Module | Purpose | Lines (est.) |
|---------------------|---------|-------------|
| `SettingsDesigner.vue` (rewrite) | Main view: canvas + palette sidebar + property panel | ~300 |
| `SettingsCanvas.vue` | 1280×720 artboard with DraggableElement wrappers for each settings component | ~200 |
| `SettingsComponentPalette.vue` | Left sidebar with draggable pre-made component types (slider, toggle, label, button) | ~80 |
| `SettingsPropertyPanel.vue` | Right sidebar with style editors (color, font, size) for selected component | ~200 |
| `SettingsPreviewSlider.vue` | Static visual preview of a slider component on the canvas (non-interactive in editor) | ~60 |
| `SettingsPreviewToggle.vue` | Static visual preview of a toggle on the canvas | ~40 |
| `SettingsPreviewLabel.vue` | Static visual preview of a label | ~30 |
| `SettingsPreviewButton.vue` | Static visual preview of a button | ~40 |

### Runtime Side (Vanilla JS)

| Changed Module | What Changes | Lines (est.) |
|---------------|--------------|-------------|
| `SettingsScreen.js` (refactor) | Add `setLayout()`, `_renderCustom()`, `_renderDefault()` pattern from TitleScreen.js. Create DOM elements for each component type with positioning from layout data. | +150 |
| `ConfigManager.js` (extend) | Add `fullscreen`, `skipRead`, `dialogueAlpha` to `defaults` | +5 |
| `main.js` (wire) | Pass `script.ui.settingsPage` to `settingsScreen.setLayout()` at init, similar to titleScreen (line 425-427) | +3 |

### Data Format

| File | Change |
|------|--------|
| `docs/script-format.md` | Add `ui.settingsPage` specification section, mirroring `ui.titleScreen` |

---

## Installation

```bash
# No new packages to install.
# The existing stack is sufficient:
#   vue ^3.5.31
#   pinia ^3.0.4
#   electron ^41.0.4
#   vite ^6.3.0
```

---

## Key Implementation Patterns

### Pattern 1: Canvas Scaling (Reuse from CanvasPreview.vue)

The editor canvas is a 1280×720 `<div>` that scales to fit the available space using CSS `transform: scale()`. `DraggableElement.vue` divides mouse deltas by `canvasScale` to convert screen pixels to game coordinates. **This is already working** — the settings canvas must use the exact same approach.

```javascript
// From CanvasPreview.vue — reuse this pattern
const artboardStyle = computed(() => ({
  width: GAME_W + 'px',
  height: GAME_H + 'px',
  transform: `scale(${canvasScale.value})`,
  transformOrigin: 'top left',
}));
```

### Pattern 2: Component Palette → Canvas (New, but follows AssetPanel drag pattern)

The component palette is a sidebar listing available component types. User clicks a type → a new element is added to `script.data.ui.settingsPage.elements[]` with default position/style → it immediately appears on the canvas as a `DraggableElement`. This is a **click-to-add** interaction, not drag-from-palette, matching the simplicity of the existing editor.

```javascript
// Add component to canvas
function addComponent(type, configKey, label) {
  const elements = script.data.ui.settingsPage.elements;
  elements.push({
    id: `${type}-${Date.now()}`,
    type,
    configKey,
    label,
    x: 440, y: 300,  // Center of canvas
    width: type === 'slider' ? 400 : type === 'toggle' ? 60 : 200,
    height: type === 'slider' ? 40 : type === 'toggle' ? 30 : 44,
    style: { ...DEFAULT_STYLES[type] }
  });
  script.pushState(); // Undo checkpoint
}
```

### Pattern 3: Runtime Custom Layout (Mirror TitleScreen.js)

```javascript
// In SettingsScreen.js — same pattern as TitleScreen.js lines 38-43
show() {
  if (this.layout && this.layout.elements) {
    this._renderCustom();
  } else {
    this._renderDefault();  // Current hardcoded layout becomes the fallback
  }
  this.el.classList.remove('hidden');
}
```

### Pattern 4: Property Panel Native Inputs

Style editing uses native HTML inputs with Vue `v-model` bindings. No external component library needed.

```vue
<!-- Color input for track color -->
<label>轨道颜色</label>
<input type="color" v-model="selected.style.trackColor" />

<!-- Number input for font size -->
<label>字号</label>
<input type="number" v-model.number="selected.style.fontSize" min="8" max="72" />

<!-- Select for font family -->
<label>字体</label>
<select v-model="selected.style.fontFamily">
  <option value="'Noto Sans SC', sans-serif">Noto Sans SC</option>
  <option value="'Noto Serif SC', serif">Noto Serif SC</option>
</select>
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Settings component preview fidelity — editor preview may not match runtime exactly | Medium | Use the same CSS styling logic in both Vue preview components and SettingsScreen.js. Extract shared style constants into a common module (e.g., `src/shared/settingsDefaults.js`) |
| New ConfigManager keys (fullscreen, skipRead, dialogueAlpha) require engine wiring | Low | Fullscreen → `document.documentElement.requestFullscreen()`. SkipRead → engine `skipMode` check. DialogueAlpha → `DialogueBox` opacity style. All straightforward DOM operations. |
| Undo/redo performance with many settings components | Low | The existing JSON snapshot approach handles 50 history entries. Settings pages will have 7-15 components max. No issue. |

---

## Sources

All findings are based on **direct source code analysis** of the project repository:

- `src/editor/components/canvas/DraggableElement.vue` — Existing drag/resize infrastructure
- `src/editor/components/canvas/CanvasPreview.vue` — Canvas scaling pattern
- `src/ui/TitleScreen.js` — Custom layout rendering pattern (the reference implementation)
- `src/ui/SettingsScreen.js` — Current hardcoded settings UI (to be refactored)
- `src/engine/ConfigManager.js` — Config persistence (to be extended)
- `src/editor/stores/script.js` — Undo/redo system
- `src/ui/sanitize.js` — CSS sanitization
- `docs/script-format.md` — Data format specification
- `package.json` — Verified zero external utility/UI dependencies

**No external research needed** — this is an internal architecture extension, not a technology selection problem. Every pattern already exists in the codebase; the settings designer composes them.

---

*Stack research: 2025-07-17*
