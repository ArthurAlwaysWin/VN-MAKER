# Pitfall Research — v0.5: 游戏 UI 补全

**Domain:** Visual novel engine — adding save/load UI, quick action bar, fast-forward, file system saves
**Researched:** 2025-07-17
**Overall confidence:** HIGH (based on direct codebase analysis + domain expertise)

---

## Critical Pitfalls (must address — cause rewrites or broken features)

### P1: html2canvas Cannot Resolve `asset://` Protocol Images

**What goes wrong:** html2canvas re-fetches all images by their `src` URL to render them onto an offscreen canvas. The `asset://` custom protocol is registered via Electron's `protocol.handle()` — it works in the Electron renderer's `<img>` tags, but html2canvas creates its own internal fetch/XMLHttpRequest calls that **cannot resolve custom Electron protocols**. All background images and character sprites loaded via `asset://backgrounds/...` will render as **blank/broken** in screenshots.

**Why it happens:** html2canvas operates in a sandboxed rendering context. It parses the DOM, extracts image URLs, and re-downloads them. Electron custom protocols are registered at the main process level and are accessible from the renderer's native fetch API, but html2canvas's internal image loading may use different mechanisms (e.g., `Image()` constructor with `.crossOrigin` attribute) that don't properly route through Electron's protocol handler. Even if they do route correctly, cross-origin tainting will mark the canvas as tainted, preventing `.toDataURL()` from working.

**Consequences:** Screenshots show dialogue text over a black/empty background with no characters. If `allowTaint` is false (default), html2canvas throws a SecurityError.

**Prevention:**
1. Before calling html2canvas, temporarily swap all `asset://` URLs to `data:` base64 URLs by reading the actual image data, OR
2. Use `html2canvas(element, { useCORS: true, allowTaint: true })` combined with ensuring the asset protocol responds with proper CORS headers, OR
3. **Best approach:** Skip html2canvas entirely for the game screenshot. Instead, manually composite a thumbnail: take the current background image + character positions and draw them onto an offscreen `<canvas>` element using `drawImage()`. This is faster, more reliable, and gives you precise control over thumbnail size.
4. If sticking with html2canvas: use the `proxy` option or pre-convert images. Set `{ scale: 0.25, width: 320, height: 180 }` to reduce output size.

**Detection:** Screenshots are entirely black or show only text elements. Console shows CORS/taint errors.

**Phase:** Must be designed in the save/load UI phase. Architecture choice affects the entire screenshot pipeline.

---

### P2: Quick Action Bar Duplicates Existing `#quick-controls`

**What goes wrong:** The codebase **already has** a `#quick-controls` element (main.js lines 54-62) with 4 buttons (AUTO, SKIP, LOG, MENU) appended to `#dialogue-layer`. The v0.5 spec calls for a new "快捷按钮栏" with 6 buttons (save/load/backlog/settings/auto/skip). Building the new bar without removing the old one creates **duplicate buttons**, double event handlers, and visual overlap.

**Why it happens:** The existing quick controls were a minimal implementation. The new design expands the concept but the developer may forget the old code exists, or attempt to patch it rather than replace it cleanly.

**Consequences:** Two sets of AUTO/SKIP buttons. Clicking one doesn't update the other's active state. Visual mess at the dialogue box bottom.

**Prevention:**
1. **Remove** the existing `#quick-controls` block entirely from main.js (lines 53-62) and its CSS (#quick-controls rules at ~line 1043 in style.css).
2. Build the new QuickActionBar as a proper class (like GameMenu, DialogueBox) rather than inline DOM creation.
3. Wire the new bar's callbacks through the same `toggleAuto()`, `toggleSkip()`, `gameMenu.onBacklog()`, `gameMenu.onSettings()` functions plus new save/load triggers.
4. Ensure the active state syncing (`updateQuickBtnStates`) is updated to reference the new bar's buttons.

**Detection:** Two rows of buttons visible during gameplay. Active state indicators (AUTO highlighted) on one bar but not the other.

**Phase:** First phase — must be addressed immediately when building the quick action bar.

---

### P3: ESC Priority Chain Incomplete for New Fullscreen Overlays

**What goes wrong:** The current ESC priority chain (main.js lines 258-291) handles: `settingsScreen > gameMenu > game`. The new fullscreen save/load screen is NOT in this chain. Pressing ESC while the save/load screen is open does nothing, or worse, toggles the game menu behind it.

**Why it happens:** The ESC handler was written for the original 3 layers. Each new fullscreen overlay must be explicitly added to the priority chain in the correct order.

**Consequences:** Users press ESC to close the save/load screen — nothing happens, or the game menu toggles behind the save/load overlay. Breaks the "ESC always goes back" expectation that VN players have.

**Prevention:**
The ESC handler must check layers in this order:
```
1. Save/Load screen (highest, it's fullscreen replacement)
2. Settings overlay
3. Backlog screen (also fullscreen — currently NOT in ESC chain!)
4. Game menu
5. Game (dialogue advance or ignore)
```
Implement a proper layer stack manager rather than hardcoded if/else:
```javascript
const overlayStack = [saveLoadScreen, settingsScreen, backlogScreen, gameMenu];
// ESC closes the topmost visible overlay
for (const overlay of overlayStack) {
  if (overlay.isVisible) { overlay.hide(); return; }
}
```
Note: BacklogScreen also currently has NO ESC dismiss — add an `isVisible` getter and include it.

**Detection:** Manual ESC testing with each overlay open. Open save screen → press ESC → verify save screen closes.

**Phase:** Must be designed when building the save/load screen. Refactor the ESC handler into a stack-based system.

---

### P4: Save/Load Screen Opened from Multiple Contexts with Different Return Behavior

**What goes wrong:** The save/load screen can be opened from:
1. **Game menu** → "存档" / "读档" buttons (gameMenu.onSave/onLoad, main.js lines 215-216)
2. **Title screen** → "继续游戏" button (titleScreen.onContinue, main.js line 416)
3. **New: Quick action bar** → save/load buttons

The "return/close" behavior must differ: from game menu → close save/load screen and show game menu again. From title screen → close save/load screen and show title screen. From quick bar → just close save/load screen.

Currently, the save/load screen simply calls `this.hide()` on close (SaveLoadScreen.js line 53), with no concept of "who opened me."

**Consequences:** User opens save/load from title screen, presses "返回" → screen closes but they see the game field instead of the title screen. Or: they opened from game menu, close save/load, and the game menu is gone.

**Prevention:**
1. Add an `onClose` callback to SaveLoadScreen that the caller sets before calling `show()`.
2. Or better: pass a `context` parameter to `show()`: `show('save', { returnTo: 'gameMenu' })` and handle return in the close handler.
3. Note: the game menu currently hides itself before showing save/load (GameMenu.js line 62: `this.hide()` for non-settings actions). Consider NOT hiding the game menu when opening save/load, or tracking that it should be re-shown.

**Detection:** Test flow: Title → Continue → Close save/load → where am I? Game Menu → Save → Close → is game menu back?

**Phase:** Save/Load UI phase. The callback/context pattern must be designed upfront.

---

### P5: Read-Page Tracking for "Skip Read Only" Has No Persistence Layer

**What goes wrong:** "只跳已读" (skip-read-only) mode requires the engine to know which pages the player has previously seen. This requires a persistent Set of `sceneId:pageIndex` pairs that survives across game sessions. This data is NOT part of save state (it's global progress, not per-save). Currently, no infrastructure exists for this.

**Why it happens:** Save state (ScriptEngine.getState()) captures `currentScene`, `pageIndex`, `dialogueIndex`, `variables`, `history` — but NOT "all pages ever visited." This is a fundamentally different data category: it's per-game-per-player global data, not per-save-slot data.

**Consequences:** If stored nowhere, "skip read only" never skips anything. If stored only in memory, progress resets on game restart. If stored in save state, loading an old save would "forget" pages read after that save was made.

**Prevention:**
1. Create a `ReadTracker` class that maintains a `Set<string>` of `"${sceneId}:${pageIndex}"` keys.
2. Persist to its own file: `saves/read-progress.json` (after the file system migration) or a dedicated localStorage key.
3. Hook into `engine.on('page_enter')` to record every page entered.
4. On the `ScriptEngine`, expose a method `isPageRead(sceneId, pageIndex)` that checks the tracker.
5. The read tracker should NEVER be cleared by "New Game" — it's cumulative across all playthroughs.
6. In skip mode, check: `if (skipMode === 'all' || readTracker.has(key))` before auto-advancing.

**Detection:** Start new game → play through some pages → save → restart game → load → try "skip read only" → does it skip?

**Phase:** Fast-forward phase. Must be designed and implemented as a prerequisite for the "skip read only" toggle.

---

## Integration Pitfalls (interactions between existing and new systems)

### P6: Auto/Skip Mode Not Paused When Overlays Open

**What goes wrong:** Currently, auto mode and skip mode are stopped when returning to title (`gameMenu.onTitle` calls `stopAuto()` and `stopSkip()`). But opening save/load, settings, or backlog directly from the quick bar does NOT go through the game menu — so auto/skip keeps running behind the overlay. The dialogue keeps advancing while the player is browsing save slots.

**Why it happens:** The auto/skip stop logic is wired into specific callbacks. Direct access to save/load/settings/backlog from the new quick bar bypasses these.

**Consequences:** Player opens save screen → dialogue advances behind it → they save at a different point than they expected. Audio keeps playing/changing.

**Prevention:**
1. Create a centralized `pauseGameplay()` / `resumeGameplay()` function that stops auto, stops skip, and pauses the engine's waiting state.
2. Call `pauseGameplay()` whenever any overlay opens (save/load/settings/backlog).
3. Call `resumeGameplay()` when all overlays close.
4. Or simpler: in every overlay's `show()` method, emit an event or call a global `stopAuto(); stopSkip();`.

**Detection:** Activate auto mode → open save screen → wait 10 seconds → close save screen → is the dialogue at a different point?

**Phase:** Quick action bar phase (when wiring button callbacks) and save/load UI phase.

---

### P7: Save While Typewriter Animation is Mid-Line Captures Incomplete State

**What goes wrong:** If the player opens save (via quick bar) while the typewriter effect is still rendering text, `engine.getState()` returns the current `dialogueIndex`. But when loaded, the dialogue replays from the start of that line — this is fine. However, the save's preview text and screenshot may show incomplete/partial text, which looks buggy.

**Prevention:**
1. Before taking a screenshot for save, call `dialogueBox._finishLine()` to instantly complete the typewriter effect. This ensures the screenshot shows the full dialogue text.
2. For previewText, use `engine.history[engine.history.length - 1].text` (already done in current code, line 183) which is the full text — but verify that history is updated at the START of `_playCurrentDialogue()`, not at the end (it IS: line 397-403 in ScriptEngine.js pushes to history before emitting).
3. Take the screenshot AFTER finishing the typewriter, not concurrently.

**Detection:** Start typing a long dialogue → immediately press save → check screenshot and preview text.

**Phase:** Save/Load UI phase (screenshot capture logic).

---

### P8: Click-Through on Quick Action Bar Triggers Dialogue Advance

**What goes wrong:** The game container has a click handler (main.js lines 295-313) that advances dialogue when clicking anywhere. The existing `#quick-controls` is already guarded (`if (target.closest('#quick-controls')) return;`). But the new QuickActionBar will have a different element ID/structure. If the guard isn't updated, clicking the new bar's buttons will BOTH trigger the button action AND advance dialogue.

**Consequences:** Click "存档" → dialogue advances AND save screen opens. The save captures the NEXT dialogue instead of the current one.

**Prevention:**
1. Update the click-through guard in the `gameContainer.addEventListener('click')` handler to include the new QuickActionBar's selector.
2. Better: use `e.stopPropagation()` in the QuickActionBar's click handler (like DialogueBox does on line 53), so the event never reaches the game container.
3. Best: refactor the click-through guard to use a generic class like `.ui-interactive` on all overlay/button containers, and check `if (target.closest('.ui-interactive')) return;`.

**Detection:** Click any quick bar button → does the dialogue also advance?

**Phase:** Quick action bar phase.

---

### P9: Voice Audio Keeps Playing When Save/Load Screen Opens

**What goes wrong:** When the player opens save/load from the quick bar, the current voice clip keeps playing. If they then load a different save, the old voice overlaps with the new state's rendering.

**Why it happens:** `audio.stopVoice()` is only called in `gameMenu.onTitle` and `engine.on('end')`. Opening save/load doesn't stop voice.

**Consequences:** Audio from the old scene bleeds into the loaded state. Particularly jarring if loading a save from a different scene.

**Prevention:**
1. On successful `onLoad` callback, call `audio.stopVoice()` before `replayCurrentPage()`.
2. Optionally pause voice when any overlay opens (see P6).
3. The `replayCurrentPage()` function (main.js line 202-207) should include `audio.stopVoice()` as part of its cleanup — currently it does `characters.clear()`, `background.clear()`, `engine.resetRenderState()` but NOT audio cleanup.

**Detection:** Play a voiced dialogue → open save screen → load a different save → is the old voice still playing?

**Phase:** Save/Load UI phase (onLoad callback wiring).

---

## Electron-Specific Pitfalls

### P10: Game Engine Window Lacks `ipcRenderer` for File System Saves

**What goes wrong:** The file system save upgrade requires IPC calls from the renderer (game engine) to the main process to read/write files in `saves/`. However, the game engine runs in `index.html` with `src/main.js`. The preview window created in electron/main.js (lines 546-561) creates a `BrowserWindow` **without** a `webPreferences.preload` configuration — it has no `window.ipcRenderer`.

**Additionally:** The iframe-based preview inside the editor shares the editor's renderer process but NOT its preload globals. The iframe's `window.ipcRenderer` is undefined.

**Consequences:** `window.ipcRenderer` is undefined in the game context → all file system save operations fail silently or throw.

**Prevention:**
1. Verify that every `BrowserWindow` that loads the game engine has `webPreferences.preload` pointing to `preload.mjs` (or a game-specific preload).
2. For the **standalone preview window** (electron/main.js line 546): add `webPreferences: { preload: path.join(__dirname, 'preload.mjs') }`.
3. For the **editor iframe preview**: save/load operations should be disabled in preview mode (`engine._previewMode === true`). Hide save/load buttons in the quick bar when previewing.
4. Add a runtime check: `if (!window.ipcRenderer) { /* fall back to localStorage or disable save */ }`.

**Detection:** Open game in standalone mode → try to save → check console for "ipcRenderer is not defined" errors.

**Phase:** Save system upgrade phase. Must be resolved before any file I/O from the game engine.

---

### P11: Reactive Proxy Serialization in New IPC Handlers

**What goes wrong:** The project has a known past bug (PROJECT.md line 105): "创建项目 reactive Proxy 序列化失败 — 已修复（解构为纯对象）". If the new save data passes through any Vue reactive state (e.g., if a Pinia store wraps save slot info), the Proxy objects will fail to serialize across IPC `invoke()` calls.

**Consequences:** `ipcRenderer.invoke('save-game', data)` throws "An object could not be cloned" error. Saves silently fail.

**Prevention:**
1. Always use `JSON.parse(JSON.stringify(data))` or spread/destructure before passing data to IPC.
2. The SaveManager should handle this internally — its `save()` method should deep-clone the state before IPC:
   ```javascript
   save(slot, state, previewText) {
     const plainState = JSON.parse(JSON.stringify(state));
     return ipcRenderer.invoke('save-game', { slot, state: plainState, previewText });
   }
   ```
3. Note: engine state (ScriptEngine.getState()) currently returns plain objects with `Object.fromEntries()` for variables — this is correct. But if the engine is ever wrapped in a reactive proxy (e.g., Pinia store for engine state), the problem recurs.

**Detection:** Save fails with console error about cloning. Test with Vue devtools reactive state.

**Phase:** Save system upgrade phase.

---

### P12: `saves/` Directory Path Resolution Across Contexts

**What goes wrong:** The file system saves need a `saves/` directory, but its location depends on context:
- **Editor project mode:** Project is at `currentProjectPath` in electron/main.js. Saves go to `${currentProjectPath}/saves/`.
- **Standalone game (packaged):** No `currentProjectPath`. Saves go to `app.getPath('userData')/saves/` or relative to the executable.
- **Development (Vite dev server):** index.html loads from dev server. `currentProjectPath` may be null.

Using the wrong path = saves go to the wrong location or fail entirely.

**Consequences:** Saves created in editor testing don't appear when running the game standalone. Or saves go to a system directory the user can't find.

**Prevention:**
1. Define a clear `getSavesPath(gameId)` function in the main process:
   ```javascript
   function getSavesPath(gameId) {
     if (currentProjectPath) {
       return path.join(currentProjectPath, 'saves');
     }
     return path.join(app.getPath('userData'), 'saves', gameId);
   }
   ```
2. The IPC handler receives a `gameId` (from `script.meta` or `project.json`) and resolves the path.
3. Always `mkdir(savesPath, { recursive: true })` before any read/write.
4. Add path traversal protection (reuse `isInsideProject()` pattern from existing code).

**Detection:** Save in one mode → check file system → is it in the expected folder?

**Phase:** Save system upgrade phase (IPC handler design).

---

### P13: Thumbnail Image Files in `saves/` Need Security Validation

**What goes wrong:** Save screenshots are stored as image files in the `saves/` directory. Without validation, the IPC handler could write arbitrary data to disk, or path traversal in filenames could overwrite project files.

**Prevention:**
1. Reuse the existing PNG magic byte validation pattern from `save-processed-image` handler (electron/main.js lines 432-456).
2. Use `path.basename()` to strip any directory components from filenames.
3. Set a maximum file size (e.g., 2MB per thumbnail — a 320×180 JPEG is typically 10-50KB).
4. Use the `isInsideProject()` check for the resolved write path.
5. Consider storing thumbnails as JPEG instead of PNG for smaller file sizes.

**Phase:** Save system upgrade phase (IPC handler implementation).

---

## Save System Migration Pitfalls

### P14: Backward Compatibility — Existing localStorage Saves Become Invisible

**What goes wrong:** Players who have saves in localStorage from the current 8-slot system will lose access after upgrading to file system saves. The new SaveManager reads from `saves/` directory, old saves are in `localStorage`.

**Consequences:** Players update the game and their save progress vanishes. For a VN, this is devastating — they may be hours in.

**Prevention:**
1. On first launch with new save system, check for existing localStorage saves and migrate them:
   ```javascript
   async migrateFromLocalStorage(gameId) {
     for (let i = 0; i < 8; i++) {
       const key = `${gameId}_save_${i}`;
       const raw = localStorage.getItem(key);
       if (raw) {
         await this.saveToFile(i, JSON.parse(raw));
         localStorage.removeItem(key);
       }
     }
   }
   ```
2. Run migration automatically in `SaveManager.init()`.
3. Keep a migration flag: `${gameId}_migrated_to_fs = true` to avoid re-running.
4. **Fallback:** If file system is unavailable (no IPC), keep using localStorage as before.

**Detection:** Create saves with old system → upgrade SaveManager → are old saves still accessible?

**Phase:** Save system upgrade phase. Must be the FIRST thing implemented in the new SaveManager.

---

### P15: Loading 100 Slot Thumbnails on Save/Load Screen Open is Slow

**What goes wrong:** The new save/load screen has 10×10=100 slots. Loading all 100 slot metadata + thumbnail images when the screen opens could take 500ms-2s if reading from disk, causing a visible freeze or flash of empty slots.

**Why it happens:** Each slot requires reading a JSON metadata file + an image file from disk. Even with SSD, 200 IPC round-trips have significant overhead.

**Consequences:** User clicks "存档" → sees a blank grid for 1-2 seconds → slots pop in.

**Prevention:**
1. **Batch loading:** Single IPC call `getAllSlots()` that returns all metadata in one response. Main process reads all files, returns an array.
2. **Pagination (recommended):** Show 10 slots per page with 10 page buttons. Load one page at a time. This is the standard VN pattern — Ren'Py and most commercial VNs paginate saves.
3. **Lazy thumbnail loading:** Return metadata (date, preview text) immediately. Load thumbnails lazily as `<img src="asset://saves/save_0.jpg">` which streams via the existing protocol handler.
4. **Cache slot metadata in memory:** After first load, keep a `Map<number, SlotInfo>` in the renderer. Only refresh the specific slot that was just saved.

**Detection:** Profile with DevTools Performance tab. Measure time from button click to fully rendered grid.

**Phase:** Save/Load UI phase (architecture of the slot loading).

---

### P16: ConfigManager Still Uses localStorage — Inconsistent Persistence Layer

**What goes wrong:** SaveManager migrates to file system, but ConfigManager (settings like volume, text speed) stays in localStorage. Different projects share the same settings.

**Consequences:** Low severity for v0.5. Settings being global across games is acceptable behavior (most VN engines do this).

**Prevention:**
1. For v0.5, **leave ConfigManager in localStorage** — it's fine.
2. Document this as a known limitation for future consideration.
3. If you do migrate later: use `saves/config.json` alongside save slot files.

**Phase:** Deferred — not required for v0.5. Note in documentation.

---

### P17: Save Data Schema Must Include Version Field

**What goes wrong:** The current save data (SaveManager.save) stores `{ state, previewText, timestamp, date }` without a schema version. When v0.5 adds new fields (screenshot path, engine version, read progress), old saves won't have them. Without a version field, you can't distinguish old-format saves from new ones.

**Prevention:**
```javascript
const data = {
  version: 2, // ← ADD THIS
  state,
  previewText,
  screenshotFile, // new in v2
  timestamp: Date.now(),
  date: new Date().toLocaleString('zh-CN'),
};
```
On load: `if (data.version === 1 || !data.version) { /* migrate */ }`.

**Phase:** Save system upgrade phase. Add version field to the new save format from day one.

---

## Screenshot (html2canvas) Pitfalls

### P18: 100 Uncompressed Screenshots = 50-200MB Disk Usage

**What goes wrong:** A 1280×720 PNG screenshot is 500KB-2MB. 100 of them means 50-200MB of disk space just for thumbnails.

**Prevention:**
1. **Capture at reduced resolution:** 320×180 (1/4 scale). VN save screens show tiny thumbnails — full resolution is wasted.
2. **Use JPEG instead of PNG:** For photographic game scenes, JPEG at quality 0.7 is 10-30KB per thumbnail vs 100-500KB PNG. Use `canvas.toDataURL('image/jpeg', 0.7)` or `canvas.toBlob(cb, 'image/jpeg', 0.7)`.
3. **Use toBlob() instead of toDataURL():** `toDataURL` creates a base64 string (33% larger than binary). Use `canvas.toBlob()` for binary data, then send via IPC as ArrayBuffer.
4. Target: <50KB per thumbnail, <5MB total for 100 slots.

**Phase:** Save/Load UI phase (screenshot capture implementation).

---

### P19: html2canvas Freezes UI Thread During Capture

**What goes wrong:** html2canvas is synchronous in its DOM parsing phase. For a complex game scene (background image + character sprites + dialogue box), capture can take 200-500ms, freezing the UI.

**Prevention:**
1. Show a brief "保存中..." indicator BEFORE starting capture.
2. Use double `requestAnimationFrame` to ensure indicator renders:
   ```javascript
   showSaveIndicator();
   requestAnimationFrame(() => {
     requestAnimationFrame(async () => {
       const canvas = await html2canvas(gameContainer, { scale: 0.25 });
       // ... save logic
       hideSaveIndicator();
     });
   });
   ```
3. Debounce the save button — disable it for 500ms after click.
4. Consider the manual canvas compositing approach (from P1) — drawing 2-3 images onto a canvas is <10ms.

**Phase:** Save/Load UI phase.

---

### P20: Screenshot Captures UI Overlays Instead of Game Scene

**What goes wrong:** If the save/load screen or quick action bar is visible when html2canvas captures the game container, the screenshot includes UI elements, not just the game scene.

**Prevention:**
1. **Pre-capture strategy:** Take the screenshot BEFORE opening the save/load screen. When "save" is triggered, capture first, then show the screen.
2. Use html2canvas's `ignoreElements` option:
   ```javascript
   html2canvas(gameContainer, {
     ignoreElements: (el) => {
       return el.id === 'ui-overlay' || el.id === 'quick-action-bar' ||
              el.id === 'save-load-screen' || el.id === 'game-menu';
     }
   });
   ```
3. Or capture only specific layers: `#background-layer` + `#character-layer` + `#dialogue-layer` (minus quick controls).
4. Or **pre-cache approach:** Take a screenshot on every dialogue change (debounced) and cache it, so it's always ready for save.

**Phase:** Save/Load UI phase (screenshot timing logic).

---

## Fast-Forward Pitfalls

### P21: Skip Mode at 50ms Intervals Causes Audio Glitches and Resource Leaks

**What goes wrong:** Current skip mode uses `setTimeout(() => engine.next(), 50)` (main.js line 117). At 50ms per page, the engine fires `play_bgm`, `play_se`, `play_voice` events 20 times per second. Each `playBgm` call stops the current BGM and starts a new one (AudioManager.playBgm line 45: `this.stopBgm({ fadeOut: 0 })`). This creates rapid audio start/stop cycles → audible pops, clicks, and memory leaks from `new Audio()` objects.

**Consequences:** Rapid popping/clicking audio. Memory leak from unreleased Audio objects. Browser may throttle audio.

**Prevention:**
1. **Suppress audio during skip mode.** Check skip state in event handlers:
   ```javascript
   engine.on('play_bgm', (data) => {
     if (!skipMode) audio.playBgm(data);
     else pendingBgm = data; // Track what BGM should play when skip stops
   });
   engine.on('play_se', (data) => { if (!skipMode) audio.playSe(data); });
   ```
2. When skip mode ends, apply the final audio state (play the BGM that the current page specifies).
3. Also suppress voice during skip: don't call `audio.playVoice()` in skip mode.
4. The engine's `_renderPage` still fires all events — suppression at the handler level keeps the engine pure.

**Detection:** Enable skip mode → listen for audio pops. Check DevTools → Memory for Audio object accumulation.

**Phase:** Fast-forward phase.

---

### P22: Skip Mode Can Stack Overflow with Rapid Condition Pages

**What goes wrong:** Condition pages (`type: 'condition'`) auto-advance without waiting. The call chain is: `next()` → `_advancePage()` → `_processCurrentPage()` → `_execCondition()` → `_enterScene()` → `_processCurrentPage()`. This is synchronous recursion. A chain of many condition pages or a condition loop causes infinite recursion → stack overflow.

**Note:** This can happen even without skip mode, but skip mode makes it more likely to be triggered since players rapidly traverse more content.

**Prevention:**
1. Add a recursion depth counter in `_processCurrentPage()`:
   ```javascript
   _processCurrentPage(depth = 0) {
     if (depth > 100) {
       console.error('[ScriptEngine] Possible infinite loop — too many condition pages');
       this._execEnd();
       return;
     }
     // ... pass depth + 1 to recursive calls
   }
   ```
2. Or break recursion with `queueMicrotask()` for condition pages (lighter than setTimeout(0)).

**Phase:** Fast-forward phase (engine robustness).

---

### P23: Transition Animations Bottleneck Skip Speed

**What goes wrong:** Pages have transition effects (fade, etc.) with default 800ms duration. Skip mode advances at 50ms intervals, but the background/character transitions take 800ms. The visual state becomes a blur of overlapping transitions, and DOM mutations pile up.

**Prevention:**
1. In skip mode, override transition duration to 0:
   ```javascript
   engine.on('set_background', (data) => {
     if (skipMode) data.duration = 0;
     background.setBackground(data);
   });
   ```
2. Apply the same override for character show/hide transitions.
3. This makes skip mode feel instant, which is the expected VN behavior.

**Phase:** Fast-forward phase (polish).

---

### P24: "Skip All" vs "Skip Read Only" Toggle Needs Settings UI + Engine Wiring

**What goes wrong:** The skip mode toggle needs: (1) a quick bar button that starts/stops skip, and (2) a settings screen option to choose between "skip all" and "skip read only." If the settings option isn't wired to the skip logic, the button always does "skip all" which defeats the read-tracking feature.

**Prevention:**
1. Add a setting `skipMode: 'all' | 'readOnly'` to ConfigManager defaults.
2. Add a new settings component via SETTING_DEFS: type 'select', key 'skipMode', options: [{label: '全部跳过', value: 'all'}, {label: '仅跳已读', value: 'readOnly'}].
3. In the skip logic:
   ```javascript
   function shouldSkipCurrentPage() {
     if (config.get('skipMode') === 'all') return true;
     return readTracker.isRead(engine.currentScene, engine.pageIndex);
   }
   ```
4. When "skip read only" encounters an unread page, auto-stop skip mode and optionally flash the skip button.

**Phase:** Fast-forward phase + Settings page update.

---

## Summary Table

| ID | Pitfall | Severity | Category | Prevention Summary | Phase |
|----|---------|----------|----------|-------------------|-------|
| P1 | html2canvas can't resolve `asset://` URLs | **CRITICAL** | Screenshot | Manual canvas compositing OR pre-convert to data URLs | Save/Load UI |
| P2 | Duplicate quick controls (old + new) | **CRITICAL** | Integration | Remove existing `#quick-controls`, build new class | Quick Action Bar |
| P3 | ESC chain missing save/load + backlog | **CRITICAL** | Integration | Stack-based overlay manager with priority order | Save/Load UI |
| P4 | Save/Load return context differs by caller | **HIGH** | Integration | onClose callback or context parameter in show() | Save/Load UI |
| P5 | No persistence for read-page tracking | **CRITICAL** | Fast-forward | ReadTracker class with own file/localStorage persistence | Fast-forward |
| P6 | Auto/Skip continues behind overlays | **HIGH** | Integration | Centralized `pauseGameplay()` on any overlay open | Quick Bar + Save/Load |
| P7 | Save during typewriter = partial screenshot | **MEDIUM** | Integration | Finish typewriter before screenshot capture | Save/Load UI |
| P8 | Quick bar clicks also advance dialogue | **HIGH** | Integration | `stopPropagation()` or update click-through guard | Quick Action Bar |
| P9 | Voice keeps playing on load | **MEDIUM** | Integration | Stop voice in replayCurrentPage() cleanup | Save/Load UI |
| P10 | Game window missing `ipcRenderer` | **CRITICAL** | Electron | Ensure preload on all BrowserWindows; disable in iframe | Save System |
| P11 | Reactive Proxy in IPC (known recurring) | **HIGH** | Electron | `JSON.parse(JSON.stringify())` before IPC calls | Save System |
| P12 | `saves/` path differs across contexts | **HIGH** | Electron | Centralized `getSavesPath(gameId)` resolver | Save System |
| P13 | Screenshot files lack security validation | **MEDIUM** | Electron | Reuse PNG validation, `path.basename()`, size limit | Save System |
| P14 | Old localStorage saves become invisible | **CRITICAL** | Migration | Auto-migrate localStorage → file system on first run | Save System |
| P15 | Loading 100 slots is slow (200 IPC trips) | **HIGH** | Performance | Batch IPC + pagination (10 per page) | Save/Load UI |
| P16 | ConfigManager still in localStorage | **LOW** | Migration | Leave as-is for v0.5, document as known | Deferred |
| P17 | No version field in save data schema | **MEDIUM** | Migration | Add `version: 2` to save format from day one | Save System |
| P18 | 100 uncompressed screenshots = huge disk | **HIGH** | Screenshot | 320×180 JPEG at quality 0.7, target <50KB each | Save/Load UI |
| P19 | html2canvas freezes UI thread | **MEDIUM** | Screenshot | Show indicator, debounce, or use manual canvas | Save/Load UI |
| P20 | Screenshot captures UI overlays | **HIGH** | Screenshot | `ignoreElements` or pre-capture before showing UI | Save/Load UI |
| P21 | Skip mode causes audio glitches | **HIGH** | Fast-forward | Suppress audio events during skip, apply final state | Fast-forward |
| P22 | Condition page loops → stack overflow | **MEDIUM** | Fast-forward | Recursion depth guard (>100 = force end) | Fast-forward |
| P23 | Transitions bottleneck skip speed | **MEDIUM** | Fast-forward | Override `duration: 0` during skip mode | Fast-forward |
| P24 | Skip all vs read-only needs settings UI | **HIGH** | Fast-forward | New SETTING_DEFS entry + wire to skip logic | Fast-forward |

---

## Phase-Specific Warnings

| Phase | Most Likely Pitfalls | First Thing to Check |
|-------|---------------------|---------------------|
| **Quick Action Bar** | P2 (duplicate controls), P8 (click-through), P6 (auto/skip not paused) | Does old `#quick-controls` still exist? |
| **Save/Load UI** | P1 (asset:// screenshots), P3 (ESC chain), P4 (return context), P15 (slow loading), P20 (UI in screenshot) | How will screenshots work without asset:// access? |
| **Fast-forward** | P5 (read tracking persistence), P21 (audio glitches), P22 (stack overflow), P24 (skip mode toggle) | Where does read-progress data live? |
| **Save System Upgrade** | P10 (no ipcRenderer), P11 (Proxy serialization), P12 (path resolution), P14 (localStorage migration) | Does the game window have IPC access? |

---

## "Looks Done But Isn't" Checklist

- [ ] **ESC closes every overlay** — save/load, settings, backlog, game menu all dismiss with ESC in correct priority order
- [ ] **Old quick controls removed** — no duplicate AUTO/SKIP buttons visible
- [ ] **Save from title screen returns to title** — not to black game screen
- [ ] **Save from game menu returns to game menu** — not to bare game
- [ ] **Auto mode stops when save screen opens** — dialogue doesn't advance behind overlay
- [ ] **Skip mode stops when overlays open** — no background advancement
- [ ] **Screenshot doesn't include UI** — save thumbnails show game scene only
- [ ] **Screenshot works with asset:// images** — not blank/black
- [ ] **100 slots don't freeze on open** — pagination or batch load, <500ms
- [ ] **Old localStorage saves migrate** — upgrading doesn't lose progress
- [ ] **Skip mode doesn't pop audio** — BGM/SE/voice suppressed during skip
- [ ] **Skip read only actually skips read pages** — persistence survives restart
- [ ] **File save works in standalone window** — ipcRenderer available, saves write to disk
- [ ] **Preview mode disables save/load** — no IPC errors in iframe preview
- [ ] **Voice stops on load** — no overlap between old and new state
- [ ] **Save version field present** — future-proofs the save format

---

## Sources

- **Direct codebase analysis**: `SaveManager.js`, `SaveLoadScreen.js`, `ScriptEngine.js`, `main.js` (engine wiring + quick controls + ESC handler + auto/skip logic), `GameMenu.js`, `DialogueBox.js`, `AudioManager.js`, `ConfigManager.js`, `SettingsScreen.js`, `BacklogScreen.js`, `TitleScreen.js`, `electron/main.js` (IPC handlers + window creation + asset protocol), `electron/preload.js`, `index.html`, `style.css` (z-index stacking)
- **Known project issues**: PROJECT.md documents Proxy serialization, Electron IPC, protocol streaming issues
- **html2canvas behavior**: Custom protocol URL resolution limitations, CORS tainting, `ignoreElements` API — HIGH confidence from library architecture knowledge
- **Electron IPC patterns**: Structured clone limitations, preload isolation, BrowserWindow webPreferences — HIGH confidence from Electron platform docs
- **VN engine conventions**: Save pagination, read tracking, skip modes, audio suppression during skip — HIGH confidence from Ren'Py/KiriKiri/Tyrano patterns
