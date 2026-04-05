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

## v0.3 — PPT 式游戏内容编辑器 ✅

<details>
<summary>Phases 10-14 + 13.1 (shipped 2026-04-01)</summary>

- [x] **Phase 10: Page Data Schema & Engine Adaptation** — Page-based data format + engine rewrite (2026-03-31)
- [x] **Phase 11: PPT Page Editor** — Scene tree sidebar + WYSIWYG canvas + inspector (2026-04-01)
- [x] **Phase 12: Resource Pickers** — Character/expression/background/audio pickers (2026-03-31)
- [x] **Phase 13: Transitions & Branching** — Fade/slide transitions + choice pages + scene linking (2026-04-01)
- [x] **Phase 13.1: UI Polish** — Speaker combobox + choice preview + character scale (INSERTED)
- [x] **Phase 14: Editor Test Play** — Inline iframe preview with postMessage protocol (2026-04-01)

**Key deliverables:**
- ✅ 页面式数据架构替代命令时间线 + 引擎完全重写
- ✅ PPT 风格所见即所得编辑器（场景树 + 1280×720 画布 + 检查器）
- ✅ 视觉资源选择器（角色表情网格、背景预览、音频播放器）
- ✅ 转场效果 + 选择分支页 + 场景跳转
- ✅ 编辑器内联试玩（iframe + postMessage + 只读覆盖层）

See .planning/milestones/v0.3-ROADMAP.md for full phase details.

</details>

---


## v0.4 — 语音 & 全局字体设置 ✅

<details>
<summary>Phases 15-18 (shipped 2026-04-03)</summary>

- [x] **Phase 15: Voice Engine Foundation** — Data model, audio channel, engine playback, volume control (2026-04-02)
- [x] **Phase 16: Voice Editor Integration** — Inspector voice picker, preview, batch naming (2026-04-02)
- [x] **Phase 17: Global Font Settings** — Data schema, engine consumption, editor UI, live preview (2026-04-03)
- [x] **Phase 18: Voice Polish** — Backlog replay, auto-mode voice wait (2026-04-03)

**Key deliverables:**
- ✅ 语音引擎（独立通道 + 音量控制 + D-01 停止语义）
- ✅ 编辑器语音集成（AudioPicker + 批量命名匹配 + 试听）
- ✅ 全局字体设置（数据模型 + 引擎消费 + 编辑器 UI + 画布实时预览）
- ✅ 回想屏语音重放（▶/■ 按钮 + 高亮反馈）
- ✅ 自动模式语音感知（Promise.all 等待 + 300ms 微延迟）

See .planning/milestones/v0.4-ROADMAP.md for full phase details.

</details>

---

## v0.5 — 游戏 UI 补全

### Phases

- [x] **Phase 19: Save System Upgrade** — File system saves with 100-slot capacity, IPC handlers, screenshots, migration (completed 2026-04-04)
- [x] **Phase 20: Quick Action Bar** — 6-button dialogue bar with auto/skip state indicators and overlay sync (completed 2026-04-05)
- [ ] **Phase 21: Save/Load UI** — Full-screen 100-slot grid with thumbnails, pagination, ESC stack, context-aware return
- [ ] **Phase 22: Skip Mode** — Read history tracking, skip-all/skip-read-only modes, audio suppression, settings toggle

### Phase Details

#### Phase 19: Save System Upgrade
**Goal**: Game saves persist to the project file system with 100-slot capacity and screenshot thumbnails
**Depends on**: Nothing (v0.5 foundation — all other phases build on this)
**Requirements**: SAVE-01, SAVE-02, SAVE-03, SAVE-04, SAVE-05, SAVE-06, SAVE-07, SAVE-08
**Success Criteria** (what must be TRUE):
  1. Saving a game creates `slot_NNN.json` + `slot_NNN.jpg` in the project's `saves/` directory, surviving app restart
  2. Loading a saved slot restores exact game state (scene, page, dialogue history, audio) via async IPC
  3. Old localStorage saves from previous versions appear automatically in the new system on first project open
  4. Screenshot thumbnails load in `<img>` tags via `asset://saves/slot_NNN.jpg` without errors
  5. Deleting a save slot removes both JSON and JPEG files, confirmed by `list-saves` returning updated data
**Plans:** 2/2 plans complete

Plans:
- [x] 19-01-PLAN.md — Electron backend: IPC handlers (save/load/delete/list/capture/migrate) + asset:// saves/ protocol + preview preload fix + saves/ auto-creation
- [x] 19-02-PLAN.md — Async SaveManager rewrite + caller migration + screenshot capture flow + toast utility + legacy localStorage migration

#### Phase 20: Quick Action Bar
**Goal**: Players have persistent one-click access to all game functions during dialogue
**Depends on**: Phase 19 (save/load buttons need working save backend)
**Requirements**: BAR-01, BAR-02, BAR-03, BAR-04, BAR-05
**Success Criteria** (what must be TRUE):
  1. Six labeled buttons (自動 / 快進 / 回想 / 存档 / 読档 / 設置) appear at the dialogue box bottom during gameplay
  2. Clicking Auto or Skip toggles the mode and shows a visible active-state indicator (highlight or icon change)
  3. Button bar hides automatically when choice pages appear, menus open, or any overlay displays
  4. Clicking any bar button does NOT advance dialogue to the next line
**Plans:** 2/2 plans complete

Plans:
- [x] 20-01-PLAN.md — QuickActionBar UI class + quicksave IPC handlers + SaveManager extensions
- [x] 20-02-PLAN.md — main.js integration, CSS replacement, F5/F9 shortcuts, legacy cleanup
**UI hint**: yes

#### Phase 21: Save/Load UI
**Goal**: Players can visually browse, save, and load from 100 slots with thumbnail previews
**Depends on**: Phase 19 (async SaveManager, screenshot pipeline, file-based slots)
**Requirements**: SLUI-01, SLUI-02, SLUI-03, SLUI-04, SLUI-05, SLUI-06, SLUI-07
**Success Criteria** (what must be TRUE):
  1. Full-screen save/load interface shows 5×2 = 10 slots per page across 10 navigable page tabs (100 slots total)
  2. Each occupied slot card displays a screenshot thumbnail, save timestamp, dialogue text preview, and scene name; empty slots show "— 空 —"
  3. Save/Load mode switches via header tabs without closing the interface; overwriting an existing save shows inline confirmation before proceeding
  4. ESC key closes the save/load screen respecting stack-based overlay priority (SaveLoad > Settings > Backlog > GameMenu)
  5. Closing the interface returns to the correct context: game menu → game menu, quick bar → gameplay, title screen → title screen
**Plans**: 2 plans

Plans:
- [x] 21-01-PLAN.md — SaveLoadScreen rewrite (3×3×12 grid, pagination, inline confirmations) + CSS + SaveManager slotCount bump
- [ ] 21-02-PLAN.md — main.js integration wiring (source params, onClose routing, ESC priority fix, save toast)

**UI hint**: yes

#### Phase 22: Skip Mode
**Goal**: Players can fast-forward through dialogue with intelligent read-page tracking
**Depends on**: Phase 20 (skip button in quick bar triggers this mode)
**Requirements**: SKIP-01, SKIP-02, SKIP-03, SKIP-04, SKIP-05, SKIP-06, SKIP-07
**Success Criteria** (what must be TRUE):
  1. Activating skip mode rapidly advances through pages with a visible "▶▶ SKIP" overlay indicator
  2. In "skip read only" mode, skip automatically stops at any unread page and resumes normal reading speed
  3. All audio events (BGM/SE/voice) are suppressed during skip, with correct final audio state applied when skip ends
  4. A new settings page toggle lets users switch between "skip all" and "skip read only" modes (persisted in ConfigManager)
  5. Skip stops automatically at choice pages and when the user clicks, presses a key, or hits ESC
**Plans**: TBD
**UI hint**: yes

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 19. Save System Upgrade | 2/2 | Complete    | 2026-04-04 |
| 20. Quick Action Bar | 2/2 | Complete   | 2026-04-05 |
| 21. Save/Load UI | 1/2 | In Progress|  |
| 22. Skip Mode | 0/? | Not started | - |
