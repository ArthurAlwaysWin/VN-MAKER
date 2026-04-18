# Phase 56: Smart Color Editor UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 56-smart-color-editor-ui
**Areas discussed:** Component placement, Recipe persistence, Override tracking, Live preview, Harmony UI, Mode toggle, Coexistence, Accent behavior
**Mode:** Auto (all decisions auto-selected with recommended defaults)

---

## Component Placement

| Option | Description | Selected |
|--------|-------------|----------|
| New SmartColorPanel.vue | Standalone inline component in theme designer | ✓ |
| Modify PaletteModal | Extend existing modal with new features | |
| Replace PaletteModal | Remove old, build new | |

**User's choice:** [auto] New SmartColorPanel.vue component (recommended — PaletteModal stays for legacy)
**Notes:** SmartColorPanel renders inline, not as a modal. Better UX for primary workflow.

---

## Recipe Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| theme.colorRecipe alongside theme.tokens | Same theme object, natural access | ✓ |
| Separate top-level colorRecipe | Outside theme object | |
| Embedded in tokens | No separate recipe storage | |

**User's choice:** [auto] theme.colorRecipe alongside theme.tokens (recommended)
**Notes:** Natural access via useThemeEditor composable.

---

## Override Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| theme.tokenOverrides separate object | Clean separation: derived vs manual | ✓ |
| Flag on each token | Track per-token derivation source | |
| No tracking | Overwrite derived values in place | |

**User's choice:** [auto] theme.tokenOverrides separate from theme.tokens (recommended)
**Notes:** Enables clean re-derivation: overrides persist when recipe changes.

---

## Live Preview

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse sendThemeToPreview with 150ms debounce | Established pattern | ✓ |
| New dedicated preview channel | Separate from existing | |
| No debounce (immediate) | Maximum responsiveness | |

**User's choice:** [auto] Reuse existing sendThemeToPreview (recommended)
**Notes:** Established pattern, minimal code change.

---

## Harmony UI

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown select | Compact, inline-friendly | ✓ |
| 2×2 algorithm cards | Visual, more space | |
| Radio buttons | Simple, accessible | |

**User's choice:** [auto] Dropdown/select for algorithm (recommended — cleaner for inline panel)
**Notes:** PaletteModal's 2×2 grid is nice for modal but too large for inline panel.

---

## Mode Toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Inside SmartColorPanel | Co-located with recipe inputs | ✓ |
| In ThemeToolbar | Separate from panel | |
| Floating toggle | Always visible | |

**User's choice:** [auto] Inside SmartColorPanel alongside pickers (recommended)
**Notes:** Mode is part of the recipe, should be co-located.

---

## Coexistence with PaletteModal

| Option | Description | Selected |
|--------|-------------|----------|
| Keep PaletteModal for backward compat | Gradual migration | ✓ |
| Remove PaletteModal | Clean break | |
| Merge into SmartColorPanel | Single component | |

**User's choice:** [auto] Keep PaletteModal for backward compat (recommended)
**Notes:** Existing users may have workflows depending on PaletteModal.

---

## Accent Picker Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Show both pickers, pre-fill accent via algorithm | User can override auto | ✓ |
| Hide accent until manual | Only show when user opts in | |
| Always require manual accent | No auto-derivation | |

**User's choice:** [auto] Show both pickers, pre-fill accent via complementary when empty (recommended)
**Notes:** User sees derived accent but can manually override it.

---

## Agent's Discretion

- Internal CSS styling and spacing
- Exact debounce timing
- Token preview strip layout
- Harmony description text display
- SmartColorPanel placement in theme designer

## Deferred Ideas

None
