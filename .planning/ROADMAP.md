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

## v1.2 — 编辑器主题配置 + 示范主题 🚧

**Milestone Goal:** 让用户在编辑器中可视化编辑所有 v1.1 新增的引擎配置项（widgetStyles 控件风格 / 界面布局），并提供 5 套内置主题作为起点。编辑器采用 ThemeDesigner 表单 + iframe 实时预览模式，所有数据通过 Pinia store 持久化到 script.json。

### Phases

- [x] **Phase 46: 数据持久化 + 编辑器骨架** — Store 读写 widgetStyles/布局 + 控件风格编辑器视图骨架 + iframe 预览区 (completed 2026-04-17)
- [ ] **Phase 47: 控件编辑器 — Tab/Toggle/Slider** — Tab 形状缩略图网格 + Toggle 样式缩略图网格 + Slider 颜色/形状配置
- [ ] **Phase 48: 控件编辑器 — Panel/Button + 实时预览** — Panel 背景/圆角/边框/模糊/贴图 + Button 三态 + 全控件 iframe 实时预览
- [ ] **Phase 49: 布局编辑器 — SaveLoad/Backlog** — 存读档/回想界面结构化表单配置
- [ ] **Phase 50: 布局编辑器 — GameMenu/Settings + 实时预览** — 游戏菜单/设置界面表单配置 + 全布局 iframe 实时预览
- [ ] **Phase 51: 内置主题 + 主题选择器** — 5 套内置主题数据包（2 全配置 + 3 纯配色）+ 主题选择器一键应用

### Phase Details

#### Phase 46: 数据持久化 + 编辑器骨架
**Goal**: widgetStyles 和界面布局数据通过 Pinia store 读写 script.json，控件风格编辑器视图骨架和 iframe 预览区就位
**Depends on**: Nothing (v1.2 foundation)
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. 编辑器中可导航到控件风格编辑器视图（左侧表单区 + 右侧 iframe 预览区，遵循 ThemeDesigner 两栏模式）
  2. 打开项目时，script.json 中已有的 `ui.widgetStyles` 和各界面布局配置正确加载到 store
  3. 通过 store 修改 widgetStyles 或布局数据后，2s 内自动保存到磁盘（复用现有自动保存机制）
  4. Ctrl+Z / Ctrl+Y 可撤销/重做 widgetStyles 和布局的编辑操作
**Plans:** 2/2 plans complete

Plans:
- [ ] 46-01-PLAN.md — Store persistence methods + Engine preview protocol
- [ ] 46-02-PLAN.md — Editor view shells + Composables + Tab registration

**UI hint**: yes

#### Phase 47: 控件编辑器 — Tab/Toggle/Slider
**Goal**: 用户可通过缩略图网格和颜色选择器配置 Tab 形状、Toggle 样式、Slider 外观
**Depends on**: Phase 46
**Requirements**: WEDITOR-01, WEDITOR-02, WEDITOR-03
**Success Criteria** (what must be TRUE):
  1. 用户从 5 个缩略图网格中选择 Tab 形状（rectangle/pill/underline/trapezoid/ribbon），当前选中项高亮显示
  2. 用户从 4 个缩略图网格中选择 Toggle 样式（pill/radio/checkbox/button-pair），当前选中项高亮显示
  3. 用户通过颜色选择器和下拉框配置 Slider 的轨道颜色、填充颜色、滑块形状和颜色
  4. 所有选择立即更新 store 数据，保存后重新打开项目数据不丢失
**Plans**: TBD
**UI hint**: yes

#### Phase 48: 控件编辑器 — Panel/Button + 实时预览
**Goal**: 用户可配置 Panel 和 Button 全部样式属性，所有控件编辑通过 iframe 实时预览
**Depends on**: Phase 47
**Requirements**: WEDITOR-04, WEDITOR-05, WEDITOR-06
**Success Criteria** (what must be TRUE):
  1. 用户可配置 Panel 的背景色、圆角、边框、模糊效果、背景贴图（含九宫格配置）
  2. 用户可配置 Button 的背景色、圆角、边框、背景贴图，以及 normal/hover/active 三态样式
  3. 修改任意控件样式（Tab/Toggle/Slider/Panel/Button）后，iframe 预览区在 ~200ms 内反映变化
  4. iframe 预览展示所有 5 类控件的当前样式效果
**Plans**: TBD
**UI hint**: yes

#### Phase 49: 布局编辑器 — SaveLoad/Backlog
**Goal**: 用户可通过结构化表单配置存读档界面和回想界面的布局
**Depends on**: Phase 46
**Requirements**: LEDITOR-01, LEDITOR-02
**Success Criteria** (what must be TRUE):
  1. SaveLoadScreen 编辑器提供背景、标题文字/颜色、网格行列数/间距、槽位样式、分页样式等表单字段
  2. BacklogScreen 编辑器提供背景、标题栏（文字/背景图/高度）、条目样式（说话人颜色/字号/悬停效果）等表单字段
  3. 布局修改保存后重新打开项目，配置数据完整保留
  4. 各字段默认值与引擎内置外观一致（空配置 = 当前默认渲染效果）
**Plans**: TBD
**UI hint**: yes

#### Phase 50: 布局编辑器 — GameMenu/Settings + 实时预览
**Goal**: 用户可配置游戏菜单和设置界面布局，所有布局编辑通过 iframe 实时预览
**Depends on**: Phase 48, Phase 49
**Requirements**: LEDITOR-03, LEDITOR-04, LEDITOR-05
**Success Criteria** (what must be TRUE):
  1. GameMenu 编辑器提供位置/宽度/背景/圆角/模糊/按钮间距/各按钮文字和图标等表单字段
  2. SettingsScreen 编辑器提供 header/tabBar/contentArea 的样式配置表单（针对结构化模式）
  3. 修改任一界面布局后，iframe 预览区实时反映变化
  4. 控件风格编辑器的修改同时影响布局预览中的控件渲染（widgetStyles 联动）
**Plans**: TBD
**UI hint**: yes

#### Phase 51: 内置主题 + 主题选择器
**Goal**: 用户可从 5 套内置主题中选择一套作为起点，一键应用后在编辑器中进一步定制
**Depends on**: Phase 48, Phase 50
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04
**Success Criteria** (what must be TRUE):
  1. default 主题将引擎当前默认值封装为完整数据包（tokens + widgetStyles + 各界面布局配置）
  2. wafuu 主题提供完整日式风格配置，包含所有适用表面的九宫格贴图资源
  3. modern-sky / fantasy-dark / minimal-white 三套主题各提供独特配色方案（tokens + widgetStyles 颜色值，无自定义贴图）
  4. 主题选择器 UI 展示全部 5 套主题并支持视觉预览，选择后一键应用到项目（支持 Ctrl+Z 撤销）
  5. 应用的主题值自动填入控件风格和布局编辑器，可在此基础上继续定制
**Plans**: TBD
**UI hint**: yes

### Progress

**Execution Order:** Phase 46 → 47 → 48 → 49 → 50 → 51 (49 可与 47-48 并行)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 46. 数据持久化 + 编辑器骨架 | 0/2 | Complete    | 2026-04-17 |
| 47. 控件编辑器 — Tab/Toggle/Slider | 0/? | Not started | - |
| 48. 控件编辑器 — Panel/Button + 实时预览 | 0/? | Not started | - |
| 49. 布局编辑器 — SaveLoad/Backlog | 0/? | Not started | - |
| 50. 布局编辑器 — GameMenu/Settings + 实时预览 | 0/? | Not started | - |
| 51. 内置主题 + 主题选择器 | 0/? | Not started | - |