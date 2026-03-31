# Phase 11: PPT Page Editor - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create and visually edit game pages like PPT slides. This includes:
- A tree-structured sidebar for navigating scenes and pages
- A 1280×720 WYSIWYG canvas for visual page layout
- An inspector panel for editing dialogue, BGM, SE, and page properties
- Scene management (add/delete/rename) and page management (add/delete/reorder)
- Character placement on canvas via selector + drag positioning

This phase does NOT include:
- Resource picker modals (Phase 12)
- Transition effects or branching/condition pages (Phase 13)
- Inline test play (Phase 14)

</domain>

<decisions>
## Implementation Decisions

### Scene & Page Navigation
- **D-01:** Tree-structured sidebar — scenes are expandable/collapsible nodes, pages are leaf items within each scene (like PPT "sections")
- **D-02:** Scene management in sidebar — users can add new scenes, rename scenes, and delete scenes directly from the sidebar
- **D-03:** Page management in sidebar — users can add pages (insert after selected), delete pages (with confirmation), and drag-reorder pages within a scene

### Page Thumbnails
- **D-04:** Simplified representation — each page thumbnail shows: page type icon (normal/choice/condition) + page number + first dialogue text snippet (lightweight, fast rendering)

### Character Operations
- **D-05:** Button-triggered character addition — click "Add Character" button → character selector popup → select character and expression → character appears on canvas → drag to set position
- **D-06:** Canvas-based positioning — characters can be dragged on the 1280×720 canvas to set their x/y position. Existing DraggableElement component is reused.

### Dialogue Editing
- **D-07:** Dual-mode dialogue editing — right inspector panel has a dialogue list for management (add/delete/drag-reorder), AND the canvas dialogue box area supports inline click-to-edit for the currently selected dialogue
- **D-08:** Inspector and canvas are linked — selecting a dialogue in the inspector highlights it on canvas; clicking dialogue box on canvas selects it in inspector

### Agent's Discretion
- Page thumbnail visual styling details (colors, sizing, spacing)
- Inspector panel layout specifics (field grouping, section collapsing)
- Keyboard shortcuts for page operations
- Empty state displays (no scenes, no pages, no dialogues)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Schema
- `.planning/phases/10-page-data-schema-engine-adaptation/10-01-PLAN.md` — Defines the page data format (normal/choice/condition types, dialogues[], characters[], bgm, se, transition)
- `public/game/script.json` — Reference implementation of page-based script data

### Existing Canvas Infrastructure
- `src/editor/components/canvas/DraggableElement.vue` — Reusable drag+resize component (props: x, y, width, height, scale, isSelected, canvasScale)
- `src/editor/components/canvas/CanvasPreview.vue` — Existing 1280×720 canvas with ResizeObserver scaling, character rendering, dialogue box rendering

### Store Pattern
- `src/editor/stores/script.js` — Pinia store with undo/redo (pushState pattern), data ref, getTitleScreen/updateTitleScreen accessor pattern

### Current Scene Editor (to be replaced)
- `src/editor/views/Scenes.vue` — Current command-timeline editor (~70% done). Will be replaced by PPT page editor. Inspector panel pattern here is reusable.

### Tab Navigation
- `src/editor/App.vue` — Tab-based navigation, dynamic component rendering. New editor view connects here.

### Asset Library
- `src/editor/stores/assets.js` — Pinia store for characters/backgrounds/audio (already ready for Phase 12 pickers)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **DraggableElement.vue**: Drag + resize component — reuse for character positioning on canvas
- **CanvasPreview.vue**: 1280×720 WYSIWYG canvas with auto-scaling — adapt from command-based to page-based rendering
- **script.js store**: Pinia store with pushState() undo/redo — extend with page-specific getters/actions

### Established Patterns
- **Tab navigation**: App.vue uses `component :is` + `keep-alive` for view switching
- **Inspector panels**: Scenes.vue right-side panel with dynamic fields based on selection type
- **Canvas scaling**: ResizeObserver-based responsive scaling to fit container
- **Store mutations**: All data changes go through Pinia store with pushState() for undo/redo

### Integration Points
- **App.vue tabs**: New PPT editor replaces Scenes.vue tab entry
- **script store**: Add page-specific methods (getCurrentPage, addPage, deletePage, updatePage, reorderPages)
- **Asset store**: Character/background/audio lists already available via useAssetsStore()

</code_context>

<specifics>
## Specific Ideas

- Tree structure should feel like PPT's slide panel with "sections" (scenes) containing "slides" (pages)
- Character addition flow: button → selector → canvas drag (NOT drag-from-library)
- Dialogue editing should be seamless: quick edits on canvas, detailed management in inspector

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-ppt-page-editor*
*Context gathered: 2026-03-31*
