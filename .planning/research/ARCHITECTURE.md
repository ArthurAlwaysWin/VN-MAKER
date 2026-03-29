# Architecture Patterns — v0.2 Feature Integration

**Domain:** Galgame visual novel maker — Electron desktop app  
**Researched:** 2025-07-14  
**Focus:** How 3 new features (unified asset library, title page designer, settings overlay) integrate with existing architecture  
**Confidence:** HIGH — based entirely on source code analysis of the existing codebase

---

## Executive Summary

The v0.2 milestone adds three features that each touch different layers of the existing architecture. After thorough codebase analysis, the integration strategy is clear:

1. **Unified Asset Library** requires a new Pinia store (`assets.js`), new IPC handlers for file validation/auto-naming, and a data model expansion in `script.json` for font metadata. The existing `Assets.vue` and `Characters.vue` merge into a single `AssetLibrary.vue`.

2. **Title Page Designer** is a straightforward refactor: the current `TitleDesigner.vue` is a placeholder stub. It should be rebuilt following the exact `SettingsDesigner.vue` pattern (palette → canvas → inspector), with a `TITLE_DEFS` registry mirroring `SETTING_DEFS`, and the existing `TitleScreen.js` runtime renderer already supports custom layout rendering.

3. **Settings Overlay** requires CSS/animation changes in the runtime engine only — changing `SettingsScreen.js` from opacity fade to slide-in/slide-out, adjusting z-index stacking, and ensuring the game continues rendering behind the translucent overlay. No editor changes needed.

---

## Recommended Architecture

### Current Architecture (as-is)

```
Editor (Vue 3 + Pinia)                    Engine (Pure JS + DOM)
┌─────────────────────────┐                ┌──────────────────────────┐
│  App.vue                │                │  main.js (entry)         │
│  ├─ TabBar              │                │  ├─ ScriptEngine         │
│  ├─ keep-alive tabs:    │                │  ├─ AudioManager         │
│  │  ├─ Scenes           │                │  ├─ ConfigManager        │
│  │  ├─ TitleDesigner ◄──┼── STUB         │  ├─ SaveManager          │
│  │  ├─ SettingsDesigner │                │  ├─ TitleScreen.js       │
│  │  ├─ Assets           │                │  ├─ SettingsScreen.js    │
│  │  ├─ Characters       │                │  ├─ GameMenu.js          │
│  │  └─ ProjectSettings  │                │  └─ [other UI modules]   │
│  └─ Stores:             │                └──────────────────────────┘
│     ├─ script.js        │
│     └─ project.js       │   ←── IPC ──→  electron/main.js
└─────────────────────────┘                 (file I/O, asset://, dialog)
```

### Target Architecture (v0.2)

```
Editor (Vue 3 + Pinia)                    Engine (Pure JS + DOM)
┌─────────────────────────┐                ┌──────────────────────────┐
│  App.vue                │                │  main.js (entry)         │
│  ├─ TabBar (5 tabs) ◄───┼── CHANGED      │  ├─ ScriptEngine         │
│  ├─ keep-alive tabs:    │                │  ├─ AudioManager         │
│  │  ├─ Scenes           │                │  ├─ ConfigManager        │
│  │  ├─ TitleDesigner ◄──┼── NEW (full)   │  ├─ SaveManager          │
│  │  ├─ SettingsDesigner │                │  ├─ TitleScreen.js ◄─────┼── MODIFIED
│  │  ├─ AssetLibrary ◄───┼── NEW (merge)  │  ├─ SettingsScreen.js ◄──┼── MODIFIED
│  │  └─ ProjectSettings  │                │  ├─ GameMenu.js          │
│  └─ Stores:             │                │  └─ [other UI modules]   │
│     ├─ script.js ◄──────┼── MODIFIED     └──────────────────────────┘
│     ├─ project.js       │
│     └─ assets.js ◄──────┼── NEW          Shared Registries
└─────────────────────────┘                ┌──────────────────────────┐
          │                                │  settingDefs.js (exists) │
          ├── IPC ──→ electron/main.js     │  titleDefs.js ◄── NEW   │
          │           (NEW handlers)       └──────────────────────────┘
          │
     New IPC Channels:
       import-assets (validate + copy + auto-name)
       delete-asset
       list-assets (replaces read-dir for assets)
       load-font-metadata
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `AssetLibrary.vue` (NEW) | Unified UI for backgrounds, characters, audio, fonts. Import, browse, delete, manage expressions | `assets` store → IPC `import-assets`, `list-assets`, `delete-asset` |
| `assets.js` store (NEW) | Cache asset file lists, manage import state, provide asset data to other components | IPC bridge, consumed by `AssetLibrary.vue`, `AssetPanel.vue`, designer views |
| `TitleDesigner.vue` (REWRITE) | Canvas-based title page layout editor with palette/inspector | `script` store → `data.ui.titleScreen`, uses `titleDefs.js` |
| `titleDefs.js` (NEW) | Registry of title page preset components + factory functions | Used by `TitleDesigner.vue` and `TitleScreen.js` |
| `SettingsScreen.js` (MODIFY) | Runtime settings rendering with overlay mode | `ConfigManager`, reads `ui.settingsScreen` from script |

---

## Feature 1: Unified Asset Library

### Problem Analysis

Currently assets are managed in two separate views:
- **`Assets.vue`**: file-browser for backgrounds/characters/audio. Uses raw `read-dir` IPC, `<input type="file">` upload with `upload-asset` IPC. No validation, no auto-naming, no metadata.
- **`Characters.vue`**: character data (name, color, expressions) stored in `script.data.characters`. Expression paths are manually typed strings (e.g., `characters/sakura_smile.png`), no file picker integration.

### Data Model Changes

**Current `script.json` structure:**
```json
{
  "characters": {
    "hero": {
      "name": "主人公",
      "color": "#FFFFFF",
      "expressions": {
        "normal": "characters/hero_normal.png",
        "smile": "characters/hero_smile.png"
      }
    }
  },
  "scenes": { ... },
  "ui": {
    "settingsScreen": { "background": null, "elements": [] }
  }
}
```

**New `script.json` additions:**
```json
{
  "characters": { ... },
  "scenes": { ... },
  "ui": {
    "settingsScreen": { ... },
    "titleScreen": { ... }
  },
  "assets": {
    "fonts": [
      {
        "id": "font-1719000000000-1",
        "name": "Custom Font Display Name",
        "file": "fonts/MyFont.ttf",
        "family": "MyFont"
      }
    ]
  }
}
```

**Rationale:** Backgrounds, characters, and audio don't need metadata in script.json — they're just files in `assets/` subfolders. But fonts need metadata (display name → CSS font-family mapping, file path) because the engine needs to load `@font-face` declarations. Characters already have metadata in `script.data.characters`, which stays as-is.

**New project folder structure:**
```
project/
├── project.json
├── script.json
└── assets/
    ├── backgrounds/
    ├── characters/
    ├── audio/
    ├── fonts/          ← NEW
    └── ui/
```

### New Pinia Store: `assets.js`

```javascript
// src/editor/stores/assets.js
export const useAssetStore = defineStore('assets', () => {
  // Cached file lists per category
  const files = ref({
    backgrounds: [],
    characters: [],
    audio: [],
    fonts: [],
    ui: []
  });
  
  const isLoading = ref(false);

  // Load all asset file lists from disk
  async function loadAll() { ... }
  
  // Load a single category
  async function loadCategory(category) { ... }
  
  // Import files: validate → auto-name → copy → refresh list
  async function importAssets(category, fileList) { ... }
  
  // Delete an asset file
  async function deleteAsset(category, filename) { ... }
  
  // Get asset URL helper
  function assetUrl(category, filename) {
    return `asset://${category}/${filename}`;
  }
  
  return { files, isLoading, loadAll, loadCategory, importAssets, deleteAsset, assetUrl };
});
```

**Why a separate store (not just extend script store):**
- Asset file lists are filesystem state, not document state. They shouldn't be in undo history.
- Multiple components need the same file lists (AssetLibrary, AssetPanel, TitleDesigner bg picker, SettingsDesigner bg picker).
- Import operations are async I/O, separate from the reactive script data flow.

### New IPC Handlers

**`import-assets`** — The workhorse handler:
```javascript
ipcMain.handle('import-assets', async (event, { category, files }) => {
  // files: Array<{ name, data: number[] }>
  // Returns: { success: true, imported: [{ original, saved }], errors: [] }
  
  // 1. Validate file type by extension + magic bytes
  // 2. Auto-name: if "背景-1.png" exists, save as "背景-2.png"
  // 3. Copy to assets/{category}/
  // 4. (if font) Return font metadata for script.json
});
```

**File validation rules:**

| Category | Allowed Extensions | Magic Bytes Check |
|----------|-------------------|-------------------|
| backgrounds | .png, .jpg, .jpeg, .webp, .gif | PNG: `89504E47`, JPEG: `FFD8FF`, WebP: `52494646`, GIF: `47494638` |
| characters | .png, .jpg, .jpeg, .webp | Same as above (no .gif — character sprites shouldn't be animated) |
| audio | .mp3, .ogg, .wav, .m4a | MP3: `494433` or `FFFB`, OGG: `4F676753`, WAV: `52494646` |
| fonts | .ttf, .otf, .woff, .woff2 | TTF: `00010000`, OTF: `4F54544F`, WOFF: `774F4646`, WOFF2: `774F4632` |

**Auto-naming algorithm:**
```
Input: "sakura.png" into backgrounds/
If exists: "sakura.png" → "sakura-2.png" → "sakura-3.png" → ...
Keep scanning until unique name found.

Category prefix (for unnamed imports):
  backgrounds → "背景-1.png"
  characters → "角色-1.png"  
  audio → "音频-1.mp3"
  fonts → "字体-1.ttf"
```

**`delete-asset`** — Simple with safety check:
```javascript
ipcMain.handle('delete-asset', async (event, { category, filename }) => {
  // Verify isInsideProject(), unlink file, return success
});
```

**`list-assets`** — Enhanced replacement for generic `read-dir`:
```javascript
ipcMain.handle('list-assets', async (event, category) => {
  // Returns: [{ name, size, modifiedAt }]
  // Sorted by name, with metadata useful for the UI
});
```

### Component: `AssetLibrary.vue`

**Layout:** Single view replacing both `Assets.vue` and `Characters.vue` tabs.

```
┌──────────────────────────────────────────────────────────┐
│  资源库                          [📂 导入文件] [🗑 删除]  │
│  ─────────────────────────────────────────────────────── │
│  [背景] [角色] [音频] [字体]    ← category tabs          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  ┌─────────────┐  ┌───────────────────────────────────┐  │
│  │  File Grid  │  │  Detail / Edit Panel              │  │
│  │  or List    │  │  (for characters: expressions)    │  │
│  │             │  │  (for fonts: preview)             │  │
│  │  drag to    │  │  (for bg/audio: info)             │  │
│  │  select     │  │                                   │  │
│  └─────────────┘  └───────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Characters sub-view integration:** When the "角色" tab is active, show character list on left + expression editor on right. Expression paths become clickable file pickers that browse from `assets/characters/` instead of manual text input.

### Tab Changes in `App.vue`

Merge "素材库" and "角色" tabs into single "资源库" tab:

```javascript
// Before (6 tabs)
const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-design', icon: '⚙️', label: '设置页' },
  { id: 'assets', icon: '🎨', label: '素材库' },
  { id: 'characters', icon: '👤', label: '角色' },
  { id: 'project-settings', icon: '📦', label: '项目设置' },
];

// After (5 tabs)
const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-design', icon: '⚙️', label: '设置页' },
  { id: 'asset-library', icon: '📦', label: '资源库' },
  { id: 'project-settings', icon: '⚙️', label: '项目设置' },
];
```

### Font Integration

Fonts need additional wiring:

1. **Import:** Copy `.ttf`/`.otf`/`.woff`/`.woff2` to `assets/fonts/`, add metadata entry to `script.data.assets.fonts[]`
2. **Registration:** When project loads, inject `@font-face` rules into editor `<head>` for preview. New IPC handler `load-font-face` reads font file and returns base64 data URL, or editor can reference via `asset://fonts/MyFont.ttf`.
3. **Usage:** Font family names from the asset store populate the font `<select>` dropdowns in SettingsDesigner and TitleDesigner inspectors (replacing the hardcoded 5-option list).
4. **Engine runtime:** On engine init, inject `@font-face` for all fonts in `script.assets.fonts[]` before rendering.

**Font face injection pattern:**
```javascript
// Shared utility: src/utils/fontLoader.js
export function injectFontFaces(fonts, baseUrl = 'asset://') {
  const style = document.getElementById('custom-fonts') || document.createElement('style');
  style.id = 'custom-fonts';
  style.textContent = fonts.map(f => `
    @font-face {
      font-family: '${f.family}';
      src: url('${baseUrl}fonts/${f.file}');
    }
  `).join('\n');
  if (!style.parentNode) document.head.appendChild(style);
}
```

---

## Feature 2: Title Page Designer

### Problem Analysis

Current `TitleDesigner.vue` is a **placeholder stub** (33 lines, just shows a notice). The existing `TitleScreen.js` runtime renderer already supports custom layouts with `_renderCustom()` but uses a different element schema than `SettingsDesigner`.

**Current TitleScreen.js custom layout schema:**
```json
{
  "background": "backgrounds/title_bg.png",
  "elements": [
    { "type": "text", "content": "游戏标题", "x": 640, "y": 200, "anchor": "center", "fontSize": 56 },
    { "type": "button", "text": "开始游戏", "action": "start", "x": 640, "y": 400, "anchor": "center" }
  ]
}
```

**Target: Align with SettingsDesigner pattern.** The schema needs to be normalized so both designers and both runtime renderers work the same way.

### TITLE_DEFS Registry

Create `src/engine/titleDefs.js` mirroring the `settingDefs.js` pattern:

```javascript
// src/engine/titleDefs.js

/**
 * Title Page Component Registry
 * 
 * Preset button components for the title page.
 * Each entry defines a button with a specific action the engine handles.
 */
export const TITLE_BUTTON_DEFS = {
  'start-game': {
    action: 'start',
    label: '开始游戏',
    icon: '▶',
  },
  'continue-game': {
    action: 'continue',
    label: '继续游戏',
    icon: '⏩',
    disableCondition: 'noSave',  // engine disables when no save exists
  },
  'open-settings': {
    action: 'settings',
    label: '设 定',
    icon: '⚙️',
  },
  'exit-game': {
    action: 'exit',
    label: '退出游戏',
    icon: '🚪',
  },
};

/**
 * Title screen schema:
 *
 * script.json → ui.titleScreen = {
 *   background: 'backgrounds/title_bg.png' | null,
 *   bgm: 'audio/title_bgm.mp3' | null,
 *   elements: TitleElement[]
 * }
 *
 * Element types:
 *
 *   Title button (type: 'button')
 *   ─────────────────────────────
 *   { id, type: 'button', buttonType: TITLE_BUTTON_DEFS key,
 *     x, y, width, height, label?, style? }
 *
 *   Text label (type: 'label')
 *   ──────────────────────────
 *   { id, type: 'label', x, y, text,
 *     style: { color, fontSize, fontFamily, letterSpacing?, textShadow? } }
 *
 *   Decorative image (type: 'image')
 *   ─────────────────────────────────
 *   { id, type: 'image', x, y, width, height, src }
 */

export const DEFAULT_TITLE_BUTTON_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.1)',
  textColor: '#ffffff',
  hoverColor: '#ff6b9d',
  fontSize: 20,
  fontFamily: 'sans-serif',
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.2)',
};

export const DEFAULT_TITLE_LABEL_STYLE = {
  color: '#ffffff',
  fontSize: 48,
  fontFamily: "'Noto Serif SC', serif",
  letterSpacing: 8,
  textShadow: '0 0 40px rgba(180,140,255,0.3)',
};

let _idCounter = 0;

export function generateTitleElementId(type) {
  return `title-${type}-${Date.now()}-${++_idCounter}`;
}

export function createTitleButtonElement(buttonType, x = 640, y = 400) {
  const def = TITLE_BUTTON_DEFS[buttonType];
  if (!def) throw new Error(`Unknown title button type: ${buttonType}`);
  return {
    id: generateTitleElementId('button'),
    type: 'button',
    buttonType,
    action: def.action,
    x, y,
    width: 200,
    height: 48,
    label: def.label,
    style: { ...DEFAULT_TITLE_BUTTON_STYLE },
  };
}

export function createTitleLabelElement(text = '游戏标题', x = 640, y = 200) {
  return {
    id: generateTitleElementId('label'),
    type: 'label',
    x, y,
    text,
    style: { ...DEFAULT_TITLE_LABEL_STYLE },
  };
}

export function createTitleImageElement(src = '', x = 0, y = 0) {
  return {
    id: generateTitleElementId('image'),
    type: 'image',
    x, y,
    width: 200,
    height: 200,
    src,
  };
}
```

### TitleDesigner.vue — Full Rewrite

The rewritten component follows the **exact same 3-panel layout** as `SettingsDesigner.vue`:

```
┌──────────────┬────────────────────────┬──────────────┐
│  Component   │   1280×720 Canvas      │  Inspector   │
│  Palette     │   (CanvasPreview)      │  (properties)│
│              │                        │              │
│ 🏷️ 文字标签  │  ┌──────────────────┐  │  📐 位置     │
│ ▶ 开始游戏   │  │                  │  │  🏷️ 内容     │
│ ⏩ 继续游戏   │  │   Canvas with    │  │  🎨 样式     │
│ ⚙️ 设定      │  │   DraggableElems │  │              │
│ 🚪 退出游戏   │  │                  │  │              │
│ 🖼️ 装饰图片  │  └──────────────────┘  │              │
│              │  [🖼️ 背景] [🎵 BGM]   │              │
└──────────────┴────────────────────────┴──────────────┘
```

**Key patterns replicated from SettingsDesigner.vue:**

1. **Data flow:** `scriptStore.data.ui.titleScreen` → local `reactive({ background, bgm, elements })` → `saveLayout()` writes back via store
2. **Undo/redo sync:** `watch(scriptStore.data?.ui?.titleScreen, ...)` with `_syncing` flag
3. **Canvas scaling:** Same `ResizeObserver` + `GAME_W/GAME_H` calculation
4. **Drag & drop:** Same `onDragStart` → `onCanvasDrop` with `application/title-elem` MIME type
5. **Element CRUD:** Same `onElementMove`, `onElementResize`, `deleteSelected` pattern
6. **Inspector:** Same property editing with `setProp`, `setStyleColor`, etc.

**Script store additions:**

```javascript
// In script.js store — add parallel to getSettingsScreen/updateSettingsScreen

function getTitleScreen() {
  if (!data.value) return null;
  data.value.ui ??= {};
  data.value.ui.titleScreen ??= { background: null, bgm: null, elements: [] };
  return data.value.ui.titleScreen;
}

function updateTitleScreen(titleScreen) {
  if (!data.value) return;
  data.value.ui ??= {};
  data.value.ui.titleScreen = titleScreen;
  pushState();
}
```

### TitleScreen.js Runtime — Schema Alignment

The existing `TitleScreen.js._renderCustom()` needs modification to support the new schema. The key difference:

**Current schema** uses `{ type: 'text', content, anchor: 'center' }` and `{ type: 'button', text, action }`.

**New schema** uses `{ type: 'label', text, style }` and `{ type: 'button', buttonType, action, label, style }` — aligned with the SettingsScreen pattern.

The `_renderCustom` method needs to be updated to:
- Handle `type: 'label'` (rename from `type: 'text'`)
- Use consistent `style` object for styling (not top-level `fontSize`, `color`, etc.)
- Support `type: 'image'` for decorative images
- Use `asset://` protocol for background images (currently uses `/game/`)
- Add `hoverColor` support from style object

**Backward compatibility:** Check for old `type: 'text'` and handle gracefully during a transition period, or migrate on project load.

### Title Page BGM

The title screen layout includes a `bgm` field. In the engine `main.js`, after setting the layout:
```javascript
if (engine.script.ui?.titleScreen) {
  titleScreen.setLayout(engine.script.ui.titleScreen);
  // Play title BGM if configured
  if (engine.script.ui.titleScreen.bgm) {
    audio.playBgm({ file: engine.script.ui.titleScreen.bgm, volume: 0.5, fadeIn: 1000 });
  }
}
```

---

## Feature 3: Settings Page Overlay

### Changes Required (Engine Only)

**No editor changes needed.** The overlay mode is purely a runtime rendering concern.

#### CSS Changes in `style.css`

```css
/* BEFORE */
#settings-screen {
  position: absolute;
  inset: 0;
  z-index: 200;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(8px);
  opacity: 0;
  transition: opacity 0.3s ease;
}
#settings-screen.visible { opacity: 1; }
#settings-screen.hidden { opacity: 0; pointer-events: none; }

/* AFTER — slide-in overlay */
#settings-screen {
  position: absolute;
  inset: 0;
  z-index: 200;
  background: rgba(10, 10, 20, 0.85);
  backdrop-filter: blur(12px);
  transform: translateY(-100%);         /* off-screen above */
  opacity: 0;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s ease;
  pointer-events: none;
}
#settings-screen.visible {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}
#settings-screen.hidden {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}
```

**Slide direction:** `translateY(-100%)` (slide from top) is the standard pattern for settings overlays in visual novels. Alternative: `translateX(100%)` (slide from right).

#### SettingsScreen.js Changes

Minimal JS changes:

```javascript
// AFTER — add transition end listener for cleanup
show() {
  // ... render ...
  this.el.classList.remove('hidden');
  // Double rAF to ensure the browser has painted the hidden state
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      this.el.classList.add('visible');
    });
  });
}

hide() {
  this.el.classList.remove('visible');
  // Wait for slide-out animation to complete before adding hidden
  const onEnd = () => {
    this.el.classList.add('hidden');
    this.el.removeEventListener('transitionend', onEnd);
  };
  this.el.addEventListener('transitionend', onEnd);
}
```

#### Z-Index Stacking Context (Verified from source)

| Layer | z-index | Notes |
|-------|---------|-------|
| `#background-layer` | 1 | Game background |
| `#character-layer` | 2 | Character sprites |
| `#dialogue-layer` | 3 | Dialogue box |
| `#quick-controls` | 5 | AUTO/SKIP/LOG/MENU |
| `#ui-overlay` | 10 | Choice menu, game menu |
| `#game-menu` | 40 | ESC menu |
| `#title-screen` | 100 | Title page |
| `#settings-screen` | 200 | Settings overlay ✓ |
| `#save-load-screen` | 200 | Save/load |
| `#backlog-screen` | 200 | Backlog |

**Settings at z-index 200 is correct** — no changes needed. Game continues rendering behind the overlay. BGM keeps playing (intentional — player adjusts volumes in real-time).

---

## New vs Modified Components (Complete List)

### New Files

| File | Type | Description |
|------|------|-------------|
| `src/editor/stores/assets.js` | Pinia store | Asset file list cache, import/delete operations |
| `src/editor/views/AssetLibrary.vue` | Vue component | Unified asset management (replaces Assets.vue + Characters.vue) |
| `src/engine/titleDefs.js` | Registry | Title page component definitions + factory functions |
| `src/utils/fontLoader.js` | Utility | `@font-face` injection for custom fonts |

### Modified Files

| File | Change | Scope |
|------|--------|-------|
| `src/editor/views/TitleDesigner.vue` | **Full rewrite** — from 33-line stub to full canvas designer | Major |
| `src/editor/App.vue` | Tab list: 6→5 tabs, component imports updated | Minor |
| `src/editor/stores/script.js` | Add `getTitleScreen()`, `updateTitleScreen()`, init `assets.fonts` | Minor |
| `src/ui/TitleScreen.js` | Update `_renderCustom()` to new element schema, use `asset://` | Medium |
| `src/ui/SettingsScreen.js` | `show()`/`hide()` animation logic for slide transition | Minor |
| `src/style.css` | Settings overlay slide animation CSS | Minor |
| `src/main.js` (engine entry) | Load title BGM, inject custom fonts | Minor |
| `electron/main.js` | Add `import-assets`, `delete-asset`, `list-assets` IPC handlers | Medium |
| `src/editor/components/AssetPanel.vue` | Use asset store instead of direct IPC, add fonts section | Minor |

### Deleted Files

| File | Replaced By |
|------|-------------|
| `src/editor/views/Assets.vue` | `AssetLibrary.vue` |
| `src/editor/views/Characters.vue` | `AssetLibrary.vue` (characters sub-tab) |

---

## Patterns to Follow

### Pattern 1: Registry + Factory (proven by settingDefs.js)
**What:** Registry object defines all component types. Factory functions create element instances with defaults.  
**When:** Title page designer component system.  
**Why:** Established pattern — adding a component type requires only a registry entry.

### Pattern 2: Store Method Pair (proven by getSettingsScreen/updateSettingsScreen)
**What:** Getter lazily initializes data section; setter replaces data + pushes undo state.  
**When:** Title screen data management in script store.

### Pattern 3: Local Reactive + _syncing Flag (proven by SettingsDesigner.vue)
**What:** Designer views copy store data to local `reactive()`, sync back via `saveLayout()` with `_syncing` flag.  
**Why:** Absorbs high-frequency drag events, batch-commits to store for clean undo history.

### Pattern 4: IPC with isInsideProject() (proven by upload-asset handler)
**What:** Every filesystem IPC handler validates paths against project root.  
**When:** All new asset management IPC handlers.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing File Bytes in Pinia
**Why bad:** Large assets in reactive state kill undo/redo (JSON.parse/stringify on snapshots).  
**Instead:** Use `asset://` protocol URLs. Browser/Electron handles caching.

### Anti-Pattern 2: Separate Undo History per Feature
**Why bad:** Both designers share `script.data.ui.*` — separate histories create conflicts.  
**Instead:** Single script store undo history via `pushState()`.

### Anti-Pattern 3: Different Element Schemas Between Designers
**Why bad:** Current `TitleScreen.js` uses different schema than `SettingsScreen.js`. Doubles rendering logic.  
**Instead:** Normalize to SettingsDesigner schema: `{ type, id, x, y, style: {} }` base shape.

### Anti-Pattern 4: Font Loading via IPC on Every Render
**Why bad:** IPC is async and expensive. Font rendering is synchronous.  
**Instead:** Inject `@font-face` once on project load + font import.

---

## Build Order (Dependency-Aware)

### Phase 1: Asset Library Foundation (build first — other features depend on it)

**Why first:** Both TitleDesigner and SettingsDesigner need the asset store for background/image/font pickers.

1. `assets.js` store — No dependencies on other new code
2. `list-assets` + `delete-asset` IPC handlers — Foundation for the store
3. `import-assets` IPC handler — Validation + auto-naming logic
4. `AssetLibrary.vue` — Unified UI (backgrounds, audio tabs first)
5. Characters sub-tab in AssetLibrary — Migrate expression editing
6. Fonts sub-tab + `fontLoader.js` — Font import, `@font-face` injection
7. Update `App.vue` — Swap tabs, remove old imports
8. Update `AssetPanel.vue` — Use asset store, add fonts section

### Phase 2: Title Page Designer (depends on Phase 1 for asset pickers)

1. `titleDefs.js` — Registry file, no dependencies
2. `script.js` store additions — `getTitleScreen()` / `updateTitleScreen()`
3. `TitleDesigner.vue` rewrite — Full 3-panel designer
4. `TitleScreen.js` schema update — Align `_renderCustom()` with new element schema
5. `main.js` engine wiring — Title BGM playback, font loading

### Phase 3: Settings Overlay (independent, smallest scope)

1. `style.css` — Slide animation CSS
2. `SettingsScreen.js` — Update `show()`/`hide()` for slide transition
3. Test with custom layout and default layout

---

## Scalability Considerations

| Concern | Current (v0.1) | v0.2 Target | Future |
|---------|----------------|-------------|--------|
| Asset file count | ~20 files | ~100 files | 500+ files |
| File list loading | Direct `readdir` every tab switch | Cached in store, refresh on import/delete | Indexed DB cache with file watchers |
| Font count | 0 (hardcoded 5 system fonts) | 1-5 custom fonts | 20+ custom fonts |
| Title page elements | Not applicable (stub) | 5-15 elements | 50+ elements (unlikely) |
| Undo history size | 50 snapshots × full script.json | Same — fonts metadata is small | Consider diffing instead of full snapshots |

---

## Sources

- **Codebase analysis** — All findings derived from direct reading of source files (HIGH confidence)
- **Electron custom protocol** — `electron/main.js` asset:// handler (verified in source)
- **Settings designer pattern** — `src/editor/views/SettingsDesigner.vue` + `src/engine/settingDefs.js` (verified)
- **Runtime z-index stacking** — `src/style.css` lines 50-69, 322-348, 541-560 (verified)
- **TitleScreen runtime** — `src/ui/TitleScreen.js` custom layout support (verified)
- **Script engine wiring** — `src/main.js` init flow lines 428-457 (verified)
