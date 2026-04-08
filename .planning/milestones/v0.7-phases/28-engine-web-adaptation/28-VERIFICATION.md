---
phase: 28-engine-web-adaptation
verified: 2026-04-08T00:52:52Z
status: passed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Open index.html in a browser with a sample game project (assets in ./assets/, script.json in root)"
    expected: "Title screen renders with background image, BGM plays, Start/Settings buttons are clickable"
    why_human: "Requires live browser rendering — static analysis confirms wiring but not visual output"
  - test: "Play through dialogue, make a choice, navigate to another scene"
    expected: "Dialogue advances, choices branch correctly, scene transitions work"
    why_human: "End-to-end gameplay requires running the engine in a browser"
  - test: "Save to slot 1, reload the page, load from slot 1"
    expected: "Game resumes from saved position; IndexedDB persists across reloads"
    why_human: "Requires live IndexedDB interaction in a real browser"
  - test: "Open the same game in an iframe (simulating itch.io embed)"
    expected: "Engine detects 'web' mode (no editor handshake), WebSaveManager active, game fully playable"
    why_human: "Iframe embedding behavior cannot be verified statically"
---

# Phase 28: Engine Web Adaptation — Verification Report

**Phase Goal:** Make the game engine run in a standalone browser without Electron
**Verified:** 2026-04-08T00:52:52Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opening the engine's index.html in a plain browser renders the title screen with background, BGM, and interactive buttons | ✓ VERIFIED | `bootstrap()` → `detectEnvironment()` → `env='web'` → `init()` → `showTitle()`. basePath set to `'./assets/'` for background/characters/audio. All UI paths resolved via `resolvePath()`. |
| 2 | Player can progress through dialogue, make choices, and navigate between scenes entirely in the browser | ✓ VERIFIED | ScriptEngine is pure JS (no Electron deps). `init()` loads script from `SCRIPT_PATH` (`'./script.json'` in web mode). All rendering via DOM APIs. |
| 3 | Player can save to a slot and load it back in the browser, with data persisting across page reloads (IndexedDB backend) | ✓ VERIFIED | `WebSaveManager` (323 lines) implements full IndexedDB backend: 108 slots + quicksave, `galgame-saves` database, keyPath `'slot'`, all 8 public async methods matching SaveManager API. Wired in `bootstrap()` when `env === 'web'`. |
| 4 | Settings page and title page custom backgrounds/images display correctly via parameterized basePath (no asset:// protocol) | ✓ VERIFIED | TitleScreen.js: 2 `resolvePath()` calls (background + image). SettingsScreen.js: 2 `resolvePath()` calls (bgLayer + img). SaveLoadScreen.js: 1 `resolvePath()` call (thumbnail). Zero `asset://` in any UI file. Old prefix-check logic (`startsWith`) removed from TitleScreen. |
| 5 | Engine auto-detects its runtime environment (Electron / editor preview / standalone web) and selects the correct SaveManager and basePath without manual configuration | ✓ VERIFIED | `detectEnvironment()` returns 3 values. Detection order: `window.ipcRenderer` → iframe handshake (200ms timeout) → web fallback. `bootstrap()` switches on env: Electron→SaveManager, Web→WebSaveManager, Preview→null. basePath from `BASE_PATH` module state. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/engine/assetPath.js` | Environment detection + path resolution module | ✓ VERIFIED | 124 lines, exports `ENV`, `BASE_PATH`, `SCRIPT_PATH`, `detectEnvironment()`, `resolvePath()`, `_capturedStartMsg`. All 5 path variants handled. |
| `src/engine/WebSaveManager.js` | IndexedDB save backend, drop-in SaveManager replacement | ✓ VERIFIED | 323 lines, all 8 public async methods, IndexedDB with `galgame-saves` DB, 108 slots + quicksave, in-memory cache, proper error handling. |
| `src/main.js` | 3-way bootstrap with conditional SaveManager | ✓ VERIFIED | `bootstrap()` at line 736, calls `detectEnvironment()`, sets `basePath` on 3 components from `BASE_PATH`, conditionally creates SaveManager/WebSaveManager, routes to `init()` or `initPreview()`. Called at line 918. |
| `src/ui/TitleScreen.js` | No hardcoded asset://, uses resolvePath | ✓ VERIFIED | Imports `resolvePath` from assetPath.js. Background (line 73) and image (line 156) use `resolvePath()`. Zero `asset://` references. Old prefix-check logic fully removed. |
| `src/ui/SettingsScreen.js` | No hardcoded asset://, uses resolvePath | ✓ VERIFIED | Imports `resolvePath` from assetPath.js. Background layer (line 73) and image element (line 215) use `resolvePath()`. Zero `asset://` references. |
| `src/ui/SaveLoadScreen.js` | No hardcoded asset://, uses resolvePath | ✓ VERIFIED | Imports `resolvePath` from assetPath.js. Thumbnail path (line 161) uses `resolvePath()`. Zero `asset://` references. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `assetPath.js` | `window.ipcRenderer` | Feature detection in `detectEnvironment()` | ✓ WIRED | 3 matches (check + assignment + usage) |
| `assetPath.js` | `window.parent` | Iframe detection in `detectEnvironment()` | ✓ WIRED | 2 matches (comparison + postMessage) |
| `WebSaveManager.js` | `indexedDB` | `indexedDB.open` in `_getDb()` | ✓ WIRED | Full IDB implementation: open, objectStore, transaction, put, get, delete, getAll |
| `main.js` | `assetPath.js` | `import { detectEnvironment, ENV, BASE_PATH, SCRIPT_PATH, _capturedStartMsg }` | ✓ WIRED | Line 14 — all 5 symbols imported and used |
| `main.js` | `WebSaveManager.js` | `import { WebSaveManager }` | ✓ WIRED | Line 15 — imported, instantiated at line 749 |
| `main.js bootstrap()` | Component basePaths | `.basePath = BASE_PATH` | ✓ WIRED | 3 assignments: background, characters, audio (lines 741-743) |
| `TitleScreen.js` | `assetPath.js` | `import { resolvePath }` + 2 calls | ✓ WIRED | Lines 73, 156 |
| `SettingsScreen.js` | `assetPath.js` | `import { resolvePath }` + 2 calls | ✓ WIRED | Lines 73, 215 |
| `SaveLoadScreen.js` | `assetPath.js` | `import { resolvePath }` + 1 call | ✓ WIRED | Line 161 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `assetPath.js` | `ENV`, `BASE_PATH`, `SCRIPT_PATH` | `detectEnvironment()` runtime detection | Yes — feature-detects browser APIs | ✓ FLOWING |
| `WebSaveManager.js` | save records | `indexedDB` (IDB transactions) | Yes — real IDB put/get operations | ✓ FLOWING |
| `main.js` | `saveManager` | Conditional construction in `bootstrap()` | Yes — real SaveManager/WebSaveManager instance | ✓ FLOWING |
| `TitleScreen.js` | background URL | `resolvePath(this.layout.background)` | Yes — transforms relative path with BASE_PATH | ✓ FLOWING |
| `SettingsScreen.js` | bg/img URL | `resolvePath(safeBg)` / `resolvePath(safeSrc)` | Yes — transforms path with BASE_PATH | ✓ FLOWING |
| `SaveLoadScreen.js` | thumbnail URL | `resolvePath(...)` | Yes — transforms save slot thumbnail path | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — the engine requires a browser runtime (DOM, IndexedDB). There are no CLI entry points, no test suite, and no build outputs to verify. All behaviors require human verification in a browser.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WEBRT-01 | 28-02 | 导出的游戏可在浏览器中完整运行 | ✓ SATISFIED | 3-way bootstrap routes web mode to `init()` which loads script, fonts, title screen — all via parameterized paths. No Electron API dependencies in runtime path. |
| WEBRT-02 | 28-01, 28-02 | 玩家可在浏览器中存档/读档 | ✓ SATISFIED | `WebSaveManager` (IndexedDB) with 108 slots + quicksave, full 8-method API parity. Wired in bootstrap. Note: REQUIREMENTS.md text says "localStorage" but D-01 correctly chose IndexedDB for structured save data. |
| WEBRT-03 | 28-02 | 设置页和标题页的自定义背景/图片正常显示 | ✓ SATISFIED | 5 `resolvePath()` calls replace all hardcoded `asset://` in TitleScreen (2), SettingsScreen (2), SaveLoadScreen (1). basePath parameterized via assetPath.js. |
| WEBRT-04 | 28-01, 28-02 | 在 itch.io iframe 中可正常运行 | ✓ SATISFIED | `detectEnvironment()` distinguishes editor preview (receives postMessage `{type:'start'}` within 200ms) from external iframe/standalone (timeout → 'web' mode with WebSaveManager). |
| WEBRT-05 | 28-01, 28-02 | 引擎自动检测运行环境 | ✓ SATISFIED | 3-way detection: `window.ipcRenderer` → iframe handshake → web fallback. Conditional SaveManager + basePath in `bootstrap()`. |

No orphaned requirements — all 5 WEBRT IDs mapped to Phase 28 in both REQUIREMENTS.md and PLANs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

All 6 key files scanned for TODO/FIXME/PLACEHOLDER/empty returns/hardcoded empty data. All clean.

### Notes

- **REQUIREMENTS.md text mismatch (WEBRT-02):** The requirement text says "localStorage 后端" but the implementation correctly uses IndexedDB per decision D-01 in 28-CONTEXT.md. This is an intentional design improvement — IndexedDB is better suited for structured save data with 108+ slots. The requirements doc text could be updated to match.
- **fontLoader.js default parameter:** `loadAllFonts()` has `baseUrl = 'asset://'` as default parameter, but all call sites in main.js pass `BASE_PATH` explicitly (lines 775, 842). No runtime issue.
- **All 4 commits verified:** `22c6fc9`, `df67a06`, `e8adbd1`, `0d5c8d2` — all present in git history with correct messages.

### Human Verification Required

### 1. Browser Title Screen Rendering

**Test:** Prepare a sample game project with `./script.json` and `./assets/` directory. Open `index.html` in Chrome/Firefox.
**Expected:** Title screen renders with custom background image, BGM starts playing, Start/Continue/Settings buttons are interactive.
**Why human:** Requires live browser rendering — static analysis confirms wiring but not visual correctness.

### 2. End-to-End Gameplay

**Test:** Click "Start", progress through dialogue by clicking, encounter and select a choice.
**Expected:** Dialogue text types out, character sprites appear, choices branch to correct scenes, scene transitions work.
**Why human:** Full gameplay flow involves ScriptEngine state machine + UI rendering + audio synchronization.

### 3. IndexedDB Save Persistence

**Test:** During gameplay, save to slot 1. Close the tab. Re-open `index.html`. Click Continue/Load. Load slot 1.
**Expected:** Game resumes from the exact position (scene, page, dialogue index). IndexedDB data persists across tab close.
**Why human:** IndexedDB persistence requires live browser runtime to verify.

### 4. itch.io Iframe Compatibility

**Test:** Embed the exported game in an `<iframe>` on a test page (or upload to itch.io).
**Expected:** Engine detects 'web' mode (not 'preview'), WebSaveManager is active, full gameplay and save/load works within the iframe.
**Why human:** Iframe embedding behavior, cross-origin concerns, and postMessage timing require live browser testing.

### Gaps Summary

No gaps found. All 5 success criteria are verified at code level:
- Two new foundation modules (assetPath.js, WebSaveManager.js) are substantive and complete
- main.js has clean 3-way bootstrap with conditional module selection
- All 3 UI files migrated from hardcoded `asset://` to `resolvePath()`
- All 9 key links verified as wired
- Zero anti-patterns detected
- All 4 commits present in git history

---

_Verified: 2026-04-08T00:52:52Z_
_Verifier: the agent (gsd-verifier)_
