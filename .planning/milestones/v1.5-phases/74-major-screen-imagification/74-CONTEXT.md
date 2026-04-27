# Phase 74 Context: 主要界面图片化

**Phase:** 74-major-screen-imagification
**Milestone:** v1.5 — UI 图片驱动体系
**Depends on:** Phase 71 (契约基线), Phase 72 (对话框图片化), Phase 73 (按钮族图片化)

---

## Goal

为 SaveLoad / Backlog / GameMenu / Settings 四个 major screen 补齐背景图与装饰层配置，使它们与 TitleScreen / Settings 一样拥有完整的视觉定制能力。

---

## Current State (Pre-Phase 74)

### Screen Background Image Support

| Screen | Has Background? | Path | Notes |
|--------|----------------|------|-------|
| TitleScreen | Yes | `ui.titleScreen.backgroundImage` | Legacy path, works |
| Settings | Yes (header only) | `ui.settingsScreen.header.backgroundImage` | Structured config |
| GameMenu | Yes | `ui.gameMenuScreen.backgroundImage` | **Old path** — needs migration to `.chrome` |
| SaveLoad | No | — | Needs new field |
| Backlog | No | — | Needs new field |

### Screen Decoration Support

| Screen | Has Decorations? | Path | Notes |
|--------|-----------------|------|-------|
| Settings | Yes | `ui.settingsScreen.header.decorations[]` | `{src, x, y, width, height}` |
| Others | No | — | Need new fields |

### Existing Editor Infrastructure

- **4 编辑器视图**已有 iframe 预览：SaveLoadEditor / BacklogEditor / GameMenuEditor / SettingsPageEditor
- **Composable**: `useScreenLayoutEditor.js` (SaveLoad/Backlog/GameMenu) + `useSettingsPageEditor.js` (Settings)
- **PostMessage 协议**: `update-screen-layout` + `show-screen` 已完整支持所有 5 个画面
- **Engine handler** (`src/main.js`): `setLayout()` 分发已覆盖

### Contract & Pipeline (Phase 71)

- `UI_SCREEN_CHROME_ROOTS` 已预留 chrome 子路径
- `uiImageContract.js` 提供 `pickUiImage()` / `clearUiImage()` helpers
- `scanAssets.js` 已有 screen-level image collectors (TitleScreen, Settings)
- Export path: `assets/ui/xxxScreen/`

---

## Key Files

### Engine (Runtime)
- `src/engine/SaveLoadScreen.js` — 存读档运行时
- `src/engine/BacklogScreen.js` — 回想运行时
- `src/engine/GameMenuScreen.js` — 游戏菜单运行时
- `src/engine/SettingsScreen.js` — 设置运行时
- `src/engine/ThemeManager.js` — 主题管理器，读取 UI 契约
- `src/engine/uiImageContract.js` — UI 图片契约 helpers

### Editor
- `src/editor/views/SaveLoadEditor.vue` — 存读档编辑器
- `src/editor/views/BacklogEditor.vue` — 回想编辑器
- `src/editor/views/GameMenuEditor.vue` — 游戏菜单编辑器
- `src/editor/views/SettingsPageEditor.vue` — 设置页编辑器
- `src/editor/composables/useScreenLayoutEditor.js` — 通用屏幕布局编辑器 composable
- `src/editor/composables/useSettingsPageEditor.js` — 设置页专用 composable
- `src/editor/components/layout/SaveLoadSection.vue` — 存读档配置区
- `src/editor/components/layout/BacklogSection.vue` — 回想配置区
- `src/editor/components/layout/GameMenuSection.vue` — 游戏菜单配置区
- `src/editor/components/layout/SettingsSection.vue` — 设置配置区
- `src/editor/components/layout/DecorationSection.vue` — 装饰层配置区 (Settings 专用)
- `src/editor/components/theme/ButtonFamilyImageSettings.vue` — Phase 73 按钮族图片设置

### Infrastructure
- `src/tools/scanAssets.js` — 资产扫描
- `src/main.js` — 引擎入口，postMessage handler

---

## Architectural Decisions (from Discussion)

1. **Chrome 子路径统一**: `ui.xxxScreen.chrome.backgroundImage` + `ui.xxxScreen.chrome.decorations[]`
2. **GameMenu 迁移**: `ui.gameMenuScreen.backgroundImage` → `ui.gameMenuScreen.chrome.backgroundImage`，带 `@deprecated` fallback
3. **装饰层**: `{src, x, y, width, height}`，`pointerEvents: none`，>3 层软提示
4. **预览**: 复用现有 iframe 基础设施
5. **YAGNI**: 不预留给 Phase 75 的 overlay/cursor 字段
6. **Editor**: 新建 `MajorScreenImageSettings.vue` 统一组件，嵌入各 Section
