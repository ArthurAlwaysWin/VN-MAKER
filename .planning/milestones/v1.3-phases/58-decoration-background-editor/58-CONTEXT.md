# Phase 58: Decoration & Background Editor - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning
**Mode:** Auto (all decisions auto-selected with recommended defaults)

<domain>
## Phase Boundary

Users configure header decorations (positioned images), footer buttons (text + action), and panel background (image + opacity) through the editor UI. All controls live in SettingsPageEditor.vue Section 4 ("🎨 装饰与背景") which already has a placeholder. All edits preview in real-time via iframe postMessage. Pure editor-side — engine already renders all these features from Phase 55.

</domain>

<decisions>
## Implementation Decisions

### Editor Placement (D-01)
- **D-01:** All Phase 58 controls go inside the existing Section 4 "🎨 装饰与背景" placeholder in `SettingsPageEditor.vue` (line 126-134). Replace the placeholder `<p>` with actual form components.
- **D-02:** Three sub-sections within Section 4, following the existing `sp-subsection` pattern used in Section 3 (Widget Styles): Header Decorations, Footer Buttons, Panel Background.
- **D-03:** Each sub-section is a collapsible block with its own toggle, matching the widget subsection pattern (`sp-subsection-header` + conditional rendering).

### Header Decoration Manager (EDITOR-03, DECOR-01)
- **D-04:** Decorations displayed as a vertical list of "decoration cards" within the sub-section. Each card shows: image path input, x/y position inputs, width/height inputs, delete button.
- **D-05:** "添加装饰" (Add Decoration) button at the bottom of the list. Creates a new decoration entry with defaults `{ src: '', x: 0, y: 0, width: 100, height: 100 }`.
- **D-06:** Delete button (✕) removes the decoration from the `header.decorations[]` array.
- **D-07:** Image path is a text `<input>` field (consistent with Phase 57 D-09 — no asset picker dialog in this phase). Accepts asset paths resolved via `resolvePath()`.
- **D-08:** Position (x/y) and size (width/height) are `<input type="number">` fields in a 2×2 grid layout (x/y on first row, width/height on second). All clamped via engine's existing `clampField()`.
- **D-09:** Each field change triggers `sendScreenLayoutToPreview()` via the existing composable. @change triggers `commitScreenLayout()` for undo.

### Footer Button Config (EDITOR-03, DECOR-02)
- **D-10:** Footer buttons displayed as a vertical list of button config rows. Each row shows: text input, action dropdown, x/y position inputs, delete button.
- **D-11:** Action dropdown has 3 fixed options: `close` (关闭设置), `title` (返回标题), `reset` (恢复默认). These match the engine's existing action handler.
- **D-12:** "添加按钮" (Add Button) button at bottom. Creates `{ text: '按钮', action: 'close', x: 0, y: 0 }`.
- **D-13:** Footer height input: single number field at the top of the footer sub-section → `layout.footer.height`.
- **D-14:** Button position x/y are number inputs, same pattern as decoration positions.

### Panel Background (EDITOR-05, DECOR-03)
- **D-15:** Panel background is a simple form group (not a list): image path text input + opacity slider.
- **D-16:** Image path → `settingsScreen.background` (text input, same pattern as D-07).
- **D-17:** Opacity → `settingsScreen.backgroundOpacity` as a range slider (0-100, displayed as %, stored as 0-1 float). Uses `<input type="range">` + numeric display.
- **D-18:** Clear button or empty input removes the panel background (sets to null).

### Live Preview (EDITOR-06)
- **D-19:** All edits use existing `useSettingsPageEditor` composable which provides both `useScreenLayoutEditor` and `useWidgetStylesEditor` interfaces. The decoration/footer/background data lives in `settingsLayout` (the `customLayout` object), so it goes through `sendScreenLayoutToPreview()`.
- **D-20:** No new preview wiring needed — the existing composable + postMessage protocol already handles all layout sub-properties.

### Data Path in customLayout
- **D-21:** Header decorations: `customLayout.header.decorations[]` — array of `{ src, x, y, width, height }`
- **D-22:** Footer buttons: `customLayout.footer.buttons[]` — array of `{ text, action, x, y }`, plus `customLayout.footer.height`
- **D-23:** Panel background: `customLayout.settingsScreen.background` (string) and `customLayout.settingsScreen.backgroundOpacity` (number 0-1)

### Component Structure
- **D-24:** Create one new Vue component file per sub-section:
  - `DecorationSection.vue` — header decoration manager
  - `FooterButtonSection.vue` — footer button config
  - `PanelBackgroundSection.vue` — panel background controls
- **D-25:** All three inject `useScreenLayoutEditor` from the parent composable (same pattern as TabCrudSection, SettingMatrix, LayoutControlsSection).
- **D-26:** Components go in `src/editor/components/layout/` (same directory as existing layout sub-components).

### Agent's Discretion
- CSS styling for decoration card layout (grid vs flexbox for x/y/w/h fields)
- Exact icon/emoji for each sub-section header
- Whether to add min/max constraints on footer height input
- Test structure and helper utilities
- Whether to extract a shared "list item with delete" pattern from decoration and footer sections

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine (what the editor configures)
- `src/ui/SettingsScreen.js` §500-522 — Header decorations rendering (DECOR-01): absolute-positioned imgs with x/y/width/height
- `src/ui/SettingsScreen.js` §559-599 — Footer button rendering: position + action handler (close/title/reset)
- `src/ui/SettingsScreen.js` §444-460 — Panel background rendering (DECOR-03): background div with opacity
- `src/engine/settingDefs.js` — SETTING_DEFS registry (context for the settings system)

### Editor (where changes go)
- `src/editor/views/SettingsPageEditor.vue` §125-134 — Section 4 placeholder to replace
- `src/editor/composables/useSettingsPageEditor.js` — Dual-provide composable (layout + widget styles)
- `src/editor/composables/useScreenLayoutEditor.js` — Layout composable methods: `setScreenField()`, `sendScreenLayoutToPreview()`, `commitScreenLayout()`, `getActiveScreenConfig()`

### Existing sub-components (pattern reference)
- `src/editor/components/layout/TabCrudSection.vue` — Example of list CRUD pattern (add/delete rows)
- `src/editor/components/layout/LayoutControlsSection.vue` — Example of form controls pattern
- `src/editor/components/layout/SettingsSection.vue` — Parent form with nested field helpers

### Prior Phase Context
- `.planning/phases/55-left-tab-mode-decorations/55-CONTEXT.md` — Engine-side decoration/footer/background decisions (D-08 through D-23)
- `.planning/phases/57-tab-layout-editor/57-CONTEXT.md` — Editor placement pattern and preview wiring decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useScreenLayoutEditor` composable: provides `setScreenField()`, `getActiveScreenConfig()`, `sendScreenLayoutToPreview()`, `commitScreenLayout()` — all needed for decoration/footer/background editing
- `TabCrudSection.vue`: list CRUD pattern (add item, delete item, update fields) — decoration manager and footer button manager follow the same pattern
- `SettingsPageEditor.vue`: Section 4 placeholder already exists with collapsible toggle wired

### Established Patterns
- All layout sub-components inject `useScreenLayoutEditor()` and call `editor.setScreenField()` or directly modify `editor.getActiveScreenConfig()` for nested objects
- For nested array modifications (e.g., `header.decorations[i].x`): get config, mutate the nested object, call `sendScreenLayoutToPreview()`
- @input → preview (debounced), @change → commit (undo push) — consistent across all existing sections
- `form-group-title` + `config-row` + `config-label` + `config-num`/`config-text` CSS classes for form styling

### Integration Points
- Section 4 in SettingsPageEditor.vue (lines 126-134): replace placeholder with 3 sub-components
- `expanded.decor` reactive toggle already wired
- Three new sub-component imports needed in SettingsPageEditor.vue `<script setup>`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow the existing sub-component patterns established in Phase 57.

</specifics>

<deferred>
## Deferred Ideas

- Asset picker dialog for image path fields (text input only for now, consistent with Phase 57 D-09)
- Drag-and-drop positioning of decorations on a visual canvas (would be its own phase)
- Footer button styling customization (font size, color, background — currently engine renders plain white text)

</deferred>

---

*Phase: 58-decoration-background-editor*
*Context gathered: 2026-04-19*
