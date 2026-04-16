# Phase 42: widgetStyles 控件风格基础 - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

引擎从数据驱动渲染所有控件类型——Tab/Toggle/Slider/Panel/Button 的形状、颜色、尺寸全部由 `ui.widgetStyles` 配置决定。本阶段建立 widgetStyles 数据模型、默认值深合并机制、5 类控件渲染器。不改 main.js 配置传入链路（Phase 45 负责）。

</domain>

<decisions>
## Implementation Decisions

### 代码组织与模块结构
- widgetStyles 默认值和深合并函数放在新建的 `src/engine/widgetDefaults.js` 独立模块——保持 settingDefs.js 职责单一
- 5 种控件渲染器放在新建的 `src/ui/widgets/` 目录，每种控件一个文件（TabWidget.js, ToggleWidget.js, SliderWidget.js, PanelWidget.js, ButtonWidget.js）
- 深合并函数自研简单 deepMerge（仅处理普通对象 + null 跳过）——项目无外部依赖
- CSS 使用内联 style + CSS 自定义属性混合——与现有 SettingsScreen 渲染模式一致

### 控件渲染策略
- Tab 的 trapezoid/ribbon 使用基础 clip-path 占位（简单多边形），P2 精细打磨
- Toggle 4 种样式只做状态切换（active/inactive 类切换），不做过渡动画
- Slider 的 thumbImage/trackImage 通过 resolvePath() 加载（支持 asset:// 协议）
- Panel 的 nineSlice 复用 ThemeManager 已有的 applyNineSlice()

### 兼容性与接口设计
- SettingsScreen 新增 setWidgetStyles(styles) 方法——它是唯一直接渲染控件的 UI 组件
- Phase 42 只实现数据模型和渲染器，不改 main.js 调用链（CONFIG-01 在 Phase 45）
- 测试通过引擎打开设置页后 DOM 结构断言验证
- WIDGET_DEFAULTS 对象导出供将来编辑器使用（P1），但本阶段只有引擎消费

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/settingDefs.js` — SETTING_DEFS 注册表、DEFAULT_SETTING_STYLE/DEFAULT_LABEL_STYLE/DEFAULT_BUTTON_STYLE 默认样式对象
- `src/engine/ThemeManager.js` — applyNineSlice() 九宫格渲染函数
- `src/ui/sanitize.js` — sanitizeCssValue() 和 clampField() 安全值工具
- `src/engine/assetPath.js` — resolvePath() 资源路径解析

### Established Patterns
- SettingsScreen._buildSlider/Toggle/Select() — 现有控件渲染模式（DOM 创建 + 事件绑定）
- 设置组件使用 CSS 自定义属性（--fill-color, --track-color, --thumb-color 等）
- settingDefs.js 的 DEFAULT_*_STYLE 对象作为展开默认值模式

### Integration Points
- SettingsScreen.setWidgetStyles(styles) — 新增方法接收 widgetStyles 配置
- SettingsScreen._renderDefault() 和 _renderCustom() — 需要使用新渲染器替代硬编码控件
- 设计文档 `docs/superpowers/specs/ui-theme-system-v2-design.md` Section 4 — 完整 widgetStyles schema

</code_context>

<specifics>
## Specific Ideas

- widgetStyles 完整 schema 参见设计文档 Section 4.1（tab/toggle/slider/panel/button 5 大类）
- Tab 5 种 shape: rectangle/pill/underline/trapezoid/ribbon
- Toggle 4 种 style: pill/radio/checkbox/button-pair
- Slider 支持 thumbStyle: circle/square + thumbImage/trackImage 贴图
- Panel 支持 backgroundImage + nineSlice + backdropBlur
- Button 支持 hover/active 三态 + nineSlice 背景

</specifics>

<deferred>
## Deferred Ideas

- Tab ribbon/trapezoid 精细 clip-path 实现（P2/P3 范围）
- 控件风格编辑器（P1 编辑器范围）
- 主题包内嵌 widgetStyles（P2 .gmtheme 格式升级）

</deferred>
