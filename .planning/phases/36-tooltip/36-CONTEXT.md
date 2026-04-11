# Phase 36: Tooltip 帮助系统 - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

为编辑器添加上下文帮助提示系统，包含两种模式：
1. **HelpTip 组件**（? 图标 + hover 气泡）— 用于配置项和复杂操作的详细说明
2. **按钮 title 属性**— 用于简单按钮和工具栏图标的快速提示

覆盖全部 6 大编辑区：主题编辑器、导出功能、项目设置、剧本编辑器、资源库、标题页/设置页设计器。

**不在范围内：** 引导式教程、独立文档页面、视频教程、引擎运行时帮助、i18n 框架。

</domain>

<decisions>
## Implementation Decisions

### HelpTip 组件设计
- **D-01:** ? 图标采用圆形底色 + 白色问号风格，类似 macOS 帮助按钮，使用统一强调色
- **D-02:** 帮助气泡智能定位 — 默认在 ? 图标右侧，边缘空间不足时自动翻转
- **D-03:** hover 触发 — 鼠标悬停显示，移开消失，最轻量交互
- **D-04:** 淡入淡出动画 — opacity 过渡，约 150ms
- **D-05:** 半透明暗色气泡配色 — 带微妙透明度，融入暗色主题界面
- **D-06:** 气泡最大宽度 240-280px，适合 2-3 行说明文本
- **D-07:** 纯文本内容 — 不支持富文本，多行用 \n 换行
- **D-08:** 无箭头指示器 — 纯圆角矩形，简洁现代

### 帮助文本管理
- **D-09:** 集中映射文件 — 新建 `src/editor/helpTexts.js`，所有帮助文本集中存储，组件通过 key 引用（延续 Phase 35 TOKEN_LABELS 模式）
- **D-10:** 按编辑区分组 — helpTexts.js 内部按 theme/export/settings/script/resource/title 分层组织
- **D-11:** 混合长度文本 — 简单配置项短说明（10-20 字），复杂功能详细说明（20-50 字），灵活处理

### 按钮 title 补全
- **D-12:** 统一扫描 + 集中处理 — 一次性遍历所有组件，补全 ~88 个缺失 title 的按钮
- **D-13:** title 文本内联写死 — 直接在模板中写 `title="操作名"`，不引用 helpTexts.js

### 帮助内容覆盖
- **D-14:** 一个计划全部实施 — HelpTip 组件 + 所有区域帮助内容 + 按钮 title 补全在一个计划中完成
- **D-15:** ? 图标只加在配置项和复杂操作处 — 用户可能不懂的地方加 ? 图标，简单按钮只用 title

### Agent's Discretion
- 气泡具体 CSS 数值（圆角、padding、字号）由实现决定，保持与暗色主题协调
- 智能定位的具体翻转逻辑（viewport 边界检测算法）
- helpTexts.js 中具体的 key 命名规则

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — HELP-01 ~ HELP-08 requirements definitions

### Roadmap
- `.planning/ROADMAP.md` (Phase 36 section, lines 223-241) — Phase scope, new component path, file count estimate

### Prior Phase Context
- `.planning/phases/35-chinese-localization/35-CONTEXT.md` — Phase 35 localization decisions (TOKEN_LABELS pattern, naming style)

### Existing Code References
- `src/editor/components/theme/TokenAccordion.vue` — TOKEN_LABELS 集中映射先例
- `src/editor/App.vue` — 已有中文 title 示例 (line 14)
- `src/editor/components/theme/ThemeToolbar.vue` — 已有中文 title 示例
- `src/editor/components/page-editor/CanvasToolbar.vue` — 已有动态 title 示例

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **TOKEN_LABELS pattern** (TokenAccordion.vue): 集中映射对象模式，可作为 helpTexts.js 的设计参考
- **已有 title 属性**: App.vue, ThemeToolbar, CanvasToolbar, DialogueBoxSettings 等已有中文 title，可作为风格参考
- **暗色主题 CSS**: 编辑器已有完整暗色主题 CSS 变量体系

### Established Patterns
- **Vue 3 SFC**: 所有编辑器组件使用 `<script setup>` + `<template>` + `<style scoped>`
- **组件目录**: `src/editor/components/` 下按功能分子目录（canvas, page-editor, resource-library, theme）
- **import 引用**: 组件间通过相对路径 import

### Integration Points
- **HelpTip.vue** 作为全局组件，放在 `src/editor/components/HelpTip.vue`
- **helpTexts.js** 放在 `src/editor/helpTexts.js`
- **~15+ editor views/components** 需要添加 HelpTip 引用或 title 属性

</code_context>

<specifics>
## Specific Ideas

- ? 图标视觉：圆形底色 + 白色问号，类似 macOS 系统帮助按钮风格
- 气泡风格：半透明暗色背景、无箭头、圆角矩形，融入暗色编辑器主题
- 文本管理模式：延续 Phase 35 TOKEN_LABELS 的集中映射方式

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-tooltip*
*Context gathered: 2026-04-11*
