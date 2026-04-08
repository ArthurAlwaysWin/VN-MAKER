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

## v0.5 — 游戏 UI 补全 ✅

<details>
<summary>Phases 19-22 (shipped 2026-04-05)</summary>

- [x] **Phase 19: Save System Upgrade** — File system saves with 108-slot capacity, IPC handlers, screenshots, migration (2026-04-04)
- [x] **Phase 20: Quick Action Bar** — 8-button dialogue bar with quicksave/quickload, F5/F9, auto/skip indicators (2026-04-05)
- [x] **Phase 21: Save/Load UI** — Full-screen 3×3×12 grid (108 slots), thumbnails, pagination, ESC stack, source-routed close (2026-04-05)
- [x] **Phase 22: Skip Mode** — Read history tracking, skip-all/skip-read-only, audio suppression, settings toggle (2026-04-05)

**Key deliverables:**
- ✅ 文件系统存档管线：SaveManager → IPC → atomicWrite + capturePage 截图
- ✅ 快捷按钮栏 8 按钮 + 快存快读(F5/F9) + 激活状态紫色高亮
- ✅ 全屏存读档界面 108 槽位 + 分页 + 内联确认 + 来源路由返回
- ✅ 快进模式 30ms 循环 + ReadHistory + BGM 影子追踪 + 6 种停止触发器

See .planning/milestones/v0.5-ROADMAP.md for full phase details.

</details>

---

## v0.6 — 主题包系统 ✅

<details>
<summary>Phases 23-27 (shipped 2026-04-07)</summary>

- [x] **Phase 23: Token Foundation** — 41 --gm-* CSS custom properties migration, zero visual regression (2026-04-06)
- [x] **Phase 24: ThemeManager Engine** — ThemeManager.js reads ui.theme, injects CSS vars, postMessage preview (2026-04-06)
- [x] **Phase 25: 9-Slice + Color Harmony** — 9-slice border-image via ::before, 3-state buttons, HSL harmony, WCAG contrast (2026-04-06)
- [x] **Phase 26: Visual Theme Editor** — ThemeDesigner.vue with color pickers, 9-slice config, live preview iframe, palette generator (2026-04-06)
- [x] **Phase 27: Theme Presets + Export/Import** — 4 built-in presets, .theme ZIP via fflate, formatVersion (2026-04-07)

**Key deliverables:**
- ✅ 41 个 Design Token（--gm-*）+ CSS 变量迁移，零视觉回归
- ✅ ThemeManager 引擎模块（applyTheme/applyNineSlice + postMessage 实时预览）
- ✅ 九宫格图片系统（对话框/面板/按钮 ::before 伪元素 + 三态按钮）
- ✅ 配色和谐算法（4 种 HSL 算法 + WCAG 对比度自动修复）
- ✅ 可视化主题编辑器（41 token 控件 + 调色盘生成器 + 九宫格配置）
- ✅ 4 套内置预设（Modern/和風/Fantasy/Minimal）+ .theme ZIP 导出/导入

See .planning/milestones/v0.6-ROADMAP.md for full phase details.

</details>

---

## v0.7 — 游戏导出（Web 静态包）

### Phases

- [x] **Phase 28: Engine Web Adaptation** — Make the game engine run in a standalone browser without Electron (completed 2026-04-07)
- [x] **Phase 29: Asset Scanner + Build Config** — Identify referenced assets and produce standalone engine bundle (completed 2026-04-07)
- [ ] **Phase 30: Export Pipeline** — Generate deployable Web static bundle from project data
- [ ] **Phase 31: Export UI** — Editor dialog for configuring and monitoring game export

### Phase Details

#### Phase 28: Engine Web Adaptation
**Goal**: The game engine runs correctly in a standalone browser without any Electron dependencies
**Depends on**: Nothing (first phase of v0.7)
**Requirements**: WEBRT-01, WEBRT-02, WEBRT-03, WEBRT-04, WEBRT-05
**Success Criteria** (what must be TRUE):
  1. Opening the engine's index.html in a plain browser renders the title screen with background, BGM, and interactive buttons
  2. Player can progress through dialogue, make choices, and navigate between scenes entirely in the browser
  3. Player can save to a slot and load it back in the browser, with data persisting across page reloads (IndexedDB backend)
  4. Settings page and title page custom backgrounds/images display correctly via parameterized basePath (no asset:// protocol)
  5. Engine auto-detects its runtime environment (Electron / editor preview / standalone web) and selects the correct SaveManager and basePath without manual configuration
**Plans**: 2 plans
Plans:
- [x] 28-01-PLAN.md — Foundation modules: assetPath.js (env detection + path resolution) + WebSaveManager.js (IndexedDB backend)
- [x] 28-02-PLAN.md — Integration: main.js 3-way bootstrap + UI hardcoded asset:// replacement

#### Phase 29: Asset Scanner + Build Config
**Goal**: The system can identify all referenced project assets and produce a deterministic standalone engine bundle
**Depends on**: Phase 28
**Requirements**: SCAN-01, SCAN-02, SCAN-03, PIPE-06
**Success Criteria** (what must be TRUE):
  1. Running the scanner on a project's script.json returns the complete list of asset files actually referenced
  2. Scanner detects references across all asset types: backgrounds, characters, audio, fonts, nine-slice images, and favicon
  3. Scanner outputs clear warnings for any referenced asset file that does not exist on disk
  4. Vite build config produces an engine bundle (JS + CSS) with deterministic filenames suitable for export
**Plans**: 2 plans
Plans:
- [x] 29-01-PLAN.md — TDD asset scanner: pure function extracting all referenced paths from script.json
- [x] 29-02-PLAN.md — Vite web build config with deterministic engine.js + engine.css output

#### Phase 30: Export Pipeline
**Goal**: The backend produces a complete, playable Web static bundle from any project
**Depends on**: Phase 29
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-07
**Success Criteria** (what must be TRUE):
  1. Calling the export handler with an output directory produces index.html + engine JS/CSS + script.json + only the referenced asset files
  2. The generated index.html displays the user-specified game title in the browser tab and includes the specified favicon
  3. The exported folder is fully playable when served from any static HTTP server
  4. When ZIP option is enabled, a .zip file containing the complete bundle is generated
  5. The export process reports progress (current step and percentage) via IPC events as it runs
**Plans**: 1 plan
Plans:
- [ ] 30-01-PLAN.md — TDD export pipeline core module + IPC integration

#### Phase 31: Export UI
**Goal**: Users can trigger, configure, and monitor game export from within the editor
**Depends on**: Phase 30
**Requirements**: EXUI-01, EXUI-02, EXUI-03, EXUI-04, EXUI-05, EXUI-06
**Success Criteria** (what must be TRUE):
  1. User can find and click an export entry point in the editor that opens the export dialog
  2. Export dialog provides fields for game title, output directory selector, favicon file picker, and ZIP toggle
  3. During export, the dialog displays live progress showing current step and percentage
  4. On completion, the dialog shows a success message with the full path to the exported output
**Plans**: TBD
**UI hint**: yes

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 28. Engine Web Adaptation | 2/2 | Complete    | 2026-04-07 |
| 29. Asset Scanner + Build Config | 2/2 | Complete    | 2026-04-07 |
| 30. Export Pipeline | 0/? | Not started | - |
| 31. Export UI | 0/? | Not started | - |
