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

## v1.3 — 主题系统表达力升级

主题系统表达力升级 — 让用户通过内置模板 + 关键结构参数，能做出从 Aokana 到千恋万花跨度的 UI 美术风格。

Two tracks: **Smart Color** (OKLCH derivation, 2-input editor) + **Structural Params** (tab config, layout, decorations, editor UI). Engine changes first, then editor, themes last.

### Phases

- [ ] **Phase 52: Smart Color Foundation** - OKLCH module + rule table + derivation function (pure engine library)
- [ ] **Phase 53: Configurable Tabs (Engine)** - Tab structure, icons, setting-key assignment, backward compat
- [x] **Phase 54: Content Layout + Row Styling (Engine)** - Two-column grid, dividers, zebra, label options
- [ ] **Phase 55: Left-Tab Mode + Decorations (Engine)** - Sidebar navigation, header decorations, footer reset, panel background
- [ ] **Phase 56: Smart Color Editor UI** - 2-picker panel, recipe storage, live preview
- [ ] **Phase 57: Tab & Layout Editor** - Tab CRUD + setting matrix + layout controls + tab position toggle
- [ ] **Phase 58: Decoration & Background Editor** - Header decoration manager + footer button config + panel background + live preview
- [ ] **Phase 59: Title Page Preview** - Iframe engine preview in title page editor
- [ ] **Phase 60: Built-in Theme Upgrade** - 5 themes with colorRecipe + structural params + commercial VN aesthetics

### Phase Details

#### Phase 52: Smart Color Foundation ✅
**Goal**: Engine can derive a complete 36-token color palette from two hex colors + dark/light mode choice
**Depends on**: Nothing (pure library, zero coupling to existing code)
**Requirements**: COLOR-01, COLOR-02, COLOR-03
**Status**: COMPLETE
**Plans**: 52-01 (OKLCH Module + Rule Table + Derivation Function) ✅
**Commits**: `8fcd655` (feat), `dc49779` (test)

#### Phase 53: Configurable Tabs (Engine)
**Goal**: Users can define custom tab structure with icons and per-tab setting assignment in the engine settings screen
**Depends on**: Nothing (independent engine track)
**Requirements**: STRUCT-01, STRUCT-02, STRUCT-03, STRUCT-07
**Status**: ✅ COMPLETE
**Commits**: `c4ae7e8` feat(53), `395e633` test(53)
**Success Criteria** (what must be TRUE):
  1. Setting `tabBar.tabs` to a 4-item array renders 4 tab buttons with custom labels ✅
  2. Each tab shows exactly the settings listed in its `settingKeys` array ✅
  3. Tab buttons display icon image + text when `tabs[].icon` is set to an asset path ✅
  4. Omitting `tabBar.tabs` entirely renders the settings screen identically to v1.2 (zero visual regression) ✅
  5. Setting keys not assigned to any tab are appended to the last tab (graceful forward-compat) ✅
**Plans**: 53-01-PLAN.md (1 plan, 4 tasks)

#### Phase 54: Content Layout + Row Styling (Engine) ✅
**Goal**: Engine settings content area supports two-column grid layout and visual row decoration
**Depends on**: Phase 53 (layout builds on configurable tab content rendering)
**Requirements**: STRUCT-04, STRUCT-05
**Status**: COMPLETE
**Commits**: `2438f4d` test(54-01), `99022d6` feat(54-01)
**Success Criteria** (what must be TRUE):
  1. Setting `contentArea.columns=2` renders setting items in a 2-column CSS Grid ✅
  2. `itemStyle.showDividers=true` draws hairline separators between setting rows ✅
  3. `itemStyle.alternateBackground=true` applies zebra-striped row backgrounds ✅
  4. `itemStyle.labelPosition='top'` stacks label above control instead of beside it ✅
  5. `itemStyle.showValueLabel=false` hides the numeric readout next to sliders ✅
**Plans:** 1 plan
Plans:
- [x] 54-01-PLAN.md — Grid layout + row styling + value label gating (TDD)

#### Phase 55: Left-Tab Mode + Decorations (Engine)
**Goal**: Engine supports sidebar tab navigation and decorative elements for commercial VN aesthetics
**Depends on**: Phase 53 (left-tab needs tab structure; decorations need structured mode)
**Requirements**: STRUCT-06, DECOR-01, DECOR-02, DECOR-03
**Success Criteria** (what must be TRUE):
  1. `tabBar.position='left'` renders vertical sidebar navigation (Senrenbanka style) with content area beside it
  2. `header.decorations[]` renders positioned images (corner ornaments, divider lines) within the header area
  3. Footer button with `action: 'reset'` resets all settings to `ConfigManager.defaults`
  4. `settingsScreen.background` displays a background image (e.g., character watermark) behind the settings panel content
**Plans**: TBD

#### Phase 56: Smart Color Editor UI
**Goal**: Users edit theme colors through two color pickers + mode toggle instead of 41 individual token controls
**Depends on**: Phase 52 (editor imports OKLCH + deriveTokens from engine)
**Requirements**: COLOR-04, COLOR-05, COLOR-06
**Success Criteria** (what must be TRUE):
  1. SmartColorPanel shows 2 color pickers (primary + accent) and a dark/light mode toggle
  2. Changing primary color immediately derives and previews all 35 tokens in the iframe
  3. User can select harmony algorithm (complementary/analogous/triadic/split-complementary) to auto-derive accent from primary
  4. Color recipe (primary/accent/mode/algorithm) persists in script.json alongside the full generated token set
  5. Individual token overrides survive when user re-derives from recipe changes (overrides stored separately)
**Plans**: TBD
**UI hint**: yes

#### Phase 57: Tab & Layout Editor
**Goal**: Users visually configure tab structure and content layout without touching JSON
**Depends on**: Phases 53, 54, 55 (editor configures features that engine already renders)
**Requirements**: EDITOR-01, EDITOR-02, EDITOR-04
**Success Criteria** (what must be TRUE):
  1. User can add/remove tabs, rename labels, and assign an icon image to each tab
  2. Checkbox matrix shows all SETTING_DEFS keys; user assigns each key to exactly one tab (assigned keys grayed out in other tabs)
  3. Column count radio (1/2) and row style toggles (dividers, zebra, value labels, label width, label position) update the settings screen
  4. Tab position toggle (top/left) switches between horizontal tabs and sidebar navigation
  5. All changes preview in real-time via iframe postMessage
**Plans**: TBD
**UI hint**: yes

#### Phase 58: Decoration & Background Editor
**Goal**: Users configure header decorations, footer buttons, and panel background through the editor
**Depends on**: Phase 57 (builds on the editor infrastructure established for tab/layout editing)
**Requirements**: EDITOR-03, EDITOR-05, EDITOR-06
**Success Criteria** (what must be TRUE):
  1. User can add/remove header decoration images with position (x/y) and size (width/height) controls
  2. Footer button editor allows configuring button text and action (close/title/reset) for each button
  3. User can select a panel background image and adjust its opacity
  4. All structural parameter edits from both Phase 57 and Phase 58 preview live in the iframe
**Plans**: TBD
**UI hint**: yes

#### Phase 59: Title Page Preview
**Goal**: Users see actual engine-rendered title page in the editor
**Depends on**: Nothing specific (independent feature; iframe basics already exist from v0.3 Phase 14)
**Requirements**: TITLE-01
**Success Criteria** (what must be TRUE):
  1. Title page editor tab embeds an iframe showing the engine's rendered title page
  2. Title screen buttons and background are visible in the preview
  3. Changes to title page settings (background, BGM, button positions) reflect in the iframe preview
**Plans**: TBD
**UI hint**: yes

#### Phase 60: Built-in Theme Upgrade
**Goal**: All 5 built-in themes demonstrate the full expressiveness of v1.3 structural + color features
**Depends on**: Phases 56, 58 (themes exercise all new color and structural features)
**Requirements**: UPGRADE-01, UPGRADE-02, UPGRADE-03, UPGRADE-04
**Success Criteria** (what must be TRUE):
  1. All 5 themes use `colorRecipe` format (primary/accent/mode/algorithm) instead of hand-coded token values
  2. At least 1 theme uses `tabBar.position='left'` showcasing Senrenbanka-style sidebar navigation
  3. At least 1 theme uses `columns=2` + `itemStyle` row decorations showcasing Aokana-style two-column layout
  4. At least 2 themes include tab icons and header decorations for commercial VN aesthetics

**Plans**: TBD

### Coverage

```
COLOR-01  → Phase 52    STRUCT-01 → Phase 53    DECOR-01  → Phase 55
COLOR-02  → Phase 52    STRUCT-02 → Phase 53    DECOR-02  → Phase 55
COLOR-03  → Phase 52    STRUCT-03 → Phase 53    DECOR-03  → Phase 55
COLOR-04  → Phase 56    STRUCT-04 → Phase 54    EDITOR-01 → Phase 57
COLOR-05  → Phase 56    STRUCT-05 → Phase 54    EDITOR-02 → Phase 57
COLOR-06  → Phase 56    STRUCT-06 → Phase 55    EDITOR-03 → Phase 58
                        STRUCT-07 → Phase 53    EDITOR-04 → Phase 57
TITLE-01  → Phase 59                            EDITOR-05 → Phase 58
UPGRADE-01 → Phase 60                           EDITOR-06 → Phase 58
UPGRADE-02 → Phase 60
UPGRADE-03 → Phase 60
UPGRADE-04 → Phase 60

Mapped: 27/27 ✓
```

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 52. Smart Color Foundation | 0/? | Not started | - |
| 53. Configurable Tabs (Engine) | 0/? | Not started | - |
| 54. Content Layout + Row Styling | 0/? | Not started | - |
| 55. Left-Tab + Decorations (Engine) | 0/? | Not started | - |
| 56. Smart Color Editor UI | 0/? | Not started | - |
| 57. Tab & Layout Editor | 0/? | Not started | - |
| 58. Decoration & Background Editor | 0/? | Not started | - |
| 59. Title Page Preview | 0/? | Not started | - |
| 60. Built-in Theme Upgrade | 0/? | Not started | - |