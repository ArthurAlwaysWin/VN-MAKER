# Research: Settings Screen Structural Customization

**Domain:** Visual novel engine — settings screen layout parameterization
**Researched:** 2025-07-27
**Overall confidence:** HIGH (based on codebase analysis + domain knowledge of commercial VN settings)

---

## 1. Commercial VN Settings Screen Patterns Survey

### Pattern A: Tab-Based with Category Icons (Aokana-style)
```
┌──────────────────────────────────────────┐
│  [🔊 Sound] [🖥 Display] [🎮 Game]      │  ← icon + text tabs
├──────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐ │
│  │ BGM 音量  ━━○━━ │ │ SE 音量  ━━━○━━ │ │  ← 2-column grid
│  │ Voice音量 ━━○━━ │ │ 总音量   ━━━○━━ │ │
│  └─────────────────┘ └─────────────────┘ │
│                                          │
│  ┌─────────────────┐ ┌─────────────────┐ │
│  │ Master   ━━━○━━ │ │                 │ │
│  └─────────────────┘ └─────────────────┘ │
├──────────────────────────────────────────┤
│     [返回タイトル]        [閉じる]        │
└──────────────────────────────────────────┘
```
**Key characteristics:**
- Tabs use icon + text (not just text)
- Content area uses 2-column grid layout
- Each setting has consistent visual weight
- Sliders are wide with thick tracks for game-controller usability
- Decorative corner/border images frame the panel
- Footer has multiple action buttons (return to title, close)

### Pattern B: Vertical Sidebar Tabs (Senrenbanka-style)
```
┌──────────────────────────────────────────┐
│   SETTINGS                    × close    │
├──────┬───────────────────────────────────┤
│  声音 │  ── 音声設定 ──────────────────  │  ← section header divider
│      │                                   │
│  画面 │  BGM 音量  ━━━━━━━━━━━━○━━━━    │  ← full-width sliders
│      │  SE 音量   ━━━━━━━━━━━━━○━━━    │
│  文字 │  Voice音量 ━━━━━━━━━━━━○━━━━    │
│      │                                   │
│  その他│  ── BGM再生 ──────────────────  │  ← sub-group header
│      │  ○ 常にループ  ● 1回のみ          │
├──────┴───────────────────────────────────┤
│  [デフォルトに戻す] [タイトルに戻る] [閉じる] │
└──────────────────────────────────────────┘
```
**Key characteristics:**
- Left sidebar vertical tab navigation (not horizontal top tabs)
- Content uses full-width single-column layout
- Section headers / dividers within a tab to group related settings
- Sub-groups for related radio-button settings
- Custom background image for entire panel
- Footer has 3 buttons: reset defaults, return to title, close

### Pattern C: Scroll-Based No-Tab (Simple/Indie VN style)
```
┌──────────────────────────────────────────┐
│              ■ 環境設定 ■                │
├──────────────────────────────────────────┤
│  ── 音声 ──                              │
│  BGM ━━━━━━━━━━━━━━━━━○━━━        100%  │
│  SE  ━━━━━━━━━━━━━━━━━━○━━         95%  │
│  Voice ━━━━━━━━━━━━━━━○━━━         80%  │
│                                          │
│  ── 表示 ──                              │
│  文字速度 ━━━━━━━━━━━━○━━━          7    │
│  自動速度 ━━━━━━━━━━━━━━○━━       3.0s   │
│  ウィンドウ  [窗口] [全屏] [无边框]       │
│                                          │
│  ── システム ──                           │
│  既読スキップ  ○ 全部  ● 既読のみ         │
│  ...more scrollable...                   │
├──────────────────────────────────────────┤
│                [閉じる]                   │
└──────────────────────────────────────────┘
```
**Key characteristics:**
- No tabs — all settings in one scrollable panel
- Section headers act as visual separators (replaces tab function)
- Simple, clean layout
- Suited for games with fewer settings (< 15 items)
- Single close button footer

### Pattern D: Multi-Column Grouped (CLANNAD/Key-style)
```
┌──────────────────────────────────────────────────┐
│  SYSTEM SETTINGS                          [×]    │
├──────────────────────────────────────────────────┤
│ ┌──── 音声設定 ────┐  ┌──── 画面設定 ────┐       │
│ │ BGM   ━━━○━━━━  │  │ 文字速度 ━━━○━━ │       │
│ │ SE    ━━━━○━━━  │  │ Auto速度 ━━━○━━ │       │
│ │ Voice ━━━━━○━━  │  │ 透明度  ━━━━○━━ │       │
│ │ Master━━━━━━○━  │  │ 窗口  [窗口][全屏]│       │
│ └─────────────────┘  └─────────────────┘       │
│ ┌──── システム ────┐                             │
│ │ Skip: [全部][已読] │                             │
│ └─────────────────┘                             │
├──────────────────────────────────────────────────┤
│      [初期化]               [閉じる]              │
└──────────────────────────────────────────────────┘
```
**Key characteristics:**
- No tabs — uses visual group boxes instead
- 2-column layout for groups, with groups having their own borders
- Groups can span different numbers of rows
- Compact, everything visible at once
- Good for moderate setting count (8-12 items)

### Pattern E: Icon Grid Navigation (Modern/AAA VN style)
```
┌──────────────────────────────────────────┐
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │ 🔊 │ │ 🖥 │ │ 📝 │ │ ⚙ │           │  ← icon-only tab buttons
│  │Sound│ │Disp│ │Text│ │Sys │           │
│  └────┘ └────┘ └────┘ └────┘           │
├──────────────────────────────────────────┤
│  section content (varies)                │
└──────────────────────────────────────────┘
```
- Icon-only or icon+text square buttons
- Used in more modern VNs with touch-friendly UI

### Summary of Patterns

| Pattern | Tabs | Layout | Tab Position | When to Use |
|---------|------|--------|-------------|-------------|
| A: Tab+Icon 2-col | Yes (3-5) | 2-column grid | Top horizontal | Many settings, polished look |
| B: Sidebar tabs | Yes (3-5) | Single column full-width | Left vertical | Many settings, decorative |
| C: Scroll no-tab | No | Single column + sections | N/A | Few settings (< 15) |
| D: Grouped boxes | No | 2-col grouped boxes | N/A | Moderate settings, compact |
| E: Icon grid | Yes | Varies | Top horizontal | Modern/touch-friendly |

---

## 2. Recommended Structural Parameters

### 2.1 Tab Structure

**Current state:** Hardcoded 3 tabs (`['声音', '画面', '游戏']`) with hardcoded groupings in `SETTING_GROUP_KEYS`.

**Recommendation:** Make tabs fully configurable via `tabBar.tabs[]` array.

```js
// Config schema for tabBar
tabBar: {
  position: 'top',           // 'top' | 'left' — NEW
  height: 56,                // px (top mode)
  width: 160,                // px (left mode) — NEW
  background: 'rgba(...)',
  tabs: [
    {
      label: '声音',
      icon: null,             // asset path to icon image — NEW
      settingKeys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'],  // NEW
    },
    {
      label: '画面',
      icon: null,
      settingKeys: ['dialogue-opacity', 'window-mode'],
    },
    {
      label: '游戏',
      icon: null,
      settingKeys: ['text-speed', 'auto-speed', 'skip-mode'],
    },
  ],
}
```

**Why this approach:**
- `tabs[].settingKeys` replaces the hardcoded `SETTING_GROUP_KEYS` — users choose which settings go where
- `tabs[].icon` enables Aokana-style icon+text tabs without free positioning
- `position: 'left'` enables Senrenbanka-style sidebar navigation
- Tab count is implicit from `tabs.length` (1–N)
- All SETTING_DEFS keys not assigned to any tab are simply not shown (intentional exclusion)

**Backward compatibility:** When `tabBar.tabs` is absent, fall back to `DEFAULT_TAB_LABELS` + `SETTING_GROUP_KEYS` (current behavior). When `tabBar.tabs` exists but has no `settingKeys`, use the old grouping for that index position.

### 2.2 Content Layout

**Current state:** Single column, `flex` row per setting with 140px label + flex control.

**Recommendation:** Add `contentArea.layout` parameter.

```js
contentArea: {
  x: 40, y: 160, width: 1200, height: 500,  // existing
  layout: 'single-column',   // 'single-column' | 'two-column' | 'grouped' — NEW
  columns: 1,                // 1 or 2 — NEW (alternative to layout enum)
  gap: 16,                   // px between items — NEW
  rowHeight: 'auto',         // 'auto' | number (fixed px) — NEW
}
```

**Layout modes:**
1. **`single-column` (default):** Current behavior. One setting per row, full width.
2. **`two-column`:** Two settings side-by-side. Items flow left→right, top→bottom. Each column is `width/2 - gap/2` wide. Matches Aokana pattern.
3. **`grouped`:** Section headers visible within tab content, creating visual sub-groups (Pattern D). Uses `tabs[].groups` for sub-grouping.

**Why NOT grid/freeform:** Grid is just "two-column with more columns" — for game settings screens, 1 or 2 columns covers 99% of commercial VNs. Adding arbitrary grid would push toward Figma complexity without proportional value.

### 2.3 Section Headers (within tabs)

Many VNs use section dividers within a tab (e.g., "── 音声設定 ──" divider line). This is the visual grouping without tab switching.

```js
tabs: [
  {
    label: '声音',
    settingKeys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'],
    sections: [                          // NEW — optional
      { title: '音量设定', keys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'] },
    ],
  },
]
```

**Decision: DEFER sections to a later iteration.** For v1.3, `settingKeys` flat list is sufficient. Section headers add UI complexity in the editor (drag-to-reorder within sections, section CRUD) that isn't justified yet. If a tab only has 3-4 items, sub-grouping is unnecessary. Can revisit if SETTING_DEFS grows beyond 15 items.

### 2.4 Row/Item Styling

**Current state:** Items use inline flex layout with no visual separators.

**Recommendation:** Add `contentArea.itemStyle` parameter.

```js
contentArea: {
  // ...existing
  itemStyle: {                           // NEW — all optional
    showDividers: false,                 // hairline between rows
    dividerColor: 'rgba(255,255,255,0.1)',
    alternateBackground: false,          // zebra striping
    alternateColor: 'rgba(255,255,255,0.03)',
    padding: [12, 0],                    // [vertical, horizontal] per item
    labelWidth: 140,                     // px, label column width
    labelPosition: 'left',              // 'left' | 'top' — NEW
    labelColor: null,                    // override, null = inherit from theme
    labelFontSize: null,                 // override
    showValueLabel: true,                // show "80%" next to slider — NEW
  },
}
```

**Why these specific parameters:**
- `showDividers` + `alternateBackground`: The two most common row-styling patterns in commercial VNs. Not free-form "border on each side" — just these two toggles.
- `labelPosition: 'top'`: Enables stacked label layout (label above control) which some VNs use for compact 2-column layouts where horizontal space is tight.
- `labelWidth`: Already exists implicitly as `140px` hardcoded — just surfacing it.
- `showValueLabel`: Some VN settings show the numeric value (80%), some don't. Currently always shown.

### 2.5 Header Flexibility

**Current state:** Header has title text (position/color/font configurable) + close button (fixed right-center).

**Recommendation:** Extend header config.

```js
header: {
  height: 90,
  backgroundImage: null,           // existing
  title: {                         // existing
    text: '系统设定',
    color: '#fff',
    fontSize: 28,
    fontFamily: null,
    x: null, y: null,              // existing — absolute within header
  },
  showCloseButton: true,           // NEW — allow hiding the × button
  decorations: [                   // NEW — decorative images in header
    { src: 'decorations/corner_left.png', x: 0, y: 0, width: 120, height: 90 },
    { src: 'decorations/corner_right.png', x: 1160, y: 0, width: 120, height: 90 },
  ],
}
```

**Why `decorations[]` array:** Commercial VN settings often have decorative corner images, ornamental lines, or mascot characters in the header area. A simple positioned image array (like the existing custom layout `elements[]`) is the lightest way to support this. Limited to the header region, so it's bounded/safe.

**Why NOT unlimited decorations:** Keep decorations header-only. Full-panel decorations are already handled by `panel.backgroundImage` in widgetStyles.

### 2.6 Footer Flexibility

**Current state:** Footer supports `buttons[]` with text/position/action, but only `close` and `title` actions.

**Recommendation:** Extend with `reset` action and better defaults.

```js
footer: {
  height: 60,
  buttons: [
    { id: 'close', text: '关闭', x: 1080, y: 15, action: 'close' },
    { id: 'title', text: '返回标题', x: 800, y: 15, action: 'title' },
    { id: 'reset', text: '恢复默认', x: 40, y: 15, action: 'reset' },  // NEW action
  ],
}
```

**New `reset` action:** Resets all settings to `ConfigManager.defaults`. This is a table-stakes feature in commercial VNs (デフォルトに戻す) that's currently missing.

### 2.7 Panel Background

**Current state:** Panel background is handled by `widgetStyles.panel.backgroundImage` (via PanelWidget). Settings screen structured mode doesn't apply panel styles.

**Recommendation:** The structured mode should apply `widgetStyles.panel` to `#settings-screen` in structured mode, OR add a `background` field to the settings layout config.

```js
settingsScreen: {
  background: null,              // NEW — panel background image (independent of widgetStyles)
  backgroundOpacity: 0.3,       // NEW — opacity for background image layer
  // ...header, tabBar, contentArea, footer
}
```

**Why separate from widgetStyles.panel:** The settings screen structured mode is a specific screen, not a generic "panel." Users may want a custom background for settings specifically (e.g., a character mascot watermark) while using different panel styling elsewhere.

---

## 3. Recommended Config Schema (Complete)

```js
// In script.json → ui.settingsScreen
{
  // Panel-level
  background: null,                 // asset path for panel background image
  backgroundOpacity: 0.3,          // 0-1 opacity for background layer

  // Header
  header: {
    height: 90,
    backgroundImage: null,
    title: { text: '系统设定', color: '#fff', fontSize: 28, fontFamily: null, x: null, y: null },
    showCloseButton: true,
    decorations: [],                // { src, x, y, width, height }[]
  },

  // Tab bar
  tabBar: {
    position: 'top',               // 'top' | 'left'
    height: 56,                    // for position: 'top'
    width: 160,                    // for position: 'left'
    background: null,
    tabs: [
      { label: '声音', icon: null, settingKeys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'] },
      { label: '画面', icon: null, settingKeys: ['dialogue-opacity', 'window-mode'] },
      { label: '游戏', icon: null, settingKeys: ['text-speed', 'auto-speed', 'skip-mode'] },
    ],
  },

  // Content area
  contentArea: {
    x: 40, y: 160, width: 1200, height: 500,
    columns: 1,                    // 1 or 2
    gap: 16,                       // px between items
    itemStyle: {
      showDividers: false,
      dividerColor: 'rgba(255,255,255,0.1)',
      alternateBackground: false,
      alternateColor: 'rgba(255,255,255,0.03)',
      padding: [12, 0],
      labelWidth: 140,
      labelPosition: 'left',       // 'left' | 'top'
      labelColor: null,
      labelFontSize: null,
      showValueLabel: true,
    },
  },

  // Footer
  footer: {
    height: 60,
    buttons: [
      { id: 'close', text: '关闭', x: 1080, y: 15, action: 'close' },
    ],
  },

  // Legacy: elements[] still supported for custom absolute-position mode
  elements: [],
}
```

---

## 4. Scope Boundary: What to Keep Fixed vs. Configurable

### Configurable (Canva-level parameters)

| Parameter | Type | Rationale |
|-----------|------|-----------|
| Tab count, labels, icons | Structure | Table stakes for commercial-grade customization |
| Setting-to-tab assignment | Structure | Enables natural grouping for different game types |
| Tab position (top/left) | Structure | Two most common VN patterns |
| Column count (1 or 2) | Layout | Covers 99% of commercial VN layouts |
| Row dividers / zebra stripes | Visual | Low-effort high-impact visual distinction |
| Label width / position | Layout | Needed for 2-column mode (shorter labels) |
| Header decorations | Visual | Enables ornamental/branded headers |
| Footer button set + actions | Structure | Different VNs need different button combinations |
| Panel background image | Visual | Very common in commercial VNs |
| Value label visibility | Visual | Some designs hide numeric readouts |

### Fixed (Engine-managed, not user-configurable)

| Element | Why Fixed |
|---------|-----------|
| **Setting control types** (slider/toggle/select) | Determined by SETTING_DEFS. A volume is always a slider. Users shouldn't change this. |
| **Setting control styling** | Already covered by `widgetStyles.slider`, `widgetStyles.toggle` — that system handles visual control appearance. Don't duplicate it here. |
| **Setting behavior/range** | min/max/step/default are engine constants. Not themeable. |
| **Tab switch animation** | CSS transition on content area — keep as default fade. No animation config. Low value, high complexity. |
| **Close button icon** | Always × in structured mode. Custom layout mode already allows button customization. |
| **Setting label text** | Labels come from SETTING_DEFS[key].label. Users could override per-tab-entry in a future version, but v1.3 uses engine defaults. |
| **Setting ordering within tab** | Follows the order of `settingKeys` array. No drag-reorder in engine — that's editor concern. |
| **Scroll behavior** | Content area scrolls when content exceeds height. No configuration needed. |

### Explicitly Out of Scope

| Feature | Why Out |
|---------|---------|
| **Free-position settings** | That's the existing "custom layout" mode (elements[]). Structured mode is about auto-layout. |
| **Arbitrary grid (3+ columns)** | No commercial VN uses 3+ column settings. 1 or 2 covers the space. |
| **Per-setting icon/image** | Low value, high complexity. Would require per-item override system. |
| **Animated decorations** | GIF/APNG decorations are a rabbit hole. Static images only. |
| **Custom control types** | No user-defined slider styles per-setting. widgetStyles applies globally. |
| **Tab reorder animation** | CSS-only, keep simple. No spring physics. |

---

## 5. Implementation Strategy

### 5.1 Engine Changes (SettingsScreen.js)

**Tab rendering:** Replace `SETTING_GROUP_KEYS` lookup with config-driven tabs:
```js
// Before (hardcoded):
const groupKeys = SETTING_GROUP_KEYS[this._activeTab];

// After (config-driven):
const tabConfig = layout.tabBar?.tabs?.[this._activeTab];
const groupKeys = tabConfig?.settingKeys ?? SETTING_GROUP_KEYS[this._activeTab] ?? [];
```

**Left-side tabs:** When `tabBar.position === 'left'`, restructure DOM:
```
settings-structured (flexbox row)
├── settings-tab-sidebar (vertical flex, width from config)
└── settings-main (flex: 1)
    ├── header
    ├── content
    └── footer
```

**Two-column layout:** In `_renderStructuredContent()`:
```js
if (columns === 2) {
  container.style.display = 'grid';
  container.style.gridTemplateColumns = '1fr 1fr';
  container.style.gap = gap + 'px';
} else {
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
}
```

**Tab icons:** In tab button rendering, prepend `<img>` before label text when `tab.icon` exists.

**Row styling:** In `_renderStructuredContent()`, apply itemStyle to each row:
```js
if (itemStyle.showDividers && index > 0) {
  item.style.borderTop = `1px solid ${itemStyle.dividerColor}`;
}
if (itemStyle.alternateBackground && index % 2 === 1) {
  item.style.backgroundColor = itemStyle.alternateColor;
}
```

**Reset action:** Add handler in footer button click:
```js
if (btnCfg.action === 'reset') {
  this.configManager.resetToDefaults();
  this._renderStructuredContent(layout);  // re-render to update sliders
}
```

### 5.2 Backward Compatibility (CRITICAL)

The current engine has THREE rendering modes (line 84-89 of SettingsScreen.js):
1. **Custom layout** — `elements.length > 0` → absolute positioned elements
2. **Structured layout** — `header || tabBar || contentArea` → auto-layout with tabs
3. **Default layout** — no config → hardcoded HTML template

**Rule:** ALL existing configs must continue working without changes.

**Compatibility strategy:**
- `tabs` array absent → use `DEFAULT_TAB_LABELS` + `SETTING_GROUP_KEYS` (current behavior)
- `columns` absent → default to 1 (current behavior)
- `itemStyle` absent → current inline styles (no dividers, no stripes)
- `tabBar.position` absent → default `'top'` (current behavior)
- `header.decorations` absent → no decorations (current behavior)
- `footer.buttons` absent → no footer (current behavior)
- New fields are ALL optional with sensible defaults matching current output

**Migration:** No migration needed. New fields are purely additive. Existing `settingsScreen` configs in `builtinThemes.js` remain valid.

### 5.3 Editor Changes (SettingsSection.vue)

The current SettingsSection.vue has ~100 lines for header, tab bar, and content area basic controls. Needs expansion:

**New editor UI sections:**
1. **Tab editor:** List of tabs with add/remove buttons. Each tab: label text input, icon asset picker, setting key multi-select checkboxes.
2. **Content layout:** Column count radio (1/2), gap slider, label position radio (left/top).
3. **Row style:** Divider toggle, zebra toggle, label width slider.
4. **Header decorations:** Simple list of positioned images (mini version of the custom layout element system).
5. **Footer buttons:** List of buttons with text, position, and action dropdown.

**Tab editor is the most complex piece:** Need a sortable list where each entry shows:
```
[🗑] Tab 1: "声音"  [icon: ...]  Settings: ☑BGM ☑SE ☑Voice ☑Master
[🗑] Tab 2: "画面"  [icon: ...]  Settings: ☑Opacity ☑Window
[+] Add Tab
```

Setting key checkboxes should show ALL SETTING_DEFS keys. A key assigned to one tab is grayed out in other tabs. Unassigned keys are highlighted as a warning.

### 5.4 Built-in Theme Updates

Current themes in `builtinThemes.js` only specify:
```js
settingsScreen: {
  header: { title: { text: '系统设定', color: '...' } },
  tabBar: { background: '...' },
}
```

**v1.3 themes should demonstrate new capabilities:**
- Aokana-style theme: `columns: 2`, tab icons, header decorations
- Senrenbanka-style theme: `tabBar.position: 'left'`, full-width content, custom panel background
- Minimal theme: single tab (all settings together), no footer, compact

---

## 6. Data Model Design Considerations

### 6.1 Flat vs. Nested

**Recommendation: Nested structure** (as shown in section 3).

**Why nested over flat:**
- Groups related parameters (all tab config under `tabBar`, all item styling under `contentArea.itemStyle`)
- Matches the existing pattern (current schema already has `header.title`, `tabBar`, `contentArea`)
- Sparse merge pattern works naturally — `{ tabBar: { position: 'left' } }` only overrides position, everything else defaults
- Clear mental model for editor UI — each section of the editor maps to one top-level key

### 6.2 Tab-to-Settings Mapping

**Challenge:** When SETTING_DEFS adds a new key in a future version (e.g., `'language'`), existing configs with explicit `settingKeys` arrays won't include it.

**Solution: "unassigned settings" fallback.**
```js
// In engine, after building tabs from config:
const assignedKeys = new Set(tabs.flatMap(t => t.settingKeys));
const unassignedKeys = Object.keys(SETTING_DEFS).filter(k => !assignedKeys.has(k));

// Append unassigned to last tab, or create "Other" tab
if (unassignedKeys.length > 0) {
  const lastTab = tabs[tabs.length - 1];
  lastTab.settingKeys = [...lastTab.settingKeys, ...unassignedKeys];
}
```

This ensures:
- Existing configs gracefully show new settings without manual update
- No settings silently disappear
- Users can later reassign via editor

### 6.3 Config Validation

Engine should validate at render time with console warnings:
- `settingKeys` references a key not in SETTING_DEFS → `console.warn`, skip that key
- Same key in multiple tabs → use first occurrence, warn about duplicate
- `tabs` array empty → fall back to defaults with warning
- `columns` not 1 or 2 → clamp to 1

---

## 7. Phase Ordering Recommendation

Based on dependency analysis:

### Phase A: Tab Structure + Setting Assignment (Engine)
- Extend `_renderStructured()` to read `tabBar.tabs[].settingKeys`
- Fall back to `SETTING_GROUP_KEYS` when not present
- Support 1-N tabs with custom labels
- Add tab icon rendering
- **Must come first:** All other features (columns, left tabs, etc.) build on configurable tab content

### Phase B: Content Layout + Row Styling (Engine)
- Add `columns: 2` grid layout to `_renderStructuredContent()`
- Add `itemStyle` (dividers, zebra, label position, value label toggle)
- Add `gap` spacing control
- **Depends on A:** Tab content rendering is the foundation; layout modifications go inside it

### Phase C: Header/Footer + Panel Background (Engine)
- Header decorations array rendering
- Footer `reset` action
- Panel-level background image in structured mode
- `showCloseButton` toggle
- `tabBar.position: 'left'` sidebar mode
- **Mostly independent of B** but logically groups all "chrome" changes

### Phase D: Editor UI (Editor)
- Tab editor (add/remove tabs, setting assignment checkboxes, icon picker)
- Content layout controls (column radio, gap, label position)
- Row style controls (divider toggle, zebra toggle)
- Header decoration list editor
- Footer button list editor
- **Depends on A-C:** Editor must configure what engine supports

### Phase E: Built-in Theme Updates
- Update `builtinThemes.js` with new structural parameters
- Create 2-3 demo themes showcasing different layouts
- **Depends on D:** Themes should use the full range of new parameters

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Left-tab mode requires significant DOM restructure | Medium | Isolate into separate render path, not a modification of existing top-tab path |
| Two-column mode breaks on narrow screens | Low | Content area has fixed pixel dimensions (1280×720 design space). Not responsive. |
| Tab editor UI complexity explosion | Medium | Start with flat list + checkbox matrix. Don't build drag-and-drop reordering in v1.3. |
| Config schema too large for manual JSON editing | Low | Users edit via GUI editor, not raw JSON. Schema complexity is fine. |
| Reset action losing user preferences unexpectedly | Medium | Add confirmation dialog before reset. `ConfigManager.resetToDefaults()` should prompt. |
| Unassigned settings showing in wrong tab | Low | The "append to last tab" heuristic is simple and predictable. |

---

## 9. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tab structure | Array of `{label, icon, settingKeys}` | Flexible, maps naturally to editor UI |
| Column options | 1 or 2 only | Covers 99% of VN patterns, avoids grid complexity |
| Tab position | `top` or `left` only | Two dominant VN patterns |
| Row styling | Dividers + zebra + label position | Highest-impact, lowest-complexity visual options |
| Section headers within tabs | DEFER | Adds editor complexity, low value for ≤9 settings |
| Per-setting overrides | DEFER | Global widgetStyles is sufficient for v1.3 |
| Header decorations | Positioned image array | Lightweight, bounded to header area |
| Footer reset action | YES | Table stakes for commercial VNs |
| Backward compat | All new fields optional with defaults | Zero breakage guarantee |
| Future settings | Append unassigned to last tab | Graceful degradation |

---

## Sources

- **Codebase analysis:** `SettingsScreen.js` (3 rendering modes), `settingDefs.js` (9 SETTING_DEFS), `widgetDefaults.js` (5 widget categories), `TabWidget.js` (5 shape variants), `builtinThemes.js` (5 themes), `SettingsSection.vue` (current editor UI)
- **Domain knowledge:** Commercial VN settings UI patterns from Aokana (sprite), Senrenbanka (Yuzusoft), CLANNAD (Key), Muv-Luv (âge), Steins;Gate (MAGES), and indie VN engines (Ren'Py, TyranoBuilder, Naninovel). Confidence: MEDIUM (based on domain expertise, not live screenshots verified in this session).
- **Architecture pattern:** Sparse merge onto defaults (established in `deepMergeWidgetStyles`, `applyTheme`, all screen layout configs) — HIGH confidence, verified in codebase.
