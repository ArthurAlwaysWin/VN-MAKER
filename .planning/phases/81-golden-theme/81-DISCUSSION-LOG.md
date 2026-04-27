# Phase 81: Golden Theme 验收样板 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 81-golden-theme
**Areas discussed:** golden theme 覆盖边界、baseline 策略、title 是否纳入完整主题

---

## Golden theme 覆盖边界

| Option | Description | Selected |
|--------|-------------|----------|
| 保持当前 v1.6 contract 边界 | 只覆盖 frozen full-theme contract 里的 theme-owned UI area，不含 title | |
| 扩大为完整非内容 UI 方案 | 把 title 也纳入，做成真正的完整非内容 UI/UX 美术方案 | ✓ |

**User's choice:** 扩大范围：Phase 81 的 golden theme 必须把 title screen 也纳入，做成真正的全局非内容 UI 美术方案
**Notes:** 这使 Phase 81 不再只是现有 contract 的样板验证，而是一次显式扩边；后续 planner 必须把需求、验证、browser/expor t surfaces 一并对齐。

---

## Golden baseline 策略

| Option | Description | Selected |
|--------|-------------|----------|
| 以现有 `wafuu` 升格为 baseline | 复用现有最完整的 built-in theme，补齐 title 与整体一致性 | ✓ |
| 重新设计一套全新 golden theme | 在本 phase 新开一套陌生主题方向 | |

**User's choice:** 自动模式采用推荐方案：以 `wafuu` 作为 baseline
**Notes:** 这是 agent 的推荐默认，不是用户逐字指定；原因是 `builtinThemes.js` 中只有 `wafuu` 明确表现为 full-like built-in，而另外几套更像颜色/控件变体。

---

## the agent's Discretion

- `wafuu` 升格时的具体细化程度
- title 与其他 major UI 面的统一视觉语言
- browser 中如何表达“golden theme 已超出现有 frozen contract，纳入 title”

## Deferred Ideas

- 其余 4 套完整主题的量产扩展
- 主题商店 / 社区共享 / 分发系统
