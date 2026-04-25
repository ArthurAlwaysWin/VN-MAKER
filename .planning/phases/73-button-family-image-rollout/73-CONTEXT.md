# Phase 73: 按钮族图片态扩面 - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只交付 **主要游戏界面按钮族的图片态扩面**：让用户可以按按钮族为 `game-menu-button`、`QAB`、`close-button family`、`page-tab / pager`、`settings-tab` 配置成组图片状态，并在真实运行时里看到这些状态切换，同时保持文字、图标、命中区域与点击行为稳定。

本阶段不扩面到：
- major screen 背景图 / 装饰层（Phase 74）
- cursor / icon slots 与全链路 parity gate（Phase 75）
- choice / title 之外的任意 selector 自由注册
- editor-only 假预览、单独的按钮预览沙盒、或第二套按钮皮肤系统

</domain>

<decisions>
## Implementation Decisions

### 按钮图片所有权与 schema
- **D-01:** Phase 73 的按钮族图片状态统一继续挂在 **`ui.theme` 的共享 button-family contract** 下，而不是散落到 `ui.gameMenu`、`ui.saveLoadScreen`、`ui.settingsScreen` 等每屏配置里。
- **D-02:** 覆盖矩阵在本 phase 冻结为 roadmap 已定义的 5 族：`game-menu-button`、`QAB`、`close-button family`、`page-tab / pager`、`settings-tab`；其余按钮不顺手扩 scope。

### 状态模型与 family mapping
- **D-03:** `game-menu-button`、`QAB`、`close-button family` 只要求 `normal / hover / pressed` 三态图片；QAB 现有 `.active` / `.disabled` 行为继续保留现有 CSS 语义，不在本 phase 升级成额外必填图片槽位。
- **D-04:** `page-tab / pager` 与 `settings-tab` 提供 `normal / hover / pressed / selected` 四态图片，其中 `selected` 必须直接复用现有 `.active` 选中语义，不引入新的选中状态机。
- **D-05:** `close-button family` 按“返回/关闭当前 screen”的 shared role 组织，至少覆盖现有 `.save-load-close`、`.backlog-close`、`.settings-close` 以及同职能的 structured settings close surface；`game-menu` 里的 `data-action="close"` 仍属于 `game-menu-button` 家族，而不是 close family。

### Runtime 接线方式
- **D-06:** Runtime 应沿用 Phase 71 的 shared UI image contract 与 `ThemeManager` 风格的 selector registry / CSS 注入方式扩面，避免在 `GameMenu.js`、`QuickActionBar.js`、`SaveLoadScreen.js`、`BacklogScreen.js`、`SettingsScreen.js` 中各自拼接一套 inline 背景逻辑。
- **D-07:** 选择器映射必须同时覆盖 default DOM 与现有 config-driven DOM 路径，让默认界面与已自定义布局的界面都能自动吃到同一套按钮族皮肤，而不是只覆盖某一条渲染分支。

### 可读性与交互保护
- **D-08:** 按钮图片必须作为视觉底层/背景层存在，文本、SVG 图标、对齐、padding 与 hit target 继续沿用现有按钮 DOM 作为事实来源；图片皮肤不能把文案或图标“画死”进素材里来替代现有内容层。
- **D-09:** 缺图、legacy 值失效、或只配置部分状态时，运行时继续回退到现有 CSS 按钮外观与现有 modifier class 行为；Phase 73 自己 touch 到的按钮表面不能因为图片缺失而失去点击能力或出现错位。

### 编辑器入口与真预览
- **D-10:** 按钮族图片配置入口应放在现有 **全局 / theme-oriented editor surface** 上集中管理，而不是在每个 screen section 中各自增加一套重复的三态字段表单。
- **D-11:** 完成标准继续以现有 runtime-backed 预览为准：`game-menu-button` 用 game menu screen 预览，`page-tab / pager` 用 save/load 预览，`settings-tab` 与 close family 用 settings/backlog/save-load 真实 screen 预览，`QAB` 用 dialogue/runtime surface；不新增 editor-only 本地按钮预览。

### the agent's Discretion
- `ui.theme` 下按钮族字段的具体命名（例如 `buttonFamilies.gameMenu` vs `buttons.gameMenuButton`）
- selector registry 的最终数据结构（静态映射、helper factory 或 contract-exported table）
- `close-button family` 是否通过别名表映射到多组 selector，还是通过单独 family key + multi-selector 输出
- editor 配置 UI 的具体排版方式，只要保持“集中配置、真实预览”原则即可

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/ROADMAP.md` §`Phase 73: 按钮族图片态扩面` — 本 phase 的目标、依赖与 success criteria
- `.planning/REQUIREMENTS.md` — `BTN-01`, `BTN-02`, `BTN-03`
- `.planning/PROJECT.md` — v1.5「UI 图片驱动体系」目标与“无新依赖 / 不换渲染栈”边界
- `.planning/STATE.md` — 当前 phase 顺序、已冻结的按钮族 coverage matrix 与风险提醒

### Upstream decisions and research
- `.planning/research/SUMMARY.md` — Phase 73 应按 family rollout 推进，而不是 selector-by-selector 零散扩面
- `docs/gap-analysis-vs-mature-engines.md` §`### 2. 按钮 — 全场景缺少图片态` — 为什么按钮必须以三态/四态图片作为主要视觉通路
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-CONTEXT.md` — canonical UI image contract、shared registry、legacy 兼容和 scan/export 基线
- `.planning/phases/72-dialogue-box-picture-loop/72-CONTEXT.md` — runtime-backed preview、视觉底层 layering 与 fallback 原则

### Existing code touchpoints
- `src/shared/uiImageContract.js` — 现有 canonical UI image roots 与 scan registry 扩面入口
- `src/editor/utils/uiImageField.js` — canonical UI image pick / clear helper
- `src/engine/ThemeManager.js` — 现有 nine-slice selector map、按钮 hover/active 状态 CSS 注入模式
- `src/ui/GameMenu.js` — `game-menu-button` runtime surface（默认路径 + config-driven 路径）
- `src/ui/QuickActionBar.js` — `QAB` runtime surface 与 `.active` / `.disabled` modifier 现状
- `src/ui/SaveLoadScreen.js` — `page-tab` / `.save-load-close` runtime surface
- `src/ui/BacklogScreen.js` — `.backlog-close` runtime surface
- `src/ui/SettingsScreen.js` — `settings-tab-btn` / `.settings-close` / structured close surface
- `src/editor/composables/useScreenLayoutEditor.js` — screen iframe preview owner 与 `show-screen` / `update-screen-layout` 通路
- `src/editor/components/layout/GameMenuSection.vue` — 现有 game menu editor surface，说明按钮文本/背景仍是 per-screen config
- `tests/themeManagerUiImage.test.js` — ThemeManager 对 canonical UI image、legacy data URL 与按钮状态 CSS 的回归基线

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/engine/ThemeManager.js`: 已有 selector → CSS 注入 → hover/active state 规则的成熟路径，说明按钮族扩面应建立在集中 registry 上，而不是每个 UI 类自己拼图片样式。
- `src/shared/uiImageContract.js`: 已经负责 canonical path 与 scan/export registry，是 Phase 73 扩按钮图字段的正确 contract owner。
- `src/editor/utils/uiImageField.js`: 已有标准选图 / 清图 helper，可直接复用到按钮族图片配置 UI。
- `src/editor/composables/useScreenLayoutEditor.js`: major screen 已经具备 iframe runtime 预览 owner，可为 page-tab / settings-tab / close family 提供真预览。

### Established Patterns
- v1.5 持续要求 **runtime-backed preview**，不接受 editor-only 假预览。
- canonical UI image 继续使用 `ui/...` 路径与 shared helper；legacy 值可读但不会成为新的标准写法。
- 当前按钮运行时大量依赖现有 class / `.active` / `.disabled` modifier 与文本/SVG 内容层，因此图片皮肤必须是“增强层”，不是替换 DOM 语义。

### Integration Points
- Theme contract 与 scan/export 扩面入口在 `ui.theme` + `src/shared/uiImageContract.js`。
- `game-menu-button` 在 `src/ui/GameMenu.js` 渲染；`QAB` 在 `src/ui/QuickActionBar.js`；`page-tab` / close buttons 在 `SaveLoadScreen.js`、`BacklogScreen.js`、`SettingsScreen.js`。
- 真预览 owner 已经存在于 `useScreenLayoutEditor.js`（screen surfaces）与现有 runtime dialogue/game surfaces，无需额外预览 harness。

</code_context>

<specifics>
## Specific Ideas

- [auto] 图片定义落点 — Q: “按钮族图片状态应该挂在哪里？” → Selected: “集中到 `ui.theme` shared family contract” (recommended default)
- [auto] rollout 策略 — Q: “是按固定 family matrix 一次铺开，还是按 selector 零散扩面？” → Selected: “按 roadmap 冻结的 5 个 family 一次铺开” (recommended default)
- [auto] 状态策略 — Q: “QAB / tabs 要不要顺手引入更多状态图槽？” → Selected: “只交付 requirement 定义的三态/四态；QAB active/disabled 继续用现有 CSS modifier” (recommended default)
- [auto] runtime & preview — Q: “按钮图片应该如何接线与验收？” → Selected: “复用 ThemeManager 风格 registry + 现有 runtime-backed preview owners，不做本地假预览” (recommended default)

- `close-button family` 应被当作“返回当前 screen”的统一视觉角色，而不是按每个 screen 各做一套独立皮肤。
- `selected` 只属于 tab/pager 家族，必须和当前 `.active` 逻辑对齐，否则会把 selection state 变成第二套语义。

</specifics>

<deferred>
## Deferred Ideas

- 为 `QAB` 的 `.active` / `.disabled` 再新增专门图片槽位 —— 可在后续 polish 或 Phase 75 统一 parity / fallback 时再评估
- 把更多 screen 内部按钮、slot card CTA、或任意 editor 按钮一起纳入按钮族 rollout —— 超出本 phase 冻结矩阵
- 单独的按钮预览沙盒、hover/pressed 调试器、或 editor-only 假按钮舞台 —— 明确不纳入本 phase

</deferred>

---

*Phase: 73-button-family-image-rollout*
*Context gathered: 2026-04-23*
