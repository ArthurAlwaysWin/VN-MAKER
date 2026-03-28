# Architecture

**Analysis Date:** 2025-07-17

## Pattern Overview

**Overall:** Dual-application Electron desktop app with a two-process architecture (main + renderer). The project ships two distinct renderer applications—a **Visual Novel Editor** (Vue 3 SPA) and a **Runtime Game Engine** (vanilla JS)—coordinated through Electron's IPC bridge.

**Key Characteristics:**
- Electron main process manages project files, windows, dialogs, and a custom `asset://` protocol
- Editor is a Vue 3 + Pinia SPA loaded in the primary BrowserWindow (`editor.html`)
- Runtime engine is a vanilla JavaScript application loaded in a separate preview BrowserWindow (`index.html`)
- JSON-based game script format (`script.json`) is the central data model shared between editor and engine
- Event-driven engine architecture using a custom `EventEmitter` to decouple script interpretation from UI rendering
- IPC-based file I/O — the renderer never touches the filesystem directly; all reads/writes go through `ipcRenderer.invoke()`

## Layers

**Electron Main Process:**
- Purpose: Application lifecycle, window management, file I/O, native dialogs, security enforcement
- Location: `electron/main.js`
- Contains: IPC handlers (`create-project`, `open-project`, `load-project`, `save-project`, `upload-asset`, `read-dir`, `show-save-dialog`, `dialog-open-directory`, `open-preview`, `close-project`, `get-recent-projects`, `update-recent-projects`), custom `asset://` protocol handler, recent projects persistence, atomic file writes, path security validation
- Depends on: Electron APIs (`app`, `BrowserWindow`, `ipcMain`, `protocol`, `net`, `dialog`), Node.js `fs`, `path`
- Used by: Editor (Vue) via preload bridge, Runtime engine via preview window

**Electron Preload:**
- Purpose: Exposes a safe subset of `ipcRenderer` to renderer processes via `contextBridge`
- Location: `electron/preload.js`
- Contains: `send`, `invoke`, `on` method proxies
- Depends on: Electron `ipcRenderer`, `contextBridge`
- Used by: Editor renderer (as `window.ipcRenderer`)

**Editor Application (Vue 3 SPA):**
- Purpose: Visual authoring tool for creating/editing visual novel projects
- Location: `src/editor/`
- Contains: Vue components, Pinia stores, composables, views
- Depends on: Vue 3, Pinia, `window.ipcRenderer` (preload bridge)
- Used by: End users (game creators)

**Runtime Game Engine:**
- Purpose: Plays visual novel games by interpreting `script.json`
- Location: `src/engine/` (core), `src/ui/` (rendering), `src/main.js` (wiring)
- Contains: ScriptEngine, AudioManager, SaveManager, ConfigManager, UI components
- Depends on: Browser APIs (DOM, Audio, localStorage, fetch)
- Used by: End users (game players), Editor preview window

**Game Data Layer:**
- Purpose: JSON-based game project format
- Location: On-disk project directories (created by main process)
- Contains: `project.json` (metadata), `script.json` (game content), `assets/` (media files)
- Depends on: Nothing (pure data)
- Used by: Both editor and runtime engine

## Data Flow

**Editor → Save Project to Disk:**

1. User edits script data in Vue editor views (modifies `script.data` in Pinia store)
2. Deep watcher on `script.data` in `src/editor/App.vue` debounces (2s) and calls `project.saveProject(script.data)`
3. `useProjectStore.saveProject()` at `src/editor/stores/project.js` calls `window.ipcRenderer.invoke('save-project', { project, script })`
4. Main process handler at `electron/main.js` receives data, performs atomic write to `project.json` and `script.json` on disk
5. `isDirty` flag cleared on success

**Editor → Preview Game:**

1. User clicks "▶ 预览" button in `src/editor/App.vue`
2. Calls `window.ipcRenderer.invoke('open-preview', project.projectPath)`
3. Main process creates a new `BrowserWindow` loading `index.html` with `?project=<path>` parameter
4. Runtime engine at `src/main.js` initializes and loads `script.json` via fetch
5. Assets resolve through the custom `asset://` protocol registered in main process

**Runtime Engine Command Execution:**

1. `ScriptEngine.startGame('start')` enters a scene, sets `commandIndex = 0`
2. `_executeCurrentCommand()` reads the command at current index from `script.json` scene data
3. For blocking commands (dialogue, choice): sets `waiting = true`, emits event, pauses
4. For non-blocking commands (show_character, set_background, play_bgm): emits event, auto-advances to next command
5. UI modules (DialogueBox, CharacterLayer, etc.) listen for events and update the DOM
6. User input (click/tap) calls `engine.next()` which increments `commandIndex` and continues

**State Management:**
- **Editor state**: Pinia stores — `useProjectStore` (project metadata, file paths, dirty flag) and `useScriptStore` (script data, undo/redo history with JSON snapshot approach, max 50 entries)
- **Runtime game state**: Engine instance variables (`currentScene`, `commandIndex`, `variables` Map, `history` array); persisted via `SaveManager` to `localStorage` (8 save slots)
- **Runtime user config**: `ConfigManager` persists volume/speed settings to `localStorage`

## Key Abstractions

**ScriptEngine (Event-Driven Interpreter):**
- Purpose: Interprets JSON game scripts command-by-command, emitting events for each command type
- Location: `src/engine/ScriptEngine.js`
- Pattern: Extends `EventEmitter` (`src/engine/EventEmitter.js`). State machine with `waiting` and `ended` flags. Commands are a flat array per scene, executed sequentially.
- Events: `dialogue`, `show_character`, `hide_character`, `set_expression`, `set_background`, `play_bgm`, `stop_bgm`, `play_se`, `choice`, `end`, `scene_enter`

**UI Components (Imperative DOM Classes):**
- Purpose: Render visual novel UI elements by manipulating DOM directly
- Examples: `src/ui/DialogueBox.js`, `src/ui/CharacterLayer.js`, `src/ui/BackgroundLayer.js`, `src/ui/ChoiceMenu.js`, `src/ui/TitleScreen.js`, `src/ui/GameMenu.js`, `src/ui/SaveLoadScreen.js`, `src/ui/BacklogScreen.js`, `src/ui/SettingsScreen.js`
- Pattern: Each class receives a container DOM element, creates its own DOM subtree, exposes `show()`/`hide()` methods and callback properties (`onAdvance`, `onSelect`, etc.)

**Pinia Stores (Reactive State Containers):**
- Purpose: Centralized reactive state for the editor application
- Examples: `src/editor/stores/project.js` (project metadata & IPC calls), `src/editor/stores/script.js` (script data & undo/redo)
- Pattern: Composition API style (`defineStore` with setup function), expose refs and async functions

**Canvas State Composable:**
- Purpose: Computes visual scene state at a given command index by replaying commands — powers the canvas preview in the editor
- Location: `src/editor/composables/useCanvasState.js`
- Pattern: Vue `computed` that replays commands 0..N to derive background, characters, dialogue, and choice state

**Sanitization Utilities:**
- Purpose: Prevent CSS injection from user-provided style values in game scripts
- Location: `src/ui/sanitize.js`
- Pattern: `sanitizeCssValue()` rejects strings with injection patterns; `clampField()` constrains numeric values to predefined bounds for a 1280×720 canvas

## Entry Points

**Electron Main Process:**
- Location: `electron/main.js`
- Triggers: `app.whenReady()` → creates main window loading `editor.html`
- Responsibilities: Window lifecycle, IPC handler registration, `asset://` protocol registration, recent projects management, file I/O with path security

**Runtime Engine (Game Player):**
- Location: `src/main.js` (loaded by `index.html`)
- Triggers: Direct module execution; calls `init()` at bottom of file
- Responsibilities: Instantiates all engine modules and UI components, wires event handlers between engine and UI, manages auto/skip modes, keyboard shortcuts, title screen flow

**Editor Application (Vue SPA):**
- Location: `src/editor/main.js` (loaded by `editor.html`)
- Triggers: `createApp(App).use(createPinia()).mount('#app')`
- Responsibilities: Bootstrap Vue app with Pinia, mount root component `src/editor/App.vue`

**Editor Root Component:**
- Location: `src/editor/App.vue`
- Triggers: Vue mount
- Responsibilities: State machine (`welcome` / `editing` views), tab routing (Scenes, TitleDesigner, SettingsDesigner, Assets, Characters, ProjectSettings), keyboard shortcuts (Ctrl+Z/Y/S), auto-save watcher, Electron close handler integration

**HTML Entry Points:**
- `index.html` — Runtime engine; defines layered DOM structure (`#background-layer`, `#character-layer`, `#dialogue-layer`, `#ui-overlay`)
- `editor.html` — Editor; minimal shell with `<div id="app">` mount point

## Error Handling

**Strategy:** Defensive try/catch with error propagation through IPC result objects

**Patterns:**
- Main process IPC handlers return `{ success: boolean, error?: string }` objects — never throw across IPC boundary (`electron/main.js` lines 81-130, 150-205, 207-218)
- Runtime engine uses `console.error` / `console.warn` for non-fatal errors (missing scenes, unknown command types) at `src/engine/ScriptEngine.js`
- Editor shows `alert()` for failed project operations at `src/editor/App.vue` line 163
- Audio playback uses `.catch(() => {})` to silently handle autoplay restrictions at `src/engine/AudioManager.js`
- Runtime init failure displays an inline error message in the game container at `src/main.js` lines 432-438

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.warn` / `console.error` throughout. Engine prefixes messages with `[ScriptEngine]`, `[GalgameMaker]`, `[Scene]`. No structured logging framework.

**Validation:** CSS injection prevention via `src/ui/sanitize.js` (`sanitizeCssValue`, `clampField`). Path traversal prevention via `isInsideProject()` in `electron/main.js`. Project name sanitization via `sanitizeProjectName()`.

**Authentication:** Not applicable (local desktop application).

**Security Model:**
- `electron/preload.js` uses `contextBridge` to expose a limited IPC API (no direct Node.js access in renderer)
- Custom `asset://` protocol validates that resolved file paths stay within the project's `assets/` directory
- `isInsideProject()` check on `read-dir` and file operations prevents path traversal
- CSS sanitization prevents injection from user-authored script style values

**Internationalization:** UI strings are in Chinese (Simplified). No i18n framework — strings are hardcoded in templates and JS.

---

*Architecture analysis: 2025-07-17*
