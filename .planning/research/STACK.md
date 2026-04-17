# Technology Stack — Settings Screen Structural Customization

**Project:** Galgame Maker v1.3 — 设置页结构参数化
**Researched:** 2025-07-27
**Scope:** Only new capabilities needed for settings screen structural customization. Existing stack is validated and unchanged.

## Executive Summary: ZERO New Dependencies

This milestone requires **no new libraries, no npm installs, no stack changes.** Every capability is achievable with existing CSS Grid/Flexbox, pure DOM manipulation in the engine, and Vue 3 components in the editor.

The existing architecture provides all building blocks: `SettingsScreen.js` already has structured mode rendering, `widgetStyles` handles control appearance, `TabWidget.js` supports 5 tab shapes, and `SettingsSection.vue` has the editor form pattern. The work is extending existing config-driven rendering with more structural parameters.

**Confidence: HIGH** — Based on direct source code analysis of `SettingsScreen.js`, `settingDefs.js`, `widgetDefaults.js`, `TabWidget.js`, `SettingsSection.vue`, `builtinThemes.js`.

## Existing Stack (Unchanged)

### Core
| Technology | Version | Purpose | v1.3 Impact |
|------------|---------|---------|-------------|
| Electron | 41.x | Desktop shell | No change |
| Vue 3 | 3.5.31 | Editor UI | Extend SettingsSection.vue |
| Pinia | 3.0.4 | State management | No change |
| Vite | 6.3.0 | Build tool | No change |
| fflate | 0.8.2 | Theme ZIP | No change |

### Runtime Engine
| Technology | Purpose | v1.3 Impact |
|------------|---------|-------------|
| Pure JS (ES Modules) | Game engine | Extend SettingsScreen.js |
| CSS Grid/Flexbox | Layouts | 2-column grid, left-tab flexbox |
| DOM rendering | Settings UI | Config-driven tab/content rendering |

## Capabilities Needed (All Built With Existing Stack)

### 1. CSS Grid for 2-Column Layout

**What:** Side-by-side settings items in the content area.

**How:** CSS Grid on the content container, already available in all target browsers.

```javascript
// In _renderStructuredContent():
if (columns === 2) {
  container.style.display = 'grid';
  container.style.gridTemplateColumns = '1fr 1fr';
  container.style.gap = gap + 'px';
}
```

**Confidence: HIGH** — CSS Grid is used nowhere else in the engine yet, but the project targets Electron 41 (Chromium 130+) which has full Grid support. Web export targets modern browsers.

### 2. Flexbox for Left-Tab Sidebar

**What:** Vertical tab navigation on the left side of the settings panel.

**How:** When `tabBar.position === 'left'`, render the structured mode as a row flexbox instead of column.

```javascript
// settings-structured container:
if (position === 'left') {
  this.el.style.display = 'flex';
  this.el.style.flexDirection = 'row';
  // tab sidebar: flex-direction: column, fixed width
  // main area: flex: 1
}
```

**Confidence: HIGH** — Flexbox is the established layout primitive in the engine. `_renderStructured()` already uses inline flexbox for the tab bar.

### 3. Config-Driven Tab Rendering

**What:** Read tab labels, icons, and setting-key assignments from config instead of hardcoded constants.

**How:** Replace `SETTING_GROUP_KEYS[this._activeTab]` lookup with `tabBar.tabs[this._activeTab].settingKeys`. Tab buttons already render from a `tabLabels` array (line 447-495) — just change the source.

```javascript
const tabCfg = layout.tabBar || {};
const tabs = tabCfg.tabs || DEFAULT_TAB_LABELS.map((label, i) => ({
  label,
  settingKeys: SETTING_GROUP_KEYS[i],
}));
```

**Confidence: HIGH** — Direct extension of existing rendering logic. The `createTabBar()` function already takes `labels[]` parameter.

### 4. Tab Icon Rendering

**What:** Optional icon image next to tab labels.

**How:** When `tab.icon` is set, prepend an `<img>` element to the tab button.

```javascript
if (tab.icon) {
  const img = document.createElement('img');
  img.src = resolvePath(tab.icon);
  img.style.width = '20px';
  img.style.height = '20px';
  img.style.marginRight = '6px';
  btn.prepend(img);
}
```

**Confidence: HIGH** — `resolvePath()` from `assetPath.js` is already used throughout the engine for asset URLs.

### 5. Row Styling (Dividers/Zebra)

**What:** Visual separators between setting rows, alternating background colors.

**How:** Apply inline styles in the content rendering loop based on `itemStyle` config.

**Confidence: HIGH** — Trivial CSS application in the existing `_renderStructuredContent()` loop.

### 6. Header Decorations

**What:** Positioned decorative images in the header area.

**How:** Render `<img>` elements with absolute positioning inside the header, exactly like the existing `_renderImageElem()` in custom layout mode.

**Confidence: HIGH** — The `_renderImageElem()` method is already a working reference.

## What NOT to Add

| Don't Add | Why Not |
|-----------|---------|
| **CSS Grid library (e.g., Bootstrap Grid)** | Native CSS Grid is sufficient. 1-2 columns, no need for a framework. |
| **Drag-and-drop library (e.g., vuedraggable)** | Tab/setting reordering is by config array order, not runtime drag. Editor can handle this with simple up/down buttons. |
| **Animation library** | Tab switch animation is CSS only (opacity/transform). No GSAP/anime.js needed. |
| **Form builder** | Editor settings forms are hand-written Vue SFCs (established pattern across all layout editors). |
| **JSON schema validator** | Engine validates at render time with console.warn. No need for ajv/joi at runtime. |

## Implementation Summary

| Capability | Approach | File(s) to Modify | Effort |
|-----------|----------|-------------------|--------|
| Config-driven tabs | Read tabs[] from layout config | `SettingsScreen.js` | Low |
| Tab icons | img prepend in tab button | `SettingsScreen.js` or `TabWidget.js` | Low |
| 2-column layout | CSS Grid on content container | `SettingsScreen.js` | Low |
| Left-tab sidebar | Flexbox row on structured container | `SettingsScreen.js` | Medium |
| Row styling | Inline styles in render loop | `SettingsScreen.js` | Low |
| Header decorations | Positioned img elements | `SettingsScreen.js` | Low |
| Footer reset action | ConfigManager.resetToDefaults() | `SettingsScreen.js`, `ConfigManager.js` | Low |
| Panel background | Background image layer | `SettingsScreen.js` | Low |
| Editor tab editor | Vue SFC with list + checkboxes | `SettingsSection.vue` | High |
| Editor layout controls | Form inputs for columns/gap/etc | `SettingsSection.vue` | Medium |
| Theme updates | Extend builtinThemes.js | `builtinThemes.js` | Medium |

**Total new npm dependencies: 0**
**Total new files: 0** (all modifications to existing files)
**Total modified files: ~4-5** (SettingsScreen.js, ConfigManager.js, SettingsSection.vue, builtinThemes.js, possibly TabWidget.js)

## Sources

All sources are direct codebase analysis (HIGH confidence):

- `src/ui/SettingsScreen.js` — 3-mode rendering, structured mode with hardcoded tab grouping
- `src/engine/settingDefs.js` — SETTING_DEFS registry (9 settings), config schema docs
- `src/engine/widgetDefaults.js` — Widget merge pattern (deepMergeWidgetStyles)
- `src/ui/widgets/TabWidget.js` — Tab rendering with 5 shape variants
- `src/ui/widgets/SliderWidget.js` — Slider rendering with CSS custom properties
- `src/editor/components/layout/SettingsSection.vue` — Current editor settings form (header/tabBar/contentArea)
- `src/editor/builtinThemes.js` — 5 built-in themes, settingsScreen config shape
- `src/engine/ConfigManager.js` — User preference storage, defaults
- `src/engine/ThemeManager.js` — Theme application, 9-slice system
