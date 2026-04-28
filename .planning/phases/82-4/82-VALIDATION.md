---
phase: 82
slug: 4
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/themeBrowserService.test.js` |
| **Full suite command** | `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/builtinThemeAcceptance.test.js tests/themeGoldenAcceptance.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themePackageInstallFlow.test.js tests/themePackageContract.test.js tests/themePackagePreflight.test.js tests/themeBrowserModal.test.js && npm run build` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/themeBrowserService.test.js`
- **After every plan wave:** Run `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/builtinThemeAcceptance.test.js tests/themeGoldenAcceptance.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themePackageInstallFlow.test.js tests/themePackageContract.test.js tests/themePackagePreflight.test.js tests/themeBrowserModal.test.js && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 82-01-01 | 01 | 1 | THM-02, THM-03 | unit / contract | `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/themeBrowserService.test.js` | ❌ W0 | ⬜ pending |
| 82-01-02 | 01 | 1 | THM-02 | integration | `npx vitest run tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js` | ✅ | ⬜ pending |
| 82-02-01 | 02 | 2 | THM-02, THM-03 | unit / contract | `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js` | ❌ W0 | ⬜ pending |
| 82-02-02 | 02 | 2 | THM-02, THM-03 | unit / contract | `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js` | ❌ W0 | ⬜ pending |
| 82-03-01 | 03 | 3 | THM-02, THM-03 | unit / contract | `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js` | ❌ W0 | ⬜ pending |
| 82-03-02 | 03 | 3 | THM-02, THM-03 | unit / contract | `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js` | ❌ W0 | ⬜ pending |
| 82-04-01 | 04 | 4 | THM-02, THM-03 | acceptance | `npx vitest run tests/builtinThemeCompleteness.test.js tests/builtinThemeVisualContract.test.js tests/builtinThemeAcceptance.test.js tests/themeGoldenAcceptance.test.js tests/themePackageInstaller.test.js tests/scriptThemeApply.test.js tests/themeBrowserService.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themePackageInstallFlow.test.js tests/themePackageContract.test.js tests/themePackagePreflight.test.js tests/themeBrowserModal.test.js && npm run build` | ❌ W0 | ⬜ pending |
| 82-04-02 | 04 | 4 | THM-03 | manual visual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/builtinThemeCompleteness.test.js` — explicit 5-theme completeness gate over the 8-surface contract
- [ ] `tests/builtinThemeVisualContract.test.js` — preview metadata and visual-signature gate for shipped built-ins
- [ ] `tests/builtinThemeAcceptance.test.js` — parameterized 5-theme apply/save/export/reimport/browser parity suite
- [ ] Extend `tests/themePackageInstaller.test.js` — cover all built-in theme IDs and built-in asset materialization behavior
- [ ] Extend `tests/themeBrowserService.test.js` — stop accepting implicit built-in full coverage without explicit support data

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confirm all 5 shipped themes are visually distinct in material language, contour language, and overall style direction | THM-03 | The final shipped-theme differentiation bar is aesthetic and cross-screen; automation can gate metadata/contracts but cannot judge visual identity quality | Open Project Settings → `🎭 主题浏览器`, inspect `default`, `wafuu`, `modern-sky`, `fantasy-dark`, and `minimal-white`, then apply each theme and confirm title/dialogue/button-family/major-screen chrome read as one coherent system rather than token-only recolors |
| Confirm the locked role mapping still matches the built result (`default` neutral baseline, `wafuu` golden Japanese baseline, `modern-sky` airy glass-panel, `fantasy-dark` ornate dark fantasy, `minimal-white` bright editorial minimal) | THM-03 | This is a product judgment over the final shipped assets, not a pure schema/property check | After the automated parity suite is green, review all five browser cards and applied results, then record approval or report `themeId + surface + expected + actual` for any mismatch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
