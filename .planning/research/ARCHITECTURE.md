# Architecture Patterns — Theme System Integration

**Domain:** Theme pack system for Electron galgame maker (v0.6)
**Researched:** 2025-07-14
**Confidence:** HIGH — based on direct codebase analysis of all engine/editor files

## Executive Summary

The theme system must integrate with an existing DOM-based game engine that uses pure CSS for styling and inline `style` manipulation in JavaScript. Currently, all UI colors, fonts, and layout values are hardcoded across `style.css` (~1272 lines) and 10 UI component classes. The architecture must introduce a centralized token system without breaking any existing functionality.

The core insight: **the engine already uses CSS custom properties in three places** (`--fill-color`, `--track-color`, `--thumb-color`, `--toggle-active` in SettingsScreen.js, and `--dialogue-opacity` in main.js). This proves the pattern works and the codebase can adopt it universally. The refactoring is about expanding a proven pattern, not introducing an alien concept.

## Recommended Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  EDITOR (Vue 3 / Pinia)                                            │
│                                                                     │
│  ThemeDesigner.vue ──► scriptStore.updateTheme() ──► script.json    │
│       │                                                             │
│       └──► postMessage({ type:'update-theme', theme }) ──┐         │
│                                                          │         │
├──────────────────────────────────────────────────────────┼─────────┤
│  ENGINE (iframe or standalone)                           ▼         │
│                                                                     │
│  main.js ──► ThemeManager.apply(theme)                              │
│                  │                                                   │
│                  ├──► #game-container.style.setProperty(            │
│                  │        '--gm-*', token_values)                    │
│                  │                                                   │
│                  ├──► NineSlice.applyTo(element, config)            │
│                  │        → el.style.borderImage = ...               │
│                  │                                                   │
│                  └──► style.css reads var(--gm-*) tokens            │
│                       for ALL hardcoded values                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Location | Communicates With |
|-----------|---------------|----------|-------------------|
| **ThemeManager** (NEW) | Reads theme data, injects CSS custom properties, applies 9-slice | `src/engine/ThemeManager.js` | main.js, all UI components via CSS vars |
| **ThemeDesigner.vue** (NEW) | Visual editor for tokens + 9-slice config | `src/editor/views/ThemeDesigner.vue` | scriptStore, postMessage to engine iframe |
| **scriptStore** (MODIFY) | CRUD for `ui.theme` data | `src/editor/stores/script.js` | ThemeDesigner.vue, auto-save |
| **style.css** (MODIFY) | All hardcoded values → `var(--gm-*)` | `src/style.css` | ThemeManager sets vars on root |
| **main.js** (MODIFY) | Initialize ThemeManager, wire postMessage | `src/main.js` | ThemeManager, all UI components |
| **All UI classes** (MODIFY) | Remove hardcoded style values that conflict with tokens | `src/ui/*.js` | Read theme via CSS vars automatically |

---

## Question 1: Where Do Theme Tokens Live in the Data Model?

### Recommendation: `ui.theme` inside `script.json`

**NOT a separate file.** This is a deliberate decision based on how the existing architecture works:

**Evidence from codebase:**
- `ui.titleScreen` → stored in script.json, accessed via `scriptStore.getTitleScreen()`
- `ui.settingsScreen` → stored in script.json, accessed via `scriptStore.getSettingsScreen()`
- `ui.dialogueBox` → stored in script.json, accessed via `scriptStore.getDialogueBox()`
- The engine reads all UI config from `engine.script.ui.*` at init time (main.js lines 739-751)
- Auto-save watches `script.data` deep and saves the entire object (App.vue line 101-114)
- Undo/redo snapshots the entire script.data (scriptStore.pushState)

A separate `theme.json` would break these assumptions and require a parallel save/load/undo pipeline.

### Proposed Data Schema

```json
{
  "ui": {
    "titleScreen": { "...existing..." },
    "settingsScreen": { "...existing..." },
    "dialogueBox": { "...existing..." },
    "theme": {
      "name": "Classic Dark",
      "version": 1,

      "tokens": {
        "color-primary": "rgba(180, 160, 255, 0.9)",
        "color-primary-hover": "rgba(200, 184, 255, 1)",
        "color-accent": "#ff6b9d",
        "color-bg-overlay": "rgba(10, 10, 20, 0.95)",
        "color-bg-panel": "rgba(30, 30, 50, 0.6)",
        "color-bg-panel-hover": "rgba(40, 35, 65, 0.6)",
        "color-bg-dialogue": "linear-gradient(to top, rgba(8,8,20,0.92) 0%, rgba(8,8,20,0.88) 70%, rgba(8,8,20,0.75) 100%)",
        "color-bg-menu": "rgba(0, 0, 0, 0.7)",
        "color-text-primary": "rgba(255, 255, 255, 0.92)",
        "color-text-secondary": "rgba(255, 255, 255, 0.65)",
        "color-text-muted": "rgba(255, 255, 255, 0.4)",
        "color-text-dim": "rgba(255, 255, 255, 0.3)",
        "color-border": "rgba(255, 255, 255, 0.08)",
        "color-border-hover": "rgba(180, 160, 255, 0.3)",
        "color-border-active": "rgba(180, 160, 255, 0.5)",
        "color-danger": "#ff6b6b",
        "color-save-title": "rgba(180, 160, 255, 0.9)",
        "color-load-title": "rgba(100, 170, 255, 0.9)",

        "font-family-body": "'Noto Sans SC', 'Segoe UI', 'Microsoft YaHei', sans-serif",
        "font-family-display": "'Noto Serif SC', serif",

        "radius-sm": "4px",
        "radius-md": "6px",

        "blur-overlay": "8px",
        "blur-menu": "6px",
        "blur-choice": "4px"
      },

      "nineSlice": {
        "dialogueBox": null,
        "menuPanel": null,
        "saveSlot": null,
        "choiceButton": null,
        "titleButton": null,
        "settingsPanel": null
      }
    }
  }
}
```

### Nine-Slice Element Schema

Each nine-slice entry (when non-null):

```json
{
  "src": "assets/theme/dialogue_frame.png",
  "slice": [20, 20, 20, 20],
  "width": [20, 20, 20, 20],
  "repeat": "stretch",
  "outset": [0, 0, 0, 0],
  "states": null
}
```

For three-state buttons (hover/active), use the `states` field:

```json
{
  "src": "assets/theme/button_normal.png",
  "slice": [8, 8, 8, 8],
  "width": [8, 8, 8, 8],
  "repeat": "stretch",
  "states": {
    "hover": { "src": "assets/theme/button_hover.png" },
    "active": { "src": "assets/theme/button_active.png" }
  }
}
```

### scriptStore Additions

```javascript
// New methods following existing pattern in script.js
function getTheme() {
  if (!data.value) return null;
  data.value.ui ??= {};
  data.value.ui.theme ??= { name: 'Custom', version: 1, tokens: {}, nineSlice: {} };
  return data.value.ui.theme;
}

function updateTheme(theme) {
  if (!data.value) return;
  data.value.ui ??= {};
  data.value.ui.theme = theme;
  pushState();
}
```

### Export/Import: Extract from script.json

Theme export creates a `.theme` zip package:
1. Extract `ui.theme` as `theme.json`
2. Copy referenced 9-slice image assets from `assets/` directory
3. Zip together

Import reverses this: merge `theme.json` into `ui.theme`, copy images to `assets/`.

---

## Question 2: How Does the Engine Apply Tokens at Runtime?

### Recommendation: CSS Custom Properties on `#game-container`

**Create `ThemeManager` class** that sets CSS custom properties on the game container element. All of `style.css` then uses `var(--gm-*)` with fallback values.

### ThemeManager Design

```javascript
// src/engine/ThemeManager.js

/** Default token values — extracted from current hardcoded style.css */
const DEFAULT_TOKENS = {
  'color-primary': 'rgba(180, 160, 255, 0.9)',
  'color-primary-hover': 'rgba(200, 184, 255, 1)',
  'color-accent': '#ff6b9d',
  'color-bg-overlay': 'rgba(10, 10, 20, 0.95)',
  'color-bg-panel': 'rgba(30, 30, 50, 0.6)',
  // ... all tokens with defaults matching current style.css values
};

export class ThemeManager {
  constructor(containerEl) {
    this.container = containerEl;
    this._nineSliceConfig = {};
  }

  /**
   * Apply full theme from script.json ui.theme
   * @param {Object} theme — { tokens, nineSlice }
   */
  apply(theme) {
    this._applyTokens(theme?.tokens || {});
    this._applyNineSlice(theme?.nineSlice || {});
  }

  _applyTokens(tokens) {
    // Merge user tokens with defaults
    const merged = { ...DEFAULT_TOKENS, ...tokens };
    for (const [key, value] of Object.entries(merged)) {
      this.container.style.setProperty(`--gm-${key}`, value);
    }
  }

  _applyNineSlice(nineSlice) {
    // Stored for application when UI elements are created/recreated
    this._nineSliceConfig = nineSlice;
  }

  /**
   * Apply 9-slice border-image to a DOM element
   * @param {HTMLElement} el
   * @param {string} targetKey — e.g. 'dialogueBox', 'menuPanel'
   */
  applyNineSliceTo(el, targetKey) {
    const config = this._nineSliceConfig?.[targetKey];
    if (!config?.src) {
      // Clear any existing border-image
      el.style.borderImage = '';
      return;
    }

    const src = config.src.startsWith('asset://') ? config.src : `asset://${config.src}`;
    const slice = (config.slice || [0,0,0,0]).join(' ') + ' fill';
    const width = (config.width || config.slice || [0,0,0,0]).map(v => v + 'px').join(' ');
    const repeat = config.repeat || 'stretch';

    el.style.borderImageSource = `url("${src}")`;
    el.style.borderImageSlice = slice;
    el.style.borderImageWidth = width;
    el.style.borderImageRepeat = repeat;
    if (config.outset) {
      el.style.borderImageOutset = config.outset.map(v => v + 'px').join(' ');
    }
    // When using 9-slice, clear the CSS background so the image shows
    el.style.background = 'transparent';
  }

  /**
   * Apply 3-state 9-slice to a button (normal/hover/active)
   */
  applyButtonNineSlice(btn, targetKey) {
    const config = this._nineSliceConfig?.[targetKey];
    if (!config?.src) return;

    this.applyNineSliceTo(btn, targetKey);

    if (config.states?.hover) {
      const hoverSrc = config.states.hover.src.startsWith('asset://')
        ? config.states.hover.src : `asset://${config.states.hover.src}`;
      const normalSrc = config.src.startsWith('asset://')
        ? config.src : `asset://${config.src}`;

      btn.addEventListener('mouseenter', () => {
        btn.style.borderImageSource = `url("${hoverSrc}")`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderImageSource = `url("${normalSrc}")`;
      });
    }

    if (config.states?.active) {
      const activeSrc = config.states.active.src.startsWith('asset://')
        ? config.states.active.src : `asset://${config.states.active.src}`;
      btn.addEventListener('mousedown', () => {
        btn.style.borderImageSource = `url("${activeSrc}")`;
      });
      btn.addEventListener('mouseup', () => {
        btn.style.borderImageSource = `url("${
          config.states?.hover?.src || config.src
        }")`;
      });
    }
  }
}
```

### style.css Refactoring Pattern

Current (hardcoded):
```css
#dialogue-box {
  background: linear-gradient(to top, rgba(8,8,20,0.92) 0%, ...);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
```

After (tokenized with backwards-compatible fallbacks):
```css
#dialogue-box {
  background: var(--gm-color-bg-dialogue,
    linear-gradient(to top, rgba(8,8,20,0.92) 0%, rgba(8,8,20,0.88) 70%, rgba(8,8,20,0.75) 100%));
  border-top: 1px solid var(--gm-color-border, rgba(255, 255, 255, 0.08));
}
```

**The fallback values in `var()` match current hardcoded values exactly**, so if ThemeManager hasn't applied tokens yet, the UI looks identical to v0.5. This makes the refactoring zero-risk.

### Initialization Flow (main.js)

```javascript
import { ThemeManager } from './engine/ThemeManager.js';

const themeManager = new ThemeManager(gameContainer);

// In init():
if (engine.script.ui?.theme) {
  themeManager.apply(engine.script.ui.theme);
}

// In preview mode message handler:
case 'update-theme': {
  themeManager.apply(msg.theme);
  break;
}
```

---

## Question 3: How Do 9-Slice Images Work With Existing DOM Elements?

### Recommendation: CSS `border-image` — NOT Canvas

**Rationale:**
1. The entire engine is DOM-based — every UI element is a `<div>` or `<button>`
2. CSS `border-image` is natively supported in Chromium (Electron uses Chromium)
3. No JavaScript rendering loop needed — the browser handles scaling automatically
4. Works with existing CSS transitions and animations
5. The `fill` keyword in `border-image-slice` fills the center region too (acts as background)

**The critical CSS property is `border-image-slice: ... fill`** — the `fill` keyword tells the browser to also render the center slice of the 9-patch image as the element's background content. Without `fill`, only the border edges render.

### How border-image 9-Slice Works

```
┌─────┬─────────────────┬─────┐
│  TL │    Top (repeat)  │ TR  │  ← slice-top
├─────┼─────────────────┼─────┤
│Left │  Center (fill)   │Right│
│(rep)│                  │(rep)│
├─────┼─────────────────┼─────┤
│  BL │  Bottom (repeat) │ BR  │  ← slice-bottom
└─────┴─────────────────┴─────┘
  ↑                        ↑
  slice-left              slice-right
```

The image is sliced into 9 regions. Corners are fixed-size, edges stretch/repeat, center fills.

### CSS Applied

```css
/* When 9-slice is active: */
.dialogue-box-nine-slice {
  border-image-source: url("asset://theme/dialogue_frame.png");
  border-image-slice: 20 20 20 20 fill;  /* fill = center region too */
  border-image-width: 20px;
  border-image-repeat: stretch;  /* or 'repeat' or 'round' */
  background: transparent;      /* let border-image handle background */
  border: none;                 /* override existing border styles */
  backdrop-filter: none;        /* disable blur when using image bg */
}
```

### Per-Component 9-Slice Targets

| Target Key | DOM Element | CSS Selector | Notes |
|------------|-------------|-------------|-------|
| `dialogueBox` | `#dialogue-box` | `DialogueBox.el` | Replaces gradient background |
| `menuPanel` | `.game-menu-panel` | `GameMenu._render()` inner div | Central panel only |
| `saveSlot` | `.save-slot` | Each slot card | Applied per-card |
| `choiceButton` | `.choice-button` | Each choice button | 3-state: normal/hover/active |
| `titleButton` | `.title-button` | Default title buttons | 3-state |
| `settingsPanel` | `#settings-screen` | SettingsScreen.el | Replaces dark overlay |

### Application Timing

9-slice must be applied **after** DOM elements are created. Since UI components build DOM in their constructors/render methods, ThemeManager provides an `applyNineSliceTo()` method that components call at the right moment:

```javascript
// In DialogueBox constructor, after DOM is built:
constructor(container, themeManager) {
  // ... existing DOM creation ...
  this._themeManager = themeManager;
  if (themeManager) {
    themeManager.applyNineSliceTo(this.el, 'dialogueBox');
  }
}
```

For components that rebuild DOM on each show (SaveLoadScreen, BacklogScreen), 9-slice is applied during their `_render()` or `show()` methods.

### Fallback Behavior

If `nineSlice.dialogueBox` is `null` (no 9-slice configured), the element keeps its CSS custom property-driven background. The CSS cascade handles this naturally:

```css
#dialogue-box {
  background: var(--gm-color-bg-dialogue, ...fallback...);
  /* border-image only set via JS when 9-slice is configured */
}
```

---

## Question 4: How Does the Theme Editor Communicate Changes to the Engine Preview?

### Recommendation: Extend Existing `postMessage` Protocol

The editor already communicates with the engine via `iframe + postMessage` (proven in Phase 14). The theme editor adds one new message type.

**Evidence from codebase:**
- `main.js` lines 784-850: Window message handler already processes `start`, `stop`, `mute`
- Editor sends full script object via postMessage
- Engine processes messages and updates rendering

### New Message Type: `update-theme`

```javascript
// Editor → Engine (ThemeDesigner.vue):
engineIframe.contentWindow.postMessage({
  type: 'update-theme',
  theme: {
    tokens: { ...editedTokens },
    nineSlice: { ...editedNineSlice }
  }
}, '*');

// Engine message handler (main.js):
case 'update-theme': {
  themeManager.apply(msg.theme);
  // Re-apply 9-slice to currently visible elements
  themeManager.applyNineSliceTo(dialogueBox.el, 'dialogueBox');
  // ... other visible elements
  break;
}
```

### Editor Preview Architecture

The ThemeDesigner.vue embeds an engine preview iframe (same as the existing `▶ 预览` feature). When the user changes a token:

1. Token value updated in Pinia store → triggers auto-save
2. Simultaneously, `postMessage('update-theme', theme)` → instant visual update
3. No full engine reload needed — just CSS property re-injection

**For the theme editor specifically, an inline preview iframe** (like the existing play preview in the PageEditor) is better than the separate window preview. The theme editor needs constant visual feedback, not a one-time "play from this page" test.

### ThemeDesigner Layout

```
┌──────────────────────────────────────────────────────┐
│  ThemeDesigner.vue                                    │
│                                                       │
│  ┌─────────────┐  ┌──────────────────────────────┐   │
│  │ Token Editor │  │  Engine Preview (iframe)     │   │
│  │             │  │  1280×720 scaled to fit       │   │
│  │ Colors:     │  │                               │   │
│  │  primary    │  │  Shows title screen, dialogue │   │
│  │  accent     │  │  box, menu, etc. with current │   │
│  │  bg-overlay │  │  theme tokens applied         │   │
│  │  text-*     │  │                               │   │
│  │  border-*   │  │                               │   │
│  │             │  │                               │   │
│  │ 9-Slice:    │  │                               │   │
│  │  dialogue   │  │                               │   │
│  │  button     │  │                               │   │
│  │  panel      │  │                               │   │
│  │             │  │                               │   │
│  │ Presets:    │  │                               │   │
│  │  [Classic]  │  │                               │   │
│  │  [Elegant]  │  │                               │   │
│  │  [Fantasy]  │  │                               │   │
│  └─────────────┘  └──────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## Question 5: Suggested Build Order

### Phase Dependency Graph

```
Phase 1: Token Schema + CSS Refactor
    │
    ├──► Phase 2: ThemeManager Engine Integration
    │       │
    │       ├──► Phase 3: 9-Slice System
    │       │       │
    │       │       └──► Phase 5: Theme Presets + Export/Import
    │       │
    │       └──► Phase 4: Theme Editor UI
    │               │
    │               └──► Phase 5: Theme Presets + Export/Import
    │
    (Phase 1 must complete before anything else)
```

### Phase 1: Token Foundation — CSS Refactoring

**Goal:** Replace all hardcoded values in style.css with CSS custom properties. Zero visual change.

**Files modified:**
- `src/style.css` — Every hardcoded color/font/radius/blur → `var(--gm-*, fallback)`
- `src/engine/ThemeManager.js` — NEW: Token definitions + DEFAULT_TOKENS constant

**Audit of values to extract (from style.css analysis):**

| Category | Count | Examples |
|----------|-------|---------|
| Background colors | ~15 | `rgba(10,10,20,0.95)`, `rgba(30,30,50,0.6)`, dialogue gradient |
| Text colors | ~8 | `rgba(255,255,255,0.92)`, `0.65`, `0.4`, `0.3` |
| Border colors | ~6 | `rgba(255,255,255,0.08)`, hover states |
| Accent/primary | ~5 | `rgba(180,160,255,0.9)`, `#ff6b9d` |
| Danger color | ~2 | `#ff6b6b` |
| Font families | ~3 | `'Noto Sans SC'`, `'Noto Serif SC'` |
| Border radius | ~3 | `4px`, `6px` |
| Blur values | ~4 | `blur(8px)`, `blur(6px)`, `blur(4px)` |

**Testing:** Visual regression — the game should look pixel-identical before and after this phase.

**Why first:** Every subsequent phase depends on tokens being in place. Can't apply themes if CSS doesn't read tokens.

### Phase 2: ThemeManager Engine Integration

**Goal:** Engine reads `ui.theme` from script.json and applies tokens at runtime.

**Files modified:**
- `src/engine/ThemeManager.js` — Full implementation (apply, token injection)
- `src/main.js` — Initialize ThemeManager in `init()` and `initPreview()`, add `update-theme` message handler
- `src/editor/stores/script.js` — Add `getTheme()`, `updateTheme()` helpers

**Testing:** Manually edit script.json `ui.theme.tokens`, verify engine renders with new colors.

**Why second:** Must validate that token → CSS var → visual works end-to-end before building editor UI.

### Phase 3: 9-Slice Border Image System

**Goal:** Support 9-slice PNG/JPG images as backgrounds for dialogue box, panels, and buttons.

**Files modified:**
- `src/engine/ThemeManager.js` — Add `applyNineSliceTo()`, `applyButtonNineSlice()` methods
- `src/ui/DialogueBox.js` — Accept ThemeManager reference, call 9-slice apply
- `src/ui/GameMenu.js` — Apply 9-slice to menu panel
- `src/ui/SaveLoadScreen.js` — Apply 9-slice to slot cards
- `src/ui/ChoiceMenu.js` — Apply 9-slice to choice buttons (3-state)
- `src/ui/SettingsScreen.js` — Apply 9-slice to settings panel
- `src/ui/BacklogScreen.js` — Apply 9-slice to backlog panel
- `src/ui/TitleScreen.js` — Apply 9-slice to default title buttons
- `src/main.js` — Pass ThemeManager to UI constructors, re-apply on `update-theme`

**Key decision:** UI constructors get ThemeManager as an optional parameter. If null (no theme), they behave exactly as today. This maintains backward compatibility.

**Why third:** 9-slice is a visual enhancement on top of the token system. Tokens must work first.

### Phase 4: Visual Theme Editor

**Goal:** Vue-based editor for token editing + 9-slice configuration with live preview.

**Files added:**
- `src/editor/views/ThemeDesigner.vue` — Main theme editor view
- `src/editor/components/theme/TokenEditor.vue` — Color/typography token panels
- `src/editor/components/theme/NineSliceEditor.vue` — 9-slice image selector + slice config
- `src/editor/components/theme/ThemePreview.vue` — Embedded engine iframe for live preview
- `src/editor/components/theme/ColorHarmony.vue` — Color palette generation helpers

**Files modified:**
- `src/editor/App.vue` — Add theme tab to `tabs` array and `tabComponents`
- `src/editor/components/TabBar.vue` — No change needed (data-driven)

**Tab addition in App.vue:**
```javascript
const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-design', icon: '⚙️', label: '设置页' },
  { id: 'theme', icon: '🎨', label: '主题' },       // NEW
  { id: 'resource-library', icon: '📦', label: '资源库' },
  { id: 'project-settings', icon: '⚡', label: '项目设置' },
];
```

**Why fourth:** Needs the complete token + 9-slice engine foundation to preview against.

### Phase 5: Presets + Export/Import

**Goal:** 3-4 built-in theme presets, `.theme` package export/import.

**Files added:**
- `src/engine/themePresets.js` — Built-in preset definitions (token + 9-slice data)
- 9-slice image assets for built-in presets (shipped with app)

**Files modified:**
- `src/editor/views/ThemeDesigner.vue` — Preset selector, import/export buttons
- `electron/main.js` — IPC handlers for theme file dialog (export/import)

**Preset ideas:**
1. **Classic Dark** — Current look, extracted as tokens (zero visual change)
2. **Warm Parchment** — Light warm background, serif fonts, paper-like 9-slice frames
3. **Fantasy RPG** — Ornate borders, golden accents, decorative 9-slice panels
4. **Modern Minimal** — Clean lines, minimal borders, high contrast

**Export format:** ZIP file with `.theme` extension:
```
my-theme.theme (ZIP):
├── theme.json         (ui.theme data)
└── assets/
    ├── dialogue_frame.png
    ├── button_normal.png
    ├── button_hover.png
    └── ...
```

**Why last:** Pure UX feature, no technical dependencies beyond Phases 1-4.

---

## Detailed File Impact Map

### Engine Files — Modifications Required

| File | Change Type | Scope | Details |
|------|------------|-------|---------|
| `src/style.css` | **MAJOR refactor** | ~50+ value replacements | Every hardcoded color/font/radius → `var(--gm-*)` |
| `src/main.js` | Moderate | ~20 lines added | ThemeManager init, postMessage handler, pass to UI |
| `src/ui/DialogueBox.js` | Minor | ~5 lines | Accept ThemeManager, call 9-slice in constructor |
| `src/ui/GameMenu.js` | Minor | ~5 lines | Accept ThemeManager, apply 9-slice to panel |
| `src/ui/SaveLoadScreen.js` | Minor | ~10 lines | Apply 9-slice to slot cards during render |
| `src/ui/BacklogScreen.js` | Minor | ~5 lines | Accept ThemeManager, apply 9-slice |
| `src/ui/SettingsScreen.js` | Minor | ~5 lines | Accept ThemeManager, apply 9-slice |
| `src/ui/TitleScreen.js` | Minor | ~5 lines | Apply 9-slice to default buttons |
| `src/ui/ChoiceMenu.js` | Minor | ~10 lines | Apply 3-state 9-slice to buttons |
| `src/ui/QuickActionBar.js` | Minor | ~3 lines | Token-driven colors (via CSS vars, no JS change if CSS handles it) |

### Engine Files — New

| File | Purpose |
|------|---------|
| `src/engine/ThemeManager.js` | Core theme application: tokens → CSS vars, 9-slice → border-image |
| `src/engine/themePresets.js` | Built-in preset definitions |

### Editor Files — Modifications Required

| File | Change Type | Details |
|------|------------|---------|
| `src/editor/App.vue` | Minor | Add theme tab to `tabs` + `tabComponents` |
| `src/editor/stores/script.js` | Minor | Add `getTheme()`, `updateTheme()` (4 functions, ~20 lines) |

### Editor Files — New

| File | Purpose |
|------|---------|
| `src/editor/views/ThemeDesigner.vue` | Main theme editor view (token panels + preview iframe) |
| `src/editor/components/theme/TokenEditor.vue` | Color pickers, typography selectors |
| `src/editor/components/theme/NineSliceEditor.vue` | Image upload, slice value editors, preview |
| `src/editor/components/theme/ThemePreview.vue` | Embedded engine iframe for live preview |
| `src/editor/components/theme/ColorHarmony.vue` | Complementary/analogous color suggestions |

---

## Patterns to Follow

### Pattern 1: CSS Custom Properties with Fallbacks

**What:** Every tokenized value in style.css has a fallback that matches the current hardcoded value.

**Why:** Zero-risk refactoring. If ThemeManager doesn't run (standalone game without theme), UI looks identical.

```css
/* Correct — has fallback matching current value */
.game-menu-button {
  color: var(--gm-color-text-secondary, rgba(255, 255, 255, 0.75));
  background: var(--gm-color-bg-panel, rgba(30, 30, 50, 0.5));
  border: 1px solid var(--gm-color-border, rgba(255, 255, 255, 0.08));
}

/* WRONG — no fallback, breaks without ThemeManager */
.game-menu-button {
  color: var(--gm-color-text-secondary);
}
```

### Pattern 2: Optional ThemeManager in UI Constructors

**What:** UI classes accept ThemeManager as the last optional parameter.

**Why:** Maintains backward compatibility. Existing tests and standalone mode work unchanged.

```javascript
// Constructor signature change
constructor(container, themeManager = null) {
  // ... existing code unchanged ...
  this._themeManager = themeManager;
  if (themeManager) {
    themeManager.applyNineSliceTo(this.el, 'dialogueBox');
  }
}
```

### Pattern 3: Token Naming Convention

**What:** All tokens use the `--gm-` prefix with category-based naming.

```
--gm-{category}-{target}-{variant}

Categories: color, font, radius, blur, spacing
Targets:    primary, bg, text, border, accent, danger
Variants:   hover, active, dim, muted
```

**Why:** Prevents collision with any future CSS variables, provides clear grouping.

### Pattern 4: Dual-mode Rendering (Tokens OR 9-Slice)

**What:** Each UI element can be styled by either tokens (CSS vars) or 9-slice (border-image), but not both simultaneously for backgrounds.

**Why:** When a 9-slice image is configured for an element, it replaces the CSS background. The 9-slice image IS the visual treatment. Color tokens still apply to text, borders without 9-slice, etc.

```javascript
// In ThemeManager.applyNineSliceTo():
if (config?.src) {
  el.style.background = 'transparent';  // 9-slice handles background
  el.style.backdropFilter = 'none';     // no blur behind image
  el.style.borderImageSource = `url("${src}")`;
  // ...
} else {
  el.style.borderImage = '';             // clear 9-slice
  // CSS var background takes effect naturally
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Inline Style Overrides Defeating Tokens

**What:** UI components currently set `el.style.background = ...` directly in JavaScript (e.g., DialogueBox._applyStyle, TitleScreen._renderCustom). These inline styles have higher specificity than CSS vars.

**Why bad:** Inline styles override CSS class styles. If a component sets `el.style.background = 'red'`, `var(--gm-color-bg-dialogue)` in the CSS class won't take effect.

**Instead:** Components should set CSS custom properties on themselves rather than inline background values. Or clear inline styles before token re-application.

```javascript
// BAD: defeats CSS tokens
el.style.background = sanitizedColor;

// GOOD: use CSS var that token system controls
el.style.setProperty('--gm-color-bg-dialogue', sanitizedColor);
```

### Anti-Pattern 2: Separate Theme File

**What:** Storing theme in a separate `theme.json` file.

**Why bad:** Breaks auto-save (only watches script.data), undo/redo (only snapshots script.data), and the established data flow. Would need parallel IPC for save/load.

**Instead:** Store as `ui.theme` in script.json. Extract for export only.

### Anti-Pattern 3: Canvas-Based 9-Slice

**What:** Using HTML Canvas to render 9-slice images.

**Why bad:** Every UI element would need a canvas overlay or background canvas. Adds rendering complexity, doesn't work with CSS transitions, requires manual resize handling.

**Instead:** CSS `border-image` does everything natively with zero JavaScript rendering.

---

## Scalability Considerations

| Concern | Current (v0.5) | With Theme System (v0.6) | Future |
|---------|----------------|--------------------------|--------|
| CSS size | ~1272 lines, all hardcoded | Same line count, tokenized | Stays constant as new themes add only data |
| Token count | 0 | ~30 tokens | Could grow to ~60 with component-specific tokens |
| 9-slice images | N/A | 0-10 per theme (~50KB each) | Bounded by UI element count |
| Theme switching | N/A | Re-inject all CSS vars (~1ms) | Fast regardless of token count |
| Memory | N/A | 9-slice images cached by browser | Bounded; old images GC'd on theme change |
| Export size | N/A | JSON + images in ZIP (~500KB) | Scales with image count/quality |

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Tokens in script.json, not separate file | Consistent with existing ui.* pattern; auto-save/undo/redo work for free |
| CSS custom properties, not dynamic stylesheet | Already used in 5 places in codebase; simple setProperty() API |
| `var(--gm-*, fallback)` everywhere | Zero-risk refactoring; works without ThemeManager |
| `border-image` for 9-slice, not canvas | DOM-native, works with existing CSS transitions, no rendering loop |
| `fill` keyword in border-image-slice | Critical for center region; without it, 9-slice only renders borders |
| ThemeManager as optional constructor param | Backward compatible; standalone game mode unaffected |
| `update-theme` postMessage for live preview | Extends proven iframe communication pattern from Phase 14 |
| `--gm-` prefix for all tokens | Prevents collision, clear ownership |

---

## Sources

- **Direct codebase analysis** — All files in `src/ui/*.js`, `src/engine/*.js`, `src/main.js`, `src/style.css`, `src/editor/**` (HIGH confidence)
- **CSS border-image specification** — `border-image-slice` with `fill` keyword for center region rendering (HIGH confidence, standard CSS3)
- **Existing postMessage pattern** — `main.js` lines 784-850, proven in v0.3 Phase 14 (HIGH confidence)
- **CSS Custom Properties** — Already used in 5 locations across the codebase (HIGH confidence)
- **Electron Chromium** — Full CSS3 border-image support guaranteed (HIGH confidence)
