# Phase 22: Skip Mode - Research

**Researched:** 2026-04-05
**Domain:** Visual novel skip mode — read history tracking, audio suppression, transition override, event interception
**Confidence:** HIGH

## Summary

Phase 22 implements a standard visual novel skip mode that rapidly advances through dialogue at 30ms intervals. The implementation lives entirely in `main.js` as an orchestration layer (D-11), intercepting engine events to suppress audio, override transitions, and track read pages. The architecture is straightforward because ScriptEngine's EventEmitter pattern already gives main.js full control over what happens when events fire.

The key technical challenge is **event interception without modifying ScriptEngine**. Currently, main.js registers direct handlers like `engine.on('play_bgm', (data) => audio.playBgm(data))`. During skip, these handlers must behave differently: suppress SE/voice, mute BGM, and override transition durations. The cleanest approach is wrapping handlers with skip-aware logic that checks the `skipMode` flag and either suppresses, modifies, or passes through.

A secondary challenge is **BGM state tracking during skip**. Multiple BGM change events may fire during a skip sequence. On skip end, the correct final BGM must be playing. This requires a shadow state that records BGM events during skip without playing them, then applies the final state on skip end.

**Primary recommendation:** Implement skip as a `setInterval(30ms)` loop in main.js that calls `engine.next()`, with event handler wrappers that check `skipMode` to suppress/modify behavior. Create `ReadHistory.js` as a standalone module with `Set<"sceneId:pageIndex">` persisted to localStorage. Wire everything through existing callback patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Fixed 30ms skip interval (~33 pages/sec)
- D-02: Left-top capsule "▶▶ SKIP" indicator
- D-03: localStorage cross-save shared ReadHistory with key format `readHistory:{projectId}`
- D-04: Mark read on page_enter event (immediately when engine enters a page)
- D-05: Two modes: skip-all and skip-read-only (default: readOnly)
- D-06: 6 stop triggers (choice, unread, click, key, end, overlay)
- D-07: BGM mute + SE/Voice skip, restore final BGM on skip end
- D-08: Transition durations → 0 during skip
- D-09: settingDefs 'skip-mode' select entry with values 'all' | 'readOnly'
- D-10: Skip indicator styling (semi-transparent capsule, top-left, z-index above dialogue below overlays)
- D-11: Skip logic stays in main.js, NOT in engine
- D-12: New ReadHistory.js module in src/engine/
- D-13: QuickActionBar skip button toggles off during skip (existing behavior)

### Deferred Ideas (OUT OF SCOPE)
- Skip speed slider in settings
- Visual text scrolling effect during skip
- Skip history persistence to file system
- Per-route read tracking
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKIP-01 | Two skip modes: skip-all and skip-read-only (default: read-only) | ConfigManager + settingDefs integration pattern (see Architecture §1, §7) |
| SKIP-02 | ReadHistory module tracking read pages, persisted to localStorage | ReadHistory class pattern (see Architecture §2) |
| SKIP-03 | Skip-read-only mode auto-stops at unread pages, resumes normal speed | page_enter handler + ReadHistory check pattern (see Architecture §5) |
| SKIP-04 | Visual "▶▶ SKIP" indicator overlay, auto-stop at choice/unread | Skip indicator DOM + CSS pattern (see Architecture §3) |
| SKIP-05 | Suppress all audio during skip, apply final audio state on skip end | Event interception + BGM shadow state pattern (see Architecture §1, §4, §6) |
| SKIP-06 | Override transition durations to 0 during skip | Event data mutation pattern (see Architecture §3) |
| SKIP-07 | Settings page toggle for skip mode (extend ConfigManager + settingDefs) | settingDefs select entry + ConfigManager default (see Architecture §7) |

</phase_requirements>

## Architecture Patterns

### Pattern 1: Event Interception via Handler Wrapping

**What:** Replace direct engine event handlers with skip-aware wrappers that modify behavior when `skipMode` is true.

**Why this works:** Currently main.js wires events like:
```javascript
engine.on('play_bgm', (data) => audio.playBgm(data));
engine.on('play_se', (data) => audio.playSe(data));
engine.on('set_background', (data) => background.setBackground(data));
engine.on('show_character', (data) => characters.show(data));
engine.on('hide_character', (data) => characters.hide(data));
```

These one-liner handlers are the interception points. Instead of modifying ScriptEngine (D-11), we make these handlers conditionally modify or suppress based on `skipMode`.

**Implementation pattern:**
```javascript
// ─── Audio events (skip-aware) ──────────────────────────
engine.on('play_bgm', (data) => {
  if (skipMode) {
    // Track BGM state but don't play (D-07)
    pendingBgm = { ...data };
    return;
  }
  audio.playBgm(data);
});

engine.on('stop_bgm', (data) => {
  if (skipMode) {
    pendingBgm = null; // BGM stopped during skip
    return;
  }
  audio.stopBgm(data);
});

engine.on('play_se', (data) => {
  if (skipMode) return; // Suppress SE entirely (D-07)
  audio.playSe(data);
});

// ─── Visual events (skip-aware transitions) ─────────────
engine.on('set_background', (data) => {
  if (skipMode) {
    background.setBackground({ ...data, duration: 0, transition: 'cut' });
    return;
  }
  background.setBackground(data);
});

engine.on('show_character', (data) => {
  if (skipMode) {
    characters.show({ ...data, duration: 0, transition: 'none' });
    return;
  }
  characters.show(data);
});

engine.on('hide_character', (data) => {
  if (skipMode) {
    characters.hide({ ...data, duration: 0 });
    return;
  }
  characters.hide(data);
});
```

**Confidence:** HIGH — this is the exact pattern the codebase already uses (main.js is the orchestration layer, handlers are one-liners). No engine modification needed.

**Critical detail:** The existing handlers on lines 168-174 of main.js must be **replaced** (not appended to) with the skip-aware versions. Since `EventEmitter.on()` adds to a Set, the old handlers need to be removed or the registration needs to happen once with conditional logic inside.

### Pattern 2: ReadHistory Module

**What:** Standalone class in `src/engine/ReadHistory.js` that tracks which pages have been viewed.

**Implementation:**
```javascript
/**
 * ReadHistory — Tracks which pages have been read by the player
 */
export class ReadHistory {
  /**
   * @param {string} projectId — used for localStorage key scoping
   */
  constructor(projectId) {
    this._storageKey = `readHistory:${projectId}`;
    this._read = new Set();
    this._load();
  }

  /**
   * Mark a page as read
   * @param {string} sceneId
   * @param {number} pageIndex
   */
  markRead(sceneId, pageIndex) {
    const key = `${sceneId}:${pageIndex}`;
    if (this._read.has(key)) return; // Already read, skip persistence
    this._read.add(key);
    this._save();
  }

  /**
   * Check if a page has been read
   * @param {string} sceneId
   * @param {number} pageIndex
   * @returns {boolean}
   */
  isRead(sceneId, pageIndex) {
    return this._read.has(`${sceneId}:${pageIndex}`);
  }

  /** Clear all read history */
  clear() {
    this._read.clear();
    this._save();
  }

  /** @returns {number} Number of read entries */
  get size() {
    return this._read.size;
  }

  /** @private */
  _load() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        this._read = new Set(arr);
      }
    } catch (e) {
      console.warn('[ReadHistory] Failed to load:', e);
    }
  }

  /** @private */
  _save() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify([...this._read]));
    } catch (e) {
      console.warn('[ReadHistory] Failed to save:', e);
    }
  }
}
```

**Confidence:** HIGH — follows exact same patterns as ConfigManager (constructor loads from localStorage, methods save on mutation, try/catch with console.warn fallback).

**Note on projectId:** In standalone mode (index.html), projectId comes from `engine.script.meta.title` or a URL parameter. In the current init flow (`src/main.js` line 568), the engine loads `script.json` and the meta title is available at `engine.script.meta.title`. This is sufficient for localStorage scoping per-game.

### Pattern 3: Skip Indicator Overlay

**What:** A DOM element appended to `gameContainer` that shows "▶▶ SKIP" during skip mode.

**Implementation approach:**
```javascript
// Create skip indicator once at init
const skipIndicator = document.createElement('div');
skipIndicator.id = 'skip-indicator';
skipIndicator.textContent = '▶▶ SKIP';
skipIndicator.classList.add('hidden');
gameContainer.appendChild(skipIndicator);
```

**CSS (in style.css):**
```css
#skip-indicator {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 12px;
  z-index: 15;         /* above ui-overlay(10), below title(100) and overlays(200) */
  pointer-events: none;
  user-select: none;
}

#skip-indicator.hidden {
  display: none;
}
```

**z-index rationale:**
- `#background-layer`: 1
- `#character-layer`: 2
- `#dialogue-layer`: 3
- `#ui-overlay`: 10
- **`#skip-indicator`: 15** — above dialogue and game menu, below title screen (100) and save/load/settings overlays (200)

**Confidence:** HIGH — matches existing overlay patterns (toast uses inline absolute positioning, same approach).

### Pattern 4: Skip Loop (setInterval)

**What:** The main skip advancement loop uses `setInterval(30)` instead of chained `setTimeout(50)`.

**Current implementation (lines 519-526):**
```javascript
function toggleSkip() {
  skipMode = !skipMode;
  autoMode = false;
  updateQuickBtnStates();
  if (skipMode && engine.waiting) {
    engine.next();
  }
}
```

**Current dialogue handler skip logic (lines 163-165):**
```javascript
if (skipMode) {
  setTimeout(() => engine.next(), 50);
}
```

**New implementation:**
```javascript
let skipTimer = null;

function startSkip() {
  skipMode = true;
  autoMode = false;
  clearAutoTimer();
  updateQuickBtnStates();
  skipIndicator.classList.remove('hidden');
  audio.stopVoice(); // Stop any playing voice immediately

  // Start skip loop
  skipTimer = setInterval(() => {
    if (!skipMode || engine.ended) {
      stopSkip();
      return;
    }
    if (engine.waiting) {
      engine.next();
    }
  }, 30);
}

function stopSkip() {
  if (!skipMode && !skipTimer) return;
  skipMode = false;
  if (skipTimer) {
    clearInterval(skipTimer);
    skipTimer = null;
  }
  skipIndicator.classList.add('hidden');
  updateQuickBtnStates();
  restoreBgmAfterSkip(); // Apply final BGM state (D-07)
}

function toggleSkip() {
  if (skipMode) {
    stopSkip();
  } else {
    startSkip();
  }
}
```

**Key change:** The skip loop is a single `setInterval(30)` instead of the current pattern where `dialogue` handler chains `setTimeout(50)`. This is cleaner because:
1. Single timer to manage (not scattered setTimeout chains)
2. 30ms matches D-01 spec exactly
3. Loop checks `engine.waiting` — if the engine isn't waiting (mid-processing), it skips that tick harmlessly
4. The `dialogue` handler no longer needs skip-specific logic — the interval handles advancement

**Critical: Remove skip logic from dialogue handler.** The current `if (skipMode) { setTimeout(() => engine.next(), 50); }` in the `dialogue` event handler (line 163-165) must be removed. The setInterval loop handles all advancement.

**Confidence:** HIGH — setInterval at 30ms for skip is the standard galgame pattern. The engine.waiting guard prevents double-advancement.

### Pattern 5: Skip-Read-Only Stop Detection

**What:** During skip, check each page via ReadHistory. If in "read-only" mode and page is unread, stop skip.

**Integration point:** The `page_enter` event fires synchronously during `engine._processCurrentPage()` → `engine._renderPage()` → `this.emit('page_enter', ...)`. The handler in main.js runs synchronously before the rest of `_renderPage` continues.

**However**, the critical insight is that `page_enter` fires **during** `engine.next()` → `_advancePage()` → `_processCurrentPage()` → `_renderPage()`. The page is already being processed. Setting `skipMode = false` in the `page_enter` handler is safe because:
1. The current page renders normally (events fire, handlers execute)
2. The skip interval's next tick sees `skipMode === false` and doesn't call `engine.next()` again
3. The page displays at full speed (dialogue shows with typewriter, transitions play normally)

**BUT** there's a subtlety: during skip, the event handlers for `set_background`, `show_character`, etc. check `skipMode` and override durations to 0. Since `page_enter` fires FIRST (line 287 of ScriptEngine.js) — before `set_background` (line 298) — we can set `skipMode = false` in `page_enter` and the subsequent visual events for **that same page** will use normal durations. This is exactly what we want: unread pages render normally.

**Implementation:**
```javascript
engine.on('page_enter', (data) => {
  // Always mark page as read (D-04)
  readHistory.markRead(data.sceneId, data.pageIndex);

  // Skip-read-only stop check (SKIP-03)
  if (skipMode && config.get('skipMode') === 'readOnly') {
    // Note: we just marked this page as read ABOVE, but we need to
    // check if it WAS read BEFORE this visit. So check BEFORE markRead.
    // → Move markRead AFTER the check, or use a wasRead flag.
  }
});
```

**IMPORTANT ordering fix:** We need to check `isRead()` BEFORE calling `markRead()`:
```javascript
engine.on('page_enter', (data) => {
  const wasRead = readHistory.isRead(data.sceneId, data.pageIndex);

  // Always mark as read (D-04) — even during skip
  readHistory.markRead(data.sceneId, data.pageIndex);

  // Stop skip at unread pages in read-only mode (SKIP-03)
  if (skipMode && !wasRead && config.get('skipMode') === 'readOnly') {
    stopSkip();
  }
});
```

**Timing flow for an unread page in skip-read-only mode:**
1. skip interval tick: `engine.next()` called
2. engine processes next page → `_renderPage()` called
3. `page_enter` fires → `wasRead = false` → `stopSkip()` sets `skipMode = false`
4. `set_background` fires → `skipMode` is now false → normal duration used ✓
5. `show_character` fires → normal duration ✓
6. `dialogue` fires → typewriter starts normally ✓
7. next interval tick → `skipMode === false` → does nothing → `clearInterval` already happened

**Confidence:** HIGH — verified by reading ScriptEngine._renderPage event order (page_enter → set_background → characters → bgm → se → dialogue).

### Pattern 6: BGM Shadow State and Restoration

**What:** During skip, BGM events are captured but not played. On skip end, the final BGM state is applied.

**State tracking:**
```javascript
let pendingBgm = null; // { file, volume, fadeIn } or null (stopped)
```

**On skip start:** Record current BGM info if any is playing, then mute.
```javascript
function startSkip() {
  // ... existing logic ...
  // Mute current BGM immediately
  if (audio._bgm) {
    audio._bgm.volume = 0;
  }
  pendingBgm = undefined; // undefined = no change pending, keep current
}
```

**During skip:** `play_bgm` and `stop_bgm` handlers update `pendingBgm`:
```javascript
engine.on('play_bgm', (data) => {
  if (skipMode) {
    pendingBgm = { ...data };
    return;
  }
  audio.playBgm(data);
});

engine.on('stop_bgm', (data) => {
  if (skipMode) {
    pendingBgm = null; // null = BGM should be stopped
    return;
  }
  audio.stopBgm(data);
});
```

**On skip end (restoreBgmAfterSkip):**
```javascript
function restoreBgmAfterSkip() {
  if (pendingBgm === undefined) {
    // No BGM change during skip — unmute current BGM
    if (audio._bgm) {
      const master = config.get('masterVolume');
      audio._bgm.volume = config.get('bgmVolume') * master;
    }
  } else if (pendingBgm === null) {
    // BGM was stopped during skip
    audio.stopBgm({ fadeOut: 0 });
  } else {
    // BGM changed during skip — play the final one
    audio.stopBgm({ fadeOut: 0 });
    audio.playBgm(pendingBgm);
  }
  pendingBgm = undefined;
}
```

**Three-state pendingBgm:**
| Value | Meaning |
|-------|---------|
| `undefined` | No BGM change occurred during skip — just unmute current |
| `null` | stop_bgm was the last BGM event — stop BGM on skip end |
| `{ file, volume, fadeIn }` | play_bgm was the last event — play this BGM on skip end |

**Confidence:** HIGH — AudioManager's internal `_bgm` is a plain HTMLAudioElement, setting `.volume = 0` is safe and instant.

### Pattern 7: ConfigManager + settingDefs Extension

**What:** Add `skipMode` setting with `'all'` and `'readOnly'` values.

**settingDefs.js addition:**
```javascript
'skip-mode': {
  type: 'select',
  settingKey: 'skipMode',
  label: '快进模式',
  options: [
    { value: 'all', label: '全部跳过' },
    { value: 'readOnly', label: '只跳已读' },
  ],
  default: 'readOnly',
},
```

**ConfigManager.js defaults addition:**
```javascript
this.defaults = {
  // ... existing defaults ...
  skipMode: 'readOnly',   // 'all' | 'readOnly'
};
```

**Rendering:** The existing SettingsScreen already handles `type: 'select'` components via `_buildSelect()` (line 173-195). Both the custom layout and default layout modes work. For the default layout, a new settings-item block needs to be added.

**Confidence:** HIGH — exact same pattern as the existing `'window-mode'` select component.

### Anti-Patterns to Avoid

- **Modifying ScriptEngine for skip logic:** D-11 explicitly requires skip to stay in main.js. The engine must remain "pure" — it doesn't know about skip mode.
- **Using setTimeout chains instead of setInterval:** The current implementation (line 164) uses `setTimeout(() => engine.next(), 50)` inside the dialogue handler. This creates fragile chains. A single setInterval loop is cleaner.
- **Checking readHistory AFTER markRead:** Would cause skip-read-only to never stop (every page is "read" by the time we check).
- **Playing BGM events during skip with volume 0:** Would cause rapid Audio element creation/destruction. Better to suppress entirely and track shadow state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Read history persistence | Custom file-based storage | `localStorage` + `JSON.stringify(Set)` | D-03 locks this, cross-save shared, simple enough for localStorage |
| Skip timer | setTimeout chains | `setInterval(30)` | Single timer, predictable 30ms ticks, easy cleanup |
| Settings UI for skip mode | Custom settings component | Existing `settingDefs` + `SettingsScreen._buildSelect()` | Already renders select components perfectly |

## Common Pitfalls

### Pitfall 1: Race condition — skip interval fires while engine is mid-processing
**What goes wrong:** `engine.next()` called while engine is still processing a page (not `waiting`). Could cause command index corruption.
**Why it happens:** `setInterval(30)` fires every 30ms regardless of engine state.
**How to avoid:** Guard with `if (engine.waiting)` check in the interval callback. The engine only sets `waiting = true` after `_playCurrentDialogue()` emits `dialogue` event (line 405: `this.waiting = true`). If the interval fires during `_renderPage()` before dialogue is emitted, `waiting` is still false from the previous `engine.next()` call (line 104: `this.waiting = false`), so the guard prevents double-advance.
**Warning signs:** Pages being skipped without their visual state being applied.

### Pitfall 2: Auto-mode and skip-mode mutual exclusion
**What goes wrong:** Both autoMode and skipMode active simultaneously → double advancement.
**Why it happens:** Forgetting to cancel auto when starting skip (or vice versa).
**How to avoid:** `startSkip()` must set `autoMode = false` and `clearAutoTimer()`. `toggleAuto()` already sets `skipMode = false`. Both functions already do this in the current codebase (lines 466-467, 520-521), but skip now also needs to clear the auto timer and cancel voice-wait Promise chains.
**Warning signs:** Dialogue advancing twice per tick.

### Pitfall 3: Voice promise lingering after skip starts
**What goes wrong:** Auto-mode voice wait promise (`currentVoicePromise`) resolves during skip and triggers `engine.next()`.
**Why it happens:** Phase 18's auto-mode voice wait uses `Promise.all([textWait, voiceWait])`. If skip starts while auto-mode was active, the pending promise could resolve and call `engine.next()`.
**How to avoid:** `startSkip()` calls `stopAuto()` which sets `autoMode = false`. The `Promise.all` then-handler checks `if (autoMode && engine.waiting)` (line 505-507), so it won't advance. Additionally, `audio.stopVoice()` should be called on skip start to cancel voice playback immediately.
**Warning signs:** Extra `engine.next()` call from resolved voice promise.

### Pitfall 4: Skip not stopping on overlay open
**What goes wrong:** Skip continues running behind save/load/settings/backlog overlays.
**Why it happens:** Overlay open functions don't call `stopSkip()`.
**How to avoid:** Every overlay-opening path must call `stopSkip()`. The existing code already calls `stopSkip()` in quickBar.onSave, quickBar.onLoad, quickBar.onSettings (lines 313-351). But gameMenu.onSave, gameMenu.onLoad, gameMenu.onBacklog, and gameMenu.onSettings (lines 281-290) do NOT call stopSkip(). These need to be checked — though in practice the game menu only shows when isPlaying is false or dialogue is hidden, the D-06 requirement is explicit.
**Warning signs:** Skip timer still running when save screen is visible.

### Pitfall 5: ReadHistory markRead called for choice/condition pages
**What goes wrong:** Choice and condition pages get marked as "read" in ReadHistory, bloating storage with non-meaningful entries.
**Why it happens:** `page_enter` fires for ALL page types, including `'choice'` and `'condition'`.
**How to avoid:** This is actually fine — choice pages should be marked read too (they're visual pages the player sees). Condition pages are auto-processed and don't have meaningful visual state, but marking them read is harmless and keeps the logic simple. The stop-at-choice check (D-06) happens via `engine.on('choice')` which already calls `stopSkip()` (line 179), so choice pages correctly stop skip regardless of read status.
**Warning signs:** None — this is a non-issue.

### Pitfall 6: Skip end BGM restoration uses wrong volume
**What goes wrong:** After skip ends, BGM plays at wrong volume because master volume multiplication was missed.
**Why it happens:** `audio.playBgm(data)` uses `data.volume * this.bgmVolume` internally (line 50 of AudioManager.js). If `applyConfig()` has set `bgmVolume` correctly, it should work. But the `setBgmVolume(vol)` method (line 102-107) directly sets `this.bgmVolume` AND adjusts the current element volume. Need to ensure restoration goes through `playBgm()` (which handles multiplication) rather than direct volume assignment.
**How to avoid:** `restoreBgmAfterSkip()` must call `audio.playBgm(pendingBgm)` for new BGM, and for unmuting existing BGM, must use the same calculation as `applyConfig()`: `config.get('bgmVolume') * config.get('masterVolume')`.
**Warning signs:** BGM too loud or too quiet after skip ends.

### Pitfall 7: Click/key stop triggers during skip must not also advance dialogue
**What goes wrong:** Player clicks to stop skip, but the click also triggers `dialogueBox._handleClick()` which advances dialogue.
**Why it happens:** `gameContainer.addEventListener('click')` (line 408) calls `dialogueBox._handleClick()` if engine is waiting. If skip stops on click, the same click could also advance.
**How to avoid:** In the click handler, check if `skipMode` was true and call `stopSkip()` instead of advancing. The click handler should return early after stopping skip. Similarly, the keydown handler should stop skip and return early before processing as a dialogue-advance key.
**Warning signs:** Player stops skip and immediately loses one line of dialogue.

### Pitfall 8: localStorage bloat for long games
**What goes wrong:** ReadHistory Set grows very large (thousands of entries) for long games, making localStorage reads/writes slow.
**Why it happens:** Every page visit adds an entry. A game with 20 scenes × 50 pages = 1000 entries, each ~20 chars = ~20KB. Even 10,000 entries ≈ 200KB, well within localStorage's 5-10MB limit.
**How to avoid:** Not an immediate concern. The deferred idea "Skip history persistence to file" covers this. For now, `JSON.stringify([...this._read])` is fine.
**Warning signs:** Noticeable lag on `markRead()` calls (unlikely under 10K entries).

### Pitfall 9: Skip continues after scene transition to empty scene
**What goes wrong:** Skip timer keeps running but engine has ended because the next scene doesn't exist.
**Why it happens:** `_enterScene()` fails silently when scene is not found (logs error, returns). Engine doesn't emit `end`. Skip loop sees `!engine.ended` and `engine.waiting` might be stale.
**How to avoid:** The skip interval checks `engine.ended`. Also, after a failed `_enterScene()`, the engine won't be `waiting`, so `engine.next()` in the interval is a no-op. However, the interval keeps running pointlessly. Add `engine.ended` check as a secondary guard in the interval.
**Warning signs:** Console error "Scene not found" followed by skip indicator staying visible.

## Code Examples

### Complete toggleSkip / startSkip / stopSkip
```javascript
// Source: Synthesized from codebase analysis
let skipTimer = null;
let pendingBgm = undefined; // undefined=no change, null=stopped, object=new BGM

function startSkip() {
  if (skipMode) return;
  skipMode = true;
  autoMode = false;
  clearAutoTimer();
  audio.stopVoice();
  updateQuickBtnStates();
  skipIndicator.classList.remove('hidden');

  // Mute current BGM (D-07)
  if (audio._bgm) {
    audio._bgm.volume = 0;
  }
  pendingBgm = undefined;

  // Start 30ms skip loop (D-01)
  skipTimer = setInterval(() => {
    if (!skipMode || engine.ended) {
      stopSkip();
      return;
    }
    if (engine.waiting) {
      engine.next();
    }
  }, 30);
}

function stopSkip() {
  if (!skipMode && !skipTimer) return;
  const wasSkipping = skipMode;
  skipMode = false;
  if (skipTimer) {
    clearInterval(skipTimer);
    skipTimer = null;
  }
  skipIndicator.classList.add('hidden');
  updateQuickBtnStates();
  if (wasSkipping) {
    restoreBgmAfterSkip();
  }
}

function restoreBgmAfterSkip() {
  const master = config.get('masterVolume');
  const bgmVol = config.get('bgmVolume') * master;

  if (pendingBgm === undefined) {
    // No BGM change during skip — just unmute
    if (audio._bgm) {
      audio._bgm.volume = bgmVol;
    }
  } else if (pendingBgm === null) {
    // stop_bgm was final event
    audio.stopBgm({ fadeOut: 0 });
  } else {
    // play_bgm was final event — play the new track
    audio.stopBgm({ fadeOut: 0 });
    audio.playBgm(pendingBgm);
  }
  pendingBgm = undefined;
}

function toggleSkip() {
  if (skipMode) {
    stopSkip();
  } else {
    startSkip();
  }
}
```

### page_enter handler with ReadHistory integration
```javascript
// Source: Synthesized from ScriptEngine event flow analysis
engine.on('page_enter', (data) => {
  // Check read status BEFORE marking (SKIP-03 ordering requirement)
  const wasRead = readHistory.isRead(data.sceneId, data.pageIndex);

  // Always mark as read on page_enter (D-04)
  readHistory.markRead(data.sceneId, data.pageIndex);

  // Stop skip at unread pages in read-only mode (SKIP-03)
  if (skipMode && !wasRead && config.get('skipMode') === 'readOnly') {
    stopSkip();
  }
});
```

### Click handler with skip-stop priority
```javascript
// Source: Adapted from existing gameContainer click handler (line 408)
gameContainer.addEventListener('click', (e) => {
  if (!isPlaying) return;
  if (engine.ended) return;

  // Don't interfere with UI element clicks
  const target = e.target;
  if (target.closest('#quick-action-bar')) return;
  if (target.closest('#choice-menu')) return;
  if (target.closest('#game-menu')) return;
  if (target.closest('#save-load-screen')) return;
  if (target.closest('#settings-screen')) return;
  if (target.closest('#backlog-screen')) return;
  if (target.closest('#title-screen')) return;

  // D-06: Click stops skip — do NOT also advance dialogue
  if (skipMode) {
    stopSkip();
    return;
  }

  // Normal advance
  if (engine.waiting) {
    dialogueBox._handleClick();
  }
});
```

### Keydown handler with skip-stop priority
```javascript
// Source: Adapted from existing keydown handler (line 355)
// Inside the switch block, before processing gameplay keys:
if (skipMode && e.key !== 'F5' && e.key !== 'F9') {
  // D-06: Any key stops skip (except quicksave/load which already stop skip)
  stopSkip();
  return;
}
```

### dialogue handler cleanup (remove skip chaining)
```javascript
// Source: Modified from line 142
engine.on('dialogue', (data) => {
  choiceMenu.hide();
  const currentPage = engine.script.scenes[engine.currentScene]?.pages[engine.pageIndex];
  data.fontOverride = currentPage?.fontOverride || null;

  // During skip, skip typewriter — show text instantly
  if (skipMode) {
    dialogueBox.show(data);
    dialogueBox._finishLine(); // Instant text display
    currentVoicePromise = null; // Don't play voice during skip (D-07)
    return; // Skip interval handles advancement — no setTimeout chain
  }

  dialogueBox.show(data);

  // Voice playback
  if (data.voice) {
    currentVoicePromise = audio.playVoice(data.voice);
  } else {
    currentVoicePromise = null;
  }

  // Auto mode
  if (autoMode) {
    startAutoTimer();
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setTimeout chain (50ms per dialogue) | setInterval(30ms) loop | This phase | Cleaner timer management, matches D-01 spec |
| No read tracking | ReadHistory Set + localStorage | This phase | Enables skip-read-only mode |
| Direct event handlers | Skip-aware conditional handlers | This phase | Enables audio suppression + transition override |

## Open Questions

1. **projectId for ReadHistory in standalone mode**
   - What we know: In editor preview (iframe mode), the full script is passed via postMessage. In standalone mode, script.json is loaded from `/game/script.json`.
   - What's unclear: What uniquely identifies a game project? `engine.script.meta.title` could work but could have duplicates across different games.
   - Recommendation: Use `engine.script.meta.title` as projectId. It's good enough for localStorage scoping. If games share the same title, their read histories would merge — acceptable edge case for a game maker tool.

2. **Default layout settings screen — adding skip-mode row**
   - What we know: The default layout (`_renderDefault`) hardcodes all settings items in HTML template literal (lines 299-349). A new `skip-mode` select needs to be added.
   - What's unclear: Whether to add it as another segment-group row or keep it purely as a settingDefs entry for custom layouts only.
   - Recommendation: Add it to both — a new settings-item row in `_renderDefault()` AND the settingDefs registry. The default layout is the fallback when no custom layout exists.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework configured |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKIP-01 | Two skip modes configurable | manual | Manual: toggle setting in game, verify behavior | N/A |
| SKIP-02 | ReadHistory persists to localStorage | manual | Manual: skip through pages, refresh, verify read status | N/A |
| SKIP-03 | Auto-stop at unread in read-only mode | manual | Manual: start new game, skip, verify stops at first page | N/A |
| SKIP-04 | Visual "▶▶ SKIP" indicator | manual | Manual: activate skip, verify indicator visible | N/A |
| SKIP-05 | Audio suppressed during skip | manual | Manual: skip through pages with BGM/SE, verify silence | N/A |
| SKIP-06 | Transitions instant during skip | manual | Manual: skip through scene changes, verify no animation | N/A |
| SKIP-07 | Settings toggle for skip mode | manual | Manual: open settings, change skip mode, verify persistence | N/A |

### Sampling Rate
- **Per task commit:** Manual verification (no test framework)
- **Per wave merge:** Full manual walkthrough of all 7 requirements
- **Phase gate:** Complete manual test of all success criteria before `/gsd-verify-work`

### Wave 0 Gaps
No test framework exists in this project. All validation is manual. This is consistent with the established project pattern (no test infrastructure across 21 prior phases).

## Sources

### Primary (HIGH confidence)
- `src/engine/ScriptEngine.js` — Event emission order in `_renderPage()` (page_enter → set_background → characters → bgm → se)
- `src/engine/AudioManager.js` — BGM/SE/Voice control methods, internal `_bgm` element access
- `src/engine/ConfigManager.js` — Config persistence pattern (localStorage, get/set/save)
- `src/engine/settingDefs.js` — Component registry pattern, existing select type (`window-mode`)
- `src/ui/BackgroundLayer.js` — Transition duration via `data.duration`, crossfade pattern
- `src/ui/CharacterLayer.js` — Show/hide transition via `data.duration` and `data.transition`
- `src/ui/SettingsScreen.js` — `_buildSelect()` for segment radio rendering
- `src/main.js` — Complete orchestration layer, existing skip/auto implementation, event handler wiring

### Secondary (MEDIUM confidence)
- Standard galgame skip mode behavior (CLANNAD, Fate/stay night, Ren'Py) — established genre convention for 30ms skip, read-only default, BGM mute pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all patterns exist in codebase
- Architecture: HIGH — event interception pattern directly follows existing main.js orchestration
- Pitfalls: HIGH — identified through line-by-line code analysis of event flow and timer interactions
- ReadHistory: HIGH — mirrors ConfigManager's exact localStorage pattern
- Audio suppression: HIGH — AudioManager internals fully understood, `_bgm.volume = 0` is trivial
- Transition override: HIGH — BackgroundLayer/CharacterLayer accept `duration` in event data, easy to mutate

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable — all patterns are internal codebase patterns, no external dependencies)
