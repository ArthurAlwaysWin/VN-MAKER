---
phase: 33-export-pipeline-core
plan: "02"
subsystem: export-pipeline
tags: [desktop-export, electron-packager, icon-conversion, IPC, pipeline]
dependency_graph:
  requires:
    - "33-01 (devDeps, default icon, createZip export, test scaffold)"
  provides:
    - "exportDesktop() 9-step desktop pipeline"
    - "export-game-desktop IPC handler"
  affects:
    - "electron/main.js"
tech_stack:
  added:
    - "@electron/packager (named import)"
    - "png-to-ico"
  patterns:
    - "staging dir + try/finally cleanup"
    - "template placeholder replacement with JSON.stringify"
    - "IPC handler → sendProgress → webContents.send pattern"
key_files:
  created:
    - electron/exportDesktop.js
  modified:
    - electron/main.js
decisions:
  - "Used { packager } named import (not default) — @electron/packager v19 ESM exports"
  - "JSON.stringify(gameTitle) for safe template replacement — handles quotes/unicode"
  - "icon path WITHOUT .ico extension for packager — it appends automatically"
  - "D-04 staging cleanup only when _skipPackager is false — tests inspect staging"
metrics:
  duration: "3m"
  completed: "2026-04-10"
  tasks_completed: 2
  tasks_total: 2
  test_count: 40
  test_pass: 40
---

# Phase 33 Plan 02: Desktop Export Pipeline Implementation Summary

**One-liner:** 9-step exportDesktop() pipeline with staging dir, template filling, png-to-ico conversion, @electron/packager integration, and IPC handler wiring

## What Was Done

### Task 1: Implement electron/exportDesktop.js — 9-step desktop export pipeline

Created the complete desktop export pipeline (198 lines) implementing 9 sequential steps:

1. **构建引擎 (0%)** — Vite build (skippable for tests)
2. **扫描资源 (10%)** — scanAssets() on script.json
3. **准备 staging (20%)** — Copy engine.js, engine.css, script.json to temp dir
4. **复制资源文件 (30%)** — Copy 5 asset categories, skip missing with warnings
5. **填充模板 (45%)** — Replace GAME_TITLE/WIDTH/HEIGHT in game/main.js template
6. **生成配置 (55%)** — Generate index.html + package.json with type:"module"
7. **转换图标 (65%)** — png-to-ico conversion with default fallback
8. **打包应用 (75%)** — @electron/packager with asar:false, win32, x64
9. **打包 ZIP (90%)** — Optional ZIP archive of output

Key implementation details:
- `JSON.stringify(gameTitle)` for safe placeholder replacement (handles quotes, backslashes, Unicode)
- `{ packager }` named import — v19 of @electron/packager uses ESM named exports, not default
- Staging dir cleanup in `finally` block (D-04), but preserved when `_skipPackager=true` for tests
- `sanitizeTitle()` strips Windows-illegal characters for filesystem-safe names
- `sendProgress()` calls with monotonically increasing percents 0→100

### Task 2: Add 'export-game-desktop' IPC handler to electron/main.js

Two surgical edits:
1. Added `import { exportDesktop } from './exportDesktop.js'` after existing exportGame import
2. Added `ipcMain.handle('export-game-desktop', ...)` handler after existing export-game handler

Handler mirrors existing `export-game` pattern exactly:
- Same `sendProgress` closure sending `export-progress` to mainWindow
- Same `currentProjectPath` injection via options spread
- Same `{ success: false, error: e.message }` error handling shape

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed @electron/packager import syntax**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Plan specified `import packager from '@electron/packager'` (default import) but @electron/packager v19 only exports named exports: `{ packager, serialHooks, allOfficialArchsForPlatformAndVersion }`
- **Fix:** Changed to `import { packager } from '@electron/packager'`
- **Files modified:** electron/exportDesktop.js
- **Commit:** fc63908

## Test Results

All 40 export tests pass (20 desktop + 20 web):
- **exportDesktop tests:** 20/20 pass across 7 describe blocks (staging, filtering, missing assets, icon, templates, ZIP, progress)
- **exportGame tests:** 20/20 pass (no regression)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | fc63908 | feat(33-02): implement 9-step desktop export pipeline |
| 2 | 5d6a72b | feat(33-02): add export-game-desktop IPC handler to main.js |

## Known Stubs

None — all functionality is fully wired. exportDesktop() produces complete output; IPC handler connects it to renderer.

## Self-Check: PASSED

- ✅ electron/exportDesktop.js exists (198 lines)
- ✅ electron/main.js modified with IPC handler
- ✅ 33-02-SUMMARY.md created
- ✅ Commit fc63908 found
- ✅ Commit 5d6a72b found
- ✅ All 40 tests pass (20 desktop + 20 web)
