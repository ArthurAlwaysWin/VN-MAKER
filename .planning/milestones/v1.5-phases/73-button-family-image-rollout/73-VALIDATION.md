---
phase: 73
slug: button-family-image-rollout
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-23
---

# Phase 73 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + Node built-in test runner |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/themeManagerUiImage.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/settingsStructured.test.js tests/quickActionBarButtonFamily.test.js tests/uiImageFieldFlow.test.js tests/buttonFamilyPreviewWiring.test.js && node --test tests/uiImageContract.test.js tests/scanAssets.test.js tests/configurableTabs.test.js` |
| **Full suite command** | `npx vitest run tests/themeManagerUiImage.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/settingsStructured.test.js tests/quickActionBarButtonFamily.test.js tests/uiImageFieldFlow.test.js tests/buttonFamilyPreviewWiring.test.js && node --test tests/uiImageContract.test.js tests/scanAssets.test.js tests/configurableTabs.test.js` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the smallest task-specific command from the per-task map below
- **After every plan wave:** Run `npx vitest run tests/themeManagerUiImage.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/settingsStructured.test.js tests/quickActionBarButtonFamily.test.js tests/uiImageFieldFlow.test.js tests/buttonFamilyPreviewWiring.test.js && node --test tests/uiImageContract.test.js tests/scanAssets.test.js tests/configurableTabs.test.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 73-01-01 | 01 | 1 | BTN-01 | unit | `node --test tests/uiImageContract.test.js tests/scanAssets.test.js` | ✅ | ⬜ pending |
| 73-01-02 | 01 | 1 | BTN-02 | unit | `npx vitest run tests/themeManagerUiImage.test.js` | ✅ | ⬜ pending |
| 73-02-01 | 02 | 2 | BTN-02 | unit/integration | `npx vitest run tests/settingsStructured.test.js && node --test tests/configurableTabs.test.js` | ✅ | ⬜ pending |
| 73-02-02 | 02 | 2 | BTN-01, BTN-02, BTN-03 | integration | `npx vitest run tests/themeManagerUiImage.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/quickActionBarButtonFamily.test.js` | ✅ | ⬜ pending |
| 73-03-01 | 03 | 2 | BTN-01, BTN-02 | unit | `npx vitest run tests/uiImageFieldFlow.test.js` | ✅ | ⬜ pending |
| 73-03-02 | 03 | 2 | BTN-01, BTN-02, BTN-03 | integration | `npx vitest run tests/uiImageFieldFlow.test.js tests/buttonFamilyPreviewWiring.test.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/themeManagerUiImage.test.js` — extend for button-family style generation, partial-state fallback, and close-family multi-selector coverage
- [ ] `tests/quickActionBarButtonFamily.test.js` — add focused QAB regression for `.active` / `.disabled` preservation and SVG visibility
- [ ] `tests/uiImageContract.test.js` — extend scan/export coverage for `ui.theme.buttonFamilies`
- [ ] `tests/configurableTabs.test.js` or a sibling settings-tab test — cover widget-style selected-state parity after `gm-tab` normalization
- [ ] `tests/buttonFamilyPreviewWiring.test.js` — lock preview target routing and `update-theme` sequencing for all five families

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Runtime preview target switching across GameMenu / SaveLoad / Settings / dialogue QAB | BTN-01, BTN-02, BTN-03 | Existing automated coverage may not fully prove editor-side preview routing if new target controls are introduced | In the theme-oriented editor surface, apply sample button-family images and confirm each family appears on its intended runtime-backed preview surface without using a local mock preview |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
