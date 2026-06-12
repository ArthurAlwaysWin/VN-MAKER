# Agent DSL

Agent DSL is an agent-facing source format for drafting maintainable visual novel content. It is not a runtime scripting language and is not shown to players. The compiler turns DSL text into the existing apply-plan manifest shape, then the normal `apply-plan` validation and handoff gates keep the project editable in the no-code editor.

For the mature target architecture, see [agent-dsl-architecture.md](./agent-dsl-architecture.md). For the phased implementation plan, see [agent-dsl-roadmap.md](./agent-dsl-roadmap.md).

```bash
npm run vn:dsl-plan -- story.dsl --out .tmp/story-plan.json --json
npm run vn:dsl-plan -- story.dsl --out .tmp/story-plan.json --source-map-out .tmp/agent-dsl-source-map.json --json
npm run vn -- dsl-plan agent-src/project.gmdsl.json --out .tmp/story-plan.json --json
npm run vn:apply-plan -- .tmp/story-plan.json --script public/game/script.json --validate-only --json
npm run vn:apply-plan -- .tmp/story-plan.json --script public/game/script.json --source-map .tmp/agent-dsl-source-map.json --source-map-out .tmp/agent-dsl-source-map.applied.json --dry-run --json
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

Cinematic mood presets are compile-time only too. They package reusable atmosphere and lower to ordinary editable page fields:

```text
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
  camera shake low 450
```

Scene bodies support normal page staging, dialogue, choices, simple condition routing, and terminal jumps:

```text
scene start "Start":
  page opening:
  bg "backgrounds/classroom.png"
  bgm "audio/theme.ogg" volume 0.7
  preset mood rainy_school
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
- `dsl-invalid-preset` and `dsl-unknown-preset` for malformed, unsupported, or undeclared cinematic presets.

## Semantic Binder And Analyzer

The P2.1 compiler adds a semantic pass before apply-plan emission. It builds symbol tables for scenes, macros, characters, variables, endings, and CG entries, then fails closed when DSL source references undeclared authoring objects. Macro declarations are still compile-time templates; semantic checks run on the macro-expanded authoring surface so macro parameters are not mistaken for real project ids.

P2.1 diagnostic coverage includes:

- `dsl-duplicate-symbol` for duplicate ids inside the same symbol table.
- `dsl-unknown-scene-target` for unresolved `scene next`, `jump`, `choice option ->`, and `if ->/else` targets.
- `dsl-unknown-character` for unresolved `show` character ids and `say` speakers.
- `dsl-unknown-condition-variable` for unresolved condition variables.
- `dsl-unknown-variable` for unresolved variable effects.
- `dsl-unknown-ending` and `dsl-unknown-cg` for unresolved unlock targets.
- `dsl-invalid-effect` for unsupported effect types. Supported effect types are `var:set`, `var:add`, `var:sub`, `unlock:ending`, and `unlock:cg`.
- `dsl-invalid-asset-path` for absolute asset paths or traversal segments such as `../`.

These diagnostics are reported by `createAgentDslPlan(source)` and `npm run vn:dsl-plan` before a plan manifest is returned or written. The DSL remains an authoring source format only; the compiler still emits deterministic apply-plan operations and does not generate runtime code.

The P1 AST is an internal compiler contract. Node kinds include `File`, declarations, `MacroDeclaration`, `MacroCall`, `SceneDeclaration`, page/staging/dialogue statements, `ChoiceStatement`, `OptionStatement`, `ConditionStatement`, `EffectStatement`, `JumpStatement`, `EndStatement`, `CameraStatement`, and `ParticlesStatement`. Plan output remains compatible with existing `apply-plan --validate-only` gates.

The formatter normalizes spacing and indentation to two spaces per block, preserves supported standalone and inline comments, and is idempotent. Use `npm run vn -- dsl-format agent-src/main.gmdsl --json` for check-only formatting output, or add `--write` to update a single `.dsl`/`.gmdsl` source file.

## Authoring IR And Multi-File Projects

P2 lowers the parsed, macro-expanded DSL into deterministic Authoring IR before emitting apply-plan operations. The IR is JSON-serializable, keeps source provenance, and contains no raw DSL source text or executable runtime code. Initial IR operation kinds cover declarations, scene creation, normal/choice/condition pages, and scene-next links.

P3 adds a first multi-file project loader for CLI plan generation:

```json
{
  "version": 1,
  "entry": "main.gmdsl",
  "sourceRoot": ".",
  "compiler": {
    "languageVersion": 1,
    "strict": true
  }
}
```

`include "path/to/file.gmdsl"` is resolved relative to the importing file and must stay inside `sourceRoot`. Missing includes report `dsl-include-not-found`, cycles report `dsl-include-cycle`, traversal or absolute paths report `dsl-invalid-include-path`, and manifests without `entry` report `dsl-manifest-entry-missing`.

Namespaces are compile-time only:

```text
namespace chapter_01:
  scene start "Start":
    jump ending
  scene ending "Ending":
    end
```

The first namespace policy prefixes generated ids, so the example emits scenes `chapter_01_start` and `chapter_01_ending`. Duplicate ids are allowed across different namespaces and rejected inside the same namespace. Namespace support does not add runtime lookup behavior, imports, or hidden project fields.

## Cinematic Mood Presets

P8.1 adds reusable `mood` presets for common VN atmosphere:

```text
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
  camera shake low 450

scene start "Start":
  page opening:
  preset mood rainy_school
  say "Rain tapped against the glass."
```

Preset declarations are removed during compilation. Each `preset mood id` use is expanded before IR lowering into the ordinary statements in the preset body, so the emitted plan still contains regular `add-page` data such as `page.transition`, `page.particles`, and `page.camera`. The runtime never interprets Agent DSL presets.

Preset bodies currently accept existing safe page staging statements: `bg`/`background`, `bgm`, `se`, `show`, `transition`, `camera`, and `particles`. Choices, conditions, effects, jumps, nested presets, and arbitrary code are rejected. Unknown preset references report `dsl-unknown-preset`; unsupported preset kinds or body statements report `dsl-invalid-preset`.

## Condition Expressions

P4 supports strict route condition expressions that lower to the existing editable condition page contract:

```text
if affection >= 5 and saw_letter == true -> sakura_true else normal
if affection >= 5 or courage >= 3 -> brave_route else normal
```

Supported expressions are a single comparison, a flat `and` chain, or a flat `or` chain. `and` lowers to `conditionMode: "all"` and `or` lowers to `conditionMode: "any"`. Comparisons support `==`, `!=`, `>`, `>=`, `<`, and `<=` against declared `number`, `bool`, and `string` variables.

Mixed or nested expressions such as `(affection >= 5 and saw_letter == true) or courage >= 3` are rejected with `dsl-nested-condition-unsupported` until nested condition groups exist in the project contract. `not` is rejected with `dsl-invalid-condition-expression`.

Condition diagnostics include `dsl-unknown-condition-variable` for undeclared variables and `dsl-condition-type-mismatch` for incompatible comparisons, such as comparing a `string` variable with `> 2`.

## Source Map Artifact

P5 starts the rebuild-safety toolchain with an optional source map artifact:

```bash
npm run vn:dsl-plan -- agent-src/main.gmdsl --out .tmp/agent-dsl-plan.json --source-map-out .tmp/agent-dsl-source-map.json --json
```

The emitted `agent-dsl-source-map.json` records DSL source entries, source spans, plan operation ids, inferred project paths, and deterministic source/emitted fingerprints. Plan operation provenance includes `sourceMapId`, which matches the corresponding source map `mappings[].id`.

After `apply-plan`, pass `--source-map` and `--source-map-out` to enrich mappings from operation result `changedPaths` and record `fingerprint.generated` from the applied project regions:

```bash
npm run vn:apply-plan -- .tmp/agent-dsl-plan.json --script public/game/script.json --source-map .tmp/agent-dsl-source-map.json --source-map-out .tmp/agent-dsl-source-map.applied.json --dry-run --json
```

The P5 stale-check API compares those generated-region fingerprints with the current `script.json` paths. Unchanged generated paths are safe, edited or deleted generated paths are stale, and unrelated human edits outside mapped generated paths do not make the source map stale. This is rebuild safety metadata only; full `dsl-diff` and incremental rebuild commands remain later tooling work.
