# Feature Research — v0.5: 游戏 UI 补全

**Domain:** Visual novel / Galgame engine — game UI features
**Researched:** 2025-07-15
**Overall confidence:** HIGH (based on well-established VN/galgame conventions from Ren'Py, KiriKiri/吉里吉里, NScripter, TyranoScript, and commercial titles by Key, TYPE-MOON, Frontwing, etc.)
**Supersedes:** v0.4 feature research (voice, rich text, fonts — all delivered)

---

## Quick Action Bar (快捷按钮栏)

### Current State in Codebase

A primitive 4-button quick control strip already exists (`#quick-controls` in `main.js` lines 54-62):
- Buttons: AUTO, SKIP, LOG, MENU
- Position: top-right of `#dialogue-layer` (absolute, top: 12px, right: 16px)
- Visibility: opacity 0 → 1 on `#game-container:hover`
- Created as raw DOM in `main.js`, not a dedicated UI class

**v0.5 target:** 6 buttons (存档/读档/回想/设定/自动/快进) at dialogue box bottom, dedicated class, editor-customizable properties.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|-------------|------------|-------------|-------|
| 6 core buttons: Save, Load, Backlog, Settings, Auto, Skip | Every commercial galgame since ~2005 has these | Low | GameMenu wiring already exists | Standard set across KiriKiri, Ren'Py, and all commercial engines |
| Position at dialogue box bottom | Industry standard: bar sits flush with or just above dialogue box bottom edge | Low | DialogueBox layout, CSS z-index | Current top-right position is non-standard; bottom is where every VN player expects it |
| Active state indicator for Auto/Skip toggles | Players must know which mode is on — standard glow/highlight | Low | `autoMode`/`skipMode` flags already exist | Already partially implemented via `.active` class |
| Show/hide synced with dialogue box | Bar appears when dialogue box is visible, hides when it's hidden (choices, menus) | Low | DialogueBox.show()/hide() events | Current implementation shows on container hover — not sufficient |
| Click does NOT advance dialogue | Clicking action bar buttons must `stopPropagation` to avoid triggering `engine.next()` | Low | Event delegation in `main.js` | Already handled for `#quick-controls` in click handler |
| Keyboard shortcuts | A=Auto, S=Skip, L=Log, Esc=Menu — standard VN shortcuts | Low | Already implemented in keydown handler | Extend for Save (F5/Ctrl+S) and Load (F9/Ctrl+L) |
| Semi-transparent, unobtrusive design | Must not block dialogue text readability | Low | CSS only | Standard: ~30-40% opacity, brighten on hover |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|-------------|-------|
| Quick Save / Quick Load buttons | One-click save/load without opening fullscreen UI; pro players use constantly | Medium | SaveManager, dedicated "quick" slot (slot 0 or separate) | Ren'Py has Q.Save/Q.Load; some galgames use F5/F9 shortcuts only |
| Hide dialogue box button (目隠し) | Toggle to hide dialogue box and see full background CG — players screenshot CGs | Low | DialogueBox.hide()/show() toggle | Very common in Japanese VNs, often bound to middle mouse or H key |
| Editor-customizable button appearance | Maker can set button text/icon, colors, font via editor inspector | Medium | New settingDefs-style registry, editor palette integration | Matches project pattern (TitleDesigner, SettingsDesigner) |
| Button image replacement (future) | Replace text buttons with custom image assets | High | Asset picker integration, image sizing | Deferred to v0.5.1 "UI 美化系统" per PROJECT.md roadmap |

### Anti-Features (Avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Too many buttons (>8) | Clutters the narrow bar, overwhelming for players | Stick to 6 core. Quick Save/Load can be shortcuts-only initially |
| Fullscreen/window mode button in action bar | Breaks flow, belongs in Settings screen | Keep in Settings only |
| Non-standard button ordering | VN players have muscle memory; Auto → Skip → Backlog → Save → Load → Settings is conventional | Follow Japanese VN convention for left-to-right order |
| Making the bar always visible at 100% opacity | Blocks CG viewing and feels heavy | Use hover-reveal or low-opacity idle state, standard 30% idle → 100% hover |
| Return-to-title button in action bar | Too destructive for one-click access; belongs in ESC game menu with confirmation | Keep in GameMenu only |

---

## Save/Load UI (存读档界面)

### Current State in Codebase

`SaveLoadScreen.js` exists as a basic implementation:
- 8 slots, text-only (no thumbnails)
- Simple grid: `grid-template-columns: repeat(4, 1fr)`
- Shows: slot label, preview text (truncated), date
- Fullscreen overlay at z-index 200
- Shared UI for save/load (mode toggle via `show('save'|'load')`)
- `SaveManager.js`: localStorage-based, `gameId_save_N` keys

**v0.5 target:** 100 slots, thumbnail screenshots, fullscreen replacement UI, file-system storage.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|-------------|------------|-------------|-------|
| Thumbnail screenshot of game state | Every modern VN (since ~2008) shows a screenshot of the scene at save time | High | html2canvas or Electron capturePage, screenshot-to-file pipeline | THE defining feature players expect — text-only is unacceptable for commercial-grade engine |
| 100 save slots with pagination | Standard: 10 slots per page × 10 pages. KiriKiri/Ren'Py default to 100+ | Medium | Page navigation UI, slot indexing math | 100 slots = `pages[0..9]`, each showing 10 slots. Some engines do 8 per page × 12 pages |
| Page navigation (页面切换) | Tab bar or numbered page buttons at top of save screen | Low | UI component, `currentPage` state | Standard: Page 1-10 tabs, or arrows with page number |
| Save timestamp + preview text | Date/time + first ~30-50 chars of current dialogue line | Low | Already exists in SaveManager.save() | Add scene name for extra context |
| Empty slot visual distinction | Empty slots clearly look different from occupied slots | Low | CSS class `.empty` already exists | Standard: grayed out, "— 空 —" text, no thumbnail placeholder |
| Overwrite confirmation dialog | "此存档位已有数据，确认覆盖？" when saving to occupied slot | Low | Modal dialog component or `confirm()` | Players WILL accidentally click wrong slots — essential |
| Save mode / Load mode tab toggle | Header shows 存档/读档 tabs, player can switch without closing | Low | Already uses `this.mode` toggle | Standard pattern: two tabs at top, active tab highlighted |
| Close/return button | Return to game without saving/loading | Low | Already exists as `.save-load-close` | Standard |
| Delete save option | Right-click or explicit delete button per slot | Medium | SaveManager.delete() already exists, context menu or icon | Players need to clean up old saves |
| Scroll or fixed-page grid (no infinite scroll) | VN save screens are always paginated, not scrollable lists | Low | CSS grid + page state | Infinite scroll feels wrong for VN saves — players memorize slot positions |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|-------------|-------|
| Auto-save slot (自动存档) | Separate slot that auto-saves at scene transitions — safety net for crashes | Medium | Engine `scene_enter` event hook, dedicated slot index | Ren'Py does this by default; many commercial VNs have 1-3 auto-save slots |
| Quick save slot (快速存档) | Dedicated slot for F5/F9 quick save/load, separate from manual 100 | Low | SaveManager with special slot key | Very standard in Japanese VNs |
| Scene/chapter name display | Show current scene name in save slot metadata | Low | `engine.currentScene` + scene name lookup | Helpful for long games with many branches |
| Play time display | Show total play time on save slot | Medium | Timer tracking system (new) | Nice-to-have, not expected in all engines |
| Thumbnail hover zoom | Hovering a slot slightly enlarges the thumbnail for better preview | Low | CSS transform on hover | Polished feel |
| Smooth page transition animation | Page switch with fade or slide animation | Low | CSS transitions between page states | Standard polish for commercial titles |

### Anti-Features (Avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Infinite scroll save list | VN players expect page-based grids; scroll loses spatial memory of "my save is in page 3, slot 5" | Use paginated grid: 10 per page × 10 pages |
| Tiny thumbnails (<150px wide) | Defeats purpose — players need to recognize the scene at a glance | Use 220-260px wide thumbnails (fit 5 per row in 1280px) |
| Saving during choices | Ambiguous restore state — what if options change? | Disable save button during choice display |
| No overwrite confirmation | Players lose hours of progress with a misclick | Always confirm when overwriting existing save |
| localStorage for 100 slots with thumbnails | localStorage has ~5MB limit; 100 PNG thumbnails will exceed this instantly | Use file system (saves/ directory) — the core Save System Upgrade |
| Full-resolution screenshots | 1280×720 PNGs are 1-3MB each; 100 saves = 100-300MB | Resize to ~320×180, JPEG at 70-80% quality. Target: 20-50KB per thumbnail |

---

## Fast-Forward / Skip Mode (快进模式)

### Current State in Codebase

A primitive skip mode exists in `main.js`:
- `skipMode` flag toggled via `toggleSkip()`
- Implementation: `setTimeout(() => engine.next(), 50)` — fires next() after 50ms
- No read/unread tracking
- No distinction between "skip all" vs "skip read only"
- Auto-stops at choices (line 131-133: `stopSkip()` on `choice` event)
- Keyboard shortcut: S key toggles skip

**v0.5 target:** Two modes (skip all / skip read only), read page tracking, settings page toggle.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|-------------|------------|-------------|-------|
| "Skip All" mode (全スキップ) | Skips all dialogue regardless of read status — for replays, testing, impatient players | Low | Already mostly works (current skipMode) | Needs refinement: animation skip, voice stop |
| "Skip Read Only" mode (既読スキップ) | Only skips text player has seen; stops at new content — THE core VN feature | High | **Requires read-page tracking system (new)** | #1 expected skip feature in galgames. KiriKiri, Ren'Py, every commercial engine has this |
| Read-page tracking | Engine records which `{sceneId, pageIndex}` combinations player has seen | Medium | Persistent storage (new), engine hook on `page_enter` | Must persist across sessions — stored in `saves/readdata.json` |
| Visual skip indicator | Clear on-screen indicator: "▶▶ スキップ中" or "SKIP" overlay | Low | DOM element, CSS animation | Players need to know skip is active |
| Auto-stop at choices | Skip mode must pause at choice pages, requiring player decision | Low | Already implemented in `engine.on('choice')` | Already works |
| Auto-stop at unread text (read-only mode) | Skip stops when hitting first unread page; player resumes normal reading | Medium | Read-tracking lookup per page | Core behavior of read-only skip |
| Skip speed: fast but not instant | ~50-100ms per dialogue line is standard; players see text flash by | Low | Already 50ms, configurable | Too fast = player can't emergency-stop; too slow = defeats purpose |
| Stop skip on click/key | Any player input during skip should stop skip mode | Low | Already handled — clicking calls `stopSkip` indirectly via `onAdvance` | Should also stop on ESC, right-click |
| Skip stops voice playback | During skip, voice lines should be cut/not played | Low | `audio.stopVoice()` in skip handler | Don't let voice play out — skip means skip everything |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|-------------|-------|
| Settings toggle for skip mode default | Setting: "跳过设置" — toggle between "all" and "read only" in settings screen | Medium | ConfigManager key, settingDefs entry, SettingsScreen component | Standard in commercial VNs |
| Ctrl-held continuous skip | Hold Ctrl = skip while held, release = stop. Alternative to toggle | Low | Keydown/keyup listeners | Very common PC VN convention (Ren'Py default) |
| Skip animation acceleration | During skip, transitions/fades are instant (duration: 0) instead of 800ms | Medium | Engine event data modification during skip | Dramatically speeds up skip — without this, 800ms fade per page makes skip crawl |
| "Skip to next choice" option | Skip mode that specifically runs until next choice/branch point | Medium | Engine lookahead or flag-based approach | Ren'Py has this as built-in |
| Read progress indicator | Show % of game content player has read (for completionists) | High | Full read-tracking aggregation + total page count | Nice completion metric but complex |

### Anti-Features (Avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Skip that jumps past choices | Players must always make choices themselves — auto-selecting breaks branching | Always stop skip at choice pages |
| Instant skip (no delay at all) | Player sees nothing, can't react, and loses context entirely | Use 50-100ms delay, showing text briefly |
| Skip without visual indicator | Player doesn't know skip is active, confusion when it stops at unread | Show clear indicator overlay |
| Skipping during transitions without speed-up | Each page has 800ms fade — 100 pages × 800ms = 80 seconds of "skipping" | Override transition duration to 0 during skip |
| Read tracking per dialogue line (too granular) | Tracking 1000s of individual lines is complex and fragile | Track per **page** — `{sceneId}:{pageIndex}` as unit. Page is "read" when seen at least once |
| Read data stored only in localStorage | Read data is game-global (not per-save-slot) and can grow large | Store as separate file: `saves/readdata.json` |

---

## Save System Upgrade (存档系统升级)

### Current State in Codebase

`SaveManager.js` uses localStorage:
- Key pattern: `${gameId}_save_${slot}`
- Data: `{ state, previewText, timestamp, date }`
- State: `{ currentScene, pageIndex, dialogueIndex, variables, history }`
- 8 slots hardcoded
- No thumbnails (text-only)
- `ConfigManager.js` also uses localStorage for settings

**v0.5 target:** File system `saves/` directory, 100+ slots, screenshot thumbnails, IPC handlers.

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|-------------|------------|-------------|-------|
| File system storage (`saves/` directory) | localStorage has ~5MB limit, unusable for thumbnails; desktop apps use files | Medium | Electron IPC handlers (new), `atomicWrite` (existing pattern) | Electron main process already has `atomicWrite`, `fs`, path security |
| Save file format: JSON metadata + separate thumbnail | Each save = `save_001.json` + `save_001.jpg` | Medium | File naming convention, dual-file write | JSON keeps state small; separate image for easy thumbnail loading |
| Atomic writes for save files | Crash during save must not corrupt existing data | Low | `atomicWrite()` already exists in `electron/main.js` | Reuse existing pattern: write .tmp → rename |
| IPC handlers: save-game, load-game, delete-game, list-saves | Renderer calls main process for all file operations | Medium | New IPC handlers in `electron/main.js`, preload exposure | Follow existing pattern: `ipcMain.handle('save-game', ...)` |
| Backward compat with localStorage saves | If player has existing saves from v0.4, don't lose them | Medium | Migration logic: check localStorage, import to files, clear old | One-time migration on first run after upgrade |
| Screenshot capture at save time | Use html2canvas or Electron `capturePage()` to capture game container | High | New dependency or Electron API | html2canvas: works in renderer. Electron native: cleaner, captures full window |
| Thumbnail compression | Resize + JPEG compress to keep saves lightweight | Medium | Canvas resize API, `toBlob('image/jpeg', 0.7)` | Target: 320×180 JPEG @ 70% = ~15-30KB per save |
| Save directory creation on project open | `saves/` created automatically when game starts | Low | `fs.mkdir(savesDir, { recursive: true })` | Standard defensive initialization |

### Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|-------------|-------|
| Save file versioning | Version field in save JSON; reject/migrate incompatible saves | Low | `version` field in save schema | Critical for long-term engine updates |
| Auto-save on scene transitions | Automatic save in slot 0 on every scene_enter | Medium | Engine event hook, dedicated slot | Safety net serious VN players expect |
| Quick save/load (F5/F9) | Dedicated slot, instant save/load without UI | Low | Dedicated slot key, keyboard handler | Universal VN convention on PC |
| Save data portability | Copy saves directory for backup or machine transfer | Low | It's just a folder — naturally portable | File system saves are inherently exportable |
| Electron `capturePage()` over html2canvas | Native screenshot — faster, more reliable, no extra dependency | Medium | `webContents.capturePage()` IPC round-trip | Avoids html2canvas quirks with CSS/fonts |

### Anti-Features (Avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Single monolithic save file | One giant JSON with all 100 saves = slow read/write, corruption risk | Individual files per slot: `save_001.json`, `save_002.json` |
| Embedding thumbnail as base64 in JSON | Bloats JSON, slow to parse, difficult to preview | Separate image file alongside JSON |
| Saving full 1280×720 screenshots | ~1-3MB per PNG × 100 = 100-300MB save folder | Resize to 320×180, JPEG at 70-80% quality |
| Keeping localStorage as primary with file backup | Split-brain bugs; one source of truth is simpler | Full migration to file system; localStorage only for ConfigManager |
| Writing save files in renderer process | Renderer has no `fs` access with contextIsolation | All file I/O through IPC to main process (existing architecture) |
| Storing read-page data inside each save file | Read tracking is global (cross-save), not per-save | Separate `readdata.json` in `saves/` |

---

## Cross-Feature Dependencies

### Dependency Graph

```
Save System Upgrade (filesystem)
  ├── Save/Load UI depends on this (thumbnails need file storage)
  ├── Fast-Forward depends on this (read tracking needs persistent storage)
  └── Quick Action Bar depends on this (save/load buttons need working save system)

Save/Load UI
  ├── Needs: Save System Upgrade (100 slots + thumbnails)
  ├── Needs: Screenshot capture pipeline (html2canvas or capturePage)
  └── Needs: Quick Action Bar (save/load buttons open this UI)

Fast-Forward / Skip Mode
  ├── Needs: Read-page tracking system (new module)
  ├── Needs: Save System Upgrade (persist read data to filesystem)
  ├── Needs: Settings toggle (ConfigManager + settingDefs entry)
  └── Quick Action Bar's "快进" button activates this

Quick Action Bar
  ├── Needs: New UI class (replace current raw DOM #quick-controls)
  ├── Needs: All other features wired up (save/load/skip)
  └── Lightest dependency — mostly UI wiring
```

### Recommended Build Order

1. **Save System Upgrade** — Foundation. Everything else needs filesystem saves.
   - IPC handlers for save/load/delete/list
   - SaveManager rewrite (localStorage → file system)
   - Screenshot capture pipeline
   - Migration from old localStorage saves
   - Read-page tracking storage (`readdata.json`)

2. **Fast-Forward / Skip Mode** — Needs read tracking from save system.
   - ReadTracker module (records seen pages)
   - Skip mode upgrade (skip-all vs skip-read-only)
   - Settings toggle for skip mode default
   - Transition speed override during skip
   - Voice stop during skip

3. **Save/Load UI** — Needs filesystem saves + thumbnails to be meaningful.
   - 100-slot paginated grid
   - Thumbnail display
   - Page navigation (10 pages × 10 slots)
   - Overwrite confirmation
   - Delete functionality

4. **Quick Action Bar** — Pure UI wiring; connects to everything else.
   - New QuickBar UI class
   - 6 buttons at dialogue box bottom
   - Active state indicators
   - Editor-customizable properties (future-ready hooks)
   - Keyboard shortcut expansion

### Shared Systems Needed

| System | Used By | Notes |
|--------|---------|-------|
| Screenshot capture (html2canvas or capturePage) | Save/Load UI, Save System | Single pipeline: capture → resize → compress → IPC send |
| IPC save handlers | Save System, Save/Load UI, Quick Bar (save/load buttons) | `save-game`, `load-game`, `list-saves`, `delete-save` |
| ReadTracker module | Skip Mode, Save System | `saves/readdata.json`, checked on every page_enter |
| ConfigManager expansion | Skip Mode settings | New keys: `skipMode: 'all'\|'readOnly'` |
| settingDefs expansion | Skip Mode settings in Settings screen | New entry: `skip-mode` select component |
| ESC priority chain expansion | Save/Load UI | Save/Load screen needs ESC handling (close → return to game) |

### Interaction with Existing Systems

| Existing System | Impact | Notes |
|----------------|--------|-------|
| `GameMenu.js` | Minimal change — save/load callbacks already wired | Already calls `saveLoadScreen.show('save'\|'load')` |
| `DialogueBox.js` | Quick bar positioning changes | Bar moves from dialogue-layer top-right to dialogue-box bottom area |
| `ScriptEngine.js` | Add `page_enter` hook for read tracking | Emit already exists; just need listener in ReadTracker |
| `ConfigManager.js` | Stays on localStorage | Config is small, per-user — localStorage is fine. Only game saves move to files |
| `main.js` | Major refactor of save/load wiring, skip logic, quick controls | The orchestration hub needs significant updates |
| `style.css` | Save/Load screen complete restyle, quick bar relocation | Existing save-load styles are for 8-slot simple grid — needs full replacement |

---

## MVP Recommendation

### Must-Have for v0.5 (ship-blocking)

1. **File system save/load** — Without this, 100 slots and thumbnails are impossible
2. **Screenshot thumbnails** — Text-only save slots feel like a 2005 engine
3. **100-slot paginated save/load UI** — The visual upgrade players see
4. **Skip All mode refinement** — Fix transition speed during skip, voice stop
5. **Quick action bar at dialogue bottom** — 6 buttons, proper positioning
6. **Read-page tracking** — Enables skip-read-only (the most-requested VN feature)
7. **Skip Read Only mode** — The feature that makes the engine feel professional

### Defer to v0.5.1 or later

- **Auto-save on scene transitions** — Nice but not blocking
- **Quick Save/Quick Load (F5/F9)** — Can be keyboard-only initially, UI slot later
- **Editor-customizable button appearance** — Functional first, pretty later (aligns with planned "UI 美化系统")
- **Button image replacement** — Explicitly deferred per PROJECT.md
- **Play time tracking** — Low priority, purely cosmetic
- **"Skip to next choice" mode** — Power user feature, add after basics work
- **Save data export/import** — File system saves are naturally portable; explicit UI later

---

## Complexity Assessment

| Feature | Effort | Risk | Notes |
|---------|--------|------|-------|
| Save IPC handlers | Medium | Low | Follow existing `ipcMain.handle` pattern |
| SaveManager rewrite | Medium | Medium | API contract changes, migration logic |
| Screenshot capture pipeline | High | Medium | html2canvas quirks vs Electron API trade-offs |
| Thumbnail compression | Low | Low | Standard Canvas API |
| localStorage migration | Medium | Medium | One-time migration, edge cases with partial data |
| ReadTracker module | Medium | Low | Simple Set/JSON persistence, engine hook |
| Skip mode upgrade | Medium | Low | State machine refinement, existing foundation |
| Skip animation acceleration | Medium | Medium | Need to thread skip state through engine events |
| Save/Load UI rewrite | High | Low | Large DOM/CSS effort, straightforward logic |
| Pagination UI | Low | Low | Simple page math + tab rendering |
| Quick action bar | Low | Low | DOM + CSS + event wiring, mostly existing patterns |
| Settings skip toggle | Low | Low | Clone existing settingDefs pattern |

**Highest risk:** Screenshot capture pipeline. html2canvas can produce visual differences from actual rendering (CSS features, fonts, transforms). Electron's `capturePage()` is more reliable but requires IPC round-trip and captures the entire window (needs cropping to game container). Recommend starting with `capturePage()` since this is an Electron app and avoids adding a dependency.

---

## Sources & Confidence

| Finding | Confidence | Basis |
|---------|-----------|-------|
| Quick bar 6-button convention | HIGH | Universal across KiriKiri, Ren'Py, NScripter, TyranoScript, commercial titles |
| Bottom-of-dialogue-box positioning | HIGH | Industry standard since KiriKiri2/吉里吉里2 era (~2004+) |
| 100-slot paginated save grid | HIGH | Standard since Leaf/Key era; Ren'Py defaults to unlimited |
| Skip-read-only as #1 expected feature | HIGH | Present in every commercial galgame; Ren'Py, KiriKiri built-in |
| Read tracking per page (not per line) | HIGH | KiriKiri tracks per label/page; Ren'Py tracks per statement |
| html2canvas for thumbnail capture | MEDIUM | Common web approach; Electron `capturePage()` is valid alternative |
| JPEG 320×180 thumbnail sizing | MEDIUM | Reasonable balance; actual sizes vary by engine (240-400px wide) |
| File-per-slot save structure | HIGH | Standard in all desktop VN engines |
| Atomic write for save protection | HIGH | Already implemented in project; industry standard |
| Ctrl-held skip convention | HIGH | Ren'Py default; common in Western VN ports |
| Existing codebase analysis | HIGH | Direct code inspection of all relevant source files |
