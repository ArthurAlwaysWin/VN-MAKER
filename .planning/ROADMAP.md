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

## v1.1 — UI Theme System v2 引擎配置化 🚧

**Milestone Goal:** 让游戏所有 UI 界面（存读档/回想/菜单/设置/对话框名牌）都可通过 `script.json` 的 `ui.*` 配置来定制外观，无需修改引擎代码。所有 setLayout 方法 null = 保持现有硬编码行为，完全向后兼容。

### Phases

- [x] **Phase 42: widgetStyles 控件风格基础** — 数据模型 + 默认值深合并 + Tab/Toggle/Slider/Panel/Button 五类控件数据驱动渲染 (completed 2026-04-16)
- [x] **Phase 43: 界面布局配置** — SaveLoadScreen/BacklogScreen/GameMenu 新增 setLayout 方法，接受 ui.* 配置驱动外观 (completed 2026-04-16)
- [ ] **Phase 44: SettingsScreen 结构化模式** — elements 为空时自动按 SETTING_DEFS 分组渲染 header/tabBar/contentArea 结构，控件样式从 widgetStyles 取
- [ ] **Phase 45: 名牌样式 + 配置统一 + 编辑器预览** — DialogueBox nameplateStyle 三种样式 + main.js 统一配置传入 + 编辑器 iframe 预览集成

### Phase Details

#### Phase 42: widgetStyles 控件风格基础
**Goal**: 引擎从数据驱动渲染所有控件类型——Tab/Toggle/Slider/Panel/Button 的形状、颜色、尺寸全部由 `ui.widgetStyles` 配置决定
**Depends on**: Nothing (v1.1 foundation)
**Requirements**: WIDGET-01, WIDGET-02, WIDGET-03, WIDGET-04, WIDGET-05, COMPAT-01
**Success Criteria** (what must be TRUE):
  1. 引擎读取 `ui.widgetStyles`，与内置默认值深合并——任何缺失/null 字段产出当前默认视觉效果
  2. Tab 控件根据 `tab.shape` 正确渲染 5 种形状（rectangle/pill/underline/trapezoid/ribbon），包括对应 DOM 结构和 CSS
  3. Toggle 控件根据 `toggle.style` 正确渲染 4 种样式（pill/radio/checkbox/button-pair），ON/OFF 状态切换正常
  4. Slider 轨道颜色/填充颜色/滑块形状和颜色/尺寸全部由 `widgetStyles.slider` 配置驱动
  5. 没有 `widgetStyles` 的旧项目（v1.0 及之前）显示完全相同的视觉效果——零回归
**Plans**: 3 plans
Plans:
- [x] 42-01-PLAN.md — Data model (WIDGET_DEFAULTS + deepMerge) + Panel/Button widgets
- [x] 42-02-PLAN.md — Tab (5 shapes) + Toggle (4 styles) + Slider widgets
- [x] 42-03-PLAN.md — SettingsScreen integration + backward compatibility verification
**UI hint**: yes

#### Phase 43: 界面布局配置
**Goal**: 三个封闭 UI 界面（存读档/回想/游戏菜单）接受布局配置并渲染自定义外观
**Depends on**: Nothing (independent of Phase 42)
**Requirements**: SCREEN-01, SCREEN-02, SCREEN-03, COMPAT-02
**Success Criteria** (what must be TRUE):
  1. SaveLoadScreen.setLayout(config) 正确应用背景/标题文字和颜色/网格布局/槽位样式/分页样式
  2. BacklogScreen.setLayout(config) 正确应用背景/标题栏/条目样式（说话人颜色、字号、悬停效果）
  3. GameMenu.setLayout(config) 正确应用位置/宽度/背景/圆角/模糊/按钮间距/各按钮文字和图标
  4. 三个界面调用 setLayout(null) 时渲染结果与当前硬编码行为完全一致——零视觉变化
**Plans**: 3 plans
Plans:
- [x] 43-01-PLAN.md — SaveLoadScreen.setLayout() (SCREEN-01)
- [ ] 43-02-PLAN.md — BacklogScreen.setLayout() (SCREEN-02)
- [ ] 43-03-PLAN.md — GameMenu.setLayout() (SCREEN-03)
**UI hint**: yes

#### Phase 44: SettingsScreen 结构化模式
**Goal**: SettingsScreen 在无自定义 elements 时自动从 SETTING_DEFS 按分组渲染完整结构化设置界面
**Depends on**: Phase 42 (needs widgetStyles for control rendering)
**Requirements**: SCREEN-04, SCREEN-05
**Success Criteria** (what must be TRUE):
  1. 当 `elements[]` 为空但存在 `header`/`tabBar`/`contentArea` 配置时，SettingsScreen 渲染 header + Tab 栏 + 内容面板结构布局
  2. Tab 栏使用 `widgetStyles.tab.shape` 渲染对应形状，点击切换设置分组（声音/画面/游戏）
  3. 内容区的 Toggle/Slider 控件使用 `widgetStyles.toggle.style` 和 `widgetStyles.slider.*` 渲染对应外观
  4. 当 `elements[]` 非空时，现有自由布局模式照常渲染，不受结构化模式影响
**Plans**: TBD
**UI hint**: yes

#### Phase 45: 名牌样式 + 配置统一 + 编辑器预览
**Goal**: 所有 UI 配置通过 main.js 单一初始化路径流入各组件，名牌支持 3 种视觉样式，编辑器预览反映全部配置
**Depends on**: Phase 42, Phase 43, Phase 44 (CONFIG-01 needs all setLayout methods to exist)
**Requirements**: NAMEPLATE-01, NAMEPLATE-02, NAMEPLATE-03, CONFIG-01, CONFIG-02
**Success Criteria** (what must be TRUE):
  1. `main.js` init() 在 engine.load() 之后从 `ui.*` 读取配置，集中调用 setLayout/setWidgetStyles 传入所有 UI 组件
  2. DialogueBox `nameplateStyle: "inline"`（或缺失）渲染说话人名字在文字区上方——与当前行为完全一致
  3. DialogueBox `nameplateStyle: "floating"` 渲染说话人名字为浮动气泡，定位在对话框左上角外侧
  4. DialogueBox `nameplateStyle: "banner"` 渲染说话人名字为横跨对话框整个宽度的横幅条
  5. 编辑器试玩 iframe 通过 postMessage 传递完整 `ui.*` 配置，预览效果与最终导出游戏一致
**Plans**: TBD
**UI hint**: yes

### Progress

**Execution Order:** Phase 42 → 43 → 44 → 45

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 42. widgetStyles 控件风格基础 | 3/3 | Complete    | 2026-04-16 |
| 43. 界面布局配置 | 1/1 | Complete   | 2026-04-16 |
| 44. SettingsScreen 结构化模式 | 0/? | Not started | - |
| 45. 名牌样式 + 配置统一 + 编辑器预览 | 0/? | Not started | - |