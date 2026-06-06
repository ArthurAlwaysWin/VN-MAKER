# Galgame Maker

[简体中文](README.md) | **English**

Galgame Maker is a visual novel engine and native no-code editor built from scratch. Its biggest features are **no-code authoring** and **AI-agent-assisted game creation**. It lets people without programming experience make their own galgame with a PPT-like workflow; it also lets users who work with AI agents turn prose, settings, branches, endings, and assets into an editable visual novel project.

The editor currently supports dialogue, narration, characters, expressions, backgrounds, BGM/SE, choices, variables, conditional branches, endings, CG unlocks, save/load, title screens, settings screens, and more. Other advanced features are still in development.

## Recommended AI Agents

Any agent that can read a GitHub repository, edit files, and run shell commands can work with Galgame Maker. Agents such as Claude Code, OpenAI Codex, Cursor, GitHub Copilot coding agent, and opencode can be used.

If you want to use an agent to develop a galgame with this editor, install your preferred agent first. The small chores later, such as downloading, extracting, and installing dependencies, can be handed to AI directly.

You can try:

- [Claude Code](https://code.claude.com/docs/en/overview)
- [OpenAI Codex](https://openai.com/codex/)
- [Cursor](https://docs.cursor.com/)
- [GitHub Copilot coding agent](https://docs.github.com/en/copilot/concepts/coding-agent/coding-agent)
- [opencode](https://www.opencode.live/)

Installation and account requirements differ by agent. Please follow each official guide.

## Download And Usage

### Editor Only

If you only want to open the editor and make or edit games without using an AI agent, downloading it is simple.

1. Open the [Releases](https://github.com/ArthurAlwaysWin/VN-MAKER/releases) page.
2. Click `Assets` and download `Galgame Maker-win32-x64.zip`.
3. Extract it into a clean folder, for example:

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\
    Galgame Maker.exe
```

4. Double-click `Galgame Maker.exe` to start the editor.

Note: if you click the green `Code` button at the top of the GitHub page and choose `Download ZIP`, you are downloading the source code. It cannot be used by double-clicking directly; it requires Node.js and dependencies. If you want the ready-to-use editor, download `Galgame Maker-win32-x64.zip` from the [Releases](https://github.com/ArthurAlwaysWin/VN-MAKER/releases) page.

Do not place game projects or the source repository inside `Galgame Maker-win32-x64/`. That folder should only contain the portable editor.

### Use AI Agents To Make Games

If you want an AI agent to help turn prose, settings, or outlines into a galgame, install your preferred AI agent first. Then send this prompt to the agent:

```text
Please download the GitHub project https://github.com/ArthurAlwaysWin/VN-MAKER to my computer, then follow the Instructions For AI Agents in the README to install and configure it.
```

After the agent reads the project README, it should continue with the `Instructions For AI Agents` below to install and prepare the workspace.

If you want to download things manually, create or choose a clean folder for this project, then follow these steps:

1. Open the [Releases](https://github.com/ArthurAlwaysWin/VN-MAKER/releases) page and download `Galgame Maker-win32-x64.zip`.
2. Download this repository's source code: return to the top of this page, click the green `Code` button, choose `Download ZIP`, then extract it. It is recommended to rename the extracted source folder to `VN-MAKER` and confirm that `package.json` is inside it.
3. If Node.js is not installed on your computer, download and install Node.js LTS first.
4. After Node.js is installed, open a terminal in the source directory and run `npm install`.

Recommended directory layout:

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\   # portable editor
  VN-MAKER\                  # source repository
  Projects\
    MyStory\                 # your game project
```

If Git is installed, you can also use `git clone` to download the source repository:

```bash
git clone https://github.com/ArthurAlwaysWin/VN-MAKER.git VN-MAKER
cd VN-MAKER
npm install
```

Usually, ask the agent to open `D:\Galgame-Maker\VN-MAKER\` as its workspace. When the agent operates on your game project, use absolute paths or paths relative to `VN-MAKER/`:

```bash
npm run vn:inspect -- --script "D:\Galgame-Maker\Projects\MyStory\script.json" --json
npm run vn:apply-plan -- .tmp/plan.json --script "D:\Galgame-Maker\Projects\MyStory\script.json" --validate-only --json
```

If your agent can only access files inside the opened folder, you can ask it to open the parent directory `D:\Galgame-Maker\`, but it must enter `VN-MAKER/` before running commands.

The portable editor and source repository do not conflict with each other. The editor is for human visual review and editing; the source repository gives the agent skills, docs, and commands. The real shared target is your game project folder, such as `Projects/MyStory/`.

## Source Development

```bash
npm install
npm run dev
```

Common commands:

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

If Node.js is missing, ask for the user's permission before installing it, or guide the user to install Node.js LTS.

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
8. Read `README.md`, `.agent/skills/galgame-maker-authoring/SKILL.md`, `docs/agent-authoring/workflow.md`, and `docs/agent-authoring/command-reference.md`.
9. Tell the user that future agent sessions should be opened from inside the `VN-MAKER` source directory. The actual game projects should live under `Projects/`, not inside the editor folder.
10. Do not edit the portable editor folder, especially `Galgame Maker-win32-x64/resources/app`.
11. If the user wants to turn prose into a visual novel, first show an adaptation preview that includes characters, scenes, pages, dialogue, choices, variables, conditions, endings, CG, and missing assets. Wait for the user's approval before generating a plan or running `npm run vn:apply-plan`.

## AI Agent Docs

- [Agent authoring workflow](docs/agent-authoring/workflow.md)
- [Agent command reference](docs/agent-authoring/command-reference.md)
- [Project contract](docs/agent-authoring/project-contract.md)
- [Script format](docs/script-format.md)
- [Adaptation preview example](docs/agent-authoring/example-adaptation-preview.md)
- [Multi-ending example and human review](docs/agent-authoring/human-review-tutorial.md)

## License Notice

This project currently does not include an open-source license. The public repository is available for learning, evaluation, and non-commercial trial use. Please contact the author before commercial use.
