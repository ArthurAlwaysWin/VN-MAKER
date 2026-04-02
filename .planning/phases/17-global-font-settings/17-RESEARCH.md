# Phase 17: Global Font Settings - Research

**Researched:** 2026-04-02
**Domain:** CSS custom properties, font management, Vue 3 reactive data → vanilla JS engine bridge
**Confidence:** HIGH

## Summary

Phase 17 adds global dialogue box typography settings — fontSize, fontFamily, textColor, nameplateFontSize — stored in `script.json` under `ui.dialogueBox`, consumed by the engine's `DialogueBox.js` via CSS custom properties, edited through a new Vue 3 panel in the editor, and live-previewed on the `PageCanvas.vue` dialogue box.

The existing codebase already has every building block needed. Font loading infrastructure (`fontLoader.js` + `assets.js` fontMeta/fontFamilies) is complete. The engine `DialogueBox._applyStyle()` already handles inline fontSize/fontFamily/textColor. The `script.js` Pinia store already has the `getSettingsScreen()`/`updateSettingsScreen()` pattern for UI sub-objects under `script.json → ui.*`. The `SettingsDesigner.vue` property panel demonstrates font dropdown + color picker + number input patterns. No new npm dependencies are needed.

**Primary recommendation:** Follow the existing `ui.settingsScreen` → `getSettingsScreen()` / `updateSettingsScreen()` pattern exactly: add `ui.dialogueBox` with getter/setter in script store, create a dedicated `DialogueBoxSettings.vue` component (either a new editor tab section or an inspector panel section), read settings at engine init via CSS custom properties on `#dialogue-box`, and apply them reactively in PageCanvas via computed styles.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FONT-01 | `script.json` stores dialogueBox font settings with sensible defaults | `ui.dialogueBox` schema following `ui.settingsScreen` pattern in script store; defaults defined in shared constants |
| FONT-02 | Engine DialogueBox renders text using global font settings via CSS custom properties | `DialogueBox._applyStyle()` already accepts fontSize/fontFamily/textColor; extend constructor to read `ui.dialogueBox` and set CSS custom props on `#dialogue-box` |
| FONT-03 | Editor font settings UI — font dropdown, size slider, color picker, nameplate size | Reuse `fontFamilies` computed from asset store + system font fallbacks; UI controls follow SettingsDesigner.vue patterns |
| FONT-04 | Changing font settings in editor immediately updates canvas dialogue box preview | PageCanvas reads `script.data.ui.dialogueBox` reactively via computed style; no iframe needed for live preview |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript
- **Vue style**: `<script setup>` Composition API, Pinia stores
- **Design principle**: Creator doesn't touch logic — engine handles all game logic
- **UI**: Dark theme, Chinese labels, VS Code-inspired color scheme
- **Dependencies**: No new npm packages unless absolutely necessary
- **Imports**: Always use explicit `.js` extensions, named exports only
- **Security**: `sanitizeCssValue()` on all user-provided CSS strings, `clampField()` on numerics
- **Error handling**: `{ success, error? }` pattern, never throw uncaught
- **Naming**: PascalCase files for classes, camelCase for composables with `use` prefix
- **Comments**: File-level JSDoc block, section dividers `// ─── Section ───────`

## Standard Stack

### Core (already in project — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | Editor UI components | Already used project-wide |
| Pinia | ^3.0.4 | Script store state management | Already used for all stores |
| CSS Custom Properties | native | Engine font styling bridge | Zero-dependency, works in vanilla JS |
| FontFace API | native | Loading imported fonts | Already used in fontLoader.js |

### Supporting (already present)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fontLoader.js | internal | Load user-imported fonts via FontFace API | Font dropdown needs loaded fonts |
| sanitize.js | internal | CSS injection prevention | All user font values must be sanitized |
| assets.js store | internal | `fontFamilies` computed for dropdown | Font family dropdown data source |

### No New Dependencies Needed

This phase is entirely achievable with existing project infrastructure. CSS custom properties replace the need for any styling library. The `<input type="color">` native element (already used in SettingsDesigner) handles color picking. Range inputs handle sliders.

**Installation:** None required.

## Architecture Patterns

### Data Schema Location in script.json

```
script.json → ui.dialogueBox = {
  fontSize: 18,           // px, dialogue text size (default: 18, matching current CSS)
  fontFamily: null,        // null = use CSS default ('Noto Sans SC'), string = custom font family
  textColor: null,         // null = use CSS default (rgba(255,255,255,0.92)), string = hex color
  nameplateFontSize: 20,   // px, speaker name size (default: 20, matching current CSS)
}
```

**Why these defaults match current CSS:**
- `.dialogue-text { font-size: 18px }` → `fontSize: 18`
- `.dialogue-speaker-name { font-size: 20px }` → `nameplateFontSize: 20`
- `.dialogue-text { color: rgba(255,255,255,0.92) }` → `textColor: null` (null = CSS default)
- `body { font-family: 'Noto Sans SC'... }` → `fontFamily: null` (null = CSS default)

**Schema design principle:** `null` values mean "use CSS defaults" — this ensures backward compatibility with existing projects that have no `ui.dialogueBox` section.

### Pattern 1: Script Store Getter/Setter (matches existing pattern)

**What:** Add `getDialogueBox()` and `updateDialogueBox()` to `script.js` store, following the exact pattern of `getSettingsScreen()` / `updateSettingsScreen()`.

**When to use:** Any new `ui.*` sub-object in script.json.

**Example:**
```javascript
// In src/editor/stores/script.js
/** Get or initialize the ui.dialogueBox section */
function getDialogueBox() {
  if (!data.value) return null;
  data.value.ui ??= {};
  data.value.ui.dialogueBox ??= {
    fontSize: 18,
    fontFamily: null,
    textColor: null,
    nameplateFontSize: 20,
  };
  return data.value.ui.dialogueBox;
}

/** Replace the entire dialogueBox settings and push undo state */
function updateDialogueBox(dialogueBox) {
  if (!data.value) return;
  data.value.ui ??= {};
  data.value.ui.dialogueBox = dialogueBox;
  pushState();
}
```

### Pattern 2: Engine Consumption via CSS Custom Properties

**What:** At engine init, read `ui.dialogueBox` from script data and set CSS custom properties on `#dialogue-box`. The DialogueBox constructor or a new `applyGlobalStyle()` method reads the settings once at startup.

**When to use:** Global visual settings that affect vanilla JS UI components.

**Why CSS custom properties:** The engine is vanilla JS with DOM manipulation. CSS custom properties let us set values once at a parent level and have them cascade to child elements, matching how `dialogueOpacity` already works in `main.js`:
```javascript
dlgEl.style.setProperty('--dialogue-opacity', config.get('dialogueOpacity'));
```

**Example:**
```javascript
// In DialogueBox.js — new method
applyGlobalStyle(settings) {
  if (!settings) return;
  const el = this.el;

  // Font size for dialogue text
  if (settings.fontSize) {
    const fs = clampField('fontSize', settings.fontSize);
    if (fs) this.textEl.style.fontSize = fs + 'px';
  }

  // Font family
  const ff = sanitizeCssValue(settings.fontFamily);
  if (ff) this.textEl.style.fontFamily = ff;

  // Text color
  const tc = sanitizeCssValue(settings.textColor);
  if (tc) this.textEl.style.color = tc;

  // Nameplate font size
  if (settings.nameplateFontSize) {
    const nfs = clampField('fontSize', settings.nameplateFontSize);
    if (nfs) this.nameEl.style.fontSize = nfs + 'px';
  }
}
```

**Alternatively (CSS custom properties approach):**
```javascript
// Set CSS custom properties on the dialogue box element
applyGlobalStyle(settings) {
  if (!settings) return;
  const el = this.el;
  if (settings.fontSize) el.style.setProperty('--dlg-font-size', settings.fontSize + 'px');
  if (settings.fontFamily) el.style.setProperty('--dlg-font-family', sanitizeCssValue(settings.fontFamily));
  if (settings.textColor) el.style.setProperty('--dlg-text-color', sanitizeCssValue(settings.textColor));
  if (settings.nameplateFontSize) el.style.setProperty('--dlg-name-font-size', settings.nameplateFontSize + 'px');
}
```

Then in CSS:
```css
.dialogue-text {
  font-size: var(--dlg-font-size, 18px);
  color: var(--dlg-text-color, rgba(255, 255, 255, 0.92));
  font-family: var(--dlg-font-family, inherit);
}
.dialogue-speaker-name {
  font-size: var(--dlg-name-font-size, 20px);
}
```

**Recommendation:** Use the **direct inline style approach** (first example) rather than CSS custom properties. Reason: `_applyStyle()` already uses direct inline styles, and the per-dialogue `style` override in `_applyStyle()` would conflict with CSS custom properties — the per-dialogue style is higher-specificity inline styles that should override global defaults. Keeping both as inline styles makes the override chain clear: CSS defaults → global settings (inline) → per-dialogue style (inline, applied later in `show()`).

### Pattern 3: Editor UI — Font Settings Panel in PageInspector or Separate View

**What:** A Vue component with font family dropdown, font size slider/input, color picker, and nameplate font size control.

**Where to place it:** Two viable options:

1. **Section in PageInspector** (recommended) — Add a "🔤 字体设置" collapsible section at the bottom of PageInspector. This keeps it contextual with dialogue editing.

2. **Separate tab or sub-panel** — A standalone view similar to SettingsDesigner. More overhead, less justified for 4 controls.

**Recommendation:** Option 1 — a collapsible section in PageInspector or a small dedicated panel component that can be placed anywhere (even project settings tab). The font settings are global, not per-page, so putting them in a globally-accessible location makes sense. A small standalone `DialogueBoxSettings.vue` component embedded in PageInspector's top area (always visible regardless of page selection) is the cleanest approach.

**Example font dropdown:**
```vue
<template>
  <div class="font-settings-section">
    <div class="section-toggle" @click="expanded = !expanded">
      {{ expanded ? '▼' : '▶' }} 🔤 对话框字体
    </div>
    <div v-if="expanded" class="section-body">
      <!-- Font Family -->
      <div class="form-group">
        <label>字体</label>
        <select :value="settings.fontFamily || ''" @change="setFontFamily($event.target.value)">
          <option value="">默认 (Noto Sans SC)</option>
          <optgroup label="已导入字体" v-if="assetStore.fontFamilies.length">
            <option v-for="f in assetStore.fontFamilies" :key="f.value" :value="f.value">
              {{ f.label }}
            </option>
          </optgroup>
          <optgroup label="系统字体">
            <option value="'Noto Sans SC', sans-serif">Noto Sans SC</option>
            <option value="'Noto Serif SC', serif">Noto Serif SC</option>
            <option value="sans-serif">Sans Serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
          </optgroup>
        </select>
      </div>

      <!-- Font Size -->
      <div class="form-group">
        <label>字号</label>
        <input type="range" min="12" max="48" :value="settings.fontSize || 18"
          @input="setFontSize(Number($event.target.value))" />
        <span class="val">{{ settings.fontSize || 18 }}px</span>
      </div>

      <!-- Text Color -->
      <div class="form-group">
        <label>文字色</label>
        <input type="color" :value="settings.textColor || '#eeeeeebb'"
          @input="setTextColor($event.target.value)" />
      </div>

      <!-- Nameplate Font Size -->
      <div class="form-group">
        <label>名牌字号</label>
        <input type="range" min="14" max="36" :value="settings.nameplateFontSize || 20"
          @input="setNameplateFontSize(Number($event.target.value))" />
        <span class="val">{{ settings.nameplateFontSize || 20 }}px</span>
      </div>
    </div>
  </div>
</template>
```

### Pattern 4: Live Preview in PageCanvas

**What:** The `PageCanvas.vue` dialogue box already renders `.canvas-dialogue` with hardcoded styles. We need it to reactively read `script.data.ui.dialogueBox` and apply font settings to the dialogue box preview.

**How:** Add a computed style that merges global font settings into the dialogue box rendering:

```javascript
// In PageCanvas.vue
const dialogueStyle = computed(() => {
  const dlgBox = script.data?.ui?.dialogueBox;
  const s = {
    // ... existing base styles
    fontSize: '15px',
    color: '#fff',
    fontFamily: 'inherit',
  };
  if (dlgBox) {
    if (dlgBox.fontSize) s.fontSize = dlgBox.fontSize + 'px';
    if (dlgBox.textColor) s.color = dlgBox.textColor;
    if (dlgBox.fontFamily) s.fontFamily = dlgBox.fontFamily;
  }
  return s;
});

const speakerStyle = computed(() => {
  const dlgBox = script.data?.ui?.dialogueBox;
  const s = { fontSize: '16px', color: '#ffd700' };
  if (dlgBox?.nameplateFontSize) s.fontSize = dlgBox.nameplateFontSize + 'px';
  return s;
});
```

Then bind in template:
```html
<div class="dlg-text" :style="dialogueStyle">{{ currentDialogue.text || '...' }}</div>
<div class="dlg-speaker" v-if="currentDialogue.speaker" :style="speakerStyle">...</div>
```

### Pattern 5: Engine Init Wiring

**What:** In `main.js`, after loading script and fonts, apply global dialogue box settings.

**Example:**
```javascript
// In main.js init(), after loadAllFonts:
if (engine.script.ui?.dialogueBox) {
  dialogueBox.applyGlobalStyle(engine.script.ui.dialogueBox);
}

// In initPreview(), after setting engine.script:
if (engine.script.ui?.dialogueBox) {
  dialogueBox.applyGlobalStyle(engine.script.ui.dialogueBox);
}
```

### Pattern 6: Interaction with Per-Dialogue Style Override

**Critical detail:** `DialogueBox.show(data)` calls `_applyStyle(data.style)` which can override fontSize, fontFamily, textColor per-dialogue. The global settings should be the *default base*, and per-dialogue `style` overrides take priority.

**Implementation order in `show()`:**
1. Apply global style (set once at init, persists)
2. `_applyStyle(data.style)` overrides specific fields if per-dialogue style exists

Current `_applyStyle()` resets to CSS defaults when `!style` — this needs to change so it resets to *global defaults* instead of CSS defaults. The simplest approach: global style is applied once at init and stays. Per-dialogue `_applyStyle()` only overrides when a per-dialogue style exists and resets back to global defaults when it doesn't.

**Recommendation:** Store global settings as instance properties on DialogueBox, then in `_applyStyle()`, when no per-dialogue style is given, apply the global settings instead of resetting to CSS:

```javascript
_applyStyle(style) {
  // Always start from global settings
  this.textEl.style.fontSize = (this._globalFontSize || 18) + 'px';
  this.textEl.style.fontFamily = this._globalFontFamily || '';
  this.textEl.style.color = this._globalTextColor || '';
  this.nameEl.style.fontSize = (this._globalNameFontSize || 20) + 'px';

  // Then apply per-dialogue overrides if present
  if (!style) return;
  // ... existing override logic
}
```

### Anti-Patterns to Avoid

- **Don't create a separate CSS file for font settings** — use inline styles and CSS custom properties, matching the existing pattern
- **Don't put font settings in ConfigManager** — ConfigManager is for player-facing runtime config (volumes, speeds). Font settings are creator-facing design config stored in script.json
- **Don't use iframe postMessage for live preview** — The PageCanvas is a Vue component reading the Pinia store directly. No iframe is involved in the editor canvas preview (iframe is only for the "play test" mode)
- **Don't add fontFamily to SETTING_DEFS** — SETTING_DEFS is for player-adjustable runtime settings. Font settings are creator-only design decisions

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font family dropdown data | Custom font scanning/enumeration | `assetStore.fontFamilies` computed + hardcoded system fonts | Already computed from fontMeta, format `[{ label, value }]` |
| CSS injection prevention | Custom sanitizer | `sanitizeCssValue()` from sanitize.js | Already handles all injection patterns, battle-tested |
| Numeric bounds clamping | Custom clamp logic | `clampField('fontSize', value)` | Already defined bounds: fontSize [1, 200] |
| Font loading | Custom FontFace wrapper | `loadAllFonts()` / `loadSingleFont()` from fontLoader.js | Already working in both editor and engine windows |
| Undo/redo for settings | Custom history tracking | `scriptStore.pushState()` via `updateDialogueBox()` | Store already handles 50-entry undo history |

**Key insight:** Every utility needed already exists. This phase is pure wiring — connecting existing infrastructure to a new data path.

## Common Pitfalls

### Pitfall 1: Forgetting to Apply Global Style After Load in Preview Mode
**What goes wrong:** Editor preview (iframe play-test) doesn't show font settings because `initPreview()` doesn't call `applyGlobalStyle()`.
**Why it happens:** `initPreview()` in `main.js` receives script data via postMessage but doesn't apply `ui.dialogueBox`.
**How to avoid:** Add `dialogueBox.applyGlobalStyle(engine.script.ui?.dialogueBox)` in the `case 'start':` handler of `initPreview()`.
**Warning signs:** Font settings work in standalone game but not in editor's "▶ 预览" mode.

### Pitfall 2: Global Style Reset When Per-Dialogue Style is Null
**What goes wrong:** `_applyStyle(null)` currently does `this.el.style.cssText = ''` and `this.textEl.style.cssText = ''`, which nukes global font settings every time a dialogue without per-dialogue style is shown.
**Why it happens:** Current `_applyStyle()` assumes CSS defaults are the fallback, not global settings.
**How to avoid:** Store global settings as instance properties (`this._globalFontSize`, etc.) and apply them as the reset baseline instead of `cssText = ''`.
**Warning signs:** First dialogue shows correct fonts, subsequent dialogues revert to default.

### Pitfall 3: Font Not Available in Engine Window
**What goes wrong:** User-imported font shows in editor dropdown but renders as fallback in engine.
**Why it happens:** Each BrowserWindow has independent `document.fonts`. If the engine window hasn't loaded the font, it falls back.
**How to avoid:** Engine's `init()` and `initPreview()` already call `loadAllFonts()`. Verify fonts load before applying global style.
**Warning signs:** Font family name is correct in DOM inspector but renders differently.

### Pitfall 4: Color Picker Returns Hex but CSS Expects rgba
**What goes wrong:** Color picker `<input type="color">` returns `#rrggbb` format. The current CSS default for dialogue text is `rgba(255, 255, 255, 0.92)` (with alpha). If user picks white `#ffffff`, it's fully opaque instead of the subtle 0.92 alpha.
**Why it happens:** `<input type="color">` doesn't support alpha channel.
**How to avoid:** Accept this limitation — hex colors are simpler and more intuitive for creators. Document that the stored color is fully opaque. If the default null means "use CSS default with alpha", this is fine for most use cases.
**Warning signs:** Text appears slightly brighter than the CSS default.

### Pitfall 5: Continuous Slider Input Flooding Undo History
**What goes wrong:** Dragging font size slider from 12 to 48 creates 36 undo entries.
**Why it happens:** Each `@input` event calls the setter which calls `pushState()`.
**How to avoid:** Use `@change` event (fires on release) for pushState, or debounce. For immediate visual feedback, update `script.data.ui.dialogueBox.fontSize` directly on `@input` (triggers canvas reactivity) but only call `pushState()` on `@change` or after a debounce.
**Warning signs:** Undo after adjusting a slider only changes the value by 1 step.

### Pitfall 6: Null vs Empty String in fontFamily
**What goes wrong:** Storing `""` (empty string) instead of `null` for "use default" causes `sanitizeCssValue("")` to return `""` which is truthy-ish but means nothing.
**Why it happens:** `<select>` with `value=""` for the default option.
**How to avoid:** Convert empty string to null: `const val = e.target.value || null`. In the engine, check `if (settings.fontFamily)` — null and empty both skip.
**Warning signs:** Font reverts to browser default instead of the CSS-specified 'Noto Sans SC'.

## Code Examples

### Shared Default Constants

```javascript
// Could be in a new file src/engine/dialogueBoxDefs.js
// or directly inline in the store getter

/**
 * Default dialogue box font settings.
 * Values match the current CSS in style.css.
 */
export const DEFAULT_DIALOGUE_BOX = {
  fontSize: 18,           // matches .dialogue-text { font-size: 18px }
  fontFamily: null,        // null = inherit from CSS
  textColor: null,         // null = inherit from CSS
  nameplateFontSize: 20,   // matches .dialogue-speaker-name { font-size: 20px }
};
```

### Font Family Dropdown with Imported + System Fonts

```javascript
// In component setup
import { useAssetStore } from '../../stores/assets.js';
const assetStore = useAssetStore();

// assetStore.fontFamilies is already computed as:
// [{ label: 'FontDisplayName', value: 'UserFont-FontDisplayName' }]
// These are loaded via FontFace API and available in document.fonts

const systemFonts = [
  { label: 'Noto Sans SC', value: "'Noto Sans SC', sans-serif" },
  { label: 'Noto Serif SC', value: "'Noto Serif SC', serif" },
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
];
```

### Engine DialogueBox Global Style Application

```javascript
// Source: existing _applyStyle() pattern in DialogueBox.js

/**
 * Apply global dialogue box style from script settings.
 * Called once at init; values persist across dialogue show/hide cycles.
 * @param {Object} settings — ui.dialogueBox from script.json
 */
applyGlobalStyle(settings) {
  // Store for baseline restoration in _applyStyle()
  this._globalSettings = settings || {};

  if (!settings) return;

  if (settings.fontSize) {
    const fs = clampField('fontSize', settings.fontSize);
    if (fs) this.textEl.style.fontSize = fs + 'px';
  }

  const ff = sanitizeCssValue(settings.fontFamily);
  if (ff) this.textEl.style.fontFamily = ff;

  const tc = sanitizeCssValue(settings.textColor);
  if (tc) this.textEl.style.color = tc;

  if (settings.nameplateFontSize) {
    const nfs = clampField('fontSize', settings.nameplateFontSize);
    if (nfs) this.nameEl.style.fontSize = nfs + 'px';
  }
}
```

### Updating _applyStyle to Respect Global Defaults

```javascript
_applyStyle(style) {
  const g = this._globalSettings || {};

  // Reset to global defaults (not bare CSS defaults)
  this.el.style.cssText = '';  // reset position/size overrides
  this.textEl.style.cssText = '';

  // Re-apply global settings as base
  if (g.fontSize) {
    const fs = clampField('fontSize', g.fontSize);
    if (fs) this.textEl.style.fontSize = fs + 'px';
  }
  const gff = sanitizeCssValue(g.fontFamily);
  if (gff) this.textEl.style.fontFamily = gff;
  const gtc = sanitizeCssValue(g.textColor);
  if (gtc) this.textEl.style.color = gtc;
  if (g.nameplateFontSize) {
    const nfs = clampField('fontSize', g.nameplateFontSize);
    if (nfs) this.nameEl.style.fontSize = nfs + 'px';
  }

  // Then apply per-dialogue overrides
  if (!style) return;
  const s = style;
  if (s.x !== undefined) this.el.style.left = `${clampField('x', s.x)}px`;
  // ... rest of existing _applyStyle logic
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded CSS font sizes | CSS custom properties or inline styles driven by data | Ongoing | Enables data-driven theming |
| Per-element font config | Global + per-element override pattern | Standard practice | Single source of truth with local overrides |

**Current approach in this project:** Inline styles applied via JS DOM manipulation (`el.style.fontSize = ...`) with `sanitizeCssValue()` and `clampField()` guards. This is the established pattern across all UI classes (DialogueBox, SettingsScreen, TitleScreen) and should be continued.

## Open Questions

1. **Where should the font settings UI live in the editor?**
   - What we know: Needs to be accessible globally (not per-page). Could be: (a) a section in PageInspector always visible, (b) a panel in ProjectSettings tab, (c) a floating panel, or (d) a section in the SettingsDesigner view.
   - Recommendation: A collapsible `🔤 对话框字体` section at the **top** of PageInspector (visible regardless of page selection) is most natural — creators see the dialogue box on the canvas and adjust its typography right there. Alternatively, placing it in ProjectSettings also makes sense since it's a project-wide setting. **Planner's discretion.**

2. **Should nameplate color be configurable separately from text color?**
   - What we know: Current CSS has nameplate color driven by `data.speakerColor` (per-character color). Global `textColor` only affects dialogue text, not the nameplate. Requirements say `textColor` only, no `nameplateColor`.
   - Recommendation: Follow requirements exactly — `textColor` is for dialogue text only. Speaker name color remains per-character (already set via `speakerColor` in dialogue data). This avoids conflict.

3. **Should font settings apply to the Backlog screen?**
   - What we know: Requirements only mention "dialogue box". BacklogScreen.js has its own hardcoded font sizes.
   - Recommendation: Out of scope for Phase 17. Can be added later if desired.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test framework installed |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FONT-01 | script.json stores dialogueBox with defaults | manual | Verify script.json after save | ❌ |
| FONT-02 | Engine renders with font settings | manual | Visual inspection in preview mode | ❌ |
| FONT-03 | Editor font settings UI works | manual | Visual inspection of controls | ❌ |
| FONT-04 | Live preview updates on change | manual | Change setting, observe canvas | ❌ |

### Sampling Rate
- **Per task commit:** Manual visual verification (no automated tests)
- **Per wave merge:** Full manual walkthrough of all 4 requirements
- **Phase gate:** Creator can change all 4 settings, see them in canvas, and see them in engine preview

### Wave 0 Gaps
- No test framework installed (known project-wide gap, not Phase 17 specific)
- All verification is manual/visual for this phase

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** — Direct reading of DialogueBox.js, style.css, script.js, assets.js, fontLoader.js, SettingsDesigner.vue, PageCanvas.vue, PageInspector.vue, main.js, ConfigManager.js, sanitize.js, settingDefs.js
- **CSS Custom Properties** — Native browser API, well-documented MDN standard
- **FontFace API** — Already used in fontLoader.js, verified working

### Secondary (MEDIUM confidence)
- Architecture pattern inference from existing `ui.settingsScreen` and `ui.titleScreen` patterns in codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing infrastructure
- Architecture: HIGH — directly follows established patterns in the codebase (ui.settingsScreen, _applyStyle, fontFamilies)
- Pitfalls: HIGH — identified from actual code analysis (e.g., _applyStyle cssText reset, font loading per-window)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable — no external dependencies to go stale)
