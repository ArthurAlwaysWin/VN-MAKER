# Phase 57: Tab & Layout Editor - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto (all decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

Users visually configure tab structure (add/remove/rename tabs, icon assignment, setting-key matrix) and content layout controls (columns, row styles, label position, tab position toggle) within the existing ScreenLayoutEditor settings section. All edits preview in real-time via iframe postMessage. Pure editor-side change — engine already supports all structural parameters from Phases 53-55.

</domain>

<decisions>
## Implementation Decisions

### Editor Placement (D-01)
- **D-01:** All Phase 57 controls live inside `SettingsSection.vue` (inside ScreenLayoutEditor), not a new view. Expand the existing form with new sections for tab CRUD, setting matrix, layout controls.
- **D-02:** New form sections added below existing content area fields, following the `form-group-title` pattern already established.

### Tab CRUD (EDITOR-01)
- **D-03:** Tabs displayed as an inline list of rows within the "标签栏" (Tab Bar) section. Each row shows: drag handle (optional), text input for label, icon path input, delete button.
- **D-04:** "添加标签" (Add Tab) button at the bottom of the tab list. Creates a new tab with default label "新标签" and empty settingKeys.
- **D-05:** Delete button removes the tab. If deleted tab had setting keys, those keys become unassigned (fall to last tab per D-10 from Phase 53).
- **D-06:** Tab label editing: inline `<input type="text">` — same pattern as existing config-row fields. @input → preview, @change → commit.
- **D-07:** No tab reordering via drag-and-drop in this phase. Users can delete and re-add. (Keep scope minimal.)

### Icon Assignment (D-08)
- **D-08:** Icon path is a text input field per tab row (same as existing image path pattern in SettingsSection). Accepts asset paths resolved via `resolvePath()`.
- **D-09:** No asset picker in this phase — text input only. Future phase can add browse dialog.

### Setting Key Assignment Matrix (EDITOR-01)
- **D-10:** Checkbox matrix displayed as a new section "设置项分配" (Setting Assignment). Rows = SETTING_DEFS keys (e.g., bgm-volume, se-volume, etc.), Columns = user's tabs.
- **D-11:** Each intersection is a checkbox. When checked, that setting key is assigned to that tab's `settingKeys[]` array.
- **D-12:** Exclusive assignment: when a key is assigned to Tab A, it auto-unchecks in other tabs (each key in exactly one tab per success criterion #2).
- **D-13:** Already-assigned keys show as checked in their tab column, unchecked but available in others. The checkbox handles the exclusive toggle automatically.
- **D-14:** Setting keys not assigned to ANY tab are shown in a "未分配" (Unassigned) indicator at the bottom. Per Phase 53 D-10, these append to last tab at runtime.
- **D-15:** Matrix columns are tab labels. If user has many tabs, horizontal scroll within the matrix area.

### Layout Controls (EDITOR-02)
- **D-16:** New form section "布局" (Layout) below the setting matrix. Contains:
  - Column count: radio group (1 / 2) → sets `contentArea.columns`
  - Row dividers: checkbox toggle → sets `contentArea.itemStyle.showDividers`
  - Zebra stripes: checkbox toggle → sets `contentArea.itemStyle.alternateBackground`
  - Value labels: checkbox toggle → sets `contentArea.itemStyle.showValueLabel`
- **D-17:** Label position: radio group (左侧/顶部, i.e., left/top) → sets `contentArea.itemStyle.labelPosition`
- **D-18:** Label width: number input (px) → sets `contentArea.itemStyle.labelWidth`. Only visible when labelPosition='left'.

### Tab Position Toggle (EDITOR-04)
- **D-19:** Radio button group (顶部/侧边, i.e., top/left) in the "标签栏" section → sets `tabBar.position`
- **D-20:** When switching to 'left', the sidebar width field becomes visible (number input, default 180px → `tabBar.width`)

### Live Preview (D-21)
- **D-21:** All edits use existing useScreenLayoutEditor composable: @input → `sendScreenLayoutToPreview()` (debounced 200ms), @change → `commitScreenLayout()` (undo push + flush). No new preview wiring needed.
- **D-22:** Tab CRUD operations (add/delete) immediately call `sendScreenLayoutToPreview()` after modifying the data.

### Agent's Discretion
- Exact CSS for the setting matrix (table vs grid)
- Scrolling behavior within the matrix when many settings/tabs exist
- Whether to split SettingsSection.vue into sub-components or keep as single file
- Test structure and verification approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine (what the editor configures)
- `src/engine/settingDefs.js` — SETTING_DEFS registry (all setting keys the matrix rows come from)
- `src/engine/settingsStructured.js` — Engine's `_renderStructured()` + `_renderStructuredContent()` that consume the tab/layout config

### Editor (where changes go)
- `src/editor/components/layout/SettingsSection.vue` — Primary file to modify (add tab CRUD, matrix, layout controls)
- `src/editor/composables/useScreenLayoutEditor.js` — Composable for preview/commit (already wired, reuse)
- `src/editor/views/ScreenLayoutEditor.vue` — Parent view (no changes needed, just context)

### Prior Phase Context
- `.planning/phases/53-configurable-tabs-engine/53-CONTEXT.md` — Tab data format decisions (D-01 through D-15)
- `.planning/phases/54-content-layout-row-styling/54-CONTEXT.md` — Layout/row-style decisions (D-01 through D-21)
- `.planning/phases/55-left-tab-mode-decorations/55-CONTEXT.md` — Left-tab mode + decorations decisions (D-01 through D-23)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SettingsSection.vue` — Already has config-row pattern for tabBar/contentArea fields. Extend with new sections.
- `useScreenLayoutEditor.js` — `sendScreenLayoutToPreview()`, `commitScreenLayout()`, `setScreenNestedField()` — all reusable for new controls.
- `SETTING_DEFS` from `settingDefs.js` — Keys for matrix rows: `Object.keys(SETTING_DEFS)`.
- `form-group-title` CSS class — Standard section header in SettingsSection.

### Established Patterns
- Config row pattern: `<label class="config-label">` + `<input>` with @input/@change handlers
- Nested field updates: `editor.setScreenNestedField(group, field, value)` → `sendScreenLayoutToPreview()`
- Commit on @change: `editor.commitScreenLayout()` pushes undo
- Provide/inject via `useScreenLayoutEditor()` in child components

### Integration Points
- `SettingsSection.vue` is imported by `ScreenLayoutEditor.vue` — no routing changes needed
- `getActiveScreenConfig()` returns the `settingsScreen` config object — tab/layout data lives here
- Engine already renders all structural params — editor just needs to write the correct JSON structure

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The UI follows existing SettingsSection patterns with form groups, config rows, and the established preview/commit flow.

</specifics>

<deferred>
## Deferred Ideas

- Asset picker for tab icon selection (browse project assets) — future enhancement
- Tab drag-and-drop reordering — future enhancement
- Per-tab preview highlighting in iframe — future enhancement

</deferred>

---

*Phase: 57-tab-layout-editor*
*Context gathered: 2026-04-18*
