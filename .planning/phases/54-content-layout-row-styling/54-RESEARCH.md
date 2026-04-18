# Phase 54: Content Layout + Row Styling (Engine) - Research

**Researched:** 2026-04-18
**Domain:** CSS Grid layout + inline style decoration for settings screen (pure DOM/JS)
**Confidence:** HIGH

## Summary

Phase 54 adds two-column CSS Grid support and visual row decoration to the engine settings screen's structured mode content area. The primary modification target is `_renderStructuredContent()` in `src/ui/SettingsScreen.js` (line 624), which currently renders setting items in a simple block flow. The content container (`.settings-structured-content`) needs conditional grid layout, and each item needs configurable styling for dividers, zebra backgrounds, and label positioning. Additionally, `_buildSlider()` needs a gate for the value label element.

All changes are constrained to inline styles (project convention — no external CSS classes for structured mode). The data schema nests new properties under `layout.contentArea` (columns) and `layout.contentArea.itemStyle` (all decoration options). With only 9 SETTING_DEFS keys (max ~5 items per column in 2-col mode), no virtualization or complex rendering optimization is needed.

**Primary recommendation:** Modify `_renderStructuredContent()` to read `contentArea.columns` and `contentArea.itemStyle`, apply grid layout to the container conditionally, and apply per-item inline styles during the existing item-creation loop. Gate `valueEl` creation in `_buildSlider()` on a `showValueLabel` parameter.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `contentArea.columns` accepts `1` (default) or `2`. When `2`, content container uses `display: grid; grid-template-columns: 1fr 1fr` instead of block flow
- **D-02:** Odd-item handling: natural CSS Grid flow — last item stays in first column (no spanning)
- **D-03:** Grid gap: `12px 24px` (row gap 12px matches existing padding rhythm, column gap 24px for visual separation)
- **D-04:** When `columns=1` (or omitted), rendering stays identical to current block flow (backward compat)
- **D-05:** `itemStyle.showDividers=true` renders 1px hairline `border-bottom` on each setting item
- **D-06:** In 2-column mode, dividers are full-width row separators between grid rows (border on item bottom), not vertical separators between cells
- **D-07:** Divider color: semi-transparent from panel text token (`rgba(255,255,255,0.15)` default on dark backgrounds)
- **D-08:** Last row items have no bottom divider (`:last-child` / `:nth-last-child` handling)
- **D-09:** `itemStyle.alternateBackground=true` applies background to every other visual ROW, not every other cell
- **D-10:** In 2-column mode, both cells in the same row get the same background color (row-based alternation)
- **D-11:** Zebra color: subtle alpha overlay — `rgba(255,255,255,0.04)` on dark, adaptive to background
- **D-12:** When both `showDividers` and `alternateBackground` are true, both apply (they are independent decorations)
- **D-13:** `itemStyle.labelPosition` accepts `'left'` (default, current behavior) or `'top'`
- **D-14:** When `'top'`: item uses `flex-direction: column` — label stacked above control+value row
- **D-15:** When `'left'` (default): item uses `flex-direction: row` — current layout preserved exactly
- **D-16:** `itemStyle.labelWidth` configurable (default `140px`, matching current hardcoded value). Only applies when `labelPosition='left'`
- **D-17:** `itemStyle.showValueLabel` defaults to `true` (backward compat — sliders always show numeric readout currently)
- **D-18:** When `false`, the `<span class="sc-setting-value">` is not created in `_buildSlider()`. Toggles and selects are unaffected
- **D-19:** Value label position when `labelPosition='top'`: stays inline with control (right of slider, same row as the control)
- **D-20:** All new properties nest under `layout.contentArea.itemStyle` in the JSON structure
- **D-21:** All properties optional. Missing = default (current behavior). Zero breaking changes.

### Agent's Discretion
- CSS implementation details for grid layout and pseudo-element dividers
- How to handle 2-column zebra row indexing (CSS `:nth-child` math)
- Test structure, fixture format, helper utilities
- Whether to extract itemStyle parsing into a helper function

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRUCT-04 | 双列布局 — contentArea.columns=2 时设置项两列排列（CSS Grid），columns=1 为当前单列行为 | Container style switching in `_renderStructuredContent()` — grid vs block based on `columns` value |
| STRUCT-05 | 行样式控制 — contentArea.itemStyle 支持 showDividers（分隔线）、alternateBackground（条纹背景）、labelWidth、labelPosition(left/top)、showValueLabel | Per-item inline style application in the rendering loop + `_buildSlider()` valueEl gating |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS (ES2022+) | — | DOM manipulation, inline styling | Project convention: zero npm deps in engine UI |
| CSS Grid | — | Two-column layout | Native browser feature, supported in Electron/Chromium |
| Vitest | 4.1.4 | Unit testing with jsdom | Already installed, used for all settings screen tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsdom | 29.0.2 | Browser DOM simulation in tests | All DOM-dependent test files |
| node:test | built-in | Pure-logic unit tests | Tests that don't need DOM (e.g., `configurableTabs.test.js`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline styles | CSS classes + stylesheet | Project uses inline styles exclusively for structured mode — no change |
| CSS `:nth-child` for zebra | Programmatic loop-based approach | Loop-based is simpler with inline styles since we already iterate items |

## Architecture Patterns

### Modification Target Map
```
src/ui/SettingsScreen.js
├── _renderStructuredContent()  [PRIMARY] — add grid, dividers, zebra, label position
├── _buildSlider()              [SECONDARY] — gate valueEl on showValueLabel
└── (content container setup)   [line 562-576] — no change needed (grid applied in _renderStructuredContent)
```

### Pattern 1: Grid Container Conditional Styling
**What:** Apply CSS Grid to `.settings-structured-content` only when `columns=2`
**When to use:** Inside `_renderStructuredContent()` before item loop
**Example:**
```javascript
// Read itemStyle config
const areaCfg = layout.contentArea || {};
const columns = areaCfg.columns === 2 ? 2 : 1;
const itemStyle = areaCfg.itemStyle || {};

// Apply grid layout when columns=2
if (columns === 2) {
  container.style.display = 'grid';
  container.style.gridTemplateColumns = '1fr 1fr';
  container.style.gap = '12px 24px';
} else {
  container.style.display = 'block';
}
```

### Pattern 2: Loop-Based Row Decoration
**What:** Apply dividers and zebra backgrounds during item creation loop
**When to use:** Inside the `for (const key of groupKeys)` loop in `_renderStructuredContent()`
**Example:**
```javascript
const showDividers = itemStyle.showDividers === true;
const alternateBackground = itemStyle.alternateBackground === true;
const totalItems = groupKeys.length;

for (let i = 0; i < groupKeys.length; i++) {
  const key = groupKeys[i];
  // ... create item ...

  // Zebra: row-based alternation
  const rowIndex = columns === 2 ? Math.floor(i / 2) : i;
  if (alternateBackground && rowIndex % 2 === 1) {
    item.style.background = 'rgba(255,255,255,0.04)';
  }

  // Dividers: skip last row
  const isLastRow = columns === 2
    ? Math.floor(i / 2) === Math.floor((totalItems - 1) / 2)
    : i === totalItems - 1;
  if (showDividers && !isLastRow) {
    item.style.borderBottom = '1px solid rgba(255,255,255,0.15)';
  }
}
```

### Pattern 3: Label Position Switching
**What:** Toggle flex-direction based on `labelPosition`
**When to use:** During item element setup in the loop
**Example:**
```javascript
const labelPosition = itemStyle.labelPosition === 'top' ? 'top' : 'left';
const labelWidth = clampField('width', itemStyle.labelWidth) || 140;

// Item flex direction
if (labelPosition === 'top') {
  item.style.flexDirection = 'column';
  item.style.alignItems = 'stretch';
} else {
  item.style.flexDirection = 'row';
  item.style.alignItems = 'center';
  label.style.minWidth = labelWidth + 'px';
}
```

### Pattern 4: Conditional Value Label
**What:** Gate `valueEl` creation on `showValueLabel`
**When to use:** In `_buildSlider()` for both widget-mode and legacy-mode paths
**Example:**
```javascript
// Pass showValueLabel into _buildSlider or read from instance state
_buildSlider(wrapper, def, cfg, style, showValueLabel = true) {
  if (this._widgetStyles) {
    const { el, setValue } = createSlider(/* ... */);
    wrapper.appendChild(el);
    if (showValueLabel) {
      const valueEl = document.createElement('span');
      // ... setup valueEl ...
      wrapper.appendChild(valueEl);
    }
    return;
  }
  // Legacy path: same gating
  // ...
}
```

### Anti-Patterns to Avoid
- **Injecting a `<style>` element for grid/zebra**: The structured mode uses exclusively inline styles. Don't break this pattern by adding CSS classes or stylesheet injection for these features.
- **Applying zebra per-cell instead of per-row in 2-col mode**: Both cells in the same grid row must have the same background. Use `Math.floor(index / columns)` for row calculation.
- **Modifying the content container setup (lines 562-576)**: The container position/size setup must remain unchanged. Grid layout is applied in `_renderStructuredContent()` which clears and rebuilds content on each tab switch.
- **Breaking backward compat with default values**: If `columns` is undefined/1 or `itemStyle` is undefined, rendering MUST be identical to current v1.2/Phase 53 behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS Grid layout | Custom positioning math | `display: grid; grid-template-columns: 1fr 1fr` | Native CSS Grid handles alignment, wrapping, gaps natively |
| Row index calculation | Complex modular arithmetic | `Math.floor(itemIndex / columns)` | Simple, correct for both 1-col and 2-col modes |
| Value clamping | Manual min/max checking | `clampField()` from `src/ui/sanitize.js` | Already handles bounds checking with predefined ranges |
| CSS value sanitization | Regex checks | `sanitizeCssValue()` from `src/ui/sanitize.js` | Existing injection prevention utility |

**Key insight:** This phase is pure inline DOM manipulation. No new libraries, no new utilities needed beyond what already exists. The complexity is in correctly handling the interaction between grid layout and row-based decoration (divider/zebra calculations).

## Common Pitfalls

### Pitfall 1: Zebra Row Math in 2-Column Mode
**What goes wrong:** Zebra stripes applied per-cell rather than per-row, creating checkerboard pattern
**Why it happens:** Using `i % 2` directly instead of calculating the visual row index
**How to avoid:** Always compute `rowIndex = Math.floor(i / columns)` and apply background based on `rowIndex % 2`
**Warning signs:** Visual test showing alternating columns instead of alternating rows

### Pitfall 2: Last-Row Divider Detection in 2-Column Mode
**What goes wrong:** Divider appears on the last row, or divider is removed from wrong items
**Why it happens:** In 2-col mode with odd item count, the last row has only 1 item, but the second-to-last row has 2 items — both conditions need checking
**How to avoid:** Compute `lastRowIndex = Math.floor((totalItems - 1) / columns)` and skip divider for all items where `Math.floor(i / columns) === lastRowIndex`
**Warning signs:** Visible hairline at the very bottom of the content area

### Pitfall 3: Grid Gap vs Padding Conflict
**What goes wrong:** Items have both `padding: 12px 0` (existing) AND grid `row-gap: 12px`, causing double spacing
**Why it happens:** Current items use `padding: 12px 0` for vertical spacing. If grid gap is added ON TOP, spacing doubles
**How to avoid:** When `columns=2`, remove item padding (or reduce to 0) and rely solely on grid gap. When `columns=1`, preserve existing padding behavior
**Warning signs:** Content area looks overly spacious compared to v1.2

### Pitfall 4: _buildSlider Signature Change Breaking Callers
**What goes wrong:** Adding `showValueLabel` parameter to `_buildSlider` breaks the 3 call sites
**Why it happens:** `_buildSlider` is called from `_renderSettingElem` (custom mode), `_renderStructuredContent` (structured mode), and potentially other contexts
**How to avoid:** Use a default parameter `showValueLabel = true` to maintain backward compat, or pass via an options object. Only structured mode needs to pass `false`
**Warning signs:** Value labels disappearing in custom layout mode where they should be visible

### Pitfall 5: Container innerHTML Clear Losing Grid Styles
**What goes wrong:** Grid styles not re-applied after tab switch
**Why it happens:** `_renderStructuredContent()` starts with `container.innerHTML = ''` which clears content but NOT container styles. However, if someone clears container.style too, grid is lost
**How to avoid:** Apply container grid styles INSIDE `_renderStructuredContent()` (before the loop), not in the parent `_renderStructured()`. This ensures they're reapplied on every tab switch
**Warning signs:** First tab renders correctly but switching tabs reverts to single column

## Code Examples

### Current `_renderStructuredContent()` (lines 624-667)
```javascript
_renderStructuredContent(layout) {
  const container = this.el.querySelector('.settings-structured-content');
  if (!container) return;
  container.innerHTML = '';

  const groupKeys = this._resolvedTabs?.[this._activeTab]?.settingKeys
    || SETTING_GROUP_KEYS[this._activeTab];
  if (!groupKeys) return;

  const cfg = this.configManager;

  for (const key of groupKeys) {
    const def = SETTING_DEFS[key];
    if (!def) continue;

    const item = document.createElement('div');
    item.className = 'settings-structured-item';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.padding = '12px 0';

    const label = document.createElement('div');
    label.className = 'settings-structured-label';
    label.textContent = def.label;
    label.style.minWidth = '140px';
    label.style.color = '#fff';
    item.appendChild(label);

    const control = document.createElement('div');
    control.className = 'settings-structured-control';
    control.style.flex = '1';

    if (def.type === 'slider') {
      this._buildSlider(control, def, cfg, DEFAULT_SETTING_STYLE);
    } else if (def.type === 'toggle') {
      this._buildToggle(control, def, cfg, DEFAULT_SETTING_STYLE);
    } else if (def.type === 'select') {
      this._buildSelect(control, def, cfg, DEFAULT_SETTING_STYLE);
    }

    item.appendChild(control);
    container.appendChild(item);
  }
}
```

### Modified `_renderStructuredContent()` (target implementation)
```javascript
_renderStructuredContent(layout) {
  const container = this.el.querySelector('.settings-structured-content');
  if (!container) return;
  container.innerHTML = '';

  const groupKeys = this._resolvedTabs?.[this._activeTab]?.settingKeys
    || SETTING_GROUP_KEYS[this._activeTab];
  if (!groupKeys) return;

  // ── Read layout config ────────────────────────────────
  const areaCfg = layout.contentArea || {};
  const columns = areaCfg.columns === 2 ? 2 : 1;
  const itemStyle = areaCfg.itemStyle || {};
  const showDividers = itemStyle.showDividers === true;
  const alternateBackground = itemStyle.alternateBackground === true;
  const labelPosition = itemStyle.labelPosition === 'top' ? 'top' : 'left';
  const labelWidth = clampField('width', itemStyle.labelWidth) || 140;
  const showValueLabel = itemStyle.showValueLabel !== false; // default true

  // ── Container layout ──────────────────────────────────
  if (columns === 2) {
    container.style.display = 'grid';
    container.style.gridTemplateColumns = '1fr 1fr';
    container.style.gap = '12px 24px';
  } else {
    container.style.display = 'block';
    container.style.gridTemplateColumns = '';
    container.style.gap = '';
  }

  const cfg = this.configManager;
  const totalItems = groupKeys.filter(k => SETTING_DEFS[k]).length;
  const lastRowIndex = Math.floor((totalItems - 1) / columns);
  let itemIndex = 0;

  for (const key of groupKeys) {
    const def = SETTING_DEFS[key];
    if (!def) continue;

    const item = document.createElement('div');
    item.className = 'settings-structured-item';
    item.style.display = 'flex';
    item.style.padding = columns === 2 ? '0' : '12px 0';

    // ── Label position ────────────────────────────────
    if (labelPosition === 'top') {
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
    } else {
      item.style.flexDirection = 'row';
      item.style.alignItems = 'center';
    }

    // ── Zebra row background ──────────────────────────
    const rowIndex = Math.floor(itemIndex / columns);
    if (alternateBackground && rowIndex % 2 === 1) {
      item.style.background = 'rgba(255,255,255,0.04)';
    }

    // ── Dividers (skip last row) ──────────────────────
    if (showDividers && rowIndex < lastRowIndex) {
      item.style.borderBottom = '1px solid rgba(255,255,255,0.15)';
    }

    // ── Label ─────────────────────────────────────────
    const label = document.createElement('div');
    label.className = 'settings-structured-label';
    label.textContent = def.label;
    label.style.color = '#fff';
    if (labelPosition === 'left') {
      label.style.minWidth = labelWidth + 'px';
    }
    item.appendChild(label);

    // ── Control ───────────────────────────────────────
    const control = document.createElement('div');
    control.className = 'settings-structured-control';
    control.style.flex = '1';

    if (def.type === 'slider') {
      this._buildSlider(control, def, cfg, DEFAULT_SETTING_STYLE, showValueLabel);
    } else if (def.type === 'toggle') {
      this._buildToggle(control, def, cfg, DEFAULT_SETTING_STYLE);
    } else if (def.type === 'select') {
      this._buildSelect(control, def, cfg, DEFAULT_SETTING_STYLE);
    }

    item.appendChild(control);
    container.appendChild(item);
    itemIndex++;
  }
}
```

### Value Label Gating in `_buildSlider()`
```javascript
// Add showValueLabel parameter (default true for backward compat)
_buildSlider(wrapper, def, cfg, style, showValueLabel = true) {
  if (this._widgetStyles) {
    const sliderConfig = this._widgetStyles.slider;
    let valueEl = null;
    if (showValueLabel) {
      valueEl = document.createElement('span');
      valueEl.classList.add('sc-setting-value');
      this._applyTextStyle(valueEl, style.labelColor, style.fontSize, style.fontFamily);
      valueEl.textContent = this._formatValue(def, cfg.get(def.settingKey));
    }
    const { el } = createSlider(
      sliderConfig,
      cfg.get(def.settingKey),
      def.min, def.max, def.step,
      (v) => {
        cfg.set(def.settingKey, v);
        if (valueEl) valueEl.textContent = this._formatValue(def, v);
        this._notifyChange();
      }
    );
    wrapper.appendChild(el);
    if (valueEl) wrapper.appendChild(valueEl);
    return;
  }
  // Legacy slider path — same gating pattern
  const control = document.createElement('input');
  // ... existing code ...
  wrapper.appendChild(control);
  if (showValueLabel) {
    const valueEl = document.createElement('span');
    valueEl.classList.add('sc-setting-value');
    // ... existing setup ...
    wrapper.appendChild(valueEl);
  }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom |
| Config file | `vite.config.js` (vitest uses vite config implicitly) |
| Quick run command | `npx vitest run tests/settingsStructured.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRUCT-04 | columns=2 applies CSS Grid to container | unit | `npx vitest run tests/contentLayout.test.js -t "columns"` | ❌ Wave 0 |
| STRUCT-04 | columns=1/omitted preserves block flow | unit | `npx vitest run tests/contentLayout.test.js -t "block flow"` | ❌ Wave 0 |
| STRUCT-05 | showDividers renders border-bottom | unit | `npx vitest run tests/contentLayout.test.js -t "dividers"` | ❌ Wave 0 |
| STRUCT-05 | alternateBackground applies zebra rows | unit | `npx vitest run tests/contentLayout.test.js -t "zebra"` | ❌ Wave 0 |
| STRUCT-05 | labelPosition='top' stacks label above control | unit | `npx vitest run tests/contentLayout.test.js -t "label.*top"` | ❌ Wave 0 |
| STRUCT-05 | showValueLabel=false hides numeric readout | unit | `npx vitest run tests/contentLayout.test.js -t "value label"` | ❌ Wave 0 |
| STRUCT-05 | labelWidth configurable | unit | `npx vitest run tests/contentLayout.test.js -t "labelWidth"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/contentLayout.test.js`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/contentLayout.test.js` — covers STRUCT-04 + STRUCT-05 (grid layout, dividers, zebra, label position, value label)
- [ ] Test fixtures: `structuredLayoutWithColumns()`, `structuredLayoutWithItemStyle()` helpers

*(Test infrastructure (vitest + jsdom + mocking pattern) already exists from `tests/settingsStructured.test.js`)*

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Block flow + padding | Block flow + padding (current) | v1.2/Phase 53 | Phase 54 adds grid option |
| Hardcoded labelWidth 140px | Hardcoded 140px (current) | v1.2 | Phase 54 makes configurable |
| valueEl always created | valueEl always created (current) | v1.2 | Phase 54 gates on showValueLabel |

## Open Questions

1. **clampField bounds for labelWidth**
   - What we know: `clampField('width', value)` uses bounds `[1, 2560]` which is reasonable
   - What's unclear: Should labelWidth have tighter bounds (e.g., 60-400px)?
   - Recommendation: Use `clampField('width', ...)` as-is; content area is 1200px wide so reasonable values are 80-300px. The planner can add a comment noting the effective range.

2. **Divider color token from existing style context (D-07)**
   - What we know: Decision says "should read from existing token/style context if available" but defaults to `rgba(255,255,255,0.15)`
   - What's unclear: No existing "divider color" token exists in `DEFAULT_SETTING_STYLE` or `widgetStyles`
   - Recommendation: Use the hardcoded default `rgba(255,255,255,0.15)` for now. Phase 57 (editor) can expose this as configurable if needed later.

## Sources

### Primary (HIGH confidence)
- `src/ui/SettingsScreen.js` — Direct code inspection of `_renderStructuredContent()` lines 624-667, `_buildSlider()` lines 206-260, content container setup lines 562-576
- `src/engine/settingDefs.js` — Full SETTING_DEFS registry (9 keys), DEFAULT_SETTING_STYLE
- `src/ui/sanitize.js` — `clampField()` bounds verification, `sanitizeCssValue()` API
- `tests/settingsStructured.test.js` — Existing test patterns, mock structure, helpers
- `tests/configurableTabs.test.js` — Pure-logic test pattern for `node:test`
- `.planning/phases/54-content-layout-row-styling/54-CONTEXT.md` — All 21 locked decisions

### Secondary (MEDIUM confidence)
- CSS Grid spec — `grid-template-columns: 1fr 1fr`, `gap` property behavior (well-established, no version concerns in Electron/Chromium)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Pure DOM/JS, no libraries needed, all tools already in project
- Architecture: HIGH - Direct code inspection confirms modification approach
- Pitfalls: HIGH - Based on actual code structure analysis (padding/gap conflict, row math)

**Research date:** 2026-04-18
**Valid until:** 2026-06-18 (stable — no external dependencies that could change)
