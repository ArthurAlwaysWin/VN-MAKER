# Phase 25: 9-Slice + Color Harmony - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

用户可为游戏 UI 元素（对话框、面板、按钮）应用九宫格图片皮肤，实现基于图片的 UI 外观定制。同时提供 HSL 色轮配色算法（4 种），从一个主色生成完整协调配色方案，带 WCAG 对比度验证和自动修复建议。

不包含：可视化主题编辑器 UI（Phase 26）、主题预设/导出（Phase 27）。本阶段只建立引擎能力和工具函数，编辑器交互属 Phase 26。

</domain>

<decisions>
## Implementation Decisions

### 九宫格渲染方案
- **D-01:** 使用 `::before` 伪元素方案实现九宫格背景。父元素保留 `border-radius` + `overflow: hidden` 裁剪圆角，`::before` 负责 `border-image` 渲染。解决研究报告 P3（border-image 与 border-radius 互斥）的根本矛盾。
- **D-02:** 九宫格 CSS 通过专用 `<style>` 标签注入（id="galgame-nine-slice"）。ThemeManager 维护该标签，更新时直接覆写 `textContent`。比 `insertRule()` 简洁——无需管理规则索引。
- **D-03:** 九宫格图片以 base64 Data URL 形式内联到 CSS 的 `border-image: url(...)` 中。图片通常 <100KB，避开 `asset://` 协议路径解析问题（P6）。
- **D-04:** `border-image-slice` 值使用无单位数字（非 `px`），加 `fill` 关键字填充中心区域。防护 P4 陷阱。

### 九宫格目标元素
- **D-05:** 全部 6 个目标元素实现九宫格支持：`dialogueBox`、`menuPanel`、`saveSlot`、`choiceButton`、`titleButton`、`settingsPanel`。
- **D-06:** 按钮三态（normal/hover/pressed）通过 CSS 伪类（`:hover` / `:active`）实现，注入时生成三条 `::before` 规则（normal、:hover::before、:active::before），浏览器自动处理状态切换，无需 JS 事件监听。
- **D-07:** 普通面板元素（dialogueBox 等）只有一套九宫格图片，数据结构中 `states` 为 `null`。按钮类元素（choiceButton、titleButton）有三态 `states` 对象。两种类型共用 nineSlice schema 但行为不同。

### 配色算法
- **D-08:** 纯 JS 实现，零外部依赖。新建 `src/engine/colorHarmony.js` 模块。
- **D-09:** 4 种 HSL 色轮配色算法全部实现：互补色（complementary）、类似色（analogous）、三角色（triadic）、分裂互补色（split-complementary），满足 CLR-02。
- **D-10:** WCAG 对比度验证和自动修复以工具函数形式实现在 `src/engine/contrast.js`。包含 `contrastRatio(hex1, hex2)` 和 `autoFix(fgHex, bgHex, target)` 两个核心函数。
- **D-11:** 对比度策略：警告 + 自动修复建议 + 用户确认。Phase 25 实现工具函数层（计算+修复算法），Phase 26 编辑器 UI 负责交互展示（绿色 ✓ / 黄色警告 + 修复按钮）。autoFix 采用二分查找亮度值，尝试加深和调亮两个方向，返回更接近原色的方案。

### 数据结构
- **D-12:** nineSlice schema 沿用研究报告定义：`{ src, slice, width, repeat, outset, states }`。普通元素 `states: null`，三态按钮 `states: { hover: { src }, active: { src } }`。
- **D-13:** `src` 字段直接存储 base64 Data URL 字符串（`data:image/png;base64,...`），自包含无外部文件依赖。
- **D-14:** `ui.theme.nineSlice` 对象结构：`{ dialogueBox, menuPanel, saveSlot, choiceButton, titleButton, settingsPanel }`，每个值为 null（未配置）或完整 schema 对象。Phase 24 D-02 已预留此位置。

### Agent's Discretion
- 按钮三态 CSS 伪类规则的具体生成逻辑细节
- colorHarmony.js 内部的 HSL↔Hex 转换实现
- autoFix 二分查找的精度和迭代上限
- nineSlice <style> 标签中 CSS 规则的选择器命名约定
- 各 UI 组件元素上 `overflow: hidden` 和 `position: relative` 的注入方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 研究文档
- `.planning/research/ARCHITECTURE.md` — 九宫格系统架构：数据流、border-image 方案、Per-Component 目标、::before 方案
- `.planning/research/PITFALLS.md` — P3(border-image vs border-radius)、P4(slice 无单位)、P6(asset:// 路径)
- `.planning/research/SUMMARY.md` — v0.6 主题系统研究摘要

### 前序阶段
- `.planning/phases/23-token-foundation/23-CONTEXT.md` — D-04 优先级层次：元素自定义 > Token > fallback
- `.planning/phases/24-thememanager-engine/24-CONTEXT.md` — D-01 稀疏存储、D-02 nineSlice 预留、D-07 纯函数模块

### 关键源码
- `src/engine/ThemeManager.js` — Phase 24 创建的纯函数模块，Phase 25 扩展 applyNineSlice/resetNineSlice
- `src/engine/tokens.js` — DEFAULT_TOKENS 41 个 token，含 btn-* 按钮 token 和 panel-bg/menu-bg 面板 token
- `src/style.css` — 已迁移为 `var(--gm-*)` 的 CSS，含 border-radius token 化（`--gm-radius`、`--gm-radius-lg`）
- `src/editor/stores/script.js` — getTheme/updateTheme 存储方法

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThemeManager.js` — 已有 applyTheme/resetTheme，Phase 25 扩展 applyNineSlice/resetNineSlice
- `tokens.js` — DEFAULT_TOKENS 含 btn-bg/btn-hover-bg/btn-hover-border 等按钮相关 token
- `script.js` store — getTheme/updateTheme 已就绪，nineSlice 数据变更走同一 pushState 通道

### Established Patterns
- 纯函数模块（ThemeManager.js）：named export，无 class
- `#game-container` 上注入 CSS 变量（`style.setProperty`）
- `update-theme` postMessage 整包替换：`{ type: 'update-theme', theme: { tokens, nineSlice } }`

### Integration Points
- `ThemeManager.js` — 扩展新函数 applyNineSlice，管理 `<style>` 标签
- `main.js init()` / `initPreview()` — 在 applyTheme 后调用 applyNineSlice
- `main.js update-theme handler` — 同时更新 token 和 nineSlice
- UI 组件 — 需添加 `position: relative` 和 `overflow: hidden` 以支持 ::before 方案

</code_context>

<specifics>
## Specific Ideas

- `<style>` 标签方案由用户明确建议：ThemeManager 维护一个 `id="galgame-nine-slice"` 的 style 元素，覆写 `textContent` 实现更新
- WCAG 方案由用户朋友建议：工具函数层（contrast.js）+ 编辑器交互层（Phase 26）分离，autoFix 二分查找亮度
- 按钮三态用纯 CSS 伪类，不用 JS 事件监听——用户明确选择此方案
- 九宫格图片用 base64 内联——用户确认，避开 asset:// 协议复杂度

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-nine-slice-color-harmony*
*Context gathered: 2026-04-06*
