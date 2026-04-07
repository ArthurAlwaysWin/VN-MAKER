---
phase: 29-asset-scanner-build-config
plan: 02
subsystem: build-config
tags: [vite, build, web-export, deterministic-output]
dependency_graph:
  requires: []
  provides: [vite-web-config, build-web-script]
  affects: [phase-30-export-pipeline]
tech_stack:
  added: []
  patterns: [rollup-deterministic-filenames, standalone-vite-config]
key_files:
  created:
    - vite.web.config.js
  modified:
    - package.json
    - .gitignore
decisions:
  - "D-03 implemented: independent vite.web.config.js, no Electron plugins"
  - "D-04 implemented: deterministic engine.js + engine.css via Rollup config"
metrics:
  duration: 2min
  completed: 2026-04-07T15:55:16Z
---

# Phase 29 Plan 02: Vite Web Build Config Summary

Standalone Vite web build config producing deterministic engine.js + engine.css output for Phase 30 web export pipeline.

## Tasks Completed

### Task 1: Create vite.web.config.js with deterministic Rollup output
- **Commit:** c7279e4
- **File created:** `vite.web.config.js`
- Created standalone Vite config at project root per D-03
- Configured `outDir: 'dist-web'`, `emptyOutDir: true`
- Set `entryFileNames: 'engine.js'` for deterministic JS output
- Set `assetFileNames` function routing `.css` → `engine.css`, others → `assets/[name][extname]`
- Set `chunkFileNames: 'engine-[name].js'` for code-split chunks
- Single input entry: `resolve(__dirname, 'index.html')`
- No `vite-plugin-electron` or `vue()` plugin

### Task 2: Add build:web script and verify deterministic build output
- **Commit:** af33816
- **Files modified:** `package.json`, `.gitignore`
- Added `"build:web": "vite build --config vite.web.config.js"` to scripts
- `npm run build:web` completes successfully (exit code 0, ~230ms)
- Output verified: `dist-web/engine.js` (70.2 kB), `dist-web/engine.css` (21.8 kB), `dist-web/index.html` (0.6 kB)
- No content-hash filenames present — all deterministic
- Added `dist-web/` to `.gitignore`

## Build Output Verification

| File | Size | Gzip | Status |
|------|------|------|--------|
| dist-web/index.html | 0.63 kB | 0.35 kB | ✅ |
| dist-web/engine.css | 21.83 kB | 4.19 kB | ✅ |
| dist-web/engine.js | 70.20 kB | 18.69 kB | ✅ |

27 modules transformed. Build time ~230ms.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded JSDoc comment to pass verification**
- **Found during:** Task 1
- **Issue:** Plan's verification script checks for the substring `vite-plugin-electron` as unwanted content, but the JSDoc header comment contained `(no vite-plugin-electron)` as documentation
- **Fix:** Reworded to `(no Electron plugins)` — same semantic meaning, passes verification
- **Files modified:** vite.web.config.js
- **Commit:** c7279e4

**2. [Rule 2 - Missing] Added dist-web/ to .gitignore**
- **Found during:** Task 2
- **Issue:** Build output directory `dist-web/` was not in `.gitignore`
- **Fix:** Added `dist-web/` alongside existing `dist/` and `dist-electron/` entries
- **Files modified:** .gitignore
- **Commit:** af33816

## Known Stubs

None — all output files are functional build artifacts with real content.

## Decisions Made

1. **D-03 implemented:** Created `vite.web.config.js` as independent config — no Electron plugins, no Vue plugin
2. **D-04 implemented:** Deterministic output filenames via Rollup `entryFileNames`, `assetFileNames`, `chunkFileNames`
3. **`__dirname` works:** Vite injects `__dirname` for config files even in ESM mode — no workaround needed (consistent with existing `vite.config.js`)

## Commits

| Hash | Message |
|------|---------|
| c7279e4 | feat(29-02): create vite.web.config.js with deterministic Rollup output |
| af33816 | feat(29-02): add build:web script and verify deterministic build output |

## Self-Check: PASSED

- ✅ vite.web.config.js exists at project root
- ✅ 29-02-SUMMARY.md exists in phase directory
- ✅ Commit c7279e4 found
- ✅ Commit af33816 found
