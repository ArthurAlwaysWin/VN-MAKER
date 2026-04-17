# Architecture Patterns — Settings Screen Structural Customization

**Domain:** Settings screen layout parameterization in Galgame Maker (visual novel engine + editor)
**Researched:** 2025-07-27
**Confidence:** HIGH — based entirely on direct codebase inspection of SettingsScreen.js, settingDefs.js, widgetDefaults.js, TabWidget.js, SettingsSection.vue, builtinThemes.js

## Executive Summary

The settings screen structural customization integrates into an established config-driven architecture where the editor (Vue 3 + Pinia) writes layout config to `script.json → ui.settingsScreen`, and the engine (pure JS) renders from it. The existing code already has a 3-mode rendering system (custom/structured/default) with sparse config merging. The new work extends the **structured mode** with user-configurable tab structure, multi-column content layout, row styling, and header/footer flexibility — all as optional config parameters with backward-compatible defaults.

## Recommended Architecture

### Integration Map — What Changes Where

```
┌─────────────── EDITOR (Vue 3 + Pinia) ───────────────┐
│                                                        │
│  script.js store          — No changes (getters exist) │
│  useScreenLayoutEditor.js — No changes (wiring exists) │
│                                                        │
│  SettingsSection.vue      — MAJOR EXTEND: add tab      │
│    ├─ Tab list editor        editor, layout controls,  │
│    ├─ Layout controls        row style, header deco,   │
│    ├─ Row style              footer buttons editor     │
│    └─ Header/Footer                                    │
│                                                        │
│  builtinThemes.js         — UPDATE: add structural     │
│                             params to existing themes   │
│                                                        │
├─────────────── DATA MODEL (script.json) ──────────────┤
│                                                        │
│  ui.settingsScreen        — EXTEND (all new fields     │
│    ├─ background             optional with defaults):  │
│    ├─ backgroundOpacity      - tabBar.tabs[].settingKeys│
│    ├─ header.decorations[]   - tabBar.position          │
│    ├─ tabBar.tabs[]          - contentArea.columns      │
│    ├─ tabBar.position        - contentArea.itemStyle    │
│    ├─ contentArea.columns    - header.decorations[]     │
│    ├─ contentArea.itemStyle  - footer.buttons[].action  │
│    └─ footer.buttons[]                                 │
│                                                        │
│  settingDefs.js           — No changes (registry       │
│    SETTING_DEFS              stays as-is, tabs now     │
│                              reference keys from it)   │
│                                                        │
├─────────────── ENGINE (Pure JS) ──────────────────────┤
│                                                        │
│  SettingsScreen.js        — MAJOR EXTEND:              │
│    _renderStructured()       config-driven tabs,       │
│    _renderStructuredContent  2-col grid, item styling, │
│    NEW: _renderLeftTabs()    left-tab mode, header     │
│    NEW: _renderHeaderDeco()  decorations, reset action │
│    NEW: _renderFooterBtn()                             │
│                                                        │
│  ConfigManager.js         — ADD: resetToDefaults()     │
│                                                        │
│  widgetDefaults.js        — No changes                 │
│  TabWidget.js             — Minor: icon support        │
│  style.css                — Minor: grid/zebra rules    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Action | Communicates With |
|-----------|---------------|--------|-------------------|
| **SettingsScreen.js** (major extend) | Render settings UI from config | Extend `_renderStructured()` for new params | ConfigManager, TabWidget, widgetStyles |
| **ConfigManager.js** (minor extend) | User preference storage + reset | Add `resetToDefaults()` method | SettingsScreen (via reset action) |
| **TabWidget.js** (minor extend) | Tab button rendering | Add icon image support | SettingsScreen |
| **SettingsSection.vue** (major extend) | Editor form for settings layout | Add tab editor, layout controls, row style | useScreenLayoutEditor, script store |
| **builtinThemes.js** (update) | Built-in theme presets | Add structural params to themes | Theme application system |

### Data Flow

#### A. Config Loading → Engine Rendering

```
script.json → ui.settingsScreen
  │
  ├─ main.js → settingsScreen.setLayout(config)
  │
  └─ SettingsScreen.show()
      │
      ├─ Has elements[]? → _renderCustom (absolute positioning mode)
      │                     NO CHANGES — backward compat
      │
      ├─ Has header/tabBar/contentArea? → _renderStructured
      │   │
      │   ├─ Read tabBar.tabs[] (NEW) or fall back to defaults
      │   │
      │   ├─ tabBar.position === 'left'?
      │   │   ├─ YES → _renderLeftTabStructured (NEW render path)
      │   │   └─ NO  → _renderTopTabStructured (existing, extended)
      │   │
      │   ├─ Render header (with decorations[] if present)
      │   ├─ Render tab bar (with icons if present)
      │   ├─ Render content area
      │   │   ├─ columns === 2? → CSS Grid 1fr 1fr
      │   │   └─ columns === 1 → Flex column (default)
      │   │
      │   ├─ Render items with itemStyle
      │   │   ├─ showDividers → border-top on items
      │   │   ├─ alternateBackground → background on odd items
      │   │   ├─ labelPosition === 'top' → flex-direction: column
      │   │   └─ showValueLabel → skip/show value span
      │   │
      │   └─ Render footer (with reset action if present)
      │
      └─ No config? → _renderDefault (fallback mode)
                       NO CHANGES — backward compat
```

#### B. Tab Content Resolution

```
Tab rendering:
  │
  ├─ tabs[] exists in config?
  │   │
  │   ├─ YES → For each tab, use tab.settingKeys to determine items
  │   │         │
  │   │         └─ Collect all assigned keys across tabs
  │   │            Unassigned SETTING_DEFS keys → append to last tab
  │   │
  │   └─ NO → Fall back to DEFAULT_TAB_LABELS + SETTING_GROUP_KEYS
  │
  └─ On tab switch:
      ├─ _activeTab = index
      ├─ Read tabs[_activeTab].settingKeys
      └─ _renderStructuredContent() with those keys
```

#### C. Editor → Engine Preview

```
SettingsSection.vue
  │
  ├─ User edits config in form controls
  ├─ editor.setScreenNestedField(group, field, value)
  ├─ editor.sendScreenLayoutToPreview()
  │
  └─ postMessage to iframe → engine receives layout config
      └─ settingsScreen.setLayout(newConfig)
         settingsScreen.show() → re-renders with new params
```

## Detailed Integration Points

### 1. Tab Structure (settingDefs.js ↔ SettingsScreen.js)

**Current state:**
```js
// Hardcoded in SettingsScreen.js
const SETTING_GROUP_KEYS = [
  ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'],   // Tab 0
  ['dialogue-opacity', 'window-mode'],                              // Tab 1
  ['text-speed', 'auto-speed', 'skip-mode'],                       // Tab 2
];
const DEFAULT_TAB_LABELS = ['声音', '画面', '游戏'];
```

**New approach:**
```js
// In _renderStructured():
const tabCfg = layout.tabBar || {};
const tabs = tabCfg.tabs?.map(t => ({
  label: t.label,
  icon: t.icon || null,
  settingKeys: t.settingKeys || [],
}));

// Fallback when tabs not configured:
if (!tabs) {
  const tabs = DEFAULT_TAB_LABELS.map((label, i) => ({
    label,
    icon: null,
    settingKeys: SETTING_GROUP_KEYS[i] || [],
  }));
}

// Handle unassigned SETTING_DEFS keys:
const allAssigned = new Set(tabs.flatMap(t => t.settingKeys));
const unassigned = Object.keys(SETTING_DEFS).filter(k => !allAssigned.has(k));
if (unassigned.length > 0 && tabs.length > 0) {
  tabs[tabs.length - 1].settingKeys.push(...unassigned);
}
```

**Backward compat:** `SETTING_GROUP_KEYS` and `DEFAULT_TAB_LABELS` remain as fallback constants. Only used when `tabBar.tabs` is absent.

### 2. Content Layout (CSS Grid)

**Current state:**
```js
// In _renderStructuredContent() — items rendered as flex column
item.style.display = 'flex';
item.style.alignItems = 'center';
item.style.padding = '12px 0';
```

**New approach:**
```js
// Content container layout
const columns = areaCfg.columns || 1;
const gap = areaCfg.gap || 16;

if (columns === 2) {
  container.style.display = 'grid';
  container.style.gridTemplateColumns = '1fr 1fr';
  container.style.gap = `${gap}px`;
} else {
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = `${gap}px`;
}
```

### 3. Left-Tab Sidebar Mode

**Current DOM structure (top tabs):**
```
#settings-screen.settings-structured
  ├── .settings-structured-header
  ├── .settings-structured-tab-bar (horizontal flex)
  ├── .settings-structured-content (absolute positioned)
  └── .settings-structured-footer
```

**New DOM structure (left tabs):**
```
#settings-screen.settings-structured.settings-left-tabs
  ├── .settings-tab-sidebar (vertical flex, fixed width)
  │   └── tab buttons (stacked vertically)
  └── .settings-main-area (flex: 1)
      ├── .settings-structured-header
      ├── .settings-structured-content
      └── .settings-structured-footer
```

**Implementation:** Separate render path `_renderLeftTabStructured()` rather than trying to reconfigure the existing top-tab structure. This is cleaner because the DOM hierarchy is fundamentally different (tabs are a sibling of the main area, not a child).

### 4. ConfigManager.resetToDefaults()

**New method:**
```js
resetToDefaults() {
  this.config = { ...this.defaults };
  this.save();
}
```

**Footer button handler in SettingsScreen:**
```js
if (btnCfg.action === 'reset') {
  this.configManager.resetToDefaults();
  // Re-render to update all controls
  this._renderStructuredContent(layout);
}
```

### 5. Header Decorations

**Rendering pattern (reuses `_renderImageElem` approach):**
```js
if (hdr.decorations?.length) {
  for (const deco of hdr.decorations) {
    if (!deco.src) continue;
    const img = document.createElement('img');
    img.src = resolvePath(sanitizeCssValue(deco.src));
    img.style.position = 'absolute';
    img.style.left = clampField('x', deco.x) + 'px';
    img.style.top = clampField('y', deco.y) + 'px';
    img.style.width = clampField('width', deco.width) + 'px';
    img.style.height = clampField('height', deco.height) + 'px';
    img.style.pointerEvents = 'none';
    img.draggable = false;
    header.appendChild(img);
  }
}
```

## Patterns to Follow

### Pattern 1: Sparse Config Merge (Established)

**What:** All new config parameters have defaults. Missing fields use defaults, not errors.

**When:** ALWAYS — this is THE architectural pattern of the project.

**Why:** Proven across widgetDefaults.js (`deepMergeWidgetStyles`), all theme configs, all screen layout configs. Zero breaking changes for existing projects.

### Pattern 2: Fallback Chain (Established)

**What:** When new config field is missing, fall back to previous behavior.

```js
const tabs = tabCfg.tabs || DEFAULT_TAB_LABELS.map((label, i) => ({
  label, settingKeys: SETTING_GROUP_KEYS[i]
}));
```

**When:** For every new structural parameter.

**Why:** Ensures existing `settingsScreen` configs in saved projects and built-in themes continue working without migration.

### Pattern 3: Isolated Render Paths (New for Left Tabs)

**What:** `tabBar.position === 'left'` uses a separate `_renderLeftTabStructured()` method instead of conditionals throughout existing render code.

**When:** A structural variant requires fundamentally different DOM hierarchy.

**Why:** Avoids spaghetti conditionals in `_renderStructured()`. Each mode is readable and testable in isolation.

### Pattern 4: Engine Config + Editor Form (Established)

**What:** Engine reads config and renders. Editor writes config through form controls. Communication via `setLayout()` + `postMessage` preview.

**When:** ALWAYS — established by `SettingsSection.vue` ↔ `useScreenLayoutEditor.js` ↔ `SettingsScreen.js`.

**Why:** Clean separation of concerns. Editor doesn't know about rendering, engine doesn't know about Vue.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mixing Structured and Custom Layout
**What:** Allowing elements[] AND structural params in the same config.
**Why bad:** Two layout systems fighting over the same DOM. The existing mode detection (line 84-89) is clean: elements[] → custom mode, header/tabBar → structured mode. Don't blur this boundary.
**Instead:** Structured mode only. For pixel-perfect control, use custom layout mode.

### Anti-Pattern 2: Runtime Config Validation with Errors
**What:** Throwing errors when config is malformed.
**Why bad:** Crashes the settings screen. Users can't fix it from the game.
**Instead:** `console.warn()` + skip invalid items + fall back to defaults. The settings screen must always render.

### Anti-Pattern 3: Deep Config Nesting (> 3 Levels)
**What:** `settingsScreen.contentArea.itemStyle.label.font.family`.
**Why bad:** Hard to merge, hard to edit in forms, easy to get path wrong.
**Instead:** Maximum 3 levels: `settingsScreen.contentArea.itemStyle.labelFontSize`. Flatten where possible.

### Anti-Pattern 4: Per-Setting Style Overrides in Layout Config
**What:** `settingKeys: [{ key: 'bgm-volume', labelColor: '#ff0', trackColor: '#0f0' }]`.
**Why bad:** Duplicates widgetStyles system. Creates per-item style explosion. Editor UI becomes impossibly complex.
**Instead:** widgetStyles controls ALL setting appearance globally. Layout config controls only structural arrangement.

## Build Order

```
Phase 1: Tab Structure + Setting Assignment (Engine)
  ├─ Replace SETTING_GROUP_KEYS lookup with config-driven tabs
  ├─ Unassigned-keys-to-last-tab fallback
  ├─ Tab icon rendering
  └─ Testable: manually set tabBar.tabs in script.json

Phase 2: Content Layout + Row Styling (Engine)
  ├─ contentArea.columns (1 or 2) → CSS Grid
  ├─ contentArea.gap → spacing
  ├─ itemStyle (dividers, zebra, labelPosition, labelWidth, showValueLabel)
  └─ Testable: manually set contentArea in script.json

Phase 3: Chrome Features (Engine)
  ├─ header.decorations[] rendering
  ├─ header.showCloseButton toggle
  ├─ footer reset action + ConfigManager.resetToDefaults()
  ├─ Panel background image
  ├─ tabBar.position: 'left' (separate render path)
  └─ Testable: manually set full config

Phase 4: Editor UI (Vue)
  ├─ Tab list editor (add/remove/reorder, label, icon, setting assignment)
  ├─ Content layout controls (columns, gap, labelPosition)
  ├─ Row style controls (dividers, zebra)
  ├─ Header decoration editor
  ├─ Footer button editor
  └─ All connected via useScreenLayoutEditor composable

Phase 5: Built-in Theme Updates
  ├─ Update existing themes with structural params
  └─ Create showcase configs demonstrating different layouts
```

## Sources

- `src/ui/SettingsScreen.js` — 3-mode rendering, structured mode implementation (lines 376-603)
- `src/engine/settingDefs.js` — SETTING_DEFS registry (9 settings, 3 types), config schema documentation
- `src/engine/widgetDefaults.js` — WIDGET_DEFAULTS, deepMergeWidgetStyles sparse merge pattern
- `src/ui/widgets/TabWidget.js` — createTabBar(), 5 shape variants, style application
- `src/ui/widgets/SliderWidget.js` — CSS custom property-based styling
- `src/editor/components/layout/SettingsSection.vue` — Current editor form (header/tabBar/contentArea)
- `src/editor/composables/useScreenLayoutEditor.js` — Preview communication, debounced postMessage
- `src/editor/builtinThemes.js` — 5 themes, settingsScreen config shape (sparse overrides)
- `src/engine/ConfigManager.js` — User preference storage, defaults object
- `src/engine/ThemeManager.js` — 9-slice CSS injection pattern, NINE_SLICE_SELECTORS
