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

## v0.6 — 主题包系统

### Phases

- [x] **Phase 23: Token Foundation** — CSS variable migration: replace all hardcoded styles with `--gm-*` custom properties (completed 2026-04-06)
- [x] **Phase 24: ThemeManager Engine** — ThemeManager.js reads ui.theme, injects CSS vars, postMessage preview (completed 2026-04-06)
- [ ] **Phase 25: 9-Slice + Color Harmony** — 9-slice border-image via ::before, 3-state buttons, HSL harmony, WCAG contrast
- [ ] **Phase 26: Visual Theme Editor** — ThemeDesigner.vue with color pickers, 9-slice config, live preview iframe, palette generator
- [ ] **Phase 27: Theme Presets + Export/Import** — 3-4 built-in presets, .theme ZIP via fflate, formatVersion

### Phase Details

#### Phase 23: Token Foundation
**Goal**: Game UI renders entirely through CSS custom properties, enabling external theme control
**Depends on**: Nothing (first phase of v0.6; builds on v0.5 completed codebase)
**Requirements**: TKN-01, TKN-02, TKN-03, TKN-04, TKN-05, TKN-06
**Success Criteria** (what must be TRUE):
  1. All game UI visual properties (colors, fonts, radii, opacity) are driven by ~35-40 `--gm-*` CSS custom properties with hardcoded fallbacks in `var()`
  2. Changing any `--gm-*` property on `#game-container` via DevTools instantly changes the corresponding UI element appearance
  3. Without any theme applied, the game looks pixel-identical to v0.5 (zero visual regression across all screens)
  4. Panel backgrounds (game menu, save/load, settings overlay, choice menu) all consume unified `--gm-panel-bg` token instead of 6 different hardcoded values
  5. All button types (quick bar, menu, save/load grid, settings page) consume the same button token group (bg/text/hover/pressed)
**Plans**: 2 plans
Plans:
- [x] 23-01-PLAN.md — Token vocabulary (DEFAULT_TOKENS) + CSS migration (style.css var() wrapping)
- [x] 23-02-PLAN.md — JS inline style cleanup + integration verification

#### Phase 24: ThemeManager Engine
**Goal**: Engine automatically applies theme data from script.json and supports live preview from editor
**Depends on**: Phase 23 (CSS must consume tokens before ThemeManager can inject them)
**Requirements**: ENG-01, ENG-02, ENG-03
**Success Criteria** (what must be TRUE):
  1. When `ui.theme` contains token overrides in script.json, the game UI reflects those overrides immediately on startup
  2. Theme data at `ui.theme` participates in auto-save and undo/redo (same behavior as `ui.titleScreen` / `ui.settingsScreen`)
  3. User can reset theme to defaults via one action, and the game instantly reverts to its original v0.5 appearance
  4. Editor preview iframe receives `update-theme` postMessage and reflects token changes in real time
**Plans**: 2 plans
Plans:
- [ ] 24-01-PLAN.md — ThemeManager module + main.js engine integration
- [ ] 24-02-PLAN.md — Editor store getTheme/updateTheme for auto-save and undo/redo

#### Phase 25: 9-Slice + Color Harmony
**Goal**: Users can apply image-based UI skins and generate coordinated color palettes with accessibility guarantees
**Depends on**: Phase 24 (ThemeManager must exist for 9-slice apply and token injection)
**Requirements**: 9SL-01, 9SL-02, 9SL-03, 9SL-04, CLR-01, CLR-02, CLR-03
**Success Criteria** (what must be TRUE):
  1. User can set a 9-slice background image on the dialogue box that stretches correctly without distortion at any size
  2. Panels (game menu, save/load screen, settings overlay) accept 9-slice background images that tile/stretch properly
  3. Buttons display three distinct 9-slice images for normal/hover/pressed states with smooth visual transitions
  4. 9-slice images and CSS border-radius coexist on the same element (::before pseudo-element approach — no mutual exclusion)
  5. User selects one primary color → system generates a complete coordinated palette (accent/bg/text/border) that passes WCAG contrast checks (≥4.5:1 normal text, ≥3:1 large text)
**Plans**: TBD

#### Phase 26: Visual Theme Editor
**Goal**: Users can visually customize all theme aspects through a dedicated editor tab with instant preview
**Depends on**: Phase 25 (editor previews engine features that must already work)
**Requirements**: EDT-01, EDT-02, EDT-03, EDT-04, EDT-05
**Success Criteria** (what must be TRUE):
  1. Editor navigation shows a "🎨 主题" tab that opens a full visual theme editing interface
  2. User can adjust colors (picker), fonts (selector), border radius (slider), and opacity (slider) — all controls map to theme tokens
  3. User can upload 9-slice images and configure slice parameters (top/right/bottom/left insets) through a visual interface
  4. Every token change in the editor is instantly visible in the embedded engine preview iframe (no save/reload required)
  5. User can pick a primary color → preview a generated palette → apply the entire palette to tokens with one click
**Plans**: TBD
**UI hint**: yes

#### Phase 27: Theme Presets + Export/Import
**Goal**: Users can start from professional presets and share themes as portable packages
**Depends on**: Phase 26 (presets validate the full system; editor must exist for preset selection UI)
**Requirements**: PRE-01, PRE-02, PKG-01, PKG-02, PKG-03
**Success Criteria** (what must be TRUE):
  1. User can select from 3-4 built-in theme presets (Modern, Traditional Japanese, Fantasy, Minimal) and apply with one click for an instant professional look
  2. After applying a preset, user can fine-tune any individual token without losing the preset's other values
  3. User can export current theme as a .theme file (ZIP containing token JSON + all referenced 9-slice image assets)
  4. User can import a .theme file — images are extracted to project assets directory, tokens are applied automatically
  5. Every .theme file contains a `formatVersion` field ensuring future versions can migrate older theme packs
**Plans**: TBD
**UI hint**: yes

### Coverage

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TKN-01 | Phase 23 | Pending |
| TKN-02 | Phase 23 | Pending |
| TKN-03 | Phase 23 | Pending |
| TKN-04 | Phase 23 | Pending |
| TKN-05 | Phase 23 | Pending |
| TKN-06 | Phase 23 | Pending |
| ENG-01 | Phase 24 | Pending |
| ENG-02 | Phase 24 | Pending |
| ENG-03 | Phase 24 | Pending |
| 9SL-01 | Phase 25 | Pending |
| 9SL-02 | Phase 25 | Pending |
| 9SL-03 | Phase 25 | Pending |
| 9SL-04 | Phase 25 | Pending |
| CLR-01 | Phase 25 | Pending |
| CLR-02 | Phase 25 | Pending |
| CLR-03 | Phase 25 | Pending |
| EDT-01 | Phase 26 | Pending |
| EDT-02 | Phase 26 | Pending |
| EDT-03 | Phase 26 | Pending |
| EDT-04 | Phase 26 | Pending |
| EDT-05 | Phase 26 | Pending |
| PRE-01 | Phase 27 | Pending |
| PRE-02 | Phase 27 | Pending |
| PKG-01 | Phase 27 | Pending |
| PKG-02 | Phase 27 | Pending |
| PKG-03 | Phase 27 | Pending |

**Mapped: 26/26 ✓ — No orphaned requirements**

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 23. Token Foundation | 2/2 | Complete    | 2026-04-06 |
| 24. ThemeManager Engine | 0/2 | Complete    | 2026-04-06 |
| 25. 9-Slice + Color Harmony | 0/? | Not started | - |
| 26. Visual Theme Editor | 0/? | Not started | - |
| 27. Theme Presets + Export/Import | 0/? | Not started | - |
