# Architecture Patterns — Web Export

**Domain:** Visual novel creator → game export/deployment
**Researched:** 2025-07-22

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    EDITOR (Renderer)                     │
│                                                         │
│  ExportPanel.vue                                        │
│    ├── Title input                                      │
│    ├── Favicon picker                                   │
│    ├── Output directory selector                        │
│    ├── ZIP toggle                                       │
│    └── "Export" button                                  │
│         │                                               │
│         ▼ ipcRenderer.invoke('export-web', options)     │
└────────────┬────────────────────────────────────────────┘
             │ IPC
┌────────────▼────────────────────────────────────────────┐
│                 ELECTRON MAIN PROCESS                    │
│                                                         │
│  export-web handler                                     │
│    ├── 1. Read script.json from project                 │
│    ├── 2. Scan asset references (scanner utility)       │
│    ├── 3. Generate index.html (template + title/favicon)│
│    ├── 4. Copy engine bundle (dist-web-engine/)         │
│    ├── 5. Copy script.json to output                    │
│    ├── 6. Copy referenced assets to output/assets/      │
│    ├── 7. Copy favicon if provided                      │
│    └── 8. Optional: ZIP output with fflate              │
│                                                         │
│  Reads from:                                            │
│    - dist-web-engine/  (pre-built engine bundle)        │
│    - currentProjectPath/  (script.json + assets/)       │
│                                                         │
│  Writes to:                                             │
│    - outputDir/  (user-selected export directory)       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              EXPORTED WEB GAME (Output)                  │
│                                                         │
│  output/                                                │
│    index.html        ← custom title + favicon           │
│    engine.js         ← standalone engine bundle         │
│    engine.css        ← engine styles (incl. Noto Sans)  │
│    script.json       ← game data (relative asset paths) │
│    favicon.ico       ← optional                         │
│    assets/                                              │
│      backgrounds/    ← only referenced images           │
│      characters/     ← only referenced sprites          │
│      audio/          ← only referenced BGM/SE/voice     │
│      fonts/          ← only referenced custom fonts     │
└─────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `ExportPanel.vue` | UI for export options, progress display | IPC → main process |
| `export-web` IPC handler | Orchestrates entire export pipeline | fs, scanner, template |
| Asset reference scanner | Traverses script.json, returns Set of used paths | Called by export handler |
| HTML template generator | Produces index.html string with interpolated values | Called by export handler |
| `vite.config.web.js` | Build config for standalone engine bundle | Vite CLI (build time) |
| `WebSaveManager` | localStorage-based save/load for browser | Replaces `SaveManager` in web mode |

### Data Flow

**Build time:**
```
src/main.js + src/engine/ + src/ui/ + src/style.css
  → vite build --config vite.config.web.js
  → dist-web-engine/engine.js + dist-web-engine/engine.css
```

**Export time:**
```
User clicks "Export"
  → ExportPanel.vue collects options {outputDir, title, favicon, zip}
  → ipcRenderer.invoke('export-web', options)
  → Main process reads script.json from currentProjectPath
  → Scanner extracts Set<assetPath> from script.json
  → fs.mkdir(outputDir) + fs.mkdir(outputDir/assets)
  → fs.writeFile(outputDir/index.html, generateHTML(title, favicon))
  → fs.cp(dist-web-engine/engine.js, outputDir/engine.js)
  → fs.cp(dist-web-engine/engine.css, outputDir/engine.css)
  → fs.cp(projectPath/script.json, outputDir/script.json)
  → for each assetPath in referencedAssets:
      fs.cp(projectPath/assetPath, outputDir/assets/assetPath)
  → if favicon: fs.cp(faviconPath, outputDir/favicon.ico)
  → if zip: fflate.zip(outputDir contents) → outputDir.zip
  → return {success, fileCount, totalSize}
```

**Runtime (in browser):**
```
Browser loads index.html
  → engine.js detects web mode (no window.ipcRenderer, not in iframe)
  → Sets BASE_PATH = 'assets/'
  → Creates WebSaveManager (localStorage)
  → fetch('script.json') → parse → engine.load()
  → loadAllFonts(fonts, 'assets/')
  → applyTheme(), applyNineSlice()
  → showTitle()
  → Game plays normally
```

## Patterns to Follow

### Pattern 1: Three-Mode Environment Detection

**What:** Single engine codebase that adapts to Electron, preview, or web context.
**When:** Engine initialization — determines basePath, SaveManager type, and feature flags.
**Why:** Avoids code duplication; the engine is ONE module tree built by ONE Vite config.

```js
// src/main.js — top of file, after imports
const isElectron = typeof window.ipcRenderer !== 'undefined';
const isPreview = window.parent !== window;
const isWeb = !isElectron && !isPreview;

const BASE_PATH = isWeb ? 'assets/' : (isPreview ? 'asset://' : '/game/');
const SCRIPT_URL = isWeb ? 'script.json' : '/game/script.json';
const FONT_BASE = isWeb ? 'assets/' : 'asset://';
```

### Pattern 2: Interface-Compatible SaveManager

**What:** WebSaveManager implements the exact same async API as SaveManager.
**When:** Web mode — swap at construction time based on environment.
**Why:** All consumers (titleScreen.onContinue, quickBar, gameMenu) call SaveManager methods without knowing the backend.

```js
// src/engine/WebSaveManager.js
export class WebSaveManager {
  constructor() {
    this.slotCount = 108;
    this._storagePrefix = 'gm-save-';
    this._migrationChecked = true;
    this._lastMigrationCount = 0;
  }

  async save(slot, state, previewText, thumbnail = null) {
    const data = { state, previewText, timestamp: Date.now() };
    localStorage.setItem(this._storagePrefix + slot, JSON.stringify(data));
    return { success: true };
  }

  async load(slot) { /* localStorage read */ }
  async delete(slot) { /* localStorage remove */ }
  async getAllSlots() { /* scan localStorage keys */ }
  async quickSave(state, previewText) { /* same pattern */ }
  async quickLoad() { /* same pattern */ }
  async hasQuickSave() { /* check key exists */ }
}
```

### Pattern 3: Export as IPC Handler

**What:** Export logic lives entirely in `electron/main.js` as an IPC handler.
**When:** User triggers export from the editor UI.
**Why:** Consistent with existing 29 IPC handlers; main process has full fs access.

```js
// electron/main.js
ipcMain.handle('export-web', async (event, { outputDir, title, favicon, includeZip }) => {
  try {
    // 1-8 steps from data flow above
    return { success: true, outputPath: outputDir, fileCount, totalSize };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
```

### Pattern 4: Declarative Asset Scanner

**What:** Pure function that takes script.json object, returns Set of asset paths.
**When:** Before file copying in the export pipeline.
**Why:** Separates "what to copy" from "how to copy" — testable, reusable.

```js
// electron/assetScanner.js
export function scanAssetReferences(script) {
  const assets = new Set();

  // Characters — expressions map
  for (const char of Object.values(script.characters || {})) {
    for (const imgPath of Object.values(char.expressions || {})) {
      assets.add(imgPath);
    }
  }

  // Scenes → pages → backgrounds, bgm, dialogues (voice, se)
  for (const scene of Object.values(script.scenes || {})) {
    for (const page of scene.pages || []) {
      if (page.background) assets.add(page.background);
      if (page.bgm) assets.add(page.bgm);
      for (const dlg of page.dialogues || []) {
        if (dlg.voice) assets.add(dlg.voice);
        if (dlg.se) assets.add(dlg.se);
      }
    }
  }

  // UI screens
  if (script.ui?.titleScreen?.background) assets.add(script.ui.titleScreen.background);
  if (script.ui?.titleScreen?.bgm) assets.add(script.ui.titleScreen.bgm);
  for (const elem of script.ui?.titleScreen?.elements || []) {
    if (elem.src) assets.add(elem.src);
  }
  if (script.ui?.settingsScreen?.background) assets.add(script.ui.settingsScreen.background);
  for (const elem of script.ui?.settingsScreen?.elements || []) {
    if (elem.src) assets.add(elem.src);
  }

  // Fonts
  for (const font of script.assets?.fonts || []) {
    if (font.file) assets.add(font.file);
  }

  // nineSlice images are data: URLs — no file copy needed
  return assets;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Forking the Engine

**What:** Creating a separate `web-main.js` that duplicates `main.js` with modifications.
**Why bad:** Two codebases to maintain. Bug fixes in one don't propagate to the other. Feature additions require parallel changes.
**Instead:** Single `main.js` with environment detection at the top. All mode differences are in initialization, not in event handlers or game logic.

### Anti-Pattern 2: Script.json Path Rewriting

**What:** Modifying asset paths in the exported script.json (e.g., prepending `assets/`).
**Why bad:** Fragile — must find and transform every path field in a complex JSON structure. Easy to miss new fields added in future versions.
**Instead:** Keep script.json paths as-is (already relative). The engine's `basePath` runtime parameter handles the prefix. Copy assets into the expected directory structure.

### Anti-Pattern 3: Runtime Vite Bundling

**What:** Running `vite build` at export time from within Electron.
**Why bad:** Requires Vite and all dev dependencies at runtime. Slow (2-5s per export). Fragile across OS environments.
**Instead:** Pre-build the web engine bundle during `npm run build`. Export just copies pre-built artifacts.

### Anti-Pattern 4: Embedding Assets in HTML/JS

**What:** Base64-encoding all assets and embedding them in a single HTML file.
**Why bad:** Massive file sizes (base64 adds ~33% overhead). Browser memory issues. Can't stream/lazy-load. itch.io has file size limits.
**Instead:** Standard folder structure with relative paths. Browsers are optimized for this pattern.

## Scalability Considerations

| Concern | Small Game (< 50 MB) | Medium Game (50-200 MB) | Large Game (200+ MB) |
|---------|----------------------|--------------------------|----------------------|
| Export speed | Instant (< 2s) | 5-15s (file copying) | 15-60s (many large files) |
| ZIP creation | `zipSync` fine | `zip()` async recommended | Streaming `Zip` class needed |
| localStorage saves | Plenty of room | Fine (save state is small) | Fine (save state is small) |
| Browser loading | Fast | Acceptable | May need loading indicator |
| itch.io upload | Easy | Within limits | May exceed free tier limits |

## Sources

- Engine source: `src/main.js` (893 lines, all modes analyzed)
- IPC patterns: `electron/main.js` (29 existing handlers)
- Save system: `src/engine/SaveManager.js` (8 async IPC methods)
- Theme system: `src/engine/ThemeManager.js` + `src/utils/themePackager.js`
- Build output: `dist/index.html`, `dist/assets/` (direct inspection)
- Asset path format: `docs/script-format.md` (relative paths confirmed)
