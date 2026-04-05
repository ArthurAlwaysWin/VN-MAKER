# Technology Stack — v0.6 Theme Pack System

**Project:** Galgame Maker
**Researched:** 2025-07-14
**Scope:** NEW stack additions for Design Tokens + 9-Slice + Color Harmony + Theme Packs
**Overall confidence:** HIGH

## Executive Summary

The v0.6 theme system requires almost no new dependencies. The existing Electron 41 (Chromium 136) runtime provides native CSS capabilities (`border-image`, `color-mix()`, `oklch()`, CSS custom properties) that cover 95% of the needs. Color harmony is pure HSL math (~200 lines). The only justified new dependency is `fflate` (8KB gzipped) for ZIP-based theme pack import/export.

**Guiding principle:** This project has zero runtime dependencies beyond Vue/Pinia. Adding one tiny, focused library (fflate) for a specific capability (ZIP I/O) that has no native equivalent is justified. Adding a color library for math you can write in 200 lines is not.

## Existing Stack (DO NOT change)

| Technology | Version | Role |
|------------|---------|------|
| Electron | 41.0.4 | Desktop runtime (Chromium 136 + Node.js 22) |
| Vue 3 | 3.5.31 | Editor UI framework |
| Pinia | 3.0.4 | Editor state management |
| Vite | 6.3.0 | Build tool |
| Pure JavaScript | ES Modules | No TypeScript — JSDoc only |

## NEW Stack Additions

### 1. Design Token System — ZERO dependencies

**What:** A JSON-serializable token object rendered as CSS custom properties on `#game-container`.

**Technology:** Native CSS custom properties + `element.style.setProperty()`.

**Why zero-dependency:** The project already uses `setProperty()` in 4 places (SettingsScreen.js lines 131-133, 161) and CSS `var()` in 3 places (style.css lines 873, 883, 931). This is just scaling an existing pattern — no new API needed.

**Implementation approach:**
```javascript
// Token object (JSON-serializable, stored in script.json ui.theme)
const tokens = {
  '--gm-dialogue-bg': 'rgba(8, 8, 20, 0.92)',
  '--gm-dialogue-text': 'rgba(255, 255, 255, 0.92)',
  '--gm-button-bg': 'rgba(60, 60, 100, 0.6)',
  '--gm-accent': 'rgba(180, 160, 255, 0.9)',
  // ... ~30-50 tokens total
};

// Render: one function, applies all tokens
function applyTokens(container, tokens) {
  for (const [key, value] of Object.entries(tokens)) {
    container.style.setProperty(key, value);
  }
}
```

**CSS consumption pattern (already proven in codebase):**
```css
#dialogue-box {
  background: var(--gm-dialogue-bg, rgba(8, 8, 20, 0.92));
  /* fallback = current hardcoded value, so zero-theme = identical to today */
}
```

**Confidence:** HIGH — uses only APIs already proven in the codebase.

### 2. 9-Slice / Border-Image System — ZERO dependencies

**What:** CSS `border-image` for skinning dialogue boxes, panels, and buttons with user-provided images.

**Technology:** Native CSS `border-image-source`, `border-image-slice`, `border-image-width`, `border-image-repeat`.

**Why zero-dependency:** `border-image` has been supported since Chrome 15. In Chromium 136, it's rock-solid with full support for all sub-properties.

**Integration with asset:// protocol:** The existing `asset://` protocol resolves `asset://ui/panel-border.png` to `{project}/assets/ui/panel-border.png`. The `ui` asset category already exists in `validateAsset.js` (line 56-59) with PNG/JPG/WebP validation. 9-slice images are just regular images stored in `assets/ui/`.

**Implementation approach:**
```css
/* Applied via setProperty from token values */
#dialogue-box {
  border-image-source: var(--gm-dialogue-border-image, none);
  border-image-slice: var(--gm-dialogue-border-slice, 30 fill);
  border-image-width: var(--gm-dialogue-border-width, 30px);
  border-image-repeat: var(--gm-dialogue-border-repeat, stretch);
}
```

**When border-image is active:** Overrides `background` and `border` — the image becomes the entire box chrome. This means the token system needs a mode flag: `useImage: true/false` to switch between color-based and image-based styling.

**Three-state buttons (normal/hover/active):**
```css
.title-custom-button {
  border-image-source: var(--gm-button-image-normal, none);
}
.title-custom-button:hover {
  border-image-source: var(--gm-button-image-hover, none);
}
.title-custom-button:active {
  border-image-source: var(--gm-button-image-active, none);
}
```

**Key technical notes:**
- `border-image-slice` uses unitless numbers (pixels from the image edges) or percentages
- The `fill` keyword in `border-image-slice` is essential — without it, the center is empty
- `border-image` overrides `border-radius` — rounded corners don't work with border-image (users must bake rounded corners into the source image)
- `border-image-source: url('asset://ui/panel.png')` works because `asset://` is registered as a privileged scheme with `bypassCSP: true`

**Confidence:** HIGH — CSS standard feature, asset:// protocol already handles UI images.

### 3. Color Harmony / Palette Generation — ZERO dependencies

**What:** Algorithms to generate harmonious color palettes from a base color (complementary, analogous, triadic, split-complementary, tetradic).

**Technology:** Pure JavaScript HSL math utility module (~200-300 lines).

**Why zero-dependency:**

| Library | Size (unpacked) | What it does | Overkill? |
|---------|-----------------|--------------|-----------|
| chroma-js 3.2.0 | 397KB | Color spaces, interpolation, scales | YES — we need 5 formulas |
| tinycolor2 1.6.0 | 285KB | Color manipulation, readability | YES — unmaintained (last release 2020) |
| culori 4.0.2 | 1.1MB | Perceptual color science | ABSOLUTELY — academic-grade overkill |

The actual math for color harmony:
```javascript
// This is literally all the "hard" math:
function complementary(h) { return (h + 180) % 360; }
function analogous(h) { return [(h + 30) % 360, (h - 30 + 360) % 360]; }
function triadic(h) { return [(h + 120) % 360, (h + 240) % 360]; }
function splitComplementary(h) { return [(h + 150) % 360, (h + 210) % 360]; }

// Plus hex↔HSL conversion (~40 lines) and contrast ratio (~20 lines)
```

**What the utility module provides:**
1. `hexToHsl()` / `hslToHex()` — color format conversion
2. `hexToRgb()` / `rgbToHex()` — for contrast calculations
3. `generateHarmony(baseHex, type)` — returns palette array
4. `contrastRatio(hex1, hex2)` — WCAG luminance contrast check
5. `adjustLightness(hex, amount)` — generate tints/shades
6. `isReadable(fg, bg, level)` — WCAG AA/AAA check (4.5:1 or 7:1)

**Bonus — Modern CSS color functions (Chromium 136):**
```css
/* CSS can auto-generate tints/shades without any JS: */
--gm-accent-light: color-mix(in oklch, var(--gm-accent), white 30%);
--gm-accent-dark: color-mix(in oklch, var(--gm-accent), black 20%);
```
`color-mix()` in `oklch` is available in Chromium 111+ — we can offload tint/shade generation to CSS itself, keeping JS focused only on harmony algorithm computation.

**Confidence:** HIGH — standard math, well-documented formulas, proven color theory.

### 4. Theme Pack Import/Export — ONE new dependency: `fflate`

**What:** Package theme data (JSON tokens + image files) into a single `.theme` file for sharing.

**Technology:** `fflate` 0.8.2 — pure JavaScript ZIP library.

| Property | Value |
|----------|-------|
| Package | `fflate` |
| Version | 0.8.2 |
| License | MIT |
| Size (gzipped) | ~8KB |
| Size (unpacked) | 773KB (includes TypeScript types + multiple builds) |
| ESM support | ✅ Full (separate node/browser entry points via exports map) |
| Native deps | None (pure JS) |
| Maintenance | Active (GitHub: 101arrowz/fflate) |

**Why fflate (not alternatives):**

| Option | Verdict | Reason |
|--------|---------|--------|
| `fflate` | ✅ **USE THIS** | 8KB runtime, pure JS, ESM, sync+async API |
| `jszip` 3.10.1 | ❌ | 762KB unpacked, heavier API surface, async-only |
| `archiver` | ❌ | Stream-based, designed for Node.js servers, heavy |
| Node.js `zlib` | ❌ | Only handles deflate/gzip streams, NOT the ZIP container format |
| Manual ZIP format | ❌ | ~300+ lines to handle ZIP headers/central directory correctly |
| No ZIP (JSON + base64 images) | ❌ | 33% size overhead, unreadable files, poor UX |
| Folder-based themes | ❌ | Can't share as single file, poor UX |

**Why ZIP at all:** A theme pack contains JSON metadata (~2KB) + 3-8 image files (9-slice borders, button states) at ~10-50KB each. A single `.theme` file that users can share, import, and preview is standard UX for creative tools.

**Where it runs:** Electron main process only (via IPC). The renderer never touches ZIP operations.

```javascript
// Main process — export
import { zipSync, strToU8 } from 'fflate';

function exportTheme(themeData, imageFiles) {
  const files = { 'theme.json': strToU8(JSON.stringify(themeData, null, 2)) };
  for (const [name, buffer] of Object.entries(imageFiles)) {
    files[`images/${name}`] = new Uint8Array(buffer);
  }
  return zipSync(files);
}

// Main process — import
import { unzipSync, strFromU8 } from 'fflate';

function importTheme(zipBuffer) {
  const files = unzipSync(new Uint8Array(zipBuffer));
  const themeJson = JSON.parse(strFromU8(files['theme.json']));
  const images = {};
  for (const [name, data] of Object.entries(files)) {
    if (name.startsWith('images/')) images[name.slice(7)] = Buffer.from(data);
  }
  return { theme: themeJson, images };
}
```

**Confidence:** HIGH — fflate is the standard lightweight ZIP choice, well-maintained, MIT.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Token rendering | CSS custom properties | CSS-in-JS (e.g. styled-components) | Project uses vanilla CSS; engine is pure JS, not React/Vue |
| 9-slice images | CSS `border-image` | Canvas-based 9-slice rendering | Unnecessary complexity; CSS handles this natively |
| Color harmony | Custom HSL utility (~200 LOC) | chroma-js (397KB) | 200 lines vs 397KB dependency for 5 formulas |
| Color harmony | Custom HSL utility | culori (1.1MB) | Academic overkill for a theme picker |
| Tint/shade generation | CSS `color-mix(in oklch, ...)` | JS-based lightness adjustment | Modern CSS does this better and more perceptually uniform |
| Theme file format | ZIP via fflate (8KB) | JSON + base64 images | 33% larger files, poor UX, unreadable |
| Theme file format | ZIP via fflate | jszip (762KB) | 95x larger for same capability |
| Theme file format | ZIP via fflate | Folder-based | Not shareable as single file |

## What NOT to Add

| Don't Add | Why |
|-----------|-----|
| TypeScript | Project constraint — pure JS + JSDoc only |
| chroma-js / tinycolor2 / culori | Color harmony is 200 lines of HSL math |
| CSS-in-JS library | Engine is vanilla JS with DOM manipulation |
| Any UI component library | Editor uses Vue 3 components; engine uses pure DOM |
| PostCSS / Sass / CSS preprocessor | CSS custom properties eliminate the need |
| `@ctrl/tinycolor` | Fork of abandoned tinycolor2, still overkill |
| `color` npm package | Another color lib, same overkill argument |

## Integration Points with Existing Code

### 1. Token → CSS Custom Property Bridge

**Injection point:** `ScriptEngine.js` — after loading `script.json`, apply tokens to `#game-container`:
```javascript
// In ScriptEngine init, after loading script:
if (this.script.ui?.theme?.tokens) {
  const container = document.getElementById('game-container');
  applyTokens(container, this.script.ui.theme.tokens);
}
```

### 2. 9-Slice Images → asset:// Protocol

**No protocol changes needed.** Images stored in `assets/ui/` are already served by `asset://ui/filename.png`. The token value is a full CSS property value:
```json
{
  "--gm-dialogue-border-image": "url('asset://ui/dialogue-frame.png')"
}
```

**Security:** The existing `sanitizeCssValue()` in `sanitize.js` blocks `url()` patterns (line 7: `url\s*\(`). This regex MUST be updated to allow `asset://` URLs specifically while still blocking other URL schemes:
```javascript
// Current (blocks ALL url()):
const CSS_INJECTION_RE = /[;{}]|url\s*\(|expression\s*\(|@import|javascript:|data:/i;

// Needed: Allow asset:// URLs only, block everything else
// Solution: Don't pass URL values through sanitizeCssValue.
// Instead, token renderer handles url() tokens as a special path,
// validating against asset:// prefix before applying.
```

### 3. Theme Data → script.json

**New section in script.json** under `ui.theme`:
```json
{
  "ui": {
    "titleScreen": { "..." },
    "settingsScreen": { "..." },
    "dialogueBox": { "..." },
    "theme": {
      "name": "Default Dark",
      "tokens": {
        "--gm-dialogue-bg": "rgba(8, 8, 20, 0.92)",
        "--gm-dialogue-text": "rgba(255, 255, 255, 0.92)"
      },
      "images": {
        "dialogueBorder": "ui/dialogue-frame.png",
        "buttonNormal": "ui/btn-normal.png",
        "buttonHover": "ui/btn-hover.png",
        "buttonActive": "ui/btn-active.png"
      }
    }
  }
}
```

### 4. Editor Theme Store → Pinia

**Follows existing pattern:** `useScriptStore` already has `getSettingsScreen()`, `getTitleScreen()`, `getDialogueBox()` — add `getTheme()` and `updateTheme()` following the same pattern.

### 5. Theme Pack I/O → IPC Handlers

**Follows existing pattern:** `import-assets` / `export-project` IPC handlers in `electron/main.js`. New handlers:
- `ipcMain.handle('export-theme', ...)` — reads tokens + images, creates ZIP, prompts save dialog
- `ipcMain.handle('import-theme', ...)` — prompts open dialog, unzips, validates, copies images to `assets/ui/`

### 6. CSS Migration — Hardcoded Values → var() with Fallbacks

**The critical refactor:** All hardcoded colors in `style.css` (~600 lines of engine styles) must be replaced with `var(--gm-xxx, <current-value>)`. This is the largest task but is mechanical:

```css
/* BEFORE (current): */
#dialogue-box {
  background: linear-gradient(to top, rgba(8, 8, 20, 0.92) 0%, ...);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* AFTER (themed): */
#dialogue-box {
  background: var(--gm-dialogue-bg, linear-gradient(to top, rgba(8, 8, 20, 0.92) 0%, ...));
  border-top: 1px solid var(--gm-border-color, rgba(255, 255, 255, 0.08));
}
```

**Fallback values = exact current values**, so the refactor is non-breaking. Without a theme applied, everything looks identical to today.

## Installation

```bash
# ONE new dependency (production):
npm install fflate

# No new dev dependencies needed
```

## Token Naming Convention

Prefix all tokens with `--gm-` (galgame maker) to avoid conflicts:

| Token | Controls | Default |
|-------|----------|---------|
| `--gm-dialogue-bg` | Dialogue box background | `linear-gradient(...)` |
| `--gm-dialogue-text` | Dialogue text color | `rgba(255,255,255,0.92)` |
| `--gm-dialogue-name-color` | Speaker name color | `#fff` |
| `--gm-dialogue-border-image` | 9-slice border image | `none` |
| `--gm-dialogue-border-slice` | Border-image slice values | `30 fill` |
| `--gm-button-bg` | Menu/choice button background | `rgba(60,60,100,0.6)` |
| `--gm-button-text` | Button text color | `rgba(255,255,255,0.9)` |
| `--gm-button-hover-bg` | Button hover state | `rgba(100,80,160,0.7)` |
| `--gm-button-image-normal` | Button 9-slice normal | `none` |
| `--gm-button-image-hover` | Button 9-slice hover | `none` |
| `--gm-button-image-active` | Button 9-slice active | `none` |
| `--gm-accent` | Accent color (active states, highlights) | `rgba(180,160,255,0.9)` |
| `--gm-overlay-bg` | Full-screen overlay backgrounds | `rgba(10,10,20,0.95)` |
| `--gm-border-color` | UI border lines | `rgba(255,255,255,0.08)` |
| `--gm-panel-bg` | Panel/card backgrounds | `rgba(30,30,50,0.6)` |
| `--gm-font-body` | Body font family | `'Noto Sans SC', sans-serif` |
| `--gm-font-heading` | Heading/title font family | `'Noto Serif SC', serif` |

Full token list TBD during implementation (~30-50 tokens covering all UI surfaces).

## Chromium 136 CSS Features Available

Features confirmed available in Electron 41's Chromium 136 that are relevant to the theme system:

| Feature | Chrome Version | Use Case |
|---------|---------------|----------|
| CSS Custom Properties (`var()`) | 49+ | Token rendering |
| `border-image` (full) | 15+ | 9-slice panel/button skins |
| `color-mix()` | 111+ | Auto tint/shade generation |
| `oklch()` | 111+ | Perceptually uniform color adjustments |
| `@property` | 85+ | Typed custom properties, animatable tokens |
| `@layer` | 99+ | Theme layer isolation (optional) |
| `:has()` | 105+ | Conditional theming rules (optional) |
| `container queries` | 105+ | Responsive token values (optional) |

**Recommendation:** Use `color-mix(in oklch, ...)` in CSS for tint/shade variants. This is more perceptually correct than HSL lightness adjustment and requires zero JavaScript.

## Sources

- Electron 41 release: Chromium 136 (Electron release cycle pattern — HIGH confidence)
- CSS `border-image`: MDN Web Docs — Chrome 15+ full support
- CSS `color-mix()`: MDN Web Docs — Chrome 111+
- fflate 0.8.2: npm registry — verified via `npm view` (2025-07-14)
- Existing codebase: `style.css` (3 existing `var()` usages), `SettingsScreen.js` (4 `setProperty()` calls), `sanitize.js` (CSS injection prevention), `validateAsset.js` (ui category support), `electron/main.js` (asset:// protocol handler)
- Color harmony theory: HSL color wheel — complementary (180°), analogous (±30°), triadic (±120°), split-complementary (150°/210°) — standard color theory, HIGH confidence

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Design Tokens (CSS custom properties) | HIGH | Already used in 4 JS + 3 CSS locations in codebase |
| 9-Slice (border-image) | HIGH | CSS standard since Chrome 15, well-documented |
| Color Harmony (HSL math) | HIGH | Standard color theory, trivial implementation |
| Theme Pack (fflate ZIP) | HIGH | Package verified on npm, MIT, ESM, actively maintained |
| asset:// integration | HIGH | Protocol already serves `ui/` category images |
| sanitize.js update needed | HIGH | Confirmed: current regex blocks ALL `url()` — must be updated |
| CSS migration scope | MEDIUM | ~600 lines of hardcoded styles need `var()` wrapping — mechanical but large |
