# Phase 41: 編輯器狀態展示與容錯 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 41-editor-state-display-resilience
**Areas discussed:** 继承表情视觉区分, 继承来源提示, Stale 引用处理策略, 引擎侧 stale 验证

---

## 继承表情的视觉区分

| Option | Description | Selected |
|--------|-------------|----------|
| 触发器文字变淡灰 + 后缀「(继承)」 | 缩略图正常，文字标注来源 | |
| 触发器整体半透明 | opacity 0.5-0.6 标识 | |
| 不需要区分 | 用户自由输入：PPT 模式，默认复制前页 | ✓ |

**User's choice:** 不需要视觉区分。用户的心智模型是 PPT——同场景新页面默认继承前页所有元素。
**Notes:** 用户进一步提出新建页面应该自动复制前一页的角色/背景/BGM，对话留空。

---

## 继承来源提示

| Option | Description | Selected |
|--------|-------------|----------|
| 不需要 | 只显示继承的表情图 | ✓ |
| 简单提示 | 鼠标悬停 tooltip 显示来源页 | |
| 小图标标记 | 缩略图旁加 inherited badge | |

**User's choice:** 不需要来源提示。
**Notes:** 用户重申 PPT 心智模型——新页面是前页的复制，不存在"继承"概念。

---

## 新建页面行为

| Option | Description | Selected |
|--------|-------------|----------|
| 复制前页角色+背景+BGM，对话留空 | PPT 式复制 | ✓ |
| 新页面完全空白 | 用户手动添加所有元素 | |

**User's choice:** 复制前一页的角色（含表情+位置）、背景、BGM，对话和语音留空。
**Notes:** 理由是背景/BGM/角色跨多页持续存在，重复设置令人厌烦；对话每页不同必须手动填写。新场景第一页为空白。

---

## Stale 引用处理策略

| Option | Description | Selected |
|--------|-------------|----------|
| 静默 fallback | 自动显示第一个可用表情 | |
| 警告标记 | fallback + Inspector 橙色标记 | |
| 删除前确认 + 自动替换 | 预防性弹窗 + 批量替换 | ✓ |

**User's choice:** 删除前弹窗确认，列出受影响页面，确认后自动替换所有引用为第一个表情。
**Notes:** 无引用时直接删除。这是预防性方案，从根源避免 stale reference。

---

## 引擎侧 stale 验证

| Option | Description | Selected |
|--------|-------------|----------|
| 加一层验证 | 解析后检查 expressions[resolvedExpr] 是否存在 | ✓ |
| 不需要 | 相信数据完整性 | |

**User's choice:** 增加防御性验证——解析后检查表情图片是否存在，不存在则 fallback 到第一个。
**Notes:** 正常使用下不会触发（删除前确认已处理），但作为防御性编程保留。

---

## Agent's Discretion

- 新建页面复制数据的具体实现（深拷贝 vs 结构化 clone）
- 弹窗 UI 样式复用
- 引用检查遍历范围

## Deferred Ideas

- **Ctrl+C / Ctrl+V 页面复制粘贴** — 用户期望 PPT 式复制粘贴页面功能，作为后续 phase
