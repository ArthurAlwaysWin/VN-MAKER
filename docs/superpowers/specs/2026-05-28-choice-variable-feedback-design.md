# Choice Variable Feedback Design

## Context

In the editor's **游戏内容** tab, choice-page option rows already let authors attach variable effects to each option text. The current issue is not capability but confidence: after choosing the target variable, the UI does not provide a strong enough immediate confirmation of which variable was actually bound to that row.

This makes the flow feel fragile, especially when:

1. Multiple variables have similar names.
2. A choice option contains more than one variable effect row.
3. The author switches effect type and the valid variable set changes.

## Goal

Make each variable effect row clearly answer this question without reopening the dropdown:

> “Which variable is this effect currently targeting?”

## Non-Goals

- No changes to the underlying effect data model.
- No new modal, toast, or global notification flow.
- No redesign of ending unlock / CG unlock rows beyond keeping their current behavior intact.
- No changes to runtime evaluation of choice effects.

## Recommended Approach

Use a **two-layer confirmation pattern** for choice-page variable effects:

1. The variable dropdown itself shows each item as `变量名（ID）`.
2. A dedicated inline feedback block appears directly under the variable picker for that same row.

### Alternatives considered

1. **Dropdown-only clarity**
   - Show richer labels in the dropdown and selected value only.
   - Compact, but still easy to second-guess after focus moves away.

2. **Inline feedback only**
   - Keep the current dropdown label style and add a confirmation line below.
   - Better confirmation, but the selection control itself still hides useful identity detail.

3. **Dropdown clarity + inline feedback** — recommended.
   - The selection control is self-descriptive.
   - The row also keeps a persistent, glanceable confirmation state.
   - Best fit for multi-row choice effects where authors need to compare several bindings quickly.

## UX Structure

For each variable effect row inside `PageInspector.vue`:

### 1. Variable picker label format

- Variable options render as a readable identity label derived from variable name plus ID.
- If the best available display name already equals the ID, render the single value only once instead of duplicating it (for example, `affection`, not `affection（affection）`).
- This applies to the currently selected value as well as the expanded list.
- This formatting must be implemented through a choice-effect-specific option source / formatter so the change stays isolated to choice-page variable effect rows and does not alter condition-page selectors.
- The existing type-based filtering remains unchanged:
  - `var:add` / `var:sub` keep using numeric-capable variables when such variables exist.
  - If there are no numeric-capable variables, preserve the current editor behavior and fall back to the full variable list rather than introducing a new empty-only state.
  - `var:set` can use the full variable list.

### 2. Inline feedback block

Directly below the variable selector, render a row-scoped feedback block:

- **When no valid variable is selected:** `请先选择变量`
- **When a valid variable is selected:** `已选择：变量名（ID）`

This block belongs to the current effect row only. If an option has multiple variable effects, each row shows its own feedback independently.

### 3. Visual emphasis

- The empty state should be visually noticeable enough to prompt action, not styled like passive helper text.
- The selected state should read like confirmation, not warning.
- The block should be compact and remain inside the effect row so the surrounding layout does not become modal or noisy.

## Behavior Rules

The feedback block is derived from existing row state and registry data; it does not introduce new persisted fields.

### Row state derivation

For a variable effect row:

1. Read the current `effect.id`.
2. Resolve that ID against `script.data.systems.variables`.
3. Build the display label as `变量名（ID）`, using the same fallback priority already used by the editor for variables:
   - `variable.label`
   - `variable.name`
   - `id`

### Update triggers

The feedback text must update immediately when:

1. The user changes the selected variable.
2. The user changes the effect type and the selected variable is remapped to a valid alternative.
3. A new variable effect row is inserted with a default variable.
4. A row ends up without a valid variable ID.

### Invalid / missing variable handling

If `effect.id` is missing or no longer resolves to a variable entry in loaded data:

- Keep the row editable.
- The select control should not imply that some other valid variable is selected.
- The select includes a placeholder option `选择变量` only as a display fallback for orphaned rows.
- That placeholder is not part of the normal authored choices and should not be used to create a new persisted empty-binding state.
- For orphaned rows, the placeholder is the displayed selected value until the user makes a new explicit choice.
- Show `请先选择变量`.
- Do not silently invent a display label for a missing registry entry.
- Do not auto-remap orphaned IDs on load; only change the bound variable when the user changes type or selection through the existing editor flow.
- This orphaned-row handling only applies to invalid data already present when the page is rendered (for example imported or manually edited project data). It does **not** redefine existing variable-deletion flows elsewhere in the editor.

### Value editor behavior without a valid variable

If the row does not currently resolve to a valid variable:

- Disable the value editor for that row instead of inferring a type from stale data.
- Re-enable the appropriate value editor only after the user selects a valid variable again.
- The effect-type toggle remains usable so the user can recover the row without deleting it.

## Scope Boundaries

This design applies to **choice-page variable effect rows** only.

It does not change:

- condition-page variable selection UX
- story systems variable registry UX
- ending unlock / CG unlock row wording
- ending unlock / CG unlock row layout

Those surfaces can adopt a similar confirmation pattern later if needed, but they are out of scope for this work.

## Likely Files Affected

- `src/editor/components/page-editor/PageInspector.vue`
- a focused test covering choice effect rendering and feedback text

## Validation Criteria

The implementation is successful when:

1. Every choice-page variable dropdown shows variables with the same readable identity label rule used by the feedback block: normally `变量名（ID）`, but collapsing duplicate name/ID cases to a single token.
2. Every variable effect row displays a row-local feedback block.
3. The block shows `请先选择变量` when no valid variable is bound.
4. The block shows `已选择：变量名（ID）` immediately after a valid selection.
5. Changing effect type or variable selection keeps the feedback synchronized with the actual bound variable.
6. Ending unlock and CG unlock rows keep their existing behavior.
7. If a row references a deleted or unresolved variable ID, the picker shows its placeholder state and the feedback block shows `请先选择变量` until the user reselects a valid variable.
8. Rows with no valid variable do not show an active value editor until a valid variable is selected again.
9. Re-selecting a valid variable from an unresolved state restores both the correct picker label and the matching value editor.
