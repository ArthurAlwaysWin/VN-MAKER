# Phase 10: Page Data Schema & Engine Adaptation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 10-page-data-schema-engine-adaptation
**Areas discussed:** 页面粒度, 场景保留, 视觉状态继承, 选择分支模型

---

## 页面粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 一页=一句对话（纯PPT） | 每句对话独占一页，最简单最直观，但同一背景的连续对话产生大量重复页面 | |
| 一页=一个视觉状态（含多句对话） | 一页有固定背景+角色，包含 dialogues[] 数组。玩家点击推进对话，背景/角色变化时才翻页 | ✓ |

**User's choice:** 一页=一个视觉状态，含 dialogues[] 数组
**Notes:** 用户追问"角色表情变化算不算新的视觉状态？" — 决定表情变化绑定到对话行（每条对话可选指定表情变化），不新建页面。仅背景变化和角色增减时才新建页面。同时确认此方案在编辑器 UI 上仍然对无编程能力的用户友好。

---

## 场景保留

| Option | Description | Selected |
|--------|-------------|----------|
| 保留场景分组 | scenes[sceneId].pages[]，场景作为页面的分组容器（类似 PPT 的"节"） | ✓ |
| 扁平化 | 去掉场景概念，只有一个大的 pages[] 数组 | |

**User's choice:** 保留场景分组
**Notes:** 场景提供章节/分支的自然边界，大型游戏需要组织结构。

---

## 视觉状态继承

| Option | Description | Selected |
|--------|-------------|----------|
| 自包含 | 每页完整声明所有视觉信息，不依赖前一页 | ✓ |
| 继承模式 | 只声明变化部分，未声明的从前一页继承 | |

**User's choice:** 自包含模式
**Notes:** 自包含让每页可独立渲染，支持从任意位置开始试玩，且拖拽排序不破坏视觉状态。

---

## 选择分支模型

| Option | Description | Selected |
|--------|-------------|----------|
| 特殊页面类型 | 选择页 type:"choice"，与普通页 type:"normal" 并列 | ✓ |
| 对话附属 | 选项挂在最后一句对话上 | |

**User's choice:** 特殊页面类型
**Notes:** 选择页在侧栏中有独特标识，数据结构清晰。

---

## Agent's Discretion

- 页面 ID 生成策略
- BGM 为空时的引擎行为
- 引擎在页面间的角色进出场动画处理
- SaveManager 状态结构细节

## Deferred Ideas

None
