---
phase: 44-settingsstructured
plan: 01
subsystem: ui/SettingsScreen
tags: [settings, structured-mode, tabs, widgetStyles]
dependency_graph:
  requires: [Phase 42 widgetStyles, SETTING_DEFS, TabWidget, SliderWidget, ToggleWidget]
  provides: [_renderStructured(), _renderStructuredContent(), SETTING_GROUP_KEYS]
  affects: [SettingsScreen show() routing]
tech_stack:
  added: [createTabBar integration in SettingsScreen]
  patterns: [tab-based grouped settings, fallback rendering when no widgetStyles]
key_files:
  created:
    - tests/settingsStructured.test.js
  modified:
    - src/ui/SettingsScreen.js
decisions:
  - "Tab bar uses createTabBar from TabWidget when widgetStyles set, simple buttons as fallback"
  - "Settings grouped by array-of-arrays constant (SETTING_GROUP_KEYS) with index-based tab mapping"
  - "Footer button with 'title' in id triggers onTitle callback; others trigger hide()"
  - "_activeTab persists across show() calls (user stays on their selected tab)"
metrics:
  duration: ~5m
  completed: "2026-04-16T12:56:00Z"
  tasks_completed: 6
  tasks_total: 6
  files_changed: 2
  tests_added: 55
  tests_passing: 55
---

# Phase 44 Plan 01: SettingsScreen Structured Mode Summary

**One-liner:** Tab-based auto-rendering of SETTING_DEFS grouped into 声音/画面/游戏 tabs with widgetStyles integration and fallback button tabs.

## What Was Built

Added `_renderStructured(layout)` and `_renderStructuredContent(layout)` methods to SettingsScreen that activate when `elements[]` is empty but `header`/`tabBar`/`contentArea` config exists in the layout. This provides a third rendering mode between the fully-custom elements-based layout and the hardcoded default.

### Structured Mode Components

1. **Header** — Title with configurable text/fontSize/color/position, optional backgroundImage via resolvePath, close (×) button
2. **Tab Bar** — Uses `createTabBar()` from TabWidget when widgetStyles is set (SCREEN-05), falls back to simple styled buttons when widgetStyles is null
3. **Content Area** — Positioned container (x/y/width/height) with overflow-y scroll, renders settings for the active tab group
4. **Footer** — Optional buttons with absolute positioning, supports onTitle callback and hide() actions

### Setting Groups

```js
SETTING_GROUP_KEYS = [
  ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'],   // Tab 0: 声音
  ['dialogue-opacity', 'window-mode'],                              // Tab 1: 画面
  ['text-speed', 'auto-speed', 'skip-mode'],                       // Tab 2: 游戏
];
```

### Routing Logic

```
elements?.length > 0 → _renderCustom (unchanged)
header || tabBar || contentArea → _renderStructured (NEW)
else → _renderDefault (unchanged)
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| e26ede6 | feat | Add setting groups constant and structured mode routing |
| 676feb6 | feat | Implement _renderStructured with header, tabs, content, footer |
| cda106e | test | Add 55 unit tests for structured mode |

## Test Coverage

55 tests across 9 describe blocks:
- **show() routing** (6): Correct routing for all 3 modes
- **Header rendering** (9): Title, fontSize, color, position, backgroundImage, close button
- **Tab bar with widgetStyles** (4): createTabBar called with correct labels/config
- **Tab bar fallback** (6): Button rendering, active states, background/height
- **Content area** (7): Positioning, scroll, 4 sliders for 声音 tab, legacy vs widget sliders
- **Tab switching** (5): Click handlers, content re-rendering, back-and-forth navigation
- **Select rendering** (2): Segment buttons for window-mode and skip-mode
- **Footer rendering** (7): Buttons, positioning, onTitle callback, hide()
- **SCREEN-04/05 integration** (5): Combined widgetStyles + structured mode, CSS injection

## Existing Code Preserved

- `_renderCustom()` — unchanged (verified by test: elements non-empty still adds `settings-custom` class)
- `_renderDefault()` — unchanged (verified by test: no layout still renders settings-header)
- `_buildSlider()` / `_buildToggle()` / `_buildSelect()` — reused as-is, no modifications
- Constructor signature, `setLayout()`, `setWidgetStyles()` — unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all setting groups are wired to real SETTING_DEFS entries and the existing ConfigManager.

## Self-Check: PASSED

- All 3 key files exist on disk
- All 3 commit hashes found in git log
- _renderStructured referenced 6 times in SettingsScreen.js
- 55/55 tests passing, 177/177 total tests passing (no regressions)
