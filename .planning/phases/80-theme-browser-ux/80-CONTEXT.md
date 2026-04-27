# Phase 80: 主题浏览器与选择 UX - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只交付 **统一主题浏览器（browse / understand / select UX）**：让用户在真正应用主题前，看懂主题是什么、覆盖什么、会改掉什么、当前处于什么状态。

明确不做：

- 新的未应用主题 live iframe preview
- 第二条 install/apply pipeline
- golden theme 或其余 4 套主题的内容生产
- 对 `.gmtheme` / legacy `.theme` 合同、导入、导出边界的返工

</domain>

<decisions>
## Implementation Decisions

### 浏览器结构与入口收敛
- **D-01:** Phase 80 采用 **single unified theme browser**，替换当前分裂的“预设 / 完整主题”浏览入口，而不是继续维护多个平行 modal。
- **D-02:** 浏览器固定为四区结构：顶部工具栏（含导入）、左侧筛选栏、中部卡片列表、右侧详情面板；导入动作被纳入浏览流，而不是浏览器外的独立流程。
- **D-03:** 本阶段聚焦“浏览、理解、选择”体验本身；不得把范围扩成主题内容制作、包格式演化、安装链路重写或新的预览系统。

### 统一数据模型与真相来源
- **D-04:** 浏览器里的所有主题都归一到同一 item shape，并使用正交状态维度：`source`、`mode`、`lifecycle`、`coverage`、`missingCoverage`、`applyImpact`、`preview`。
- **D-05:** 当前“已应用主题”的唯一真相源是 `script.data.ui.theme.packageMeta`；planner 不得引入 browser-only registry 或第二套 applied state。
- **D-06:** built-in 和 imported full themes 必须在浏览器层看起来是同类实体，只在来源与生命周期上区分；渲染层统一消费归一化数据，而不是在组件里分支两套逻辑。
- **D-07:** imported 项的浏览器信息优先复用 Phase 78/79 已有 contract / preflight / install metadata（`coverage`、`missingCoverage`、namespace、copy/skip/overwrite 计数），而不是重新推导一套平行摘要。

### 操作资格与状态表达
- **D-08:** full built-in theme 与 full imported theme 都显示 **Apply** CTA，但实际应用必须继续走共享的 Phase 79 install/apply path；浏览器只做 orchestration，不复制写入逻辑。
- **D-09:** legacy-partial / compatibility-only 主题必须与 full theme 明显区隔：可浏览、可解释 coverage/missing coverage，但不能呈现为“整包替换候选”。
- **D-10:** 当前已应用的主题卡必须显示 `当前已应用` 生命周期，并隐藏主 Apply CTA，避免与“已导入但未应用”混淆。
- **D-11:** 浏览器支持的状态语义至少覆盖：`内置可用`、`已导入`、`当前已应用`、`兼容导入 / 部分主题`；后续 planner 与实现不得弱化这几个状态边界。

### 预览、覆盖说明与错误反馈
- **D-12:** 未应用主题仍坚持 **static preview only**；如果没有真实预览资产，使用稳定且可重复的 fallback thumbnail，不允许空白或 broken image。
- **D-13:** overwrite impact 必须在 apply 前计算并展示；若当前项目已有 applied package 且 coverage 重叠，则明确告知会覆盖哪些 theme-owned UI area；若没有 `packageMeta`，则退化为“首次写入这些范围”的解释文本。
- **D-14:** 若项目元数据不完整或主题当前不可应用，浏览器必须给出保守说明与原因文本，而不是硬失败或只做静默禁用。
- **D-15:** 导入成功后浏览器应立即刷新、自动选中新条目并在浏览器内给出短反馈；导入失败时必须保留现有 filter/search/selection/detail 状态，并把错误贴近工具栏导入入口展示。

### the agent's Discretion
- 卡片密度、badge 的视觉层级、筛选控件的具体形态（chip / checkbox / segmented control）
- fallback thumbnail 的具体绘制方式与占位文案
- 覆盖摘要与 overwrite 文案的精炼表达
- 详情面板中 coverage / missing coverage / impact 的分组顺序，只要不破坏已锁定的信息边界

</decisions>

<specifics>
## Specific Ideas

- 统一浏览器，而不是“保留多个现有 modal 再各自增强”
- 卡片层负责快速扫描：预览图、名称、作者、版本、来源、完整/部分、生命周期、coverage 摘要
- 右侧详情面板负责深解释：coverage、missing coverage、兼容边界、overwrite impact、可用时的 Apply CTA
- 工具栏导入必须留在浏览器内部，让“导入 -> 检查 -> 选择 -> 应用”保持在同一条心智路径上
- 继续遵守 milestone 规则：未应用主题不做 live iframe preview

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 当前 milestone 与 Phase 80 需求
- `.planning/PROJECT.md` — 当前 v1.6 milestone 的目标、边界与已锁定决策
- `.planning/REQUIREMENTS.md` §Theme Browser & Selection UX — BRW-01 / BRW-02 / BRW-03 的需求原文
- `.planning/ROADMAP.md` §Phase 80: 主题浏览器与选择 UX — phase goal、success criteria、依赖关系

### Phase 80 产品与实现约束
- `docs/superpowers/specs/2026-04-27-phase-80-theme-browser-design.md` — 统一主题浏览器的产品结构、状态语义、preview policy、component boundary
- `docs/superpowers/plans/2026-04-27-phase-80-theme-browser-implementation.md` — 推荐实现拆分、测试面与落地文件范围
- `docs/superpowers/specs/ui-theme-system-v2-design.md` — v2 主题系统总体目标与四层主题体系背景

### 上游已冻结的包通路与兼容边界
- `.planning/phases/78-theme-package-contract-compatibility-boundaries/78-02-SUMMARY.md` — preflight-before-write、legacy partial labeling、static summary only 的既有边界
- `.planning/phases/79-unified-install-apply-export-pipeline/79-02-SUMMARY.md` — `.gmtheme` export / install / apply 通路已闭环，Phase 80 不得重开第二条链路

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/editor/components/theme/ThemePackageModal.vue` — 现有 built-in theme 卡片 modal；虽然结构偏早期，但可复用/迁移基础卡片样式与 apply wiring
- `src/editor/services/themePackageImport.js` — 已有 blocked / ready / legacy-partial 的静态摘要、coverage label、missing coverage、copy/skip/overwrite 计数格式化
- `src/editor/services/themePackageInstall.js` — full theme install/apply 的共享 renderer 入口；应继续作为唯一 apply path
- `src/editor/builtinThemes.js` — built-in theme manifest，是浏览器 built-in item 的初始元数据来源
- `src/shared/themePackageContract.js` — full-theme coverage / missing coverage / namespace contract 的基础定义

### Established Patterns
- **Preflight-before-write IPC**：`import-theme -> preflight-theme-package`，未打开的主题包只返回静态摘要，不直接写项目
- **Applied-state truth in script store**：`script.data.ui.theme.packageMeta` 标记当前应用的 theme package；`applyThemeBundle()` 原子替换 theme-owned UI bundle，并保留 undo 语义
- **Static preview boundary**：Phase 78 已冻结“未应用主题只看静态 summary / preview，不做 live iframe”
- **Shared package pipeline**：Phase 79 已冻结 install/apply/export 的 `.gmtheme` 路线；浏览器只能消费这些能力，不能复制或分叉

### Integration Points
- `src/editor/views/ProjectSettings.vue` — 当前 toolbar 里同时挂 `PresetModal` 与 `ThemePackageModal`，是统一浏览器的主要替换入口
- `electron/main.js` — 已有 `import-theme` / `preflight-theme-package` / `install-theme-package` / `export-gmtheme` IPC，可直接作为浏览器 orchestration 边界
- `src/editor/stores/script.js` §`applyThemeBundle()` — 应用 full theme 后写入 `packageMeta` 的事实来源
- `tests/themePackageImportUx.test.js`、`tests/scriptThemeApply.test.js`、`tests/themePackageInstallFlow.test.js` — 现有 focused 测试已锁定 import summary、apply semantics 与 package meta 行为，可作为 browser service / UI 的回归基线

</code_context>

<deferred>
## Deferred Ideas

- 未应用主题的 live iframe preview —— 明确留在后续 milestone 之外
- golden theme 与其余 4 套完整主题的内容生产 —— 分别属于 Phase 81 / 82
- partial theme 的“安装后独立生命周期”或更复杂 apply 规则 —— 本阶段不引入
- package registry、云同步、社区市场等主题分发系统 —— 不属于本 phase

</deferred>

---

*Phase: 80-theme-browser-ux*
*Context gathered: 2026-04-27*
