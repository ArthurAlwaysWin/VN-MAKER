# Phase 80: theme-browser-ux - Research

**Researched:** 2026-04-27
**Domain:** Unified theme browser UX over the existing Phase 78/79 theme package pipeline
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
#### 浏览器结构与入口收敛
- **D-01:** Phase 80 采用 **single unified theme browser**，替换当前分裂的“预设 / 完整主题”浏览入口，而不是继续维护多个平行 modal。
- **D-02:** 浏览器固定为四区结构：顶部工具栏（含导入）、左侧筛选栏、中部卡片列表、右侧详情面板；导入动作被纳入浏览流，而不是浏览器外的独立流程。
- **D-03:** 本阶段聚焦“浏览、理解、选择”体验本身；不得把范围扩成主题内容制作、包格式演化、安装链路重写或新的预览系统。

#### 统一数据模型与真相来源
- **D-04:** 浏览器里的所有主题都归一到同一 item shape，并使用正交状态维度：`source`、`mode`、`lifecycle`、`coverage`、`missingCoverage`、`applyImpact`、`preview`。
- **D-05:** 当前“已应用主题”的唯一真相源是 `script.data.ui.theme.packageMeta`；planner 不得引入 browser-only registry 或第二套 applied state。
- **D-06:** built-in 和 imported full themes 必须在浏览器层看起来是同类实体，只在来源与生命周期上区分；渲染层统一消费归一化数据，而不是在组件里分支两套逻辑。
- **D-07:** imported 项的浏览器信息优先复用 Phase 78/79 已有 contract / preflight / install metadata（`coverage`、`missingCoverage`、namespace、copy/skip/overwrite 计数），而不是重新推导一套平行摘要。

#### 操作资格与状态表达
- **D-08:** full built-in theme 与 full imported theme 都显示 **Apply** CTA，但实际应用必须继续走共享的 Phase 79 install/apply path；浏览器只做 orchestration，不复制写入逻辑。
- **D-09:** legacy-partial / compatibility-only 主题必须与 full theme 明显区隔：可浏览、可解释 coverage/missing coverage，但不能呈现为“整包替换候选”。
- **D-10:** 当前已应用的主题卡必须显示 `当前已应用` 生命周期，并隐藏主 Apply CTA，避免与“已导入但未应用”混淆。
- **D-11:** 浏览器支持的状态语义至少覆盖：`内置可用`、`已导入`、`当前已应用`、`兼容导入 / 部分主题`；后续 planner 与实现不得弱化这几个状态边界。

#### 预览、覆盖说明与错误反馈
- **D-12:** 未应用主题仍坚持 **static preview only**；如果没有真实预览资产，使用稳定且可重复的 fallback thumbnail，不允许空白或 broken image。
- **D-13:** overwrite impact 必须在 apply 前计算并展示；若当前项目已有 applied package 且 coverage 重叠，则明确告知会覆盖哪些 theme-owned UI area；若没有 `packageMeta`，则退化为“首次写入这些范围”的解释文本。
- **D-14:** 若项目元数据不完整或主题当前不可应用，浏览器必须给出保守说明与原因文本，而不是硬失败或只做静默禁用。
- **D-15:** 导入成功后浏览器应立即刷新、自动选中新条目并在浏览器内给出短反馈；导入失败时必须保留现有 filter/search/selection/detail 状态，并把错误贴近工具栏导入入口展示。

### the agent's Discretion
- 卡片密度、badge 的视觉层级、筛选控件的具体形态（chip / checkbox / segmented control）
- fallback thumbnail 的具体绘制方式与占位文案
- 覆盖摘要与 overwrite 文案的精炼表达
- 详情面板中 coverage / missing coverage / impact 的分组顺序，只要不破坏已锁定的信息边界

### Deferred Ideas (OUT OF SCOPE)
- 未应用主题的 live iframe preview —— 明确留在后续 milestone 之外
- golden theme 与其余 4 套完整主题的内容生产 —— 分别属于 Phase 81 / 82
- partial theme 的“安装后独立生命周期”或更复杂 apply 规则 —— 本阶段不引入
- package registry、云同步、社区市场等主题分发系统 —— 不属于本 phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BRW-01 | 用户在主题浏览器里能看到每个主题的卡片预览图、名称、作者、版本、来源（内置 / 导入）、兼容信息和完整/部分主题标识 | Unified normalized item shape; built-in/imported source mapping; deterministic preview fallback; manifest/preflight-derived labels |
| BRW-02 | 用户在应用主题前可以查看它覆盖哪些 UI 面，及本次操作会覆盖当前项目中的哪些范围，而不需要先实际应用才知道结果 | Reuse `coverage` / `missingCoverage` from contract + preflight, add browser-only `computeThemeApplyImpact()` against current `packageMeta` |
| BRW-03 | 用户可以清楚分辨一个主题当前处于“内置可用 / 已导入 / 当前已应用 / 仅兼容部分主题”中的哪种状态 | Lifecycle derived from `script.data.ui.theme.packageMeta`; mode derived from preflight contract; UI badges stay orthogonal |
</phase_requirements>

## Summary

Current code is split across `PresetModal.vue` and `ThemePackageModal.vue`. The package mechanics are already in place: preflight (`import-theme -> preflight-theme-package`), install/apply (`install-theme-package` via `installAndApplyThemePackage()`), and applied-state persistence (`script.data.ui.theme.packageMeta`). What is missing is the browser layer that normalizes built-in and imported items into one planner-safe shape and one unified modal composition.

The implementation should stay thin: add a `themeBrowser` service that maps existing built-in manifest data, imported preflight metadata, and current applied package metadata into one UI item model; then build a single `ThemeBrowserModal.vue` that owns selection/filter/import feedback and delegates actual apply to the Phase 79 service. Do not add a second registry, do not add unopened live preview, and do not reimplement package writes.

**Primary recommendation:** Build `src/editor/services/themeBrowser.js` + `src/editor/components/theme/ThemeBrowserModal.vue`, and make `ProjectSettings.vue` route all theme browsing/import/apply through that pair while preserving `script.data.ui.theme.packageMeta` as the only applied-state truth.

## Project Constraints (from copilot-instructions.md)

- Use **JavaScript ES modules + Vue 3 + Electron**; **do not migrate to TypeScript**.
- Keep renderer file access behind **`window.ipcRenderer.invoke()`**; do not add direct filesystem access in the browser UI.
- Preserve **Windows-first** behavior and avoid macOS-hostile assumptions.
- Keep **dark-theme, pure CSS, Chinese UI** conventions.
- JS modules use **explicit `.js` extensions**, **named exports**, **single quotes**, **semicolons**, and **2-space indentation**.
- IPC/services should keep the repo’s **`{ success, error? }` result-object** pattern.
- Handle errors at boundaries; do not introduce uncaught throws across UI/IPC seams.
- Stay inside GSD workflow expectations; Phase 80 should be planned as focused repo edits, not an architectural reset.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | repo `^3.5.31`, latest verified `3.5.33` (2026-04-22) | Unified modal/view composition | Existing editor UI stack; no new UI framework needed |
| Pinia | repo `^3.0.4`, latest verified `3.0.4` (2025-11-05) | Current script/project state access | Existing stores already expose the only applied-state truth |
| Electron IPC | repo `^41.0.4`, latest verified `41.3.0` (2026-04-22) | Import / preflight / install / export bridge | Package pipeline is already locked behind IPC handlers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | repo `^4.1.4`, latest verified `4.1.5` (2026-04-21) | Focused regression tests | Service tests and source-level UI wiring checks |
| fflate | repo `^0.8.2` | Theme package parsing/ZIP handling | Reused indirectly through existing preflight/install code, not new Phase 80 UI logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New browser store | Modal-local refs + existing Pinia stores | Avoids inventing a second truth source |
| New component test library | Existing Vitest helper/source tests | Matches current repo patterns, avoids new deps |
| New install/apply code | `installAndApplyThemePackage()` | Required to preserve Phase 79 behavior and tests |

**Installation:**
```bash
npm install
```

**Version verification:** Verified via `npm view vue version`, `npm view pinia version`, `npm view vitest version`, `npm view electron version` on 2026-04-27.

## Architecture Patterns

### Recommended Project Structure
```text
src/editor/
├── components/theme/
│   └── ThemeBrowserModal.vue     # unified browser composition
├── services/
│   ├── themeBrowser.js           # normalization/filter/impact/preview helpers
│   ├── themePackageImport.js     # extend preflight result with browser entry
│   └── themePackageInstall.js    # existing shared apply path (preserve)
└── views/
    └── ProjectSettings.vue       # replace split modal wiring with one entry

tests/
├── themeBrowserService.test.js   # normalization + impact
├── themeBrowserModal.test.js     # unified modal source/UI assertions
├── themeBrowserRouting.test.js   # ProjectSettings wiring regression
└── themePackageImportUx.test.js  # extend import result/browser-entry coverage
```

### Current Data Sources to Preserve
| Concern | Existing Source | Notes |
|--------|-----------------|-------|
| Built-in themes | `src/editor/builtinThemes.js` | Canonical built-in manifest; currently has `id/name/description/primaryColor/tokens/widgetStyles/screens`, but no author/version/preview fields |
| Imported theme metadata before apply | `electron/themePackagePreflight.js` + `src/editor/services/themePackageImport.js` | Already yields `status`, `themeId`, `assetRoot`, `coverage`, `missingCoverage`, `counts`, warnings/errors |
| Applied lifecycle truth | `src/editor/stores/script.js` → `script.data.ui.theme.packageMeta` | Must remain the only applied-state truth |
| Shared apply path | `src/editor/services/themePackageInstall.js` | Already routes built-in via `source='builtin'` and imported via `source='file'` |
| Coverage contract | `src/shared/themePackageContract.js` | `FULL_THEME_COVERAGE_KEYS` + legacy-partial classification |
| Current toolbar entry point | `src/editor/views/ProjectSettings.vue` | Today still opens `PresetModal` and `ThemePackageModal` separately |

### Pattern 1: Thin `themeBrowser` service layer
**What:** Add a pure helper module that normalizes built-in items, imported preflight/browser-session items, and current applied package state into one browser item shape.
**When to use:** For all badge/lifecycle/filter/detail decisions; views should render normalized items, not inspect raw built-in/preflight objects directly.
**Example:**
```js
// Source: repo pattern from src/editor/services/themePackageInstall.js + src/editor/stores/script.js
const appliedMeta = scriptData?.ui?.theme?.packageMeta ?? null;
const appliedThemeId = appliedMeta?.themeId ?? null;
const appliedSource = appliedMeta?.source === 'file' ? 'imported' : appliedMeta?.source;

return {
  id: `builtin:${theme.id}`,
  rawId: theme.id,
  source: 'builtin',
  mode: 'full',
  lifecycle: appliedThemeId === theme.id && appliedSource === 'builtin' ? 'applied' : 'available',
};
```

**Preserve these exact boundaries:**
- `packageMeta.source` currently uses **`'builtin'`** and **`'file'`**. Browser UI may map `'file' -> 'imported'`, but **must not change persisted schema**.
- `mode` is contract mode (`full` vs `legacy-partial`), not “has all seven coverage keys”.
- `counts.overwrite` from preflight is **namespace file overwrite count**, not user-facing apply-impact overlap.

### Pattern 2: Unified modal/view composition
**What:** Replace the split `PresetModal` + `ThemePackageModal` entry with one `ThemeBrowserModal` containing toolbar import, filter rail, card list, and detail panel.
**When to use:** In `ProjectSettings.vue`, where the browser becomes the only browse/import/apply entry.
**Example:**
```vue
<!-- Source: current split wiring in src/editor/views/ProjectSettings.vue -->
<ThemeBrowserModal
  v-if="showThemeBrowser"
  @close="onThemeBrowserClose"
/>
```

**Code gaps this fills:**
- No current unified component exists.
- `ThemePackageModal.vue` only browses built-in themes.
- `PresetModal.vue` still mixes color presets, export, import summary, and imported apply CTA inside a different modal.
- `ProjectSettings.vue` currently exposes two separate buttons and two separate modals.

### Pattern 3: Preflight-first import inside the browser
**What:** Keep toolbar import as `import-theme -> preflight-theme-package`, then convert the result into a browser entry + inline feedback; only full themes get an Apply CTA in the detail panel.
**When to use:** User clicks import from inside the browser.
**Example:**
```js
// Source: src/editor/services/themePackageImport.js
const fileResult = await ipcRenderer.invoke('import-theme');
const preflight = await ipcRenderer.invoke('preflight-theme-package', {
  filePath: fileResult.filePath,
});
```

**Required Phase 80 extension:** `preflightThemePackageImport()` should also return a normalized `browserEntry` so the browser can immediately select newly imported items without inventing a second install/apply path.

### Current Gaps Phase 80 Must Fill
- Add `src/editor/services/themeBrowser.js`; it does not exist today.
- Add imported browser-session item creation; `themePackageImport.js` currently returns only `summary` + raw `preflight`.
- Compute **apply impact by coverage overlap**, not by namespace file overwrite counts.
- Provide deterministic **preview fallback**; built-ins and preflighted imports currently have no preview asset field.
- Add author/version display strategy for built-ins; `builtinThemes.js` does not currently carry those fields.
- Keep browser filter/search/selection/detail state stable on import failure/cancel.
- Preserve current Project Settings iframe behavior after modal close/apply, but do not reuse it for unopened-theme live preview.

### Likely File Touch Set
- Create: `src/editor/services/themeBrowser.js`
- Create: `src/editor/components/theme/ThemeBrowserModal.vue`
- Modify: `src/editor/services/themePackageImport.js`
- Modify: `src/editor/views/ProjectSettings.vue`
- Modify: `src/editor/helpTexts.js`
- Optional modify: `src/editor/builtinThemes.js` (only if planner wants manifest-level author/version/preview metadata instead of service defaults)
- Leave shared pipeline files as reusable boundaries, not rewrite targets: `src/editor/services/themePackageInstall.js`, `electron/themePackagePreflight.js`, `electron/themePackageInstaller.js`, `src/editor/stores/script.js`

### Anti-Patterns to Avoid
- **Second install/apply path:** never write bundle/apply logic in the browser component.
- **Browser-owned applied registry:** never mirror applied state outside `script.data.ui.theme.packageMeta`.
- **Unopened live preview:** do not wire the Project Settings iframe into theme cards/details.
- **Component-level raw branching:** do not let cards/details separately special-case built-in vs imported vs legacy-partial from raw data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Apply/install | New browser-only theme write logic | `installAndApplyThemePackage()` + `install-theme-package` IPC | Existing tests already lock the shared Phase 79 path |
| Coverage classification | New ad-hoc imported theme parser in the renderer | `preflight-theme-package` + `themePackageContract.js` metadata | Contract rules and legacy-partial labeling are already frozen |
| Applied-state tracking | Browser-local “current theme” registry | `script.data.ui.theme.packageMeta` | Required hard constraint; keeps reopen/export/apply semantics aligned |
| Imported source schema | Rewrite `packageMeta.source` to `'imported'` in persisted project data | UI-only mapping from `'file'` to `'imported'` | Avoids migration/spec drift |
| Preview system | Hidden iframe screenshots for unopened themes | Deterministic fallback thumbnail helper | Live preview is explicitly out of scope |

**Key insight:** Phase 80 is mostly a normalization/composition job. Package mechanics already exist; planner should spend effort on shaping data for the UI, not rebuilding Phase 78/79.

## Common Pitfalls

### Pitfall 1: Treating preflight overwrite counts as user-facing apply impact
**What goes wrong:** The browser tells users “会覆盖 2 项” based on namespace file writes, not on UI coverage overlap.
**Why it happens:** `preflight.counts.overwrite` measures filesystem overwrite within `ui/themes/<themeId>/`, not which active theme-owned UI areas would change.
**How to avoid:** Add a separate `computeThemeApplyImpact(item, currentProjectState)` helper based on `coverage` and current `packageMeta`.
**Warning signs:** Detail panel copy mentions copy/skip/overwrite counts where it should explain `theme/widgetStyles/dialogueBox/...`.

### Pitfall 2: Confusing contract mode with coverage completeness
**What goes wrong:** Full themes with partial coverage get mislabeled as legacy-partial, or legacy-partial gets an Apply CTA.
**Why it happens:** `mode` and `coverage` are orthogonal in this codebase.
**How to avoid:** Drive CTA eligibility from `mode`; drive explanation from `coverage` + `missingCoverage`.
**Warning signs:** Cards collapse “完整/部分” and “覆盖多/少” into one badge.

### Pitfall 3: Breaking the only applied-state truth
**What goes wrong:** Browser badges drift from real applied project state after save/reopen/export.
**Why it happens:** UI caches lifecycle separately instead of deriving from `script.data.ui.theme.packageMeta`.
**How to avoid:** Recompute lifecycle from script store on every open/refresh.
**Warning signs:** An imported theme still shows `当前已应用` after another theme was applied elsewhere.

### Pitfall 4: Clearing browser context on import failure
**What goes wrong:** Search/filter/selection/detail reset after a canceled or failed import.
**Why it happens:** Import handler replaces the entire browser state instead of patching result/feedback only.
**How to avoid:** Keep import feedback scoped near toolbar; only append/select new item on successful preflight/import.
**Warning signs:** Detail panel goes blank after import error.

### Pitfall 5: Reusing the Project Settings iframe as unopened-theme preview
**What goes wrong:** Phase scope expands into a live preview system and introduces stale/non-canonical state.
**Why it happens:** `ProjectSettings.vue` already has an iframe, so it is tempting to repurpose it.
**How to avoid:** Keep the browser on static preview/fallback only; only refresh the existing settings preview after close/apply if needed.
**Warning signs:** Theme browser implementation starts posting preview messages for uninstalled themes.

## Code Examples

Verified patterns from current repo sources:

### Shared apply path only
```js
// Source: src/editor/services/themePackageInstall.js
const installResult = await ipcRenderer.invoke('install-theme-package', {
  source,
  ...(source === 'file' ? { filePath } : { themeId }),
});

scriptStore.applyThemeBundle(installResult.bundle, installResult.packageMeta);
projectStore?.markDirty?.();
await assetStore?.loadCategory?.('ui');
```

### Applied-state truth lives in script store
```js
// Source: src/editor/stores/script.js
function applyThemeBundle(bundleConfig, packageMeta) {
  const nextTheme = JSON.parse(JSON.stringify(bundleConfig?.theme ?? {}));
  if (packageMeta) {
    nextTheme.packageMeta = JSON.parse(JSON.stringify(packageMeta));
  }
  data.value.ui.theme = nextTheme;
}
```

### Preflight-before-write import boundary
```js
// Source: src/editor/services/themePackageImport.js
const fileResult = await ipcRenderer.invoke('import-theme');
const preflight = await ipcRenderer.invoke('preflight-theme-package', {
  filePath: fileResult.filePath,
});

return {
  canceled: false,
  preflight,
  summary: createThemePackageImportSummary(preflight),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Split `PresetModal` + `ThemePackageModal` | Unified browser is the locked Phase 80 target | Phase 80 design/spec (2026-04-27) | One browse/import/select surface |
| Import summary shown only inside preset modal | Imported items should become normalized browser entries | Phase 80 implementation plan (2026-04-27) | Immediate in-browser refresh/selection after import |
| Namespace overwrite counts reused as “impact” | Separate coverage-overlap impact helper needed | Phase 80 research finding | Prevent misleading apply explanations |
| Live preview temptation via existing iframe | Static preview/fallback only for unopened themes | Milestone + Phase 78/80 locked boundary | Avoids second truth/preview system |

**Deprecated/outdated:**
- Split browse entry in `ProjectSettings.vue`: planner should replace it with one browser entry.
- `ThemePackageModal.vue` as the built-in-only browsing surface: outdated for Phase 80 target state.

## Open Questions

1. **Where should built-in author/version display text live?**
   - What we know: `builtinThemes.js` currently has no `author`/`version`.
   - What's unclear: whether product wants per-theme authored metadata or stable defaults.
   - Recommendation: default in `themeBrowser.js` now (`author: 'Galgame Maker'`, version fallback), only extend manifest if planner needs per-theme copy.

2. **Should imported items persist beyond the current browser session?**
   - What we know: current code only gives preflight metadata at import time plus applied `packageMeta` after apply; no imported-theme registry exists.
   - What's unclear: whether Phase 80 wants reopen-persistent imported-but-not-applied browsing.
   - Recommendation: keep Phase 80 session-scoped unless explicit planning asks for a new persisted index; do not invent one implicitly.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest/build/runtime tooling | ✓ | 24.13.1 | — |
| npm | Install/build/test commands | ✓ | 11.11.1 | — |
| Vitest (local dep via `npx`) | Focused phase verification | ✓ | 4.1.4 | — |
| Vite build (`npm run build`) | Phase gate build verification | ✓ | 6.4.1 runtime output | — |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themeBrowserRouting.test.js tests/themePackageImportUx.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js` |
| Full suite command | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themeBrowserRouting.test.js tests/themePackageImportUx.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRW-01 | Unified cards show preview/name/source/mode/compat badges from normalized items | unit + source-level UI regression | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js` | ❌ Wave 0 |
| BRW-02 | Detail panel shows coverage/missing coverage and computed apply impact before apply | unit + source-level UI regression | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themePackageImportUx.test.js` | ❌ / ✅ mixed |
| BRW-03 | Browser distinguishes built-in/imported/applied/legacy-partial states without new truth source | unit + routing regression | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserRouting.test.js tests/scriptThemeApply.test.js` | ❌ / ✅ mixed |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/themeBrowserService.test.js tests/themePackageImportUx.test.js`
- **Per wave merge:** `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themeBrowserRouting.test.js tests/themePackageImportUx.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js`
- **Phase gate:** Focused Phase 80 suite + `npm run build`

### Wave 0 Gaps
- [ ] `tests/themeBrowserService.test.js` — normalize built-in/imported/applied items, impact, preview fallback
- [ ] `tests/themeBrowserModal.test.js` — unified modal source/text/state assertions without adding new test deps
- [ ] `tests/themeBrowserRouting.test.js` — `ProjectSettings.vue` no longer routes through split modals
- [ ] Extend `tests/themePackageImportUx.test.js` — imported `browserEntry` result and legacy-partial browser semantics

## Sources

### Primary (HIGH confidence)
- Repo docs: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`
- Phase docs: `.planning/phases/80-theme-browser-ux/80-CONTEXT.md`
- Product/spec docs: `docs/superpowers/specs/2026-04-27-phase-80-theme-browser-design.md`, `docs/superpowers/plans/2026-04-27-phase-80-theme-browser-implementation.md`, `docs/superpowers/specs/ui-theme-system-v2-design.md`
- Upstream summaries: `.planning/phases/78-theme-package-contract-compatibility-boundaries/78-02-SUMMARY.md`, `.planning/phases/79-unified-install-apply-export-pipeline/79-02-SUMMARY.md`
- Code surfaces: `src/editor/components/theme/ThemePackageModal.vue`, `src/editor/components/theme/PresetModal.vue`, `src/editor/services/themePackageImport.js`, `src/editor/services/themePackageInstall.js`, `src/editor/builtinThemes.js`, `src/shared/themePackageContract.js`, `src/editor/stores/script.js`, `src/editor/views/ProjectSettings.vue`, `electron/themePackagePreflight.js`, `electron/themePackageInstaller.js`, `electron/main.js`, `electron/preload.js`
- Tests: `tests/themePackageImportUx.test.js`, `tests/scriptThemeApply.test.js`, `tests/themePackageInstallFlow.test.js`, `tests/themePackageExportUx.test.js`
- npm registry verification: `npm view vue version`, `npm view pinia version`, `npm view vitest version`, `npm view electron version`

### Secondary (MEDIUM confidence)
- Focused verification run on 2026-04-27: `npx vitest run tests/themePackageImportUx.test.js tests/scriptThemeApply.test.js tests/themePackageInstallFlow.test.js` → 5 tests passed
- Build verification run on 2026-04-27: `npm run build` → success

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo stack plus npm registry verification
- Architecture: HIGH - derived from locked phase docs and current code boundaries
- Pitfalls: HIGH - directly validated against current implementation seams and existing tests

**Research date:** 2026-04-27
**Valid until:** 2026-05-27
