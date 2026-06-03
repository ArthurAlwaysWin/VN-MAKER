# Galgame Maker

**简体中文** | [English](README.en.md)

Galgame Maker 是一个从零开发的视觉小说引擎和原生中文编辑器。它的目标很简单：让没有编程经验的人，也能像做 PPT 一样制作自己的 galgame；同时让熟悉 AI agent 的用户，可以把小说、设定、分支、结局和素材交给 agent，快速生成一个仍然可以在编辑器里继续修改的视觉小说项目。

## 主要特性

- **从零开发的视觉小说引擎**：支持对话、旁白、角色、表情、背景、BGM/SE、选项、变量、条件分支、结局、CG 解锁、存档读档、标题页和设置页。
- **原生中文无代码编辑器**：可视化编辑页面、角色、素材、标题页、设置页和 UI 样式，适合不写代码的创作者上手。
- **PPT 式创作体验**：页面画布、拖拽布局、素材管理、标题页设计、主题和控件配置，尽量把制作过程做成“看得见、改得动”。
- **AI agent 友好**：仓库内置 `.agent/skills/galgame-maker-*`、`tools/vn-author` CLI、项目契约、命令参考和校验流程。agent 可以先把小说原文整理成改编计划，等用户确认后再写入项目。
- **安全边界清晰**：当前 effect pack 和导出链路保持 manifest-only、built-in Canvas2D adapter-only，不开放项目内任意 JS、eval、shader、WebGL、插件市场或任意 DOM 扩展。
- **可导出游戏**：支持 Web 游戏导出和 Windows 桌面游戏导出，也支持绿色免安装编辑器包。

## 推荐搭配的 AI Agent

只要 agent 能读取 GitHub 仓库、编辑文件、执行 shell 命令，就可以配合 Galgame Maker 使用。

国内也有很多可以尝试的 AI 编程 agent / AI IDE，例如：

- [CodeBuddy](https://www.codebuddy.cn/docs/ide/Introduction)
- [Trae](https://www.trae.ai/)
- [Qoder](https://qoder.com/zh)

如果你能正常访问海外服务，也可以尝试：

- [OpenAI Codex](https://openai.com/codex/)
- [Claude Code](https://code.claude.com/docs/en/overview)
- [Cursor](https://docs.cursor.com/)
- [GitHub Copilot coding agent](https://docs.github.com/en/copilot/concepts/coding-agent/coding-agent)
- [opencode](https://www.opencode.live/)

不同 agent 的安装和授权方式不同，请以各自官方文档为准。

## 下载和使用

### 只使用编辑器

如果你只是想打开编辑器、制作或编辑游戏，不需要安装 Node.js，也不需要下载源码。

1. 打开 [Releases](https://github.com/ArthurAlwaysWin/VN-MAKER/releases) 页面。
2. 下载 `Galgame Maker-win32-x64.zip`。
3. 解压到一个干净文件夹，例如：

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\
    Galgame Maker.exe
```

4. 双击 `Galgame Maker.exe` 即可启动编辑器。

不要把游戏项目或源码仓库放进 `Galgame Maker-win32-x64/` 内部。这个目录只放绿色免安装编辑器本体。

### 使用 AI Agent 做游戏

如果你想让 AI agent 帮你把小说、设定或大纲做成 galgame，建议同时准备：

1. `Galgame Maker-win32-x64.zip`：给人类用户双击打开编辑器。
2. 本仓库源码：给 AI agent 读取 skills、文档和 CLI。
3. Node.js：给源码仓库里的 `npm install` 和 `npm run vn:*` 命令使用。

推荐目录结构：

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\   # 绿色免安装编辑器
  VN-MAKER\                  # agent clone 的源码仓库
  Projects\
    MyStory\                 # 你的游戏项目
```

源码可以通过 GitHub 的 **Download ZIP** 下载，也可以用 `git clone`。两者都能运行 `npm install`，但更推荐 `git clone`，因为 agent 可以使用 `git status`、查看变更、更新仓库或提交修改。

```bash
git clone https://github.com/ArthurAlwaysWin/VN-MAKER.git VN-MAKER
cd VN-MAKER
npm install
```

通常让 agent 打开 `D:\Galgame-Maker\VN-MAKER\` 作为工作区。agent 操作你的游戏项目时，请使用绝对路径，或者从 `VN-MAKER/` 出发的相对路径：

```bash
npm run vn:inspect -- --script "D:\Galgame-Maker\Projects\MyStory\script.json" --json
npm run vn:apply-plan -- .tmp/plan.json --script "D:\Galgame-Maker\Projects\MyStory\script.json" --validate-only --json
```

如果你的 agent 只能访问打开的文件夹内部，也可以让它打开父目录 `D:\Galgame-Maker\`，但运行命令前必须进入 `VN-MAKER/`。

### 让 Agent 帮你下载和准备

当然，在 AI 时代，你完全可以让 Agent 来完成这些琐碎的小事。可以把下面这段话复制给你的 agent：

```text
请帮我准备 Galgame Maker 的 AI agent 工作区。

目标目录：D:\Galgame-Maker
源码仓库：https://github.com/ArthurAlwaysWin/VN-MAKER.git

请完成：
1. 如果目标目录不存在，请创建它。
2. 先检查我的电脑是否已经安装 Node.js 和 npm，例如运行 node -v 和 npm -v。
3. 如果没有 Node.js，请先告诉我需要安装 Node.js LTS，并帮我打开 https://nodejs.org/zh-cn 或给出清晰安装步骤；安装完成后再继续。
4. 在目标目录下 clone 源码仓库到 VN-MAKER。
5. 进入 VN-MAKER，运行 npm install。
6. 阅读 README.md、.agent/skills/galgame-maker-authoring/SKILL.md、docs/agent-authoring/workflow.md、docs/agent-authoring/command-reference.md。
7. 不要修改 Galgame Maker-win32-x64/resources/app。
8. 如果我要把小说原文改成视觉小说，请先输出改编预览，包含角色、场景、页面、对话、选择项、变量、条件、结局、CG 和缺失素材说明。等我确认后，再生成 plan 并运行 npm run vn:apply-plan。
```

也可以使用更直接的 agent 系统提示词：

```text
If you are an AI Agent working with Galgame Maker:

1. Do not edit the portable editor folder, especially Galgame Maker-win32-x64/resources/app.
2. Work from the VN-MAKER source repository.
3. Check Node.js and npm first with node -v and npm -v. If they are missing, ask the user to install Node.js LTS from https://nodejs.org/zh-cn before continuing.
4. Run npm install in VN-MAKER before using npm run vn:* commands.
5. Read .agent/skills/galgame-maker-authoring/SKILL.md and docs/agent-authoring/workflow.md before editing a project.
6. For prose adaptation, show the user a plan first: characters, scenes, pages, dialogue, choices, variables, conditions, endings, CG, and missing assets. Wait for approval before applying changes.
7. Use absolute paths when targeting the user's game project, for example D:\Galgame-Maker\Projects\MyStory\script.json.
```

绿色编辑器和源码仓库不会互相冲突：编辑器负责让人类可视化查看和修改项目，源码仓库负责给 agent 提供 skills、文档和命令。真正被双方共同操作的是你的游戏项目目录，例如 `Projects/MyStory/`。

## 源码开发

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run test
npm run build
npm run build:web
npm run package:editor:win
npm run vn:inspect -- --json
npm run vn:readiness -- --script public/game/script.json --json
```

## AI Agent 文档入口

- [Agent 创作工作流](docs/agent-authoring/workflow.md)
- [Agent 命令参考](docs/agent-authoring/command-reference.md)
- [项目契约](docs/agent-authoring/project-contract.md)
- [脚本格式参考](docs/script-format.md)
- [改编预览示例](docs/agent-authoring/example-adaptation-preview.md)
- [多结局示例与人工复核](docs/agent-authoring/human-review-tutorial.md)

## 授权说明

本项目当前暂未附加开放源代码许可证。公开仓库用于学习、体验和非商用试用；商用授权请先联系作者。
