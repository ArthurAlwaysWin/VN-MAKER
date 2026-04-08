# Project Research Summary

**Project:** Galgame Maker v0.8 — Electron Desktop Game Export (游戏导出 桌面版)
**Domain:** Electron app packaging / Visual novel game engine export
**Researched:** 2025-07-23
**Confidence:** HIGH

## Executive Summary

Galgame Maker v0.8 adds the ability to export standalone Windows desktop game packages (.exe) from the editor. The core finding across all research is that **70% of this work is already done** — the existing v0.7 web export pipeline (Vite engine build → asset scanning → file staging → HTML generation) provides the foundation. The new work is surgical: generate a minimal Electron main process for the game (window creation + save IPC), stage it with engine + assets into a temp directory, and run `@electron/packager` to produce a portable folder containing a renamed `.exe` with custom icon. Two new devDependencies are required: `@electron/packager` for packaging and `png-to-ico` for icon conversion. Everything else is reused.

The recommended approach leverages a critical architectural insight: the game engine already supports 3 runtime environments (editor, preview, web). Adding a 4th "desktop" environment requires only ~8 lines of change in 2 files (`assetPath.js` + `src/main.js`) because the desktop environment reuses **web-style relative paths** for assets and **editor-style IPC** for saves. The existing `SaveManager.js` works completely unmodified — the game's main process implements the same IPC channels but stores saves in `app.getPath('userData')` instead of the project directory. No custom `asset://` protocol is needed in the exported game — `win.loadFile()` + relative `fetch()` paths just work.

The primary risks are: (1) conflating the editor's Electron context with the game's Electron context during export (solved by clean staging directory separation), (2) icon embedding failures from malformed PNGs (solved by validation + graceful degradation), and (3) over-engineering with ASAR packaging or custom protocols. The research strongly recommends shipping v0.8 with `asar: false` (plain files in `resources/app/`) for simplicity and debuggability, deferring ASAR to a future optimization pass.

## Key Findings

### Recommended Stack

Two new devDependencies, zero production dependency changes. The existing Electron 41 + Vue 3 + Vite 6.3 stack is fully validated. See [STACK.md](./STACK.md) for complete rationale and [COMPARISON.md](./COMPARISON.md) for tool evaluation.

**Core technologies:**
- **@electron/packager ^19.1.0**: Packages staged game directory into standalone .exe — simplest programmatic API (`await packager(opts)`), built-in icon embedding via `resedit`, official Electron team project, pure JavaScript
- **png-to-ico ^3.0.1**: Converts user-provided PNG icon to Windows .ico format — pure JS (pngjs only), 50 KB vs sharp's 30 MB, one function call
- **Existing Vite 6.3 + vite.web.config.js**: Same engine build for web and desktop — the engine JS/CSS output is identical
- **Existing fflate 0.8.2**: Optional ZIP compression of final output directory

**Critical version requirement:** Exported game must target Electron 41.x (same major as editor) to guarantee engine compatibility. `@electron/packager` pins this via `electronVersion: '41.2.0'`.

**Research conflict resolved:** STACK.md recommends @electron/packager with ASAR; ARCHITECTURE.md suggests copying the running Electron binary directly (zero dependencies, offline). **Recommendation: Use @electron/packager.** Rationale: icon embedding is a stated requirement; @electron/packager handles it cleanly via resedit. Manually reimplementing binary copy + rcedit would replicate what packager already does, but worse. The ~90 MB binary download is cached after first use and is a one-time cost. However, adopt ARCHITECTURE.md's advice to skip ASAR for v0.8 (`asar: false`).

### Expected Features

Feature landscape from [FEATURES.md](./FEATURES.md). 10 table stakes, 5 differentiators, 10 explicit anti-features.

**Must have (table stakes):**
- One-click .exe output — core promise of "desktop export"
- Custom game title → window title + .exe metadata
- Custom icon (PNG input → .ico conversion → embedded in .exe)
- Standalone execution — double-click .exe, game runs, no installer
- Save/load to `app.getPath('userData')` — player saves persist between sessions
- All assets load correctly (images, audio, fonts, voices)
- Fullscreen/windowed toggle (`set-window-mode` IPC)
- Progress indication during export
- Output folder selection
- Web/Desktop export toggle in ExportModal

**Should have (differentiators):**
- Electron binary caching (second export is instant — @electron/get handles this automatically)
- Optional ZIP compression of output directory
- Custom window dimensions from project settings

**Defer (v2+) — explicit anti-features per FEATURES.md:**
- ASAR packaging (code protection) — **deferred due to PITFALLS P2/P8 complexity; plain files are simpler and functionally equivalent**
- macOS .app / Linux AppImage export — "仅 Windows 平台" for v0.8
- NSIS/MSI installer — explicitly excluded ("绿色免安装")
- Code signing, auto-update, splash screen, loading screen
- Asset compression/optimization — "v0.8 只做资源拷贝"
- Multiple Electron version selection
- DevTools in exported game (security risk)
- Delta/incremental re-export

**Cross-research conflict resolved:** FEATURES.md lists "asset:// protocol in game main.js" as table stakes and "ASAR with selective unpack" as MVP priority #6. However, ARCHITECTURE.md explicitly identifies asset:// as Anti-Pattern #2 and ASAR as Anti-Pattern #4. PITFALLS.md's most critical pitfall (P2) is about ASAR + asset:// path mismatch. **Recommendation: Use `win.loadFile()` + relative paths (no asset:// protocol) and `asar: false` (no ASAR). This eliminates pitfalls P2 and P8 entirely while keeping v0.8 simple.** The web export already proves relative paths work; the desktop environment reuses the same paths.

### Architecture Approach

The architecture is surgically minimal: 3 new files, 4 files with small modifications, and ~10 components left completely unchanged. The key pattern is "Same IPC Contract, Different Backend" — the game's main process (`game-main.js`) implements the exact same IPC channel names as the editor but routes saves to `app.getPath('userData')`. The renderer-side `SaveManager.js` works unmodified. No `asset://` protocol is needed — `win.loadFile()` + relative paths work for all assets. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full component designs and data flow diagrams.

**Major components:**
1. **exportDesktop.js** (~180 lines) — Desktop export pipeline: stage game app directory → convert icon → run @electron/packager → cleanup. Extends existing web export pipeline.
2. **game-main.js template** (~120 lines) — Minimal Electron main process for exported games: BrowserWindow, save/load IPC handlers, window-mode IPC, screenshot IPC. Embedded as template string in exportDesktop.js.
3. **game-preload.js template** (~25 lines) — Exposes `window.ipcRenderer` (save channel whitelist) + sets `window.__DESKTOP_GAME = true` flag for environment detection.
4. **assetPath.js modification** (+5 lines) — Adds 'desktop' environment detection before 'electron' check. Desktop uses `./assets/` paths (same as web).
5. **ExportModal.vue extension** — Adds Web/Desktop radio buttons, icon picker for desktop mode, passes `target` + `iconPath` to IPC.

**Key patterns to follow:**
- Template embedding: game-main.js and game-preload.js content as template strings in exportDesktop.js (avoids ASAR path resolution issues in the editor itself)
- 4-way environment detection: `__DESKTOP_GAME` → desktop, `ipcRenderer` → electron, iframe → preview, default → web
- `file://` + relative paths: `win.loadFile()` makes `fetch('./assets/...')` just work — no custom protocol needed
- Same IPC contract: game-main.js implements every channel SaveManager.js calls, with different storage backend

### Critical Pitfalls

Top pitfalls from [PITFALLS.md](./PITFALLS.md) (14 total: 4 critical, 6 moderate, 4 minor), synthesized with ARCHITECTURE.md anti-patterns.

1. **Electron binary download fails (P1 — CRITICAL)** — First export downloads ~90 MB from GitHub. Fails behind GFW/corporate proxy. **Prevention:** Clear Chinese-language error message, support `ELECTRON_MIRROR` env var, show download progress in ExportModal.

2. **Save directory doesn't exist on first launch (P3 — CRITICAL)** — `app.getPath('userData')/saves/` doesn't exist yet. **Prevention:** `fs.mkdir(savesDir, { recursive: true })` before any write, or create on `app.whenReady()`.

3. **Windows `__dirname` with ESM (P4 — CRITICAL)** — `import.meta.url` pathname on Windows has leading `/` inside packaged app. **Prevention:** Use `path.dirname(fileURLToPath(import.meta.url))` — same pattern as editor's main.js.

4. **Game title with special characters (P6 — MODERATE)** — Characters like `<>:"|?*` are invalid in Windows filenames. **Prevention:** Reuse existing `sanitizeProjectName()` before passing to packager.

5. **Staging directory cleanup on failure (P7 — MODERATE)** — Failed export leaves hundreds of MB in temp. **Prevention:** Wrap pipeline in `try/finally`, use `os.tmpdir()`, implement AbortController pattern from v0.7.

6. **Large package size surprise (P12 — MINOR)** — Users expect small output but get 200+ MB (Electron baseline). **Prevention:** Show estimated size in ExportModal before export: "桌面版包含运行时环境，基础大小约 200 MB + 游戏资源".

7. **Missing IPC channels in game-main.js (P14 + Architecture Anti-Pattern #1)** — If SaveManager.js calls an unimplemented channel, saves fail silently. **Prevention:** Implement ALL channels: `save-slot`, `load-slot`, `delete-slot`, `list-saves`, `save-quickslot`, `load-quickslot`, `capture-screenshot`, `set-window-mode`. Do NOT create a separate DesktopSaveManager class.

**Pitfalls eliminated by architecture decisions:**
- **P2 (ASAR + asset:// path mismatch) — ELIMINATED** by using `asar: false` and relative file:// paths instead of asset:// protocol
- **P8 (Preload script path in ASAR) — ELIMINATED** by using `asar: false`
- **P10 (ESM vs CJS) — LOW RISK** with `"type": "module"` in generated package.json (same as editor)

## Implications for Roadmap

Based on combined research, the architecture's suggested 5-phase build order is well-reasoned and dependency-ordered. Adapted below with stack decisions and pitfall mitigations integrated.

### Phase 1: Desktop Environment Foundation
**Rationale:** Validates the core 'desktop' environment approach with zero pipeline work — smallest possible change, testable immediately
**Delivers:** Engine correctly detects and runs in 'desktop' mode with web-style asset paths and IPC-based saves
**Changes:** `assetPath.js` (+5 lines), `src/main.js` (+3 lines)
**Addresses:** 4-way environment detection, asset path resolution
**Avoids pitfall:** #1 (asset:// protocol) — proves relative paths work in desktop context
**Test:** Set `window.__DESKTOP_GAME = true` manually in dev tools → engine runs correctly

### Phase 2: Game Runtime Templates
**Rationale:** The game process files must be correct before embedding in export pipeline — test them independently first
**Delivers:** Working game-main.js and game-preload.js that can be manually assembled into a running game
**Changes:** New `electron/game/main.js` template, new `electron/game/preload.js` template
**Addresses:** Save to `app.getPath('userData')`, window creation, IPC channel implementation
**Avoids pitfalls:** P3 (save dir creation on startup), P4 (Windows __dirname), P10 (ESM/CJS), P14 (missing IPC handlers)
**Test:** Manually assemble a game directory with these files + engine output → launches and saves work

### Phase 3: Export Pipeline Core
**Rationale:** The pipeline is the heart of v0.8 — must work programmatically before adding UI
**Delivers:** `exportDesktop.js` that takes project path + options → produces working game folder
**Changes:** New `electron/exportDesktop.js`, modified `exportGame.js` (routing), modified `electron/main.js` (IPC handler)
**Uses:** @electron/packager (staging → packaging), png-to-ico (icon conversion), existing Vite build + scanAssets
**Addresses:** Full export pipeline, icon embedding, exe renaming, progress reporting
**Avoids pitfalls:** P1 (download error handling), P5 (version pinning), P6 (title sanitization), P7 (staging cleanup)
**Test:** Call exportDesktop programmatically → output folder runs as standalone game

### Phase 4: UI Integration
**Rationale:** UI wiring is straightforward once pipeline works — last for core functionality
**Delivers:** Complete end-to-end export from editor: user clicks "导出" → selects Desktop → picks icon → gets working .exe
**Changes:** Modified `ExportModal.vue` (target selector, icon picker, desktop-specific options)
**Addresses:** Export type selection (Web/Desktop), icon file picker, output directory selection
**Test:** Full end-to-end: editor UI → export → launch exported game → save/load works

### Phase 5: Polish & Edge Cases
**Rationale:** Non-blocking improvements after core functionality works
**Delivers:** Robustness, better UX, optional ZIP output
**Changes:** Error handling refinement, PNG validation before icon conversion, ZIP option, cleanup of temp directories on failure
**Addresses:** Optional ZIP compression, P9 (disk space check), P12 (size estimate display), P13 (antivirus docs), P11 (Chromium license docs), non-ASCII title testing
**Test:** Export with edge cases: no icon, corrupt PNG, long game title, output dir with spaces/unicode

### Phase Ordering Rationale

- **Phase 1 before everything:** 8 lines of code that prove the fundamental approach works. If desktop env detection fails, nothing else matters.
- **Phase 2 before 3:** Templates are independently testable. If game-main.js has a bug, debugging it in isolation is 10x easier than debugging it through the export pipeline.
- **Phase 3 before 4:** Pipeline works programmatically → can be tested via IPC calls directly. Debugging export issues through the UI adds unnecessary friction.
- **Phase 4 before 5:** Get the happy path working end-to-end, then harden.
- **Phase 5 last:** Edge cases and polish only matter after core works.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Export Pipeline Core):** The @electron/packager integration is the most complex new code. May benefit from a quick spike to validate `packager()` API behavior with `asar: false`, custom icon, and `executableName` options. Also needs first-time Electron binary download UX decision.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Trivial code change, well-understood from codebase analysis
- **Phase 2 (Game Runtime):** Standard Electron main process — well-documented patterns, existing editor code as reference
- **Phase 4 (UI Integration):** Vue component modification — established patterns in existing ExportModal.vue
- **Phase 5 (Polish):** Standard error handling and validation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | npm registry verified for both new deps; API surface confirmed; pure JS, no native compilation risks |
| Features | **HIGH** | FEATURES.md clearly defines 10 table stakes, 5 differentiators, 10 anti-features; aligns with PROJECT.md scope |
| Architecture | **HIGH** | Based on thorough codebase analysis of existing export pipeline, SaveManager, assetPath; all integration points verified against source |
| Pitfalls | **HIGH** | 14 pitfalls catalogued across 3 severity levels with specific prevention strategies; 2 most critical (P2, P8) eliminated by architecture decisions |

**Overall confidence:** **HIGH** — All 4 research files (STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md) plus bonus COMPARISON.md are thorough, source-verified, and internally consistent after conflict resolution.

### Gaps to Address

- **First-run Electron binary download UX:** @electron/packager downloads ~90 MB Electron binary on first export. Need to decide: (a) download proactively at editor startup, (b) show clear progress/warning during first export, or (c) pre-cache during editor installation. Recommend (b) — simplest, honest UX.
- **Export cancellation:** Long export (Vite build + packaging) should be cancellable. Not covered in research — needs design during Phase 3 planning.
- **Disk space validation:** Exported game is ~200 MB+ (Electron runtime + assets). Should warn user before export if insufficient disk space. Not covered — add to Phase 5.
- **Non-ASCII game titles:** Japanese/Chinese characters in exe name and window title. Likely works (Electron supports Unicode) but needs explicit testing.
- **Windows Defender / SmartScreen:** Unsigned .exe may trigger warnings on first launch. Not solvable in v0.8 (requires code signing) but should be documented for users.
- **ELECTRON_MIRROR support:** Chinese users behind GFW may need mirror for Electron binary download — `@electron/get` likely supports `ELECTRON_MIRROR` env var but exact passthrough API needs verification.

## Sources

### Primary (HIGH confidence)
- npm registry: `@electron/packager@19.1.0` — version, API, dependencies, resedit integration
- npm registry: `png-to-ico@3.0.1` — version, dependencies (pngjs only), pure JS
- npm registry: `electron-builder@26.8.2`, `@electron-forge/cli@7.11.1` — comparison analysis
- Codebase analysis: `electron/exportGame.js`, `electron/main.js`, `electron/preload.js`
- Codebase analysis: `src/engine/assetPath.js`, `src/engine/SaveManager.js`, `src/main.js`
- Codebase analysis: `src/editor/components/ExportModal.vue`
- Codebase analysis: `vite.web.config.js`, `package.json`
- Electron 41.x documentation: `app.getPath('userData')`, `BrowserWindow.loadFile()`, `contextBridge`

### Secondary (MEDIUM confidence)
- Milestone description: feature scope for "绿色免安装" desktop export
- ARCHITECTURE.md anti-patterns: architectural smell analysis from codebase structure

### Gaps (needs validation)
- Non-ASCII exe naming behavior with @electron/packager
- First-export download UX for Electron binary cache
- Export cancellation mechanism
- ELECTRON_MIRROR passthrough for Chinese users

---
*Research completed: 2025-07-23*
*Ready for roadmap: yes*
*Files synthesized: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, COMPARISON.md*
