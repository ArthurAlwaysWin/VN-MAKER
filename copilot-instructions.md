<!-- GSD:project-start source:PROJECT.md -->
## Project

**Galgame Maker — 视觉小说制作器**

可视化、无代码、PPT式拖拽的视觉小说制作器。让任何人都能制作自己的 Galgame，开发者专注于视觉页面设计，所有游戏逻辑由引擎内置。基于 Electron 桌面应用，内含 Vue 3 编辑器和纯 JavaScript 运行时引擎。

**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑。

### Constraints

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — 不迁移 TypeScript
- **Design**: 开发者不接触逻辑，所有设置组件逻辑引擎内置
- **Compatibility**: Windows 优先（当前开发环境），需兼容 macOS
- **Style**: 暗色主题，纯 CSS，中文界面
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ES2022+, ES Modules) - All source code across engine, editor, and Electron main process
- CSS3 - Extensive custom styling for both runtime engine and editor UI
- HTML - Two entry points (`index.html`, `editor.html`)
- JSON - Game script format (`script.json`), project metadata (`project.json`)
## Runtime
- Node.js v24.13.1 (local development)
- Electron v41.0.4 (desktop runtime — Chromium-based)
- npm v11.11.1
- Lockfile: `package-lock.json` present (lockfileVersion 3)
- ES Modules throughout (`"type": "module"` in `package.json`)
- All imports use `.js` extensions explicitly
## Frameworks
- Vue 3 `^3.5.31` - Editor UI only (`src/editor/`). The runtime engine does NOT use Vue.
- Pinia `^3.0.4` - State management for editor (stores in `src/editor/stores/`)
- Electron `^41.0.4` - Desktop application shell, IPC-based project management
- Vite `^6.3.0` - Build tool and dev server
- `@vitejs/plugin-vue` `^6.0.5` - Vue SFC compilation
- `vite-plugin-electron` `^0.29.1` - Electron main process bundling
- `vite-plugin-electron-renderer` `^0.14.6` - Electron renderer process support
- None detected. No test framework, no test files, no test configuration.
## Key Dependencies
- `vue` `^3.5.31` - Powers the entire editor UI (SFC components with `<script setup>`)
- `pinia` `^3.0.4` - Two stores: `useProjectStore` (`src/editor/stores/project.js`) and `useScriptStore` (`src/editor/stores/script.js`)
- `electron` `^41.0.4` - Desktop shell; main process at `electron/main.js`, preload at `electron/preload.js`
- `vite` `^6.3.0` - Build tool; config at `vite.config.js`
- `vite-plugin-electron` `^0.29.1` - Bridges Vite and Electron build
## Architecture: Two Distinct Applications
## Configuration
- Config: `vite.config.js`
- Two HTML entry points via `build.rollupOptions.input`:
- Dev server on port 3000, auto-open disabled
- Electron plugin configured with main entry `electron/main.js` and preload `electron/preload.js`
- Main process: `electron/main.js`
- Preload script: `electron/preload.js`
- Main output: `dist-electron/main.js`
- Context isolation enabled via `contextBridge.exposeInMainWorld`
- Custom `asset://` protocol for loading project files securely
- `APP_ROOT` - Set to project root in `electron/main.js`
- `VITE_DEV_SERVER_URL` - Used to detect dev vs production mode
- `VITE_PUBLIC` - Points to public assets directory
## Platform Requirements
- Node.js >= 18 (using v24 locally)
- npm (using v11)
- Windows/macOS/Linux (Electron cross-platform)
- No native dependencies detected
- Electron desktop app (packaged with `dist-electron/`)
- No web deployment target (Electron-only)
- No packaging tool configured yet (no electron-builder, electron-forge, etc.)
## Build Commands
## External Fonts
- Google Fonts loaded via CSS `@import` in `src/style.css`:
- These are loaded at runtime from `fonts.googleapis.com` — requires internet on first load
## Data Format
- `meta` — title, version, author, resolution
- `characters` — keyed by ID, with name, color, and expression image paths
- `scenes` — keyed by scene ID, each containing an array of commands
- `ui` — optional custom UI layouts (e.g., title screen)
- `project.json` — project metadata (name, author, resolution, timestamps)
- `script.json` — game script data
- `assets/` — subdirectories: `backgrounds/`, `characters/`, `audio/`, `ui/`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Languages
- Runtime engine: vanilla JS classes (`src/engine/`, `src/ui/`)
- Editor: Vue 3 SFCs with `<script setup>` (`src/editor/`)
- Electron main process: Node.js ESM (`electron/main.js`)
## Naming Patterns
- Engine/UI modules: PascalCase matching the exported class — `ScriptEngine.js`, `DialogueBox.js`, `BackgroundLayer.js`
- Vue components: PascalCase SFCs — `TabBar.vue`, `CanvasPreview.vue`, `WelcomeScreen.vue`
- Pinia stores: lowercase — `script.js`, `project.js`
- Composables: camelCase with `use` prefix — `useCanvasState.js`
- Utility modules: lowercase — `sanitize.js`
- CSS files: lowercase — `style.css`, `base.css`
- PascalCase, one class per file: `ScriptEngine`, `AudioManager`, `SaveManager`, `ConfigManager`
- Use `export class ClassName` pattern — named exports only, no default exports
- camelCase: `playBgm()`, `stopBgm()`, `setBackground()`, `setBgmVolume()`
- Private methods: underscore prefix — `_enterScene()`, `_executeCurrentCommand()`, `_fadeVolume()`, `_handleClick()`
- Vue composables: `useCanvasState()` prefix convention
- camelCase: `commandIndex`, `currentScene`, `bgmVolume`, `typeSpeed`
- Private instance fields: underscore prefix — `this._bgm`, `this._fadeTimer`, `this._fullText`
- Constants: UPPER_SNAKE_CASE in local scope — `GAME_W`, `GAME_H`, `PRESET_X`
- Regex constants: UPPER_SNAKE_CASE — `CSS_INJECTION_RE`
- Refs in Vue: camelCase — `selectedId`, `canvasScale`, `isDragging`
- snake_case strings: `'dialogue'`, `'show_character'`, `'hide_character'`, `'set_background'`, `'play_bgm'`, `'scene_enter'`
- kebab-case with component prefix: `dialogue-box`, `character-sprite`, `bg-image-layer`, `choice-button`
- State modifiers: `.visible`, `.hidden`, `.active`, `.entered`
- BEM-like for nested: `.dialogue-speaker-name`, `.save-slot-label`, `.backlog-entry`
## Code Style
- No formatter configured (no Prettier, ESLint, or Biome detected)
- Indentation: 2 spaces throughout
- Semicolons: always used
- Quotes: single quotes for JS strings
- Trailing commas: used in multi-line arrays/objects
- Max line length: not enforced, typically ~100-120 chars
- No linter configured — no `.eslintrc`, `eslint.config.js`, or `biome.json` present
- Rely on consistent manual style
## Import Organization
- Always use explicit `.js` extensions for JS imports: `'./engine/ScriptEngine.js'`
- Vue files import without extension (Vite resolves): `'./App.vue'`
- Relative paths throughout — no path aliases configured
- ESM exclusively: `"type": "module"` in `package.json`
- Named exports for classes and utilities: `export class ScriptEngine`, `export function sanitizeCssValue`
- No default exports in JS modules
- Vue SFCs use default export implicitly via `<script setup>`
## Error Handling
- `try/catch` at top-level initialization in `src/main.js` — renders error message to DOM on failure:
- Audio `.play()` errors silently caught with `.catch(() => {})` pattern in `src/engine/AudioManager.js`
- Unknown commands logged as warnings and skipped: `console.warn(\`Unknown command type: ${cmd.type}\`)` in `src/engine/ScriptEngine.js`
- Missing scenes logged as errors: `console.error(\`Scene not found: ${sceneId}\`)` in `src/engine/ScriptEngine.js`
- IPC handlers return `{ success: true, ... }` or `{ success: false, error: e.message }` objects
- File operations wrapped in `try/catch`, errors logged with `console.error`
- Path traversal guarded by `isInsideProject()` check
- Atomic file writes with `.tmp`/`.bak` pattern in `atomicWrite()`
- Store actions return result objects; callers check `result.success`
- User-facing errors via `alert()` (e.g., `src/editor/views/Characters.vue`, `src/editor/App.vue`)
- ConfigManager: `try/catch` with `console.warn` fallback in `src/engine/ConfigManager.js`
- Use `{ success: boolean, error?: string }` return objects for IPC and async operations
- Use `console.error` with `[ModuleName]` prefix for logging: `[ScriptEngine]`, `[GalgameMaker]`
- Catch and ignore non-critical audio errors with `.catch(() => {})`
- Never throw uncaught — always handle at boundaries
## Logging
- Bracket-prefix tags: `[ScriptEngine]`, `[GalgameMaker]`, `[Scene]`
- `console.log` for informational messages: initialization, scene transitions
- `console.warn` for deprecation and unknown values
- `console.error` for failures (file operations, missing data)
## Comments
- File-level JSDoc block at the top of every module describing purpose (every file in `src/engine/` and `src/ui/`)
- Inline section dividers using ASCII art: `// ─── Section Name ───────`
- JSDoc `@param` and `@type` annotations on class methods and constructors
- `@private` tag on internal methods prefixed with `_`
## Function Design
- Data objects passed as single `data` param: `show(data)`, `playBgm(data)`, `setBackground(data)`
- Destructured defaults with `??` and `||`: `data.volume ?? 0.5`, `cmd.transition || 'fade'`
- Constructor params: container DOM element + optional config: `constructor(container, basePath = '/game/')`
- Most engine methods are void (side-effect driven via events)
- State queries return plain objects: `getState()` returns serializable snapshot
- IPC handlers return `{ success, error?, ... }` objects
- Store actions return result objects or boolean
## Module Design
- One class per file for engine/UI modules, using named `export class`
- Utility files export multiple named functions: `export function sanitizeCssValue`, `export function clampField` in `src/ui/sanitize.js`
- Pinia stores: single `export const useXxxStore = defineStore(...)` per file
## Vue Component Conventions
- Stores accessed via composable: `const script = useScriptStore()`
- Props defined via `defineProps()` with type objects
- Emits defined via `defineEmits()`
- Lifecycle via `onMounted`, `onBeforeUnmount`
- Watchers via `watch()` with `{ deep: true }` for store data
- Parent→Child: props
- Child→Parent: `$emit` events (e.g., `@create-project`, `@position-update`)
- Sibling/global: Pinia stores (`useScriptStore`, `useProjectStore`)
- Electron IPC: `window.ipcRenderer.invoke()` called directly in stores and components
- Dark theme throughout: backgrounds `#1e1e1e`–`#252526`, text `#ccc`–`#e0e0e0`
- VS Code-inspired color scheme: accent `#007acc`, success `#0e633c`, danger `#a22`
- Inline CSS-in-JS via `:style` bindings for dynamic values
- Scoped CSS for static layout/appearance
## Security Patterns
- `sanitizeCssValue()` rejects strings matching `CSS_INJECTION_RE` (`;`, `{}`, `url()`, `expression()`, `@import`, `javascript:`, `data:`)
- `clampField()` constrains numeric values within predefined bounds for coordinates, dimensions, and scales
- Applied in `src/ui/DialogueBox.js`, `src/ui/ChoiceMenu.js`, `src/ui/TitleScreen.js`
- `isInsideProject()` validates resolved paths stay within project directory
- `sanitizeProjectName()` strips dangerous characters from user-provided names
- Custom `asset://` protocol verifies path against resolved base directory
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Electron main process manages project files, windows, dialogs, and a custom `asset://` protocol
- Editor is a Vue 3 + Pinia SPA loaded in the primary BrowserWindow (`editor.html`)
- Runtime engine is a vanilla JavaScript application loaded in a separate preview BrowserWindow (`index.html`)
- JSON-based game script format (`script.json`) is the central data model shared between editor and engine
- Event-driven engine architecture using a custom `EventEmitter` to decouple script interpretation from UI rendering
- IPC-based file I/O — the renderer never touches the filesystem directly; all reads/writes go through `ipcRenderer.invoke()`
## Layers
- Purpose: Application lifecycle, window management, file I/O, native dialogs, security enforcement
- Location: `electron/main.js`
- Contains: IPC handlers (`create-project`, `open-project`, `load-project`, `save-project`, `upload-asset`, `read-dir`, `show-save-dialog`, `dialog-open-directory`, `open-preview`, `close-project`, `get-recent-projects`, `update-recent-projects`), custom `asset://` protocol handler, recent projects persistence, atomic file writes, path security validation
- Depends on: Electron APIs (`app`, `BrowserWindow`, `ipcMain`, `protocol`, `net`, `dialog`), Node.js `fs`, `path`
- Used by: Editor (Vue) via preload bridge, Runtime engine via preview window
- Purpose: Exposes a safe subset of `ipcRenderer` to renderer processes via `contextBridge`
- Location: `electron/preload.js`
- Contains: `send`, `invoke`, `on` method proxies
- Depends on: Electron `ipcRenderer`, `contextBridge`
- Used by: Editor renderer (as `window.ipcRenderer`)
- Purpose: Visual authoring tool for creating/editing visual novel projects
- Location: `src/editor/`
- Contains: Vue components, Pinia stores, composables, views
- Depends on: Vue 3, Pinia, `window.ipcRenderer` (preload bridge)
- Used by: End users (game creators)
- Purpose: Plays visual novel games by interpreting `script.json`
- Location: `src/engine/` (core), `src/ui/` (rendering), `src/main.js` (wiring)
- Contains: ScriptEngine, AudioManager, SaveManager, ConfigManager, UI components
- Depends on: Browser APIs (DOM, Audio, localStorage, fetch)
- Used by: End users (game players), Editor preview window
- Purpose: JSON-based game project format
- Location: On-disk project directories (created by main process)
- Contains: `project.json` (metadata), `script.json` (game content), `assets/` (media files)
- Depends on: Nothing (pure data)
- Used by: Both editor and runtime engine
## Data Flow
- **Editor state**: Pinia stores — `useProjectStore` (project metadata, file paths, dirty flag) and `useScriptStore` (script data, undo/redo history with JSON snapshot approach, max 50 entries)
- **Runtime game state**: Engine instance variables (`currentScene`, `commandIndex`, `variables` Map, `history` array); persisted via `SaveManager` to `localStorage` (8 save slots)
- **Runtime user config**: `ConfigManager` persists volume/speed settings to `localStorage`
## Key Abstractions
- Purpose: Interprets JSON game scripts command-by-command, emitting events for each command type
- Location: `src/engine/ScriptEngine.js`
- Pattern: Extends `EventEmitter` (`src/engine/EventEmitter.js`). State machine with `waiting` and `ended` flags. Commands are a flat array per scene, executed sequentially.
- Events: `dialogue`, `show_character`, `hide_character`, `set_expression`, `set_background`, `play_bgm`, `stop_bgm`, `play_se`, `choice`, `end`, `scene_enter`
- Purpose: Render visual novel UI elements by manipulating DOM directly
- Examples: `src/ui/DialogueBox.js`, `src/ui/CharacterLayer.js`, `src/ui/BackgroundLayer.js`, `src/ui/ChoiceMenu.js`, `src/ui/TitleScreen.js`, `src/ui/GameMenu.js`, `src/ui/SaveLoadScreen.js`, `src/ui/BacklogScreen.js`, `src/ui/SettingsScreen.js`
- Pattern: Each class receives a container DOM element, creates its own DOM subtree, exposes `show()`/`hide()` methods and callback properties (`onAdvance`, `onSelect`, etc.)
- Purpose: Centralized reactive state for the editor application
- Examples: `src/editor/stores/project.js` (project metadata & IPC calls), `src/editor/stores/script.js` (script data & undo/redo)
- Pattern: Composition API style (`defineStore` with setup function), expose refs and async functions
- Purpose: Computes visual scene state at a given command index by replaying commands — powers the canvas preview in the editor
- Location: `src/editor/composables/useCanvasState.js`
- Pattern: Vue `computed` that replays commands 0..N to derive background, characters, dialogue, and choice state
- Purpose: Prevent CSS injection from user-provided style values in game scripts
- Location: `src/ui/sanitize.js`
- Pattern: `sanitizeCssValue()` rejects strings with injection patterns; `clampField()` constrains numeric values to predefined bounds for a 1280×720 canvas
## Entry Points
- Location: `electron/main.js`
- Triggers: `app.whenReady()` → creates main window loading `editor.html`
- Responsibilities: Window lifecycle, IPC handler registration, `asset://` protocol registration, recent projects management, file I/O with path security
- Location: `src/main.js` (loaded by `index.html`)
- Triggers: Direct module execution; calls `init()` at bottom of file
- Responsibilities: Instantiates all engine modules and UI components, wires event handlers between engine and UI, manages auto/skip modes, keyboard shortcuts, title screen flow
- Location: `src/editor/main.js` (loaded by `editor.html`)
- Triggers: `createApp(App).use(createPinia()).mount('#app')`
- Responsibilities: Bootstrap Vue app with Pinia, mount root component `src/editor/App.vue`
- Location: `src/editor/App.vue`
- Triggers: Vue mount
- Responsibilities: State machine (`welcome` / `editing` views), tab routing (Scenes, TitleDesigner, SettingsDesigner, Assets, Characters, ProjectSettings), keyboard shortcuts (Ctrl+Z/Y/S), auto-save watcher, Electron close handler integration
- `index.html` — Runtime engine; defines layered DOM structure (`#background-layer`, `#character-layer`, `#dialogue-layer`, `#ui-overlay`)
- `editor.html` — Editor; minimal shell with `<div id="app">` mount point
## Error Handling
- Main process IPC handlers return `{ success: boolean, error?: string }` objects — never throw across IPC boundary (`electron/main.js` lines 81-130, 150-205, 207-218)
- Runtime engine uses `console.error` / `console.warn` for non-fatal errors (missing scenes, unknown command types) at `src/engine/ScriptEngine.js`
- Editor shows `alert()` for failed project operations at `src/editor/App.vue` line 163
- Audio playback uses `.catch(() => {})` to silently handle autoplay restrictions at `src/engine/AudioManager.js`
- Runtime init failure displays an inline error message in the game container at `src/main.js` lines 432-438
## Cross-Cutting Concerns
- `electron/preload.js` uses `contextBridge` to expose a limited IPC API (no direct Node.js access in renderer)
- Custom `asset://` protocol validates that resolved file paths stay within the project's `assets/` directory
- `isInsideProject()` check on `read-dir` and file operations prevents path traversal
- CSS sanitization prevents injection from user-authored script style values
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
