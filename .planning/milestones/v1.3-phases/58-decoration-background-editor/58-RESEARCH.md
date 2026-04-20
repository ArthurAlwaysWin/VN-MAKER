# Phase 58: Decoration & Background Editor - Research

**Researched:** 2026-04-19
**Domain:** Vue 3 editor UI — CRUD list components + form controls for settings page decoration/footer/background
**Confidence:** HIGH

## Summary

Phase 58 adds three sub-sections inside the existing Section 4 ("🎨 装饰与背景") placeholder in `SettingsPageEditor.vue`. The engine already renders header decorations, footer buttons, and panel backgrounds (Phase 55). This phase creates the editor-side controls that let users configure those features.

The implementation is highly constrained by established patterns — Phase 57 created identical sub-component patterns (TabCrudSection for CRUD lists, LayoutControlsSection for form controls). All three new components inject `useScreenLayoutEditor` via the `SCREEN_LAYOUT_EDITOR_KEY` symbol, get the config object via `editor.getActiveScreenConfig()`, mutate nested properties directly, then call `editor.sendScreenLayoutToPreview()` for live preview and `editor.commitScreenLayout()` for undo. No new composables, stores, or preview wiring is needed.

The only novel aspect is that two of the three sub-sections (decorations and footer buttons) manage dynamic-length arrays with add/delete operations, mirroring `TabCrudSection.vue`'s list pattern. The panel background sub-section is a simple form group (image path + opacity slider), similar to existing widget config sections.

**Primary recommendation:** Create three Vue SFC components following TabCrudSection + LayoutControlsSection patterns exactly, wire them into Section 4 placeholder, and extract a `decorLayoutHelpers.js` pure-function module (mirrors `tabLayoutHelpers.js`) for testable array manipulation logic.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** All Phase 58 controls go inside the existing Section 4 "🎨 装饰与背景" placeholder in `SettingsPageEditor.vue` (line 126-134). Replace the placeholder `<p>` with actual form components.
- **D-02:** Three sub-sections within Section 4, following the existing `sp-subsection` pattern used in Section 3 (Widget Styles): Header Decorations, Footer Buttons, Panel Background.
- **D-03:** Each sub-section is a collapsible block with its own toggle, matching the widget subsection pattern (`sp-subsection-header` + conditional rendering).
- **D-04:** Decorations displayed as a vertical list of "decoration cards" within the sub-section. Each card shows: image path input, x/y position inputs, width/height inputs, delete button.
- **D-05:** "添加装饰" (Add Decoration) button at the bottom of the list. Creates a new decoration entry with defaults `{ src: '', x: 0, y: 0, width: 100, height: 100 }`.
- **D-06:** Delete button (✕) removes the decoration from the `header.decorations[]` array.
- **D-07:** Image path is a text `<input>` field (consistent with Phase 57 D-09 — no asset picker dialog in this phase). Accepts asset paths resolved via `resolvePath()`.
- **D-08:** Position (x/y) and size (width/height) are `<input type="number">` fields in a 2×2 grid layout (x/y on first row, width/height on second). All clamped via engine's existing `clampField()`.
- **D-09:** Each field change triggers `sendScreenLayoutToPreview()` via the existing composable. @change triggers `commitScreenLayout()` for undo.
- **D-10:** Footer buttons displayed as a vertical list of button config rows. Each row shows: text input, action dropdown, x/y position inputs, delete button.
- **D-11:** Action dropdown has 3 fixed options: `close` (关闭设置), `title` (返回标题), `reset` (恢复默认). These match the engine's existing action handler.
- **D-12:** "添加按钮" (Add Button) button at bottom. Creates `{ text: '按钮', action: 'close', x: 0, y: 0 }`.
- **D-13:** Footer height input: single number field at the top of the footer sub-section → `layout.footer.height`.
- **D-14:** Button position x/y are number inputs, same pattern as decoration positions.
- **D-15:** Panel background is a simple form group (not a list): image path text input + opacity slider.
- **D-16:** Image path → `settingsScreen.background` (text input, same pattern as D-07).
- **D-17:** Opacity → `settingsScreen.backgroundOpacity` as a range slider (0-100, displayed as %, stored as 0-1 float). Uses `<input type="range">` + numeric display.
- **D-18:** Clear button or empty input removes the panel background (sets to null).
- **D-19:** All edits use existing `useSettingsPageEditor` composable which provides both `useScreenLayoutEditor` and `useWidgetStylesEditor` interfaces. The decoration/footer/background data lives in `settingsLayout` (the `customLayout` object), so it goes through `sendScreenLayoutToPreview()`.
- **D-20:** No new preview wiring needed — the existing composable + postMessage protocol already handles all layout sub-properties.
- **D-21:** Header decorations: `customLayout.header.decorations[]` — array of `{ src, x, y, width, height }`
- **D-22:** Footer buttons: `customLayout.footer.buttons[]` — array of `{ text, action, x, y }`, plus `customLayout.footer.height`
- **D-23:** Panel background: `customLayout.settingsScreen.background` (string) and `customLayout.settingsScreen.backgroundOpacity` (number 0-1)
- **D-24:** Create one new Vue component file per sub-section: `DecorationSection.vue`, `FooterButtonSection.vue`, `PanelBackgroundSection.vue`
- **D-25:** All three inject `useScreenLayoutEditor` from the parent composable (same pattern as TabCrudSection, SettingMatrix, LayoutControlsSection).
- **D-26:** Components go in `src/editor/components/layout/` (same directory as existing layout sub-components).

### Agent's Discretion
- CSS styling for decoration card layout (grid vs flexbox for x/y/w/h fields)
- Exact icon/emoji for each sub-section header
- Whether to add min/max constraints on footer height input
- Test structure and helper utilities
- Whether to extract a shared "list item with delete" pattern from decoration and footer sections

### Deferred Ideas (OUT OF SCOPE)
- Asset picker dialog for image path fields (text input only for now)
- Drag-and-drop positioning of decorations on a visual canvas
- Footer button styling customization (font size, color, background)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDITOR-03 | 装饰编辑器 — 页头装饰图管理（添加/移除/拖拽定位）+ 页脚按钮配置（action 选择 + 文案编辑） | DecorationSection.vue for header decorations CRUD (D-04 through D-09), FooterButtonSection.vue for button config CRUD (D-10 through D-14). Both inject useScreenLayoutEditor, mutate array items, preview via schedulePreview. Pattern established by TabCrudSection.vue. |
| EDITOR-05 | 面板背景编辑 — 设置页独立背景图选择 + 透明度调节 | PanelBackgroundSection.vue with text input for path + range slider for opacity (D-15 through D-18). Pattern established by PanelConfigSection.vue's backgroundImage + backgroundImageOpacity controls. |
| EDITOR-06 | 所有结构参数编辑实时通过 postMessage 预览到 iframe 中 | No new wiring needed. All three components use editor.sendScreenLayoutToPreview() (debounced 200ms) on @input and editor.commitScreenLayout() on @change. Existing postMessage('update-screen-layout') protocol sends full config snapshot including header.decorations, footer.buttons, and settingsScreen.background to iframe. Verified in useSettingsPageEditor.js schedulePreview(). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | SFC components with `<script setup>` | Project framework — editor is Vue 3 throughout |
| Pinia | ^3.0.4 | State management (useScriptStore) | Project state layer — undo/redo integration |

### Supporting
No additional libraries needed. All functionality is built with:
- Existing `useScreenLayoutEditor` composable (inject pattern)
- Existing `useSettingsPageEditor` composable (dual-provide)
- Native HTML inputs (`<input type="number">`, `<input type="text">`, `<input type="range">`, `<select>`)
- Existing CSS class system (`config-row`, `config-label`, `config-num`, `config-text`, etc.)

**Installation:** None — no new packages required.

## Architecture Patterns

### New Files
```
src/editor/components/layout/
├── DecorationSection.vue       # NEW — header decoration CRUD list
├── FooterButtonSection.vue     # NEW — footer button CRUD list
├── PanelBackgroundSection.vue  # NEW — panel background form
├── decorLayoutHelpers.js       # NEW — pure functions for array CRUD (testable)
├── TabCrudSection.vue          # EXISTING — pattern reference for list CRUD
├── LayoutControlsSection.vue   # EXISTING — pattern reference for form controls
├── tabLayoutHelpers.js         # EXISTING — pattern reference for helpers
└── ...
```

### Modified Files
```
src/editor/views/SettingsPageEditor.vue  # MODIFIED — replace Section 4 placeholder
```

### Pattern 1: Sub-Component Injection (ESTABLISHED)
**What:** Child components inject the screen layout editor via `useScreenLayoutEditor()` and operate on config data directly.
**When to use:** All three new sub-components.
**Example (from TabCrudSection.vue):**
```javascript
// Source: src/editor/components/layout/TabCrudSection.vue
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';

const editor = useScreenLayoutEditor();
const cfg = computed(() => editor.getActiveScreenConfig() || {});
```

### Pattern 2: Array CRUD on Nested Config (ESTABLISHED)
**What:** Get config object, ensure parent path exists with `??=`, push/splice array items, then preview + commit.
**When to use:** DecorationSection (header.decorations[]) and FooterButtonSection (footer.buttons[]).
**Example (from TabCrudSection.vue onAddTab/onDeleteTab):**
```javascript
// Source: src/editor/components/layout/TabCrudSection.vue + tabLayoutHelpers.js
function onAddTab() {
  const raw = editor.getActiveScreenConfig();
  ensureDefaultTabs(raw);
  addTab(raw);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onDeleteTab(idx) {
  const raw = editor.getActiveScreenConfig();
  if (!raw?.tabBar?.tabs) return;
  deleteTab(raw, idx);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}
```

### Pattern 3: Input→Preview + Change→Commit (ESTABLISHED)
**What:** `@input` triggers debounced preview (200ms), `@change` triggers commit (undo push).
**When to use:** All form fields (number inputs, text inputs, range sliders, dropdowns).
**Example (from SettingsPageEditor.vue):**
```html
<!-- Source: src/editor/views/SettingsPageEditor.vue -->
<input type="number"
  :value="hdr.height ?? ''"
  @input="onNestedNum('header', 'height', $event)"
  @change="commitLayout"
  min="40" max="200" class="config-num" placeholder="90" />
```

### Pattern 4: Range Slider with % Display (ESTABLISHED)
**What:** `<input type="range">` with 0-1 step value, displayed as percentage.
**When to use:** PanelBackgroundSection opacity slider.
**Example (from PanelConfigSection.vue):**
```html
<!-- Source: src/editor/components/widget/PanelConfigSection.vue -->
<input type="range"
  :value="backgroundImageOpacity"
  @input="onRangeInput('backgroundImageOpacity', $event)"
  @change="commit"
  min="0" max="1" step="0.05" class="config-range" />
<span class="range-val">{{ Math.round(backgroundImageOpacity * 100) }}%</span>
```

### Pattern 5: Collapsible Subsection (ESTABLISHED)
**What:** `sp-subsection` container with `sp-subsection-header` toggle button + conditional rendering.
**When to use:** All three sub-sections within Section 4.
**Example (from SettingsPageEditor.vue Section 3):**
```html
<!-- Source: src/editor/views/SettingsPageEditor.vue -->
<div class="sp-subsection">
  <button class="sp-subsection-header" @click="toggleWidget('tab')">
    <span class="sp-section-arrow">{{ widgetExpanded.tab ? '▼' : '▶' }}</span>
    📑 Tab 形状
  </button>
  <TabShapeSection v-if="widgetExpanded.tab" />
</div>
```

### Pattern 6: Pure Helper Module (ESTABLISHED)
**What:** Extract array mutation logic into a separate `.js` file with pure functions — testable without Vue/DOM.
**When to use:** `decorLayoutHelpers.js` for decoration and footer button CRUD operations.
**Example (from tabLayoutHelpers.js):**
```javascript
// Source: src/editor/components/layout/tabLayoutHelpers.js
export function addTab(cfg) {
  if (!cfg) return;
  cfg.tabBar ??= {};
  cfg.tabBar.tabs ??= [];
  cfg.tabBar.tabs.push({ label: '新标签', settingKeys: [] });
}

export function deleteTab(cfg, index) {
  if (!cfg?.tabBar?.tabs) return;
  cfg.tabBar.tabs.splice(index, 1);
}
```

### Anti-Patterns to Avoid
- **Don't create new composables:** The existing `useSettingsPageEditor` + `useScreenLayoutEditor` provide all needed functionality. Adding a composable would fragment the preview/commit path.
- **Don't bypass the inject pattern:** Sub-components MUST inject the editor, not import stores directly for layout data. Widget style sections import the store directly only for accessing `WIDGET_DEFAULTS`; layout sections use inject exclusively.
- **Don't add event emission to parent:** Sub-components call `editor.commitScreenLayout()` directly — no `$emit` to parent. This matches all existing sub-components.
- **Don't use deep watchers for preview:** The pattern is imperative: mutate → `sendScreenLayoutToPreview()`. Watchers would cause duplicate sends and unpredictable timing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS sanitization for image paths | Custom regex | Engine's `sanitizeCssValue()` | Already handles all injection patterns, used throughout engine |
| Numeric field clamping | Manual min/max logic | Engine's `clampField()` with BOUNDS table | Predefined bounds for x/y/width/height/scale already exist |
| Debounced preview | Custom debounce | `editor.sendScreenLayoutToPreview()` | Already has 200ms debounce built in |
| Undo integration | Manual history push | `editor.commitScreenLayout()` | Deep-clones config and calls `pushState()` |
| Collapsible UI sections | Custom accordion | Existing `sp-subsection` CSS + reactive toggle | Pattern established in Section 3 |

**Key insight:** Every infrastructure piece (preview, undo, sanitization, clamping, CSS classes) already exists from Phase 57. This phase is purely about wiring new form fields to existing data paths and mechanisms.

## Data Path Reference

Critical: understanding the exact data paths prevents bugs.

```
script.data.ui.settingsScreen (returned by editor.getScreenConfig / getActiveScreenConfig)
├── header
│   ├── height (number)
│   ├── backgroundImage (string)
│   ├── title { text, color, fontSize, x, y }
│   └── decorations[] ← EDITOR-03 / NEW
│       └── { src: string, x: number, y: number, width: number, height: number }
├── footer ← EDITOR-03 / NEW
│   ├── height (number)
│   └── buttons[]
│       └── { text: string, action: 'close'|'title'|'reset', x: number, y: number }
├── settingsScreen ← EDITOR-05 / NEW (nested settingsScreen within settingsScreen!)
│   ├── background (string|null)
│   └── backgroundOpacity (number 0-1)
├── tabBar { position, height, width, tabs[], background }
└── contentArea { x, y, width, height, columns, itemStyle }
```

**⚠️ Important:** The panel background lives at `cfg.settingsScreen.background` where `cfg` = `script.data.ui.settingsScreen`. This means there's a nested `settingsScreen` key inside the `settingsScreen` config object. This is verified in the engine at `SettingsScreen.js` line 445: `const ssCfg = layout.settingsScreen || {};`.

## Common Pitfalls

### Pitfall 1: Nested settingsScreen Path Confusion
**What goes wrong:** Writing panel background to `cfg.background` instead of `cfg.settingsScreen.background`.
**Why it happens:** The config object IS the settingsScreen, so developers expect background to be top-level.
**How to avoid:** Use `editor.setScreenNestedField('settingsScreen', 'background', value)` — the `setScreenNestedField` method handles `cfg.settingsScreen ??= {}; cfg.settingsScreen.background = value`.
**Warning signs:** Panel background not appearing in preview; engine receives `layout.background` instead of `layout.settingsScreen.background`.

### Pitfall 2: Array Initialization on First Add
**What goes wrong:** Pushing to `cfg.header.decorations` when `cfg.header` or `cfg.header.decorations` is undefined.
**Why it happens:** When no decorations have been configured yet, neither `header` nor `header.decorations` exist.
**How to avoid:** Always ensure parent path: `cfg.header ??= {}; cfg.header.decorations ??= [];` before push. Extract into helper function `ensureDecorations(cfg)`.
**Warning signs:** TypeError on push, or silent failure.

### Pitfall 3: Missing Undo for Add/Delete Operations
**What goes wrong:** Adding/deleting an item previews correctly but isn't undoable.
**Why it happens:** Developer calls `sendScreenLayoutToPreview()` but forgets `commitScreenLayout()`.
**How to avoid:** Add/delete operations MUST call both: preview first, commit immediately after (same pattern as `onAddTab()`).
**Warning signs:** Ctrl+Z doesn't revert the last add/delete.

### Pitfall 4: Opacity Storage vs Display Mismatch
**What goes wrong:** Storing 0-100 integer but engine expects 0-1 float (or vice versa).
**Why it happens:** Slider displays percentage but the data model stores float.
**How to avoid:** Store as 0-1 float always. Display as `Math.round(value * 100) + '%'`. Range slider uses `min="0" max="1" step="0.05"`. This matches PanelConfigSection.vue exactly.
**Warning signs:** Background either fully opaque or fully transparent; engine's `clampField('scale', opacity)` returns undefined.

### Pitfall 5: Forgetting @change Commit on Dropdown
**What goes wrong:** Selecting an action from the footer button `<select>` previews but isn't saved.
**Why it happens:** `<select>` doesn't fire `@change` the same way number inputs do — it fires on selection change.
**How to avoid:** Use `@change` on `<select>` which fires when user selects an option. Commit immediately since dropdowns are discrete choices (same as radio button pattern in LayoutControlsSection).
**Warning signs:** Action reverts on page refresh.

### Pitfall 6: Reactive Computed Staleness with Array Mutations
**What goes wrong:** Computed arrays don't update after splice/push.
**Why it happens:** Vue 3's reactivity tracks property access but direct mutations on the Pinia store's raw data may not trigger recompute if the computed reads a stale reference.
**How to avoid:** Use `computed(() => editor.getActiveScreenConfig()?.header?.decorations || [])` — this re-evaluates on any store change because `getActiveScreenConfig()` accesses `script.data` which is a ref. After mutations, calling `commitScreenLayout()` (which replaces the whole object via `updateSettingsScreen(deepClone)`) ensures reactivity.
**Warning signs:** UI shows stale list after add/delete until next interaction.

## Code Examples

### DecorationSection.vue — Core Script Pattern
```javascript
// Source: Derived from TabCrudSection.vue + CONTEXT.md D-04 through D-09
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import { addDecoration, deleteDecoration, setDecorationField } from './decorLayoutHelpers.js';

const editor = useScreenLayoutEditor();

const cfg = computed(() => editor.getActiveScreenConfig() || {});
const decorations = computed(() => cfg.value.header?.decorations || []);

function onAdd() {
  const raw = editor.getActiveScreenConfig();
  addDecoration(raw);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onDelete(idx) {
  const raw = editor.getActiveScreenConfig();
  deleteDecoration(raw, idx);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onFieldInput(idx, field, value) {
  const raw = editor.getActiveScreenConfig();
  setDecorationField(raw, idx, field, value);
  editor.sendScreenLayoutToPreview();
}

function commit() {
  editor.commitScreenLayout();
}
```

### decorLayoutHelpers.js — Pure Functions Pattern
```javascript
// Source: Derived from tabLayoutHelpers.js pattern

// ─── Decoration CRUD ───────────────────────────────────
export function addDecoration(cfg) {
  if (!cfg) return;
  cfg.header ??= {};
  cfg.header.decorations ??= [];
  cfg.header.decorations.push({ src: '', x: 0, y: 0, width: 100, height: 100 });
}

export function deleteDecoration(cfg, index) {
  if (!cfg?.header?.decorations) return;
  cfg.header.decorations.splice(index, 1);
}

export function setDecorationField(cfg, index, field, value) {
  if (!cfg?.header?.decorations?.[index]) return;
  cfg.header.decorations[index][field] = value;
}

// ─── Footer Button CRUD ────────────────────────────────
export function addFooterButton(cfg) {
  if (!cfg) return;
  cfg.footer ??= {};
  cfg.footer.buttons ??= [];
  cfg.footer.buttons.push({ text: '按钮', action: 'close', x: 0, y: 0 });
}

export function deleteFooterButton(cfg, index) {
  if (!cfg?.footer?.buttons) return;
  cfg.footer.buttons.splice(index, 1);
}

export function setFooterButtonField(cfg, index, field, value) {
  if (!cfg?.footer?.buttons?.[index]) return;
  cfg.footer.buttons[index][field] = value;
}
```

### SettingsPageEditor.vue — Section 4 Integration Pattern
```html
<!-- Source: Derived from Section 3 widget subsection pattern -->
<!-- Section 4: Decorations & Background -->
<div v-if="expanded.decor" class="sp-section-body">
  <div class="sp-subsection">
    <button class="sp-subsection-header" @click="toggleDecor('header')">
      <span class="sp-section-arrow">{{ decorExpanded.header ? '▼' : '▶' }}</span>
      🌸 页头装饰
    </button>
    <DecorationSection v-if="decorExpanded.header" />
  </div>
  <div class="sp-subsection">
    <button class="sp-subsection-header" @click="toggleDecor('footer')">
      <span class="sp-section-arrow">{{ decorExpanded.footer ? '▼' : '▶' }}</span>
      🔲 页脚按钮
    </button>
    <FooterButtonSection v-if="decorExpanded.footer" />
  </div>
  <div class="sp-subsection">
    <button class="sp-subsection-header" @click="toggleDecor('panelBg')">
      <span class="sp-section-arrow">{{ decorExpanded.panelBg ? '▼' : '▶' }}</span>
      🖼️ 面板背景
    </button>
    <PanelBackgroundSection v-if="decorExpanded.panelBg" />
  </div>
</div>
```

### Footer Button Action Dropdown Pattern
```html
<!-- Source: Derived from existing select patterns + D-11 -->
<select
  :value="btn.action || 'close'"
  @change="onActionChange(idx, $event.target.value)"
  class="config-select">
  <option value="close">关闭设置</option>
  <option value="title">返回标题</option>
  <option value="reset">恢复默认</option>
</select>
```

### Panel Background Opacity — Range→Float Pattern
```html
<!-- Source: Derived from PanelConfigSection.vue + D-17 -->
<input type="range"
  :value="bgOpacity"
  @input="onOpacityInput($event)"
  @change="commit"
  min="0" max="1" step="0.05"
  class="config-range" />
<span class="range-val">{{ Math.round(bgOpacity * 100) }}%</span>
```
```javascript
const bgOpacity = computed(() => cfg.value.settingsScreen?.backgroundOpacity ?? 1);

function onOpacityInput(e) {
  const raw = editor.getActiveScreenConfig();
  if (!raw) return;
  raw.settingsScreen ??= {};
  raw.settingsScreen.backgroundOpacity = Number(e.target.value);
  editor.sendScreenLayoutToPreview();
}
```

## CSS Class Reference

All existing CSS classes to reuse (defined in SettingsPageEditor.vue's `<style scoped>` and duplicated in sub-components):

| Class | Usage | Properties |
|-------|-------|------------|
| `config-row` | Every form row | `display: flex; align-items: center; gap: 8px; padding: 5px 0` |
| `config-label` | Field label (80px wide) | `width: 80px; font-size: 12px; color: #aaa` |
| `config-num` | Number input (56px wide) | `width: 56px; background: #333; border: 1px solid #444; color: #e0e0e0` |
| `config-text` | Text input (flex: 1) | `flex: 1; background: #333; border: 1px solid #444; color: #e0e0e0` |
| `config-range` | Range slider | `flex: 1; accent-color: #b4a0ff` |
| `unit` | Unit suffix (px, %) | `font-size: 11px; color: #666` |
| `range-val` | Range value display | `font-size: 11px; color: #aaa; min-width: 32px` |
| `btn-add` | Add button (dashed border) | `border: 1px dashed #555; color: #888; width: 100%` |
| `btn-delete` | Delete button (× red) | `color: #a22; font-size: 16px` |
| `form-group-title` | Section title (uppercase) | `font-size: 11px; color: #888; text-transform: uppercase` |

**New class needed:** `config-select` for the `<select>` dropdown — style should match `config-text` but without flex: 1 (use explicit width or let it size to content).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline form fields in parent view | Extracted sub-components with inject | Phase 57 | Phase 58 follows extracted pattern |
| Direct store access in layout components | Inject composable via provide/inject | Phase 57 | All new components use `useScreenLayoutEditor()` |
| Monolithic helper functions | Pure helper modules (testable) | Phase 57 | `decorLayoutHelpers.js` follows `tabLayoutHelpers.js` |

## Open Questions

1. **Shared "list item with delete" pattern**
   - What we know: DecorationSection and FooterButtonSection both render lists of items with delete buttons. TabCrudSection also does this.
   - What's unclear: Whether to extract a reusable `CrudListItem` component or keep them separate.
   - Recommendation: Keep separate — the card layouts differ enough (2×2 grid for decoration vs inline row for footer button) that a shared component would add abstraction without reducing code significantly. This is Agent's Discretion.

2. **Footer height min/max constraints**
   - What we know: Engine uses `clampField('height', footer.height)` which bounds to [1, 1440].
   - What's unclear: Whether tighter UI constraints (e.g., 30-200) would improve UX.
   - Recommendation: Use `min="30" max="200"` on the input (consistent with header height which uses 40-200). This is Agent's Discretion.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — no test framework configured in project |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDITOR-03 | Decoration CRUD: add/delete/edit decorations and footer buttons | unit | N/A — pure helper functions testable if framework added | ❌ Wave 0 |
| EDITOR-05 | Panel background: image path + opacity stored correctly | unit | N/A — pure helper functions testable if framework added | ❌ Wave 0 |
| EDITOR-06 | Live preview: edits trigger postMessage to iframe | manual-only | Manual verification via iframe — existing postMessage wiring is infrastructure-level | ❌ |

### Sampling Rate
- **Per task commit:** Manual visual verification in editor
- **Per wave merge:** Full manual walkthrough of all 3 sub-sections
- **Phase gate:** All sub-sections functional with live preview

### Wave 0 Gaps
Since no test framework exists in the project, unit testing of `decorLayoutHelpers.js` pure functions is deferred. The helper functions are designed to be testable (no Vue dependency, pure data manipulation) so tests can be added if/when a test framework is introduced.

- [ ] Test framework installation (deferred — project-wide decision, not Phase 58 scope)
- [ ] `decorLayoutHelpers.js` pure function tests (ready to write when framework exists)

## Project Constraints (from copilot-instructions.md)

- **Tech stack:** JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript migration
- **Style:** Dark theme, pure CSS, Chinese interface (中文界面)
- **Code style:** 2 spaces, single quotes, semicolons always, named exports only
- **Vue conventions:** `<script setup>`, composables with `use` prefix, Pinia stores via composable access
- **Imports:** Always use explicit `.js` extensions for JS imports, relative paths, no aliases
- **Security:** Use `sanitizeCssValue()` for user-provided strings, `clampField()` for numeric bounds
- **Error handling:** Never throw uncaught, handle at boundaries
- **No external dependencies added** — all controls use native HTML elements

## Sources

### Primary (HIGH confidence)
- `src/editor/views/SettingsPageEditor.vue` — Section 4 placeholder (lines 125-134), collapsible pattern (lines 86-122), config row pattern (lines 17-39)
- `src/editor/composables/useSettingsPageEditor.js` — Dual provide composable, all needed methods verified
- `src/editor/composables/useScreenLayoutEditor.js` — `setScreenNestedField()`, `sendScreenLayoutToPreview()`, `commitScreenLayout()` verified
- `src/editor/components/layout/TabCrudSection.vue` — Full CRUD list pattern with add/delete/update
- `src/editor/components/layout/tabLayoutHelpers.js` — Pure function helper pattern (addTab, deleteTab, etc.)
- `src/editor/components/layout/LayoutControlsSection.vue` — Form controls + nested field mutation pattern
- `src/editor/components/widget/PanelConfigSection.vue` — Range slider + opacity display pattern
- `src/ui/SettingsScreen.js` lines 444-461, 500-522, 558-599 — Engine rendering of all three features (verified data path structure)
- `src/ui/sanitize.js` — clampField BOUNDS table (x, y, width, height, scale all defined)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing patterns
- Architecture: HIGH — all patterns verified in existing codebase with exact line references
- Pitfalls: HIGH — derived from actual data paths and engine code analysis
- Data paths: HIGH — verified against engine rendering code and composable methods

**Research date:** 2026-04-19
**Valid until:** 2026-05-19 (stable — no dependency changes expected)
