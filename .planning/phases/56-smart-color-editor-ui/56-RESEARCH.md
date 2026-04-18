# Phase 56: Smart Color Editor UI - Research

**Researched:** 2026-04-18
**Domain:** Vue 3 component design, OKLCH color derivation integration, theme editor UX
**Confidence:** HIGH

## Summary

This phase builds a `SmartColorPanel.vue` component that replaces the current 41-individual-token editing workflow with a 2-picker + mode toggle + harmony selector interface. The foundation is solid: Phase 52's `oklch.js` module is fully implemented with `deriveTokens(primaryHex, accentHex, mode)` already producing all 35 color tokens. The `useThemeEditor.js` composable provides `setTokenBatch()`, `commitTheme()`, and debounced iframe preview — all ready to integrate.

The main engineering challenges are: (1) adding the three-layer recipe/tokens/overrides persistence model to the theme data structure, (2) implementing the OKLCH-based accent auto-derivation from harmony algorithms, and (3) wiring reactive UI that updates preview in real-time while supporting undo. The existing `PaletteModal.vue` and `ColorTokenRow.vue` provide well-established patterns for color picker interaction, algorithm selection UI, and the input/change event split pattern for preview vs. commit.

**Primary recommendation:** Build SmartColorPanel as an inline panel (not modal) using existing composable patterns, add `colorRecipe` + `tokenOverrides` to the theme object, and add `setColorRecipe()`/`getColorRecipe()` helpers to `useThemeEditor.js`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Create new `src/editor/components/theme/SmartColorPanel.vue` as a standalone section within the theme designer (NOT a modal)
- **D-02:** Keep existing `PaletteModal.vue` for backward compat — SmartColorPanel is the primary recommended interface
- **D-03:** SmartColorPanel imports `deriveTokens` from `src/engine/oklch.js` and uses `useThemeEditor()` composable for token operations
- **D-04:** Panel renders inline in the theme editor layout (above or instead of the manual token sections when active)
- **D-05:** Store `colorRecipe` inside `theme` object in script.json: `theme.colorRecipe = { primary, accent, mode, algorithm }`
- **D-06:** `theme.tokens` contains the full derived token set (35 color tokens) — always stored alongside recipe
- **D-07:** `theme.tokenOverrides` is a separate object storing user's manual per-token edits
- **D-08:** At apply time: final tokens = `{ ...deriveTokens(recipe), ...tokenOverrides }` — overrides always win
- **D-09:** When recipe changes, re-derive all non-overridden tokens. Overrides persist.
- **D-10:** Add `setColorRecipe(recipe)` and `getColorRecipe()` helpers to `useThemeEditor.js`
- **D-11:** Two color pickers: primary (left) + accent (right), both using native `<input type="color">`
- **D-12:** Dark/light mode toggle: toggle switch or segmented control below the pickers
- **D-13:** Harmony algorithm: dropdown `<select>` with 4 options (complementary/analogous/triadic/split-complementary)
- **D-14:** When algorithm is selected and accent is not manually overridden: auto-derive accent from primary via the selected algorithm's hue shift
- **D-15:** Accent picker shows auto-derived value but user can manually override — a "reset to auto" button clears the manual accent
- **D-16:** Full 35-token preview strip below the controls
- **D-17:** Reuse existing `sendThemeToPreview()` from `useThemeEditor.js` with 150ms debounce (established pattern)
- **D-18:** On picker input event: derive tokens immediately, update preview. On change event: commit to store + push undo
- **D-19:** `commitTheme()` saves both recipe + derived tokens + overrides to script.json
- **D-20:** In the manual token editing section, overridden tokens show a badge/indicator
- **D-21:** Each overridden token has a "reset to derived" button that removes it from tokenOverrides
- **D-22:** "Clear all overrides" button resets tokenOverrides to empty, re-derives everything from recipe

### Agent's Discretion
- Internal component styling (CSS classes, spacing, colors)
- Exact debounce timing (150ms is guidance, agent can adjust)
- Token preview strip layout (horizontal vs grid)
- Whether harmony algorithm shows description text alongside names
- Exact placement of SmartColorPanel in the theme designer layout

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COLOR-04 | 智能配色编辑器 UI — 2 color pickers + mode toggle + harmony selector, replacing 41 individual token controls | SmartColorPanel.vue component with established `<input type="color">` pattern from PaletteModal/ColorTokenRow, ALGORITHMS array from PaletteModal reusable |
| COLOR-05 | 配色方案存储 — script.json stores colorRecipe + full tokens + per-token overrides | Theme object at `data.ui.theme` already supports arbitrary keys. Add `colorRecipe` + `tokenOverrides` alongside existing `tokens`. `updateTheme()` pushes undo. |
| COLOR-06 | 配色实时预览 — editing primary/accent updates iframe in real-time | `sendThemeToPreview()` with 200ms debounce already posts `update-theme` message to iframe. Split input/change pattern from ColorTokenRow proven. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | Component framework | Project standard, all editor components use `<script setup>` |
| Pinia | ^3.0.4 | Store (useScriptStore) | Project standard for editor state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| oklch.js (internal) | — | `deriveTokens()`, `hexToOklch()`, `oklchToRgb()` | Color derivation from recipe |
| tokens.js (internal) | — | `DEFAULT_TOKENS` canonical fallbacks | Merged token display |

### No New Dependencies
This phase uses only existing project code. Zero npm packages needed.

## Architecture Patterns

### Recommended Component Structure
```
src/editor/
├── components/theme/
│   ├── SmartColorPanel.vue        # NEW: main 2-picker panel
│   ├── ColorTokenRow.vue          # MODIFIED: add override indicator
│   ├── TokenAccordion.vue         # MODIFIED: override badge logic
│   └── ...existing...
├── composables/
│   └── useThemeEditor.js          # MODIFIED: add recipe helpers
└── views/
    └── ThemeDesigner.vue           # MODIFIED: integrate SmartColorPanel
```

### Pattern 1: Input/Change Split for Preview vs. Commit
**What:** Use `@input` for live preview (debounced), `@change` for undo-safe commit
**When to use:** Any color picker that needs real-time preview without polluting undo stack
**Example:**
```javascript
// Source: src/editor/components/theme/ColorTokenRow.vue (lines 92-104)
function onColorInput(e) {
  const hex = e.target.value;
  // Derive tokens → push to preview (no undo)
  editor.setTokenBatch(deriveTokens(hex, accent, mode));
}

function onColorChange() {
  // Only on release: push to undo stack
  editor.commitTheme();
}
```

### Pattern 2: Provide/Inject Composable
**What:** `createThemeEditor()` called once at ThemeDesigner level, children use `useThemeEditor()` inject
**When to use:** All theme components accessing shared editor state
**Example:**
```javascript
// Source: src/editor/composables/useThemeEditor.js (lines 19, 187-190)
// In ThemeDesigner.vue:
const editor = createThemeEditor();

// In SmartColorPanel.vue:
const editor = useThemeEditor(); // inject
```

### Pattern 3: Deep Clone Before updateTheme (Undo Safety)
**What:** Always `JSON.parse(JSON.stringify(theme))` before calling `updateTheme()` / `pushState()`
**When to use:** Any write that should be undo-able
**Example:**
```javascript
// Source: src/editor/composables/useThemeEditor.js (line 56)
function commitTheme() {
  const theme = script.getTheme();
  const clone = JSON.parse(JSON.stringify(theme));
  script.updateTheme(clone);
  flushPreview();
}
```

### Pattern 4: Three-Layer Token Merge
**What:** `finalTokens = { ...deriveTokens(recipe), ...tokenOverrides }`
**When to use:** Every time tokens are applied to preview or committed
**Rationale:** Overrides always win over derived values, but derived values are the baseline

### Anti-Patterns to Avoid
- **Don't store derived tokens only:** Must store both recipe AND tokens — engine needs pre-computed tokens at runtime (no OKLCH lib in engine runtime)
- **Don't mutate store directly without clone:** Breaks undo/redo snapshot isolation
- **Don't derive on every render:** Cache derived result, only re-derive when recipe inputs change
- **Don't use `colorHarmony.js` in SmartColorPanel:** That's the old HSL system. SmartColorPanel uses `oklch.js` exclusively

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color derivation | Custom token math | `deriveTokens()` from oklch.js | Already handles 35 tokens, gamut clamping, gradients |
| Debounced preview | Custom setTimeout | `sendThemeToPreview()` from useThemeEditor | Handles iframe ref check, engine ready check, message serialization |
| Undo integration | Custom history | `script.updateTheme(clone)` + `pushState()` | Integrates with Ctrl+Z, 50-entry limit |
| Harmony hue shift | Custom math | OKLCH hue rotation (add degrees mod 360) | Already proven in oklch.js line 294 for auto-accent |

**Key insight:** The hard problems (OKLCH math, gamut clamping, gradient generation, undo/redo) are already solved. This phase is UI composition using existing primitives.

## Common Pitfalls

### Pitfall 1: Accent Auto-Derivation vs. Manual Override Confusion
**What goes wrong:** User manually picks accent, then changes algorithm — which wins?
**Why it happens:** Two sources of truth for accent (user pick vs. algorithm derivation)
**How to avoid:** Track `isAccentManual` boolean in the recipe. When true, algorithm changes don't override accent. When user clicks "reset to auto", set `isAccentManual = false` and re-derive.
**Warning signs:** Accent color jumping unexpectedly when changing algorithm dropdown

### Pitfall 2: Preview Flicker on Rapid Picker Dragging
**What goes wrong:** Calling `deriveTokens()` on every pixel of color picker drag causes frame drops
**Why it happens:** `deriveTokens()` does 35× gamut clamping binary searches
**How to avoid:** Use the 150-200ms debounce on `sendThemeToPreview()`. The input event fires rapidly but the debounce coalesces. Only the final value within the debounce window triggers derivation + postMessage.
**Warning signs:** Visible lag between picker movement and iframe update

### Pitfall 3: Token Overrides Out-of-Sync After Recipe Change
**What goes wrong:** User overrides `btn-bg`, then changes primary color. The override persists (correct), but preview still shows old override mixed with new derived tokens.
**Why it happens:** Forgot to merge overrides after re-derivation
**How to avoid:** Always compute final tokens as `{ ...deriveTokens(recipe), ...tokenOverrides }` before sending to preview
**Warning signs:** Some tokens update, others remain stale

### Pitfall 4: commitTheme() Saves Incomplete State
**What goes wrong:** Recipe is committed without derived tokens, or tokens without recipe
**Why it happens:** Saving only one field of the multi-field theme object
**How to avoid:** `commitTheme()` must save the entire theme object atomically: `{ colorRecipe, tokens: mergedTokens, tokenOverrides, nineSlice }`
**Warning signs:** Reloading project loses recipe or manual overrides

### Pitfall 5: Native Color Picker Returns Lowercase vs. Stored Case
**What goes wrong:** Color comparison fails because `#FF6600` !== `#ff6600`
**Why it happens:** `<input type="color">` returns lowercase hex
**How to avoid:** Always normalize hex to lowercase before comparison or storage
**Warning signs:** "accent is manual" detection fails, causing infinite re-derivation

### Pitfall 6: getTheme() Returns Reactive Proxy — Mutating Without Clone
**What goes wrong:** Direct mutation of `script.getTheme().tokens` doesn't trigger undo
**Why it happens:** `getTheme()` returns the live Pinia state reference. Writing to it mutates state directly.
**How to avoid:** For preview-only updates (during drag), use `setTokenBatch()` which mutates directly + sends preview. For undoable commits, use `commitTheme()` which clones first.
**Warning signs:** Ctrl+Z doesn't revert color changes

## Code Examples

### Example 1: SmartColorPanel Core Logic
```javascript
// src/editor/components/theme/SmartColorPanel.vue <script setup>
import { ref, computed, watch } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import { deriveTokens, hexToOklch, oklchToRgb } from '../../../engine/oklch.js';

const editor = useThemeEditor();

const primaryColor = ref('#7733aa');
const accentColor = ref('#33aa77');
const isAccentManual = ref(false);
const mode = ref('dark');
const algorithm = ref('complementary');

// Harmony hue shifts (same degrees work in OKLCH)
const HARMONY_OFFSETS = {
  'complementary': 180,
  'analogous': 30,
  'triadic': 120,
  'split-complementary': 150,
};

const autoAccent = computed(() => {
  const oklch = hexToOklch(primaryColor.value);
  const offset = HARMONY_OFFSETS[algorithm.value] || 180;
  const newH = (oklch.h + offset) % 360;
  const [r, g, b] = oklchToRgb(oklch.l, oklch.c, newH);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
});

const effectiveAccent = computed(() => {
  return isAccentManual.value ? accentColor.value : autoAccent.value;
});

function onPrimaryInput(e) {
  primaryColor.value = e.target.value;
  applyRecipeToPreview();
}

function applyRecipeToPreview() {
  const overrides = editor.getTokenOverrides?.() ?? {};
  const derived = deriveTokens(primaryColor.value, effectiveAccent.value, mode.value);
  editor.setTokenBatch({ ...derived, ...overrides });
}

function onPrimaryChange() {
  editor.commitTheme();
}
```

### Example 2: Recipe Persistence Helpers (useThemeEditor.js additions)
```javascript
// Added to src/editor/composables/useThemeEditor.js

function getColorRecipe() {
  const theme = script.getTheme();
  return theme?.colorRecipe ?? null;
}

function setColorRecipe(recipe) {
  const theme = script.getTheme();
  if (!theme) return;
  theme.colorRecipe = { ...recipe };
}

function getTokenOverrides() {
  const theme = script.getTheme();
  return theme?.tokenOverrides ?? {};
}

function setTokenOverride(key, value) {
  const theme = script.getTheme();
  if (!theme) return;
  theme.tokenOverrides ??= {};
  theme.tokenOverrides[key] = value;
  sendThemeToPreview();
}

function removeTokenOverride(key) {
  const theme = script.getTheme();
  if (!theme) return;
  if (theme.tokenOverrides) {
    delete theme.tokenOverrides[key];
  }
  sendThemeToPreview();
}

function clearAllOverrides() {
  const theme = script.getTheme();
  if (!theme) return;
  theme.tokenOverrides = {};
  sendThemeToPreview();
}
```

### Example 3: Override Indicator in ColorTokenRow
```vue
<!-- Added to ColorTokenRow.vue template -->
<span v-if="isOverridden" class="override-badge" title="手动覆盖">⚡</span>
<button v-if="isOverridden" class="reset-override-btn" @click="resetOverride" title="恢复为派生值">↩</button>
```
```javascript
// In ColorTokenRow.vue <script setup>
const isOverridden = computed(() => {
  const overrides = editor.getTokenOverrides?.() ?? {};
  return props.tokenKey in overrides;
});

function resetOverride() {
  editor.removeTokenOverride(props.tokenKey);
  editor.commitTheme();
}
```

### Example 4: Theme Object Shape in script.json
```json
{
  "ui": {
    "theme": {
      "colorRecipe": {
        "primary": "#7733aa",
        "accent": "#33aa77",
        "mode": "dark",
        "algorithm": "complementary"
      },
      "tokens": {
        "primary": "rgba(119, 51, 170, 0.90)",
        "primary-subtle": "rgba(119, 51, 170, 0.08)",
        "...": "...35 total derived tokens..."
      },
      "tokenOverrides": {
        "btn-bg": "rgba(60, 80, 120, 0.60)"
      },
      "nineSlice": {}
    }
  }
}
```

### Example 5: Harmony Algorithm Dropdown (ALGORITHMS array)
```javascript
// Reuse pattern from PaletteModal.vue
const ALGORITHMS = [
  { id: 'complementary', label: '互补色', desc: '对比强烈' },
  { id: 'analogous', label: '类似色', desc: '柔和统一' },
  { id: 'triadic', label: '三角色', desc: '丰富平衡' },
  { id: 'split-complementary', label: '分裂互补', desc: '活泼协调' },
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HSL `generatePalette()` | OKLCH `deriveTokens()` | Phase 52 (just completed) | Perceptually uniform color derivation |
| 41 individual token controls | 2 pickers + recipe | This phase (56) | Massive UX simplification |
| No recipe persistence | `colorRecipe` in script.json | This phase (56) | Users can tweak recipe and re-derive |
| Single token layer | tokens + tokenOverrides merge | This phase (56) | Manual tweaks survive re-derivation |

**Deprecated/outdated:**
- `colorHarmony.js` / `generatePalette()`: Still used by PaletteModal (backward compat), but SmartColorPanel does NOT use it. New code uses `oklch.js` exclusively.

## Open Questions

1. **ThemeDesigner layout integration**
   - What we know: SmartColorPanel goes inline (D-04 says "above or instead of manual token sections when active")
   - What's unclear: Should it always be visible above TokenAccordion, or toggled via a tab/button?
   - Recommendation: Always visible above the TokenAccordion scrollable area. Simple and discoverable. The toolbar already has enough buttons.

2. **Accent hue algorithm for `analogous`**
   - What we know: Analogous gives 3 hues (h-30, h, h+30). Complementary gives (h, h+180).
   - What's unclear: For the "accent" derivation from analogous, should it use h+30 or h-30?
   - Recommendation: Use h+30 (clockwise neighbor). It's the most common direction.

3. **Initial state when no recipe exists**
   - What we know: Existing projects have `theme.tokens` but no `colorRecipe`
   - What's unclear: Should SmartColorPanel attempt to reverse-engineer a recipe from existing tokens, or start blank?
   - Recommendation: Start with defaults (`#7733aa` primary, complementary, dark) and show "not yet derived" state. User clicks a button to apply recipe — doesn't auto-overwrite existing manual tokens.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework in project |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COLOR-04 | SmartColorPanel renders 2 pickers + mode toggle + algorithm select | manual-only | Visual inspection in dev server | ❌ Wave 0 |
| COLOR-05 | Recipe + tokens + overrides persist in script.json correctly | unit (if framework added) | N/A | ❌ Wave 0 |
| COLOR-06 | Changing picker triggers iframe update via postMessage | manual-only | Visual inspection in dev server | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Visual inspection via `npm run dev` (start Electron app, navigate to ThemeDesigner)
- **Per wave merge:** Full manual walkthrough of all 5 success criteria
- **Phase gate:** All 5 success criteria verified visually

### Wave 0 Gaps
- No test framework exists in the project — all validation is manual/visual
- Recommend: After implementation, manually verify each success criterion in the running app

## Sources

### Primary (HIGH confidence)
- `src/engine/oklch.js` — Full implementation reviewed, `deriveTokens()` API confirmed (lines 286-323)
- `src/editor/composables/useThemeEditor.js` — All existing helpers confirmed: `setTokenBatch`, `commitTheme`, `sendThemeToPreview`, `flushPreview`
- `src/editor/components/theme/PaletteModal.vue` — UI patterns for color picker + algorithm grid confirmed
- `src/editor/components/theme/ColorTokenRow.vue` — Input/change split pattern confirmed
- `src/editor/views/ThemeDesigner.vue` — Layout structure confirmed (360px left panel + iframe right)
- `src/editor/stores/script.js` — `getTheme()`, `updateTheme()`, undo stack pattern confirmed

### Secondary (MEDIUM confidence)
- `.planning/phases/52-smart-color-foundation/52-CONTEXT.md` — Phase 52 design decisions for oklch module

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code exists and was directly reviewed
- Architecture: HIGH — patterns directly extracted from existing components
- Pitfalls: HIGH — derived from understanding actual reactive data flow in the codebase

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stable — internal project, no external dependency changes)
