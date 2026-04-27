# Phase 81: Golden Theme 验收样板 - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段要交付 **1 套真正 fully-delivered 的非内容 UI/UX 美术方案**，它不再只是当前 v1.6 full-theme contract 的“完整主题包样板”，而是要把 **title screen 也纳入**，形成游戏内容之外主要 UI 面的第一套成品级 golden theme。

本阶段必须同时证明：

1. golden theme 在编辑器中可浏览、可应用、可保存、可重开、可导出、可重新导入。
2. golden theme 覆盖的不只是 token / screen chrome，而是 **title、dialogue、save/load、backlog、game menu、settings** 等主要非内容 UI 面。
3. 这是 **Phase 81 的 1 套验收样板**，不是 Phase 82 的 5 套量产扩展。

明确不做：

- 5 套主题量产与风格矩阵扩展（Phase 82）
- 新的 theme runtime / package pipeline
- 再造第二套 title 预览或第二套 apply/export 链路
- 超出“非内容 UI”范围的游戏内容美术（角色、CG、场景剧情内容）

</domain>

<decisions>
## Implementation Decisions

### Golden theme 的定义被显式扩大
- **D-01:** 用户明确要求 golden theme 是一套 **完整的整体 UI/UX 美术与方案**，范围包含 `title screen`，而不只是当前 frozen full-theme contract 的 7 个 theme-owned UI area。
- **D-02:** Phase 81 必须把“当前 contract 不含 title screen”视为本 phase 需要对齐的真实边界，而不是把 title 排除在 golden theme 验收之外。
- **D-03:** golden theme 的验收口径是“游戏内容之外主要 UI 面整体交付感”，不是“只要 package contract 满足现有 7 项 coverage 就算完成”。

### 基线策略
- **D-04:** 推荐以现有 **`wafuu`** 作为 golden baseline，而不是在本 phase 凭空新开一套完全陌生的主题方向；原因是它是当前唯一明确被标注为 full-like、且已经带有九宫格/界面布局倾向的 built-in theme。
- **D-05:** 以 `wafuu` 为 baseline 不等于只做小修小补；planner 应把它视为“升格为成品样板”，补齐 title 与其余非内容 UI 的整体艺术一致性。
- **D-06:** 其他 built-in themes 目前更像配色/控件风格变体，不应与 golden theme 一样要求在本 phase 达到相同成品度。

### 系统边界与链路约束
- **D-07:** Phase 81 继续复用 Phase 78-80 已经冻结的 browser / install / apply / export / import 路线；不得为了 golden theme 再造第二条链路。
- **D-08:** Phase 81 允许为 title screen 纳入 golden theme 范围而扩展现有 contract / browser / export surfaces，但扩展必须服从现有 shared theme package ownership，而不是旁挂一套 title-only 特例系统。
- **D-09:** golden theme 的浏览器呈现仍然使用 Phase 80 的统一主题浏览器；title 被纳入后，浏览器中的 coverage / impact / 完整度说明也必须反映这次扩边。

### 验收与一致性
- **D-10:** golden theme 应用后必须在编辑器预览、保存/重开、试玩、导出产物、重新导入后保持一致，不允许出现 title 或其他 major UI 面掉图、回退到默认态、或局部 contract 漂移。
- **D-11:** Phase 81 的核心不是“先做一张好看的图”，而是让 **一套完整美术方案** 穿过整条 v1.6 delivery pipeline 并保持一致。
- **D-12:** planner 应将 title 纳入 requirement / validation / verification 证据链，而不是只在实现里顺手支持、文档里却继续按旧 coverage 写法验收。

### the agent's Discretion
- `wafuu` 升格时是保留现有和风方向还是对细节做中度重塑，只要仍能作为第一套 shipped golden theme 即可
- title screen 与其他 UI 面的具体视觉连接方式（字体、饰件、按钮语言、背景/边框母题）
- browser 中如何展示“这套 theme 额外覆盖 title screen”的 copy 与 badge，只要不弱化已锁定状态语义

</decisions>

<specifics>
## Specific Ideas

- golden theme 要被用户感知为“这一套就是整个系统界面的成品方案”，而不是“几个界面换图了”
- title screen 需要与 dialogue/save-load/backlog/game-menu/settings 形成统一的视觉语法
- 既然这是验收样板，就应优先选择现有最接近完整度的 built-in baseline（目前是 `wafuu`），把 Phase 81 的主要成本花在**补齐完整度与链路一致性**，而不是先浪费在重新发明主题方向
- Phase 80 的 unified browser 应继续作为入口，让用户能直接看见这套 golden theme 的完整性与覆盖说明

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 当前 milestone / roadmap / requirements
- `.planning/PROJECT.md` — 当前 v1.6 milestone 目标与 Phase 80 完成后的项目状态
- `.planning/REQUIREMENTS.md` §THM-01 — Golden theme 的现有需求口径（后续 planning 需据本 context 扩充 title 范围）
- `.planning/ROADMAP.md` §Phase 81 / Phase 82 — golden theme 样板与 5 套量产扩展的阶段边界

### 刚完成的浏览器与主题包链路
- `.planning/phases/80-theme-browser-ux/80-CONTEXT.md` — unified browser 的锁定决策
- `.planning/phases/80-theme-browser-ux/80-RESEARCH.md` — theme browser / imported entry / apply-impact 的技术边界
- `.planning/phases/80-theme-browser-ux/80-VERIFICATION.md` — Phase 80 已验证的浏览器与 packageMeta truth 证据
- `.planning/phases/78-theme-package-contract-compatibility-boundaries/78-02-SUMMARY.md` — preflight / static summary / legacy-partial 边界
- `.planning/phases/79-unified-install-apply-export-pipeline/79-02-SUMMARY.md` — shared install/apply/export pipeline 已闭环

### Title 与现有 UI 资产背景
- `src/ui/TitleScreen.js` — title runtime surface；当前支持 `ui.titleScreen` 自定义布局，但尚未被纳入现有 full-theme coverage contract
- `src/editor/views/TitleDesigner.vue` — title 编辑能力与 preview 入口
- `.planning/milestones/v0.2-phases/08-title-page-designer/08-CONTEXT.md` — title page 设计器的历史边界与能力
- `.planning/milestones/v1.3-phases/59-title-page-preview/59-CONTEXT.md` — title 预览相关既有边界

### 主题系统背景
- `docs/superpowers/specs/ui-theme-system-v2-design.md` — 主题系统整体目标与分层设计
- `src/editor/builtinThemes.js` — built-in theme baseline，其中 `wafuu` 是当前最接近完整主题样板的一套
- `src/shared/themePackageContract.js` — 当前 frozen full-theme coverage 定义，说明 title 尚未纳入 contract

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/editor/builtinThemes.js` — 当前 golden baseline 最合理的候选来源；`wafuu` 明确带有更完整的 theme/screen 形态
- `src/editor/components/theme/ThemeBrowserModal.vue` — 已交付的 unified browser，可继续承载 golden theme 的浏览与说明
- `src/editor/services/themePackageInstall.js` / `src/editor/services/themePackageExport.js` — 继续复用的 apply/export 边界
- `src/ui/TitleScreen.js` — title runtime 已支持自定义 layout/background/button/image/text，说明 title 本身并非能力空白，而是 contract 尚未纳入
- `src/editor/views/TitleDesigner.vue` — title 编辑器与 iframe preview 已存在，是 Phase 81 纳入 title 的关键 leverage 点

### Established Patterns
- **shared package pipeline first**：导入/应用/导出必须继续复用现有 `.gmtheme` 链路
- **theme browser as the single browse/import/apply surface**：Phase 80 已冻结
- **image-driven non-content UI**：dialogue / save-load / backlog / game-menu / settings 已有图片化/主题化合同和运行时 owner
- **title is capability-ready but contract-external**：runtime/editor 两侧都能处理 title 自定义布局，但 `FULL_THEME_COVERAGE_KEYS` 目前未把它算进完整主题

### Integration Points
- `src/shared/themePackageContract.js` — 若要让 golden theme 真正包含 title，这里及相关 import/export/browser surfaces 很可能需要扩边
- `src/editor/services/themeBrowser.js` / `ThemeBrowserModal.vue` — 需要同步“golden theme 完整度”与 coverage 文案，否则 title 扩边不会体现在浏览器中
- `src/utils/themePackager.js` / theme package installer/exporter tests — golden theme 一旦纳入 title，package build / parse / install / export 的验证面也必须跟进
- `tests/scriptThemeApply.test.js`, `tests/themePackageInstallFlow.test.js`, `tests/themePackageRoundTrip.test.js`, `tests/themePackageExporter.test.js` — 现有链路测试基础可被扩展为 golden theme 的闭环证据

</code_context>

<deferred>
## Deferred Ideas

- 剩余 4 套完整主题的量产、风格矩阵与主题库扩展 —— Phase 82
- 主题商店、社区共享、远程仓库等主题分发能力 —— 不属于 Phase 81
- 新的 preview runtime 或新的 package format —— 不属于本 phase

</deferred>

---

*Phase: 81-golden-theme*
*Context gathered: 2026-04-27*
