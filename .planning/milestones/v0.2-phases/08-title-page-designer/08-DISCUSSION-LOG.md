# Phase 8: Title Page Designer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 08-title-page-designer
**Areas discussed:** 装饰图片元素, 预制按钮机制, 悬停效果范围, 图层管理 UI

---

## 装饰图片元素

| Option | Description | Selected |
|--------|-------------|----------|
| 自由缩放 | 不锁定比例，和按钮一样拖拽边角调大小 | |
| 等比缩放 | 锁定宽高比，只能整体放大缩小 | |
| 不可缩放 | 显示原始尺寸，只能拖动位置 | |
| 自由缩放 + Shift 锁比例 | 默认自由，按住 Shift 锁定宽高比 | ✓ |

**User's choice:** 自由缩放 + Shift 锁定宽高比结合
**Notes:** 用户主动提出"不可以结合起来吗？"，认为两种模式应该可以共存。同时提出分辨率配置问题 — 项目创建时应该设置分辨率，影响所有上传资源。经讨论同意此为后续 milestone 功能，Phase 8 固定 1280×720。

---

## 预制按钮机制

### 按钮范围

| Option | Description | Selected |
|--------|-------------|----------|
| 固定 4 个预制 | 不能自定义按钮（简单清晰） | ✓ |
| 预制 + 自定义按钮 | 灵活，但自定义按钮能做什么？ | |

**User's choice:** 固定 4 个预制，后续有需求再添加
**Notes:** 用户认为标题页功能基本固定，不需要自定义按钮。

### 重复放置

| Option | Description | Selected |
|--------|-------------|----------|
| 每种只能放 1 个 | 放了就从面板灰掉 | ✓ |
| 可以重复放 | 不限制 | |

**User's choice:** 每种按钮只能放 1 个

### 退出按钮行为

| Option | Description | Selected |
|--------|-------------|----------|
| 关闭 Electron 窗口 | window.close() | ✓ |

**User's choice:** 关闭 Electron 窗口

---

## 悬停效果范围

| Option | Description | Selected |
|--------|-------------|----------|
| 仅背景色变化 | hoverColor，已有字段，最简单 | ✓ |
| 背景色 + 文字色 + 边框色 | 三色悬停，中等复杂 | |
| 完整动画 | 背景色 + 文字色 + 边框色 + 缩放/透明度 | |

**User's choice:** 仅背景色变化（hoverColor）
**Notes:** 保持简洁，沿用 TitleScreen.js 已有字段。

---

## 图层管理 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 属性面板中 ↑↓ 按钮 | 选中元素后显示，推荐 | ✓ |
| 画布上方工具栏按钮 | 上移/下移在工具栏 | |
| 右键菜单 | 置顶/上移/下移/置底 | |

**User's choice:** 属性面板中 ↑↓ 按钮
**Notes:** 用户先问"给我一个参考"，agent 推荐属性面板方案，用户同意。

---

## Agent's Discretion

- 组件面板排列方式和图标
- 属性面板字段排列
- 空状态文案
- 工具栏布局
- 继续游戏禁用状态预览
- 旧格式迁移策略

## Deferred Ideas

- 可配置项目分辨率（用户提出，同意推迟到后续 milestone）
- 复杂悬停动画（缩放/透明度/发光）
