# Research Summary: Galgame Maker v0.7 — Web Static Bundle Export

**Domain:** Visual novel creator → game export/deployment
**Researched:** 2025-07-22
**Overall confidence:** HIGH

## Executive Summary

Web static bundle export for Galgame Maker requires **zero new npm dependencies**. The existing stack (Vite 6.3 for bundling, fflate 0.8.2 for ZIP, Node.js built-ins for file operations) covers every capability needed. The primary work is engine runtime adaptation, not tooling.

The engine runtime (`src/main.js` + `src/engine/` + `src/ui/` + `src/style.css`) is pure JavaScript with no framework dependencies. Vite already builds it into a standalone web bundle as part of `npm run build`. The Electron-specific code (`SaveManager` IPC calls, `asset://` protocol) is cleanly isolated — most already guarded with `if (window.ipcRenderer)` checks. Only `SaveManager` needs a full web fallback class (~80 lines using localStorage).

The most important architectural finding: **asset paths in script.json are already relative** (e.g., `backgrounds/city.png`). The engine prepends a `basePath` at runtime (`/game/` in Electron, `asset://` in preview). For web export, this changes to `assets/` — no script.json rewriting needed. The export copies the project's asset files into an `output/assets/` directory maintaining their structure.

The nineSlice theme images (the one area that could complicate path rewriting) are stored as `data:` base64 URLs in script.json, not as file references. They're completely self-contained and need no export handling.

## Key Findings

**Stack:** Zero new dependencies — Vite builds the engine, fflate creates ZIPs, Node.js fs copies files.
**Architecture:** Three-mode engine (Electron/Preview/Web) with basePath abstraction; export is a main-process IPC handler.
**Critical pitfall:** SaveManager's 8 async methods ALL use `window.ipcRenderer.invoke()` — the web fallback must implement the full interface or the game crashes on any save/load interaction.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Engine Web Adaptation** — Make the runtime browser-independent
   - Addresses: Environment detection, basePath parameterization, WebSaveManager
   - Avoids: Building export features on top of a broken runtime
   - Rationale: Must work first before export can produce functional output

2. **Asset Reference Scanning** — Identify which project files are actually used
   - Addresses: Smart resource cleanup (only copy referenced assets)
   - Avoids: Copying entire project directory (wastes space, includes unused assets)
   - Rationale: Needed before file copying; the scanner is a reusable utility

3. **Export Pipeline** — IPC handler + HTML template + file copying
   - Addresses: Core export feature, directory structure generation
   - Avoids: Premature UI work before the pipeline is proven
   - Rationale: Backend must work before UI; test with IPC calls first

4. **Export UI** — Editor panel with options (title, favicon, output dir, ZIP toggle)
   - Addresses: User-facing export workflow
   - Avoids: Over-designing before the pipeline is solid
   - Rationale: Thin UI layer on top of working IPC

5. **ZIP Packaging + Polish** — Optional ZIP output, progress feedback, error handling
   - Addresses: itch.io upload workflow, user experience
   - Avoids: Complexity in early phases
   - Rationale: ZIP is additive; works on top of the folder export

**Phase ordering rationale:**
- Phase 1 MUST come first — all other phases depend on a working web runtime
- Phase 2 before 3 because the scanner is used by the export pipeline
- Phase 3 before 4 because the UI needs a working backend to call
- Phase 5 is independent additive work that layers on top

**Research flags for phases:**
- Phase 1: Needs care with SaveManager interface compatibility — test all 8 methods
- Phase 2: Straightforward JSON traversal — standard patterns, unlikely to need research
- Phase 3: Standard file I/O — standard patterns, unlikely to need research
- Phase 5: fflate's async `zip()` in Electron main process — verify worker_threads behavior

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified via direct code inspection; zero new deps |
| Features | HIGH | Scope is well-defined in PROJECT.md; all entry points identified |
| Architecture | HIGH | Engine source fully analyzed; basePath pattern, IPC inventory, asset paths all traced |
| Pitfalls | HIGH | Every `window.ipcRenderer` usage found; hardcoded `asset://` locations identified |

## Gaps to Address

- **Google Fonts offline bundling** — Engine CSS imports Noto Sans/Serif SC from Google Fonts CDN. Web exports require internet for default fonts. Offline bundling is non-trivial (download + rewrite @font-face). Deferred to future milestone.
- **localStorage quota for WebSaveManager** — 5-10 MB limit may be insufficient if games have very large state. Monitor during testing; IndexedDB upgrade path available if needed.
- **fflate async behavior in Electron main process** — Needs verification whether `zip()` uses `worker_threads` in Electron's Node context. If not, `zipSync` with progress reporting via IPC events is the fallback.
- **Pre-built engine caching during dev** — The web engine bundle (`dist-web-engine/`) must exist before export can run. Need to ensure the build pipeline produces it at the right time.
