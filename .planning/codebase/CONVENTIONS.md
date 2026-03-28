# Coding Conventions

**Analysis Date:** 2025-07-15

## Languages

**Primary:** JavaScript (ES modules, no TypeScript)
- Runtime engine: vanilla JS classes (`src/engine/`, `src/ui/`)
- Editor: Vue 3 SFCs with `<script setup>` (`src/editor/`)
- Electron main process: Node.js ESM (`electron/main.js`)

## Naming Patterns

**Files:**
- Engine/UI modules: PascalCase matching the exported class — `ScriptEngine.js`, `DialogueBox.js`, `BackgroundLayer.js`
- Vue components: PascalCase SFCs — `TabBar.vue`, `CanvasPreview.vue`, `WelcomeScreen.vue`
- Pinia stores: lowercase — `script.js`, `project.js`
- Composables: camelCase with `use` prefix — `useCanvasState.js`
- Utility modules: lowercase — `sanitize.js`
- CSS files: lowercase — `style.css`, `base.css`

**Classes:**
- PascalCase, one class per file: `ScriptEngine`, `AudioManager`, `SaveManager`, `ConfigManager`
- Use `export class ClassName` pattern — named exports only, no default exports

**Functions:**
- camelCase: `playBgm()`, `stopBgm()`, `setBackground()`, `setBgmVolume()`
- Private methods: underscore prefix — `_enterScene()`, `_executeCurrentCommand()`, `_fadeVolume()`, `_handleClick()`
- Vue composables: `useCanvasState()` prefix convention

**Variables:**
- camelCase: `commandIndex`, `currentScene`, `bgmVolume`, `typeSpeed`
- Private instance fields: underscore prefix — `this._bgm`, `this._fadeTimer`, `this._fullText`
- Constants: UPPER_SNAKE_CASE in local scope — `GAME_W`, `GAME_H`, `PRESET_X`
- Regex constants: UPPER_SNAKE_CASE — `CSS_INJECTION_RE`
- Refs in Vue: camelCase — `selectedId`, `canvasScale`, `isDragging`

**Events (engine):**
- snake_case strings: `'dialogue'`, `'show_character'`, `'hide_character'`, `'set_background'`, `'play_bgm'`, `'scene_enter'`

**CSS Classes:**
- kebab-case with component prefix: `dialogue-box`, `character-sprite`, `bg-image-layer`, `choice-button`
- State modifiers: `.visible`, `.hidden`, `.active`, `.entered`
- BEM-like for nested: `.dialogue-speaker-name`, `.save-slot-label`, `.backlog-entry`

## Code Style

**Formatting:**
- No formatter configured (no Prettier, ESLint, or Biome detected)
- Indentation: 2 spaces throughout
- Semicolons: always used
- Quotes: single quotes for JS strings
- Trailing commas: used in multi-line arrays/objects
- Max line length: not enforced, typically ~100-120 chars

**Linting:**
- No linter configured — no `.eslintrc`, `eslint.config.js`, or `biome.json` present
- Rely on consistent manual style

## Import Organization

**Order (observed pattern):**
1. Node.js built-ins (in electron): `import path from 'node:path'`
2. Framework/library imports: `import { createApp } from 'vue'`, `import { defineStore } from 'pinia'`
3. Local engine/module imports: `import { ScriptEngine } from './engine/ScriptEngine.js'`
4. Local UI imports: `import { DialogueBox } from './ui/DialogueBox.js'`
5. Vue component imports: `import WelcomeScreen from './views/WelcomeScreen.vue'`
6. CSS imports: `import './style.css'`, `import './assets/base.css'`

**Path Style:**
- Always use explicit `.js` extensions for JS imports: `'./engine/ScriptEngine.js'`
- Vue files import without extension (Vite resolves): `'./App.vue'`
- Relative paths throughout — no path aliases configured

**Module System:**
- ESM exclusively: `"type": "module"` in `package.json`
- Named exports for classes and utilities: `export class ScriptEngine`, `export function sanitizeCssValue`
- No default exports in JS modules
- Vue SFCs use default export implicitly via `<script setup>`

## Error Handling

**Engine/Runtime:**
- `try/catch` at top-level initialization in `src/main.js` — renders error message to DOM on failure:
  ```js
  try {
    await engine.load('/game/script.json');
    // ...
  } catch (err) {
    console.error('[GalgameMaker] Failed to initialize:', err);
    gameContainer.innerHTML = `<div>...${err.message}</div>`;
  }
  ```
- Audio `.play()` errors silently caught with `.catch(() => {})` pattern in `src/engine/AudioManager.js`
- Unknown commands logged as warnings and skipped: `console.warn(\`Unknown command type: ${cmd.type}\`)` in `src/engine/ScriptEngine.js`
- Missing scenes logged as errors: `console.error(\`Scene not found: ${sceneId}\`)` in `src/engine/ScriptEngine.js`

**Electron Main Process (`electron/main.js`):**
- IPC handlers return `{ success: true, ... }` or `{ success: false, error: e.message }` objects
- File operations wrapped in `try/catch`, errors logged with `console.error`
- Path traversal guarded by `isInsideProject()` check
- Atomic file writes with `.tmp`/`.bak` pattern in `atomicWrite()`

**Editor (Vue):**
- Store actions return result objects; callers check `result.success`
- User-facing errors via `alert()` (e.g., `src/editor/views/Characters.vue`, `src/editor/App.vue`)
- ConfigManager: `try/catch` with `console.warn` fallback in `src/engine/ConfigManager.js`

**Pattern to follow:**
- Use `{ success: boolean, error?: string }` return objects for IPC and async operations
- Use `console.error` with `[ModuleName]` prefix for logging: `[ScriptEngine]`, `[GalgameMaker]`
- Catch and ignore non-critical audio errors with `.catch(() => {})`
- Never throw uncaught — always handle at boundaries

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- Bracket-prefix tags: `[ScriptEngine]`, `[GalgameMaker]`, `[Scene]`
- `console.log` for informational messages: initialization, scene transitions
- `console.warn` for deprecation and unknown values
- `console.error` for failures (file operations, missing data)

## Comments

**When to Comment:**
- File-level JSDoc block at the top of every module describing purpose (every file in `src/engine/` and `src/ui/`)
- Inline section dividers using ASCII art: `// ─── Section Name ───────`
- JSDoc `@param` and `@type` annotations on class methods and constructors
- `@private` tag on internal methods prefixed with `_`

**JSDoc Examples (from `src/engine/ScriptEngine.js`):**
```js
/**
 * ScriptEngine — Core game script interpreter
 *
 * Events emitted:
 *   'dialogue'        — { speaker, speakerName, speakerColor, text }
 *   'show_character'  — { id, expression, position, transition, duration, image }
 */

/** @type {Object|null} Full script data */
this.script = null;

/**
 * Load a game script from a URL
 * @param {string} url
 */
async load(url) { ... }
```

**Section Dividers (from `src/main.js`):**
```js
// ─── DOM references ─────────────────────────────────────
// ─── Engine instances ───────────────────────────────────
// ─── UI instances ───────────────────────────────────────
// ─── State ──────────────────────────────────────────────
```

## Function Design

**Size:** Functions are typically 5–30 lines. The largest are render/replay functions (~60 lines in `replayCurrentScene` in `src/main.js`).

**Parameters:**
- Data objects passed as single `data` param: `show(data)`, `playBgm(data)`, `setBackground(data)`
- Destructured defaults with `??` and `||`: `data.volume ?? 0.5`, `cmd.transition || 'fade'`
- Constructor params: container DOM element + optional config: `constructor(container, basePath = '/game/')`

**Return Values:**
- Most engine methods are void (side-effect driven via events)
- State queries return plain objects: `getState()` returns serializable snapshot
- IPC handlers return `{ success, error?, ... }` objects
- Store actions return result objects or boolean

## Module Design

**Exports:**
- One class per file for engine/UI modules, using named `export class`
- Utility files export multiple named functions: `export function sanitizeCssValue`, `export function clampField` in `src/ui/sanitize.js`
- Pinia stores: single `export const useXxxStore = defineStore(...)` per file

**Barrel Files:** Not used — all imports reference specific files directly

**Class Pattern (Engine/UI):**
```js
export class ClassName {
  constructor(container, options) {
    // DOM creation
    this.el = document.createElement('div');
    container.appendChild(this.el);
    
    // State
    this.property = null;
    
    // Callbacks
    this.onAction = null;
  }
  
  show(data) { ... }
  hide() { ... }
  _privateHelper() { ... }
}
```

**Pinia Store Pattern (Editor):**
```js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useXxxStore = defineStore('xxx', () => {
  const state = ref(null);
  const derived = computed(() => ...);
  
  async function action() { ... }
  
  return { state, derived, action };
});
```

## Vue Component Conventions

**SFC Structure:**
1. `<template>` — always first
2. `<script setup>` — Composition API exclusively, no Options API
3. `<style scoped>` — always scoped, inline in the SFC

**Composition API Patterns:**
- Stores accessed via composable: `const script = useScriptStore()`
- Props defined via `defineProps()` with type objects
- Emits defined via `defineEmits()`
- Lifecycle via `onMounted`, `onBeforeUnmount`
- Watchers via `watch()` with `{ deep: true }` for store data

**Component Communication:**
- Parent→Child: props
- Child→Parent: `$emit` events (e.g., `@create-project`, `@position-update`)
- Sibling/global: Pinia stores (`useScriptStore`, `useProjectStore`)
- Electron IPC: `window.ipcRenderer.invoke()` called directly in stores and components

**Styling in Vue:**
- Dark theme throughout: backgrounds `#1e1e1e`–`#252526`, text `#ccc`–`#e0e0e0`
- VS Code-inspired color scheme: accent `#007acc`, success `#0e633c`, danger `#a22`
- Inline CSS-in-JS via `:style` bindings for dynamic values
- Scoped CSS for static layout/appearance

## Security Patterns

**CSS Injection Prevention (`src/ui/sanitize.js`):**
- `sanitizeCssValue()` rejects strings matching `CSS_INJECTION_RE` (`;`, `{}`, `url()`, `expression()`, `@import`, `javascript:`, `data:`)
- `clampField()` constrains numeric values within predefined bounds for coordinates, dimensions, and scales
- Applied in `src/ui/DialogueBox.js`, `src/ui/ChoiceMenu.js`, `src/ui/TitleScreen.js`

**Path Traversal Prevention (`electron/main.js`):**
- `isInsideProject()` validates resolved paths stay within project directory
- `sanitizeProjectName()` strips dangerous characters from user-provided names
- Custom `asset://` protocol verifies path against resolved base directory

---

*Convention analysis: 2025-07-15*
