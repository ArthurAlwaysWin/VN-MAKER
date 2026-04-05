# Pitfall Research — v0.6: 主题包系统 (Theme Pack System)

**Domain:** Visual novel engine — retrofitting a theme/skinning system to existing DOM-based game UI
**Researched:** 2025-07-22
**Overall confidence:** HIGH (based on direct codebase analysis + CSS specification knowledge + game engine theming patterns)

---

## Critical Pitfalls (cause rewrites or broken features)

### P1: 120 Hardcoded `rgba()` Values + 48 Inline Style Assignments = Token Migration Minefield

**Severity:** 🔴 CRITICAL
**Phase:** Design Tokens + CSS Custom Properties migration (Phase 1)

**What goes wrong:** The current `style.css` contains **120 `rgba()` color literals** with 13 instances of the accent color `rgba(180, 160, 255, *)` alone, plus secondary colors like `rgba(255, 107, 157, *)` and `rgba(255, 100, 100, *)`. Additionally, UI component JS files contain **48 inline style assignments** for visual properties (`background`, `color`, `border`, `font`). If you attempt to tokenize colors by doing find-and-replace on the CSS without accounting for the inline style overrides in JavaScript, the JS-set values will **override CSS custom properties** because `element.style.*` has higher specificity than any stylesheet rule.

**Evidence from codebase:**
- `DialogueBox.js` lines 89-129: `_applyStyle()` resets ALL inline styles with `this.el.style.cssText = ''` then re-applies background, color, border, padding directly via `this.el.style.*`
- `TitleScreen.js` lines 66-90: `_renderCustom()` sets background, colors directly on elements
- `SettingsScreen.js` lines 57-89: custom layout mode sets background on element
- `ChoiceMenu.js` lines 31-39: custom layout applies background color directly
- `SaveLoadScreen.js` line 86: title color set via inline `style="color: ${titleColor}"`

**Consequences:**
1. CSS tokens like `var(--theme-dialogue-bg)` are defined in stylesheet but never visible because JS overwrites with hardcoded values
2. Theme switching appears to "do nothing" for half the UI elements
3. Developer chases phantom bugs — the CSS looks correct but inline styles win

**Prevention:**
1. **Audit all `style.*` assignments first.** Create a map of every JS file → property → current value before touching CSS.
2. **Strategy: Token values flow through JS, not just CSS.** For elements where JS currently sets inline styles (DialogueBox, TitleScreen custom layout, SettingsScreen custom layout, ChoiceMenu), the JS code must read token values and apply them. Do NOT assume moving colors to `var()` in CSS is sufficient.
3. **For elements with `style.cssText = ''` resets** (DialogueBox, ChoiceMenu, TitleScreen): these wipe ALL inline styles including any CSS custom property overrides. After reset, the element falls back to stylesheet rules — this is actually a good thing, but only if the stylesheet uses tokens.
4. **Priority order for migration:**
   - First: Convert `style.css` hardcoded values → `var(--token)` with fallback values
   - Second: Modify JS `_applyStyle()` methods to use token values instead of hardcoded defaults
   - Third: Verify per-page overrides (fontOverride) still work on top of tokens
5. **Use CSS fallbacks during migration:** `background: var(--theme-dialogue-bg, rgba(8, 8, 20, 0.92))` so nothing breaks before JS is updated.

**Detection:** After tokenizing CSS, test with a bright test theme (e.g., all reds). Any element still showing the original dark purple → it's being overridden by JS inline styles.

---

### P2: `style.cssText = ''` Nukes Theme Token Overrides Between Dialogue Lines

**Severity:** 🔴 CRITICAL
**Phase:** Design Tokens migration (Phase 1)

**What goes wrong:** `DialogueBox._applyStyle()` (line 91) starts with `this.el.style.cssText = ''` — this resets **every** inline style to empty on each new dialogue line. If the theme system applies tokens via inline `style.setProperty('--token', value)`, these are wiped on every dialogue advance. The dialogue box flickers or reverts to stylesheet defaults between every line of text.

**Evidence:** `DialogueBox.js` lines 91-93:
```javascript
this.el.style.cssText = '';
this.textEl.style.cssText = '';
this.nameEl.style.cssText = '';
```
This fires on every `show()` call, which is every dialogue line.

**Consequences:** Theme custom properties set via `element.style.setProperty()` are destroyed 100+ times per playthrough. The dialogue box flickers or shows wrong theme between each line.

**Prevention:**
1. **Never apply theme tokens as inline custom properties on individual elements.** Instead, set them on `#game-container` or `:root`, then reference with `var()` in the stylesheet. This way, `style.cssText = ''` on child elements doesn't touch the tokens.
2. **Refactor `_applyStyle()`** to not use `cssText = ''` as a reset. Instead, use `removeProperty()` on specific properties that were set, or use CSS classes to toggle theme states.
3. **If per-page style overrides must remain:** keep the `cssText` reset but ensure it re-applies theme-relevant properties immediately after. The flow should be: reset → apply theme baseline → apply per-page overrides.

**Detection:** Play through 3+ dialogue lines with a non-default theme active. Watch for flash of default styling between lines.

---

### P3: `border-image` and `border-radius` Are Mutually Exclusive in All Browsers

**Severity:** 🔴 CRITICAL  
**Phase:** 9-slice image system (Phase 2/3)

**What goes wrong:** When `border-image` is set on an element, **`border-radius` is completely ignored** per the CSS specification. This is not a bug — it's spec behavior (CSS Backgrounds and Borders Level 3, §6.2). The current dialogue box, save slots, buttons, and menu panels all use `border-radius` (4px-12px). Applying 9-slice `border-image` to these elements will turn them from rounded rectangles into sharp rectangles, breaking the visual design.

**Evidence from codebase — elements using `border-radius` that would get 9-slice:**
- `#dialogue-box`: no explicit border-radius but per-page style can set it (DialogueBox.js line 124)
- `.save-slot`: `border-radius: 6px` (style.css line 516)
- `.game-menu-button`: `border-radius: 4px` (style.css line 1214)
- `.choice-button`: `border-radius: 6px` (style.css line 321)
- `.title-button`: `border-radius: 4px` (style.css line 404)
- `.qab-btn`: `border-radius: 4px` (style.css line 1246)
- `.page-tab`: `border-radius: 4px` (style.css line 643)
- `.save-confirm-btn`: `border-radius: 4px` (style.css line 694)

**Consequences:** Every 9-slice-themed element loses its rounded corners. If the 9-slice image itself has rounded corners baked in, the underlying element's square border clips content at the corners. Mixed themes (some elements with 9-slice, some without) look inconsistent.

**Prevention:**
1. **Do NOT use CSS `border-image` for 9-slice rendering.** Instead, use `background-image` + `border-image-slice` via a wrapper approach, OR:
2. **Preferred approach: Use a `::before` pseudo-element** for the 9-slice background, keeping `border-radius` on the main element for content clipping:
   ```css
   .themed-panel {
     position: relative;
     border-radius: 8px;
     overflow: hidden; /* clips content to radius */
   }
   .themed-panel::before {
     content: '';
     position: absolute;
     inset: 0;
     border-image: url('asset://ui/panel.png') 30 fill / 30px / 0 stretch;
     z-index: -1;
   }
   ```
   **But note:** The `::before` pseudo-element itself won't respect the parent's `border-radius` for its `border-image`. The 9-slice image must have its corners pre-rounded in the source artwork.
3. **Simplest correct approach:** Abandon CSS `border-image` entirely. Use **`background-image` with `background-size` and `background-repeat`** to simulate 9-slice manually using 9 elements or multiple backgrounds. Or use a canvas-based 9-slice renderer that draws to a canvas behind each element.
4. **Alternative: `mask-image` + `border-image` combo** — use `mask-image` with a radial gradient to round the corners of the border-image. Browser support in Electron's Chromium is fine.

**Detection:** Apply any 9-slice theme → visually check all panels for sharp corners where rounded ones are expected.

---

### P4: 9-Slice `border-image-slice` Only Accepts Unitless Numbers or Percentages — Not `px`

**Severity:** 🔴 CRITICAL
**Phase:** 9-slice image system (Phase 2/3)

**What goes wrong:** The `border-image-slice` property has a unique syntax quirk: values are **unitless numbers** (representing pixels in the source image) or **percentages**. Writing `border-image-slice: 30px` is **invalid CSS** and silently fails, rendering the entire border-image as a stretched single image or not at all. This is the #1 mistake developers make with border-image because every other CSS length property accepts `px`.

**Consequences:** Theme authors specify `30px` in the theme file → engine outputs `border-image-slice: 30px` → entire 9-slice fails silently. The image either stretches incorrectly or disappears. No console error.

**Prevention:**
1. **Strip `px` units in the theme engine** before applying border-image-slice values. If the theme file has `"slice": "30px"`, convert to `30`.
2. **Validate and sanitize in the theme loader:** `parseInt(value, 10)` the slice value.
3. **Document clearly for theme authors:** "Slice values are pixel counts in the source image, WITHOUT the `px` unit."
4. **Use `fill` keyword when using border-image for backgrounds:** Without `fill`, the center of the 9-slice is transparent. `border-image-slice: 30 fill` fills the center.

**Detection:** 9-slice images stretch as a single image or show transparent center.

---

### P5: Inline Style Color Overrides from Per-Page and Per-Character Data Bypass Theme

**Severity:** 🔴 CRITICAL
**Phase:** Design Tokens migration (Phase 1)

**What goes wrong:** The engine has a multi-layered style override system already in place:
1. **Global font settings** (`ui.dialogueBox` from script.json → `applyGlobalStyle()`)
2. **Per-page font overrides** (`page.fontOverride` → injected at `_applyStyle()` time)
3. **Per-character speaker colors** (`data.speakerColor` → set on `.dialogue-speaker-name`)
4. **Per-dialogue position/size overrides** (`data.style` → full layout override)
5. **Settings page custom layout** (JSON-defined positions, colors, fonts)

All of these set colors via inline `style.*` which will override any CSS custom property defined in the stylesheet.

**Evidence:**
- `DialogueBox.js` line 72: `this.nameEl.style.color = data.speakerColor || this._activeNameplateColor || '#fff'`
- `DialogueBox.js` lines 117-124: per-dialogue style overrides for fontSize, fontFamily, textColor, backgroundColor
- `TitleScreen.js` lines 99-124: custom button colors from JSON
- `SaveLoadScreen.js` line 86: mode-colored title via inline style

**Consequences:** Theme defines `--speaker-name-color: gold` but per-character colors override it. Theme defines `--button-bg: blue` but title screen custom layout sets its own colors. The theme system appears broken for any screen that uses custom layouts.

**Prevention:**
1. **Establish a clear specificity hierarchy:** Theme tokens < Per-screen custom layout < Per-character colors. Document this explicitly.
2. **Theme tokens should only affect DEFAULT rendering.** When a custom layout exists (title screen, settings screen), the custom layout's colors take precedence. This is actually correct behavior — the game author's per-element design should override the theme.
3. **For speaker colors specifically:** theme tokens set the DEFAULT speaker color, but per-character `speakerColor` always wins. This matches VN conventions (character identity > theme).
4. **In the UI code:** After `_applyStyle()` resets and applies theme, re-apply any user-specified overrides. Never let theme override user intent.

**Detection:** Create a theme with non-default speaker name color. Test with a character that has a custom color defined → character color should win. Test with a character that has NO color → theme color should appear.

---

### P6: `asset://` Protocol URL Parsing for Theme Image Assets

**Severity:** 🔴 CRITICAL
**Phase:** 9-slice image system + Theme import/export (Phase 2/3)

**What goes wrong:** The `asset://` protocol handler (electron/main.js lines 805-830) resolves paths relative to `{project}/assets/`. Theme pack images (9-slice textures, button graphics) need to be stored somewhere the protocol can find them. If theme images are stored in a `themes/` directory outside `assets/`, the `asset://` protocol **cannot serve them** — it only resolves paths under `assets/` (or `saves/` as a special case).

**Evidence:** electron/main.js line 823-826:
```javascript
const base = currentProjectPath
  ? path.join(currentProjectPath, 'assets')
  : path.join(process.env.APP_ROOT, 'public', 'game');
const fullPath = path.resolve(path.join(base, filePath));
```

All `asset://foo/bar.png` paths resolve to `{project}/assets/foo/bar.png`.

**Consequences:**
1. Theme images stored at `{project}/themes/mytheme/panel.png` → `asset://themes/mytheme/panel.png` → resolves to `{project}/assets/themes/mytheme/panel.png` which doesn't exist → 404
2. Built-in theme images shipped with the app can't be served unless they're in the `public/game/` directory
3. Theme export/import breaks if images are stored in a non-standard location

**Prevention:**
1. **Option A (simplest): Store theme images under `assets/ui/themes/`.** This requires no protocol changes. Theme references use `asset://ui/themes/mytheme/panel.png`.
2. **Option B: Extend the `asset://` protocol** to handle a `themes/` prefix, similar to how `saves/` was added:
   ```javascript
   if (filePath.startsWith('themes/')) {
     // resolve from {project}/themes/ or app built-in themes
     const fullPath = path.resolve(path.join(currentProjectPath, filePath));
     // ... path traversal check ...
     return net.fetch(pathToFileURL(fullPath).toString());
   }
   ```
3. **Option C: For built-in themes,** serve from the app bundle. Add a `builtin-themes/` prefix that resolves to `process.env.APP_ROOT + '/themes/'`.
4. **Must handle both cases:** project-local themes (user-created) AND built-in themes (shipped with app). The protocol handler needs to distinguish and route accordingly.

**Detection:** Import a theme with custom images → images show as broken/missing in the engine preview.

---

## Moderate Pitfalls (cause significant bugs or rework)

### P7: `backdrop-filter: blur()` Conflicts with 9-Slice Background Images

**Severity:** 🟡 MODERATE
**Phase:** 9-slice image system (Phase 2/3)

**What goes wrong:** The current UI uses `backdrop-filter: blur()` extensively (found at 8 locations in style.css) on dialogue box, menus, settings screen, save/load screen, and backlog. When a 9-slice background image is applied to these elements, the `backdrop-filter` blur is **still visible through transparent areas of the 9-slice image** but **invisible through opaque areas**. This creates an inconsistent visual where some parts of the panel are blurred and others aren't, depending on the 9-slice image's alpha channel.

**Worse:** If the 9-slice image is fully opaque (which most VN theme panels are), the `backdrop-filter` does **nothing visible** but still costs GPU performance.

**Prevention:**
1. **When a 9-slice background is active, disable `backdrop-filter`** on that element. Theme tokens should include a flag: `"usesImageBackground": true` → engine sets `backdrop-filter: none`.
2. **If semi-transparent 9-slice panels are desired** (frosted glass effect), the 9-slice image must be designed with consistent alpha across the entire panel.
3. **Performance note:** `backdrop-filter` with large blur radius on multiple stacked elements is already expensive. Removing it when image backgrounds are used is a performance win.

**Detection:** Apply a 9-slice theme to the dialogue box → observe patchy blur/no-blur regions.

---

### P8: Color Harmony Algorithm Produces Invisible Text on Dark Backgrounds

**Severity:** 🟡 MODERATE
**Phase:** Visual theme editor with color harmony (Phase 2)

**What goes wrong:** Classic color harmony algorithms (complementary, triadic, split-complementary) operate in HSL/HSV space and generate mathematically harmonious colors. They do NOT consider **luminance contrast**. A triadic harmony from a dark base color can produce three equally dark colors — resulting in dark text on dark backgrounds with contrast ratios below WCAG's 3:1 minimum for large text.

**Specific edge cases for this project:**
1. **Dark theme pitfall:** Current UI is dark (`rgba(10, 10, 20, *)` backgrounds). A harmony algorithm starting from a dark base generates dark accent colors → buttons and text become invisible.
2. **Saturation loss in dark themes:** Highly saturated colors at low lightness (e.g., `hsl(260, 80%, 15%)`) appear nearly black on screen. The math says they're distinct; the eye says they're identical.
3. **Alpha channel ignored:** Current colors use alpha extensively (`rgba(255, 255, 255, 0.75)` for text). Color harmony algorithms don't account for alpha compositing — the effective contrast depends on what's behind the element.

**Prevention:**
1. **Always validate generated palettes against WCAG contrast ratios.** For each text-on-background pair, compute the contrast ratio and warn if below 4.5:1 (normal text) or 3:1 (large text/UI elements).
2. **Clamp lightness range:** For dark themes, ensure accent colors have lightness ≥ 40%. For light themes, ensure background lightness ≤ 85% or text lightness ≤ 30%.
3. **Use OKLCH instead of HSL** for perceptual uniformity. HSL's "lightness" doesn't match perceived brightness (pure blue `hsl(240, 100%, 50%)` appears much darker than pure yellow `hsl(60, 100%, 50%)`). OKLCH/OKLAB corrects this.
4. **Provide a "contrast check" in the editor** that shows red warnings on any text-background pair that fails WCAG AA.
5. **Pre-compute effective alpha-composited colors** before checking contrast. `rgba(255,255,255,0.75)` on `rgba(10,10,20,0.95)` → compute the actual rendered RGB, then check contrast.

**Detection:** Apply a generated harmony → squint test or use contrast-checking tool on the preview.

---

### P9: Color Harmony Generates Clashing Hues for Game-Specific UI Semantics

**Severity:** 🟡 MODERATE
**Phase:** Visual theme editor (Phase 2)

**What goes wrong:** The current UI uses **semantic color coding**: purple (`rgba(180, 160, 255, *)`) for accent/active states, pink (`rgba(255, 107, 157, *)`) for toggles, red (`rgba(255, 100, 100, *)`) for destructive actions (delete). A generic color harmony algorithm doesn't understand these semantics. It might assign the "danger" slot a color identical to the "primary" slot, or make the "active" state color less prominent than the "inactive" state.

**Prevention:**
1. **Define semantic color roles, not just a palette:** `primary`, `primaryHover`, `danger`, `dangerHover`, `success`, `muted`, `surface`, `surfaceHover`, `text`, `textMuted`.
2. **Derive semantic roles from the harmony, don't randomly assign:** Primary → base harmony color. Danger → always warm/red-shifted, regardless of harmony. Success → always green-shifted. Muted → desaturated version of primary.
3. **Lock the danger color** to the red/warm quadrant regardless of the harmony algorithm. Theme authors should be able to override it, but the algorithm should default to sensible semantics.
4. **Visual preview must show all semantic roles simultaneously** so theme authors can see if "delete" looks dangerous enough and "active" looks prominent enough.

**Detection:** Generate a harmony with a red base → notice the "delete" button doesn't look dangerous because it's the same color as everything else.

---

### P10: Real-Time Preview Floods iframe with postMessage Causing Jank

**Severity:** 🟡 MODERATE
**Phase:** Visual theme editor with live preview (Phase 2)

**What goes wrong:** The editor uses `iframe + postMessage` for the inline preview (confirmed in PROJECT.md and main.js). When the theme editor has a color picker or slider, each pixel of mouse movement fires a change event. Sending a postMessage for every change → iframe receives 60+ messages/second → parses theme → updates 120+ CSS custom properties → triggers style recalculation → layout thrash → visible jank.

**Evidence:** The editor-engine communication is postMessage-based (Phase 14: "iframe + postMessage + 只读覆盖层 + asset:// basePath"). Each theme token change would need to be communicated to the preview iframe.

**Consequences:** Slider dragging feels sluggish. Color picker movement causes visible lag. Users perceive the theme editor as broken/slow.

**Prevention:**
1. **Debounce theme updates to preview.** 60fps = 16ms budget. Debounce to ~50ms (20fps) for smooth visual feedback without jank.
2. **Batch all token changes into a single message.** Don't send one message per property — collect all changed tokens and send once:
   ```javascript
   // BAD: 10 messages per frame
   postMessage({ type: 'set-token', key: '--bg-color', value: '#123' });
   postMessage({ type: 'set-token', key: '--text-color', value: '#fff' });
   
   // GOOD: 1 message per frame
   postMessage({ type: 'set-tokens', tokens: { '--bg-color': '#123', '--text-color': '#fff' } });
   ```
3. **In the engine iframe:** Apply all tokens in a single `requestAnimationFrame` callback, not synchronously in the message handler.
4. **Consider direct CSS custom property injection** without postMessage if the iframe is same-origin: `iframe.contentDocument.documentElement.style.setProperty('--token', value)`. This is synchronous and faster than postMessage round-trip.

**Detection:** Open theme editor → drag a color slider → observe if preview updates smoothly or stutters.

---

### P11: Theme File Format Without Version Field Blocks Future Migration

**Severity:** 🟡 MODERATE
**Phase:** Theme export/import (Phase 3/4)

**What goes wrong:** If the `.theme` file format doesn't include a `version` field from day one, there's no way to detect which format version a theme was created with. When the engine adds new UI elements in v0.7+ (e.g., a new CG gallery screen), old themes have no tokens for the new elements. Without a version field, the engine can't distinguish "theme was created before CG gallery existed" from "theme intentionally doesn't style the CG gallery."

**Consequences:**
1. Can't run automatic migration (don't know what version to migrate FROM)
2. New UI elements with missing tokens either crash or show unstyled (raw white boxes on dark theme)
3. Theme authors have to manually re-export every time the engine updates

**Prevention:**
1. **Include `formatVersion` in every theme file from the start:**
   ```json
   {
     "formatVersion": 1,
     "engineVersion": "0.6.0",
     "name": "Sakura Night",
     "tokens": { ... },
     "images": { ... }
   }
   ```
2. **`formatVersion` is for the theme file structure** (what keys exist, what format images are referenced in). `engineVersion` is for the minimum engine version that can render this theme.
3. **Theme loading code must check `formatVersion` first** and apply migrations:
   ```javascript
   function loadTheme(data) {
     let theme = data;
     if (theme.formatVersion < 2) theme = migrateV1toV2(theme);
     if (theme.formatVersion < 3) theme = migrateV2toV3(theme);
     return theme;
   }
   ```
4. **Migration functions must be pure** (no side effects) and additive (never remove tokens, only add with defaults).

**Detection:** Ship v0.6, add new UI in v0.7, try to load a v0.6 theme → either crashes or shows broken styling on new elements.

---

### P12: Theme Missing Tokens for Newly Added UI Elements Causes Unstyled Flash

**Severity:** 🟡 MODERATE
**Phase:** Design Tokens architecture (Phase 1)

**What goes wrong:** A theme created in v0.6 defines tokens for all v0.6 UI elements. In v0.7, a new "CG gallery" screen is added with new token keys like `--theme-gallery-bg`, `--theme-gallery-card-border`. When the v0.6 theme is loaded, these tokens are `undefined` → `var(--theme-gallery-bg)` resolves to nothing → no background → white/transparent flash, completely breaking the dark UI aesthetic.

**Prevention:**
1. **Every `var()` MUST have a fallback value that matches the built-in default theme:**
   ```css
   /* GOOD */
   background: var(--theme-gallery-bg, rgba(10, 10, 20, 0.95));
   
   /* BAD — no fallback */
   background: var(--theme-gallery-bg);
   ```
2. **The default theme defines ALL tokens.** When loading any theme, merge with the default theme as a baseline:
   ```javascript
   const effectiveTokens = { ...DEFAULT_THEME.tokens, ...loadedTheme.tokens };
   ```
3. **Fallback cascade:** CSS fallback → JS-level merge with defaults → theme migration. Triple safety net.
4. **Test with an empty theme** (only `formatVersion` and `name`, no tokens) → entire UI should look identical to the default built-in style.

**Detection:** Load an older theme → new screens appear with wrong/missing colors.

---

### P13: Theme Export/Import Bundle Doesn't Include Referenced Images

**Severity:** 🟡 MODERATE
**Phase:** Theme export/import (Phase 3/4)

**What goes wrong:** A theme references 9-slice images like `"dialoguePanel": "ui/themes/sakura/panel.png"`. When the `.theme` file is exported, only the JSON is saved — the actual image files are not bundled. Importing on another project → images not found → all 9-slice panels broken.

**Prevention:**
1. **`.theme` export must be a ZIP archive** (renamed to `.theme`) containing both the JSON manifest and all referenced image files:
   ```
   mytheme.theme (ZIP):
   ├── theme.json
   └── images/
       ├── dialogue-panel.png
       ├── button-normal.png
       ├── button-hover.png
       └── button-active.png
   ```
2. **On export:** Scan all token values for image paths → copy referenced files into the archive.
3. **On import:** Extract to `{project}/assets/ui/themes/{themeName}/` → rewrite image paths in theme.json to point to extracted locations.
4. **Validate image references** during import. If an image is referenced but missing from the archive, warn the user rather than silently breaking.
5. **Size limit:** Theme packs with many high-res 9-slice images can get large. Consider limiting individual image dimensions (max 512px for 9-slice source? They stretch well).

**Detection:** Export theme from project A, import to project B → 9-slice images show as broken.

---

### P14: Three-State Button Images (Normal/Hover/Active) with CSS-Only Transitions

**Severity:** 🟡 MODERATE
**Phase:** 9-slice button system (Phase 2/3)

**What goes wrong:** For 9-slice-themed buttons, the theme may provide three image states: normal, hover, and active (pressed). The naive approach is to swap `border-image-source` on `:hover` and `:active`. However, `border-image` does **not support CSS transitions** — the image swap is instant with no animation, creating a jarring visual "pop." The current button hover effects use smooth `transition: all 0.2s` which would be lost.

**Additionally:** `TitleScreen._createButtonElement()` (line 128-131) adds mouseenter/mouseleave event listeners for hover color. This existing JS-based hover system conflicts with CSS `:hover` pseudo-class 9-slice swapping.

**Prevention:**
1. **Use opacity cross-fade instead of image swap.** Stack all three states as absolute-positioned layers and transition their opacity:
   ```css
   .theme-btn { position: relative; }
   .theme-btn .state-normal { opacity: 1; transition: opacity 0.2s; }
   .theme-btn .state-hover  { opacity: 0; transition: opacity 0.2s; }
   .theme-btn .state-active { opacity: 0; transition: opacity 0.2s; }
   .theme-btn:hover .state-normal { opacity: 0; }
   .theme-btn:hover .state-hover  { opacity: 1; }
   .theme-btn:active .state-active { opacity: 1; }
   ```
2. **Or use a sprite sheet** with `background-position` animation. Single image, shift position on state change — this transitions smoothly.
3. **For the TitleScreen JS-based hover:** When a 9-slice theme is active, disable the JS mouseenter/mouseleave handlers and use CSS-only state management. Don't let two systems fight.
4. **Memory note:** Three images per button × multiple buttons = many DOM elements. If performance is a concern, use a single canvas-rendered button.

**Detection:** Hover over a themed button → notice instant image pop instead of smooth transition.

---

### P15: `SaveLoadScreen` Mode-Colored Title Uses Hardcoded Color Constants

**Severity:** 🟡 MODERATE
**Phase:** Design Tokens migration (Phase 1)

**What goes wrong:** `SaveLoadScreen.js` lines 13-14 define mode-specific title colors as constants:
```javascript
const SAVE_TITLE_COLOR = 'rgba(180, 160, 255, 0.9)';
const LOAD_TITLE_COLOR = 'rgba(100, 170, 255, 0.9)';
```
These are applied via inline style (line 86: `style="color: ${titleColor}"`). Even after tokenizing the CSS, these JavaScript constants still output hardcoded colors.

**This pattern repeats:** `showToast()` in main.js (line 81) has inline `style.cssText` with hardcoded colors. Any UI created via `innerHTML` template literals with inline styles bypasses CSS tokens.

**Prevention:**
1. **Search for ALL template-literal inline styles** in JS files. Grep for `style="` and `style.cssText =` in all UI code.
2. **Replace constant colors with runtime token reads:**
   ```javascript
   const titleColor = this.mode === 'save'
     ? getComputedStyle(this.el).getPropertyValue('--theme-accent-save').trim() || 'rgba(180, 160, 255, 0.9)'
     : getComputedStyle(this.el).getPropertyValue('--theme-accent-load').trim() || 'rgba(100, 170, 255, 0.9)';
   ```
3. **Or better: use CSS classes** instead of inline colors: `this.el.dataset.mode = mode` → CSS handles the color via `[data-mode="save"] .save-load-title { color: var(--theme-accent-save); }`. This already partially exists (line 62: `this.el.dataset.mode = mode`).

**Detection:** Switch theme → save/load screen title still shows purple/blue instead of theme colors.

---

### P16: Electron iframe Preview Cannot Access `asset://` for Theme Images Without basePath

**Severity:** 🟡 MODERATE  
**Phase:** Theme editor preview (Phase 2)

**What goes wrong:** The inline preview iframe uses `asset:// basePath` dynamic injection (PROJECT.md: "asset:// basePath 动态注入 — 编辑器项目和独立模式共用同一引擎代码"). When the theme editor previews 9-slice images, the preview iframe needs to resolve `asset://ui/themes/sakura/panel.png` to the correct project directory. If the basePath isn't set correctly or the theme images haven't been saved to the project directory yet (e.g., user is previewing an imported theme before confirming), the images 404.

**Prevention:**
1. **Ensure theme images are written to disk BEFORE sending preview messages.** Don't preview a theme whose images only exist in memory.
2. **Or: Add a temporary file staging mechanism** — write theme images to a temp location within `assets/` and clean up on cancel.
3. **For built-in themes:** Images must be accessible from the preview iframe's `asset://` context. If built-in themes live in the app bundle (not the project), the `asset://` protocol must be extended to resolve them.

**Detection:** Preview a just-imported theme → 9-slice images don't appear in the preview.

---

## Minor Pitfalls (cause annoyances or subtle bugs)

### P17: CSS Custom Property Fallback Chains Can't Contain Commas Easily

**Severity:** 🟢 MINOR
**Phase:** Design Tokens CSS migration (Phase 1)

**What goes wrong:** CSS `var()` fallback values treat everything after the first comma as the fallback. This causes problems with `rgba()` and multi-value properties:
```css
/* BROKEN — CSS parser sees fallback as "8, 20, 0.92)" */
background: var(--theme-bg, rgba(8, 8, 20, 0.92));
/* This actually works because the entire "rgba(8, 8, 20, 0.92)" is treated as the fallback */
```
Actually, `var(--x, rgba(8, 8, 20, 0.92))` **does work** — the fallback is everything between the first comma and the closing parenthesis. But `var(--x, linear-gradient(to top, rgba(8, 8, 20, 0.92) 0%, rgba(8, 8, 20, 0.75) 100%))` can confuse tooling and linters.

**The real problem:** The dialogue box background is a `linear-gradient(...)` (style.css line 183-188). You can't put a multi-stop gradient as a fallback inside `var()` reliably across all tooling. The token system needs to handle gradient backgrounds as complete values.

**Prevention:**
1. **For gradient backgrounds:** Store the ENTIRE gradient as a single token value, not individual colors:
   ```css
   background: var(--theme-dialogue-bg, linear-gradient(to top, rgba(8, 8, 20, 0.92), rgba(8, 8, 20, 0.75)));
   ```
2. **Or decompose into individual color stops** that the token system composes:
   ```css
   background: linear-gradient(
     to top,
     var(--theme-dialogue-bg-bottom, rgba(8, 8, 20, 0.92)) 0%,
     var(--theme-dialogue-bg-top, rgba(8, 8, 20, 0.75)) 100%
   );
   ```
   This is more flexible (theme can adjust gradient angle in future) but more verbose.
3. **Recommendation:** Use approach 2 (decomposed) for the dialogue box gradient specifically, and approach 1 (complete value) for simpler solid-color backgrounds.

---

### P18: Font Loading Race Condition Between Theme Switch and Font Display

**Severity:** 🟢 MINOR
**Phase:** Design Tokens (Phase 1), if themes include custom fonts

**What goes wrong:** The project already handles font loading via `fontLoader.js` for both editor and engine windows. If a theme specifies a custom font, switching themes requires loading the new font file before applying the CSS. During the load gap (which can be 100ms-2s depending on file size), text renders in the fallback font then "pops" to the theme font — a visible FOIT (Flash of Invisible Text) or FOUT (Flash of Unstyled Text).

**Prevention:**
1. **Preload theme fonts before applying theme tokens.** Show a brief loading indicator during font load.
2. **Use `font-display: swap`** in the @font-face declaration so text remains visible in fallback font during load.
3. **Cache font loads** — if the user switches back to a previously loaded theme, the font is already available.
4. **For the preview iframe:** Font must be loaded in BOTH the editor window and the engine iframe window (the project already does this for user fonts — same pattern).

---

### P19: Theme Token Namespace Collisions with Existing CSS Custom Properties

**Severity:** 🟢 MINOR
**Phase:** Design Tokens migration (Phase 1)

**What goes wrong:** The codebase already uses three CSS custom properties: `--track-color`, `--thumb-color`, `--toggle-active` (applied via JS `setProperty` on individual elements). If the theme system introduces tokens with these same names at a higher scope (`:root` or `#game-container`), they'll cascade down and override the per-element values that the settings page slider/toggle system sets.

**Evidence:** style.css lines 873, 883, 931 use `var(--track-color)`, `var(--thumb-color)`, `var(--toggle-active)`.
SettingsScreen.js lines 131-133 set these via `control.style.setProperty('--fill-color', ...)`.

**Prevention:**
1. **Prefix ALL theme tokens with `--theme-`** to avoid collision:
   - Theme: `--theme-slider-track`, `--theme-slider-thumb`, `--theme-toggle-active`
   - Existing per-element: `--track-color`, `--thumb-color`, `--toggle-active` (unchanged)
2. **Update existing `var()` fallbacks** to reference theme tokens as fallback of fallback:
   ```css
   background: var(--track-color, var(--theme-slider-track, rgba(255,255,255,0.1)));
   ```
   This way: per-element JS override → theme token → hardcoded default.

---

### P20: 9-Slice Image Performance with Many Simultaneous Panels

**Severity:** 🟢 MINOR
**Phase:** 9-slice system (Phase 2/3)

**What goes wrong:** If the opacity-stacking approach is used for button states (P14), each button has 3 absolutely-positioned image layers. The save/load screen has 9 slot cards + 12 page tabs + 3 action buttons = 24 elements × 3 states = 72 image layers on a single screen. Combined with `backdrop-filter: blur()` (which is already expensive), this can cause frame drops during page transitions.

**Prevention:**
1. **Measure first, optimize later.** Electron's Chromium handles border-image/background-image well for moderate counts. Don't over-engineer.
2. **Lazy-render state layers:** Only create the hover/active layers when the element is first interacted with.
3. **Use CSS `content-visibility: auto`** on off-screen elements (save/load pages not currently visible).
4. **Profile with DevTools Performance tab** before and after 9-slice implementation.
5. **For truly many elements (100+):** Consider rendering 9-slice to an offscreen canvas once, then using the result as a `data:` URI background-image. One decode per unique configuration.

---

### P21: Theme Switching Doesn't Reset Per-Element Inline Styles from Previous Theme

**Severity:** 🟢 MINOR
**Phase:** Theme switching logic (Phase 3)

**What goes wrong:** If Theme A applies 9-slice images via JS (`element.style.borderImage = ...`), then the user switches to Theme B (which uses solid colors, no 9-slice), the `borderImage` inline style from Theme A persists. Theme B's `background: var(--theme-bg)` in the stylesheet is invisible because the old `border-image` still fills the element.

**Prevention:**
1. **Theme switching must explicitly reset all theme-related inline styles** before applying new theme.
2. **Maintain a list of "theme-managed properties"** per element. On theme switch: remove all managed properties, then apply new theme.
3. **Simplest: Reset all theme-layer inline styles** to empty string, then reapply only what the new theme needs.
4. **CSS class approach is inherently safer:** Remove `.theme-a` class, add `.theme-b` class. Stylesheet rules handle the rest without any inline style residue.

---

### P22: Color Picker Input Produces Colors Outside Theme Author's Intended Gamut

**Severity:** 🟢 MINOR
**Phase:** Theme editor (Phase 2)

**What goes wrong:** HTML native `<input type="color">` returns sRGB hex values. If the color harmony algorithm works in HSL and the UI displays HSL sliders, rounding between color spaces produces slightly different colors than what the user selected. Over multiple round-trips (pick → harmony → display → re-pick), colors drift.

**Prevention:**
1. **Choose one internal color representation** (recommend OKLCH for perceptual uniformity) and convert to/from display formats at the boundaries only.
2. **Store colors in the theme file as hex or rgb** (universally understood), but do all harmony calculations in OKLCH.
3. **Don't round-trip through HSL repeatedly.** Convert once for calculation, once for display.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|---|---|---|---|
| CSS token migration | P1: JS inline styles override tokens | 🔴 CRITICAL | Audit all 48 inline style assignments; use fallbacks |
| CSS token migration | P2: `cssText = ''` resets wipe tokens | 🔴 CRITICAL | Set tokens on ancestor, not target elements |
| CSS token migration | P5: Per-page/per-character overrides bypass tokens | 🔴 CRITICAL | Define clear specificity hierarchy |
| CSS token migration | P15: Template-literal inline colors | 🟡 MODERATE | Grep for `style="` in all JS files |
| CSS token migration | P17: Gradient fallback values in `var()` | 🟢 MINOR | Decompose gradients into individual stops |
| CSS token migration | P19: Namespace collision with existing custom props | 🟢 MINOR | Prefix all theme tokens with `--theme-` |
| 9-slice system | P3: `border-image` + `border-radius` mutual exclusion | 🔴 CRITICAL | Use pseudo-element or background-image approach |
| 9-slice system | P4: `border-image-slice` rejects `px` units | 🔴 CRITICAL | Strip units in theme loader, validate |
| 9-slice system | P7: `backdrop-filter` conflicts with 9-slice | 🟡 MODERATE | Disable blur when image background active |
| 9-slice system | P14: No CSS transition for border-image swap | 🟡 MODERATE | Use opacity cross-fade stacking |
| 9-slice system | P20: Performance with many image layers | 🟢 MINOR | Lazy-render, profile first |
| 9-slice + asset:// | P6: Protocol can't serve theme image paths | 🔴 CRITICAL | Extend protocol or store under assets/ |
| 9-slice + asset:// | P13: Export bundle missing images | 🟡 MODERATE | ZIP-based .theme format |
| Color harmony | P8: Invisible text from low-contrast harmonies | 🟡 MODERATE | WCAG contrast check, OKLCH color space |
| Color harmony | P9: Semantic colors overridden by harmony | 🟡 MODERATE | Lock danger/success to semantic hue ranges |
| Color harmony | P22: Color space round-trip drift | 🟢 MINOR | Single internal representation |
| Theme editor preview | P10: postMessage flood from slider drag | 🟡 MODERATE | Debounce + batch messages |
| Theme editor preview | P16: Preview can't resolve unsaved theme images | 🟡 MODERATE | Write to disk before preview |
| Theme file format | P11: No version field blocks migration | 🟡 MODERATE | Include `formatVersion` from day one |
| Theme forward compat | P12: Missing tokens for new UI elements | 🟡 MODERATE | Mandatory fallback values, merge with defaults |
| Theme switching | P21: Old inline styles persist after switch | 🟢 MINOR | Reset managed properties on switch |
| Font in themes | P18: Font loading race condition | 🟢 MINOR | Preload fonts before applying tokens |

---

## Summary of Counts

| Severity | Count | Key Theme |
|---|---|---|
| 🔴 CRITICAL | 6 | CSS specificity fights, border-image spec behavior, asset:// routing |
| 🟡 MODERATE | 9 | Color harmony edge cases, performance, versioning, preview integration |
| 🟢 MINOR | 7 | Namespace collisions, font loading, color space drift |

---

## Sources & Confidence

| Topic | Confidence | Source |
|---|---|---|
| CSS specificity / inline styles override | HIGH | Direct codebase analysis (48 inline style assignments counted), CSS specification |
| `border-image` + `border-radius` mutual exclusion | HIGH | CSS Backgrounds and Borders Level 3 §6.2, confirmed in Chromium behavior |
| `border-image-slice` unit-less syntax | HIGH | CSS specification, MDN documentation |
| `backdrop-filter` interaction with opaque backgrounds | HIGH | CSS Filter Effects Level 2 specification |
| Color harmony WCAG contrast issues | HIGH | WCAG 2.1 AA guidelines, well-documented accessibility pattern |
| OKLCH vs HSL perceptual uniformity | MEDIUM | Color science literature, CSS Color Level 4 spec, growing adoption |
| `asset://` protocol routing | HIGH | Direct codebase analysis (electron/main.js lines 805-830) |
| postMessage performance in iframe | MEDIUM | General web performance pattern, confirmed iframe-based architecture |
| Theme versioning forward-compat | HIGH | Standard software versioning pattern, common in plugin/theme ecosystems |
