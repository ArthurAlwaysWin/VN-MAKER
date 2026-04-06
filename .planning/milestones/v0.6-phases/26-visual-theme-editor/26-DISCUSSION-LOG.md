# Phase 26: Visual Theme Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 26-visual-theme-editor
**Areas discussed:** 编辑器布局结构, 颜色选择交互, 九宫格配置界面, Token 分组与导航

---

## 编辑器布局结构

| Option | Description | Selected |
|--------|-------------|----------|
| 左右分栏 | 左侧控件区 + 右侧实时预览 iframe（类似 Figma） | ✓ |
| 上下分区 | 上方控件区 + 下方全宽预览 iframe | |
| 三栏 | 左侧 token 导航 + 中间控件区 + 右侧预览 iframe | |

**User's choice:** 左右分栏
**Notes:** 主题编辑器无画布拖拽需求，侧重控件面板 + 预览

| Option | Description | Selected |
|--------|-------------|----------|
| 左侧 ~40% / 右侧 ~60% | 比例分栏 | |
| 左侧 ~50% / 右侧 ~50% | 等分 | |
| 左侧固定 360px / 右侧自适应 | 固定宽度 | ✓ |

**User's choice:** 左侧固定 360px

| Option | Description | Selected |
|--------|-------------|----------|
| 左侧顶部工具栏 | 重置主题 / 应用调色盘，下方滚动控件区 | ✓ |
| 底部工具栏 | 底部固定 | |
| 无工具栏 | 所有操作内联 | |

**User's choice:** 左侧顶部工具栏

---

## 颜色选择交互

| Option | Description | Selected |
|--------|-------------|----------|
| 原生 `<input type="color">` + hex 输入框 | 零依赖，所有平台支持 | ✓ |
| 第三方 Vue 颜色选择器 | 更丰富 UI（vue-color 等） | |
| 自建 canvas HSL 色轮 | 完全自定义 | |

**User's choice:** 原生 color input + hex 输入框
**Notes:** 用户主动分析了 alpha 通道问题——原生 input 不支持透明度，需额外 opacity 滑块

| Option | Description | Selected |
|--------|-------------|----------|
| 所有 token 都显示 opacity | 统一控件 | |
| 按需显示 opacity | 带 alpha 的 token 显示滑块，纯色 token 不显示 | ✓ |

**User's choice:** 按需显示，根据 token 默认值自动判断

| Option | Description | Selected |
|--------|-------------|----------|
| 独立区域折叠区 | 工具栏内的调色方案区 | |
| 弹窗/抽屉 | 点击工具栏按钮弹出浮层 | ✓ |

**User's choice:** 弹窗形式

| Option | Description | Selected |
|--------|-------------|----------|
| 4 张色块卡片选算法 | 互补/类似/三角/分裂 → 预览 34 色 → 应用 | ✓ |
| 下拉框选算法 | 下拉选择 → 预览 → 应用 | |

**User's choice:** 4 张色块卡片（延续用户偏好：段按钮 > 下拉框）

---

## 九宫格配置界面

| Option | Description | Selected |
|--------|-------------|----------|
| 数值输入框 | 4 个 number input + 缩略图预览 | ✓ |
| 可视化拖线 | 在图片上拖动 4 条切片线 | |

**User's choice:** 数值输入框（重新选择后确认）

| Option | Description | Selected |
|--------|-------------|----------|
| 折叠区域在左侧面板底部 | 6 元素分组 | |
| 单独弹窗 | 点击工具栏按钮打开 | ✓ |
| 混合在 token 控件中 | 按功能区域分组 | |

**User's choice:** 单独弹窗

| Option | Description | Selected |
|--------|-------------|----------|
| 一个弹窗内 6 元素分页签/折叠板 | 一站式管理 | ✓ |
| 每个元素单独弹窗 | 6 个入口按钮 | |

**User's choice:** 一个弹窗内分页签/折叠板

| Option | Description | Selected |
|--------|-------------|----------|
| 缩略图上用 4 条虚线标注切片位置 | 直观 | ✓ |
| 只显示图片缩略图 | 简单 | |

**User's choice:** 虚线标注

---

## Token 分组与导航

| Option | Description | Selected |
|--------|-------------|----------|
| 折叠面板 accordion | 每组可展开/收起（类似 VS Code） | ✓ |
| 垂直分页签 | 左侧内部再分 tab | |
| 全部平铺滚动 | 不分组 | |

**User's choice:** 折叠面板

| Option | Description | Selected |
|--------|-------------|----------|
| 保持 tokens.js 现有 10 组 | 与数据源一致 | ✓ |
| 合并为 6-7 组 | 减少折叠项 | |

**User's choice:** 保持 10 组

---

## 其他决策

| 决策项 | 选择 |
|--------|------|
| 实时预览更新频率 | 200ms debounce（非实时） |
| WCAG 对比度展示 | 文字色 token 旁 ✓/⚠️ + 修复按钮 |
| 修复按钮行为 | 调用 contrast.js autoFix 自动调整 |

---

## Deferred Ideas

- 社区模板分享平台（Phase 27 PKG 系列已覆盖导出导入，社区平台为更远期）
- 用户提出"拉高下限 + 提供上限"设计哲学，贯穿 Phase 26-27

---

*Phase: 26-visual-theme-editor*
*Discussion log: 2026-04-06*
