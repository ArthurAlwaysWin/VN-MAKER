# Phase 80: Theme Browser UX - Validation

**Generated:** 2026-04-27
**Status:** Ready for execution planning

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themeBrowserRouting.test.js tests/themePackageImportUx.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js` |
| Full phase gate | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themeBrowserRouting.test.js tests/themePackageImportUx.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js && npm run build` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Planned Artifact |
|--------|----------|-----------|-------------------|------------------|
| BRW-01 | Unified browser cards render static preview, name, source, mode/compat badges, and compact coverage summary from normalized items | unit + source-level UI regression | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js` | `tests/themeBrowserService.test.js`, `tests/themeBrowserModal.test.js` |
| BRW-02 | Detail panel explains coverage, missing coverage, and pre-apply overwrite impact without performing apply or reusing namespace overwrite counts as user-facing copy | unit + source-level UI regression | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themePackageImportUx.test.js` | `tests/themeBrowserService.test.js`, `tests/themeBrowserModal.test.js`, `tests/themePackageImportUx.test.js` |
| BRW-03 | Browser distinguishes built-in, imported, currently applied, and compatibility-only partial states using `script.data.ui.theme.packageMeta` as the only applied truth | unit + routing regression | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserRouting.test.js tests/scriptThemeApply.test.js` | `tests/themeBrowserService.test.js`, `tests/themeBrowserRouting.test.js`, `tests/scriptThemeApply.test.js` |
| BRW-01, BRW-02, BRW-03 | Unified browser implementation still compiles through the shipped Phase 79 import/apply substrate without adding preview/runtime drift | focused regression + build gate | `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themeBrowserRouting.test.js tests/themePackageImportUx.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js && npm run build` | Existing build pipeline + focused Phase 80 test suite |

## Sampling

- **Per plan 80-01:** `npx vitest run tests/themeBrowserService.test.js tests/themePackageImportUx.test.js`
- **Per plan 80-02:** `npx vitest run tests/themeBrowserService.test.js tests/themeBrowserModal.test.js tests/themeBrowserRouting.test.js tests/themePackageImportUx.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js`
- **Phase gate:** Focused Phase 80 suite + `npm run build`
- **Out of scope:** repo-wide unrelated Vitest failures, unopened-theme live preview, golden-theme content production, and any persisted imported-theme registry

## Wave 0 Gaps

- [ ] `tests/themeBrowserService.test.js` — normalize built-in/imported/applied items, preview fallback, and apply-impact computation
- [ ] `tests/themeBrowserModal.test.js` — unified modal layout, lifecycle badges, inspect-only partial messaging, and inline import feedback
- [ ] `tests/themeBrowserRouting.test.js` — Project Settings routes through one browser entry instead of split preset/package modals
- [ ] Extend `tests/themePackageImportUx.test.js` — `browserEntry` result and legacy-partial browser semantics

## Planned Artifact Refresh

- `tests/themeBrowserService.test.js` - focused proof for normalization, lifecycle derivation, preview fallback, and overwrite-impact messaging
- `tests/themeBrowserModal.test.js` - focused proof for four-region browser layout, state semantics, static preview boundary, and detail-panel explanations
- `tests/themeBrowserRouting.test.js` - focused proof that `ProjectSettings.vue` no longer routes theme browsing through split modal surfaces
- `tests/themePackageImportUx.test.js` - focused proof that import preflight yields browser-session entries while legacy-partial stays inspect-only
- `tests/themePackageInstallFlow.test.js` - existing proof that shared install/apply service remains the only full-theme apply path
- `tests/scriptThemeApply.test.js` - existing proof that `script.data.ui.theme.packageMeta` remains the only applied-state truth
- `80-VERIFICATION.md` - post-execution evidence report tying BRW-01/02/03 to summaries, rerun commands, and shipped outcomes

## Scope Guardrails

- This file defines the **Phase 80 execution-era Nyquist map**, not a request to widen phase scope.
- Apply eligibility must continue to flow through `installAndApplyThemePackage()` and existing Electron IPC; validation must fail if a second write/apply path appears.
- Static preview only remains a hard boundary; validation must treat any unopened-theme iframe/live-preview wiring as a regression.
- User-facing overwrite impact must be derived from coverage overlap or first-write semantics, not filesystem `counts.overwrite`.
- If repo-wide unrelated test failures still exist, they are not the proof point for Phase 80 closure; use the focused suite above.

## Evidence Sources To Cite In Verification

- `.planning/phases/80-theme-browser-ux/80-CONTEXT.md`
- `.planning/phases/80-theme-browser-ux/80-RESEARCH.md`
- `.planning/phases/80-theme-browser-ux/80-01-PLAN.md`
- `.planning/phases/80-theme-browser-ux/80-02-PLAN.md`
- `docs/superpowers/specs/2026-04-27-phase-80-theme-browser-design.md`
- `docs/superpowers/plans/2026-04-27-phase-80-theme-browser-implementation.md`
- `src/editor/services/themePackageImport.js`
- `src/editor/services/themePackageInstall.js`
- `src/editor/stores/script.js`
- `src/editor/views/ProjectSettings.vue`
- `tests/themePackageImportUx.test.js`
- `tests/themePackageInstallFlow.test.js`
- `tests/scriptThemeApply.test.js`

---

*Phase: 80-theme-browser-ux*
*Validation generated: 2026-04-27*
