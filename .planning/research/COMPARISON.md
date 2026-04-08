# Comparison: @electron/packager vs electron-builder vs @electron-forge

**Context:** Choosing a tool to programmatically package standalone Electron game .exe from within the Galgame Maker editor at runtime.
**Recommendation:** **@electron/packager** because it's the simplest programmatic API for our exact use case (directory → portable app), with built-in ASAR and icon support, no installer overhead.

## Critical Context: Unusual Use Case

This is NOT a typical "package my Electron app" scenario. We are:
1. Running inside an **existing** Electron app (the editor)
2. Programmatically packaging a **different** app (the game) at export time
3. Generating a minimal Electron main.js + preload.js on-the-fly
4. Copying in pre-built engine + user assets
5. Outputting a portable directory with .exe (no installer)

This constrains tool choice heavily — we need a **library API**, not a CLI build tool.

## Quick Comparison

| Criterion | @electron/packager | electron-builder | @electron-forge |
|-----------|-------------------|------------------|-----------------|
| **Latest version** | 19.1.0 (Mar 2026) | 26.8.2 (Mar 2026) | 7.11.1 / 8.0.0-alpha.6 |
| **Programmatic API** | ✅ Simple `packager(opts)` | ⚠️ Possible but complex | ❌ Designed as CLI/config |
| **Portable output (no installer)** | ✅ Default behavior | ⚠️ `--dir` flag (secondary) | ⚠️ Via maker config |
| **Icon embedding (.ico)** | ✅ Built-in via resedit | ✅ Built-in | ✅ Via packager internally |
| **ASAR support** | ✅ `asar: true` option | ✅ Built-in | ✅ Via packager internally |
| **ASAR unpack patterns** | ✅ `asarUnpack` glob | ✅ Same | ✅ Same |
| **Install weight** | ~20 deps, pure JS | ~50+ deps, Go binary | ~100+ deps, wraps packager |
| **External binaries** | None | app-builder (Go) | None (but heavier node_modules) |
| **Config complexity** | Single options object | YAML/JSON config file | forge.config.js + plugins |
| **Maintainer** | Electron team (official) | Community (electron-userland) | Electron team (official) |
| **Runtime packaging** | ✅ Designed for this | ⚠️ Not designed for this | ❌ Not designed for this |
| **Windows .exe renaming** | ✅ `executableName` option | ✅ `productName` | ✅ Via packager |
| **Electron binary download** | ✅ @electron/get (cached) | ✅ Own downloader | ✅ Via @electron/get |

## Detailed Analysis

### @electron/packager v19.1.0

**Strengths:**
- Dead-simple programmatic API: `const paths = await packager(opts)`
- Returns array of output paths — easy to integrate with export pipeline
- Default output IS a portable directory (exactly what v0.8 needs)
- Built-in `icon` option uses `resedit` to embed .ico into .exe on any host OS
- Built-in ASAR with `asarUnpack` for keeping large assets outside archive
- Downloads and caches Electron binaries automatically via `@electron/get`
- No external binaries or Go toolchain needed
- Actively maintained by the Electron core team
- `ignore` option (regex) to exclude files from the package
- `prune` option to strip devDependencies automatically

**Weaknesses:**
- No installer creation (NSIS, MSI, etc.) — not needed per PROJECT.md
- No auto-update support — not needed
- No code signing built-in for Windows — available but not needed for v0.8

**Best for:** Our exact use case — programmatic packaging of a minimal app into a portable directory.

**Usage pattern for our case:**
```js
import packager from '@electron/packager';

const outputPaths = await packager({
  dir: stagingDir,          // prepared game app directory
  out: outputDir,           // where to write the packaged app
  platform: 'win32',
  arch: 'x64',
  executableName: gameTitle,
  icon: icoPath,            // .ico file path
  asar: {
    unpack: '{assets/**,script.json}',  // keep large assets outside ASAR
  },
  overwrite: true,
  prune: false,             // no node_modules to prune in game app
});
```

### electron-builder v26.8.2

**Strengths:**
- Full build/package/publish pipeline
- Supports every installer format (NSIS, MSI, portable, squirrel, snap, etc.)
- Auto-update support built in
- Code signing support
- Well-documented, large community

**Weaknesses:**
- **Downloads app-builder Go binary** on install — additional ~30 MB binary dependency
- Complex configuration (electron-builder.yml / package.json `build` section)
- Designed for CLI usage and CI/CD pipelines, not runtime programmatic packaging
- The `--dir` mode (portable output) is a secondary use case
- Heavier dependency tree (~50+ packages)
- Its programmatic API (`build()`) requires config that assumes standard project structure
- Overkill: ~80% of features (NSIS, auto-update, publish) are explicitly out of scope

**Best for:** Projects needing installers, auto-update, or publishing to stores.

### @electron-forge v7.11.1

**Strengths:**
- Official Electron team recommendation for new projects
- Plugin-based architecture (extensible)
- Integrates with Electron's full lifecycle

**Weaknesses:**
- **Designed to own the entire project lifecycle** — `forge.config.js`, forge init, forge start, forge make
- Heavy setup: requires restructuring around forge conventions
- Internally wraps `@electron/packager` — adds abstraction layer over what we need directly
- Not designed for runtime programmatic packaging of a different app
- The "makers" concept (Squirrel, DMG, etc.) is wasted — we just need a directory
- v8.0.0 in alpha — API instability
- Would require creating a fake forge config for the game app

**Best for:** New Electron projects that want an opinionated, integrated toolchain.

## Recommendation

**Use @electron/packager v19.1.0** — it is the only tool designed for exactly what we need: take a directory containing an Electron app, download the right Electron binary, and output a standalone packaged application.

The decision matrix is clear:
1. We need **programmatic API** (not CLI) → packager wins
2. We need **portable directory output** (no installer) → packager's default
3. We need **icon embedding** → packager has it via resedit
4. We need **ASAR with selective unpacking** → packager has it
5. We need **minimal overhead** → packager is lightest
6. electron-forge wraps packager anyway → go direct

**Choose electron-builder when:** You need NSIS/MSI installers, auto-update (Squirrel/NSIS), or publishing to GitHub Releases / S3 / etc.

**Choose @electron-forge when:** Starting a new Electron project from scratch and want the official opinionated toolchain to manage your entire development lifecycle.

**Choose @electron/packager when:** You need programmatic control over packaging, want portable output, or (like us) are packaging a different app from within your app.

## Sources

- npm registry: `@electron/packager@19.1.0` — verified version, dependencies, release date (HIGH confidence)
- npm registry: `electron-builder@26.8.2` — verified version, dependencies (HIGH confidence)
- npm registry: `@electron-forge/cli@7.11.1` — verified version, release date (HIGH confidence)
- @electron/packager README — verified programmatic API, icon support, ASAR options (HIGH confidence)
- @electron/packager dependencies list — verified resedit for icon embedding (HIGH confidence)
- electron-builder dependencies — verified app-builder-lib, Go binary requirement (HIGH confidence)
