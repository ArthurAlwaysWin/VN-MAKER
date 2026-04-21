# Phase 61: Contract Freeze & Visual Ownership - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

冻结 v1.4 演出系统的兼容契约与视觉层所有权边界，确保：

1. 旧项目与未来项目里的未知 `animation` / `camera.effect` / `transition.type` 在打开和保存后不会被静默清除。
2. 页面级镜头效果只作用于舞台画面，不影响对话框、标题页、菜单、设置页等 UI 叠层的可读性。

本阶段只定义和落地**契约边界、DOM ownership、兼容策略、默认回退规则**。

本阶段不包含：
- 角色预设动画本体实现（Phase 62）
- 镜头效果播放实现（Phase 63）
- 新转场效果实现（Phase 64）
- iframe 定向预览 API（Phase 65）
- PageInspector 演出配置 UI（Phase 66）

</domain>

<decisions>
## Implementation Decisions

### 舞台层所有权
- **D-01:** 不直接把镜头效果挂到 `#game-container`；新增 `#stage-layer` 作为镜头作用域。
- **D-02:** `#stage-layer` 只包住 `#background-layer` 与 `#character-layer`，`#dialogue-layer`、`#ui-overlay`、标题页与其他 overlay 保持在舞台层之外。
- **D-03:** 页面级镜头效果的产品语义固定为“舞台镜头”，不是“整屏 UI 一起运动”。

### 角色 transform 所有权
- **D-04:** 保留 `.character-sprite` 负责定位、缩放与现有入场基线状态，不在其上叠加未来的预设动画 transform。
- **D-05:** 为每个角色新增内层 `.character-motion` wrapper，未来角色预设动画统一挂在该节点上。
- **D-06:** `CharacterLayer` 的 DOM ownership 规则固定为：container 管布局与可见性，motion wrapper 管演出动作，imgA/imgB 管表情 crossfade。

### 兼容与回退策略
- **D-07:** 编辑器读取到未知 `animation` / `camera.effect` / `transition.type` 时必须原样保留；允许 UI 显示“未知值”，但禁止保存时清空。
- **D-08:** 运行时遇到未知演出枚举时采用 safe no-op 或兼容回退，不抛异常、不破坏页面渲染。
- **D-09:** 新页面 schema 默认值路线固定为：角色动画缺省视为 `none`；页面 `camera` 缺省为 `null`；转场继续兼容现有 `fade / slide-* / none`。

### 运行时职责边界
- **D-10:** `ScriptEngine` 只负责发出页面与角色的运行时契约事件，不承担镜头、动画、转场的视觉编排逻辑。
- **D-11:** 镜头能力未来由独立 `CameraController` 持有，角色动画由 `CharacterLayer` 持有，转场继续由 `BackgroundLayer` 持有。
- **D-12:** 编辑器预览继续以 iframe runtime 为唯一真源，不新增本地伪预览路径。

### the agent's Discretion
- `#stage-layer` 的精确 DOM 层级与 class 命名
- 未知值在 UI 中的文案表现形式（例如 `未知动画：legacy-spin`）
- runtime 对未知值采用 no-op 还是降级到 `none/fade` 的具体分支细则
- Phase 61 需要补到何种测试粒度才算“契约冻结完成”

</decisions>

<specifics>
## Specific Ideas

- 这一步的本质不是“做效果”，而是先把**谁可以动、谁不能动**的边界钉死。
- 现在 `#game-container` 下直接挂了背景层、角色层、对话层；如果镜头直接打在容器上，对话框与 overlay 一定会被带着动。
- 现在 `CharacterLayer` 已经把 position / scale / enter transition 写在 `.character-sprite` 上，后续动画如果继续复用同一个 transform，会和现有逻辑冲突。
- v1.4 必须保持“bounded cinematic upgrade”，不是 ATL / timeline / keyframe 平台。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/ROADMAP.md` §v1.4 / `Phase 61: Contract Freeze & Visual Ownership` — 本阶段目标、依赖与成功标准
- `.planning/REQUIREMENTS.md` — `PREV-04`, `CAM-05` 的正式需求定义
- `.planning/PROJECT.md` — v1.4 里程碑目标与产品约束

### v1.4 设计与研究
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` — v1.4 设计总纲、演出系统数据模型、生命周期原则
- `docs/gap-analysis-vs-mature-engines.md` §六 / `### v1.4 — 演出力升级` — 为什么先做演出力、为什么先做引擎地基
- `.planning/research/SUMMARY.md` — 研究汇总，包含 stack、architecture、pitfalls 与建议 phase 顺序

### Existing runtime structure
- `index.html` — 当前 `#game-container` / 背景层 / 角色层 / 对话层 DOM 结构
- `src/main.js` — 运行时 DOM 引用、overlay 优先级、现有 preview 与 reset 入口
- `src/ui/CharacterLayer.js` — 当前 `.character-sprite` 持有定位、scale、enter transition 与 crossfade 协作方式
- `src/ui/BackgroundLayer.js` — 现有转场 owner，后续仍作为唯一背景转场系统

### Prior phase context
- `.planning/milestones/v1.0-phases/37-characterlayer-dom/37-CONTEXT.md` — CharacterLayer 双层 DOM 改造时的 ownership 决策
- `.planning/milestones/v0.3-phases/14-editor-test-play/14-CONTEXT.md` — iframe runtime preview 的既有边界与 postMessage 路线
- `.planning/milestones/v0.5-phases/22-skip-mode/22-CONTEXT.md` — skip/overlay/reset 相关的运行时 orchestration 原则
- `.planning/milestones/v0.3-phases/13-transitions-branching/13-CONTEXT.md` — 现有转场数据模型与扩展路径

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CharacterLayer 双图层结构**：已有 `container + imgA/imgB + activeImg` 模式，可在不破坏 crossfade 的前提下再加 `.character-motion`
- **BackgroundLayer 双层切换模式**：已有 layerA/layerB + `.active` 的过渡结构，继续作为背景转场唯一 owner
- **iframe preview 通路**：Phase 14 已建立 `postMessage` + READY 握手，不需要再发明第二套预览机制

### Established Patterns
- **main.js orchestration**：overlay、skip、右键、ESC、预览结束等都由 `main.js` 编排，镜头 reset 也应遵循这一层的 orchestration 模式
- **纯 JS + DOM/CSS**：项目已明确不引入新的动画/渲染依赖，v1.4 继续沿用现有 Electron/Chromium 能力
- **向后兼容优先**：历史 phase 已多次采用“schema 兼容 + UI 降级展示 + runtime 安全回退”路线

### Integration Points
- `index.html`：需要插入 `#stage-layer` 并重排背景层、角色层、对话层的宿主关系
- `src/main.js`：需要更新 DOM 引用与未来 CameraController 的挂载点
- `src/ui/CharacterLayer.js`：需要为后续 `.character-motion` wrapper 预留结构，同时不破坏现有 show/hide/expression API
- `src/editor/stores/script.js` 与 `PageInspector.vue`：后续要消费新的兼容契约，但本 phase 先冻结它们该遵循的规则

</code_context>

<deferred>
## Deferred Ideas

- `wipe` 最终实现选 `clip-path` 还是 reveal wrapper —— 留到 Phase 64
- iframe 预览 command/ack/error 命名协议 —— 留到 Phase 65
- skip / auto / load / title-return 的精确视觉清理矩阵 —— 留到 Phase 67

</deferred>

---

*Phase: 61-contract-freeze-visual-ownership*
*Context gathered: 2026-04-21*
