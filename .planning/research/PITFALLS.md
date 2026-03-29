# Domain Pitfalls — v0.2: Asset Library & Title Page & Settings Overlay

**Domain:** Visual novel maker — Electron desktop app  
**Researched:** 2025-07-14

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Schema Mismatch Between Title Designer and TitleScreen.js Runtime

**What goes wrong:** The current `TitleScreen.js` uses a different element schema (`{ type: 'text', content, anchor }`) than what the new TitleDesigner should produce (`{ type: 'label', text, style: {} }` matching SettingsDesigner pattern). If the designer outputs new-format elements but the runtime still expects old-format, custom title layouts silently render nothing.

**Why it happens:** TitleScreen.js was written before the SettingsDesigner pattern was established. Its `_renderCustom()` method handles `type: 'text'` and `type: 'button'` with flat styling props, while SettingsScreen.js handles `type: 'label'` and `type: 'button'` with nested `style: {}` objects.

**Consequences:** Custom title layouts appear blank in the game engine. Extremely confusing because the editor preview looks correct (Vue rendering) but the runtime (DOM rendering) fails silently.

**Prevention:** Update `TitleScreen.js._renderCustom()` to the new schema BEFORE building TitleDesigner.vue. Add a migration check: if `element.type === 'text'`, convert to `type: 'label'` format on load. Use `asset://` protocol for backgrounds instead of `/game/` path.

**Detection:** Test custom title layout in the preview window (engine runtime) immediately after implementing the first title element, not after the whole designer is done.

### Pitfall 2: Font @font-face Not Injected in Both Renderer Processes

**What goes wrong:** Custom fonts work in the editor but not in the game preview window, or vice versa.

**Why it happens:** The editor and game engine run in separate Electron renderer processes (`editor.html` vs `index.html`). `@font-face` rules injected in one process are not visible in the other. If font loading is wired only in the editor's Vue app lifecycle, the engine preview window shows fallback fonts.

**Consequences:** Designer shows custom fonts correctly but the actual game always shows system fonts. User perceives a bug ("my font doesn't work in the game").

**Prevention:** Create a shared `fontLoader.js` utility used by both:
1. Editor: call on project load + after font import
2. Engine: call in `main.js init()` before rendering title/settings screens

Both must read from the same `script.assets.fonts[]` data and use `asset://` URLs.

**Detection:** Always test font rendering in the preview window, not just the editor.

### Pitfall 3: Reactive Proxy Leaking into IPC Calls

**What goes wrong:** Sending Vue reactive objects through Electron IPC fails with structured clone errors.

**Why it happens:** Already encountered and fixed in v0.1 (documented in PROJECT.md known issues). But the new asset store introduces more IPC calls. If `assetStore.files.backgrounds` (a reactive array) is accidentally passed to IPC, it throws.

**Consequences:** Silent failure on save, import, or file operations. Error only visible in DevTools console.

**Prevention:** Always `JSON.parse(JSON.stringify(data))` before IPC calls, or use spread/destructure. The project store already does this (line 52-53 of `project.js`). Apply the same pattern in the new asset store.

**Detection:** Check console for "could not be cloned" errors. Consider adding a dev-mode wrapper around `ipcRenderer.invoke` that warns on Proxy objects.

## Moderate Pitfalls

### Pitfall 4: Asset Store Cache Stale After External File Changes

**What goes wrong:** User manually copies files into the project's `assets/` folder (outside the app), but the asset store still shows the old file list.

**Prevention:** Refresh asset store on tab switch to the AssetLibrary view. Add a "refresh" button. Consider watching the directory with `fs.watch()` in the main process, but this is fragile on Windows and can be deferred.

### Pitfall 5: Auto-Naming Counter Race Condition

**What goes wrong:** Two rapid imports of files with the same name could both check for existence simultaneously and write to the same counter, overwriting one file.

**Prevention:** The `import-assets` IPC handler runs in the single-threaded main process, so true parallelism isn't possible. But if `import-assets` is called twice in quick succession (user clicks import twice), the second call should re-scan the directory. Use `await` before each file write to ensure sequential processing within a single `import-assets` call.

### Pitfall 6: Settings Overlay Transition Interrupted by Rapid Open/Close

**What goes wrong:** Player quickly opens and closes settings, causing the slide animation to glitch — element stuck mid-transition or `transitionend` event not firing.

**Prevention:** In `SettingsScreen.js.show()`, force-remove the `hidden` class and reset transform before starting the new transition. In `hide()`, if the element isn't fully visible (mid-show), skip the `transitionend` listener and immediately hide. Use a state flag (`this._animating`) to track transition state.

### Pitfall 7: Title BGM Overlaps with Game BGM

**What goes wrong:** Title page BGM starts playing. Player clicks "开始游戏" but the title BGM continues playing alongside the first scene's BGM.

**Prevention:** In the engine's `titleScreen.onStart` callback, explicitly call `audio.stopBgm({ fadeOut: 500 })` before starting the game. Same for `titleScreen.onContinue`. Check the existing code — the `gameMenu.onTitle` handler already stops BGM when returning to title (line 259 of `main.js`), but the reverse flow (title → game) doesn't.

### Pitfall 8: Font Metadata Orphaned When Font File Deleted

**What goes wrong:** User deletes a font file via the asset library, but the metadata entry in `script.data.assets.fonts[]` remains. Font family references in title/settings elements point to a nonexistent font.

**Prevention:** When `delete-asset` is called for a font, also remove the corresponding entry from `script.data.assets.fonts[]`. Add a cleanup check on project load: scan `assets/fonts/` and remove metadata entries for missing files.

## Minor Pitfalls

### Pitfall 9: DraggableElement Click vs Drag Ambiguity

**What goes wrong:** In the title designer, clicking a button element to select it sometimes triggers a small drag instead, moving the element 1-2 pixels.

**Prevention:** This is an existing issue in `DraggableElement.vue`. The current implementation doesn't have a drag threshold — any mousedown+mousemove triggers a move. Add a minimum drag distance (e.g., 3px) before emitting `move` events. This improves both designers.

### Pitfall 10: Large Font Files Slow Down Project Save

**What goes wrong:** User imports a 10MB font file. The `script.data.assets.fonts[]` metadata is tiny (just name/path), but if font binary data accidentally ends up in the script store or undo history, saves become slow.

**Prevention:** Never store font binary data in the script store. Only store metadata (name, file path, family). The font file lives on disk at `assets/fonts/` and is referenced by URL.

### Pitfall 11: CSS backdrop-filter Performance on Low-End Machines

**What goes wrong:** Settings overlay blur effect causes noticeable lag on older hardware.

**Prevention:** Keep blur radius reasonable (12px max). If performance issues are reported, provide a CSS variable that can be set to `none`. Low priority — targets desktop Electron, not mobile browsers.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Asset Library: IPC handlers | Reactive proxy in IPC (#3) | JSON.parse/stringify before all invoke calls |
| Asset Library: Font import | @font-face dual-process (#2) | Shared fontLoader.js, test in both windows |
| Asset Library: Auto-naming | Counter race condition (#5) | Sequential processing in main process |
| Title Designer: Schema | Editor/runtime schema mismatch (#1) | Update TitleScreen.js first, before building designer |
| Title Designer: BGM | BGM overlap on game start (#7) | Stop BGM in onStart/onContinue callbacks |
| Settings Overlay: Animation | Rapid open/close glitch (#6) | State flag, force-reset on re-trigger |
| Settings Overlay: CSS | backdrop-filter performance (#11) | Reasonable blur radius, CSS variable fallback |

## Sources

- Codebase analysis: every pitfall derived from actual code patterns observed in the repository
- Known issues: PROJECT.md documents the reactive proxy IPC bug (already fixed in v0.1)
- TitleScreen.js vs SettingsScreen.js schema comparison: verified by reading both files
- Z-index stacking: verified in style.css
