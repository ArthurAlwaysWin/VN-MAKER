# Phase 27: Theme Presets + Export/Import - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

用户可从 4 套内置精品主题预设一键应用专业配色方案，也可将当前主题导出为 .theme 文件（ZIP 包含 token JSON + 九宫格图片文件），并从 .theme 文件导入主题。所有操作通过主题编辑器工具栏「预设」按钮打开的统一弹窗完成。

不包含：社区主题市场/分享平台、每组件独立样式覆盖、每场景主题切换、主题包字体内嵌。

</domain>

<decisions>
## Implementation Decisions

### 预设选择界面
- **D-01:** 工具栏新增「预设」按钮，打开预设弹窗（与调色盘/九宫格弹窗同级模式）。弹窗内显示 4 张预设卡片（缩略图 + 名称 + 简介）。
- **D-02:** 点击卡片先「预览」——临时应用到 iframe（通过 sendThemeToPreview），不写入 store。再点「应用」按钮确认后 updateTheme() + pushState()，可 Ctrl+Z 回退。
- **D-03:** 弹窗下方增加「导出」和「导入」按钮（预设 + 导入导出合并一个弹窗）。

### 预设内容策略
- **D-04:** 4 套内置预设：Modern (#4A90D9)、和风/Japanese (#C8A882)、Fantasy (#7B2FBE)、Minimal (#333333)。每套只含 token 值，不含九宫格图片。
- **D-05:** 预设数据硬编码在 `src/engine/presets.js`，导出预设数组，每个预设包含 `{ id, name, description, tokens }` 对象。发布时是静态数据，零运行时开销。
- **D-06:** 预设 token 值产出流程：开发时写 generatePresets 工具脚本 → 以主色 + colorHarmony 算法生成基础色盘 → 手动微调功能色（danger/warning）、透明度、hover/pressed 偏移、对话框相关色约 10-15 个 token → contrastRatio 检查 + autoFix 修正 → 最终结果硬编码进 presets.js。
- **D-07:** 用户可在预设基础上微调任意 token（PRE-02），预设只是一次性覆盖 ui.theme.tokens，之后所有修改独立生效。

### 导出包格式
- **D-08:** .theme 文件为 ZIP 格式（fflate 库打包），后缀名 `.theme`。
- **D-09:** ZIP 内部结构：`theme.json`（metadata + tokens + nineSlice 引用路径）+ `images/` 目录（九宫格图片提取为独立 PNG 文件 + previewImage）。导出时 base64 Data URL → 二进制文件，导入时反向转换。体积优于 base64 内联（~33% 缩小）。
- **D-10:** metadata 扩展字段：`{ formatVersion: 1, name, description, author, createdAt, previewImage: "images/preview.png" }`。formatVersion 确保未来前向兼容（PKG-03）。author/createdAt 为社区分享预留。
- **D-11:** previewImage 导出时自动截图——通过 postMessage 发送 `capture-preview` 消息到引擎 iframe，引擎端用 canvas 截图返回 base64，然后写入 ZIP 的 `images/preview.png`。纯前端实现，不依赖 Electron API。

### 导入流程
- **D-12:** 全量覆盖模式——导入的主题直接替换当前 `ui.theme`（与预设应用行为一致），推入撤销栈可 Ctrl+Z 回退。
- **D-13:** 九宫格图片不提取到项目 assets 目录——导入时直接将 ZIP 内图片文件转回 base64 Data URL 写入 `ui.theme.nineSlice`（运行时已用 base64，无需落盘）。
- **D-14:** 导入时 Electron 原生文件选择对话框选取 .theme 文件，渲染进程读取后解压处理。

### Agent's Discretion
- generatePresets 工具脚本的具体实现位置和运行方式
- 预设弹窗的卡片布局细节（网格排列、卡片尺寸）
- 引擎侧 capture-preview 消息处理的具体 canvas 截图实现
- 导出时 base64 → 二进制的转换工具函数实现
- theme.json 中 nineSlice 引用路径的命名约定
- 导出/导入时的错误处理和格式校验策略
- 预设弹窗中导入进度/状态反馈方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 前序阶段
- `.planning/phases/24-thememanager-engine/24-CONTEXT.md` — D-01 稀疏存储、D-05 重置无确认+pushState、D-10 update-theme postMessage 整包替换
- `.planning/phases/25-nine-slice-color-harmony/25-CONTEXT.md` — D-03 base64 Data URL、D-12/D-13/D-14 nineSlice schema 和数据结构
- `.planning/phases/26-visual-theme-editor/26-CONTEXT.md` — D-01~D-03 布局、D-06 200ms debounce postMessage、D-07~D-09 调色盘弹窗模式

### 关键源码
- `src/engine/tokens.js` — DEFAULT_TOKENS 41 个 token（基础色盘参考）
- `src/engine/ThemeManager.js` — applyTheme/resetTheme + applyNineSlice/resetNineSlice
- `src/engine/colorHarmony.js` — generatePalette (34 key)、4 种 HSL 算法
- `src/engine/contrast.js` — contrastRatio、autoFix（WCAG 检查）
- `src/editor/composables/useThemeEditor.js` — setTokenBatch、commitTheme、sendThemeToPreview、flushPreview
- `src/editor/views/ThemeDesigner.vue` — 主题编辑器容器（iframe 预览集成）
- `src/editor/components/theme/ThemeToolbar.vue` — 工具栏（新增「预设」按钮入口）
- `src/editor/components/theme/PaletteModal.vue` — 调色盘弹窗（弹窗模式参考）
- `src/editor/stores/script.js` — getTheme() / updateTheme() store 方法

### 需求文档
- `.planning/REQUIREMENTS.md` — PRE-01、PRE-02、PKG-01、PKG-02、PKG-03 为本阶段需求

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **PaletteModal.vue** — 弹窗模式参考（工具栏按钮 → showPalette → Modal 组件），预设弹窗可复用同一模式
- **useThemeEditor composable** — setTokenBatch() 批量写入 token、commitTheme() 推撤销栈、sendThemeToPreview() 预览通信，预设应用直接调用
- **colorHarmony.js + contrast.js** — generatePresets 工具脚本的算法基础
- **DEFAULT_TOKENS** — 预设 token 对象的键名参考（41 个键）

### Established Patterns
- **弹窗模式**: `showXxx` ref → `v-if` 条件渲染 → `@close` 事件关闭
- **主题修改流**: setToken/setTokenBatch → sendThemeToPreview (200ms debounce) → commitTheme → pushState
- **postMessage 协议**: `{ type: 'xxx', ... }` JSON 消息，引擎监听 `message` 事件
- **Electron 文件对话框**: `window.electronAPI.showOpenDialog()` / `showSaveDialog()`（preload 暴露）

### Integration Points
- `ThemeToolbar.vue` — 新增「预设」按钮 + emit
- `ThemeDesigner.vue` — 添加 PresetModal 条件渲染
- `useThemeEditor.js` — 可能需要新增 previewPreset() / applyPreset() 方法
- `main.js initPreview()` — 引擎侧添加 `capture-preview` 消息处理
- `package.json` — 新增 fflate 依赖（ZIP 打包解压）

</code_context>

<specifics>
## Specific Ideas

- 用户明确选择预设只含 token 值（纯配色方案），不含九宫格图片——降低复杂度和素材依赖
- 4 套预设主色已确定：Modern #4A90D9、和风 #C8A882、Fantasy #7B2FBE、Minimal #333333
- 预设产出流程为混合模式：算法生成基础色盘 + 手动微调 10-15 个功能性 token
- 用户朋友建议 previewImage 自动截图 + 扩展 metadata（author/createdAt 为社区分享预留）
- 导入不落盘图片文件——ZIP 内图片直接转 base64 写入 theme 数据，保持运行时数据模型一致
- 200ms debounce 预览策略延续到预设预览（Phase 26 D-06）

</specifics>

<deferred>
## Deferred Ideas

- **社区主题市场/分享平台** — .theme 文件导入导出是基础设施，社区平台为更远期能力（v0.8+）
- **主题包字体内嵌** — 字体体积大 + 许可证问题，推迟到 v0.7+
- **更多内置预设** — 4 套起步，后续持续补充（8-10 套覆盖不同题材）

</deferred>

---

*Phase: 27-theme-presets-export-import*
*Context gathered: 2026-04-06*
