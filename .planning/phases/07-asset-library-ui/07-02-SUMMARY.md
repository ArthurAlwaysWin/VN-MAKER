---
phase: 07-asset-library-ui
plan: 02
subsystem: editor-resource-library
tags: [vue, resource-library, thumbnails, fonts, context-menu, drag-drop]
dependency_graph:
  requires: [07-01]
  provides: [resource-library-view, asset-grid, font-grid]
  affects: [App.vue-tabs, editor-views]
tech_stack:
  added: []
  patterns: [master-view-sub-tabs, computed-component-switching, hidden-file-input-import]
key_files:
  created:
    - src/editor/views/ResourceLibrary.vue
    - src/editor/components/resource-library/AssetGrid.vue
    - src/editor/components/resource-library/FontGrid.vue
    - src/editor/components/resource-library/AudioList.vue
    - src/editor/components/resource-library/CharacterEditor.vue
  modified:
    - src/editor/App.vue
key_decisions:
  - "App.vue reduced from 6 to 5 tabs — 素材库+角色 merged into 资源库"
  - "ResourceLibrary uses computed component :is for sub-tab switching with markRaw"
  - "Import button hidden for characters sub-tab (has its own import workflow)"
  - "FontGrid cleans up script.data.assets.fonts metadata on delete/rename"
metrics:
  duration: ~7min
  completed: 2026-03-29T20:01:29Z
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 1
---

# Phase 07 Plan 02: ResourceLibrary View + Backgrounds & Fonts Grids Summary

Unified ResourceLibrary master view with 4 sub-tabs, background thumbnail grid with asset:// images, font preview cards with per-font sample text rendering, context menu rename/delete, and drag-drop import — all wired to the Pinia asset store.

## What Was Done

### Task 1: Create ResourceLibrary.vue + modify App.vue tabs 6→5
- Created `ResourceLibrary.vue` master view with 4 sub-tabs: 背景, 角色, 音频, 字体
- Toolbar with centered connected button group, title, and conditional import button
- DropOverlay wraps entire view for drag-drop import to current category
- ImportNotification displays success/failure counts after import
- Hidden file input triggered by import button with category-appropriate MIME filters
- Import logic handles both file input and drag-drop, with special font handling via `importFont()`
- `onMounted` + `onActivated` both call `assets.loadAll()` for keep-alive compatibility
- Modified `App.vue`: removed Assets + Characters imports/tabs, added ResourceLibrary (6→5 tabs)
- **Commit:** `68e7c0e`

### Task 2: Create AssetGrid + FontGrid + scaffold AudioList + CharacterEditor
- Created `AssetGrid.vue`: responsive thumbnail grid (`140px` min), `asset://` image src, context menu with 重命名/删除, InlineEdit for inline rename with extension preservation, confirm() on delete
- Created `FontGrid.vue`: wider cards (`240px` min), sample text "你好世界 AaBbCc 1234" rendered in each font's CSS family, `getFontFamily()` lookup from fontMeta, metadata cleanup on delete (removes from `script.data.assets.fonts`, calls `syncFontMeta` + `pushState`), metadata path update on rename
- Created `AudioList.vue`: scaffold placeholder for Plan 03
- Created `CharacterEditor.vue`: scaffold placeholder for Plan 04
- **Commit:** `b4c1763`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Description | Resolved By |
|------|-------------|-------------|
| `AudioList.vue` | Scaffold placeholder — shows "将在后续计划中实现" | Plan 03 |
| `CharacterEditor.vue` | Scaffold placeholder — shows "将在后续计划中实现" | Plan 04 |

These stubs are intentional placeholders documented in the plan; they do not prevent the plan's goal of having working backgrounds + fonts sub-tabs.

## Verification

- `npx vite build` passes with zero errors
- App.vue has exactly 5 tabs (resource-library present, assets/characters absent)
- ResourceLibrary.vue renders all 4 sub-tabs with connected button group
- AssetGrid shows thumbnail grid for backgrounds category
- FontGrid shows preview text "你好世界 AaBbCc 1234" with custom font-family
- Import button visible for backgrounds/audio/fonts, hidden for characters
