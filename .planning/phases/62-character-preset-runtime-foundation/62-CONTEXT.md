# Phase 62: Character Preset Runtime Foundation - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

为 v1.4 角色预设动画建立运行时基础，实现：

1. 页面角色可以携带 `animation` 预设值进入 runtime。
2. `CharacterLayer` 能按预设注册表在 `.character-motion` 上播放 one-shot / loop 动画。
3. 动画在翻页、隐藏角色、清空渲染状态与快速切页时不会残留脏 class 或 inline style。

本阶段只做**runtime foundation**，不做：
- 编辑器动画下拉框与预览按钮（Phase 66 / 65）
- 镜头效果实现（Phase 63）
- 新页面转场实现（Phase 64）
- 独立 iframe replay API（Phase 65）
- ATL / 时间轴 / 组合动画语言（out of scope）

</domain>

<decisions>
## Implementation Decisions

### 预设范围
- **D-01:** 首版直接交付 7 个角色预设：`fade-in`、`slide-in-left`、`slide-in-right`、`shake`、`nod`、`breathe`、`bounce`。
- **D-02:** `none` / `undefined` 语义固定为“不播放角色动画”；它是兼容缺省值，不算一个可见演出预设。
- **D-03:** v1.4 角色动画继续走 preset-only 路线；不开放自定义参数、缓动、幅度或组合表达式。

### 触发与生命周期
- **D-04:** 角色动画只在页面渲染进入时，根据该页角色当前 `animation` 值触发；不在对话流程中新增临时动画指令。
- **D-05:** 表情切换 (`setExpression`) 不会顺带触发角色动画；表情 crossfade 与角色 motion 生命周期彼此独立。
- **D-06:** `breathe` 是首版唯一 loop；其余预设全部视为 one-shot。
- **D-07:** one-shot 动画结束后必须自动移除 motion class，保证同角色在后续页面能干净重播。
- **D-08:** loop 动画在页面离开、角色隐藏、角色被替换、render reset / clear 时必须立即清理。

### 运行时职责边界
- **D-09:** 所有角色预设动画都只挂在 `.character-motion`；`.character-sprite` 继续只负责定位、scale 与现有 enter/exit 基线。
- **D-10:** `CharacterLayer` 负责动画注册表、播放、重播、结束清理与替换清理；`ScriptEngine` 只负责把 `animation` 值随 `show_character` 契约发出。
- **D-11:** 角色动画不得破坏 Phase 38 的表情 crossfade（imgA/imgB）与 Phase 39 的表情状态继承。
- **D-12:** loop 清理必须是 runtime 主动 ownership，不依赖 CSS 自己“看起来结束了”。

### skip / 快速切页默认策略
- **D-13:** skip / 快速翻页下，不要求本阶段建立完整全局 cleanup matrix，但角色层自身必须保证：新一页触发前先清掉旧角色残留 motion 状态。
- **D-14:** one-shot 在 skip 触发的快速页面推进中允许因页面切换而看不到完整播放；正确性优先于“必须播完”。

### Agent's Discretion
- 预设注册表的数据结构（对象表、Map、常量拆分）
- one-shot 完成检测用 `animationend`、timer 还是双保险
- CSS keyframes 的具体位移/缩放幅度与 easing
- 是否为 motion cleanup 使用 generation token / replay nonce
- 测试拆分到 `CharacterLayer` 单测还是 `main.js` / `ScriptEngine` 集成测

</decisions>

<specifics>
## Specific Ideas

- Phase 61 已经把 `.character-motion` ownership 预留好；Phase 62 应只把“动作”叠到该节点，不要重新碰 container transform 语义。
- `breathe` 作为唯一 loop，能先覆盖“页面停留时角色有生命感”的最大价值场景，同时保持状态机简单。
- `fade-in` / `slide-in-*` 与现有 container enter transition 语义接近，但本阶段仍应把它们视为**角色预设动画合同**，挂在 motion 层，不和 container enter class 混用。
- 由于编辑器 UI 还没开放，当前 phase 的主要入口是兼容已有/未来脚本中的 `character.animation` 字段。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/ROADMAP.md` §v1.4 / `Phase 62: Character Preset Runtime Foundation`
- `.planning/REQUIREMENTS.md` — `ANIM-01`, `ANIM-02`, `ANIM-03`
- `.planning/PROJECT.md` — v1.4 目标与技术约束

### Upstream context
- `.planning/phases/61-contract-freeze-visual-ownership/61-CONTEXT.md` — `.character-motion` ownership 与 runtime responsibilities
- `.planning/milestones/v1.0-phases/38-expression-crossfade/38-CONTEXT.md` — 300ms crossfade、skip 行为、imgA/imgB ownership
- `.planning/milestones/v1.0-phases/39-expression-state-management/39-CONTEXT.md` — expression state 在 ScriptEngine 中持有，CharacterLayer 保持渲染层纯度
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Character Animation — canonical preset table 与 lifecycle

### Code touchpoints
- `src/ui/CharacterLayer.js` — 动画播放与 cleanup 的核心 owner
- `src/style.css` — `.character-motion`、`.character-sprite`、角色 keyframes / classes
- `src/engine/ScriptEngine.js` — 页面 render 时发出 `show_character`
- `src/shared/cinematicContract.js` — `animation` 默认值与兼容 helper
- `src/main.js` — 运行时事件接线，后续可能需要配合 skip/reset 路线

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`.character-motion` wrapper 已存在**：Phase 61 已把 motion wrapper 插进 DOM，可直接承接动画类。
- **表情 crossfade 已稳定**：`imgA/imgB` 的 300ms opacity 过渡已完成，不应与 motion transform 复用同一节点。
- **ScriptEngine expression state 已独立**：角色动画不需要自己持久化表情或页面逻辑状态。

### Established Patterns
- **兼容 helper 优先**：`src/shared/cinematicContract.js` 已经统一 `animation` 默认值路线，Phase 62 应复用而不是另起一套判断。
- **DOM/CSS preset 路线**：项目已有背景转场、对话框动画、标题页微动效等 CSS animation pattern，可继续沿用。
- **runtime cleanup 显式执行**：已有 crossfade timer cleanup、layer reset 等先例，说明“离场时主动清理”是项目既有风格。

### Integration Points
- `ScriptEngine._renderPage()` 当前会逐角色发 `show_character`，是角色动画进入时机的唯一正确挂点。
- `CharacterLayer.hide()` / `clear()` 当前只清 crossfade timer；Phase 62 需要把 motion cleanup 一并纳入。
- `CharacterLayer.show()` 当前已根据页面差异处理图片变化、定位与 enter transition；动画逻辑要与这些步骤串联，但不能重写它们的 ownership。

</code_context>

<deferred>
## Deferred Ideas

- 动画预览 replay command / ack / restore 语义 —— 留到 Phase 65
- PageInspector 角色动画下拉框与未知动画 UI —— 留到 Phase 66
- skip / auto / load / title-return 的全局视觉清理矩阵 —— 留到 Phase 67
- camera 与角色动画的播放顺序联动 —— 由 Phase 63 / 64 / 67 统一收口

</deferred>

---

*Phase: 62-character-preset-runtime-foundation*
*Context gathered: 2026-04-21*
