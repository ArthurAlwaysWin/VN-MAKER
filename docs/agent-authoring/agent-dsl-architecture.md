# Agent DSL Architecture

**Status:** Proposed target architecture
**Audience:** maintainers, AI agents, CLI authors, editor developers
**Primary goal:** make Agent DSL a mature source language for AI-assisted VN authoring while preserving Galgame Maker's no-code editor contract.

## 1. Executive Summary

Agent DSL is an agent-facing authoring source language. It lets AI agents write reusable story structure, route logic, and cinematic macros in a maintainable text form. The DSL must never become a runtime scripting surface and must never replace `script.json`.

The canonical pipeline is:

```text
Agent DSL source
  -> parse to AST with source spans
  -> resolve symbols and expand compile-time constructs
  -> lower to Authoring IR
  -> emit apply-plan manifest
  -> apply-plan validate-only / dry-run / write
  -> script.json
  -> no-code editor review and polish
```

`script.json` remains the only canonical project contract. Agent DSL source is optional, useful, and maintainable, but compiled output must stay editable through the desktop editor.

## 2. Normative Language

This document uses the following terms:

- **MUST** means an implementation is required to satisfy the mature Agent DSL contract.
- **MUST NOT** means an implementation is forbidden.
- **SHOULD** means an implementation is strongly recommended and any exception must be documented.
- **MAY** means optional behavior.

## 3. Non-Negotiable Constraints

1. Agent DSL MUST compile to existing supported authoring commands or documented new authoring commands.
2. Agent DSL MUST NOT execute arbitrary JavaScript, CSS, HTML, shaders, shell commands, or project-local plugins.
3. Agent DSL MUST NOT be interpreted by the runtime game engine.
4. Agent DSL MUST NOT introduce fields that the editor cannot preserve or the validator cannot understand.
5. `script.json` MUST remain the canonical editable project data.
6. Human editor changes MUST be respected. A DSL rebuild MUST detect stale source maps or changed compiled regions before overwriting generated content.
7. Every emitted apply-plan operation SHOULD include stable provenance pointing back to DSL source ranges.
8. Every compiler diagnostic MUST include a stable code and source location.
9. The compiler MUST fail closed when it cannot prove a generated plan is safe.
10. The mature toolchain MUST be testable without launching the GUI.

## 4. Current MVP Boundary

The current implementation provides:

- `src/authoring/agentDslPlan.js`
- `src/authoring/agentDsl/ir.js`
- `src/authoring/agentDsl/emitPlan.js`
- `src/authoring/agentDsl/project.js`
- `npm run vn:dsl-plan -- story.dsl --out .tmp/plan.json --json`
- `npm run vn -- dsl-plan agent-src/project.gmdsl.json --out .tmp/plan.json --json`
- compile-time macros
- top-level declarations for title, character, variable, ending, and CG
- scene body statements for page staging, dialogue, choices, simple conditions, effects, jumps, camera, particles, and media
- first-pass multi-file includes and namespaces
- strict first-pass condition expressions for single comparisons, flat `and`, and flat `or`
- compile-time cinematic mood presets that expand to existing page staging fields
- compile-time reusable sequences with scalar parameters that expand to page statements or option effects
- compile-time route templates that emit affection variables, ending registry entries, and editable ending scenes
- P5 source map artifact emission with operation provenance ids, deterministic fingerprints, apply-plan enrichment, and stale generated-region checks
- plan output that can be passed to `apply-plan`

The implementation does not yet provide:

- import declarations
- incremental rebuild
- editor UI for DSL provenance

Reverse skeleton generation is available as a migration aid through `dsl-skeleton`; it emits starter source plus unsupported/lossy reports, but it does not claim provenance over existing editor-authored `script.json` paths.

All future work must preserve the MVP's compile-to-plan safety model.

## 5. Artifact Model

### 5.1 Source Files

Mature DSL projects SHOULD use these source artifacts:

```text
agent-src/
  project.gmdsl.json
  main.gmdsl
  chapters/
    chapter-01.gmdsl
  macros/
    entrances.gmdsl
    route-patterns.gmdsl
```

The exact folder name is configurable. Recommended default: `agent-src/`.

### 5.2 Project Manifest

`project.gmdsl.json` is optional in early phases and required for mature multi-file builds.

Canonical shape:

```json
{
  "version": 1,
  "entry": "main.gmdsl",
  "sourceRoot": ".",
  "outPlan": "../.tmp/agent-dsl-plan.json",
  "targetScript": "../script.json",
  "compiler": {
    "languageVersion": 1,
    "strict": true,
    "sourceMap": true
  }
}
```

Rules:

- `version` MUST be an integer.
- `entry` MUST be a path inside `sourceRoot`.
- `sourceRoot` MUST NOT escape the project directory.
- `outPlan` SHOULD point to `.tmp/` unless the user explicitly wants a persistent generated plan.
- `targetScript` MAY be omitted when only compiling a plan.
- The manifest MUST NOT contain executable hooks.

### 5.3 Build Artifacts

Generated artifacts:

```text
.tmp/
  agent-dsl-plan.json
  agent-dsl-source-map.json
  agent-dsl-check.json
```

Persistent project artifacts MAY include:

```text
agent-src/
  project.gmdsl.json
```

Generated artifacts SHOULD NOT be treated as canonical source unless explicitly committed for review.

The P5 implementation can emit `agent-dsl-source-map.json` from `dsl-plan --source-map-out`, then enrich it from `apply-plan --source-map --source-map-out`. It records source entries, mapping ids, operation ids, inferred or applied project paths, source/emitted fingerprints, and generated-region fingerprints for stale checks.

## 6. Compilation Pipeline

### 6.1 Pipeline Stages

The mature compiler MUST be split into these stages:

1. **Load**
   - Resolve manifest.
   - Read entry file.
   - Resolve includes.
   - Normalize line endings.

2. **Lex**
   - Produce tokens with file, line, column, and byte offset.
   - Preserve comments for formatter and source map context.

3. **Parse**
   - Produce an AST.
   - Attach source spans to every node.
   - Recover from local syntax errors where possible.

4. **Bind**
   - Build symbol tables for scenes, macros, characters, variables, endings, CG entries, and imported names.
   - Report duplicates and unresolved symbols.

5. **Expand**
   - Expand compile-time macros.
   - Inline snippets.
   - Preserve expansion provenance.

6. **Analyze**
   - Validate route targets, variable references, effect compatibility, condition types, asset path shape, and unsupported constructs before plan emission.

7. **Lower**
   - Convert AST/expanded AST to Authoring IR.
   - Authoring IR is command-agnostic but project-contract-aware.

8. **Emit**
   - Emit apply-plan manifest.
   - Emit source map.
   - Emit check report.

9. **Gate**
   - Run `apply-plan --validate-only`.
   - Optionally run `apply-plan --dry-run`.
   - Optionally run write with checkpoint.

### 6.2 Failure Rules

The compiler MUST stop before plan emission when:

- source files cannot be resolved;
- syntax errors prevent AST construction;
- duplicate symbols would make generated ids ambiguous;
- unresolved route targets are not explicitly marked as external or future;
- macro expansion exceeds the recursion limit;
- an emitted operation would require an unsupported apply-plan command;
- an emitted project field is unsupported by the shared validator.

The compiler MAY still emit a partial check report for editor/agent diagnostics.

## 7. Language Layers

Agent DSL should evolve in layers. Implementations MUST NOT skip lower layers by adding ad hoc syntax that cannot be represented in the architecture.

### 7.1 Layer 0: Current MVP

Purpose: compile a single file into an apply-plan manifest.

Features:

- top-level declarations;
- scenes;
- simple pages;
- dialogue;
- choices;
- simple condition pages;
- compile-time macros;
- basic effects.

### 7.2 Layer 1: Formal Source Language

Purpose: make the language parseable, diagnosable, and format-stable.

Required features:

- token stream;
- AST;
- source spans;
- structured diagnostics;
- formatter;
- golden fixtures.

### 7.3 Layer 2: Project Language

Purpose: support maintainable story projects.

Required features:

- includes;
- modules;
- namespaces;
- exports/imports;
- macro libraries;
- project manifest.

### 7.4 Layer 3: Semantic Authoring Language

Purpose: express VN authoring concepts above raw pages.

Required features:

- route declarations;
- scene groups;
- reusable sequences;
- named staging presets;
- mood/cinematic presets;
- strict symbol references;
- expression grammar.

### 7.5 Layer 4: Maintenance Toolchain

Purpose: keep DSL source and editor-polished output synchronized.

Required features:

- source maps;
- generated-region fingerprints;
- stale-source detection;
- incremental rebuild;
- reverse skeleton generation;
- diff preview.

## 8. Mature Syntax Specification

This section defines the target grammar. Current MVP syntax is a subset.

### 8.1 File Structure

```ebnf
file             = { top_level_statement } ;
top_level_statement
                 = title_decl
                 | include_decl
                 | namespace_decl
                 | import_decl
                 | character_decl
                 | variable_decl
                 | ending_decl
                 | cg_decl
                 | macro_decl
                 | preset_decl
                 | sequence_decl
                 | scene_decl
                 | route_decl ;
```

### 8.2 Literals

```ebnf
identifier       = letter , { letter | digit | "_" | "-" } ;
string           = double_quoted_string | single_quoted_string ;
number           = [ "-" ] , digit , { digit } , [ "." , digit , { digit } ] ;
boolean          = "true" | "false" ;
null             = "null" ;
scalar           = string | number | boolean | null | identifier ;
```

Rules:

- IDs SHOULD be ASCII slug ids unless a project explicitly allows CJK ids.
- Asset paths MUST be project-relative and MUST NOT contain traversal segments.
- Strings MUST preserve Unicode content.

### 8.3 Includes And Namespaces

```ebnf
include_decl     = "include" , string ;
namespace_decl   = "namespace" , identifier , ":" , indented_block ;
import_decl      = "from" , string , "import" , import_list ;
import_list      = identifier , { "," , identifier } | "*" ;
```

Rules:

- Includes MUST be resolved relative to the importing file.
- Cycles MUST be reported with diagnostic `dsl-include-cycle`.
- Imported names MUST NOT shadow local names unless explicitly aliased in a future extension.
- Current P3 namespaces are compile-time only. Generated project ids are prefixed with the namespace path, for example `namespace chapter_01: scene start` emits `chapter_01_start`.
- Duplicate symbols are rejected after namespace prefixing, so the same local id MAY appear in different namespaces and MUST still be rejected inside one namespace.
- The P3 implementation does not yet support imports; cross-namespace references should use future explicit imports rather than hidden runtime lookup.

### 8.4 Declarations

```ebnf
title_decl       = "title" , string ;
character_decl   = "character" , identifier , [ string ] , { character_field } ;
character_field  = "color" , string
                 | "expression" , identifier , string ;
variable_decl    = "variable" , identifier , variable_type , { variable_field } ;
variable_type    = "number" | "bool" | "string" ;
variable_field   = "initial" , scalar
                 | "label" , string
                 | "group" , string
                 | "kind" , identifier
                 | "character" , identifier
                 | "min" , number
                 | "max" , number
                 | "step" , number ;
ending_decl      = "ending" , identifier , [ string ] , { ending_field } ;
cg_decl          = "cg" , identifier , [ string ] , { cg_field } ;
```

Declarations lower to:

- `add-character`
- `add-variable`
- `add-affection-variable`
- `add-ending`
- `add-cg`

### 8.5 Macros

```ebnf
macro_decl       = "macro" , identifier , "(" , [ param_list ] , ")" , ":" , indented_block ;
param_list       = identifier , { "," , identifier } ;
macro_call       = "call" , identifier , "(" , [ arg_list ] , ")" ;
arg_list         = scalar , { "," , scalar } ;
```

Rules:

- Macros are compile-time only.
- Macro arguments are scalar values in the first mature release.
- Macro expansion MUST preserve the source span of both the call site and the macro body.
- Recursive macro expansion MUST be rejected with diagnostic `dsl-macro-recursion-limit`.
- Macros MUST NOT mutate global compiler state.

### 8.5b Reusable Sequences

```ebnf
sequence_decl    = "sequence" , identifier , "(" , [ param_list ] , ")" , ":" , sequence_body ;
sequence_body    = indented_block { page_stmt | background_stmt | bgm_stmt | se_stmt | show_stmt | say_stmt | narrate_stmt | transition_stmt | camera_stmt | particles_stmt | preset_use | macro_call | sequence_use | effect_stmt } ;
sequence_use     = "sequence" , identifier , "(" , [ arg_list ] , ")" ;
```

Rules:

- Sequences are compile-time only.
- Sequence arguments are scalar values.
- Sequence uses lower by substituting `$param` and `${param}` placeholders and expanding the sequence body before IR emission.
- A sequence used in a scene body must expand to valid scene-body statements.
- A sequence used in a choice option body must expand to valid option effect statements.
- Choices, conditions, jumps, terminal `end` statements, arbitrary code, or runtime hooks MUST be rejected.

### 8.5c Route Templates

```ebnf
route_decl       = "route" , identifier , ":" , route_body ;
route_body       = indented_block , affection_route_field , good_end_route_field , normal_end_route_field ;
affection_route_field
                 = "affection" , "variable" , identifier ;
good_end_route_field
                 = "good_end" , identifier ;
normal_end_route_field
                 = "normal_end" , identifier ;
```

Rules:

- Route templates are compile-time only.
- The route id MUST match a declared character id and SHOULD appear after that character declaration.
- `affection variable` lowers to `add-affection-variable`.
- `good_end` and `normal_end` lower to `add-ending`, `add-scene`, and a normal `add-page` with page-enter `unlock:ending`.
- Generated scene ids and ending ids are the `good_end` and `normal_end` values.
- Route templates MUST NOT create runtime route logic, hidden metadata, arbitrary code, or custom project fields.

### 8.5a Cinematic Presets

```ebnf
preset_decl      = "preset" , preset_kind , identifier , ":" , preset_body ;
preset_kind      = "mood" ;
preset_body      = indented_block { background_stmt | bgm_stmt | se_stmt | show_stmt | transition_stmt | camera_stmt | particles_stmt } ;
preset_use       = "preset" , preset_kind , identifier ;
```

Rules:

- Presets are compile-time only.
- The first implementation supports `mood` presets.
- Preset uses lower by expanding their body into ordinary page staging statements before IR emission.
- Presets MUST NOT require runtime DSL interpretation or hidden project fields.
- Unsupported preset kinds, nested presets, choices, conditions, effects, jumps, or arbitrary code MUST be rejected.

### 8.6 Scenes

```ebnf
scene_decl       = "scene" , identifier , [ string ] , [ "next" , identifier ] , ":" , scene_body ;
scene_body       = indented_block { scene_statement } ;
scene_statement  = page_stmt
                 | background_stmt
                 | bgm_stmt
                 | se_stmt
                 | show_stmt
                 | say_stmt
                 | narrate_stmt
                 | choice_stmt
                 | condition_stmt
                 | jump_stmt
                 | end_stmt
                 | camera_stmt
                 | particles_stmt
                 | preset_use
                 | sequence_use
                 | macro_call ;
```

Scenes lower to:

- `add-scene`
- `add-page`
- `set-scene-next` when needed

### 8.7 Page And Staging Statements

```ebnf
page_stmt        = "page" , [ identifier ] , ":" ;
background_stmt  = ( "bg" | "background" ) , string ;
bgm_stmt         = "bgm" , string , [ "volume" , number ] ;
se_stmt          = "se" , string ;
show_stmt        = "show" , identifier , [ identifier ] , [ "at" , position ] , [ "animation" , identifier ] ;
position         = "left" | "center" | "right" | identifier ;
transition_stmt  = "transition" , identifier , [ number ] ;
camera_stmt      = "camera" , identifier , [ identifier ] , [ number ] ;
particles_stmt   = "particles" , identifier , { particle_field } ;
```

Rules:

- Staging statements apply to the current normal page.
- If no page is open, the compiler MUST create one implicitly at the first staging/dialogue statement.
- A `choice` or `if` statement MUST flush the current normal page before emitting its page.

### 8.8 Dialogue

```ebnf
say_stmt         = "say" , ( identifier , string | string ) , { dialogue_field } ;
narrate_stmt     = "narrate" , string , { dialogue_field } ;
dialogue_field   = "expression" , identifier
                 | "voice" , string ;
```

Rules:

- `say "text"` and `narrate "text"` both lower to speaker `null`.
- `say character "text"` lowers to speaker `character`.
- Speaker identifiers SHOULD be declared characters. Undeclared speakers MUST be warnings or errors based on strictness.

### 8.9 Choices

```ebnf
choice_stmt      = "choice" , string , ":" , option_block ;
option_block     = indented_block { option_stmt } ;
option_stmt      = "option" , string , [ "->" , identifier ] , ":" , option_body ;
option_body      = indented_block { effect_stmt | macro_call } ;
```

Rules:

- Each choice MUST contain at least one option.
- Each option target SHOULD resolve to a scene.
- Empty option bodies are allowed.
- Option effects lower to `effects` on the option object.

### 8.10 Conditions

The target expression grammar is:

```ebnf
condition_stmt   = "if" , expression , "->" , identifier , [ "else" , identifier ] ;
expression       = or_expr ;
or_expr          = and_expr , { "or" , and_expr } ;
and_expr         = not_expr , { "and" , not_expr } ;
not_expr         = [ "not" ] , comparison ;
comparison       = value_ref , compare_op , scalar
                 | "(" , expression , ")" ;
value_ref        = identifier ;
compare_op       = "==" | "!=" | ">" | ">=" | "<" | "<=" ;
```

Initial lowering rules:

- A single comparison lowers to one condition row.
- `and` lowers to `conditionMode: "all"` when all children are simple comparisons.
- `or` lowers to `conditionMode: "any"` when all children are simple comparisons.
- Mixed nested expressions MUST be rejected until the project contract supports nested condition groups.

### 8.11 Effects

```ebnf
effect_stmt      = "effect" , effect_type , effect_args
                 | "unlock" , unlock_kind , identifier
                 | "affection" , identifier , signed_number ;
effect_type      = "var:set" | "var:add" | "var:sub" | "unlock:ending" | "unlock:cg" ;
unlock_kind      = "ending" | "cg" ;
```

Rules:

- Effects MUST lower to the existing shared effect DSL.
- Unsupported effect types MUST be rejected at compile time.

## 9. AST Contract

Every AST node MUST include:

```json
{
  "kind": "SceneDeclaration",
  "id": "start",
  "span": {
    "file": "agent-src/main.gmdsl",
    "start": { "line": 12, "column": 1, "offset": 180 },
    "end": { "line": 20, "column": 1, "offset": 420 }
  }
}
```

Required common fields:

- `kind`
- `span`
- `leadingComments` when needed for formatter preservation

Node kinds MUST be stable. Breaking renames require a documented migration.

Minimum mature AST node kinds:

- `File`
- `IncludeDeclaration`
- `NamespaceDeclaration`
- `ImportDeclaration`
- `TitleDeclaration`
- `CharacterDeclaration`
- `VariableDeclaration`
- `EndingDeclaration`
- `CgDeclaration`
- `MacroDeclaration`
- `MacroCall`
- `PresetDeclaration`
- `PresetUseStatement`
- `SequenceDeclaration`
- `SequenceUseStatement`
- `RouteDeclaration`
- `RouteFieldStatement`
- `SceneDeclaration`
- `PageStatement`
- `BackgroundStatement`
- `BgmStatement`
- `SeStatement`
- `ShowStatement`
- `SayStatement`
- `NarrateStatement`
- `ChoiceStatement`
- `OptionStatement`
- `ConditionStatement`
- `EffectStatement`
- `JumpStatement`
- `EndStatement`
- `CameraStatement`
- `ParticlesStatement`

## 10. Authoring IR Contract

Authoring IR is the compiler's internal semantic output before apply-plan emission. It MUST be deterministic and JSON-serializable.

Canonical shape:

```json
{
  "version": 1,
  "source": {
    "kind": "agent-dsl",
    "languageVersion": 1
  },
  "operations": [
    {
      "kind": "CreateScene",
      "stableId": "scene:start",
      "sourceId": "main.gmdsl:12:1",
      "payload": {
        "id": "start",
        "name": "Start",
        "next": null
      }
    }
  ]
}
```

Rules:

- IR operation order MUST be stable.
- `stableId` MUST be deterministic across builds for unchanged source.
- `sourceId` MUST link to source map entries.
- IR MUST NOT contain executable code.
- IR MUST be lowerable to apply-plan without inspecting raw source text.

Initial IR operation kinds:

- `DeclareCharacter`
- `DeclareVariable`
- `DeclareEnding`
- `DeclareCg`
- `CreateScene`
- `CreateNormalPage`
- `CreateChoicePage`
- `CreateConditionPage`
- `SetSceneNext`

## 11. Apply-Plan Emission Rules

The emitter converts IR to plan operations.

Every operation MUST include:

```json
{
  "id": "dsl-add-page-start-1",
  "command": "add-page",
  "params": {},
  "provenance": {
    "kind": "agent-dsl",
    "sourceMapId": "src-00042",
    "file": "agent-src/main.gmdsl",
    "line": 15,
    "column": 3
  }
}
```

Rules:

- `id` MUST be stable and unique within the plan.
- `command` MUST be in `SUPPORTED_APPLY_PLAN_COMMANDS`.
- `params` MUST use documented JSON-native names.
- `provenance` MUST NOT affect execution.
- Source map ids SHOULD be short and stable.
- The generated plan MUST pass `apply-plan --validate-only` before write.

## 12. Source Map Contract

The mature compiler MUST emit `agent-dsl-source-map.json` when `sourceMap` is enabled.

Canonical shape:

```json
{
  "version": 1,
  "compiler": "agent-dsl",
  "languageVersion": 1,
  "sources": [
    {
      "id": "src-00001",
      "path": "agent-src/main.gmdsl",
      "sha256": "..."
    }
  ],
  "mappings": [
    {
      "id": "map-00042",
      "sourceId": "src-00001",
      "span": {
        "start": { "line": 15, "column": 3, "offset": 220 },
        "end": { "line": 18, "column": 1, "offset": 330 }
      },
      "astKind": "ChoiceStatement",
      "irStableId": "choice:start:2",
      "operationId": "dsl-add-choice-start-2",
      "projectPaths": [
        "scenes.start.pages.1"
      ],
      "fingerprint": {
        "source": "sha256:...",
        "emitted": "sha256:...",
        "generated": "sha256:..."
      }
    }
  ]
}
```

Rules:

- Source map paths MUST be project-relative.
- The map MUST support source-to-project lookup.
- The map SHOULD support project-to-source lookup.
- Fingerprints MUST be computed from normalized source, emitted payloads, and enriched generated project regions.
- If a mapped project path changes in the editor, stale-check APIs MUST report stale output instead of blindly overwriting it.

## 13. Diagnostics Contract

Compiler diagnostics MUST use this shape:

```json
{
  "severity": "error",
  "code": "dsl-unknown-scene-target",
  "message": "Scene target \"good\" is not declared.",
  "source": {
    "file": "agent-src/main.gmdsl",
    "line": 24,
    "column": 28
  },
  "span": {
    "start": { "line": 24, "column": 28, "offset": 512 },
    "end": { "line": 24, "column": 32, "offset": 516 }
  },
  "suggestedAction": {
    "summary": "Declare scene good or change the target.",
    "repairHint": {
      "action": "add-scene-or-retarget",
      "target": "good"
    }
  }
}
```

Required fields:

- `severity`
- `code`
- `message`
- `source.file`
- `source.line`
- `source.column`

Stable diagnostic codes:

- `dsl-syntax-error`
- `dsl-invalid-indent`
- `dsl-include-not-found`
- `dsl-include-cycle`
- `dsl-invalid-include-path`
- `dsl-manifest-entry-missing`
- `dsl-duplicate-symbol`
- `dsl-invalid-preset`
- `dsl-unknown-preset`
- `dsl-invalid-sequence`
- `dsl-unknown-sequence`
- `dsl-sequence-arity-mismatch`
- `dsl-sequence-recursion-limit`
- `dsl-invalid-route-template`
- `dsl-unknown-symbol`
- `dsl-unknown-scene-target`
- `dsl-unknown-character`
- `dsl-unknown-variable`
- `dsl-unknown-condition-variable`
- `dsl-unknown-ending`
- `dsl-unknown-cg`
- `dsl-invalid-asset-path`
- `dsl-invalid-effect`
- `dsl-invalid-condition-expression`
- `dsl-nested-condition-unsupported`
- `dsl-condition-type-mismatch`
- `dsl-macro-not-found`
- `dsl-macro-arity-mismatch`
- `dsl-macro-recursion-limit`
- `dsl-unsupported-command-required`
- `dsl-source-map-stale`
- `dsl-generated-region-conflict`

## 14. Symbol Resolution

The binder MUST create these symbol tables:

- scenes
- macros
- sequences
- routes
- characters
- variables
- endings
- CG entries
- presets
- modules/namespaces

Resolution rules:

1. Local namespace symbols win over imported symbols.
2. Duplicate local symbols are errors.
3. Imports must be explicit after namespace support is introduced.
4. A macro name and a scene name MAY be identical because they occupy different symbol tables.
5. A variable id and character id MAY be identical only if no syntax position becomes ambiguous.
6. Route targets resolve against scenes.
7. Effect ids resolve according to effect type.

## 15. Safety And Security Model

Agent DSL is data, not code.

Forbidden:

- shell execution;
- JavaScript evaluation;
- dynamic imports;
- arbitrary file writes;
- absolute asset paths;
- path traversal;
- project-local plugin registration;
- hidden runtime hooks;
- custom HTML/CSS/shader injection.

Allowed:

- reading declared DSL source files inside source root;
- reading project contract for semantic checks;
- writing generated plan/check/source-map artifacts to approved output paths;
- invoking existing repo-owned CLI gates.

## 16. Editor Interoperability

Editor interoperability is more important than DSL expressiveness.

Rules:

- Every generated page MUST be editable in existing no-code editor surfaces.
- If an advanced DSL construct cannot lower to editable project data, it MUST be rejected.
- Generated operations SHOULD use existing page, screen, variable, ending, CG, and cinematic fields.
- The editor MAY show source provenance in future, but gameplay MUST NOT depend on DSL source files.
- Editor changes to generated regions MUST be treated as human edits.
- Rebuild tooling MUST offer a diff/merge path before overwriting human edits.

## 17. CLI Tooling Contract

Required mature commands:

```bash
npm run vn:dsl-plan -- agent-src/main.gmdsl --out .tmp/plan.json --json
npm run vn -- dsl-check agent-src/main.gmdsl --script public/game/script.json --json
npm run vn -- dsl-format agent-src/main.gmdsl --write
npm run vn -- dsl-build agent-src/project.gmdsl.json --validate-only --json
npm run vn -- dsl-diff agent-src/project.gmdsl.json --script public/game/script.json --json
npm run vn -- dsl-skeleton --script public/game/script.json --out agent-src/main.gmdsl --json
```

Command semantics:

- `dsl-plan` compiles source to a plan only.
- `dsl-check` parses, binds, analyzes, and optionally validates emitted plan in memory.
- `dsl-format` rewrites DSL source with stable formatting.
- `dsl-build` compiles and optionally runs apply-plan gates.
- `dsl-diff` compares generated output against current project data using source map fingerprints.
- `dsl-skeleton` creates a starter DSL source from existing project data without claiming ownership of all project paths.

## 18. Testing Contract

Minimum mature test coverage:

- lexer token fixtures;
- parser AST fixtures;
- syntax error fixtures;
- macro expansion fixtures;
- include resolution fixtures;
- symbol resolution fixtures;
- semantic diagnostics fixtures;
- IR golden fixtures;
- plan emission golden fixtures;
- apply-plan validate-only integration tests;
- source map round-trip tests;
- stale generated-region tests;
- formatter idempotence tests;
- path safety tests;
- no arbitrary code execution tests.

Every grammar feature MUST have:

1. one valid fixture;
2. one invalid fixture;
3. one plan emission assertion when it lowers to project data;
4. one docs example or command-reference entry.

## 19. Compatibility And Migration

Language versions:

- MVP syntax is language version 0.
- Mature formal syntax starts at language version 1.

Rules:

- New syntax SHOULD be additive.
- Breaking syntax changes MUST include a migration command or documented manual migration.
- Source maps MUST record the language version.
- The compiler SHOULD continue reading older source versions when practical.

## 20. Open Design Questions

These are intentionally unresolved and must be answered before mature implementation is marked complete:

1. Should DSL source live inside every game project by default, or only when an agent creates it?
2. Should generated plans be committed, or treated only as build artifacts?
3. How much reverse generation should `dsl-skeleton` attempt for heavily edited projects?
4. Should editor UI expose source provenance, and if so where?
5. Should namespaces be visible in generated scene ids, or only in DSL symbol resolution?
6. Should future nested condition expressions extend `script.json`, or compile to intermediate condition scenes?

## 21. Mature Definition Of Done

Agent DSL is mature only when all of these are true:

- A multi-file DSL project can compile deterministically to apply-plan.
- `dsl-check` reports source-located diagnostics without writing.
- `dsl-format` is idempotent.
- Generated plans pass `apply-plan --validate-only`.
- Source maps link DSL ranges to project paths.
- Rebuild detects stale editor changes.
- Route, variable, character, ending, and CG references are checked before plan write.
- The docs describe all supported syntax.
- Tests cover valid, invalid, and integration cases.
- No generated project data requires custom runtime execution.
