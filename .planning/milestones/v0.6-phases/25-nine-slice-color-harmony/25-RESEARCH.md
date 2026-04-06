# Phase 25: 9-Slice + Color Harmony - Research

**Researched:** 2025-07-22
**Domain:** CSS border-image 9-slice rendering, HSL color harmony algorithms, WCAG contrast validation
**Confidence:** HIGH

## Summary

Phase 25 adds two independent engine capabilities: (1) a 9-slice image system that lets users skin 6 UI element types with `border-image` rendered via `::before` pseudo-elements, and (2) a pure-JS color harmony engine with WCAG accessibility guarantees. Both produce engine-level tools consumed by the Phase 26 editor.

The 9-slice system extends the existing `ThemeManager.js` (Phase 24) with two new functions (`applyNineSlice` / `resetNineSlice`) that manage a dedicated `<style id="galgame-nine-slice">` tag. Each non-null nineSlice config entry generates `::before` CSS rules with `border-image` using base64 Data URLs. Button elements additionally get `:hover::before` and `:active::before` rules for three-state images. The parent element requires `position: relative` (or absolute), `overflow: hidden`, and a stacking context (`isolation: isolate`) to correctly clip the pseudo-element to the border-radius and keep it behind content.

The color harmony system is two standalone modules: `colorHarmony.js` (4 HSL-wheel algorithms generating full token palettes) and `contrast.js` (WCAG 2.x relative luminance contrast ratio + binary-search autoFix). Both are pure functions with zero dependencies, matching the project's established module pattern.

**Primary recommendation:** Build 9-slice CSS generation as a pure function in ThemeManager.js, then add colorHarmony.js and contrast.js as independent modules. Test each module in isolation before wiring into main.js.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `::before` pseudo-element for 9-slice background. Parent keeps `border-radius` + `overflow: hidden` for clipping. `::before` handles `border-image`.
- **D-02:** Dedicated `<style id="galgame-nine-slice">` tag, overwrite `textContent` (not `insertRule()`).
- **D-03:** Base64 Data URL inline in CSS `border-image: url(data:image/png;base64,...)`. Avoids `asset://` protocol issues (P6).
- **D-04:** `border-image-slice` uses unitless numbers + `fill` keyword. Prevents P4 trap.
- **D-05:** All 6 target elements: `dialogueBox`, `menuPanel`, `saveSlot`, `choiceButton`, `titleButton`, `settingsPanel`.
- **D-06:** Button three-state via CSS `:hover` / `:active` pseudo-classes. Inject 3 `::before` rules per button type. No JS event listeners.
- **D-07:** Panel elements have `states: null`; button elements have `states: { hover: { src }, active: { src } }`.
- **D-08:** Pure JS color harmony — `src/engine/colorHarmony.js`, zero external dependencies.
- **D-09:** All 4 HSL algorithms: complementary, analogous, triadic, split-complementary.
- **D-10:** WCAG contrast in `src/engine/contrast.js` — `contrastRatio(hex1, hex2)` + `autoFix(fgHex, bgHex, target)`.
- **D-11:** autoFix uses binary search on lightness, tries both lighter and darker directions, returns closer-to-original result. UI deferred to Phase 26.
- **D-12:** nineSlice schema: `{ src, slice, width, repeat, outset, states }`.
- **D-13:** `src` stores full Data URL string (`data:image/png;base64,...`).
- **D-14:** `ui.theme.nineSlice` structure: `{ dialogueBox, menuPanel, saveSlot, choiceButton, titleButton, settingsPanel }`, each null or schema object.

### Agent's Discretion
- Button three-state CSS pseudo-class rule generation logic details
- colorHarmony.js internal HSL↔Hex conversion implementation
- autoFix binary search precision and iteration cap
- nineSlice `<style>` tag CSS rule selector naming convention
- How `overflow: hidden` and `position: relative` are injected onto UI components

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| 9SL-01 | Dialogue box 9-slice background, auto-stretch at any size | ::before approach with `border-image` on `#dialogue-box`, CSS generation in ThemeManager |
| 9SL-02 | Panel backgrounds (menu/save-load/settings) accept 9-slice | Same ::before pattern for `.game-menu-panel`, `.save-slot`, `#settings-screen` |
| 9SL-03 | Button 9-slice with normal/hover/pressed three-state images | CSS `:hover::before` / `:active::before` rules for `.choice-button`, `.title-button` |
| 9SL-04 | 9-slice + border-radius coexistence (no mutual exclusion) | Parent `overflow: hidden` clips ::before to border-radius; stacking context via `isolation: isolate` |
| CLR-01 | Single primary → full coordinated palette generation | colorHarmony.js generates accent/bg/text/border from one HSL input |
| CLR-02 | 4 harmony algorithms (complementary/analogous/triadic/split-comp) | Pure HSL-wheel math in colorHarmony.js |
| CLR-03 | WCAG contrast validation (≥4.5:1 normal, ≥3:1 large text) | contrast.js with relative luminance + autoFix binary search |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack:** JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript migration
- **Design philosophy:** 开发者不碰逻辑 — all logic engine-built
- **Platform:** Windows priority, macOS compatible
- **Style:** Dark theme, pure CSS, Chinese UI
- **Module pattern:** Named exports only (`export function`), no default exports
- **Import style:** Explicit `.js` extensions, relative paths, ESM only
- **Code style:** 2-space indent, single quotes, semicolons always
- **Error handling:** `try/catch` at boundaries, `console.error` with `[ModuleName]` prefix
- **Comments:** File-level JSDoc, section dividers `// ─── Section ───────`
- **Zero new npm dependencies** for this phase

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None (pure JS) | — | All 9-slice + color algorithms | D-08: zero deps; project convention from v0.5 |

### Supporting (Existing)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ThemeManager.js | Phase 24 | Token injection via CSS vars | Extended with applyNineSlice/resetNineSlice |
| tokens.js | Phase 23 | 41 DEFAULT_TOKENS | Reference for palette → token mapping |
| script.js store | Phase 24 | getTheme/updateTheme | nineSlice data flows through same store path |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure JS color | chroma.js / color.js | Would add dependency; project bans new npm deps |
| CSS border-image | Canvas-drawn 9-slice | Would need rendering loop; DOM-based engine doesn't use canvas for UI |
| `<style>` textContent | CSSStyleSheet.insertRule() | insertRule requires index management; textContent simpler (D-02) |

## Architecture Patterns

### New File Structure
```
src/engine/
├── ThemeManager.js    # MODIFY — add applyNineSlice(), resetNineSlice()
├── colorHarmony.js    # NEW — 4 HSL algorithms + palette generation
├── contrast.js        # NEW — WCAG contrastRatio + autoFix
└── tokens.js          # EXISTING — DEFAULT_TOKENS reference
```

### Pattern 1: Nine-Slice CSS Generation (ThemeManager extension)

**What:** `applyNineSlice(themeData)` builds CSS text and injects via `<style>` tag.
**When to use:** Called on init, preview start, and `update-theme` message.

```javascript
// Selector map — nineSlice config keys → CSS selectors
const NINE_SLICE_SELECTORS = {
  dialogueBox:   '#dialogue-box',
  menuPanel:     '.game-menu-panel',
  saveSlot:      '.save-slot',
  choiceButton:  '.choice-button',
  titleButton:   '.title-button',
  settingsPanel: '#settings-screen',
};

// Button keys that support 3-state
const BUTTON_KEYS = new Set(['choiceButton', 'titleButton']);
```

**CSS Generation:**
```javascript
/**
 * Build CSS text for all configured nineSlice entries.
 * @param {object} nineSlice — the ui.theme.nineSlice object
 * @returns {string} Complete CSS text
 */
function buildNineSliceCSS(nineSlice) {
  if (!nineSlice) return '';
  let css = '';

  for (const [key, selector] of Object.entries(NINE_SLICE_SELECTORS)) {
    const config = nineSlice[key];
    if (!config?.src) continue;

    // Parent setup: overflow:hidden + isolation for stacking context
    css += `${selector} { overflow: hidden; isolation: isolate; }\n`;

    // Normal state ::before
    const slice = (config.slice || [0, 0, 0, 0]).join(' ') + ' fill';
    const width = (config.width || config.slice || [0, 0, 0, 0]).map(v => v + 'px').join(' ');
    const outset = (config.outset || [0, 0, 0, 0]).map(v => v + 'px').join(' ');
    const repeat = config.repeat || 'stretch';

    css += `${selector}::before {\n`;
    css += `  content: '';\n`;
    css += `  position: absolute;\n`;
    css += `  inset: 0;\n`;
    css += `  z-index: 0;\n`;
    css += `  border-image: url("${config.src}") ${slice} / ${width} / ${outset} ${repeat};\n`;
    css += `  pointer-events: none;\n`;
    css += `}\n`;

    // Button 3-state rules
    if (BUTTON_KEYS.has(key) && config.states) {
      if (config.states.hover?.src) {
        css += `${selector}:hover::before {\n`;
        css += `  border-image-source: url("${config.states.hover.src}");\n`;
        css += `}\n`;
      }
      if (config.states.active?.src) {
        css += `${selector}:active::before {\n`;
        css += `  border-image-source: url("${config.states.active.src}");\n`;
        css += `}\n`;
      }
    }
  }

  return css;
}
```

**Style tag management:**
```javascript
export function applyNineSlice(themeData) {
  let styleEl = document.getElementById('galgame-nine-slice');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'galgame-nine-slice';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildNineSliceCSS(themeData?.nineSlice);
}

export function resetNineSlice() {
  const styleEl = document.getElementById('galgame-nine-slice');
  if (styleEl) styleEl.textContent = '';
}
```

### Pattern 2: CSS Selector Prerequisite Setup

**What:** Certain target elements need CSS property additions for `::before` to work.
**Critical insight:** The `<style id="galgame-nine-slice">` itself injects the `overflow: hidden` and `isolation: isolate` rules conditionally — only when a 9-slice config is active for that element. This avoids permanently modifying style.css for elements that may not have 9-slice applied.

**Position status of each target element (verified from style.css):**

| Target | Selector | Current `position` | Has Containing Block? | Needs Change? |
|--------|----------|--------------------|-----------------------|---------------|
| dialogueBox | `#dialogue-box` | `absolute` | ✓ | No |
| menuPanel | `.game-menu-panel` | `static` (none set) | ✗ | Yes — add `position: relative` |
| saveSlot | `.save-slot` | `relative` | ✓ | No |
| choiceButton | `.choice-button` | `static` (none set) | ✗ | Yes — add `position: relative` |
| titleButton | `.title-button` | `static` (none set) | ✗ | Yes — add `position: relative` |
| settingsPanel | `#settings-screen` | `absolute` | ✓ | No |

**Solution:** The generated CSS in `buildNineSliceCSS` should also inject `position: relative` for elements that need it. This can be added to the same parent rule that sets `overflow: hidden` and `isolation: isolate`:

```css
/* Generated when nineSlice.choiceButton is configured */
.choice-button { position: relative; overflow: hidden; isolation: isolate; }
.choice-button::before { ... }
```

### Pattern 3: z-index Strategy for ::before

**Critical finding:** Using `z-index: -1` on `::before` is DANGEROUS when the parent lacks a stacking context. Without a stacking context, `z-index: -1` puts the pseudo-element behind ALL ancestors, making it invisible.

**Solution:** Use `isolation: isolate` on the parent (injected in the generated CSS) to create a stacking context. Then use `z-index: 0` on `::before` — this places it at the base of the parent's stacking context, behind text content (which is at the default `auto` z-index but painted after `z-index: 0` elements in normal flow).

**Wait — correction:** With `z-index: 0` on `::before`, it would paint ON TOP of the parent background but the content elements need to also participate in the stacking context. The correct approach:

- Parent: `isolation: isolate` (creates stacking context)
- `::before`: `z-index: -1` (safely behind content, but still inside parent's stacking context thanks to `isolation`)

This is the standard pattern. `isolation: isolate` is specifically designed for this use case.

### Pattern 4: backdrop-filter Handling

**What:** When 9-slice is active on an element, its existing `backdrop-filter: blur()` becomes invisible (image is opaque) but still costs GPU. The generated CSS should disable it.

**Elements with backdrop-filter (from style.css audit):**
- `#dialogue-box` (line 184)
- `.choice-button` (line 321)
- `#settings-screen` (line 728-729)
- `#game-menu` (line 1179) — note: this is the fullscreen overlay, not `.game-menu-panel`

**Solution:** Add `backdrop-filter: none` to the parent rule in generated CSS when 9-slice is active:

```css
#dialogue-box {
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
```

### Pattern 5: Color Harmony Module (colorHarmony.js)

**What:** Pure-function module exporting palette generation from a single primary color.

```javascript
// src/engine/colorHarmony.js

// ─── HSL ↔ Hex Conversion ─────────────────────────────

/** @param {string} hex — '#rrggbb' or '#rgb' */
export function hexToHsl(hex) { /* ... */ }

/** @param {number} h — 0-360, @param {number} s — 0-100, @param {number} l — 0-100 */
export function hslToHex(h, s, l) { /* ... */ }

// ─── Harmony Algorithms ────────────────────────────────

/**
 * @param {number} h — base hue 0-360
 * @returns {number[]} array of harmony hues
 */
export function complementary(h) {
  return [h, (h + 180) % 360];
}

export function analogous(h) {
  return [(h + 330) % 360, h, (h + 30) % 360];
}

export function triadic(h) {
  return [h, (h + 120) % 360, (h + 240) % 360];
}

export function splitComplementary(h) {
  return [h, (h + 150) % 360, (h + 210) % 360];
}

// ─── Palette Generation ────────────────────────────────

/**
 * Generate a full token-compatible palette from one primary color.
 * @param {string} primaryHex — '#rrggbb'
 * @param {'complementary'|'analogous'|'triadic'|'split-complementary'} algorithm
 * @returns {object} — partial tokens object { primary, accent, ... }
 */
export function generatePalette(primaryHex, algorithm) { /* ... */ }
```

**Palette mapping strategy:** From the harmony hues, derive:
- `primary` = base color at S=70-80%, L=60-70% for dark themes
- `accent` = second harmony hue, slightly different saturation
- `text` = very light (L≥90%) for dark bg readability
- `text-secondary` = slightly muted text
- `bg` (dialogue-bg, panel-bg) = very dark desaturated (L=5-10%) versions of base
- `border` = very low opacity version of primary
- `btn-bg` = medium-dark version of base
- `btn-hover-bg` = slightly brighter version

### Pattern 6: WCAG Contrast Module (contrast.js)

**What:** Standards-compliant contrast checking with auto-fix capability.

```javascript
// src/engine/contrast.js

// ─── sRGB Linearization ────────────────────────────────

function linearize(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// ─── Relative Luminance (WCAG 2.x) ────────────────────

function relativeLuminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// ─── Public API ────────────────────────────────────────

/**
 * Calculate WCAG 2.x contrast ratio between two colors.
 * @param {string} hex1 — '#rrggbb'
 * @param {string} hex2 — '#rrggbb'
 * @returns {number} — ratio ≥ 1.0 (e.g., 4.5 means 4.5:1)
 */
export function contrastRatio(hex1, hex2) {
  const L1 = relativeLuminance(...hexToRgb(hex1));
  const L2 = relativeLuminance(...hexToRgb(hex2));
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Auto-fix foreground color to meet target contrast ratio against background.
 * Uses binary search on HSL lightness, trying both lighter and darker.
 * Returns the direction closer to the original color.
 *
 * @param {string} fgHex — foreground '#rrggbb'
 * @param {string} bgHex — background '#rrggbb'
 * @param {number} [target=4.5] — minimum contrast ratio
 * @returns {{ hex: string, ratio: number, direction: 'lighter'|'darker' }|null}
 */
export function autoFix(fgHex, bgHex, target = 4.5) {
  // 1. Check if already passes
  // 2. Binary search lighter (L → 100)
  // 3. Binary search darker (L → 0)
  // 4. Return closer to original
}
```

**Binary search details:**
- Convert fg to HSL
- For lighter: search L between current and 100 (max 20 iterations, precision ε=0.5)
- For darker: search L between 0 and current
- Compare distance from original L: `|result.L - original.L|`
- Return the candidate with smaller distance
- If neither direction achieves target, return null (rare edge case: target too high for any same-hue color)

### Anti-Patterns to Avoid

- **Never use `insertRule()` for 9-slice CSS** — index management is fragile; `textContent` overwrite is atomic (D-02)
- **Never store asset:// paths in nineSlice.src** — base64 Data URLs only (D-03)
- **Never add `px` to border-image-slice** — unitless numbers only (D-04, P4)
- **Never use JS event listeners for button 3-state** — pure CSS `:hover`/`:active` on `::before` (D-06)
- **Never put z-index: -1 on ::before without ensuring parent stacking context** — use `isolation: isolate`
- **Never build custom color math** when standard sRGB linearization formula exists — use the exact WCAG 2.x spec

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| sRGB linearization | Custom gamma curve | Standard formula: `c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4` | WCAG spec defines exact formula; deviation = wrong results |
| Contrast ratio | Naive RGB difference | WCAG relative luminance formula | Human perception ≠ numeric RGB distance |
| HSL ↔ RGB conversion | Simplified approximation | Standard cylindrical conversion | Edge cases at S=0, L=0/100 must be handled correctly |
| CSS stacking context | Manual z-index tuning | `isolation: isolate` | Purpose-built CSS property for exactly this scenario |

**Key insight:** The WCAG contrast algorithm is a precise mathematical specification. Any deviation (wrong gamma, wrong luminance coefficients) produces incorrect accessibility results. Copy the formula exactly.

## Common Pitfalls

### Pitfall 1: Stacking Context Required for z-index: -1 on ::before
**What goes wrong:** `::before` with `z-index: -1` is placed behind the parent AND all ancestors when no stacking context exists. The 9-slice background becomes completely invisible.
**Why it happens:** `z-index` on positioned pseudo-elements is resolved against the nearest stacking context ancestor. Without one, it goes behind everything up to the root.
**How to avoid:** Always set `isolation: isolate` on the parent element in the generated CSS. This creates a stacking context without any side effects (unlike `z-index: 0` which requires `position`).
**Warning signs:** 9-slice image not visible despite correct CSS; only visible in elements that happen to have `opacity < 1` or `transform` set.

### Pitfall 2: border-image-slice Must Be Unitless (P4)
**What goes wrong:** `border-image-slice: 20px` is invalid CSS — silently fails. The image either stretches as a single tile or disappears entirely.
**Why it happens:** Unlike every other CSS length property, `border-image-slice` only accepts unitless numbers (representing pixels in the source image coordinate space) or percentages.
**How to avoid:** Validate/strip `px` suffix when reading slice values: `parseInt(value, 10)`. Always append `fill` keyword for center fill.
**Warning signs:** 9-slice image appears as a single stretched image or shows transparent center.

### Pitfall 3: backdrop-filter Performance Waste with Opaque 9-Slice
**What goes wrong:** Elements with `backdrop-filter: blur(8px)` continue to GPU-composite the blur even when a fully opaque 9-slice image covers them. No visual effect, pure waste.
**Why it happens:** The browser doesn't optimize away backdrop-filter just because a pseudo-element covers the area.
**How to avoid:** Generated CSS sets `backdrop-filter: none; -webkit-backdrop-filter: none;` on elements that receive a 9-slice background.
**Warning signs:** Performance degradation on lower-end devices when many 9-slice elements are visible.

### Pitfall 4: HSL Lightness ≠ Perceived Brightness
**What goes wrong:** Color harmony algorithms generate colors that look similar brightness despite different HSL lightness values. Pure blue `hsl(240, 100%, 50%)` appears much darker than pure yellow `hsl(60, 100%, 50%)`.
**Why it happens:** HSL lightness is a mathematical construct, not a perceptual one. WCAG uses relative luminance which accounts for this (green channel weighted 71.52%, blue only 7.22%).
**How to avoid:** After generating harmony colors, validate EVERY text-on-background pair with `contrastRatio()`. The autoFix function compensates by adjusting lightness until the WCAG target is met.
**Warning signs:** Generated palette has sufficient HSL lightness spread but fails WCAG contrast checks.

### Pitfall 5: overflow:hidden May Clip Existing Element Content
**What goes wrong:** Adding `overflow: hidden` to elements that have content extending beyond their bounds (tooltips, dropdown shadows, delete buttons on hover) clips that content.
**Why it happens:** `overflow: hidden` clips ALL child content to the element's border-box.
**How to avoid:** Audit each target element for content that extends outside bounds:
- `.save-slot` — has `.save-slot-delete` button that may have hover/active effects extending outside. Current CSS shows `position: absolute; top: 8px; right: 8px` — this is INSIDE the slot, so safe.
- `.choice-button:hover` — has `transform: translateY(-2px)` which pushes UP outside bounds. This will be clipped by `overflow: hidden`. **The generated CSS should not set overflow:hidden on choice-button if the hover transform is desired.** Alternatively, add a small negative `margin-top` or adjust the hover effect.
**Warning signs:** Hover effects on buttons appear "cut off" at the top edge.

### Pitfall 6: `::before` Pseudo-element Conflicts with Existing Content
**What goes wrong:** If any target element already has a `::before` rule in style.css or generated elsewhere, the 9-slice CSS would conflict.
**Why it happens:** An element can only have one `::before` pseudo-element.
**How to avoid:** Audit style.css for existing `::before` rules on target selectors. (Verified: no target element currently uses `::before` — only the global reset `*::before` at line 10.)
**Warning signs:** Existing decorative pseudo-elements disappear when 9-slice is applied.

## Code Examples

### Example 1: Complete applyNineSlice Function

```javascript
// Source: CONTEXT.md D-02, D-03, D-04, D-06

const NINE_SLICE_SELECTORS = {
  dialogueBox:   '#dialogue-box',
  menuPanel:     '.game-menu-panel',
  saveSlot:      '.save-slot',
  choiceButton:  '.choice-button',
  titleButton:   '.title-button',
  settingsPanel: '#settings-screen',
};

const BUTTON_KEYS = new Set(['choiceButton', 'titleButton']);

// Elements that need position:relative added (currently static)
const NEEDS_POSITION = new Set(['menuPanel', 'choiceButton', 'titleButton']);

// Elements that have backdrop-filter to disable
const HAS_BACKDROP = new Set(['dialogueBox', 'choiceButton', 'settingsPanel']);

function buildNineSliceCSS(nineSlice) {
  if (!nineSlice) return '';
  const rules = [];

  for (const [key, selector] of Object.entries(NINE_SLICE_SELECTORS)) {
    const config = nineSlice[key];
    if (!config?.src) continue;

    // Parent setup
    const parentProps = ['overflow: hidden', 'isolation: isolate'];
    if (NEEDS_POSITION.has(key)) parentProps.push('position: relative');
    if (HAS_BACKDROP.has(key)) {
      parentProps.push('backdrop-filter: none');
      parentProps.push('-webkit-backdrop-filter: none');
    }
    rules.push(`${selector} { ${parentProps.join('; ')}; }`);

    // ::before — normal state
    const slice = (config.slice || [0, 0, 0, 0]).join(' ') + ' fill';
    const width = (config.width || config.slice || [0, 0, 0, 0])
      .map(v => v + 'px').join(' ');
    const outset = (config.outset || [0, 0, 0, 0])
      .map(v => v + 'px').join(' ');
    const repeat = config.repeat || 'stretch';

    rules.push(
      `${selector}::before {` +
      ` content: ''; position: absolute; inset: 0; z-index: -1;` +
      ` border-image: url("${config.src}") ${slice} / ${width} / ${outset} ${repeat};` +
      ` pointer-events: none; }`
    );

    // Button 3-state
    if (BUTTON_KEYS.has(key) && config.states) {
      if (config.states.hover?.src) {
        rules.push(
          `${selector}:hover::before {` +
          ` border-image-source: url("${config.states.hover.src}"); }`
        );
      }
      if (config.states.active?.src) {
        rules.push(
          `${selector}:active::before {` +
          ` border-image-source: url("${config.states.active.src}"); }`
        );
      }
    }
  }

  return rules.join('\n');
}
```

### Example 2: WCAG Relative Luminance + Contrast Ratio

```javascript
// Source: WCAG 2.x specification

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function linearize(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(hex1, hex2) {
  const L1 = relativeLuminance(...hexToRgb(hex1));
  const L2 = relativeLuminance(...hexToRgb(hex2));
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}
```

### Example 3: HSL ↔ Hex Conversion

```javascript
// Source: standard cylindrical-coordinate color model

export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map(c => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) return [0, 0, Math.round(l * 100)];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
```

### Example 4: autoFix Binary Search

```javascript
// Source: CONTEXT.md D-11

const MAX_ITERATIONS = 20;
const PRECISION = 0.5; // lightness precision

export function autoFix(fgHex, bgHex, target = 4.5) {
  if (contrastRatio(fgHex, bgHex) >= target) {
    return { hex: fgHex, ratio: contrastRatio(fgHex, bgHex), direction: 'none' };
  }

  const [h, s, origL] = hexToHsl(fgHex);

  // Try lighter direction
  const lighter = binarySearchL(h, s, origL, 100, bgHex, target);
  // Try darker direction
  const darker = binarySearchL(h, s, 0, origL, bgHex, target);

  if (!lighter && !darker) return null;
  if (!lighter) return darker;
  if (!darker) return lighter;

  // Return the one closer to original lightness
  return Math.abs(lighter.l - origL) <= Math.abs(darker.l - origL)
    ? lighter : darker;
}

function binarySearchL(h, s, lo, hi, bgHex, target) {
  let resultHex = null;
  let resultL = null;
  let resultRatio = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    const hex = hslToHex(h, s, mid);
    const ratio = contrastRatio(hex, bgHex);

    if (ratio >= target) {
      resultHex = hex;
      resultL = mid;
      resultRatio = ratio;
      // Try to get closer to original
      hi = mid; // or lo = mid depending on direction
    } else {
      lo = mid; // or hi = mid
    }

    if (hi - lo < PRECISION) break;
  }

  if (!resultHex) return null;
  return {
    hex: resultHex,
    ratio: resultRatio,
    l: resultL,
    direction: resultL > (lo + hi) / 2 ? 'lighter' : 'darker',
  };
}
```

### Example 5: Palette Generation

```javascript
// Source: CONTEXT.md D-09, CLR-01

const ALGORITHMS = {
  complementary,
  analogous,
  triadic,
  'split-complementary': splitComplementary,
};

/**
 * Generate a complete token-compatible palette from one primary hex color.
 * @param {string} primaryHex — '#rrggbb'
 * @param {string} algorithm — one of 'complementary', 'analogous', 'triadic', 'split-complementary'
 * @returns {object} — partial tokens suitable for spreading into ui.theme.tokens
 */
export function generatePalette(primaryHex, algorithm = 'complementary') {
  const [h, s, l] = hexToHsl(primaryHex);
  const hues = ALGORITHMS[algorithm](h);

  // Primary role = first hue
  const primary = hslToHex(hues[0], Math.min(s, 80), clamp(l, 55, 75));
  const primarySubtle = hslToHex(hues[0], Math.min(s, 30), 15);

  // Accent role = second hue (or third if available)
  const accentHue = hues.length > 1 ? hues[1] : (h + 180) % 360;
  const accent = hslToHex(accentHue, Math.min(s, 70), 60);

  // Background = very dark desaturated base
  const panelBg = hslToHex(hues[0], Math.min(s, 20), 6);
  const dialogueBg = hslToHex(hues[0], Math.min(s, 15), 5);
  const cardBg = hslToHex(hues[0], Math.min(s, 25), 12);

  // Text = near-white
  const text = hslToHex(hues[0], 5, 95);
  const textSecondary = hslToHex(hues[0], 5, 78);
  const textMuted = hslToHex(hues[0], 5, 55);

  // Borders
  const border = hslToHex(hues[0], Math.min(s, 20), 20);
  const borderHover = hslToHex(hues[0], Math.min(s, 60), 45);

  // Buttons
  const btnBg = hslToHex(hues[0], Math.min(s, 40), 25);
  const btnHoverBg = hslToHex(hues[0], Math.min(s, 55), 35);

  return {
    primary, 'primary-subtle': primarySubtle,
    accent,
    'panel-bg': panelBg, 'dialogue-bg': dialogueBg,
    'card-bg': cardBg,
    text, 'text-secondary': textSecondary, 'text-muted': textMuted,
    border, 'border-hover': borderHover,
    'btn-bg': btnBg, 'btn-hover-bg': btnHoverBg,
    // ... map to all 41 DEFAULT_TOKENS keys
  };
}
```

## Integration Points

### main.js Modifications

```javascript
// Import additions
import { applyTheme, resetTheme } from './engine/ThemeManager.js';
// ADD:
import { applyNineSlice, resetNineSlice } from './engine/ThemeManager.js';

// In init() — after applyTheme:
applyTheme(gameContainer, engine.script.ui?.theme);
applyNineSlice(engine.script.ui?.theme);  // ADD

// In initPreview() 'start' handler — after applyTheme:
applyTheme(gameContainer, engine.script.ui?.theme);
applyNineSlice(engine.script.ui?.theme);  // ADD

// In 'update-theme' handler:
case 'update-theme': {
  applyTheme(gameContainer, msg.theme);
  applyNineSlice(msg.theme);  // ADD
  break;
}
```

### Data Flow

```
Editor (Phase 26)
  ↓ updateTheme({ tokens: {...}, nineSlice: {...} })
  ↓ postMessage({ type: 'update-theme', theme: {...} })
Engine main.js
  ↓ applyTheme(container, themeData)   → CSS vars on #game-container
  ↓ applyNineSlice(themeData)          → <style> tag with ::before rules
DOM
  → #dialogue-box::before { border-image: url(base64...) ... }
  → .choice-button::before { border-image: url(base64...) ... }
  → .choice-button:hover::before { border-image-source: url(base64...) }
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (project has no test framework) |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| 9SL-01 | Dialogue box 9-slice stretches at any size | manual | Visual inspection in preview | ❌ manual |
| 9SL-02 | Panel 9-slice backgrounds | manual | Visual inspection | ❌ manual |
| 9SL-03 | Button 3-state 9-slice (normal/hover/pressed) | manual | Visual hover/click test | ❌ manual |
| 9SL-04 | 9-slice + border-radius coexistence | manual | Visual check rounded corners + image | ❌ manual |
| CLR-01 | Primary → full palette generation | unit | `node -e "..."` inline test | ❌ Wave 0 |
| CLR-02 | 4 harmony algorithms produce correct hues | unit | `node -e "..."` inline test | ❌ Wave 0 |
| CLR-03 | WCAG contrast ≥4.5:1 / ≥3:1 validation | unit | `node -e "..."` inline test | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Visual inspection in Electron preview window
- **Per wave merge:** Full manual walkthrough of all 6 element types + color generation
- **Phase gate:** All 6 elements display 9-slice correctly; contrast.js returns correct ratios for known test pairs

### Wave 0 Gaps
- No test framework installed — unit tests for colorHarmony.js and contrast.js would need inline Node.js validation or a test runner
- Visual 9-slice tests are manual-only (CSS rendering cannot be unit tested without browser)
- **Recommendation:** Include inline smoke-test assertions in the modules themselves (guarded by `import.meta.url` check or similar) — or verify manually with known values in the plan verification step

## Open Questions

1. **`overflow: hidden` vs `.choice-button:hover { transform: translateY(-2px) }`**
   - What we know: The choice button has a hover lift effect that translates 2px upward. With `overflow: hidden` on the button, this visual lift is clipped at the top edge.
   - What's unclear: Is the visual clip noticeable at only 2px? The transform is on the button itself, not its children. Actually — `overflow: hidden` clips CHILDREN, not the element's own transform. `transform` on the element itself is not clipped by its own `overflow`. **Resolved: this is not actually an issue.** The element's own `transform` shifts the entire box; `overflow: hidden` only clips child content and pseudo-elements.

2. **Base64 Data URL size in CSS `<style>` tag**
   - What we know: D-03 says images typically <100KB. A 100KB PNG = ~133KB base64. With 6 elements × 3 states max = ~18 URLs. In practice, most will be null.
   - What's unclear: Is there a browser limit on `<style>` tag textContent size?
   - Recommendation: Chromium has no practical limit for inline style content. 1MB of CSS in a single `<style>` tag is fine. But if all 6 elements + button states are configured, that's potentially ~800KB of base64 strings. Should work but worth noting for future optimization.

3. **Game menu: 9-slice on `.game-menu-panel` vs `#game-menu`**
   - What we know: D-05/D-14 specifies `menuPanel` → `.game-menu-panel` (the inner content panel), NOT `#game-menu` (the fullscreen dark overlay).
   - Recommendation: This is correct. The outer `#game-menu` is a fullscreen positioning/dimming container. The `.game-menu-panel` is the visible panel with buttons. 9-slice applies to the panel.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of `src/style.css`, `src/engine/ThemeManager.js`, `src/engine/tokens.js`, `src/main.js`, `src/ui/*.js`
- `.planning/research/ARCHITECTURE.md` — 9-slice data schema, ::before approach, component targets
- `.planning/research/PITFALLS.md` — P3 (border-image vs border-radius), P4 (unitless slice), P6 (asset:// protocol), P7 (backdrop-filter), P8 (color harmony dark theme), P14 (button 3-state transitions)
- WCAG 2.x specification for contrast ratio algorithm (well-established standard)
- CSS Backgrounds and Borders Level 3 specification — `border-image-slice` syntax

### Secondary (MEDIUM confidence)
- Phase 24 CONTEXT.md — confirmed applyTheme/resetTheme pure function pattern, D-02 nineSlice pre-reserved
- Phase 23 CONTEXT.md — 41 token vocabulary, CSS var() fallback pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external deps, pure JS modules following established project patterns
- Architecture: HIGH — based on direct analysis of 6 target elements' CSS, verified position/overflow status
- 9-slice CSS: HIGH — ::before + border-image is well-documented CSS spec; `isolation: isolate` is standard
- Color harmony: HIGH — HSL wheel algorithms are standard color theory; WCAG formula is a W3C specification
- Pitfalls: HIGH — verified each through codebase analysis of exact CSS properties and element states

**Research date:** 2025-07-22
**Valid until:** 2025-09-22 (stable domain — CSS specs and color math don't change)
