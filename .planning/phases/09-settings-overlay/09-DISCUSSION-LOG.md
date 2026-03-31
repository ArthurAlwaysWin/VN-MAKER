# Phase 9: Settings Overlay - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 09-settings-overlay
**Areas discussed:** 叠加层形态, 过渡动画, 背景处理, 关闭交互

---

## 叠加层形态

| Option | Description | Selected |
|--------|-------------|----------|
| 方案 A: 右侧滑入面板 | 从右侧滑入 420px 固定宽度面板，左侧可见游戏画面，现代感强 | |
| 方案 B: 居中浮动面板 | 屏幕中央弹出 700×560 面板，四周可见游戏画面 + 模糊遮罩 | |
| 方案 C: 全屏半透明叠加 | 全屏覆盖但背景半透明 + 模糊，游戏可透视 | ✓ |

**User's choice:** 方案 C — 全屏叠加层
**Notes:** 用户最初的设想就是全屏设置页叠加在游戏上方（符合 Galgame 行业惯例）。方案 A 也得到了好评但考虑到自定义布局兼容性和改动量选择了方案 C。创建了 HTML 原型供用户对比三种方案视觉效果。

---

## 过渡动画方向

| Option | Description | Selected |
|--------|-------------|----------|
| 从下方滑入 | 常见移动端风格，平滑自然 | |
| 从右侧滑入 | 现代桌面应用风格 | ✓ |
| 淡入淡出 | 保持现有 opacity 过渡，最简单 | |
| Agent 决定 | 由 agent 自行选择 | |

**User's choice:** 从右侧滑入
**Notes:** 无额外说明

---

## 背景处理

| Option | Description | Selected |
|--------|-------------|----------|
| 保留自定义背景图 | 有背景图时半透明显示，无背景图时用模糊遮罩 | ✓ |
| 去掉自定义背景图 | 统一用半透明 + 模糊遮罩 | |
| Agent 决定 | 由 agent 自行选择 | |

**User's choice:** 保留自定义背景图选项（双模式）
**Notes:** 无额外说明

---

## 关闭交互

### ESC 行为

| Option | Description | Selected |
|--------|-------------|----------|
| ESC 关闭设置 → 返回游戏 | 直接关闭，不回到菜单 | |
| ESC 关闭设置 → 返回上一层 | 栈式层级，下面是什么就回到什么 | ✓ |

**User's choice:** 栈式层级管理 — 关闭设置回到上一层
**Notes:** 用户明确表示"关闭这个叠加层，上一个页面是啥页面就回到那个页面"

### 游戏菜单行为

**User's clarification:** 打开设置时不关闭游戏菜单，设置直接盖在上面。关闭设置后菜单仍在。

### 点击遮罩关闭

| Option | Description | Selected |
|--------|-------------|----------|
| 支持点击遮罩关闭 | OVERLAY-07 要求 | |
| 不支持点击遮罩关闭 | 全屏模式无明显遮罩区域 | ✓ |

**User's choice:** 不支持点击遮罩关闭
**Notes:** 全屏叠加层模式下没有可点击的遮罩区域，OVERLAY-07 需求移除

---

## Agent's Discretion

- 过渡动画精确 timing 和时长
- 半透明背景 opacity 值
- 模糊效果 blur 半径
- z-index 具体数值

## Deferred Ideas

- 可配置滑入方向（已在 REQUIREMENTS.md Future Requirements 中）
