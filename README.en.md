# Galgame Maker

[简体中文](README.md) | **English**

Galgame Maker is a visual novel engine and native Chinese editor built from scratch. Its goal is simple: people with no programming background should be able to make their own galgame with a PPT-like visual workflow; users who work with AI agents should be able to turn prose, outlines, routes, endings, and assets into an editable visual novel project.

## Key Features

- **Visual novel engine built from scratch**: dialogue, narration, characters, expressions, backgrounds, BGM/SE, choices, variables, conditional branches, endings, CG unlocks, save/load, title screen, and settings screen.
- **Native Chinese no-code editor**: visual editing for pages, characters, assets, title screens, settings screens, and UI styles.
- **PPT-like authoring experience**: canvas-based page editing, drag-and-drop layout, asset management, title screen design, themes, and widget configuration.
- **AI-agent ready**: the repository includes `.agent/skills/galgame-maker-*`, the `tools/vn-author` CLI, project contracts, command references, and validation workflows. An agent can turn prose into a reviewable adaptation plan before writing to the project.
- **Clear safety boundary**: current effect-pack and export flows are manifest-only and built-in Canvas2D-adapter-only. Project-local arbitrary JS, eval, shader, WebGL, plugin marketplace, and arbitrary DOM extensions are not supported.
- **Export support**: export Web games, Windows desktop games, and a portable Windows editor package.

## Recommended AI Agents

Any agent that can read a GitHub repository, edit files, and run shell commands can work with Galgame Maker.

For users in China, you can try AI coding agents / AI IDEs such as:

- [CodeBuddy](https://www.codebuddy.cn/docs/ide/Introduction)
- [Trae](https://www.trae.ai/)
- [Qoder](https://qoder.com/zh)

If overseas services are available to you, you can also try:

- [OpenAI Codex](https://openai.com/codex/)
- [Claude Code](https://code.claude.com/docs/en/overview)
- [Cursor](https://docs.cursor.com/)
- [GitHub Copilot coding agent](https://docs.github.com/en/copilot/concepts/coding-agent/coding-agent)
- [opencode](https://www.opencode.live/)

Installation and account requirements differ by agent. Please follow each official guide.

## Download And Usage

### Editor Only

If you only want to open the editor and make or edit games, you do not need Node.js and you do not need the source code.

1. Open the [Releases](https://github.com/ArthurAlwaysWin/VN-MAKER/releases) page.
2. Download `Galgame Maker-win32-x64.zip`.
3. Extract it into a clean folder, for example:

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\
    Galgame Maker.exe
```

4. Double-click `Galgame Maker.exe`.

Do not place game projects or the source repository inside `Galgame Maker-win32-x64/`. That folder should only contain the portable editor.

### AI Agent Workflow

If you want an AI agent to help turn prose, settings, or outlines into a galgame, prepare:

1. `Galgame Maker-win32-x64.zip`: for the human creator to open the editor.
2. This source repository: for the AI agent to read skills, docs, and CLI commands.
3. Node.js: required for `npm install` and `npm run vn:*` in the source repository.

Recommended directory layout:

```text
D:\Galgame-Maker\
  Galgame Maker-win32-x64\   # portable editor
  VN-MAKER\                  # source checkout for the agent
  Projects\
    MyStory\                 # your game project
```

You can use GitHub **Download ZIP** or `git clone` for the source code. Both can run `npm install`, but `git clone` is recommended because agents can use `git status`, inspect changes, update the repository, and commit work.

```bash
git clone https://github.com/ArthurAlwaysWin/VN-MAKER.git VN-MAKER
cd VN-MAKER
npm install
```

Usually, ask the agent to open `D:\Galgame-Maker\VN-MAKER\` as its workspace. When targeting your game project, use absolute paths or paths relative to `VN-MAKER/`:

```bash
npm run vn:inspect -- --script "D:\Galgame-Maker\Projects\MyStory\script.json" --json
npm run vn:apply-plan -- .tmp/plan.json --script "D:\Galgame-Maker\Projects\MyStory\script.json" --validate-only --json
```

If your agent can only access files inside the opened folder, ask it to open `D:\Galgame-Maker\` instead, but it must enter `VN-MAKER/` before running commands.

### Let The Agent Prepare Things For You

Of course, in the age of AI, you can ask an agent to handle these small chores. Copy this prompt to your agent:

```text
Please prepare a Galgame Maker AI-agent workspace for me.

Target directory: D:\Galgame-Maker
Source repository: https://github.com/ArthurAlwaysWin/VN-MAKER.git

Please:
1. Create the target directory if it does not exist.
2. First check whether Node.js and npm are installed by running node -v and npm -v.
3. If Node.js is missing, tell me to install Node.js LTS and open https://nodejs.org/ or give me clear installation steps. Continue only after Node.js is installed.
4. Clone the source repository into VN-MAKER under the target directory.
5. Enter VN-MAKER and run npm install.
6. Read README.md, .agent/skills/galgame-maker-authoring/SKILL.md, docs/agent-authoring/workflow.md, and docs/agent-authoring/command-reference.md.
7. Do not modify Galgame Maker-win32-x64/resources/app.
8. If I ask you to adapt prose into a visual novel, first show an adaptation preview with characters, scenes, pages, dialogue, choices, variables, conditions, endings, CG, and missing-asset notes. Wait for my approval before generating a plan and running npm run vn:apply-plan.
```

You can also use this direct system prompt for your agent:

```text
If you are an AI Agent working with Galgame Maker:

1. Do not edit the portable editor folder, especially Galgame Maker-win32-x64/resources/app.
2. Work from the VN-MAKER source repository.
3. Check Node.js and npm first with node -v and npm -v. If they are missing, ask the user to install Node.js LTS from https://nodejs.org/ before continuing.
4. Run npm install in VN-MAKER before using npm run vn:* commands.
5. Read .agent/skills/galgame-maker-authoring/SKILL.md and docs/agent-authoring/workflow.md before editing a project.
6. For prose adaptation, show the user a plan first: characters, scenes, pages, dialogue, choices, variables, conditions, endings, CG, and missing assets. Wait for approval before applying changes.
7. Use absolute paths when targeting the user's game project, for example D:\Galgame-Maker\Projects\MyStory\script.json.
```

The portable editor and source repository do not conflict with each other. The editor is for human visual review and editing; the source repository gives the agent skills, docs, and commands. Both should operate on your game project folder, such as `Projects/MyStory/`.

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

## AI Agent Docs

- [Agent authoring workflow](docs/agent-authoring/workflow.md)
- [Agent command reference](docs/agent-authoring/command-reference.md)
- [Project contract](docs/agent-authoring/project-contract.md)
- [Script format](docs/script-format.md)
- [Adaptation preview example](docs/agent-authoring/example-adaptation-preview.md)
- [Multi-ending example and human review](docs/agent-authoring/human-review-tutorial.md)

## License Notice

This project currently does not include an open-source license. The public repository is available for learning, evaluation, and non-commercial trial use. Please contact the author before commercial use.
