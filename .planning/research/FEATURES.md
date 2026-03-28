# Feature Landscape: Galgame Settings Page Designer

**Domain:** Visual novel / galgame settings page — both the designer (editor experience) and the runtime (player experience)
**Researched:** 2025-07-17
**Overall confidence:** HIGH (based on extensive VN/galgame engine analysis + codebase audit)

## Context

The Galgame Maker already has a working runtime `SettingsScreen.js` with 4 hardcoded controls (BGM volume, SE volume, text speed, auto wait). The milestone goal is to:
1. Build a visual **Settings Page Designer** in the editor (like the existing canvas/drag-drop pattern)
2. Expand to **7 pre-made settings components** (adding: fullscreen toggle, skip-read toggle, dialog box transparency)
3. Engine renders the custom layout at runtime — creator defines appearance, engine handles all logic

The `TitleScreen.js` already demonstrates the pattern: `layout.elements[]` array in `script.json` → engine reads config → renders custom or falls back to default.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

### A. Settings Components (Player-Facing Controls)

These are the functional widgets game creators place on their settings page. Every VN engine ships these.

| # | Component | Why Expected | Complexity | Notes |
|---|-----------|--------------|------------|-------|
| A1 | **BGM Volume Slider** | Universal in every galgame/VN. Players always expect to control music volume | Low | Already in `ConfigManager` + `SettingsScreen.js`. Needs designer integration |
| A2 | **SE Volume Slider** | Universal. Sound effects volume is always separate from BGM | Low | Already in `ConfigManager`. Same slider widget, different config key |
| A3 | **Text Speed Slider** | Universal. Typewriter speed is a core galgame affordance (1=slow, 10=fast) | Low | Already implemented with speed↔ms conversion. Map slider range in designer |
| A4 | **Auto-Play Speed Slider** | Expected in any game with Auto mode. Controls wait time (500ms–5000ms) | Low | Already in `ConfigManager`. Straightforward slider |
| A5 | **Fullscreen Toggle** | Very common. Players expect display mode control — especially on desktop (Electron) | Med | Not yet in `ConfigManager`. Needs `BrowserWindow.setFullScreen()` IPC call. New toggle widget type |
| A6 | **Dialog Box Transparency Slider** | Common in galgames. Players want to see CG/backgrounds behind text box | Med | Not yet in `ConfigManager`. Engine must apply opacity to `DialogueBox` background dynamically |
| A7 | **Skip-Read-Only Toggle** | Standard in story-driven VNs. Toggle between "skip all text" vs "skip only previously read text" | Med | Not yet in `ConfigManager`. Engine needs read-history tracking to respect this flag. Complex but scoped |

### B. Designer Features (Editor/Creator Experience)

These are what the game creator needs in the editor to build a custom settings page.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| B1 | **1280×720 Canvas Artboard** | Consistent with Scenes canvas and title page. Creators expect WYSIWYG at game resolution | Low | Reuse `CanvasPreview.vue` pattern — `artboardStyle` with `canvasScale` responsive scaling |
| B2 | **Component Palette Sidebar** | Creators need to see available widgets and drag/add them to canvas. This IS the core interaction | Med | New sidebar listing all 7 components (A1–A7) + decorative elements. Follow `AssetPanel.vue` 140px pattern |
| B3 | **Drag-and-Drop Positioning** | Core value prop of the maker. "PPT-style" placement is the entire UX promise | Low | Reuse `DraggableElement.vue` directly — proven, handles `canvasScale` compensation |
| B4 | **Property Panel for Selected Component** | After placing a widget, creators must be able to style it (colors, font, size) | Med | Right sidebar panel. Shows contextual properties when a component is selected on canvas |
| B5 | **Background Image Setting** | Settings pages in commercial galgames always have themed backgrounds | Low | Single image picker, stored in `ui.settingsScreen.background`. Same pattern as `TitleScreen._renderCustom()` |
| B6 | **"Return/Close" Button Component** | Every settings page needs a way back. This is a navigation must-have | Low | Pre-made button component with fixed `action: 'close'`. Stylable like title screen buttons |
| B7 | **Default Fallback** | If creator doesn't design a settings page, engine must still render a functional one | Low | Already exists: current `SettingsScreen._render()` is the default. Just add conditional like `TitleScreen.show()` |
| B8 | **Label/Title Text Elements** | Creators need section headers ("音频设置", "显示设置") and custom labels | Low | Reuse `_createTextElement` pattern from `TitleScreen.js`. Draggable text with font/color/size props |

### C. Data & Integration

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| C1 | **`ui.settingsScreen` in script.json** | Data must persist. Follows established `ui.titleScreen` pattern | Low | `{ background, elements: [{ type, componentType, x, y, style, ... }] }` |
| C2 | **Auto-save Integration** | Existing 2s debounce auto-save must cover settings layout changes | Low | Already works via `script.data` deep watcher in `App.vue`. No extra work if data is in `script.data.ui` |
| C3 | **Undo/Redo Support** | Creators expect Ctrl+Z/Y for layout changes. Already works for scene edits | Low | Automatic — `pushState()` is triggered by `script.data` watcher. Settings data changes trigger it |
| C4 | **Sanitization of User Styles** | CSS injection prevention for all style values (colors, fonts, shadows) | Low | `sanitize.js` already provides `sanitizeCssValue()` and `clampField()`. Apply to all settings element configs |

---

## Differentiators

Features that set this product apart from other VN makers. Not expected, but valued.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D1 | **Live Interactive Preview** | Sliders/toggles respond to interaction right in the editor canvas — creators see exactly what players see | High | Most VN makers require "build & run" to test settings. Interactive preview is a killer DX feature. Needs functional mini-widgets in Vue |
| D2 | **Style Presets / Themes** | One-click "Dark Glass", "Light Paper", "Minimal" themes for settings components | Med | Pre-built style bundles (colors, border-radius, opacity). Applied to all components at once. Saves creators hours of styling |
| D3 | **Component Grouping / Sections** | Drag a "Section Container" that visually groups related settings (e.g., "Audio" section with a header + 2 sliders) | High | Adds hierarchy to the flat element list. Requires parent-child drag behavior and container rendering |
| D4 | **Decorative Image Elements** | Place custom images (dividers, ornaments, character art) on the settings page | Low | Reuse asset drag-drop from scene canvas. Just an `<img>` element with position + size. Very cheap |
| D5 | **Snap-to-Grid / Alignment Guides** | Smart alignment lines appear when dragging components near each other (Figma-style) | High | Nice DX but complex. Not in current `DraggableElement.vue`. Would benefit title designer too |
| D6 | **Voice Volume Slider Component** | Extra audio channel for character voices — common in voiced commercial galgames | Med | Not in current engine. Requires `AudioManager` voice channel + `ConfigManager` key. Only valuable if voice system is added later |
| D7 | **Per-Component Hover/Active States** | Configure what sliders/toggles look like on hover and when active/dragging | Med | Beyond static styling. Needs hover color, active color, thumb highlight. Matches `TitleScreen` button hover pattern |
| D8 | **Master Volume Slider Component** | A single slider that scales all audio proportionally | Low | Computed value = multiplier applied to BGM/SE/Voice. Simple `ConfigManager` addition. Some galgames have this |

---

## Anti-Features

Features to explicitly NOT build. These are traps that waste effort or violate the project's core philosophy.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| X1 | **Resolution/Window Size Selector** | Game is fixed at 1280×720. Offering resolution options creates rendering bugs and testing surface. Fullscreen toggle is sufficient | Only offer fullscreen toggle (A5). Resolution is an engine constant |
| X2 | **Per-Character Voice Volume** | No voice system exists in the engine. Building UI for non-existent functionality confuses creators | Defer until voice playback is implemented. Add as future component when AudioManager supports voices |
| X3 | **Language Selector** | App is Chinese-only with hardcoded strings, no i18n framework. A language toggle would be a lie | If i18n is ever added, this becomes a settings component. Not before |
| X4 | **Custom Logic / Scripted Settings** | Violates core philosophy: "开发者不碰逻辑". If creators can attach scripts to settings, the no-code promise breaks | All component logic is engine-built-in. Creators control appearance only |
| X5 | **Accessibility Settings (Font Size, High Contrast, Screen Reader)** | Premature optimization. No a11y infrastructure exists. Half-baked a11y is worse than none | Acknowledge as future milestone. Don't promise what can't be delivered now |
| X6 | **Settings Page Transitions/Animations Editor** | Animating settings page open/close/element entrance is scope creep. The current `classList.add('visible')` CSS transition is sufficient | Use simple CSS fade-in/out. Don't build a timeline animator for settings pages |
| X7 | **Keyboard Shortcut Remapping** | Very few VN/galgame engines expose this. The engine has hardcoded shortcuts (A=Auto, S=Skip, ESC=Menu). Remapping creates conflict surfaces | Keep hardcoded shortcuts. Document them in-game if needed |
| X8 | **Settings Profiles / Presets for Players** | Feature where players save/load multiple settings configurations. Over-engineering for a VN — players set once and forget | Single settings config per game via `ConfigManager.save()` to localStorage |

---

## Feature Dependencies

```
Core Infrastructure (must be first):
  C1 (script.json data format) ──→ everything else depends on this
  B7 (default fallback)        ──→ engine must always render something

Canvas/Designer (editor side):
  B1 (canvas artboard) ──→ B3 (drag-and-drop) ──→ B2 (component palette)
                                                ──→ B4 (property panel)
                                                ──→ B8 (label text elements)

Component Widgets:
  A1-A4 (existing config keys) ──→ A5 (fullscreen needs new IPC)
                                ──→ A6 (transparency needs DialogueBox change)
                                ──→ A7 (skip-read needs read-history tracking)

Differentiators (independent, after core):
  D1 (live preview)     requires B1 + A1-A7
  D2 (style presets)    requires B4 (property panel)
  D4 (decorative images) requires B3 (drag-and-drop) only
  D8 (master volume)    requires A1 + A2 (volume sliders exist)
```

Visualized critical path:
```
C1 → B1 → B3 → B2 → [A1..A4] → [A5, A6, A7] → B4 → B6 → B5
                                                       ↓
                                                   D1, D2 (optional)
```

---

## MVP Recommendation

### Must Ship (Phase 1 — Core Designer)

Prioritize in this order:

1. **C1** — Define `ui.settingsScreen` data format in `script.json` (foundation)
2. **B1 + B3** — Canvas artboard + drag-and-drop (reuse existing components)
3. **B2** — Component palette sidebar with all 7 widgets
4. **A1–A4** — Integrate existing 4 settings as draggable components
5. **A5** — Fullscreen toggle (new ConfigManager key + Electron IPC)
6. **A6** — Dialog box transparency (new ConfigManager key + runtime opacity)
7. **A7** — Skip-read-only toggle (new ConfigManager key + read-tracking flag)
8. **B6** — Return/Close button component
9. **B8** — Label/text elements for section headers
10. **B4** — Property panel (position, color, font, size for selected component)
11. **B5** — Background image picker
12. **B7** — Default fallback (conditional rendering in runtime `SettingsScreen`)
13. **C4** — Sanitization (apply existing `sanitize.js` to all settings element configs)

### Defer to Later

- **D1** (Live Interactive Preview): HIGH value but HIGH complexity. Ship with static preview first; add interactivity as a fast-follow
- **D2** (Style Presets): Nice DX but not blocking. Can ship post-launch as a toolbar button
- **D3** (Component Grouping): Adds complexity to data model and rendering. Flat element list is sufficient for 7-10 elements
- **D5** (Snap-to-Grid): Benefits all designers but is a cross-cutting enhancement, not settings-specific
- **D6** (Voice Volume): No voice system exists. Blocked by engine feature
- **D8** (Master Volume): Low complexity, could ship in MVP if time allows, but not blocking

---

## Component Specification Reference

For each of the 7 pre-made components, here is what the engine must handle and what the designer must expose:

### Slider Components (A1, A2, A3, A4, A6)

**Engine logic (built-in):** Read `ConfigManager` value → render `<input type="range">` → on input, write `ConfigManager` value → call `onChange` callback
**Designer exposes:** x, y, width, label text, label color, label font, label fontSize, slider track color, slider thumb color, slider track height, value display format (%, number, seconds), min/max/step

### Toggle Components (A5, A7)

**Engine logic (built-in):** Read `ConfigManager` boolean → render toggle switch → on click, flip value → call `onChange`
**Designer exposes:** x, y, width, label text, label color, label font, label fontSize, toggle on-color, toggle off-color, toggle size

### Button Component (B6 — Return/Close)

**Engine logic (built-in):** On click, hide settings screen (call `this.hide()`)
**Designer exposes:** x, y, width, height, text, color, backgroundColor, fontSize, fontFamily, borderRadius, border, hoverColor

### Text/Label Component (B8)

**Engine logic:** None (purely decorative)
**Designer exposes:** x, y, content text, color, fontSize, fontFamily, letterSpacing, textShadow

---

## Competitive Landscape

| Engine/Maker | Settings Customization | Our Approach |
|---|---|---|
| **RenPy** | Full code customization via screen language. Extremely flexible but requires Python-like scripting | **No code.** Drag-and-drop visual designer. Simpler but more accessible |
| **TyranoBuilder** | Pre-built settings UI, limited style customization (color themes) | **Per-component styling.** More granular control without code |
| **Kirikiri/KAG** | Build from scratch in KAG script. Maximum flexibility, maximum effort | **Pre-made components.** Zero effort for logic, focus on appearance |
| **Naninovel (Unity)** | Unity UI system. Full control but requires Unity knowledge | **Self-contained.** No external tool knowledge needed |

**Our edge:** The only no-code VN maker where settings page design is a first-class visual experience — not a code exercise or an afterthought.

---

## Sources

- **Codebase audit:** `src/ui/SettingsScreen.js`, `src/engine/ConfigManager.js`, `src/ui/TitleScreen.js`, `src/editor/components/canvas/CanvasPreview.vue`, `src/editor/components/canvas/DraggableElement.vue` — HIGH confidence
- **PROJECT.md milestone definition:** 7 pre-made components listed explicitly — HIGH confidence
- **VN engine domain knowledge:** RenPy, Kirikiri, TyranoBuilder, Naninovel patterns — MEDIUM confidence (training data, not live-verified, but well-established domain)
- **Galgame player expectations:** Based on widespread VN conventions (volume sliders, text speed, fullscreen toggle are universal) — HIGH confidence
