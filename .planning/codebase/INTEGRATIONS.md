# External Integrations

**Analysis Date:** 2025-07-13

## APIs & External Services

**None.** This is a fully offline desktop application. No external API calls, no cloud services, no network requests beyond Google Fonts.

**Google Fonts (runtime CSS):**
- Loaded via `@import url(...)` in `src/style.css`
- Fonts: `Noto Sans SC`, `Noto Serif SC`
- Required for runtime engine styling; editor uses system fonts
- Impact: First load requires internet; fonts are cached by browser after that

## Data Storage

**Databases:**
- None. No SQL, NoSQL, or any database.

**File Storage (Electron filesystem):**
- All project data stored as flat files on the user's local filesystem
- Managed via Node.js `fs/promises` in `electron/main.js`
- Project structure:
  ```
  <user-chosen-dir>/<project-name>/
  ├── project.json        # Project metadata
  ├── script.json         # Game script data
  └── assets/
      ├── backgrounds/    # Background images
      ├── characters/     # Character sprite images
      ├── audio/          # BGM and SE audio files
      └── ui/             # UI assets
  ```
- Atomic writes via temp+rename pattern: `atomicWrite()` in `electron/main.js` (lines 53-60)
- Path traversal protection: `isInsideProject()` in `electron/main.js` (lines 41-45)

**Browser localStorage (runtime engine):**
- `SaveManager` (`src/engine/SaveManager.js`) — game save slots (8 slots, keyed by `galgame-maker_save_{0-7}`)
- `ConfigManager` (`src/engine/ConfigManager.js`) — user settings (volume, text speed, auto speed, keyed by `galgame-maker-config`)

**Electron userData:**
- Recent projects list: `<app.getPath('userData')>/recent-projects.json`
- Managed by `readRecentProjects()` / `writeRecentProjects()` in `electron/main.js` (lines 13-37)

**Caching:**
- None beyond browser defaults

## Authentication & Identity

**Auth Provider:**
- None. No authentication, no user accounts. Fully local desktop application.

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, no error reporting service.

**Logs:**
- `console.log()` / `console.error()` / `console.warn()` only
- Engine logs prefixed with `[ScriptEngine]`, `[GalgameMaker]`, `[Scene]`, `[ConfigManager]`
- No structured logging, no log levels beyond console methods

## CI/CD & Deployment

**Hosting:**
- Not applicable — desktop application only

**CI Pipeline:**
- None detected. No GitHub Actions, no CI config files.

**App Packaging:**
- Not yet configured. No `electron-builder`, `electron-forge`, or similar packaging tool.
- Build output goes to `dist/` (renderer) and `dist-electron/` (main process)
- `dist-electron/` is committed (contains `main.js` and `preload.mjs`)

## IPC Communication (Electron Internal)

The editor (renderer process) communicates with the main process via Electron IPC. This is the primary integration boundary in the application.

**Preload Bridge:** `electron/preload.js`
- Exposes `window.ipcRenderer` with `send()`, `invoke()`, `on()` via `contextBridge`

**IPC Channels (all defined in `electron/main.js`):**

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `create-project` | renderer → main | Create new project directory with scaffold |
| `open-project` | renderer → main | Show native folder picker dialog |
| `load-project` | renderer → main | Load project.json + script.json from disk |
| `save-project` | renderer → main | Atomic write project + script to disk |
| `close-project` | renderer → main | Clear current project reference |
| `read-dir` | renderer → main | List files in a project subdirectory |
| `upload-asset` | renderer → main | Write binary asset file to project assets/ |
| `get-recent-projects` | renderer → main | Read recent projects list from userData |
| `update-recent-projects` | renderer → main | Write recent projects list to userData |
| `show-save-dialog` | renderer → main | Show native "unsaved changes" dialog |
| `dialog-open-directory` | renderer → main | Show native directory picker |
| `open-preview` | renderer → main | Open game preview in new BrowserWindow |

**Custom Protocol:**
- `asset://` protocol registered in `electron/main.js` (lines 361-373)
- Maps `asset://<path>` to `<project>/assets/<path>` (or `public/game/` as fallback)
- Includes path traversal protection (returns 403 for escaping paths)

## Environment Configuration

**Required env vars:**
- None required. All environment variables are set internally by the Electron main process:
  - `APP_ROOT` — project root, set at startup
  - `VITE_DEV_SERVER_URL` — auto-set by vite-plugin-electron during dev
  - `VITE_PUBLIC` — derived from APP_ROOT

**Secrets location:**
- No secrets. No API keys, no tokens, no credentials of any kind.

**`.env` files:**
- Listed in `.gitignore` but not present in the repository

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Window Management

**Main Window:**
- Editor window: 1280×800, loads `editor.html`
- Close handler with unsaved-changes protection (3-button dialog)

**Preview Window:**
- Game preview: 1280×720, loads `index.html` with project path query param
- Opened via `open-preview` IPC channel
- Singleton pattern (focuses existing window if already open)

## Summary

This is a **fully offline, self-contained desktop application** with zero external service dependencies. The only integration points are:

1. **Electron IPC** — renderer ↔ main process communication for file I/O
2. **Local filesystem** — project files read/written via Node.js `fs`
3. **Browser localStorage** — game saves and user config (runtime engine only)
4. **Google Fonts CDN** — CSS font loading (runtime engine styles only)

---

*Integration audit: 2025-07-13*
