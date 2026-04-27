---
phase: 76-icon-runtime-fallback-closure
plan: 02
subsystem: runtime-ui
tags: [icons, fallback, runtime, export]
requirements: [ICO-01, AST-04]
provides: [shared-theme-icon-recovery, consumer-fallback-parity]
affects: [src/ui/themeIconHelpers.js, src/ui/GameMenu.js, src/ui/SaveLoadScreen.js, src/ui/BacklogScreen.js, src/ui/SettingsScreen.js, tests/themeIconHelpers.test.js, tests/gameMenuLayout.test.js, tests/saveLoadScreenLayout.test.js, tests/backlogScreenLayout.test.js, tests/settingsStructured.test.js, tests/quickActionBarThemeIcon.test.js]
decisions:
  - Added one shared post-render recovery hook in `themeIconHelpers.js` instead of bespoke per-screen image error handlers.
  - Kept GameMenu button-specific icons highest priority; only theme-level icon fallback recovers to existing text/button content.
  - When Backlog voice replay theme icons fail once, the button permanently returns to the existing `▶` / `■` text state for later toggles.
metrics:
  verification:
    - "npx vitest run tests/quickActionBarThemeIcon.test.js tests/quickActionBarButtonFamily.test.js tests/mainThemeIconRouting.test.js tests/themeIconHelpers.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/settingsStructured.test.js tests/exportGame.test.js"
    - "node --test tests/scanAssets.test.js tests/exportDesktop.test.js"
---

# Phase 76 Plan 02: Shared Icon Fallback Recovery Summary

Broken or missing themed icon assets now recover to the existing default icon/text behavior across QAB, game menu, close buttons, and backlog voice replay.

## Completed Tasks

1. **Upgrade the shared theme icon helper to handle broken assets**
   - Added shared themed-icon shell markup plus post-render fallback binding
   - Restored QAB SVG fallback after image load errors
   - Commits: `0ef590e`, `58f2cd7`

2. **Adopt the fallback contract in all current icon consumers**
   - Applied shared fallback binding in `GameMenu`, `SaveLoadScreen`, `BacklogScreen`, and `SettingsScreen`
   - Preserved `返回`, `×`, and `▶` / `■` fallback behavior
   - Commits: `33a2309`, `aa31fbd`

## Verification Evidence

- `npx vitest run tests/quickActionBarThemeIcon.test.js tests/quickActionBarButtonFamily.test.js tests/mainThemeIconRouting.test.js tests/themeIconHelpers.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/settingsStructured.test.js tests/exportGame.test.js` ✅
- `node --test tests/scanAssets.test.js tests/exportDesktop.test.js` ✅

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Switched `exportGame.test.js` verification to Vitest**
- **Found during:** Plan verification
- **Issue:** `tests/exportGame.test.js` imports Vitest APIs, so the plan’s `node --test` invocation fails before running the export assertions.
- **Fix:** Ran `tests/exportGame.test.js` under `npx vitest run` while keeping `scanAssets.test.js` and `exportDesktop.test.js` on `node --test`.
- **Files modified:** None
- **Commit:** N/A

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/76-icon-runtime-fallback-closure/76-02-SUMMARY.md`
- FOUND: commits `0ef590e`, `58f2cd7`, `33a2309`, `aa31fbd`
