# Domain Pitfalls — Electron Desktop Game Export

**Domain:** Desktop game packaging from visual novel editor
**Researched:** 2025-07-23

## Critical Pitfalls

Mistakes that cause failed exports, broken games, or major rework.

### Pitfall 1: Electron Binary Download Fails Silently

**What goes wrong:** `@electron/packager` uses `@electron/get` to download the Electron binary on first export. This can fail due to network issues, corporate proxies, China's GFW, or GitHub rate limits. If it fails, the export produces no output or a cryptic error.
**Why it happens:** The Electron binary (~90 MB ZIP) is downloaded from GitHub Releases. First export on a new machine always requires this download.
**Consequences:** User sees "export failed" with an opaque network error. First-time experience is terrible.
**Prevention:**
- Catch download errors specifically and show a clear Chinese-language error message: "首次导出需要下载运行时（约 90 MB），请检查网络连接"
- Consider pre-caching: on editor startup, check if `~/.electron/` has the required version cached; if not, show a one-time "download runtime" prompt in settings
- Support `ELECTRON_MIRROR` environment variable for Chinese users (e.g., `https://npmmirror.com/mirrors/electron/`)
- Show download progress in the ExportModal (if @electron/get supports progress callbacks)
**Detection:** Test export on a clean machine with no cached Electron binaries.

### Pitfall 2: asset:// Protocol Path Mismatch Between ASAR and Unpacked

**What goes wrong:** When ASAR packs some files and leaves others unpacked, the file paths the game's main.js uses to locate assets may point to the wrong location. ASAR-packed files are accessed transparently via Electron's ASAR support, but unpacked files live in `app.asar.unpacked/`. If the code expects files at `path.join(__dirname, 'assets/')` but they're actually at `resources/app.asar.unpacked/assets/`, everything breaks.
**Why it happens:** `__dirname` inside an ASAR resolves to the virtual ASAR path. Unpacked files are in a parallel `.unpacked` directory. Electron transparently redirects fs calls for ASAR contents, but `path.join()` may construct paths that don't account for this.
**Consequences:** All asset loading fails — blank screens, no audio, missing characters.
**Prevention:**
- Use `app.getAppPath()` instead of `__dirname` to get the app directory — it correctly resolves whether code is in ASAR or not
- Electron automatically redirects `fs` calls for ASAR-packed files, BUT the `protocol.handle` with `net.fetch(pathToFileURL(...))` may NOT follow ASAR redirection for unpacked files
- **Test extensively** with ASAR enabled — the protocol handler needs to handle both ASAR and unpacked paths
- Alternative: use `app.getPath('exe')` to find the resources directory and construct paths from there
- Simplest safe approach: put ALL assets outside ASAR (use `asarUnpack: '{assets/**,script.json}'`) and ensure the protocol handler resolves to the `.unpacked` directory for assets
**Detection:** Export a game with ASAR enabled, run it, verify all asset types load (backgrounds, characters, audio, fonts, voices).

### Pitfall 3: Save Directory Doesn't Exist on First Launch

**What goes wrong:** The game's save IPC handlers try to write to `app.getPath('userData') + '/saves/'` but the directory doesn't exist on first launch. `fs.writeFile` fails because the parent directory doesn't exist.
**Why it happens:** `app.getPath('userData')` returns a path that MAY not exist yet (depends on OS and whether any other Electron app has used it). The `saves/` subdirectory definitely doesn't exist.
**Consequences:** First save attempt fails silently. Player thinks they saved but data is lost.
**Prevention:**
- Use `fs.mkdir(savesDir, { recursive: true })` before any write operation
- OR create the saves directory on app startup (in the `app.whenReady()` handler)
- The existing editor SaveManager doesn't have this issue because the editor creates the project's `saves/` directory during project creation
**Detection:** Test save on a fresh Windows user account where the userData directory has never been created.

### Pitfall 4: Windows __dirname with ESM and ASAR

**What goes wrong:** `path.dirname(new URL(import.meta.url).pathname)` on Windows inside ASAR returns a path with a leading `/` (e.g., `/C:/Users/.../resources/app.asar`) which is invalid for Windows filesystem operations.
**Why it happens:** `import.meta.url` uses file:// URL format. URL pathname on Windows includes a leading `/`. When used with `path.join()`, the leading slash can cause path resolution issues, especially with ASAR paths.
**Consequences:** All file operations in the game's main.js fail on Windows.
**Prevention:**
- Use `const __dirname = path.dirname(fileURLToPath(import.meta.url));` (import `fileURLToPath` from `node:url`) — this correctly handles Windows paths
- This is the same pattern the editor's main.js already uses (line 9)
- Do NOT use `new URL(import.meta.url).pathname` directly on Windows
**Detection:** Test the exported game on Windows — path bugs are platform-specific.

## Moderate Pitfalls

### Pitfall 5: @electron/packager electronVersion Mismatch

**What goes wrong:** If the `electronVersion` option doesn't match a real Electron release, @electron/get fails to download. If a major version mismatch exists between editor and game Electron versions, API differences may cause crashes.
**Prevention:**
- Hardcode `electronVersion` to a specific known-good version (e.g., `'41.2.0'`)
- OR read the editor's Electron version at runtime: `process.versions.electron`
- Don't use `electronVersion: 'latest'` — untested versions may have breaking changes

### Pitfall 6: Game Title with Special Characters

**What goes wrong:** Game titles with characters like `<>:"|?*\/` are valid in the editor's text field but invalid in Windows filenames. @electron/packager replaces some characters, but edge cases exist (e.g., trailing dots, reserved names like CON, PRN, NUL).
**Prevention:**
- Sanitize game title for filesystem use (same `sanitizeProjectName()` from editor's main.js)
- Apply sanitization BEFORE passing to packager's `name` and `executableName` options
- Show a warning in the UI if characters were replaced

### Pitfall 7: Staging Directory Cleanup on Export Failure

**What goes wrong:** If the export fails mid-pipeline (packager error, disk full, user cancels), the staging directory (temp dir with copied engine + assets) is left behind, consuming potentially hundreds of MB.
**Prevention:**
- Wrap the entire export in try/finally that always cleans up the staging dir
- Use `os.tmpdir()` for staging (OS handles eventual cleanup even if app crashes)
- Implement AbortController pattern (already used in v0.7 web export) for cancellation

### Pitfall 8: Preload Script Path in Packaged App

**What goes wrong:** The game's main.js specifies `preload: path.join(__dirname, 'preload.js')` but when ASAR is active, the preload file path must resolve correctly within or alongside the ASAR archive.
**Prevention:**
- Preload scripts in ASAR are handled transparently by Electron — they load from the virtual ASAR path
- Ensure preload.js is NOT in the `asarUnpack` list (it should be packed in ASAR with main.js)
- Test with ASAR enabled specifically

### Pitfall 9: Disk Space Check Before Export

**What goes wrong:** Export requires significant temp space: staging dir (~size of assets) + packager output (~size of assets + 180 MB Electron) + optional ZIP. On a full disk, export fails partway through with corrupt partial output.
**Prevention:**
- Check available disk space before starting (need ~3x asset size + 250 MB overhead)
- If insufficient, show a clear error before starting the pipeline
- Calculate estimated output size and display it in ExportModal before user confirms

### Pitfall 10: ESM vs CJS in Generated Game main.js

**What goes wrong:** The generated game package.json needs `"type": "module"` for the ESM main.js to work (since it uses `import` statements). If missing, Node.js treats .js files as CommonJS and the `import` syntax fails.
**Prevention:**
- Always include `"type": "module"` in the generated package.json
- OR use `.mjs` extension for main.mjs and preload.mjs
- The editor project uses `"type": "module"` — follow the same pattern

## Minor Pitfalls

### Pitfall 11: Chromium License Files

**What goes wrong:** @electron/packager includes Chromium license files (LICENSES.chromium.html) in the output. Users may be confused or try to delete them.
**Prevention:** Document that these are required by Chromium's license terms. Don't clean them up.

### Pitfall 12: Large Package Size Surprise

**What goes wrong:** Users expect a small game but get a 200+ MB output because Electron + Chromium is ~180 MB baseline.
**Prevention:**
- Show estimated output size in ExportModal BEFORE export starts
- Explain in UI: "桌面版包含运行时环境，基础大小约 200 MB + 游戏资源"
- Consider recommending web export for small games

### Pitfall 13: Antivirus False Positives

**What goes wrong:** Some antivirus software flags unsigned Electron .exe files as suspicious, quarantining or blocking the exported game.
**Prevention:**
- Cannot fully prevent without code signing (out of scope for v0.8)
- Document this in export completion: "如果杀毒软件误报，请添加信任"
- The game uses a renamed electron.exe with custom icon — this is standard for unsigned Electron apps

### Pitfall 14: set-window-mode IPC Handler Missing in Game

**What goes wrong:** The engine's settings page includes window mode controls (窗口/全屏/无边框). If the game's main.js doesn't have the `set-window-mode` IPC handler, clicking these controls fails silently.
**Prevention:**
- Include `set-window-mode` handler in the game's main.js template
- Handle all three modes: windowed, fullscreen, frameless
- Port the exact logic from editor's main.js (lines ~690-703)

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Game main.js generation | Path handling (P4), ESM/CJS (P10) | Use fileURLToPath, include "type": "module" |
| ASAR configuration | asset:// path mismatch (P2), preload path (P8) | Test with ASAR enabled, use app.getAppPath() |
| Save system | Missing directory (P3) | mkdir recursive on app startup |
| Icon handling | PNG → .ico conversion edge cases | Test with various PNG sizes, handle non-square PNGs |
| First-time export | Electron download (P1) | Clear error messages, mirror support |
| ExportModal integration | Staging cleanup (P7) | try/finally, AbortController |
| File naming | Special characters (P6) | Reuse sanitizeProjectName() |

## Sources

- Project source: `electron/main.js` — asset:// protocol patterns, save handlers, path handling (direct inspection)
- Project source: `electron/exportGame.js` — existing pipeline error handling patterns (direct inspection)
- @electron/packager documentation — ASAR, electronVersion, platform options (npm registry, HIGH confidence)
- resedit README — Windows PE resource editing limitations (npm registry, MEDIUM confidence)
- Electron ASAR documentation — transparent path redirection behavior (training data, MEDIUM confidence)
- Windows filesystem naming rules — reserved characters and names (training data, HIGH confidence)
