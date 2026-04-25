# Phase 65: Iframe Effect Preview API - Research

**Researched:** 2026-04-21
**Domain:** Runtime-backed iframe effect replay protocol, restore lifecycle, and editor preview state plumbing
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 继续以现有 iframe `postMessage` 预览链路为唯一入口，在 `start` / `stop` / `mute` 之外新增一套**统一的 effect preview command**，而不是为 character / camera / transition 各自发明完全不同的消息协议。
- **D-02:** 新协议采用“请求 + 结果”结构，至少包含 `requestId`、`effectKind`、`sceneId`、`pageIndex` 与 effect payload；运行时回传显式状态消息，供编辑器区分成功、取消、不可用和失败原因。
- **D-03:** `usePageEditor.js` 负责维护 preview request bookkeeping（当前请求、busy 状态、最近一次失败原因），后续 Phase 66 的按钮和提示直接消费这套状态，不再各自重复造状态机。

### Runtime ownership and restore model
- **D-04:** 预览执行权继续完全留在 runtime：角色动画仍由 `CharacterLayer` 播放，镜头仍由 `CameraController` 播放，转场仍由 `BackgroundLayer` 播放；编辑器不得自行模拟动画或镜头效果。
- **D-05:** 每次 effect preview 启动前，runtime 必须先捕获当前真实页面的可恢复快照；结束或取消时统一走 restore path，复用 `engine.getState()` / `restoreState()`、`engine.resetRenderState()`、`replayCurrentPage()` 以及既有 cleanup helper，而不是靠零散 DOM 回滚。
- **D-06:** Phase 65 采用**全局单实例 preview lock**：同一时刻只允许一个 cinematic preview 运行；无论用户重播同类效果还是切换到另一类效果，旧预览都先取消并恢复，再启动新请求。

### Transition preview model
- **D-07:** 页面转场预览不依赖真实切到下一页，而是在 runtime 内以“当前页真实状态作为旧页 + 基于当前页构造临时新页副本”的方式执行一次单次转场。
- **D-08:** 临时转场副本只存在于 iframe runtime 内部，绝不写回 `script.data`、当前编辑页或场景导航状态；预览完成后必须回到触发前的 scene/page identity。
- **D-09:** 转场预览必须复用 Phase 64 已建立的 `BackgroundLayer` sole-owner 与 background completion gate 语义，不能绕开 gate 直接伪造 class 切换。

### Disabled and failure semantics
- **D-10:** “不可预览”与“预览失败”必须区分对待：编辑器侧先做轻量 preflight（如 iframe 未就绪、未选中页面、对应效果未配置），运行时侧再回传执行期错误；两者都要产出明确的 reason code，而不是静默 no-op。
- **D-11:** Phase 65 的标准 reason 集优先覆盖：`engine-not-ready`、`no-page-selected`、`missing-character-animation`、`missing-camera-config`、`missing-transition-config`、`unsupported-effect`、`preview-busy`、`restore-failed`、`runtime-error`。
- **D-12:** unknown animation / camera / transition 枚举继续保持“数据可保存、预览不乱播”的兼容策略：编辑器不抹掉原值；若运行时无法安全预览，则返回显式 `unsupported-effect`，不擅自 fallback 到另一种可见效果冒充成功。

### the agent's Discretion
- preview result message 的具体命名（例如 `preview-effect:done` vs `preview-finished`）与 payload 字段命名
- `usePageEditor` 中 preview state 是扁平字段还是小型对象状态机
- restore path 内部是直接抽公共 helper，还是围绕现有 `replayCurrentPage()` 做薄封装
- transition 临时副本的最小字段集合与 clone 方式
- Phase 65 测试如何拆成 editor composable contract、runtime message wiring、以及 restore/cleanup regression

### Deferred Ideas (OUT OF SCOPE)
- PageInspector 中动画下拉框、镜头配置区、转场配置区的具体按钮布局与文案 —— 留到 Phase 66
- 多 preview 并行、preview 队列、自动连续重播 —— 明确超出 v1.4 范围
- skip / auto / load / title-return / rapid replay 的全量残留矩阵验证 —— 留到 Phase 67
- 把 effect preview 扩展成时间轴级“片段预演器” —— 不属于本次里程碑
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANIM-04 | 创作者可以在编辑器中单独重播角色动画预览，而无需启动完整试玩流程。 | 统一 `preview-effect` 协议、character payload builder、`CharacterLayer` owner replay、editor effect session state |
| TRAN-03 | 创作者可以在编辑器中预览单次转场效果，而不需要真正切换到其他页面。 | runtime-only temporary transition page variant, `BackgroundLayer` completion promise reuse, no navigation mutation |
| PREV-02 | 创作者可以通过 iframe 运行时预览分别重播角色动画、镜头效果和转场，且预览支持明确的失败/禁用提示。 | request/result status model, editor preflight reasons, runtime terminal reason codes, shared busy/cancel bookkeeping |
| PREV-03 | 创作者在执行预览后，编辑器会恢复到预览前的页面编辑状态。 | extracted restore helper around engine snapshot + render reset, editor session type/snapshot bookkeeping, auto-exit effect preview mode |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- Keep implementation in JavaScript ES Modules; do not migrate to TypeScript.
- Reuse the existing split: Vue 3 editor in `src/editor/`, vanilla JS runtime in `src/engine/` and `src/ui/`.
- Use explicit `.js` extensions for JS imports.
- Use named exports in JS modules; no default exports in JS files.
- Preserve existing style conventions: 2-space indentation, semicolons, single quotes.
- Follow existing error-handling style: handle failures at boundaries, use `console.warn`/`console.error`, avoid uncaught throws.
- Maintain existing security patterns (`asset://`, sanitization, path safety); do not add unsafe shortcuts.
- Stay inside the current GSD workflow and phase boundaries; no direct out-of-band architecture changes.

## Summary

Phase 65 should extend the existing iframe preview bridge with one shared **effect replay command family** rather than three separate APIs. The safest contract is a `preview-effect` request with a `requestId`, `effectKind`, `sceneId`, `pageIndex`, and effect-specific payload, paired with a single `preview-effect-result` response envelope that reports both acceptance and terminal outcomes. This preserves the current `start` / `stop` / `mute` protocol, gives Phase 66 a stable button-facing API, and keeps runtime authority inside `CharacterLayer`, `CameraController`, and `BackgroundLayer`.

The current runtime already has the right recovery primitives: `engine.getState()`, `engine.restoreState()`, `engine.resetRenderState()`, `cancelPageTransitionGate()`, and `replayCurrentPage()`’s clear-and-render sequence. The main gap is that this sequence is duplicated and not effect-preview-aware. Phase 65 should extract a single restore helper that can be called on complete, cancel, stop, and error. That helper should restore a captured engine snapshot, clear owner state, and re-render the current page before the editor exits temporary iframe effect-preview mode.

Transition preview is the only non-trivial replay. It should stay inside `BackgroundLayer` ownership by synthesizing a temporary incoming-page variant in runtime memory only, awaiting the existing completion-aware background transition path, and then restoring the captured page state. Editor work in this phase should stop at protocol/state plumbing: session type, active request tracking, preflight reason codes, and terminal result storage. Phase 66 can then add buttons and labels without reopening message semantics.

**Primary recommendation:** Implement a single `preview-effect` / `preview-effect-result` protocol plus one extracted runtime restore helper, and make every effect preview session auto-cancel, auto-restore, and auto-exit back to editor mode.

## Standard Stack

### Core
| Library / Module | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | repo `^3.5.31` (npm latest `3.5.32`, 2026-04-03) | Editor-side session and message bookkeeping in `usePageEditor.js` | Already owns PageEditor reactive state |
| Browser `postMessage` | DOM standard | Request/result bridge between editor and iframe runtime | Existing preview transport already uses it; zero new deps |
| `ScriptEngine` + runtime owners (`CharacterLayer`, `CameraController`, `BackgroundLayer`) | repo current | Authoritative playback and cleanup | Locked by Phases 61-64 and frozen constraints |
| Vitest | repo `^4.1.4` (npm latest `4.1.4`, 2026-04-09) | jsdom and source-wiring tests for preview protocol | Already used by current runtime regression tests |

### Supporting
| Library / Module | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/shared/cinematicContract.js` | repo current | Preserve known/unknown cinematic enums | Reuse for payload normalization and unknown-value handling |
| `src/engine/assetPath.js` | repo current | `ready` / `ack-preview` handshake | Keep current iframe readiness contract intact |
| Node.js | local `24.13.1` | Run tests and registry verification | Required for local validation and `npm view` checks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared `preview-effect` command | Separate `preview-character` / `preview-camera` / `preview-transition` messages | Simpler short-term, but duplicates request IDs, result handling, and cancel rules |
| Runtime-owned replay | Canvas/editor-side fake CSS preview | Violates iframe-authority constraint and risks parity drift |
| Reusing `BackgroundLayer` promise path | Direct DOM class toggles in `main.js` | Breaks Phase 64 ownership and cleanup guarantees |

**Installation:**
```bash
# No new dependencies for Phase 65
```

**Version verification:** Verified with `npm view` on 2026-04-21. No dependency upgrades are recommended for this phase because the frozen milestone constraint is “no new dependencies”; reuse the repo’s current stack.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── editor/composables/usePageEditor.js      # editor-side effect preview session owner
├── editor/views/PageEditor.vue              # iframe visibility + session mode presentation
├── main.js                                  # runtime message dispatch, preview lock, restore helper
├── shared/cinematicContract.js              # enum preservation; extend only with pure preview helpers if needed
└── ui/                                      # existing playback owners remain unchanged

tests/
├── iframeEffectPreviewWiring.test.js        # runtime protocol + restore wiring
├── pageEditorEffectPreviewState.test.js     # editor session/preflight/result handling
└── backgroundTransitionPreview.test.js      # transition synthesis and cleanup
```

### Pattern 1: Shared request/result effect preview contract
**What:** Keep one message family on top of `start` / `stop` / `mute`.
**When to use:** Every single-effect replay request from editor to iframe runtime.
**Recommendation:** Use one request envelope and one response envelope:

```js
// Source basis: src/editor/composables/usePageEditor.js + src/main.js initPreview()
{
  type: 'preview-effect',
  requestId: 'preview-65-0001',
  effectKind: 'character', // 'character' | 'camera' | 'transition'
  sceneId: 'opening',
  pageIndex: 2,
  payload: { ...effectSpecificData },
}

{
  type: 'preview-effect-result',
  requestId: 'preview-65-0001',
  effectKind: 'character',
  status: 'accepted', // accepted | completed | cancelled | rejected | failed
  reason: null,
}
```

**Rules:**
- `accepted` is required so the editor can enter busy state deterministically.
- `completed`, `cancelled`, `rejected`, and `failed` are terminal.
- `reason` uses the locked reason set; reserve `cancelDetail` for `superseded`, `stop`, `iframe-unload`, or `selection-change`.
- Editor preflight should only reject structural conditions (`engine-not-ready`, `no-page-selected`, missing config). Unsupported enum playback stays runtime-owned and returns `unsupported-effect`.

### Pattern 2: Extract one restore helper and call it from every terminal path
**What:** Turn the existing `replayCurrentPage()` clear sequence into a reusable preview restore path.
**When to use:** Complete, cancel, stop, runtime error, and superseded preview.
**Recommendation:** Extract a helper in `main.js` that restores a captured engine snapshot, not just the current in-memory position.

```js
// Source basis: src/main.js replayCurrentPage(), preview start/stop cleanup
function restorePreviewSnapshot(snapshot) {
  cancelPageTransitionGate();
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  choiceMenu.hide();
  camera.clear();
  audio.stopVoice();
  characters.clear();
  background.clear();
  engine.restoreState(snapshot);
  engine.resetRenderState();
  engine.renderCurrentPage();
}
```

**Why this exact path:** `replayCurrentPage()` already proves the clear order (`camera.clear()` → `characters.clear()` → `background.clear()` → `engine.resetRenderState()` → `engine.renderCurrentPage()`). Phase 65 should reuse that ordering instead of inventing DOM rollback per effect.

### Pattern 3: Global single-instance preview lock
**What:** Only one cinematic preview can exist at a time.
**When to use:** All effect preview starts.
**Recommendation:** Track one active preview record in runtime:
- `requestId`
- `effectKind`
- `snapshot`
- `cancelled`
- `restoreInFlight`

On a new request:
1. cancel old preview,
2. restore old snapshot,
3. emit `cancelled` for old request,
4. start new request,
5. emit `accepted` for new request.

This is safer than per-kind concurrency because `BackgroundLayer`, `CameraController`, and the stage DOM still share cleanup timing.

### Pattern 4: Transition preview via temporary runtime-only page variant
**What:** Preview a transition without changing actual scene/page navigation.
**When to use:** `effectKind === 'transition'`.
**Recommendation:**
- Capture engine snapshot first.
- Keep `engine.currentScene` and `engine.pageIndex` unchanged.
- Build a temporary incoming page/background payload in runtime memory only.
- Use `BackgroundLayer` as the only visual owner.
- Await the background completion promise before terminal success or restore.

For the temporary variant, the minimum safe payload is:
- `background`
- `transition.type`
- `transition.duration`
- optional runtime-only `previewVariant: 'same-page'`

If the incoming and outgoing backgrounds are identical, use a runtime-only preview variant class on the incoming layer so the transition is still visible. Do **not** mutate `script.data` or the editor page object.

### Anti-Patterns to Avoid
- **Per-effect custom message shapes:** forces Phase 66 buttons to duplicate parsing and state handling.
- **Editor-side animation playback:** breaks the frozen “iframe runtime is sole preview authority” rule.
- **Direct DOM rollback after preview:** misses engine state, gate state, and owner cleanup.
- **Unsupported enum fallback to visible known effect:** violates unknown-value preservation and creates false parity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Effect-specific mini protocols | Separate message families per effect | Shared `preview-effect` / `preview-effect-result` envelope | One request/result parser, one reason-code map, one busy state |
| Visual restore logic | Manual class/style rollback in editor or runtime | Extracted restore helper around engine snapshot + existing cleanup order | DOM-only rollback misses engine/gate state |
| Transition preview controller | New preview-only background animator | `BackgroundLayer.setBackground()` completion path | Phase 64 already owns sequencing and cleanup |
| Button-local status stores | Per-button refs for busy/error/disabled | Central `usePageEditor` effect preview session object | Phase 66 can bind UI without protocol rework |

**Key insight:** Phase 65 should mostly be orchestration reuse, not new rendering logic.

## Common Pitfalls

### Pitfall 1: Previewing stale data because runtime script snapshot never refreshed
**What goes wrong:** The iframe replays an old animation/camera/transition after the editor changed the page.
**Why it happens:** Current `startPreview()` sends a one-time full script snapshot; later edits are not synced automatically.
**How to avoid:** Put the current effect payload on every `preview-effect` request. Do not rely on the runtime’s last loaded page data for single-effect parity.
**Warning signs:** Replay works only if the user restarts full preview first.

### Pitfall 2: Overlapping previews leave classes, gate state, or flash overlays behind
**What goes wrong:** New preview starts before old one fully restores, leaving camera/background/character residue.
**Why it happens:** Runtime owners are separate, but restore ordering is shared.
**How to avoid:** Enforce a single global preview lock and always restore before `accepted` on the replacement request.
**Warning signs:** Rapid replays produce stacked motion classes or active flash overlay after completion.

### Pitfall 3: Transition preview bypasses `BackgroundLayer` and breaks Phase 64 sequencing
**What goes wrong:** Transition replay looks right once but no longer matches live runtime cleanup/gate behavior.
**Why it happens:** Direct class toggles in `main.js` skip `BackgroundLayer`’s completion-aware promise and cleanup.
**How to avoid:** Route transition replay through `BackgroundLayer`; await completion before sending terminal success.
**Warning signs:** `bg-transition-*` classes remain after preview or gate-related tests regress.

### Pitfall 4: Restore only re-renders current page but does not restore the captured snapshot
**What goes wrong:** Preview ends on the wrong dialogue index, wrong scene identity, or wrong inherited expression state.
**Why it happens:** `replayCurrentPage()` alone assumes current engine state is still correct.
**How to avoid:** Capture `engine.getState()` before preview and restore it before replaying render state.
**Warning signs:** Expression inheritance or dialogue selection differs after preview cancel/error.

### Pitfall 5: Editor preflight treats unknown enums as “disabled”
**What goes wrong:** Unsupported future values never reach runtime, so the user cannot see the explicit failure reason.
**Why it happens:** Editor conflates “missing config” with “unsupported current value.”
**How to avoid:** Preflight only structural absence; let runtime return `unsupported-effect`.
**Warning signs:** Unknown values silently disable buttons instead of producing failure feedback.

## Implementation Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Effect preview and full play share `isPreviewMode` but need different exit behavior | Editor may stay stuck in iframe or accidentally exit full play | Add `previewSessionType: 'play' | 'effect' | null` now in `usePageEditor` |
| Transition replay with identical outgoing/incoming background is visually invisible | `TRAN-03` passes technically but fails UX | Add runtime-only preview variant styling on the temporary incoming layer |
| Restore helper misses one cleanup branch | PREV-03 fails on cancel/error/supersede even if success path works | Call the same restore helper from complete, cancel, stop, and catch/finally paths |
| Main.js grows more tangled | Hard-to-test message code and regressions | Extract small pure helpers for request parsing, payload validation, and restore orchestration |

## Code Examples

Verified and repo-aligned patterns:

### Editor-side effect preview state owner
```js
// Source basis: src/editor/composables/usePageEditor.js
const previewSessionType = ref(null); // null | 'play' | 'effect'
const activeEffectPreview = ref(null); // { requestId, effectKind, status } | null
const lastEffectPreviewResult = ref(null); // { status, reason } | null

function canPreviewEffect(effectKind, page) {
  if (!isEngineReady.value) return { ok: false, reason: 'engine-not-ready' };
  if (!page) return { ok: false, reason: 'no-page-selected' };
  if (effectKind === 'character' && !page.characters?.some(char => char.animation && char.animation !== 'none')) {
    return { ok: false, reason: 'missing-character-animation' };
  }
  if (effectKind === 'camera' && !page.camera) return { ok: false, reason: 'missing-camera-config' };
  if (effectKind === 'transition' && !page.transition?.type) return { ok: false, reason: 'missing-transition-config' };
  return { ok: true };
}
```

### Runtime restore orchestration
```js
// Source basis: src/main.js replayCurrentPage(), preview stop branch, end branch
async function runEffectPreview(request) {
  const snapshot = engine.getState();

  try {
    postResult(request, 'accepted');
    await playEffectByKind(request);
    restorePreviewSnapshot(snapshot);
    postResult(request, 'completed');
  } catch (error) {
    try {
      restorePreviewSnapshot(snapshot);
    } catch {
      postResult(request, 'failed', 'restore-failed');
      return;
    }
    postResult(request, 'failed', 'runtime-error');
  }
}
```

### Transition preview sequencing without navigation
```js
// Source basis: src/ui/BackgroundLayer.js completion promise + src/main.js gate cleanup
async function previewTransitionEffect(request) {
  cancelPageTransitionGate();
  camera.clear();

  const tempIncoming = {
    image: request.payload.background,
    transition: request.payload.transition.type,
    duration: request.payload.transition.duration,
    previewVariant: 'same-page',
  };

  await background.setBackground(tempIncoming);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `start` / `stop` / `mute` only | Add shared effect replay request/result family on same channel | Phase 65 | Effect buttons can reuse existing iframe bridge |
| Full-page preview as only runtime replay entry | Effect-scoped replay with explicit restore | Phase 65 | Meets ANIM-04 / TRAN-03 without full play |
| Immediate `page_enter` fan-out | Background completion gate before camera/dialogue/choice release | Phase 64 | Transition preview must respect completion semantics |

**Deprecated/outdated:**
- Editor-side fake effect preview — contradicts the frozen iframe-authority rule.
- Per-effect message names — unnecessary protocol branching for Phase 66.

## Open Questions

1. **Should effect preview auto-hide the iframe after terminal success, or stay visible if the user was already in full play mode?**
   - What we know: `PageEditor.vue` currently has a single `isPreviewMode` flag; full play and effect replay need different exit behavior.
   - What's unclear: Whether Phase 66 should support replay buttons while a manual full preview session is already open.
   - Recommendation: Add `previewSessionType` now. Auto-exit only when `previewSessionType === 'effect'`.

2. **Where should pure preview payload builders live?**
   - What we know: editor needs fresh effect payloads, and runtime should not trust stale script snapshots.
   - What's unclear: whether to extend `cinematicContract.js` or add a tiny adjacent shared helper.
   - Recommendation: Prefer a new small pure helper only if `cinematicContract.js` would otherwise mix too many concerns; do not put payload assembly logic in Vue templates.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Test execution, registry checks | ✓ | 24.13.1 | — |
| npm | Package/version verification, `npx vitest` | ✓ | 11.11.1 | — |
| Vitest (repo dependency) | jsdom/wiring tests | ✓ | 4.1.4 | `npx vitest run` |

**Missing dependencies with no fallback:**
- None identified for this phase.

**Missing dependencies with fallback:**
- None identified for this phase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.4` + existing `node:test` for `tests/scriptEngine.test.js` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionPreview.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js` |
| Full suite command | `npx vitest run && node --test tests/scriptEngine.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANIM-04 | Character effect preview sends request, replays via runtime owner, and reports terminal result | unit + wiring | `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js` | ❌ Wave 0 |
| TRAN-03 | Transition preview uses runtime-only temporary variant without navigation mutation and awaits background completion | unit + wiring | `npx vitest run tests/backgroundTransitionPreview.test.js tests/iframeEffectPreviewWiring.test.js` | ❌ Wave 0 |
| PREV-02 | Disabled reasons and runtime failure reasons are explicit and distinct | unit + wiring | `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js` | ❌ Wave 0 |
| PREV-03 | Complete/cancel/error all restore pre-preview editor/runtime state | wiring + regression | `npx vitest run tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js`
- **Per wave merge:** `npx vitest run tests/pageEditorEffectPreviewState.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionPreview.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js`
- **Phase gate:** `npx vitest run && node --test tests/scriptEngine.test.js`

### Wave 0 Gaps
- [ ] `tests/pageEditorEffectPreviewState.test.js` — editor preflight, busy state, requestId/result handling, auto-exit effect session
- [ ] `tests/iframeEffectPreviewWiring.test.js` — `main.js` protocol handlers, preview lock, accepted/completed/cancelled/failed branches
- [ ] `tests/backgroundTransitionPreview.test.js` — temporary transition variant, same-page visibility, cleanup after promise resolves
- [ ] Optional package script: `"test": "npx vitest run && node --test tests/scriptEngine.test.js"` for simpler repeatable execution

## Sources

### Primary (HIGH confidence)
- `.planning/phases/65-iframe-effect-preview-api/65-CONTEXT.md` — locked protocol, restore, and failure-semantics decisions
- `.planning/REQUIREMENTS.md` — `ANIM-04`, `TRAN-03`, `PREV-02`, `PREV-03`
- `.planning/ROADMAP.md` — Phase 65 goal and success criteria
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` — iframe-authority, restore invariants, transition preview model
- `src/editor/composables/usePageEditor.js` — current `start` / `stop` / `mute` protocol and ready handshake handling
- `src/main.js` — preview message handling, cleanup paths, gate sequencing, and `replayCurrentPage()`
- `src/engine/ScriptEngine.js` — `getState()`, `restoreState()`, `resetRenderState()`, `renderCurrentPage()`
- `src/ui/BackgroundLayer.js` — completion-aware sole-owner transition path
- `src/ui/CharacterLayer.js` — character motion owner and cleanup behavior
- `src/ui/CameraController.js` — camera owner and cleanup behavior

### Secondary (MEDIUM confidence)
- `tests/backgroundTransitionWiring.test.js` — locked gate/reset expectations in `main.js`
- `tests/cameraCleanupWiring.test.js` — cleanup ordering expectations around preview/title/end paths
- `tests/characterMotionPlayback.test.js` — owner-specific motion replay/cleanup behavior
- `tests/cameraRuntimePlayback.test.js` — owner-specific camera replay/cleanup behavior
- `package.json`, `vitest.config.js`, `npm view` output on 2026-04-21 — validation stack and package version verification

### Tertiary (LOW confidence)
- None. No unverified web-only claims were used.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - based on current repo dependencies and direct `npm view` verification
- Architecture: MEDIUM - protocol/restore recommendations are strongly grounded in current code, but transition same-page preview visibility still needs implementation validation
- Pitfalls: HIGH - derived directly from existing runtime/editor code paths and locked phase constraints

**Research date:** 2026-04-21
**Valid until:** 2026-05-21
