# Phase 82: 剩余 4 套完整主题扩展 - Research

**Researched:** 2026-04-28
**Domain:** Built-in full-theme completion, shared theme package pipeline, shipped theme differentiation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Theme roster 与基线继承
- **D-01:** Phase 82 直接升格现有 built-in roster 中尚未达到成品度的 4 套主题：`default`、`modern-sky`、`fantasy-dark`、`minimal-white`；不新开主题 ID，也不替换现有 shipped roster。
- **D-02:** `wafuu` 保持为已交付 golden baseline；Phase 82 的目标是把另外 4 套向 `wafuu` 的完整度收敛，而不是回退 golden standard。
- **D-03:** 继续复用现有 built-in theme manifest 与 browser item 入口，在原有 theme 定义上补齐完整资产与 screen/title 数据，而不是旁挂 runtime-only 特例主题。

#### Completeness gate 与 pipeline invariants
- **D-04:** 这 4 套主题必须全部达到与 `wafuu` 相同的 8-surface full-theme coverage：`theme`、`widgetStyles`、`dialogueBox`、`saveLoadScreen`、`backlogScreen`、`gameMenu`、`settingsScreen`、`titleScreen`。
- **D-05:** built-in 与 imported 主题继续共用同一条 install / apply / export / import / browser pipeline；Phase 82 不得为“剩余 4 套量产”新增第二条链路。
- **D-06:** 本阶段的完成口径不是“主题看起来差不多能用”，而是主题浏览器里最终出现 5 套 full themes，且每一套都能通过 apply → save/reopen → export → reimport 的一致性验证。

#### Visual differentiation standard
- **D-07:** 差异化标准必须体现在材质语言、轮廓语言与整体风格倾向上，不能只靠 token 换色或轻微控件色差来冒充“新主题”。
- **D-08:** 推荐保留并强化现有命名已经暗示的方向：`default` = polished neutral baseline、`modern-sky` = modern clean / airy glass-panel language、`fantasy-dark` = ornate dark-fantasy language、`minimal-white` = bright minimal editorial language。
- **D-09:** 每套主题都必须让 `titleScreen`、dialogue、button families、major screens 读起来像同一套系统 UI，而不是“某个界面很完整、其他界面只是跟色”。

#### Production strategy 与复用边界
- **D-10:** 允许复用 shared schema、coverage metadata、browser normalization、install/apply/export services 与安全的结构模板，但只在不削弱风格辨识度时复用。
- **D-11:** 可复用的是稳定的技术骨架与非表达性结构（例如 action wiring、screen data shape、可验证的坐标 scaffolds）；不可接受的是直接把 `wafuu` 或其他主题的视觉素材/布局当作换色底稿。
- **D-12:** 主题资产与 manifest 应继续落在现有 project-local / canonical path 体系内，保持扫描、导出、浏览器 preview 与 package metadata 的一致性。

### the agent's Discretion
- 4 套主题的具体资产制作顺序
- 每套主题的 preview card 构图与文案细节
- 哪些坐标 / layout skeleton 可以安全复用而不损伤辨识度
- 单个 screen 内装饰层数量与素材颗粒度，只要满足完整度与风格差异标准

### Deferred Ideas (OUT OF SCOPE)
- 新增更多 built-in themes 或替换现有 5 套 roster —— 后续 milestone / backlog
- 主题字体打包、在线主题市场、云同步 —— 已在 v2 / out-of-scope 中明确延后
- 未应用主题 live iframe preview —— 当前 milestone 明确不做
- scene/page 级局部主题覆盖 —— 当前 milestone 明确不做
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THM-02 | 产品最终交付 5 套完整图片主题，这 5 套主题都达到同一覆盖标准，而不是只有 1 套完整、其余只是换色或半成品 | Gap matrix, shared builtin asset materialization plan, explicit 8-surface completeness test, 5-theme apply/save/export/reimport/browser acceptance matrix |
| THM-03 | 这 5 套已交付主题在视觉识别上有明确差异，至少体现在材质语言、轮廓语言和整体风格倾向上，而不只是配色不同 | Per-theme style matrix, preview metadata plan, screen-by-screen expression checklist, manual visual review gate, anti-recolor constraints |
</phase_requirements>

## Summary

Phase 82 is not primarily a new pipeline phase; it is a **truth-in-data and content-completion phase**. The codebase already has one shared browser/install/apply/export/import pipeline, but the remaining built-in themes are still structurally partial. Repo evidence shows `default` currently installs as an almost empty bundle, `modern-sky` and `fantasy-dark` only have `theme + widgetStyles + settingsScreen`, and `minimal-white` only has `theme + widgetStyles`. Even `wafuu` is not fully explicit by the frozen 8-surface contract because `dialogueBox` is still empty in built-in data. Meanwhile the browser currently masks this by treating every built-in theme as full coverage.

The planner should therefore treat Phase 82 as two coupled tracks: **(1) completeness hardening** and **(2) differentiated content production**. Hardening means making built-in completeness explicit in data and tests, materializing built-in image assets into the project-local namespace on apply, and extending acceptance from one golden theme to all five. Content production means authoring real dialogue/title/screen assets per theme, plus distinct preview cards, while reusing only non-expressive scaffolds.

**Primary recommendation:** Lock a Wave 0 completeness hardening slice first, then produce the four themes against an explicit per-theme 8-surface checklist, and close with a parameterized 5-theme parity suite plus a human visual differentiation review.

### Built-in gap matrix vs current `wafuu` baseline

| Theme | Current meaningful coverage in repo data | Missing vs 8-surface contract | Immediate planning implication |
|------|-------------------------------------------|-------------------------------|-------------------------------|
| `default` | none | all 8 surfaces | Needs full authored data, not “engine default / empty overrides” |
| `modern-sky` | `theme`, `widgetStyles`, `settingsScreen` | `dialogueBox`, `saveLoadScreen`, `backlogScreen`, `gameMenu`, `titleScreen` | Needs 5 new owned surfaces plus richer preview/differentiation |
| `fantasy-dark` | `theme`, `widgetStyles`, `settingsScreen` | `dialogueBox`, `saveLoadScreen`, `backlogScreen`, `gameMenu`, `titleScreen` | Same as `modern-sky`, but with distinct dark-fantasy visual language |
| `minimal-white` | `theme`, `widgetStyles` | `dialogueBox`, `saveLoadScreen`, `backlogScreen`, `gameMenu`, `settingsScreen`, `titleScreen` | Largest gap after `default` |
| `wafuu` baseline note | `theme`, `widgetStyles`, `saveLoadScreen`, `backlogScreen`, `gameMenu`, `settingsScreen`, `titleScreen` | `dialogueBox` | Phase 82 should harden this too, otherwise “same 8-surface standard” is still soft |

### Current pipeline realities that the plan must honor

- `themeBrowser.js` currently gives built-ins `FULL_THEME_COVERAGE_KEYS` by default, so the browser already claims all 5 are full even when manifest data is incomplete.
- `electron/themePackageInstaller.js` does **not** copy any assets for `source: 'builtin'`; it only returns an in-memory bundle.
- There is currently **no** `assets/ui/themes/` directory in the repo, so Phase 82 will need a canonical bundled-asset location before built-ins can become real image themes.
- `parseThemeZip()` / preflight treat missing coverage as warnings, not blocking errors, so Phase 82 must add its own completeness tests instead of assuming the package contract alone is enough.
- All built-in browser cards currently use preview fallback blocks; none of the themes supply explicit `preview` metadata.

## Project Constraints (from copilot-instructions.md)

- Keep the project on **JavaScript ES Modules + Vue 3 + Electron**; do not migrate this phase to TypeScript.
- Preserve the product rule: **开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑**.
- Maintain **Windows-first** behavior while staying compatible with macOS.
- Keep editor UI conventions aligned with the existing **dark theme / pure CSS / Chinese UI** codebase.
- Use explicit `.js` extensions for JS imports; keep JS modules on named exports.
- Follow current repo style: 2-space indentation, semicolons, single quotes, trailing commas.
- Keep renderer filesystem access behind Electron IPC; do not bypass `ipcRenderer.invoke()` patterns.
- Preserve existing IPC/result patterns: `{ success: boolean, error?: string }`.
- Do not weaken path/security guards around canonical `ui/...` asset paths and project-local file writes.
- Handle errors at boundaries; avoid uncaught exceptions and preserve current logging/error-return conventions.
- No project skill directories were found under `.github/skills/` or `.agents/skills/`.

## Standard Stack

### Core
| Library / Module | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | project lock `^3.5.31` (registry latest `3.5.33`, modified 2026-04-22) | Theme browser UI and editor surfaces | Existing editor stack; Phase 82 should extend current components, not swap UI stack |
| Pinia | project lock `^3.0.4` (registry latest `3.0.4`, modified 2025-11-05) | Script/project state and apply flow | `useScriptStore().applyThemeBundle()` is the existing apply truth |
| Electron | project lock `^41.0.4` (registry latest `41.3.0`, modified 2026-04-22) | IPC, project-local file install/export | Built-in and imported theme install/export already terminate here |
| Vitest | project lock `^4.1.4` (registry latest `4.1.5`, modified 2026-04-23) | Focused phase validation | Existing theme pipeline tests already use it |
| `src/editor/builtinThemes.js` | repo module | Single built-in theme manifest source | Locked roster lives here; do not create a second built-in registry |
| `src/shared/themePackageContract.js` | repo module | Frozen 8-surface contract | `FULL_THEME_COVERAGE_KEYS` is the canonical completeness vocabulary |

### Supporting
| Library / Module | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `electron/themePackageInstaller.js` | repo module | Normalize/install bundles for built-in and imported themes | Use for project-local materialization and packageMeta generation |
| `electron/themePackageExporter.js` | repo module | Export applied theme as self-contained `.gmtheme` | Use for parity verification after applying each built-in theme |
| `src/editor/services/themeBrowser.js` | repo module | Normalize browser items, apply impact, lifecycle | Use for browser truth; extend it only to reflect real completeness |
| `src/shared/uiImageContract.js` | repo module | Canonical `ui/...` asset scanning | Use whenever new theme image refs are added |
| `fflate` | project lock `^0.8.2` | `.gmtheme` zip build/parse | Already powers package round-trip |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Second built-in-only install/apply path | Reuse existing installer/exporter pipeline | Required by locked decisions; avoids split parity bugs |
| Browser-only “full theme” flags | Explicit built-in completeness tests + manifest truth | Needed because current browser fallback overstates completeness |
| Token-only recolor variants | Real per-surface authored data + preview metadata | Only this satisfies THM-03 |

**Installation:**
```bash
npm install
```

**Version verification:** Phase 82 should stay on the repo’s locked dependency set. Verified on 2026-04-28 with:
```bash
npm view vue version
npm view pinia version
npm view vitest version
npm view electron version
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── editor/
│   ├── builtinThemes.js                 # built-in theme manifest + preview + bundled asset metadata
│   ├── services/themeBrowser.js         # browser completeness/lifecycle normalization
│   └── services/themePackageInstall.js  # shared renderer install/apply entry
├── shared/
│   ├── themePackageContract.js          # 8-surface contract
│   └── uiImageContract.js               # canonical asset path scan
electron/
├── themePackageInstaller.js             # built-in/imported asset materialization into project
└── themePackageExporter.js              # self-contained gmtheme export
tests/
├── themeGoldenAcceptance.test.js        # existing golden baseline
├── builtinThemeCompleteness.test.js     # new: explicit 5-theme coverage matrix
└── builtinThemeAcceptance.test.js       # new: 5-theme apply/save/export/reimport/browser parity
```

### Pattern 1: Completeness-first built-in manifest hardening
**What:** Make each built-in theme explicitly own all 8 surfaces in data, instead of relying on browser assumptions or theme-token fallbacks.  
**When to use:** Before bulk asset production and before declaring any of the 4 remaining themes “shipped”.  
**Example:**
```js
// Source: src/shared/themePackageContract.js + electron/themePackageInstaller.js
const OWNED_UI_KEYS = [
  'theme',
  'widgetStyles',
  'dialogueBox',
  'saveLoadScreen',
  'backlogScreen',
  'gameMenu',
  'settingsScreen',
  'titleScreen',
];
```

**Prescriptive guidance:** Planner should add an explicit built-in completeness audit test that computes meaningful coverage from installed built-in bundles and fails if any built-in misses any of the 8 surfaces.

### Pattern 2: Built-in themes must materialize project-local assets through the shared installer
**What:** If a built-in theme references canonical `ui/themes/<id>/...` images, its apply path must copy those bundled assets into the current project before the store points `script.json` at them.  
**When to use:** As soon as any of the 4 themes gain real image assets or preview assets that participate in export/reimport parity.  
**Example:**
```js
// Source: electron/themePackageInstaller.js
if (source === 'builtin') {
  return {
    success: true,
    bundle: normalizeInstalledBundle(createBuiltInThemeUi(theme)),
    packageMeta: {
      source: 'builtin',
      themeId: theme.id,
      mode: 'full',
      assetRoot: `ui/themes/${theme.id}/`,
    },
  };
}
```

**Prescriptive guidance:** Do not keep this branch “bundle-only” once built-ins become real image themes. Extend the same installer to copy bundled files into `assets/ui/themes/<id>/...`, then keep the same `bundle + packageMeta` shape.

### Pattern 3: Preserve shared apply semantics, including title `bgm` ownership
**What:** Theme apply replaces the owned visual bundle atomically, but keeps project-owned `titleScreen.bgm`.  
**When to use:** For all built-in acceptance tests and when authoring title data for the 4 remaining themes.  
**Example:**
```js
// Source: src/editor/stores/script.js
data.value.ui.titleScreen = {
  background: nextTitleScreen.background ?? null,
  bgm: currentTitleScreen.bgm ?? null,
  elements: Array.isArray(nextTitleScreen.elements) ? nextTitleScreen.elements : [],
};
```

### Pattern 4: Differentiate themes through a style matrix, not free-form art notes
**What:** Lock each theme to explicit expression targets across material, contour, and screen motifs.  
**When to use:** Before asset authoring starts for each theme.  
**Recommended matrix:**

| Theme | Material language | Contour language | Required “tells” across surfaces |
|------|-------------------|------------------|-----------------------------------|
| `default` | polished neutral panels, production-ready baseline | restrained rounded-rect system | clean title masthead, understated dialogue/nameplate, pragmatic chrome |
| `modern-sky` | airy glass / translucent acrylic | slim radii, light separators, floating cards | glassy title hero, dual-column settings, light chrome with sky-depth accents |
| `fantasy-dark` | lacquer / metal / parchment / ornate trim | pointed arches, filigree edges, framed medallions | emblematic title crest, decorated dialogue plate, ornate menu/backlog headers |
| `minimal-white` | paper / editorial card / soft ink | flat edges, thin rules, generous whitespace | typography-led title, quiet dialogue plate, sparse but deliberate screen dividers |

**Prescriptive guidance:** The planner should require every theme plan to name at least one unique title-screen motif, one dialogue-box motif, one button family motif, and one major-screen chrome motif.

### Anti-Patterns to Avoid
- **Browser-truth theater:** leaving built-ins incomplete while `themeBrowser.js` still labels them as full.
- **Recolor factory:** cloning one layout/asset set across 4 themes with hue shifts.
- **Built-in special-case pipeline:** adding a second install/apply/export path “just for shipped themes”.
- **Asset ref without install:** writing canonical `ui/themes/...` paths into `script.json` before those files exist in the project.
- **Coverage via vibes:** deciding a theme is “complete enough” without an explicit 8-surface check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-theme completeness vocabulary | Custom booleans / ad hoc “isComplete” flags | `FULL_THEME_COVERAGE_KEYS` in `themePackageContract.js` | Keeps browser, importer, exporter, and tests on one vocabulary |
| Browser lifecycle/impact labels | Separate built-in browser logic | `themeBrowser.js` normalization and impact helpers | Existing UI semantics are already centralized there |
| Apply orchestration | Manual store mutation from component code | `installAndApplyThemePackage()` + `applyThemeBundle()` | Preserves atomic apply, dirty flag, asset refresh, and title `bgm` rule |
| Theme export packaging | New zip logic or built-in-only exporter | `electron/themePackageExporter.js` + `themePackager.js` | Already handles canonical refs and self-contained `.gmtheme` export |
| UI asset scanning | Per-screen file collectors in multiple places | `collectUiImagePaths()` from `uiImageContract.js` | Existing scan registry already covers theme-owned surfaces |

**Key insight:** The hard part is not JSON shape generation; it is keeping **canonical paths, project-local materialization, browser truth, and export parity** aligned.

## Common Pitfalls

### Pitfall 1: Built-ins look full in the browser before they are actually full
**What goes wrong:** Users can already see all built-ins as “完整主题”, but the underlying data is partial.  
**Why it happens:** `normalizeThemeBrowserItem()` falls back built-in coverage to `FULL_THEME_COVERAGE_KEYS`.  
**How to avoid:** Add an explicit built-in completeness test and, during implementation, either compute real built-in coverage or keep phase closure dependent on the new test instead of the browser label.  
**Warning signs:** Browser shows 5 full themes while exported packages still report missing coverage warnings.

### Pitfall 2: Built-in image themes break after apply/export because no files were installed
**What goes wrong:** Applied built-in themes reference `ui/themes/<id>/...` paths that do not exist in the project, causing runtime/export failures.  
**Why it happens:** The current built-in installer branch returns only a bundle and writes no files.  
**How to avoid:** Treat built-in assets as installable project-local artifacts and copy them into the project on apply before saving packageMeta.  
**Warning signs:** Exported `.gmtheme` has missing files, or runtime falls back / shows broken images after save-reopen.

### Pitfall 3: “Full” `.gmtheme` packages can still be content-incomplete
**What goes wrong:** A package can parse as mode=`full` while still only warning about missing surfaces.  
**Why it happens:** `validateThemePackageDefinition()` records missing coverage as warnings, not blocking errors.  
**How to avoid:** Add phase-owned completeness assertions for built-ins and a 5-theme acceptance matrix; do not rely on parse/preflight alone.  
**Warning signs:** `parseThemeZip()` returns success plus `warnings: ["full-theme 缺少 coverage: ..."]`.

### Pitfall 4: THM-03 collapses into vague art direction
**What goes wrong:** Tasks say “make it more modern / fantasy / minimal” but do not specify where that difference must show up.  
**Why it happens:** Theme differentiation is treated as color tuning rather than surface ownership.  
**How to avoid:** Require per-theme checklists across `titleScreen`, `dialogueBox`, button families, and at least two major screens.  
**Warning signs:** Preview cards look different, but applied UI silhouettes and chrome are interchangeable.

### Pitfall 5: Safe scaffold reuse drifts into clone-and-recolor
**What goes wrong:** Teams reuse the same title/button/layout skeleton so heavily that themes differ only in hue.  
**Why it happens:** Reuse rules are not separated into “structural” vs “expressive” parts.  
**How to avoid:** Reuse only coordinates/wiring/data shape; require unique assets, framing, and decorative cadence per theme.  
**Warning signs:** Title elements, header ornaments, and dialogue/nameplate silhouettes line up one-to-one across themes.

## Code Examples

Verified patterns from repo source:

### Shared renderer → installer → apply path
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

### Theme apply preserves project-owned title BGM
```js
// Source: src/editor/stores/script.js
const currentTitleScreen = JSON.parse(JSON.stringify(data.value.ui.titleScreen ?? {}));
const nextTitleScreen = JSON.parse(JSON.stringify(bundleConfig?.titleScreen ?? {}));
data.value.ui.titleScreen = {
  background: nextTitleScreen.background ?? null,
  bgm: currentTitleScreen.bgm ?? null,
  elements: Array.isArray(nextTitleScreen.elements) ? nextTitleScreen.elements : [],
};
```

### Browser preview contract already supports explicit static preview data
```js
// Source: src/editor/services/themeBrowser.js
if (item.preview && typeof item.preview === 'object') {
  return {
    kind: 'static',
    mode: item.preview.mode ?? 'asset',
    src: item.preview.src ?? '',
    background: item.preview.background ?? item.primaryColor ?? '#2d2d30',
    accent: item.preview.accent ?? item.tokens?.primary ?? item.primaryColor ?? '#5b8cff',
    text: item.preview.text ?? item.name ?? item.rawId ?? '主题',
    initials: item.preview.initials ?? (item.name ?? item.rawId ?? '主').slice(0, 2),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Built-ins act like token/color presets with sparse screen data | Shipped themes must explicitly satisfy the full 8-surface contract | Phase 81 added `titleScreen`; Phase 82 must finish the remaining 4 | Planner must schedule completeness hardening, not just art tasks |
| Browser assumes built-ins are full | Browser truth must be backed by manifest/test truth | Current Phase 80/81 code still assumes fullness | Phase 82 must close this mismatch |
| Golden acceptance covers only `wafuu` | Acceptance must become a 5-theme matrix | Needed for THM-02 closure | Add parameterized tests instead of one-off golden evidence |
| Built-in apply can stay in-memory | Real image built-ins must install project-local assets before apply/export | Triggered by Phase 82’s “完整图片主题” goal | Installer work is a prerequisite for any real built-in image asset rollout |

**Deprecated/outdated:**
- Treating `default` as “empty engine state” is outdated for the shipped-theme roster.
- Treating `modern-sky` / `fantasy-dark` / `minimal-white` as color variants is outdated for THM-02/03.
- Treating browser full badges as proof of completeness is outdated in this repo state.

## Open Questions

1. **Where should bundled built-in theme assets and preview images live in-repo?**
   - What we know: there is no existing `assets/ui/themes/` repo directory, but the installer/exporter expect canonical `ui/themes/<id>/...` paths once images exist.
   - What's unclear: whether the best source-of-truth should be checked-in assets under `public/`, a dedicated app-bundled theme asset directory, or built-in `.gmtheme` fixtures.
   - Recommendation: lock one canonical bundled asset source in Wave 0 and teach the built-in installer to materialize from it.

2. **Should Phase 82 also make `wafuu.dialogueBox` explicit to align the standard?**
   - What we know: current built-in `wafuu` data still leaves `dialogueBox` empty by contract.
   - What's unclear: whether to treat that as a small Phase 82 hardening patch or leave it as tolerated baseline debt.
   - Recommendation: include it in the same completeness-hardening slice; otherwise “5 themes, one standard” still rests on a soft exception.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `4.1.4` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js` |
| Full suite command | `npx vitest run tests/themeGoldenAcceptance.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themePackageInstallFlow.test.js tests/themePackageContract.test.js tests/themePackagePreflight.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THM-02 | Every built-in theme installs as explicit 8-surface data, not browser-assumed fullness | source/integration | `npx vitest run tests/builtinThemeCompleteness.test.js` | ❌ Wave 0 |
| THM-02 | Each of the 5 shipped themes passes apply → save/reopen → export → reimport → browser parity | acceptance | `npx vitest run tests/builtinThemeAcceptance.test.js` | ❌ Wave 0 |
| THM-03 | Built-ins expose distinct static preview metadata and per-theme authored surface signatures | source contract | `npx vitest run tests/builtinThemeVisualContract.test.js` | ❌ Wave 0 |
| THM-03 | Human confirms material / contour / style differences across browser + applied UI | manual visual | — | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js`
- **Per wave merge:** `npx vitest run tests/themeGoldenAcceptance.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themePackageInstallFlow.test.js tests/themePackageContract.test.js tests/themePackagePreflight.test.js`
- **Phase gate:** Full phase-owned suite green **plus** manual 5-theme visual review before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/builtinThemeCompleteness.test.js` — fail if any built-in theme lacks explicit meaningful coverage for any of the 8 surfaces
- [ ] `tests/builtinThemeAcceptance.test.js` — parameterize the existing golden acceptance path across all 5 built-ins
- [ ] `tests/builtinThemeVisualContract.test.js` — assert preview metadata exists and each theme declares distinct per-surface style signatures
- [ ] Extend `tests/themePackageInstaller.test.js` — cover all built-in theme IDs, not just `wafuu`
- [ ] Extend `tests/themeBrowserService.test.js` — stop accepting implicit built-in full coverage without explicit supporting data

## Sources

### Primary (HIGH confidence)
- `E:\projects\my-awesome-project\.planning\phases\82-4\82-CONTEXT.md` — locked Phase 82 decisions and scope
- `E:\projects\my-awesome-project\.planning\REQUIREMENTS.md` — THM-02 / THM-03 requirement text
- `E:\projects\my-awesome-project\.planning\ROADMAP.md` — milestone order and Phase 82 success criteria
- `E:\projects\my-awesome-project\src\editor\builtinThemes.js` — actual built-in theme data gaps
- `E:\projects\my-awesome-project\src\shared\themePackageContract.js` — frozen 8-surface coverage contract and warning behavior
- `E:\projects\my-awesome-project\src\editor\services\themeBrowser.js` — built-in browser fullness fallback and preview contract
- `E:\projects\my-awesome-project\electron\themePackageInstaller.js` — built-in install branch behavior
- `E:\projects\my-awesome-project\electron\themePackageExporter.js` — export depends on project-local assets and strips title `bgm`
- `E:\projects\my-awesome-project\src\editor\stores\script.js` — apply semantics and title `bgm` preservation
- `E:\projects\my-awesome-project\tests\themeGoldenAcceptance.test.js` — current acceptance baseline only for `wafuu`
- `E:\projects\my-awesome-project\tests\themePackageInstaller.test.js`, `tests\scriptThemeApply.test.js`, `tests\themeBrowserService.test.js`, `tests\themeBrowserModal.test.js`, `tests\themePackageExporter.test.js`, `tests\themePackageRoundTrip.test.js`, `tests\themePackageInstallFlow.test.js`, `tests\themePackageContract.test.js`, `tests\themePackagePreflight.test.js` — current test coverage boundaries
- Focused local command on 2026-04-28: `npx vitest run tests/themeGoldenAcceptance.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themePackageInstallFlow.test.js tests/themePackageContract.test.js tests/themePackagePreflight.test.js` — 10/10 files passed, 25/25 tests passed
- Local audits on 2026-04-28:
  - Built-in coverage audit via Node script against `BUILTIN_THEMES`
  - Browser normalization audit showing all built-ins currently display full coverage
  - Environment/version checks: Node `v24.13.1`, npm `11.11.1`

### Secondary (MEDIUM confidence)
- None — phase-critical findings came directly from repo code and local execution

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - locked by repo/package.json and copilot instructions
- Architecture: HIGH - derived from live source code, local audits, and passing focused tests
- Pitfalls: HIGH - each pitfall maps to observable current code behavior or explicit test gap

**Research date:** 2026-04-28
**Valid until:** 2026-05-28
