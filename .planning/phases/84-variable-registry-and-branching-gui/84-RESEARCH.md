# Phase 84: 变量注册表与条件分支 GUI - Research

**Researched:** 2026-04-28
**Domain:** Variable registry authoring, effect-picker UX, condition-page branching, reference safety
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Locked upstream decisions

- Phase 83 is complete and is the contract foundation for all Phase 84 work.
- `script.json.systems.variables` is the canonical variable registry.
- Canonical write format stays `effects[]`; Phase 84 must not reintroduce raw-key write contracts as first-class saved data.
- Variable scope stays limited to `bool` and `number`.
- No expression language, string variables, or generic persistent variables in this phase.
- Condition GUI scope is intentionally narrow: 1~3 conditions, operators `== != > >= < <=`, mode = all / any.
- Scene routing should use scene pickers and readable summaries, not raw scene IDs as the primary UX.
- Rename/delete flows must surface references and safety instead of silently breaking logic.

#### Explicit non-goals

- no affection preset UI yet (Phase 85)
- no ending registry UI yet (Phase 85)
- no CG registry or gallery UI yet (Phase 86)
- no flowchart / node editor
- no replay / extras systems

### the agent's Discretion

- Prefer one coherent authoring flow over sprinkling variable controls across many disconnected panels.
- Variable registry should probably live at project level, while option/page edits consume registry IDs via pickers.
- If UI scope becomes too large, prioritize correctness and reference safety over visual polish.

### Deferred Ideas (OUT OF SCOPE)

- affection-specific affordances beyond generic number-variable editing
- ending unlock authoring
- CG unlock authoring
- milestone-level integrity dashboard
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VAR-01 | 用户可以在项目级变量注册表中创建并管理变量，包含 `id`、显示名、类型（bool/number）、默认值、分组、备注 | Shared variable-registry helper, dedicated project-level registry workspace, canonical `systems.variables` object map, runtime default seeding from registry |
| VAR-02 | 用户在页面/选项编辑时可以通过变量选择器配置 `set` / `add` / `subtract`，而不需要手写变量 key | Reuse Phase 83 `effects[]` DSL, replace legacy raw-key inspector row with picker-backed multi-effect editor, derive summaries from canonical effects |
| VAR-03 | 用户重命名或删除变量时，编辑器会提供引用计数、反向引用位置与安全检查，而不是静默打断现有剧情逻辑 | Central reference scanner + rename transaction helper; block delete while references exist; show reverse refs with scene/page/option/condition provenance |
| BRN-01 | 用户可以通过条件页 GUI 配置 1~3 条变量条件，支持 `== != > >= < <=` 与“全部满足 / 任一满足” | New canonical `conditions[]` + `mode` contract, additive read-compat for legacy single-condition pages, shared evaluator/summary helper reused by runtime and editor |
| BRN-02 | 用户配置条件跳转时使用场景选择器和可读摘要，而不是手写场景 ID 或只看到底层字段 | Scene picker sourced from script scenes, derived natural-language summary in inspector/tree, never persist summary text |
</phase_requirements>

## Summary

Phase 83 froze the right foundations for Phase 84: `script.json.systems.variables` now exists, `effects[]` is the canonical write contract, and the editor/runtime both already normalize through shared helpers (`src/shared/galgameContract.js`, `src/shared/effectDsl.js`). But Phase 84 still has three hard gaps: there is no project-level variable registry UI, the choice inspector still exposes a legacy raw variable row, and condition pages exist in runtime only as a single-comparison schema with no complete editor flow.

The most important repo-specific finding is that variable defaults are not wired through the runtime yet. `systems.variables` is seeded, but current repo usage is effectively limited to contract seeding/tests; `ScriptEngine.startGame()` still just clears `variables` instead of seeding from the registry, and `restoreState()` backfills only from save payloads. If Phase 84 ships only GUI without this data-flow seam, authors will create variables with defaults that do not actually govern play.

**Primary recommendation:** add one project-level “剧情系统 / 变量” workspace, keep saved variable writes on canonical `effects[]`, introduce a shared `conditions[] + mode` helper for condition pages, seed runtime variables from `systems.variables`, and centralize rename/delete reference scans before touching inspector UX.

## Project Constraints (from copilot-instructions.md)

- Keep the stack in **JavaScript ES Modules + Vue 3 + Electron**; **do not migrate to TypeScript**.
- Keep the product model as **no-code authoring**: authors configure GUI objects; engine logic stays built-in.
- Prefer **Windows-first** behavior but keep implementation compatible with macOS.
- Keep editor UI **dark themed**, **pure CSS**, and **Chinese-language**.
- Use **explicit `.js` extensions** for JS imports.
- Use **named exports** in JS modules; no default exports in JS files.
- Keep filesystem access behind **Electron IPC**; renderer/editor code should not bypass `window.ipcRenderer.invoke()`.
- Follow existing manual style: **2-space indent**, **single quotes**, **semicolons**.
- Reuse existing security patterns (path validation, CSS sanitization) instead of introducing ad-hoc exceptions.
- Stay inside the existing **GSD workflow**; do not treat this phase as a free-form repo rewrite.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | repo `^3.5.31` / latest verified `3.5.33` (2026-04-22) | Editor UI surfaces (`App.vue`, `PageInspector.vue`, new registry workspace) | Existing editor is already SFC-based; Phase 84 is incremental UI, not a framework migration |
| Pinia | repo `^3.0.4` / latest verified `3.0.4` (2025-11-05) | Authoring state and transactional script mutations | Current store pattern already owns history, load/save normalization, and reference-scan helpers |
| Shared repo contracts (`src/shared/*.js`) | contractVersion `1` | Canonical saved-data normalization across editor/runtime | Phase 83 already established this pattern for `galgameContract`, `effectDsl`, `cinematicContract` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Electron | repo `^41.0.4` / latest verified `41.3.0` (2026-04-22) | Desktop shell + IPC-backed project persistence | Existing project load/save path; no Phase 84 reason to bypass IPC |
| Vitest | repo `^4.1.4` / latest verified `4.1.5` (2026-04-21) | Editor/store/unit tests, jsdom harnesses, source-string wiring tests | Use for variable registry UI, summary formatters, reference-safety helpers |
| Node `node:test` | Node `24.13.1` | Runtime-unit coverage (`ScriptEngine`, effect helpers) | Use for condition evaluation and runtime default seeding regressions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vue SFC + Pinia extensions | New form/state library | Adds migration work with no payoff in a brownfield repo that already uses Vue + Pinia everywhere |
| Shared repo-local scanner/normalizer helpers | Generic expression/query library | Overkill for a locked scope of bool/number vars, 1-3 comparisons, and known reference sites |
| Dedicated summary strings in saved JSON | Persisted display text | Causes rename drift and stale scene/variable labels; summaries must stay derived |

**Installation:**
```bash
# No new dependencies are required for Phase 84.
# Stay on the repo-pinned stack for this phase.
```

**Version verification:** Verified via npm registry on 2026-04-28.
```bash
npm view vue version
npm view pinia version
npm view electron version
npm view vite version
npm view vitest version
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── shared/
│   ├── galgameContract.js        # Existing contract seeding
│   ├── effectDsl.js              # Existing canonical write DSL
│   ├── variableRegistry.js       # NEW: normalize registry entries, defaults, refs, rename/delete helpers
│   └── branchingContract.js      # NEW: normalize/evaluate/format condition pages
├── editor/
│   ├── views/
│   │   └── StorySystems.vue      # NEW: project-level variable workspace
│   └── components/
│       ├── story-systems/        # NEW: list, inspector, references
│       └── page-editor/          # Extend PageInspector / SceneTree / CanvasToolbar
└── engine/
    └── ScriptEngine.js           # Extend default seeding + multi-condition evaluation
```

### Pattern 1: Shared contract first, UI second
**What:** Add Phase 84 saved-data rules in `src/shared/`, then let both editor and runtime consume them.  
**When to use:** Any logic that affects saved shape, runtime evaluation, natural-language summaries, or rename/delete reference scanning.  
**Why:** This repo already normalized Phase 83 through shared helpers before UI wrote data (`src/shared/effectDsl.js`, `src/shared/galgameContract.js`).

**Prescriptive shape:**
- Keep `script.systems.variables` as an **object map keyed by stable variable ID**.
- Keep saved entry field as `initial` (UI label can still be “默认值”), because Phase 83 tests already use that shape.
- Introduce canonical condition-page shape:

```js
{
  type: 'condition',
  mode: 'all',
  conditions: [
    { variableId: 'sakura_affection', operator: '>=', value: 5 },
  ],
  trueTarget: 'scene_sakura_route',
  falseTarget: 'scene_daily',
}
```

**Additive read-compat rule:**
- Read legacy `page.variable / page.operator / page.value` as one-row `conditions[]`.
- Canonical write path should emit only `conditions[] + mode`.

### Pattern 2: Project-level registry, page-level consumers
**What:** Put variable CRUD in a project-level workspace, while `PageInspector` and `SceneTree` consume registry IDs through pickers and summaries.  
**When to use:** Variable create/edit/delete, reference browsing, rename flow, and any place a scene/page needs to pick a variable.  
**Why:** The current editor app already supports simple top-level tab insertion (`src/editor/App.vue:80-99`, `src/editor/components/TabBar.vue:1-35`), and the context explicitly prefers one coherent authoring flow.

**Prescriptive UI split:**
- Add a new top-level tab: **剧情系统**.
- Limit Phase 84 content inside that tab to **变量** only.
- Keep condition authoring inside the existing page editor because it is page-local.
- Do **not** bury the registry inside raw `PageInspector` fields or `ProjectSettings`; it needs list/search/reference affordances.

### Pattern 3: Derive summaries and counts; never persist them
**What:** Compute branch summaries, variable usage counts, and reference lists from current script data at render time.  
**When to use:** SceneTree snippets, inspector badges, delete dialogs, rename previews.  
**Why:** Scene names and variable labels are mutable. Persisted summary text will drift immediately after rename.

**Required derived outputs:**
- Choice option effect summary: `樱好感 +1；路线锁定 = true`
- Condition summary: `全部满足：樱好感 >= 5 且 已见真相 == true → 樱线入口，否则 → 日常线`
- Reference list items: `场景 SakuraRoute / 第 3 页 / 选项 2 / effect #1`

### Pattern 4: Runtime defaults seed from registry truth
**What:** On new game start, initialize `engine.variables` from `script.systems.variables`; on restore, merge saved values over registry defaults.  
**When to use:** `ScriptEngine.startGame()` and `restoreState()`.  
**Why:** Variable defaults otherwise remain editor-only metadata. Current runtime does not seed from the registry.

**Required merge rule:**
1. Start with registry defaults (`bool -> false`, `number -> 0`, overridden by `initial` when present)
2. Overlay saved slot values on restore
3. Ignore unknown/deleted registry entries only if already present in save state? **No** — preserve saved legacy values during restore for tolerance, but do not write new references to deleted IDs

### Anti-Patterns to Avoid
- **Component-local contract shaping:** Do not let `PageInspector.vue`, `SceneTree.vue`, and `ScriptEngine.js` each invent their own condition-page schema.
- **Primary raw-key UX:** Do not keep the current `变量名 + 数值` text row as the main editor surface.
- **Persisted summaries:** Do not save human-readable summaries into `script.json`.
- **Silent destructive delete:** Do not delete a variable and blank or auto-rewrite story logic without explicit author review.
- **UI-only registry:** Do not ship registry CRUD without runtime default seeding.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Choice variable writes | New ad-hoc `setVariable` UI contract | Shared `effects[]` helpers in `src/shared/effectDsl.js` | Phase 83 already normalized canonical writes and runtime execution there |
| Condition evaluation | Inline comparator code in multiple Vue components | One `branchingContract.js` normalizer/evaluator/summary helper | Prevents drift between runtime, inspector summary, and SceneTree snippet |
| Reference safety | Per-component loops over scenes/pages/options | One central scanner + rename/delete transaction helper | Same reference logic must feed counts, reverse refs, rename updates, and delete blocking |
| Branch summary text | Stored `summary` fields in page JSON | Derived formatter using current variable labels and scene names | Rename-safe and always truthful |
| Variable/scene selection | Free-text IDs as primary UX | Picker components with inline create/select | Matches no-code constraint and avoids typo-driven orphan references |

**Key insight:** Phase 84 looks like “just UI,” but the expensive bugs are contract drift bugs. Reuse the existing shared-helper pattern instead of inventing component-local logic.

## Common Pitfalls

### Pitfall 1: Treating “not choice” as “normal”
**What goes wrong:** Condition pages accidentally expose dialogue editing, character insertion, voice matching, and other normal-page behaviors.  
**Why it happens:** Several current surfaces branch only on `page.type === 'choice'` and treat every other type as dialogue-capable.  
**How to avoid:** Audit all page-type assumptions before adding condition GUI. Use explicit `page.type === 'normal'` checks where normal-only behavior is intended.  
**Warning signs:** Condition pages show dialogue pills, “添加角色” stays enabled, or batch voice match touches condition pages.

### Pitfall 2: Variable defaults stay editor-only
**What goes wrong:** Authors set a bool/number default in the registry, but gameplay still starts from `undefined/0` semantics.  
**Why it happens:** Current runtime seeds no values from `systems.variables`; `startGame()` clears the map and stops.  
**How to avoid:** Add one shared “seed variable defaults” helper and call it from both new-game start and tolerant restore.  
**Warning signs:** Fresh previews ignore configured defaults; bool comparisons behave like numeric zero checks.

### Pitfall 3: Dual condition schemas survive past load
**What goes wrong:** Some pages save as `variable/operator/value`, others as `conditions[]`; summaries, rename scans, and runtime evaluation disagree.  
**Why it happens:** Legacy runtime/tests already know one-field condition pages, while Phase 84 needs multi-row GUI.  
**How to avoid:** Normalize on load; write only canonical `conditions[] + mode`; keep legacy read-compat only.  
**Warning signs:** Save-open-save round trips rewrite condition pages inconsistently or lose rows.

### Pitfall 4: Rename/delete safety is implemented as UI decoration only
**What goes wrong:** The dialog shows reference counts, but rename does not actually batch-update every write/read site, or delete still permits broken logic.  
**Why it happens:** Reference counting and mutation use different code paths.  
**How to avoid:** Build one scanner that returns exact provenance objects, then use the same scanner for count display, rename transaction, and delete guard.  
**Warning signs:** Count says “3 references” but only 2 update; SceneTree summary still shows old label after rename.

### Pitfall 5: Trusting stale docs over current page-based truth
**What goes wrong:** Planner builds against command-style docs (`jump`, `trueJump`, `set_variable`) instead of current page-based editor/runtime.  
**Why it happens:** `README.md` and `docs/script-format.md` still contain older claims/schema examples.  
**How to avoid:** Use current source of truth: `PageInspector.vue`, `SceneTree.vue`, `script.js`, `ScriptEngine.js`, and Phase 83 artifacts.  
**Warning signs:** New code writes `jump` fields or updates `docs/script-format.md` examples without matching page-based implementation.

## Code Examples

Verified patterns from current repo sources:

### Canonical choice write normalization
```js
// Source: src/shared/effectDsl.js:163-178
export function normalizeEffectContainer(container = {}) {
  const normalized = isPlainObject(container)
    ? { ...container }
    : {};
  const effects = normalizeEffects(container);

  delete normalized.setVariable;

  if (effects.length > 0) {
    normalized.effects = effects;
  } else {
    delete normalized.effects;
  }

  return normalized;
}
```

### Shared contract seeding pattern
```js
// Source: src/shared/galgameContract.js:62-71
export function ensureGalgameContract(scriptData = {}) {
  const normalizedScript = cloneJsonValue(scriptData);

  normalizedScript.projectId = normalizeProjectId(normalizedScript.projectId);
  normalizedScript.contractVersion = GALGAME_CONTRACT_VERSION;
  normalizedScript.characters ??= {};
  normalizedScript.scenes ??= {};
  normalizedScript.systems = normalizeSystems(normalizedScript.systems);

  return normalizedScript;
}
```

### Centralized reference-scan pattern to extend for variables
```js
// Source: src/editor/stores/script.js:315-335
function findExpressionReferences(charId, exprName) {
  const refs = [];
  if (!data.value?.scenes) return refs;
  for (const [sceneId, scene] of Object.entries(data.value.scenes)) {
    for (let pageIdx = 0; pageIdx < (scene.pages || []).length; pageIdx++) {
      const page = scene.pages[pageIdx];
      for (const char of (page.characters || [])) {
        if (char.id === charId && char.expression === exprName) {
          refs.push({ sceneId, sceneName: scene.name || sceneId, pageIdx, source: 'character' });
        }
      }
    }
  }
  return refs;
}
```

### Current condition runtime seam to replace with shared helper
```js
// Source: src/engine/ScriptEngine.js:487-509
_execCondition(page) {
  const val = this.variables.get(page.variable) ?? 0;
  let result = false;

  switch (page.operator) {
    case '==':  result = val === page.value; break;
    case '!=':  result = val !== page.value; break;
    case '>':   result = val > page.value;   break;
    case '>=':  result = val >= page.value;  break;
    case '<':   result = val < page.value;   break;
    case '<=':  result = val <= page.value;  break;
  }

  const target = result ? page.trueTarget : page.falseTarget;
  if (target) this._enterScene(target);
  else this._advancePage();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Choice writes exposed/accepted as legacy `setVariable` free-text payloads | Canonical saved data is `effects[]`, with legacy input only as compat | Phase 83 / 2026-04-28 | Phase 84 should build picker UX on `effects[]`, not revive raw-key contracts |
| Stable authoring identity absent from gameplay contract | `projectId` + explicit `systems.*` registries are seeded additively | Phase 83 / 2026-04-28 | Variable registry belongs in author data and should feed runtime defaults safely |
| Single-field condition page (`variable/operator/value`) | Phase 84 should move to canonical `conditions[] + mode` with additive read-compat | Phase 84 target | Required to satisfy 1-3 comparisons and all/any mode without schema drift |

**Deprecated/outdated:**
- `docs/script-format.md` command-style `choice`, `set_variable`, and `condition` examples are outdated relative to the current page-based editor/runtime.
- `README.md` claims “变量、条件跳转已完成,” but current authoring flow is still incomplete for a no-code branching system.

## Open Questions

1. **How much real saved content already uses legacy single-condition pages?**
   - What we know: runtime/tests still use `page.variable / page.operator / page.value`; current editor has no full condition-page GUI.
   - What's unclear: whether existing user projects rely on that exact saved shape beyond tests.
   - Recommendation: support additive read-compat on load and save only canonical `conditions[] + mode`.

2. **Should the saved registry field be `initial` or renamed to `defaultValue`?**
   - What we know: requirements describe a “默认值”; existing Phase 83 tests already use `systems.variables.<id>.initial`.
   - What's unclear: whether any downstream code outside tests expects one label or the other.
   - Recommendation: keep saved key `initial` for Phase 84 and expose “默认值” only as UI text.

3. **Should unsafe delete offer a force-delete mode in this phase?**
   - What we know: locked scope requires safety, reference counts, and reverse refs; silent breakage is forbidden.
   - What's unclear: whether product UX wants a destructive override yet.
   - Recommendation: Phase 84 should block delete while references exist; defer force-delete semantics.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime-unit tests, build, editor tooling | ✓ | 24.13.1 | — |
| npm | Package scripts / registry verification | ✓ | 11.11.1 | — |
| Vitest | Editor/store/jsdom tests | ✓ | 4.1.4 (repo), latest 4.1.5 verified | Node `node:test` only covers runtime helpers, not Vue/jsdom |
| Vite build | Phase gate build verification | ✓ | 6.4.1 observed in local build output | — |
| git | GSD workflow / diff validation | ✓ | 2.49.0.windows.1 | — |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + Node `node:test` on Node 24.13.1 |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/pageInspectorCinematicControls.test.js tests/galgameContract.test.js tests/playerDataRepository.test.js && node --test tests/effectDsl.test.js tests/scriptEngine.test.js` |
| Full suite command | `npx vitest run && node --test tests/effectDsl.test.js tests/scriptEngine.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VAR-01 | Variable registry CRUD persists canonical object-map entries with `initial`, type, group, notes | unit + jsdom | `npx vitest run tests/variableRegistryWorkspace.test.js` | ❌ Wave 0 |
| VAR-02 | Choice inspector writes picker-backed canonical `effects[]` and removes primary raw-key UX | jsdom + unit | `npx vitest run tests/pageInspectorVariableEffects.test.js && node --test tests/effectDsl.test.js` | ❌ / ✅ partial |
| VAR-03 | Rename updates refs transactionally; delete blocks with reverse refs | unit | `npx vitest run tests/variableReferenceSafety.test.js` | ❌ Wave 0 |
| BRN-01 | Condition page GUI saves 1-3 rows + mode; runtime evaluates canonical rows correctly | jsdom + node unit | `npx vitest run tests/conditionPageEditor.test.js && node --test tests/scriptEngine.test.js` | ❌ / ✅ extend |
| BRN-02 | Scene picker and natural-language summary reflect current scene names and variable labels | unit + source/jsdom | `npx vitest run tests/conditionSummary.test.js tests/sceneTreeConditionSnippet.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** run the smallest touched focused suite(s), plus `node --test tests/effectDsl.test.js tests/scriptEngine.test.js` when shared/runtime helpers change
- **Per wave merge:** `npx vitest run tests/variableRegistryWorkspace.test.js tests/pageInspectorVariableEffects.test.js tests/variableReferenceSafety.test.js tests/conditionPageEditor.test.js tests/conditionSummary.test.js tests/sceneTreeConditionSnippet.test.js tests/galgameContract.test.js tests/playerDataRepository.test.js tests/pageEditorEffectPreviewState.test.js tests/pageInspectorCinematicControls.test.js && node --test tests/effectDsl.test.js tests/scriptEngine.test.js && npm run build`
- **Phase gate:** Focused Phase 84 suite + `npm run build` green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/variableRegistryWorkspace.test.js` — project-level variable CRUD, canonical saved shape, inline create
- [ ] `tests/pageInspectorVariableEffects.test.js` — picker-backed effect rows, operator restrictions by variable type, compat load path
- [ ] `tests/variableReferenceSafety.test.js` — reverse refs, rename transaction, delete blocking
- [ ] `tests/conditionPageEditor.test.js` — 1-3 rows, all/any, scene picker, summary rendering
- [ ] Extend `tests/scriptEngine.test.js` — canonical multi-row condition evaluation + default seeding + tolerant restore
- [ ] `tests/conditionSummary.test.js` / `tests/sceneTreeConditionSnippet.test.js` — derived summary drift protection

## Sources

### Primary (HIGH confidence)
- `src/shared/galgameContract.js` — canonical author-data seeding for `projectId`, `contractVersion`, `systems.variables`
- `src/shared/effectDsl.js` — canonical `effects[]` normalization and runtime execution
- `src/editor/stores/script.js` — current load normalization, page conversion, and existing centralized reference-scan pattern
- `src/engine/ScriptEngine.js` — current runtime choice execution, condition execution, and missing registry-default seeding seam
- `src/editor/components/page-editor/PageInspector.vue` — current legacy variable row and page-type assumptions
- `src/editor/components/page-editor/SceneTree.vue` — current page-type toggle limitations and snippet surface
- `src/editor/components/page-editor/PageCanvas.vue` / `CanvasToolbar.vue` — current non-normal page assumptions affecting condition-page rollout
- `src/editor/composables/useVoiceMatch.js` — page-type assumption that must be audited for condition pages
- `src/editor/App.vue` / `src/editor/components/TabBar.vue` — existing top-level tab insertion pattern
- `tests/galgameContract.test.js`, `tests/effectDsl.test.js`, `tests/scriptEngine.test.js`, `tests/playerDataRepository.test.js`, `tests/pageEditorEffectPreviewState.test.js`, `tests/pageInspectorCinematicControls.test.js` — verified current contract/testing patterns
- `copilot-instructions.md` — project-specific constraints
- `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/phases/84-variable-registry-and-branching-gui/84-CONTEXT.md` — locked scope and downstream requirement mapping

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` — milestone synthesis and cut-line guidance
- `.planning/research/v1.7-authoring-ux.md` — project-level workspace recommendation
- `.planning/research/v1.7-systems.md` — mature-engine-aligned direction for explicit registries and persistent separation
- `.planning/research/v1.7-pitfalls.md` — brownfield warnings, especially authoring-flow and schema-drift risks
- `docs/v1.7-phase-83-report.md` — confirmed Phase 83 foundation already shipped

### Tertiary (LOW confidence)
- `README.md` and `docs/script-format.md` — useful only as evidence of documentation drift; not authoritative for current page-based truth

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo stack plus npm-registry version verification on 2026-04-28
- Architecture: MEDIUM - shared-helper pattern is strongly evidenced, but the exact top-level tab/workspace layout is still a product decision
- Pitfalls: HIGH - derived directly from current source assumptions, targeted test runs, and Phase 83 artifacts

**Research date:** 2026-04-28
**Valid until:** 2026-05-28
