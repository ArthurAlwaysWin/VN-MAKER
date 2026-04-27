# Phase 75: Cursor & Icon Pipeline Closure - Validation

**Generated:** 2026-04-27
**Status:** Evidence backfill

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + Node built-in `node:test` |
| Config file | `vitest.config.js` |
| Focused command | `node --test tests/scanAssets.test.js tests/exportDesktop.test.js && npx vitest run tests/exportGame.test.js tests/themeManagerUiImage.test.js tests/themeIconHelpers.test.js tests/quickActionBarThemeIcon.test.js tests/quickActionBarButtonFamily.test.js tests/mainThemeIconRouting.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/settingsStructured.test.js` |

## Requirement / Evidence Map

| Req ID | Behavior | Automated Command | Evidence |
|--------|----------|-------------------|----------|
| CUR-01 | Theme cursor `default / pointer` applies in runtime and falls back to system cursor when missing/broken | `npx vitest run tests/themeManagerUiImage.test.js` | `src/engine/ThemeManager.js`; `src/main.js`; `75-SUMMARY.md` |
| CUR-01 | Cursor/icon selections still scan/export through the shared UI image pipeline | `node --test tests/scanAssets.test.js tests/exportDesktop.test.js && npx vitest run tests/exportGame.test.js` | `src/shared/uiImageContract.js`; `src/engine/scanAssets.js`; `electron/exportGame.js`; `electron/exportDesktop.js` |
| Reopened in Phase 76 | QAB runtime icon consumption plus broken-icon fallback for `gameMenu` / `qab` / `close` / `voiceReplay` | `npx vitest run tests/themeIconHelpers.test.js tests/quickActionBarThemeIcon.test.js tests/mainThemeIconRouting.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/settingsStructured.test.js` | `.planning/phases/76-icon-runtime-fallback-closure/76-VERIFICATION.md` |

## Scope Guardrails

- This backfill does **not** re-credit Phase 75 with the icon/runtime fixes reopened by the milestone audit.
- `ICO-01`, `AST-03`, and `AST-04` are verified through Phase 76 evidence, not back-dated into Phase 75.
- The focused suite uses existing repo commands only; `tests/exportGame.test.js` must continue running under Vitest, not `node --test`.
