# Architecture Patterns — Electron Desktop Game Export

**Domain:** Desktop game packaging from visual novel editor
**Researched:** 2025-07-23

## Recommended Architecture

### Overview: Two-App Model

The v0.8 export creates a **completely separate Electron app** — the "game app" — distinct from the "editor app". The editor generates the game app's source files, stages them in a temp directory, then invokes `@electron/packager` to produce the final packaged output.

```
EDITOR APP (existing)              GAME APP (generated at export)
├── electron/main.js (800+ lines)  ├── main.js (~80 lines)
├── electron/preload.js (40 lines) ├── preload.js (~20 lines)
├── editor.html (Vue 3 editor)     ├── index.html (game shell)
├── index.html (game engine)       ├── engine.js (Vite bundle)
├── src/ (editor + engine code)    ├── engine.css
├── vite.config.js                 ├── package.json (~5 fields)
└── package.json (full project)    ├── script.json (game data)
                                   └── assets/ (images, audio, fonts)
```

The game app is **self-contained** — it runs without the editor, without internet, without any external dependencies.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **ExportModal** (existing) | UI: format selection, progress, completion | export-game IPC handler |
| **export-game IPC handler** (existing, extended) | Orchestrates full export pipeline | exportDesktopGame(), exportGame() |
| **exportDesktopGame()** (new) | Desktop-specific pipeline: staging → packager | @electron/packager, png-to-ico |
| **Game main.js template** (new) | Template/generator for game's main process | Written to staging dir |
| **Game preload.js template** (new) | Template/generator for game's preload script | Written to staging dir |
| **@electron/packager** (library) | Downloads Electron, assembles .exe directory | Filesystem, @electron/get |

### Data Flow

```
User clicks "导出桌面版" in ExportModal
  │
  ├─ Renderer: ipcRenderer.invoke('export-game', { format: 'desktop', ... })
  │
  ├─ Main process: export-game handler
  │   │
  │   ├─ Step 1: Vite web build (reuse existing) → dist-web/
  │   │
  │   ├─ Step 2: scanAssets(script.json) → asset path list
  │   │
  │   ├─ Step 3: Create staging dir (os.tmpdir() + random)
  │   │   ├─ Generate package.json { name, main, version }
  │   │   ├─ Generate main.js (from template string)
  │   │   ├─ Generate preload.js (from template string)
  │   │   ├─ Copy index.html (from dist-web/)
  │   │   ├─ Copy engine.js + engine.css (from dist-web/)
  │   │   ├─ Copy script.json (from project)
  │   │   └─ Copy referenced assets → staging/assets/
  │   │
  │   ├─ Step 4: PNG → .ico conversion (png-to-ico)
  │   │
  │   ├─ Step 5: packager({ dir: staging, out: output, ... })
  │   │   ├─ @electron/get: download Electron binary (cached)
  │   │   ├─ ASAR: pack code files into app.asar
  │   │   ├─ resedit: embed .ico into .exe
  │   │   └─ Output: GameTitle-win32-x64/ directory
  │   │
  │   ├─ Step 6: Clean up staging directory
  │   │
  │   └─ Step 7: Optional ZIP (fflate)
  │
  └─ Renderer: receives { success, outputPath, warnings }
      └─ ExportModal shows completion state
```

## Patterns to Follow

### Pattern 1: Game Main.js Template as String Literal

**What:** Generate the game's `main.js` as a JavaScript string literal in `exportDesktopGame.js`, not as a separate file that gets copied.

**When:** Always — the game main.js is simple enough (~80 lines) and needs parameterization (window title, dimensions).

**Why:** The game main.js needs the game title and resolution baked in. Template literals handle this naturally. Keeping it as a string in the export module means:
- No separate file to maintain
- Parameters are injected at generation time
- No risk of the template file getting out of sync with the engine

**Example:**
```js
function generateGameMain(gameTitle, width, height) {
  return `
import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

protocol.registerSchemesAsPrivileged([{
  scheme: 'asset',
  privileges: { standard: true, supportFetchAPI: true, stream: true, bypassCSP: true },
}]);

app.whenReady().then(() => {
  // asset:// protocol — reads from app directory assets/
  protocol.handle('asset', (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.hostname + url.pathname);

    // saves/ prefix: resolve from userData
    if (filePath.startsWith('saves/') || filePath.startsWith('saves\\\\')) {
      const savesDir = path.join(app.getPath('userData'), 'saves');
      const fullPath = path.resolve(path.join(savesDir, filePath.slice(6)));
      if (!fullPath.startsWith(path.resolve(savesDir))) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(fullPath).toString());
    }

    // assets: resolve from app directory
    const base = path.join(__dirname, 'assets');
    const fullPath = path.resolve(path.join(base, filePath));
    if (!fullPath.startsWith(path.resolve(base))) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(fullPath).toString());
  });

  const win = new BrowserWindow({
    width: ${width}, height: ${height},
    title: ${JSON.stringify(gameTitle)},
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));
});

app.on('window-all-closed', () => app.quit());
`;
}
```

### Pattern 2: Reuse Existing Pipeline Steps

**What:** The desktop export should call the same underlying functions as web export for common steps (Vite build, asset scanning, file copying).

**When:** Steps 1-2 of the pipeline (build engine, scan assets) are identical.

**Why:**
- DRY — don't duplicate the Vite build invocation or scanAssets logic
- Both export paths already share the same engine bundle (dist-web/)
- Asset copying logic is identical (scan → filter → copy)

**Example:**
```js
// exportDesktopGame.js
import { scanAssets } from '../src/engine/scanAssets.js';

// Reuse the same Vite build step
if (!_skipBuild) {
  await execAsync(`npx vite build --config "${webConfigPath}"`, { cwd: appRoot });
}

// Reuse the same asset scanner
const assetDict = scanAssets(scriptData);
```

### Pattern 3: Save Path Isolation (userData)

**What:** The exported game stores saves in `app.getPath('userData')`, NOT alongside the .exe.

**When:** Always — exported game must write saves to a user-writable location.

**Why:**
- The game directory may be read-only (e.g., Program Files, or on a USB stick)
- Windows UAC blocks writes next to .exe in protected directories
- `userData` is the standard Electron path for persistent user data
- Each game gets its own userData directory (based on app name in package.json)

**Impact on IPC:** The game's main.js save handlers use `app.getPath('userData')` as the base directory instead of `currentProjectPath + '/saves'`. The renderer-side SaveManager remains unchanged — it calls the same IPC channels (`save-slot`, `load-slot`, etc.).

### Pattern 4: Environment Detection Reuse

**What:** The exported game runs in Electron with `window.ipcRenderer` available. The engine's existing `detectEnvironment()` in `assetPath.js` correctly identifies this as `ENV = 'electron'` and sets `BASE_PATH = 'asset://'`.

**When:** No changes needed to the engine environment detection.

**Why:** The engine already supports 3 modes (electron/preview/web). The exported desktop game is simply another instance of the 'electron' mode, with a different main.js backing it. The engine code is identical — it detects ipcRenderer, uses asset:// protocol, and calls SaveManager IPC. The only difference is on the main process side (the game's main.js is simpler than the editor's).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Bundling the Entire Editor

**What:** Including editor code (Vue components, editor IPC handlers) in the exported game.
**Why bad:** Bloats the package, exposes editor functionality to players, security risk.
**Instead:** Generate a minimal game app from scratch. Only include engine code (from dist-web/), game data (script.json), and assets.

### Anti-Pattern 2: Using Editor's node_modules

**What:** Copying the editor's node_modules into the game staging directory.
**Why bad:** Editor has Vue, Pinia, vite-plugin-electron, etc. — none needed by the game runtime. Would add hundreds of MB.
**Instead:** The game app has ZERO node_modules. Its main.js uses only Electron built-in modules (`app`, `BrowserWindow`, `ipcMain`, `protocol`, `net`, `fs`, `path`). Set `prune: false` in packager config since there's nothing to prune.

### Anti-Pattern 3: Hardcoded Paths in Generated Code

**What:** Generating main.js with absolute paths that only work on the build machine.
**Why bad:** The exported game runs on ANY Windows machine.
**Instead:** All paths in the generated main.js are relative to `__dirname` (the app directory) or use `app.getPath('userData')` (OS-provided). Never reference the editor's project path.

### Anti-Pattern 4: ASAR for Everything

**What:** Packing all files (including large images, audio) into app.asar.
**Why bad:** ASAR is a concatenated archive — seeking to specific files requires parsing the header. Large binary files (PNG, MP3, OGG) suffer from slower random access.
**Instead:** Use `asarUnpack` to keep assets/ and script.json outside ASAR. Only pack code files (main.js, preload.js, engine.js, engine.css, index.html) — these are small and benefit from ASAR's path traversal protection.

### Anti-Pattern 5: Blocking the Export on UI Thread

**What:** Running @electron/packager synchronously or without progress updates.
**Why bad:** Packaging takes 10-60+ seconds (Electron binary download, file copying, ASAR creation). UI would freeze.
**Instead:** The entire export runs asynchronously in the main process, sending progress updates via `webContents.send('export-progress', { step, percent })` — same pattern as existing web export.

## Scalability Considerations

| Concern | Small Game (50 MB) | Medium Game (500 MB) | Large Game (2+ GB) |
|---------|-------------------|---------------------|-------------------|
| Export time | ~15s (first run w/ download) | ~30-60s (asset copying) | ~2-5 min (asset copying dominates) |
| Output size | ~230 MB (Electron overhead) | ~680 MB | ~2.2+ GB |
| Staging disk space | ~50 MB temp | ~500 MB temp | ~2+ GB temp |
| ASAR build | Instant (few KB of code) | Instant | Instant |
| ZIP output | ~5s | ~30-60s | Not recommended (memory) |

## Sources

- Project source: `electron/main.js` — asset:// protocol, save IPC handlers, window creation (direct inspection)
- Project source: `electron/exportGame.js` — existing 6-step pipeline architecture (direct inspection)
- Project source: `src/engine/assetPath.js` — 3-way environment detection (direct inspection)
- Project source: `src/engine/SaveManager.js` — IPC channel names and API surface (direct inspection)
- @electron/packager API — programmatic usage, asar/asarUnpack options (npm registry, HIGH confidence)
- Electron docs — app.getPath('userData'), protocol.handle (training data, MEDIUM confidence)
