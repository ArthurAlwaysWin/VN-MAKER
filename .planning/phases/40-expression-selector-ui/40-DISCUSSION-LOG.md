# Phase 40: 表情選擇器 UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 40-expression-selector-ui
**Areas discussed:** 触发器外观, 「不变」选项呈现, 网格布局参数, 定位与关闭行为

---

## 触发器外观

| Option | Description | Selected |
|--------|-------------|----------|
| 缩略图 + 表情名 | 左侧小缩略图(~24px) + 右侧表情名文字 + 下拉箭头，在 inspector 行内紧凑显示 | ✓ |
| 纯缩略图 | 只显示当前表情的小缩略图(~32px)，hover 显示表情名 | |
| 保持文字 + 下拉箭头 | 外观类似 `<select>`，点击后弹出缩略图网格 | |

**User's choice:** 缩略图 + 表情名（推荐）
**Notes:** 紧凑嵌入 inspector 行内，24px 缩略图保持行高不变

---

## 「不变」选项呈现

| Option | Description | Selected |
|--------|-------------|----------|
| 网格顶部文字卡片 | 和缩略图同等大小，显示「不变」文字，灰色背景区分 | ✓ |
| 触发器中单独处理 | 网格只显示表情，触发器显示「不变」时无缩略图 | |
| 单独一行按钮 | 网格上方单独一行「不变（继承上页）」按钮 | |

**User's choice:** 网格顶部添加一个「不变」文字卡片
**Notes:** 灰色背景 (#3c3c3c) 视觉区分，选中时同样使用 #007acc 边框

---

## 网格布局参数

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 CharacterPicker 参数 | 80px 网格 + 64×64 缩略图 + max-height 300px 滚动 | |
| 更小的缩略图 | 60px 网格 + 48×48 缩略图，适合 inspector 的紧凑空间 | ✓ |
| 更大的缩略图 | 100px 网格 + 80×80 缩略图，比较清晰但占空间 | |

**User's choice:** 更小的缩略图
**Notes:** 因为是下拉框而非全屏 modal，更紧凑的尺寸更适合 inspector 场景

---

## 定位与关闭行为

| Option | Description | Selected |
|--------|-------------|----------|
| 触发器下方 + 点击外部关闭 | Teleport 到 body，固定定位在触发器正下方 | |
| 触发器下方 + ESC 关闭 | 同上，增加 ESC 键关闭支持 | ✓ |
| 居中弹窗 | 类似 AudioPicker 的居中 modal | |

**User's choice:** 触发器下方 + ESC 关闭
**Notes:** ESC 需要 stopPropagation 防止冒泡到 Bug 3 修复后的游戏菜单 ESC 优先级链

---

## Agent's Discretion

- 表情名截断策略
- 网格外层 padding/margin 具体数值
- 选中态动画效果
- 空表情字典时的占位提示

## Deferred Ideas

_None identified._
