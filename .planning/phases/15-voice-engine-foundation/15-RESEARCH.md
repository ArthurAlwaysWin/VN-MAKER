# Phase 15: Voice Engine Foundation - Research

**Researched:** 2025-07-18
**Domain:** Audio playback — voice channel integration in vanilla JS game engine
**Confidence:** HIGH

## Summary

Phase 15 adds a voice audio channel to the existing runtime engine. The engine already has a well-established 2-channel audio system (BGM as a persistent `HTMLAudioElement`, SE as fire-and-forget `new Audio()`). Voice is a **third pattern** — persistent single element (like BGM) but non-looping and with special stop semantics (like neither BGM nor SE).

The scope is small and well-defined: 5 files modified (AudioManager, ScriptEngine, ConfigManager, settingDefs, main.js), zero new files, and one data schema addition (`voice` field on dialogue objects). All changes follow established patterns already in the codebase. The critical nuance is D-01: voice stop behavior — `playVoice()` stops previous voice internally, but advancing to a dialogue WITHOUT voice does NOT stop current voice. This means the `dialogue` event handler must NOT call `stopVoice()` unconditionally.

**Primary recommendation:** Follow the persistent `HTMLAudioElement` pattern from `_bgm`, add `_voice` as a third channel, wire it through the existing event-driven architecture. Keep the special stop semantics centralized in `playVoice()` rather than scattered across event handlers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01: Voice stop behavior** — `playVoice()` internally stops previous voice. But advancing to a dialogue WITHOUT voice does NOT stop current voice (it plays to completion). Only `playVoice()`, return-to-title, and close-game stop voice. `stopVoice()` is NOT called on every `engine.next()`.
- **D-02: Voice field data format** — Pure path string: `dialogue.voice = "audio/voice_s001.mp3"` or `null`. Not an object. All voice uses `voiceVolume * masterVolume` for volume calculation.
- **D-03: No migration** — Project not released. Direct addition of `voice-volume` to settingDefs. New projects get it in default layout.

### Agent's Discretion
- Voice channel uses persistent `HTMLAudioElement` (`this._voice`) like BGM, not SE's fire-and-forget `new Audio()` pattern
- `voiceVolume` default value (suggested 0.8, matching SE)
- `playVoice()` / `stopVoice()` / `setVoiceVolume()` method signatures

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOICE-01 | Dialogue data model adds `voice` field (file path string, nullable), stored in page JSON | Data schema pattern: `dlg.voice \|\| null` in ScriptEngine._playCurrentDialogue(), add to dialogue event data, add to history push. Backward compatible — missing field reads as undefined, `\|\| null` handles it. |
| VOICE-04 | AudioManager adds independent voice channel (3rd HTMLAudioElement) with `playVoice(src)` / `stopVoice()` API | Persistent `_voice` HTMLAudioElement pattern mirrors `_bgm`. `playVoice()` stops previous internally. `stopVoice()` pauses + resets currentTime. `setVoiceVolume()` updates both property and live element. |
| VOICE-05 | Engine plays bound voice on dialogue display; stops previous voice when advancing to next line | Wiring in main.js dialogue handler: check `data.voice` and conditionally call `audio.playVoice()`. Per D-01, do NOT call `stopVoice()` when `data.voice` is null — only `playVoice()` itself stops previous. |
| VOICE-06 | Independent voice volume control (voiceVolume in ConfigManager), settings page slider, master volume multiplicative | Add `voiceVolume: 0.8` to ConfigManager.defaults, add `voice-volume` entry to SETTING_DEFS, add `audio.setVoiceVolume(config.get('voiceVolume') * master)` to `applyConfig()`. |
</phase_requirements>

## Architecture Patterns

### Modified Files Overview

```
src/engine/
├── AudioManager.js     # ADD: _voice channel, playVoice(), stopVoice(), setVoiceVolume()
├── ScriptEngine.js     # ADD: voice field in dialogue event data + history push
├── ConfigManager.js    # ADD: voiceVolume default
├── settingDefs.js      # ADD: 'voice-volume' slider entry
src/
└── main.js             # ADD: voice wiring in dialogue handler, applyConfig, return-to-title, stop/mute handlers
```

### Pattern 1: Persistent Audio Element (Voice Channel)
**What:** Single reusable `HTMLAudioElement` for voice, mirroring `_bgm` pattern
**When to use:** Always for voice — avoids memory leak from `new Audio()` per line (see Pitfall 3 in PITFALLS.md)
**Why not SE pattern:** SE creates `new Audio()` per call, fire-and-forget. For voice playing every 3-5 seconds across hundreds of dialogue lines, this leaks memory. A persistent element reuses the same object.

```javascript
// AudioManager.js — voice channel addition
constructor(basePath = '/game/') {
  // ... existing _bgm, seVolume, etc. ...
  
  /** @type {HTMLAudioElement|null} Currently playing voice */
  this._voice = null;
  /** @type {number} Voice volume (0-1) */
  this.voiceVolume = 0.8;
}
```

### Pattern 2: Event-Driven Extension (Add Data to Existing Events)
**What:** Add `voice` field to existing `dialogue` event rather than creating a new `play_voice` event
**When to use:** When extending existing behavior — follows how `speakerColor` was added to dialogue event
**Why:** Fewer moving parts, guaranteed ordering, single handler orchestrates all dialogue behavior

```javascript
// ScriptEngine.js — _playCurrentDialogue() modification
const data = {
  speaker: dlg.speaker,
  speakerName: char?.name || null,
  speakerColor: char?.color || null,
  text: dlg.text,
  voice: dlg.voice || null,  // ← NEW field
};
```

### Pattern 3: Registry-Based Settings Extension
**What:** Add `voice-volume` to SETTING_DEFS registry — automatically supported by settings designer editor + runtime renderer
**When to use:** For any new player-configurable setting
**Why:** Single entry in registry is consumed by editor palette, canvas renderer, and runtime renderer — no multi-file manual wiring needed

### Pattern 4: Multiplicative Volume Scaling
**What:** Effective voice volume = `voiceVolume * masterVolume`, applied in `applyConfig()` like BGM/SE
**When to use:** All audio channels
**Existing pattern:**
```javascript
// main.js applyConfig() — existing pattern
audio.setBgmVolume(config.get('bgmVolume') * master);
audio.setSeVolume(config.get('seVolume') * master);
// NEW:
audio.setVoiceVolume(config.get('voiceVolume') * master);
```

### Anti-Patterns to Avoid
- **Unconditional stopVoice() in dialogue handler:** Per D-01, do NOT call `stopVoice()` before every dialogue. Only `playVoice()` internally stops previous voice. If dialogue has no voice (`data.voice === null`), current voice plays to completion.
- **new Audio() per voice line:** Creates memory leak. Use persistent `_voice` element (Pitfall 3).
- **Separate `play_voice` event from ScriptEngine:** Overcomplicates wiring. Voice data belongs in the `dialogue` event payload.
- **Storing voice as object `{ file, volume }`:** D-02 locks this as pure string. Volume is always `voiceVolume * masterVolume`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings UI slider | Custom voice volume UI | SETTING_DEFS registry entry | Registry auto-renders in both editor designer and runtime |
| Audio unlock | Custom unlock logic for voice | Existing `_unlock()` pattern in AudioManager | Already handles click/keydown unlock on document |
| Volume persistence | Custom localStorage for voice volume | ConfigManager.defaults + get/set/save | Existing system auto-persists, auto-loads |

## Common Pitfalls

### Pitfall 1: Voice Memory Leak (from `new Audio()`)
**What goes wrong:** Creating `new Audio()` for every voice clip leaks memory — hundreds of undisposed HTMLAudioElements accumulate
**Why it happens:** SE pattern (`playSe()`) uses `new Audio()` fire-and-forget. Tempting to copy for voice but voice plays every 3-5 seconds for entire game
**How to avoid:** Use persistent `this._voice` element. In `playVoice()`: pause current → set new src → play. Set `this._voice = null` in `stopVoice()` only (or keep element and just pause+reset)
**Warning signs:** DevTools Memory tab shows growing Audio object count

### Pitfall 2: Unconditional Voice Stop on Dialogue Advance
**What goes wrong:** Calling `audio.stopVoice()` before every dialogue display abruptly cuts voice mid-sentence when advancing to narration lines (no voice)
**Why it happens:** Natural instinct is to stop previous audio before starting new state. But D-01 explicitly says: advancing to dialogue WITHOUT voice should NOT stop current voice
**How to avoid:** Only call `stopVoice()` inside `playVoice()` (before starting new voice), in return-to-title handler, and in close-game handler. The dialogue event handler should be:
```javascript
engine.on('dialogue', (data) => {
  choiceMenu.hide();
  dialogueBox.show(data);
  if (data.voice) {
    audio.playVoice(data.voice);  // internally stops previous
  }
  // NO stopVoice() when data.voice is null!
  // ... auto/skip logic
});
```
**Warning signs:** Voice cuts off early during narration-heavy sections

### Pitfall 3: Forgetting Voice Stop on Return-to-Title / Game End
**What goes wrong:** Player returns to title or game ends, but voice clip continues playing over title screen
**Why it happens:** `gameMenu.onTitle` and `engine.on('end')` stop BGM but forget voice
**How to avoid:** Add `audio.stopVoice()` in all game-exit paths:
1. `gameMenu.onTitle` handler (line 205-216)
2. `engine.on('end')` handler (line 121-145)
3. Preview mode `stop` message handler (line 473-482)
**Warning signs:** Audio still playing on title screen

### Pitfall 4: Preview Mode Missing Voice Mute/Stop
**What goes wrong:** Editor preview iframe plays voice but mute toggle doesn't affect it, or stopping preview doesn't stop voice
**Why it happens:** The `mute` message handler (main.js line 488-496) only handles BGM and SE volume. The `stop` handler only calls `audio.stopBgm()`.
**How to avoid:** Add voice handling to both:
```javascript
case 'mute':
  if (msg.muted) {
    audio.setVoiceVolume(0);  // ← ADD
  } else {
    audio.setVoiceVolume(config.get('voiceVolume') * master);  // ← ADD
  }
case 'stop':
  audio.stopVoice();  // ← ADD alongside stopBgm
```

### Pitfall 5: Voice Field Not Added to History Push
**What goes wrong:** Backlog (Phase 18 scope) won't have voice data for replay because history doesn't store it
**Why it happens:** `_playCurrentDialogue()` pushes to `this.history` but only includes `speaker`, `speakerName`, `text` — no `voice` field
**How to avoid:** Add `voice` to history push now (forward-compatible for Phase 18):
```javascript
this.history.push({
  speaker: dlg.speaker,
  speakerName: data.speakerName,
  text: dlg.text,
  voice: dlg.voice || null,  // ← ADD for Phase 18 backlog replay
});
```
**Warning signs:** Phase 18 discovering history entries have no voice data

### Pitfall 6: Save/Load Doesn't Preserve Voice Position Context
**What goes wrong:** After loading a save, voice doesn't play for the restored dialogue line
**Why it happens:** `restoreState()` + `renderCurrentPage()` replays the visual state but doesn't re-trigger voice playback for the current dialogue
**How to avoid:** This is expected behavior — save/load restores visual state but doesn't re-play voice. The voice for the current line has already been heard. When the player advances, the next voiced line will play normally. No action needed, but document this design decision.

## Code Examples

### AudioManager Voice Channel Addition
```javascript
// Source: AudioManager.js — add alongside existing _bgm pattern

/** @type {HTMLAudioElement|null} Currently playing voice clip */
this._voice = null;
/** @type {number} Voice channel volume (0-1) */
this.voiceVolume = 0.8;

/**
 * Play a voice clip. Stops any currently playing voice first.
 * @param {string} file — voice file path (relative to basePath)
 */
playVoice(file) {
  this.stopVoice();
  if (!file) return;
  this._voice = new Audio(this.basePath + file);
  this._voice.volume = this.voiceVolume;
  this._voice.play().catch(() => {});
}

/**
 * Stop the currently playing voice clip.
 */
stopVoice() {
  if (this._voice) {
    this._voice.pause();
    this._voice.currentTime = 0;
    this._voice = null;
  }
}

/**
 * Update voice volume. Applies immediately to playing voice.
 * @param {number} vol — 0-1 (already multiplied by master)
 */
setVoiceVolume(vol) {
  this.voiceVolume = vol;
  if (this._voice) {
    this._voice.volume = vol;
  }
}
```

**Note on approach:** Using `new Audio()` in `playVoice()` + nulling in `stopVoice()` (rather than a persistent element with `.src` swap) is simpler and matches the existing `_bgm` pattern exactly (`playBgm` also does `this._bgm = new Audio(...)`). The key difference from SE is: we **keep a reference** in `this._voice` and **explicitly stop** before creating the next one.

### ScriptEngine Dialogue Event Extension
```javascript
// Source: ScriptEngine.js — _playCurrentDialogue(), around line 389-401

// Emit dialogue event — ADD voice field
const data = {
  speaker: dlg.speaker,
  speakerName: char?.name || null,
  speakerColor: char?.color || null,
  text: dlg.text,
  voice: dlg.voice || null,  // ← NEW
};

this.history.push({
  speaker: dlg.speaker,
  speakerName: data.speakerName,
  text: dlg.text,
  voice: dlg.voice || null,  // ← NEW (forward-compat for Phase 18 backlog replay)
});
```

### ConfigManager Default
```javascript
// Source: ConfigManager.js — add to defaults object
this.defaults = {
  bgmVolume: 0.5,
  seVolume: 0.8,
  voiceVolume: 0.8,  // ← NEW
  textSpeed: 30,
  autoSpeed: 2000,
  fullscreen: false,
  windowMode: 'windowed',
  dialogueOpacity: 0.8,
  masterVolume: 1,
};
```

### settingDefs Registry Entry
```javascript
// Source: settingDefs.js — add to SETTING_DEFS object alongside existing volume sliders
'voice-volume': {
  type: 'slider',
  settingKey: 'voiceVolume',
  label: '语音音量',
  min: 0,
  max: 1,
  step: 0.01,
  default: 0.8,
},
```

### main.js Dialogue Handler Wiring
```javascript
// Source: main.js — modify existing dialogue event handler (line 92-104)
engine.on('dialogue', (data) => {
  choiceMenu.hide();
  dialogueBox.show(data);

  // Voice playback — only play if voice is bound (D-01)
  if (data.voice) {
    audio.playVoice(data.voice);  // internally stops previous voice
  }
  // NO else { audio.stopVoice() } — D-01: let current voice play to completion

  // Auto mode
  if (autoMode) {
    startAutoTimer();
  }
  // Skip mode
  if (skipMode) {
    setTimeout(() => engine.next(), 50);
  }
});
```

### main.js applyConfig Voice Volume
```javascript
// Source: main.js — applyConfig() function (add after SE volume line)
function applyConfig() {
  const master = config.get('masterVolume');
  audio.setBgmVolume(config.get('bgmVolume') * master);
  audio.setSeVolume(config.get('seVolume') * master);
  audio.setVoiceVolume(config.get('voiceVolume') * master);  // ← NEW
  // ... rest unchanged
}
```

### main.js Return-to-Title Voice Stop
```javascript
// Source: main.js — gameMenu.onTitle handler (line 205-216)
gameMenu.onTitle = () => {
  isPlaying = false;
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  choiceMenu.hide();
  audio.stopBgm({ fadeOut: 500 });
  audio.stopVoice();  // ← NEW: D-01 — stop voice on return to title
  engine.resetRenderState();
  characters.clear();
  background.clear();
  showTitle();
};
```

### main.js Game End Voice Stop
```javascript
// Source: main.js — engine.on('end') handler
engine.on('end', () => {
  if (engine._previewMode) {
    isPlaying = false;
    stopAuto();
    stopSkip();
    dialogueBox.hide();
    audio.stopVoice();  // ← NEW
    window.parent.postMessage({ type: 'ended' }, '*');
    return;
  }

  isPlaying = false;
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  audio.stopBgm({ fadeOut: 2000 });
  audio.stopVoice();  // ← NEW
  // ... rest unchanged
});
```

### main.js Preview Mode Handlers
```javascript
// Source: main.js — preview 'stop' message handler
case 'stop': {
  isPlaying = false;
  // ... existing code ...
  audio.stopBgm({ fadeOut: 0 });
  audio.stopVoice();  // ← NEW
  // ... rest unchanged
}

// Source: main.js — preview 'mute' message handler  
case 'mute': {
  if (msg.muted) {
    audio.setBgmVolume(0);
    audio.setSeVolume(0);
    audio.setVoiceVolume(0);  // ← NEW
  } else {
    const master = config.get('masterVolume');
    audio.setBgmVolume(config.get('bgmVolume') * master);
    audio.setSeVolume(config.get('seVolume') * master);
    audio.setVoiceVolume(config.get('voiceVolume') * master);  // ← NEW
  }
  break;
}
```

### SettingsScreen Default Layout Voice Volume
```javascript
// Source: SettingsScreen.js — _renderDefault() — add voice volume slider
// Insert between SE volume and text speed sections:
<div class="settings-item">
  <span class="settings-label">语音音量</span>
  <input type="range" class="settings-slider" id="s-voice-vol" min="0" max="100" value="${Math.round(cfg.get('voiceVolume') * 100)}" />
  <span class="settings-value" id="s-voice-val">${Math.round(cfg.get('voiceVolume') * 100)}%</span>
</div>

// Plus binding:
this._bindSlider('s-voice-vol', 's-voice-val', (v) => {
  cfg.set('voiceVolume', v / 100);
  this._notifyChange();
  return `${Math.round(v)}%`;
});
```

### AudioManager.clear() Extension
```javascript
// Source: AudioManager.js — clear() method
clear() {
  this.stopBgm({ fadeOut: 0 });
  this.stopVoice();  // ← NEW
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Web Audio API for game audio | HTMLAudioElement | N/A — always used | HTMLAudioElement is simpler, sufficient for voice/BGM/SE. Web Audio API would be overkill. |
| fire-and-forget `new Audio()` for voice | Persistent reusable element | Established pattern | Prevents memory leaks for high-frequency voice playback |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None — no test framework configured |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-01 | Voice field in dialogue data model | manual | Load script.json with voice fields, verify engine passes voice in dialogue event | ❌ |
| VOICE-04 | AudioManager voice channel API | manual | Call playVoice/stopVoice/setVoiceVolume, verify behavior | ❌ |
| VOICE-05 | Engine plays voice on dialogue, stops on next voice | manual | Play through voiced dialogues, verify audio plays and stops correctly | ❌ |
| VOICE-06 | Voice volume slider + master volume scaling | manual | Adjust voice slider in settings, verify volume changes | ❌ |

### Sampling Rate
- **Per task commit:** Manual verification — play through demo script with voice files
- **Per wave merge:** Full manual playthrough of voiced dialogue sequence
- **Phase gate:** All 5 success criteria verified manually

### Wave 0 Gaps
- No test framework exists in the project — all verification is manual
- Test infrastructure creation is out of scope for this phase (consistent with all prior phases)

## Open Questions

1. **Voice file availability for testing**
   - What we know: `public/game/assets/audio/` directory exists with BGM/SE files
   - What's unclear: Whether voice audio files exist for demo script testing
   - Recommendation: Create or use placeholder voice .mp3 files for at least 2-3 dialogue lines in the demo script to verify the pipeline end-to-end

2. **Persistent vs. recreated Audio element pattern**
   - What we know: BGM pattern creates `new Audio()` each time in `playBgm()` and nulls in `stopBgm()`. Architecture research suggests persistent element.
   - What's unclear: Whether to use `new Audio()` per call (matching `_bgm` pattern exactly) or a single persistent element with `.src` swap
   - Recommendation: Use `new Audio()` per call with explicit stop/null, matching `_bgm` pattern exactly. Both approaches work; consistency with existing code is more valuable than micro-optimization.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all 5 files to modify
  - `src/engine/AudioManager.js` — 2-channel pattern, volume API, constructor, clear()
  - `src/engine/ScriptEngine.js` — `_playCurrentDialogue()` event emission, history push, dialogue data structure
  - `src/engine/ConfigManager.js` — defaults object structure, get/set/save API
  - `src/engine/settingDefs.js` — SETTING_DEFS registry pattern, slider/toggle/select types
  - `src/main.js` — dialogue event handler, applyConfig(), return-to-title, preview mode handlers
  - `src/ui/SettingsScreen.js` — default layout rendering, slider binding pattern
  - `src/ui/BacklogScreen.js` — history rendering, voice field forward-compatibility
- `.planning/research/ARCHITECTURE.md` — Voice channel integration architecture
- `.planning/research/PITFALLS.md` — Pitfall 3 (memory leak), Pitfall 6 (voice overlap), Pitfall 7 (iframe autoplay)

### Secondary (MEDIUM confidence)
- `public/game/script.json` — current dialogue structure (no voice field yet)
- `src/editor/stores/script.js` — createDefaultPage() pattern, will need voice in Phase 16

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all vanilla JS DOM APIs already in use
- Architecture: HIGH — extends existing patterns verbatim, all integration points identified
- Pitfalls: HIGH — based on direct codebase analysis + prior research documents

**Research date:** 2025-07-18
**Valid until:** Indefinite (no external dependencies, all patterns are internal codebase conventions)
