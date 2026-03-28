# Technology Stack

**Analysis Date:** 2025-07-13

## Languages

**Primary:**
- JavaScript (ES2022+, ES Modules) - All source code across engine, editor, and Electron main process

**Secondary:**
- CSS3 - Extensive custom styling for both runtime engine and editor UI
- HTML - Two entry points (`index.html`, `editor.html`)
- JSON - Game script format (`script.json`), project metadata (`project.json`)

**No TypeScript** — the entire codebase uses plain JavaScript with JSDoc annotations for type hints.

## Runtime

**Environment:**
- Node.js v24.13.1 (local development)
- Electron v41.0.4 (desktop runtime — Chromium-based)

**Package Manager:**
- npm v11.11.1
- Lockfile: `package-lock.json` present (lockfileVersion 3)

**Module System:**
- ES Modules throughout (`"type": "module"` in `package.json`)
- All imports use `.js` extensions explicitly

## Frameworks

**Core:**
- Vue 3 `^3.5.31` - Editor UI only (`src/editor/`). The runtime engine does NOT use Vue.
- Pinia `^3.0.4` - State management for editor (stores in `src/editor/stores/`)
- Electron `^41.0.4` - Desktop application shell, IPC-based project management

**Build/Dev:**
- Vite `^6.3.0` - Build tool and dev server
- `@vitejs/plugin-vue` `^6.0.5` - Vue SFC compilation
- `vite-plugin-electron` `^0.29.1` - Electron main process bundling
- `vite-plugin-electron-renderer` `^0.14.6` - Electron renderer process support

**Testing:**
- None detected. No test framework, no test files, no test configuration.

## Key Dependencies

**Critical (runtime):**
- `vue` `^3.5.31` - Powers the entire editor UI (SFC components with `<script setup>`)
- `pinia` `^3.0.4` - Two stores: `useProjectStore` (`src/editor/stores/project.js`) and `useScriptStore` (`src/editor/stores/script.js`)

**Critical (dev):**
- `electron` `^41.0.4` - Desktop shell; main process at `electron/main.js`, preload at `electron/preload.js`
- `vite` `^6.3.0` - Build tool; config at `vite.config.js`
- `vite-plugin-electron` `^0.29.1` - Bridges Vite and Electron build

**Zero external utility libraries** — no lodash, no axios, no UI component library. Everything is custom-built.

## Architecture: Two Distinct Applications

This project contains **two separate applications** bundled together:

1. **Runtime Engine** (vanilla JS) - Entry: `index.html` → `src/main.js`
   - Pure JavaScript classes with DOM manipulation
   - No framework dependency
   - Custom `EventEmitter` (`src/engine/EventEmitter.js`)
   - Loads game scripts via `fetch()` from JSON

2. **Editor** (Vue 3 SPA) - Entry: `editor.html` → `src/editor/main.js`
   - Vue 3 with Composition API (`<script setup>`)
   - Pinia stores for state management
   - Communicates with Electron main process via `window.ipcRenderer`

Both are served/built by Vite as a multi-page application.

## Configuration

**Vite Build (multi-page):**
- Config: `vite.config.js`
- Two HTML entry points via `build.rollupOptions.input`:
  - `game`: `index.html` (runtime engine)
  - `editor`: `editor.html` (Vue editor)
- Dev server on port 3000, auto-open disabled
- Electron plugin configured with main entry `electron/main.js` and preload `electron/preload.js`

**Electron:**
- Main process: `electron/main.js`
- Preload script: `electron/preload.js`
- Main output: `dist-electron/main.js`
- Context isolation enabled via `contextBridge.exposeInMainWorld`
- Custom `asset://` protocol for loading project files securely

**Environment Variables (set at runtime by Electron):**
- `APP_ROOT` - Set to project root in `electron/main.js`
- `VITE_DEV_SERVER_URL` - Used to detect dev vs production mode
- `VITE_PUBLIC` - Points to public assets directory

**No `.env` files present.** No external API keys or secrets required.

**No linting/formatting tools configured** — no ESLint, Prettier, Biome, or similar.

**No TypeScript config** — no `tsconfig.json`.

## Platform Requirements

**Development:**
- Node.js >= 18 (using v24 locally)
- npm (using v11)
- Windows/macOS/Linux (Electron cross-platform)
- No native dependencies detected

**Production:**
- Electron desktop app (packaged with `dist-electron/`)
- No web deployment target (Electron-only)
- No packaging tool configured yet (no electron-builder, electron-forge, etc.)

## Build Commands

```bash
npm run dev       # Start Vite dev server + Electron (hot reload)
npm run build     # Production build (Vite + Electron)
npm run preview   # Preview production build
```

## External Fonts

- Google Fonts loaded via CSS `@import` in `src/style.css`:
  - `Noto Sans SC` (weights: 300, 400, 500, 700)
  - `Noto Serif SC` (weights: 400, 600, 700)
- These are loaded at runtime from `fonts.googleapis.com` — requires internet on first load

## Data Format

**Game scripts** use a custom JSON format defined in `docs/script-format.md`:
- `meta` — title, version, author, resolution
- `characters` — keyed by ID, with name, color, and expression image paths
- `scenes` — keyed by scene ID, each containing an array of commands
- `ui` — optional custom UI layouts (e.g., title screen)

**Project files** (Electron-managed):
- `project.json` — project metadata (name, author, resolution, timestamps)
- `script.json` — game script data
- `assets/` — subdirectories: `backgrounds/`, `characters/`, `audio/`, `ui/`

---

*Stack analysis: 2025-07-13*
