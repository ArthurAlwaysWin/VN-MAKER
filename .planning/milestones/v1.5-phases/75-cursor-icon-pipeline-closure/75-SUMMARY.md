# Phase 75: Cursor & Icon Pipeline Closure — Summary

## Deliverables

### 75-01: Shared Contract + Scan Extension
- **`src/shared/uiImageContract.js`** — Added `UI_CURSOR_ROOT`, `UI_ICON_ROOT`, `UI_CURSOR_SLOT_KEYS` (default, pointer), `UI_ICON_SLOT_KEYS` (gameMenu, qab, close, voiceReplay), and `collectCursorIconUiImages` collector registered in `UI_IMAGE_SCAN_REGISTRY`
- **`src/engine/ThemeManager.js`** — Added `CURSOR_SLOT_SELECTORS`, `applyCursors(themeData)`, `resetCursors()`, and `buildCursorCSS()` internal — injects `<style id="galgame-cursors">` with `cursor: url() fallback` pattern
- **`src/main.js`** — Integrated `applyCursors()` call alongside existing theme apply chain (init, reload, update-theme)
- **Tests**: 12 contract tests + 20 ThemeManager tests passing

### 75-02: Runtime Icon Rendering + Fallback
- **`src/ui/themeIconHelpers.js`** — New helper module: `resolveThemeIcon(icons, slotKey, fallback, className)`, `hasThemeIcon(icons, slotKey)`
- **`src/ui/GameMenu.js`** — Added `_themeIcons`, `setThemeIcons()`, gameMenu icon fallback from theme icons
- **`src/ui/BacklogScreen.js`** — Added `_themeIcons`, `setThemeIcons()`, voice replay icon + close icon theme support
- **`src/ui/SettingsScreen.js`** — Added `_themeIcons`, `setThemeIcons()`, close icon theme support (structured, legacy, custom layout modes)
- **`src/ui/SaveLoadScreen.js`** — Added `_themeIcons`, `setThemeIcons()`, close icon theme support
- **`src/main.js`** — `setThemeIcons()` called on all 4 screens in init, reload, and update-theme paths
- **Tests**: 6 themeIconHelpers tests passing

### 75-03: Editor UI + Full Pipeline Parity
- **`src/editor/components/theme/CursorIconSettings.vue`** — New editor component with 2 cursor slots (default, pointer) and 4 icon slots (gameMenu, qab, close, voiceReplay), each with image picker + clear button, writes to `ui.theme.cursor` / `ui.theme.icons`
- **`src/editor/views/ProjectSettings.vue`** — Integrated `CursorIconSettings` below `ButtonFamilyImageSettings`
- **`tests/scanAssets.test.js`** — Added cursor/icon fixture data + expected paths for full pipeline scan verification
- **Build**: Production build succeeds

## Test Results
- `uiImageContract.test.js`: 12/12 pass
- `themeManagerUiImage.test.js`: 20/20 pass
- `themeIconHelpers.test.js`: 6/6 pass
- `scanAssets.test.js`: 42/42 pass
- `uiImageFieldFlow.test.js`: 12/12 pass
- `majorScreenImageSettings.test.js`: 3/3 pass
- Total: **109 tests passing**, production build clean

## Contract Keys Locked
| Root | Slot Keys |
|------|-----------|
| `ui.theme.cursor` | default, pointer |
| `ui.theme.icons` | gameMenu, qab, close, voiceReplay |

## Pipeline Parity Confirmed
- ✅ Scan: cursor/icon paths discovered by `collectCursorIconUiImages`
- ✅ Export: paths flow through existing `scanAssets` → `exportAssets` pipeline
- ✅ Runtime: `applyCursors()` injects CSS; `setThemeIcons()` renders `<img>` with `resolvePath`
- ✅ Editor: `CursorIconSettings.vue` provides full CRUD for cursor/icon slots
- ✅ Fallback: No cursor → browser default; No icon → text fallback (▶, ×, 返回)
