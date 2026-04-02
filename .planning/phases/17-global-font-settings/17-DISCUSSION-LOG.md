# Phase 17: Global Font Settings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 17-global-font-settings
**Areas discussed:** 编辑器 UI 入口, 字体选择器交互, 实时预览范围, 名牌字体独立性

---

## 编辑器 UI 入口

| Option | Description | Selected |
|--------|-------------|----------|
| 独立面板/tab | 在编辑器顶部新增"对话框设置"入口 | |
| PageInspector 新 section | 在现有检查器下方加可折叠区域 | |
| 项目设置页 | 放在项目级别的设置页面中 | ✓ (partial) |

**User's choice:** 项目设置页放全局设置 + PageInspector 加"字体"section（默认"使用全局设置"勾选，取消后可编辑）
**Notes:** 用户考虑到每页可能需要不同字体，设计了全局+覆盖的双层架构。整体覆盖模式（非逐项），取消勾选后 6 项全部独立。

---

## 字体选择器交互

| Option | Description | Selected |
|--------|-------------|----------|
| 分组下拉框 | 已导入字体和系统字体分两组显示 | ✓ (combined) |
| 平铺列表 | 所有字体平等显示不分组 | |
| 带预览的下拉框 | 每个字体选项用该字体渲染显示 | ✓ (combined) |

**User's choice:** 方案 1 + 3 合并——分组且带预览
**Notes:** 用户认为分组和预览不互斥，合在一起是最好的体验。

---

## 实时预览范围

| Option | Description | Selected |
|--------|-------------|----------|
| 画布实时更新 | 改设置后当前页面对话框立即反映新样式 | ✓ |
| 画布 + 侧边预览小组件 | 除画布外再加一个小型预览卡片 | |
| 仅画布，需切 tab | 要求切到"游戏内容"tab 才能看到 | |

**User's choice:** 画布实时更新 + 项目设置 tab 内迷你预览框
**Notes:** 用户指出关键体验问题：字体设置在"项目设置"tab，画布在"游戏内容"tab，两个 tab 不能同时显示。因此需要一个迷你对话框预览放在设置区域旁边，实现成本低但体验大幅提升。

---

## 名牌字体独立性

| Option | Description | Selected |
|--------|-------------|----------|
| 名牌只控制字号 | 名牌字体和颜色跟随全局设置 | |
| 名牌字号 + 字体 | 名牌可用不同字体但颜色跟随 | |
| 名牌完全独立 | 名牌有自己的字号/字体/颜色 | ✓ |

**User's choice:** 名牌完全独立
**Notes:** 与对话文字完全解耦，名牌有独立的 3 个属性。数据模型从 4 字段扩展为 6 字段。

---

## Agent's Discretion

- 迷你预览框尺寸和示例文字
- 字体下拉框预览文字样本
- fontOverride 序列化策略
- 引擎全局/每页覆盖合并细节

## Deferred Ideas

None — discussion stayed within phase scope
