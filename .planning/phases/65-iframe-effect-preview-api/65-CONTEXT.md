# Phase 65: Iframe Effect Preview API - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

为 v1.4 的角色动画、页面镜头和页面转场补齐 **runtime-backed iframe 单项重播 API**，使编辑器能够在不启动完整试玩流程的前提下，请求运行时只重播一个指定效果，并在结束或取消后恢复到预览前的真实页面状态。

本阶段只交付 **preview protocol + runtime execution + editor preview state plumbing**，不做：
- PageInspector 中完整的动画/镜头/转场配置 UI 扩展（Phase 66）
- skip / auto / load / title-return / preview-stop 的全量高风险回归矩阵（Phase 67）
- 第二套画布假预览、编辑器本地 CSS 假播放、或独立于 iframe 运行时的新预览系统
- 多效果队列、时间轴式连续回放、或跨页面真实导航预演

</domain>

<decisions>
## Implementation Decisions

### Preview protocol shape
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

### Agent's Discretion
- preview result message 的具体命名（例如 `preview-effect:done` vs `preview-finished`）与 payload 字段命名
- `usePageEditor` 中 preview state 是扁平字段还是小型对象状态机
- restore path 内部是直接抽公共 helper，还是围绕现有 `replayCurrentPage()` 做薄封装
- transition 临时副本的最小字段集合与 clone 方式
- Phase 65 测试如何拆成 editor composable contract、runtime message wiring、以及 restore/cleanup regression

</decisions>

<specifics>
## Specific Ideas

- Phase 65 的关键不是再加一个“试玩”入口，而是把 **单项 effect replay** 从“整页启动”里拆出来，形成可被后续 UI 直接调用的稳定 API。
- 为降低 Phase 66 的 UI 成本，当前最好把 reason code 与 request lifecycle 一次性定清楚；后面按钮只负责展示，不应再反推协议。
- 全局单实例 preview lock 是刻意保守的：它比“每类各一个实例”更容易保证 restore 正确，也更符合 v1.4 的低复杂度目标。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/ROADMAP.md` §`Phase 65: Iframe Effect Preview API` — 本 phase 的目标、依赖与 success criteria
- `.planning/REQUIREMENTS.md` — `ANIM-04`, `TRAN-03`, `PREV-02`, `PREV-03`
- `.planning/PROJECT.md` — v1.4 的“预设化、runtime parity、无新依赖”边界

### Upstream decisions
- `.planning/phases/64-background-transition-expansion/64-CONTEXT.md` — `BackgroundLayer` owner、background completion gate、preview/start-stop cleanup 约束
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §`Preview` — iframe 是唯一权威预览路径、单项重播与 restore invariant

### Editor preview plumbing
- `src/editor/composables/usePageEditor.js` — 当前 page preview 的 `start` / `stop` / `mute` 消息、engine ready 握手、preview mode 状态
- `src/editor/views/PageEditor.vue` — iframe 挂载点与 preview overlay stop 按钮
- `src/editor/components/page-editor/CanvasToolbar.vue` — 当前“试玩/停止试玩”入口，可作为后续单项 effect preview 状态呈现参考
- `src/editor/components/page-editor/PageInspector.vue` — 当前 transition 配置消费点，以及后续 effect preview 按钮最可能接入的位置

### Runtime touchpoints
- `src/main.js` §`initPreview()` — iframe preview message handling、现有 `start` / `stop` 生命周期与 cleanup
- `src/main.js` §`replayCurrentPage()` / preview end branch — restore 到当前页稳定态的现有基础
- `src/engine/ScriptEngine.js` — `getState()` / `restoreState()` / `renderCurrentPage()` 与 page event fan-out
- `src/ui/BackgroundLayer.js` — transition sole-owner 与 completion-aware replay 约束

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`usePageEditor` preview bridge**：已经有 iframe ready 握手、`start` / `stop` / `mute` 消息与 preview mode 状态，适合作为单项 effect preview 的 editor-side owner。
- **`main.js` preview bootstrap**：`initPreview()` 已能接收消息、清理 runtime 状态并重渲当前页，是扩展新 preview command 的首选落点。
- **`ScriptEngine.getState()/restoreState()` + `replayCurrentPage()`**：现成可恢复链路已存在，不需要为 Phase 65 自建第三套“回到原页面”机制。
- **Phase 64 gate + cleanup**：background transition gate、preview stop cleanup、camera/background clear 已经到位，单项转场预览应建立在这套基础上而不是绕开。

### Established Patterns
- **Iframe runtime parity first**：现有 title/theme/settings 预览都通过 iframe runtime 走消息同步，本 phase 必须延续这条路线。
- **No editor-side fake playback**：画布与 inspector 负责编辑与静态展示，真正效果只在 runtime 内执行。
- **Compatibility before cleverness**：未知枚举值必须继续保留；预览失败时显式报错，不能用 fallback 动画冒充“看起来能播”。

### Integration Points
- `usePageEditor.js` 需要新增 effect preview command 发送、busy/reason 状态与 runtime 结果处理。
- `main.js` 需要新增 preview message 分发、active preview bookkeeping、cancel/restore helper，并与 `start` / `stop` / preview-end 生命周期连通。
- `ScriptEngine.js`、`BackgroundLayer.js`、`CharacterLayer` / `CameraController` 的现有 owner 语义将决定每类 preview 的最小 payload 和 replay 方式。

</code_context>

<deferred>
## Deferred Ideas

- PageInspector 中动画下拉框、镜头配置区、转场配置区的具体按钮布局与文案 —— 留到 Phase 66
- 多 preview 并行、preview 队列、自动连续重播 —— 明确超出 v1.4 范围
- skip / auto / load / title-return / rapid replay 的全量残留矩阵验证 —— 留到 Phase 67
- 把 effect preview 扩展成时间轴级“片段预演器” —— 不属于本次里程碑

</deferred>

---

*Phase: 65-iframe-effect-preview-api*
*Context gathered: 2026-04-21*
