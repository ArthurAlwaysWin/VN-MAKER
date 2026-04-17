# Phase 46: 数据持久化 + 编辑器骨架 - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

为 v1.2 控件风格编辑器和界面布局编辑器奠定数据层和 UI 骨架基础。本阶段交付：
1. Pinia store 中 widgetStyles 和各屏幕布局的读写方法（DATA-01, DATA-02）
2. WidgetStylesEditor.vue 和 ScreenLayoutEditor.vue 两个编辑器视图骨架（左表单+右 iframe 两栏模式）
3. 引擎侧 postMessage handler 支持 `update-widget-styles` 和 `update-screen-layout` 消息
4. 两个新标签页注册到 App.vue 导航栏

</domain>

<decisions>
## Implementation Decisions

### 编辑器视图组织
- 控件风格编辑器作为新增独立标签页 "控件风格"，和主题标签页平行
- 界面布局编辑器作为新增独立标签页 "界面布局"，内含各屏幕折叠面板
- 两个独立 Vue 组件：WidgetStylesEditor.vue + ScreenLayoutEditor.vue
- 各编辑器自有 iframe（同 ThemeDesigner 模式，独立生命周期）

### Store 数据模型
- widgetStyles 方法命名：`getWidgetStyles()` / `updateWidgetStyles(ws)` — 匹配现有 getTheme/updateTheme 模式
- 每屏幕独立方法对（getSaveLoadScreen / updateSaveLoadScreen 等 5×2=10 个方法）
- 懒初始化 `data.value.ui.widgetStyles ??= {}` — 引擎 deepMergeWidgetStyles 处理回退
- 与现有一致：每次 update* 调用 pushState()（单次编辑=单次撤销）

### iframe 预览协议
- 新增 `update-widget-styles` + `update-screen-layout` 两种 postMessage 消息类型
- 控件编辑器预览设置页（含所有控件类型），布局编辑器预览对应屏幕
- 200ms debounce 与 ThemeDesigner sendThemeToPreview 一致
- 在 main.js handlePreviewMessage 中新增 case 处理

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThemeDesigner.vue` — 两栏模式参考（左 360px 面板 + 右 iframe 预览），createThemeEditor composable 管理 iframe 生命周期
- `useThemeEditor.js` — composable 模式参考：iframeRef, isEngineReady, sendThemeToPreview (200ms debounce), flushPreview, startEngine, onEngineMessage
- `widgetDefaults.js` — WIDGET_DEFAULTS 常量（5 类控件完整默认值），deepMergeWidgetStyles 合并函数
- `script.js` store — 现有 get/update 方法对（getTheme/updateTheme, getSettingsScreen/updateSettingsScreen 等），pushState undo 机制

### Established Patterns
- Store accessor: `data.value.ui ??= {}; data.value.ui.xxx ??= {}; return data.value.ui.xxx;`
- Update: 修改后调 `pushState()` 推入撤销栈
- 自动保存：App.vue 有 2s 防抖 watch，store 数据变更自动保存到磁盘
- Tab 导航：`App.vue` tabs 数组 + tabComponents 对象 + `<component :is>`

### Integration Points
- `App.vue` tabs 数组（line ~78）— 新增两个 tab entry
- `App.vue` tabComponents 对象（line ~87）— 注册新组件
- `main.js` handlePreviewMessage（line ~973 附近）— 新增消息类型处理
- `script.js` store — 新增 10+ 个 get/update 方法

</code_context>

<specifics>
## Specific Ideas

- 遵循 ThemeDesigner 的 composable 模式，为控件编辑器创建 `useWidgetStylesEditor.js`，为布局编辑器创建 `useScreenLayoutEditor.js`
- 新标签页图标建议：控件风格 → '🎛️'，界面布局 → '📐'
- 布局编辑器骨架中，各屏幕（SaveLoad/Backlog/GameMenu/Settings）各一个折叠面板，Phase 46 只建空壳

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
