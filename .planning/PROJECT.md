# Galgame Maker — 视觉小说制作器

## What This Is

可视化、无代码、PPT式拖拽的视觉小说制作器。让任何人都能制作自己的 Galgame，开发者专注于视觉页面设计，所有游戏逻辑由引擎内置。基于 Electron 桌面应用，内含 Vue 3 编辑器和纯 JavaScript 运行时引擎。

## Core Value

开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑。

## Requirements

### Validated

<!-- 已交付并验证的功能 -->

- ✓ JSON 驱动脚本引擎（对话、选项、变量、条件跳转） — Phase 1
- ✓ 多角色同屏、表情切换、进出场动画 — Phase 1
- ✓ 背景/音频交叉渐变、BGM/SE 播放控制 — Phase 1
- ✓ 8 槽位 localStorage 存档系统 — Phase 1
- ✓ ESC 系统菜单（存档/读档/回想/设定/返回标题） — Phase 1
- ✓ 1280×720 画布预览、拖拽元素自由定位 — Phase 2
- ✓ 场景编辑器（时间线 + 画布双模式） — Phase 2
- ✓ 标题页自定义拖拽布局 — Phase 2
- ✓ 角色/素材管理界面 — Phase 2
- ✓ 撤销/重做 + 中文界面 — Phase 2
- ✓ Electron IPC 项目管理（创建/打开/加载/保存/关闭） — Phase 3A
- ✓ asset:// 自定义协议（含路径遍历防护） — Phase 3A
- ✓ 原子写入（temp → rename）防数据丢失 — Phase 3A
- ✓ Figma 风格欢迎界面 + 最近项目列表 — Phase 3A
- ✓ 首次 4 步向导 + 后续快速创建项目 — Phase 3A
- ✓ 6 标签页导航（游戏内容、标题页、设置页、素材库、角色、项目设置） — Phase 3A
- ✓ 素材面板（140px 侧栏，拖拽到画布） — Phase 3A
- ✓ 自动保存（2s 防抖）+ Ctrl+S 手动保存 — Phase 3A
- ✓ 窗口关闭保护（3 选项对话框） — Phase 3A
- ✓ 设置页设计器：画布上拖放预制设置组件 — v0.1
- ✓ 7 种预制设置组件（BGM/SE/文字速度/自动速度/窗口模式/对话框透明度/总音量） — v0.1
- ✓ 引擎渲染可交互设置页面（自定义布局 + 默认回退） — v0.1
- ✓ 设置组件属性编辑（位置/颜色/字体/大小） — v0.1
- ✓ 关闭按钮（支持 × 图标/文字两种模式） — v0.1
- ✓ 窗口模式三选一（窗口/全屏/无边框），radio 按钮样式 — v0.1
- ✓ 资源库重构：角色+素材+字体统一管理，文件格式验证，自动命名，角色表情管理 — v0.2
- ✓ 自定义字体导入：整合到资源库，双窗口 FontFace 加载 — v0.2
- ✓ 标题页设计器：3 面板画布 + 4 预制按钮 + 背景/BGM 选择 + 引擎格式迁移 — v0.2
- ✓ 设置页叠加层：右侧滑入覆盖层 + 双模式背景 + ESC 优先级链 — v0.2
- ✓ 页面数据格式 + 引擎适配：pages[] 数组替代 commands[]，引擎按页播放 — v0.3 Phase 10
- ✓ PPT 页面编辑器：幻灯片侧栏 + WYSIWYG 画布编辑器 + 场景/页面 CRUD — v0.3 Phase 11
- ✓ 资源选择器：角色表情缩略图网格、背景可视化选取、音频 MiniPlayer 预听 — v0.3 Phase 12
- ✓ 转场效果与选择分支：选择页编辑器 + 选项目标链接 + 场景跳转 + 页面转场下拉框 — v0.3 Phase 13
- ✓ UI 打磨：说话人 combobox、选项预览标签、角色缩放滑块 — v0.3 Phase 13.1
- ✓ 编辑器内联试玩：iframe + postMessage + 只读覆盖层 + asset:// basePath — v0.3 Phase 14
- ✓ 语音引擎基础：独立通道 + 音量控制 + 引擎播放 + 设置页预制组件 — v0.4
- ✓ 编辑器语音集成：AudioPicker 语音选择 + 批量命名匹配 + 试听预览 — v0.4
- ✓ 全局字体设置：字号/字体/颜色/名牌字号 + CSS 自定义属性 + 编辑器实时预览 — v0.4
- ✓ 语音打磨：回想屏语音重放 + 自动模式语音等待 — v0.4
- ✓ 快捷按钮栏：对话框底部 8 按钮 + 固定布局 + 属性自定义 — v0.5 Phase 19/20
- ✓ 存档系统升级：文件系统 saves/ 目录 + IPC handlers + 缩略图 — v0.5 Phase 19
- ✓ 存读档界面：全屏 3×3×12 网格（108 槽）+ 分页 + 内联确认 — v0.5 Phase 21
- ✓ 快进模式：30ms 循环 + 已读追踪 + BGM 影子状态 + 6 种停止触发器 — v0.5 Phase 22
- ✓ 快速存读档：F5/F9 快捷键 + quicksave.json 隐藏槽位 — v0.5 Phase 20
- ✓ 快进设置：设置页切换全部跳过/只跳已读 + ConfigManager 持久化 — v0.5 Phase 22
- ✓ Design Tokens 数据模型 + 引擎全 UI 改用 CSS 自定义属性渲染 — v0.6 Phase 23
- ✓ 可视化主题编辑器（Token 编辑 + 配色和谐算法 + 实时预览） — v0.6 Phase 24-26
- ✓ 九宫格图片系统（对话框/面板/按钮背景图替换，三态按钮） — v0.6 Phase 26
- ✓ 内置主题预设（4 套：Modern/和風/Fantasy/Minimal）+ 主题导入/导出（.theme ZIP 包） — v0.6 Phase 27
- ✓ Web 引擎适配（WebSaveManager localStorage + basePath 参数化 + 纯 CSS 主题回退） — v0.7 Phase 28
- ✓ 资源扫描器 + Web 构建（scanAssets 5 类解析 + vite.web.config.js 确定性输出） — v0.7 Phase 29
- ✓ 导出管线（6 步 pipeline：构建→扫描→引擎→资源→HTML→ZIP，缺失资源跳过+警告） — v0.7 Phase 30
- ✓ 导出 UI（ExportModal 3 态弹窗：配置→进度→完成，IPC 目录/文件对话框+打开文件夹） — v0.7 Phase 31
- ✓ 桌面游戏运行时（4-way 环境检测 + game-main.js 模板 + 文件系统存档 + 窗口管理） — v0.8 Phase 32
- ✓ 桌面导出管线（exportDesktop.js 9 步流水线 + @electron/packager 打包 + PNG→ICO 转换 + ZIP） — v0.8 Phase 33
- ✓ ExportModal Web/桌面 格式切换 + 桌面图标选择器 + 格式感知导出分发 — v0.8 Phase 34
- ✓ 编辑器中文本地化：TOKEN_LABELS 41 条映射 + 字体/转场/音频/导出/坐标全中文化 — v0.9 Phase 35
- ✓ Tooltip 帮助系统：HelpTip.vue 组件 + helpTexts.js 35 keys + 26 实例 + 80+ 按钮 title — v0.9 Phase 36
- ✓ CharacterLayer DOM 双层重構（A/B img 子元素 + 容器分離動畫）— v1.0 Phase 37
- ✓ 表情交叉漸變：300ms CSS opacity crossfade + img.decode() 預加載 + skipMode 0ms 即時替換 — v1.0 Phase 38
- ✓ 表情狀態管理：引擎 Map 追蹤每角色表情，頁面繼承 + 存讀檔持久化 + 場景重置 — v1.0 Phase 39
- ✓ ExpressionDropdown 縮略圖網格選擇器 + PageInspector 雙處集成 — v1.0 Phase 40
- ✓ 畫布繼承表情預覽 + stale 引用優雅降級（全場景掃描 + 批量替換 + 單步撤銷）— v1.0 Phase 41
- ✓ 控件风格编辑器（widgetStyles 可视化编辑：Tab 形状/Toggle 样式/Slider·Panel·Button 颜色 + iframe 实时预览）— v1.2
- ✓ 界面布局编辑器（SaveLoad/Backlog/GameMenu/SettingsScreen 结构化表单配置 + iframe 预览）— v1.2
- ✓ 5 套内置主题（default/wafuu/modern-sky/fantasy-dark/minimal-white）一键应用 + 主题选择器 UI — v1.2
- ✓ v1.4 演出力升级：角色预设动画与生命周期清理（ANIM-01~04）— v1.4
- ✓ v1.4 演出力升级：页面级镜头效果与舞台隔离（CAM-01~05）— v1.4
- ✓ v1.4 演出力升级：背景转场扩展与稳定 page-enter 时序（TRAN-01~04）— v1.4
- ✓ v1.4 演出力升级：PageInspector 内联配置 + runtime-backed iframe 预览（PREV-01~03）— v1.4
- ✓ v1.4 演出力升级：skip/auto/load/title/preview-stop cleanup 回归门（PREV-05）— v1.4

### Active

- [ ] **UIIMG-01**: 对话框支持名牌背景图、装饰层与整体图片替换
- [ ] **UIIMG-02**: 按钮图片三态扩展到 choice/title 之外的主要游戏界面按钮
- [ ] **UIIMG-03**: SaveLoad / Backlog / GameMenu / SettingsScreen 支持全屏背景插画与装饰层
- [ ] **UIIMG-04**: 主题支持自定义光标与可替换图标集
- [ ] **UIIMG-05**: 主题编辑器支持可视化管理图片 UI 素材并即时预览

## Current Milestone: v1.5 UI 图片驱动体系

**Goal:** 打通图片素材作为 UI 视觉主体的完整通路，让游戏界面从“软件级参数化样式”升级到“游戏级主题皮肤”。

**Target features:**
- 对话框图片化：名牌背景、装饰层、多层图片替换
- 按钮图片三态扩面：覆盖 game-menu、save-load、backlog、QAB、分页 tab 等主要按钮
- 全屏界面背景图：SaveLoad / Backlog / GameMenu / Settings 统一支持背景插画与装饰层
- 自定义光标与主题图标集
- 主题编辑器中的图片 UI 配置与即时预览

## Current State

**已交付：** v0.1 ~ v1.4（设置页设计器 → 资源库 → PPT 编辑器 → 语音字体 → 游戏 UI → 主题包系统 → Web 导出 → 桌面导出 → 本地化帮助 → 角色表情差分 → UI Theme v2 引擎 → 主题配置编辑器 → 智能配色与结构参数 → 演出力升级）

**v1.4 已完成：** 预设角色动画、页面级镜头效果、扩展背景转场、runtime-backed iframe 演出预览、PageInspector 内联演出配置全部交付；18/18 requirements 与 milestone audit 全部通过。

**当前进行中：** v1.5「UI 图片驱动体系」已启动，正在定义 requirements 与 roadmap。

**下一步：** 收敛 v1.5 requirements，然后拆解为连续 phase roadmap。

## Previous Milestone: ✅ v1.4 演出力升级 (Shipped 2026-04-22)

**Delivered:** 预设角色动画 + 单页镜头效果 + 扩展转场 + runtime-backed effect preview + PageInspector 演出配置 + 68-70 verification backfill。18/18 requirements，10 phases，milestone audit passed。

<details>
<summary>v1.4 target features (delivered)</summary>

- ✅ 立绘预设动画（fade-in / slide-in-left / slide-in-right / shake / nod / breathe）
- ✅ 页面级镜头效果（shake / zoom / pan / flash）
- ✅ 编辑器动画与镜头配置 + iframe runtime 真预览
- ✅ 背景转场扩展（dissolve / wipe / scale / blur）
- ✅ PREV-05 focused regression gate + docs-only audit closeout

</details>

## Previous Milestone: ✅ v1.3 主题系统表达力升级 (Shipped 2026-04-20)

**Delivered:** OKLCH 智能配色（2 色 → 36 token）+ 设置页结构参数（Tab/布局/装饰）+ 编辑器完整配置 UI + 标题页预览 + 5 套商业级主题升级。27/27 需求，9 phases，~170 测试。

<details>
<summary>v1.3 target features (delivered)</summary>

- ✅ 智能配色系统（OKLCH 纯 JS + 规则表 + deriveTokens + SmartColorPanel + 三层合并）
- ✅ 设置页结构参数引擎（可配置 Tab + 双列 Grid + 行样式 + 左侧 Tab + 装饰 + 重置按钮）
- ✅ 设置页结构编辑器（Tab CRUD + 设置矩阵 + 布局控制 + 装饰管理 + 面板背景）
- ✅ 标题页 iframe 引擎预览（编辑/预览切换）
- ✅ 内置主题升级（colorRecipe + 结构参数 + 商业 VN 美学）

</details>

## Previous Milestone: ✅ v1.2 编辑器主题配置 + 示范主题 (Shipped 2026-04-17)

**Delivered:** 编辑器中可视化编辑所有 v1.1 新增的引擎配置项（widgetStyles 控件风格 / 界面布局），5 套内置主题一键应用。

<details>
<summary>v1.2 target features (delivered)</summary>

- ✅ 控件风格编辑器（表单模式，Tab 形状缩略图选择 + Toggle 样式选择 + Slider/Panel/Button 颜色配置 + iframe 实时预览）
- ✅ 界面布局编辑器（SaveLoad/Backlog/GameMenu/SettingsScreen 结构化表单配置，类似 ThemeDesigner 模式 + iframe 预览）
- ✅ 5 套内置主题（2 套全配置含九宫格贴图：default + wafuu；3 套纯配色：modern-sky/fantasy-dark/minimal-white）

</details>

### Future — 后续候选

<!-- 已讨论但推迟到后续里程碑 -->

**UI Theme System v2（来源：docs/superpowers/specs/ui-theme-system-v2-design.md）**

P0 引擎配置化 — ✅ 已在 v1.1 完成
P1 编辑器 + 内置主题 — ✅ 已在 v1.2 完成

推迟项（P2/P3 — 后续里程碑）：
- [ ] **.gmtheme 主题包格式**：ZIP 打包 theme.json + assets/，导入/导出/社区共享
- [ ] **Tab ribbon/trapezoid clip-path 精细实现**
- [ ] **编辑器 UI 设计器合并标签页** — 现有 6 标签已稳定，不急于合并，新功能可作为子页添加

不采纳项（与现有架构冲突或不必要）：
- ✗ iframe + postMessage 预览方案 — 现有 Vue 组件直接预览更轻量
- ✗ 约束 #6「不要动 DialogueBox/CharacterLayer/BackgroundLayer」中的 DialogueBox 部分 — 已有 applyGlobalStyle()，扩展它是合理路线

**其他候选**
- [ ] **每组件独立样式覆盖**：对话框/菜单独立主色配置 — v0.7
- [ ] **每场景/每页面主题切换** — v0.7+
- [ ] **布局变体**：每个界面 2-3 种预设布局选择 — v0.7
- [ ] **主题包字体内嵌** — v0.7+（字体体积大 + 许可证问题）
- [ ] **动画/转场主题化** — v0.7+
- [ ] **社区主题市场** — v0.8+
- [ ] **更多内置预设（8-10 套覆盖不同题材）** — 持续补充
- [ ] **CG 鉴赏系统**（CG Gallery） — v0.9+
- [ ] **开场/结尾动画**（OP/ED） — v0.9+
- [ ] **启动画面**（Splash Screen） — v0.9+
- [ ] **macOS / Linux 桌面打包** — v0.8+
- [ ] **高级演出系统**：宏动画 / 多镜头链 / 时间轴 / 粒子天气视频

### Out of Scope

<!-- 明确排除 -->

- 资源压缩/优化（图片压缩、音频转码） — v0.8 只做资源拷贝
- 安装向导（NSIS/Inno Setup） — 绿色免安装
- 导出后预览（自动打开浏览器） — 编辑器内置预览已足够
- 加载动画/启动屏定制 — 保持简单
- 移动端支持 — 桌面优先
- OAuth / 在线服务 — 纯本地应用
- TypeScript 迁移 — 保持纯 JavaScript + JSDoc

## Context

- **技术栈**：Electron 41 + Vue 3 + Pinia + Vite，纯 JavaScript（ES Modules），无 TypeScript
- **编辑器架构**：component :is + keep-alive 切换标签页（6 个 tab），无 vue-router
- **数据格式**：文件夹项目（project.json + script.json + assets/）
- **引擎架构**：纯 JS，事件驱动（自定义 EventEmitter），DOM 渲染
- **画布基础设施**：标题页 TitleDesigner.vue + 设置页 SettingsDesigner.vue 均可作为参考
- **设置页数据**：`ui.settingsScreen = { background, elements[] }` 存在 script.json 中
- **标题页数据**：`ui.titleScreen = { background, bgm, elements[] }` 存在 script.json 中
- **资源库**：5 类资源（背景/角色/音频/字体/通用），统一 Pinia store + IPC 管理
- **运行时双模式**：有自定义布局时渲染 JSON 元素；无布局时渲染内置默认页面
- **设置页覆盖层**：右侧滑入 overlay，ESC 优先级链（settings > game menu），stack-based 层管理
- **已发布**：v0.1 ~ v1.4（设置页设计器 → 资源库 → PPT 编辑器 → 语音字体 → 游戏 UI → 主题包 → Web 导出 → 桌面导出 → 本地化帮助 → 角色表情差分 → 主题系统表达力升级 → 演出力升级）

### 已知问题

- ✅ ~~创建项目向导中文件对话框不弹出~~ — 已修复（preload.mjs 路径）
- ✅ ~~vite-plugin-electron Windows 热重载崩溃~~ — 已修复（patch-package）
- ✅ ~~创建项目 reactive Proxy 序列化失败~~ — 已修复（解构为纯对象）
- ✅ ~~设置页设计器样式预览不生效~~ — 已修复（添加 :style 绑定）
- ✅ ~~撤销/重做画布不同步~~ — 已修复（watch store data）

## Constraints

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — 不迁移 TypeScript
- **Design**: 开发者不接触逻辑，所有设置组件逻辑引擎内置
- **Compatibility**: Windows 优先（当前开发环境），需兼容 macOS
- **Style**: 暗色主题，纯 CSS，中文界面

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 无 vue-router，用 component :is + keep-alive | 避免路由与标签页冲突 | ✓ Good |
| 文件夹项目格式（project.json + script.json + assets/） | 方便版本控制和素材管理 | ✓ Good |
| asset:// 自定义协议 | 避免硬编码路径，支持任意位置 | ✓ Good |
| 原子写入（temp → rename） | 防断电/崩溃数据丢失 | ✓ Good |
| 设置页设计器复用画布拖拽模式 | 与标题页设计器体验一致 | ✓ Good |
| 设置组件逻辑引擎预制 | 符合"不碰逻辑"核心理念 | ✓ Good |
| SETTING_DEFS 注册表 + 工厂函数 | 扩展新组件只需加注册表条目 | ✓ Good |
| 窗口模式用 select 类型 + segment radio UI | 比 toggle 更灵活，支持 3 选项 | ✓ Good |
| 关闭按钮 icon/text 双模式 | 支持 × 图标或自定义文字 | ✓ Good |
| Magic bytes + 扩展名双重验证资源文件 | 防止无效文件污染项目 | ✓ Good |
| fontLoader 独立模块 + asset:// URL | 编辑器和引擎窗口独立加载字体 | ✓ Good |
| Pinia asset store 统一 IPC 封装 | 所有资源操作走 store，自动 Proxy 解构 | ✓ Good |

| 标题页设计器 3 面板 + 4 预制按钮 | 复用设置页设计器模式，统一设计体验 | ✓ Good |
| TitleScreen.js schema 前向兼容迁移 | 不破坏旧项目 | ✓ Good |
| 设置页右侧滑入覆盖层 | 游戏场景持续可见，沉浸感更强 | ✓ Good |
| ESC 优先级链（settings > menu > game） | 统一按键行为，title screen 也生效 | ✓ Good |
| Stack-based 层管理（不隐藏底层菜单） | 覆盖层关闭后自然恢复，无需额外逻辑 | ✓ Good |
| pages[] 替代 commands[] 数据格式 | PPT 式操作更直觉，每页一屏所见即所得 | ✓ Good |
| 引擎按页播放 + 自动推进 | 页面数据天然支持顺序播放和分支跳转 | ✓ Good |
| provide/inject 共享 pageEditor 状态 | 避免 props drilling，组件树自由访问 | ✓ Good |
| iframe + postMessage 试玩方案 | 完美 CSS/JS 隔离，引擎零修改 | ✓ Good |
| asset:// basePath 动态注入 | 编辑器项目和独立模式共用同一引擎代码 | ✓ Good |
| playVoice() 返回 Promise + D-01 内部停止 | 简化调用方、自动模式可 await | ✓ Good |
| 文件系统 saves/ 替代 localStorage | 容量无限、可移植、支持截图文件 | Pending |
| fflate ZIP 主题包格式 | 轻量 8kB、sync API、ESM 原生 | ✓ Good |
| 色块预览替代 iframe 截图 | DOM 引擎无法可靠截图，6 色块更可靠 | ✓ Good |
| Import = full overwrite + undo | 简单可预测，Ctrl+Z 可恢复 | ✓ Good |
| WebSaveManager IndexedDB 后端 | Web 环境无文件系统，IndexedDB 最可靠 | ✓ Good |
| 3-way 环境检测 (Electron/Preview/Web) | 统一代码库三种运行模式 | ✓ Good |
| scanAssets 配置表驱动遍历 | 11 已知路径位置显式遍历，比递归更可靠 | ✓ Good |
| 6 步导出流水线 + AbortController | 清晰步骤分离，支持取消 | ✓ Good |
| ExportModal 3 态单弹窗 | 配置→进度→完成流畅无中断 | ✓ Good |
| asar:false + win.loadFile() + 相对路径 | 避免 asset:// 协议，桌面游戏资源加载最简化 | ✓ Good |
| 4-way 环境检测 (Electron/Preview/Web/Desktop) | 统一代码库四种运行模式 | ✓ Good |
| exportDesktop 9 步流水线 + @electron/packager | 从编辑器到可运行 .exe 全自动 | ✓ Good |
| Web/桌面 Segment Toggle 默认桌面版 | v0.8 焦点是桌面导出，默认选中 | ✓ Good |
| TOKEN_LABELS 数据映射 + label prop 透传 | 集中维护，row 组件只接收 label | ✓ Good |
| HelpTip Teleport + fixed 定位 | 避免 overflow:hidden 裁切气泡 | ✓ Good |
| helpTexts.js 集中管理帮助文本 | 6 区域导出，编辑器统一引用 | ✓ Good |
| Tooltip 双模式：? 图标 + 按钮 title | 配置项用 ? 详解，按钮用 title 简提 | ✓ Good |
| 扁平式表情数据模型 | 所有差分/服装+表情同级，避免嵌套复杂度 | ✓ Good |
| 整图切换（非分层合成）| 每个状态一张完整立绘，简单可靠 | ✓ Good |
| CharacterLayer div+imgA/imgB 双图层 | A/B 交替实现 crossfade，无闪白 | ✓ Good |
| img.decode() 预加载门控 | decode() 完成后才触发 crossfade，防白闪 | ✓ Good |
| Generation counter 防快速切换 | 过期 crossfade 不执行，防残影堆叠 | ✓ Good |
| ExpressionDropdown Teleport+fixed | 避免 inspector overflow 裁切下拉框 | ✓ Good |
| 表情状态 Map + resolution chain | char.expression → inherited → first → '' | ✓ Good |
| Canvas vs Engine 继承不对称 | 画布静态预览 vs 引擎运行时，意图正确 | ✓ Good |
| 删除表情前全场景引用扫描 | 批量替换+单步 pushState，安全可撤销 | ✓ Good |
| preset-based cinematic contract | 用有限预设快速提升成片表现力，同时避免演出系统失控扩张 | ✓ Good |
| runtime-backed effect preview | 预览必须走真实 runtime owner，确保编辑器/运行时一致 | ✓ Good |
| stage-layer-only camera scope | 镜头效果只作用于舞台，保护对话与 overlay 可读性 | ✓ Good |
| focused PREV-05 gate + verification backfill | 用聚焦回归门证明清理路径，并用 docs-only closeout 补齐审计证据链 | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

## Milestone History

- ✅ **v0.1** — 设置页设计器 (Phases 1-5)
- ✅ **v0.2** — 资源库 & 标题页 & 设置叠加层 (Phases 6-9)
- ✅ **v0.3** — PPT 式游戏内容编辑器 (Phases 10-14)
- ✅ **v0.4** — 语音 & 全局字体设置 (Phases 15-18)
- ✅ **v0.5** — 游戏 UI 补全 (Phases 19-22)
- ✅ **v0.6** — 主题包系统 (Phases 23-27)

- ✅ **v0.7** — 游戏导出 Web 静态包 (Phases 28-31)
- ✅ **v0.8** — 游戏导出 Electron 桌面版 (Phases 32-34)
- ✅ **v0.9** — 编辑器本地化与帮助系统 (Phases 35-36)
- ✅ **v1.0** — 角色表情/差分場景切換 (Phases 37-41)
- ✅ **v1.1** — UI Theme System v2 引擎配置化 (Phases 42-45)

- ✅ **v1.2** — 编辑器主题配置 + 示范主题 (Phases 46-51)
- ✅ **v1.3** — 主题系统表达力升级 (Phases 52-60)
- ✅ **v1.4** — 演出力升级 (Phases 61-70)

### 已知问题

- ⚠ preview preflight 规则仍在 `usePageEditor.js` 与 `PageInspector.vue` 间重复实现，后续有漂移风险
- ⚠ repo-wide `npx vitest run` 仍包含与 v1.4 无关的 legacy test collection / `tests/mainConfigRouting.test.js` 债务

---
*Last updated: 2026-04-22 after starting v1.5 milestone*
