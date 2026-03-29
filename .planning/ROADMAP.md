# Roadmap: Galgame Maker

## Overview

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

---

## v0.1 — 设置页设计器 ✅

<details>
<summary>Phases 1-5 (all completed 2025-03-28)</summary>

- [x] **Phase 1: Bug Fixes** - Fix file dialog and hot reload blockers before feature work
- [x] **Phase 2: Data Schema & Component Registry** - Define the JSON contract and extensible architecture
- [x] **Phase 3: Runtime Settings Renderer** - Engine renders interactive settings page from JSON layout data
- [x] **Phase 4: Editor Canvas & Component Palette** - Visual designer for placing and positioning settings components
- [x] **Phase 5: Property Panel & Integration** - Property editing, auto-save, undo/redo, end-to-end workflow

**Post-milestone polish (2025-03-29):**
- ✅ 创建项目 reactive Proxy bug 修复
- ✅ 设置页设计器 5 项 bug 修复（样式预览/撤销重做/自动调高等）
- ✅ 关闭按钮移至设置组件区 + icon/text 双模式
- ✅ 全屏开关 → 窗口模式三选一（radio 按钮样式）
- ✅ 保存按钮 💾 添加到工具栏

</details>

---

## v0.2 — 资源库 & 标题页 & 设置叠加层

**Goal:** 统一资源管理体系，重做标题页设计器，设置页改为游戏内叠加层模式
**Requirements:** 38 across 4 categories (ASSET ×14, TITLE ×12, OVERLAY ×8, INFRA ×4)

## Phases

- [ ] **Phase 6: Asset Library Foundation** - IPC handlers, file validation, auto-naming, font loading infrastructure
- [ ] **Phase 7: Asset Library UI** - Unified asset management view with thumbnails, audio playback, expression editor, and batch import
- [ ] **Phase 8: Title Page Designer** - 3-panel canvas designer for title pages with preset buttons, text labels, and decorative images
- [ ] **Phase 9: Settings Overlay** - Settings page as slide-in overlay on top of running game with backdrop and dismiss controls

## Phase Details

### Phase 6: Asset Library Foundation
**Goal**: Backend infrastructure for asset management is complete — files can be imported with validation, naming conflicts resolve automatically, and custom fonts load in both editor and engine
**Depends on**: Nothing (first phase of v0.2; builds on existing asset:// protocol and IPC layer from v0.1)
**Requirements**: ASSET-03, ASSET-04, ASSET-12, INFRA-02, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. User can import asset files via IPC and invalid formats are rejected with a user-facing error message (magic bytes + extension whitelist: PNG/JPG/WEBP, MP3/OGG/WAV, TTF/OTF/WOFF/WOFF2)
  2. Importing a file whose name already exists in the target folder automatically appends a number suffix (背景-1.png, 背景-2.png) — no overwrite, no user intervention
  3. Custom font files imported to assets/fonts/ are loadable via FontFace API in both the editor window and the engine window independently
  4. All new IPC calls from Vue components safely deconstruct reactive Proxy objects before sending — no serialization errors
**Plans:** 2 plans

Plans:
- [x] 06-01-PLAN.md — Backend infrastructure: validateAsset.js, 4 IPC handlers, fonts/ directory, fontLoader.js
- [ ] 06-02-PLAN.md — Asset store + integration wiring: Pinia assets store, editor/engine font loading

### Phase 7: Asset Library UI
**Goal**: Users manage all project assets — backgrounds, characters, audio, and fonts — in one unified view with visual browsing, inline editing, and drag-to-import
**Depends on**: Phase 6 (IPC handlers, validation, font loading)
**Requirements**: ASSET-01, ASSET-02, ASSET-05, ASSET-06, ASSET-07, ASSET-08, ASSET-09, ASSET-10, ASSET-11, ASSET-13, ASSET-14
**Success Criteria** (what must be TRUE):
  1. User sees a single "资源库" tab with four category sections (背景/角色/音频/字体) replacing the old separate 素材库+角色 tabs (tab count 6→5)
  2. Background/image assets display as thumbnail grids; audio assets have inline play/pause controls
  3. User can edit character name and color, and manage character expressions by importing images through a file picker (not typing paths manually)
  4. User can delete any asset (with confirmation dialog) and rename any asset via inline text editing
  5. User can drag files from the system file manager onto a drop zone to batch-import multiple assets, and font assets display sample text preview ("你好世界 AaBbCc 1234")
**Plans**: TBD
**UI hint**: yes

### Phase 8: Title Page Designer
**Goal**: Users visually design title pages by placing preset buttons, text labels, and decorative images on a canvas — and the engine renders them correctly with the new schema
**Depends on**: Phase 7 (asset library pickers for background/BGM/image selection)
**Requirements**: TITLE-01, TITLE-02, TITLE-03, TITLE-04, TITLE-05, TITLE-06, TITLE-07, TITLE-08, TITLE-09, TITLE-10, TITLE-11, TITLE-12, INFRA-01
**Success Criteria** (what must be TRUE):
  1. User sees a 1280×720 canvas with three-panel layout (left: component palette / center: canvas / right: property panel) in the 标题页 tab
  2. User can drag 4 preset button components (开始游戏/继续游戏/设置/退出) plus text labels and decorative images from the palette onto the canvas for free positioning
  3. User can select a title background image and BGM from asset library pickers, and customize any element's text, color, font, size, and hover effects in the property panel
  4. Changes support undo/redo (Ctrl+Z/Y), auto-save (2s debounce), and Z-order layer reordering (上移/下移)
  5. Engine renders custom title page layouts correctly — including legacy format migration — and "继续游戏" button shows disabled state when no save data exists
**Plans**: TBD
**UI hint**: yes

### Phase 9: Settings Overlay
**Goal**: Settings page renders as a slide-in overlay on top of the running game instead of replacing the game screen
**Depends on**: Nothing (independent of Phase 6-8; modifies only engine runtime code)
**Requirements**: OVERLAY-01, OVERLAY-02, OVERLAY-03, OVERLAY-04, OVERLAY-05, OVERLAY-06, OVERLAY-07, OVERLAY-08
**Success Criteria** (what must be TRUE):
  1. Settings page appears as an overlay with the game scene visible and continuing underneath (not hidden, not paused)
  2. Opening triggers a smooth slide-in transition; closing triggers a smooth slide-out transition
  3. Semi-transparent backdrop with blur effect (backdrop-filter: blur) covers the game scene behind the settings panel
  4. User can close the settings overlay via ESC key, × close button, or clicking the backdrop area outside the panel

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9
(Phase 9 has no dependency on 6-8 and could execute in parallel, but sequential ordering is simpler for solo dev.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Asset Library Foundation | 0/2 | Planned | - |
| 7. Asset Library UI | 0/? | Not started | - |
| 8. Title Page Designer | 0/? | Not started | - |
| 9. Settings Overlay | 0/? | Not started | - |
