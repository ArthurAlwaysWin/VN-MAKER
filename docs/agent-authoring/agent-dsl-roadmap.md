# Agent DSL Implementation Roadmap

**Status:** Proposed implementation plan
**Audience:** AI implementers, maintainers, reviewers
**Architecture reference:** `docs/agent-authoring/agent-dsl-architecture.md`

## 1. Purpose

This roadmap turns the Agent DSL architecture into an implementation sequence. It is written so an AI agent can pick up one phase, implement it, run the specified gates, and leave the project in a reviewable state.

The roadmap is strict: do not skip phases by adding unsupported shortcuts. Agent DSL must mature as a compile-to-plan authoring language, not as a runtime interpreter or a second project format.

## 2. Global Invariants

Every phase MUST preserve these invariants:

1. `script.json` remains canonical project data.
2. Agent DSL compiles to supported apply-plan commands.
3. No arbitrary JS/CSS/HTML/shader/runtime plugin code is generated.
4. Generated content remains editable in the no-code desktop editor.
5. Compiler diagnostics include stable machine-readable codes.
6. Tests prove the new feature at compiler level and apply-plan integration level when the feature emits project data.
7. Documentation is updated in the same phase as behavior.
8. `npm run vn:apply-plan -- <generated-plan> --validate-only --json` must pass for valid generated examples.
9. Human/editor changes must not be overwritten silently once source maps exist.

## 3. Completion Target

The mature Agent DSL toolchain is complete when all of this works:

```bash
npm run vn -- dsl-check agent-src/main.gmdsl --script public/game/script.json --json
npm run vn -- dsl-format agent-src/main.gmdsl --write
npm run vn -- dsl-build agent-src/project.gmdsl.json --validate-only --json
npm run vn -- dsl-diff agent-src/project.gmdsl.json --script public/game/script.json --json
npm run vn -- dsl-skeleton --script public/game/script.json --out agent-src/main.gmdsl --json
```

And:

- multi-file DSL projects compile deterministically;
- source maps connect DSL spans to `script.json` paths;
- stale generated regions are detected;
- route/variable/asset/character/ending/CG references are checked before write;
- formatter output is stable;
- docs contain the full supported grammar;
- no runtime interpreter is required.

## 4. Phase Overview

| Phase | Status | Name | Primary Outcome |
| --- | --- | --- | --- |
| P0 | Implemented | Baseline MVP | Current `dsl-plan` compiler exists |
| P1 | Implemented | Formal Parser And Diagnostics | Tokenizer, AST, source spans, structured errors |
| P2 | Implemented | Semantic Model And Authoring IR | Symbol tables, IR, deterministic lowering |
| P3 | Implemented | Multi-File Projects | Includes, manifest, namespaces, macro libraries |
| P4 | Implemented | Route Logic And Expressions | Strict expression grammar and DSL-level semantic checks |
| P5 | Implemented | Source Maps And Rebuild Safety | Source maps, fingerprints, stale output detection |
| P6 | Implemented | Tooling Commands | `dsl-check`, `dsl-format`, `dsl-build`, `dsl-diff` |
| P7 | Implemented | Reverse Skeleton And Migration | Generate maintainable DSL starter source from `script.json` |
| P8 | Implemented | Advanced Authoring Abstractions | Cinematic presets, reusable sequences, route templates |
| P9 | Implemented | Editor And Handoff Integration | Handoff provenance, editor panel metadata, preview provenance, and generated-region warnings |

## 5. P0 - Baseline MVP

**Status:** Implemented.

Current deliverables:

- `src/authoring/agentDslPlan.js`
- `npm run vn:dsl-plan`
- `docs/agent-authoring/agent-dsl.md`
- `tests/agentDslPlan.test.js`
- CLI integration test for `dsl-plan` -> `apply-plan --validate-only`

Known limitations:

- parser is line-oriented;
- no formal AST;
- no source maps;
- no includes;
- no formatter;
- limited condition expressions;
- no stale rebuild detection.

P0 MUST remain usable while later phases land.

## 6. P1 - Formal Parser And Diagnostics

### Objective

Replace the line-oriented parser internals with a formal lexer/parser that produces AST nodes with source spans and structured diagnostics.

### Deliverables

- `src/authoring/agentDsl/lexer.js`
- `src/authoring/agentDsl/parser.js`
- `src/authoring/agentDsl/ast.js`
- `src/authoring/agentDsl/diagnostics.js`
- compatibility wrapper so `createAgentDslPlan(source)` still works
- parser fixture tests

### Required Behavior

The parser MUST:

- tokenize strings, identifiers, numbers, booleans, null, punctuation, comments, and indentation;
- reject tabs with `dsl-invalid-indent`;
- produce source spans with file, line, column, and offset;
- preserve enough comment placement for future formatting;
- parse all P0 syntax;
- return a structured result:

```json
{
  "ok": false,
  "ast": null,
  "diagnostics": [
    {
      "severity": "error",
      "code": "dsl-syntax-error",
      "message": "Expected ':' after scene declaration.",
      "source": { "file": "story.dsl", "line": 12, "column": 20 }
    }
  ]
}
```

### Implementation Tasks

1. Create lexer with unit tests.
2. Create parser for P0 grammar.
3. Add source span helpers.
4. Convert current direct parser logic to consume AST.
5. Keep current public API working.
6. Update `agent-dsl.md` with formal error behavior.

### Tests

Required tests:

```bash
npm run test:vitest -- tests/agentDslLexer.test.js
npm run test:vitest -- tests/agentDslParser.test.js
npm run test:vitest -- tests/agentDslPlan.test.js
npm run test:vitest -- tests/vnAuthorCli.test.js -t "agent DSL"
```

Fixture categories:

- valid declarations;
- valid scenes;
- valid macro calls;
- invalid indent;
- unterminated string;
- missing colon;
- bad macro arity;
- unknown top-level statement.

### Acceptance Criteria

- All P0 valid examples still compile to equivalent plans.
- Syntax errors no longer throw unstructured stack traces from normal CLI use.
- Every diagnostic has a stable `code`.
- Every AST node has a source span.

### Do Not

- Do not add new language features in P1 unless needed to preserve P0 behavior.
- Do not introduce source maps yet beyond AST spans.

## 7. P2 - Semantic Model And Authoring IR

### Objective

Introduce symbol binding, semantic checks, and Authoring IR before plan emission.

### Deliverables

- `src/authoring/agentDsl/binder.js`
- `src/authoring/agentDsl/analyzer.js`
- `src/authoring/agentDsl/ir.js`
- `src/authoring/agentDsl/emitPlan.js`
- IR golden fixture tests

P2.1 implements the binder and analyzer deliverables first. Full Authoring IR extraction and a separate plan emitter remain later P2 work; current plan emission continues to use the compatibility emitter after semantic diagnostics pass.

### Required Behavior

The compiler MUST build symbol tables for:

- scenes;
- macros;
- characters;
- variables;
- endings;
- CG entries.

The analyzer MUST detect:

- duplicate symbols;
- unknown scene targets;
- unknown characters in `show` and `say`;
- unknown variables in effects and conditions;
- unknown endings/CG entries in unlock effects;
- invalid effect types;
- invalid asset paths with traversal or absolute paths;
- unsupported constructs that cannot lower to apply-plan.

Authoring IR MUST be JSON-serializable and deterministic.

Example IR:

```json
{
  "kind": "CreateChoicePage",
  "stableId": "choice:start:2",
  "sourceId": "story.dsl:20:3",
  "payload": {
    "scene": "start",
    "prompt": "Answer?",
    "options": []
  }
}
```

### Implementation Tasks

1. Define IR operation types.
2. Implement binder and duplicate detection.
3. Implement semantic checks.
4. Move plan emission to IR emitter.
5. Preserve current plan output shape where possible.
6. Add `--strict` option if useful, defaulting to strict for new commands.

### Tests

Required tests:

```bash
npm run test:vitest -- tests/agentDslBinder.test.js
npm run test:vitest -- tests/agentDslAnalyzer.test.js
npm run test:vitest -- tests/agentDslIr.test.js
npm run test:vitest -- tests/agentDslPlan.test.js
```

Integration test:

- Compile a DSL file with variables, endings, CG, choices, conditions.
- Run generated plan through `apply-plan --validate-only`.
- Assert validation is OK.

### Acceptance Criteria

- Unknown references are caught before apply-plan.
- IR golden fixtures are stable.
- Plan emission no longer inspects raw source lines.
- Existing CLI behavior remains compatible.

### Do Not

- Do not rely only on `validateProject` for DSL-level diagnostics.
- Do not allow undeclared references to pass silently in strict mode.

## 8. P3 - Multi-File Projects

### Objective

Allow large agent-authored projects to be organized into multiple DSL files with includes, namespaces, and a project manifest.

### Deliverables

- `project.gmdsl.json` loader
- include resolver
- namespace support
- import support
- cycle diagnostics
- project-level CLI input support

### Required Syntax

```text
include "macros/entrances.gmdsl"

namespace chapter_01:
  scene start "Start":
    say "Opening."
```

Project manifest:

```json
{
  "version": 1,
  "entry": "main.gmdsl",
  "sourceRoot": ".",
  "compiler": {
    "languageVersion": 1,
    "strict": true,
    "sourceMap": true
  }
}
```

### Implementation Tasks

1. Add manifest parser and path safety checks.
2. Add include resolver with cycle detection.
3. Add namespace-aware symbol table.
4. Decide generated id policy for namespaces.
5. Add CLI support:

```bash
npm run vn -- dsl-plan agent-src/project.gmdsl.json --out .tmp/plan.json --json
```

6. Update docs with multi-file examples.

### Tests

Required tests:

- include success;
- include missing;
- include cycle;
- namespace duplicate allowed across namespaces;
- namespace duplicate rejected in same namespace;
- path traversal include rejected;
- manifest entry missing rejected.

Commands:

```bash
npm run test:vitest -- tests/agentDslProject.test.js
npm run test:vitest -- tests/agentDslPlan.test.js
```

### Acceptance Criteria

- A multi-file fixture compiles deterministically.
- Includes cannot escape source root.
- Namespace behavior is documented and tested.

### Open Decision

Before implementation, choose one generated id policy:

1. Namespace prefixes generated scene ids, for example `chapter_01_start`.
2. Namespace only affects DSL symbol resolution; generated ids must be explicit.

Chosen for P3: namespace prefixes generated ids. A declaration inside `namespace chapter_01:` lowers to apply-plan ids such as `chapter_01_start`, and references inside that namespace are rewritten to the same generated ids before binding/analyzing. This keeps namespace behavior compile-time-only, deterministic, and visible to the existing editor/project contract. The first implementation does not add runtime namespace lookup or hidden project fields.

## 9. P4 - Route Logic And Expressions

**Status:** First implementation complete for single comparisons, flat `and`, flat `or`, unknown condition variables, and type mismatch diagnostics. Nested/mixed expressions and `not` remain intentionally rejected.

### Objective

Replace simple one-row `if` parsing with a strict expression grammar that lowers safely to current condition pages where possible.

### Required Syntax

```text
if affection >= 5 and saw_letter == true -> sakura_true else normal
if affection >= 5 or courage >= 3 -> brave_route else normal
```

### Lowering Rules

- `A and B` lowers to `conditionMode: "all"` with two condition rows.
- `A or B` lowers to `conditionMode: "any"` with two condition rows.
- Parenthesized nested mixed expressions are rejected until the project contract supports nested condition groups.
- `not` is rejected in the first implementation unless it can be normalized to a supported comparison.

### Diagnostics

Required codes:

- `dsl-invalid-condition-expression`
- `dsl-nested-condition-unsupported`
- `dsl-unknown-condition-variable`
- `dsl-condition-type-mismatch`

### Implementation Tasks

1. Implement expression lexer/parser or extend existing parser.
2. Add expression AST nodes.
3. Bind variables in expression nodes.
4. Lower supported expressions to condition pages.
5. Reject unsupported nested expressions with clear diagnostics.

### Tests

Required fixtures:

- single comparison;
- two-comparison `and`;
- two-comparison `or`;
- mixed nested expression rejected;
- unknown variable rejected;
- string comparison;
- bool comparison;
- number comparison.

### Acceptance Criteria

- Supported expressions lower to existing condition page contract.
- Unsupported expressions fail before plan emission.
- Generated plans pass `apply-plan --validate-only`.

## 10. P5 - Source Maps And Rebuild Safety

**Status:** Implemented. Source map emission, operation provenance ids, apply-plan changed path enrichment, deterministic source/emitted/generated fingerprints, and stale generated-region detection API are complete. Full `dsl-diff`, incremental rebuild, and two-way sync remain later phases.

### Objective

Map DSL source ranges to generated plan operations and project paths, then detect when editor-polished output has diverged from the generated source.

### Deliverables

- `agent-dsl-source-map.json`
- source-to-operation mapping
- operation-to-project-path mapping
- generated-region fingerprints
- stale detection API

### Required Source Map Shape

Use the architecture document's canonical shape.

### Implementation Tasks

1. [x] Emit source map from compiler.
2. [x] Include source map ids in operation provenance.
3. [x] After apply-plan dry-run or write, enrich mappings with changed paths.
4. [x] Compute emitted payload fingerprints.
5. [x] Implement stale check against current `script.json`.
6. [x] Add CLI-hidden internal helper first if full `dsl-diff` is P6.

### Tests

Required tests:

- [x] source span maps to operation id;
- [x] operation id maps to changed path;
- [x] unchanged project path is not stale;
- [x] edited generated page is stale;
- [x] deleted generated scene is stale;
- [x] unrelated human edit outside generated paths is not stale.

### Acceptance Criteria

- [x] Rebuild tooling can identify whether a generated region is safe to replace.
- [x] Source map paths are project-relative.
- [x] Fingerprints are deterministic.

### Do Not

- Do not overwrite stale generated regions.
- Do not claim full two-way sync yet.

## 11. P6 - Tooling Commands

### Objective

Expose mature DSL tooling through repo-owned CLI commands.

### Required Commands

```bash
npm run vn -- dsl-check agent-src/main.gmdsl --script public/game/script.json --json
npm run vn -- dsl-format agent-src/main.gmdsl --write
npm run vn -- dsl-build agent-src/project.gmdsl.json --validate-only --json
npm run vn -- dsl-diff agent-src/project.gmdsl.json --script public/game/script.json --json
```

### Command Contracts

#### `dsl-check`

Must:

- parse;
- bind;
- analyze;
- optionally emit plan in memory;
- optionally run apply-plan validate-only when `--script` is present;
- never write source or project files.

Output:

```json
{
  "ok": true,
  "diagnostics": [],
  "operationCount": 12,
  "validation": {
    "ok": true
  }
}
```

#### `dsl-format`

Must:

- format DSL source deterministically;
- support check-only and write modes;
- be idempotent.

#### `dsl-build`

Must:

- compile project manifest;
- write plan/source-map/check artifacts when requested;
- run validation gates according to flags;
- never write `script.json` unless explicitly passed a write/apply flag.

#### `dsl-diff`

Must:

- compare source map fingerprints to current project;
- report stale, missing, changed, and safe generated regions.

### Tests

Required CLI tests for every command:

- success JSON output;
- failure JSON output;
- path safety;
- no-write behavior where promised.

### Acceptance Criteria

- All commands are documented in `command-reference.md`.
- `printHelp()` lists all commands.
- CLI tests pass.

## 12. P7 - Reverse Skeleton And Migration

**Status:** Implemented.

### Objective

Create a starter DSL file from an existing `script.json` without pretending it can perfectly recover original source.

### Required Command

```bash
npm run vn -- dsl-skeleton --script public/game/script.json --out agent-src/main.gmdsl --report-out .tmp/agent-dsl-skeleton-report.json --json
```

The command writes only the requested DSL source and optional JSON report. It does not create a source map or claim ownership of existing editor-authored project data.

### Required Behavior

The skeleton generator MUST:

- emit declarations for characters, variables, endings, and CG entries;
- emit scenes and pages in project order;
- preserve dialogue, choices, conditions, media, staging, camera, particles, and effects where supported;
- add comments for unsupported or lossy constructs;
- avoid creating source maps that claim ownership of existing editor-authored content unless explicitly requested.

### Tests

Required tests:

- minimal project skeleton;
- project with choices/effects;
- project with condition pages;
- project with unsupported fields gets comments;
- generated skeleton can compile to a plan that recreates an equivalent project in a fresh script.

### Acceptance Criteria

- Existing projects can get a useful DSL starting point.
- Lossy conversion is clearly reported.
- No existing project data is modified by default.

## 13. P8 - Advanced Authoring Abstractions

**Status:** Implemented. P8.1 compile-time cinematic `mood` presets, P8.2 reusable compile-time sequences, P8.3 basic affection/ending route templates, and P8.4 docs/help/invalid/integration polish are complete.

### Objective

Make DSL more valuable than raw apply-plan by supporting higher-level VN authoring patterns that still lower to editable project data.

### Candidate Features

- sequence declarations:

```text
sequence dramatic_entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450
```

Implemented P8.2 syntax applies a sequence inside scene bodies or choice option bodies:

```text
scene start "Start":
  sequence dramatic_entrance("sakura", "smile")
```

Sequence calls substitute scalar arguments and expand before IR emission. Scene-body calls lower to ordinary page staging/dialogue data; option-body calls can lower to ordinary option effects. No runtime sequence interpreter is generated.

- route templates:

```text
route sakura:
  affection variable sakura_affection
  good_end good
  normal_end normal
```

Implemented P8.3 route templates generate an affection variable, hidden good/normal ending registry entries, and editable good/normal ending scenes with page-enter `unlock:ending` effects. They do not generate runtime route logic or hidden metadata; normal choices, jumps, and conditions still drive branching.

- cinematic presets:

```text
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
```

Implemented P8.1 syntax applies a preset inside scene bodies:

```text
scene start "Start":
  preset mood rainy_school
  say "Rain tapped against the glass."
```

The implementation expands preset uses before IR emission and lowers to existing editable page fields such as `particles`, `transition`, `camera`, media, and character staging. It does not add runtime DSL interpretation.

- scene groups and chapter metadata;
- reusable choice templates;
- standard VN idioms such as unlock prompts and chapter transitions.

### Rules

- Every abstraction must lower to existing project data or documented new authoring commands.
- Every abstraction must be optional.
- No abstraction may require runtime DSL interpretation.

### Tests

Each abstraction requires:

- valid fixture;
- invalid fixture;
- IR fixture;
- plan emission fixture;
- validate-only integration test.

### Acceptance Criteria

- At least three high-value abstractions exist and are documented.
- Agent-authored long-form examples become shorter and more maintainable than raw page syntax.

## 14. P9 - Editor And Handoff Integration

**Status:** Complete. `author-check --source-map`, `handoff-report --source-map`, and `review-handoff --source-map` read enriched Agent DSL source maps, add source provenance to focused preview targets and preview plans, add `agent-dsl` handoff review items for generated changes, and surface stale/missing/untracked generated-region warnings. The Project Settings handoff panel shows the available DSL source map summary and source file/line metadata. This is optional review metadata only; the editor and runtime do not depend on DSL source files.

### Objective

Expose DSL provenance and generated-region status to human review workflows without making the editor dependent on DSL source.

### Deliverables

- handoff review items for DSL-generated changes;
- optional editor panel metadata through existing handoff artifacts;
- preview targets enriched with source provenance;
- stale generated-region warnings.

### Required Behavior

Handoff artifacts SHOULD include:

```json
{
  "category": "agent-dsl",
  "severity": "info",
  "code": "dsl-generated-change",
  "pathString": "scenes.start.pages.0",
  "message": "Generated from agent-src/main.gmdsl:12.",
  "sourceLocation": {
    "kind": "agent-dsl",
    "file": "agent-src/main.gmdsl",
    "line": 12,
    "mappingId": "map-00004"
  }
}
```

Stale generated regions are reported as `agent-dsl` warning review items with codes `dsl-generated-region-stale`, `dsl-generated-region-missing`, or `dsl-generated-region-untracked`.

Editor support MAY show:

- source file;
- source line;
- stale status;
- generated-region id;
- rebuild warning.

### Acceptance Criteria

- [x] Human review can identify DSL-generated changes.
- [x] Editor can ignore DSL metadata without breaking gameplay.
- [x] Stale generated regions are visible in handoff or check output.

## 15. Cross-Phase Test Matrix

Every phase SHOULD run the narrow tests it touches plus:

```bash
npm run test:vitest -- tests/agentDslPlan.test.js
npm run test:vitest -- tests/vnAuthorCli.test.js -t "agent DSL"
npm run test:node
```

Before major merges, run:

```bash
npm run test
```

If a full test run fails because of environment-specific filesystem or browser constraints, document:

- failing command;
- failing tests;
- exact error;
- why it is unrelated or what fix is needed.

## 16. Documentation Requirements By Phase

| Phase | Required Docs |
| --- | --- |
| P1 | Update `agent-dsl.md` with diagnostic behavior and formal syntax subset |
| P2 | Add IR and semantic check notes to `agent-dsl-architecture.md` |
| P3 | Document project manifest, include, namespace examples |
| P4 | Document expression grammar and supported lowering rules |
| P5 | Document source map artifact and stale detection |
| P6 | Update `command-reference.md` and `AGENTS.md` for new CLI commands |
| P7 | Document skeleton generation limitations |
| P8 | Document every new abstraction with before/after examples |
| P9 | Document handoff/editor provenance behavior |

## 17. Implementation Guidance For AI Agents

When implementing a phase:

1. Read `agent-dsl-architecture.md`.
2. Read this roadmap phase.
3. Inspect current code with CodeGraph before editing.
4. Keep public behavior compatible unless the phase explicitly changes it.
5. Add tests before or alongside implementation.
6. Update docs in the same change.
7. Run the phase's required tests.
8. Summarize remaining gaps honestly.

AI agents MUST NOT:

- implement future phases opportunistically without tests;
- create project-local runtime code;
- bypass apply-plan;
- silently rewrite user-authored `script.json`;
- mark stale generated regions as safe.

## 18. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| DSL becomes a second project format | Editor and agent diverge | Keep `script.json` canonical; compile to apply-plan only |
| Macro system becomes executable language | Security and determinism risk | Compile-time scalar macros only until reviewed |
| Source rebuild overwrites editor polish | User content loss | Source maps and stale detection before rebuild |
| Expressions exceed project contract | Runtime/editor mismatch | Reject unsupported expressions until contract expands |
| Too many abstractions too early | Unstable language | Land formal parser/IR before high-level syntax |
| Diagnostics remain prose-only | Agents cannot self-repair | Stable diagnostic codes and repair hints |
| Formatter changes semantics | Source churn and bugs | Formatter idempotence tests and AST round-trip tests |

## 19. Recommended Near-Term Sequence

The next three implementation tickets should be:

1. **P1.1 Lexer and source spans**
   - Create tokens and span model.
   - Keep existing compiler output unchanged.

2. **P1.2 Parser AST**
   - Parse P0 syntax to AST.
   - Add parser fixtures.

3. **P2.1 Binder and duplicate/unknown symbol diagnostics**
   - Add symbol tables.
   - Catch common agent mistakes before apply-plan.

This sequence gives the language a stable foundation before adding new syntax.

## 20. Stop Conditions

Pause implementation and update the architecture before continuing if any phase requires:

- runtime DSL interpretation;
- nested project fields not covered by validators;
- editor-invisible canonical data;
- arbitrary user code execution;
- overwriting editor changes without stale detection;
- non-deterministic plan output.

These are architecture-level changes, not implementation details.
