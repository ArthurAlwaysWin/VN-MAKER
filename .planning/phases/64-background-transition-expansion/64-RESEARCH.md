# Phase 64: Background Transition Expansion - Research

**Researched:** 2026-04-21
**Domain:** Background transition contract expansion, runtime sequencing, and BackgroundLayer ownership
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `BackgroundLayer` 继续作为唯一背景转场 owner，不新增第二套 transition controller，也不把转场逻辑塞进 `ScriptEngine`、`CameraController` 或 `CharacterLayer`。
- **D-02:** 转场仍只作用于背景层；角色 motion 保持在 `.character-motion`，页面镜头保持在 `#stage-layer`，dialogue/UI 仍在舞台层外。
- **D-03:** `main.js` 继续负责 orchestration，Phase 64 若需要等待背景转场完成后再放行角色/镜头/对话显示，应在现有 runtime 编排层落实，而不是把复杂调度塞进编辑器。

### 转场集合与命名
- **D-04:** v1.4 的已知页面转场集合锁定为：`none`、`fade`、`slide-left`、`slide-right`、`dissolve`、`wipe`、`scale`、`blur`。
- **D-05:** 为避免与页面 camera 的 `zoom` 混淆，缩放型转场的内部字段固定使用 **`scale`**；编辑器文案可以显示为“缩放”。
- **D-06:** `wipe` 首版固定为单方向、预设化效果，不新增方向参数或第二字段；如需方向控制，留到后续 milestone。

### 视觉与实现边界
- **D-07:** `dissolve`、`wipe`、`scale`、`blur` 全部沿用 DOM/CSS 路线实现，不引入 canvas、shader、第三方动画库或新渲染依赖。
- **D-08:** 新效果必须与现有双背景层切换模型兼容，优先在 `BackgroundLayer` 现有 layerA/layerB + active 模式上扩展，而不是推翻为全新结构。
- **D-09:** `dissolve` 必须与普通 `fade` 有可感知差异，但仍接受 CSS 近似方案；目标是“明显不同”，不是影视级像素级溶解。
- **D-10:** `blur` 与 `scale` 是页面切换过渡，不得污染页面稳定态；转场结束后必须清除 background layer 上的 filter / transform / 临时 class。

### 顺序与 cleanup
- **D-11:** Phase 64 必须建立稳定 sequencing：旧页面退出与背景转场完成后，再触发新页面的角色动画与页面镜头。
- **D-12:** 对话内容与页面稳定态显示应跟随转场完成后的页面进入时机，避免背景仍在过渡时角色/镜头已抢先启动。
- **D-13:** skip / 快速切页下转场优先安全降级到 0ms / cut，保证页面推进与 clean state 的确定性，延续前两 phase 的 runtime 策略。
- **D-14:** replay、load、preview start/stop、title return、game end 等既有 reset 路径不得遗留背景层 class、filter、transform 或隐藏中的旧图层状态。

### 兼容契约
- **D-15:** 旧项目与未来项目中的未知 `transition.type` 继续原样保留；编辑器显示“未知转场”，runtime 对未知值安全回退到兼容路径。
- **D-16:** runtime 对未知转场类型继续回退到 `fade`，但 page payload 原始值所有权不变，保持 Phase 61 冻结的 compatibility contract。

### the agent's Discretion
- `BackgroundLayer` 是否扩展为 promise/回调式完成信号，还是通过现有定时结构暴露 transition completion
- 各转场对应的具体 class 命名、CSS variables 与 keyframes 设计
- `dissolve` 与 `fade` 的区分手法（opacity + blur / brightness / subtle scale 等）
- sequencing 落点是 `ScriptEngine` 事件拆分，还是 `main.js` 对 page-enter fan-out 的延迟编排
- 测试拆分为 shared contract、BackgroundLayer jsdom、main.js sequencing 回归的具体粒度

### Deferred Ideas (OUT OF SCOPE)
- iframe 单次转场 replay command / ack / restore 语义 —— 留到 Phase 65
- 转场方向、遮罩形状、自定义 easing、组合串联 —— 明确超出 v1.4 范围
- skip / auto / load / title-return 的全量残留矩阵验证 —— 留到 Phase 67
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRAN-01 | 创作者可以为页面选择至少 7 种可区分的转场类型。 | 扩展 `cinematicContract.js` known set + `PageInspector` 现有 selector 选项 + `BackgroundLayer` CSS classes。 |
| TRAN-02 | 新增转场能力至少覆盖 `dissolve`、`wipe`、`zoom`、`blur`，并保留现有 `none`、`fade`、`slide-*` 兼容行为。 | Phase 64 locked name is `scale` not `zoom`; keep runtime/editor known set as `none/fade/slide-left/slide-right/dissolve/wipe/scale/blur`, preserve unknown round-trips, fallback unknown runtime to `fade`. |
| TRAN-04 | 播放者看到的页面切换顺序保持稳定：旧页面退出与背景转场完成后，再进入角色动画和镜头效果。 | Add BackgroundLayer completion signal; queue `show_character`, `page_enter` fan-out, and dialogue/choice display in `main.js` until background transition resolves or cuts immediately. |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- Tech stack stays **JavaScript ES Modules + Vue 3 + Electron**; no TypeScript migration.
- Keep the product model: creators do visual design only; engine owns logic.
- Windows-first, must remain macOS-compatible.
- Dark theme, pure CSS, Chinese UI.
- Use explicit `.js` import extensions in JS.
- Use named exports; no default exports in JS modules.
- Follow existing runtime style: one class per file for engine/UI modules, 2-space indent, semicolons, single quotes.
- Handle runtime errors at boundaries; prefer safe fallback / warning over uncaught throws.
- No new animation/rendering dependency for this milestone.
- Use GSD workflow conventions; do not recommend approaches that bypass them.

## Summary

Phase 64 should be planned as an **owner-preserving extension** of the existing background system, not as a new transition framework. The current repo already freezes the compatibility rule in `src/shared/cinematicContract.js`, the visual ownership split in Phase 61, the character-motion owner in Phase 62, and the camera owner plus cleanup pattern in Phase 63. The safest plan is therefore: expand the shared known transition set, make `BackgroundLayer` capable of deterministic class-based transitions plus cleanup, and let `main.js` delay page-enter fan-out until the background owner reports completion.

The biggest implementation risk is **sequencing**, not CSS. `ScriptEngine._renderPage()` currently emits `page_enter` first, then `set_background`, then character events, and `_playCurrentDialogue()` runs immediately after `_renderPage()`. If Phase 64 changes only CSS, camera and character playback will still start too early. The low-risk fix is to keep `ScriptEngine` emitter-only and add a small transition gate in `main.js`: background starts immediately, but character enter, camera playback, dialogue/choice display, and any page-stable UI release only after the transition promise resolves or safe-cuts on skip/0ms.

**Primary recommendation:** keep `BackgroundLayer` as the sole transition owner, add a completion promise/token API to it, and make `main.js` queue page-enter fan-out behind that signal without changing raw page payload ownership.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Runtime DOM/CSS + `BackgroundLayer` | existing repo owner | Render background transitions | Phase 61/64 decisions explicitly keep background transitions in this owner. |
| `src/shared/cinematicContract.js` | existing repo contract | Known/unknown transition compatibility | Already frozen for round-trip preservation and runtime fallback. |
| `main.js` orchestration | existing repo runtime shell | Gate page-enter sequencing | Existing reset and owner wiring already live here. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.4 (registry verified 2026-04-09) | jsdom and source-level tests | For BackgroundLayer, wiring, and compatibility tests. |
| jsdom | 29.0.2 (registry verified 2026-04-07) | DOM test environment | For dual-layer background transition behavior and cleanup tests. |
| Node built-in test runner | Node v24.13.1 | existing `tests/scriptEngine.test.js` | For ScriptEngine contract/fallback tests already written in `node:test`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BackgroundLayer extension | Second transition controller | Violates locked ownership and creates competing cleanup/state. |
| `main.js` gate | Async DOM waits inside `ScriptEngine` | Breaks emitter-only boundary and couples engine to UI timing. |
| CSS class + property transitions | Canvas/shader/3rd-party animation lib | Out of scope and contradicts no-new-dependency rule. |

**Installation:**
```bash
# No new package required for Phase 64
```

## Recommended Plan Split

1. **Plan A — Contract + BackgroundLayer expansion**
   - Expand locked known transition set in `cinematicContract.js`
   - Update selector-visible options via existing `getTransitionUiOptions()`
   - Add deterministic class/cleanup/completion support in `BackgroundLayer`
   - Add focused jsdom tests for transition behavior

2. **Plan B — Runtime sequencing + cleanup wiring**
   - Add `main.js` transition gate around background → character/camera/dialogue/choice release
   - Thread skip/cut/immediate paths through the same completion API
   - Cover replay/load/title/preview/end cleanup and sequencing regressions

This split is low-risk because it isolates owner logic first, then orchestration.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── shared/cinematicContract.js   # known transition contract + fallback helpers
├── ui/BackgroundLayer.js         # sole background transition owner
├── main.js                       # runtime sequencing gate + cleanup wiring
└── style.css                     # background transition classes only

tests/
├── cinematicContractCompatibility.test.js
├── backgroundLayerTransitions.test.js
├── backgroundTransitionWiring.test.js
└── scriptEngine.test.js
```

### Pattern 1: Preserve raw value ownership; normalize only at consume time
**What:** Keep `page.transition.type` untouched in editor/store/page payload, but resolve runtime playback through a helper.
**When to use:** Any editor/runtime path touching transition enums.
**Example:**
```javascript
// Source: src/shared/cinematicContract.js
export function getRuntimeTransitionType(type) {
  return isKnownTransitionType(type) ? type : 'fade';
}
```

**Phase 64 guidance:** extend `isKnownTransitionType()` to the locked 8-value set. Do **not** rewrite unknown values in store/page objects. Do **not** reintroduce an outdated `slide` canonical alias; Phase 64 locked values remain `slide-left` and `slide-right`.

### Pattern 2: BackgroundLayer owns transition state and completion
**What:** `BackgroundLayer.setBackground()` should both apply the effect and expose deterministic completion.
**When to use:** Any page change, cut, replay, preview start/stop, or clear.
**Example:**
```javascript
// Recommended pattern, source-aligned with src/ui/BackgroundLayer.js
setBackground(data) {
  this._cancelActiveTransition();
  const token = ++this._transitionToken;
  const duration = this._normalizeDuration(data);
  const type = this._normalizeInternalTransition(data.transition);

  this._prepareLayers(type, duration);
  this._applySwap(type);

  return this._awaitCompletion(token, duration, type);
}
```

### Pattern 3: main.js gates page-enter fan-out, not ScriptEngine
**What:** Treat `page_enter` as pending metadata and release camera/dialogue/current-page character work only after background resolves.
**When to use:** Normal page renders, replay, load, preview start, and skip/cut transitions.
**Example:**
```javascript
// Source-aligned recommendation for src/main.js
let pendingPageEnter = null;
let pendingCharacterEvents = [];
let pendingUiEvent = null;

engine.on('page_enter', (data) => {
  pendingPageEnter = data;
  startPageTransitionGate();
});

engine.on('set_background', async (data) => {
  const done = skipMode
    ? background.setBackground({ ...data, duration: 0, transition: 'cut' })
    : background.setBackground(data);
  await done;
  flushPageEnterGate();
});
```

### Anti-Patterns to Avoid
- **Second transition subsystem:** no separate transition manager/controller.
- **Stored-value normalization:** do not rewrite `slide-left`/`slide-right` to some other canonical string in saved data.
- **Timer-only sequencing in main.js without owner signal:** arbitrary `setTimeout(duration)` duplicates BackgroundLayer timing and will desync on cuts/replacements.
- **Stable-state pollution:** no lingering `filter`, `transform`, `clip-path`, or `bg-transition-*` classes after completion or clear.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background transition ownership | A new controller or preview-only subsystem | Extend `BackgroundLayer` | Ownership already frozen there. |
| Compatibility preservation | Ad hoc UI fallback logic in components | `cinematicContract.js` helpers | Existing unknown-value contract already centralizes this. |
| Page-enter sequencing | Cross-module sleeps scattered in handlers | One gate in `main.js` backed by BackgroundLayer completion | Keeps orchestration centralized and testable. |
| Cleanup | One-off class removals per call site | `BackgroundLayer.clear()` + cancel/finalize helpers | Same reset surface can serve replay/load/title/preview/end paths. |

**Key insight:** the repo already solved this pattern once for camera cleanup: a single owner plus centralized `main.js` reset wiring. Phase 64 should mirror that, not invent a parallel system.

## Common Pitfalls

### Pitfall 1: Breaking the frozen compatibility contract
**What goes wrong:** new known types are added, but unknown values get overwritten or `slide-left/right` get collapsed to a new saved form.
**Why it happens:** mixing runtime normalization with persistence normalization.
**How to avoid:** only extend `KNOWN_TRANSITION_OPTIONS` / `isKnownTransitionType()`; keep `getRuntimeTransitionType()` as consume-time fallback to `fade`.
**Warning signs:** store copy tests fail; selector no longer shows `未知转场：...`; saved pages change value without user action.

### Pitfall 2: Transition visuals improve but sequencing remains wrong
**What goes wrong:** background animates, but camera, characters, or dialogue still start before completion.
**Why it happens:** current `ScriptEngine` order is synchronous: `page_enter` first, then `set_background`, then characters, then dialogue playback.
**How to avoid:** add a gate in `main.js` that queues page-enter fan-out until `BackgroundLayer` resolves.
**Warning signs:** character animation visible over moving background; camera shake starts while wipe/blur is still running.

### Pitfall 3: Rapid page changes leave dirty background state
**What goes wrong:** hidden old layer keeps temporary classes or inline styles; next page inherits blur/clip-path/transform.
**Why it happens:** current `BackgroundLayer.clear()` only resets images and `.active`, not transition-specific state.
**How to avoid:** add `_cancelActiveTransition()`, `_clearTransitionClasses()`, and full style cleanup in both completion and `clear()`.
**Warning signs:** `layerB` remains blurred after skip/load/title; second transition starts from partially clipped state.

### Pitfall 4: Reusing stage or character transforms for background effects
**What goes wrong:** background transition collides with camera or character ownership.
**Why it happens:** trying to animate `#stage-layer` or `.character-motion` instead of `.bg-image-layer`.
**How to avoid:** keep all Phase 64 temporary classes on `.bg-image-layer` only.
**Warning signs:** dialogue/UI shakes, character motion resets, or camera tests regress.

### Pitfall 5: Letting internal `cut` leak into the shared contract
**What goes wrong:** editor or saved data starts treating `cut` as a normal transition option.
**Why it happens:** reusing runtime immediate mode as user-facing enum.
**How to avoid:** keep `cut` internal to `main.js`/`BackgroundLayer` immediate paths only.
**Warning signs:** selector shows `cut`; copy-page or new-page defaults store it.

## Code Examples

Verified patterns from current sources:

### Unknown-value runtime fallback
```javascript
// Source: src/shared/cinematicContract.js
export function getTransitionUiOption(type) {
  if (isKnownTransitionType(type)) {
    return KNOWN_TRANSITION_OPTIONS.find(option => option.value === type);
  }

  if (typeof type === 'string' && type.trim()) {
    return {
      value: type,
      label: `未知转场：${type}`,
      known: false,
    };
  }

  return KNOWN_TRANSITION_OPTIONS[0];
}
```

### Existing reset pattern Phase 64 should follow
```javascript
// Source: src/main.js
function replayCurrentPage() {
  camera.clear();
  characters.clear();
  background.clear();
  engine.resetRenderState();
  engine.renderCurrentPage();
}
```

### Current sequencing hazard to plan around
```javascript
// Source: src/engine/ScriptEngine.js
this.emit('page_enter', { ... });
// ...
this.emit('set_background', { image: page.background, transition, duration });
// ...
this.emit('show_character', { ... });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy known transitions = `fade`, `slide-left`, `slide-right`, `none` | Locked Phase 64 known set = `none`, `fade`, `slide-left`, `slide-right`, `dissolve`, `wipe`, `scale`, `blur` | 2026-04-21 phase context/spec | Expand editor/runtime without changing unknown-value rules. |
| Background owner only handled fade vs instant | Background owner should become class-based multi-effect owner with deterministic cleanup/completion | Phase 64 | Enables new effects and sequencing gate without second subsystem. |
| `page_enter` immediately drives camera and dialogue/UI | `page_enter` should remain emitted, but runtime fan-out should wait for background completion | Phase 64 | Preserves engine contract while fixing visible ordering. |

**Deprecated/outdated:**
- `zoom` as the transition storage/runtime name: replaced by locked `scale` for Phase 64 to avoid camera-name conflict.
- Any proposal that canonicalizes saved values to `slide`: conflicts with the locked Phase 64 set and should not guide this phase.

## Integration Points

- **`src/shared/cinematicContract.js`**
  - Expand known transition options and labels
  - Preserve unknown-value UI option behavior
  - Keep runtime fallback = `fade`
- **`src/editor/components/page-editor/PageInspector.vue`**
  - No new UI mode required
  - Existing selector will pick up more options from `getTransitionUiOptions()`
- **`src/editor/stores/script.js`**
  - No schema migration needed
  - Keep default `{ type: 'fade', duration: 800 }`
  - Continue copying raw transition data via `copyPageCinematicFields()`
- **`src/ui/BackgroundLayer.js`**
  - Main owner expansion point: classes, timers/tokens, completion API, cleanup
- **`src/style.css`**
  - Add `.bg-transition-*` rules only on `.bg-image-layer`
- **`src/main.js`**
  - Add sequencing gate and cleanup coverage
  - Keep skip -> `cut` immediate path
- **`src/engine/ScriptEngine.js`**
  - Prefer minimal/no sequencing changes
  - If touched, only for contract coverage tests; avoid moving visual orchestration here

## Runtime State Inventory

> Phase 64 is not a rename/refactor/migration phase, so runtime string migration work is not applicable. Explicitly verified against the required categories.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — transition values live in page JSON; no separate DB/runtime data migration surfaced by the required files | Code edit only |
| Live service config | None — no external service/UI-stored transition config identified | None |
| OS-registered state | None — no OS registration tied to transition naming | None |
| Secrets/env vars | None — no env/secret names tied to Phase 64 transition values | None |
| Build artifacts | None specific to Phase 64 beyond normal rebuild after code/CSS changes | Rebuild/test only |

## Open Questions

1. **Should choice pages be gated with dialogue behind background completion?**
   - What we know: `choice` currently shows immediately when emitted; Phase 64 locks stable page-enter timing for visible page content.
   - What's unclear: Requirement text names character/camera explicitly, but D-12 also says dialogue/stable state should follow completion.
   - Recommendation: gate `choiceMenu.show()` with the same release path as dialogue.

2. **Should preview-mode `engine.on('end')` clear background state before posting `ended`?**
   - What we know: current preview-end branch clears camera only, while preview `stop` does full clear.
   - What's unclear: whether parent always sends `stop` immediately after `ended`.
   - Recommendation: plan an explicit background cleanup there or a shared visual-reset helper, because Phase 64 adds transition-specific residue risk.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tests / runtime tooling | ✓ | v24.13.1 | — |
| npm | package tooling | ✓ | 11.11.1 | — |
| Vitest | DOM/wiring tests | ✓ | 4.1.4 | Use Node test runner only for non-DOM tests |
| jsdom | DOM test environment | ✓ | 29.0.2 | — |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom 29.0.2; Node built-in test runner for existing `scriptEngine.test.js` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/cinematicContractCompatibility.test.js tests/backgroundLayerTransitions.test.js tests/backgroundTransitionWiring.test.js` |
| Full suite command | `npx vitest run && node --test tests/scriptEngine.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRAN-01 | Locked 8 transition options are exposed without breaking unknown-option UI | unit | `npx vitest run tests/cinematicContractCompatibility.test.js` | ✅ extend existing |
| TRAN-02 | BackgroundLayer supports `dissolve/wipe/scale/blur` and keeps `none/fade/slide-*` compatibility | jsdom unit | `npx vitest run tests/backgroundLayerTransitions.test.js` | ❌ Wave 0 |
| TRAN-04 | Background transition completion gates character/camera/dialogue/choice release | integration/wiring | `npx vitest run tests/backgroundTransitionWiring.test.js` | ❌ Wave 0 |
| TRAN-04 | Runtime fallback for unknown transitions stays `fade` while payload ownership remains raw | unit | `node --test tests/scriptEngine.test.js` | ✅ extend existing |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/cinematicContractCompatibility.test.js tests/backgroundLayerTransitions.test.js tests/backgroundTransitionWiring.test.js`
- **Per wave merge:** `npx vitest run && node --test tests/scriptEngine.test.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/backgroundLayerTransitions.test.js` — class mapping, cleanup, replacement, `clear()`, cut/0ms, and stable-state cleanup
- [ ] `tests/backgroundTransitionWiring.test.js` — queued fan-out after background completion, skip/immediate release, replay/title/preview/end cleanup expectations
- [ ] Extend `tests/cinematicContractCompatibility.test.js` — locked 8-option list and unknown-value selector preservation
- [ ] Extend `tests/scriptEngine.test.js` — known new transition passthrough + unknown fallback remains `fade`

## Sources

### Primary (HIGH confidence)
- `E:\projects\my-awesome-project\.planning\phases\64-background-transition-expansion\64-CONTEXT.md` - locked scope, ownership, transition set, sequencing, cleanup, compatibility rules
- `E:\projects\my-awesome-project\.planning\REQUIREMENTS.md` - TRAN-01 / TRAN-02 / TRAN-04 requirement language
- `E:\projects\my-awesome-project\.planning\ROADMAP.md` - Phase 64 goal and success criteria
- `E:\projects\my-awesome-project\docs\superpowers\specs\2026-04-21-v1.4-cinematic-upgrade-design.md` - lifecycle and layering rules for transitions/characters/camera
- `E:\projects\my-awesome-project\src\shared\cinematicContract.js` - current unknown-value preservation and runtime fallback helpers
- `E:\projects\my-awesome-project\src\ui\BackgroundLayer.js` - current dual-layer background owner
- `E:\projects\my-awesome-project\src\engine\ScriptEngine.js` - current emit order and page render flow
- `E:\projects\my-awesome-project\src\main.js` - current background wiring, camera on `page_enter`, and cleanup paths
- `E:\projects\my-awesome-project\src\editor\components\page-editor\PageInspector.vue` - existing transition selector consumption
- `E:\projects\my-awesome-project\src\editor\stores\script.js` - default page transition and copy behavior
- `E:\projects\my-awesome-project\src\style.css` - current layer ownership and background CSS baseline
- `E:\projects\my-awesome-project\tests\cinematicContractCompatibility.test.js` - existing unknown transition round-trip coverage
- `E:\projects\my-awesome-project\tests\cameraRuntimePlayback.test.js` and `tests\cameraCleanupWiring.test.js` - established owner + cleanup test pattern Phase 64 should mirror

### Secondary (MEDIUM confidence)
- `E:\projects\my-awesome-project\docs\superpowers\plans\2026-04-21-v1.4-cinematic-upgrade.md` - useful implementation/test ideas for class cleanup, but contains outdated `slide`/preview assumptions that conflict with locked Phase 64 context
- `package.json`, `vitest.config.js`, local tool runs on 2026-04-21 - validation stack and environment verification

### Tertiary (LOW confidence)
- CSS effect recommendations (`clip-path` wipe, blur/filter+scale dissolve differentiation) rely on current Chromium/Electron DOM/CSS behavior inferred from project stack rather than freshly fetched browser docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all recommendations reuse current repo owners and installed tooling.
- Architecture: HIGH - directly constrained by Phase 61/62/63 context and current runtime code.
- Pitfalls: HIGH - grounded in current emit order, current cleanup gaps, and existing test patterns.

**Research date:** 2026-04-21
**Valid until:** 2026-05-21
