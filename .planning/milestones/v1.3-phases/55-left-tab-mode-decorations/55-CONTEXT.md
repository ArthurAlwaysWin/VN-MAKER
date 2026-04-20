# Phase 55: Left-Tab Mode + Decorations (Engine) - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto (all decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

Engine settings screen supports sidebar tab navigation (`tabBar.position='left'`) and decorative elements: header decoration images, footer reset button, and panel background image. All changes are engine-side only — no editor UI in this phase. When all new properties are omitted, rendering is identical to Phase 54 output.

</domain>

<decisions>
## Implementation Decisions

### Left-Tab Sidebar Layout (STRUCT-06)
- **D-01:** `tabBar.position` accepts `'top'` (default, current behavior) or `'left'`. When `'left'`, the settings-structured layout switches from vertical stack (header → tabBar → content) to a flex row with sidebar
- **D-02:** Layout structure when `position='left'`: outer flex container `flex-direction: row`. Left sidebar contains the tab buttons stacked vertically. Right side contains header + content area + footer in a column
- **D-03:** Sidebar width: fixed `180px` by default, configurable via `tabBar.width` (clamped via `clampField('width', ...)`)
- **D-04:** Tab buttons in left mode: stacked vertically with `flex-direction: column`, full-width, left-aligned text + optional icon. Active tab highlighted same as top mode
- **D-05:** Icon + label in left mode: icon (24×24) left of text, same as top mode but full-width button
- **D-06:** When `position='top'` (default or omitted): existing horizontal tab bar renders identically to Phase 53/54 (backward compat)
- **D-07:** The header element stays at the top of the right column (not inside the sidebar). The sidebar spans full height beside the entire right column

### Header Decorations (DECOR-01)
- **D-08:** `header.decorations[]` is an array of decoration objects: `{ src: string, x: number, y: number, width: number, height: number }`
- **D-09:** Each decoration renders as an absolute-positioned `<img>` element within the header div (header already has `position: relative`)
- **D-10:** Decoration positions/sizes clamped via `clampField()` — same as all other position fields
- **D-11:** Image paths resolved via `resolvePath()` (same as all asset paths)
- **D-12:** Decorations render ON TOP of the header background image (higher z-index) but BEHIND the title text and close button
- **D-13:** When `decorations` is omitted or empty: no decoration elements rendered (backward compat)

### Footer Reset Button (DECOR-02)
- **D-14:** Footer buttons already support `close` (hide settings) and `title` (return to title page) actions. Add `'reset'` action
- **D-15:** Reset action: copy `ConfigManager.defaults` into `ConfigManager.config`, call `save()`, then re-render current tab content to reflect reset values. Add a `reset()` method to ConfigManager for this
- **D-16:** Button click handler pattern: extend existing if/else chain in footer button handler to detect `action === 'reset'`
- **D-17:** After reset, settings UI immediately shows default values (re-render structured content). Also fire `_notifyChange()` so any audio volumes etc. take effect
- **D-18:** The action field is read from `btnCfg.action` (currently the code uses `btnCfg.id.includes('title')` — normalize to use `action` field consistently)

### Panel Background (DECOR-03)
- **D-19:** `settingsScreen.background` is a separate property from `layout.background` (which is the full-screen backdrop behind the settings panel). Panel background sits INSIDE the settings panel, behind the content area
- **D-20:** Implementation: create a `div.settings-panel-bg` with absolute positioning, `z-index: 0`, full panel dimensions. Content elements get `z-index: 1` (via `position: relative`)
- **D-21:** Background image rendered via `background-image: url(...)`, `background-size: cover`, `background-position: center`
- **D-22:** Opacity controlled via `settingsScreen.backgroundOpacity` (0-1, default 1). Applied as CSS `opacity` on the background layer div
- **D-23:** When `settingsScreen.background` is omitted: no panel background div created (backward compat)

### Agent's Discretion
- CSS details for sidebar button hover/active states
- Exact z-index values for decoration layering
- Test structure and helper utilities
- Whether to refactor the footer button handler into a cleaner switch/map pattern

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine Code (primary targets)
- `src/ui/SettingsScreen.js` — Main implementation target. `_renderStructured()` (lines 433-621), `_renderStructuredContent()` (lines 630+), footer button handler (lines 587-620)
- `src/engine/ConfigManager.js` — Needs `reset()` method. Currently has `defaults`, `config`, `get()`, `set()`, `save()`
- `src/engine/settingDefs.js` — Schema docs need updating for new properties

### Engine Utilities
- `src/engine/assetPath.js` — `resolvePath()` for decoration/background image paths
- `src/ui/sanitize.js` — `sanitizeCssValue()`, `clampField()` for input validation
- `src/ui/widgets/TabWidget.js` — `createTabBar()` — may need layout awareness for vertical mode

### Prior Phase Artifacts
- `.planning/phases/53-configurable-tabs-engine/53-CONTEXT.md` — Tab data format decisions (D-01 through D-15)
- `.planning/phases/54-content-layout-row-styling/54-CONTEXT.md` — Content area grid + row styling decisions

### Test References
- `tests/settingsStructured.test.js` — Existing structured mode tests, mock patterns
- `tests/contentLayout.test.js` — Phase 54 tests, same mock pattern for content area

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_renderStructured()` already builds header, tab bar, content area, and footer sections — Phase 55 modifies the layout flow
- `createTabBar()` in TabWidget.js already accepts `{label, icon}[]` objects (Phase 53) — may need `orientation` param for vertical
- `clampField()` and `sanitizeCssValue()` for all user-supplied dimensions and CSS values
- `resolvePath()` for all asset image paths
- Footer button handler exists (lines 587-620) — just needs `action` field support

### Established Patterns
- DOM construction: `document.createElement` + inline styles (no CSS classes for layout — consistent with all structured mode code)
- Position/size: `clampField('x'|'y'|'width'|'height', value)` for all numeric properties
- Image rendering: `<img>` with `resolvePath(src)`, or `background-image: url(...)` on div
- Config interaction: `this.configManager.get(key)` / `.set(key, value)` + `this._notifyChange()`

### Integration Points
- `_renderStructured()` is the main entry point — layout mode (top vs left tabs) branches here
- Footer button handler needs action-based dispatch (currently uses id-based matching)
- ConfigManager needs a `reset()` method (or inline equivalent)

</code_context>

<specifics>
## Specific Ideas

- Senrenbanka-style sidebar: vertical tabs with icon + text, full-height left panel
- Decoration images: corner ornaments (花角), divider lines, decorative borders within header area
- Panel background: character watermark or themed artwork behind settings controls (semi-transparent)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 55-left-tab-mode-decorations*
*Context gathered: 2026-04-18*
