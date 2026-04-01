# Phase 11: PPT Page Editor - Research

**Researched:** 2026-03-31
**Domain:** Vue 3 visual editor — tree navigation, WYSIWYG canvas, inspector panel, Pinia store mutations
**Confidence:** HIGH

## Summary

Phase 11 replaces the existing command-timeline Scenes.vue (~527 lines) with a PPT-style page editor. The editor uses the page-based data format established in Phase 10 (scenes containing pages[] with background, characters[], dialogues[], bgm, se, transition). The architecture is a 3-panel layout: tree sidebar (220px) + canvas (flex) + inspector (300px), matching the existing TitleDesigner.vue pattern.

The existing infrastructure is strong: DraggableElement.vue is fully reusable for character drag positioning, CanvasPreview.vue's artboard/scaling pattern can be adapted (but not reused directly due to command-replay vs page-data mismatch), and the script.js store's pushState undo/redo works as-is. The main work is: (1) building the scene/page tree sidebar, (2) adapting canvas rendering from command-replay to page-direct, (3) building the inspector with collapsible sections for dialogues/characters/audio, and (4) adding page CRUD store helpers.

**Primary recommendation:** Build a new `PageEditor.vue` view with dedicated child components in `src/editor/components/page-editor/`, adapt (fork) CanvasPreview for page-based rendering, extend script.js store with page-specific helpers, and replace the Scenes.vue import in App.vue.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Tree-structured sidebar — scenes are expandable/collapsible nodes, pages are leaf items within each scene (like PPT "sections")
- **D-02:** Scene management in sidebar — users can add new scenes, rename scenes, and delete scenes directly from the sidebar
- **D-03:** Page management in sidebar — users can add pages (insert after selected), delete pages (with confirmation), and drag-reorder pages within a scene
- **D-04:** Simplified representation — each page thumbnail shows: page type icon (normal/choice/condition) + page number + first dialogue text snippet (lightweight, fast rendering)
- **D-05:** Button-triggered character addition — click "Add Character" button → character selector popup → select character and expression → character appears on canvas → drag to set position
- **D-06:** Canvas-based positioning — characters can be dragged on the 1280×720 canvas to set their x/y position. Existing DraggableElement component is reused.
- **D-07:** Dual-mode dialogue editing — right inspector panel has a dialogue list for management (add/delete/drag-reorder), AND the canvas dialogue box area supports inline click-to-edit for the currently selected dialogue
- **D-08:** Inspector and canvas are linked — selecting a dialogue in the inspector highlights it on canvas; clicking dialogue box on canvas selects it in inspector

### Agent's Discretion
- Page thumbnail visual styling details (colors, sizing, spacing)
- Inspector panel layout specifics (field grouping, section collapsing)
- Keyboard shortcuts for page operations
- Empty state displays (no scenes, no pages, no dialogues)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDITOR-01 | 用户可在左侧边栏以缩略图幻灯片形式查看场景中所有页面 | SceneTree.vue — 2-level tree (scenes → pages) with type icon + page number + dialogue snippet per D-04 |
| EDITOR-02 | 用户可创建新页面（插入到当前选中页面之后） | store helper `addPage(sceneId, afterIndex)` — insert into scene.pages[] array + pushState |
| EDITOR-03 | 用户可删除页面（带确认提示） | store helper `deletePage(sceneId, pageIndex)` with `confirm()` guard |
| EDITOR-04 | 用户可通过拖拽在侧栏中重新排列页面顺序 | HTML5 DnD on page items within same scene — dragstart/dragover/drop pattern |
| EDITOR-05 | 用户可在 1280×720 画布上所见即所得编辑页面内容 | PageCanvas.vue — adapted from CanvasPreview artboard pattern, page data as direct source |
| EDITOR-06 | 用户可在画布上添加、移除和拖拽定位角色 | DraggableElement.vue reuse + CharacterPicker popup + page.characters[] mutation |
| EDITOR-07 | 用户可在检查器面板中设置页面对话（说话人 + 文本） | PageInspector.vue dialogue section — list + detail editor with speaker dropdown + textarea |
| EDITOR-08 | 用户可为每页设置 BGM 和音效 | PageInspector.vue audio section — text input fields for BGM file + volume slider, SE file |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript
- **Style**: Dark theme, pure CSS, Chinese UI
- **No external component libraries** — custom Vue 3 components only
- **Vue conventions**: `<script setup>`, Composition API, Pinia stores with setup function
- **Naming**: Vue SFCs PascalCase, stores lowercase, composables camelCase with `use` prefix
- **Imports**: Explicit `.js` extensions for JS, no extensions for `.vue`, relative paths only
- **Error handling**: `{ success, error? }` return pattern, `alert()` for user-facing errors
- **All data changes** go through Pinia store with `pushState()` for undo/redo

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | SFC editor UI | Project standard, `<script setup>` |
| Pinia | ^3.0.4 | State management | Existing stores pattern with pushState undo/redo |
| Vite | ^6.3.0 | Build tool | Project standard |
| Electron | ^41.0.4 | Desktop shell | Project standard, IPC for file operations |

### Supporting (No new deps needed)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| HTML5 Drag and Drop API | Page reorder in sidebar | Built into browsers, no dep needed |
| ResizeObserver API | Canvas auto-scaling | Already used in CanvasPreview.vue |
| contenteditable / textarea | Inline dialogue editing on canvas | Browser-native, no dep needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTML5 DnD for reorder | vuedraggable / SortableJS | Adds external dep — project forbids external component libs. HTML5 DnD is sufficient for same-parent list reorder |
| Custom tree component | vue-treeselect | External dep forbidden. 2-level tree is simple enough for nested v-for |
| contenteditable for inline edit | Tiptap / ProseMirror | Massive overkill for single-field text editing |

**Installation:** No new packages needed. All functionality uses Vue 3 + browser APIs.

## Architecture Patterns

### Recommended Project Structure
```
src/editor/
├── views/
│   └── PageEditor.vue              ← NEW: Main 3-panel layout view
├── components/
│   ├── page-editor/
│   │   ├── SceneTree.vue           ← NEW: Left sidebar scene/page tree
│   │   ├── PageCanvas.vue          ← NEW: Center WYSIWYG canvas
│   │   ├── CanvasToolbar.vue       ← NEW: Toolbar above canvas
│   │   ├── PageInspector.vue       ← NEW: Right inspector (collapsible sections)
│   │   ├── CharacterPicker.vue     ← NEW: Modal popup for character selection
│   │   └── DialogueList.vue        ← NEW: Dialogue list+editor section in inspector
│   └── canvas/
│       ├── CanvasPreview.vue       ← KEEP: Used by old Scenes.vue (can be removed later)
│       └── DraggableElement.vue    ← KEEP: Reused directly by PageCanvas
├── composables/
│   ├── useCanvasState.js           ← KEEP: Used by old Scenes.vue (can be removed later)
│   └── usePageEditor.js            ← NEW: Page editor state (selected scene/page/dialogue, CRUD helpers)
└── stores/
    └── script.js                   ← MODIFY: Add page-specific getters/actions
```

### Pattern 1: 3-Panel View Layout (Established Pattern)
**What:** Main view composed of fixed-width sidebar + flex center + fixed-width inspector
**When to use:** All editor views (TitleDesigner, SettingsDesigner follow this pattern)
**Example:**
```vue
<!-- Matches existing Scenes.vue and TitleDesigner.vue pattern -->
<template>
  <div class="page-editor">
    <SceneTree class="sidebar" />      <!-- 220px fixed -->
    <div class="canvas-area">          <!-- flex: 1 -->
      <CanvasToolbar />
      <PageCanvas />
    </div>
    <PageInspector class="inspector" /> <!-- 300px fixed -->
  </div>
</template>

<style scoped>
.page-editor { display: flex; height: 100%; width: 100%; }
.sidebar { width: 220px; background: #252526; border-right: 1px solid #111; flex-shrink: 0; }
.canvas-area { flex: 1; display: flex; flex-direction: column; min-width: 400px; }
.inspector { width: 300px; background: #252526; border-left: 1px solid #111; flex-shrink: 0; }
</style>
```

### Pattern 2: Page-Direct Canvas State (Replaces Command-Replay)
**What:** Canvas renders from page data directly instead of replaying commands
**When to use:** Page editor canvas — the visual state IS the page data
**Why different from existing:** `useCanvasState.js` replays commands 0..N to derive bg/chars/dialogue. Page format already has the complete state per page — no replay needed.
**Example:**
```javascript
// NEW composable: usePageEditor.js
// Page data IS the canvas state — no command replay
const currentPage = computed(() => {
  if (!script.data || !selectedSceneId.value) return null;
  const scene = script.data.scenes[selectedSceneId.value];
  if (!scene || !scene.pages) return null;
  return scene.pages[selectedPageIndex.value] || null;
});

// Canvas reads directly from page object:
// page.background → bg image
// page.characters[] → character DraggableElements
// page.dialogues[selectedDialogueIndex] → dialogue box display
```

### Pattern 3: Store Mutation + pushState (Established Pattern)
**What:** Direct mutation of reactive data + call pushState() for undo snapshot
**When to use:** All data modifications in the editor
**Example from existing TitleDesigner pattern:**
```javascript
// script.js store — new page helpers follow same pattern as updateTitleScreen
function addPage(sceneId, afterIndex = -1) {
  const scene = data.value?.scenes?.[sceneId];
  if (!scene) return null;
  const newPage = {
    id: 'p' + (scene.pages.length + 1),
    type: 'normal',
    background: null,
    characters: [],
    bgm: null, se: null,
    dialogues: [{ speaker: null, text: '', expression: null }],
    transition: { type: 'fade', duration: 800 },
  };
  const insertAt = afterIndex >= 0 ? afterIndex + 1 : scene.pages.length;
  scene.pages.splice(insertAt, 0, newPage);
  pushState();
  return newPage;
}
```

### Pattern 4: Collapsible Inspector Sections
**What:** Inspector panel divided into collapsible sections with toggle headers
**When to use:** PageInspector with its 4 sections (page props, characters, dialogues, audio)
**Example from existing Scenes.vue:**
```vue
<div class="inspector-section">
  <div class="section-toggle" @click="showSection = !showSection">
    {{ showSection ? '▼' : '▶' }} 📄 页面属性
  </div>
  <template v-if="showSection">
    <!-- section content -->
  </template>
</div>
```

### Pattern 5: Two-Level Tree (Not Recursive)
**What:** Scene nodes with expandable page children — using nested v-for, not recursion
**When to use:** SceneTree sidebar — only 2 levels deep (scenes → pages), recursion unnecessary
**Example:**
```vue
<div v-for="(scene, sceneId) in script.data.scenes" :key="sceneId" class="scene-node">
  <div class="scene-header" @click="toggleScene(sceneId)">
    {{ expanded[sceneId] ? '▼' : '▶' }} 🎬 {{ scene.name }}
  </div>
  <div v-if="expanded[sceneId]" class="scene-pages">
    <div v-for="(page, idx) in scene.pages" :key="page.id"
      class="page-item" :class="{ active: isSelected(sceneId, idx) }"
      @click="selectPage(sceneId, idx)">
      {{ pageIcon(page.type) }} {{ idx + 1 }} {{ pageSnippet(page) }}
    </div>
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Don't use `component :is` for tree recursion** — the tree is only 2 levels, nested v-for is simpler and more performant
- **Don't create a separate canvas component per element type** — keep all canvas rendering in one PageCanvas.vue (consistent with existing CanvasPreview.vue which renders bg + characters + dialogue in one component)
- **Don't bypass Pinia store for data changes** — all mutations go through store or direct reactive mutation + pushState, never via local copies that get out of sync
- **Don't use v-model on deeply nested page properties** — use explicit @input handlers with store mutation to maintain undo/redo control (existing pattern from Scenes.vue inspector)
- **Don't import the old useCanvasState.js** — that composable replays commands; page format doesn't need replay

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag reorder | Custom mouse-based drag with tracking | HTML5 DnD API (dragstart/dragover/drop) | Browser handles drag image, cursor, scroll during drag. Project already uses this in AssetPanel.vue |
| Unique page IDs | Manual counter or UUID | `'p' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)` | Simple, unique enough for within-scene scope |
| Canvas scaling | Manual resize calculations | ResizeObserver + computed scale (existing pattern) | Already proven in CanvasPreview.vue — copy the pattern |
| Deep object cloning for undo | Manual recursive clone | `JSON.parse(JSON.stringify())` | Already used in script.js store's pushState — consistent and sufficient |
| Character list from project | Manual JSON traversal | `Object.entries(script.data.characters)` | Characters are keyed by ID at top level of script data |

**Key insight:** The project has established patterns for canvas scaling, drag handling, and undo/redo. This phase's complexity is in wiring these together with the page data format, not in inventing new infrastructure.

## Common Pitfalls

### Pitfall 1: Page ID Uniqueness After Reorder/Delete
**What goes wrong:** If page IDs are simple sequential numbers (`p1`, `p2`, `p3`), deleting `p2` and adding a new page could create duplicate `p1, p3, p3` IDs.
**Why it happens:** The demo script.json uses simple `p1`, `p2` IDs. Tempting to continue this pattern.
**How to avoid:** Generate IDs with timestamp+random suffix for new pages: `'p' + Date.now() + '-' + randomSuffix`. Only the demo data uses simple IDs.
**Warning signs:** Vue `:key` warnings about duplicate keys in v-for loops.

### Pitfall 2: Object Reactivity Loss on Page Mutations
**What goes wrong:** Adding properties to page objects that don't exist in the initial template breaks Vue reactivity.
**Why it happens:** Vue 3 Proxy-based reactivity handles new properties, but nested objects set to `null` then replaced with objects can cause issues with watchers.
**How to avoid:** Always initialize all page fields in the template (as Phase 10 schema does: `bgm: null, se: null, characters: [], dialogues: []`). When setting `bgm`, replace the whole object: `page.bgm = { file: '...', volume: 0.5 }`.
**Warning signs:** Inspector fields not updating when canvas changes, or vice versa.

### Pitfall 3: Canvas Scale Not Applied to DraggableElement Coordinates
**What goes wrong:** Drag positions are in screen pixels, but page data stores positions in 1280×720 canvas coordinates.
**Why it happens:** Mouse events report screen coordinates; need to divide by canvasScale.
**How to avoid:** DraggableElement.vue already handles this — it divides mouse deltas by `props.canvasScale`. Ensure `canvasScale` is always passed correctly from the PageCanvas ResizeObserver.
**Warning signs:** Characters jumping to wrong positions, especially when the canvas is scaled down.

### Pitfall 4: Undo/Redo Snapshot Timing
**What goes wrong:** Multiple rapid mutations (e.g., dragging a character) create too many undo snapshots, making undo useless (undoes tiny increments).
**Why it happens:** App.vue's deep watcher calls `pushState()` with 500ms debounce. If store helpers also call `pushState()` immediately, you get double snapshots.
**How to avoid:** Follow two strategies:
1. **Discrete operations** (add page, delete page, reorder): Call `pushState()` in the store helper immediately.
2. **Continuous operations** (dragging, typing): Let App.vue's debounced watcher handle snapshots — do NOT call pushState in move/input handlers.
**Warning signs:** Undo requires 20+ presses to go back one "logical" step.

### Pitfall 5: Scene Object Key Ordering
**What goes wrong:** `Object.entries(script.data.scenes)` may not maintain insertion order consistently across serialization cycles.
**Why it happens:** JSON.parse/stringify of objects technically preserves insertion order in V8, but the scenes object is keyed by ID (e.g., `start`, `path_friendly`).
**How to avoid:** If scene ordering matters for display, consider the current order from the data as the display order. The scene tree should iterate `Object.entries()` which preserves insertion order in V8/Chromium (which Electron uses). This is safe for this project.
**Warning signs:** Scenes appearing in unexpected order after save/reload.

### Pitfall 6: Inline Canvas Editing vs Inspector Sync
**What goes wrong:** Editing dialogue text on canvas doesn't update the inspector, or inspector changes don't reflect on canvas.
**Why it happens:** If canvas and inspector read from different data sources or use local state instead of the shared page object.
**How to avoid:** Both canvas inline edit and inspector MUST read/write the same `page.dialogues[selectedIndex]` object. Use a shared `selectedDialogueIndex` ref. Canvas text edit should modify `page.dialogues[selectedIndex].text` directly; inspector textarea should bind to the same property.
**Warning signs:** Text showing differently in canvas vs inspector.

### Pitfall 7: Character Picker Character List Empty
**What goes wrong:** Character picker shows empty list because `script.data.characters` is an empty object in new projects.
**Why it happens:** `defaultScript()` creates `characters: {}`. Users need to import characters in the resource library first, then the editor can reference them.
**How to avoid:** Character picker should read from `script.data.characters` (which is populated by the resource library/character editor). Show an empty state message: "暂无角色，请先在资源库中导入角色" when the object is empty.
**Warning signs:** "Add Character" button does nothing or shows blank popup.

## Code Examples

### Example 1: Page Data Template for New Pages
```javascript
// Source: Phase 10 schema (10-01-PLAN.md) + defaultScript() in electron/main.js
function createDefaultPage(scenePages) {
  return {
    id: 'p' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    type: 'normal',
    background: null,
    characters: [],
    bgm: null,
    se: null,
    dialogues: [
      { speaker: null, text: '', expression: null }
    ],
    transition: { type: 'fade', duration: 800 },
  };
}
```

### Example 2: HTML5 DnD Page Reorder Pattern
```javascript
// Drag reorder within a scene's page list
const dragState = ref({ sceneId: null, fromIndex: -1 });

function onDragStart(e, sceneId, pageIndex) {
  dragState.value = { sceneId, fromIndex: pageIndex };
  e.dataTransfer.effectAllowed = 'move';
  // Set drag data (required for Firefox)
  e.dataTransfer.setData('text/plain', String(pageIndex));
}

function onDragOver(e, sceneId, pageIndex) {
  // Only allow drop within same scene
  if (dragState.value.sceneId !== sceneId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDrop(e, sceneId, toIndex) {
  e.preventDefault();
  const { fromIndex } = dragState.value;
  if (fromIndex === toIndex || dragState.value.sceneId !== sceneId) return;

  const scene = script.data.scenes[sceneId];
  const [moved] = scene.pages.splice(fromIndex, 1);
  scene.pages.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
  script.pushState();
  dragState.value = { sceneId: null, fromIndex: -1 };
}
```

### Example 3: Character Picker Popup (Positioned Dropdown)
```vue
<!-- CharacterPicker.vue — modal overlay anchored to "Add Character" button -->
<template>
  <div class="char-picker-overlay" @click.self="$emit('close')">
    <div class="char-picker-panel">
      <div class="picker-header">选择角色</div>
      <div class="picker-list">
        <div v-for="(char, charId) in characters" :key="charId"
          class="picker-item" @click="selectCharacter(charId)">
          <span class="char-name">{{ char.name }}</span>
          <select v-model="selectedExpressions[charId]" @click.stop>
            <option v-for="(_, expr) in char.expressions" :key="expr" :value="expr">
              {{ expr }}
            </option>
          </select>
        </div>
      </div>
      <div v-if="Object.keys(characters).length === 0" class="picker-empty">
        暂无角色，请先在资源库中导入角色
      </div>
    </div>
  </div>
</template>
```

### Example 4: Inline Dialogue Edit on Canvas (Textarea Overlay)
```vue
<!-- Inside PageCanvas.vue — dialogue box area -->
<div class="canvas-dialogue" :style="dialogueStyle"
  @dblclick="startInlineEdit">
  <!-- Display mode -->
  <template v-if="!isEditingDialogue">
    <div class="dlg-speaker" v-if="currentDialogue?.speaker">
      {{ getSpeakerName(currentDialogue.speaker) }}
    </div>
    <div class="dlg-text">{{ currentDialogue?.text || '' }}</div>
  </template>
  <!-- Edit mode (triggered by double-click per D-07) -->
  <textarea v-else
    ref="inlineTextarea"
    :value="currentDialogue?.text"
    @input="onInlineTextChange($event.target.value)"
    @blur="stopInlineEdit"
    @keydown.escape="stopInlineEdit"
    class="inline-edit-textarea"
  />
</div>
```

### Example 5: Store Page CRUD Helpers
```javascript
// Additions to script.js store — matching updateTitleScreen pattern

/** Add a new scene with one default page */
function addScene(sceneId, sceneName) {
  if (!data.value) return;
  data.value.scenes[sceneId] = {
    name: sceneName,
    pages: [createDefaultPage()],
  };
  pushState();
}

/** Delete a scene by ID */
function deleteScene(sceneId) {
  if (!data.value?.scenes?.[sceneId]) return;
  delete data.value.scenes[sceneId];
  pushState();
}

/** Rename a scene */
function renameScene(sceneId, newName) {
  if (!data.value?.scenes?.[sceneId]) return;
  data.value.scenes[sceneId].name = newName;
  pushState();
}

/** Add a page to a scene, inserted after afterIndex (-1 = append) */
function addPage(sceneId, afterIndex = -1) {
  const scene = data.value?.scenes?.[sceneId];
  if (!scene) return null;
  const newPage = createDefaultPage();
  const insertAt = afterIndex >= 0 ? afterIndex + 1 : scene.pages.length;
  scene.pages.splice(insertAt, 0, newPage);
  pushState();
  return { page: newPage, index: insertAt };
}

/** Delete a page from a scene by index */
function deletePage(sceneId, pageIndex) {
  const scene = data.value?.scenes?.[sceneId];
  if (!scene || pageIndex < 0 || pageIndex >= scene.pages.length) return;
  scene.pages.splice(pageIndex, 1);
  pushState();
}

/** Reorder pages within a scene */
function reorderPages(sceneId, fromIndex, toIndex) {
  const scene = data.value?.scenes?.[sceneId];
  if (!scene) return;
  const [moved] = scene.pages.splice(fromIndex, 1);
  scene.pages.splice(toIndex, 0, moved);
  pushState();
}
```

### Example 6: App.vue Tab Integration Change
```javascript
// In App.vue — replace Scenes import with PageEditor
// Before:
import Scenes from './views/Scenes.vue';
// After:
import PageEditor from './views/PageEditor.vue';

// Update tabComponents map:
const tabComponents = {
  'scenes': markRaw(PageEditor),  // Changed from Scenes
  'title': markRaw(TitleDesigner),
  // ... rest unchanged
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Command-timeline editor (Scenes.vue) | PPT page editor (PageEditor.vue) | Phase 11 (v0.3) | Simpler mental model — each page is self-contained visual state |
| Command-replay composable (useCanvasState.js) | Direct page-data rendering | Phase 11 | Canvas reads page data directly, no replay computation needed |
| Flat scene list (sidebar) | Tree-structured scene/page hierarchy | Phase 11 | Users navigate like PPT — expand scene, click page |
| commands[] array per scene | pages[] array per scene | Phase 10 | Foundation already established — editor adapts to it |

**Deprecated/outdated after this phase:**
- `Scenes.vue` — replaced by `PageEditor.vue` (can be deleted)
- `useCanvasState.js` — command-replay composable no longer needed (can be deleted)
- `CanvasPreview.vue` — only used by Scenes.vue; if Scenes.vue is removed, this can be deleted too

## Open Questions

1. **Should Scenes.vue and related files be deleted or kept?**
   - What we know: Phase 11 replaces Scenes.vue functionality entirely. No other component imports it.
   - What's unclear: Whether to delete now or defer cleanup.
   - Recommendation: Replace the import in App.vue but keep Scenes.vue file in the repo until Phase 11 is fully verified. Delete as last cleanup task.

2. **Scene ID generation for new scenes**
   - What we know: Existing scenes use human-readable IDs like `start`, `path_friendly`. The `addScene` function in current Scenes.vue uses `prompt()` to ask the user.
   - What's unclear: Whether to keep prompt-based IDs or auto-generate.
   - Recommendation: Use `prompt()` for scene ID (matching existing UX pattern). Scene IDs are used as jump targets in choice pages, so human-readable IDs are important.

3. **Resource picker placeholders for Phase 12**
   - What we know: Phase 12 adds visual pickers for backgrounds, characters, audio. Phase 11 needs basic input fields as placeholders.
   - What's unclear: How tightly to couple the placeholder UI to future picker integration.
   - Recommendation: Use text input fields with placeholder hints (e.g., "选择背景...") that Phase 12 will replace with picker components. Add click handlers that show `alert('资源选择器将在下个版本添加')` so users know the feature is planned.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDITOR-01 | Sidebar shows page thumbnails per scene | manual-only | N/A — requires Electron + Vue rendering | ❌ |
| EDITOR-02 | Add page inserts after selected | manual-only | N/A — requires Electron + Vue rendering | ❌ |
| EDITOR-03 | Delete page with confirmation | manual-only | N/A — requires Electron + Vue rendering | ❌ |
| EDITOR-04 | Drag reorder pages in sidebar | manual-only | N/A — requires DOM drag events | ❌ |
| EDITOR-05 | Canvas WYSIWYG preview at 1280×720 | manual-only | N/A — requires visual verification | ❌ |
| EDITOR-06 | Add/remove/drag characters on canvas | manual-only | N/A — requires DOM interaction | ❌ |
| EDITOR-07 | Inspector dialogue editing (speaker+text) | manual-only | N/A — requires Electron + Vue rendering | ❌ |
| EDITOR-08 | Set BGM/SE per page | manual-only | N/A — requires Electron + Vue rendering | ❌ |

**Justification for manual-only:** The project has no test framework configured, and all requirements involve Vue component rendering + Electron IPC which require end-to-end testing infrastructure not yet in place. The store helper functions (addPage, deletePage, reorderPages) could theoretically be unit tested, but the project has established a no-test pattern across 10 completed phases.

### Sampling Rate
- **Per task commit:** Manual visual verification in Electron dev mode (`npm run dev`)
- **Per wave merge:** Full walkthrough of all EDITOR requirements
- **Phase gate:** Full suite of EDITOR-01 through EDITOR-08 verified manually

### Wave 0 Gaps
- No test infrastructure exists — entire project operates without tests
- Manual verification via `npm run dev` is the established validation method

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** — All source files read directly:
  - `src/editor/views/Scenes.vue` (527 lines, current editor to replace)
  - `src/editor/components/canvas/CanvasPreview.vue` (296 lines, canvas pattern reference)
  - `src/editor/components/canvas/DraggableElement.vue` (139 lines, reusable drag component)
  - `src/editor/stores/script.js` (107 lines, Pinia store with undo/redo)
  - `src/editor/App.vue` (255 lines, tab navigation integration point)
  - `src/editor/views/TitleDesigner.vue` (3-panel layout reference pattern)
  - `src/editor/composables/useCanvasState.js` (111 lines, command-replay composable)
  - `src/editor/stores/assets.js` (179 lines, asset access pattern)
  - `src/editor/stores/project.js` (80 lines, project management pattern)
  - `public/game/script.json` (261 lines, page-based data format reference)
  - `electron/main.js` (defaultScript function, page format template)
- **Phase 10 plan** — `10-01-PLAN.md` documents complete page data schema contract
- **Phase 11 UI spec** — `11-UI-SPEC.md` documents all layout, dimensions, colors, copy, interactions

### Secondary (MEDIUM confidence)
- **HTML5 Drag and Drop API** — Well-documented browser standard, already used in AssetPanel.vue for asset drag
- **Vue 3 Composition API patterns** — Established throughout codebase, 10 phases of precedent

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing tech
- Architecture: HIGH — follows established 3-panel pattern from TitleDesigner, proven DraggableElement reuse
- Pitfalls: HIGH — identified from direct codebase analysis and Phase 10 schema understanding
- File organization: HIGH — follows existing component directory structure patterns
- Data format: HIGH — Phase 10 schema fully implemented and verified in script.json

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (60 days — stable stack, no external deps)
