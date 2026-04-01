# Phase 13.1 — UI Polish (Backlog Items)

## Goal
Address 3 backlog items from Phase 13 user feedback.

## Features Delivered

### Feature 1: Speaker Combobox
- Replaced `<select>` with input+dropdown combobox
- Page-scoped character list (only chars on current page)
- Free text input for custom speaker names
- Removed "旁白" option, uses empty placeholder "无"
- Expression selector conditional on valid charId

### Feature 2: Choice Options Canvas Preview
- Added choice preview overlay in PageCanvas
- Shows prompt + option buttons matching engine style
- Static/non-interactive (editing in Inspector)

### Feature 3: Character Scale UI
- Inspector: scale slider (0.2-3.0) in each char-row when selected
- Canvas: scalable prop on DraggableElement with yellow circle handle
- Drag up/down to scale interactively

## Commits
- `6d5e241` feat(13.1): speaker combobox with page-scoped chars and free text input
- `32be72d` feat(13.1): choice options canvas preview and character scale on canvas
- `425be8e` feat(13.1): add scalable prop and scale handle to DraggableElement

## Files Modified
- `src/editor/components/page-editor/PageInspector.vue` (+126 -11)
- `src/editor/components/page-editor/PageCanvas.vue` (+60 -1)
- `src/editor/components/canvas/DraggableElement.vue` (+43 -1)

## Build Status
✅ 97 modules, clean build
