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

## v0.2 — 资源库 & 标题页 & 设置叠加层 ✅

<details>
<summary>Phases 6-9 (shipped 2026-03-31)</summary>

- [x] **Phase 6: Asset Library Foundation** — IPC handlers, file validation, auto-naming, font loading (2026-03-29)
- [x] **Phase 7: Asset Library UI** — Unified asset view with thumbnails, audio, expression editor, batch import (2026-03-29)
- [x] **Phase 8: Title Page Designer** — 3-panel canvas designer with preset buttons, schema migration (2026-03-31)
- [x] **Phase 9: Settings Overlay** — Slide-in overlay with dual-mode backdrop and ESC priority (2026-03-31)

**Key deliverables:**
- ✅ 12 格式魔数验证 + 自动命名冲突解决 + 双窗口字体加载
- ✅ 统一资源库（背景/角色/音频/字体一体化，tab 6→5）
- ✅ 标题页 3 面板设计器 + 预设按钮 + 引擎格式迁移
- ✅ 设置页右侧滑入覆盖层 + ESC 优先级链

See \.planning/milestones/v0.2-ROADMAP.md\ for full phase details.

</details>

---

## v0.3 — PPT 式游戏内容编辑器 🚧

**Milestone Goal:** 将游戏内容编辑器从命令时间线模式升级为 PPT 页面模式，让用户像编辑幻灯片一样创建游戏内容。

### Phases

- [x] **Phase 10: Page Data Schema & Engine Adaptation** — Define page-based data format and adapt engine to play it (completed 2026-03-31)
- [ ] **Phase 11: PPT Page Editor** — Slide sidebar + WYSIWYG canvas editor for creating/editing game pages
- [ ] **Phase 12: Resource Pickers** — Visual pickers to select characters, expressions, backgrounds, and audio from the resource library
- [ ] **Phase 13: Transitions & Branching** — Page transition effects and choice-branch pages
- [ ] **Phase 14: Editor Test Play** — Inline game preview for testing pages without leaving the editor

### Phase Details

#### Phase 10: Page Data Schema & Engine Adaptation
**Goal**: Page-based data format is defined and the engine can play it
**Depends on**: Nothing (v0.3 foundation)
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. New project creates script.json with a pages[] array instead of commands[]
  2. Each page object stores background, characters[], dialogue, bgm, and transition config
  3. Engine plays through a page-format script — showing backgrounds, characters, and dialogue in correct sequence
  4. Engine advances to the next page on user click/tap
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — Page data schema & default templates (defaultScript + demo script.json conversion)
- [x] 10-02-PLAN.md — Engine & runtime page playback adaptation (ScriptEngine rewrite + main.js wiring)

#### Phase 11: PPT Page Editor
**Goal**: Users can create and visually edit game pages like PPT slides
**Depends on**: Phase 10
**Requirements**: EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-04, EDITOR-05, EDITOR-06, EDITOR-07, EDITOR-08
**Success Criteria** (what must be TRUE):
  1. Left sidebar displays all pages as clickable thumbnail slides; selecting a page loads it on the canvas
  2. User can add new pages, delete pages (with confirmation), and drag-reorder pages in the sidebar
  3. Canvas shows 1280×720 WYSIWYG preview of the selected page with background and positioned character sprites
  4. User can add/remove characters on the canvas and drag them to set position
  5. Inspector panel allows editing dialogue (speaker + text) and setting BGM/SE for the selected page
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD

#### Phase 12: Resource Pickers
**Goal**: Users can select characters, expressions, backgrounds, and audio from the resource library within the page editor
**Depends on**: Phase 11
**Requirements**: PICKER-01, PICKER-02, PICKER-03, PICKER-04
**Success Criteria** (what must be TRUE):
  1. Character dropdown picker lists all characters imported in the resource library
  2. Expression picker shows a thumbnail grid of the selected character's available expressions
  3. Background picker shows visual previews of all imported backgrounds; selecting one applies it to the current page
  4. Audio picker lists BGM/SE files with inline play-preview; selecting one assigns it to the page
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 12-01: TBD

#### Phase 13: Transitions & Branching
**Goal**: Users can configure page transition effects and create choice-branch pages with jump destinations
**Depends on**: Phase 12
**Requirements**: EFFECT-01, EFFECT-02, BRANCH-01, BRANCH-02, BRANCH-03
**Success Criteria** (what must be TRUE):
  1. User can set a transition type (fade / slide-left / slide-right / none) per page from the inspector
  2. Engine renders the configured transition animation when advancing between pages
  3. User can create a choice page that displays multiple option buttons on the canvas
  4. Each choice option can be linked to a target page or scene as its jump destination
  5. Choice pages are visually distinct in the sidebar with a different badge/icon from normal pages
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 13-01: TBD
- [ ] 13-02: TBD

#### Phase 14: Editor Test Play
**Goal**: Users can preview their game directly inside the editor without leaving the editing workflow
**Depends on**: Phase 13
**Requirements**: PLAY-01, PLAY-02, PLAY-03
**Success Criteria** (what must be TRUE):
  1. User can click a "Play" button to start test play from the current page
  2. Game preview runs inline within the editor (not a separate window), playing pages with transitions in sequence
  3. User can stop test play at any time and return to the editor at the page they were editing
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 14-01: TBD

### Progress

**Execution Order:** Phase 10 → 11 → 12 → 13 → 14

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Page Data Schema & Engine Adaptation | 2/2 | Complete   | 2026-03-31 |
| 11. PPT Page Editor | 0/? | Not started | - |
| 12. Resource Pickers | 0/? | Not started | - |
| 13. Transitions & Branching | 0/? | Not started | - |
| 14. Editor Test Play | 0/? | Not started | - |
