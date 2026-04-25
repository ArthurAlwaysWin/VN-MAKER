# Phase 63: Camera Runtime & Shared Cleanup - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

为 v1.4 页面级镜头效果建立运行时基础，实现：

1. 页面可携带单个 `camera` 配置进入 runtime。
2. 运行时可在 `#stage-layer` 上播放 `shake`、`zoom`、`pan`、`flash` 四类页面级镜头效果。
3. 镜头状态可在 replay、load、title return、preview end、end 等现有清理入口可靠清除。

本阶段只做 **runtime + shared cleanup foundation**，不做：
- 编辑器镜头配置 UI（Phase 66）
- iframe 单项镜头 replay API（Phase 65）
- 背景转场扩展（Phase 64）
- skip/auto/load/title-return 全量高风险回归收口（Phase 67）

</domain>

<decisions>
## Implementation Decisions

### owner 与作用域
- **D-01:** 新增独立 `CameraController` 作为页面镜头 owner，不把镜头逻辑塞进 `BackgroundLayer`、`CharacterLayer` 或 `ScriptEngine`。
- **D-02:** `CameraController` 只绑定 `#stage-layer`，延续 Phase 61 冻结的舞台 ownership；对话框、标题页、菜单、设置页及其他 overlay 保持在舞台层外。
- **D-03:** `main.js` 继续负责 orchestration，在 replay、load、return-to-title、preview end、game end 等既有 reset 入口统一调用镜头 cleanup。

### 触发与并发模型
- **D-04:** 页面镜头只在 `page_enter` 后触发一次，不新增中途镜头指令，也不在角色/对话事件里二次触发。
- **D-05:** 同一时刻只允许一个页面级镜头活跃；新页面镜头触发前必须先清理旧镜头。
- **D-06:** 首版不做镜头队列、串联播放、条件触发或时间轴。

### 效果合同
- **D-07:** 首版运行时支持 4 个页面级镜头：`shake`、`zoom`、`pan`、`flash`。
- **D-08:** 参数合同沿用 v1.4 spec：`durationMs`、`intensity`、`direction`，其中 `zoom/flash` 不使用 `direction`。
- **D-09:** `trigger` 在 v1.4 runtime 固定为 `onEnter`；即使字段存在，也不开放其他触发语义。

### 视觉实现边界
- **D-10:** `shake`、`zoom`、`pan` 直接作用在 `#stage-layer` 本体，不影响舞台外 UI。
- **D-11:** `flash` 不复用 `#ui-overlay`，而是在舞台层内部新增专用 flash overlay，确保闪白/闪黑只覆盖舞台画面。
- **D-12:** 镜头实现可使用 transform / opacity / filter / CSS variables 等 DOM/CSS 路线，但不得引入新动画依赖。

### 兼容与 cleanup
- **D-13:** 未知 `camera.effect` 值继续按 Phase 61 兼容契约原样保留；runtime 遇到未知值时 safe no-op，不抛错。
- **D-14:** skip / 快速切页下镜头效果优先安全降级为 0ms 或 no-op，保证页面推进与清理确定性。
- **D-15:** 本阶段必须交付 shared cleanup 能力，保证 replay、load、title、preview end、game end 至少不会残留 transform / flash / filter 状态。

### Agent's Discretion
- `CameraController` 的文件位置、内部状态结构与 helper 拆分
- `shake/zoom/pan` 用 class、CSS vars 还是 inline style 驱动的具体方式
- `flash` overlay 用单节点还是双态 class 的实现细节
- cleanup 是集中 helper 还是 controller 内部多方法路由
- 测试拆成 controller 单测、main.js 集成测，还是两者混合

</decisions>

<specifics>
## Specific Ideas

- 这一步的重点不是把镜头做得“多炫”，而是先把 **单镜头 owner + shared cleanup** 打牢，否则后面 preview/skip/load/title 很容易出现脏舞台。
- `flash` 是最容易误伤 UI 可读性的效果，所以必须明确限制在 stage 内，而不能偷懒挂到 `#ui-overlay` 或 `#game-container`。
- Phase 62 已经把角色 motion 和 layout 分开，Phase 63 要继续维持“camera → stage、character motion → character-motion、dialogue/ui → stage 外”的 ownership 分层。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/ROADMAP.md` §v1.4 / `Phase 63: Camera Runtime & Shared Cleanup`
- `.planning/REQUIREMENTS.md` — `CAM-01`, `CAM-02`, `CAM-03`, `CAM-04`
- `.planning/PROJECT.md` — v1.4 目标与无新依赖约束

### Upstream context
- `.planning/phases/61-contract-freeze-visual-ownership/61-CONTEXT.md` — `#stage-layer` scope、ScriptEngine emitter-only、camera ownership boundary
- `.planning/phases/62-character-preset-runtime-foundation/62-CONTEXT.md` — page-enter trigger philosophy、runtime cleanup precedence、快速切页安全降级
- `.planning/phases/62-character-preset-runtime-foundation/62-01-SUMMARY.md` — show_character animation contract 已完成，camera 不能接管角色 runtime ownership
- `.planning/phases/62-character-preset-runtime-foundation/62-02-SUMMARY.md` — CharacterLayer cleanup 路线与 `.character-motion` ownership 已固定

### Spec and runtime touchpoints
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Camera Effects — canonical camera presets、data model、runtime responsibility、lifecycle
- `src/main.js` — visual event wiring、replay/title/load/end/preview 清理入口
- `src/style.css` — `#stage-layer` / `#ui-overlay` stacking 和后续 flash overlay 样式承接点
- `src/engine/ScriptEngine.js` — `page_enter` 发射点与页面 payload 透传
- `src/shared/cinematicContract.js` — camera default / unknown-value compatibility contract
- `src/ui/BackgroundLayer.js` — 可参考其 clear() / 双层切换风格，但 camera 不能并入该 owner

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`#stage-layer`**：Phase 61 已落地，天然是 camera 的唯一作用域。
- **`main.js` 多个清理入口**：已经在 replay、title、preview end、end 等路径集中调用 `characters.clear()`、`background.clear()`、`engine.resetRenderState()`，适合接入 camera cleanup。
- **BackgroundLayer clear pattern**：虽然 owner 不同，但 `clear()` 风格可作为 camera reset API 的一致性参考。

### Established Patterns
- **ScriptEngine emitter-only**：页面 runtime 契约由引擎发射，视觉编排由专门 owner 消费。
- **未知枚举兼容优先**：Phase 61 已固定 camera unknown-value preservation，本 phase 不得把未知值静默改写。
- **快速切页正确性优先**：Phase 62 已确定 skip 下允许 no-op/0ms 以换取干净状态，camera 继续沿用。

### Integration Points
- `engine.on('page_enter', ...)` 是 camera on-enter 触发的正确接线点。
- `replayCurrentPage()`、`gameMenu.onTitle`、`engine.on('end')`、preview 停止/恢复路径都需要补 camera cleanup。
- `style.css` 现有层级已把 `#ui-overlay` 放在 stage 外，适合新增 stage-local flash overlay 而不污染全局 UI。

</code_context>

<deferred>
## Deferred Ideas

- PageInspector 镜头配置表单、direction/intensity 控件与未知 camera UI —— 留到 Phase 66
- iframe 单镜头 replay command / ack / restore 语义 —— 留到 Phase 65
- skip / auto / load / title-return 全量残留矩阵验证 —— 留到 Phase 67
- 多镜头串联、条件触发、timeline camera language —— 明确超出 v1.4 范围

</deferred>

---

*Phase: 63-camera-runtime-shared-cleanup*
*Context gathered: 2026-04-21*
