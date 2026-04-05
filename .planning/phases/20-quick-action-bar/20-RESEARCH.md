# Phase 20: Quick Action Bar - Research

**Researched:** 2026-04-05
**Domain:** Game UI — quick action bar with save/load integration, Electron IPC
**Confidence:** HIGH

## Summary

Phase 20 replaces the existing 4-button `#quick-controls` (top-right, hover-to-show) with an 8-button QuickActionBar embedded inside the dialogue box DOM. The bar gains quicksave/quickload functionality (F5/F9), icon buttons from Lucide SVG, and auto/skip state indicators. Because the bar is a child of `#dialogue-box`, overlay sync (BAR-04) is automatically satisfied — no extra visibility logic needed.

The existing codebase provides strong foundations: `showToast()` already exists (main.js:73-83), the callback-based UI class pattern is well-established (GameMenu, BacklogScreen), `captureGameScreenshot()` handles screenshot capture (main.js:89-112), and `asset://saves/` protocol already serves save thumbnails (SAVE-06). The main work is: (1) creating QuickActionBar.js as an independent UI class, (2) extending SaveManager + IPC for quicksave/quickload, (3) replacing all 14 `quickControls` references in main.js, and (4) adding CSS for the new bar.

**Primary recommendation:** Build QuickActionBar.js following the GameMenu callback pattern exactly, embed it in `dialogueBox.el` from main.js (not inside DialogueBox.js), add 2 new IPC handlers for quicksave, and clean up all legacy `quickControls` references in one pass.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Embed bar inside DialogueBox DOM as child element (bottom of #dialogue-box)
- **D-02:** Bar always visible when dialogue is visible (no hover-to-show)
- **D-03:** 8 buttons in order: 自動 / 快進 / 回想 / 存档 / 読档 / 快存 / 快読 / 设置
- **D-04:** All tooltips in simplified Chinese
- **D-05:** Expanded from 6 to 8 buttons (quicksave/quickload promoted to this phase)
- **D-06:** Pure icon buttons, no text labels
- **D-07:** Hover tooltip in simplified Chinese
- **D-08:** Lucide icon SVGs, directly inline (no npm package)
- **D-09:** Custom icons deferred to UI beautification milestone
- **D-10:** Independent hidden slot `quicksave.json` + `quicksave.jpg`, not shown in save UI
- **D-11:** Each quicksave overwrites previous (one slot only)
- **D-12:** Quickload loads directly, no UI needed
- **D-13:** Check quicksave existence at game start for quickload button state
- **D-14:** Toast notification on quicksave/quickload success (bottom-left)
- **D-15:** Quickload button disabled (greyed) when no quicksave exists
- **D-16:** Save button → SaveLoadScreen(save), Load button → SaveLoadScreen(load)
- **D-17:** Independent `src/ui/QuickActionBar.js` class (GameMenu/BacklogScreen pattern)
- **D-18:** Auto/Skip state logic stays in main.js; bar notifies via callbacks
- **D-19:** Callback pattern: `bar.onAuto = () => ...`, `bar.onSave = () => ...` (GameMenu-style)
- **D-20:** main.js updates button states via `bar.setAutoActive(bool)` / `bar.setSkipActive(bool)` / `bar.setQuickLoadEnabled(bool)`
- **D-21:** F5 = quicksave, F9 = quickload (industry standard)
- **D-22:** Preserve existing shortcuts: A=auto, S=skip, L=backlog, ESC=close overlays/toggle dialogue
- **D-23:** Auto/Skip buttons show highlight when active (icon color change, e.g. purple highlight)
- **D-24:** Quickload button greyed: reduced opacity + `cursor: not-allowed`

### Agent's Discretion
- Specific Lucide icon choice per button
- Toast notification styling, position, disappear timing
- Button bar spacing, icon size, internal layout details
- QuickActionBar constructor parameter design

### Deferred Ideas (OUT OF SCOPE)
- User-customizable button icons (image upload, transparent background) → UI beautification milestone
- Quick button editor customization (images/colors/position) → UI beautification milestone
- Ctrl-hold continuous skip → future version
- "Jump to next choice" mode → future version
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BAR-01 | 6 buttons at dialogue box bottom (expanded to 8 per D-05) replacing `#quick-controls` | QuickActionBar.js class appended to dialogueBox.el; all 14 quickControls refs in main.js identified for replacement |
| BAR-02 | Extract to independent `QuickActionBar.js` UI class following GameMenu/BacklogScreen pattern | GameMenu callback pattern fully documented (constructor, el, show/hide, callback props); class structure template provided |
| BAR-03 | Auto/Skip buttons show active state indicator (highlight or icon change) | Existing `.active` class pattern from `.quick-btn.active` CSS; setAutoActive/setSkipActive methods toggle class on button elements |
| BAR-04 | Bar hides with dialogue (choice pages, menus, overlays) | Embedding in dialogueBox.el inherits visibility automatically — no extra logic needed; verified via choice handler (line 172), ESC toggle (line 340-346), right-click toggle (line 407-413) |
| BAR-05 | Button clicks don't advance dialogue; overlays pause auto/skip | stopPropagation on bar click handler + stopAuto/stopSkip in overlay-opening callbacks (already present in choice handler line 173-174, menu wiring line 292-293) |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript
- **Style**: Dark theme, pure CSS, Chinese interface
- **Engine**: Vanilla JS classes with named exports, one class per file
- **Naming**: PascalCase files for engine/UI classes, camelCase methods, `_` prefix for private
- **IPC pattern**: Return `{ success: boolean, error?: string }` objects
- **Imports**: Always use `.js` extensions, relative paths, no default exports
- **Error handling**: `try/catch` at boundaries, `console.error` with `[ModuleName]` prefix
- **Comments**: File-level JSDoc, inline `// ─── Section ───` dividers, `@param`/`@type` annotations
- **GSD Workflow**: Do not make direct repo edits outside a GSD workflow

## Standard Stack

### Core (No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Lucide Icons (inline SVG) | Latest | 8 button icons | D-08: copy SVG paths directly, zero npm install |
| Existing SaveManager | Phase 19 | Save/load backend | Extend with quickSave/quickLoad methods |
| Existing showToast() | Phase 19 | User feedback | Already in main.js:73-83, reuse for quicksave/quickload |
| Existing captureGameScreenshot() | Phase 19 | Quicksave thumbnails | Already in main.js:89-112, call before quicksave |
| Existing asset://saves/ | Phase 19 | Thumbnail serving | SAVE-06 already supports saves/ directory |

**No new npm dependencies.** All functionality built with existing codebase + inline SVG.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline Lucide SVG | lucide npm package | Adds dependency, increases bundle — REJECTED per D-08 |
| Inline Lucide SVG | Custom drawn SVG paths | More work, less recognizable icons — unnecessary |
| Separate IPC handlers | Reuse save-slot with string param | Would break existing numeric slot assumption in save-slot handler |

## Architecture Patterns

### Recommended File Structure
```
src/
├── ui/
│   ├── QuickActionBar.js   # NEW — 8-button bar component
│   ├── DialogueBox.js      # UNCHANGED — bar appended as child in main.js
│   ├── GameMenu.js          # REFERENCE — callback pattern
│   ├── SaveLoadScreen.js    # REFERENCE — save/load interaction
│   └── ...
├── engine/
│   └── SaveManager.js       # MODIFIED — add quickSave/quickLoad/hasQuickSave
├── main.js                  # MODIFIED — wire bar, remove old quickControls, add F5/F9
├── style.css                # MODIFIED — replace #quick-controls with #quick-action-bar styles
electron/
└── main.js                  # MODIFIED — add save-quickslot/load-quickslot IPC handlers
```

### Pattern 1: UI Class with Callback Props (from GameMenu.js)
**What:** Independent UI class that creates its own DOM, exposes callbacks, and has show/hide methods
**When to use:** Every game UI component in this project
**Example:**
```javascript
// Source: src/ui/GameMenu.js (lines 4-71)
export class QuickActionBar {
  constructor(container) {
    this.el = document.createElement('div');
    this.el.id = 'quick-action-bar';
    container.appendChild(this.el);

    // Callback props (GameMenu pattern)
    /** @type {Function|null} */ this.onAuto = null;
    /** @type {Function|null} */ this.onSkip = null;
    /** @type {Function|null} */ this.onBacklog = null;
    /** @type {Function|null} */ this.onSave = null;
    /** @type {Function|null} */ this.onLoad = null;
    /** @type {Function|null} */ this.onQuickSave = null;
    /** @type {Function|null} */ this.onQuickLoad = null;
    /** @type {Function|null} */ this.onSettings = null;

    this._render();
  }

  // State update methods (D-20)
  setAutoActive(active) { /* toggle .active class */ }
  setSkipActive(active) { /* toggle .active class */ }
  setQuickLoadEnabled(enabled) { /* toggle .disabled class */ }

  _render() { /* Build 8 icon buttons with data-action + title attrs */ }
}
```

### Pattern 2: Embedding in Dialogue Box (D-01)
**What:** Append QuickActionBar.el to dialogueBox.el in main.js, making it a DOM child
**When to use:** Only for the quick action bar
**Key insight:** By living inside `#dialogue-box`, the bar inherits all visibility toggling automatically:
```javascript
// In main.js — after both instances are created
const quickBar = new QuickActionBar(dialogueBox.el);
// Bar is now inside #dialogue-box — when dialogue hides, bar hides too
```
**Why not inside DialogueBox.js:** DialogueBox handles typewriter + text display. Callbacks are wired in main.js. Keeping QuickActionBar separate follows the "one class, one responsibility" pattern.

### Pattern 3: IPC Extension for Quicksave (from save-slot pattern)
**What:** New IPC handlers using the same pattern as existing save-slot/load-slot
**Example:**
```javascript
// In electron/main.js — follows save-slot pattern exactly
ipcMain.handle('save-quickslot', async (event, { state, previewText, thumbnail }) => {
  // Uses quicksave.json + quicksave.jpg instead of slot_NNN.json
  // Same atomicWrite, same path validation, same error handling
});

ipcMain.handle('load-quickslot', async () => {
  // Read quicksave.json, return { success, data } like load-slot
});
```

### Anti-Patterns to Avoid
- **Modifying DialogueBox.js to include bar logic:** Violates single responsibility. The bar's callbacks need main.js context (engine, audio, saveManager). Embed via `appendChild` in main.js instead.
- **Reusing save-slot IPC with magic slot number (e.g., slot 0):** The slot parameter is numeric (1-100) with `padStart(3, '0')`. Using a magic number creates implicit coupling and breaks the `list-saves` regex assumption.
- **Adding show()/hide() methods to QuickActionBar:** Not needed. Visibility is inherited from parent `#dialogue-box.visible` state. The bar should always be visible when its parent is visible (D-02).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | Existing `showToast()` in main.js:73-83 | Already styled, tested, handles fadeIn/hold/fadeOut |
| Screenshot capture | Manual canvas capture | Existing `captureGameScreenshot()` in main.js:89-112 | Handles dialogue/controls hide/restore, Electron capturePage |
| SVG icons | Hand-drawn paths | Lucide SVG paths (copy from lucide.dev) | Professional, consistent 24×24 grid, MIT licensed |
| Save file I/O | Direct fs operations | Extend SaveManager + IPC pattern | Atomic writes, path validation, error handling all built-in |
| Overlay visibility sync | Manual show/hide tracking | DOM child of dialogue-box | CSS visibility cascades automatically |

**Key insight:** By embedding in `dialogueBox.el`, BAR-04 (overlay sync) requires zero code — it's a natural consequence of DOM hierarchy.

## Existing Code Inventory

### References to Remove/Replace (14 occurrences of `quickControls`)

| Location | Line(s) | What | Action |
|----------|---------|------|--------|
| main.js | 54-62 | `quickControls` DOM creation + 4 buttons + appendChild | **Remove entirely** — replaced by QuickActionBar |
| main.js | 95 | `quickControls.style.display = 'none'` in captureGameScreenshot | **Simplify** — hiding dialogueBox now hides the bar |
| main.js | 103 | `quickControls.style.display = ''` restore after screenshot | **Simplify** — restoring dialogueBox.visible restores bar |
| main.js | 305-323 | `quickControls.addEventListener('click', ...)` | **Remove** — replaced by bar callback wiring |
| main.js | 342 | ESC toggle: `quickControls.style.display = 'none'` | **Remove** — toggling dialogue-box visibility handles bar |
| main.js | 345 | ESC toggle: `quickControls.style.display = ''` | **Remove** — toggling dialogue-box visibility handles bar |
| main.js | 381 | Click guard: `target.closest('#quick-controls')` | **Update** — change to `#quick-action-bar` |
| main.js | 409 | Right-click: `quickControls.style.display = 'none'` | **Remove** — toggling dialogue-box visibility handles bar |
| main.js | 412 | Right-click: `quickControls.style.display = ''` | **Remove** — toggling dialogue-box visibility handles bar |
| main.js | 507-510 | `updateQuickBtnStates()` querying quickControls children | **Replace** — call `quickBar.setAutoActive()` / `setSkipActive()` |
| style.css | 1084-1124 | `#quick-controls` and `.quick-btn` styles | **Replace** — new `#quick-action-bar` styles |

### Functions to Modify

| Function | Line | Change |
|----------|------|--------|
| `captureGameScreenshot()` | 89-112 | Remove quickControls hide/show (lines 95, 103) — bar is child of dialogue box, already hidden |
| `updateQuickBtnStates()` | 506-511 | Replace with calls to `quickBar.setAutoActive(autoMode)` and `quickBar.setSkipActive(skipMode)` |
| `toggleAuto()` | 438-447 | Replace `updateQuickBtnStates()` call |
| `toggleSkip()` | 492-499 | Replace `updateQuickBtnStates()` call |
| `stopAuto()` | 449-453 | Replace `updateQuickBtnStates()` call |
| `stopSkip()` | 501-504 | Replace `updateQuickBtnStates()` call |
| keydown handler | 326-372 | Add F5/F9 shortcuts, simplify ESC toggle (remove quickControls refs) |
| contextmenu handler | 395-414 | Simplify toggle (remove quickControls refs) |

### SaveManager.js Extensions Needed

| Method | Purpose | IPC Call |
|--------|---------|----------|
| `quickSave(state, previewText, thumbnail)` | Save to quicksave.json + quicksave.jpg | `save-quickslot` |
| `quickLoad()` | Load from quicksave.json | `load-quickslot` |
| `hasQuickSave()` | Check if quicksave.json exists (for button state) | `load-quickslot` (check result) or dedicated `check-quicksave` |

### IPC Handlers to Add (electron/main.js)

| Handler | File Pattern | Logic |
|---------|-------------|-------|
| `save-quickslot` | `saves/quicksave.json` + `saves/quicksave.jpg` | Same as save-slot but fixed filename, atomicWrite |
| `load-quickslot` | `saves/quicksave.json` | Same as load-slot but fixed filename |

**Note:** `list-saves` regex `/^slot_(\d{3})\.json$/` already excludes `quicksave.json` — no modification needed.

## Lucide Icon Recommendations

### Icon Selection (Agent's Discretion)

| Button | Chinese | Lucide Icon Name | Rationale |
|--------|---------|-------------------|-----------|
| 自動 | Auto | `play` | Universal play/auto-advance symbol |
| 快進 | Skip | `fast-forward` | Standard fast-forward (⏩) symbol |
| 回想 | Backlog | `scroll-text` | Scroll with text lines — represents history/log |
| 存档 | Save | `save` | Floppy disk — universal save symbol |
| 読档 | Load | `folder-open` | Open folder — universal "open/load" symbol |
| 快存 | Quick Save | `bookmark-plus` | Bookmark metaphor differentiates from regular save |
| 快読 | Quick Load | `bookmark-check` | Paired with quick save bookmark; check = loaded |
| 設置 | Settings | `settings` | Gear icon — universal settings symbol |

**Confidence:** MEDIUM — icon names verified against known Lucide catalog, but exact SVG paths should be copied from https://lucide.dev/icons/[name] during implementation.

### SVG Template (All Lucide Icons)
```html
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
  <!-- icon-specific paths here -->
</svg>
```

### Known SVG Paths (HIGH confidence for core icons)

**play:**
```html
<polygon points="6 3 20 12 6 21"></polygon>
```

**fast-forward:**
```html
<polygon points="13 19 22 12 13 5"></polygon>
<polygon points="2 19 11 12 2 5"></polygon>
```

**save:**
```html
<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path>
<path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path>
<path d="M7 3v4a1 1 0 0 0 1 1h7"></path>
```

**settings:**
```html
<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
<circle cx="12" cy="12" r="3"></circle>
```

**scroll-text, folder-open, bookmark-plus, bookmark-check:** Copy directly from https://lucide.dev/icons/ during implementation. These icons have multiple path elements that are more complex.

**Implementation note:** The executor should visit `https://lucide.dev/icons/[icon-name]`, click the SVG copy button, and extract the inner paths. All Lucide icons use the same 24×24 viewBox wrapper shown above.

## CSS Architecture for Quick Action Bar

### Recommended Styles
```css
/* Quick Action Bar — embedded in #dialogue-box bottom */
#quick-action-bar {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 4px 0 8px;
  /* No position/z-index needed — inherits from #dialogue-box */
}

.qab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 4px;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: all 0.2s;
}

.qab-btn:hover {
  color: rgba(255,255,255,0.8);
  background: rgba(60,50,100,0.4);
  border-color: rgba(255,255,255,0.15);
}

.qab-btn.active {
  color: rgba(180, 160, 255, 0.9);
  border-color: rgba(180, 160, 255, 0.3);
}

.qab-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.qab-btn svg {
  width: 20px;
  height: 20px;
}
```

### Z-Index Considerations
The bar does NOT need its own z-index. It's a child of `#dialogue-box` which is in `#dialogue-layer` (z-index: 3). This is below `#ui-overlay` (z-index: 10) and all overlays (z-index: 200), so overlays properly cover the bar.

**Current z-index hierarchy (verified from style.css):**
- `#background-layer`: 1
- `#character-layer`: 2
- `#dialogue-layer` (contains `#dialogue-box` → contains `#quick-action-bar`): 3
- `#ui-overlay`: 10
- `#game-menu`: 40 (inside `#ui-overlay`)
- `#title-screen`: 100
- `#save-load-screen`, `#backlog-screen`, `#settings-screen`: 200

## Quicksave/Quickload Flow

### Quick Save Flow (F5 or button click)
```
1. User presses F5 or clicks 快存 button
2. bar.onQuickSave callback fires in main.js
3. main.js captures screenshot: await captureGameScreenshot()
4. main.js builds state + previewText (same as saveLoadScreen.onSave)
5. main.js calls: await saveManager.quickSave(state, previewText, screenshot)
6. SaveManager calls: ipcRenderer.invoke('save-quickslot', { state, previewText, thumbnail })
7. electron/main.js writes saves/quicksave.json + saves/quicksave.jpg (atomicWrite)
8. On success: showToast('快速存档完成'), bar.setQuickLoadEnabled(true)
9. On failure: showToast('快速存档失败：' + error)
```

### Quick Load Flow (F9 or button click)
```
1. User presses F9 or clicks 快読 button (only if enabled)
2. bar.onQuickLoad callback fires in main.js
3. main.js calls: const data = await saveManager.quickLoad()
4. SaveManager calls: ipcRenderer.invoke('load-quickslot')
5. electron/main.js reads saves/quicksave.json, returns data
6. main.js restores state (same pattern as saveLoadScreen.onLoad)
7. showToast('快速读档完成')
```

### Initialization: Check Quicksave Existence
```
1. During init(), after showTitle():
2. const hasQuick = await saveManager.hasQuickSave()
3. quickBar.setQuickLoadEnabled(hasQuick)
```

## Keyboard Handler Integration

### Current keydown handler structure (main.js:326-372)
```
ESC priority chain (always active):
  1. Close settingsScreen
  2. Close backlogScreen
  3. Close saveLoadScreen
  4. Close gameMenu

If !isPlaying: return

Switch:
  ESC → toggle dialogue box visibility
  Space/Enter → advance dialogue
  A → toggleAuto()
  S → toggleSkip()
  L → toggle backlog
```

### Additions Needed
```javascript
// Add to the switch block (after 'L' case):
case 'F5':
  e.preventDefault();
  // Trigger quicksave (same as clicking 快存 button)
  break;
case 'F9':
  e.preventDefault();
  // Trigger quickload (same as clicking 快読 button)
  break;
```

**Important:** F5/F9 should only work when `isPlaying` is true (same guard as A/S/L). F9 should additionally check `quickBar.isQuickLoadEnabled` before acting.

## Common Pitfalls

### Pitfall 1: stopPropagation on Bar Clicks (BAR-05)
**What goes wrong:** Clicking a bar button also advances dialogue (because `#dialogue-box` click handler calls `_handleClick()`)
**Why it happens:** Event bubbles from bar button → dialogue-box → triggers advance
**How to avoid:** QuickActionBar's click handler must call `e.stopPropagation()`. Also, the gameContainer click handler (line 375-393) already has guards for `#quick-controls` — update to `#quick-action-bar`.
**Warning signs:** Clicking any bar button advances text to next line

### Pitfall 2: Dialogue Box Click Propagation in _handleClick
**What goes wrong:** The existing `dialogueBox.el` click handler (DialogueBox.js:52-55) already calls `e.stopPropagation()` and `_handleClick()`. If the bar button click bubbles to `#dialogue-box`, it would trigger `_handleClick`.
**How to avoid:** The QuickActionBar click handler must call `e.stopPropagation()` BEFORE the event reaches `#dialogue-box`'s own click listener. Since the bar is a child of `#dialogue-box`, the bar listener fires first (capture phase or same-level bubbling). Use `e.stopPropagation()` in the bar's delegated click handler.
**Implementation:** Add click listener on `this.el` (the bar container), call `e.stopPropagation()` unconditionally to prevent dialogue-box from seeing the click.

### Pitfall 3: Screenshot Captures the Bar
**What goes wrong:** `captureGameScreenshot()` hides dialogue and quickControls, but the bar is now INSIDE the dialogue box. When dialogue is hidden, bar is also hidden — this is correct.
**Why it's a pitfall:** Developers might add extra hide/show logic for the bar, creating bugs.
**How to avoid:** Do NOT add separate bar show/hide in `captureGameScreenshot()`. Hiding `dialogueBox` already hides the bar (it's a DOM child).
**Warning signs:** Extra quickBar.hide()/show() calls in screenshot function

### Pitfall 4: QuickLoad on Empty Slot
**What goes wrong:** User presses F9 when no quicksave exists → error or blank screen
**Why it happens:** No guard on quickload action
**How to avoid:** Check `saveManager.hasQuickSave()` (or a local boolean flag set after quicksave) before executing quickload. The button is already disabled (D-15), but F9 keyboard shortcut also needs the guard.
**Warning signs:** F9 triggers load with null data

### Pitfall 5: Auto/Skip Not Stopped on Overlay Open
**What goes wrong:** Auto mode keeps advancing while save/load screen is open
**Why it happens:** Opening SaveLoadScreen doesn't stop auto/skip
**How to avoid:** The Save/Load button callbacks in main.js must call `stopAuto()` and `stopSkip()` before showing overlays — same pattern as choice handler (line 173-174) and gameMenu.onTitle (line 292-293).
**Warning signs:** Dialogue keeps advancing behind save screen

### Pitfall 6: Missing `isPlaying` Guard on F5/F9
**What goes wrong:** F5/F9 fires on title screen, causing save/load with no game state
**Why it happens:** Keyboard handler doesn't check `isPlaying` for new shortcuts
**How to avoid:** F5/F9 must be inside the `if (!isPlaying) return` guard block in the keydown handler.
**Warning signs:** Quicksave creates empty/corrupt save file from title screen

## Code Examples

### QuickActionBar Class Skeleton
```javascript
// Source: Pattern derived from src/ui/GameMenu.js
/**
 * QuickActionBar — 8-button action bar embedded in dialogue box
 */
export class QuickActionBar {
  /**
   * @param {HTMLElement} container — the #dialogue-box element
   */
  constructor(container) {
    this.el = document.createElement('div');
    this.el.id = 'quick-action-bar';
    this._render();
    container.appendChild(this.el);

    /** @type {Function|null} */ this.onAuto = null;
    /** @type {Function|null} */ this.onSkip = null;
    /** @type {Function|null} */ this.onBacklog = null;
    /** @type {Function|null} */ this.onSave = null;
    /** @type {Function|null} */ this.onLoad = null;
    /** @type {Function|null} */ this.onQuickSave = null;
    /** @type {Function|null} */ this.onQuickLoad = null;
    /** @type {Function|null} */ this.onSettings = null;

    // State
    this._quickLoadEnabled = false;

    // Delegated click handler (stopPropagation prevents dialogue advance — BAR-05)
    this.el.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.classList.contains('disabled')) return;
      const action = btn.dataset.action;
      switch (action) {
        case 'auto': if (this.onAuto) this.onAuto(); break;
        case 'skip': if (this.onSkip) this.onSkip(); break;
        case 'backlog': if (this.onBacklog) this.onBacklog(); break;
        case 'save': if (this.onSave) this.onSave(); break;
        case 'load': if (this.onLoad) this.onLoad(); break;
        case 'quicksave': if (this.onQuickSave) this.onQuickSave(); break;
        case 'quickload': if (this.onQuickLoad) this.onQuickLoad(); break;
        case 'settings': if (this.onSettings) this.onSettings(); break;
      }
    });
  }

  /** @param {boolean} active */
  setAutoActive(active) {
    this.el.querySelector('[data-action="auto"]')?.classList.toggle('active', active);
  }

  /** @param {boolean} active */
  setSkipActive(active) {
    this.el.querySelector('[data-action="skip"]')?.classList.toggle('active', active);
  }

  /** @param {boolean} enabled */
  setQuickLoadEnabled(enabled) {
    this._quickLoadEnabled = enabled;
    this.el.querySelector('[data-action="quickload"]')?.classList.toggle('disabled', !enabled);
  }

  /** @returns {boolean} */
  get isQuickLoadEnabled() {
    return this._quickLoadEnabled;
  }

  /** @private */
  _render() {
    // 8 icon buttons with tooltips (D-03 order, D-07 Chinese tooltips)
    this.el.innerHTML = `
      <button class="qab-btn" data-action="auto" title="自动"><!-- play SVG --></button>
      <button class="qab-btn" data-action="skip" title="快进"><!-- fast-forward SVG --></button>
      <button class="qab-btn" data-action="backlog" title="回想"><!-- scroll-text SVG --></button>
      <button class="qab-btn" data-action="save" title="存档"><!-- save SVG --></button>
      <button class="qab-btn" data-action="load" title="读档"><!-- folder-open SVG --></button>
      <button class="qab-btn" data-action="quicksave" title="快存"><!-- bookmark-plus SVG --></button>
      <button class="qab-btn" data-action="quickload" title="快读" class="disabled"><!-- bookmark-check SVG --></button>
      <button class="qab-btn" data-action="settings" title="设置"><!-- settings SVG --></button>
    `;
  }
}
```

### IPC Handler: save-quickslot (electron/main.js)
```javascript
// Source: Pattern from save-slot handler (electron/main.js:497-522)
ipcMain.handle('save-quickslot', async (event, { state, previewText, thumbnail }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const savesDir = path.join(currentProjectPath, 'saves');
    await fs.mkdir(savesDir, { recursive: true });
    const jsonPath = path.join(savesDir, 'quicksave.json');
    const jpgPath = path.join(savesDir, 'quicksave.jpg');
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };
    const data = {
      version: 2,
      state,
      previewText: previewText || '',
      sceneName: state?.currentScene || '',
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
    };
    await atomicWrite(jsonPath, JSON.stringify(data, null, 2));
    if (thumbnail) {
      await fs.writeFile(jpgPath, thumbnail);
    }
    return { success: true };
  } catch (e) {
    console.error('[save-quickslot] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-quickslot', async () => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const jsonPath = path.join(currentProjectPath, 'saves', 'quicksave.json');
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };
    const raw = await fs.readFile(jsonPath, 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  } catch (e) {
    if (e.code === 'ENOENT') return { success: true, data: null };
    console.error('[load-quickslot] Failed:', e);
    return { success: false, error: e.message };
  }
});
```

### SaveManager Extensions
```javascript
// Source: Pattern from SaveManager.save() (src/engine/SaveManager.js:33-61)
async quickSave(state, previewText, thumbnail = null) {
  const plainState = JSON.parse(JSON.stringify(state));
  if (plainState.history && plainState.history.length > 50) {
    plainState.history = plainState.history.slice(-50);
  }
  const result = await window.ipcRenderer.invoke('save-quickslot', {
    state: plainState,
    previewText: previewText || '',
    thumbnail,
  });
  if (result.success) {
    this._hasQuickSave = true;
  }
  return result;
}

async quickLoad() {
  const result = await window.ipcRenderer.invoke('load-quickslot');
  if (!result.success) {
    console.error('[SaveManager] Quick load failed:', result.error);
    return null;
  }
  return result.data;
}

async hasQuickSave() {
  if (this._hasQuickSave !== undefined) return this._hasQuickSave;
  const result = await window.ipcRenderer.invoke('load-quickslot');
  this._hasQuickSave = result.success && result.data !== null;
  return this._hasQuickSave;
}
```

### main.js Callback Wiring (replaces quickControls event listener)
```javascript
// Source: Pattern from gameMenu wiring (main.js:280-302)
quickBar.onAuto = () => toggleAuto();
quickBar.onSkip = () => toggleSkip();
quickBar.onBacklog = () => {
  const chars = engine.script?.characters || {};
  backlogScreen.show(engine.history, chars);
};
quickBar.onSave = async () => {
  stopAuto();
  stopSkip();
  cachedScreenshot = await captureGameScreenshot();
  saveLoadScreen.show('save');
};
quickBar.onLoad = () => {
  stopAuto();
  stopSkip();
  saveLoadScreen.show('load');
};
quickBar.onQuickSave = async () => {
  const state = engine.getState();
  const previewText = /* build preview text same as saveLoadScreen.onSave */;
  const screenshot = await captureGameScreenshot();
  const result = await saveManager.quickSave(state, previewText, screenshot);
  if (result.success) {
    showToast('快速存档完成');
    quickBar.setQuickLoadEnabled(true);
  } else {
    showToast(`快速存档失败：${result.error}`);
  }
};
quickBar.onQuickLoad = async () => {
  if (!quickBar.isQuickLoadEnabled) return;
  const data = await saveManager.quickLoad();
  if (!data) return;
  stopAuto();
  stopSkip();
  titleScreen.hide();
  audio.stopVoice();
  engine.restoreState(data.state);
  isPlaying = true;
  replayCurrentPage();
  showToast('快速读档完成');
};
quickBar.onSettings = () => {
  stopAuto();
  stopSkip();
  settingsScreen.show();
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4-button #quick-controls (top-right, hover-to-show) | 8-button bar inside dialogue box (always visible) | Phase 20 | Better discoverability, more functions accessible |
| Separate quickControls visibility management | DOM child of dialogue-box (automatic sync) | Phase 20 | Eliminates 6+ visibility-sync code locations |
| No quicksave/quickload | F5/F9 with hidden slot | Phase 20 | Standard game feature, player convenience |
| Text buttons (AUTO/SKIP/LOG/MENU) | Icon buttons with Lucide SVG + Chinese tooltips | Phase 20 | Cleaner UI, more compact, language-consistent |

## Open Questions

1. **Preview text builder reuse**
   - What we know: `saveLoadScreen.onSave` (main.js:222-237) builds preview text from current page
   - What's unclear: Should this logic be extracted to a shared helper?
   - Recommendation: Extract `buildPreviewText(engine)` helper function used by both regular save and quicksave. Simple refactor.

2. **Toast position for quicksave**
   - What we know: D-14 says "bottom-left", existing `showToast()` uses `bottom:80px;left:50%` (center)
   - What's unclear: Should toast position be changed globally or only for quicksave?
   - Recommendation: Adjust existing `showToast()` to accept optional position parameter, or keep center position (simpler). The planner should decide.

3. **Preview mode (iframe) quicksave guard**
   - What we know: `captureGameScreenshot()` already guards `!window.ipcRenderer` (line 90)
   - What's unclear: Should quicksave buttons be hidden in preview mode?
   - Recommendation: SaveManager methods already handle missing IPC gracefully. Quick save/load will fail silently in preview. No need to hide buttons — they just won't work, which is acceptable for preview mode.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test files, no test config |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BAR-01 | 8 buttons visible in dialogue box bottom | manual | Visual inspection in game | N/A |
| BAR-02 | QuickActionBar.js follows GameMenu pattern | manual | Code review — constructor, callbacks, render | N/A |
| BAR-03 | Auto/Skip buttons show active state | manual | Toggle auto/skip, check visual highlight | N/A |
| BAR-04 | Bar hides with dialogue (choice/menu/overlay) | manual | Open choice page, ESC menu, right-click hide | N/A |
| BAR-05 | Button click doesn't advance dialogue | manual | Click each button, verify text doesn't advance | N/A |

### Sampling Rate
- **Per task commit:** Manual visual testing in game runtime
- **Per wave merge:** Full button bar functionality walkthrough
- **Phase gate:** All 8 buttons functional, F5/F9 working, overlay sync confirmed

### Wave 0 Gaps
- No test framework exists — all validation is manual for this UI-heavy phase
- Recommend: Manual test checklist in PLAN.md verification steps

## Sources

### Primary (HIGH confidence)
- `src/main.js` — All 14 quickControls references mapped (lines 54-511)
- `src/ui/DialogueBox.js` — DOM structure, click handler, visibility pattern
- `src/ui/GameMenu.js` — Callback pattern (onSave, onLoad, onBacklog, onSettings, onTitle)
- `src/ui/BacklogScreen.js` — show/hide pattern with hidden/visible classes
- `src/engine/SaveManager.js` — Async save API, IPC call pattern, deep clone, history truncation
- `electron/main.js` — IPC handlers (save-slot:497, load-slot:525, atomicWrite:67)
- `src/style.css` — #quick-controls styles (1084-1124), #dialogue-box styles (158-238), z-index hierarchy
- `electron/main.js:757-772` — asset://saves/ protocol handler (confirmed working)

### Secondary (MEDIUM confidence)
- Lucide icon names and SVG paths — verified against known catalog, exact paths should be confirmed from lucide.dev during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing code verified
- Architecture: HIGH — follows established patterns, all integration points mapped
- Pitfalls: HIGH — derived from actual code analysis of click handlers and visibility logic
- Lucide icon SVGs: MEDIUM — icon names confident, exact SVG paths for complex icons need verification from official source
- IPC extensions: HIGH — follows exact same pattern as existing save-slot/load-slot

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable — no external dependency changes expected)
