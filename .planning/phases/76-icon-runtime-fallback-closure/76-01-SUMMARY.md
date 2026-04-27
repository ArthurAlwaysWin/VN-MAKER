---
phase: 76-icon-runtime-fallback-closure
plan: 01
subsystem: runtime-ui
tags: [icons, qab, runtime, preview]
requirements: [ICO-01, AST-03]
provides: [qab-runtime-consumer, theme-icon-routing]
affects: [src/main.js, src/ui/QuickActionBar.js, src/style.css, tests/quickActionBarThemeIcon.test.js, tests/mainThemeIconRouting.test.js, tests/quickActionBarButtonFamily.test.js]
decisions:
  - Reused the existing `ui.theme.icons.qab` slot and `resolveThemeIcon()` path instead of introducing a QAB-only icon pipeline.
  - Kept the original QAB SVG set as the empty-slot fallback and re-render baseline.
metrics:
  verification:
    - "npx vitest run tests/quickActionBarThemeIcon.test.js tests/quickActionBarButtonFamily.test.js tests/mainThemeIconRouting.test.js"
    - "node --test tests/scanAssets.test.js"
---

# Phase 76 Plan 01: QAB Runtime Wiring Summary

`ui.theme.icons.qab` now reaches the real QuickActionBar in init, preview bootstrap, and live theme refreshes while preserving the original SVG fallback.

## Completed Tasks

1. **Add real QAB themed-icon rendering with default SVG fallback**
   - Added `QuickActionBar#setThemeIcons()`
   - Rendered all 8 QAB buttons from the locked `qab` slot
   - Preserved `.active`, `.disabled`, button-family underlay, and click delegation behavior
   - Commits: `19d7a05`, `2b86d2a`

2. **Wire QAB theme icons through init, preview bootstrap, and live theme updates**
   - Added `quickBar.setThemeIcons(...)` in `applyPreviewScriptSnapshot()`
   - Added `quickBar.setThemeIcons(...)` during normal runtime init
   - Added `quickBar.setThemeIcons(themeIcons || null)` in `update-theme`
   - Commits: `3076a2e`, `62b8ba8`

## Verification Evidence

- `npx vitest run tests/quickActionBarThemeIcon.test.js tests/quickActionBarButtonFamily.test.js tests/mainThemeIconRouting.test.js` ✅
- `node --test tests/scanAssets.test.js` ✅

## Deviations from Plan

None - plan executed as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/76-icon-runtime-fallback-closure/76-01-SUMMARY.md`
- FOUND: commits `19d7a05`, `2b86d2a`, `3076a2e`, `62b8ba8`
