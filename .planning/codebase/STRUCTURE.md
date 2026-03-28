# Codebase Structure

**Analysis Date:** 2025-07-17

## Directory Layout

```
galgame-maker/
├── electron/                  # Electron main process
│   ├── main.js                # App entry, IPC handlers, window management
│   └── preload.js             # Context bridge (safe ipcRenderer exposure)
├── src/                       # All renderer-side source code
│   ├── main.js                # Runtime engine entry point (wires engine + UI)
│   ├── style.css              # Runtime engine styles (all game UI)
│   ├── engine/                # Runtime game engine core modules
│   │   ├── ScriptEngine.js    # JSON script interpreter + event emitter
│   │   ├── AudioManager.js    # BGM and sound effect playback
│   │   ├── SaveManager.js     # Save/load game state (localStorage)
│   │   ├── ConfigManager.js   # User settings persistence (localStorage)
│   │   └── EventEmitter.js    # Lightweight pub/sub base class
│   ├── ui/                    # Runtime game UI components (vanilla JS)
│   │   ├── DialogueBox.js     # Typewriter dialogue display
│   │   ├── CharacterLayer.js  # Character sprite management
│   │   ├── BackgroundLayer.js # Background image crossfade
│   │   ├── ChoiceMenu.js      # Branching choice display
│   │   ├── TitleScreen.js     # Main menu (start/continue/settings)
│   │   ├── GameMenu.js        # In-game pause menu
│   │   ├── SaveLoadScreen.js  # Save/load slot UI
│   │   ├── BacklogScreen.js   # Dialogue history viewer
│   │   ├── SettingsScreen.js  # Volume/speed settings UI
│   │   └── sanitize.js        # CSS injection prevention utilities
│   └── editor/                # Vue 3 editor application
│       ├── main.js            # Vue app bootstrap (createApp + Pinia)
│       ├── App.vue            # Root component (welcome/editing state machine)
│       ├── assets/
│       │   └── base.css       # Editor base styles (dark theme reset)
│       ├── stores/
│       │   ├── project.js     # Project metadata, file I/O via IPC
│       │   └── script.js      # Script data, undo/redo history
│       ├── composables/
│       │   └── useCanvasState.js  # Scene state replay for canvas preview
│       ├── components/
│       │   ├── TabBar.vue     # Tab navigation component
│       │   ├── AssetPanel.vue # Draggable asset browser sidebar
│       │   └── canvas/
│       │       ├── CanvasPreview.vue    # Visual scene preview canvas
│       │       └── DraggableElement.vue # Drag/resize wrapper for canvas elements
│       └── views/
│           ├── WelcomeScreen.vue       # Landing page (create/open project)
│           ├── CreateProjectWizard.vue # Full project creation wizard
│           ├── CreateProjectQuick.vue  # Quick project creation dialog
│           ├── Scenes.vue              # Scene editor (timeline + canvas)
│           ├── TitleDesigner.vue       # Title page designer (placeholder)
│           ├── SettingsDesigner.vue    # Settings page designer
│           ├── Assets.vue              # Asset management (browse/upload)
│           ├── Characters.vue          # Character definition editor
│           └── ProjectSettings.vue     # Project metadata editor
├── public/                    # Static assets (served by Vite dev server)
│   └── game/                  # Demo game data
│       ├── script.json        # Demo game script
│       ├── audio/             # Demo audio files
│       ├── backgrounds/       # Demo background images
│       └── characters/        # Demo character sprites
├── docs/                      # Documentation
│   ├── script-format.md       # Game script JSON format specification
│   └── progress.md            # Development progress notes
├── dist/                      # Vite build output (renderer)
├── dist-electron/             # Electron main process build output
├── artifacts/                 # Build artifacts
│   └── superpowers/           # Superpowers-related artifacts
├── index.html                 # Runtime engine HTML entry (game player)
├── editor.html                # Editor HTML entry (Vue SPA mount)
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite + Electron plugin configuration
└── README.md                  # Project readme
```

## Directory Purposes

**`electron/`:**
- Purpose: Electron main process code (Node.js environment)
- Contains: App initialization, BrowserWindow creation, all IPC handlers, custom `asset://` protocol, file system operations
- Key files: `electron/main.js` (all main process logic in one file), `electron/preload.js` (context bridge)

**`src/engine/`:**
- Purpose: Core game runtime engine modules — script interpretation, audio, saves, config
- Contains: ES6 classes, each a self-contained module
- Key files: `src/engine/ScriptEngine.js` (the central interpreter), `src/engine/EventEmitter.js` (base class)

**`src/ui/`:**
- Purpose: Runtime game UI components using imperative vanilla JS DOM manipulation
- Contains: One class per UI element (dialogue, characters, backgrounds, menus, screens)
- Key files: `src/ui/DialogueBox.js` (typewriter effect), `src/ui/sanitize.js` (security utilities)

**`src/editor/`:**
- Purpose: Vue 3 SPA for the visual editor
- Contains: Vue components, Pinia stores, composables, view pages
- Key files: `src/editor/App.vue` (root), `src/editor/stores/project.js`, `src/editor/stores/script.js`

**`src/editor/stores/`:**
- Purpose: Pinia state stores for editor application state
- Contains: `project.js` (project metadata, IPC file operations, dirty tracking), `script.js` (script data, undo/redo with JSON snapshots)

**`src/editor/views/`:**
- Purpose: Full-page view components for each editor tab
- Contains: One `.vue` file per tab/dialog — Scenes, Characters, Assets, ProjectSettings, TitleDesigner, SettingsDesigner, WelcomeScreen, CreateProjectWizard, CreateProjectQuick

**`src/editor/components/`:**
- Purpose: Reusable editor UI components
- Contains: `TabBar.vue`, `AssetPanel.vue`, and `canvas/` subdirectory with visual preview components

**`src/editor/composables/`:**
- Purpose: Vue composition functions (reusable reactive logic)
- Contains: `useCanvasState.js` — replays commands to compute visual state at any command index

**`public/game/`:**
- Purpose: Demo game data bundled with the application, also used as template for new projects
- Contains: `script.json` (demo script), `audio/`, `backgrounds/`, `characters/` asset subdirectories

**`docs/`:**
- Purpose: Project documentation
- Contains: `script-format.md` (comprehensive JSON format spec), `progress.md`

## Key File Locations

**Entry Points:**
- `electron/main.js`: Electron main process entry (configured in `vite.config.js` → `electron.main.entry`)
- `electron/preload.js`: Preload script (configured in `vite.config.js` → `electron.preload.input`)
- `index.html`: Runtime engine HTML shell (loads `src/main.js`)
- `editor.html`: Editor HTML shell (loads `src/editor/main.js`)
- `src/main.js`: Runtime engine JavaScript entry
- `src/editor/main.js`: Vue editor JavaScript entry

**Configuration:**
- `package.json`: Dependencies, scripts (`dev`, `build`, `preview`), Electron main field
- `vite.config.js`: Vite configuration with `@vitejs/plugin-vue` and `vite-plugin-electron/simple`; multi-page setup (`index.html` for game, `editor.html` for editor)

**Core Logic:**
- `src/engine/ScriptEngine.js`: Game script interpreter (375 lines) — the heart of the runtime
- `src/editor/App.vue`: Editor root with state machine, tab routing, auto-save, keyboard shortcuts (226 lines)
- `src/editor/stores/script.js`: Script data store with undo/redo (73 lines)
- `src/editor/stores/project.js`: Project store with IPC file operations (80 lines)
- `src/editor/composables/useCanvasState.js`: Visual state computation for canvas preview (112 lines)

**Styling:**
- `src/style.css`: All runtime engine styles (832 lines) — layered z-index system, dialogue box, character sprites, title screen, menus
- `src/editor/assets/base.css`: Editor base reset (9 lines)
- Each editor `.vue` file contains `<style scoped>` blocks

**Documentation:**
- `docs/script-format.md`: Complete game script JSON format specification

## Naming Conventions

**Files:**
- Engine/UI modules: PascalCase class name matching filename — `ScriptEngine.js`, `DialogueBox.js`, `AudioManager.js`
- Vue components: PascalCase — `WelcomeScreen.vue`, `TabBar.vue`, `CanvasPreview.vue`
- Pinia stores: lowercase — `project.js`, `script.js`
- Composables: camelCase with `use` prefix — `useCanvasState.js`
- HTML entry points: lowercase — `index.html`, `editor.html`
- CSS: lowercase — `style.css`, `base.css`

**Directories:**
- All lowercase — `engine/`, `ui/`, `editor/`, `stores/`, `views/`, `components/`, `composables/`, `canvas/`

**CSS Classes:**
- Runtime engine: kebab-case with component prefix — `dialogue-box`, `character-sprite`, `bg-image-layer`, `choice-button`, `title-screen`
- Editor: kebab-case — `editor-layout`, `tab-bar`, `asset-panel`, `scene-sidebar`

## Where to Add New Code

**New Engine Command Type:**
1. Add executor method `_exec<CommandName>()` to `src/engine/ScriptEngine.js`
2. Add case to the switch in `_executeCurrentCommand()` in the same file
3. If the command has visual output, create/update a UI class in `src/ui/`
4. Wire the engine event to the UI handler in `src/main.js`
5. Add CSS styles to `src/style.css`
6. Update `src/editor/composables/useCanvasState.js` if the command affects canvas preview
7. Add the command type to the `<select>` in `src/editor/views/Scenes.vue`
8. Document the command in `docs/script-format.md`

**New Editor Tab/View:**
1. Create a new `.vue` file in `src/editor/views/`
2. Import it in `src/editor/App.vue`
3. Add entry to the `tabs` array and `tabComponents` map in `src/editor/App.vue`

**New Editor Component:**
- Shared/reusable components: `src/editor/components/`
- Canvas-related components: `src/editor/components/canvas/`

**New Composable:**
- Place in `src/editor/composables/` with `use` prefix naming

**New Pinia Store:**
- Place in `src/editor/stores/` with lowercase naming

**New IPC Handler:**
1. Add `ipcMain.handle('channel-name', ...)` in `electron/main.js`
2. Call via `window.ipcRenderer.invoke('channel-name', ...)` from renderer

**New Runtime UI Component:**
1. Create a new class in `src/ui/` following the existing pattern (constructor receives container, builds DOM, exposes show/hide/callbacks)
2. Instantiate and wire in `src/main.js`
3. Add styles to `src/style.css`

**New Static Assets for Demo Game:**
- Place in appropriate subdirectory under `public/game/` (`audio/`, `backgrounds/`, `characters/`)

## Special Directories

**`dist/`:**
- Purpose: Vite build output for renderer processes
- Generated: Yes (by `vite build`)
- Committed: No (should be in `.gitignore`)

**`dist-electron/`:**
- Purpose: Compiled Electron main process code
- Generated: Yes (by vite-plugin-electron)
- Committed: No (should be in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No

**`artifacts/`:**
- Purpose: Build artifacts and superpowers-related files
- Generated: Varies
- Committed: Check `.gitignore`

**`public/`:**
- Purpose: Static files served as-is by Vite (copied to dist root on build)
- Generated: No (manually maintained)
- Committed: Yes

**`.planning/`:**
- Purpose: Project planning and analysis documents
- Generated: By tooling
- Committed: Yes

---

*Structure analysis: 2025-07-17*
