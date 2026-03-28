# Roadmap: Galgame Maker — 设置页设计器

## Overview

This milestone adds a Settings Page Designer to the existing visual novel editor. The journey: fix blocking bugs → lock the data schema → build the runtime renderer (validating the schema with real engine code) → build the editor canvas for visual layout design → wire up property editing and integration with auto-save/undo. The result: creators drag-and-drop preset settings components onto a canvas, customize appearance, and the engine renders a fully interactive settings page — all without writing a single line of logic.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Bug Fixes** - Fix file dialog and hot reload blockers before feature work
- [ ] **Phase 2: Data Schema & Component Registry** - Define the JSON contract and extensible architecture
- [ ] **Phase 3: Runtime Settings Renderer** - Engine renders interactive settings page from JSON layout data
- [ ] **Phase 4: Editor Canvas & Component Palette** - Visual designer for placing and positioning settings components
- [ ] **Phase 5: Property Panel & Integration** - Property editing, auto-save, undo/redo, end-to-end workflow

## Phase Details

### Phase 1: Bug Fixes
**Goal**: Development environment is unblocked — projects can be created and code can be iterated on without crashes
**Depends on**: Nothing (first phase)
**Requirements**: BUG-01, BUG-02
**Success Criteria** (what must be TRUE):
  1. User can click "浏览..." in the project creation wizard and a native file dialog opens
  2. Developer can save a file change and Vite hot reload completes without crashing on Windows
**Plans**: TBD

### Phase 2: Data Schema & Component Registry
**Goal**: A locked data contract exists that both editor and runtime code against, with an extensible registry for future component types
**Depends on**: Phase 1
**Requirements**: DATA-01, ARCH-01, ARCH-02
**Success Criteria** (what must be TRUE):
  1. `ui.settingsScreen` schema is documented with background + elements[] structure in script format docs
  2. `SETTING_DEFS` registry defines all 7 setting types with metadata (type, settingKey, min/max/step/default)
  3. ConfigManager includes new keys (fullscreen, dialogueOpacity, masterVolume) with sensible defaults
  4. Adding a new component type in the future requires only a registry entry — no structural changes to editor or runtime
**Plans**: TBD

### Phase 3: Runtime Settings Renderer
**Goal**: Games render a fully functional, interactive settings page from JSON layout data — with built-in fallback for projects without custom layouts
**Depends on**: Phase 2
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, EDIT-07, DATA-04
**Success Criteria** (what must be TRUE):
  1. A game with `ui.settingsScreen` data renders all placed components at their specified positions and styles
  2. Each slider (BGM, SE, text speed, auto-play, dialogue opacity, master volume) adjusts its setting value and persists across sessions via ConfigManager
  3. Fullscreen toggle switches between windowed and fullscreen mode via Electron IPC
  4. A game without `ui.settingsScreen` data shows the existing default built-in settings page (no regression)
  5. All rendered element styles pass CSS sanitization — no injection possible
**Plans**: TBD

### Phase 4: Editor Canvas & Component Palette
**Goal**: Creators can visually design their settings page layout by placing, positioning, and previewing components on a 1280×720 canvas
**Depends on**: Phase 2 (schema locked), Phase 3 (runtime validates schema)
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-05, EDIT-06, EDIT-08, EDIT-09
**Success Criteria** (what must be TRUE):
  1. Creator sees a 1280×720 canvas in the Settings tab that scales responsively with the editor window
  2. Creator can add any of the 7 preset setting components from a sidebar palette onto the canvas
  3. Creator can drag placed components to reposition them freely on the canvas
  4. Creator can add a background image, text labels, decorative images, and a close/return button to the layout
  5. All canvas components appear as static visual previews (non-interactive in editor — pointer-events: none on inner content)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Property Panel & Integration
**Goal**: Complete designer workflow — creators can edit component properties, and all changes auto-save and support undo/redo
**Depends on**: Phase 4
**Requirements**: EDIT-04, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Creator can select a component on the canvas and edit its properties (position, color, font, size) in a right-side panel
  2. Layout changes auto-save within 2 seconds via the existing debounce system
  3. Creator can undo/redo any layout change using Ctrl+Z / Ctrl+Y (existing undo stack)
  4. End-to-end round-trip works: design in editor → save → open runtime preview → custom settings page renders at correct positions
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bug Fixes | ✅ | Done | 2025-03-28 |
| 2. Data Schema & Component Registry | ✅ | Done | 2025-03-28 |
| 3. Runtime Settings Renderer | ✅ | Done | 2025-03-28 |
| 4. Editor Canvas & Component Palette | ✅ | Done | 2025-03-28 |
| 5. Property Panel & Integration | ✅ | Done | 2025-03-28 |

**Post-milestone polish (2025-03-29):**
- ✅ 创建项目 reactive Proxy bug 修复
- ✅ 设置页设计器 5 项 bug 修复（样式预览/撤销重做/自动调高等）
- ✅ 关闭按钮移至设置组件区 + icon/text 双模式
- ✅ 全屏开关 → 窗口模式三选一（radio 按钮样式）
- ✅ 保存按钮 💾 添加到工具栏
