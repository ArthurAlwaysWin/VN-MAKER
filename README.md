# 🎮 Galgame Maker — 视觉小说制作器

> **可视化、无代码、PPT式拖拽** — 让任何人都能制作自己的视觉小说游戏。

## 项目状态

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 运行时引擎 MVP（脚本引擎、对话、角色、选项、存档等） | ✅ 完成 |
| Phase 2 | PPT式画布编辑器（拖拽定位、自由布局、画布预览） | ✅ 完成 |
| Phase 3A | 项目系统 + 编辑器工作流重构 | ✅ 完成 |
| **Phase 3B** | **设置页设计器 + 桌面应用导出 + 主题化 UI 扩展** | ✅ 完成/持续打磨 |

## 📖 指导文档

> **⚠️ 项目以下列文档为准，其他文档仅供参考：**

- **[项目契约](docs/agent-authoring/project-contract.md)** — project.json、script.json、assets/ 与 agent 交互边界
- **[AI Agent Integration Contract](docs/agent-authoring/integration-contract.md)** — agent 操作、事务、诊断、预览与交接的统一接口约束
- **[脚本格式参考](docs/script-format.md)** — script.json 技术规格
- **[外部 Agent 创作工作流](docs/agent-authoring/workflow.md)** — 供 Codex、Claude、opencode、GitHub Copilot 等外部 agent 通过 CLI/API 编辑同一个项目；不是内置 AI 助手
- **[Agent 命令参考](docs/agent-authoring/command-reference.md)** — apply-plan、导出、校验、预览、handoff 等命令说明
- **[多结局示例与人工复核](docs/agent-authoring/human-review-tutorial.md)** — 通过可执行示例计划检查好感度、结局、CG、分支图与转场

## 快速开始

### 绿色免安装版

下载并解压 `Galgame Maker-win32-x64.zip`，双击 `Galgame Maker.exe` 即可打开编辑器。绿色包只包含编辑器和运行所需资源，不包含源码、Node 依赖或 AI agent 工具包。

### 源码运行

```bash
# 安装依赖
npm install

# 启动开发模式（编辑器 + 引擎）
npm run dev

# 生成并验收可在编辑器中打开的外部 Agent 多结局示例项目
npm run verify:agent-example -- --out .tmp/agent-example-project --json
```

### 让 AI Agent 做游戏

把下面这段话复制给你的 AI agent（CodeBuddy、Codex、Claude Code、Cursor 等）：

```text
请 clone 并阅读 Galgame Maker 源码仓库：
https://github.com/ArthurAlwaysWin/VN-MAKER.git

请先阅读 README.md、.agent/skills/galgame-maker-authoring/SKILL.md、docs/agent-authoring/workflow.md 和 docs/agent-authoring/command-reference.md。

如果我要把小说原文改成视觉小说，请先用 galgame-maker-prose-to-plan skill 输出改编预览，包含角色、场景、页面、对话、选择项、变量、条件、结局、CG 和缺失素材说明。等我确认后，再生成 plan 并通过 npm run vn:apply-plan 写入项目。

不要直接修改绿色免安装版里的 resources/app。请在源码仓库或我指定的游戏项目目录里运行 npm run vn:* 命令。
```

推荐目录结构：

```text
GalgameMaker/
  Galgame Maker-win32-x64/   # 绿色免安装编辑器，给人类双击使用
  VN-MAKER/                  # agent clone 的源码仓库，给 agent 跑 CLI/skills
  MyStory/                   # 你的游戏项目目录，可由编辑器和 agent 共同打开/修改
```

这三者可以放在同一个父目录下，但不要互相嵌套。尤其不要把 `VN-MAKER` clone 到绿色包目录里面，也不要让 agent 修改 `Galgame Maker-win32-x64/resources/app`。

绿色包和源码仓库不会天然冲突：绿色包负责打开编辑器，源码仓库负责提供 agent skills、文档和 `npm run vn:*` 命令。真正需要共同操作的是你的游戏项目目录，例如 `MyStory/`。

## 技术栈

| 组件 | 技术 |
|------|------|
| 游戏引擎 | 纯 JavaScript（ES Modules），DOM 渲染 |
| 编辑器 | Vue 3 + Pinia（无 vue-router，标签页切换） |
| 桌面壳 | Electron（IPC 项目管理 + asset:// 协议） |
| 构建工具 | Vite + vite-plugin-electron |
| 样式 | 纯 CSS，暗色主题 |

## 核心设计理念

1. **开发者不碰逻辑** — 所有游戏逻辑由引擎内置，开发者只做视觉设计
2. **PPT式编辑** — 像做幻灯片一样拖拽元素到画布上
3. **零代码** — 从创建项目到导出游戏，全程图形化操作

## 已完成功能

### 引擎（Phase 1）
- 脚本引擎：JSON 驱动，支持对话、选项、变量、条件跳转
- 角色系统：多角色同屏、表情切换、进出场动画
- 背景/音频：交叉渐变转场、BGM/SE 播放控制
- 存档系统：8 槽位 localStorage 存档
- 系统菜单：ESC 呼出，存档/读档/回想/设定/返回标题

### 编辑器（Phase 2）
- 画布预览：1280×720 可视化画布，拖拽元素自由定位
- 场景编辑：时间线 + 画布双模式切换
- 标题页设计：自定义元素拖拽布局
- 角色/素材管理：可视化管理界面
- 撤销/重做 + 中文界面

### 项目系统（Phase 3A）
- **欢迎界面**：Figma 风格居中布局，最近项目列表
- **项目创建**：首次使用 4 步向导，后续快速创建（名称+位置）
- **文件夹项目**：project.json + script.json + assets/ 目录结构
- **6 标签页导航**：游戏内容、标题页、设置页、素材库、角色、项目设置
- **素材面板**：140px 侧栏，拖拽素材到画布自动创建指令
- **自动保存**：2 秒防抖，脏标记（●），原子写入（temp+rename）
- **窗口关闭保护**：3 选项对话框（保存/不保存/取消）
- **键盘快捷键**：Ctrl+Z 撤销、Ctrl+Y 重做、Ctrl+S 保存
- **安全**：路径遍历防护、CSS 消毒、项目名消毒、保存竞态锁

### 导出与主题（Phase 3B+）
- **设置页设计器**：设置界面布局、控件样式与主题素材可视化配置
- **Web 导出**：构建静态引擎包、复制引用素材、可选 ZIP 打包
- **桌面导出**：生成 Windows Electron 运行包、自定义图标、可选 ZIP 打包
- **主题化 UI**：标题页、菜单、存读档、设置页、按钮族、图标与装饰素材扩展
- **外部 Agent 工具链**：校验、报告、布局 lint、素材引用检查与 handoff 文档
