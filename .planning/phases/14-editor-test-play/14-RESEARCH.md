# Phase 14: Editor Test Play — Research

**Researched:** 2026-04-01
**Phase:** 14 — Editor Test Play
**Goal:** Users can preview their game directly inside the editor without leaving the editing workflow

## RESEARCH COMPLETE

## Executive Summary

Phase 14 implementation is well-supported by existing codebase. ScriptEngine already has `restoreState()` + `resetRenderState()` + `renderCurrentPage()` — the exact API chain needed to start from any page. The editor's PageEditor.vue has a clean `canvas-area` div for iframe insertion. Key work: add postMessage listener to engine, add `_previewMode` flag, modify PageEditor for iframe toggle, implement READY handshake.

## Technical Findings

### 1. Engine Initialization (src/main.js lines 382-421)

The `init()` function follows this sequence:
1. `engine.load('/game/script.json')` — fetch from disk
2. Load custom fonts from `engine.script.assets.fonts`
3. Configure title screen title
4. Apply title/settings screen custom layouts
5. `showTitle()` — display title screen

**For test play:** Steps 1-5 are NOT needed. Script data comes via postMessage, no title screen needed. Direct path: `engine.script = data` → `restoreState()` → `resetRenderState()` → `renderCurrentPage()`.

### 2. Engine State Restoration (src/engine/ScriptEngine.js)

**restoreState() (lines 165-173):**
```javascript
restoreState(state) {
  this.currentScene = state.currentScene;
  this.pageIndex = state.pageIndex ?? 0;
  this.dialogueIndex = state.dialogueIndex ?? 0;
  this.variables = new Map(Object.entries(state.variables || {}));
  this.history = state.history || [];
  this.ended = false;
  this.waiting = false;
}
```

**resetRenderState() (lines 180-182):** Clears `_prevPageCharIds`, `_currentBgmFile`, `_currentBg` — prevents stale diffing on first render.

**renderCurrentPage() (lines 188-200):** Gets current page, renders visual state (background, characters, BGM), then starts dialogue/choice.

✅ This API chain works perfectly for starting from any page — confirmed by Phase 10 D-03 (self-contained pages).

### 3. Engine Constructor (lines 31-65)

Properties: `script`, `currentScene`, `pageIndex`, `dialogueIndex`, `variables` (Map), `waiting`, `ended`, `history`, render tracking (`_prevPageCharIds`, `_currentBgmFile`, `_currentBg`).

**No `_previewMode` exists** — must be added to constructor.

### 4. ESC / Menu Handling (src/main.js lines 230-263)

ESC priority chain: settings overlay → game menu toggle. Quick controls (line 209-227) include menu button.

**previewMode guards needed at:**
- ESC handler (line 240): `if (engine._previewMode) return;` before `gameMenu.toggle()`
- Context menu (line 289): add `!engine._previewMode` condition
- Quick controls menu button (line 224): add guard

### 5. postMessage — NOT Currently Implemented

No `window.addEventListener('message', ...)` exists in src/main.js. Best insertion point: after `applyConfig()` (line 89), before engine event handlers (line 91).

**Proposed protocol:**
```
Editor → Engine:  {type: 'start', script: {...}, sceneId, pageIndex, previewMode: true}
Engine → Editor:  {type: 'ready'}           // After init, before start
Engine → Editor:  {type: 'ended'}           // Game reached end
Editor → Engine:  {type: 'stop'}            // User stopped test play
Editor → Engine:  {type: 'mute', muted: bool}  // Mute toggle
```

### 6. PageEditor.vue Structure (lines 1-37)

```
.page-editor
  .sidebar → SceneTree
  .canvas-area → CanvasToolbar + PageCanvas ← iframe replaces PageCanvas
  .inspector → PageInspector
```

Canvas area uses `flex: 1` layout, `min-width: 400px`, `background: #1e1e1e`.

**Modification:** Add `v-if="!isPreviewMode"` on PageCanvas, `v-else` for iframe wrapper.

### 7. usePageEditor.js State

Tracks: `selectedSceneId`, `selectedPageIndex`, `selectedDialogueIndex`, `selectedCharIndex`, plus modal visibility refs.

Computed: `currentScene`, `currentPage`, `currentDialogue`.

**For test play:** `selectedSceneId.value` + `selectedPageIndex.value` provide the exact start position.

**New state to add:** `isPreviewMode` ref, `previewIframeRef`.

### 8. Script Store (src/editor/stores/script.js)

`data` is a `ref(null)` — reactive. When loaded, contains full script JSON: `meta`, `scenes`, `characters`, `assets`, `ui`.

**Critical:** `data.value` is a Vue Proxy. Must use `JSON.parse(JSON.stringify(data.value))` before postMessage. The store already uses this pattern in `pushState()` for undo/redo snapshots.

### 9. App.vue openPreview (lines 213-216)

Currently opens separate Electron window via `ipcRenderer.invoke('open-preview', project.projectPath)`. Phase 14's inline preview is a separate feature — openPreview can remain as-is or be refactored.

### 10. iframe Loading Target

`index.html` serves as the engine host page. It contains:
- `<div id="game-container">` with 4 nested layers (background, character, dialogue, ui-overlay)
- `<script type="module" src="/src/main.js">`

**For iframe src:** In dev mode (Vite), `/index.html` is served by Vite dev server at the same origin. In production, needs `asset://` protocol or file:// path.

## Architecture Decisions

### iframe Communication Flow

```
┌─────────────────────┐     postMessage      ┌──────────────────┐
│   Editor (Vue)       │ ◄──────────────────► │   Engine (iframe) │
│                      │                      │                   │
│  PageEditor.vue      │  {type:'start',...}  │  src/main.js      │
│  usePageEditor.js    │ ─────────────────►   │  ScriptEngine.js  │
│  script store        │                      │  UI components    │
│                      │  {type:'ready'}      │                   │
│                      │ ◄─────────────────   │                   │
│                      │  {type:'ended'}      │                   │
│                      │ ◄─────────────────   │                   │
└─────────────────────┘                      └──────────────────┘
```

### Read-Only Mode Implementation

Options investigated:
1. **CSS `pointer-events: none` on form elements** — simplest, prevents clicks on inputs/buttons
2. **Conditional `disabled` prop on all interactive components** — more work but semantic
3. **`isReadOnly` ref in usePageEditor** — injected into all child components via provide/inject

**Recommended:** Option 3 (provide/inject `isReadOnly`) — already established pattern, cleanest integration. Components check `isReadOnly` before calling `pushState()` or modifying data.

### Lazy Preload Strategy

1. App.vue creates hidden iframe when `activeTab` changes to `'scenes'` (first time only)
2. iframe loads `index.html`, engine runs `init()` partially (skip title screen)
3. Engine sends `{type: 'ready'}` when initialization complete
4. Editor stores ready state — subsequent "Play" clicks start instantly

### Mute Implementation

postMessage `{type: 'mute', muted: true/false}` → Engine sets `AudioManager` global volume to 0 or restores.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CSS bleeding from iframe | Low | Low | iframe provides full isolation |
| postMessage origin security | Low | Medium | Check `event.source === window.parent` |
| Audio context restrictions | Low | Medium | iframe inherits user gesture from parent click |
| Vite HMR breaks iframe | Medium | Low | iframe loads compiled engine, no HMR needed |
| Memory leak on iframe lifecycle | Medium | Medium | Proper cleanup on stop — reset engine state |

## Implementation Scope

### Files to Modify
1. `src/engine/ScriptEngine.js` — Add `_previewMode` property
2. `src/main.js` — Add postMessage listener, previewMode guards (ESC, context menu, quick controls)
3. `src/editor/views/PageEditor.vue` — iframe toggle, play/stop buttons, mute toggle
4. `src/editor/composables/usePageEditor.js` — Add preview mode state + methods
5. `src/editor/App.vue` — iframe lazy preload lifecycle (optional — could live in PageEditor)

### Files to Create
1. (None — all changes are modifications to existing files)

### Estimated Complexity
- Engine changes: Small (flag + guards + listener)
- Editor changes: Medium (iframe management + UI state + read-only mode)
- Communication layer: Small (postMessage protocol)
- Total: ~300-400 lines of new code

---

*Research completed: 2026-04-01*
