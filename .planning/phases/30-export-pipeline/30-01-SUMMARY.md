---
phase: 30-export-pipeline
plan: "01"
subsystem: electron/export
tags: [export, pipeline, zip, ipc, tdd]
dependency_graph:
  requires: [scanAssets, fflate, vite-web-config]
  provides: [exportGame, generateHtml, export-game-ipc]
  affects: [electron/main.js, electron/preload.js]
tech_stack:
  added: []
  patterns: [6-step-pipeline, forward-slash-zip-keys, test-hooks]
key_files:
  created:
    - electron/exportGame.js
    - tests/exportGame.test.js
  modified:
    - electron/preload.js
    - electron/main.js
decisions:
  - "D-01 honored: missing assets skipped, paths collected in warnings array"
  - "D-03 honored: script.json copied verbatim (no rewriting)"
  - "D-04 honored: flat output structure with assets/ subdirectories"
  - "D-05 honored: ZIP at sibling path named {gameTitle}.zip"
  - "D-06 honored: folder always created, ZIP optional"
  - "D-07 honored: progress via webContents.send('export-progress', payload)"
  - "D-08 honored: 6 Chinese step names plus completion at 100%"
  - "ZIP keys use forward slashes via string concatenation (not path.join) for Windows compat"
  - "_skipBuild and _appRoot test hooks enable test isolation from Vite build"
metrics:
  duration: 4min
  tasks_completed: 3
  tests_written: 20
  tests_passing: 60
  files_created: 2
  files_modified: 2
  completed: "2026-04-08T01:24:00Z"
---

# Phase 30 Plan 01: Export Pipeline Summary

**One-liner:** 6-step export pipeline (Vite build → scan → copy → HTML gen → ZIP) with 20 TDD tests and IPC wiring

## What Was Built

### electron/exportGame.js (190 lines)
Complete export pipeline module with two named exports:
- `generateHtml(gameTitle, faviconFilename)` — Standalone HTML shell with escaped title, optional favicon, engine.js/css refs, and 4-layer game-container DOM
- `exportGame(options, sendProgress)` — Async 6-step orchestrator:
  1. **构建引擎 (0%)** — Vite web build (skippable via `_skipBuild`)
  2. **扫描资源 (17%)** — `scanAssets()` extracts referenced paths from script.json
  3. **复制引擎产物 (33%)** — Copy engine.js, engine.css, script.json
  4. **复制资源文件 (50%)** — Copy only referenced assets, skip missing with warnings
  5. **生成 HTML (67%)** — Generate index.html with title and optional favicon
  6. **打包 ZIP (83%)** — Optional ZIP via fflate zipSync with forward-slash keys

### tests/exportGame.test.js (292 lines)
20 integration tests across 7 describe blocks covering all PIPE requirements:
- generateHtml output (5 tests)
- Output structure verification (4 tests)
- Asset filtering — only referenced files (3 tests)
- Missing asset handling — D-01 skip+warn (1 test)
- Favicon copy and HTML linking (2 tests)
- ZIP creation, contents validation, opt-out (3 tests)
- Progress callback steps and return shape (2 tests)

### IPC Wiring
- **electron/preload.js**: Added `'export-game'` and `'export-progress'` to ALLOWED_CHANNELS
- **electron/main.js**: Added import + `ipcMain.handle('export-game')` with:
  - Progress forwarding via `webContents.send('export-progress', payload)`
  - `isDestroyed()` guard for window lifecycle safety
  - `currentProjectPath` injection (renderer never sends paths)
  - Error boundary returning `{ success: false, error }` per IPC convention

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Forward-slash ZIP keys via string concat | `path.join()` uses backslashes on Windows, breaking ZIP tools |
| 2 | `_skipBuild` / `_appRoot` test hooks | Isolate tests from Vite build and filesystem layout |
| 3 | `isDestroyed()` window guard | Export can outlive the window if user closes during export |
| 4 | Inject `currentProjectPath` server-side | Security: renderer never sends filesystem paths |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality is fully wired with real implementations.

## Verification

```
node --test tests/exportGame.test.js tests/scanAssets.test.js
# 60 tests, 60 pass, 0 fail
```

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 (RED) | 213f982 | test(30-01): add failing tests for export pipeline |
| 2 (GREEN) | 8f49949 | feat(30-01): implement export pipeline module |
| 3 (IPC) | a436b6e | feat(30-01): register export-game IPC handler and whitelist channels |

## Self-Check: PASSED

All 3 created files verified on disk. All 3 commit hashes found in git log. Preload whitelist and main.js handler confirmed.
