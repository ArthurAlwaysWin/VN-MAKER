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
- ✓ 保存按钮 💾 添加到工具栏 — v0.1

### Active — v0.2: 资源库 & 标题页 & 设置叠加层

<!-- 当前里程碑正式需求 -->

- [~] **资源库重构**：角色+素材+字体统一管理，文件格式验证，自动命名（背景-1），角色表情/差分数据管理（导入/分组/命名） — Phase 6 后端完成（IPC + 验证 + Store），Phase 7 UI 待做
- [~] **自定义字体导入**：整合到资源库，字体作为核心资产，支持导入自定义字体文件到项目中使用 — Phase 6 后端完成（FontFace 加载 + assets store），Phase 7 UI 待做
- [ ] **标题页设计器**：参考设置页设计器组件拖放模式重新设计，4 个预制按钮组件（开始游戏/继续游戏/设置/退出），画布 + 背景/BGM 选择
- [ ] **设置页叠加层模式**：设置页全屏覆盖在当前游戏页面上方，滑入/滑出动画，× 关闭按钮

### Future — 后续候选

<!-- 已讨论但推迟到后续里程碑 -->

- [ ] **游戏内容编辑器**：PPT 式页面系统 — 新建页面，添加背景/BGM/角色/对话/按钮
- [ ] **角色表情场景切换**：场景中切换角色差分表情（依赖资源库表情数据管理）
- [ ] **游戏按钮系统**：存档/读档/自动/快进/设置/返回标题，支持文字/图标/混合显示模式
- [ ] **存读档界面**：保存和加载共用同一 UI，点击存档槽时执行不同操作（需进一步讨论设计方案）

### Out of Scope

<!-- 明确排除 -->

- 桌面应用导出/打包 — 推迟到后续 Milestone
- 移动端支持 — 桌面优先
- OAuth / 在线服务 — 纯本地应用
- TypeScript 迁移 — 保持纯 JavaScript + JSDoc

## Context

- **技术栈**：Electron 41 + Vue 3 + Pinia + Vite，纯 JavaScript（ES Modules），无 TypeScript
- **编辑器架构**：component :is + keep-alive 切换标签页，无 vue-router
- **数据格式**：文件夹项目（project.json + script.json + assets/）
- **引擎架构**：纯 JS，事件驱动（自定义 EventEmitter），DOM 渲染
- **画布基础设施**：标题页 TitleDesigner.vue + 设置页 SettingsDesigner.vue 均可作为参考
- **设置页数据**：`ui.settingsScreen = { background, elements[] }` 存在 script.json 中
- **运行时双模式**：有自定义布局时渲染 JSON 元素；无布局时渲染内置默认设置页

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

## Current Milestone: v0.2 资源库 & 标题页 & 设置叠加层

**Goal:** 统一资源管理体系，重做标题页设计器，设置页改为游戏内叠加层模式

**Target features:**
- 资源库重构 — 角色+素材+字体统一管理，表情差分数据管理
- 标题页设计器 — 参考设置页设计器组件拖放模式重新设计
- 设置页叠加层 — 全屏覆盖 + 滑入/滑出动画

---
*Last updated: 2026-03-29 — Phase 6 (Asset Library Foundation) complete*
