# Phase 53: Configurable Tabs (Engine) - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto (all decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

Engine settings screen supports configurable tab structure: custom number of tabs with custom labels, optional icons, and per-tab setting assignment. When `tabBar.tabs` is omitted, behavior is identical to v1.2. Pure engine-side change — no editor UI modifications in this phase.

</domain>

<decisions>
## Implementation Decisions

### Tab Data Format
- **D-01:** `tabBar.tabs` changes from `string[]` to `object[]` format: `{ label: string, icon?: string, settingKeys?: string[] }`
- **D-02:** When `tabBar.tabs` is omitted or empty, fall back to existing `DEFAULT_TAB_LABELS` + `SETTING_GROUP_KEYS` (STRUCT-07 backward compat)
- **D-03:** Auto-detect legacy format: if `tabs[0]` is a string, auto-convert each entry to `{ label: entry }` — zero migration cost for existing themes
- **D-04:** When `settingKeys` is omitted from a tab object, use the corresponding `SETTING_GROUP_KEYS[index]` default (allows partial override)

### Icon Rendering
- **D-05:** Tab icons render as `<img>` to the left of the text label using flexbox (icon + text inline)
- **D-06:** Icon size: fixed 24×24px with `object-fit: contain`, vertically centered
- **D-07:** When `icon` is null/undefined, render text-only tab (no empty space reserved)
- **D-08:** Icon paths resolved via `resolvePath()` (same as all asset paths in the engine)

### Setting Key Assignment
- **D-09:** Each tab's `settingKeys[]` is an array of SETTING_DEFS keys (e.g., `['bgm-volume', 'se-volume']`)
- **D-10:** Setting keys not assigned to any tab are appended to the LAST tab (ROADMAP success criterion #5)
- **D-11:** Duplicate keys across tabs: render in first tab only, skip in subsequent tabs (no duplicate controls)
- **D-12:** Invalid/unknown setting keys silently ignored (forward-compat with future setting types)

### Rendering Changes
- **D-13:** Modify `_renderStructured()` to parse new tab object format and pass structured data to `createTabBar()`
- **D-14:** Modify `_renderStructuredContent()` to use tab-specific `settingKeys` instead of hardcoded `SETTING_GROUP_KEYS[index]`
- **D-15:** `createTabBar()` in `TabWidget.js` updated to accept `{label, icon?}[]` (currently expects `string[]`)

### Agent's Discretion
- Internal refactoring approach for `_renderStructured()` and `_renderStructuredContent()`
- CSS details for icon positioning within tab buttons
- Test helper utilities and fixture structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine Code (primary targets)
- `src/ui/SettingsScreen.js` — Main implementation target. Contains `_renderStructured()`, `_renderStructuredContent()`, `SETTING_GROUP_KEYS`, `DEFAULT_TAB_LABELS`
- `src/ui/widgets/TabWidget.js` — `createTabBar()` function, currently expects `string[]` labels. Needs update to accept `{label, icon?}[]`
- `src/engine/settingDefs.js` — `SETTING_DEFS` registry, `createEmptySettingsScreen()`. Tab schema docs need updating

### Engine Utilities
- `src/engine/assetPath.js` — `resolvePath()` for icon asset paths
- `src/ui/sanitize.js` — `sanitizeCssValue()`, `clampField()` for input validation

### Requirements
- `.planning/REQUIREMENTS.md` §设置页结构参数 — STRUCT-01 (tab count/labels), STRUCT-02 (tab icons), STRUCT-03 (setting grouping), STRUCT-07 (backward compat)

### Prior Phase Context
- `.planning/phases/52-smart-color-foundation/52-CONTEXT.md` — Phase 52 context (no direct dependencies, but establishes module patterns)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createTabBar()` in `TabWidget.js` — Already handles 5 shape variants, active/inactive states. Needs minor extension for icon support
- `SETTING_GROUP_KEYS` / `DEFAULT_TAB_LABELS` — Existing defaults to preserve for backward compat
- `resolvePath()` — Asset path resolution, already used in TabWidget for background images
- `sanitizeCssValue()` — Input sanitization for CSS values

### Established Patterns
- Structured mode detection: `customLayout?.header || customLayout?.tabBar || customLayout?.contentArea`
- Widget-based rendering (when `_widgetStyles` is set) vs fallback rendering (plain buttons)
- `clampField()` for numeric value validation
- Zero npm imports in UI modules (pure DOM manipulation)

### Integration Points
- `_renderStructured()` already reads `layout.tabBar.tabs` — currently as string array
- `_renderStructuredContent()` uses `SETTING_GROUP_KEYS[this._activeTab]` — needs to read from resolved tab config
- Both widget-based and fallback tab rendering paths need updating
- `createTabBar()` called from `_renderStructured()` — API change affects both

</code_context>

<specifics>
## Specific Ideas

- Current tab bar already supports 5 shape variants (rectangle/pill/underline/trapezoid/ribbon) — icon support should work with all shapes
- Fallback (non-widget) tab rendering also needs icon support for consistency
- The 9 SETTING_DEFS keys are the universe of assignable settings: bgm-volume, se-volume, voice-volume, text-speed, auto-speed, window-mode, dialogue-opacity, master-volume, skip-mode

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 53-configurable-tabs-engine*
*Context gathered: 2026-04-18*
