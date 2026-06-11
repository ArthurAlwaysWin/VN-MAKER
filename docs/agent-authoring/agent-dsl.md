# Agent DSL

Agent DSL is an agent-facing source format for drafting maintainable visual novel content. It is not a runtime scripting language and is not shown to players. The compiler turns DSL text into the existing apply-plan manifest shape, then the normal `apply-plan` validation and handoff gates keep the project editable in the no-code editor.

```bash
npm run vn:dsl-plan -- story.dsl --out .tmp/story-plan.json --json
npm run vn:apply-plan -- .tmp/story-plan.json --script public/game/script.json --validate-only --json
npm run vn:apply-plan -- .tmp/story-plan.json --script public/game/script.json --dry-run --json
```

## Supported MVP Syntax

Top-level declarations:

```text
title "Chapter 1"
character sakura "Sakura" color "#ff99cc" expression normal "characters/sakura_normal.png"
variable affection number initial 0 label "Affection"
ending good "Good End"
cg first_smile "First Smile" image "backgrounds/cg_smile.png"
```

Macros are compile-time only. They expand before the plan is generated:

```text
macro entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450
```

Scene bodies support normal page staging, dialogue, choices, simple condition routing, and terminal jumps:

```text
scene start "Start":
  page opening:
  bg "backgrounds/classroom.png"
  bgm "audio/theme.ogg" volume 0.7
  call entrance("sakura", "smile")
  say "The classroom grew quiet."
  say sakura "You came." expression smile voice "voices/sakura_001.ogg"
  choice "How do you answer?":
    option "Smile back" -> good:
      effect var:add affection 1
      unlock cg first_smile
    option "Look away" -> neutral:
      effect var:sub affection 1
  if affection >= 1 -> good else neutral
```

## Design Rules

- DSL source is optional authoring input. `script.json` remains the canonical project contract.
- The compiler emits existing deterministic apply-plan operations such as `add-scene`, `add-page`, `add-variable`, `add-character`, `add-ending`, and `add-cg`.
- No arbitrary JavaScript, CSS, HTML, shaders, or runtime plugins are generated.
- Human creators can still open and edit the compiled pages, choices, variables, endings, and CG entries in the desktop editor.
- Agents should keep generated DSL files as source artifacts when they need to maintain reusable macros or route logic across future edits.
