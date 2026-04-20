# Phase 57: Tab & Layout Editor - Research

**Researched:** 2026-04-18
**Domain:** Vue 3 editor UI — form controls for configuring engine tab/layout parameters
**Confidence:** HIGH

## Summary

Phase 57 extends `SettingsSection.vue` (currently 159 lines) with three major UI sections: (1) Tab CRUD with label/icon editing, (2) a checkbox matrix for assigning SETTING_DEFS keys to tabs, and (3) layout controls (columns, row styles, tab position). The engine already renders all structural parameters (Phases 53-55), so this phase is purely editor-side Vue component work.

The existing composable (`useScreenLayoutEditor.js`) provides all needed data access and preview/commit methods — no new wiring is required. The key challenge is UI complexity: the setting matrix is a 9-row × N-column interactive grid with exclusive assignment logic, and the tab CRUD needs add/delete/inline-edit with immediate preview updates.

**Primary recommendation:** Split SettingsSection into 3-4 sub-components (TabCrudSection, SettingMatrix, LayoutControls + parent SettingsSection orchestrator) to keep each file under ~200 lines and maintainable, following the existing provide/inject pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01/D-02:** All controls live inside SettingsSection.vue (inside ScreenLayoutEditor), not a new view. New sections below existing content area fields, following `form-group-title` pattern.
- **D-03–D-07:** Tab CRUD — inline list of rows (label input + icon path input + delete btn). "添加标签" button creates tab with default "新标签". Delete removes tab, keys become unassigned. No drag-and-drop reordering.
- **D-08/D-09:** Icon is text input field per tab row (asset path). No asset picker.
- **D-10–D-15:** Checkbox matrix — rows=SETTING_DEFS keys, columns=tabs. Exclusive assignment (check one → uncheck others). Unassigned keys shown in "未分配" indicator. Horizontal scroll for many tabs.
- **D-16–D-18:** Layout section — column count radio (1/2), row dividers checkbox, zebra checkbox, value labels checkbox, label position radio (左侧/顶部), label width number input (visible only when left).
- **D-19/D-20:** Tab position radio (顶部/侧边) in tab bar section, sidebar width field visible only when 'left'.
- **D-21/D-22:** All edits use existing composable — @input→`sendScreenLayoutToPreview()` (debounced), @change→`commitScreenLayout()`. Tab CRUD immediately calls `sendScreenLayoutToPreview()`.

### Agent's Discretion
- Exact CSS for the setting matrix (table vs grid)
- Scrolling behavior within the matrix when many settings/tabs exist
- Whether to split SettingsSection.vue into sub-components or keep as single file
- Test structure and verification approach

### Deferred Ideas (OUT OF SCOPE)
- Asset picker for tab icon selection — future enhancement
- Tab drag-and-drop reordering — future enhancement
- Per-tab preview highlighting in iframe — future enhancement
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDITOR-01 | Tab 编辑器 — 可视化增删改 Tab（标签名、图标选择、设置项分配 checkbox 矩阵） | Tab CRUD (D-03–D-07) + icon text input (D-08/D-09) + matrix (D-10–D-15). SETTING_DEFS has 9 keys. Engine expects `tabBar.tabs[]` as `{label, icon?, settingKeys?}[]` per Phase 53. |
| EDITOR-02 | 布局控制 — columns 切换（1/2）、行样式开关（分隔线/条纹/值标签）、标签宽度/位置调整 | Layout controls (D-16–D-18). Engine consumes `contentArea.columns` and `contentArea.itemStyle.*` per Phase 54. |
| EDITOR-04 | Tab 位置切换 — tabBar.position 在 top/left 之间切换，UI 实时展示切换效果 | Radio group (D-19/D-20). Engine consumes `tabBar.position` and `tabBar.width` per Phase 55. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | Component framework | Project standard, `<script setup>` SFCs |
| Pinia | ^3.0.4 | State management | Script store holds settings data |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vue (computed/ref/reactive) | ^3.5.31 | Reactive state for tab list, matrix state | All form bindings |

### No Additional Dependencies
This phase uses only existing project libraries. No new npm packages needed — it's purely Vue component template + logic extending existing patterns.

## Architecture Patterns

### Recommended Project Structure
```
src/editor/components/layout/
├── SettingsSection.vue         # Orchestrator — includes sub-components
├── TabCrudSection.vue          # Tab CRUD list + icon inputs + tab position toggle
├── SettingMatrix.vue           # Checkbox matrix for key→tab assignment
└── LayoutControlsSection.vue   # Column count, row styles, label position
```

### Pattern 1: Composable Injection (Existing)
**What:** Child components use `useScreenLayoutEditor()` to access shared state and preview methods via provide/inject.
**When to use:** Every sub-component needs `getActiveScreenConfig()`, `sendScreenLayoutToPreview()`, `commitScreenLayout()`.
**Example:**
```javascript
// Source: src/editor/composables/useScreenLayoutEditor.js
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';

const editor = useScreenLayoutEditor();
const cfg = computed(() => editor.getActiveScreenConfig() || {});
const tabBar = computed(() => cfg.value.tabBar || {});
```

### Pattern 2: Nested Field Update (Existing)
**What:** Set a field within a nested config group, then trigger preview.
**When to use:** All config field changes (tab position, column count, itemStyle properties).
**Example:**
```javascript
// Source: src/editor/components/layout/SettingsSection.vue (existing pattern)
function onNested(group, field, value) {
  editor.setScreenNestedField(group, field, value);
}
function commit() {
  editor.commitScreenLayout();
}
```

### Pattern 3: Deep Nested Field Update (NEW - needed for itemStyle)
**What:** Update a field 2+ levels deep (e.g., `contentArea.itemStyle.showDividers`).
**When to use:** All `itemStyle.*` properties, `tabBar.tabs[i].settingKeys`.
**Example:**
```javascript
// Pattern for contentArea.itemStyle fields
function setItemStyle(field, value) {
  const cfg = editor.getActiveScreenConfig();
  if (!cfg) return;
  cfg.contentArea ??= {};
  cfg.contentArea.itemStyle ??= {};
  cfg.contentArea.itemStyle[field] = value;
  editor.sendScreenLayoutToPreview();
}
```

### Pattern 4: Tab Array Mutation (NEW - for tab CRUD)
**What:** Add/remove/modify entries in `tabBar.tabs[]` array, then trigger preview.
**When to use:** Add tab, delete tab, rename tab, change tab icon, reassign setting keys.
**Example:**
```javascript
function addTab() {
  const cfg = editor.getActiveScreenConfig();
  if (!cfg) return;
  cfg.tabBar ??= {};
  cfg.tabBar.tabs ??= [];
  cfg.tabBar.tabs.push({ label: '新标签', settingKeys: [] });
  editor.sendScreenLayoutToPreview();
}

function deleteTab(index) {
  const cfg = editor.getActiveScreenConfig();
  if (!cfg) return;
  cfg.tabBar.tabs.splice(index, 1);
  editor.sendScreenLayoutToPreview();
}
```

### Pattern 5: Checkbox Matrix with Exclusive Assignment (NEW)
**What:** A grid where checking a cell in one column auto-unchecks it in all other columns.
**When to use:** Setting key → tab assignment.
**Example:**
```javascript
function toggleKeyAssignment(settingKey, tabIndex) {
  const cfg = editor.getActiveScreenConfig();
  if (!cfg) return;
  const tabs = cfg.tabBar?.tabs || [];
  // Remove key from ALL tabs first
  for (const tab of tabs) {
    if (!tab.settingKeys) continue;
    const idx = tab.settingKeys.indexOf(settingKey);
    if (idx !== -1) tab.settingKeys.splice(idx, 1);
  }
  // Add to target tab (toggle: if it was already there, it's now removed)
  if (tabs[tabIndex]) {
    tabs[tabIndex].settingKeys ??= [];
    // Check if we should add (wasn't already assigned to this tab)
    // Logic: if clicked was previously checked → now uncheck (already removed above)
    // if clicked was not checked → now check
    tabs[tabIndex].settingKeys.push(settingKey);
  }
  editor.sendScreenLayoutToPreview();
}
```

### Anti-Patterns to Avoid
- **Mutating computed values directly:** Always access config via `getActiveScreenConfig()` method (returns mutable ref). Computed wrappers are for template reactivity only.
- **Forgetting to call sendScreenLayoutToPreview:** Every data change MUST trigger preview or the iframe gets stale.
- **Creating new provide/inject symbols:** Reuse the existing `SCREEN_LAYOUT_EDITOR_KEY` — don't create per-sub-component injection.
- **Adding global state for tab list:** Tab data lives in `getActiveScreenConfig().tabBar.tabs` — don't duplicate in component-local reactive state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced preview | Custom debounce | `sendScreenLayoutToPreview()` (already 200ms debounced) | Already implemented in composable |
| Undo stack | Custom undo | `commitScreenLayout()` (calls pushState via store) | Already wired to undo/redo system |
| Tab data normalization | Custom parser | `normalizeTabs()` + `resolveTabSettingKeys()` from engine | Engine already has the canonical logic |
| Config field mutation | Direct assignment | `setScreenNestedField(group, field, value)` for simple fields | Handles null-coalescing + preview trigger |

**Key insight:** The composable already handles all data flow complexity. The editor components only need to (1) read config via computed getters, (2) mutate config via direct object manipulation, and (3) call `sendScreenLayoutToPreview()` / `commitScreenLayout()` at appropriate times.

## Common Pitfalls

### Pitfall 1: Reactivity Loss on Deep Nested Objects
**What goes wrong:** Vue reactivity doesn't track new properties added with `??=` on deep nested objects (e.g., `cfg.contentArea.itemStyle.showDividers`).
**Why it happens:** `getActiveScreenConfig()` returns the raw Pinia store ref. Adding new nested objects after initial render may not trigger template re-render.
**How to avoid:** Use `computed()` wrappers that re-read from the store on each access. For template display, always use computed getters. For mutations, always call `sendScreenLayoutToPreview()` after (which clones the data for postMessage anyway).
**Warning signs:** Template shows stale values after a change, or checkbox doesn't update visually.

### Pitfall 2: Matrix State Desyncs with Config
**What goes wrong:** Checkbox checked state gets out of sync with actual `settingKeys[]` arrays after add/delete tab.
**Why it happens:** If matrix renders from a cached snapshot instead of live computed data.
**How to avoid:** Compute checkbox state directly from `cfg.tabBar.tabs[tabIdx].settingKeys.includes(key)` in template — never cache matrix state locally.
**Warning signs:** After deleting a tab, checkboxes show stale assignments.

### Pitfall 3: Commit Timing on Tab CRUD
**What goes wrong:** Adding/deleting tabs doesn't push undo state, so undo reverses multiple operations at once.
**Why it happens:** Only calling `sendScreenLayoutToPreview()` (debounced) without `commitScreenLayout()`.
**How to avoid:** For structural changes (add/delete tab), call `commitScreenLayout()` immediately after mutation. For inline edits (label typing), use @input→preview, @change→commit pattern.
**Warning signs:** Pressing Ctrl+Z after adding 3 tabs reverts all 3 at once.

### Pitfall 4: Missing Default Tab Initialization
**What goes wrong:** `tabBar.tabs` is undefined/empty when user opens editor for the first time.
**Why it happens:** Existing themes may not have `tabBar.tabs` defined (backward compat → engine falls back to defaults).
**How to avoid:** When rendering tab CRUD, if `tabBar.tabs` is absent, show a "use default" state OR auto-initialize from `DEFAULT_TAB_LABELS` + `SETTING_GROUP_KEYS` on first edit.
**Warning signs:** Empty tab list when opening editor for an existing theme.

### Pitfall 5: Exclusive Checkbox Toggle Logic Errors
**What goes wrong:** Clicking a checkbox removes key from target tab instead of adding it (or vice versa).
**Why it happens:** Conflating "remove from all" with "toggle in target" — need clear two-step: remove everywhere, then conditionally add.
**How to avoid:** Implement as: if key WAS in target tab → just remove (leave unassigned). If key was NOT in target tab → remove from old tab, add to target.
**Warning signs:** Can never assign a key, or clicking always unassigns.

## Code Examples

### Tab CRUD Template Pattern
```html
<!-- Source: follows SaveLoadSection.vue + SettingsSection.vue patterns -->
<h4 class="form-group-title">标签栏</h4>

<!-- Tab position toggle -->
<div class="config-row">
  <label class="config-label">位置</label>
  <label class="radio-label">
    <input type="radio" :checked="tabPosition === 'top'" @change="setTabPosition('top')" /> 顶部
  </label>
  <label class="radio-label">
    <input type="radio" :checked="tabPosition === 'left'" @change="setTabPosition('left')" /> 侧边
  </label>
</div>

<!-- Sidebar width (only when left) -->
<div class="config-row" v-if="tabPosition === 'left'">
  <label class="config-label">侧边栏宽度</label>
  <input type="number" :value="tabBar.width ?? ''" @input="onTabBarNum('width', $event)" @change="commit" min="100" max="400" class="config-num" placeholder="180" />
  <span class="unit">px</span>
</div>

<!-- Tab list -->
<div class="tab-list">
  <div v-for="(tab, idx) in tabs" :key="idx" class="tab-row">
    <input type="text" :value="tab.label" @input="onTabLabel(idx, $event.target.value)" @change="commit" class="config-text tab-label-input" />
    <input type="text" :value="tab.icon || ''" @input="onTabIcon(idx, $event.target.value || null)" @change="commit" class="config-text tab-icon-input" placeholder="图标路径" />
    <button class="btn-delete" @click="deleteTab(idx)">×</button>
  </div>
</div>
<button class="btn-add" @click="addTab">+ 添加标签</button>
```

### Checkbox Matrix Template Pattern
```html
<!-- Source: new pattern for exclusive-assignment grid -->
<h4 class="form-group-title">设置项分配</h4>
<div class="matrix-container">
  <table class="setting-matrix">
    <thead>
      <tr>
        <th class="matrix-key-header">设置项</th>
        <th v-for="(tab, tIdx) in tabs" :key="tIdx" class="matrix-tab-header">{{ tab.label }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="key in allSettingKeys" :key="key">
        <td class="matrix-key-label">{{ settingLabel(key) }}</td>
        <td v-for="(tab, tIdx) in tabs" :key="tIdx" class="matrix-cell">
          <input
            type="checkbox"
            :checked="isKeyInTab(key, tIdx)"
            @change="toggleKeyAssignment(key, tIdx, $event.target.checked)"
          />
        </td>
      </tr>
    </tbody>
  </table>
</div>
<!-- Unassigned indicator -->
<div v-if="unassignedKeys.length" class="unassigned-notice">
  未分配: {{ unassignedKeys.map(k => settingLabel(k)).join(', ') }}
</div>
```

### Layout Controls Template Pattern
```html
<!-- Source: follows existing config-row pattern -->
<h4 class="form-group-title">布局</h4>

<!-- Columns -->
<div class="config-row">
  <label class="config-label">列数</label>
  <label class="radio-label">
    <input type="radio" :checked="columns === 1" @change="setColumns(1)" /> 1
  </label>
  <label class="radio-label">
    <input type="radio" :checked="columns === 2" @change="setColumns(2)" /> 2
  </label>
</div>

<!-- Row style toggles -->
<div class="config-row">
  <label class="config-label">分隔线</label>
  <input type="checkbox" :checked="itemStyle.showDividers" @change="setItemStyle('showDividers', $event.target.checked); commit()" />
</div>
<div class="config-row">
  <label class="config-label">条纹背景</label>
  <input type="checkbox" :checked="itemStyle.alternateBackground" @change="setItemStyle('alternateBackground', $event.target.checked); commit()" />
</div>
<div class="config-row">
  <label class="config-label">值标签</label>
  <input type="checkbox" :checked="itemStyle.showValueLabel !== false" @change="setItemStyle('showValueLabel', $event.target.checked); commit()" />
</div>

<!-- Label position -->
<div class="config-row">
  <label class="config-label">标签位置</label>
  <label class="radio-label">
    <input type="radio" :checked="labelPosition === 'left'" @change="setItemStyle('labelPosition', 'left'); commit()" /> 左侧
  </label>
  <label class="radio-label">
    <input type="radio" :checked="labelPosition === 'top'" @change="setItemStyle('labelPosition', 'top'); commit()" /> 顶部
  </label>
</div>

<!-- Label width (only when position=left) -->
<div class="config-row" v-if="labelPosition === 'left'">
  <label class="config-label">标签宽度</label>
  <input type="number" :value="itemStyle.labelWidth ?? ''" @input="setItemStyleNum('labelWidth', $event)" @change="commit" min="60" max="300" class="config-num" placeholder="140" />
  <span class="unit">px</span>
</div>
```

### Script Logic Pattern (composable usage)
```javascript
// Source: extends pattern from SettingsSection.vue
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import { SETTING_DEFS } from '../../../engine/settingDefs.js';

const editor = useScreenLayoutEditor();

const cfg = computed(() => editor.getActiveScreenConfig() || {});
const tabBar = computed(() => cfg.value.tabBar || {});
const tabs = computed(() => tabBar.value.tabs || []);
const area = computed(() => cfg.value.contentArea || {});
const itemStyle = computed(() => area.value.itemStyle || {});
const tabPosition = computed(() => tabBar.value.position || 'top');
const columns = computed(() => area.value.columns || 1);
const labelPosition = computed(() => itemStyle.value.labelPosition || 'left');

const allSettingKeys = Object.keys(SETTING_DEFS);

function settingLabel(key) {
  return SETTING_DEFS[key]?.label || key;
}

function isKeyInTab(key, tabIndex) {
  const tab = tabs.value[tabIndex];
  return tab?.settingKeys?.includes(key) ?? false;
}

const unassignedKeys = computed(() => {
  const assigned = new Set();
  for (const tab of tabs.value) {
    for (const k of tab.settingKeys || []) assigned.add(k);
  }
  return allSettingKeys.filter(k => !assigned.has(k));
});
```

## Data Schema Reference

### settingsScreen.tabBar (Phase 53/55)
```json
{
  "tabBar": {
    "position": "top",           // 'top' | 'left' (Phase 55)
    "width": 180,                // sidebar width in px, only when position='left'
    "height": 56,                // tab bar height in px (top mode)
    "background": "#333",        // tab bar background color
    "tabs": [
      {
        "label": "声音",
        "icon": "ui/icon-audio.png",
        "settingKeys": ["master-volume", "bgm-volume", "se-volume", "voice-volume"]
      },
      {
        "label": "画面",
        "icon": null,
        "settingKeys": ["dialogue-opacity", "window-mode"]
      },
      {
        "label": "游戏",
        "settingKeys": ["text-speed", "auto-speed", "skip-mode"]
      }
    ]
  }
}
```

### settingsScreen.contentArea.itemStyle (Phase 54)
```json
{
  "contentArea": {
    "x": 40, "y": 160, "width": 1200, "height": 500,
    "columns": 2,
    "itemStyle": {
      "showDividers": true,
      "alternateBackground": false,
      "labelPosition": "left",
      "labelWidth": 140,
      "showValueLabel": true
    }
  }
}
```

### SETTING_DEFS Keys (all 9)
| Key | Label | Type |
|-----|-------|------|
| `bgm-volume` | BGM 音量 | slider |
| `se-volume` | SE 音量 | slider |
| `voice-volume` | 语音音量 | slider |
| `text-speed` | 文字速度 | slider |
| `auto-speed` | 自动播放速度 | slider |
| `window-mode` | 窗口模式 | select |
| `dialogue-opacity` | 对话框透明度 | slider |
| `master-volume` | 总音量 | slider |
| `skip-mode` | 快进模式 | select |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `SETTING_GROUP_KEYS` | `tabBar.tabs[].settingKeys` config | Phase 53 | Editor can now configure which keys go in which tab |
| Single column only | `contentArea.columns: 1\|2` | Phase 54 | Editor can toggle column count |
| Top tabs only | `tabBar.position: 'top'\|'left'` | Phase 55 | Editor can switch to sidebar mode |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | none (uses `node --test` CLI) |
| Quick run command | `node --test tests/tabLayoutEditor.test.js` |
| Full suite command | `node --test tests/*.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDITOR-01 | Tab CRUD: add/remove/rename + matrix assignment | unit | `node --test tests/tabLayoutEditor.test.js` | ❌ Wave 0 |
| EDITOR-02 | Layout controls write correct config fields | unit | `node --test tests/tabLayoutEditor.test.js` | ❌ Wave 0 |
| EDITOR-04 | Tab position toggle sets tabBar.position | unit | `node --test tests/tabLayoutEditor.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/tabLayoutEditor.test.js`
- **Per wave merge:** `node --test tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/tabLayoutEditor.test.js` — covers EDITOR-01, EDITOR-02, EDITOR-04 (data logic, not DOM)
- [ ] Test helpers: mock `getActiveScreenConfig()` return to simulate editor state

### Testing Strategy Notes
Since this is a Vue editor-side phase with no JSDOM available (Node.js `node:test`), tests should focus on **data logic** rather than DOM/component rendering:
- Tab CRUD array operations (add, delete, rename)
- Exclusive assignment toggle logic
- Computed state derivations (unassigned keys, isKeyInTab)
- Config field mutation helpers

Component rendering is verified via manual iframe preview (success criterion #5).

## Open Questions

1. **Default tab initialization strategy**
   - What we know: Engine falls back to `DEFAULT_TAB_LABELS` + `SETTING_GROUP_KEYS` when `tabBar.tabs` is absent. Editor currently shows nothing for tabs.
   - What's unclear: Should the editor pre-populate the tabs array with defaults on first open, or show an "Initialize" button?
   - Recommendation: Pre-populate from defaults (`['声音','画面','游戏']` with matching `SETTING_GROUP_KEYS`) when `tabBar.tabs` is undefined. This gives users a starting point to edit.

2. **Component split granularity**
   - What we know: Agent has discretion. Current SettingsSection is 159 lines. With all Phase 57 additions, it would be ~500+ lines.
   - Recommendation: Split into 3 sub-components (TabCrudSection, SettingMatrix, LayoutControlsSection) imported by SettingsSection. Each handles one `form-group-title` section.

## Sources

### Primary (HIGH confidence)
- `src/editor/components/layout/SettingsSection.vue` — Current implementation (159 lines)
- `src/editor/composables/useScreenLayoutEditor.js` — All preview/commit methods (184 lines)
- `src/engine/settingDefs.js` — SETTING_DEFS registry (9 keys, 267 lines)
- `src/ui/SettingsScreen.js` — Engine structured rendering (tab/layout consumption)
- `src/ui/widgets/TabWidget.js` — Tab data format (accepts `{label, icon?}[]`)
- `.planning/phases/53-configurable-tabs-engine/53-CONTEXT.md` — Tab data format decisions
- `.planning/phases/54-content-layout-row-styling/54-CONTEXT.md` — Layout params
- `.planning/phases/55-left-tab-mode-decorations/55-CONTEXT.md` — Left-tab mode

### Secondary (MEDIUM confidence)
- Pattern extrapolation from `SaveLoadSection.vue` and `GameMenuSection.vue` — same composable/form patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, pure Vue component work
- Architecture: HIGH — extending well-established editor patterns with full source code visibility
- Pitfalls: HIGH — identified from actual code patterns and reactive system understanding

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stable — internal project patterns, no external dependencies)
