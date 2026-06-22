# Unified Screen Designer 二次审查

**日期：** 2026-06-22  
**审查基线：** `fa11d14fa567913c0876778bbbda27895f350b71`  
**外部输入：** `E:\projects\report.md`（仅作为不可信 finding 清单）  
**范围：** 证据验证与二次审查；未实现修复，未开始 Phase 2

## 结论

- 原报告总体可信度：**中**。
- 原报告关于架构方向和 Phase 1 已完成的结论成立。
- 原报告关于“8 个 P1 导致不能进入 Phase 2”的结论不成立。
- 建议状态：**修改文档后可以进入 Phase 2**。
- 未发现必须修改运行时代码才能开始 Phase 2 的 blocker。

外部报告识别了若干真实的 contract decision gate，但系统性地把“应由 Phase 2 解决的问题”提升成了“开始 Phase 2 前的 blocker”。它还忽略了路线图的 cross-phase test matrix 已经把 CLI、export、accessibility 和 performance 工作分配到 P3、P4、各页面 phase 以及 P11 的最终审计。

## Findings Verification Matrix

| 原 finding | 原严重度 | 二次结论 | 新严重度 | Phase 2 影响 |
| --- | --- | --- | --- | --- |
| P1-1 action 词汇与当前 runtime 不同 | P1 | Decision gate | 中 | Phase 2 内锁定 canonical action 与 legacy mapping |
| P1-2 `ui.screens` 与现有 `ui.*` 边界含糊 | P1 | Decision gate | 中 | Phase 2 必须定义 authoritative owner 和 contract perimeter |
| P1-3 `.gmtheme` 数据丢失风险 | P1 blocker | Partially confirmed | 中 | P2 定义 projection；P5 首次持久化前完成往返测试 |
| P1-4 `ui.motion` 与 typed animation tracks 冲突 | P1 | Decision gate | 中低 | P2 定义关系；当前不存在实际双系统冲突 |
| P1-5 Agent authoring 太晚 | P1 | Partially confirmed | 中 | 保留逐屏 mutation；澄清 P11 是收口而非首次实现 |
| P1-6 a11y 全部推迟到 P11 | P1 | False positive | 无 | 路线图已经分阶段覆盖 |
| P1-7 editor 缺少 preserve/warn 机制 | P1 | Not supported | 低 | P2 schema/P4 acceptance 的普通实现要求 |
| P1-8 absolute pixel 到 anchor/pivot 被低估 | P1 | Partially confirmed | 中 | P2 必须定义映射、typed style 和 loss diagnostics |
| P2-9 Phase 2 过载 | P2 | Preference only | 低 | 可拆内部 milestone，不应把 contract 全推迟到 P9 |
| P2-10 Phase 4 过大 | P2 | Preference only | 中低 | 建议拆为 P4a/P4b session boundary |
| P2-11 Phase 7 过大 | P2 | Preference only | 中低 | 建议拆为 P7a Save/Load、P7b Backlog |
| P2-12 Phase 11 过载 | P2 | Partially confirmed | 中 | 改成最终审计、跨屏 tooling 和 legacy closure |
| P2-13 sample 缺 `projectId` | P2 | Confirmed | 低 | 在 P3/P5 browser harness 前处理 |
| P2-14 lock/visibility 归属 | P2 | Decision gate | 低 | P2 定义原则，P4 prototype 前锁定 |
| P2-15 predicate context-key registry 未定义 | P2 | Decision gate | 中低 | P2 定义 closed registry 和 operators |
| P2-16 iframe/in-process 未决定 | P2 | Decision gate | 低 | P3 renderer prototype 最迟决定 |
| P2-17 confirmation 无 focus baseline | P2 | False positive / Outdated | 无 | baseline 已记录，P6 已要求修复 |
| P3-18 顶部状态与 Phase 1 Complete 冲突 | P3 | Confirmed | 低 | 进入 P2 前修正文档 |
| P3-19 input page contract 文档缺失 | P3 | Confirmed | 低 | 补示例，不阻塞架构 |
| P3-20 `screenSchemaVersion: 2` 未解释 legacy version | P3 | Partially confirmed | 低 | P2 定义 unversioned legacy 语义 |
| P3-21 action 命名不一致 | P3 | Duplicate | 无 | 与 P1-1 合并 |

## 关键裁决

### Action contract

当前 runtime action 与 proposed canonical action 不同是事实：

- `TitleScreen` 使用 `start`、`continue`/`load`、`settings`、`gallery`、`play-opening-video`、`quit`；
- `GameMenu` 使用 `save`、`load`、`backlog`、`settings`、`title`、`close`；
- architecture 展示的是 `start-game`、`open-screen`、`save-slot` 等 design-target action。

这不是当前 runtime defect。Phase 2 应决定 canonical semantic action id、参数结构和 legacy adapter。不要机械维护两套长期公开 vocabulary，也不要把 title 的 `load` 与 save/load screen 的 `load` 混成一个无上下文 action。

### Contract perimeter 与双 schema

`ui.screens` 应成为已迁移 screen 的唯一 authoritative layout/composition owner。`ui.theme`、`ui.motion` 以及迁移期间仍保留的 shared style data 可以作为依赖，但同一 screen 不应由 canonical 和 legacy 两个 writer 同时修改。

建议采用 per-screen migration authority：

1. legacy-only：仅 legacy field 有效；
2. canonical-active：canonical document 是唯一 writer，legacy 数据只用于 rollback/evidence；
3. retired：兼容 reader 满足删除 gate 后移除。

### `.gmtheme`

风险方向成立，但外部报告包含两个事实错误：

- 当前 `.gmtheme` exporter/installer 的 allowlist 不包含 `ui.motion`；
- 当前也不存在 `ui.screens` 可被静默丢失。

需要定义的是 canonical screen document 的 **theme-owned projection**，而不是无条件把完整 runtime document 和全部 legacy fields 双写进 `.gmtheme`。P5 Title 首次持久化 canonical document 时必须同时加入 export/import round-trip。

### Motion 与 animation tracks

当前 `ui.motion` 由 `src/main.js` 和 `src/shared/uiMotionContract.js` 应用，不是由 `ThemeManager` 分发。typed animation tracks 尚未实现，因此不存在当前双动画系统冲突。

Phase 2 应定义：

- track 的 allowlisted property、trigger、duration、easing 和 sequencing；
- track 与 surface preset 的 precedence；
- renderer 不支持时 validator/CLI 的 gating；
- reduced-motion 的统一处理。

不应在未验证 renderer prototype 前把某一 precedence 方案写成既定事实。

### Agent-first

Agent 在 P5 前并非不可操作：当前已有 legacy structured UI CLI，P2 有 inspect/list，P4 有 synthetic mutation，P5-P10 有逐屏 authoring operations。真正需要修订的是 P11 文案，避免被理解为高级 CLI、export 和 accessibility 到 P11 才首次实现。

Advanced capabilities 的裁决：

- **Phase 2 contract：** stable nodes、hierarchy、primitive/semantic registry、protected parts、typed layout/style/state/variant、actions/bindings、responsive variant 最小 shape、closed predicate contract、typed animation track shape、unknown-field preservation。
- **随 vertical slice 启用：** screen-specific predicates、tracks、reusable component authoring、layout recipes、node mutation 和 preview fixtures。
- **Built-in trusted adapters：** focus trap、list pagination/virtualization、save/backlog/gallery runtime data、video policy、allowlisted behavior/effect adapters。
- **明确禁止：** arbitrary JS/HTML/CSS、selectors、event handlers、通用表达式、Agent 自注册 runtime key、opaque Agent-only blobs、project-local runtime/plugin/shader/WebGL。

### Accessibility

“a11y 全推迟到 P11”是 false positive。路线图已经包含：

- P3 renderer focus/accessibility；
- P4 keyboard/focus browser interaction；
- P6 confirmation trap/restore；
- P8 Settings focus；
- P9 gameplay focus/reduced-motion；
- P5-P10 per-screen performance/accessibility；
- P11 full audit。

P11 应是完整审计，不是第一次实现。

### Layout migration

当前 legacy layout 大量使用绝对像素和 CSS-like string values，迁移复杂度确实较高。Phase 2 必须定义 resolution-aware mapping、typed style representation、changed paths 和 unsupported/loss diagnostics。

不建议永久增加 `absolute-legacy` 第二套 renderer。Absolute placement 可以由统一 anchor/pivot/offset 模型表达；无法无损表达的字段必须产生诊断，而不是静默近似。

## Phase 1 裁决

Phase 1 完成结论成立：

- `fa11d14` 只增加文档、fixtures 和测试，没有修改 runtime/project contract；
- 聚焦测试：6 files、194 tests passed；
- 完整 Vitest：135 files、1194 tests passed；
- 三张 Phase 1 截图实际存在并完成视觉检查；
- 设置页截图确认 transparent overlay/title bleed-through legacy baseline；
- 新增测试使用真实 DOM、click、keyboard、async callback、source routing 和 lifecycle 断言，没有用源码 `toContain()` 代替交互验收。

二次审查识别出的 Save/Load fixture 证据债务已在进入 Phase 2 前的 closure batch 中关闭：共享 fixture 已改用 runtime `previewText` shape，并增加了预览文本、时间戳和 inline thumbnail 的真实 DOM 断言。

剩余的 `public/game/script.json` 缺少 `projectId` 问题不阻塞 Phase 1 closure；应在 P3 browser harness 前提供稳定 runnable fixture。

## 进入 Phase 2 前的最小修改

### 必须修改

- 修正 architecture/roadmap 顶部状态为 Phase 0-1 complete、Phase 2+ not started。
- 在 Phase 2 deliverables 中加入明确 decision checklist：action namespace、screen authority、contract perimeter、layout/style migration、advanced capability gating。
- 将 Phase 11 描述为 final audit、cross-screen tooling 和 legacy closure。

### 必须补证据

- P3 前提供稳定 runnable browser fixture。
- 修正 Save/Load shared fixture 的 `previewText` 行为证据。
- P5 首次 canonical screen persistence 时补 `.gmtheme` projection round-trip。

### 可以推迟

- lock/visibility 最终存储位置；
- iframe/in-process/hybrid host 选择；
- Gallery mixed grid/tabs；
- batch refactors、跨屏 fixture matrix 和完整 gamepad audit。

### 不应采纳

- 将 responsive variants、predicates、animation contract 全部推迟到 P9；
- 永久维护第二套 `absolute-legacy` renderer；
- `.gmtheme` 无条件双写完整 legacy 和 canonical documents；
- 在 renderer/validator 支持前开放 advanced mutation；
- 把当前 legacy editor 的 clone 写入当成未来 unified editor 必然丢字段的证据。

## 建议阶段顺序

维持 Phase 0-11，并增加内部 stop boundary：

1. P0-P1：完成；
2. P2：canonical contract 与上述 decision gates；
3. P3：shared renderer、action/data host、focus primitives、host prototype；
4. P4a：canvas/hierarchy/selection/inspector；
5. P4b：geometry/context menu/keyboard/undo/advanced preservation；
6. P5：Title，含 CLI、export、`.gmtheme` projection；
7. P6：Game Menu + Confirmation；
8. P7a：Save/Load；
9. P7b：Backlog；
10. P8：Settings；
11. P9：Gameplay UI；
12. P10：Gallery + remaining overlays；
13. P11：whole-project migration、cross-screen tooling、full release audit、legacy retirement decision。

Title 仍适合作为第一个 vertical slice，因为它已有 canvas、legacy elements、runtime `setLayout()` 和行为测试，迁移路径最短。

## 原报告自身的问题

### 错误事实

- 错称 `.gmtheme` 当前包含 `ui.motion`；
- 错称 `ui.motion` 经 `ThemeManager` 分发；
- 忽略路线图已分阶段安排 a11y/CLI/export；
- 忽略当前 legacy CLI、P2 inspect 和 P4 synthetic mutation。

### 过度推断

- 从旧 editor 的 clone 写入推断未来 shell 必然 flatten advanced fields；
- 从 iframe preview 推断 pointer move 必然完整序列化项目；
- 把未实现的 animation tracks 描述为当前系统冲突；
- 把未来 package compatibility 风险描述为当前数据丢失。

### 重复与矛盾

- P3-21 重复 P1-1；
- P2-12 大量重复 P1-5/P1-6；
- P2-17 重复 baseline 和 P6 已记录要求；
- P1-5 建议 capability 提前，P2-9 又建议推迟；
- 一方面反对双 schema，一方面建议长期双写 legacy + canonical。

## 验证证据

### CodeGraph

- index：387 files、5687 nodes、14796 edges，无 staleness；
- `codegraph_context`：runtime actions、layout、theme、preview、package 范围；
- 一次 targeted `codegraph_explore`：Title、Save/Load、Settings、Backlog、Dialogue editor；
- `codegraph_trace applyPreviewScriptSnapshot -> setLayout`：确认 preview snapshot 向 legacy screens 分发 `ui.*`；
- `codegraph_impact setLayout`：94 个相关符号；
- `codegraph_impact ThemeManager`：4 个结构影响入口。

### Tests

```text
Focused UI evidence: 6 files passed, 194 tests passed
Full Vitest: 135 files passed, 1194 tests passed
```

### Final repository state

```text
## main...origin/main [ahead 1]
HEAD fa11d14fa567913c0876778bbbda27895f350b71
git diff --check: clean
```

本次二次审查没有实现修复，也没有开始 Phase 2。
