# Phase 17: Global Font Settings - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

创作者可自定义对话框排版（字号/字体/颜色/名牌字号/名牌字体/名牌颜色），全局设置在项目设置页，每页可选覆盖。编辑器提供迷你预览框 + 画布实时反映变化，引擎启动时读取全局设置渲染。

</domain>

<decisions>
## Implementation Decisions

### 编辑器 UI 入口
- **D-01:** 全局字体设置面板放在"项目设置"tab 中，作为项目级别配置
- **D-02:** PageInspector 新增"字体"section，默认勾选"使用全局设置"（checkbox），取消勾选后 6 项字体属性全部可编辑（整体覆盖，非逐项覆盖）

### 数据模型
- **D-03:** `ui.dialogueBox` 数据模型 6 个字段——对话文字: `fontSize`(18)、`fontFamily`(null)、`textColor`(null)；名牌: `nameplateFontSize`(20)、`nameplateFontFamily`(null)、`nameplateColor`(null)。null 表示使用 CSS 默认值
- **D-04:** 每页覆盖模型——page 数据新增 `fontOverride: { useGlobal: true, fontSize, fontFamily, textColor, nameplateFontSize, nameplateFontFamily, nameplateColor }`，`useGlobal: true` 时忽略其余字段

### 字体选择器
- **D-05:** 字体下拉框分两组显示——"已导入字体"置顶 + "系统字体"在下方（复用 assets store 的 fontFamilies computed）
- **D-06:** 每个字体选项用该字体本身渲染预览文字（font preview in dropdown）

### 实时预览
- **D-07:** 项目设置 tab 内字体设置区域旁放置迷你预览框——静态示例文字（名牌 + 正文），参数变化时实时更新，无需切 tab 即可看到效果
- **D-08:** 游戏内容 tab 的 CanvasPreview 画布也读取 `ui.dialogueBox` 全局设置渲染对话框样式

### 名牌独立性
- **D-09:** 名牌（说话人名字）与对话正文字体完全解耦——名牌有独立的字号、字体、颜色 3 个属性，不跟随正文设置

### Agent's Discretion
- 迷你预览框的具体尺寸和示例文字内容
- 字体下拉框的预览文字样本（可用"示例文字 Sample"或字体名本身）
- fontOverride 中 useGlobal 的序列化策略（省略 vs 显式保存 true）
- 引擎 DialogueBox 中全局样式与每页覆盖的合并顺序实现细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 引擎渲染层
- `src/ui/DialogueBox.js` — 对话框 DOM 构建、_applyStyle()、typewriter 效果。applyGlobalStyle() 需新增于此
- `src/engine/ConfigManager.js` — 玩家偏好设置模式参考（注意：字体是项目级设置不走 ConfigManager）
- `src/engine/fontLoader.js` — FontFace API 加载自定义字体，引擎启动时调用
- `src/engine/settingDefs.js` — SETTING_DEFS 注册表模式参考
- `src/main.js` — 引擎启动接线，applyConfig()，engine.on('dialogue') 事件处理

### 编辑器数据层
- `src/editor/stores/script.js` — Pinia store，getter/setter 模式（getSettingsScreen/updateSettingsScreen），pushState() 触发撤销/重做
- `src/editor/stores/assets.js` — fontFamilies computed 属性（已导入 + 系统字体列表）

### 编辑器 UI 层
- `src/editor/components/page-editor/PageInspector.vue` — 检查器面板，需新增"字体"section
- `src/editor/components/canvas/CanvasPreview.vue` — 1280×720 画布，getDialogueStyle() 需读取全局字体设置
- `src/editor/views/SettingsDesigner.vue` — 多面板设计器金标准参考
- `src/editor/App.vue` — tab 导航（项目设置 tab 是字体设置入口）

### 样式
- `src/style.css` — 对话框 CSS 默认值（.dialogue-text 18px，.dialogue-speaker-name 20px Noto Serif SC）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets store fontFamilies` computed: 系统字体 + 已导入字体完整列表，可直接用于字体下拉框
- `fontLoader.js`: 引擎启动时加载自定义字体，字体选择器选中导入字体后引擎侧自动可用
- `CanvasPreview.vue getDialogueStyle()`: 已有对话框样式计算逻辑，扩展即可读取全局设置
- `DraggableElement.vue`: 画布拖拽基础设施已就绪

### Established Patterns
- Store getter/setter: `getSettingsScreen()` / `updateSettingsScreen()` 使用 `??=` 惰性初始化 + `pushState()`
- 数值安全: `clampField()` + `sanitizeCssValue()` 用于 CSS 值验证
- CSS 自定义属性: `--dialogue-opacity` 已有先例（main.js applyConfig）
- null 默认值: Phase 15 voice 字段同模式（null = 不设置，用 CSS 默认值）

### Integration Points
- `src/editor/App.vue` 项目设置 tab — 新增字体设置面板组件
- `src/editor/stores/script.js` — 新增 getDialogueBox() / updateDialogueBox()
- `src/ui/DialogueBox.js` 构造函数 — 新增 applyGlobalStyle() 方法
- `src/main.js` 引擎启动 — 调用 dialogueBox.applyGlobalStyle(script.ui.dialogueBox)
- `PageInspector.vue` — 新增"字体"section（useGlobal checkbox + 6 项编辑器）

</code_context>

<specifics>
## Specific Ideas

- 迷你预览框应同时展示名牌和正文两部分，让用户一眼看到完整效果
- 字体下拉框每个选项必须用该字体渲染（不能只显示字体名称用默认字体）
- 每页覆盖是"全有或全无"模式——取消"使用全局设置"后 6 项全部独立编辑，不支持逐项覆盖
- 引擎渲染时优先级：每页 fontOverride (useGlobal=false) > ui.dialogueBox 全局设置 > CSS 默认值

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-global-font-settings*
*Context gathered: 2026-04-02*
