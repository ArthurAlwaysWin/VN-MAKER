# Technology Stack — Web Export Additions

**Project:** Galgame Maker v0.7 — Web Static Bundle Export
**Researched:** 2025-07-22
**Scope:** Only NEW capabilities needed for web export. Existing stack (Electron 41, Vue 3, Pinia, Vite 6.3, fflate 0.8.2) is validated and not re-evaluated.

## Executive Summary

**Zero new npm dependencies are required.** The existing stack — Vite for bundling, fflate for ZIP, Node.js `fs`/`path` for file operations — covers every capability needed for web export. The work is 95% architecture/code adaptation, 5% build configuration.

The key finding: **Vite already builds a standalone web engine bundle** as part of `npm run build`. The output (`dist/index.html` + `dist/assets/game-*.js` + `dist/assets/game-*.css`) is a valid browser bundle — `vite-plugin-electron` only adds `dist-electron/` artifacts and does not modify how the renderer is built. The engine runtime's Electron dependencies are all runtime-checked (not import-time), so the bundle runs in a browser with graceful fallbacks.

## Recommended Stack Changes

### 1. Vite — Separate Web Engine Build Config

| Item | Value |
|------|-------|
| **Technology** | Vite (existing v6.3.0) |
| **What's new** | Second build config `vite.config.web.js` + npm script |
| **Why** | Produce a clean engine-only bundle with deterministic filenames |
| **Confidence** | HIGH — verified from existing `dist/` output structure |

**Rationale:** The existing `npm run build` outputs both editor and engine to `dist/`. While the engine files (`game-*.js`, `game-*.css`, `fontLoader-*.js`) are technically usable, they have:
- Content-hashed filenames (unpredictable for the export code to reference)
- Editor assets co-located (unnecessary baggage)
- `crossorigin` attributes (irrelevant for same-origin static files)

A dedicated web config solves all three:

```js
// vite.config.web.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // NO vue() plugin — engine is pure JS, no SFCs
  // NO electron() plugin — standalone web target
  build: {
    outDir: 'dist-web-engine',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'engine.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
    // Deterministic output — no content hashes
  },
});
```

**npm script addition:**
```json
{
  "scripts": {
    "build:web-engine": "vite build --config vite.config.web.js"
  }
}
```

**Output:** `dist-web-engine/index.html`, `dist-web-engine/engine.js`, `dist-web-engine/engine.css` — predictable filenames the export code can copy.

**Alternative considered:** Re-using `dist/` output and scanning for `game-*.js` via glob. Rejected because hashed filenames add fragile directory-scanning logic, and the editor's fontLoader chunk is shared code that shouldn't be in the export.

### 2. fflate — ZIP Packaging (Already Installed)

| Item | Value |
|------|-------|
| **Technology** | fflate (existing v0.8.2) |
| **What's new** | Use `zip()` async API (currently only `zipSync` is used) |
| **Why** | Non-blocking ZIP creation for large game projects (100+ MB assets) |
| **Confidence** | HIGH — verified exports from `node_modules/fflate/esm/browser.js` |

**Rationale:** The existing `themePackager.js` uses `zipSync()` for small theme ZIPs (~50 KB). Game exports can be 100+ MB (images, audio, fonts). Using the async callback API prevents UI freezing:

```js
import { zip } from 'fflate';

// Async API — uses Web Workers in renderer, worker_threads in Node
zip(files, { level: 0 }, (err, data) => {
  // data is Uint8Array of the ZIP
});
```

**Key detail:** Since game assets are mostly already-compressed formats (PNG, JPEG, MP3, OGG), use `level: 0` (store-only, no compression) — this is significantly faster and avoids re-compressing already-compressed data with negligible size savings.

**For very large projects** (500+ MB), consider streaming with `Zip` + `AsyncZipDeflate` classes to avoid holding the entire ZIP in memory. But this is an optimization — `zip()` with `level: 0` is sufficient for v0.7.

**Why NOT JSZip:** fflate is already installed, 8 KB vs JSZip's 100+ KB, faster compression, and the sync/async/streaming APIs cover all needs. No reason to add another dependency.

### 3. Node.js Built-ins — Export File Operations

| Item | Value |
|------|-------|
| **Technology** | Node.js `fs/promises`, `path` (built-in) |
| **What's new** | New IPC handler `export-web` in `electron/main.js` |
| **Why** | File copying, directory creation, HTML generation |
| **Confidence** | HIGH — same pattern as existing 29 IPC handlers |

**Rationale:** The export runs in Electron's main process (needs filesystem access). It follows the exact same IPC pattern already used for project save/load/asset management. New handler:

```js
ipcMain.handle('export-web', async (event, options) => {
  // options: { outputDir, title, favicon, includeZip }
  // 1. Create output directory structure
  // 2. Generate index.html from template
  // 3. Copy pre-built engine bundle (dist-web-engine/)
  // 4. Scan script.json for referenced assets
  // 5. Copy only referenced assets to output/assets/
  // 6. Write path-adapted script.json
  // 7. Optional: ZIP the output directory
});
```

No new Node.js modules needed. Uses `fs.promises.cp()` (Node 16.7+, Electron 41 ships Node 22+) for recursive directory copying.

### 4. HTML Template — String Interpolation (No Template Engine)

| Item | Value |
|------|-------|
| **Technology** | JavaScript template literals |
| **What's new** | ~30-line HTML template string in export handler |
| **Why** | The template is trivially simple — no conditionals, no loops |
| **Confidence** | HIGH |

**Rationale:** The exported HTML template is:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1280">
  <title>${title}</title>
  ${favicon ? '<link rel="icon" href="favicon.ico">' : ''}
  <script type="module" src="engine.js"></script>
  <link rel="stylesheet" href="engine.css">
</head>
<body>
  <div id="game-container">
    <div id="background-layer"></div>
    <div id="character-layer"></div>
    <div id="dialogue-layer"></div>
    <div id="ui-overlay"></div>
  </div>
</body>
</html>
```

This is 20 lines with 2 interpolation points. EJS, Handlebars, or any template engine would be absurd overkill.

**Why NOT EJS/Handlebars:** Adds a dependency for a problem that doesn't exist. Template literals handle this perfectly. The template has no iteration, no conditionals beyond a trivial ternary, no partials.

## What NOT to Add

| Don't Add | Why Not |
|-----------|---------|
| **JSZip** | fflate already installed, lighter, faster, covers all ZIP use cases |
| **EJS / Handlebars / Mustache** | Template is ~20 lines, no complex logic |
| **archiver (npm)** | Node.js ZIP library — fflate handles this, no need for a second ZIP lib |
| **html-minifier** | The exported HTML is already tiny; engine JS/CSS are Vite-minified |
| **Babel / core-js polyfills** | Engine uses standard APIs (fetch, FontFace, CSS custom props, Audio) available in all browsers since 2020 |
| **webpack / esbuild (standalone)** | Vite already bundles everything; no reason for a second bundler |
| **sharp / canvas-based favicon** | Users provide their own favicon file; just copy it as-is |
| **http-server / live-server** | Out of scope per PROJECT.md — no post-export preview |
| **Separate template engine for script.json** | Asset paths are already relative in script.json; basePath is a runtime prefix |

## Engine Runtime Adaptations (Code, Not Dependencies)

These are code changes, not new dependencies. Documented here because they directly affect how the stack is used.

### 5. Environment Detection Pattern

The engine (`src/main.js`) already has two modes: normal + preview. Web export adds a third. Detection:

```js
const isElectron = typeof window.ipcRenderer !== 'undefined';
const isPreview = window.parent !== window;
const isWeb = !isElectron && !isPreview;
```

**Impact on basePath:**

| Mode | basePath | Script URL | Font baseUrl |
|------|----------|------------|--------------|
| Electron normal | `/game/` | `/game/script.json` | `asset://` |
| Electron preview | `asset://` | (via postMessage) | `asset://` |
| **Web export** | `assets/` | `script.json` | `assets/` |

**Current code point:** Line 37-43 of `main.js` — hardcoded `/game/`. Change to use `BASE_PATH` constant.

### 6. WebSaveManager — localStorage Fallback

**What:** A ~80-line class that implements the SaveManager interface using `localStorage` + `JSON.stringify`.

**Why needed:** `SaveManager` uses `window.ipcRenderer.invoke()` for ALL 7 of its async methods. In web mode, there is no IPC. The web fallback:
- Uses `localStorage` for save data (keyed by slot number)
- Stores metadata (timestamp, preview text) alongside state
- No thumbnail support (no screenshot capture in browser)
- Limited by localStorage's ~5-10 MB quota (sufficient for save state JSON, not large games)

**Alternative considered:** IndexedDB for unlimited storage. Rejected for v0.7 — localStorage is simpler, and save state JSON is typically < 100 KB per slot. IndexedDB can be added later if save data grows.

**Electron IPC guard inventory** (all in `src/main.js` and `src/engine/SaveManager.js`):

| Location | Usage | Web Fallback |
|----------|-------|--------------|
| `SaveManager.save()` | `ipcRenderer.invoke('save-slot')` | localStorage write |
| `SaveManager.load()` | `ipcRenderer.invoke('load-slot')` | localStorage read |
| `SaveManager.delete()` | `ipcRenderer.invoke('delete-slot')` | localStorage remove |
| `SaveManager.getAllSlots()` | `ipcRenderer.invoke('list-saves')` | localStorage scan |
| `SaveManager.quickSave()` | `ipcRenderer.invoke('save-quickslot')` | localStorage write |
| `SaveManager.quickLoad()` | `ipcRenderer.invoke('load-quickslot')` | localStorage read |
| `SaveManager.hasQuickSave()` | `ipcRenderer.invoke('load-quickslot')` | localStorage check |
| `SaveManager._checkMigration()` | `ipcRenderer.invoke('migrate-legacy-saves')` | No-op (no legacy) |
| `main.js:110` | `ipcRenderer.invoke('capture-screenshot')` | Return null (already guarded) |
| `main.js:152-154` | `ipcRenderer.invoke('set-window-mode')` | No-op (already guarded) |

**Key insight:** `captureGameScreenshot()` and `applyConfig()` are ALREADY guarded with `if (!window.ipcRenderer)` / `if (window.ipcRenderer)`. Only SaveManager needs a full web fallback.

### 7. Asset Path Handling in UI Components

Two UI components have hardcoded `asset://` paths that need adaptation:

| Component | Line | Current Code | Issue |
|-----------|------|-------------|-------|
| `SettingsScreen.js` | 72 | `` `url("asset://${safeBg}")` `` | Hardcoded `asset://` prefix |
| `TitleScreen.js` | 73 | `bgPath.startsWith('asset://')` check | Falls back to `/game/` not `assets/` |
| `TitleScreen.js` | 158 | Same pattern for images | Same issue |

**Fix:** These components need a `basePath` parameter (same pattern as `AudioManager`, `BackgroundLayer`, `CharacterLayer` which already accept `basePath` in their constructors). The `SettingsScreen` and `TitleScreen` constructors should accept basePath and use it for asset URL construction.

### 8. Asset Reference Scanning

The export must identify which assets are actually used in `script.json` to copy only referenced files. Asset paths appear in these locations:

| Data Location | Fields Containing Asset Paths |
|---------------|-------------------------------|
| `characters[id].expressions[name]` | Image paths (e.g., `characters/sakura_normal.png`) |
| `scenes[id].pages[].background` | Background image path |
| `scenes[id].pages[].bgm` | Audio file path |
| `scenes[id].pages[].dialogues[].voice` | Voice audio path |
| `scenes[id].pages[].dialogues[].se` | Sound effect path |
| `ui.titleScreen.background` | Title screen background image |
| `ui.titleScreen.bgm` | Title screen BGM |
| `ui.titleScreen.elements[].src` | Title screen image elements |
| `ui.settingsScreen.background` | Settings screen background |
| `ui.settingsScreen.elements[].src` | Settings screen image elements |
| `ui.theme.nineSlice[key].src` | Nine-slice images (**data: URLs — no file copy needed**) |
| `ui.theme.nineSlice[key].states[state].src` | Nine-slice button states (**data: URLs**) |
| `assets.fonts[].file` | Custom font files |

**Key finding:** Nine-slice images are stored as `data:image/png;base64,...` in script.json (verified in `themePackager.js` import flow). They are self-contained and need NO file copying or path rewriting.

### 9. Google Fonts — External CSS Dependency

`src/style.css` line 6 imports Google Fonts:
```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;600;700&display=swap');
```

**For web export:** This import works as-is (requires internet). For offline play, the fonts could be downloaded and bundled. **Recommendation for v0.7:** Keep the external import (simpler). Add offline font bundling as a future enhancement — it requires downloading font files + rewriting CSS `@font-face` declarations, which is non-trivial.

## Integration Points

### Build Pipeline Integration

```
npm run build          → existing Electron build (dist/ + dist-electron/)
npm run build:web      → NEW: web engine bundle (dist-web-engine/)
npm run build:all      → runs both sequentially
```

The web engine build should run during development packaging so the pre-built artifacts are available when the export feature is invoked.

### Export Flow Integration (IPC)

```
Editor UI (renderer)
  → ipcRenderer.invoke('export-web', { outputDir, title, favicon, zip })
    → electron/main.js handler
      → reads dist-web-engine/ (pre-built engine)
      → reads currentProjectPath (script.json + assets/)
      → generates HTML from template
      → copies engine bundle + referenced assets
      → writes script.json (paths preserved, no rewriting needed)
      → optional: ZIP with fflate
    ← { success, outputPath, fileCount, totalSize }
```

### What the Export Produces

```
output/
  index.html          ← generated (custom title + favicon)
  engine.js           ← copied from dist-web-engine/
  engine.css          ← copied from dist-web-engine/
  script.json         ← copied from project (paths already relative)
  favicon.ico         ← user-provided or default
  assets/
    backgrounds/      ← only referenced files
    characters/       ← only referenced files
    audio/            ← only referenced files
    fonts/            ← only referenced files
```

**Critical insight on path rewriting:** Asset paths in `script.json` are ALREADY relative (e.g., `backgrounds/city.png`). The engine prepends `basePath` at runtime. For web export, `basePath = 'assets/'`, so the path becomes `assets/backgrounds/city.png`. The export copies project asset files into `output/assets/` maintaining their directory structure. **No script.json path rewriting is needed** — only the engine's runtime basePath changes.

## Browser Compatibility

The engine uses only standard web APIs. No polyfills needed.

| API | Used For | Browser Support |
|-----|----------|----------------|
| `fetch()` | Script loading | All modern (Chrome 42+) |
| `FontFace` | Custom font loading | All modern (Chrome 35+) |
| CSS custom properties | Theme tokens | All modern (Chrome 49+) |
| `HTMLAudioElement` | BGM/SE/voice playback | Universal |
| `localStorage` | Config, save games, read history | Universal |
| `<script type="module">` | Engine loading | All modern (Chrome 61+) |
| `border-image` | Nine-slice backgrounds | All modern (Chrome 15+) |

**Minimum browser:** Chrome/Edge 61+, Firefox 60+, Safari 11+. No polyfills.

## Version Summary

| Technology | Version | Status | Role in Export |
|------------|---------|--------|----------------|
| Vite | 6.3.0 | Existing | Build standalone web engine bundle |
| fflate | 0.8.2 | Existing | Optional ZIP packaging |
| Node.js fs/path | Built-in | Existing | Export file operations (IPC handler) |
| Template literals | ES6 | Built-in | HTML generation |

**Total new npm dependencies: 0**

## Sources

- Verified: `package.json` — fflate v0.8.2, Vite v6.3.0 (direct inspection)
- Verified: `node_modules/fflate/esm/browser.js` — exports `zip`, `zipSync`, `Zip`, `AsyncZipDeflate` (direct inspection)
- Verified: `dist/index.html` + `dist/assets/` — Vite build output structure (direct inspection)
- Verified: `src/main.js` lines 37-43, 738-802, 888-892 — basePath pattern and mode detection (direct inspection)
- Verified: `src/engine/SaveManager.js` — all 8 methods use `window.ipcRenderer.invoke()` (grep results)
- Verified: `src/utils/themePackager.js` — fflate `zipSync`/`unzipSync` usage pattern (direct inspection)
- Verified: `src/ui/SettingsScreen.js:72`, `src/ui/TitleScreen.js:73,158` — hardcoded asset:// paths (grep results)
- Verified: `src/engine/ThemeManager.js:100` — nineSlice uses `config.src` directly (data: URLs from themePackager)
- Verified: `vite.config.js` — multi-page build, `vite-plugin-electron/simple` (direct inspection)
