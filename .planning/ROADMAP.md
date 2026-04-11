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

## v0.9 — 编辑器本地化与帮助系统

> **目标：** 消灭编辑器中所有残留英文 UI 文字 + 在配置项/操作按钮上添加 tooltip 帮助提示

### Phase 35: 中文本地化

**Goal:** 将编辑器中所有面向用户的英文文字翻译/映射为中文

**Scope:**
- Token 标签中文映射：35+ 个 CSS token key → 中文名（如 primary → 主色）
- 字体选择器中文标签：6+ 处下拉框（Sans Serif → 无衬线体 等）
- 转场选项中文化：fade → 淡入淡出，slide-left → 左滑入 等
- AudioPicker tab 标签：BGM → 背景音乐，SE → 音效
- ExportModal 格式按钮：Web → 网页版
- 坐标标签 + 占位符文本中文化
- Characters.vue 表情占位符中文示例

**Requirements:** L10N-01 ~ L10N-07
**Plans:** 2/2 plans complete
Plans:
- [x] 35-01-PLAN.md — Theme editor token 中文化 (TOKEN_LABELS 映射 + row 组件 label prop + FontTokenRow 字体标签)
- [x] 35-02-PLAN.md — 编辑器 UI 文本中文化 (字体选择器/转场/AudioPicker/ExportModal/坐标/占位符)

**Files (~12):** TokenAccordion.vue, FontTokenRow.vue, DialogueBoxSettings.vue, SettingsDesigner.vue, TitleDesigner.vue, PageInspector.vue, AudioPicker.vue, ExportModal.vue, Scenes.vue, Characters.vue
**Risk:** Low — 纯文本替换，不涉及逻辑变更

---

### Phase 36: Tooltip 帮助系统

**Goal:** 为编辑器添加上下文帮助提示，覆盖所有主要操作区

**Scope:**
- **HelpTip 组件**：`?` 图标 + hover 气泡，统一风格，支持多行文本
- **按钮/工具栏 hover title**：所有图标按钮和工具栏操作添加/完善中文 title
- **帮助内容覆盖**：
  - 主题编辑器（调色盘、九宫格、预设、token 分组用途）
  - 导出功能（格式区别、ZIP、图标）
  - 项目设置（分辨率等）
  - 剧本编辑器（转场、语音匹配、角色管理）
  - 资源库（格式要求、背景去除、字体导入）
  - 标题页/设置页设计器（预制组件、拖拽、属性）

**Requirements:** HELP-01 ~ HELP-08
**Plans:** 2 plans
Plans:
- [ ] 36-01-PLAN.md — HelpTip 组件 + helpTexts.js + 主题/导出/设置区帮助集成
- [ ] 36-02-PLAN.md — 剧本/资源/设计器帮助集成 + 按钮 title 全覆盖扫描

**New component:** `src/editor/components/HelpTip.vue`
**Files (~25+):** All major editor views + toolbar components
**Risk:** Low — 纯 UI 增强，不影响核心逻辑