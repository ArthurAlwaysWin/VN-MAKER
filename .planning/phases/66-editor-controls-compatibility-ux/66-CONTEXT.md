# Phase 66: Editor Controls & Compatibility UX - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

把 v1.4 已完成的角色动画、页面镜头、页面转场契约接入现有 `PageInspector` 编辑流，让创作者在**不进入新模式、不离开正常页面编辑**的前提下完成配置，并直接触发 iframe runtime-backed 单项预览。

本阶段只做 **editor controls + compatibility UX**，不做：
- 新的时间轴、独立演出面板或第二套编辑模式
- 画布侧假预览或本地 CSS 假播放
- skip / auto / load / title-return / rapid replay 的全量高风险收口（Phase 67）
- 多效果队列、组合预演、跨页面演出编排

</domain>

<decisions>
## Implementation Decisions

### Inspector integration
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/ROADMAP.md` §`Phase 66: Editor Controls & Compatibility UX` — 本 phase 的目标、依赖与 success criteria
- `.planning/REQUIREMENTS.md` — `PREV-01`，以及与本 phase 直接相连的 `ANIM-04`, `CAM-03`, `TRAN-03`, `PREV-02`, `PREV-03`, `PREV-04`
- `.planning/PROJECT.md` — v1.4 的“无代码、预设优先、无新依赖”边界

### Upstream phase decisions
- `.planning/phases/62-character-preset-runtime-foundation/62-CONTEXT.md` — 角色 animation preset 范围、`.character-motion` ownership、unknown animation preservation
- `.planning/phases/63-camera-runtime-shared-cleanup/63-CONTEXT.md` — `CameraController` owner、camera 参数合同、`#stage-layer` 作用域与 cleanup 原则
- `.planning/phases/64-background-transition-expansion/64-CONTEXT.md` — transition known set、unknown transition compatibility、page-enter sequencing
- `.planning/phases/65-iframe-effect-preview-api/65-CONTEXT.md` — `preview-effect` 协议、editor preview state、restore-safe preview 结果语义

### Product spec
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Summary / Product Goal / Design Principles — 低学习成本、预设优先、预览与导出一致
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Character Animation — 角色动画 data model 与 preset 范围
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Camera Effects — `camera` 字段、`durationMs`/`intensity`/`direction` 约束、`trigger = onEnter`
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Page Transitions — transition 命名、`scale` 语义与兼容边界

### Editor and runtime touchpoints
- `src/editor/components/page-editor/PageInspector.vue` — 现有页面属性/角色列表 UI 与 transition 消费点，是本 phase 的主接入面
- `src/editor/composables/usePageEditor.js` — effect preview 请求、busy 状态、reason code 与运行时结果桥接
- `src/editor/views/PageEditor.vue` — preview iframe、readonly 锁与统一停止预览入口
- `src/editor/components/page-editor/CanvasToolbar.vue` — 当前试玩/停止试玩入口，可作为状态呈现参考但不是 Phase 66 单项预览主入口
- `src/shared/cinematicContract.js` — 已知/未知 animation、camera、transition 的兼容 helper 与 UI option 来源
- `src/engine/ScriptEngine.js` — `page.camera` 与角色 animation 契约如何进入 runtime

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`PageInspector.vue`**：已经有“页面属性”“角色列表”两大现成区块，并已消费 transition 配置，适合原位扩展 cinematic controls。
- **`usePageEditor.js`**：已经有 `previewCharacterEffect`、`previewCameraEffect`、`previewTransitionEffect` 以及统一 preview state，可直接作为按钮背后的 owner。
- **`cinematicContract.js`**：已经集中定义 known/unknown option 兼容规则，Phase 66 应复用它生成 UI 选项而不是手写第二份枚举。
- **`HELP_SCRIPT` / `HelpTip.vue`**：现有 inspector 帮助提示模式可继续沿用，避免新增一套说明组件。

### Established Patterns
- **表单式 Inspector 编辑**：当前页面属性、字体、音频、角色缩放都通过右侧表单完成，说明“在原 Inspector 里加控件”是代码库首选模式。
- **编辑器不做假播放**：Phase 65 已锁定 runtime-backed iframe preview 为唯一真预览，本 phase 只负责接线，不自己模拟演出。
- **兼容值保留优先**：transition 已有 unknown option UI 模式，animation/camera 应沿用同样思路而不是强制清洗。

### Integration Points
- `PageInspector.vue` 的角色行和页面属性区是动画/镜头/转场控件的直接接线点。
- `usePageEditor.js` 的 disabled reason 与 result 状态将决定按钮禁用、错误提示和停止预览交互。
- `ScriptEngine.js` 与 `cinematicContract.js` 的字段合同决定 editor 表单字段名和值域，planner 不应再发明新 schema。

</code_context>

<specifics>
## Specific Ideas

- 自动模式采用推荐默认：**不新开模式、控件贴近现有 PageInspector 区块、预览按钮就地放置、未知值显式保留**。
- 这个 phase 应该让创作者感觉“只是现有页面编辑器变强了”，而不是“又学一套新工作流”。

</specifics>

<deferred>
## Deferred Ideas

- 时间轴式演出编辑器、组合预设、连续预演器 —— 超出 v1.4 范围
- skip / auto / load / title-return / preview-stop 的全量残留矩阵验证 —— 留到 Phase 67
- 画布直接播放演出或局部 fake preview —— 不符合 runtime parity 路线

</deferred>

---

*Phase: 66-editor-controls-compatibility-ux*
*Context gathered: 2026-04-21*
