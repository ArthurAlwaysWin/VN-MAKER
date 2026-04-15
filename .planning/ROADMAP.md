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

## v1.0 — 角色表情/差分場景切換 🚧

### Phases

- [x] **Phase 37: CharacterLayer DOM 重構** — 單 `<img>` 重構為雙圖層容器結構，保持 4 種定位模式不變 (completed 2026-04-13)
- [x] **Phase 38: 表情交叉漸變** — CSS opacity crossfade 過渡 + 圖片預加載 + 快進模式跳過動畫 (completed 2026-04-13)
- [x] **Phase 39: 表情狀態管理** — 引擎表情狀態 Map + 頁面繼承 + 存讀檔持久化 + 場景邊界重置 (completed 2026-04-13)
- [ ] **Phase 40: 表情選擇器 UI** — ExpressionDropdown 縮略圖網格組件 + PageInspector 集成替換 `<select>`
- [ ] **Phase 41: 編輯器狀態展示與容錯** — 畫布繼承表情預覽 + stale 引用優雅降級

### Phase Details

#### Phase 37: CharacterLayer DOM 重構
**Goal**: 角色渲染層使用雙圖層 DOM 結構（容器 div + 兩個 img），為交叉漸變奠定基礎
**Depends on**: Nothing (v1.0 first phase)
**Requirements**: ENG-01
**Success Criteria** (what must be TRUE):
  1. 角色在 4 種定位模式（left/center/right/custom）下使用新雙圖層 DOM 結構正確顯示
  2. 現有腳本（demo script.json）渲染結果與重構前完全一致（零視覺回歸）
  3. 角色進場/退場動畫在新容器結構下正常運作
**Plans:** 1/1 plans complete

Plans:
- [x] 37-01-PLAN.md — CharacterLayer dual-layer DOM refactoring + style.css update + visual verification

#### Phase 38: 表情交叉漸變
**Goal**: 表情切換時平滑交叉漸變過渡，預加載防閃白，快進模式即時替換
**Depends on**: Phase 37
**Requirements**: ENG-02, ENG-03
**Success Criteria** (what must be TRUE):
  1. 切換角色表情時顯示平滑 CSS opacity 交叉漸變（無閃白或空白幀）
  2. 新表情圖片完全預加載後才開始過渡動畫
  3. 快進模式下表情切換為 0ms 即時替換（無過渡動畫）
  4. 快速連續切換表情不產生殘影或堆疊異常
**Plans:** 1/1 plans complete

Plans:
- [x] 38-01-PLAN.md — CSS opacity crossfade + image preload + skipMode instant swap

#### Phase 39: 表情狀態管理
**Goal**: 引擎維護每角色表情狀態，跨頁繼承、存讀檔持久化、場景邊界重置
**Depends on**: Phase 37
**Requirements**: STATE-01, STATE-02, STATE-03
**Success Criteria** (what must be TRUE):
  1. 頁面未指定表情時，引擎沿用上一頁的表情（繼承）
  2. 角色首次出現且無指定表情時，fallback 到該角色第一個表情
  3. 存檔包含當前每角色表情狀態，讀檔後正確恢復表情顯示
  4. 進入新場景時重置表情狀態（清除繼承，從 fallback 重新開始）
**Plans:** 1/1 plans complete

Plans:
- [x] 39-01-PLAN.md — Expression state Map + resolution chain + save/load persistence + scene reset

#### Phase 40: 表情選擇器 UI
**Goal**: 編輯器提供視覺化縮略圖表情選擇器，替換 PageInspector 中的純文字 `<select>`
**Depends on**: Phase 39
**Requirements**: UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. ExpressionDropdown 顯示角色可用表情的縮略圖網格
  2. PageInspector 角色行使用 ExpressionDropdown 替換舊 `<select>`
  3. 對話級表情選擇同樣使用 ExpressionDropdown
  4. 下拉框使用 Teleport + fixed 定位，不被 inspector overflow 裁切
**Plans:** 1/2 plans executed

Plans:
- [ ] 40-PLAN-01.md — Create ExpressionDropdown.vue component (thumbnail grid dropdown)
- [ ] 40-PLAN-02.md — Integrate ExpressionDropdown into PageInspector (both character & dialogue rows)

**UI hint**: yes

#### Phase 41: 編輯器狀態展示與容錯
**Goal**: 編輯器畫布準確顯示繼承表情，刪除表情後引擎和編輯器優雅降級
**Depends on**: Phase 39, Phase 40
**Requirements**: UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. 畫布預覽在未顯式設置表情時顯示繼承來源的實際表情
  2. 刪除表情圖片後，引擎和編輯器均 fallback 到第一個可用表情（不顯示空白或破圖）
  3. Inspector 中繼承的表情與顯式設置的表情有視覺區分
**Plans**: TBD
**UI hint**: yes

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 37. CharacterLayer DOM 重構 | 1/1 | Complete   | 2026-04-13 |
| 38. 表情交叉漸變 | 1/1 | Complete    | 2026-04-13 |
| 39. 表情狀態管理 | 1/1 | Complete    | 2026-04-13 |
| 40. 表情選擇器 UI | 1/2 | In Progress|  |
| 41. 編輯器狀態展示與容錯 | 0/? | Not started | - |