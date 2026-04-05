# Phase 21: Save/Load UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 21-save-load-ui
**Areas discussed:** 槽位卡片布局, 页码导航交互, 覆盖确认流程, 上下文感知返回, 存档/读档模式切换

---

## 槽位卡片布局

| Option | Description | Selected |
|--------|-------------|----------|
| 纵向卡片（缩略图上，文字下） | 更紧凑，缩略图更突出 | |
| 横向卡片（缩略图左，文字右） | 保持现有样式 | ✓ |

**User's choice:** 横向卡片
**Notes:** 用户选择保持现有风格

| Option | Description | Selected |
|--------|-------------|----------|
| 5×2 = 10 槽/页，缩略图稍小 | 原需求方案 | |
| 4×2 = 8 槽/页，13 页 | 横向卡片更宽敞 | |
| 3×3 = 9 槽/页，12 页 | 卡片最宽敞 | ✓ |

**User's choice:** 3×3 = 9 槽/页，12 页共 108 槽
**Notes:** 用户偏好最宽敞的布局

| Option | Description | Selected |
|--------|-------------|----------|
| 只显示 100 槽位 | 最后一页只 1 个槽位 | |
| 显示满 108 槽位 | 多出 8 个也无妨 | ✓ |

**User's choice:** 显示满 108 槽位

空槽位样式：淡色虚线框 + "— 空 —" 文字居中（保持现有风格）

---

## 页码导航交互

| Option | Description | Selected |
|--------|-------------|----------|
| 横排数字标签（1-12），当前页紫色高亮 | 经典页码导航 | ✓ |
| 上一页/下一页箭头按钮 | 简单但需多次点击 | |
| 滚动条（所有槽位垂直滚动） | 无分页 | |

**User's choice:** 横排数字标签，底部放置，支持左右箭头键翻页

---

## 覆盖确认流程

| Option | Description | Selected |
|--------|-------------|----------|
| 内联卡片变换（原内容淡出→确认按钮） | 不打断体验 | ✓ |
| 全局确认弹窗 | 像 window.confirm | |

**User's choice:** 内联卡片变换
**Notes:** 用户提到业界做法 — 设置页中允许玩家关闭各类确认。但本阶段只做覆盖/删除确认，设置开关推迟。

---

## 上下文感知返回

| Option | Description | Selected |
|--------|-------------|----------|
| 传参记录来源 show(mode, source) | source = 'bar'\|'menu'\|'title' | ✓ |
| 栈式追踪全局覆盖层栈 | 自动 pop 上一层 | |

**User's choice:** 传参记录来源

关闭行为：bar → 继续游戏，menu → 重新打开 GameMenu，title → 返回标题页

---

## 存档/读档模式切换

**User's choice:** 无模式切换
**Notes:** "我玩了很多的视觉小说游戏了，几乎没有说切换存档读档模式的" — 入口决定模式，标题栏显示当前模式名（存档=紫色，读档=蓝色）

---

## Agent's Discretion

- 卡片 hover 动画细节
- 确认按钮具体颜色
- 页码标签间距字号
- 翻页过渡效果
- 读档模式下空槽位灰化样式

## Deferred Ideas

- 确认开关设置体系（settingDefs 扩展 — 覆盖/删除/加载/返回标题的确认可关闭）
