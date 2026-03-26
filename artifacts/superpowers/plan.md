# Phase 1 实施计划：Galgame Maker Runtime Engine MVP

## Goal

从零搭建 Galgame Maker 的运行时引擎（Phase 1），使用 Vite + 原生 JS 构建。引擎能解析 JSON 格式的游戏脚本并运行一个包含对话、立绘、背景、音频、选项分支、存档/读档的完整示例游戏。

## Assumptions

- 技术栈：Vite + Vanilla JS + CSS（无框架），方便后续引擎独立打包
- 游戏脚本格式使用 JSON（结构化、编辑器友好）
- 渲染方案：DOM + CSS 动画（混合方案，Phase 1 暂不引入 Canvas）
- 示例游戏使用 AI 生成的占位资源
- 目标平台：仅 Windows 10 / 11 桌面浏览器，不考虑移动端和 macOS
- 暂不实现：CG 鉴赏、音乐鉴赏、i18n、导出打包、移动端适配

## Plan

### Step 1: 项目脚手架搭建
- **Files**: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/style.css`
- **Change**:
  - 用 `npx create-vite` 初始化 Vanilla JS 项目
  - 清理默认模板文件，搭建基本项目结构
  - 创建引擎目录结构 `src/engine/`、`src/ui/`、`public/`
- **Verify**: `npm run dev` 启动成功，浏览器显示空白页面无报错

### Step 2: 定义游戏脚本 JSON 格式 + 示例脚本
- **Files**: `public/game/script.json`, `docs/script-format.md`
- **Change**:
  - 设计 JSON 脚本格式规范，包含场景（scenes）、对话（dialogues）、选项（choices）、跳转（jumps）、变量（variables）等节点类型
  - 编写一个 3-5 个场景的示例脚本，覆盖：对话、立绘切换、背景切换、BGM、选项分支、变量判断
  - 编写格式说明文档
- **Verify**: JSON 文件语法正确（`node -e "require('./public/game/script.json')"`）

### Step 3: 脚本引擎核心 — ScriptEngine
- **Files**: `src/engine/ScriptEngine.js`
- **Change**:
  - 实现 `ScriptEngine` 类：加载脚本 JSON、管理当前场景/当前指令索引、执行 next() 推进指令
  - 支持指令类型：`dialogue`、`show_character`、`hide_character`、`set_background`、`play_bgm`、`stop_bgm`、`play_se`、`choice`、`jump`、`set_variable`、`condition`
  - 变量存储与条件判断
  - 事件驱动：引擎每执行一条指令时发出事件，UI 层监听并响应
- **Verify**: 在 `main.js` 中加载脚本并 `console.log` 依次输出每条指令

### Step 4: 文本显示系统 — DialogueBox
- **Files**: `src/ui/DialogueBox.js`, `src/style.css`
- **Change**:
  - 实现对话框 UI 组件：角色名、对话文字区域、点击推进指示器
  - 打字机效果（逐字显示），点击可跳过直接显示全文
  - 样式：底部对话框，半透明背景，现代化设计
- **Verify**: 浏览器中运行，对话文字逐字显示，点击推进到下一句

### Step 5: 角色立绘系统 — CharacterLayer
- **Files**: `src/ui/CharacterLayer.js`, `src/style.css`
- **Change**:
  - 实现角色立绘 DOM 层，支持多角色同屏（左/中/右位置）
  - 立绘显示/隐藏动画（CSS fade-in/fade-out/slide）
  - 表情差分切换（同角色替换图片）
- **Verify**: 示例脚本中角色立绘正确显示在屏幕上，有进出场动画

### Step 6: 背景系统 — BackgroundLayer
- **Files**: `src/ui/BackgroundLayer.js`, `src/style.css`
- **Change**:
  - 实现背景图层，全屏显示背景图片
  - 背景切换转场效果（淡入淡出 crossfade）
- **Verify**: 背景图正确显示并在切换时有渐变效果

### Step 7: 音频系统 — AudioManager
- **Files**: `src/engine/AudioManager.js`
- **Change**:
  - 实现 BGM 播放/暂停/切换（带淡入淡出）
  - 实现 SE（音效）播放
  - 处理浏览器自动播放策略（用户首次点击后解锁）
- **Verify**: BGM 在场景切换时正确播放和切换，SE 在指定时机播放

### Step 8: 选项与分支系统 — ChoiceMenu
- **Files**: `src/ui/ChoiceMenu.js`, `src/style.css`
- **Change**:
  - 实现选项菜单 UI（覆盖在对话框上方，居中显示选项按钮）
  - 点击选项后设置变量并跳转到对应场景/标签
  - 条件分支：根据变量值执行不同指令
- **Verify**: 选项出现时可点击，点击后跳转到正确的分支场景

### Step 9: 存档/读档系统 — SaveManager
- **Files**: `src/engine/SaveManager.js`, `src/ui/SaveLoadScreen.js`, `src/style.css`
- **Change**:
  - 实现存档数据结构（当前场景、指令索引、变量状态、时间戳）
  - 多存档槽位（8-10 个）
  - 使用 localStorage 持久化（后续可扩展 IndexedDB）
  - 存档/读档界面：显示槽位列表、时间戳、缩略图（截图或快照文本）
- **Verify**: 存档后刷新页面，读档能恢复到存档时的游戏状态

### Step 10: Auto / Skip / Backlog 功能
- **Files**: `src/ui/DialogueBox.js`（扩展）, `src/ui/BacklogScreen.js`, `src/style.css`
- **Change**:
  - Auto 模式：每句对话显示完毕后自动推进（可设速度）
  - Skip 模式：快速跳过已读对话
  - Backlog（文字回看）：显示历史对话列表，可滚动查看
- **Verify**: Auto 模式自动推进对话；Skip 快速跳过；Backlog 能回顾历史

### Step 11: 系统设置界面 — SettingsScreen
- **Files**: `src/ui/SettingsScreen.js`, `src/engine/ConfigManager.js`, `src/style.css`
- **Change**:
  - 设置项：文字速度、Auto 速度、BGM 音量、SE 音量、全屏切换
  - 设置持久化到 localStorage
  - 设置界面 UI
- **Verify**: 调节音量滑块后音量实时变化，刷新后设置保留

### Step 12: 主菜单 / 标题画面 — TitleScreen
- **Files**: `src/ui/TitleScreen.js`, `src/style.css`
- **Change**:
  - 标题画面：游戏名、开始游戏、继续游戏（读档）、设置
  - 游戏中菜单（右键/ESC 呼出）：存档、读档、设置、返回标题
- **Verify**: 标题画面显示正确，菜单各按钮功能正常

### Step 13: 生成示例游戏资源 + 集成测试
- **Files**: `public/game/` (图片、音频资源)
- **Change**:
  - 用 AI 生成占位立绘和背景图
  - 使用免费音乐/音效资源
  - 完善示例脚本，确保所有功能都有覆盖
  - 完整跑通整个示例游戏流程
- **Verify**: 从标题画面 → 开始游戏 → 对话推进 → 选项分支 → 存档/读档 → 不同结局，全流程无报错

### Step 14: 视觉打磨
- **Files**: `src/style.css`, 各 UI 组件
- **Change**:
  - 美化整体 UI：标题画面、对话框、选项菜单、存档界面
  - 添加微动画和过渡效果
  - 确保在 Windows 桌面浏览器（Chrome/Edge）中表现良好
- **Verify**: 在 Windows 桌面浏览器中全流程无视觉异常

## Risks & Mitigations

| 风险 | 缓解 |
|------|------|
| 示例资源版权问题 | 使用 AI 生成或明确 CC0/免费资源 |
| 浏览器音频自动播放限制 | 首次交互后才初始化 AudioContext |
| localStorage 存储上限 | Phase 1 够用，后续迁移到 IndexedDB |

## Rollback Plan

- 每个 Step 为独立 Git commit，可按 commit 回退
- 引擎各模块松耦合，某模块有问题可临时禁用不影响其他功能
