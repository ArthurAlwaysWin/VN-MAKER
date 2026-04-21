# Phase 66: Editor Controls & Compatibility UX - Research

**Researched:** 2026-04-21  
**Domain:** PageInspector cinematic control wiring and compatibility UX  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 所有演出配置继续留在现有 `PageInspector` 内完成，不新增 tab、drawer、modal editor 或独立 cinematic mode。
- **D-02:** 角色动画入口挂在现有“角色列表”编辑流中，跟随角色行/选中角色展开区配置，因为 `animation` 是页面内的逐角色字段。
- **D-03:** 页面镜头入口挂在现有“页面属性”区域内，作为和背景/转场并列的 page-level 配置块，因为 `camera` 属于页面本身而不是角色。
- **D-04:** 页面转场继续复用现有“页面属性”中的 transition 配置位置，只扩展已知选项、兼容显示和预览入口，不迁移到新区域。

### Control model
- **D-05:** Phase 66 继续走 preset-first 表单路线：使用下拉/按钮/现有输入控件暴露已冻结的枚举和值域，不开放 JSON、脚本表达式或自由动画参数。
- **D-06:** 角色动画控件固定为预设下拉；`none` 代表不播放，未知值显示为“未知动画：{value}”并允许保留保存。
- **D-07:** 镜头控件固定围绕 `effect`、`durationMs`、`intensity`、`direction` 四项展开；`trigger` 固定为 `onEnter`，不向用户暴露为可编辑字段。
- **D-08:** `durationMs` 在编辑器侧按 spec 限制到 `100-2000`；`intensity` 使用低/中/高枚举控件，不改成自由数值，以保持低学习成本和导出一致性。
- **D-09:** `direction` 只在 `shake` 和 `pan` 时显示；`zoom`、`flash` 不显示该字段，避免制造与 runtime 不一致的伪配置。

### Preview entry and feedback
- **D-10:** 单项预览统一复用 Phase 65 的 `preview-effect` API；按钮只负责发请求与展示结果，不新增第二套 editor-side preview 状态机。
- **D-11:** 预览按钮应贴近各自配置源：角色动画预览放在角色编辑区，镜头预览放在镜头配置块，转场预览放在转场配置块；不把单项预览入口塞到 `CanvasToolbar`。
- **D-12:** 预览可用性、busy、最近一次失败原因统一消费 `usePageEditor.js` 中已有的 `isEffectPreviewBusy`、`previewDisabledReason`、`lastEffectPreviewResult`，避免每个区块重复造状态。
- **D-13:** 预览期间继续沿用现有 preview readonly 策略：页面编辑面板进入只读、由统一“停止预览”链路退出，确保用户不会在播放中修改同一页状态。

### Compatibility UX
- **D-14:** 未知 `animation`、`camera.effect`、`transition.type` 必须继续在 UI 中可见且 round-trip 安全，绝不因用户打开页面或保存项目而被静默改写。
- **D-15:** 对未知但非空的 cinematic 值，UI 应优先展示“未知值 + 保留当前值”的兼容态，而不是强制替换成第一个已知选项。
- **D-16:** 对无法安全预览的未知值，按钮反馈必须显式走 `unsupported-effect` / 禁用原因提示，不能偷偷 fallback 到另一个可见效果冒充预览成功。

### Phase boundary clarifications
- **D-17:** page-level 的镜头和转场配置对所有页面类型都可编辑；角色动画只在页面存在角色时出现，不为 choice-only 页面发明空壳角色控件。
- **D-18:** 本阶段只解决“在现有编辑流里怎么配、怎么预览、怎么兼容显示”，不引入时间轴、批量编辑、可视占位动画或新的演出语言。

### the agent's Discretion
- 各区块的具体排版、按钮文案、图标与帮助提示文案
- duration 用数字框、滑杆或两者组合的具体呈现方式
- 预览结果提示是内联状态文案、title、轻量 badge，还是现有帮助/说明区样式复用
- 角色行内是直接展示动画下拉，还是只在选中角色展开后展示

### Deferred Ideas (OUT OF SCOPE)
- 时间轴式演出编辑器、组合预设、连续预演器 —— 超出 v1.4 范围
- skip / auto / load / title-return / preview-stop 的全量残留矩阵验证 —— 留到 Phase 67
- 画布直接播放演出或局部 fake preview —— 不符合 runtime parity 路线
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PREV-01 | 创作者可以在现有页面编辑流程内配置角色动画、镜头效果和转场，不需要进入额外模式。 | Reuse `PageInspector.vue` page-property and character-row anchors, `usePageEditor.js` preview bridge, `cinematicContract.js` compatibility helpers, and existing `script.pushState()` timing discipline. |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- Use the existing stack only: JavaScript ES modules, Vue 3 SFCs, Pinia, Electron; no TypeScript migration.
- Keep Vue editor code in `<script setup>` style and use explicit `.js` extensions for JS imports.
- Follow existing JS module conventions: named exports, 2-space indentation, semicolons, single quotes.
- Keep the editor dark-themed, pure CSS, and Chinese-first UI copy.
- Reuse existing renderer/store/preload architecture; do not add direct filesystem access from renderer code.
- Preserve existing boundary patterns for error handling and security (`asset://`, sanitized style values, project path checks).
- Stay inside the existing GSD workflow; do not invent a parallel editing workflow or mode.

## Summary

Phase 66 is an editor-surface wiring phase, not a runtime phase. The core runtime contracts already exist in `src/shared/cinematicContract.js`, `src/engine/ScriptEngine.js`, and the Phase 65 preview bridge in `src/editor/composables/usePageEditor.js`. The safest plan is to keep all new controls inside existing `PageInspector.vue` anchors: character animation lives with the selected character row, while camera and transition stay in the existing page-properties block.

The main technical risk is compatibility UX, not rendering. Transition already demonstrates the correct pattern: keep the raw stored value, compute select options from shared helpers, append an explicit unknown option when needed, and only normalize at runtime consumption. Character animation and camera effect UI should follow that same pattern instead of re-implementing ad hoc enums in the component.

**Primary recommendation:** Add one thin shared UI-helper layer for animation/camera unknown-safe options, then wire PageInspector controls directly to raw page data and Phase 65 preview methods without adding any new mode, owner, or fake preview path.

## Standard Stack

### Core
| Library / Module | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | repo `^3.5.31` (`npm view`: `3.5.32`, published 2026-04-14) | `PageInspector.vue` UI wiring | Existing editor UI stack; no new framework work needed |
| Pinia | repo `^3.0.4` (`npm view`: `3.0.4`, modified 2025-11-05) | `useScriptStore()` undo/history owner | Existing page data owner and pushState path |
| `src/editor/composables/usePageEditor.js` | repo local | Single owner for preview bridge and readonly preview session state | Phase 65 already froze this owner |
| `src/shared/cinematicContract.js` | repo local | Shared cinematic enum/default/compatibility helpers | Existing editor/runtime parity contract |

### Supporting
| Library / Module | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | repo `^4.1.4` (`npx vitest --version`: `4.1.4`; `npm view`: `4.1.5`, published 2026-04-21) | Focused editor/composable/compat tests | All Phase 66 regression additions should stay here |
| `src/editor/components/HelpTip.vue` | repo local | Inline help text pattern | For animation/camera/preview guidance near labels |
| `src/editor/helpTexts.js` | repo local | Centralized Chinese help copy | Add new help keys instead of inline hard-coded prose |
| `src/editor/stores/script.js` | repo local | Undo/redo commit timing and page creation defaults | Keep edits on raw page data and respect `pushState()` timing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PageInspector-native controls | New cinematic mode / drawer / modal editor | Rejected by Phase 66 boundary and PREV-01 |
| Runtime-backed preview buttons | Editor-side CSS fake playback | Violates Phase 65 parity and produces false confidence |
| Shared contract helpers | Hard-coded select arrays inside `PageInspector.vue` | Duplicates enum logic and risks silent unknown-value loss |

**Installation:**
```bash
# No new packages required for Phase 66.
```

**Version verification:** Verified locally on 2026-04-21 via:
```bash
npm view vue version time.modified
npm view pinia version time.modified
npm view vitest version time.modified
npm view electron version time.modified
```

## Reusable Patterns / Integration Points

### Exact existing integration points in PageInspector

| Concern | Existing file / symbol | Current behavior | Phase 66 reuse |
|---------|-------------------------|------------------|----------------|
| Page-level data anchor | `PageInspector.vue` `const page = computed(() => editor.currentPage.value)` (lines 382-387) | All page-property controls already edit raw `page.*` fields | Add `page.camera` controls beside existing transition controls |
| Existing transition UI | `PageInspector.vue` template lines 21-36 + setters `setTransitionType()` / `setTransitionDuration()` (lines 481-494) | Transition already lives in 页面属性 and uses shared option helper | Reuse this exact slot; extend with preview button and unknown-safe status |
| Character-level anchor | `PageInspector.vue` template lines 46-66 + `editor.selectedCharIndex` | Selected row expands inline editor area (`char-scale-row`) | Put animation select + replay button in the expanded character row, not a new panel |
| Character selection owner | `usePageEditor.js` `selectedCharIndex`, `selectCharacter()` (lines 13, 62-64) | Existing row-expansion state | Reuse for “only show advanced controls on selected character” |
| Preview bridge | `usePageEditor.js` `previewCharacterEffect()`, `previewCameraEffect()`, `previewTransitionEffect()` (lines 155-165) | Shared request envelope through iframe runtime | Wire buttons directly to these methods; do not create local preview IPC |
| Preview status refs | `usePageEditor.js` `isEffectPreviewBusy`, `previewDisabledReason`, `lastEffectPreviewResult` (lines 25-30, 213-227) | Global effect preview state exists but is not yet consumed in `PageInspector.vue` | Use for button disabled/busy text and inline failure reasons |
| Readonly lock | `PageEditor.vue` `.preview-readonly` on sidebar + inspector (lines 4, 30, 178-181) | Entire inspector becomes pointer-events none during any preview session | Keep Phase 66 buttons inside inspector; rely on existing stop button outside iframe |
| Full-preview status model | `CanvasToolbar.vue` `previewSessionType`, `previewModeLabel`, `stopPreviewLabel` (lines 3-45) | Existing preview session copy and stop semantics | Reference copy/state style only; do not move effect preview entrypoints into toolbar |
| Undo/history commits | `script.pushState()` in `PageInspector.vue` setters and `src/editor/stores/script.js` lines 14-26 | Discrete edits commit immediately; live sliders/text inputs intentionally do not | Follow the same timing for camera duration/intensity controls |
| Page duplication compatibility | `copyPageCinematicFields()` + `addPage()` in `src/editor/stores/script.js` lines 224-241 | New pages already inherit `camera`, `transition`, and character `animation` | Phase 66 must edit the same raw fields so add-page behavior remains correct |

### Recommended Project Structure
```text
src/
├── editor/components/page-editor/
│   └── PageInspector.vue          # Main UI touchpoint for this phase
├── editor/composables/
│   └── usePageEditor.js           # Preview owner and global preview state
├── editor/stores/
│   └── script.js                  # Undo/redo and page data ownership
├── editor/
│   └── helpTexts.js               # Inline help copy additions
└── shared/
    └── cinematicContract.js       # Unknown-safe option helpers and enum lists
tests/
├── pageEditorEffectPreviewState.test.js
├── cinematicContractCompatibility.test.js
└── iframeEffectPreviewWiring.test.js
```

### Pattern 1: Unknown-value-safe selects via shared helpers
**What:** Transition already keeps the raw stored value and appends an explicit “未知…” option only when the current value is unsupported.  
**When to use:** Animation and camera effect selects in Phase 66.  
**Example:**
```javascript
// Source: src/shared/cinematicContract.js
export function getTransitionUiOptions(currentType) {
  const options = [...KNOWN_TRANSITION_OPTIONS];
  const currentOption = getTransitionUiOption(currentType);

  if (!currentOption.known) {
    options.push(currentOption);
  }

  return options;
}
```

### Pattern 2: Row-expansion inspector controls
**What:** Advanced per-character controls appear only for the selected row.  
**When to use:** Character animation select + replay button.  
**Example:**
```vue
<!-- Source: src/editor/components/page-editor/PageInspector.vue -->
<div v-for="(char, idx) in page.characters"
  class="char-row"
  :class="{ active: editor.selectedCharIndex.value === idx }"
  @click="editor.selectCharacter(idx)">
  ...
  <div v-if="editor.selectedCharIndex.value === idx" class="char-scale-row" @click.stop>
    ...
  </div>
</div>
```

### Pattern 3: Shared preview-effect envelope
**What:** All effect previews go through one composable method and one message shape.  
**When to use:** Character replay, camera replay, transition replay buttons.  
**Example:**
```javascript
// Source: src/editor/composables/usePageEditor.js
function previewEffect(request) {
  const effectKind = request?.effectKind;
  const payload = request?.payload || {};
  const reason = getPreviewDisabledReason(effectKind, payload);
  if (reason) {
    previewDisabledReason.value = reason;
    return { ok: false, reason };
  }

  const requestId = nextPreviewRequestId();
  previewIframeRef.value.contentWindow.postMessage({
    type: 'preview-effect',
    requestId,
    effectKind,
    sceneId: selectedSceneId.value,
    pageIndex: selectedPageIndex.value,
    script: buildScriptSnapshot(),
    payload,
  }, '*');
```

### Pattern 4: pushState timing discipline
**What:** Continuous edits mutate live data without spamming history; discrete commits call `script.pushState()`.  
**When to use:** Camera duration slider/number input, intensity changes, direction changes.  
**Example:**
```javascript
// Source: src/editor/components/page-editor/PageInspector.vue
function setCharScale(idx, val) {
  if (!page.value?.characters?.[idx]) return;
  page.value.characters[idx].scale = val;
  // Continuous slider — do NOT call pushState
}
```

### Pattern 5: Inline help / subdued status text
**What:** Help and non-blocking explanations live inline, not in separate modal systems.  
**When to use:** Unknown-value preservation note, preview disabled reason, camera field explanation.  
**Example:**
```vue
<!-- Source: src/editor/components/HelpTip.vue + src/editor/helpTexts.js -->
<label>过渡 <HelpTip :text="HELP_SCRIPT.transition" /></label>
```

### Anti-Patterns to Avoid
- **Separate cinematic mode:** violates PREV-01 and duplicates PageInspector state.
- **Local fake preview CSS:** violates Phase 65 parity and creates runtime/editor drift.
- **Normalizing raw page data through runtime helpers on write:** risks erasing unknown values or hidden fields.
- **Per-button preview state:** duplicates `usePageEditor.js` and increases stale-status bugs.

## Risks / Pitfalls

### Data-shape / UI-shape risks

| Risk | What can go wrong | Planning guidance |
|------|-------------------|-------------------|
| Unknown enum loss | A select defaults unsupported `animation` / `camera.effect` / `transition.type` to the first known option | Add animation/camera UI helpers that mirror `getTransitionUiOptions()` and always include the current unknown value |
| Raw-vs-runtime camera mismatch | `getPageCameraContract()` strips `direction` for `zoom`/`flash` and forces `trigger = onEnter`; using it as editable state would silently rewrite data | Edit `page.camera` directly; only runtime emission should call `getPageCameraContract()` |
| Shared preview state cross-talk | `previewDisabledReason` and `lastEffectPreviewResult` are global refs, so a camera failure can appear under a character row if UI is naïve | Scope displayed status by effect kind and/or by the request just triggered from that block |
| Undo history spam | Using `@input` + `pushState()` on duration/intensity sliders floods the 50-entry history | Follow existing `@input` mutate + `@change` commit pattern |
| Preview readonly surprise | Inspector becomes read-only immediately after `previewEffect()` posts; inline buttons disappear from interaction until global stop | Keep stop ownership with existing overlay/button; do not add local stop logic inside each block |
| Scope drift into Phase 67 | Adding cleanup policy for skip/auto/load/title-return expands beyond phase boundary | Restrict Phase 66 to configuration UX, preview entry, and focused compatibility messaging |

### Pitfall 1: Transition pattern is implemented only for transition today
**What goes wrong:** Planner assumes animation and camera already have shared unknown-safe helpers because transition does.  
**Why it happens:** `src/shared/cinematicContract.js` currently exposes `getTransitionUiOption(s)` only; there is no equivalent for animation/camera yet.  
**How to avoid:** Add matching helper functions in the shared contract module before wiring new selects.  
**Warning signs:** Hard-coded `['fade-in', ...]` or `['shake', 'zoom', ...]` arrays appear inside `PageInspector.vue`.

### Pitfall 2: Editing through normalized defaults
**What goes wrong:** Unknown values or hidden `direction` data get silently replaced on open/save.  
**Why it happens:** `DEFAULT_CHARACTER_ANIMATION`, `DEFAULT_PAGE_CAMERA`, and runtime contract helpers are easy to confuse with editable UI state.  
**How to avoid:** Use raw page fields for form state; only normalize when rendering the select label or when runtime consumes payload.  
**Warning signs:** `page.camera = getPageCameraContract(...)` or `char.animation = getCharacterAnimationValue(...)` on every render/change.

### Pitfall 3: Stale preview errors
**What goes wrong:** Old `unsupported-effect` or `engine-not-ready` messages linger under the wrong control after selection changes.  
**Why it happens:** `lastEffectPreviewResult` is a single global ref in `usePageEditor.js`.  
**How to avoid:** Filter status by `effectKind` and clear or ignore stale results when a new request starts elsewhere.  
**Warning signs:** A transition error shows while editing camera, or a fresh button press still shows the prior block's failure.

### Pitfall 4: History pollution from slider/input controls
**What goes wrong:** Undo/redo becomes unusable after adjusting duration fields.  
**Why it happens:** Existing inspector patterns intentionally avoid `pushState()` on high-frequency updates.  
**How to avoid:** Reuse the same `@input`/`@change` split already used for scale/font controls.  
**Warning signs:** One drag gesture creates many undo steps.

## Recommended Implementation Slices

### Slice 1: Shared compatibility/UI helpers first
**Files:** `src/shared/cinematicContract.js`, `src/editor/helpTexts.js`  
**Goal:** Add animation/camera UI option builders, direction/intensity option helpers, and Chinese help text keys.  
**Why first:** It keeps unknown-value behavior centralized before any SFC wiring, and it gives tests a plain-JS seam.

### Slice 2: Character animation controls in the selected character row
**Files:** `src/editor/components/page-editor/PageInspector.vue`  
**Goal:** In the existing selected-row expansion, add:
- animation select bound to `page.characters[idx].animation`
- replay button calling `editor.previewCharacterEffect(...)`
- inline disabled/error text scoped to character previews
**Boundary:** No new character mode, no canvas fake animation, no toolbar button.

### Slice 3: Page-properties camera + transition preview block
**Files:** `src/editor/components/page-editor/PageInspector.vue`  
**Goal:** In the existing 页面属性 section, add:
- camera effect select
- duration / intensity / direction controls with fixed visibility rules
- transition replay button next to existing transition controls
- camera replay button in the same page-level block
**Boundary:** Reuse current transition location; do not move transition into a new section.

### Slice 4: Shared inline status + focused tests
**Files:** `PageInspector.vue`, `tests/cinematicContractCompatibility.test.js`, `tests/pageEditorEffectPreviewState.test.js`, new targeted test file(s)  
**Goal:** Prove:
- unknown values remain selectable/visible
- buttons use Phase 65 preview methods
- preview disabled reasons are visible and non-silent
- no undo spam from continuous controls
**Boundary:** Stop at Phase 66 UX wiring; do not fold in skip/auto/load/title-return cleanup matrix work.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unknown-safe enum select handling | Component-local ad hoc arrays and fallback logic | `src/shared/cinematicContract.js` helper pattern | Keeps editor/runtime compatibility in one place |
| Effect preview orchestration | Per-button iframe message logic | `usePageEditor.js` `preview*Effect()` methods | Phase 65 already owns request IDs, preflight, and busy state |
| Preview restore/cleanup policy | Local DOM reset in inspector | Existing runtime preview stop/restore path | Prevents editor/runtime divergence |
| Extra preview mode UI | New toolbar state machine or modal preview panel | Existing `PageEditor.vue` readonly + overlay stop flow | Avoids duplicate stop/lock behavior |

**Key insight:** Phase 66 is mostly a consumer of already-frozen contracts. The safest plan is to add thin UI around those contracts, not new orchestration.

## Recommended Verification Targets

1. **Shared compatibility helper coverage**
   - Extend `tests/cinematicContractCompatibility.test.js`
   - Add assertions for unknown animation/camera UI options if new helpers are introduced
   - Keep the existing transition unknown-value round-trip tests

2. **Preview state bridge coverage**
   - Extend `tests/pageEditorEffectPreviewState.test.js`
   - Assert the exact payload shape used by PageInspector-triggered character/camera/transition previews
   - Assert stale or missing config still returns explicit preflight reasons

3. **PageInspector wiring coverage**
   - Prefer a new plain-JS-focused test seam (for extracted helper logic or source-level wiring checks)
   - Avoid broad Phase 67 integration scenarios here
   - Only prove: control visibility, effect-kind routing, pushState timing, and unknown-value-safe selection

4. **Regression boundaries to keep out**
   - Do **not** turn this phase into skip/auto/load/title-return cleanup tests
   - Do **not** add full runtime visual sequencing assertions already covered by Phases 63-65

## Code Examples

Verified patterns from current source:

### Existing unknown-safe transition select
```javascript
// Source: src/editor/components/page-editor/PageInspector.vue
const transitionOptions = computed(() => getTransitionUiOptions(page.value?.transition?.type));
const selectedTransitionType = computed(() => page.value?.transition?.type || 'fade');
```

### Existing page-level transition setter timing
```javascript
// Source: src/editor/components/page-editor/PageInspector.vue
function setTransitionType(type) {
  if (!page.value) return;
  page.value.transition ??= {};
  page.value.transition.type = type;
  script.pushState();
}
```

### Existing preview result lifecycle
```javascript
// Source: src/editor/composables/usePageEditor.js
case 'preview-effect-result':
  lastEffectPreviewResult.value = msg;
  if (msg.status === 'accepted') {
    isEffectPreviewBusy.value = true;
    break;
  }
  if (['completed', 'cancelled', 'rejected', 'failed'].includes(msg.status)) {
    isEffectPreviewBusy.value = false;
    activeEffectPreviewRequestId.value = null;
    activeEffectPreviewRequest.value = null;
    if (previewSessionType.value === 'effect') {
      previewSessionType.value = null;
      isMuted.value = false;
    }
  }
  break;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Transition-only inspector controls + full-play preview | In-flow inspector controls backed by Phase 65 per-effect preview API | Phases 65-66 | No extra mode; preview parity stays with runtime |
| Hard-coded option lists in components | Shared contract-driven option helpers with explicit unknown placeholders | Phase 61 onward | Open/save compatibility survives future enum growth |
| UI-local preview assumptions | Global `usePageEditor` preview session owner + `PageEditor` readonly lock | Phase 65 | One effect session model, one stop path |

**Deprecated/outdated:**
- Editor-side fake playback for cinematic effects: rejected by spec and Phase 65 decisions.
- Any plan that rewrites raw page cinematic fields through runtime normalization helpers on every edit.

## Open Questions

1. **How should stale preview status be scoped in the inspector?**
   - What we know: `lastEffectPreviewResult` and `previewDisabledReason` are global refs in `usePageEditor.js`.
   - What's unclear: whether the UI should clear them on selection change or just filter by effect kind/current request.
   - Recommendation: keep state global, but display it only for the matching effect block/request; avoid building a new per-block state machine.

2. **Should direct `.vue` component tests be added now?**
   - What we know: current Vitest config is minimal and existing tests are plain JS / source-string heavy.
   - What's unclear: whether importing SFCs directly is worth the config overhead for this phase.
   - Recommendation: keep most new logic in plain JS helpers/composables and test those; only add Vue test config if a planner explicitly chooses component-mount tests.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | local tests / Vite tooling | ✓ | `v24.13.1` | — |
| npm | package commands | ✓ | `11.11.1` | — |
| Vitest | focused verification | ✓ | `4.1.4` | source-level / `node:test` checks where appropriate |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.4` (primary) + existing `node:test` usage in `tests/scriptEngine.test.js` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/cinematicContractCompatibility.test.js tests/iframeEffectPreviewWiring.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREV-01 | In existing PageInspector flow, creator can configure character animation, page camera, and page transition | unit / wiring | `npx vitest run tests/pageInspectorCinematicWiring.test.js tests/pageEditorEffectPreviewState.test.js tests/cinematicContractCompatibility.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/cinematicContractCompatibility.test.js`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Focused Phase 66 tests green, then full `npx vitest run`

### Wave 0 Gaps
- [ ] `tests/pageInspectorCinematicWiring.test.js` — verify PageInspector cinematic control visibility/routing without drifting into Phase 67
- [ ] Plain-JS helper seam for inspector option/status logic if planner wants reliable unit tests without expanding Vitest SFC config
- [ ] If planner insists on direct SFC-import tests, update `vitest.config.js` to support Vue SFC compilation first

## Canonical References

- `.planning/phases/66-editor-controls-compatibility-ux/66-CONTEXT.md` — locked Phase 66 decisions and scope
- `.planning/ROADMAP.md` §`Phase 66: Editor Controls & Compatibility UX` — success criteria and dependency boundary
- `.planning/REQUIREMENTS.md` — `PREV-01` plus linked preview/compatibility requirements
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` — preset-first editor design, preview parity, field visibility rules
- `src/editor/components/page-editor/PageInspector.vue` — current transition UI, character row expansion, pushState timing patterns
- `src/editor/composables/usePageEditor.js` — effect preview request owner, disabled reasons, busy/result refs
- `src/editor/views/PageEditor.vue` — inspector readonly lock and shared stop-preview path
- `src/editor/components/page-editor/CanvasToolbar.vue` — preview session copy/state model reference only
- `src/shared/cinematicContract.js` — current transition unknown-safe UI helper and raw/runtime contract split
- `src/editor/stores/script.js` — `pushState()` semantics, default page shape, page-duplication cinematic copying
- `src/engine/ScriptEngine.js` — raw page fields consumed at runtime; `page.camera` emitted via `page_enter`, `char.animation` emitted via `show_character`
- `src/editor/helpTexts.js` / `src/editor/components/HelpTip.vue` — inline help text pattern

## Sources

### Primary (HIGH confidence)
- Local source inspection:
  - `src/editor/components/page-editor/PageInspector.vue`
  - `src/editor/composables/usePageEditor.js`
  - `src/editor/views/PageEditor.vue`
  - `src/editor/components/page-editor/CanvasToolbar.vue`
  - `src/shared/cinematicContract.js`
  - `src/editor/stores/script.js`
  - `src/engine/ScriptEngine.js`
  - `src/editor/helpTexts.js`
- Local planning docs:
  - `.planning/PROJECT.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/ROADMAP.md`
  - `.planning/STATE.md`
  - `.planning/phases/62-character-preset-runtime-foundation/62-CONTEXT.md`
  - `.planning/phases/63-camera-runtime-shared-cleanup/63-CONTEXT.md`
  - `.planning/phases/64-background-transition-expansion/64-CONTEXT.md`
  - `.planning/phases/65-iframe-effect-preview-api/65-CONTEXT.md`
  - `.planning/phases/66-editor-controls-compatibility-ux/66-CONTEXT.md`
- Package/version verification:
  - `package.json`
  - `npm view vue version time.modified`
  - `npm view pinia version time.modified`
  - `npm view vitest version time.modified`
  - `npm view electron version time.modified`

### Secondary (MEDIUM confidence)
- None

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo stack plus live npm version verification
- Architecture: HIGH - driven by current source files and locked phase context
- Pitfalls: HIGH - based on existing preview/compatibility code paths and store semantics

**Project skills:** No `.github/skills/` or `.agents/skills/` directories found.  
**Research date:** 2026-04-21  
**Valid until:** 2026-04-28
