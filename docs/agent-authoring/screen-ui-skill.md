# Screen UI Authoring Skill

Use this skill when an external agent is asked to design or revise Galgame Maker screen UI, including the title screen, settings screen, game menu, save/load screen, backlog screen, dialogue box, choice UI, quick action bar, or theme-level visual styling.

This skill is a design workflow and implementation guide. Current agent CLI coverage supports `ui.titleScreen`, structured layout replacement/merge for `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, and `ui.backlogScreen`, plus shared UI config commands for `ui.dialogueBox`, `ui.theme`, and `ui.widgetStyles`.

## Product Boundary

- Keep the no-code editor as the review, preview, polish, and export surface.
- Do not write arbitrary HTML or CSS into the project contract.
- Translate visual intent into editor-owned structured config: `ui.titleScreen`, `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, `ui.backlogScreen`, `ui.dialogueBox`, `ui.theme`, and `ui.widgetStyles`.
- Preserve GUI editability. If a design cannot be represented by structured config, explain the limitation and propose the closest editable version.

## Opening Question

When the user asks for a screen such as "make the title page", first ask:

```text
您想实现怎样的效果？您可以给我上传一张理想中的、或者可以参考的其他游戏页面截图。我会尽量把截图里的构图、色彩、按钮风格和层次感转成编辑器可继续修改的页面配置。
```

If the user does not provide a screenshot, ask for a short style direction instead:

- mood: quiet, romantic, suspense, fantasy, sci-fi, school-life, horror, etc.
- palette: bright, dark, warm, cool, monochrome, high contrast, etc.
- required text: title, subtitle, menu labels, copyright, version.
- required assets: background, logo, BGM, button images, decorative images.

## Visual Analysis Checklist

When a reference image is provided, inspect and summarize:

- Screen type and primary purpose.
- Composition: focal point, logo/title placement, menu placement, visual weight.
- Color and contrast: background tone, text color, button states, readability.
- Typography: title style, menu font style, hierarchy.
- Components: buttons, panels, dividers, icons, decorations.
- Spacing: alignment, margins, repeated rhythm.
- Asset needs: background, logo, button texture, overlay, decorative accents.
- What can be represented in current structured config, and what needs fallback.

## Implementation Target

Prefer structured edits in this order:

1. Title screen: `ui.titleScreen.background`, `bgm`, and `elements[]`.
2. Major screen layouts: `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, `ui.backlogScreen`.
3. Shared visual language: `ui.theme.tokens`, `ui.theme.buttonFamilies`, `ui.theme.icons`, `ui.widgetStyles`.
4. Runtime dialogue surface: `ui.dialogueBox`, choice UI, quick action bar styling.

Do not invent unsupported schema fields. If the CLI/API lacks a command for a future screen, do not silently raw-edit JSON as the normal path. Either:

- use the structured screen UI command when available, or
- state that the current branch needs a screen UI authoring command before this can be safely automated.

## Expected Agent Workflow

1. Ask for desired effect and reference screenshot.
2. Inspect the existing project and current screen config.
3. Analyze the reference image into editable layout decisions.
4. Create a structured screen plan with target paths, assets, and fallback notes.
5. Apply through official screen UI authoring commands when available.
6. Run validation, screen preview, author-check, and handoff.
7. Tell the human what to review visually in the editor.

When a transaction changes supported `ui.*` screen paths, run `author-check --transaction ... --write-preview-plan`; the output preview plan includes screen targets such as `titleScreen` and `gameMenu`.

When using a reference screenshot, include a structured fidelity note in the plan manifest. This creates a handoff review item without storing arbitrary HTML/CSS in the project:

```json
{
  "handoff": {
    "referenceScreenshotNotes": [
      {
        "screenId": "titleScreen",
        "reference": "references/title-screen.png",
        "summary": "Matched the title placement and vertical menu rhythm with editable title elements.",
        "matched": ["centered logo", "bottom-right menu stack"],
        "gaps": ["particle texture is approximated by static background art"]
      }
    ]
  }
}
```

## Current Title Screen Commands

The title screen can be edited through official CLI commands:

```bash
npm run vn -- set-title-screen --script path/to/script.json --background ui/title/bg.png --bgm audio/title.ogg --json
npm run vn -- add-title-element --script path/to/script.json --type text --content "Game Title" --x 640 --y 160 --anchor center --json
npm run vn -- add-title-element --script path/to/script.json --type button --label "开始游戏" --action start --x 640 --y 430 --anchor center --json
npm run vn -- update-title-element --script path/to/script.json --id start-button --label "Start" --json
npm run vn -- remove-title-element --script path/to/script.json --id unused-button --json
```

Plan manifest equivalents:

```json
{
  "version": 1,
  "operations": [
    {
      "id": "title-bg",
      "command": "set-title-screen",
      "params": { "background": "ui/title/background.png", "bgm": "audio/title.ogg" }
    },
    {
      "id": "title-logo",
      "command": "add-title-element",
      "params": { "type": "text", "content": "Moonlit Letter", "x": 640, "y": 170, "anchor": "center" }
    }
  ]
}
```

## Current Screen Layout Commands

Major screen layouts can be edited with:

```bash
npm run vn -- set-screen-layout --script path/to/script.json --screen gameMenu --config .tmp/game-menu-layout.json --json
npm run vn -- set-screen-layout --script path/to/script.json --screen settingsScreen --config .tmp/settings-layout.json --json
```

Supported screen ids are `settingsScreen`, `gameMenu`, `saveLoadScreen`, and `backlogScreen`. Do not pass `titleScreen` to this command; use `set-title-screen` and title element commands instead.

## Current Shared UI Commands

Shared UI config can be edited with:

```bash
npm run vn -- set-dialogue-box --script path/to/script.json --config .tmp/dialogue-box.json --json
npm run vn -- set-theme --script path/to/script.json --config .tmp/theme.json --json
npm run vn -- set-widget-styles --script path/to/script.json --config .tmp/widget-styles.json --replace --json
```

Plan manifest equivalents:

```json
{
  "version": 1,
  "operations": [
    {
      "id": "dialogue-nameplate",
      "command": "set-dialogue-box",
      "params": {
        "config": {
          "nameplateStyle": { "backgroundImage": "ui/dialogue/nameplate.png" }
        }
      }
    },
    {
      "id": "theme-icons",
      "command": "set-theme",
      "params": {
        "config": {
          "icons": { "close": "ui/icons/close.png" }
        }
      }
    },
    {
      "id": "widget-tabs",
      "command": "set-widget-styles",
      "params": {
        "merge": false,
        "config": {
          "tabs": { "activeBackgroundImage": "ui/widgets/tab-active.png" }
        }
      }
    }
  ]
}
```

## Handoff Notes

Handoff review items for screen UI should include:

- changed `ui.*` paths;
- preview target screen id, such as `titleScreen` or `gameMenu`;
- assets that are placeholders or missing;
- fidelity notes versus the reference screenshot through `handoff.referenceScreenshotNotes`;
- any design choice the human should approve in the editor.
