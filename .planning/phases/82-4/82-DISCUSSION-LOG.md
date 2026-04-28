# Phase 82: 剩余 4 套完整主题扩展 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 82-4
**Areas discussed:** Theme roster 与基线继承, Completeness gate 与 pipeline invariants, Visual differentiation standard, Production strategy 与复用边界

---

## Theme roster 与基线继承

| Option | Description | Selected |
|--------|-------------|----------|
| Promote existing 4 remaining built-ins | 升格 `default`、`modern-sky`、`fantasy-dark`、`minimal-white`，保持现有 theme IDs 与 browser entries | ✓ |
| Replace some built-ins with new themes | 重做 roster，引入新的 shipped theme IDs | |
| Keep only 3 remaining themes | 降低 shipped theme 总数，放弃 5-theme target | |

**User's choice:** [auto] Promote existing 4 remaining built-ins
**Notes:** Recommended default. It matches the existing built-in roster, preserves browser/package identity, and fulfills THM-02 without scope creep.

---

## Completeness gate 与 pipeline invariants

| Option | Description | Selected |
|--------|-------------|----------|
| Match `wafuu`'s 8-surface full-theme gate for all 4 themes | 所有剩余主题都达到与 golden baseline 相同的 coverage 与 parity 标准 | ✓ |
| Allow partial completion for some themes | 某些主题只做部分 screen/title coverage，先求数量达标 | |
| Create a lighter “non-golden” completeness tier | 为非 golden themes 单独定义较低完整度标准 | |

**User's choice:** [auto] Match `wafuu`'s 8-surface full-theme gate for all 4 themes
**Notes:** Recommended default. Phase 82 exists to close THM-02/03, so introducing a second completeness tier would undercut the milestone goal.

---

## Visual differentiation standard

| Option | Description | Selected |
|--------|-------------|----------|
| Distinguish themes by material, silhouette, and overall UI language | 每套主题在 title/dialogue/buttons/screens 上形成可感知的完整风格系统 | ✓ |
| Differentiate mainly by token palette | 主要通过配色变化区分主题，视觉结构尽量共用 | |
| Keep one shared UI structure and only vary hero surfaces | 保持绝大多数界面同构，只改局部重点画面 | |

**User's choice:** [auto] Distinguish themes by material, silhouette, and overall UI language
**Notes:** Recommended default. THM-03 explicitly rejects token-only recolors, so the stronger differentiation bar is the safe default.

---

## Production strategy 与复用边界

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse the technical skeleton, but require theme-specific visual data wherever identity would collapse | 复用 contract/pipeline/shape，避免重复造轮子；表达性资产与布局仍按主题独立交付 | ✓ |
| Heavy visual reuse from `wafuu` plus recolor | 以 `wafuu` 为底稿，优先节省资产制作成本 | |
| Build each theme from scratch with no shared structure | 不共享任何骨架或结构模板 | |

**User's choice:** [auto] Reuse the technical skeleton, but require theme-specific visual data wherever identity would collapse
**Notes:** Recommended default. It keeps implementation tractable without violating the full-theme differentiation requirement.

---

## the agent's Discretion

- 4 套主题的具体制作先后顺序
- preview card 的构图和 copy 细节
- 哪些 screen coordinates 可以安全复用

## Deferred Ideas

- 更多 built-in themes / roster 扩容
- 主题字体打包
- 在线主题生态与云同步
- live iframe preview for unapplied themes
