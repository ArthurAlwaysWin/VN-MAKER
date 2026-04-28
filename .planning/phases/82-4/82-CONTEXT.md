# Phase 82: 剩余 4 套完整主题扩展 - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付 **剩余 4 套 shipped complete themes**，让产品最终拥有 5 套都达到同一完整度标准的图片主题，而不是保留 1 套 golden theme 加 4 套换色或半成品。

Phase 82 必须建立在已完成的 `wafuu` golden baseline 之上，补齐另外 4 套 built-in themes 的完整 UI 交付，并确保它们继续走已经冻结的 browser / install / apply / export / import pipeline。

明确不做：

- 新增第 6 套或更多主题方向
- 新的 theme package/runtime/browser pipeline
- 未应用主题 live iframe preview
- 局部 scene/page theme override
- 主题字体打包、在线主题市场、云同步等 v2 能力

</domain>

<decisions>
## Implementation Decisions

### Theme roster 与基线继承
- **D-01:** Phase 82 直接升格现有 built-in roster 中尚未达到成品度的 4 套主题：`default`、`modern-sky`、`fantasy-dark`、`minimal-white`；不新开主题 ID，也不替换现有 shipped roster。
- **D-02:** `wafuu` 保持为已交付 golden baseline；Phase 82 的目标是把另外 4 套向 `wafuu` 的完整度收敛，而不是回退 golden standard。
- **D-03:** 继续复用现有 built-in theme manifest 与 browser item 入口，在原有 theme 定义上补齐完整资产与 screen/title 数据，而不是旁挂 runtime-only 特例主题。

### Completeness gate 与 pipeline invariants
- **D-04:** 这 4 套主题必须全部达到与 `wafuu` 相同的 8-surface full-theme coverage：`theme`、`widgetStyles`、`dialogueBox`、`saveLoadScreen`、`backlogScreen`、`gameMenu`、`settingsScreen`、`titleScreen`。
- **D-05:** built-in 与 imported 主题继续共用同一条 install / apply / export / import / browser pipeline；Phase 82 不得为“剩余 4 套量产”新增第二条链路。
- **D-06:** 本阶段的完成口径不是“主题看起来差不多能用”，而是主题浏览器里最终出现 5 套 full themes，且每一套都能通过 apply → save/reopen → export → reimport 的一致性验证。

### Visual differentiation standard
- **D-07:** 差异化标准必须体现在材质语言、轮廓语言与整体风格倾向上，不能只靠 token 换色或轻微控件色差来冒充“新主题”。
- **D-08:** 推荐保留并强化现有命名已经暗示的方向：`default` = polished neutral baseline、`modern-sky` = modern clean / airy glass-panel language、`fantasy-dark` = ornate dark-fantasy language、`minimal-white` = bright minimal editorial language。
- **D-09:** 每套主题都必须让 `titleScreen`、dialogue、button families、major screens 读起来像同一套系统 UI，而不是“某个界面很完整、其他界面只是跟色”。

### Production strategy 与复用边界
- **D-10:** 允许复用 shared schema、coverage metadata、browser normalization、install/apply/export services 与安全的结构模板，但只在不削弱风格辨识度时复用。
- **D-11:** 可复用的是稳定的技术骨架与非表达性结构（例如 action wiring、screen data shape、可验证的坐标 scaffolds）；不可接受的是直接把 `wafuu` 或其他主题的视觉素材/布局当作换色底稿。
- **D-12:** 主题资产与 manifest 应继续落在现有 project-local / canonical path 体系内，保持扫描、导出、浏览器 preview 与 package metadata 的一致性。

### the agent's Discretion
- 4 套主题的具体资产制作顺序
- 每套主题的 preview card 构图与文案细节
- 哪些坐标 / layout skeleton 可以安全复用而不损伤辨识度
- 单个 screen 内装饰层数量与素材颗粒度，只要满足完整度与风格差异标准

</decisions>

<specifics>
## Specific Ideas

- [auto] Selected all gray areas: Theme roster 与基线继承、Completeness gate 与 pipeline invariants、Visual differentiation standard、Production strategy 与复用边界。
- 用户要看到的是 **5 套都能直接交付使用的完整主题**，而不是 1 套 hero sample + 4 套 filler variants。
- `default` 不应继续只是“空覆盖 / 引擎默认态”，而应成为一套打磨过的 neutral shipped baseline。
- `modern-sky`、`fantasy-dark`、`minimal-white` 应保留当前名字承诺的风格方向，但交付级别要提升到与 `wafuu` 同档。
- 推荐先锁定每套主题的风格角色与完整度 checklist，再拆任务，避免实现阶段又退回“先补几个槽位看看”。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone boundary
- `.planning/PROJECT.md` — 当前 v1.6 milestone 目标、已完成的 78-81 阶段、以及 Phase 82 的当前定位
- `.planning/REQUIREMENTS.md` §Shipped Complete Themes — THM-02 / THM-03 的需求原文与 milestone out-of-scope 边界
- `.planning/ROADMAP.md` §Phase 82: 剩余 4 套完整主题扩展 — 本阶段 goal、success criteria、依赖关系

### Golden baseline 与上游锁定决策
- `.planning/phases/81-golden-theme/81-CONTEXT.md` — Golden `wafuu` 的完整度定义、title-inclusive boundary、shared pipeline 约束
- `.planning/phases/81-golden-theme/81-03-SUMMARY.md` — Phase 81 最终 acceptance evidence、settings/exported runtime regression 修复、golden baseline closeout
- `.planning/phases/80-theme-browser-ux/80-CONTEXT.md` — unified browser 的状态语义、static preview policy、single browse/import/apply surface

### Theme system code contracts
- `src/editor/builtinThemes.js` — 现有 5 套 built-in themes 的 manifest；可直接看出 `wafuu` 已接近 full baseline，而其余 4 套仍需补齐
- `src/shared/themePackageContract.js` — `FULL_THEME_COVERAGE_KEYS` 与 full-theme completeness gate，Phase 82 必须严格对齐这 8 个 coverage surfaces
- `src/editor/services/themeBrowser.js` — built-in/imported theme browser item normalization、coverage labels、applied-state semantics
- `src/editor/services/themePackageInstall.js` — shared install/apply renderer entry；built-in/imported 仍需共用这条路径

### Verification baseline
- `tests/themeGoldenAcceptance.test.js` — Golden `wafuu` 的 apply/save/export/reimport parity baseline，可作为 Phase 82 扩展 4 套主题时的回归参照
- `tests/themePackageInstaller.test.js` — 安装与 apply 路线的既有测试基础
- `tests/scriptThemeApply.test.js` — applied package metadata 与 shared apply semantics 的测试基础

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/editor/builtinThemes.js` — 现有 built-in theme roster 与各主题基础 manifest；Phase 82 主要在这里补齐剩余 4 套主题的数据与引用资产
- `src/shared/themePackageContract.js` — 全量 coverage contract 已冻结为 8 surfaces，可直接作为 completeness gate
- `src/editor/services/themeBrowser.js` — 浏览器已经把 built-in theme 默认按 full-theme coverage 展示；补齐 manifest 后可直接受益
- `src/editor/services/themePackageInstall.js` / `src/editor/stores/script.js` — shared install/apply path 已存在，不需要新 orchestration
- `tests/themeGoldenAcceptance.test.js`、`tests/themePackageInstaller.test.js`、`tests/scriptThemeApply.test.js` — 可以扩展为剩余 4 套主题的 focused regression basis

### Established Patterns
- **single built-in manifest source**：内置主题通过 `BUILTIN_THEMES` 统一定义，不应拆成多套 registry
- **shared full-theme contract first**：是否“完整主题”由 coverage contract 决定，不由 UI copy 或人工口径兜底
- **theme browser as single browse/import/apply surface**：浏览器仍是用户理解和应用 5 套主题的入口
- **project-local package pipeline**：主题资产与 package metadata 继续遵守 canonical path / project-local install 的既有路径

### Integration Points
- `src/editor/builtinThemes.js` — 剩余 4 套主题最直接的 manifest/data 补齐点
- `src/editor/services/themeBrowser.js` / `src/editor/components/theme/ThemeBrowserModal.vue` — Phase 82 完成后需要能稳定展示 5 套 full themes 的状态与 coverage
- `src/shared/themePackageContract.js` / installer / exporter 相关链路 — 新补齐的 built-in themes 必须继续通过 full-theme packaging semantics
- `tests/themeGoldenAcceptance.test.js` 与相关 apply/export tests — 验证每套主题都没有回退成 partial 或 runtime-only 特例

</code_context>

<deferred>
## Deferred Ideas

- 新增更多 built-in themes 或替换现有 5 套 roster —— 后续 milestone / backlog
- 主题字体打包、在线主题市场、云同步 —— 已在 v2 / out-of-scope 中明确延后
- 未应用主题 live iframe preview —— 当前 milestone 明确不做
- scene/page 级局部主题覆盖 —— 当前 milestone 明确不做

</deferred>

---

*Phase: 82-4*
*Context gathered: 2026-04-28*
