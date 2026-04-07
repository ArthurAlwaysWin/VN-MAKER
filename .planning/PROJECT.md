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

### Active

<!-- v0.7 需求待 REQUIREMENTS.md 定义 -->

### Future — 后续候选

<!-- 已讨论但推迟到后续里程碑 -->

- [ ] **每组件独立样式覆盖**：对话框/菜单独立主色配置 — v0.7
- [ ] **每场景/每页面主题切换** — v0.7+
- [ ] **布局变体**：每个界面 2-3 种预设布局选择 — v0.7
- [ ] **角色表情场景切换**：场景中切换角色差分表情（依赖资源库表情数据管理）
- [ ] **主题包字体内嵌** — v0.7+（字体体积大 + 许可证问题）
- [ ] **动画/转场主题化** — v0.7+
- [ ] **社区主题市场** — v0.8+
- [ ] **更多内置预设（8-10 套覆盖不同题材）** — 持续补充

### Out of Scope

<!-- 明确排除 -->

- Electron 桌面打包（.exe/.app/.deb） — 推迟到 v0.8+
- 资源压缩/优化（图片压缩、音频转码） — v0.7 只做引用清理
- 导出后预览（自动打开浏览器） — 编辑器内置预览已足够
- 加载动画/启动屏定制 — 保持简单
- 移动端支持 — 桌面优先
- OAuth / 在线服务 — 纯本地应用
- TypeScript 迁移 — 保持纯 JavaScript + JSDoc

## Context

- **技术栈**：Electron 41 + Vue 3 + Pinia + Vite，纯 JavaScript（ES Modules），无 TypeScript
- **编辑器架构**：component :is + keep-alive 切换标签页（5 个 tab），无 vue-router
- **数据格式**：文件夹项目（project.json + script.json + assets/）
- **引擎架构**：纯 JS，事件驱动（自定义 EventEmitter），DOM 渲染
- **画布基础设施**：标题页 TitleDesigner.vue + 设置页 SettingsDesigner.vue 均可作为参考
- **设置页数据**：`ui.settingsScreen = { background, elements[] }` 存在 script.json 中
- **标题页数据**：`ui.titleScreen = { background, bgm, elements[] }` 存在 script.json 中
- **资源库**：5 类资源（背景/角色/音频/字体/通用），统一 Pinia store + IPC 管理
- **运行时双模式**：有自定义布局时渲染 JSON 元素；无布局时渲染内置默认页面
- **设置页覆盖层**：右侧滑入 overlay，ESC 优先级链（settings > game menu），stack-based 层管理
- **已发布**：v0.1（设置页设计器）+ v0.2（资源库 & 标题页 & 设置叠加层）+ v0.3（PPT 式游戏内容编辑器）+ v0.4（语音 & 全局字体设置）+ v0.5（游戏 UI 补全：快捷栏 + 存读档 + 快进 + 快存快读）

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

## Milestone History

- ✅ **v0.1** — 设置页设计器 (Phases 1-5)
- ✅ **v0.2** — 资源库 & 标题页 & 设置叠加层 (Phases 6-9)
- ✅ **v0.3** — PPT 式游戏内容编辑器 (Phases 10-14)
- ✅ **v0.4** — 语音 & 全局字体设置 (Phases 15-18)
- ✅ **v0.5** — 游戏 UI 补全 (Phases 19-22)
- ✅ **v0.6** — 主题包系统 (Phases 23-27)

## Current Milestone: v0.7 游戏导出（Web 静态包）

**Goal:** 让用户能将编辑完成的游戏导出为自包含的 Web 静态包，可直接部署到任意 Web 服务器或上传到 itch.io。

**Target features:**
- 编辑器内导出按钮，选择输出目录一键导出
- 生成完整的 Web 静态包（HTML + JS + CSS + assets）
- 智能资源清理：只复制 script.json 实际引用的资源文件
- 可选生成 ZIP 包（方便上传 itch.io 等平台）
- 导出时可自定义游戏标题和 favicon
- 引擎运行时适配独立部署（无 Electron 依赖，asset:// → 相对路径）

## Current State

v0.7 里程碑已启动 — 游戏导出（Web 静态包）。

**已发布：** v0.1 ~ v0.6（设置页设计器 → 资源库 → 编辑器 → 语音字体 → 游戏 UI 补全 → 主题包系统）

**当前：** v0.7 定义需求中

---
*Last updated: 2025-07-22 after v0.7 milestone start — 游戏导出（Web 静态包）*
