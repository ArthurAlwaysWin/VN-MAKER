---
phase: 45-nameplateconfig
plan: "02"
subsystem: runtime-engine
tags: [config-routing, init, preview, ui-wiring]
dependency_graph:
  requires: [42-01, 42-02, 43-01, 43-02, 43-03, 44-01, 45-01]
  provides: [centralized-config-routing, preview-config-parity]
  affects: [src/main.js]
tech_stack:
  added: []
  patterns: [optional-chaining-guards, config-routing-pattern]
key_files:
  created:
    - tests/mainConfigRouting.test.js
  modified:
    - src/main.js
key_decisions:
  - Config routing blocks placed after settingsScreen.setLayout and before applyTheme in init()
  - initPreview() includes titleScreen.setLayout and settingsScreen.setLayout since they don't exist there yet
  - Grep-based source pattern testing chosen over full init() orchestration testing due to main.js side effects
metrics:
  duration: 4m
  completed: "2026-04-16T13:12:00Z"
requirements:
  - CONFIG-01
  - CONFIG-02
---

# Phase 45 Plan 02: main.js Config Routing + Editor Preview Summary

Centralized ui.* config application in init() and initPreview() — all UI components (saveLoadScreen, backlogScreen, gameMenu, settingsScreen widgetStyles, dialogueBox nameplateStyle) now receive their layout/style configs after engine.load() with null-safe optional chaining guards.

## What Was Done

### Task 1: Config routing in init() (1c8e8c0)
Added 5 new config routing blocks in `init()` after the existing `settingsScreen.setLayout` call:
- `settingsScreen.setWidgetStyles(ui.widgetStyles)` — Phase 42 widget styles
- `saveLoadScreen.setLayout(ui.saveLoadScreen)` — Phase 43 screen layout
- `backlogScreen.setLayout(ui.backlogScreen)` — Phase 43 screen layout
- `gameMenu.setLayout(ui.gameMenu)` — Phase 43 screen layout
- `dialogueBox.setNameplateStyle(ui.dialogueBox.nameplateStyle)` — Phase 45 nameplate

All calls guarded with `engine.script.ui?.X` optional chaining. Existing `titleScreen.setLayout` and `settingsScreen.setLayout` calls untouched.

### Task 2: Config routing in initPreview() (51603d2)
Added 8 config routing blocks in the `initPreview()` 'start' message handler after the existing `dialogueBox.applyGlobalStyle` block:
- `titleScreen.setLayout` — not present in preview before
- `settingsScreen.setLayout` — not present in preview before
- `settingsScreen.setWidgetStyles` — widget styles for preview
- `saveLoadScreen.setLayout` — screen layout for preview
- `backlogScreen.setLayout` — screen layout for preview
- `gameMenu.setLayout` — screen layout for preview
- `dialogueBox.setNameplateStyle` — nameplate style for preview

This ensures full config parity between init() and initPreview().

### Task 3: Unit tests (672a124)
Created `tests/mainConfigRouting.test.js` with 30 tests in 3 groups:
- **API surface** (5 tests): Verify setLayout/setWidgetStyles/setNameplateStyle methods exist on all classes
- **Null safety** (10 tests): Verify null/undefined args don't throw for any method
- **Source patterns** (15 tests): Grep-based verification that main.js contains all expected config routing calls in both init() and initPreview(), with optional chaining guards, and no duplication of existing calls

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- All 30 tests pass (`npx vitest run tests/mainConfigRouting.test.js`)
- No existing tests broken
- Existing titleScreen.setLayout and settingsScreen.setLayout calls not duplicated in init()
- All new calls use consistent `if (engine.script.ui?.X)` guard pattern

## Known Stubs

None — all config routing is wired to real methods that already exist in the codebase.
