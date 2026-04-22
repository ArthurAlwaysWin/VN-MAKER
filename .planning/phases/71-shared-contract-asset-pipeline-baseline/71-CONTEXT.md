# Phase 71: 共享契约与资产通路基线 - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

为 v1.5 的图片驱动 UI 体系先冻结 **标准写入路径、旧字段兼容读写、共享 contract 入口、以及 scan/export 注册边界**，让后续 Phase 72-75 可以在统一规则上继续铺对话框、按钮族、major screen、cursor 与 icon slots。

本阶段只交付：
- UI 图片资源的标准写入语义（复制到 `assets/ui/` + 配置只存项目相对路径）
- 旧路径 / 旧 base64 字段的兼容读入与“显式重选后规范化写入”规则
- shared UI image contract / registry 的落点与 ownership 边界
- `scanAssets()` / 导出链路的 UI 图片字段注册基础

本阶段不交付：
- 对话框图片层、按钮族图片态、major screen 图片化本体（Phase 72-74）
- cursor / icon slots 的最终运行时接线与全链路 parity gate（Phase 75）
- `.gmtheme` 包格式升级、迁移提示 UI、社区分享流
- editor-only 假预览或第二套资产系统

</domain>

<decisions>
## Implementation Decisions

### 资产所有权与标准写入
- **D-01:** v1.5 新增或经用户重新设置的 UI 图片字段，一律通过标准选图流程写入：**复制文件到 `assets/ui/`，配置中只记录项目相对路径**。
- **D-02:** Phase 71 锁定的输入格式只有 **PNG / WebP / JPEG**；不为 SVG、GIF、视频帧或其他格式扩 scope。
- **D-03:** Phase 71 不接受“自由文本路径仍是主入口”的方案；标准路线必须建立在现有 `assets` store / IPC 资产导入能力之上，而不是继续扩散手填路径。

### 兼容读入与迁移边界
- **D-04:** 旧项目中的旧路径字符串与旧 base64 UI 图片字段必须继续 **可读、可运行、不崩**，但它们在本阶段仍视为 legacy input，不作为新的标准写法。
- **D-05:** **不做静默自动迁移。** 旧字段只有在用户显式通过标准选图流程重新设置后，才改写为 `assets/ui/` 下的项目相对路径。
- **D-06:** Phase 71 不把“待迁移徽章 / 确认弹窗 / 迁移向导”作为必须交付；如果后续 planning 认为需要轻量提示，可以作为 planner discretion，而不是本阶段硬 requirement。

### 共享 contract 与 ownership 边界
- **D-07:** 本阶段应新增或冻结一个 **shared UI image contract / registry** 入口，统一管理 path normalization、slot key、legacy read helpers 与 scan/export field registry，避免字段名散落在 editor / runtime / export 各处。
- **D-08:** schema 方向先锁定为：**跨界面复用资源放 `ui.theme`，表面对话框资源放 `ui.dialogueBox`，screen 级图片资源放 `ui.<screen>.chrome`**；Phase 71 先定 contract，不要求一次做完所有 surface DOM/preview。
- **D-09:** 继续复用既有 owner：资产导入走 `src/editor/stores/assets.js`，theme 预览走 `useThemeEditor.js`，screen 预览走 `useScreenLayoutEditor.js` / `main.js`；禁止为 v1.5 再造第二套资产流或本地假预览。

### Scan / export 基线
- **D-10:** Phase 71 负责把 **UI 图片字段扫描方式** 先集中化、注册化，确保后续 Phase 72-75 新增字段时有统一接入口；但完整的 preview/runtime/export parity gate 仍由 Phase 75 收口。
- **D-11:** `scanAssets()` 的 UI 图片扩展必须采用 **registry / helper 驱动**，而不是继续在函数里散落 `if (cfg.xxx)`；否则随着对话框、按钮族、screen chrome 扩面会再次漏字段。
- **D-12:** `.gmtheme` / `themePackager` 现有 base64 打包模型本阶段只需被纳入 canonical refs 和风险边界，不在 Phase 71 内重做格式升级。

### the agent's Discretion
- shared contract 的具体文件名（例如 `src/shared/uiImageContract.js`）与 helper 拆分粒度
- 标准选图流程最终复用 `selectAsset()`、`importAssets()` 还是二者组合的具体交互顺序
- legacy read helper 放在 shared contract、assetPath helper，还是更贴近各 consumer 的适配层
- scan/export registry 的 API 形式（静态数组、对象映射或 traversal helper）

</decisions>

<specifics>
## Specific Ideas

- [auto] 资产写入语义 — Q: “新的 UI 图片字段该如何持久化？” → Selected: “复制进 `assets/ui/` 并只记录项目相对路径” (recommended default)
- [auto] legacy 迁移语义 — Q: “旧路径 / base64 该何时改写为新格式？” → Selected: “仅在用户显式重新选图后改写，不做静默迁移” (recommended default)
- [auto] contract 入口 — Q: “字段与扫描边界应该散落在各模块还是集中定义？” → Selected: “集中到 shared contract / registry” (recommended default)
- [auto] phase 边界 — Q: “Phase 71 要不要顺手做完整 surface parity？” → Selected: “只做 contract + 资产通路基线，最终 parity 留给 Phase 75” (recommended default)

- 本阶段应该让 downstream planner 明确：**先把“路径、兼容、注册表”做对，再让各 surface 消费它。**
- 现有代码里最危险的不是功能缺失，而是 **手填路径 + data URL + 不同模块各自知道一部分字段** 的分裂状态。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/ROADMAP.md` §`Phase 71: 共享契约与资产通路基线` — 本 phase 的目标、依赖与 success criteria
- `.planning/REQUIREMENTS.md` — `AST-01`, `AST-02`, `AST-05`, `AST-06`
- `.planning/PROJECT.md` — v1.5 当前里程碑目标与“无新依赖 / 无渲染栈重写”边界
- `.planning/STATE.md` — 当前里程碑位置、已冻结的 v1.5 decisions 与风险提醒

### Research and upstream reasoning
- `.planning/research/SUMMARY.md` — v1.5 的 stack / architecture / pitfalls 总结与 phase 顺序建议
- `.planning/research/STACK.md` — “无新依赖、扩面不换栈”的技术边界
- `.planning/research/ARCHITECTURE.md` — shared contract、`ui.theme` / `ui.dialogueBox` / `ui.<screen>.chrome` 的推荐 ownership
- `.planning/research/PITFALLS.md` — 资产来源失控、导出漏图、预览分叉的风险与缓解建议
- `docs/gap-analysis-vs-mature-engines.md` §`### v1.5 — UI 图片驱动体系` — 该 milestone 的长期路线来源

### Prior phase context
- `.planning/phases/61-contract-freeze-visual-ownership/61-CONTEXT.md` — shared contract / ownership / runtime-backed preview 优先级的前置决策
- `.planning/phases/65-iframe-effect-preview-api/65-CONTEXT.md` — iframe runtime preview 作为唯一真预览的协议与 restore-safe 原则
- `.planning/phases/66-editor-controls-compatibility-ux/66-CONTEXT.md` — “不新增模式、不做 editor-only 假预览、兼容值保留优先”的 UI 接线原则

### Existing code touchpoints
- `src/editor/stores/assets.js` — `importAssets()` / `selectAsset()` 的现有项目资产导入与选择能力
- `src/editor/composables/useThemeEditor.js` — theme iframe preview 的现有 owner
- `src/editor/composables/useScreenLayoutEditor.js` — screen iframe preview 的现有 owner
- `src/engine/ThemeManager.js` — 当前 nine-slice selector / state 范围与后续扩面入口
- `src/engine/scanAssets.js` — 当前导出扫描覆盖范围与需要注册化的核心落点
- `src/main.js` — `update-theme` / `update-screen-layout` / `show-screen` 的 preview runtime owner
- `src/editor/components/theme/NineSliceModal.vue` — 当前 data URL 写入与 nine-slice UI 的旧实现
- `src/editor/components/DialogueBoxSettings.vue` — 当前仅本地 mini preview 的对话框设置入口
- `src/editor/components/layout/DecorationSection.vue` — 当前装饰图仍以文本路径录入的旧入口
- `src/editor/components/layout/PanelBackgroundSection.vue` — 当前 panel 背景图文本路径入口
- `src/editor/components/layout/BacklogSection.vue` — 当前 screen 图片文本路径入口示例
- `src/editor/components/layout/GameMenuSection.vue` — 当前 screen 图片文本路径入口示例
- `src/editor/components/layout/SaveLoadSection.vue` — 当前 screen 图片文本路径入口示例
- `src/utils/themePackager.js` — 现有 theme package 对 data URL / image refs 的处理方式（仅作边界参考，不是本 phase 完成目标）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/editor/stores/assets.js`**：已经有 `importAssets(category, filePaths)` 与 `selectAsset(types)`，说明“复制入项目资产目录 + 记录相对路径”的基础能力已存在，不需要再新建资产系统。
- **`src/editor/composables/useThemeEditor.js` + `src/main.js`**：theme 预览已经通过 iframe runtime 的 `update-theme` 跑通，是后续 UI 图片字段进入真预览的首选入口。
- **`src/editor/composables/useScreenLayoutEditor.js` + `show-screen`**：SaveLoad / Backlog / GameMenu / Settings 的逐屏 runtime 预览基础已经具备。
- **`src/engine/ThemeManager.js`**：已有集中 selector map 与状态规则，适合作为“共享 UI image registry”扩面的先例。

### Established Patterns
- **runtime-backed iframe preview 优先**：v1.4 已明确禁止 editor-only 假预览，Phase 71 必须继续把 contract 设计到可由现有 runtime owner 消费的形状。
- **兼容值保留优先**：旧值与未知值都优先保留并安全读取，再由显式用户动作触发规范化写入。
- **brownfield 先冻结契约再铺 surface**：Phase 61 已证明先钉死 ownership / contract，再推进 runtime surface，返工更少。

### Integration Points
- `assets.js` 将决定“标准选图流程”的最小可复用路径。
- `NineSliceModal.vue`、`DialogueBoxSettings.vue`、`DecorationSection.vue`、`PanelBackgroundSection.vue` 与各 screen section 是当前最典型的 legacy 路径 / data URL 写入口。
- `scanAssets.js` 是 export 闭环的唯一前置落点；如果 Phase 71 不先收口注册方式，Phase 72-75 很容易再次漏字段。

</code_context>

<deferred>
## Deferred Ideas

- legacy 字段“待迁移”徽章、确认弹窗或迁移面板 —— 可以作为后续 UX polish，但不是本阶段硬边界
- `.gmtheme` 格式升级、图片资产打包 / 分享 / 社区流 —— 留到后续 milestone
- 对话框图片层 DOM、按钮族 selected/disabled 行为、major screen decorations —— 分别留到 Phase 72-74
- cursor / icon slots 的最终运行时接线与全链路 parity gate —— 留到 Phase 75
- 静默 bulk migration、一次性清洗所有旧字段 —— 明确不纳入本阶段

</deferred>

---

*Phase: 71-shared-contract-asset-pipeline-baseline*
*Context gathered: 2026-04-23*
