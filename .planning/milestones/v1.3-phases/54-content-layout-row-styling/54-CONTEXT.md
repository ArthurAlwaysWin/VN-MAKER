# Phase 54: Content Layout + Row Styling (Engine) - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto (all decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

Engine settings content area supports two-column CSS Grid layout and visual row decoration (dividers, zebra stripes, label positioning, value label toggle). All changes are engine-side only — no editor UI in this phase. When all new `contentArea.itemStyle` properties are omitted, rendering is identical to v1.2/Phase 53 output.

</domain>

<decisions>
## Implementation Decisions

### Column Grid Layout
- **D-01:** `contentArea.columns` accepts `1` (default) or `2`. When `2`, content container uses `display: grid; grid-template-columns: 1fr 1fr` instead of block flow
- **D-02:** Odd-item handling: natural CSS Grid flow — last item stays in first column (no spanning)
- **D-03:** Grid gap: `12px 24px` (row gap 12px matches existing padding rhythm, column gap 24px for visual separation)
- **D-04:** When `columns=1` (or omitted), rendering stays identical to current block flow (backward compat)

### Divider Styling
- **D-05:** `itemStyle.showDividers=true` renders 1px hairline `border-bottom` on each setting item
- **D-06:** In 2-column mode, dividers are full-width row separators between grid rows (CSS `column-span` on pseudo-elements, or border on item bottom), not vertical separators between cells
- **D-07:** Divider color: semi-transparent from panel text token (`rgba(255,255,255,0.15)` default on dark backgrounds), NOT a hardcoded color — should read from existing token/style context if available
- **D-08:** Last row items have no bottom divider (`:last-child` / `:nth-last-child` handling)

### Zebra / Alternating Background
- **D-09:** `itemStyle.alternateBackground=true` applies background to every other visual ROW, not every other cell
- **D-10:** In 2-column mode, both cells in the same row get the same background color (row-based alternation)
- **D-11:** Zebra color: subtle alpha overlay — `rgba(255,255,255,0.04)` on dark, adaptive to background. Simple enough for pure CSS `:nth-child` targeting
- **D-12:** When both `showDividers` and `alternateBackground` are true, both apply (they are independent decorations)

### Label Positioning
- **D-13:** `itemStyle.labelPosition` accepts `'left'` (default, current behavior) or `'top'`
- **D-14:** When `'top'`: item uses `flex-direction: column` — label stacked above control+value row
- **D-15:** When `'left'` (default): item uses `flex-direction: row` — current layout preserved exactly
- **D-16:** `itemStyle.labelWidth` configurable (default `140px`, matching current hardcoded value). Only applies when `labelPosition='left'`

### Value Label Control
- **D-17:** `itemStyle.showValueLabel` defaults to `true` (backward compat — sliders always show numeric readout currently)
- **D-18:** When `false`, the `<span class="sc-setting-value">` is not created in `_buildSlider()`. Toggles and selects are unaffected (they don't have value labels)
- **D-19:** Value label position when `labelPosition='top'`: stays inline with control (right of slider, same row as the control)

### Data Schema Location
- **D-20:** All new properties nest under `layout.contentArea.itemStyle` in the JSON structure:
  ```json
  {
    "contentArea": {
      "x": 40, "y": 160, "width": 1200, "height": 500,
      "columns": 2,
      "itemStyle": {
        "showDividers": true,
        "alternateBackground": true,
        "labelPosition": "top",
        "labelWidth": 140,
        "showValueLabel": false
      }
    }
  }
  ```
- **D-21:** All properties optional. Missing = default (current behavior). Zero breaking changes.

### Agent's Discretion
- CSS implementation details for grid layout and pseudo-element dividers
- How to handle 2-column zebra row indexing (CSS `:nth-child` math)
- Test structure, fixture format, helper utilities
- Whether to extract itemStyle parsing into a helper function

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine Code (primary targets)
- `src/ui/SettingsScreen.js` — Main target. `_renderStructuredContent()` (line 624) renders setting items. `_buildSlider()` (line 206) creates value labels. Content area setup at line 562-576.
- `src/engine/settingDefs.js` — `SETTING_DEFS` registry with 9 setting keys, `DEFAULT_SETTING_STYLE`, `createEmptySettingsScreen()`
- `src/ui/sanitize.js` — `sanitizeCssValue()`, `clampField()` for input validation

### Engine Utilities
- `src/engine/assetPath.js` — `resolvePath()` for any asset references
- `src/ui/widgets/SliderWidget.js` — `createSlider()` creates widget-mode sliders
- `src/ui/widgets/ToggleWidget.js` — `createToggle()` creates widget-mode toggles
- `src/ui/widgets/TabWidget.js` — `createTabBar()` for context on structured mode patterns

### Requirements
- `.planning/REQUIREMENTS.md` §设置页结构参数 — STRUCT-04 (双列布局), STRUCT-05 (行样式控制)

### Prior Phase Context
- `.planning/phases/53-configurable-tabs-engine/53-CONTEXT.md` — Phase 53 context: tab data format, `_resolvedTabs`, `_renderStructuredContent()` changes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_renderStructuredContent()` — Direct modification target, already iterates `groupKeys` and builds items
- `clampField()` — Numeric value validation, useful for `labelWidth`
- `sanitizeCssValue()` — CSS value sanitization for any color values
- `_applyTextStyle()` — Existing helper for applying font/color styles

### Established Patterns
- Structured mode detection: `customLayout?.header || customLayout?.tabBar || customLayout?.contentArea`
- All styling is inline (no external CSS classes for structured mode) — new styles should follow this
- `_widgetStyles` presence gates widget-mode vs legacy-mode rendering
- Zero npm dependencies in UI modules (pure DOM manipulation)
- `DEFAULT_SETTING_STYLE` provides fallback style values

### Integration Points
- `_renderStructuredContent()` called on init and each tab switch — all column/style logic lives here
- `_buildSlider()` creates `valueEl` unconditionally — needs gating by `showValueLabel`
- `layout.contentArea` already parsed for position/size — extend to read `columns` and `itemStyle`
- Content container `.settings-structured-content` is the grid/block target

</code_context>

<specifics>
## Specific Ideas

- Current item padding is `12px 0` — this rhythm should be preserved as the grid `row-gap` basis
- 9 total SETTING_DEFS keys means max 5 items per column in 2-column mode — no virtualization needed
- Phase 57 (editor) will need to configure all these properties — keep the JSON schema clean and flat
- Existing `DEFAULT_SETTING_STYLE` provides `labelColor`, `fontSize`, `fontFamily` — `itemStyle` is a new parallel concept for layout rather than typography

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 54-content-layout-row-styling*
*Context gathered: 2026-04-18*
