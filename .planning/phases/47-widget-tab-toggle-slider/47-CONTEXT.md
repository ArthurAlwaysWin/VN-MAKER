---
phase: 47-widget-tab-toggle-slider
created: 2025-07-22
decisions: 4
---

# Phase 47 Smart Discuss Context

## Phase Goal
用户可通过缩略图网格和颜色选择器配置 Tab 形状、Toggle 样式、Slider 外观

## Requirements
- WEDITOR-01: Tab 控件 5 种形状缩略图网格选择
- WEDITOR-02: Toggle 控件 4 种样式缩略图网格选择
- WEDITOR-03: Slider 控件颜色/形状配置

## Decisions

### Grey Area 1: 缩略图网格实现方式
**Decision:** 纯 CSS 缩略图
**Rationale:** 无需图片资源，响应式好，可跟随主题色变化。用 CSS 画出每种形状/样式的迷你版本。

### Grey Area 2: 交互模式
**Decision:** 选择即提交 store
**Rationale:** 点击缩略图立即更新 store + 触发 iframe 预览，与 ThemeDesigner 色板选择行为一致。

### Grey Area 3: 面板布局
**Decision:** 手风琴折叠组
**Rationale:** Tab/Toggle/Slider 各一个折叠面板，一次展开一个。节省空间，与 ScreenLayoutEditor 的折叠面板统一。

### Grey Area 4: 预览消息粒度
**Decision:** 触发完整 widgetStyles 更新
**Rationale:** 每次修改发整个 widgetStyles 对象给 iframe，简单且与 update-theme 模式一致。

## Technical References

### WIDGET_DEFAULTS (from widgetDefaults.js)
- **tab**: shape(rectangle), activeColor, inactiveColor, activeTextColor, inactiveTextColor, fontSize, fontFamily, activeBackgroundImage, nineSlice
- **toggle**: style(pill), onColor, offColor, thumbColor, onLabel, offLabel, fontSize, width, height
- **slider**: trackColor, fillColor, thumbStyle(circle), thumbColor, thumbSize, trackHeight, trackImage, thumbImage

### Tab shapes (5)
rectangle, pill, underline, trapezoid, ribbon

### Toggle styles (4)
pill, radio, checkbox, button-pair

### Slider thumb styles
circle (+ potentially square — only circle in defaults)

### Existing composable pattern
- `createWidgetStylesEditor()` in useWidgetStylesEditor.js provides: iframeRef, isEngineReady, sendWidgetStylesToPreview, flushPreview
- `useWidgetStylesEditor()` injectable in child components
- 200ms debounced postMessage with `type: 'update-widget-styles'`

### Store integration
- `script.getWidgetStyles()` returns `data.value.ui.widgetStyles` (lazy init {})
- `script.updateWidgetStyles(ws)` replaces + pushState()
- All changes auto-save via App.vue deep watcher
