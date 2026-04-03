# Research Summary — v0.5 游戏 UI 补全

**Domain:** Visual novel engine — game UI features (save/load, quick bar, fast-forward, file system saves)
**Researched:** 2025-07-18
**Overall confidence:** HIGH
**Supersedes:** v0.4 research summary (voice, rich text, fonts — delivered)

---

## Executive Summary

v0.5 completes the game-side player UI, transforming the engine from a bare-minimum playback tool into something that feels like a commercial galgame. The four features — Quick Action Bar, Save/Load UI with thumbnails, Fast-Forward/Skip modes, and file system save upgrade — are deeply interdependent. The **Save System Upgrade** (localStorage → file system) is the structural foundation: without it, 100-slot thumbnails blow past localStorage's 5MB limit, and read-page tracking has no persistent home. Every other feature depends on or benefits from this migration.

The critical technical decision is **screenshot capture**: STACK.md and PITFALLS.md converge on using Electron's native `webContents.capturePage()` instead of html2canvas. This is the correct call. html2canvas has been abandoned since January 2022, cannot resolve the project's custom `asset://` protocol (P1 — CRITICAL), freezes the UI thread during capture (P19), and violates the project's zero-new-deps policy. `capturePage()` is native, zero-dependency, pixel-perfect, and has been stable since Electron 1.x. The ARCHITECTURE.md recommendation to use html2canvas is overridden by this consensus.

The biggest engineering risk is the **sync-to-async migration** of SaveManager. Every caller (`saveLoadScreen.onSave`, `saveLoadScreen.onLoad`, `saveManager.hasAnySave()` in title screen init) must become `async/await`. This ripple effect is manageable but must be done carefully to avoid race conditions. The second risk area is integration glue: ESC priority chain expansion, overlay pause logic, click-through guards, and save/load return context all involve wiring multiple systems together and are easy to get subtly wrong.

---

## Stack Additions

### Add: Nothing (zero new npm dependencies)

Every v0.5 feature maps to existing Electron APIs or browser built-ins:

| Feature | Technology | Already Available |
|---------|-----------|-------------------|
| Save thumbnails | `webContents.capturePage()` + `NativeImage.resize()` → JPEG | Electron 41 native |
| File system saves | `fs/promises` + `atomicWrite()` | Existing in `electron/main.js` |
| Quick action bar | DOM + CSS | Same pattern as existing `#quick-controls` |
| Save/Load grid | CSS Grid + DOM pagination | Same as existing `SaveLoadScreen.js` |
| Read-page tracking | `Set<string>` + localStorage or JSON file | Browser/Node built-in |
| Thumbnail display | `<img>` + extended `asset://` protocol | Existing protocol handler |

### Do NOT Add

| Technology | Why Tempting | Why Wrong |
|------------|-------------|-----------|
| **html2canvas** | Project description mentions it for screenshots | Abandoned Jan 2022. Cannot resolve `asset://` URLs (CRITICAL P1). Freezes UI (P19). `capturePage()` is superior in every way. |
| **modern-screenshot / html-to-image** | Active DOM screenshot libs | Unnecessary — Electron native capture is simpler, more reliable, zero cross-origin issues |
| **Any image processing lib** | Thumbnail resizing | `NativeImage.resize()` built into Electron |
| **better-sqlite3 / lowdb** | Save data management | Overkill. JSON files are perfect for save slots — one read/write per slot, no queries |
| **fs-extra** | Extended file operations | `fs/promises` covers all needs |
| **Virtual scroll library** | 100-slot grid | Only 10 slots visible per page (paginated). No virtual scrolling needed |

---

## Feature Table Stakes

### Quick Action Bar (快捷按钮栏)

| Must-Have | Notes |
|-----------|-------|
| 6 buttons: 存档, 読档, 回想, 設置, 自動, 快進 | Universal across KiriKiri, Ren'Py, all commercial engines |
| Position at dialogue box bottom | Industry standard since ~2004; current top-right is non-standard |
| Active state indicator for Auto/Skip | Players must know which mode is on |
| Show/hide synced with dialogue box | Hides when dialogue hidden (choices, menus, overlays) |
| Click does NOT advance dialogue | `stopPropagation()` on bar clicks — P8 |
| Semi-transparent, brighten on hover | 30-40% idle opacity → 100% hover |

**Defer:** Quick Save/Quick Load buttons (F5/F9 keyboard shortcut is enough for v0.5), editor-customizable button appearance, button image replacement.

### Save/Load UI (存読档界面)

| Must-Have | Notes |
|-----------|-------|
| Thumbnail screenshot per slot | THE defining visual upgrade — text-only is unacceptable |
| 100 slots, 10 pages × 10 slots | Standard since Leaf/Key era |
| Page navigation tabs (1-10) | Paginated, NOT scrollable (VN players memorize slot positions) |
| Save timestamp + preview text + scene name | Context for each slot |
| Empty slot visual distinction | Grayed out, "— 空 —" placeholder |
| Overwrite confirmation dialog | Players WILL misclick — essential |
| Save/Load mode tab toggle | Header tabs, switch without closing |
| Delete save functionality | Per-slot delete with confirmation |
| Close/return button | Return to game/menu without action |

**Defer:** Auto-save slot, thumbnail hover zoom, smooth page transition animations, play time display.

### Fast-Forward / Skip (快進模式)

| Must-Have | Notes |
|-----------|-------|
| Skip All mode (全スキップ) | Already mostly works; refine animation skip + voice stop |
| Skip Read Only mode (既読スキップ) | #1 expected VN feature — requires read-page tracking |
| Read-page tracking (persistent) | `Set<"sceneId:pageIndex">`, survives across sessions |
| Visual skip indicator | "▶▶ SKIP" overlay during skip |
| Auto-stop at choices | Already implemented |
| Auto-stop at unread (read-only mode) | Core behavior: stop + resume normal reading |
| Skip speed ~50ms per line | Already implemented |
| Stop skip on click/key/ESC | Already partially handled |
| Suppress voice during skip | `audio.stopVoice()` in skip handler |
| Settings toggle (skip all vs read-only) | New ConfigManager key + settingDefs entry |

**Defer:** Ctrl-held continuous skip, "skip to next choice" mode, read progress percentage indicator.

### Save System Upgrade (存档系統升級)

| Must-Have | Notes |
|-----------|-------|
| `saves/` directory in project folder | File-per-slot: `slot_XX.json` + `slot_XX.jpg` |
| Atomic writes for save JSON | Reuse existing `atomicWrite()` — crash-safe |
| 4-5 IPC handlers: save/load/delete/list/screenshot | Follow existing `ipcMain.handle` pattern |
| JPEG thumbnails (320×180, quality 80) | ~15-30KB each, 100 slots ≈ 3MB total |
| Backward compat migration from localStorage | Auto-migrate 8 old slots on first run |
| Save schema version field (`version: 2`) | Future-proofs save format |
| History truncation in save data | Cap at 50 entries (full history stays in-memory) |
| `saves/` dir creation on project open | `fs.mkdir(savesDir, { recursive: true })` |
| Preload script on preview BrowserWindow | One-line fix — P10 |

**Defer:** Quick save/load dedicated slot, save data export/import UI, ConfigManager migration to files (leave on localStorage).

---

## Architecture Integration

### How Features Connect to Existing Systems

```
Save System Upgrade (FOUNDATION — build first)
  │
  ├── SaveManager.js → REWRITE (sync localStorage → async IPC)
  │     All callers become async (main.js save/load callbacks, title screen init)
  │
  ├── electron/main.js → ADD 5 IPC handlers (save/load/delete/list/screenshot)
  │     Reuse: atomicWrite(), fs/promises, isInsideProject(), path security
  │
  ├── asset:// protocol → EXTEND to serve saves/ directory
  │     ~5 lines: if path starts with 'saves/', resolve from projectPath/saves/
  │
  └── preload.mjs → ADD to preview BrowserWindow config (P10 fix)

Quick Action Bar
  │
  ├── NEW: src/ui/QuickActionBar.js (proper class, like GameMenu)
  ├── REMOVE: inline #quick-controls in main.js lines 54-62 (P2)
  ├── MODIFY: main.js click handler (add #quick-action-bar to exclusion — P8)
  └── MODIFY: main.js overlay show callbacks → add pauseGameplay() (P6)

Save/Load UI
  │
  ├── REWRITE: SaveLoadScreen.js (8 slots → 100 slots, pagination, thumbnails)
  ├── MODIFY: main.js save flow (capture screenshot BEFORE showing save UI — P20)
  ├── MODIFY: ESC handler → stack-based overlay priority (P3)
  └── ADD: context-aware close behavior (P4: returnTo gameMenu vs title vs game)

Fast-Forward / Skip
  │
  ├── NEW: src/engine/ReadHistory.js (Set<string> + persistence)
  ├── MODIFY: main.js skip logic (check readHistory for skip-read-only)
  ├── MODIFY: main.js event handlers (suppress audio during skip — P21)
  ├── MODIFY: main.js event handlers (override transition duration → 0 during skip — P23)
  ├── EXTEND: ConfigManager.js (add skipMode: 'all' | 'readOnly')
  └── EXTEND: settingDefs.js (add skip-mode select component)
```

### Key Integration Pattern: Screenshot Flow

```
User clicks Save → finish typewriter (P7)
  → capturePage(rect) captures 1280×720 game area
  → NativeImage.resize(320, 180) → toJPEG(80)
  → Cache Buffer in memory
  → Show SaveLoadScreen overlay
  → User picks slot → save state JSON + JPEG via IPC
  → Main process: atomicWrite(slot_XX.json) + writeFile(slot_XX.jpg)
```

### Key Integration Pattern: Async SaveManager Ripple

| Caller | Current | After |
|--------|---------|-------|
| `saveLoadScreen.onSave` | sync `saveManager.save()` | `await saveManager.save()` |
| `saveLoadScreen.onLoad` | sync `saveManager.load()` | `await saveManager.load()` |
| `showTitle()` → `hasAnySave()` | sync boolean | `await saveManager.hasAnySave()` — affects init flow |
| `main.js` init | sync | `showTitle()` becomes async, gates "继续游戏" button |

### Key Integration Pattern: ESC Priority Stack

Replace hardcoded if/else chain with stack-based overlay manager:
```
1. SaveLoadScreen (highest — fullscreen)
2. SettingsScreen
3. BacklogScreen (currently NOT in ESC chain — fix this)
4. GameMenu
5. Game (advance or ignore)
```

---

## Critical Pitfalls

### Top 5 Must-Address Pitfalls

| # | Pitfall | Severity | Prevention | Phase |
|---|---------|----------|------------|-------|
| **P10** | Preview BrowserWindow has no `ipcRenderer` — all file I/O fails | CRITICAL | Add `preload: preload.mjs` to preview window config; disable save in iframe preview | Save System |
| **P14** | Old localStorage saves become invisible after upgrade | CRITICAL | Auto-migrate 8 slots from localStorage → files on first run, with marker flag | Save System |
| **P2** | New quick bar + old `#quick-controls` = duplicate buttons | CRITICAL | Remove old `#quick-controls` entirely before building new QuickActionBar class | Quick Action Bar |
| **P3** | ESC key doesn't close save/load screen (not in priority chain) | CRITICAL | Refactor ESC handler to stack-based overlay manager | Save/Load UI |
| **P6** | Auto/skip mode keeps running behind overlays | HIGH | Centralized `pauseGameplay()` called when any overlay opens | Quick Bar + Save/Load |

### Additional High-Priority Pitfalls

| # | Pitfall | Prevention |
|---|---------|------------|
| P4 | Save/Load return context differs (title vs game menu vs quick bar) | Pass `context` param to `show()`, handle in close callback |
| P8 | Quick bar clicks advance dialogue | `stopPropagation()` in QuickActionBar click handler |
| P11 | Reactive Proxy serialization fails across IPC | `JSON.parse(JSON.stringify(state))` before IPC calls |
| P12 | `saves/` path resolution differs across contexts | Centralized `getSavesPath(gameId)` in main process |
| P15 | Loading 100 slot metadata is slow (many IPC round-trips) | Single batch `list-saves` IPC call; lazy thumbnail loading via `asset://` |
| P21 | Skip mode causes audio glitches (rapid BGM start/stop) | Suppress audio events during skip; apply final audio state on skip-end |

### "Looks Done But Isn't" Checklist

- [ ] ESC closes every overlay in correct priority order
- [ ] Old `#quick-controls` fully removed — no duplicate buttons
- [ ] Save from title screen returns to title, not black game screen
- [ ] Save from game menu returns to game menu
- [ ] Auto/skip stops when ANY overlay opens
- [ ] Screenshots show game scene only, not UI overlays
- [ ] Screenshots work with `asset://` images (not blank/black)
- [ ] 100 slots don't freeze on open (<500ms)
- [ ] Old localStorage saves migrate transparently
- [ ] Skip mode doesn't produce audio pops
- [ ] Skip-read-only actually skips read pages across sessions
- [ ] File saves work in standalone preview window (ipcRenderer available)
- [ ] Preview mode (iframe) disables save/load gracefully
- [ ] Voice stops on load (no overlap)
- [ ] Save files include `version: 2` field

---

## Recommended Build Order

### Phase 1: Save System Upgrade (Foundation) ← BUILD FIRST

**Rationale:** Every other feature depends on file-based saves. Thumbnails need file storage, read tracking needs persistent storage, Save/Load UI needs async SaveManager, quick bar save/load buttons need a working save backend.

**Delivers:**
- 4-5 new IPC handlers in `electron/main.js` (save/load/delete/list/screenshot)
- SaveManager.js rewrite (async IPC, 100 slots, dual-mode with localStorage fallback)
- `asset://` protocol extension for `saves/` directory
- Screenshot capture pipeline (`capturePage()` → resize → JPEG)
- localStorage → file system migration for existing 8-slot saves
- Preview BrowserWindow preload fix (P10)
- Save schema with `version: 2` field (P17)

**Pitfalls to watch:** P10 (no ipcRenderer), P11 (Proxy serialization), P12 (path resolution), P14 (migration), P17 (version field)

**Research flag:** Standard patterns — no further research needed. All building blocks exist in codebase.

### Phase 2: Quick Action Bar (Independent — can parallel with Phase 1)

**Rationale:** Lightest feature, self-contained, no dependency on other v0.5 features. Pure UI wiring to existing callbacks. Good early win that makes the engine immediately feel more polished.

**Delivers:**
- New `QuickActionBar.js` class (replaces inline `#quick-controls`)
- 6 buttons at dialogue box bottom (存档/读档/回想/設置/自動/快進)
- Active state indicators for Auto/Skip
- Visibility synced with dialogue box
- Centralized `pauseGameplay()`/`resumeGameplay()` for overlay interactions

**Pitfalls to watch:** P2 (remove old controls), P8 (click-through), P6 (pause on overlay open)

**Research flag:** Standard patterns — no research needed.

### Phase 3: Save/Load UI Rewrite (Depends on Phase 1)

**Rationale:** Depends on async SaveManager and screenshot pipeline from Phase 1. The visual payoff of the entire milestone — this is what players see.

**Delivers:**
- SaveLoadScreen.js complete rewrite (100 slots, 10 pages × 10 per page)
- Thumbnail card grid (JPEG via `asset://saves/slot_XX.jpg`)
- Page navigation tabs
- Overwrite confirmation dialog
- Delete slot functionality
- ESC priority chain refactor (stack-based overlay manager)
- Context-aware close behavior (return to game menu / title / game)

**Pitfalls to watch:** P3 (ESC chain), P4 (return context), P7 (typewriter finish before screenshot), P9 (voice stop on load), P15 (batch load), P20 (pre-capture timing)

**Research flag:** Standard patterns — no research needed.

### Phase 4: Fast-Forward / Skip Mode Upgrade (Can parallel with Phase 3)

**Rationale:** Read history benefits from file persistence (Phase 1), but can use localStorage fallback. Logically independent from Save/Load UI. The quick bar's "快進" button (Phase 2) activates this, but the skip logic itself is self-contained.

**Delivers:**
- `ReadHistory.js` module (tracks `sceneId:pageIndex` pairs, persisted)
- Skip-all vs skip-read-only logic in main.js dialogue handler
- Audio suppression during skip (BGM/SE/voice)
- Transition duration override (→ 0) during skip
- ConfigManager `skipMode` setting + settingDefs entry
- Settings screen skip-mode toggle (auto-rendered from SETTING_DEFS)

**Pitfalls to watch:** P5 (read tracking persistence), P21 (audio glitches), P22 (recursion depth), P23 (transition speed), P24 (settings wiring)

**Research flag:** Standard patterns — no research needed.

### Phase 5: Integration & Polish

**Rationale:** Cross-cutting concerns that span all features. Testing the interactions.

**Delivers:**
- Full ESC chain testing across all overlays
- Preview mode guards (`_previewMode` checks on all new features)
- Edge case fixes: save during typewriter, load state cleanup, page boundary skip
- Keyboard shortcut expansion (F5/Ctrl+S save, F9/Ctrl+L load)

---

## Open Questions for Requirements

1. **Quick bar button order** — Japanese convention: 自動 → 快進 → 回想 → 存档 → 読档 → 設置 (left to right). Or should it match the spec order: 存档 → 読档 → 回想 → 設置 → 自動 → 快進? Need user confirmation.

2. **Save slot numbering** — Start from 0 or 1? Display as "Save 001" or "Save 1"? Affects both UI labels and filename convention.

3. **Thumbnail aspect ratio** — Game area is 1280×720 (16:9). Thumbnail at 320×180 fits 5 per row in a 1280px-wide save screen. Is 5 columns × 2 rows = 10 per page the desired layout? Or 4 columns × 3 rows = 12?

4. **Read history storage location** — localStorage (player-specific, survives project copy) vs `saves/read-history.json` (portable with project)? STACK.md recommends localStorage. ARCHITECTURE.md recommends file. Both work — need decision. Recommend: localStorage (it's player data, not project data).

5. **Skip mode default** — Should new games default to "skip all" or "skip read only"? ARCHITECTURE.md defaults to `'read'` (safer). Confirm.

6. **Overwrite confirmation UX** — Inline "确定覆盖?" with confirm/cancel buttons in the slot card? Or a modal dialog/overlay? Inline is simpler and less intrusive.

7. **Quick save/load** — Defer entirely to v0.5.1, or implement as keyboard-only (F5/F9) with a dedicated slot 0 in v0.5?

---

## Key Decision Points

| Decision | Options | Recommendation | Rationale |
|----------|---------|----------------|-----------|
| Screenshot technology | A) `webContents.capturePage()` B) html2canvas C) modern-screenshot | **A) `capturePage()`** | html2canvas abandoned Jan 2022, can't resolve `asset://` (P1 CRITICAL), freezes UI (P19). capturePage is native, zero-dep, pixel-perfect. |
| Thumbnail format | A) JPEG 80% B) PNG C) WebP | **A) JPEG 80%** | 15-30KB per thumb vs 100-500KB PNG. 100 slots × 30KB = 3MB total. WebP not needed for this size. |
| Thumbnail size | A) 320×180 B) 256×144 C) 400×225 | **A) 320×180** | 1/4 scale of 1280×720. Recognizable at save-card size. Fits 5 per row cleanly. |
| Save file structure | A) Individual files per slot B) Single monolithic file C) SQLite | **A) Individual files** | Atomic writes per slot, no corruption cascade, fast single-slot read. Standard in all desktop VN engines. |
| Thumbnail serving | A) Extend `asset://` for `saves/` B) Base64 in IPC C) New `save://` protocol | **A) Extend `asset://`** | ~5 lines of code change, zero base64 bloat, uses existing infrastructure. |
| Read history storage | A) localStorage (per-player) B) `saves/read-history.json` (per-project) | **A) localStorage** | Read history is player data, not project data. Survives save deletion. Matches ConfigManager pattern. |
| SaveManager migration | A) Lazy migrate on first access B) Eager migrate on init C) Keep dual storage | **A) Lazy migrate** | Check for old saves on `list-saves` call, migrate + delete old entries, write `.migrated` marker. |
| ESC handler pattern | A) Stack-based overlay manager B) Extend if/else chain | **A) Stack-based** | Future-proof, clean, avoids N+1 problem as more overlays are added. |
| Skip animation behavior | A) Override duration → 0 B) CSS class that disables transitions C) Skip rendering entirely | **A) Override duration → 0** | Simple, predictable, visual state stays consistent. |
| Audio during skip | A) Suppress all audio events B) Let BGM play, suppress voice/SE C) Suppress nothing | **A) Suppress all, apply final state on skip-end** | Prevents audio glitches (P21). Track pending BGM, apply when skip stops. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new deps — every API is stable Electron/browser built-in. Verified against codebase. |
| Features | **HIGH** | Based on 20+ years of VN engine conventions (KiriKiri, Ren'Py, NScripter, commercial titles). Well-established table stakes. |
| Architecture | **HIGH** | Every integration point verified against actual source code. Data flow changes are mechanical (sync → async). |
| Pitfalls | **HIGH** | 24 pitfalls identified from direct codebase analysis. Phase-specific warnings map cleanly to build order. |

### Gaps

1. **ARCHITECTURE.md recommends html2canvas** — this is WRONG and overridden by STACK.md + PITFALLS.md consensus. The synthesis resolves in favor of `capturePage()`.
2. **Exact save slot filename convention** — STACK uses `slot_XX` (zero-padded 2 digits), ARCHITECTURE uses `slot-NNN` (zero-padded 3 digits). Needs standardization during requirements. Recommend: `slot_001.json` / `slot_001.jpg` (3-digit, underscore, matches up to slot 100).
3. **Ctrl-held skip** — All research mentions this as a standard VN convention but none commit to v0.5 scope. It's low complexity and high value — consider including.

---

## Sources

- **Codebase analysis** (HIGH): SaveManager.js, SaveLoadScreen.js, ScriptEngine.js, main.js, GameMenu.js, DialogueBox.js, AudioManager.js, ConfigManager.js, SettingsScreen.js, BacklogScreen.js, TitleScreen.js, electron/main.js, electron/preload.js, style.css, index.html
- **Electron API docs** (HIGH): webContents.capturePage(), NativeImage.resize(), NativeImage.toJPEG()
- **npm registry** (HIGH): html2canvas 1.4.1 (Jan 2022 — abandoned), modern-screenshot 4.6.8 (active), html-to-image 1.11.13 (active)
- **VN engine conventions** (HIGH): Ren'Py, KiriKiri/吉里吉里, NScripter, TyranoScript, commercial titles (Key, TYPE-MOON, Frontwing)
- **Project constraints** (HIGH): Zero new npm deps policy (PROJECT.md, established v0.2)
