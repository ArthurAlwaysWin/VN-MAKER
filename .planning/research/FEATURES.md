# Feature Research — v0.6: 主题包系统 (Theme Pack System)

**Domain:** Visual novel / Galgame engine — theme & skin customization
**Researched:** 2026-04-05
**Overall confidence:** HIGH (well-established domain — theming in VN engines is a solved problem with clear patterns across Ren'Py, RPG Maker, TyranoScript, Unity UI, and commercial galgames)
**Supersedes:** v0.5 feature research (game UI — all delivered)

---

## Domain Analysis: How VN/Game Engine Theme Systems Work

### The 80/20 Rule of Visual Novel Theming

Studying how commercial galgames (KEY, TYPE-MOON, Nitro+, Frontwing, SAGA PLANETS) differentiate their UI reveals a consistent pattern:

- **80% of visual identity** comes from: dialogue box frame image + accent color + font choice
- **15% more** comes from: panel/window backgrounds + button images
- **5% remaining** is: animations, particle effects, layout changes

This means the theme system's priority must be: **tokens first, images second, presets third**.

### "All Games Look The Same" vs "Unique Identity"

**Why games look identical (the problem this milestone solves):**
1. Default dialogue box = semi-transparent dark gradient (currently hardcoded in style.css at line 183-188)
2. All buttons share identical border + text pattern with same purple accent `rgba(180, 160, 255, *)`
3. Same Noto Sans SC / Noto Serif SC fonts everywhere
4. Every panel uses the same `rgba(10, 10, 20, 0.95)` dark overlay

**What creates unique identity (the 4 levers):**
1. **Custom dialogue box frame** — an image-based frame that matches the game's art style (brush stroke for wuxia, ornate gold for fantasy, clean glass for sci-fi)
2. **Color palette coordination** — warm/cool, bright/muted, matching the game's tone
3. **Font pairing** — display font for titles/names + body font for dialogue reinforces setting
4. **Panel decoration** — borders, corner ornaments, consistent visual language across all screens

### How Existing Engines Implement Theming

#### Ren'Py GUI System (gui.rpy)
- **Variable-cascade**: ~70 variables in `gui.rpy` (gui.accent_color, gui.text_color, gui.idle_color, gui.hover_color, gui.insensitive_color, gui.text_font, gui.interface_text_size, etc.)
- **Two-tier**: Basic tier = change variables for instant retheming. Advanced tier = rewrite screens.
- **Image replacement**: `gui/` directory with subdirectories (gui/button/, gui/frame/, gui/slider/)
- **Frame() displayable**: Ren'Py's 9-slice — `Frame("gui/frame.png", 15, 15)` defines border insets for stretchable images
- **GUI Wizard**: Built-in launcher tool to pick accent color + font + resolution → generates gui.rpy
- **Key insight**: The variable cascade means changing ONE accent color updates buttons, sliders, selections, highlights across ALL screens. This is the exact pattern CSS custom properties provide.

#### RPG Maker MV/MZ Window System
- **Single windowskin image**: `img/system/Window.png` (192×192 pixels)
- **9-slice grid structure**: The image is subdivided:
  - Top-left 128×128: background pattern (tiled, with color tint + opacity)
  - Top 128px, right 64px: frame corners and edges (9-slice stretching)
  - Bottom 64px: cursor highlight, directional arrows, pause indicator
- **Color tinting**: `Window_Base` has ~20 predefined text colors in a palette strip embedded in the windowskin image
- **Community ecosystem**: Thousands of free/paid windowskin packs on itch.io, DeviantArt — drop-in replacement of one PNG completely retemes the entire game
- **Key insight**: The single-image approach makes it trivially easy for artists to create a complete theme. One file = entire UI look.

#### TyranoScript/TyranoBuilder
- **Web-based** (HTML/CSS) — architecturally similar to this project
- **Config-driven**: `config.tjs` for basic parameters (font, initial colors)
- **Message box**: `[position]` tag controls layer/position/opacity + `frame` parameter for background image
- **Button images**: Custom PNG files for save/load/config/backlog buttons (normal + hover states)
- **CSS override**: Advanced users override CSS directly for full control
- **Key insight**: No design token abstraction — each element styled individually. Results in inconsistency and high effort for theme changes. **This is what we should avoid.**

#### Unity UI Toolkit (for reference)
- **USS (Unity Style Sheets)**: CSS-like syntax with type/class/name selectors
- **ThemeStyleSheet**: Cascading themes with dark/light mode switching
- **Custom properties**: `--unity-colors-*`, `--unity-metrics-*` variable prefixes
- **Key insight**: Design tokens as custom properties is the industry-standard pattern for systematic theming.

### Current Codebase State

The existing engine has **no design token layer**. All styles are hardcoded:

| UI Component | Current Styling | Hardcoded Values |
|---|---|---|
| Dialogue box | style.css line 178-198 | `rgba(8, 8, 20, 0.92)` gradient, blur 8px, 1px border |
| Quick action bar | style.css line 1229-1271 | `rgba(255, 255, 255, 0.06)` border, `rgba(60, 50, 100, 0.4)` hover |
| Game menu | style.css line 1176-1224 | `rgba(0, 0, 0, 0.7)` overlay, `rgba(30, 30, 50, 0.5)` buttons |
| Save/Load screen | style.css line 446-722 | `rgba(10, 10, 20, 0.95)` bg, `rgba(30, 30, 50, 0.6)` cards |
| Settings screen | style.css line 727-1031 | `rgba(10, 10, 20, 0.8)` bg, `rgba(180, 160, 255, *)` accent |
| Backlog screen | style.css line 1034-1171 | `rgba(10, 10, 20, 0.95)` bg, same accent colors |
| Title screen (default) | style.css line 342-441 | Gradient bg, `rgba(180, 140, 255, *)` glow |
| Choice buttons | style.css line 262-337 | `rgba(60, 60, 100, 0.6)` gradient, purple hover |

**Existing infrastructure that helps:**
- CSS custom properties already used for slider/toggle styling (settingDefs.js `--fill-color`, `--track-color`, `--thumb-color`)
- DialogueBox._applyStyle() already consumes per-page style overrides
- Font override system (global + per-page) already exists in DialogueBox
- Dialogue opacity is already player-adjustable via ConfigManager
- Asset library supports custom fonts (import, FontFace loading)

---

## Table Stakes

Features users fundamentally expect from any theme/skin system. Missing = the feature feels broken or pointless.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|-------------|------------|-------------|-------|
| **Global color scheme (accent + text + background tones)** | Every VN engine has this. Ren'Py has gui.accent_color that cascades everywhere. Without it, changing appearance requires editing dozens of individual values. | Medium | New theme data model in script.json, CSS variable migration in style.css | This IS the core of the system. All ~20 hardcoded color values in style.css must move to `var(--gm-*)` properties. |
| **Dialogue box background customization** | Currently a hardcoded dark gradient. The dialogue box dominates 30%+ of screen time — it's the #1 thing players see. Every commercial galgame lets the maker customize this. | Low | Theme data model, DialogueBox._applyStyle() refactor | Options: solid color, gradient, or image (via 9-slice). Ren'Py/KiriKiri: image-based. RPG Maker: 9-slice tile. |
| **Font selection for all UI** (not just dialogue) | v0.4 added dialogue font settings. But game menu buttons, save/load headers, backlog text, settings labels all still use hardcoded Noto Sans SC. Theme must control ALL text. | Medium | Extend existing font system (DialogueBoxSettings.vue pattern) to all UI classes | Two font slots: display/heading font + body/UI font. Follows standard typographic pairing. |
| **Consistent button styling via tokens** | Currently every button type has its own hardcoded colors — game-menu-button, title-button, qab-btn, choice-button, save-load-close, etc. all styled independently. | Medium | CSS variable cascade for button states | One set of button tokens (normal/hover/pressed bg, text color, border) → all buttons consume them. RPG Maker does this via windowskin; Ren'Py via gui.idle_color/gui.hover_color. |
| **Panel/overlay background consistency** | 6 different overlay screens (save, load, settings, backlog, game menu, choice) each have slightly different `rgba(10, 10, 20, *)` backgrounds. Should be one token. | Low | Single `--gm-panel-bg` variable consumed by all panels | Ren'Py: `gui.frame_color`. RPG Maker: windowskin background tile. |
| **Border radius control** | Sharp corners vs rounded corners is a fundamental aesthetic choice (sharp = serious/historical, rounded = cute/modern). Currently hardcoded `4px`/`6px` everywhere. | Low | `--gm-border-radius` token, applied globally | Trivial to implement, massive aesthetic impact. |
| **Theme reset to defaults** | Users MUST be able to undo all customizations and return to the built-in look. Without this, experimentation is scary. | Low | `defaultTheme` const, "reset" button in editor | Essential UX safety net. Every GUI customization tool has this. |
| **Real-time preview** | Changes must be visible immediately. If the user has to save → close editor → open game to see the result, adoption will be zero. | Medium | iframe preview (already exists for playtesting) or live CSS variable injection | v0.3 Phase 14 already built an iframe preview system with postMessage. Reuse that infrastructure. |

---

## Differentiators

Features that set this engine apart from competitors. Not expected, but highly valued when present.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|-------------|-------|
| **9-slice image system for dialogue box & panels** | THE biggest differentiator. Allows artists to create frame images that stretch to any size without distortion. RPG Maker's entire theming ecosystem is built on this. No other browser-based VN maker has this. | High | CSS `border-image` + `border-image-slice`, custom renderer for canvas preview, asset library integration | CSS `border-image` natively supports 9-slice — no canvas rendering needed at runtime. Editor preview needs custom rendering. See ARCHITECTURE.md for implementation. |
| **9-slice button images (3-state: normal/hover/pressed)** | Buttons with custom artwork for each state. Standard in professional galgames (TYPE-MOON's Fate, KEY's Clannad). Creates dramatic visual uplift from plain CSS buttons. | High | Extends 9-slice system, 3 image slots per button component, CSS state selectors | Can use `:hover`/`:active` pseudo-selectors with `border-image` or background-image swapping. |
| **Color harmony algorithm** | User picks ONE primary color → system generates full coordinated palette (accent, hover, pressed, text, panel background, border). Prevents "ugly color clash" for non-designers. | Medium | Color math library (HSL manipulation), harmony rules (complementary, analogous, triadic) | Huge "防呆" (fool-proofing) value. No VN maker has this. HSL-based: adjust hue ±30° for analogous, lightness ±20% for variants. |
| **Built-in theme presets (3-4)** | Instant "this looks professional" with one click. Like Ren'Py's GUI wizard but better. Presets: Modern (glass/blur), Traditional Japanese (brush/washi), Fantasy (ornate/gold), Minimal (clean/flat). | Medium | Requires complete theme data model + 9-slice assets for image-based presets | Each preset = JSON token file + optional 9-slice image assets. 2 can be CSS-only (Modern, Minimal), 2 need images (Traditional, Fantasy). |
| **Theme import/export (.theme pack files)** | Community sharing. Maker A creates a gorgeous theme → exports as .theme file → Maker B imports it. Creates ecosystem value beyond what we build. | Medium | ZIP packaging (tokens JSON + image assets), IPC handlers for import/export, asset deduplication | .theme file = ZIP containing `theme.json` (tokens) + `assets/` directory (9-slice PNGs, fonts). Standard pattern: RPG Maker community shares windowskin PNGs; Ren'Py shares gui/ directories. |
| **Visual theme editor in editor app** | Dedicated tab/panel where the maker edits tokens with color pickers, sliders, image uploaders, and sees live preview. Not a JSON editor — a visual tool. | High | New Vue component (ThemeEditor.vue), color picker widget, 9-slice image upload/preview, live CSS injection to preview iframe | The capstone feature. Everything else is data model — this is the UX. Must feel like Figma's design token panel, not like editing CSS. |
| **Per-component style overrides** | Base theme defines defaults, but maker can override specific components (e.g., dialogue box uses ornate frame while game menu uses clean style). Layered override system. | Medium | Token inheritance model: base → component-specific overrides | Ren'Py pattern: gui.button_text_idle_color overrides gui.idle_color for buttons only. Implement as optional per-component token overrides in theme data. |

---

## Anti-Features

Features to explicitly NOT build. Each would add complexity without proportional value.

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Direct CSS editing** | Target audience is "no-code" makers (core value: "开发者不碰逻辑"). Exposing raw CSS contradicts the product philosophy and creates support burden. | Visual controls only. Token pickers, sliders, image uploaders. CSS is the implementation detail, never exposed. |
| **Animation/transition theming** | Animation timing, easing curves, and effect types are enormously complex to surface in a GUI. Diminishing returns — 95% of visual identity is colors/images/fonts, not animation. | Keep current hardcoded animations. If needed later, offer 2-3 animation "mood" presets (gentle/energetic/instant) rather than per-property controls. |
| **Layout restructuring via theme** | Layout is already handled by TitleDesigner and SettingsDesigner (drag-drop canvas). Theme = appearance (colors/images/fonts). Mixing layout into themes creates conflicts with designer positions. | Theme controls look-and-feel only. Position/size remains in designers. A theme changes HOW elements look, not WHERE they are. |
| **Per-page/per-scene theme switching** | Massive complexity (theme state in save data, cross-fade between themes, editor UI for per-page theme assignment). Extremely rare in VNs — even commercial titles use one theme throughout. | One theme per project. If mood shifts needed, use background changes and dialogue box image overrides (already supported per-page in DialogueBox._applyStyle). |
| **Custom shader/particle effects** | WebKit/Chromium CSS filters are limited and GPU-heavy. Particle effects need canvas/WebGL. Neither fits the pure-CSS engine architecture. | Stick to `backdrop-filter: blur()` and `box-shadow` for depth effects. These are hardware-accelerated and sufficient. |
| **Font embedding in theme packs** | Font files are large (1-5MB each), have complex licensing, and the asset library already handles font import. Including fonts in .theme packs doubles the font management surface. | Theme packs reference font names; if the font isn't installed, engine falls back to default. Maker imports fonts separately via resource library. |
| **Dark/light mode toggle** | VN games are almost universally dark-themed (game content is fullscreen art — UI must be unobtrusive). A light mode would clash with game artwork and look amateurish. | Default dark. Theme tokens can make panels lighter if desired, but no explicit mode toggle. |

---

## Feature Dependencies

### On Existing Systems

| Existing System | How Theme System Depends On It | Risk |
|---|---|---|
| `style.css` (all 1272 lines) | Every hardcoded color/font/radius must migrate to CSS custom properties. This is the largest refactoring task. | **HIGH** — migration must not break any existing UI. Needs careful testing per component. |
| `DialogueBox._applyStyle()` | Must consume theme tokens instead of inline style objects. 9-slice images render via CSS `border-image`. | MEDIUM — method signature change, but isolated to one class. |
| `settingDefs.js` DEFAULT styles | `DEFAULT_SETTING_STYLE`, `DEFAULT_LABEL_STYLE`, `DEFAULT_BUTTON_STYLE` hardcode colors. Must read from theme tokens. | LOW — small constants file. |
| Asset library (Pinia store + IPC) | 9-slice images need to be stored as project assets. The existing asset pipeline (import → validate → copy to assets/) handles this. | LOW — just a new asset category or use "generic" type. |
| iframe preview (Phase 14) | Theme editor needs live preview. The existing postMessage infrastructure can inject theme tokens into the preview iframe. | LOW — existing pattern, just new message type. |
| `script.json` data model | New `ui.theme` section needed. Must follow existing schema conventions (`ui.settingsScreen`, `ui.titleScreen`, `ui.dialogueBox`). | LOW — additive change, no breaking. |

### Internal Feature Dependencies

```
Design Tokens Data Model (theme.json schema)
  └── Required by ALL other features — this is step zero.

CSS Variable Migration (style.css refactor)
  ├── Requires: Design Tokens (to know what variables to create)
  └── Required by: Theme Presets, Visual Editor, Import/Export
  └── NOTE: This is the riskiest task — touches every UI component

9-Slice Image Renderer
  ├── Requires: Asset library integration (to store/serve images)
  └── Required by: Theme Presets (Traditional Japanese, Fantasy use 9-slice)
  └── Required by: Button image replacement

Color Harmony Algorithm
  ├── Requires: Design Tokens (to know which tokens to generate)
  └── Required by: Visual Theme Editor (auto-palette feature)
  └── Can be built standalone as pure function

Theme Presets
  ├── Requires: Design Tokens + CSS Migration + 9-Slice (for image presets)
  └── Required by: Visual Theme Editor (preset selector)

Theme Import/Export
  ├── Requires: Design Tokens + all asset references resolved
  └── Requires: ZIP packaging capability (JSZip or similar)

Visual Theme Editor
  ├── Requires: ALL of the above
  └── This is the capstone — build last
```

### Dependency-Driven Build Order

1. **Design Tokens data model** — defines the schema, pure data, no rendering
2. **CSS variable migration** — refactor style.css to consume tokens (risky, test heavily)
3. **9-slice image system** — CSS `border-image` for runtime, custom preview for editor
4. **Color harmony algorithm** — pure function, can be built in parallel with 3
5. **Theme presets** — concrete validation that tokens + 9-slice work end-to-end
6. **Theme import/export** — packaging/serialization layer
7. **Visual theme editor** — the editor UI that ties everything together

---

## MVP Recommendation

### Must Have (v0.6 release gate)

1. **Design Tokens + CSS migration** — Without this, nothing else works. The entire style.css must move to CSS custom properties. ~40 tokens covering colors, fonts, radii, spacing, opacity.
2. **Color harmony algorithm** — Essential "防呆" feature. Non-designers will produce ugly results without guidance. Pick primary → get palette.
3. **Dialogue box 9-slice images** — The single highest-impact visual feature. One image transforms the entire game feel. Buttons can come later.
4. **2-3 built-in presets** — Concrete proof the system works. Makers can start from a preset and customize.
5. **Basic visual editor** — Color pickers + font selectors + preset chooser + live preview. Doesn't need to be pixel-perfect Figma-level, but must be visual (not JSON editing).

### Should Have (v0.6 if time permits)

6. **Button 9-slice images (3-state)** — Significant visual uplift, but additive on top of dialogue box 9-slice.
7. **Panel 9-slice images** — Save/load, settings, backlog, game menu panels can use custom frame images.

### Defer to v0.7

8. **Theme import/export (.theme packs)** — Requires mature token model. Better to stabilize the model first, then add packaging.
9. **Per-component overrides** — Nice-to-have layer on top of base tokens. Can ship without it.

---

## Detailed Feature Specifications

### Design Tokens — Token Categories

Based on analysis of all 8 themed UI components in style.css:

| Token Category | Tokens | Current Hardcoded Values | Impact |
|---|---|---|---|
| **Accent colors** | `--gm-accent`, `--gm-accent-hover`, `--gm-accent-active` | `rgba(180, 160, 255, *)` throughout | Every interactive element |
| **Text colors** | `--gm-text-primary`, `--gm-text-secondary`, `--gm-text-muted` | Various `rgba(255, 255, 255, 0.4-0.95)` | All text in all screens |
| **Panel backgrounds** | `--gm-panel-bg`, `--gm-panel-bg-light`, `--gm-overlay-bg` | `rgba(10, 10, 20, 0.8-0.95)`, `rgba(30, 30, 50, 0.5-0.6)` | All overlay screens |
| **Border** | `--gm-border-color`, `--gm-border-radius` | `rgba(255, 255, 255, 0.06-0.15)`, `4-6px` | All containers/buttons |
| **Dialogue box** | `--gm-dialogue-bg`, `--gm-dialogue-border`, `--gm-dialogue-name-shadow` | Complex gradient, `1px rgba(255,255,255,0.08)` | Dialogue box (#1 visible element) |
| **Fonts** | `--gm-font-display`, `--gm-font-body`, `--gm-font-ui` | `'Noto Serif SC'`, `'Noto Sans SC'` | Every text element |
| **Font sizes** | `--gm-size-title`, `--gm-size-body`, `--gm-size-small`, `--gm-size-nameplate` | `22px`, `18px`, `14px`, `20px` | Text hierarchy |
| **Button states** | `--gm-btn-bg`, `--gm-btn-hover`, `--gm-btn-active`, `--gm-btn-text` | Various per-button-type | All clickable elements |
| **Slider/toggle** | `--gm-slider-track`, `--gm-slider-fill`, `--gm-slider-thumb`, `--gm-toggle-active` | From DEFAULT_SETTING_STYLE | Settings screen controls |
| **Special** | `--gm-danger`, `--gm-selection-bg`, `--gm-scrollbar` | `#ff6b6b`, `rgba(180, 160, 255, 0.9)` | Delete buttons, active pagination |

**Estimated total: ~35-40 tokens.** Enough for complete theming, not so many that the editor is overwhelming.

### 9-Slice System — Implementation Notes

CSS `border-image` provides native 9-slice rendering. No canvas needed at runtime:

```css
#dialogue-box {
  border-image: url('asset://theme/dialogue-frame.png') 30 30 30 30 fill stretch;
  border-width: 30px;
  background: none; /* 9-slice replaces gradient */
}
```

The `border-image-slice` values define the 4 inset regions. `fill` draws the center. `stretch`/`repeat`/`round` controls edge scaling.

**For editor preview:** The 1280×720 canvas uses the same CSS on the preview elements — no custom rendering needed if the preview uses actual DOM (which it already does for title/settings designers).

**Image format:** PNG with transparency. Recommended size: 128×128 to 256×256 minimum. Artists create the frame once, CSS scales it to any size.

### Color Harmony — Algorithm Spec

Input: one HSL primary color
Output: full palette (~10 derived colors)

| Derived Color | Algorithm | Purpose |
|---|---|---|
| Accent | Input color | Primary interactive color |
| Accent hover | H same, S same, L +15% | Hover states |
| Accent active | H same, S same, L -10% | Pressed states |
| Accent muted | H same, S -40%, L same | Insensitive/disabled |
| Panel bg | H same, S -60%, L 8-12% | Dark panel backgrounds |
| Panel bg light | H same, S -50%, L 15-20% | Lighter panel (cards, slots) |
| Border | H same, S -50%, L +5% from panel | Subtle borders |
| Text primary | H same, S -70%, L 92% | Main text |
| Text secondary | H same, S -70%, L 65% | Labels, secondary |
| Text muted | H same, S -80%, L 40% | Hints, timestamps |
| Danger | H 0° (red), S 70%, L 60% | Delete/destructive (fixed) |

This maps closely to how Ren'Py's gui.accent_color propagates: one hue, varied saturation and lightness.

### Theme Presets — Planned

| Preset | Style | Tokens | 9-Slice Images | Font Pair |
|---|---|---|---|---|
| **Modern** (default) | Glass/blur, current aesthetic refined | Cool purple accent, frosted glass panels | None (CSS gradients + backdrop-filter) | Noto Sans SC + Noto Serif SC |
| **Traditional Japanese** (和風) | Paper/brush aesthetic | Warm earth tones (#8B6914 gold accent) | dialogue-frame: brush-stroke border. panels: washi paper texture | Serif display + clean body |
| **Fantasy** (幻想) | Ornate medieval/RPG | Deep blue (#2a3a8a) accent with gold (#d4a843) borders | dialogue-frame: stone/wood ornate frame. panels: dark parchment | Decorative display + readable body |
| **Minimal** (简约) | Ultra-clean, flat | Monochrome with single accent | None (flat colors, sharp borders, 0px radius) | System sans-serif |

---

## Sources and Confidence

| Claim | Source | Confidence |
|---|---|---|
| Ren'Py gui.rpy variable cascade (~70 vars) | Training data (Ren'Py documentation, extensive community guides) | HIGH — extremely well-documented, stable API since Ren'Py 7.x |
| RPG Maker windowskin 192×192 grid layout | Training data (RPG Maker MV/MZ documentation, community tutorials) | HIGH — unchanged since RPG Maker VX Ace, extensively documented |
| CSS border-image supports 9-slice natively | CSS specification, widely supported | HIGH — CSS3 standard, supported in all Chromium versions |
| TyranoScript web-based theming approach | Training data (TyranoScript documentation) | MEDIUM — less widely documented than Ren'Py/RPG Maker |
| Commercial galgame UI patterns (KEY, TYPE-MOON) | Training data (game analysis, community discussions) | MEDIUM — based on game observation, not engine documentation |
| Color harmony HSL algorithm | Color theory fundamentals, design system best practices | HIGH — mathematical/deterministic, well-established |
| 80/20 rule of VN visual identity | Synthesis from domain analysis | MEDIUM — opinionated conclusion from cross-engine comparison |