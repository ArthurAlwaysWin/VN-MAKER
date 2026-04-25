# Phase 64: Background Transition Expansion - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

为 v1.4 页面转场补齐更丰富的背景过渡能力，实现：

1. 页面转场类型从现有 `none` / `fade` / `slide-*` 扩展到至少 7 种可区分效果。
2. 新增转场至少覆盖 `dissolve`、`wipe`、`scale`、`blur`，并保持旧项目 `fade` / `slide-*` / `none` 兼容。
3. 页面切换时先完成旧页面退出与背景转场，再进入角色动画与页面镜头，稳定满足 Phase 64 的 page-enter 顺序要求。

本阶段只做 **runtime + shared contract + sequencing foundation**，不做：
- iframe 单项转场 replay API（Phase 65）
- PageInspector 扩展 UI 之外的新编辑模式（Phase 66）
- skip / auto / load / title-return 的全量高风险残留矩阵（Phase 67）
- 多段串联转场、方向可配置 wipe、shader/canvas 级转场系统

</domain>

<decisions>
## Implementation Decisions

### owner 与系统边界
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

### Agent's Discretion
- `BackgroundLayer` 是否扩展为 promise/回调式完成信号，还是通过现有定时结构暴露 transition completion
- 各转场对应的具体 class 命名、CSS variables 与 keyframes 设计
- `dissolve` 与 `fade` 的区分手法（opacity + blur / brightness / subtle scale 等）
- sequencing 落点是 `ScriptEngine` 事件拆分，还是 `main.js` 对 page-enter fan-out 的延迟编排
- 测试拆分为 shared contract、BackgroundLayer jsdom、main.js sequencing 回归的具体粒度

</decisions>

<specifics>
## Specific Ideas

- 这一步的重点不是“再加几个花哨 class”，而是把 **transition owner + page-enter sequencing** 钉牢；否则 character/camera 已完成的边界会被新转场打乱。
- `scale` 命名已经和用户确认，后续 planner/implementer 不要再回到 `zoom transition` 的旧叫法。
- `wipe` / `dissolve` 首版都应保持预设化、低参数路线，避免把 v1.4 拖成可编程转场系统。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/ROADMAP.md` §v1.4 / `Phase 64: Background Transition Expansion`
- `.planning/REQUIREMENTS.md` — `TRAN-01`, `TRAN-02`, `TRAN-04`
- `.planning/PROJECT.md` — v1.4 目标与“无新动画依赖”约束

### Upstream context
- `.planning/phases/61-contract-freeze-visual-ownership/61-CONTEXT.md` — `BackgroundLayer` transition ownership、unknown transition compatibility、stage/UI ownership 边界
- `.planning/phases/62-character-preset-runtime-foundation/62-CONTEXT.md` — page-enter trigger philosophy、快速切页安全降级、角色 owner 边界
- `.planning/phases/63-camera-runtime-shared-cleanup/63-CONTEXT.md` — `CameraController` owner、page-enter camera 触发语义、shared cleanup 原则

### Spec and runtime touchpoints
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Page Transitions — canonical transition additions、命名与 lifecycle
- `src/ui/BackgroundLayer.js` — 当前双层背景切换 owner 与 `setBackground` / `clear` 逻辑
- `src/main.js` — `set_background` event wiring、skip-aware cut 行为、现有 replay/title/preview/end reset 入口
- `src/engine/ScriptEngine.js` — 现有 `_renderPage()` 里 background / character / page_enter 事件顺序
- `src/shared/cinematicContract.js` — known/unknown transition compatibility helpers 与 UI options
- `src/editor/components/page-editor/PageInspector.vue` — transition 下拉菜单的现有消费点
- `src/editor/stores/script.js` — 新页面 transition 默认值来源

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`BackgroundLayer` 双层模式**：已有 `layerA/layerB + .active` 结构，适合作为全部转场的唯一宿主。
- **`cinematicContract.js` 兼容 helper**：已经冻结 unknown transition preservation、UI unknown option 展示与 runtime fallback，Phase 64 只需扩 known set，不应破坏兼容路径。
- **`main.js` skip-aware set_background**：已存在 skip 时强制 `duration: 0` 与 `transition: 'cut'` 的安全降级入口，可继续复用。

### Established Patterns
- **No new dependency**：转场必须继续走 CSS/DOM，不新增动画库。
- **Owner split already frozen**：background transition / character motion / stage camera 三者分层已经在 Phase 61-63 固化，Phase 64 不得回退。
- **Fast-forward correctness first**：skip/快速切页优先干净状态，不强求每次都完整可见。

### Integration Points
- `BackgroundLayer.setBackground(data)` 将成为新增转场类型和 cleanup 的主要落点。
- `ScriptEngine._renderPage()` 的当前 emit 顺序需要评估/调整，以满足“背景转场先，角色/镜头后”的顺序要求。
- `PageInspector.vue` 与 `getTransitionUiOptions()` 需要同步扩展 known options，但仍保留 unknown option 展示。

</code_context>

<deferred>
## Deferred Ideas

- iframe 单次转场 replay command / ack / restore 语义 —— 留到 Phase 65
- 转场方向、遮罩形状、自定义 easing、组合串联 —— 明确超出 v1.4 范围
- skip / auto / load / title-return 的全量残留矩阵验证 —— 留到 Phase 67

</deferred>

---

*Phase: 64-background-transition-expansion*
*Context gathered: 2026-04-21*
