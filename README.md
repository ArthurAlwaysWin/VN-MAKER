# Galgame Maker

**简体中文** | [English](README.en.md)

Galgame Maker 是我从零开发的视觉小说引擎和原生中文编辑器，最大的特点是**无代码**以及**能用 AI Agent 做游戏**。它让没有编程经验的人，也能像做 PPT 一样制作自己的 galgame；同时让熟悉 AI agent 的用户，可以把小说、设定、分支、结局和素材交给 agent，快速生成一个仍然可以在编辑器里继续修改的视觉小说项目。

当前编辑器支持对话、旁白、角色、表情、背景、BGM/SE、选项、变量、条件分支、结局、CG 解锁、存档读档、标题页和设置页等功能，其他高级功能正在开发中。

## 推荐搭配的 AI Agent

只要 agent 能读取 GitHub 仓库、编辑文件、执行 shell 命令，就可以配合 Galgame Maker 使用。像 OpenClaw、Codex、Claude Code 等 agent 都可以使用。

如果你想通过 Agent 来使用本编辑器开发 Galgame，建议先在电脑上下载好 Agent。后面的下载、解压、安装依赖等琐碎步骤，都可以直接交给 AI 来做。

对于国内用户，可以尝试：

- [CodeBuddy](https://www.codebuddy.cn/docs/ide/Introduction)
- [Trae](https://www.trae.ai/)
- [Qoder](https://qoder.com/zh)

这几个 Agent 对新用户通常会赠送免费额度，大家可以下载下来玩一玩。

不同 agent 的安装和授权方式不同，请以各自官方文档为准。

## 下载和使用

### 只使用编辑器

如果你只是想打开编辑器、制作或编辑游戏，不使用 AI Agent 的话，下载十分简单。

1. 打开 [Releases](https://github.com/ArthurAlwaysWin/VN-MAKER/releases) 页面。
2. 点击 `Assets` 并下载 `Galgame Maker-win32-x64.zip`。
3. 解压到一个干净文件夹，例如：

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\
    Galgame Maker.exe
```

4. 双击 `Galgame Maker.exe` 即可启动编辑器。

注意：在页面顶部绿色的 `Code` 按钮里点击 `Download ZIP` 下载的是本项目源码，不能直接双击使用，还需要安装 Node.js 和依赖。想要下载解压即用的版本，请到 [Releases](https://github.com/ArthurAlwaysWin/VN-MAKER/releases) 页面下载 `Galgame Maker-win32-x64.zip`。

不要把游戏项目或源码仓库放进 `Galgame Maker-win32-x64/` 内部。这个目录只放绿色免安装编辑器本体。

### 打算用 AI Agent 做游戏

如果你想让 AI agent 帮你把小说、设定或大纲做成 galgame，建议先下载好 AI Agent，例如上文提到的 CodeBuddy、Trae 或 Qoder。然后把下面这段提示词发给 AI：

```text
请帮我把 GitHub 上的 https://github.com/ArthurAlwaysWin/VN-MAKER 这个项目下载到我的电脑里，并按照 README 里的 Instructions For AI Agents 完成安装和配置。
```

Agent 看到项目 README 后，会继续按照下方的 `Instructions For AI Agents` 自动安装和准备工作区。

如果你打算亲自手动下载，建议新建或选择一个干净的文件夹来存放本项目文件，然后按以下步骤操作：

1. 打开 [Releases](https://github.com/ArthurAlwaysWin/VN-MAKER/releases) 页面，下载 `Galgame Maker-win32-x64.zip`。
2. 下载本仓库源码：回到本页面顶部，点击绿色的 `Code` 按钮，选择 `Download ZIP` 下载项目源码。解压后建议把源码文件夹改名为 `VN-MAKER`，并确认里面能看到 `package.json`。
3. 如果电脑里没有安装 Node.js，请先下载并安装 Node.js LTS。
4. 安装好 Node.js 后，在源码目录下打开终端，运行 `npm install` 命令即可配置好依赖。

推荐目录结构：

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\   # 绿色免安装编辑器
  VN-MAKER\                  # 项目源码仓库
  Projects\
    MyStory\                 # 你的游戏项目
```

如果电脑已经安装好了 Git，也可以用 `git clone` 把本项目源码下载到本地：

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

## Instructions For AI Agents

If you are an AI agent helping the user install Galgame Maker, follow these instructions.

1. Ask the user where they want to place the files. Recommend a clean folder named `Galgame-Maker`.
2. Check whether Node.js and npm are installed:

```bash
node -v
npm -v
```

If Node.js is missing, ask for the user's permission before installing it, or guide the user to install the Node.js LTS version.

3. Check whether Git is installed:

```bash
git --version
```

If Git is available, clone the repository:

```bash
git clone https://github.com/ArthurAlwaysWin/VN-MAKER.git VN-MAKER
```

If Git is not available, download the source code as a ZIP file from GitHub and extract it. Rename the extracted source folder to `VN-MAKER`.

4. Download `Galgame Maker-win32-x64.zip` from the Releases page, then extract it.
5. Use this recommended directory structure:

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\   # Editor
  VN-MAKER\                  # Source repository
  Projects\
    MyStory\                 # User's game project
```

6. Enter the `VN-MAKER` directory and run:

```bash
npm install
```

7. If this agent supports custom skills, install the skills stored under `.agent/skills/` into the agent's skills directory.
8. Read `README.md`, `.agent/skills/galgame-maker-authoring/SKILL.md`, and `docs/agent-authoring/README.md`. Then open only the task-specific references linked from that index.
9. Tell the user that future agent sessions should be opened from inside the `VN-MAKER` source directory. The actual game projects should live under `Projects/`, not inside the editor folder.
10. Do not edit the portable editor folder, especially `Galgame Maker-win32-x64/resources/app`.
11. If the user wants to turn prose into a visual novel, first show an adaptation preview that includes characters, scenes, pages, dialogue, choices, variables, conditions, endings, CG, and missing assets. Wait for the user's approval before generating a plan or running `npm run vn:apply-plan`.

## AI Agent 文档入口

- [Agent 创作文档索引](docs/agent-authoring/README.md)
- [Agent 创作工作流](docs/agent-authoring/workflow.md)
- [Agent 命令参考](docs/agent-authoring/command-reference.md)
- [Agent DSL 语法与工作流](docs/agent-authoring/agent-dsl.md)
- [项目契约](docs/agent-authoring/project-contract.md)
- [脚本格式参考](docs/script-format.md)
- [改编预览示例](docs/agent-authoring/example-adaptation-preview.md)
- [多结局示例与人工复核](docs/agent-authoring/human-review-tutorial.md)

## 授权说明

本项目当前暂未附加开放源代码许可证。公开仓库用于学习、体验和非商用试用；商用授权请先联系作者。
