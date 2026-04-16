# Phase 44: SettingsScreen 结构化模式 — Smart Discuss Context

## Decisions

### 1. Trigger Condition: elements empty + structured config present
- Current show() logic: `if (this.customLayout?.elements?.length > 0)` → _renderCustom, else → _renderDefault
- New third path: `else if (this.customLayout?.header || this.customLayout?.tabBar || this.customLayout?.contentArea)` → _renderStructured
- Priority: elements > structured > default fallback
- When elements[] is empty AND no header/tabBar/contentArea → default layout unchanged

### 2. Setting Grouping: 3 tabs mapped by settingKey
- SETTING_DEFS has 9 settings, need grouping for tab-based display
- Groups: 声音 (master-volume, bgm-volume, se-volume, voice-volume), 画面 (dialogue-opacity, window-mode), 游戏 (text-speed, auto-speed, skip-mode)
- Group mapping defined as constant in SettingsScreen (not in settingDefs.js)
- Tab labels come from config.tabBar.tabs array (default: ["声音", "画面", "游戏"])

### 3. Widget Rendering: Use widgetStyles when available (SCREEN-05)
- Structured mode builds each setting control via SETTING_DEFS type
- When _widgetStyles is set: Slider → createSlider(), Toggle → createToggle(), Tab → createTabBar()
- When _widgetStyles is null: Use legacy controls (input[type=range], label.sc-toggle)
- Reuse existing _buildSlider/_buildToggle/_buildSelect methods (they already have widgetStyles branching from Phase 42)

### 4. DOM Structure: header + tabBar + contentArea + footer
- Header: title text, background image, height — absolutely positioned
- TabBar: horizontal bar with tab buttons (via TabWidget or fallback buttons)
- ContentArea: scrollable area showing settings for active tab
- Footer: optional buttons (e.g. "返回标题") — absolutely positioned
- Close button: in header or footer via config

### 5. Tab Switching: Re-render content area on tab change
- Active tab index stored as this._activeTab (default 0)
- On tab click: update _activeTab, re-render content area only (not whole screen)
- Content area shows only settings belonging to active group

## Phase Boundary
- Phase 44 adds _renderStructured() to SettingsScreen ONLY
- Does NOT modify _renderCustom() or _renderDefault() (those are existing modes)
- Does NOT touch main.js init flow (that's Phase 45: CONFIG-01)
- DOES import and use TabWidget (from Phase 42) for tab bar rendering
- DOES use _widgetStyles for slider/toggle rendering (from Phase 42)
- Success criterion 4: elements[] non-empty → _renderCustom unchanged

## Codebase Context
- SettingsScreen.js: ~512 lines, has _renderCustom (elements mode) + _renderDefault (fallback mode)
- SETTING_DEFS in settingDefs.js: 9 settings (6 sliders, 2 selects, 0 toggles — wait, no toggles exist in SETTING_DEFS)
- Note: SETTING_DEFS currently has NO toggle-type settings. The structured mode should still support toggle type if future settings are added.
- TabWidget.js: createTabBar(labels, config, onSelect) returns { el, setActive }
- widgetDefaults.js: deepMergeWidgetStyles() for tab/toggle/slider configs
- sanitize.js: sanitizeCssValue + clampField
- assetPath.js: resolvePath for backgroundImage

## Design Spec Schema (Section 5.4)
```json
{
  "header": { "height": 90, "backgroundImage": null, "title": { "text": "系统设定", "fontSize": 28, "fontFamily": null, "color": "#fff", "x": 60, "y": 28 } },
  "tabBar": { "y": 90, "height": 56, "background": "rgba(0,0,0,0.2)", "tabs": ["声音", "画面", "游戏"] },
  "contentArea": { "x": 40, "y": 160, "width": 1200, "height": 500 },
  "footer": { "height": 60, "buttons": [{ "id": "back-to-title", "text": "返回标题", "x": 1050, "y": 15 }] },
  "elements": []
}
```
