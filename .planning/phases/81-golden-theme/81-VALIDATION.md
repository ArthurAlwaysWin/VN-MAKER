---
phase: 81
slug: golden-theme
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 81 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `E:\projects\my-awesome-project\vitest.config.js` |
| **Quick run command** | `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themeBrowserService.test.js tests/themePackageImportUx.test.js` |
| **Full suite command** | `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themeBrowserService.test.js tests/themePackageImportUx.test.js && npm run build` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themeBrowserService.test.js tests/themePackageImportUx.test.js`
- **After every plan wave:** Run `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themeBrowserService.test.js tests/themePackageImportUx.test.js && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 81-01-01 | 01 | 1 | THM-01 | unit | `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js` | ✅ | ⬜ pending |
| 81-01-02 | 01 | 1 | THM-01 | integration | `npx vitest run tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js` | ✅ | ⬜ pending |
| 81-01-03 | 01 | 1 | THM-01 | integration | `npx vitest run tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js` | ✅ | ⬜ pending |
| 81-02-01 | 02 | 1 | THM-01 | unit | `npx vitest run tests/themeBrowserService.test.js tests/themePackageImportUx.test.js` | ✅ | ⬜ pending |
| 81-02-02 | 02 | 1 | THM-01 | integration | `npx vitest run tests/themePackageInstaller.test.js tests/themePackageRoundTrip.test.js tests/scriptThemeApply.test.js` | ✅ | ⬜ pending |
| 81-03-01 | 03 | 2 | THM-01 | regression | `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themeBrowserService.test.js tests/themePackageImportUx.test.js tests/themeGoldenAcceptance.test.js && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 应用 golden `wafuu` 后标题界面与 dialogue/save-load/backlog/game-menu/settings 呈现统一视觉语言 | THM-01 | “成品感 / 整体 UI 方案一致性” 仍需要人眼判断 | 在编辑器中应用 golden theme，依次查看标题页、对话框、存读档、回想、游戏菜单、设置界面，确认字体、边框、饰件、按钮语法和背景母题统一 |
| 保存项目并重开后，标题界面视觉仍保持 theme 所有权，而 title BGM 保持项目原值 | THM-01 | 需要结合实际项目重开与编辑器状态观察 | 应用 golden theme，记录 `ui.titleScreen.bgm` 原值；保存并重开项目，确认标题背景/元素仍为 theme 资源，且 BGM 未被主题覆盖 |
| 试玩运行时与导出成品中，标题界面视觉仍与已应用 golden theme 一致，而 title BGM 继续保持项目原值 | THM-01 | 当前 focused suite 更擅长验证配置/round-trip；真实运行时与导出产物仍需人工确认 | 应用 golden theme 后启动试玩，确认标题页视觉与编辑器一致；再导出可运行成品并打开，确认标题页视觉未回退、BGM 仍取项目值 |
| 导出 `.gmtheme` 后重新导入到新项目，标题界面与 unified browser 的“完整主题”说明一致 | THM-01 | 需要跨项目操作与 UI 文案核对 | 从已应用 golden theme 的项目导出 `.gmtheme`，在新项目导入并应用；检查标题界面视觉、browser coverage badge、来源/已应用状态是否一致 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
