---
phase: 81-golden-theme
plan: 01
subsystem: shared-theme-pipeline
tags: [theme-package, title-screen, vitest, electron]
requires:
  - phase: 79-unified-install-apply-export-pipeline
    provides: shared install/apply/export path for full themes
  - phase: 80-theme-browser-ux
    provides: unified browser and applied package metadata flow
provides:
  - titleScreen as the 8th full-theme coverage surface
  - visual-only title ownership that preserves project-owned titleScreen.bgm
  - round-trip contract coverage for install/apply/export/import
affects: [theme-contract, installer, exporter, script-store]
tech-stack:
  added: []
  patterns: [shared full-theme coverage expansion, visual-only title ownership, existing-pipeline reuse]
key-files:
  created: []
  modified: [src/shared/themePackageContract.js, src/shared/uiImageContract.js, electron/themePackageInstaller.js, electron/themePackageExporter.js, src/editor/stores/script.js, tests/themePackageContract.test.js, tests/themePackager.test.js, tests/themePackagePreflight.test.js, tests/themePackageInstaller.test.js, tests/themePackageInstallFlow.test.js, tests/scriptThemeApply.test.js, tests/themePackageExporter.test.js, tests/themePackageRoundTrip.test.js]
requirements-completed: [THM-01]
completed: 2026-04-27
---

# Phase 81 Plan 01 Summary

**`titleScreen` is now part of the full-theme contract, but only its visual fields are theme-owned; `titleScreen.bgm` remains project-owned across install/apply/export/reimport.**

## Accomplishments

- Added `titleScreen` to the shared full-theme coverage set so compatibility, preflight, export, and browser completeness all agree on an 8-surface contract.
- Extended contract/image scanning to include title background and image-bearing title elements while explicitly excluding `titleScreen.bgm`.
- Wired installer, exporter, and `applyThemeBundle()` so title visuals round-trip through the same `.gmtheme` pipeline as other full-theme areas.
- Locked the behavior with focused tests covering contract detection, manifest scanning, apply semantics, exporter snapshotting, and round-trip parity.

## Decisions Made

- Reused the existing Phase 79 full-theme pipeline instead of introducing any title-only path.
- Preserved project `titleScreen.bgm` on apply/export because Phase 81 owns only non-content visual UX.
- Kept title ownership limited to background and image-bearing elements so text/button layout data can ship without claiming project audio.

## Verification

- `npx vitest run tests/themePackageContract.test.js tests/themePackager.test.js tests/themePackagePreflight.test.js tests/themePackageInstaller.test.js tests/themePackageInstallFlow.test.js tests/scriptThemeApply.test.js tests/themePackageExporter.test.js tests/themePackageRoundTrip.test.js`

---
*Phase: 81-golden-theme*
*Completed: 2026-04-27*
