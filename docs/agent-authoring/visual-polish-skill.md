# Visual Polish Agent Skill

Use this skill when an external agent is asked to improve a Galgame Maker project's visual quality, atmosphere, screen UI, page transitions, particles/weather, or overall "game feel".

Example user requests:

- "给我的游戏做一套好看的 UI。"
- "让这个游戏更像成品一点。"
- "这个场景想要下雪/樱花/雨天氛围。"
- "这个页面到下个页面之间加一个淡入淡出。"
- "把标题页做成悬疑电影感。"
- "让选项菜单更有质感。"

This skill complements:

- `docs/visual-effects-ui-agent-plan.md`
- `docs/milestone-11-effect-packs-feasibility-security-audit.md`
- `docs/agent-authoring/screen-ui-skill.md`
- `docs/agent-authoring/command-reference.md`
- `docs/agent-authoring/workflow.md`

## Product Boundary

- Human-facing editor stays no-code: no raw JSON, CSS, JS, or shader UI.
- Agent-facing workflow may use structured commands, apply-plan manifests, and implementation work.
- Agent output must remain canonical, validated, previewable, exportable, and reviewable in the editor.
- Do not invent unsupported `script.json` fields. If the requested visual effect needs a feature that is not implemented, say so and follow `docs/visual-effects-ui-agent-plan.md` to implement it first.
- Milestone 11 effect packs are manifest-only. You may use validated `assets.effectPacks` manifests and the built-in `canvas2d:film-flicker` adapter, but do not write project-local JavaScript, `runtime.js`, shaders/WebGL, raw CSS/HTML, plugin metadata, AI chat fields, or generic visual DSL fields.
- Do not imply there is an in-editor AI assistant. The external agent is the assistant; the editor is the human review and polish surface.

## First Response Pattern

When the user says something broad like:

```text
嘿 Claude，给我的游戏做一套好看的 UI。
```

Do not immediately overwrite the project with a random style. First respond with a short design intake:

```text
可以。我会先检查项目现有标题页、对话框、菜单、存读档和主题配置，再给你做一套仍能在编辑器里继续修改的 UI。

你想要哪种方向？如果没有特别想法，我会默认做一套「统一、干净、有轻微动效、适合视觉小说」的风格。
也可以给我一个关键词：校园清新 / 悬疑电影 / 赛博科幻 / 温柔恋爱 / 黑暗奇幻 / 极简现代。
```

If the user gives no style, choose a conservative default:

- clean visual hierarchy;
- readable dialogue;
- consistent buttons;
- subtle motion;
- no heavy asset assumptions;
- no strong genre styling that might fight the story.

If the user gives a reference screenshot, use `screen-ui-skill.md`'s reference analysis checklist and include `handoff.referenceScreenshotNotes` in the plan.

## Inspect Before Designing

Run:

```bash
git status --short --branch
npm run vn -- inspect --script public/game/script.json --json
npm run vn -- export-report --script public/game/script.json --json
npm run vn -- list-assets --script public/game/script.json --json
npm run vn -- list-transitions --target background --supported-only --json
npm run validate:project -- --json
```

If the project path is not `public/game/script.json`, use the actual project script path from the user's context.

Inspect:

- Game title, resolution, and project id.
- Current `ui.titleScreen`.
- Current `ui.dialogueBox`.
- Current `ui.theme`.
- Current `ui.widgetStyles`.
- Current major screens: `ui.settingsScreen`, `ui.gameMenu`, `ui.saveLoadScreen`, `ui.backlogScreen`.
- Available `assets/ui`, `assets/backgrounds`, `assets/audio`, and fonts.
- Existing transitions and any page-level visual issues.

Do not assume assets exist. Prefer current project assets over inventing filenames.

## Design Brief Shape

Before editing, create a concise design brief for yourself. If the user did not ask to approve every detail, do not stop; use this brief to guide implementation.

```json
{
  "styleDirection": "suspense-noir",
  "mood": ["quiet", "cinematic", "dark"],
  "palette": {
    "background": "near-black",
    "primary": "muted crimson",
    "text": "warm off-white"
  },
  "screens": {
    "titleScreen": "large title, low menu stack, dark overlay",
    "dialogueBox": "semi-transparent cinematic panel",
    "choices": "centered cards with subtle hover",
    "gameMenu": "left-side panel with clear actions",
    "saveLoad": "card grid with readable metadata",
    "settings": "tabbed panel with high contrast"
  },
  "motion": {
    "intensity": "subtle",
    "title": "slow enter",
    "choices": "stagger rise",
    "menus": "panel fade"
  },
  "atmosphere": {
    "particles": "none unless scene-specific",
    "transitions": "fade-black or crossfade-pan for dramatic scenes"
  }
}
```

## Choose The Implementation Path

### Current Supported Path

Use existing commands and structured config:

- `set-title-screen`
- `add-title-element`
- `update-title-element`
- `remove-title-element`
- `set-screen-layout`
- `set-dialogue-box`
- `set-theme`
- `set-widget-styles`
- `set-page-transition`
- `set-page-transitions`
- `list-transitions`
- `list-particles`
- `set-page-particles`
- `clear-page-particles`
- `inherit-page-particles`

Runtime UI polish baseline is now applied by the engine by default: title, choices, game menu, save/load, settings, and backlog have tasteful CSS motion and focus/hover polish without requiring a project-data field or command. Do not write `ui.motion` yet; that remains a later planned command/preset surface.

Built-in page particles now render at runtime when canonical page `particles` data exists. Human page particle controls are no-code in Page Inspector, and agents should use the structured particle commands above instead of raw JSON edits. Title-screen particles are not an authorable surface yet; do not write `ui.titleScreen.particles` until validation, commands, editor controls, and handoff support exist.

Use apply-plan for multi-step UI work.

### Planned Visual-Polish Path

When the branch has implemented `docs/visual-effects-ui-agent-plan.md`, also use:

- `list-particles`
- `set-page-particles`
- `clear-page-particles`
- `inherit-page-particles`
- `set-ui-motion`
- `list-ui-style-presets`
- `apply-ui-style-preset`

If a planned command does not exist yet, do not fake it. Either:

- implement the relevant milestone from `docs/visual-effects-ui-agent-plan.md`, or
- complete the UI work using current structured screen/theme commands and note that particles/motion presets are pending engine support.

## Apply-Plan Strategy For "Make A Good UI"

Prefer one manifest with coherent operations:

```json
{
  "version": 1,
  "title": "Visual UI polish pass",
  "operations": [
    {
      "id": "theme-foundation",
      "command": "set-theme",
      "params": {
        "config": {
          "tokens": {
            "primary": "#8fa7ff",
            "text": "#f5f7ff"
          }
        }
      }
    },
    {
      "id": "dialogue-box",
      "command": "set-dialogue-box",
      "params": {
        "config": {
          "backgroundColor": "rgba(8, 10, 18, 0.78)",
          "textColor": "#f5f7ff"
        }
      }
    },
    {
      "id": "widgets",
      "command": "set-widget-styles",
      "params": {
        "config": {
          "buttons": {
            "borderRadius": 14
          }
        }
      }
    }
  ],
  "handoff": {
    "referenceScreenshotNotes": []
  }
}
```

The exact config shape must match the current command reference and existing UI contracts. If uncertain, inspect current `script.json` and nearby tests before writing.

## Natural Language Mapping

### UI Style

| User says | Agent intent |
| --- | --- |
| "做一套好看的 UI" | Create a coherent theme, dialogue box, widgets, title/menu/save/settings/backlog layout pass. |
| "清新校园风" | Light palette, soft blue/green accents, rounded panels, gentle motion. |
| "悬疑电影感" | Dark palette, muted accent, slow fades, wide panels, restrained highlights. |
| "赛博科幻" | Dark surface, neon accents, sharper cards, glow lines, high contrast. |
| "温柔恋爱" | Warm/pastel palette, rounded panels, soft choice cards. |
| "像成品游戏一点" | Improve consistency, spacing, hover/focus, readable contrast, title/menu polish. |

### Transitions

| User says | Command |
| --- | --- |
| "这一页到下一页淡入淡出" | `set-page-transition --type fade` |
| "切到下一幕时闪白" | `set-page-transition --type flash` or `fade-white` |
| "黑场转过去" | `set-page-transition --type fade-black` |
| "慢一点转场" | increase duration, usually `900..1400` ms |
| "不要转场" | `set-page-transition --type none --duration 0` |
| "百叶窗打开" | `set-page-transition --type blinds-h` or `blinds-v` |
| "从中心展开" | `set-page-transition --type circle-open` or `diamond` |
| "有点故障感" | `set-page-transition --type glitch-lite` |
| "噪点溶解过去" | `set-page-transition --type noise-dissolve` |
| "像水波一样切换" | `set-page-transition --type ripple` |
| "燃烧一样切过去" | `set-page-transition --type burn` |

After transition edits, run `author-check --transaction --write-preview-plan`; changed transition paths produce scene-page preview targets and `transition-preview` review items.

### Particles / Atmosphere

| User says | Planned command |
| --- | --- |
| "加一点樱花" | `set-page-particles --preset sakura --density 0.3..0.5` |
| "下大雪" | `set-page-particles --preset snow --density 0.7..0.9 --speed 0.7` |
| "雨天氛围" | `set-page-particles --preset rain --density 0.5..0.8` |
| "空气里有一点尘埃" | `set-page-particles --preset dust --density 0.2..0.4` |
| "到室内后停止下雨" | `clear-page-particles` |
| "下一页保持这个氛围" | `inherit-page-particles` when staying inside the same scene; otherwise set an explicit particle config on the next scene's first page. |

After particle edits, run `author-check --transaction`; changed particle paths produce scene-page preview targets and `particle-preview` handoff review items.

## Quality Rules

Always check:

- Text contrast is readable.
- Buttons have clear default, hover/focus, disabled states where supported.
- Title screen actions remain usable.
- Save/load metadata remains readable.
- Settings controls remain obvious.
- Backlog text remains readable and voice replay icons still work.
- UI does not cover characters or choices in normal gameplay.
- Visual style is consistent across title, dialogue, choices, menus, and major screens.
- Motion is tasteful and does not block skip/quick actions.
- Existing user assets are preserved unless the user asked for replacement.

## Validation And Handoff

After applying:

```bash
npm run vn -- apply-plan .tmp/visual-polish-plan.json --script public/game/script.json --dry-run --json
npm run vn -- apply-plan .tmp/visual-polish-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/visual-polish-result.json --json
npm run validate:project -- --json
npm run vn -- author-check --script public/game/script.json --transaction .tmp/visual-polish-result.json --write-preview-plan --json
npm run vn -- handoff-report --script public/game/script.json --transaction .tmp/visual-polish-result.json --write-editor-handoff --note "Review visual UI polish pass." --json
```

If available and useful:

```bash
npm run vn -- render-preview --script public/game/script.json --scene start --page 0 --out .tmp/visual-preview-start.png --json
```

Final response to human should include:

- Chosen style direction.
- Screens/components changed.
- Scenes/pages with transition or atmosphere changes.
- Validation/readiness status.
- Preview targets generated.
- What to review in the no-code editor.

## Example: "给我的游戏做一套好看的 UI"

Expected agent behavior:

1. Ask for style direction or use a conservative default if the user wants you to proceed.
2. Run inspect/report/list-assets/list-transitions/validate.
3. Identify available UI images, fonts, and current screen config.
4. Choose a coherent style direction.
5. Create `.tmp/visual-polish-plan.json`.
6. Apply theme, dialogue box, widget styles, title screen, and major screen layout operations.
7. If supported, apply `ui.motion` or style preset operations.
8. Do not add particles globally unless the user asked for atmosphere or the title screen specifically benefits from subtle particles.
9. Run validation, author-check, and handoff.
10. Tell the user what changed and what to review.

Minimal final human-facing summary:

```text
我给项目做了一套「悬疑电影感」UI：标题页改成暗色低对比构图，菜单和系统页统一成深色半透明面板，对话框和选项按钮改成更克制的电影式样。已运行验证和 handoff，编辑器的 Project Settings 里会显示需要预览的 title/menu/save/settings/backlog 目标。
```

## Do Not

- Do not write raw CSS/HTML into project data.
- Do not overwrite all UI sections blindly without preserving existing BGM, buttons, and custom title elements unless requested.
- Do not invent particle commands before they exist.
- Do not claim visual fidelity from a dry-run preview alone.
- Do not finish without validation and handoff for meaningful UI changes.
