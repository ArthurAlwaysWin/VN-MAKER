# Phase 76: 图标运行时闭环与回退修复 - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只负责收口 v1.5 审计中明确暴露的 **图标 runtime / fallback 闭环缺口**：让 `ui.theme.icons.qab` 真正进入 preview / runtime / export 的运行时消费链路，并让错误路径、缺图、空槽位稳定回退到默认图标或默认文字。它不重新扩展新 icon slot，也不把 milestone verification backfill 混进本 phase。

</domain>

<decisions>
## Implementation Decisions

### 闭环范围
- 必须把 `QAB` 图标从“编辑器可配 + 扫描/导出可带”补到“运行时真实显示”。
- 必须把 `themeIconHelpers` 的 fallback 从“未配置时回退”升级到“坏路径/缺图时也回退”。
- 优先修复 preview / runtime / export 共用运行时逻辑，避免只补单一链路。

### 范围控制
- 不新增新的 icon slot。
- 不重做按钮族图片系统；只处理 theme icon 相关的 runtime consumer 与 fallback 合同。
- 不在本 phase 补 71 / 72 / 74 / 75 的 VERIFICATION.md；这些归 Phase 77。

### the agent's Discretion
- 允许 agent 自主决定 QAB 图标是继续保留 SVG 作为 fallback 还是抽成统一 helper，只要最终满足 preview/runtime/export parity 与 fallback 合同。
- 允许 agent 自主决定是否把图标 fallback 做成通用 helper 或在 consumer 层兜底，但必须复用现有模式、避免引入第二套图标系统。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/editor/components/theme/CursorIconSettings.vue` 已负责写入 `ui.theme.icons.*`。
- `src/ui/themeIconHelpers.js` 已有 `resolveThemeIcon()` / `hasThemeIcon()`，但只处理“未配置”回退。
- `src/main.js` 已把 `themeIcons` 传给 SaveLoad / GameMenu / Backlog / Settings。

### Established Patterns
- 主题视觉入口统一经 `ui.theme.*` → `main.js` → runtime consumer。
- scan/export 已通过 `src/shared/uiImageContract.js` 与 `src/engine/scanAssets.js` 收集 icon 路径。
- v1.5 约定缺图时回退到系统已有视觉，而不是报错中断。

### Integration Points
- `src/main.js`
- `src/ui/QuickActionBar.js`
- `src/ui/themeIconHelpers.js`
- 相关回归测试：`tests/themeManagerUiImage.test.js`、`tests/themeIconHelpers.test.js`，以及后续需新增的 QAB icon/runtime coverage

</code_context>

<specifics>
## Specific Ideas

优先按 audit 里的两个 blocker 组织实现：
1. 补 `QAB` icon runtime consumer
2. 补 themed icon 缺图 fallback

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
