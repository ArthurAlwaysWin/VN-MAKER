# Phase 67: Integration & Regression Gate - Research

**Researched:** 2026-04-21
**Domain:** Cinematic runtime cleanup and focused regression gating
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Cleanup ownership
- **D-01:** Phase 67 不新增第四个“统一清理控制器”；继续沿用既有 ownership：`CharacterLayer` 清角色 motion，`CameraController` 清 stage transform / flash，`BackgroundLayer` 清背景过渡状态，`main.js` 负责在高风险流入口统一编排调用。
- **D-02:** 若回归中发现残留问题，优先修补现有 `clear()` / reset / restore 路径和调用时机，而不是重写 owner 边界或引入新的 runtime lifecycle。
- **D-03:** `usePageEditor` 与 `preview-effect` 协议保持 Phase 65/66 已冻结语义；Phase 67 只验证并修补 stop / supersede / restore cleanliness，不改协议形状。

### High-risk flow scope
- **D-04:** 本阶段锁定的高风险流为：`skip`、`auto`、`load`、`return-to-title`、`preview-effect-stop`、快速重播/同类 supersede；planner 不要把范围扩成“所有可能路径”。
- **D-05:** `replayCurrentPage()`、preview restore、title return、game end、load 成功后的重渲染，都是应被纳入验证矩阵的关键入口，因为它们已经承担 cleanup/restore 责任。
- **D-06:** 对这些高风险流，正确性优先于“效果必须完整播完”；必要时允许安全降级为 cut / no-op / immediate clear，只要用户最终看不到残留状态。

### Regression strategy
- **D-07:** Phase 67 以自动化回归为主，重点是 `main.js` 的 wiring/integration 测试与 owner cleanup 测试，不把阶段验收建立在手工试玩之上。
- **D-08:** 允许在同一 phase 内做**小而必要的 cleanup 修复**来让回归通过；但修复必须直接服务于 PREV-05，不能借机扩 scope。
- **D-09:** 回归应覆盖“停止一个效果后再开始下一个效果”和“跨不同 flow 退出后重新进入稳定态”两类问题，而不是只测单条 happy path。

### Preview-stop and supersede semantics
- **D-10:** `preview-effect-stop`、新请求 supersede、restore-failed 之外的正常结束，都必须回到同一个“干净稳定页态”定义：无遗留角色 motion、无 stage camera class/transform、无 flash overlay、无残留 transition class。
- **D-11:** Rapid replay 继续沿用“旧预览先取消并恢复，再接受新预览”的契约；Phase 67 只验证这条契约在视觉状态上成立，不重设计锁机制。

### Phase boundary clarifications
- **D-12:** 若发现 PageInspector 写入了轻微脏数据但不影响 PREV-05 清理目标，不应在本阶段顺手演变成 editor UX phase 2；只处理直接导致 cleanup/regression 失败的问题。
- **D-13:** 本阶段的完成标准是“用户再也看不到残留演出状态”，不是“新增更多回归基础设施”或“把所有历史路径都重构成统一框架”。

### the agent's Discretion
- 回归测试拆分为 `main.js` wiring、owner 单测还是 focused integration suite 的具体粒度
- 哪些现有测试文件扩展，哪些新建专门的 Phase 67 regression 文件
- 修复是补 `clear()` 调用点、加 guard、还是统一小 helper，只要不打破 owner 边界即可

### Deferred Ideas (OUT OF SCOPE)
- 更大范围的全局 runtime lifecycle 重构 —— 仅当现有 owner + wiring 路线证明不够时再考虑
- 新的 preview queue、并行 preview、时间轴预演器 —— 超出 v1.4
- 与 PREV-05 无关的 editor UX 二次打磨 —— 留到后续 milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PREV-05 | 播放者在跳过、自动、读档、返回标题和停止预览等流程中，不会看到残留的动画类、镜头状态或闪屏覆盖层。 | High-risk flow map, cleanup-owner matrix, focused regression suite plan, and validation commands below directly target skip/auto/load/title/preview-stop/supersede residue. |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- Keep the existing stack: JavaScript ES Modules + Vue 3 + Electron; do not migrate to TypeScript.
- Runtime code stays vanilla JS classes; editor code stays Vue SFCs with `<script setup>`.
- Use explicit `.js` extensions for JS imports.
- Engine/UI JS modules use named exports; no default exports in JS files.
- Keep one class per engine/UI file with PascalCase filenames.
- Follow existing style: 2 spaces, semicolons, single quotes, trailing commas.
- Prefer focused edits inside existing ownership boundaries; do not invent parallel systems.
- Handle failures at boundaries instead of throwing uncaught errors.
- Preserve existing security conventions (`sanitizeCssValue`, clamping, IPC/path guards); Phase 67 should not bypass them.
- Stay inside the GSD workflow; do not make ad-hoc architecture changes outside planned scope.

## Summary

Phase 67 should be treated as a quality gate on top of already-shipped owners, not as another cinematic feature phase. The runtime already has the right cleanup primitives: `CharacterLayer.clear()` / `_clearMotion()`, `CameraController.clear()`, `BackgroundLayer.clear()` / `_cancelActiveTransition()`, plus `main.js` orchestration through `replayCurrentPage()`, `restorePreviewSnapshot()`, preview stop handlers, and title/load/end flows.

The main risk is not missing capability; it is uneven coverage across interruption paths. Existing tests already lock background gating, camera cleanup wiring, effect-preview restore semantics, and owner-local cleanup. The biggest remaining gap is a PREV-05 matrix that explicitly proves the high-risk entrypoints stay symmetric across skip, auto, load, title return, preview-stop, and rapid replay without expanding scope into manual QA or architecture rewrite.

**Primary recommendation:** Add one focused Phase 67 regression suite for cross-flow lifecycle symmetry, extend the existing owner/wiring tests only where the matrix exposes a concrete cleanup gap, and keep all fixes inside current owners plus `main.js` call timing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 24.13.1 | Executes local regression commands | Verified available in the project environment |
| Vitest | 4.1.4 | Primary regression runner for wiring and jsdom suites | Already used across cinematic tests |
| jsdom | 29.0.2 | DOM test environment for owner cleanup assertions | Existing owner tests already rely on it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:test | built-in | Legacy engine-only tests (`tests/scriptEngine.test.js`) | Keep for pure engine logic; not the main PREV-05 vehicle |
| Vue 3 | 3.5.31 | Editor composable coverage (`usePageEditor`) | Only for editor-side preview stop/state assertions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Focused Vitest regressions | Broad manual QA checklist | Too slow and non-deterministic for PREV-05 |
| Existing owner + `main.js` cleanup paths | New global cleanup controller | Violates locked ownership and expands scope |
| String-wiring + jsdom tests | Browser e2e harness | Higher setup cost with low extra value for this bounded gate |

**Installation:**
```bash
npm install
```

**Version verification:** Verified locally on 2026-04-21 via `node --version`, `npm --version`, and `npx vitest --version` → Node `v24.13.1`, npm `11.11.1`, Vitest `4.1.4`.

## High-Risk Flow Map

| Flow | User-facing entrypoint | Runtime entrypoint(s) that matter | Cleanup path that must stay authoritative | Residue risk |
|------|------------------------|-----------------------------------|-------------------------------------------|-------------|
| Skip | Quick bar skip / skip loop | `startSkip()`, `engine.on('set_background')`, `handlePageEnterEffects()` | Skip branches force `background.setBackground(...cut...)`, `camera.clear()`, and skip-aware character replay | Stage camera or motion residue during fast page churn |
| Auto | Quick bar auto | `toggleAuto()`, `startAutoTimer()`, `stopAuto()`, `engine.next()` | Same page-enter gate as normal play; `stopAuto()` must win on exits | Stale auto callback advancing after load/title/restore |
| Load / Quick Load | SaveLoad UI / quick load | `saveLoadScreen.onLoad`, `quickBar.onQuickLoad`, `replayCurrentPage()` | `replayCurrentPage()` → `cancelPageTransitionGate()` + `camera.clear()` + `characters.clear()` + `background.clear()` + `engine.resetRenderState()` + `engine.renderCurrentPage()` | Old motion/camera/background state surviving restore |
| Return to title | Menu title / end-to-title | `gameMenu.onTitle`, normal `engine.on('end')` branch | Direct cleanup chain before `showTitle()` | Flash overlay, stage transform, or background transition lingering under title |
| Preview stop (full play) | Editor overlay stop button | `usePageEditor.stopPreview()` → runtime `case 'stop'` | Full preview stop branch in `initPreview()` | Preview iframe keeps dirty stage before returning to editor |
| Preview stop / supersede (effect) | Editor stop / replay button mashing | `preview-effect-stop`, `preview-effect`, `cancelActiveEffectPreview()`, `restorePreviewSnapshot()` | `restorePreviewSnapshot()` is the single restore-safe path | Same-page preview classes or motion residue between effect replays |

### Exact high-risk lifecycle entrypoints to verify

1. **`replayCurrentPage()`** in `src/main.js` is the shared load/re-render gate and already clears camera, characters, background, then resets render state before `engine.renderCurrentPage()`.
2. **`restorePreviewSnapshot()`** is the shared effect-preview restore path and already calls `cancelPageTransitionGate()`, `stopAuto()`, `stopSkip()`, hides dialogue/choice UI, clears camera/voice/characters/background, then restores state and re-renders.
3. **`cancelActiveEffectPreview()`** is the supersede/stop choke point; PREV-05 depends on it finishing restore before the next effect is accepted.
4. **Preview runtime `case 'stop'` and `case 'preview-effect-stop'`** are distinct and both must stay clean.
5. **`gameMenu.onTitle` and `engine.on('end')`** are the title-return and post-end cleanup paths.
6. **`engine.on('page_enter')` + `engine.on('set_background')` + `flushPageTransitionGate()`** define the sequencing contract: background transition first, then characters, then page camera, then dialogue/choice.

## Existing Integration Points / Reusable Tests

### Best existing files to extend

| File | Extend For | Why |
|------|------------|-----|
| `tests/backgroundTransitionWiring.test.js` | Skip cut behavior, replay/title/preview/end cleanup symmetry | Already owns the page-transition gate and background-release order |
| `tests/cameraCleanupWiring.test.js` | Load/title/replay cleanup ordering and skip camera no-op behavior | Already pins `main.js` cleanup call order |
| `tests/iframeEffectPreviewWiring.test.js` | `preview-effect-stop`, supersede, restore-busy, restore-failed sequencing | Already owns preview lifecycle wiring |
| `tests/pageEditorEffectPreviewState.test.js` | Editor-side stop message and provenance-safe terminal state after stop | Keeps Phase 67 bounded to existing preview protocol |
| `tests/characterMotionPlayback.test.js` | Mid-motion clear/hide/replay residue assertions | Owns `.character-motion` cleanup behavior |
| `tests/cameraRuntimePlayback.test.js` | Rapid re-entry and clear-after-flash cases | Owns `CameraController.clear()` cleanliness |
| `tests/backgroundTransitionPreview.test.js` | Same-page preview interruption cleanup | Owns preview-only transition classes and stale imagery cleanup |

### New focused suites worth adding

| New Suite | Purpose | Why new instead of stuffing old files |
|-----------|---------|---------------------------------------|
| `tests/cinematicRegressionGate.test.js` | One PREV-05 matrix over `main.js` high-risk flows: skip, auto, load, title, preview-stop, supersede | Existing suites are fragmented by subsystem; Phase 67 needs one bounded acceptance view |
| `tests/cinematicCleanupOwnership.test.js` *(only if failures demand it)* | Cross-owner interruption cases discovered during implementation | Add only if a failing PREV-05 fix cannot be expressed in existing owner tests |

### Current evidence already in place

- `tests/backgroundTransitionWiring.test.js` proves deferred page-enter fan-out, gate cancellation, replay/title/preview/end cleanup hooks, and snapshot restore re-entry.
- `tests/cameraCleanupWiring.test.js` proves `CameraController` is cleared on replay/load/title/preview/end paths.
- `tests/iframeEffectPreviewWiring.test.js` proves `preview-effect-stop`, supersede, snapshot restore, and explicit `accepted/completed/cancelled/rejected/failed` semantics.
- Owner-local jsdom tests already prove `CharacterLayer`, `CameraController`, and `BackgroundLayer` can clean themselves when called correctly.
- Focused command run on 2026-04-21 passed: 7 files / 43 tests for the current cinematic regression surface.

## Architecture Patterns

### Recommended Project Structure
```text
tests/
├── cinematicRegressionGate.test.js      # New Phase 67 cross-flow acceptance matrix
├── backgroundTransitionWiring.test.js   # Extend for background gate cleanup symmetry
├── cameraCleanupWiring.test.js          # Extend for title/load/replay ordering
├── iframeEffectPreviewWiring.test.js    # Extend for stop/supersede/restore contracts
├── characterMotionPlayback.test.js      # Extend only if owner cleanup bug is exposed
├── cameraRuntimePlayback.test.js        # Extend only if owner cleanup bug is exposed
└── backgroundTransitionPreview.test.js  # Extend only if same-page preview residue bug is exposed
```

### Pattern 1: Cleanup-first re-entry
**What:** Every risky re-entry path should funnel through existing cleanup-first helpers before re-rendering.
**When to use:** Load, quick load, preview restore, title return, end-to-title, or any PREV-05 bug fix.
**Example:**
```javascript
// Source: src/main.js
function replayCurrentPage() {
  cancelPageTransitionGate();
  camera.clear();
  characters.clear();
  background.clear();
  engine.resetRenderState();
  engine.renderCurrentPage();
}
```

### Pattern 2: Sole-owner cleanup, centralized only at call sites
**What:** `main.js` orchestrates; owners clean their own layer.
**When to use:** Any fix for residual classes, transforms, flash overlays, or transition residue.
**Example:**
```javascript
// Source: src/main.js
async function restorePreviewSnapshot(snapshot) {
  previewRestorePending = true;
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

### Pattern 3: Gate sequencing before page-enter effects
**What:** Background transition completion releases character motion first, then page camera, then UI.
**When to use:** Any PREV-05 fix touching skip/auto/load replay semantics.
**Example:**
```javascript
// Source: src/main.js
function flushPageTransitionGate(token = pageTransitionToken) {
  if (!pageTransitionGateOpen) return;
  if (token !== pageTransitionToken) return;

  const pageEnterData = pendingPageEnter;
  const characterEvents = pendingCharacterEvents;
  const uiEvent = pendingUiEvent;

  pendingPageEnter = null;
  pendingCharacterEvents = [];
  pendingUiEvent = null;
  pageTransitionGateOpen = false;

  for (const event of characterEvents) {
    playCharacterEvent(event.type, event.data);
  }
  if (pageEnterData) handlePageEnterEffects(pageEnterData);
  if (uiEvent?.type === 'dialogue') showDialogueEvent(uiEvent.data);
}
```

### Anti-Patterns to Avoid

- **New cleanup controller:** Violates locked ownership and increases scope.
- **Manual-QA-first acceptance:** PREV-05 needs deterministic automation, not human memory.
- **Editor-side fake cleanup:** Preview cleanliness must still be proven by runtime restore, not by UI-only state resets.
- **Broad refactor of lifecycle:** Phase 67 should patch call timing, not redesign runtime flow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-flow cleanup | New “cinematic reset manager” | Existing `replayCurrentPage()`, `restorePreviewSnapshot()`, and owner `clear()` methods | Ownership is already frozen and tested |
| Preview stop UI state | A second preview state machine | `usePageEditor.stopPreview()` + existing `preview-effect` protocol | Phase 65/66 already froze protocol semantics |
| Regression proof | Big manual playbook or e2e harness | Focused Vitest wiring + jsdom suites | Faster, already established, good enough for PREV-05 |
| Transition interruption cleanup | DOM diff rollback system | `BackgroundLayer._cancelActiveTransition()` / `clear()` | Current owner already knows preview-only classes and CSS vars |

**Key insight:** PREV-05 is a composition problem, not a capability problem. The safest work is to prove and tighten the current cleanup graph, not to invent a new one.

## Risks / Likely Failure Modes

### Pitfall 1: Load-path asymmetry around auto mode
**What goes wrong:** `quickBar.onQuickLoad` explicitly stops auto/skip before restore, but `saveLoadScreen.onLoad` restores and replays without a local `stopAuto()`.
**Why it happens:** Normal load currently relies on caller context; quick load does not.
**How to avoid:** Add a failing regression first. If residue or stale advancement appears, fix the normal load entrypoint rather than widening scope.
**Warning signs:** Replay path is clean in tests, but load-from-menu still advances or races after restore.

### Pitfall 2: Same-page transition preview interruption residue
**What goes wrong:** Preview-only classes or outgoing imagery survive when a transition preview is interrupted by stop/supersede.
**Why it happens:** Same-page preview uses extra classes and CSS vars beyond normal transition playback.
**How to avoid:** Reuse `restorePreviewSnapshot()` and `BackgroundLayer.clear()`; extend `backgroundTransitionPreview.test.js` only if the PREV-05 matrix exposes a miss.
**Warning signs:** Visible dimmed layer, stale `bg-preview-same-page*` classes, or old background image after stop.

### Pitfall 3: Preview supersede starts before restore is finished
**What goes wrong:** Rapid replay can stack visible residue if the new effect starts before the prior restore completes.
**Why it happens:** Supersede is asynchronous and depends on `cancelActiveEffectPreview()` finishing.
**How to avoid:** Keep `previewRestorePending` / `cancelActiveEffectPreview()` semantics intact and pin them in tests.
**Warning signs:** Second effect begins with stale motion class, flash overlay, or old transition class already present.

### Pitfall 4: Owner tests pass but orchestration order regresses
**What goes wrong:** Each owner cleans itself, but `main.js` stops calling them in the right order.
**Why it happens:** PREV-05 is mostly integration glue, not owner-local logic.
**How to avoid:** Add one explicit cross-flow matrix test over `main.js`.
**Warning signs:** Owner jsdom tests stay green while runtime flows still leave residue.

### Pitfall 5: Preview full-stop and effect-stop drift apart
**What goes wrong:** Full preview `stop` stays clean, but effect preview stop/supersede restores differently.
**Why it happens:** They use different runtime branches.
**How to avoid:** Treat both as PREV-05 acceptance surfaces and keep them in the same phase matrix.
**Warning signs:** Editor overlay stop works for play preview but not for single-effect replay.

## Recommended Implementation Slices

### Slice 1: Lock the PREV-05 matrix before touching runtime
- Add `tests/cinematicRegressionGate.test.js` covering the exact high-risk entrypoints and expected cleanup funnel.
- Extend `iframeEffectPreviewWiring.test.js` for stop/supersede edge assertions not already pinned.
- Extend `cameraCleanupWiring.test.js` / `backgroundTransitionWiring.test.js` only where the new matrix reveals missing symmetry.

### Slice 2: Make the smallest orchestration fixes
- Fix only the `main.js` call sites that fail the new matrix.
- Prefer calling existing helpers (`stopAuto`, `stopSkip`, `cancelPageTransitionGate`, `replayCurrentPage`, `restorePreviewSnapshot`) over adding new abstractions.

### Slice 3: Patch owner-local cleanup only if a matrix failure proves it
- If motion residue survives despite correct orchestration, extend `CharacterLayer` tests and patch `_clearMotion()` / interruption paths.
- If flash or transform residue survives, extend `CameraController` tests and patch `clear()`.
- If preview-only transition residue survives, extend `BackgroundLayer` preview tests and patch `_cancelActiveTransition()` / `clear()`.

### Slice 4: Close the gate with focused validation
- Run the focused cinematic suite first.
- Then run the full Vitest suite to confirm no v1.4 regressions escaped.
- Do not add broad manual QA unless an automated gap remains genuinely impossible to express.

## Code Examples

Verified patterns from the current codebase:

### Preview-stop restore path
```javascript
// Source: src/main.js
async function cancelActiveEffectPreview(status = 'cancelled', reason = null, cancelDetail = 'superseded') {
  const preview = activeEffectPreview;
  if (!preview) return;

  activeEffectPreview = null;
  await restorePreviewSnapshot(preview.snapshot);
  postEffectPreviewResult({
    requestId: preview.requestId,
    effectKind: preview.effectKind,
    status,
    reason,
    cancelDetail,
  });
}
```

### Character owner cleanup
```javascript
// Source: src/ui/CharacterLayer.js
_clearMotion(entry) {
  if (entry._motionTimer) {
    clearTimeout(entry._motionTimer);
    entry._motionTimer = null;
  }
  if (entry._motionEndHandler) {
    entry.motion.removeEventListener('animationend', entry._motionEndHandler);
    entry._motionEndHandler = null;
  }
  if (entry._motionClass) {
    entry.motion.classList.remove(entry._motionClass);
    entry._motionClass = null;
  }
}
```

### Camera owner cleanup
```javascript
// Source: src/ui/CameraController.js
clear() {
  if (this._timer) {
    clearTimeout(this._timer);
    this._timer = null;
  }
  this.stageLayer.classList.remove(...EFFECT_CLASSES);
  this.stageLayer.style.transform = '';
  this.stageLayer.style.filter = '';
  this._flashOverlay.classList.remove('active');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Feature-by-feature runtime additions | Owner-split cleanup plus explicit replay/restore paths | Phases 62-65 | Phase 67 can verify composition instead of inventing systems |
| Preview as a broad play-only flow | Explicit `preview-effect` / `preview-effect-stop` lifecycle | Phase 65 | Stop/supersede behavior can now be tested directly |
| Implicit page-enter fan-out | Background completion gate before character/camera/UI release | Phase 64 | PREV-05 has a stable sequencing point to guard |

**Deprecated/outdated:**
- Broad “manual replay until it looks clean” validation — replace with focused automated regression evidence.

## Open Questions

1. **Should `saveLoadScreen.onLoad` explicitly call `stopAuto()` for symmetry with quick load?**
   - What we know: `quickBar.onQuickLoad` hard-stops auto/skip locally; `saveLoadScreen.onLoad` does not.
   - What's unclear: whether current caller context already guarantees auto is off in all normal-load cases.
   - Recommendation: make this a first failing regression candidate; patch only if the new PREV-05 matrix proves drift.

2. **Do existing tests stay readable if everything is shoved into current files?**
   - What we know: current suites are organized by subsystem and already fairly dense.
   - What's unclear: whether the remaining PREV-05 acceptance view fits cleanly without a dedicated suite.
   - Recommendation: add one small `tests/cinematicRegressionGate.test.js` acceptance file rather than bloating unrelated tests.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest execution | ✓ | 24.13.1 | — |
| npm | Running local commands | ✓ | 11.11.1 | — |
| Vitest | Primary validation runner | ✓ | 4.1.4 | — |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + jsdom 29.0.2 |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/cinematicRegressionGate.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js tests/pageEditorEffectPreviewState.test.js tests/characterMotionPlayback.test.js tests/cameraRuntimePlayback.test.js tests/backgroundTransitionPreview.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREV-05 | Skip/auto/load/title return clear stage state before stable re-entry | integration | `npx vitest run tests/cinematicRegressionGate.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js` | ❌ Wave 0 |
| PREV-05 | Effect preview stop/supersede restore a clean stable page | integration | `npx vitest run tests/cinematicRegressionGate.test.js tests/iframeEffectPreviewWiring.test.js tests/pageEditorEffectPreviewState.test.js` | ❌ Wave 0 / ✅ existing support |
| PREV-05 | Owners remove local residue when interrupted | unit/jsdom | `npx vitest run tests/characterMotionPlayback.test.js tests/cameraRuntimePlayback.test.js tests/backgroundTransitionPreview.test.js` | ✅ |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/cinematicRegressionGate.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js`
- **Per wave merge:** `npx vitest run tests/cinematicRegressionGate.test.js tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js tests/pageEditorEffectPreviewState.test.js tests/characterMotionPlayback.test.js tests/cameraRuntimePlayback.test.js tests/backgroundTransitionPreview.test.js`
- **Phase gate:** `npx vitest run`

### Wave 0 Gaps
- [ ] `tests/cinematicRegressionGate.test.js` — PREV-05 cross-flow acceptance matrix over skip/auto/load/title/preview-stop/supersede
- [ ] Add explicit assertion for any discovered load/auto asymmetry before patching runtime

## Canonical References

- `.planning/ROADMAP.md` §Phase 67 — goal, dependencies, and success criteria
- `.planning/REQUIREMENTS.md` — `PREV-05`
- `.planning/phases/67-integration-regression-gate/67-CONTEXT.md` — locked scope and ownership constraints
- `.planning/phases/62-character-preset-runtime-foundation/62-CONTEXT.md` — character cleanup ownership
- `.planning/phases/63-camera-runtime-shared-cleanup/63-CONTEXT.md` — camera cleanup ownership
- `.planning/phases/64-background-transition-expansion/64-CONTEXT.md` — transition gate and cleanup strategy
- `.planning/phases/65-iframe-effect-preview-api/65-CONTEXT.md` — preview stop/supersede/restore semantics
- `.planning/phases/66-editor-controls-compatibility-ux/66-CONTEXT.md` and `66-01/66-02-SUMMARY.md` — real editor entrypoints and scoped preview UI contract
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` — lifecycle order and preview invariants
- `src/main.js`, `src/ui/CharacterLayer.js`, `src/ui/CameraController.js`, `src/ui/BackgroundLayer.js`, `src/editor/composables/usePageEditor.js`

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` — Phase 67 success criteria and dependency boundary
- `.planning/REQUIREMENTS.md` — `PREV-05` acceptance target
- `.planning/phases/67-integration-regression-gate/67-CONTEXT.md` — locked implementation scope
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` — lifecycle invariants and preview rules
- `src/main.js` — actual cleanup orchestration
- `src/ui/CharacterLayer.js` — motion cleanup implementation
- `src/ui/CameraController.js` — stage transform/flash cleanup implementation
- `src/ui/BackgroundLayer.js` — transition cleanup implementation
- `src/editor/composables/usePageEditor.js` — editor stop/supersede message wiring
- `tests/backgroundTransitionWiring.test.js`, `tests/cameraCleanupWiring.test.js`, `tests/iframeEffectPreviewWiring.test.js`, `tests/pageEditorEffectPreviewState.test.js`, `tests/characterMotionPlayback.test.js`, `tests/cameraRuntimePlayback.test.js`, `tests/backgroundTransitionPreview.test.js`

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing local toolchain verified directly
- Architecture: HIGH - derived from current code and locked phase contexts
- Pitfalls: MEDIUM-HIGH - mostly verified in code; one load/auto asymmetry still needs a failing regression to confirm impact

**Research date:** 2026-04-21
**Valid until:** 2026-05-21
