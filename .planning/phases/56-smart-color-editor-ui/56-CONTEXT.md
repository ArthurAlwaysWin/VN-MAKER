# Phase 56: Smart Color Editor UI - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto (all decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

Users edit theme colors through two color pickers (primary + accent) + dark/light mode toggle + harmony algorithm selector, instead of 41 individual token controls. The SmartColorPanel component uses `deriveTokens()` from Phase 52's `oklch.js` to generate all 35 color tokens. Color recipe persists in script.json. Individual token overrides survive re-derivation.

</domain>

<decisions>
## Implementation Decisions

### Component Architecture
- **D-01:** Create new `src/editor/components/theme/SmartColorPanel.vue` as a standalone section within the theme designer (NOT a modal)
- **D-02:** Keep existing `PaletteModal.vue` for backward compat — SmartColorPanel is the primary recommended interface
- **D-03:** SmartColorPanel imports `deriveTokens` from `src/engine/oklch.js` and uses `useThemeEditor()` composable for token operations
- **D-04:** Panel renders inline in the theme editor layout (above or instead of the manual token sections when active)

### Recipe Persistence (COLOR-05)
- **D-05:** Store `colorRecipe` inside `theme` object in script.json: `theme.colorRecipe = { primary, accent, mode, algorithm }`
- **D-06:** `theme.tokens` contains the full derived token set (35 color tokens) — always stored alongside recipe
- **D-07:** `theme.tokenOverrides` is a separate object storing user's manual per-token edits (e.g., `{ 'primary': '#custom' }`)
- **D-08:** At apply time: final tokens = `{ ...deriveTokens(recipe), ...tokenOverrides }` — overrides always win
- **D-09:** When recipe changes (user picks new primary/accent/mode/algorithm), re-derive all non-overridden tokens. Overrides persist.
- **D-10:** Add `setColorRecipe(recipe)` and `getColorRecipe()` helpers to `useThemeEditor.js`

### SmartColorPanel UI Layout (COLOR-04)
- **D-11:** Two color pickers: primary (left) + accent (right), both using native `<input type="color">`
- **D-12:** Dark/light mode toggle: toggle switch or segmented control below the pickers
- **D-13:** Harmony algorithm: dropdown `<select>` with 4 options (complementary/analogous/triadic/split-complementary)
- **D-14:** When algorithm is selected and accent is not manually overridden: auto-derive accent from primary via the selected algorithm's hue shift
- **D-15:** Accent picker shows auto-derived value but user can manually override — a "reset to auto" button clears the manual accent
- **D-16:** Full 35-token preview strip below the controls (compact colored swatches, similar to PaletteModal's preview)

### Live Preview (COLOR-06)
- **D-17:** Reuse existing `sendThemeToPreview()` from `useThemeEditor.js` with 150ms debounce (established pattern)
- **D-18:** On picker input event: derive tokens immediately, update preview. On change event: commit to store + push undo
- **D-19:** `commitTheme()` saves both recipe + derived tokens + overrides to script.json

### Token Override UI
- **D-20:** In the manual token editing section (TokenAccordion/ColorTokenRow), overridden tokens show a badge/indicator
- **D-21:** Each overridden token has a "reset to derived" button that removes it from tokenOverrides
- **D-22:** "Clear all overrides" button resets tokenOverrides to empty, re-derives everything from recipe

### Agent's Discretion
- Internal component styling (CSS classes, spacing, colors)
- Exact debounce timing (150ms is guidance, agent can adjust)
- Token preview strip layout (horizontal vs grid)
- Whether harmony algorithm shows description text alongside names
- Exact placement of SmartColorPanel in the theme designer layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine Foundation (Phase 52)
- `src/engine/oklch.js` — OKLCH conversion + `deriveTokens(primaryHex, accentHex, mode)` function (the core dependency)
- `src/engine/colorHarmony.js` — Legacy HSL-based harmony algorithms, `generatePalette()`. NOT replaced, but SmartColorPanel uses oklch instead
- `src/engine/tokens.js` — `DEFAULT_TOKENS` with all 41 token keys. Derived output must match these keys

### Editor Composables
- `src/editor/composables/useThemeEditor.js` — `setTokenBatch()`, `sendThemeToPreview()`, `commitTheme()`, provide/inject pattern. New recipe methods will be added here

### Existing Color UI (reference patterns)
- `src/editor/components/theme/PaletteModal.vue` — Existing 1-picker + algorithm grid modal. Reference for UI patterns but NOT modified
- `src/editor/components/theme/ColorTokenRow.vue` — Per-token color editing row. Override indicator will be added
- `src/editor/components/theme/TokenAccordion.vue` — Token grouping. Context for where override badges appear

### Prior Phase Context
- `.planning/phases/52-smart-color-foundation/52-CONTEXT.md` — Decisions D-01 through D-13 for oklch.js module design

### Requirements
- `.planning/REQUIREMENTS.md` §智能配色系统 — COLOR-04 (editor UI), COLOR-05 (recipe storage), COLOR-06 (live preview)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useThemeEditor.js`: `setTokenBatch(partial)` — takes object, merges into `theme.tokens`, calls `sendThemeToPreview()`. Ready to use with `deriveTokens()` output
- `PaletteModal.vue`: Algorithm card pattern (ALGORITHMS array with id/label/desc) — can reuse for dropdown options
- `sendThemeToPreview()` / `flushPreview()`: established iframe postMessage pattern with debounce
- Native `<input type="color">` pattern already used in PaletteModal and ColorTokenRow

### Established Patterns
- Vue 3 Composition API with `<script setup>` in all editor components
- Provide/inject for `useThemeEditor()` — all theme components access shared editor state
- `script.updateTheme(clone)` for undo-compatible writes (deep clone before write)
- `theme.tokens` is a flat `Record<string, string>` object

### Integration Points
- SmartColorPanel will use `useThemeEditor()` to get editor instance
- `deriveTokens()` imported directly from `src/engine/oklch.js`
- `script.getTheme()` returns the theme object where `colorRecipe` will be stored
- Iframe preview updated via `sendThemeToPreview()` which posts `update-theme` message

</code_context>

<specifics>
## Specific Ideas

- Phase goal explicitly says "instead of 41 individual token controls" — SmartColorPanel should be the clear default workflow, with manual token editing available as an advanced/override option
- PaletteModal used `generatePalette()` from `colorHarmony.js` (HSL-based). SmartColorPanel uses `deriveTokens()` from `oklch.js` (OKLCH-based). They are separate systems
- Success criteria #5 requires overrides to survive re-derivation — this is why `tokenOverrides` must be separate from `tokens`
- Success criteria #3 requires harmony algorithm selection to auto-derive accent — the accent picker should update reactively when algorithm changes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 56-smart-color-editor-ui*
*Context gathered: 2026-04-18*
