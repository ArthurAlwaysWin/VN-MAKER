# Phase 53: Configurable Tabs (Engine) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 53-configurable-tabs-engine
**Areas discussed:** Tab data format, Icon rendering, Setting key assignment, Backward compatibility
**Mode:** Auto (all decisions auto-selected)

---

## Tab Data Format

| Option | Description | Selected |
|--------|-------------|----------|
| Object array `{label, icon?, settingKeys?}` | Extends current format naturally, one migration path | ✓ |
| Nested config with separate sections | More structured but over-engineered for <15 settings | |
| Keep string[] with parallel icon/keys arrays | Fragile, easy to desync | |

**User's choice:** [auto] Object array — recommended default
**Notes:** Natural extension of existing `tabBar.tabs` string array. Legacy string format auto-detected and converted.

---

## Icon Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Icon left of text (inline) | Common VN pattern, simple flexbox | ✓ |
| Icon above text (stacked) | Takes more vertical space, less common | |
| Icon-only mode | Loses accessibility, needs tooltip | |

**User's choice:** [auto] Icon left of text — recommended default
**Notes:** 24×24px fixed size, `object-fit: contain`. No space reserved when icon is absent.

---

## Setting Key Assignment

| Option | Description | Selected |
|--------|-------------|----------|
| Unassigned → append to last tab | Graceful forward-compat, per ROADMAP criterion #5 | ✓ |
| Unassigned → hidden | Risk of settings becoming inaccessible | |
| Unassigned → create "Other" tab | Auto-generated tabs confusing for users | |

**User's choice:** [auto] Append to last tab — recommended default (matches ROADMAP success criterion #5)
**Notes:** Duplicates across tabs render in first occurrence only. Invalid keys silently ignored.

---

## Backward Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect string vs object array | Zero migration cost, handles both formats | ✓ |
| Require explicit version field | Extra complexity, no benefit for <20 themes | |
| Breaking change with migration script | Unnecessary for this scope | |

**User's choice:** [auto] Auto-detect — recommended default
**Notes:** If `tabs[0]` is string → convert to `{label: tabs[0]}`. If tabs is omitted → use DEFAULT_TAB_LABELS + SETTING_GROUP_KEYS.

---

## Agent's Discretion

- Internal refactoring approach for `_renderStructured()` and `_renderStructuredContent()`
- CSS details for icon positioning within tab buttons
- Test structure and fixtures

## Deferred Ideas

None
