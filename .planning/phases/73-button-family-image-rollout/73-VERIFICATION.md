---
phase: 73-button-family-image-rollout
verified: 2026-04-23T19:42:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the global theme editor, select images for gameMenuButton normal/hover/pressed states, then hover and click a game menu button in the runtime preview iframe."
    expected: "The button shows the selected normal image, switches to hover image on mouseover, and switches to pressed image on mousedown. Text label remains visible and clickable."
    why_human: "Visual rendering of ::before underlay stacking, image display quality, and real pointer interaction cannot be verified by grep or unit tests alone."
  - test: "Configure pageTabPager or settingsTab with a selected-state image, then click between tabs in save/load screen or settings screen."
    expected: "The active tab shows the selected-state image; inactive tabs show normal-state image. Tab switching behavior is unchanged."
    why_human: "Selected-state visual feedback and tab switching UX require real runtime interaction to confirm .active class correctly drives imagery."
  - test: "Configure close-button family images, then open settings screen (both structured and custom layouts) and verify close buttons show imagery while title/reset footer buttons do not."
    expected: "Only close-role buttons (.settings-structured-footer-close, .settings-custom-close) show button-family imagery. Other footer buttons remain unskinned."
    why_human: "Selector scoping correctness on real DOM requires visual inspection across both structured and custom settings layouts."
  - test: "Configure QAB button family images and verify SVG icons, .active state, and .disabled state are not visually broken."
    expected: "QAB buttons show underlay imagery behind SVG icons. Active/disabled states continue to work. SVGs are not replaced or hidden."
    why_human: "SVG/underlay stacking and disabled-state visual treatment cannot be verified without rendering."
---

# Phase 73: Button-Family Image Rollout Verification Report

**Phase Goal:** 用户可以为主要游戏界面按钮族应用成组图片状态，同时保持文字、图标与点击行为稳定。
**Verified:** 2026-04-23T19:42:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Users can configure normal/hover/pressed image states for gameMenuButton, QAB, and closeButton families | VERIFIED | `uiImageContract.js` defines 3-state keys (L12-14); `ButtonFamilyImageSettings.vue` exposes THREE_STATES for these families (L59-61); `BUTTON_FAMILY_PSEUDO_MAP` maps to `:hover::before` and `:active::before` (L155-160); 49 node:test + 26 vitest tests pass |
| 2 | Users can configure normal/hover/pressed/selected image states for pageTabPager and settingsTab families | VERIFIED | `uiImageContract.js` defines 4-state keys (L16-17); `ButtonFamilyImageSettings.vue` exposes FOUR_STATES (L63-64); ThemeManager maps `selected` to `.active::before` (L159); `TabWidget.js` toggles `.active` on gm-tab (L99); 21 configurableTabs tests pass |
| 3 | Button text, icons, and click targets remain stable after skinning | VERIFIED | CSS uses `::before` pseudo-element underlays with `z-index: -1` and `pointer-events: none` (style.css L1746-1753); ThemeManager emits `position: relative; isolation: isolate` base rule (L200-206); `quickActionBarButtonFamily.test.js` confirms QAB active/disabled/SVG preserved |
| 4 | Hover/pressed/selected image feedback matches actual interaction state | VERIFIED | `BUTTON_FAMILY_PSEUDO_MAP` uses pure CSS pseudo-classes -- no JS state machine (L155-160); `BUTTON_FAMILY_STATE_SELECTORS` frozen in registry (L76-81); `themeManagerUiImage.test.js` asserts correct pseudo-class mapping |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/uiImageContract.js` | Button-family contract shape and scan collector | VERIFIED | 192 lines; defines `UI_BUTTON_FAMILY_STATE_KEYS` for 5 families; `collectButtonFamilyUiImages` registered in `UI_IMAGE_SCAN_REGISTRY` |
| `src/engine/ThemeManager.js` | Button-family selector registry and CSS builder | VERIFIED | 260 lines; `BUTTON_FAMILY_SELECTOR_REGISTRY` covers all 5 families; `buildButtonFamilyCSS` generates ::before underlay rules; `applyButtonFamilies` exported |
| `src/editor/components/theme/ButtonFamilyImageSettings.vue` | Five-family image state editor | VERIFIED | 216 lines; exposes 5 family cards with correct state keys; uses `pickUiImage`/`clearUiImage` shared helpers; emits preview events |
| `src/editor/views/ProjectSettings.vue` | Preview target routing for button families | VERIFIED | Mounts `ButtonFamilyImageSettings` in global theme section; `buttonFamilyPreviewMap` routes to existing runtime owners |
| `src/ui/widgets/TabWidget.js` | gm-tab .active parity hook | VERIFIED | `classList.toggle('active', i === index)` at L99 |
| `src/ui/SettingsScreen.js` | Dedicated structured/custom close selectors | VERIFIED | `settings-structured-footer-close` at L573; `settings-custom-close` at L368 |
| `src/style.css` | Button-family ::before underlay positioning helpers | VERIFIED | L1729-1754; covers all 12 selectors with `content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none` |
| `tests/uiImageContract.test.js` | Contract + collector regression coverage | VERIFIED | 49 tests pass |
| `tests/themeManagerUiImage.test.js` | Registry, CSS generation, and selected-state coverage | VERIFIED | Part of 26 vitest tests passing |
| `tests/quickActionBarButtonFamily.test.js` | QAB active/disabled/SVG regression | VERIFIED | Part of 26 vitest tests passing |
| `tests/buttonFamilyPreviewWiring.test.js` | Editor preview routing regression | VERIFIED | Part of 26 vitest tests passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/shared/uiImageContract.js` | `src/engine/scanAssets.js` | `collectUiImagePaths` via `UI_IMAGE_SCAN_REGISTRY` | WIRED | `collectButtonFamilyUiImages` registered at L165; scanAssets tests confirm button-family paths in `ui` bucket |
| `src/engine/ThemeManager.js` | `ui.theme.buttonFamilies` | Centralized selector registry | WIRED | `BUTTON_FAMILY_SELECTOR_REGISTRY` at L61-74; `buildButtonFamilyCSS` reads `buttonFamilies` at L163 |
| `src/main.js` | `src/engine/ThemeManager.js` | `applyButtonFamilies` at init, preview, update-theme | WIRED | Import at L13; called at L135 (init), L1206 (preview), L1284 (update-theme) |
| `src/editor/components/theme/ButtonFamilyImageSettings.vue` | `src/editor/stores/script.js` | `themeEditor.commitTheme()` | WIRED | Uses `useScriptStore()` and `useThemeEditor()` composable; `commitButtonFamilies` triggers `commitTheme` at L95-96 |
| `src/editor/views/ProjectSettings.vue` | `src/main.js` | `postMessage update-theme + show-screen` | WIRED | `buttonFamilyPreviewMap` at L137-142; `flushPreview` sends `update-theme` then routes to screen owner |
| `src/ui/widgets/TabWidget.js` | ThemeManager settingsTab selectors | `.gm-tab.active` | WIRED | `classList.toggle('active')` at L99; ThemeManager targets `.gm-tab` in `settingsTab` selector list |
| `src/ui/SettingsScreen.js` | ThemeManager closeButton selectors | `.settings-structured-footer-close` / `.settings-custom-close` | WIRED | Close hooks at L368 and L573; ThemeManager targets both in `closeButton` selector list |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `ButtonFamilyImageSettings.vue` | `theme.buttonFamilies` | `useScriptStore().getTheme()` via reactive computed | Yes -- reads from script store, mutations persist through `commitTheme` | FLOWING |
| `ThemeManager.js` `applyButtonFamilies` | `themeData.buttonFamilies` | Passed from `engine.script.ui.theme` in main.js | Yes -- reads actual script data at runtime | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Contract tests pass | `node --test tests/uiImageContract.test.js tests/scanAssets.test.js` | 49 pass, 0 fail | PASS |
| ThemeManager + QAB + preview tests pass | `npx vitest run tests/themeManagerUiImage.test.js tests/quickActionBarButtonFamily.test.js tests/buttonFamilyPreviewWiring.test.js tests/uiImageFieldFlow.test.js` | 26 pass, 0 fail | PASS |
| DOM hook + layout tests pass | `npx vitest run tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/settingsStructured.test.js` | 139 pass, 0 fail | PASS |
| TabWidget active parity tests pass | `node --test tests/configurableTabs.test.js` | 21 pass, 0 fail | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| BTN-01 | 73-01, 73-02, 73-03 | 用户可以为 3 个非选中态按钮族配置 normal/hover/pressed 图片态 | SATISFIED | Contract defines 3-state keys; ThemeManager generates CSS for 3 pseudo-states; editor exposes 3-state fields; runtime injects CSS at all theme paths |
| BTN-02 | 73-01, 73-02, 73-03 | 用户可以为 2 个需要选中态的按钮族配置 normal/hover/pressed/selected 图片态 | SATISFIED | Contract defines 4-state keys; ThemeManager maps `selected` to `.active::before`; gm-tab `.active` toggle in TabWidget; editor exposes 4-state fields |
| BTN-03 | 73-02, 73-03 | 用户应用按钮图片皮肤后，文字或图标仍保持可读、对齐稳定且可点击 | SATISFIED | ::before underlay with z-index:-1 and pointer-events:none; position:relative + isolation:isolate base rule; QAB regression tests confirm SVG/active/disabled preservation |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ButtonFamilyImageSettings.vue` | 22 | `placeholder="未选择"` | Info | HTML input placeholder for empty state -- not a code stub |

No blockers, warnings, or stubs found across all Phase 73 modified files.

### Human Verification Required

### 1. Button-family underlay visual rendering

**Test:** Open the global theme editor, select images for gameMenuButton normal/hover/pressed states, then hover and click a game menu button in the runtime preview iframe.
**Expected:** The button shows the selected normal image, switches to hover image on mouseover, and switches to pressed image on mousedown. Text label remains visible and clickable.
**Why human:** Visual rendering of ::before underlay stacking, image display quality, and real pointer interaction cannot be verified by grep or unit tests alone.

### 2. Selected-state tab imagery

**Test:** Configure pageTabPager or settingsTab with a selected-state image, then click between tabs in save/load screen or settings screen.
**Expected:** The active tab shows the selected-state image; inactive tabs show normal-state image. Tab switching behavior is unchanged.
**Why human:** Selected-state visual feedback and tab switching UX require real runtime interaction to confirm .active class correctly drives imagery.

### 3. Close-family selector scoping

**Test:** Configure close-button family images, then open settings screen (both structured and custom layouts) and verify close buttons show imagery while title/reset footer buttons do not.
**Expected:** Only close-role buttons show button-family imagery. Other footer buttons remain unskinned.
**Why human:** Selector scoping correctness on real DOM requires visual inspection across both structured and custom settings layouts.

### 4. QAB underlay + SVG stacking

**Test:** Configure QAB button family images and verify SVG icons, .active state, and .disabled state are not visually broken.
**Expected:** QAB buttons show underlay imagery behind SVG icons. Active/disabled states continue to work. SVGs are not replaced or hidden.
**Why human:** SVG/underlay stacking and disabled-state visual treatment cannot be verified without rendering.

### Gaps Summary

No automated verification gaps found. All 4 roadmap success criteria are verified at the code level. All 3 requirements (BTN-01, BTN-02, BTN-03) are satisfied. All artifacts exist, are substantive, are wired, and have data flowing through them. All 235 tests pass across 4 test commands.

4 human verification items remain for visual/interaction confirmation that cannot be tested programmatically.

---

_Verified: 2026-04-23T19:42:00Z_
_Verifier: Claude (gsd-verifier)_
