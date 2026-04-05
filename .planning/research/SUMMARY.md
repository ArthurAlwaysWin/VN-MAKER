# Research Summary — v0.6 主题包系统 (Theme Pack System)

**Project:** Galgame Maker
**Domain:** Visual novel engine — theme/skin customization system
**Researched:** 2025-07-22
**Confidence:** HIGH
**Supersedes:** v0.5 research summary (game UI — delivered)

---

## Executive Summary

The v0.6 theme system retrofits a design-token-driven skinning layer onto an existing DOM-based game engine that currently hardcodes all visual styling across ~1272 lines of CSS and 48 inline style assignments in JavaScript. The core architectural insight is that CSS custom properties are **already proven in 7 locations** in the codebase (`setProperty()` in SettingsScreen.js, `var()` in style.css), so the migration is scaling an existing pattern — not introducing a foreign concept. The recommended approach is a ~35-40 token vocabulary (`--gm-*` prefixed) covering colors, fonts, radii, and blur values, rendered via `setProperty()` on `#game-container` and consumed via `var(--gm-*, fallback)` throughout style.css. This design ensures zero visual regression: without a theme applied, every fallback matches today's exact hardcoded value.

The system requires **zero new runtime dependencies** for its core features (tokens, 9-slice rendering, color harmony). The only justified addition is `fflate` (8KB gzipped, MIT) for ZIP-based theme pack import/export — a capability with no native equivalent. Color harmony is pure HSL math (~200 lines), 9-slice uses native CSS `border-image`, and token injection is `element.style.setProperty()`. This aligns with the project's zero-dependency philosophy while delivering a feature set that matches or exceeds Ren'Py's gui.rpy variable cascade and RPG Maker's windowskin system.

The critical risk is **CSS specificity warfare**: 48 inline style assignments across 5 UI component classes (DialogueBox, TitleScreen, SettingsScreen, ChoiceMenu, SaveLoadScreen) will silently override CSS custom properties. The `DialogueBox._applyStyle()` method is especially dangerous — it resets `style.cssText = ''` on every dialogue line, nuking any inline token overrides. The mitigation is architectural: tokens live on `#game-container` (ancestor), not on target elements, so child `cssText` resets don't affect them. Additionally, `border-image` and `border-radius` are mutually exclusive per CSS spec — the 9-slice implementation must use a pseudo-element approach (`::before`) to preserve rounded corners. Both risks are well-understood and have clear prevention paths, but they demand disciplined execution in Phase 1.

---

## Key Findings

### Recommended Stack

**Zero new dependencies for core features.** The existing Electron 41 (Chromium 136) runtime provides every CSS capability needed: `border-image` (Chrome 15+), `color-mix()` (Chrome 111+), `oklch()` (Chrome 111+), CSS custom properties (Chrome 49+). Color harmony is implementable in ~200 lines of HSL math — adding chroma-js (397KB) or culori (1.1MB) for 5 formulas is unjustified overkill.

**Core technologies:**
- **CSS Custom Properties (`var()` + `setProperty()`)**: Token rendering — already used in 7 codebase locations, zero learning curve
- **CSS `border-image`**: 9-slice panel/button skinning — native browser capability, no canvas rendering needed
- **Pure JS HSL utility (~200 LOC)**: Color harmony generation — hex↔HSL conversion, 5 harmony algorithms, WCAG contrast check
- **`fflate` 0.8.2 (8KB gzipped)**: Theme pack ZIP I/O — the ONE new dependency, main-process only, MIT license
- **CSS `color-mix(in oklch, ...)`**: Tint/shade auto-generation — offloads perceptually uniform color math to the browser

See: [STACK.md](./STACK.md)

### Expected Features

**Must have (table stakes):**
- **Global color scheme** (accent + text + backgrounds via ~35-40 tokens) — the foundation everything else depends on
- **Dialogue box background customization** — dominates 30%+ of screen time; options: solid, gradient, or 9-slice image
- **Font selection for ALL UI** (not just dialogue) — two slots: display/heading + body/UI
- **Consistent button styling via token cascade** — one set of button tokens → all button types consume them
- **Panel/overlay background consistency** — one `--gm-panel-bg` token replaces 6 slightly different hardcoded overlays
- **Border radius control** — sharp vs rounded is a fundamental aesthetic lever
- **Theme reset to defaults** — essential UX safety net for experimentation
- **Real-time preview** — zero adoption without instant visual feedback

**Should have (differentiators):**
- **9-slice image system for dialogue box & panels** — THE biggest differentiator; no browser-based VN maker has this
- **9-slice button images (3-state: normal/hover/pressed)** — standard in professional galgames (TYPE-MOON, KEY)
- **Color harmony algorithm** — pick ONE primary → system generates coordinated palette; "防呆" (fool-proofing) for non-designers
- **2-4 built-in theme presets** — instant professional results (Modern, Traditional Japanese, Fantasy, Minimal)
- **Visual theme editor** — color pickers, sliders, image uploaders with live preview; the capstone UX feature

**Defer (v0.7+):**
- **Theme import/export (.theme packs)** — better to stabilize the token model first, then add packaging
- **Per-component style overrides** — layered token inheritance adds complexity without proportional v0.6 value
- **Per-page/per-scene theme switching** — massive state complexity, extremely rare even in commercial VNs
- **Font embedding in theme packs** — fonts are large, have licensing issues; reference by name, import separately
- **Animation/transition theming** — 95% of visual identity is colors/images/fonts, not animation

See: [FEATURES.md](./FEATURES.md)

### Architecture Approach

The architecture follows a **centralized token injection model**: `ThemeManager.js` reads `ui.theme` from `script.json`, merges user tokens with defaults, and sets CSS custom properties on `#game-container`. All of `style.css` consumes these via `var(--gm-*, fallback)`. 9-slice is applied imperatively via `ThemeManager.applyNineSliceTo(element, targetKey)` when UI components create their DOM. The editor communicates with the engine preview via the existing `postMessage` protocol (proven in Phase 14), adding one new message type: `update-theme`.

**Major components:**
1. **ThemeManager** (NEW: `src/engine/ThemeManager.js`) — reads theme data, injects CSS custom properties on `#game-container`, applies 9-slice border-images to elements
2. **ThemeDesigner.vue** (NEW: `src/editor/views/ThemeDesigner.vue`) — visual editor with token panels + 9-slice config + live preview iframe
3. **style.css** (MODIFY: ~50+ value replacements) — every hardcoded color/font/radius → `var(--gm-*, fallback)`
4. **scriptStore** (MODIFY: ~20 lines) — `getTheme()`, `updateTheme()` following existing `getTitleScreen()` pattern
5. **All UI classes** (MODIFY: minor) — accept optional ThemeManager, call 9-slice apply after DOM creation
6. **Color harmony utility** (NEW: `src/engine/colorHarmony.js`) — HSL math, palette generation, WCAG contrast validation

**Key data model decision:** Theme data lives at `ui.theme` inside `script.json` — NOT a separate file. This preserves auto-save, undo/redo, and the existing `ui.*` access pattern for free. Theme export extracts `ui.theme` + referenced images into a ZIP.

See: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Critical Pitfalls

The top 5 pitfalls that will cause rewrites or broken features if not addressed:

1. **48 inline style assignments override CSS tokens (P1)** — `DialogueBox._applyStyle()`, `TitleScreen._renderCustom()`, `SettingsScreen`, `ChoiceMenu`, and `SaveLoadScreen` all set `el.style.*` directly, which beats stylesheet `var()` rules. **Prevention:** Audit all `style.*` assignments first; migrate JS defaults to read from tokens; set tokens on `#game-container` ancestor, not target elements.

2. **`style.cssText = ''` nukes token overrides between dialogue lines (P2)** — DialogueBox resets ALL inline styles on every `show()` call (every line of dialogue). **Prevention:** Never apply theme tokens as inline properties on individual elements; set on `#game-container` and let CSS `var()` cascade handle it.

3. **`border-image` and `border-radius` are mutually exclusive (P3)** — Per CSS spec §6.2, `border-image` completely ignores `border-radius`. 8 element types in the codebase use `border-radius`. **Prevention:** Use `::before` pseudo-element for 9-slice background, keeping `border-radius` on the main element for content clipping. 9-slice source images must have corners pre-rounded in the artwork.

4. **`border-image-slice` silently rejects `px` units (P4)** — Unlike every other CSS length property, `border-image-slice` requires unitless numbers. `30px` silently fails. **Prevention:** Strip units in theme loader; validate with `parseInt()`; document for theme authors.

5. **`sanitize.js` blocks ALL `url()` patterns including `asset://` (P6)** — The CSS sanitizer's regex (`url\s*\(`) blocks 9-slice image URLs. **Prevention:** Token renderer must handle `url()` values as a special path, validating `asset://` prefix before applying, bypassing the general sanitizer for this specific case.

See: [PITFALLS.md](./PITFALLS.md)

---

## Implications for Roadmap

Based on the dependency graph across all research, the natural build order is **5 phases** progressing from data foundation → engine integration → visual features → editor UI → packaging.

### Phase 1: Token Foundation — CSS Variable Migration

**Rationale:** Every subsequent phase depends on CSS consuming tokens. This is step zero — without it, nothing else can render themed values. It's also the highest-risk phase (touches ~600 lines of CSS + 48 JS inline style assignments), so doing it first exposes integration issues early.

**Delivers:** All hardcoded values in `style.css` replaced with `var(--gm-*, fallback)`. `DEFAULT_TOKENS` constant defined. Zero visual regression — game looks pixel-identical without a theme applied. JS inline style assignments in 5 UI classes audited and migrated to consume token values.

**Addresses (FEATURES.md):** Global color scheme, panel consistency, border radius control, font selection groundwork

**Avoids (PITFALLS.md):**
- P1: Inline style override audit ensures JS doesn't defeat CSS tokens
- P2: Tokens on `#game-container`, not on target elements, so `cssText` resets are harmless
- P5: Clear specificity hierarchy established (theme < custom layout < per-character)
- P17: Gradient backgrounds stored as complete token values
- P19: `--gm-` prefix avoids collision with existing `--track-color` etc.

### Phase 2: ThemeManager Engine Integration

**Rationale:** Must validate the full token → CSS var → visual pipeline end-to-end before building 9-slice or editor UI. This phase proves the architecture works with a simple API.

**Delivers:** `ThemeManager.js` class that reads `ui.theme` from script.json, merges with defaults, injects CSS custom properties. `main.js` initializes ThemeManager. `update-theme` postMessage handler for live preview. `scriptStore.getTheme()` / `updateTheme()` methods.

**Addresses (FEATURES.md):** Theme reset to defaults (via DEFAULT_TOKENS merge), real-time preview foundation

**Avoids (PITFALLS.md):**
- P12: Every `var()` has fallback + JS merge with defaults = triple safety net for missing tokens
- P21: Theme switch explicitly resets managed inline properties before applying new theme

### Phase 3: 9-Slice Border Image System + Color Harmony

**Rationale:** 9-slice is the highest-impact visual differentiator and depends on Phase 2's ThemeManager. Color harmony is a pure-function module with zero dependencies on other phases — it can be built in parallel with 9-slice. Grouping them into one phase delivers the two most compelling demo features together.

**Delivers:** `ThemeManager.applyNineSliceTo()` and `applyButtonNineSlice()` methods. All 7 UI classes accept optional ThemeManager and call 9-slice apply. `colorHarmony.js` utility with `generateHarmony()`, `contrastRatio()`, `isReadable()`. WCAG contrast validation for generated palettes.

**Addresses (FEATURES.md):** 9-slice dialogue box images, 9-slice button images (3-state), color harmony algorithm

**Avoids (PITFALLS.md):**
- P3: Pseudo-element (`::before`) approach for 9-slice preserves `border-radius`
- P4: Theme loader strips `px` units from slice values
- P6: Theme images stored under `assets/ui/themes/` — no protocol changes needed
- P7: `backdrop-filter: none` when 9-slice background is active
- P8: WCAG contrast check on every generated palette; lightness clamping for dark themes
- P9: Danger color locked to red quadrant regardless of harmony algorithm
- P14: Opacity cross-fade stacking for smooth button state transitions

### Phase 4: Visual Theme Editor

**Rationale:** The editor UI is the capstone feature that ties everything together. It needs complete token + 9-slice engine foundation to preview against. Building it after Phase 3 means every editor control maps to a working engine feature.

**Delivers:** `ThemeDesigner.vue` with color pickers, typography selectors, 9-slice image upload/preview, color harmony palette generator, live engine preview iframe. New "🎨 主题" tab in editor. Preset selector UI.

**Addresses (FEATURES.md):** Visual theme editor, real-time preview (complete)

**Avoids (PITFALLS.md):**
- P10: Debounced + batched postMessage updates (50ms throttle, single message per frame)
- P16: Theme images written to disk before preview messages sent
- P22: Single internal color representation (OKLCH for calculations, hex for storage)

### Phase 5: Theme Presets + Export/Import

**Rationale:** Pure UX/packaging layer with no technical dependencies beyond Phases 1-4. Presets serve as end-to-end validation that the entire system works. Export/import adds community sharing value. This is the only phase requiring the `fflate` dependency.

**Delivers:** 3-4 built-in theme presets (Modern/default, Traditional Japanese, Fantasy, Minimal). `.theme` ZIP export/import via IPC handlers. `formatVersion` field in all theme files from day one.

**Addresses (FEATURES.md):** Built-in presets, theme import/export

**Avoids (PITFALLS.md):**
- P11: `formatVersion: 1` included in every theme file from the start
- P13: ZIP archive bundles JSON + all referenced image files
- P6 (import path): Imported images extracted to `assets/ui/themes/{name}/`

### Phase Ordering Rationale

- **Phases 1→2 are strictly sequential**: CSS must consume tokens before ThemeManager can inject them. No parallelism possible.
- **Phase 3 groups 9-slice + color harmony** because they're independent of each other but both depend on Phase 2. Within Phase 3, color harmony can be developed and tested in isolation (pure functions, unit-testable) while 9-slice integration touches multiple UI classes.
- **Phase 4 (editor) after Phase 3 (engine)** because the editor previews engine output. Building the editor first would mean building against an incomplete engine.
- **Phase 5 (presets/export) last** because presets are concrete proof the system works end-to-end, and the token model must be stable before serializing it into shareable packages.
- **This order front-loads risk**: Phase 1 (CSS migration) is the riskiest and most tedious task. Failing here is better than failing after building an editor that depends on it.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1 (CSS Migration):** The 48 inline style assignments need per-file audit. The exact list of ~35-40 tokens should be finalized by tracing every unique color/font/radius in style.css. Consider `/gsd-research-phase` to produce the complete token inventory and JS migration map.
- **Phase 3 (9-Slice):** The `::before` pseudo-element approach for preserving `border-radius` needs a prototype to validate. The opacity cross-fade stacking for 3-state buttons also needs performance profiling. Consider a focused spike early in the phase.

**Phases with standard patterns (skip research-phase):**
- **Phase 2 (ThemeManager):** Well-documented pattern — `setProperty()` on container, `var()` in CSS. Already proven in 7 codebase locations. Straightforward implementation.
- **Phase 4 (Editor UI):** Follows established editor patterns (TitleDesigner.vue, SettingsDesigner.vue). Vue color pickers, postMessage preview — all proven patterns.
- **Phase 5 (Presets/Export):** fflate API is simple (zipSync/unzipSync). IPC handler pattern exists (import-assets, export-project). Standard packaging work.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new deps for core; fflate verified on npm. All CSS features confirmed in Chromium 136. |
| Features | **HIGH** | Well-established domain — Ren'Py/RPG Maker/TyranoScript provide clear reference. 80/20 rule validated across engines. |
| Architecture | **HIGH** | Based on direct codebase analysis of all engine/editor files. Token pattern already proven in 7 locations. |
| Pitfalls | **HIGH** | 6 critical pitfalls identified from CSS spec behavior + direct codebase line-number references. All have concrete prevention strategies. |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact token inventory:** ~35-40 tokens estimated, but the precise list requires tracing every unique visual value in style.css + JS files. Finalize during Phase 1 planning.
- **`::before` pseudo-element 9-slice + `border-radius` interaction:** The approach is sound in theory, but needs a small prototype to confirm `overflow: hidden` on the parent correctly clips the pseudo-element's border-image. Validate in a Phase 3 spike.
- **`sanitize.js` update scope:** The exact regex modification to allow `asset://` URLs while blocking other schemes needs careful security review. The token renderer special-path approach (bypass sanitizer for `asset://` prefix only) is safer than modifying the regex.
- **OKLCH vs HSL for color harmony:** STACK.md recommends HSL math for simplicity (~200 lines). PITFALLS.md recommends OKLCH for perceptual accuracy. **Recommendation: Start with HSL for v0.6, add OKLCH refinement in v0.7** if users report "mathematically correct but visually wrong" palettes.
- **3-state button performance:** The opacity cross-fade stacking approach (3 image layers per button × 24 buttons on save/load screen = 72 layers) needs profiling. May be fine in Chromium, but measure during Phase 3.
- **Built-in preset 9-slice image assets:** 2 of 4 presets (Traditional Japanese, Fantasy) require custom 9-slice artwork. These need to be created or sourced (CC0/MIT licensed) during Phase 5 planning.

---

## Sources

### Primary (HIGH confidence)
- **Direct codebase analysis** — style.css (1272 lines), all `src/ui/*.js` classes, `src/main.js`, `src/engine/*.js`, `electron/main.js`, `sanitize.js`, `validateAsset.js`, `settingDefs.js`
- **CSS Backgrounds and Borders Level 3** — `border-image-slice` syntax, `fill` keyword, `border-radius` mutual exclusion (§6.2)
- **CSS Custom Properties specification** — `var()` fallback behavior, `setProperty()` API
- **fflate 0.8.2** — npm registry (verified 2025-07-14), MIT license, 8KB gzipped
- **WCAG 2.1 AA** — contrast ratio requirements (4.5:1 normal text, 3:1 large text)

### Secondary (MEDIUM confidence)
- **Ren'Py gui.rpy documentation** — variable cascade pattern (~70 vars), GUI wizard, Frame() displayable
- **RPG Maker MV/MZ documentation** — windowskin 192×192 grid, community theme ecosystem
- **CSS Color Level 4** — `color-mix()`, `oklch()` color space, growing browser adoption
- **Color theory fundamentals** — HSL color wheel harmonies (complementary, analogous, triadic, split-complementary)

### Tertiary (LOW confidence)
- **TyranoScript theming** — config.tjs patterns, less extensively documented than Ren'Py/RPG Maker
- **Commercial galgame UI analysis** (KEY, TYPE-MOON, Nitro+) — based on game observation, not engine documentation
- **80/20 rule of VN visual identity** — opinionated synthesis; directionally correct but exact percentages are approximate

---

*Research completed: 2025-07-22*
*Ready for roadmap: yes*
