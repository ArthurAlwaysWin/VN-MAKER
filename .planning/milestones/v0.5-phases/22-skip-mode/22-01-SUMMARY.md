---
phase: 22-skip-mode
plan: "01"
subsystem: engine-settings
tags: [read-history, skip-mode, settings, localStorage]
dependency_graph:
  requires: []
  provides: [ReadHistory-module, skip-mode-setting]
  affects: [main.js, QuickActionBar]
tech_stack:
  added: []
  patterns: [localStorage-Set-persistence, segment-radio-select]
key_files:
  created:
    - src/engine/ReadHistory.js
  modified:
    - src/engine/settingDefs.js
    - src/engine/ConfigManager.js
    - src/ui/SettingsScreen.js
decisions:
  - "ReadHistory uses localStorage with readHistory:{projectId} key (D-03)"
  - "Skip mode defaults to 'readOnly' — stored as config.skipMode (D-05)"
  - "'skip-mode' registered as select type in settingDefs (D-09)"
metrics:
  duration: "~2 min"
  completed: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 22 Plan 01: ReadHistory & Settings Infrastructure Summary

ReadHistory class with localStorage Set persistence + skip-mode select setting wired across settingDefs, ConfigManager defaults, and SettingsScreen default layout.

## What Was Built

### Task 1: ReadHistory Module (`src/engine/ReadHistory.js`)
- **New class** with full API: `markRead(sceneId, pageIndex)`, `isRead(sceneId, pageIndex)`, `clear()`, `get size`
- Persists to localStorage with key `readHistory:{projectId}` — cross-save shared (D-03)
- Uses `Set` for O(1) lookup with `"sceneId:pageIndex"` string keys
- Early-return optimization in `markRead` skips persistence if already read
- `_load()` / `_save()` private methods with `try/catch` + `console.warn('[ReadHistory]')` pattern
- 74 lines, follows ConfigManager persistence patterns exactly

### Task 2: Skip-Mode Settings Infrastructure
**settingDefs.js:**
- Added `'skip-mode'` entry: `type: 'select'`, `settingKey: 'skipMode'`, options `全部跳过` (all) / `只跳已读` (readOnly), default `'readOnly'`

**ConfigManager.js:**
- Added `skipMode: 'readOnly'` to `this.defaults` object

**SettingsScreen.js:**
- Added skip-mode `settings-item` div with `id="s-skip-mode"` segment group in `_renderDefault()` HTML template
- Added `smGroup` click event binding block (mirrors `wmGroup` window-mode pattern exactly)
- Buttons: `全部跳过` / `只跳已读` with active-class logic and `cfg.set('skipMode', ...)` persistence

## Verification Results

- `npx vite build` — ✅ passes with no errors
- ReadHistory.js — ✅ exists with all 4 public methods + 2 private persistence methods
- settingDefs.js — ✅ contains `'skip-mode'` entry with correct type/options
- ConfigManager.js — ✅ defaults include `skipMode: 'readOnly'`
- SettingsScreen.js — ✅ renders skip-mode toggle in default layout with bindings

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `95c58a9` | feat(22-01): create ReadHistory module with localStorage persistence |
| 2 | `8b676c6` | feat(22-01): add skip-mode setting to settingDefs, ConfigManager, and SettingsScreen |
