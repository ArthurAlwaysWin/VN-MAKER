# Agent DSL

Agent DSL is an agent-facing source format for drafting maintainable visual novel content. It is not a runtime scripting language and is not shown to players. The compiler turns DSL text into the existing apply-plan manifest shape, then the normal `apply-plan` validation and handoff gates keep the project editable in the no-code editor.

For the mature target architecture, see [agent-dsl-architecture.md](./agent-dsl-architecture.md). For the phased implementation plan, see [agent-dsl-roadmap.md](./agent-dsl-roadmap.md).

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

## Formal Parser, Formatter, And Diagnostics

The P1 compiler front end tokenizes Agent DSL into a formal token stream, parses it into AST nodes, and attaches source spans to every parsed node before emitting the existing apply-plan manifest. It also includes an internal deterministic formatter used by tests and future `dsl-format` CLI work. This is a compile-time authoring layer only: the DSL is not interpreted by the runtime and does not replace `script.json`.

Every diagnostic uses a stable machine-readable code and source location:

```json
{
  "severity": "error",
  "code": "dsl-syntax-error",
  "message": "Expected \":\" after scene declaration.",
  "source": { "file": "story.dsl", "line": 12, "column": 20 },
  "span": {
    "start": { "line": 12, "column": 20, "offset": 320 },
    "end": { "line": 12, "column": 25, "offset": 325 }
  }
}
```

`npm run vn:dsl-plan -- story.dsl --json` returns a JSON failure payload with `ok: false` and `diagnostics[]` for normal syntax errors. Non-JSON output prints the diagnostic code and message without requiring agents to parse stack traces.

Current P1 diagnostic coverage includes:

- `dsl-syntax-error` for malformed statements, unterminated strings, missing block colons, and unknown statements.
- `dsl-invalid-indent` for tabs or inconsistent indentation.
- `dsl-macro-not-found` for calls to undeclared compile-time macros.
- `dsl-macro-arity-mismatch` for calls with the wrong number of scalar arguments.
- `dsl-macro-recursion-limit` for recursive or runaway macro expansion.

## Semantic Binder And Analyzer

The P2.1 compiler adds a semantic pass before apply-plan emission. It builds symbol tables for scenes, macros, characters, variables, endings, and CG entries, then fails closed when DSL source references undeclared authoring objects. Macro declarations are still compile-time templates; semantic checks run on the macro-expanded authoring surface so macro parameters are not mistaken for real project ids.

P2.1 diagnostic coverage includes:

- `dsl-duplicate-symbol` for duplicate ids inside the same symbol table.
- `dsl-unknown-scene-target` for unresolved `scene next`, `jump`, `choice option ->`, and `if ->/else` targets.
- `dsl-unknown-character` for unresolved `show` character ids and `say` speakers.
- `dsl-unknown-variable` for unresolved condition variables and variable effects.
- `dsl-unknown-ending` and `dsl-unknown-cg` for unresolved unlock targets.
- `dsl-invalid-effect` for unsupported effect types. Supported effect types are `var:set`, `var:add`, `var:sub`, `unlock:ending`, and `unlock:cg`.
- `dsl-invalid-asset-path` for absolute asset paths or traversal segments such as `../`.

These diagnostics are reported by `createAgentDslPlan(source)` and `npm run vn:dsl-plan` before a plan manifest is returned or written. The DSL remains an authoring source format only; the compiler still emits deterministic apply-plan operations and does not generate runtime code.

The P1 AST is an internal compiler contract. Node kinds include `File`, declarations, `MacroDeclaration`, `MacroCall`, `SceneDeclaration`, page/staging/dialogue statements, `ChoiceStatement`, `OptionStatement`, `ConditionStatement`, `EffectStatement`, `JumpStatement`, `EndStatement`, `CameraStatement`, and `ParticlesStatement`. Plan output remains compatible with existing `apply-plan --validate-only` gates.

The internal formatter normalizes spacing and indentation to two spaces per block, preserves supported standalone and inline comments, and is idempotent. The public `dsl-format` command remains a later roadmap item; until P6, agents should call `npm run vn:dsl-plan` for plan generation and should not rely on source rewriting as a workflow gate.
