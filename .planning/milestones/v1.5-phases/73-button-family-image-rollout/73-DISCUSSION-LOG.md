# Phase 73: 按钮族图片态扩面 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 73-button-family-image-rollout
**Areas discussed:** 图片定义落点, family rollout 策略, 状态模型, runtime/preview 验收
**Mode:** auto

---

## 图片定义落点

| Option | Description | Selected |
|--------|-------------|----------|
| Shared `ui.theme` family contract | Cross-screen button skins live in one theme-level registry and reuse the Phase 71 contract path | ✓ |
| Per-screen config fields | Put button image states under each screen config separately | |
| Reuse `widgetStyles.button` only | Force all families through the generic widget button style path | |

**User's choice:** Auto-selected recommended option: Shared `ui.theme` family contract
**Notes:** Matches Phase 71 decision that cross-surface reusable UI assets belong in `ui.theme`, not per-screen drift.

---

## Family rollout 策略

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze the 5-family matrix from ROADMAP.md | Deliver `game-menu-button`, `QAB`, `close-button family`, `page-tab / pager`, `settings-tab` in one coordinated rollout | ✓ |
| Expand opportunistically by selector | Skin whichever buttons are easy and defer the rest case-by-case | |
| Add extra button families now | Pull in slot actions, internal CTAs, and more screen-local buttons in the same phase | |

**User's choice:** Auto-selected recommended option: Freeze the 5-family matrix from ROADMAP.md
**Notes:** Keeps acceptance aligned with BTN-01/02/03 and avoids scope creep.

---

## 状态模型

| Option | Description | Selected |
|--------|-------------|----------|
| Requirement-aligned states only | 3-state for `game-menu-button` / `QAB` / close family, 4-state for tab families, existing modifiers remain CSS-driven | ✓ |
| Add extra active/disabled image slots now | Extend QAB and other buttons with more image states in this phase | |
| Use one uniform 4-state model for all families | Force every family into normal/hover/pressed/selected regardless of current semantics | |

**User's choice:** Auto-selected recommended option: Requirement-aligned states only
**Notes:** Respects the current `.active` / `.disabled` semantics on QAB and `.active` selection logic on tabs.

---

## runtime / preview 验收

| Option | Description | Selected |
|--------|-------------|----------|
| Shared registry + existing runtime previews | Extend ThemeManager-style selector injection and validate through existing iframe/surface preview owners | ✓ |
| Inline logic in each UI class | Manually apply image states inside every screen/widget runtime owner | |
| Separate local preview sandbox | Build a dedicated editor-only button preview stage for this phase | |

**User's choice:** Auto-selected recommended option: Shared registry + existing runtime previews
**Notes:** Preserves the v1.5 rule that preview truth must come from runtime-backed surfaces, not local mockups.

---

## the agent's Discretion

- Exact field names beneath `ui.theme`
- Registry helper naming and data shape
- Whether close-family selectors are represented as aliases or explicit multi-selector outputs

## Deferred Ideas

- Dedicated image slots for QAB `.active` / `.disabled`
- Expanding the rollout beyond the frozen 5-family matrix
- Editor-only button preview sandbox
