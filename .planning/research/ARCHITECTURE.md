# Architecture: Settings Page Designer Integration

**Project:** Galgame Maker — Settings Page Designer
**Researched:** 2025-07-17
**Confidence:** HIGH (based on thorough analysis of existing codebase patterns)

## Executive Summary

The Settings Page Designer must integrate into two distinct applications: the **Vue 3 editor** (where game creators design the settings page visually) and the **vanilla JS runtime engine** (where players interact with the settings). The existing codebase already establishes clear patterns for both sides via the Title Screen feature — `ui.titleScreen` in `script.json` drives custom layout, `TitleScreen.js` renders it at runtime, and the editor provides canvas-based design tools. The settings designer follows this identical architecture.

The core insight is that settings components are **typed UI widgets** (slider, toggle, button, text/label) whose **logic is engine-built-in** (e.g., a `bgmVolume` slider always controls BGM volume) but whose **visual appearance and position** are author-defined. This matches the project's core philosophy: "developer doesn't touch logic — only visual design."

## Recommended Architecture

### System Overview

```
┌─────────────────────── EDITOR (Vue 3) ───────────────────────┐
│                                                                │
│  SettingsDesigner.vue                                          │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────────┐    │
│  │ Component │  │ Settings Canvas  │  │ Property Panel    │    │
│  │ Palette   │──│ (1280×720)       │──│ (selected element)│    │
│  │ (preset   │  │                  │  │                   │    │
│  │  widgets) │  │ DraggableElement │  │ x, y, width,     │    │
│  │           │  │ ┌──┐ ┌──┐ ┌──┐  │  │ color, font, etc. │    │
│  │ ▸ Sliders │  │ │S │ │T │ │B │  │  │                   │    │
│  │ ▸ Toggles │  │ └──┘ └──┘ └──┘  │  └───────────────────┘    │
│  │ ▸ Buttons │  └──────────────────┘                           │
│  │ ▸ Labels  │                                                 │
│  └──────────┘                                                  │
│           │                                                    │
│           ▼                                                    │
│   script.data.ui.settingsScreen  ←── Pinia (useScriptStore)   │
│                                                                │
└───────────────────┬────────────────────────────────────────────┘
                    │ auto-save (2s debounce)
                    │ IPC: save-project
                    ▼
          ┌──── script.json ────┐
          │ {                   │
          │   "ui": {           │
          │     "settingsScreen"│ ← NEW section
          │   }                 │
          │ }                   │
          └─────────┬───────────┘
                    │ fetch at init
                    ▼
┌────────────────── ENGINE (Vanilla JS) ──────────────────────┐
│                                                              │
│  SettingsScreen.js (refactored)                              │
│  ┌────────────────────────────────────────────────┐          │
│  │ if (layout && layout.elements)                 │          │
│  │   → _renderCustom() — positioned elements      │          │
│  │ else                                           │          │
│  │   → _renderDefault() — current hardcoded UI    │          │
│  └──────────────────┬─────────────────────────────┘          │
│                     │                                        │
│  ConfigManager.js ←─┘  get/set config values                │
│  (localStorage)        (bgmVolume, seVolume, textSpeed, etc) │
│                                                              │
│  main.js: settingsScreen.onChange → applyConfig()            │
│           (AudioManager, DialogueBox get updated values)     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Location | Responsibility | Communicates With |
|-----------|----------|---------------|-------------------|
| **SettingsDesigner.vue** | `src/editor/views/` | Top-level view: orchestrates canvas, palette, and property panel; manages selected element state | Pinia `useScriptStore` (reads/writes `script.data.ui.settingsScreen`), child components |
| **SettingsCanvas.vue** | `src/editor/components/canvas/` | 1280×720 artboard rendering settings component previews as DraggableElements; handles drop-to-add | `DraggableElement.vue` (reused), emits `select` / `position-update` / `element-add` to parent |
| **Component Palette** | Inline in `SettingsDesigner.vue` or separate `SettingsComponentPalette.vue` | Sidebar listing preset settings widgets (BGM slider, SE slider, text speed, etc.) with drag-to-canvas | SettingsCanvas via HTML5 drag-and-drop (`dataTransfer`) |
| **Property Panel** | Inline in `SettingsDesigner.vue` | Right sidebar showing editable properties for selected element (position, size, colors, fonts, label text) | Parent SettingsDesigner.vue (selected element ref) |
| **DraggableElement.vue** | `src/editor/components/canvas/` | Generic drag + resize wrapper with scale-aware coordinates | Already exists, reused as-is |
| **SettingsScreen.js** (refactored) | `src/ui/` | Reads `ui.settingsScreen` from script config; renders custom layout or falls back to default | `ConfigManager.js` (get/set values), callbacks to `main.js` |
| **ConfigManager.js** | `src/engine/` | Persists settings to localStorage, provides get/set API | Used by `SettingsScreen.js`, `main.js` (`applyConfig`) |

### What Is New vs. Reused

| Component | Status | Notes |
|-----------|--------|-------|
| `DraggableElement.vue` | **REUSE** as-is | Already supports move + resize + scale-aware coords |
| `useScriptStore` (Pinia) | **REUSE** as-is | `script.data.ui.settingsScreen` is reactive via deep watcher, auto-saves |
| `sanitize.js` | **REUSE** as-is | CSS injection prevention + coordinate clamping |
| `SettingsDesigner.vue` | **REPLACE** current placeholder | Shell exists, needs full implementation |
| `SettingsCanvas.vue` | **NEW** | Settings-specific canvas (simpler than CanvasPreview — no scenes/commands) |
| `SettingsScreen.js` | **REFACTOR** | Add `setLayout()` + `_renderCustom()` following TitleScreen.js pattern |
| `ConfigManager.js` | **EXTEND** | Add new setting keys: `fullscreen`, `skipRead`, `dialogueOpacity` |

## Data Model: `ui.settingsScreen` in `script.json`

Following the established `ui.titleScreen` pattern exactly. This is the **single source of truth** — editor writes it, engine reads it.

```json
{
  "ui": {
    "settingsScreen": {
      "background": "backgrounds/settings_bg.png",
      "elements": [
        {
          "id": "title-text",
          "type": "text",
          "content": "设 定",
          "x": 640,
          "y": 60,
          "anchor": "center",
          "style": {
            "fontSize": 32,
            "fontFamily": "Noto Serif SC",
            "color": "#ffffff",
            "letterSpacing": 8
          }
        },
        {
          "id": "bgm-slider",
          "type": "slider",
          "settingKey": "bgmVolume",
          "label": "BGM 音量",
          "x": 300,
          "y": 160,
          "width": 680,
          "style": {
            "labelColor": "#cccccc",
            "labelFontSize": 14,
            "trackColor": "rgba(255,255,255,0.2)",
            "fillColor": "#4a9eff",
            "thumbColor": "#ffffff"
          }
        },
        {
          "id": "se-slider",
          "type": "slider",
          "settingKey": "seVolume",
          "label": "SE 音量",
          "x": 300,
          "y": 230,
          "width": 680,
          "style": { }
        },
        {
          "id": "text-speed-slider",
          "type": "slider",
          "settingKey": "textSpeed",
          "label": "文字速度",
          "x": 300,
          "y": 300,
          "width": 680,
          "style": { }
        },
        {
          "id": "auto-speed-slider",
          "type": "slider",
          "settingKey": "autoSpeed",
          "label": "自动播放速度",
          "x": 300,
          "y": 370,
          "width": 680,
          "style": { }
        },
        {
          "id": "fullscreen-toggle",
          "type": "toggle",
          "settingKey": "fullscreen",
          "label": "全屏模式",
          "x": 300,
          "y": 440,
          "style": {
            "labelColor": "#cccccc",
            "activeColor": "#4a9eff",
            "inactiveColor": "rgba(255,255,255,0.2)"
          }
        },
        {
          "id": "skip-read-toggle",
          "type": "toggle",
          "settingKey": "skipRead",
          "label": "仅跳过已读文本",
          "x": 300,
          "y": 500,
          "style": { }
        },
        {
          "id": "dialogue-opacity-slider",
          "type": "slider",
          "settingKey": "dialogueOpacity",
          "label": "对话框透明度",
          "x": 300,
          "y": 560,
          "width": 680,
          "style": { }
        },
        {
          "id": "back-button",
          "type": "button",
          "action": "back",
          "label": "返回",
          "x": 640,
          "y": 650,
          "anchor": "center",
          "style": {
            "width": 180,
            "height": 44,
            "fontSize": 16,
            "color": "#ffffff",
            "backgroundColor": "rgba(255,255,255,0.1)",
            "borderRadius": 6
          }
        }
      ]
    }
  }
}
```

### Element Type Definitions

| Type | Purpose | Key Properties | Engine Logic (built-in) |
|------|---------|----------------|------------------------|
| `slider` | Range input for numeric settings | `settingKey`, `label`, `x`, `y`, `width`, `style` | Maps to ConfigManager key; handles min/max/step per setting key; displays value label |
| `toggle` | Boolean on/off switch | `settingKey`, `label`, `x`, `y`, `style` | Maps to ConfigManager key; toggles true/false |
| `button` | Action trigger (back, reset) | `action`, `label`, `x`, `y`, `style` | `"back"` hides screen, `"reset"` restores defaults |
| `text` | Static label/heading | `content`, `x`, `y`, `style` | Pure display, no interaction |

### Setting Keys Registry (Engine-Defined)

The engine defines the valid `settingKey` values. The editor presents these as a dropdown — the author cannot invent new keys.

| settingKey | Type | Default | Min | Max | Step | Display |
|------------|------|---------|-----|-----|------|---------|
| `bgmVolume` | slider | 0.5 | 0 | 1 | 0.01 | `${Math.round(v*100)}%` |
| `seVolume` | slider | 0.8 | 0 | 1 | 0.01 | `${Math.round(v*100)}%` |
| `textSpeed` | slider | 30 | 10 | 90 | 1 | mapped 1–10 scale |
| `autoSpeed` | slider | 2000 | 500 | 5000 | 100 | `${(v/1000).toFixed(1)}s` |
| `fullscreen` | toggle | false | — | — | — | on/off |
| `skipRead` | toggle | true | — | — | — | on/off |
| `dialogueOpacity` | slider | 0.8 | 0.1 | 1 | 0.05 | `${Math.round(v*100)}%` |

This registry lives as a `const SETTING_DEFS` object shared between editor and engine (or duplicated in both — simpler given the dual-app architecture).

## Data Flow

### 1. Editor: Author Designs Settings Page

```
Author drags "BGM 音量" slider from palette onto canvas
  │
  ▼
SettingsCanvas.vue handles @drop event
  │  reads dataTransfer: { type: 'slider', settingKey: 'bgmVolume', label: 'BGM 音量' }
  │  computes drop position (adjusted for canvas scale)
  ▼
SettingsDesigner.vue adds element to script.data.ui.settingsScreen.elements
  │  (direct Pinia reactive mutation)
  ▼
App.vue deep watcher fires → 500ms snapshot timer → pushState() (undo history)
                            → 2s save timer → project.saveProject(script.data)
  │
  ▼
IPC: 'save-project' → main process → atomic write to script.json on disk
```

### 2. Editor: Author Repositions/Styles Element

```
Author drags element on canvas (or edits property panel)
  │
  ▼
DraggableElement.vue emits 'move' { x, y }
  │
  ▼
SettingsCanvas.vue emits 'position-update' { elementId, x, y }
  │
  ▼
SettingsDesigner.vue finds element by id in script.data.ui.settingsScreen.elements
  │  updates element.x, element.y (reactive mutation)
  ▼
Auto-save pipeline (same as above)
```

### 3. Engine: Runtime Renders Custom Settings Page

```
main.js: init()
  │  engine.load('/game/script.json')
  │
  ▼
  if (engine.script.ui?.settingsScreen) {
    settingsScreen.setLayout(engine.script.ui.settingsScreen);  // NEW
  }

User triggers settings screen (title menu "设定" button, or ESC → Settings)
  │
  ▼
settingsScreen.show()
  │  if (this.layout && this.layout.elements) → _renderCustom()
  │  else → _renderDefault() (current behavior, unchanged)
  ▼
_renderCustom() iterates elements array:
  │
  ├─ type: "text"   → _createTextElement(cfg)    (static label)
  ├─ type: "slider"  → _createSliderElement(cfg)  (range input bound to settingKey)
  ├─ type: "toggle"  → _createToggleElement(cfg)  (checkbox/switch bound to settingKey)
  └─ type: "button"  → _createButtonElement(cfg)  (action: 'back' → hide(), 'reset' → defaults)
  │
  ▼
Each interactive element reads/writes ConfigManager via settingKey
  │  slider: cfg.get(settingKey) for initial value, cfg.set(settingKey, v) on input
  │  toggle: cfg.get(settingKey) for initial state, cfg.set(settingKey, !v) on click
  ▼
this._notifyChange() → settingsScreen.onChange callback in main.js → applyConfig()
```

### 4. Preview: Round-Trip Verification

```
Author clicks "▶ 预览" in editor
  │
  ▼
Editor saves script.data to disk (IPC: save-project)
  │
  ▼
IPC: open-preview → main process opens new BrowserWindow with index.html?project=<path>
  │
  ▼
Engine loads script.json (including ui.settingsScreen)
  │
  ▼
Player navigates to settings → sees custom layout with authored positions/styles
```

## Patterns to Follow

### Pattern 1: Mirror TitleScreen.js Architecture

**What:** The `TitleScreen.js` already implements exactly the pattern needed: `setLayout()` stores the config, `show()` branches between `_renderCustom()` and `_renderDefault()`, and `_renderCustom()` iterates elements creating positioned DOM nodes with sanitized styles.

**Why:** Code consistency, proven pattern, minimal risk.

**Implementation sketch for SettingsScreen.js:**

```javascript
// New method — mirrors TitleScreen.setLayout()
setLayout(layout) {
  this.layout = layout;
}

// Modified show() — mirrors TitleScreen.show()
show() {
  if (this.layout && this.layout.elements) {
    this._renderCustom();
  } else {
    this._render(); // existing default render, renamed from _render
  }
  this.el.classList.remove('hidden');
  requestAnimationFrame(() => this.el.classList.add('visible'));
}

_renderCustom() {
  this.el.innerHTML = '';
  this.el.style.position = 'absolute';
  this.el.style.inset = '0';

  if (this.layout.background) {
    this.el.style.backgroundImage = `url('/game/${this.layout.background}')`;
    this.el.style.backgroundSize = 'cover';
  }

  this.layout.elements.forEach(elem => {
    switch (elem.type) {
      case 'text':   this._createTextElement(elem); break;
      case 'slider': this._createSliderElement(elem); break;
      case 'toggle': this._createToggleElement(elem); break;
      case 'button': this._createButtonElement(elem); break;
    }
  });
}
```

### Pattern 2: Preset Component Palette (Not Free-Form)

**What:** The component palette offers **only predefined widgets** mapped to known `settingKey` values. The author cannot create arbitrary settings — they pick from BGM Volume, SE Volume, Text Speed, etc.

**Why:** Matches core philosophy ("developer doesn't touch logic"). The engine must know what every slider/toggle does. Free-form would require scripting, which violates the project's entire design.

**Implementation:** A static array of available components displayed in the palette sidebar:

```javascript
const SETTINGS_COMPONENTS = [
  { type: 'slider', settingKey: 'bgmVolume', label: 'BGM 音量', icon: '🔊' },
  { type: 'slider', settingKey: 'seVolume', label: 'SE 音量', icon: '🔔' },
  { type: 'slider', settingKey: 'textSpeed', label: '文字速度', icon: '⌨️' },
  { type: 'slider', settingKey: 'autoSpeed', label: '自动播放速度', icon: '⏩' },
  { type: 'toggle', settingKey: 'fullscreen', label: '全屏模式', icon: '🖥️' },
  { type: 'toggle', settingKey: 'skipRead', label: '跳过已读', icon: '⏭️' },
  { type: 'slider', settingKey: 'dialogueOpacity', label: '对话框透明度', icon: '💬' },
  { type: 'text', settingKey: null, label: '文本标签', icon: '📝' },
  { type: 'button', settingKey: null, label: '按钮', icon: '🔘', action: 'back' },
];
```

### Pattern 3: Element ID Generation

**What:** Each element gets a unique `id` for editor selection tracking and element lookup during updates. Use `type-settingKey-timestamp` or a simple counter.

**Why:** The TitleScreen elements don't have IDs (they're rendered once and forgotten), but the editor needs stable references for selection, property editing, and undo/redo.

```javascript
function generateElementId(type, settingKey) {
  return `${type}-${settingKey || 'custom'}-${Date.now()}`;
}
```

### Pattern 4: Reuse DraggableElement Without Modification

**What:** `DraggableElement.vue` already handles position, resize, selection, and scale-aware coordinates. Use it as-is, wrapping each settings component preview.

**Why:** The component is well-tested and handles the tricky scale math. Settings elements have simpler shapes than scene elements (no character sprites), so the existing capability is more than sufficient.

### Pattern 5: Ensured `ui` Object Initialization

**What:** When a project is created without settings screen data, ensure `script.data.ui` and `script.data.ui.settingsScreen` are initialized with defaults on first access.

**Why:** Existing projects won't have this field. The demo `script.json` doesn't have a `ui` section at all.

```javascript
// In SettingsDesigner.vue setup
function ensureSettingsData() {
  if (!script.data.ui) script.data.ui = {};
  if (!script.data.ui.settingsScreen) {
    script.data.ui.settingsScreen = { background: null, elements: [] };
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Settings Store

**What:** Creating a new Pinia store like `useSettingsDesignerStore` for the settings page data.

**Why bad:** The settings layout is part of `script.json` and must travel with the project. It already lives in `script.data.ui.settingsScreen`. A separate store would create sync issues, break undo/redo (which operates on `script.data` snapshots), and bypass the existing auto-save pipeline.

**Instead:** Read/write `script.data.ui.settingsScreen` directly. The existing deep watcher on `script.data` handles everything.

### Anti-Pattern 2: Engine-Side Layout Persistence

**What:** Having the engine save settings layout preferences or merge author layout with runtime state.

**Why bad:** The engine is read-only with respect to layout. It reads `ui.settingsScreen` from `script.json` and renders. Config values (volumes, speeds) go to `localStorage` via `ConfigManager`. Layout never changes at runtime.

**Instead:** Strict separation: layout from `script.json` (authored), values from `localStorage` (player preferences).

### Anti-Pattern 3: Duplicating CanvasPreview.vue

**What:** Copying CanvasPreview.vue and modifying it for settings elements.

**Why bad:** CanvasPreview.vue is scene-specific (background, characters, dialogue, choices — driven by command replay). Copying it would create maintenance burden and diverge quickly.

**Instead:** Create a new `SettingsCanvas.vue` that is *simpler* — it only renders an artboard with positioned DraggableElements for each settings component. No command replay needed. Share only the sub-component (`DraggableElement.vue`).

### Anti-Pattern 4: Free-Form Scripting of Settings Behavior

**What:** Allowing authors to define custom slider ranges, custom config keys, or JavaScript expressions for settings behavior.

**Why bad:** Violates "developer doesn't touch logic." Creates security risks (arbitrary code execution). Adds enormous complexity.

**Instead:** Fixed registry of `settingKey` values. Engine knows the range, step, and display format for each. Author only controls position and visual style.

## Component Detail: SettingsDesigner.vue Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Toolbar: "设置页设计" | Background selector | Reset to default  │
├──────────┬──────────────────────────────────┬───────────────────┤
│ Component│                                  │ Property Panel    │
│ Palette  │     Settings Canvas              │                   │
│ (160px)  │     (1280×720 scaled)            │ [Position]        │
│          │                                  │  X: [___] Y: [___]│
│ ┌──────┐ │  ┌────────────────────────────┐  │                   │
│ │🔊 BGM│ │  │                            │  │ [Size]            │
│ │Volume│ │  │  ┌─ 设 定 ──────────┐      │  │  W: [___] H:[___]│
│ └──────┘ │  │  │                  │      │  │                   │
│ ┌──────┐ │  │  │ BGM 音量 ═══●══ │      │  │ [Label]           │
│ │🔔 SE │ │  │  │ SE  音量 ══●═══ │      │  │  Text: [________] │
│ │Volume│ │  │  │ 文字速度 ════●═ │      │  │                   │
│ └──────┘ │  │  │ 自动播放 ═●════ │      │  │ [Style]           │
│ ┌──────┐ │  │  │ [全屏] ○ ON     │      │  │  Color: [#______] │
│ │⌨️ Text│ │  │  │                  │      │  │  Font:  [_______] │
│ │Speed │ │  │  │    [ 返回 ]      │      │  │  BgColor: [#____]│
│ └──────┘ │  │  └──────────────────┘      │  │                   │
│ ┌──────┐ │  │                            │  │                   │
│ │⏩Auto │ │  └────────────────────────────┘  │                   │
│ │Speed │ │                                  │                   │
│ └──────┘ │                                  │                   │
│ ┌──────┐ │                                  │                   │
│ │🖥️Full│ │                                  │                   │
│ │screen│ │                                  │                   │
│ └──────┘ │                                  │                   │
│ ┌──────┐ │                                  │                   │
│ │📝Text│ │                                  │                   │
│ │Label │ │                                  │                   │
│ └──────┘ │                                  │                   │
│ ┌──────┐ │                                  │                   │
│ │🔘Back│ │                                  │                   │
│ │Btn  │ │                                  │                   │
│ └──────┘ │                                  │                   │
├──────────┴──────────────────────────────────┴───────────────────┤
```

## Component Detail: SettingsScreen.js Rendering

The refactored engine renderer creates DOM elements for each widget type:

### Slider Rendering

```javascript
_createSliderElement(cfg) {
  const def = SETTING_DEFS[cfg.settingKey];
  if (!def) return; // unknown setting, skip

  const wrap = document.createElement('div');
  wrap.className = 'settings-custom-element settings-slider-wrap';
  this._applyPosition(wrap, cfg);
  if (cfg.width) wrap.style.width = `${clampField('width', cfg.width)}px`;

  // Label
  const label = document.createElement('span');
  label.className = 'settings-slider-label';
  label.textContent = cfg.label || def.label;
  // apply style.labelColor, style.labelFontSize via sanitizeCssValue

  // Slider input
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = def.min;
  slider.max = def.max;
  slider.step = def.step;
  slider.value = this.configManager.get(cfg.settingKey);
  // apply style.trackColor, style.fillColor via CSS custom properties

  // Value display
  const valSpan = document.createElement('span');
  valSpan.className = 'settings-slider-value';
  valSpan.textContent = def.format(slider.value);

  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    this.configManager.set(cfg.settingKey, v);
    valSpan.textContent = def.format(v);
    this._notifyChange();
  });

  wrap.append(label, slider, valSpan);
  this.el.appendChild(wrap);
}
```

### Toggle Rendering

```javascript
_createToggleElement(cfg) {
  const wrap = document.createElement('div');
  wrap.className = 'settings-custom-element settings-toggle-wrap';
  this._applyPosition(wrap, cfg);

  const label = document.createElement('span');
  label.textContent = cfg.label;

  const toggle = document.createElement('button');
  toggle.className = 'settings-toggle-btn';
  let isOn = !!this.configManager.get(cfg.settingKey);
  updateToggleVisual(toggle, isOn, cfg.style);

  toggle.addEventListener('click', () => {
    isOn = !isOn;
    this.configManager.set(cfg.settingKey, isOn);
    updateToggleVisual(toggle, isOn, cfg.style);
    this._notifyChange();
  });

  wrap.append(label, toggle);
  this.el.appendChild(wrap);
}
```

## Scalability Considerations

| Concern | Current (7 settings) | At 15 settings | At 30+ settings |
|---------|---------------------|-----------------|-----------------|
| Element count in JSON | 7-10 elements | 15-18 elements | Not recommended — UX issue |
| Canvas performance | No issue (DOM elements, not canvas pixels) | No issue | No issue |
| Undo/redo (JSON snapshots) | ~2KB per snapshot × 50 = ~100KB | ~4KB × 50 = ~200KB | Still fine |
| Engine render time | Instant (DOM creation) | Instant | Instant |
| ConfigManager keys | Extend defaults object | Extend defaults object | Consider grouping |

**The real limit is UX, not performance.** 7 settings is the sweet spot for galgame. The architecture supports more, but the product shouldn't encourage 30+ settings.

## Build Order (Dependencies)

The components have clear dependency ordering. Each step must work before the next can begin.

### Step 1: Data Schema (no dependencies)
- Define `ui.settingsScreen` structure in `script.json`
- Define `SETTING_DEFS` registry (setting key → min/max/step/format)
- Update `docs/script-format.md` with settings screen specification

**Produces:** Stable data contract that both editor and engine code against.

### Step 2: Engine Rendering (depends on Step 1)
- Refactor `SettingsScreen.js`: add `setLayout()`, `_renderCustom()`, element renderers
- Extend `ConfigManager.js`: add `fullscreen`, `skipRead`, `dialogueOpacity` defaults
- Wire layout in `src/main.js`: `settingsScreen.setLayout(engine.script.ui?.settingsScreen)`
- Add CSS for custom settings elements in `src/style.css`

**Why engine first:** Can be tested immediately with a hand-written JSON fixture. No editor dependency. Validates the data model works before building editor UI.

### Step 3: Editor Canvas + Palette (depends on Step 1)
- Create `SettingsCanvas.vue` (artboard + DraggableElement rendering)
- Build component palette (sidebar with draggable preset widgets)
- Implement drag-to-canvas (HTML5 drag/drop → add element to `script.data.ui.settingsScreen.elements`)
- Implement click-to-select, drag-to-reposition, delete element

**Can run in parallel with Step 2** once the data schema is locked.

### Step 4: Property Panel + Polish (depends on Step 3)
- Build property panel (right sidebar: position, size, label, style fields)
- Background image selector (reuse asset panel pattern)
- "Quick setup" button to populate default layout with all standard settings
- Undo/redo verification (settings changes go through `script.data` watcher)

### Step 5: Integration Testing (depends on Steps 2 + 4)
- End-to-end: design in editor → save → preview → verify custom layout renders
- Backward compatibility: projects without `ui.settingsScreen` → engine shows default
- Edge cases: empty elements array, missing style fields, invalid settingKey

```
Step 1 (Schema)
  ├──→ Step 2 (Engine)  ──┐
  └──→ Step 3 (Editor)    ├──→ Step 5 (Integration)
         └──→ Step 4 (Properties) ──┘
```

## Key Integration Points

### 1. App.vue Tab Registration (already done)
The tab `settings-design` already routes to `SettingsDesigner.vue` in `App.vue` line 78-91. No changes needed to the tab system.

### 2. script.json Save/Load Pipeline (no changes needed)
The auto-save deep watcher on `script.data` in `App.vue` (line 101-114) already captures any mutation to `script.data.ui.settingsScreen`. The existing `save-project` IPC handler serializes the entire script object. **Zero changes to the save pipeline.**

### 3. Undo/Redo (no changes needed)
`useScriptStore.pushState()` does `JSON.parse(JSON.stringify(script.data))` — full deep clone. Settings data inside `script.data.ui` is automatically included. **Zero changes to undo/redo.**

### 4. Engine Initialization (2 lines of change)
In `src/main.js`, after `engine.load()`:
```javascript
if (engine.script.ui?.settingsScreen) {
  settingsScreen.setLayout(engine.script.ui.settingsScreen);
}
```
This mirrors the existing title screen pattern at lines 425-427.

### 5. Asset Protocol (no changes needed)
Background images for the settings page use the same `asset://` protocol. The `backgrounds/` directory already serves through the registered protocol handler. **Zero changes.**

## Security Considerations

All existing security measures apply without modification:

- **CSS sanitization:** `sanitizeCssValue()` and `clampField()` from `src/ui/sanitize.js` must be used in `SettingsScreen.js` `_renderCustom()` for all author-provided style values (colors, fonts, sizes). Same pattern as `TitleScreen.js` lines 91-98.
- **Path traversal:** Background image paths go through the `asset://` protocol which validates paths stay within `assets/`. Already enforced.
- **No new IPC channels needed.** Everything flows through existing `save-project` / `load-project`.

## Sources

- **HIGH confidence:** All findings based on direct codebase analysis of existing files
  - `src/ui/TitleScreen.js` — pattern template for custom layout rendering
  - `src/ui/SettingsScreen.js` — current implementation to refactor
  - `src/engine/ConfigManager.js` — settings persistence layer
  - `src/editor/components/canvas/CanvasPreview.vue` — canvas infrastructure reference
  - `src/editor/components/canvas/DraggableElement.vue` — reusable drag component
  - `src/editor/views/Scenes.vue` — full editor view pattern (sidebar + canvas + inspector)
  - `src/main.js` — engine wiring and initialization
  - `src/editor/App.vue` — tab routing and auto-save pipeline
  - `docs/script-format.md` — existing `ui.titleScreen` data model
  - `.planning/codebase/ARCHITECTURE.md` — system architecture reference

---

*Architecture research: 2025-07-17*
