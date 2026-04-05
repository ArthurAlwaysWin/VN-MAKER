# Phase 22: Skip Mode — Context

> Decisions captured via `/gsd-discuss-phase 22` on 2026-04-05

## Domain Boundary

Players can fast-forward through dialogue with intelligent read-page tracking. Two skip modes available: "skip all" and "skip read only". This phase delivers the ReadHistory module, skip engine logic, audio suppression, visual indicator, and a settings toggle.

**NOT in scope:** Skip animation effects, per-character voice auto-play during skip, text log during skip.

## Canonical Refs

- `.planning/REQUIREMENTS.md` — SKIP-01 through SKIP-07
- `.planning/ROADMAP.md` — Phase 22 goal and success criteria
- `src/main.js` — Current toggleSkip/stopSkip implementation (lines 519-536)
- `src/engine/ScriptEngine.js` — Engine event system (page_enter, dialogue, choice, etc.)
- `src/engine/settingDefs.js` — Setting component registry
- `src/engine/ConfigManager.js` — Config persistence
- `src/ui/QuickActionBar.js` — Skip button (onSkip, setSkipActive)

## Prior Decisions (carried forward)

- v0.5 research: Skip audio — suppress all events, apply final state on skip-end
- v0.5 research: Skip transitions — override duration to 0
- Phase 20: QuickActionBar skip button wired via `onSkip` callback + `setSkipActive(bool)` toggle
- Phase 20: F5/F9 inside `isPlaying` guard pattern
- Phase 18: Auto-mode voice wait — Promise.all + VOICE_END_DELAY=300ms (skip should cancel this)

## Decisions

### D-01: Skip speed — fixed 30ms interval
Skip advances pages at a fixed 30ms interval (~33 pages/second). No user-adjustable speed slider. Fast enough to be clearly "skipping" but not instant (allows visual feedback).

### D-02: SKIP indicator — left-top capsule
Display a semi-transparent capsule badge `▶▶ SKIP` at the top-left corner of the game screen. Appears on skip start, hides on skip end. Positioned to not overlap with dialogue box or QuickActionBar.

### D-03: ReadHistory storage — localStorage, cross-save shared
ReadHistory uses localStorage with key format `readHistory:{projectId}`. All save slots share the same read history. This matches standard Galgame behavior (CLANNAD, Fate, etc.) — once a page is read, it stays read regardless of which save slot. The Set stores `"sceneId:pageIndex"` entries.

### D-04: ReadHistory persistence timing
Mark page as read on `page_enter` event (immediately when the engine enters a page, not when the player manually advances). This ensures pages seen during skip are also marked read.

### D-05: Skip mode types — "all" and "read-only"
- **skip-all**: Skips every page regardless of read status. Stops only at choice pages.
- **skip-read-only** (default): Skips only pages already in ReadHistory. Stops at unread pages AND choice pages.
Setting stored in ConfigManager as `skipMode` with values `'all'` | `'readOnly'`.

### D-06: Skip stop triggers
Skip mode stops automatically when any of these occur:
1. Choice page reached (`engine.on('choice')`)
2. Unread page in skip-read-only mode
3. User clicks anywhere
4. User presses any key (including ESC)
5. Game ends (`engine.on('end')`)
6. Any overlay opens (save/load, settings, backlog, game menu)

### D-07: Audio suppression — BGM mute + SE/Voice skip
During skip mode:
- **BGM**: Mute completely (volume → 0). Track BGM change events but don't play them. On skip end, apply the final BGM state (play the correct BGM at correct volume).
- **SE**: Skip entirely (don't play sound effects).
- **Voice**: Skip entirely (don't play voice lines).
- **On skip end**: Restore BGM to the final BGM state that would be playing. If BGM changed during skip, play the new BGM. If stop_bgm was encountered, stay stopped.

### D-08: Transition suppression
During skip mode, override all transition durations to 0ms. Backgrounds and characters appear/disappear instantly. On skip end, restore normal transition durations.

### D-09: Settings toggle — segment radio in settingDefs
Add a new `'skip-mode'` entry to `settingDefs.js` registry:
- type: `'select'`
- settingKey: `'skipMode'`
- label: `'快进模式'`
- options: `[{ value: 'all', label: '全部跳过' }, { value: 'readOnly', label: '只跳已读' }]`
- default: `'readOnly'`

This integrates with the existing SettingsScreen designer system — users can drag it onto their settings page in the editor.

### D-10: Skip indicator styling
```
Position: fixed top-left, offset ~12px from edges
Background: rgba(0, 0, 0, 0.6)
Text: "▶▶ SKIP" in white, font-size 14px, font-weight bold
Padding: 4px 12px
Border-radius: 12px (capsule shape)
z-index: above dialogue box, below overlays
```

### D-11: Engine integration pattern
Skip mode is NOT an engine-level feature — it stays in main.js as an orchestration layer. The engine doesn't know about skip mode. main.js intercepts engine events and suppresses/modifies them during skip. This keeps the engine pure and testable.

### D-12: ReadHistory module location
New file: `src/engine/ReadHistory.js`. Exports a class with:
- `constructor(projectId)` — loads from localStorage
- `markRead(sceneId, pageIndex)` — adds to Set, persists
- `isRead(sceneId, pageIndex)` — checks Set
- `clear()` — clears all history (for debug/testing)
- `get size` — number of read entries

### D-13: QuickActionBar skip button interaction during skip
When skip mode is active, pressing the skip button again TOGGLES it off (same as current behavior). The `.active` CSS class on the button stays synced via `setSkipActive()`.

## Deferred Ideas

- **Skip speed slider in settings** — Could add later if users want adjustable speed
- **Visual text scrolling effect during skip** — Showing rapid text changes. Deferred for polish phase.
- **Skip history persistence to file** — Moving ReadHistory from localStorage to file system. Only needed if localStorage size becomes an issue.
- **Per-route read tracking** — Tracking which branch paths were read. More complex, deferred to future milestone.
