# Phase 26: Visual Theme Editor - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

编辑器新增「🎨 主题」标签页，提供可视化主题编辑界面。左侧 360px 固定面板含 10 组折叠控件（颜色选择器/滑块/字体选择器），右侧自适应引擎预览 iframe 实时展示效果。包含调色盘生成器弹窗和九宫格配置弹窗。

不包含：主题预设模板（Phase 27 PRE-01/PRE-02）、.theme 文件导出导入（Phase 27 PKG-01/02/03）。本阶段只建设编辑器交互层，预设和分享属 Phase 27。

**设计哲学：拉高下限 + 提供上限**
- 下限：选一个主色 → 一键生成协调配色 → 实时预览 → 应用。不懂配色的用户也能做出好看的 UI。
- 上限：41 个 token 逐个精调、九宫格自定义切片、WCAG 对比度手动修复。懂设计的用户有充分自由度。

</domain>

<decisions>
## Implementation Decisions

### 整体布局
- **D-01:** 左右分栏布局：左侧固定 360px 控件面板 + 右侧自适应引擎预览 iframe。不采用三栏模式（主题编辑器无画布拖拽需求，侧重控件 + 预览）。
- **D-02:** 左侧面板顶部一行工具栏（重置主题 / 调色盘生成器入口 / 九宫格配置入口），下方是可滚动的 token 控件区。
- **D-03:** 注册为编辑器新标签页「🎨 主题」，与现有 5 个标签同级（共 6 个 tab）。

### 颜色控件
- **D-04:** 原生 `<input type="color">` + hex 文本输入框，零第三方依赖。
- **D-05:** 带 alpha 通道的 token（如 rgba 值，约 25 个）额外显示 opacity 滑块（0-100%）。纯色 token（如 '#ff6b6b'）只显示颜色选择器，无 opacity 滑块。控件根据 token 默认值自动判断。
- **D-06:** 颜色变更通过 200ms debounce 后 postMessage 到 iframe 预览（Phase 24 D-10 整包替换协议）。

### 调色盘生成器
- **D-07:** 以弹窗/浮层形式展示，从工具栏按钮打开。
- **D-08:** 弹窗内交互流程：选主色（原生 color input）→ 显示 4 张色块卡片（互补/类似/三角/分裂互补，对应 colorHarmony.js 4 种算法）→ 点选一张 → 预览全部 34 个生成色 → 「应用」按钮一键写入所有颜色 token。
- **D-09:** 应用后通过 updateTheme() 推入撤销栈，用户可 Ctrl+Z 回退。

### 九宫格配置
- **D-10:** 以弹窗形式展示，从工具栏按钮打开（独立于调色盘弹窗）。
- **D-11:** 弹窗内 6 个目标元素以页签或折叠板组织（一站式管理）：对话框/菜单面板/存档槽/选项按钮/标题按钮/设置面板。
- **D-12:** 每个元素的配置区包含：图片上传（读取为 base64 Data URL，沿用 Phase 25 D-03）、4 个 number input（上/右/下/左 border-image-slice）、缩略图预览（上方用 4 条虚线标注切片位置）。
- **D-13:** 按钮类元素（选项按钮/标题按钮）额外显示 hover 和 active 状态的图片上传区。

### Token 分组
- **D-14:** 使用折叠面板（accordion）展示，与 tokens.js 现有 10 个分组注释一致：核心色(10)、文字(6)、边框(3)、背景(7)、按钮(6)、字体(2)、圆角(2)、模糊(1)、控件(3)、说话人(1)。
- **D-15:** 字体 token 使用字体选择器（下拉列表从资源库已导入字体 + 系统默认字体中选择）。
- **D-16:** 圆角和模糊 token 使用数值滑块 + 输入框。
- **D-17:** 背景类 token 中的 linear-gradient 值（dialogue-bg、title-bg）需特殊处理——提供简化的渐变编辑器或保留为文本输入。

### WCAG 对比度展示
- **D-18:** 文字色 token（text 组 6 个）旁显示 vs 背景色的对比度值。绿色 ✓ 表示通过（≥4.5:1），黄色 ⚠️ 表示未通过，附带「修复」按钮调用 contrast.js autoFix。
- **D-19:** 修复按钮点击后自动调整文字色（更亮或更暗），立即更新预览。

### Agent's Discretion
- iframe 预览的具体初始化和通信实现细节
- 折叠面板的展开/收起动画方式
- 弹窗的尺寸和定位策略
- 渐变类 token 的编辑方式（简化渐变编辑器 vs 文本输入）
- 九宫格缩略图的虚线绘制实现（canvas vs CSS overlay）
- 颜色控件内部的 rgba ↔ hex+alpha 转换逻辑

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 前序阶段
- `.planning/phases/23-token-foundation/23-CONTEXT.md` — D-01 字体三层优先级、D-04 优先级层次
- `.planning/phases/24-thememanager-engine/24-CONTEXT.md` — D-01 稀疏存储、D-10 update-theme postMessage、D-13 getTheme/updateTheme
- `.planning/phases/25-nine-slice-color-harmony/25-CONTEXT.md` — D-01~D-14 九宫格方案、配色算法、WCAG 策略

### 关键源码
- `src/engine/tokens.js` — DEFAULT_TOKENS 41 个 token（10 组注释分隔），控件区分组依据
- `src/engine/ThemeManager.js` — applyTheme/resetTheme + applyNineSlice/resetNineSlice 4 个导出函数
- `src/engine/colorHarmony.js` — hexToHsl, hslToHex, 4 种算法, generatePalette (34 key)
- `src/engine/contrast.js` — contrastRatio, autoFix (WCAG 二分查找)
- `src/editor/stores/script.js` — getTheme() / updateTheme() store 方法
- `src/editor/App.vue` — tabs 数组 + tabComponents 映射（新增 theme tab 的注册点）
- `src/editor/composables/usePageEditor.js` — iframe postMessage 协议参考
- `src/editor/views/SettingsDesigner.vue` — 现有设计器面板布局模式参考
- `src/editor/components/resource-library/` — 文件上传 + base64 转换模式参考

### 需求文档
- `.planning/REQUIREMENTS.md` — EDT-01~EDT-05 为本阶段需求

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Tab 导航系统** (`App.vue`): tabs 数组 + tabComponents 映射，新增 theme tab 只需添加一项
- **iframe postMessage** (`usePageEditor.js`): start/stop/mute 协议 + `update-theme` (Phase 24)，可复用预览通信模式
- **getTheme/updateTheme** (`script.js`): 已就绪，修改 token → updateTheme() → pushState() → 自动保存 + 撤销
- **资源上传模式** (`ResourceLibrary.vue`): 文件选择 + 格式验证 + base64 转换流程
- **colorHarmony.js / contrast.js** (Phase 25): 调色盘生成和对比度检查工具函数

### Established Patterns
- **Editor 组件结构**: Vue SFC + `<script setup>` + Pinia store + composable
- **CSS 变量注入**: `element.style.setProperty('--gm-*', value)`
- **postMessage 深拷贝**: `JSON.parse(JSON.stringify())` 去除 Vue Proxy
- **undo/redo**: store.pushState() 快照机制
- **auto-save**: 2s debounce watch on script.data

### Integration Points
- `App.vue tabs[]` — 添加 `{ id: 'theme', icon: '🎨', label: '主题' }`
- `App.vue tabComponents` — 添加 `'theme': markRaw(ThemeDesigner)`
- `script.js getTheme/updateTheme` — 控件修改 token 的数据通道
- iframe `update-theme` postMessage — 实时预览的通信通道
- `src/engine/colorHarmony.js` — 调色盘弹窗的算法来源
- `src/engine/contrast.js` — WCAG 对比度标注和修复的工具来源

</code_context>

<specifics>
## Specific Ideas

- 用户明确选择了「拉高下限 + 提供上限」的设计哲学，贯穿 Phase 26-27
- 原生 `<input type="color">` + opacity 滑块组合方案，由用户主动分析 alpha 通道问题并提出
- 调色盘用 4 张色块卡片而非下拉框，延续用户偏好（radio/segment 按钮 > 下拉框）
- 九宫格缩略图上的虚线标注是直观性的关键——用户明确选择此方案
- 200ms debounce 而非实时 postMessage，用户选择性能优先

</specifics>

<deferred>
## Deferred Ideas

- **社区模板分享**：用户提议在社区平台提供其他用户制作的主题模板，用户之间可分享自己的配置。Phase 27 PKG-01/02/03 已包含 .theme 文件导出导入，社区分享平台为更远期的能力。

</deferred>

---

*Phase: 26-visual-theme-editor*
*Context gathered: 2026-04-06*
