# Technology Stack — Electron Desktop Export Additions

**Project:** Galgame Maker v0.8 — Electron Desktop Game Export
**Researched:** 2025-07-23
**Scope:** Only NEW capabilities needed for desktop game export. Existing stack (Electron 41, Vue 3, Pinia, Vite 6.3, fflate 0.8.2, vite-plugin-electron) is validated and not re-evaluated.

## Executive Summary

**Two new devDependencies are needed:** `@electron/packager` for Electron app packaging and `png-to-ico` for icon conversion. Everything else — Vite web engine build, Node.js fs operations, fflate for optional ZIP — is already in the stack.

The core insight: the existing v0.7 web export pipeline (scanAssets → Vite build → engine copy → asset copy → HTML gen) provides 70% of the desktop export flow. The new work is: (1) generating a minimal Electron main.js/preload.js/package.json for the game, (2) staging these into a temp directory, and (3) running `@electron/packager` programmatically to produce the final .exe directory.

## Recommended Stack Changes

### 1. @electron/packager — Electron App Packaging

| Item | Value |
|------|-------|
| **Technology** | @electron/packager |
| **Version** | ^19.1.0 |
| **Purpose** | Package staged game directory into standalone .exe |
| **Install** | devDependency (only used during export in editor's main process) |
| **Confidence** | HIGH — verified API, version, release date via npm registry |

**Why this tool:**
- Simplest programmatic API: `await packager(opts)` → returns output paths
- Default output is a portable directory with .exe (exactly "绿色免安装")
- Built-in .ico icon embedding via `resedit` (no external tools needed for .exe icon)
- Built-in ASAR packaging with `asarUnpack` glob patterns
- Downloads and caches Electron binaries automatically (`@electron/get`)
- Official Electron team project, actively maintained (last release: March 2026)
- Pure JavaScript — no Go binary or native compilation needed
- See COMPARISON.md for full analysis vs electron-builder and @electron-forge

**Key API surface we'll use:**
```js
import packager from '@electron/packager';

const outputPaths = await packager({
  dir: stagingDir,               // temp dir with game app structure
  out: userChosenOutputDir,      // final output location
  name: gameTitle,               // app name
  platform: 'win32',
  arch: 'x64',
  electronVersion: '41.2.0',    // pin to same major as editor
  executableName: gameTitle,     // rename .exe from "electron" to game title
  icon: icoPath,                 // path to .ico file
  asar: {
    unpack: '{assets/**,script.json}',
  },
  overwrite: true,
  prune: false,                  // game app has no node_modules
  ignore: [/\.gitignore/],
});
// outputPaths[0] → "C:/Users/.../MyGame-win32-x64/"
```

**ASAR strategy:**
- `asar: true` → packs main.js, preload.js, index.html, engine.js, engine.css into app.asar
- `asarUnpack: '{assets/**,script.json}'` → keeps large binary assets (images, audio, fonts) and script.json outside the ASAR archive as `app.asar.unpacked/`
- Why unpack assets: ASAR is an archive format not optimized for random access of large binary files; Electron's `net.fetch` can read from both ASAR and filesystem, but large media files (100+ MB of images/audio) perform better unpacked
- Why unpack script.json: the game runtime reads it via fetch; keeping it accessible simplifies debugging

**Electron version pinning:**
- The editor runs Electron 41 (currently 41.2.0 is latest 41.x stable)
- The exported game should use the same major version for compatibility
- `electronVersion: '41.2.0'` pins explicitly; @electron/packager downloads and caches the binary via `@electron/get` on first use (~90 MB download, cached in `~/.electron/`)

### 2. png-to-ico — Icon Conversion

| Item | Value |
|------|-------|
| **Technology** | png-to-ico |
| **Version** | ^3.0.1 |
| **Purpose** | Convert user-provided PNG game icon to Windows .ico format |
| **Install** | devDependency |
| **Confidence** | HIGH — verified dependencies (pngjs only), pure JS |

**Why this tool:**
- Pure JavaScript (pngjs dependency only) — no native compilation, no sharp, no ImageMagick
- Tiny footprint: just pngjs + minimist
- Simple API: `pngToIco(pngBuffer)` → returns `.ico` Buffer
- Users will provide PNG icons (standard format) — the tool converts to multi-size .ico

**Why NOT require .ico from users:**
- .ico is a Windows-specific format most creators won't have
- Visual novel creators are artists, not Windows developers
- PNG → .ico conversion is lossless and trivial with this library
- Better UX: same PNG can be used for both web favicon and desktop icon

**Why NOT sharp:**
- sharp is ~30 MB with native libvips binary
- Requires node-gyp or prebuilt binaries for the correct platform
- Massive overkill for a single PNG → .ico conversion
- png-to-ico does exactly one thing and does it with zero native deps

**Usage in export pipeline:**
```js
import pngToIco from 'png-to-ico';
import fs from 'node:fs/promises';

const pngBuffer = await fs.readFile(userIconPath);
const icoBuffer = await pngToIco(pngBuffer);
const icoPath = path.join(stagingDir, 'icon.ico');
await fs.writeFile(icoPath, icoBuffer);
// Then pass icoPath to @electron/packager's icon option
```

### 3. Existing Stack Reuse (No New Dependencies)

| Technology | Version | Role in Desktop Export |
|------------|---------|----------------------|
| **Vite** | 6.3.0 (existing) | Build engine bundle via `vite.web.config.js` (same as web export) |
| **fflate** | 0.8.2 (existing) | Optional ZIP of final output directory |
| **Node.js fs/path** | Built-in | File staging, directory creation, asset copying |
| **scanAssets** | Existing module | Scan script.json for referenced asset paths |
| **exportGame.js** | Existing module | Reuse Steps 1-5 of web export pipeline |

**Critical reuse:** The existing `exportGame.js` handles Vite build, asset scanning, engine copy, asset copy, and HTML generation. Desktop export reuses Steps 1-4 identically, then diverges at Step 5+ (generates Electron main.js instead of standalone HTML, then runs packager).

## What NOT to Add

| Don't Add | Why Not |
|-----------|---------|
| **electron-builder** | Overkill — downloads Go binary, complex config, installer-focused (see COMPARISON.md) |
| **@electron-forge** | Designed to own project lifecycle, wraps @electron/packager internally |
| **sharp** | 30+ MB native binary for a task png-to-ico handles in pure JS |
| **electron-icon-maker** | v0.0.5 — abandoned, hasn't been updated |
| **NSIS / Inno Setup** | PROJECT.md explicitly states "绿色免安装" (no installer) |
| **@electron/rebuild** | No native modules in the game app |
| **electron-notarize** | macOS only, out of scope for v0.8 (Windows only) |
| **@electron/asar** (standalone) | @electron/packager includes ASAR support internally |
| **any Node.js-based image resizer** | png-to-ico handles the one conversion we need |

## Installation

```bash
# New devDependencies for v0.8
npm install -D @electron/packager@^19.1.0 png-to-ico@^3.0.1
```

No changes to production dependencies. Both tools run only in the editor's main process during export.

## Integration Points

### Build Pipeline (Unchanged)

```
npm run dev         → existing Electron dev server
npm run build       → existing Electron production build
npm run build:web   → existing web engine build (reused for desktop export too)
```

The desktop export reuses `dist-web/` output (engine.js + engine.css) — same artifacts the web export uses. No new build scripts needed.

### Export Flow (New: Desktop Path)

```
Editor UI (renderer)
  → ipcRenderer.invoke('export-game', { ...opts, format: 'desktop' })
    → electron/main.js handler
      → Step 1: Vite build (reuse existing, produces dist-web/)
      → Step 2: scanAssets (reuse existing)
      → Step 3: Create staging directory (temp dir)
        → Generate package.json (minimal: name + main + version)
        → Generate main.js (minimal: window + asset:// protocol + save IPC)
        → Generate preload.js (save/load IPC channels only)
        → Copy engine.js, engine.css, index.html from dist-web/
        → Copy script.json from project
        → Copy referenced assets to staging/assets/
      → Step 4: Convert PNG icon to .ico (png-to-ico)
      → Step 5: Run @electron/packager programmatically
        → Downloads Electron binary (cached after first use)
        → Packages staging dir → output/GameTitle-win32-x64/
      → Step 6: Clean up staging directory
      → Step 7: Optional ZIP of output
    ← { success, outputPath, zipPath, warnings }
```

### What the Export Produces

```
GameTitle-win32-x64/
  GameTitle.exe              ← renamed Electron binary with custom icon
  resources/
    app.asar                 ← packed: main.js, preload.js, index.html, engine.js, engine.css
    app.asar.unpacked/       ← unpacked large assets
      assets/
        backgrounds/         ← only referenced files
        characters/
        audio/
        fonts/
        voices/
      script.json
  *.dll                      ← Electron runtime DLLs
  LICENSE, LICENSES.chromium.html  ← Chromium licenses (required)
```

**Total package size estimate:** ~180-250 MB base (Electron + Chromium) + game assets. This is the standard Electron app size — unavoidable with embedded Chromium.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Packaging tool | @electron/packager | electron-builder | Overkill, Go binary, installer-focused |
| Packaging tool | @electron/packager | @electron-forge | Wraps packager, lifecycle-focused |
| Icon conversion | png-to-ico | sharp | 30 MB native binary vs 50 KB pure JS |
| Icon conversion | png-to-ico | require .ico from user | Bad UX for visual novel creators |
| ASAR | Mixed (code=ASAR, assets=unpacked) | All ASAR | Large binary files slow in ASAR |
| ASAR | Mixed | No ASAR | Exposes source code, slightly larger |

## Version Summary

| Technology | Version | Status | Role in v0.8 |
|------------|---------|--------|--------------|
| @electron/packager | ^19.1.0 | **NEW devDep** | Core packaging tool |
| png-to-ico | ^3.0.1 | **NEW devDep** | PNG → .ico conversion |
| Vite | 6.3.0 | Existing | Build web engine bundle (reused) |
| fflate | 0.8.2 | Existing | Optional ZIP of output |
| Electron | 41.2.0 | Existing (editor) / target version (game) | Runtime for exported game |

**Total new npm dependencies: 2 (devDependencies only)**

## Sources

- npm registry: `@electron/packager@19.1.0` — version, API, dependencies, resedit integration (HIGH confidence)
- npm registry: `electron-builder@26.8.2` — version, app-builder-lib dependency (HIGH confidence)
- npm registry: `@electron-forge/cli@7.11.1` — version, architecture (HIGH confidence)
- npm registry: `png-to-ico@3.0.1` — version, dependencies (pngjs only), pure JS (HIGH confidence)
- npm registry: `@electron/asar@4.2.0` — createPackage API, unpack options (HIGH confidence)
- npm registry: `resedit@3.0.2` — Windows PE resource editing, icon embedding (HIGH confidence)
- npm registry: `@electron/get@4.0.3` — Electron binary download/caching (HIGH confidence)
- Electron 41.x versions: 41.0.0 through 41.2.0 verified via npm registry (HIGH confidence)
- Project source: `electron/exportGame.js` — existing 6-step pipeline, scanAssets integration (HIGH confidence)
- Project source: `electron/main.js` — asset:// protocol, IPC handlers, window creation (HIGH confidence)
- Project source: `src/engine/assetPath.js` — 3-way environment detection, BASE_PATH logic (HIGH confidence)
- Project source: `src/engine/SaveManager.js` — IPC-based save/load API surface (HIGH confidence)
