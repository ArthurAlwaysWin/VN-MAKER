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

## v0.7 — 游戏导出（Web 静态包）✅

<details>
<summary>Phases 28-31 (shipped 2026-04-08)</summary>

- [x] **Phase 28: Engine Web Adaptation** — WebSaveManager + basePath parameterization + 3-way env detection (2026-04-07)
- [x] **Phase 29: Asset Scanner + Build Config** — scanAssets() 5-category scanner + vite.web.config.js deterministic build (2026-04-07)
- [x] **Phase 30: Export Pipeline** — 6-step pipeline: build → scan → copy engine → copy assets → generate HTML → ZIP (2026-04-08)
- [x] **Phase 31: Export UI** — ExportModal 3-state modal + IPC handlers + ProjectSettings integration (2026-04-08)

**Key deliverables:**
- ✅ 引擎 Web 适配（WebSaveManager IndexedDB + basePath 参数化 + 环境自动检测）
- ✅ 智能资源扫描器（11 路径位置 + 5 类资源 + 去重排序 + 40 测试）
- ✅ 导出管线（6 步流水线 + 缺失资源跳过+警告 + 可选 ZIP + 20 测试）
- ✅ 导出 UI（3 态 Modal：配置→进度→完成 + 原生目录对话框 + 打开文件夹）

See .planning/milestones/v0.7-ROADMAP.md for full phase details.

</details>

---

## v0.8 — 游戏导出 Electron 桌面版 ✅

<details>
<summary>Phases 32-34 (shipped 2026-04-10)</summary>

- [x] **Phase 32: Desktop Game Runtime** — Engine desktop detection + game process templates + saves + window management (2026-04-09)
- [x] **Phase 33: Export Pipeline Core** — exportDesktop.js 9-step pipeline + @electron/packager + icon/title + ZIP (2026-04-09)
- [x] **Phase 34: Export UI Integration** — ExportModal Web/桌面 toggle + icon picker + format-aware dispatch (2026-04-10)

**Key deliverables:**
- ✅ 桌面游戏运行时（game-main.js + game-preload.js 模板 + 4-way 环境检测 + 8 通道 IPC）
- ✅ 9 步导出流水线（@electron/packager 打包 + PNG→ICO + Electron 缓存 + 可选 ZIP）
- ✅ ExportModal 格式切换（Web/桌面版 Segment Toggle + 图标选择器 + 分辨率透传）

See .planning/milestones/v0.8-ROADMAP.md for full phase details.

</details>

---

## v0.9 — 编辑器本地化与帮助系统 ✅

<details>
<summary>Phases 35-36 (completed 2026-04-12)</summary>

- [x] **Phase 35: 中文本地化** — TOKEN_LABELS 41 条映射 + 字体/转场/音频/导出/坐标全部中文化
- [x] **Phase 36: Tooltip 帮助系统** — HelpTip.vue 组件 + helpTexts.js 35 keys + 26 实例 × 16 文件 + 80+ 按钮 title

**Key accomplishments:**
- ✅ TOKEN_LABELS 41 条中文映射 + label prop 透传至 5 个 row 组件
- ✅ 编辑器残留英文全部翻译（字体选择器、转场、AudioPicker、ExportModal、坐标、占位符）
- ✅ HelpTip.vue 组件（Teleport + fixed 定位 + 150ms fade + viewport flip）
- ✅ 全编辑器 HelpTip 覆盖 + 按钮 title 扫描（80+ 按钮 × 28 文件）

See .planning/milestones/v0.9-ROADMAP.md for full phase details.

</details>

---

## v1.0 — 角色表情/差分場景切換 ✅

<details>
<summary>Phases 37-41 (shipped 2026-04-15)</summary>

- [x] **Phase 37: CharacterLayer DOM 重構** — 雙圖層容器結構（div+imgA/imgB），4 種定位模式保留 (2026-04-13)
- [x] **Phase 38: 表情交叉漸變** — 300ms CSS opacity crossfade + img.decode() 預加載 + skipMode 即時替換 (2026-04-13)
- [x] **Phase 39: 表情狀態管理** — 引擎 Map + 頁面繼承 + 存讀檔持久化 + 場景重置 (2026-04-13)
- [x] **Phase 40: 表情選擇器 UI** — ExpressionDropdown 縮略圖網格 + PageInspector 雙處集成 (2026-04-15)
- [x] **Phase 41: 編輯器狀態展示與容錯** — 畫布繼承預覽 + 安全刪除（全場景掃描+批量替換）(2026-04-15)

**Key deliverables:**
- ✅ CharacterLayer 雙圖層重構（A/B img + 容器分離動畫）
- ✅ 表情交叉漸變（300ms crossfade + img.decode() 預加載 + skipMode 即時替換）
- ✅ 表情狀態管理（引擎 Map 繼承 + 存讀檔 + 場景重置 + 36 單元測試）
- ✅ ExpressionDropdown 視覺選擇器（Teleport 縮略圖網格 + 角色行/對話行集成）
- ✅ 畫布繼承預覽 + 安全刪除（反向頁面查找 + 全場景引用掃描 + 批量替換 + 單步撤銷）

See .planning/milestones/v1.0-ROADMAP.md for full phase details.

</details>

---

## v1.1 — UI Theme System v2 引擎配置化 ✅

<details>
<summary>Phases 42-45 (shipped 2026-04-16)</summary>

- [x] **Phase 42: widgetStyles 控件风格基础** — WIDGET_DEFAULTS + deepMerge + Tab(5)/Toggle(4)/Slider/Panel/Button 数据驱动渲染 (2026-04-16)
- [x] **Phase 43: 界面布局配置** — SaveLoadScreen/BacklogScreen/GameMenu setLayout(config) 全部可配置 (2026-04-16)
- [x] **Phase 44: SettingsScreen 结构化模式** — elements 空时自动 SETTING_DEFS 分组渲染 header/tabBar/contentArea (2026-04-16)
- [x] **Phase 45: 名牌样式 + 配置统一 + 编辑器预览** — nameplateStyle 三样式 + main.js ui.* 统一路由 + iframe 预览同步 (2026-04-16)

**Key deliverables:**
- ✅ widgetStyles 控件风格系统（5 类控件 × 多种形状/样式，全部数据驱动）
- ✅ 三界面配置化（SaveLoad/Backlog/GameMenu 各 setLayout）
- ✅ SettingsScreen 结构化模式（自动分组 + widgetStyles 联动）
- ✅ 名牌三样式 (inline/floating/banner) + 配置统一路由
- ✅ 全部向后兼容（null config = 零视觉变化，219 测试验证）

See .planning/milestones/v1.1-ROADMAP.md for full phase details.

</details>

---

## v1.2 — 编辑器主题配置 + 示范主题 ✅

<details>
<summary>Phases 46-51 (shipped 2026-04-17)</summary>

- [x] **Phase 46: 数据持久化 + 编辑器骨架** — Store 读写 widgetStyles/布局 + 控件风格编辑器视图骨架 + iframe 预览区 (2026-04-17)
- [x] **Phase 47: 控件编辑器 — Tab/Toggle/Slider** — Tab 形状缩略图网格 + Toggle 样式缩略图网格 + Slider 颜色/形状配置 (2026-04-17)
- [x] **Phase 48: 控件编辑器 — Panel/Button + 实时预览** — Panel 背景/圆角/边框/模糊/贴图 + Button 三态 + 全控件 iframe 实时预览 (2026-04-17)
- [x] **Phase 49: 布局编辑器 — SaveLoad/Backlog** — 存读档/回想界面结构化表单配置 (2026-04-17)
- [x] **Phase 50: 布局编辑器 — GameMenu/Settings + 实时预览** — 游戏菜单/设置界面表单配置 + 全布局 iframe 实时预览 (2026-04-17)
- [x] **Phase 51: 内置主题 + 主题选择器** — 5 套内置主题数据包 + ThemePackageModal 一键应用 (2026-04-17)

**Key deliverables:**
- ✅ 数据持久化（8 对 store 方法 + provide/inject composable + postMessage 预览协议）
- ✅ 控件风格编辑器（5 类手风琴 + 缩略图网格选择 + 颜色选择器 + iframe 实时预览）
- ✅ 界面布局编辑器（4 界面全覆盖 + 结构化表单 + iframe 预览联动）
- ✅ 内置主题系统（5 套主题包一键应用 + Ctrl+Z 撤销 + 范围徽章）

See .planning/milestones/v1.2-ROADMAP.md for full phase details.

</details>

---

<details>
<summary>✅ v1.3 — 主题系统表达力升级 (9 phases, 27 requirements, shipped 2026-04-20)</summary>

OKLCH 智能配色 + 设置页结构参数 + 编辑器完整配置 UI + 标题页预览 + 5 套商业级主题升级。81 commits, 108 files, +17292/-2808 lines.

See .planning/milestones/v1.3-ROADMAP.md for full phase details.

</details>

---

## v1.4 — 演出力升级

**Milestone focus:** 受限范围的演出升级：预设化立绘动画、单页单镜头、扩展转场、运行时真预览；不引入新的动画/渲染依赖。

**Guardrails:**
- Runtime / editor preview parity is mandatory
- No new animation or rendering dependencies
- Unknown enum preservation and legacy compatibility are mandatory
- Scope stays preset-based, not a freeform animation platform

**Coverage:** 18/18 v1 requirements mapped

## Phases

- [x] **Phase 61: Contract Freeze & Visual Ownership** - Freeze compatibility rules and isolate camera effects to stage-owned visuals only (completed 2026-04-21)
- [x] **Phase 62: Character Preset Runtime Foundation** - Deliver per-character preset animation selection and runtime lifecycle rules (completed 2026-04-21)
- [x] **Phase 63: Camera Runtime & Shared Cleanup** - Deliver single-effect page camera playback with bounded controls and reliable reset behavior (completed 2026-04-21)
- [x] **Phase 64: Background Transition Expansion** - Expand transition variety while preserving legacy behavior and stable page-enter ordering (completed 2026-04-21)
- [x] **Phase 65: Iframe Effect Preview API** - Expose runtime-backed replay for character, camera, and transition previews (completed 2026-04-21)
- [x] **Phase 66: Editor Controls & Compatibility UX** - Add in-flow PageInspector controls for cinematic settings without a new editing mode (completed 2026-04-21)
- [x] **Phase 67: Integration & Regression Gate** - Prove clean behavior across skip, auto, load, title return, and preview-stop flows (completed 2026-04-21)
- [x] **Phase 68: Foundation Verification Backfill** - Rebuild auditable verification evidence for the v1.4 foundation phases so milestone requirements stop failing as orphaned audit gaps (completed 2026-04-22)
- [ ] **Phase 69: Preview & Transition Verification Backfill** - Rebuild auditable verification evidence for transition, preview, and editor UX phases without reopening deferred tech debt scope
- [ ] **Phase 70: Regression Gate Verification Closeout** - Close the final PREV-05 evidence gap and prepare v1.4 for re-audit

## Phase Details

### Phase 61: Contract Freeze & Visual Ownership
**Goal**: Legacy and future project data remain intact while page camera effects are isolated to the stage visuals instead of the dialogue UI.
**Depends on**: Nothing (starts after Phase 60)
**Requirements**: PREV-04, CAM-05
**Success Criteria** (what must be TRUE):
  1. Opening and saving a project with unknown animation, camera, or transition values preserves those values instead of silently clearing them.
  2. During a page camera effect, players can still read the dialogue box and overlay screens because only the stage visuals move or flash.
**Plans**: 2 plans
Plans:
- [x] 61-01-PLAN.md — Stage-layer DOM ownership, character motion wrapper scaffolding, and export shell parity
- [x] 61-02-PLAN.md — Unknown enum preservation, compatibility helpers, and runtime safe fallbacks

### Phase 62: Character Preset Runtime Foundation
**Goal**: Creators can assign stable preset animations to page characters and players see the correct one-shot or loop lifecycle.
**Depends on**: Phase 61
**Requirements**: ANIM-01, ANIM-02, ANIM-03
**Success Criteria** (what must be TRUE):
  1. Creators can assign one preset animation to each character on a page.
  2. Available character presets include at least `fade-in`, `slide-in-left`, `slide-in-right`, `shake`, `nod`, and `breathe`.
  3. Players see one-shot character animations finish automatically, while looping animations continue only on the current page and clear when leaving it.
**Plans**: 2 plans
Plans:
- [x] 62-01-PLAN.md — Freeze preset contract/defaults and emit page-entry animation through ScriptEngine only
- [x] 62-02-PLAN.md — Implement CharacterLayer preset playback, motion-only CSS, and cleanup lifecycle

### Phase 63: Camera Runtime & Shared Cleanup
**Goal**: Creators can configure one bounded camera effect per page and players see it trigger reliably on page entry without stacking.
**Depends on**: Phase 61, Phase 62
**Requirements**: CAM-01, CAM-02, CAM-03, CAM-04
**Success Criteria** (what must be TRUE):
  1. Creators can assign one camera effect to a page.
  2. Available camera effects include `shake`, `zoom`, `pan`, and `flash`, with duration, intensity, and direction controls when relevant.
  3. Players see the configured camera effect trigger when the page enters, and only one page-level camera effect is active at a time.
**Plans**: 2 plans
Plans:
- [x] 63-01-PLAN.md — Freeze page camera contract/defaults and emit camera metadata through page_enter only
- [x] 63-02-PLAN.md — Implement CameraController playback, stage-local flash, and shared cleanup wiring in main.js

### Phase 64: Background Transition Expansion
**Goal**: Page transitions become more expressive without breaking legacy transition behavior or page-enter sequencing.
**Depends on**: Phase 61, Phase 62, Phase 63
**Requirements**: TRAN-01, TRAN-02, TRAN-04
**Success Criteria** (what must be TRUE):
  1. Creators can choose at least 7 visually distinct transition types for a page.
  2. The transition list includes `dissolve`, `wipe`, `scale`, and `blur`, while existing `none`, `fade`, and `slide-*` behaviors remain compatible.
  3. Players see a stable sequence where the old page exits and the background transition finishes before character animation and camera effects begin.
**Plans**: 2 plans
Plans:
- [x] 64-01-PLAN.md — Expand the shared transition contract and BackgroundLayer owner for expressive CSS-only transitions
- [x] 64-02-PLAN.md — Gate page-enter fan-out behind background transition completion and reset-safe cleanup

### Phase 65: Iframe Effect Preview API
**Goal**: Creators can replay cinematic effects through the runtime-backed iframe preview interface and return to their editing state afterward.
**Depends on**: Phase 62, Phase 63, Phase 64
**Requirements**: ANIM-04, TRAN-03, PREV-02, PREV-03
**Success Criteria** (what must be TRUE):
  1. Creators can replay a single character animation in the iframe runtime without launching full test play.
  2. Creators can preview a single transition effect without actually switching to another page.
  3. Creators can replay character animation, camera effect, and transition through the iframe runtime and receive clear disabled or failure feedback when preview is unavailable.
  4. After any effect preview ends or is canceled, the editor returns to the pre-preview page state.
**Plans**: 2 plans
Plans:
- [x] 65-01-PLAN.md — Add editor-side effect preview session state, reason-coded preflight, and shared request plumbing without expanding PageInspector UX
- [x] 65-02-PLAN.md — Implement runtime preview-effect protocol, restore-safe owner replay, and same-page transition preview wiring
**UI hint**: yes

### Phase 66: Editor Controls & Compatibility UX
**Goal**: Creators can configure animations, camera, and transitions directly in the existing page editing interface.
**Depends on**: Phase 65
**Requirements**: PREV-01
**Success Criteria** (what must be TRUE):
  1. In the existing PageInspector flow, creators can choose a character animation without entering a separate mode or screen.
  2. In the existing PageInspector flow, creators can configure page camera effect type and parameters without leaving normal page editing.
  3. In the existing PageInspector flow, creators can choose page transition settings from the same editing interface.
**Plans**: 2 plans
Plans:
- [x] 66-01-PLAN.md — Add shared unknown-safe cinematic option helpers and scoped preview-state contracts for PageInspector
- [x] 66-02-PLAN.md — Wire character, camera, and transition controls plus inline preview UX into PageInspector
**UI hint**: yes

### Phase 67: Integration & Regression Gate
**Goal**: Runtime play and editor preview remain visually clean across the high-risk flows that make cinematic features feel trustworthy.
**Depends on**: Phase 62, Phase 63, Phase 64, Phase 65, Phase 66
**Requirements**: PREV-05
**Success Criteria** (what must be TRUE):
  1. Players do not see leftover animation classes, camera transforms, or flash overlays after skip, auto, load, or return-to-title flows.
  2. Stopping preview or rapidly replaying effects returns the stage to a clean state before the next effect runs.
**Plans**: 2 plans

Plans:
- [x] 67-01-PLAN.md — Add the PREV-05 regression matrix and extend focused cinematic cleanup suites before runtime edits
- [x] 67-02-PLAN.md — Apply the smallest main.js cleanup-orchestration fixes needed to make the PREV-05 gate pass

### Phase 68: Foundation Verification Backfill
**Goal**: Recreate auditable verification artifacts for the v1.4 foundation phases so completed runtime work can satisfy milestone audit gates.
**Depends on**: Phase 67
**Requirements**: CAM-05, PREV-04, ANIM-01, ANIM-02, ANIM-03, CAM-01, CAM-02, CAM-03, CAM-04
**Gap Closure**: Closes orphaned audit gaps for Phase 61-63 requirements from `.planning/v1.4-v1.4-MILESTONE-AUDIT.md`.
**Success Criteria** (what must be TRUE):
  1. Phase 61, 62, and 63 each have phase-level verification artifacts with explicit requirement tables and evidence.
  2. Nyquist validation coverage exists or is explicitly refreshed for the foundation phases instead of remaining missing.
  3. The milestone audit can trace CAM/ANIM/PREV foundation requirements through REQUIREMENTS.md, SUMMARY evidence, and verification artifacts without orphan status.
**Plans**: 2 plans
Plans:
- [x] 68-01-PLAN.md — Produce verification coverage for Phase 61 and Phase 62 requirements with auditable evidence
- [x] 68-02-PLAN.md — Produce verification coverage for Phase 63 requirements and close the remaining foundation audit gaps

### Phase 69: Preview & Transition Verification Backfill
**Goal**: Recreate auditable verification artifacts for transition, preview, and PageInspector cinematic phases without expanding scope into deferred cleanup debt.
**Depends on**: Phase 68
**Requirements**: TRAN-01, TRAN-02, TRAN-04, ANIM-04, TRAN-03, PREV-02, PREV-03, PREV-01
**Gap Closure**: Closes orphaned audit gaps for Phase 64-66 requirements from `.planning/v1.4-v1.4-MILESTONE-AUDIT.md`.
**Success Criteria** (what must be TRUE):
  1. Phase 64, 65, and 66 each have phase-level verification artifacts with explicit requirement tables and evidence.
  2. Existing VALIDATION.md planning files are superseded by actual verification evidence for transition/preview/editor UX requirements.
  3. The milestone audit can trace transition and preview requirements through REQUIREMENTS.md, SUMMARY evidence, and verification artifacts without orphan status.
**Plans**: 2 plans
Plans:
- [ ] 69-01-PLAN.md — Verify transition and preview runtime evidence for Phase 64 and Phase 65 requirements
- [ ] 69-02-PLAN.md — Verify PageInspector cinematic UX evidence for Phase 66 and reconcile preview requirement traceability

### Phase 70: Regression Gate Verification Closeout
**Goal**: Close the final PREV-05 audit gap and make v1.4 ready for milestone re-audit.
**Depends on**: Phase 69
**Requirements**: PREV-05
**Gap Closure**: Closes the remaining Phase 67 orphaned requirement and final re-audit blocker from `.planning/v1.4-v1.4-MILESTONE-AUDIT.md`.
**Success Criteria** (what must be TRUE):
  1. Phase 67 has auditable verification evidence that ties the focused regression gate to PREV-05.
  2. v1.4 requirement traceability is consistent with the new gap-closure phases and no longer relies on stale completed markers.
  3. The milestone is ready for `/gsd-audit-milestone` rerun without PREV-05 remaining orphaned.
**Plans**: 2 plans
Plans:
- [ ] 70-01-PLAN.md — Produce verification evidence for PREV-05 using the focused regression gate and cleanup suites
- [ ] 70-02-PLAN.md — Reconcile milestone traceability evidence and prepare v1.4 for re-audit

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 61. Contract Freeze & Visual Ownership | 2/2 | Complete   | 2026-04-21 |
| 62. Character Preset Runtime Foundation | 2/2 | Complete | 2026-04-21 |
| 63. Camera Runtime & Shared Cleanup | 2/2 | Complete | 2026-04-21 |
| 64. Background Transition Expansion | 2/2 | Complete | 2026-04-21 |
| 65. Iframe Effect Preview API | 2/2 | Complete   | 2026-04-21 |
| 66. Editor Controls & Compatibility UX | 2/2 | Complete   | 2026-04-21 |
| 67. Integration & Regression Gate | 2/2 | Complete   | 2026-04-21 |
| 68. Foundation Verification Backfill | 2/2 | Complete | 2026-04-22 |
| 69. Preview & Transition Verification Backfill | 0/2 | Pending | - |
| 70. Regression Gate Verification Closeout | 0/2 | Pending | - |
