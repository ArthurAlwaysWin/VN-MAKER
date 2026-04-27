---
phase: 81-golden-theme
plan: 03
subsystem: acceptance
tags: [golden-theme, acceptance, settings-screen, vitest, build]
requires:
  - phase: 81-golden-theme
    provides: title-inclusive contract and golden `wafuu` baseline
provides:
  - automated parity evidence for save/reopen/export/reimport/browser reconstruction
  - exported settings-screen regression coverage for glyph icons and footer baseline fidelity
  - explicit remaining human acceptance gate for playtest/exported-output coherence
affects: [acceptance-tests, settings-screen, builtin-themes, phase-state]
tech-stack:
  added: []
  patterns: [focused acceptance gate, regression-first debugging, human-needed final visual review]
key-files:
  created: [tests/themeGoldenAcceptance.test.js]
  modified: [src/ui/SettingsScreen.js, src/editor/builtinThemes.js, tests/settingsStructured.test.js, tests/themePackageInstaller.test.js]
requirements-completed: [THM-01]
completed: 2026-04-27
---

# Phase 81 Plan 03 Summary

**Automated Phase 81 parity evidence is green, and the exported settings-screen regressions from the user screenshot were fixed by correcting glyph icon rendering and `wafuu` footer baseline data.**

## Accomplishments

- Added `tests/themeGoldenAcceptance.test.js` to prove apply → save/reopen → export → reimport → browser reconstruction parity for golden `wafuu` while preserving `titleScreen.bgm`.
- Fixed a real exporter blocker where emoji/glyph settings tab icons were being treated as theme-owned asset refs.
- Fixed the exported/runtime settings tab regression by rendering non-path `tab.icon` values as text instead of image paths in `SettingsScreen`.
- Fixed the golden baseline footer regression by replacing `wafuu`'s placeholder footer button coordinates with shipped positions that match structured settings layout expectations.
- Re-ran the focused Phase 81 gate, including settings regressions and build, to confirm the golden-theme path remains stable.

## Issues Encountered

- The original golden acceptance run exposed mixed icon values as an asset-ref classification bug in the shared contract.
- The user-provided exported-app screenshot exposed two distinct settings regressions: runtime glyph icons were misinterpreted as image assets, and the built-in golden footer still used placeholder coordinates.

## Remaining Gate

- Human verification is still required for playtest/exported-output visual coherence across title/dialogue/save-load/backlog/game-menu/settings and for confirming `titleScreen.bgm` stays project-owned in the real exported app.

## Verification

- `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js tests/themeBrowserService.test.js tests/themePackageImportUx.test.js tests/themeBrowserModal.test.js tests/themeGoldenAcceptance.test.js tests/settingsStructured.test.js tests/leftTabDecorations.test.js`
- `npm run build`

---
*Phase: 81-golden-theme*
*Completed: 2026-04-27*
