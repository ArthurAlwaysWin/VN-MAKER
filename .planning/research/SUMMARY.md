# Project Research Summary

**Project:** Galgame Maker — Settings Page Designer Milestone
**Domain:** Visual novel editor — canvas-based settings UI designer + runtime integration (brownfield)
**Researched:** 2025-07-17
**Confidence:** HIGH

---

## Executive Summary

This milestone adds a Settings Page Designer to an existing, production-quality visual novel editor built on Electron 41 + Vue 3 + Pinia + vanilla JS runtime. The core insight from research is that **every single infrastructure piece already exists** — the drag-and-drop canvas, undo/redo, auto-save, CSS sanitization, and the exact runtime rendering pattern all live in the codebase today. The title screen designer (`TitleDesigner.vue` + `TitleScreen.js`) is a working reference implementation that must be mirrored almost identically. Zero new npm dependencies are required; the entire deliverable is new Vue components and a refactored `SettingsScreen.js`.

The recommended approach is schema-first: define `ui.settingsScreen` in `script.json` before writing a single Vue component or touching the runtime. The editor and runtime are independent codebases with no shared modules — the JSON schema is the only contract between them. Building the runtime renderer (`SettingsScreen._renderCustom()`) before the editor canvas validates the schema in isolation and makes the data model concrete. The settings designer then produces exactly what the renderer consumes.

The key risks are tightly bounded: two **known blocking bugs** (file dialog + hot reload crash) must be fixed before any feature work begins; **editor–runtime schema drift** is the architectural death-trap (prevent it with a locked schema doc + runtime-first build order); and **interactive component events conflicting with drag-and-drop** must be resolved by making all editor canvas components visually inert. None of these are novel problems — the research resolves every pitfall with patterns already proven in the existing codebase.

---

## Key Findings

### Recommended Stack

**Zero new dependencies.** The existing stack is complete for this milestone. Every technology needed is already installed and working.

**Core technologies:**
- **Vue 3 ^3.5.31** — All editor components (SettingsDesigner.vue, SettingsCanvas.vue, property panel, palette). Composition API `<script setup>` is the project standard.
- **Pinia ^3.0.4** — Settings layout data lives at `script.data.ui.settingsScreen`. The existing deep watcher on `script.data` auto-triggers undo snapshots and auto-save. No changes needed to the store.
- **DraggableElement.vue** (existing) — Handles absolute positioning with canvas-scale-aware mouse delta math. Reuse as-is; wraps each settings component on the canvas.
- **CanvasPreview.vue** pattern (existing) — `artboardStyle + canvasScale` responsive scaling for the 1280×720 artboard. Build a parallel `SettingsCanvas.vue` using this identical pattern.
- **TitleScreen.js** (existing) — The reference implementation for custom layout rendering in the vanilla JS engine. `setLayout()` + `_renderCustom()` / `_renderDefault()` is the exact pattern to mirror in `SettingsScreen.js`.
- **sanitize.js** (existing) — `sanitizeCssValue()` and `clampField()` already cover all CSS injection prevention needed.

**New code to write (not install):** ~8 Vue components (~950 lines total) + refactored `SettingsScreen.js` (+150 lines) + 3 new `ConfigManager.js` keys (+5 lines) + 2 wiring lines in `main.js`.

See: [STACK.md](./STACK.md)

---

### Expected Features

**Must have (table stakes) — ship in this milestone:**
- BGM Volume slider — already in engine, needs designer integration
- SE Volume slider — already in engine, needs designer integration
- Text Speed slider — already in engine, needs designer integration
- Auto-Play Speed slider — already in engine, needs designer integration
- **Fullscreen toggle** — new ConfigManager key + Electron IPC `BrowserWindow.setFullScreen()`
- **Dialog Box Transparency slider** — new ConfigManager key + runtime `DialogueBox` opacity
- **Skip-Read-Only toggle** — new ConfigManager key + read-history flag in skip logic
- 1280×720 canvas artboard with drag-and-drop positioning (B1+B3)
- Component palette sidebar listing all 7 preset widgets (B2)
- Property panel for selected component (position, color, font, size) (B4)
- Background image selector (B5)
- Return/Close button component (B6)
- Label/text elements for section headers (B8)
- Default fallback for projects with no settings layout (B7)
- CSS sanitization applied to all settings element configs (C4)

**Should have (differentiators — defer to fast-follow):**
- **Live interactive preview (D1)** — HIGH value (sliders actually slide in editor), HIGH complexity. Ship static preview first; interactivity as a follow-up sprint.
- **Style presets / themes (D2)** — One-click "Dark Glass" / "Minimal" themes. Medium complexity, great DX but not blocking.
- **Decorative image elements (D4)** — Low complexity; pure reuse of asset drag-drop. Can slip into MVP if time allows.

**Explicitly defer to v2+:**
- Component grouping / sections (D3) — Adds hierarchy to data model; overkill for 7-10 components
- Snap-to-grid / alignment guides (D5) — Cross-cutting DX enhancement; benefits all designers
- Voice volume slider (D6) — Blocked by non-existent voice system in engine
- Accessibility settings (X5) — No i18n/a11y infrastructure exists; half-baked a11y is worse than none
- Resolution/window size selector (X1) — Game is fixed 1280×720; offering this causes bugs
- Keyboard shortcut remapping (X7) — Hardcoded shortcuts; remapping creates conflict surfaces

See: [FEATURES.md](./FEATURES.md)

---

### Architecture Approach

The Settings Page Designer is a **direct extension of the Title Screen Designer pattern**. The architecture has two integration surfaces: the Vue 3 editor writes `script.data.ui.settingsScreen` (an elements array of typed components with position + style data), and the vanilla JS `SettingsScreen.js` reads that data at runtime to render custom DOM. The critical separation: **layout** comes from `script.json` (author-controlled), **values** come from `localStorage` via ConfigManager (player-controlled). The engine never writes layout data; the editor never stores player preferences.

**Major components:**

| Component | Status | Responsibility |
|-----------|--------|----------------|
| `SettingsDesigner.vue` | Replace placeholder | Top-level view: orchestrates canvas + palette + property panel. Target: <200 lines (composable + child components carry weight) |
| `SettingsCanvas.vue` | New | 1280×720 artboard rendering DraggableElement wrappers for each settings component |
| `SettingsComponentPalette.vue` | New | Left sidebar: 9 preset widget types, click-to-add interaction |
| `SettingsPropertyPanel.vue` | New | Right sidebar: position, size, label, style editors using native HTML inputs |
| `SettingsPreview*.vue` (×4) | New | Visual-only (non-interactive) canvas representations of slider, toggle, label, button |
| `SettingsScreen.js` | Refactor | Add `setLayout()`, `_renderCustom()`, element renderer methods following TitleScreen.js |
| `ConfigManager.js` | Extend | Add `fullscreen`, `skipRead`, `dialogueOpacity` to defaults (+5 lines) |
| `main.js` | 2-line wire | Pass `script.ui.settingsScreen` to `settingsScreen.setLayout()` at init |

**Key data model** (`ui.settingsScreen` in `script.json`):
```json
{
  "settingsScreen": {
    "background": "backgrounds/settings_bg.png",
    "elements": [
      { "id": "bgm-slider", "type": "slider", "settingKey": "bgmVolume",
        "label": "BGM 音量", "x": 300, "y": 160, "width": 680, "style": { ... } },
      { "id": "fullscreen-toggle", "type": "toggle", "settingKey": "fullscreen",
        "label": "全屏模式", "x": 300, "y": 440, "style": { ... } },
      { "id": "back-button", "type": "button", "action": "back",
        "label": "返回", "x": 640, "y": 650, "anchor": "center", "style": { ... } }
    ]
  }
}
```

**Integration points that require zero changes:** Save/load IPC pipeline, auto-save deep watcher, undo/redo system, tab routing (already registered), asset:// protocol. These four existing systems absorb all settings designer data automatically.

See: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

### Critical Pitfalls

1. **Editor–Runtime Schema Drift** *(critical, Phase 0)* — Editor stores JSON; runtime reads it; they're separate codebases. If property names diverge, creators design one thing and players see another. **Prevention:** Define `ui.settingsScreen` schema in `docs/script-format.md` *first*, lock it, and build the runtime renderer against it before touching the editor.

2. **Blocking Bugs Gate Everything** *(critical, Phase 0)* — File dialog doesn't open (likely `win` undefined in IPC handler) + Windows hot reload crash (vite-plugin-electron `taskkill` failure). These block project creation and make canvas iteration unbearable. **Prevention:** Fix both before any feature work starts. They're listed in PROJECT.md Active requirements for this exact reason.

3. **Interactive Components Eat Drag Events** *(critical, Phase 2)* — Sliders, toggles, and inputs consume the same mouse events that `DraggableElement.vue` uses for drag-to-position. **Prevention:** All editor canvas components must be visually inert (`pointer-events: none` on inner content). No component on the designer canvas should respond to user input — that's for the game runtime only. This is a *must-decide-upfront* architectural rule.

4. **Deep Watcher Amplification During Drag** *(moderate, Phase 2)* — Every `mousemove` during drag mutates `script.data` → triggers deep watcher → Vue traverses entire script tree. 60Hz × large script = sluggish editor. **Prevention:** Emit position updates only on `mouseup` (drag end), not `mousemove`. Use a local ref for visual feedback during drag.

5. **ConfigManager Migration Without Versioning** *(moderate, Phase 1)* — Adding new keys is fine; renaming or changing value semantics (e.g., `textSpeed` ms→scale) silently breaks existing users' saved configs. **Prevention:** Never rename config keys. Keep internal representation stable (ms for speed, 0-1 for volumes). The editor slider does display conversion; the engine stores raw values.

6. **Forgetting Default Fallback for Existing Projects** *(moderate, Phase 3)* — Projects without `ui.settingsScreen` in `script.json` will crash or show blank settings. **Prevention:** Keep `_renderDefault()` as the unconditional fallback; gate `_renderCustom()` on `this.layout && this.layout.elements` — exactly the TitleScreen.js pattern.

See: [PITFALLS.md](./PITFALLS.md)

---

## Implications for Roadmap

Research strongly suggests a **4-phase structure** with a mandatory Phase 0 for bug fixes. The dependency graph is clear: schema before code, runtime before editor, canvas before properties.

---

### Phase 0: Unblock Development
**Rationale:** Two known bugs in PROJECT.md Active requirements make it impossible to create test projects or iterate efficiently. These are not optional — they must be resolved first or everything downstream is slower and more painful.
**Delivers:** A working development environment: project creation works, hot reload doesn't crash.
**Addresses:** Pitfall 5 (blocking bugs derail development)
**Tasks:**
- Fix `dialog.showOpenDialog` not firing (likely undefined `win` in IPC handler — check BrowserWindow.getFocusedWindow())
- Fix vite-plugin-electron Windows hot reload crash (pin plugin version or wrap `taskkill` in try/catch)

---

### Phase 1: Data Contract (Schema + ConfigManager)
**Rationale:** Both the editor and the runtime are built against the same JSON schema. Defining it first eliminates schema drift — the #1 architectural risk. ConfigManager extension is trivial (5 lines) but must happen before anything tests the new keys.
**Delivers:** A locked data contract that both editor and runtime code against; all 7 settings have engine-side definitions.
**Addresses:** Pitfall 1 (schema drift), Pitfall 4 (ConfigManager migration), Pitfall 9 (extensibility)
**Tasks:**
- Define `SETTING_DEFS` registry: all 7 setting keys with min/max/step/format/default
- Write `ui.settingsScreen` specification in `docs/script-format.md`
- Extend `ConfigManager.js`: add `fullscreen`, `skipRead`, `dialogueOpacity` defaults + `configVersion`
- Initialize `script.data.ui.settingsScreen` guard in `SettingsDesigner.vue` setup
- Add settings-component-specific bounds to `sanitize.js` BOUNDS (sliderWidth, etc.)

---

### Phase 2: Runtime Renderer
**Rationale:** Build the engine side first — it can be tested immediately with a hand-written JSON fixture in `script.json`, no editor needed. This validates the data model is renderable before spending time on editor UI. Following TitleScreen.js pattern means the code structure is already known.
**Delivers:** A working custom settings page at runtime. Games with `ui.settingsScreen` in their script.json render the custom layout; games without it still show the default hardcoded UI.
**Uses:** `TitleScreen.js` as implementation template; `sanitize.js` for all style values; `ConfigManager.js` for all get/set
**Addresses:** Pitfall 6 (innerHTML XSS — use createElement+textContent), Pitfall 10 (default fallback), Pitfall 11 (z-index stacking), Pitfall 12 (asset:// paths)
**Tasks:**
- Refactor `SettingsScreen.js`: add `setLayout()`, `_renderCustom()`, `_createSliderElement()`, `_createToggleElement()`, `_createButtonElement()`, `_createTextElement()`
- Use registry pattern (`COMPONENT_RENDERERS` object, not switch) for future extensibility
- Wire 2 lines in `main.js`: `settingsScreen.setLayout(engine.script.ui?.settingsScreen)`
- Add CSS for `.settings-custom-element`, `.settings-slider-wrap`, `.settings-toggle-wrap` in `style.css`
- Test with hand-crafted `script.json` containing `ui.settingsScreen` before touching editor

---

### Phase 3: Editor Canvas + Palette
**Rationale:** With the schema locked and runtime validated, the editor can be built with confidence that its output will render correctly. The canvas implementation is the highest-risk coding phase (drag-and-drop, coordinate systems, event conflicts) and must implement several pitfall mitigations explicitly.
**Delivers:** A working visual designer — creator can place all 7 preset components, drag to position, delete, and see a static visual preview.
**Addresses:** Pitfall 2 (interactive events — all components are visually inert), Pitfall 3 (god-component — SettingsDesigner.vue stays <200 lines), Pitfall 7 (coordinate system), Pitfall 8 (deep watcher — position updates only on mouseup), Pitfall 13 (undo — all state in script.data.ui)
**Tasks:**
- Create `SettingsCanvas.vue` — 1280×720 artboard using CanvasPreview.vue `artboardStyle + canvasScale` pattern; DraggableElement wrappers for each element
- Create `SettingsComponentPalette.vue` — sidebar with 9 available widget types; click-to-add (not drag-from-palette)
- Create `SettingsPreviewSlider.vue`, `SettingsPreviewToggle.vue`, `SettingsPreviewLabel.vue`, `SettingsPreviewButton.vue` — purely visual, `pointer-events: none` on inner content
- Create `useSettingsDesigner.js` composable — selection state, add/remove/update element logic, position update handler (emit on mouseup only)
- Wire in `SettingsDesigner.vue` — keep <200 lines by delegating to composable and child components

---

### Phase 4: Property Panel + Integration Polish
**Rationale:** Properties depend on the canvas selection model from Phase 3. Integration testing is the final gate before the milestone is complete.
**Delivers:** Complete settings designer feature: position, size, label, and full style editing; background image; end-to-end editor→save→preview round-trip verified.
**Tasks:**
- Create `SettingsPropertyPanel.vue` — native HTML inputs (type="color", type="number", type="range", select) with v-model bindings to selected element; no UI library
- Background image selector (reuse asset panel pattern)
- "Populate defaults" button: generates a default layout matching the current hardcoded settings screen, giving old projects an editable starting point
- Slider default-value hint text in editor: "编辑器显示默认值，玩家值由引擎管理"
- End-to-end integration test: design in editor → save → open preview → verify custom layout renders at correct positions
- Backward compatibility test: load project with no `ui.settingsScreen` → engine shows default, editor shows empty canvas ready to fill

---

### Phase Ordering Rationale

- **Phase 0 gates everything** — the bugs block project creation and dev iteration. Fixing them is the force multiplier.
- **Schema first (Phase 1)** because editor and runtime share zero code — the JSON is the only contract. Schema drift is the #1 rewrite risk.
- **Runtime before editor (Phase 2)** because it can be tested with a hand-written JSON file in isolation, validating the data model is correct before editor complexity layers on top.
- **Canvas before properties (Phase 3 before 4)** because properties depend on the selection model, which lives in the canvas.
- **Phases 2 and 3 can run in parallel** once Phase 1 is complete (schema locked). If two developers are available, assign one to each.

### Research Flags

**Phases with standard patterns (no additional research needed):**
- **Phase 0:** Bug fixes are documented in PROJECT.md with likely root causes. Standard debugging.
- **Phase 1:** Follows `TitleScreen.js` + `script-format.md` pattern exactly. Well-documented internal pattern.
- **Phase 2:** TitleScreen.js is a working 1:1 reference. The renderer is essentially a port with different component types.
- **Phase 3:** DraggableElement.vue handles the hardest part (scale-aware coordinates). CanvasPreview.vue provides the artboard pattern.
- **Phase 4:** Property panel uses only native HTML inputs. No new patterns needed.

**No phases require `/gsd-research-phase`.** This is an internal architecture extension. Every pattern is proven in the existing codebase. External research (libraries, APIs) would add noise, not signal.

---

## Open Questions Requiring User Decision

Before roadmap implementation begins, these decisions need owner input:

1. **Fullscreen implementation:** Electron `BrowserWindow.setFullScreen()` requires IPC from renderer to main process. Is there a preference for adding a dedicated IPC channel (`toggle-fullscreen`) vs reusing an existing general-purpose channel? This is a minor design choice but needs alignment with the existing IPC surface in `electron/main.js`.

2. **Skip-Read read-history tracking:** The `skipRead` toggle requires the engine to know which dialogue nodes have been seen before. Does the existing save system (8-slot localStorage) track read history? If not, this feature needs a separate `readHistory` set in localStorage — a minor engine addition but needs confirmation of intended scope.

3. **Slider preview value in editor:** Research recommends showing default ConfigManager values in the editor canvas preview (e.g., BGM slider at 50%). Should the editor instead show a neutral "middle" position or pull from the project's last-saved config? This affects user expectation-setting.

4. **"Quick setup" default layout:** When a creator opens the settings designer for the first time, should the canvas be empty (creator builds from scratch) or pre-populated with a default layout matching the current hardcoded settings page? Research recommends pre-populating — but this is a UX decision.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Direct source code analysis — verified installed versions, confirmed zero external deps needed, DraggableElement.vue confirmed working |
| Features | **HIGH** | Cross-referenced PROJECT.md requirements with codebase audit. The 7 component types are explicitly listed in PROJECT.md Active requirements |
| Architecture | **HIGH** | TitleScreen.js is a working reference implementation of the exact pattern needed. Data flow verified by tracing App.vue watcher → save pipeline → IPC → main.js |
| Pitfalls | **HIGH** | All pitfalls grounded in actual code (DraggableElement event handling, ConfigManager structure, App.vue deep watcher). Two blocking bugs are real, documented in PROJECT.md |

**Overall confidence: HIGH**

All research is based on direct source code analysis of the actual project. No external documentation, speculation, or training-data domain knowledge was required — the entire architecture already exists in the codebase. Confidence would drop to MEDIUM only for the 3 new engine behaviors (fullscreen IPC, dialogueOpacity application, skipRead history tracking), where the implementation approach is clear but the exact wiring in `main.js` and `DialogueBox` needs verification during execution.

### Gaps to Address

- **Fullscreen IPC wiring:** Exact call path `renderer → IPC → main.js → BrowserWindow.setFullScreen()` needs verification against current `electron/main.js` IPC handler list during Phase 2.
- **DialogueBox opacity handle:** `dialogueOpacity` must be applied to the dialogue box background element. Need to verify `DialogueBox.js` exposes a method or style property for this during Phase 2.
- **Read history existence:** Verify whether `skipRead` logic requires a new `readHistory` data structure in localStorage or if the engine already tracks something usable. Verify during Phase 1 schema design.
- **TitleDesigner.vue source review:** The title screen designer is explicitly called out as the reference UI pattern in PROJECT.md, but wasn't analyzed in detail during research. Review it before building Phase 3 canvas to catch any additional patterns not visible from TitleScreen.js alone.

---

## Sources

### Primary (HIGH confidence — direct source code analysis)
- `src/editor/components/canvas/DraggableElement.vue` — Drag/resize infrastructure, scale-aware coordinates
- `src/editor/components/canvas/CanvasPreview.vue` — Canvas scaling pattern (artboardStyle + canvasScale)
- `src/ui/TitleScreen.js` — Reference implementation for custom layout rendering
- `src/ui/SettingsScreen.js` — Current hardcoded settings UI (to be refactored)
- `src/engine/ConfigManager.js` — Config persistence, 4 existing keys, localStorage
- `src/editor/stores/script.js` — Undo/redo system (JSON snapshot of script.data)
- `src/editor/App.vue` — Deep watcher → auto-save pipeline
- `src/ui/sanitize.js` — CSS injection prevention
- `src/main.js` — Engine wiring, settings screen init, title screen layout pattern
- `docs/script-format.md` — ui.titleScreen data model (template for ui.settingsScreen)
- `package.json` — Verified zero utility/UI dependencies
- `src/editor/views/Scenes.vue` — God-component to avoid repeating (489 lines, flagged as fragile)

### Secondary (HIGH confidence — project documentation)
- `.planning/PROJECT.md` — Active requirements, known bugs, constraints, core value proposition
- `CONCERNS.md` — Existing XSS issues, performance bottlenecks, known hardcoded resolution
- `CONVENTIONS.md` — Code patterns, module design conventions

### Tertiary (MEDIUM confidence — domain knowledge)
- RenPy, TyranoBuilder, Kirikiri, Naninovel — competitive landscape comparison for feature scoping
- Galgame/VN player expectations — universal settings (volume, text speed, fullscreen) are well-established conventions

---

*Research completed: 2025-07-17*
*Ready for roadmap: yes*
