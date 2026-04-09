---
phase: 33-export-pipeline-core
verified: 2026-04-10T02:37:36Z
status: gaps_found
score: 10/11 must-haves verified
re_verification: false
gaps:
  - truth: "IPC handler 'export-game-desktop' wires exportDesktop to renderer process"
    status: partial
    reason: "IPC handler registered in main.js but 'export-game-desktop' channel is NOT in the ALLOWED_CHANNELS whitelist in electron/preload.js — renderer invoke() calls will be blocked by contextBridge security"
    artifacts:
      - path: "electron/preload.js"
        issue: "ALLOWED_CHANNELS array (line 4-16) does not include 'export-game-desktop'; only 'export-game' and 'export-progress' are listed"
    missing:
      - "Add 'export-game-desktop' to ALLOWED_CHANNELS in electron/preload.js (single-line fix)"
---

# Phase 33: Export Pipeline Core — Verification Report

**Phase Goal:** A project can be exported to a complete, working Windows desktop game folder via a single programmatic call
**Verified:** 2026-04-10T02:37:36Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Default game icon exists as a valid 256×256 PNG at public/default-game-icon.png | ✓ VERIFIED | 759-byte dark purple PNG confirmed visually; valid PNG structure |
| 2 | createZip is exported from exportGame.js and importable by other modules | ✓ VERIFIED | Line 76: `export async function createZip(sourceDir, zipPath)` |
| 3 | Test scaffold exists with 7+ describe blocks covering all Phase 33 requirements | ✓ VERIFIED | 390 lines, 7 describe blocks, 20 it() blocks |
| 4 | @electron/packager and png-to-ico are installed as devDependencies | ✓ VERIFIED | package.json: `@electron/packager: "^19.1.0"`, `png-to-ico: "^3.0.1"` |
| 5 | exportDesktop() produces a staging directory with package.json, filled templates, engine artifacts, assets, and icon | ✓ VERIFIED | 20/20 tests pass; staging structure tests confirm all artifacts |
| 6 | Template filling replaces GAME_TITLE, GAME_WIDTH, GAME_HEIGHT placeholders with actual values | ✓ VERIFIED | Lines 117-120 in source; template filling tests pass (title, width, height) |
| 7 | All 5 asset categories (backgrounds, characters, audio, fonts, voices) are copied to staging | ✓ VERIFIED | Lines 94-100 spread all 5 categories; filtering tests confirm 4 categories + unreferenced exclusion |
| 8 | PNG icon is converted to ICO; default icon used when user provides none | ✓ VERIFIED | Lines 147-153; both icon conversion tests pass (user PNG → ICO, null → default → ICO) |
| 9 | Optional ZIP creates a distributable archive of the output | ✓ VERIFIED | Lines 180-187; ZIP tests pass (zip=true creates file, zip=false returns null) |
| 10 | IPC handler 'export-game-desktop' wires exportDesktop to renderer process | ⚠️ PARTIAL | Handler registered at main.js:811, but `export-game-desktop` is NOT in preload.js ALLOWED_CHANNELS whitelist — renderer invoke() will be blocked |
| 11 | @electron/packager is invoked with asar:false, win32, x64, correct electronVersion | ✓ VERIFIED | Lines 160-173: asar:false, platform:'win32', arch:'x64', electronVersion from process.versions.electron |

**Score:** 10/11 truths verified (1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `electron/exportDesktop.js` | Desktop export pipeline module, exports `exportDesktop`, ≥150 lines | ✓ VERIFIED | 198 lines, 9-step pipeline, correct export |
| `electron/exportGame.js` | createZip shared utility export | ✓ VERIFIED | `createZip` exported at line 76, `generateHtml` at line 42 |
| `electron/main.js` | IPC handler for desktop export | ✓ VERIFIED | `export-game-desktop` handler at line 811, import at line 8 |
| `public/default-game-icon.png` | Valid 256×256 PNG ≥ 500 bytes | ✓ VERIFIED | 759 bytes, dark purple #2d1b69, visually confirmed |
| `tests/exportDesktop.test.js` | Test scaffold ≥150 lines, 7 describes, ≥18 it() | ✓ VERIFIED | 390 lines, 7 describes, 20 tests |
| `electron/preload.js` | Must whitelist `export-game-desktop` channel | ⚠️ GAP | Channel NOT in ALLOWED_CHANNELS array |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `electron/exportDesktop.js` | `src/engine/scanAssets.js` | `import { scanAssets }` | ✓ WIRED | Line 20 |
| `electron/exportDesktop.js` | `electron/exportGame.js` | `import { generateHtml, createZip }` | ✓ WIRED | Line 21 |
| `electron/exportDesktop.js` | `@electron/packager` | `import { packager }` | ✓ WIRED | Line 18 (named import — v19 ESM) |
| `electron/exportDesktop.js` | `png-to-ico` | `import pngToIco` | ✓ WIRED | Line 19 |
| `electron/main.js` | `electron/exportDesktop.js` | `import { exportDesktop }` | ✓ WIRED | Line 8, used at line 819 |
| `electron/main.js` | renderer (via preload) | `export-game-desktop` channel | ⚠️ PARTIAL | Handler registered, but preload whitelist blocks channel |
| `tests/exportDesktop.test.js` | `electron/exportDesktop.js` | `import { exportDesktop }` | ✓ WIRED | Line 19 |
| `package.json` | `node_modules/@electron/packager` | devDependencies | ✓ WIRED | ^19.1.0 installed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `exportDesktop.js` | `scriptData` | `fs.readFile(scriptPath)` → `JSON.parse` | Yes — reads project script.json | ✓ FLOWING |
| `exportDesktop.js` | `assetDict` | `scanAssets(scriptData)` | Yes — 40 scanAssets tests verify 5-category output | ✓ FLOWING |
| `exportDesktop.js` | `mainContent` | `fs.readFile(mainTemplatePath)` | Yes — reads game/main.js template | ✓ FLOWING |
| `exportDesktop.js` | `icoBuffer` | `pngToIco(pngBuffer)` | Yes — real PNG→ICO conversion | ✓ FLOWING |
| `exportDesktop.js` | `outputPaths` | `packager({...})` | Yes — @electron/packager produces real output | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| exportDesktop pipeline produces staging with all expected files | `node --test tests/exportDesktop.test.js` | 20/20 pass, 7 suites, 0 fail | ✓ PASS |
| exportGame regression (createZip export change) | `node --test tests/exportGame.test.js` | 20/20 pass, 7 suites, 0 fail | ✓ PASS |
| scanAssets upstream data source | `node --test tests/scanAssets.test.js` | 40/40 pass, 9 suites, 0 fail | ✓ PASS |
| Vite web build (engine bundle) | `npx vite build --config vite.web.config.js` | ✓ built in 212ms, dist-web outputs created | ✓ PASS |
| exportDesktop module exports correct function | tests import `{ exportDesktop }` successfully | All 20 tests load and run the function | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| PIPE-01 | 33-02 | 用户可一键导出完整可运行的 Windows 桌面游戏文件夹（含 .exe） | ✓ SATISFIED | `exportDesktop()` produces complete staging dir; packager configured for win32/x64 with .exe; 9-step pipeline ends with `{ success: true, outputPath }` |
| PIPE-02 | 33-02 | 导出使用 @electron/packager 集成打包，输出绿色免安装目录 | ✓ SATISFIED | `import { packager } from '@electron/packager'` at line 18; `asar: false` at line 170; `prune: false` at line 172 — produces portable folder |
| PIPE-03 | 33-02 | 导出时完整复制所有游戏资源（图片、音频、字体、语音）到输出目录 | ✓ SATISFIED | Lines 94-110: spreads all 5 categories; missing files produce warnings not errors; unreferenced files excluded; asset filtering tests pass |
| PIPE-06 | 33-02 | 导出完成后可选 ZIP 压缩输出目录 | ✓ SATISFIED | Lines 180-187: conditional ZIP via `createZip()`; ZIP tests pass for both true/false |
| PIPE-07 | 33-02 | Electron 运行时二进制自动缓存，二次导出无需重复下载 | ✓ SATISFIED | @electron/packager v19 caches Electron binaries by default in `~/.electron`; no cache-disabling config found; `electronVersion` set for cache keying |
| CUSTOM-01 | 33-02 | 用户可自定义游戏标题（窗口标题 + .exe 元数据） | ✓ SATISFIED | Template filling at lines 117-120: `GAME_TITLE` replaced via `JSON.stringify(gameTitle)`; `executableName: sanitized` at line 168; title tests pass |
| CUSTOM-02 | 33-01, 33-02 | 用户可提供 PNG 图标，自动转换 .ico 并嵌入 .exe | ✓ SATISFIED | Lines 147-153: `pngToIco(pngBuffer)` conversion; default fallback at line 149; `icon: path.join(stagingDir, 'icon')` for packager (without .ico extension); both icon tests pass |

**All 7 requirements SATISFIED.** No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `electron/exportDesktop.js` | 195 | `.catch(() => {})` on staging cleanup | ℹ️ Info | Acceptable — non-critical cleanup in `finally` block, matches project convention for silent error suppression |
| `electron/preload.js` | 4-16 | Missing `export-game-desktop` in ALLOWED_CHANNELS | ⚠️ Warning | Renderer cannot invoke desktop export via IPC until channel is whitelisted |

No TODO/FIXME/placeholder stubs found. No empty implementations. No hardcoded empty data.

### Human Verification Required

### 1. Full Desktop Export with Real Project

**Test:** Open the Galgame Maker editor, load a real project with backgrounds, characters, audio, and voices. Trigger desktop export (once Phase 34 UI exists) or call `exportDesktop()` from main process console.
**Expected:** A complete `{GameTitle}-win32-x64/` folder is produced with a working `.exe` that launches the game with correct title, icon, and all assets playable.
**Why human:** Requires running Electron packager with real binary download, verifying .exe launches, icon appears in Explorer, and game actually plays.

### 2. ICO Icon Quality

**Test:** Export a game with a custom 256×256 PNG icon. Check the .exe icon in Windows Explorer.
**Expected:** Icon appears correctly at multiple sizes (16×16, 32×32, 48×48, 256×256) in Explorer details/tiles/large icons views.
**Why human:** ICO multi-resolution rendering quality can only be assessed visually in Windows Explorer.

### Gaps Summary

**1 gap found — minor wiring issue:**

The `export-game-desktop` IPC channel is registered as a handler in `electron/main.js` (line 811) but is **not whitelisted** in `electron/preload.js` `ALLOWED_CHANNELS` array (line 4-16). The existing whitelist includes `export-game` and `export-progress` but not the new desktop export channel. This means `window.ipcRenderer.invoke('export-game-desktop', opts)` from the renderer will throw `"Blocked IPC channel: export-game-desktop"`.

**Impact:** Low — the core goal (single programmatic call via `exportDesktop()`) is fully achieved. All 80/80 tests pass. All 7 requirements are satisfied at the pipeline level. The preload whitelist gap only affects renderer↔main IPC invocation, which is Phase 34's UI integration concern. The fix is a single-line addition to the `ALLOWED_CHANNELS` array.

**Root cause:** The 33-02-PLAN did not include `electron/preload.js` in `files_modified` and the task description only mentioned "two surgical edits" to main.js (import + handler), omitting the preload whitelist update.

---

_Verified: 2026-04-10T02:37:36Z_
_Verifier: the agent (gsd-verifier)_
