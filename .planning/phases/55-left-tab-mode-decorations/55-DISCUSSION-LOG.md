# Phase 55: Left-Tab Mode + Decorations (Engine) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 55-left-tab-mode-decorations
**Areas discussed:** Sidebar layout, Header decorations, Reset button, Panel background
**Mode:** Auto (all decisions auto-selected)

---

## Sidebar Layout (STRUCT-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Flexbox row — sidebar left, right column | Standard sidebar pattern with flex-direction: row | ✓ |
| CSS Grid with sidebar area | Grid template with named areas | |
| Absolute positioning | Sidebar and content both absolute-positioned | |

**User's choice:** [auto] Flexbox row (recommended default)
**Notes:** Simplest approach, consistent with existing inline-style patterns. Grid would add complexity without benefit for a 2-zone layout.

---

## Header Decorations (DECOR-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute-positioned img elements | Each decoration is an <img> in header div | ✓ |
| CSS background layers | Multiple backgrounds on header element | |
| Canvas-based rendering | Draw decorations on a canvas overlay | |

**User's choice:** [auto] Absolute-positioned img elements (recommended default)
**Notes:** Header already has position: relative. Simplest to implement, easiest to test (DOM queryable).

---

## Reset Button (DECOR-02)

| Option | Description | Selected |
|--------|-------------|----------|
| ConfigManager.reset() method | Add reset() that restores defaults, saves, notifies | ✓ |
| Inline reset in button handler | Copy defaults inline without new method | |
| Confirmation dialog before reset | Two-step reset with user confirmation | |

**User's choice:** [auto] ConfigManager.reset() method (recommended default)
**Notes:** Clean API addition. No confirmation dialog — this is engine-side, editor can add UX confirmation if desired.

---

## Panel Background (DECOR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Separate background div layer | New div with z-index: 0 behind content | ✓ |
| Background on settings panel element | background-image on .settings-structured | |
| Pseudo-element ::before | CSS pseudo-element for background layer | |

**User's choice:** [auto] Separate background div layer (recommended default)
**Notes:** Separate div allows opacity control without affecting child content. Pseudo-elements harder to control dynamically.

---

## Agent's Discretion

- CSS details for sidebar button hover/active states
- Exact z-index values for decoration layering
- Test structure and helper utilities
- Footer button handler refactoring approach

## Deferred Ideas

None
