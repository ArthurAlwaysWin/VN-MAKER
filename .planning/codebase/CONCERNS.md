# Codebase Concerns

**Analysis Date:** 2025-01-28

## Tech Debt

**Deprecated API Shims Still In Use:**
- Issue: `loadScript()` and `saveScript()` are deprecated shims in the script store that print console warnings, but are still called from `src/editor/views/Characters.vue` (line 93, 137) and `src/editor/views/Scenes.vue` (line 448). The comment says "remove when views are rewritten in Chunk 3."
- Files: `src/editor/stores/script.js` (lines 58-64), `src/editor/views/Characters.vue` (lines 93, 137), `src/editor/views/Scenes.vue` (line 448)
- Impact: These shims are no-ops that just log warnings. The Characters view calls `loadScript()` on mount (does nothing), and both views call `saveScript()` on save button click (does nothing — data is actually saved by auto-save). Users clicking "Save" buttons get a misleading "已保存！" alert while the deprecated function does nothing.
- Fix approach: Replace `script.loadScript()` with a check that `script.data` is already loaded. Replace `script.saveScript()` calls with `project.saveProject(script.data)`. Remove the shims from the store.

**Placeholder/Stub Views:**
- Issue: `SettingsDesigner.vue` and `TitleDesigner.vue` are placeholder stubs with no real functionality, just informational text saying "coming in Phase 3B."
- Files: `src/editor/views/SettingsDesigner.vue`, `src/editor/views/TitleDesigner.vue`
- Impact: Two editor tabs exist in the navigation that provide no functionality. Users see dead-end placeholder pages.
- Fix approach: Either implement the designers or hide the tabs until they're ready. The TitleDesigner could redirect to the canvas-based approach already partially available in the Scenes view.

**Hardcoded Game Resolution (1280×720):**
- Issue: The runtime engine hardcodes a 1280×720 game canvas in `src/style.css` (lines 38-39), `src/ui/sanitize.js` (BOUNDS object at line 28-38), and `src/editor/components/canvas/CanvasPreview.vue` (lines 70-71). The editor's project settings allow custom resolution (including 1920×1080 and 1024×768 in `CreateProjectWizard.vue`), but the runtime and canvas preview ignore it entirely.
- Files: `src/style.css` (lines 38-39), `src/ui/sanitize.js` (lines 28-38), `src/editor/components/canvas/CanvasPreview.vue` (lines 70-71), `src/editor/views/CreateProjectWizard.vue` (lines 91-95)
- Impact: Custom resolution settings are stored in `project.json` but never read by the runtime engine. Games always render at 1280×720 regardless of what the user configured. This is a visible broken promise in the UI.
- Fix approach: Read resolution from `project.json` or `script.json` meta and apply dynamically to the game container, CSS bounds, and canvas preview dimensions.

**Undo/Redo Relies on JSON Deep-Copy (Performance):**
- Issue: Every undo state snapshot uses `JSON.parse(JSON.stringify(data.value))` for deep cloning. With 50 history entries of potentially large script data (which includes all scenes, characters, and choice options), this can consume significant memory and CPU.
- Files: `src/editor/stores/script.js` (lines 13-25, 28-43)
- Impact: Sluggish editor performance on large projects. Each keystroke triggers a 500ms debounced snapshot. The 50-entry cap helps but doesn't prevent large JSON payloads from being cloned repeatedly.
- Fix approach: Use a structural sharing library (e.g., `immer`) or implement command-based undo rather than full-state snapshots. Alternatively, increase the debounce timer for snapshots or reduce max history.

## Known Bugs

**Auto-Save Timer Not Cleared on Failed Save:**
- Symptoms: If a save fails (e.g., filesystem permission error), `_saving` flag is correctly reset via `finally`, but the auto-save timer may repeatedly attempt to save every 2 seconds without notifying the user of failures.
- Files: `src/editor/App.vue` (lines 108-113), `src/editor/stores/project.js` (lines 46-61)
- Trigger: Any filesystem error during auto-save (disk full, file locked, permission denied).
- Workaround: The project store's `saveProject()` returns `false` on failure, but `App.vue`'s auto-save callback doesn't check the return value or notify the user.

**BacklogScreen XSS via innerHTML with User Content:**
- Symptoms: The backlog screen renders dialogue text directly into `innerHTML` without sanitization. Speaker names and dialogue text from `script.json` are user-authored content.
- Files: `src/ui/BacklogScreen.js` (lines 40-43)
- Trigger: A script author includes HTML tags in dialogue text (e.g., `<img onerror=alert(1)>` in a dialogue command's `text` field).
- Workaround: None currently. The dialogue box itself uses `textContent` (safe), but the backlog uses `innerHTML`.

**SaveLoadScreen XSS via innerHTML with Preview Text:**
- Symptoms: `previewText` from save data is inserted into `innerHTML` at `src/ui/SaveLoadScreen.js` line 63 without escaping.
- Files: `src/ui/SaveLoadScreen.js` (lines 61-65)
- Trigger: If dialogue text (which becomes preview text) contains HTML markup.
- Workaround: None.

**TitleScreen XSS via Game Title in innerHTML:**
- Symptoms: `this.gameTitle` is interpolated into innerHTML at `src/ui/TitleScreen.js` line 55. The title comes from script metadata which is user-authored.
- Files: `src/ui/TitleScreen.js` (lines 54-55)
- Trigger: A game title containing HTML tags.
- Workaround: None.

## Security Considerations

**Preload Script Exposes Unrestricted IPC Channels:**
- Risk: The preload script at `electron/preload.js` exposes `ipcRenderer.invoke()`, `send()`, and `on()` without any channel allowlist. Any renderer-side code can call any IPC channel, including potentially dangerous Electron internal channels.
- Files: `electron/preload.js` (lines 4-16)
- Current mitigation: Only defined `ipcMain.handle()` channels respond, but the surface area is unnecessarily wide.
- Recommendations: Add an explicit allowlist of valid channels in the preload script:
  ```js
  const ALLOWED_CHANNELS = ['create-project', 'open-project', 'load-project', 'save-project', ...];
  invoke: (channel, ...data) => {
    if (!ALLOWED_CHANNELS.includes(channel)) throw new Error('Blocked');
    return ipcRenderer.invoke(channel, ...data);
  }
  ```

**executeJavaScript Used for Window Close Handler:**
- Risk: `electron/main.js` (lines 328-342) uses `win.webContents.executeJavaScript()` to call `window.__hasDirtyProject()` and `window.__saveCurrentProject()`. While the strings are hardcoded (not user-influenced), this pattern bypasses CSP and is generally discouraged by Electron security guidelines.
- Files: `electron/main.js` (lines 328-342)
- Current mitigation: The JS strings are static, not derived from user input.
- Recommendations: Replace with proper IPC communication. Have the renderer respond to an IPC message from main process asking about dirty state, rather than injecting JS.

**Asset Upload Has No File Type Validation:**
- Risk: The `upload-asset` IPC handler at `electron/main.js` (lines 232-244) writes arbitrary binary data to the assets directory with the original filename. There is no validation of file type, size, or filename beyond the `isInsideProject` path check.
- Files: `electron/main.js` (lines 232-244), `src/editor/views/Assets.vue` (lines 70-87)
- Current mitigation: Path traversal is prevented by `isInsideProject()`. The renderer-side `accept` attribute provides a weak client-side filter.
- Recommendations: Validate file extensions server-side (in main process). Add file size limits. Sanitize filenames to prevent special characters.

**Asset Protocol Path Traversal Defense:**
- Risk: The custom `asset://` protocol handler at `electron/main.js` (lines 361-373) decodes URLs and resolves paths. It has a path prefix check but uses `decodeURIComponent` on the URL which could have edge cases with double-encoding or null bytes on some platforms.
- Files: `electron/main.js` (lines 361-373)
- Current mitigation: Uses `path.resolve()` comparison with `startsWith()` — this is the correct approach.
- Recommendations: Add additional validation to reject paths containing `..`, null bytes, or suspicious characters before resolution.

## Performance Bottlenecks

**Deep Watcher on Entire Script Data:**
- Problem: `src/editor/App.vue` (line 101) sets up a deep watcher on `script.data`, which is the entire game script (all scenes, characters, commands). Every change to any property in the tree triggers the watcher, which then schedules a snapshot and auto-save.
- Files: `src/editor/App.vue` (lines 101-114)
- Cause: Vue 3's deep reactivity tracking on a large nested object. Each keystroke in a dialogue text field traverses the entire script object for change detection.
- Improvement path: Watch specific sub-paths rather than the entire data object. Or use `watchEffect` with manual dirty tracking. Consider debouncing the watcher itself, not just the actions it triggers.

**Asset Upload Converts to Array for IPC Transfer:**
- Problem: `src/editor/views/Assets.vue` (line 81) converts file `ArrayBuffer` to `Array.from(new Uint8Array(buffer))` for IPC transfer. For large files (e.g., audio files can be 5-10MB), this creates a large JSON-serialized array of numbers, which is far less efficient than binary transfer.
- Files: `src/editor/views/Assets.vue` (line 81), `electron/main.js` (line 238 — `Buffer.from(data)`)
- Cause: Electron IPC serializes via structured clone, but the code manually converts to number arrays.
- Improvement path: Use Electron's native `ArrayBuffer` support over IPC, or use `Buffer` directly. Alternatively, write the file from the renderer using a dedicated file-write IPC handler that accepts a path.

**ScriptEngine Uses setTimeout for Command Sequencing:**
- Problem: `src/engine/ScriptEngine.js` uses `setTimeout(() => this._executeCurrentCommand(), 50)` (lines 268, 278) for auto-advancing after show_character and hide_character commands. This creates unpredictable timing and potential race conditions if commands fire faster than 50ms.
- Files: `src/engine/ScriptEngine.js` (lines 268, 278, 300)
- Cause: Using timers instead of event-driven completion callbacks.
- Improvement path: Use promises or event-based completion. Have the UI layer signal when a transition animation is complete, then advance the engine.

## Fragile Areas

**Scenes.vue — Largest and Most Complex Component (489 lines):**
- Files: `src/editor/views/Scenes.vue`
- Why fragile: This single component handles the scene list sidebar, command timeline, canvas preview integration, command property inspector (with per-command-type templates for 10+ command types), drag-and-drop asset integration, and command CRUD. Any change to command types requires modifying multiple template sections and the `getCommandPreview` function.
- Safe modification: When adding a new command type, update: (1) the `<select>` options list, (2) add a property inspector `<template>` block, (3) add a case in `getCommandPreview()`, (4) optionally add a case in `onAssetDrop()`.
- Test coverage: Zero tests exist.

**replayCurrentScene() — State Replay on Load:**
- Files: `src/main.js` (lines 161-225)
- Why fragile: When loading a saved game, this function replays all commands up to the saved index to reconstruct visual state (backgrounds, characters, audio). It manually handles each command type with special-case logic for instant transitions. If a new command type is added that affects visual state, this function must be updated in parallel with `ScriptEngine._executeCurrentCommand()`.
- Safe modification: Always update both `_executeCurrentCommand()` in ScriptEngine and `replayCurrentScene()` in main.js when adding new visual commands.
- Test coverage: None.

**main.js — God Module (442 lines):**
- Files: `src/main.js`
- Why fragile: This is the runtime engine's orchestration file. It instantiates every engine module and UI component, wires all event handlers, manages auto/skip mode state, handles keyboard shortcuts, manages title screen flow, save/load flow, and game lifecycle. Any change to game flow touches this file.
- Safe modification: Extract logical groups (auto/skip management, save/load wiring, keyboard shortcuts) into separate modules or composables.
- Test coverage: None.

## Scaling Limits

**Save System Limited to 8 localStorage Slots:**
- Current capacity: 8 save slots, stored in `localStorage` which has a ~5MB limit per origin.
- Limit: Each save stores the full engine state including history array. With long games (many dialogue entries), a single save could be 100KB+. 8 saves × 100KB = 800KB. The `localStorage` 5MB limit also competes with config storage.
- Scaling path: Migrate save data to IndexedDB or filesystem (via IPC in Electron mode). Increase slot count once storage is no longer constrained.
- Files: `src/engine/SaveManager.js` (line 11: `this.slotCount = 8`)

**Script Data Loaded Entirely Into Memory:**
- Current capacity: Works fine for small-to-medium games (hundreds of commands).
- Limit: A visual novel with thousands of scenes and commands will have a very large `script.json`. The entire file is loaded into memory, deep-watched by Vue, and fully cloned 50 times for undo history.
- Scaling path: Implement lazy-loading of scenes. Store scenes in separate files. Use pagination for the undo system.
- Files: `src/editor/stores/script.js`, `src/engine/ScriptEngine.js`

## Dependencies at Risk

**Minimal Dependencies (Low Risk Overall):**
- Risk: The project has very few dependencies (`vue`, `pinia`, `electron`, `vite`, `vite-plugin-electron`), which is good. No dependency is deprecated or abandoned.
- Impact: Low risk from dependency perspective.
- Note: There are zero production dependencies beyond `vue` and `pinia`. The `electron` version `^41.0.4` is recent.

## Missing Critical Features

**No Error Boundary/Recovery in Runtime Engine:**
- Problem: If the script engine encounters an error (invalid scene ID, malformed command), it logs to console and silently stops. There is no user-visible error state or recovery mechanism.
- Files: `src/engine/ScriptEngine.js` (line 155 — logs error, returns undefined), `src/main.js` (lines 431-438 — init error shows static HTML)
- Blocks: Users cannot debug script errors during game preview. The game just stops responding.

**No Validation of Script Data:**
- Problem: Neither the editor nor the engine validates the structure of `script.json`. Invalid scene references in jumps, missing character IDs in dialogue commands, and orphaned scenes are all silently accepted.
- Files: `src/engine/ScriptEngine.js` (no validation), `src/editor/stores/script.js` (no validation on load)
- Blocks: Script authors have no way to catch broken links between scenes, missing assets, or structural errors until they manually play through the game.

**No TypeScript — No Static Type Safety:**
- Problem: The entire codebase is plain JavaScript (`.js` and `.vue` files). JSDoc comments provide some documentation but no compile-time type checking.
- Files: All `src/**/*.js`, `electron/*.js`
- Blocks: Refactoring is risky. API contracts between engine modules and UI components are implicit. New contributors must read source code to understand expected data shapes.

## Test Coverage Gaps

**Zero Test Files Exist:**
- What's not tested: The entire codebase — engine, UI, editor stores, Electron IPC handlers.
- Files: No test files found anywhere in the project. No test framework configured in `package.json`.
- Risk: Any refactoring or feature addition can silently break existing functionality. The ScriptEngine's command execution logic, save/restore state, condition evaluation, and variable management are all untested.
- Priority: **High** — At minimum, the `ScriptEngine` (branching logic, save/restore, variable evaluation) and `SaveManager` (slot management) should have unit tests. The Pinia stores (`script.js`, `project.js`) are also highly testable.

---

*Concerns audit: 2025-01-28*
