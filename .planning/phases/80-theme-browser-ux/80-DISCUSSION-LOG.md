# Phase 80: 主题浏览器与选择 UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 80-theme-browser-ux
**Areas discussed:** 浏览器拓扑、统一数据模型、状态与操作 gating、预览与错误反馈

---

## 浏览器拓扑

| Option | Description | Selected |
|--------|-------------|----------|
| Unified theme browser | 一个浏览器统一承接 built-in / imported / partial 浏览、导入、选择与应用入口 | ✓ |
| Keep split modals | 继续保留当前预设与完整主题两个入口，再分别增强 | |
| List + secondary details modal | 列表页只做选择，详情另开二级 modal | |

**User's choice:** 自动模式采用推荐方案：Unified theme browser
**Notes:** 直接遵循 `docs/superpowers/specs/2026-04-27-phase-80-theme-browser-design.md` 的推荐方案；用户明确授权“你自己按你认为合适推荐的方案定”。

---

## 统一数据模型

| Option | Description | Selected |
|--------|-------------|----------|
| Orthogonal normalized item | 使用 `source + mode + lifecycle + coverage + missingCoverage + applyImpact + preview` 统一建模 | ✓ |
| Separate built-in/imported view models | UI 层分别维护两套模型，再靠组件判断拼接 | |
| Minimal card-only metadata | 卡片只保留轻量字段，详情临时再现算状态 | |

**User's choice:** 自动模式采用推荐方案：Orthogonal normalized item
**Notes:** 现有 spec 已锁定统一 item shape；`script.data.ui.theme.packageMeta` 继续作为 applied truth，避免引入第二套状态真相。

---

## 状态与操作 gating

| Option | Description | Selected |
|--------|-------------|----------|
| Full themes apply, partial themes inspect-only | full theme 允许 Apply；legacy-partial 只展示兼容信息与缺失 coverage | ✓ |
| Treat partial themes like full replacements | partial theme 与 full theme 展示同等 Replace CTA | |
| Hide lifecycle state behind generic badges | 弱化“当前已应用 / 已导入 / 内置可用”的区别 | |

**User's choice:** 自动模式采用推荐方案：Full themes apply, partial themes inspect-only
**Notes:** 直接延续 Phase 78/79 已冻结边界；当前已应用项隐藏主 Apply CTA，避免与 imported-but-not-applied 混淆。

---

## 预览与错误反馈

| Option | Description | Selected |
|--------|-------------|----------|
| Static previews + inline feedback | 未应用主题仅用静态预览；导入成败反馈留在浏览器上下文内 | ✓ |
| Live iframe preview for unopened themes | 为浏览器里的未应用主题新增真实 runtime 预览 | |
| Import failure resets browser state | 导入失败后清空筛选/选择并退出当前上下文 | |

**User's choice:** 自动模式采用推荐方案：Static previews + inline feedback
**Notes:** 用户要求减少打断；因此沿用 milestone 明确禁止的 live preview 边界，并保持失败时不打断当前浏览上下文。

---

## the agent's Discretion

- Badge 的具体视觉权重与文案精炼
- 卡片密度、筛选器具体控件样式
- fallback thumbnail 的具体实现与占位美术策略
- 详情面板中 coverage / impact 信息的排版顺序

## Deferred Ideas

- 未应用主题的 live iframe preview
- golden theme / remaining themes 的内容生产
- partial theme 的高级生命周期与应用模型
