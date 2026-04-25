# Phase 67: Integration & Regression Gate - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

对 v1.4 已落地的角色动画、页面镜头、页面转场与 editor preview 入口做**高风险流整体验收与补漏**，确保在 skip、auto、load、return-to-title、preview-stop、rapid replay 等路径下，不会残留动画 class、镜头 transform、flash overlay 或脏舞台状态。

本阶段只做 **integration + regression gate**，不做：
- 新的演出能力、预设、参数或编辑模式
- 第二套 cleanup 系统、第二套 preview state machine 或新的 runtime owner
- ATL / 时间轴 / 多效果编排 / 组合预览
- 与 PREV-05 无关的广泛 UI 打磨或体验重设计

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/ROADMAP.md` §`Phase 67: Integration & Regression Gate` — 本 phase 的目标与 success criteria
- `.planning/REQUIREMENTS.md` — `PREV-05`
- `.planning/PROJECT.md` — v1.4 的 bounded cinematic upgrade、无新依赖、低复杂度路线

### Upstream phase decisions
- `.planning/phases/62-character-preset-runtime-foundation/62-CONTEXT.md` — character motion ownership、skip 下正确性优先、cleanup 语义
- `.planning/phases/63-camera-runtime-shared-cleanup/63-CONTEXT.md` — `CameraController` owner、stage-local flash、shared cleanup 入口
- `.planning/phases/64-background-transition-expansion/64-CONTEXT.md` — background completion gate、transition cleanup、safe cut/no-op 策略
- `.planning/phases/65-iframe-effect-preview-api/65-CONTEXT.md` — preview lock、restore path、stop/supersede/failed 结果语义
- `.planning/phases/66-editor-controls-compatibility-ux/66-CONTEXT.md` — inspector-mounted preview entrypoints 与 scoped preview UI state
- `.planning/phases/66-editor-controls-compatibility-ux/66-01-SUMMARY.md` — provenance-scoped preview UI state contract
- `.planning/phases/66-editor-controls-compatibility-ux/66-02-SUMMARY.md` — PageInspector 已成为真实用户入口，Phase 67 必须围绕这一入口验证

### Product spec
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Design Principles — preview/export consistency, no new dependency
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` §Character Animation / §Camera Effects / §Page Transitions — runtime lifecycle 和 cleanup 预期

### Runtime and editor touchpoints
- `src/main.js` — `skip` / `auto` / `load` / `return-to-title` / preview start-stop / replayCurrentPage 等 cleanup 编排入口
- `src/ui/CharacterLayer.js` — motion cleanup、replace/clear/hide paths
- `src/ui/CameraController.js` — stage transform / flash cleanup
- `src/ui/BackgroundLayer.js` — transition cleanup、same-page preview cleanup、completion signal
- `src/editor/composables/usePageEditor.js` — preview stop / supersede 从 editor 侧如何触发 runtime
- `tests/backgroundTransitionWiring.test.js` — 现有背景转场编排回归入口
- `tests/cameraCleanupWiring.test.js` — 现有镜头 cleanup 回归入口
- `tests/iframeEffectPreviewWiring.test.js` — preview-effect stop / supersede / restore 行为基线

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`main.js` cleanup 入口已存在**：`restorePreviewSnapshot()`、`cancelActiveEffectPreview()`、`replayCurrentPage()`、title/load/end 相关路径已经在调用 `camera.clear()` / `characters.clear()` / `background.clear()`。
- **各 owner 均有显式 `clear()`**：Character / Camera / Background 三层都不是靠 CSS 自己“自然结束”，而是已有显式清理能力，适合做高风险流回归。
- **现有 focused regression 测试已存在**：Phase 64/65 已经为 background wiring、camera cleanup、iframe effect preview 铺了基础测试面。

### Established Patterns
- **Correctness before spectacle**：skip / 快速切页可以安全降级，只要 clean state 正确。
- **Owner split frozen**：background / character motion / stage camera 三层责任已固定，本 phase 不应打破。
- **Runtime parity first**：preview stop / supersede / restore 必须以 runtime 真状态为准，不能引入 editor-side fake cleanup。

### Integration Points
- `main.js` 是 PREV-05 的主要修补与验证落点，因为高风险流的清理编排都在那里汇聚。
- `CharacterLayer.clear()`、`CameraController.clear()`、`BackgroundLayer.clear()` 和相关中断路径是残留 bug 最可能的根源。
- 现有 Phase 65/66 测试可以作为 Phase 67 的扩展起点，而不是另起一套完全新的测试世界。

</code_context>

<specifics>
## Specific Ideas

- 自动模式采用推荐默认：**不新造系统，只把既有 cleanup 入口补全并用 focused regression 钉死**。
- Phase 67 应该像“质量闸门”而不是“功能 phase 3”；如果没有暴露新的用户能力，那是正常且正确的。

</specifics>

<deferred>
## Deferred Ideas

- 更大范围的全局 runtime lifecycle 重构 —— 仅当现有 owner + wiring 路线证明不够时再考虑
- 新的 preview queue、并行 preview、时间轴预演器 —— 超出 v1.4
- 与 PREV-05 无关的 editor UX 二次打磨 —— 留到后续 milestone

</deferred>

---

*Phase: 67-integration-regression-gate*
*Context gathered: 2026-04-21*
