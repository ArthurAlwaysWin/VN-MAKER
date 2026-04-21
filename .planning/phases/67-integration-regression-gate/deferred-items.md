# Deferred Items

## 2026-04-21 — Out-of-scope verification failures during 67-02

- `npx vitest run` reports **10 unrelated legacy Node test files** as `No test suite found` under Vitest:
  - `tests/colorRecipe.test.js`
  - `tests/configurableTabs.test.js`
  - `tests/decorLayoutEditor.test.js`
  - `tests/exportDesktop.test.js`
  - `tests/oklch.test.js`
  - `tests/scanAssets.test.js`
  - `tests/scriptEngine.test.js`
  - `tests/smartColorPanel.test.js`
  - `tests/tabLayoutEditor.test.js`
  - `tests/widgetDefaults.test.js`
- `tests/mainConfigRouting.test.js` has **7 existing preview bootstrap assertions** expecting legacy `initPreview()` layout calls that are unrelated to PREV-05 cleanup orchestration.
- These failures were discovered while running the required verification commands for 67-02 and were not modified because they are outside the scope of the current task.
