# Phase 59 Context — Title Page Preview

## Goal
Users see actual engine-rendered title page in the editor via iframe preview.

## Current State
- TitleDesigner.vue is a drag-drop canvas editor (3-panel: palette | workspace | properties)
- Canvas uses Vue DraggableElement for WYSIWYG editing (not engine rendering)
- Engine TitleScreen.js has `setLayout(layout)` and `show(hasSave)` methods
- Engine `main.js` handles `update-screen-layout` postMessage for 4 screens but NOT titleScreen
- Engine handles `show-screen` for 4 screens but NOT titleScreen
- No composable exists for title page iframe communication

## Key Decisions (auto mode)

### D-01: Preview placement
**Decision**: Add iframe preview below the existing canvas in the workspace panel
**Rationale**: The canvas is the drag-drop editor; iframe shows the actual engine rendering. Below placement avoids competing for the same visual space. Toggle button to switch between canvas and preview.

### D-02: Preview toggle vs split
**Decision**: Toggle button in toolbar (Canvas / Preview) — not side-by-side split
**Rationale**: TitleDesigner already uses full workspace width for the canvas. A split would make both too small. Toggle is simple and keeps existing layout intact.

### D-03: Engine message handling
**Decision**: Add `titleScreen` case to `update-screen-layout` and `show-screen` in main.js
**Rationale**: Follows exact pattern of existing screen types. Minimal change.

### D-04: TitleScreen re-render on setLayout
**Decision**: TitleScreen.setLayout() should re-render if currently visible (same fix as other screens)
**Rationale**: Same bug was fixed for SettingsScreen/SaveLoadScreen/BacklogScreen in this session.

### D-05: Composable pattern
**Decision**: Create useTitlePreview.js composable — lightweight, only manages iframe ref + postMessage
**Rationale**: Follows project pattern. Does NOT need useScreenLayoutEditor (different data path: ui.titleScreen not screen config).

### D-06: Debounce
**Decision**: 200ms debounced postMessage (same as other editors)
**Rationale**: Consistent with existing pattern.

### D-07: Preview startup
**Decision**: On iframe load, send `start` message with current project script, then show-screen titleScreen
**Rationale**: Same pattern as SettingsPageEditor startup. Show title screen specifically for this preview.

### D-08: Auto-sync from canvas
**Decision**: Watch the reactive layout object, debounce → postMessage `update-screen-layout` with titleScreen config
**Rationale**: Any edit in the drag-drop canvas should reflect in the engine preview automatically.

### D-09: No persist change needed
**Decision**: TitleDesigner already saves via scriptStore.updateTitleScreen() — no new persist logic
**Rationale**: The preview is read-only display; data flow is editor → store → iframe, same as before.

## Scope
1. Engine: Add titleScreen to update-screen-layout + show-screen handlers in main.js
2. Engine: TitleScreen.setLayout() re-render if visible
3. Composable: useTitlePreview.js
4. Editor: TitleDesigner.vue — iframe + toggle button
5. Tests: TitleScreen re-render unit test
