# Architecture Patterns: Voice & Rich Text Integration

**Domain:** Galgame visual novel engine — voice binding + rich text dialogue
**Researched:** 2026-04-01
**Confidence:** HIGH (based on direct codebase analysis)

## Current Architecture Snapshot

### Engine Layer (Pure JS, DOM-based)
```
ScriptEngine (EventEmitter)
  ├── emit('dialogue', { speaker, speakerName, speakerColor, text })
  ├── emit('play_bgm', { file, volume, fadeIn })
  ├── emit('play_se', { file })
  └── _playCurrentDialogue() → reads page.dialogues[idx]

AudioManager
  ├── _bgm: HTMLAudioElement (single, looping)
  ├── playSe(): new Audio() one-shot
  ├── bgmVolume / seVolume (master multipliers)
  └── _fadeVolume(): setInterval-based

DialogueBox
  ├── textEl.textContent = ... (NO HTML support)
  ├── _charIndex++ via setInterval typewriter
  └── _finishLine() → textEl.textContent = _fullText

BacklogScreen
  └── div.innerHTML = entry.text (⚠️ already uses innerHTML unsanitized)
```

### Editor Layer (Vue 3 + Pinia)
```
PageEditor.vue (provide/inject via usePageEditor)
  └── PageInspector.vue
      ├── Section 3: 💬 对话列表
      │   ├── dialogue-row list (drag-reorder)
      │   └── dialogue-editor: <textarea> for text
      └── Section 4: 🎵 音频 (BGM + SE pickers)

useScriptStore (Pinia)
  ├── data.scenes[id].pages[i].dialogues[j] = { speaker, text, expression }
  └── pushState() → JSON.parse/stringify undo snapshots
```

### Data Schema (script.json)
```json
{
  "dialogues": [
    { "speaker": "sakura", "text": "plain text only", "expression": null }
  ],
  "bgm": { "file": "audio/bgm.mp3", "volume": 0.6 },
  "se": { "file": "audio/se.mp3" }
}
```

---

## Recommended Architecture

### Overview: What Changes, What Stays

| Component | Status | Change Type |
|-----------|--------|-------------|
| AudioManager.js | **Modify** | Add voice channel (3rd audio type) |
| ScriptEngine.js | **Modify** | Pass voice field in `dialogue` event data |
| DialogueBox.js | **Modify** | `textContent` → parsed rich text, typewriter redesign |
| BacklogScreen.js | **Modify** | Render rich text markup in history entries, add voice replay |
| main.js | **Modify** | Wire voice playback in dialogue handler, pass global font settings |
| ConfigManager.js | **Modify** | Add `voiceVolume` default |
| settingDefs.js | **Modify** | Add `voice-volume` setting component |
| sanitize.js | **Modify** | Add `sanitizeRichText()` for rich text HTML safety |
| PageInspector.vue | **Modify** | Add voice picker per-dialogue, replace textarea with rich text toolbar |
| AudioPicker.vue | **Modify** | Add `voice` tab alongside BGM/SE |
| useScriptStore (script.js) | **Modify** | Add dialogue style helpers, voice field in createDefaultPage |
| markupParser.js | **New** | Parse `[color=#F00]text[/color]` → HTML spans |
| RichTextToolbar.vue | **New** | Inline toolbar for color/bold/size tagging in editor |

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| AudioManager.voice channel | Play/stop voice audio, respect voiceVolume | main.js (event handler) |
| ScriptEngine | Include `voice` field in dialogue event data | AudioManager via main.js wiring |
| markupParser | Parse `[tag]...[/tag]` → safe HTML | DialogueBox, BacklogScreen, RichTextToolbar (preview) |
| DialogueBox (typewriter) | Reveal rich text node-by-node | Uses markupParser output |
| RichTextToolbar | Insert markup tags around selection | PageInspector (wraps textarea replacement) |
| PageInspector.voice | Per-dialogue voice file binding | AudioPicker (with `voice` tab) |
| script.json `ui.dialogueStyle` | Global font/color/size defaults | DialogueBox reads at init, editor sets via inspector |

---

## Integration Point 1: Voice Channel in AudioManager

### Current State
AudioManager has exactly 2 channels:
- `_bgm`: single HTMLAudioElement, looping, with fade
- `playSe()`: creates new Audio() per call, fire-and-forget

### Required Change
Add a 3rd channel `_voice` with these semantics:
- **One at a time**: Playing a new voice auto-stops the previous one (like BGM but no loop)
- **Auto-stop on dialogue advance**: When `next()` is called or new dialogue starts, stop current voice
- **Separate volume**: `voiceVolume` independent of BGM/SE (galgame standard)
- **No looping**: Voice clips play once
- **Master volume integration**: Effective volume = `voiceVolume * masterVolume`

### Proposed AudioManager Changes

```javascript
// New properties
this._voice = null;
this.voiceVolume = 0.8;

// New methods
playVoice(data) {
  this.stopVoice();  // Always stop previous
  if (!data?.file) return;
  this._voice = new Audio(this.basePath + data.file);
  this._voice.volume = this.voiceVolume;
  this._voice.play().catch(() => {});
}

stopVoice() {
  if (this._voice) {
    this._voice.pause();
    this._voice.currentTime = 0;
    this._voice = null;
  }
}

setVoiceVolume(vol) {
  this.voiceVolume = vol;
  if (this._voice) {
    this._voice.volume = vol;
  }
}
```

### Event Wiring in main.js

Voice stop/play wired INSIDE the existing `dialogue` event handler (not separate events) — simpler, guaranteed ordering, matches how the handler already orchestrates `choiceMenu.hide()` + `dialogueBox.show()`:

```javascript
engine.on('dialogue', (data) => {
  audio.stopVoice();   // ← NEW: always stop previous voice
  choiceMenu.hide();
  dialogueBox.show(data);
  if (data.voice) audio.playVoice({ file: data.voice }); // ← NEW
  // ... existing auto/skip logic
});
```

### ScriptEngine Change: _playCurrentDialogue

```javascript
// Add voice to emitted data (line ~390 of ScriptEngine.js):
const data = {
  speaker: dlg.speaker,
  speakerName: char?.name || null,
  speakerColor: char?.color || null,
  text: dlg.text,
  voice: dlg.voice || null,  // ← NEW
};
```

### Data Schema Change

```json
// Before
{ "speaker": "sakura", "text": "hello", "expression": null }

// After  (voice field optional, null = no voice)
{ "speaker": "sakura", "text": "hello", "expression": null, "voice": "audio/voice_s001.mp3" }
```

Backward compatible: existing projects without voice fields work unchanged.

---

## Integration Point 2: Rich Text in DialogueBox

### The Core Problem

`DialogueBox._startTypewriter()` currently does:
```javascript
this._charIndex++;
this.textEl.textContent = this._fullText.substring(0, this._charIndex);
```

This is fundamentally incompatible with HTML markup. Substring-slicing through `[color=#F00]hi[/color]` would produce broken tags.

### Recommended Markup Format: BBCode-style Tags

**Why BBCode-style, not HTML tags in data:**
1. **Safety**: Parser only produces whitelisted elements — users can't inject `<script>`
2. **Simplicity**: `[color=#FF0000]text[/color]` easy for editor toolbar to insert/parse
3. **Galgame convention**: Ren'Py, TyranoScript, Kirikiri all use similar tag syntax

**Supported tags (v0.4 scope):**

| Tag | Example | Renders As |
|-----|---------|------------|
| `[color=#HEX]...[/color]` | `[color=#FF6B9D]blush[/color]` | `<span style="color:#FF6B9D">blush</span>` |
| `[b]...[/b]` | `[b]emphasis[/b]` | `<strong>emphasis</strong>` |
| `[i]...[/i]` | `[i]thoughts[/i]` | `<em>thoughts</em>` |
| `[size=N]...[/size]` | `[size=24]BIG[/size]` | `<span style="font-size:24px">BIG</span>` |

### markupParser.js — New Module

```javascript
/**
 * Parse BBCode-style markup to safe HTML.
 * 1. Escapes all HTML entities first (< > & " ')
 * 2. Converts whitelisted BBCode tags to HTML spans
 */
export function parseMarkup(raw) { ... }

/**
 * Strip all markup tags, returning plain text.
 * For save slot previews, truncation display, search.
 */
export function stripMarkup(raw) { ... }

/**
 * Split into per-character tokens for typewriter.
 * Each token = one visible character with its wrapping HTML.
 * Tags are NOT counted as characters.
 */
export function tokenizeForTypewriter(raw) { ... }
```

### Typewriter Redesign: Pre-built Spans with Visibility Toggling

Pre-build ALL character spans at dialogue start, initially invisible. Reveal one per tick by toggling CSS `visibility`.

```javascript
_startRichTypewriter() {
  const tokens = tokenizeForTypewriter(this._fullText);
  this._charIndex = 0;
  
  // Build all spans upfront, initially invisible
  this.textEl.innerHTML = tokens.map((t, i) =>
    `<span class="tw-char" style="visibility:hidden">${t.html}</span>`
  ).join('');
  
  this._allCharSpans = this.textEl.querySelectorAll('.tw-char');
  
  this._typeTimer = setInterval(() => {
    if (this._charIndex < this._allCharSpans.length) {
      this._allCharSpans[this._charIndex].style.visibility = 'visible';
      this._charIndex++;
    } else {
      this._finishLine();
    }
  }, this.typeSpeed);
}

_finishLine() {
  this._stopTypewriter();
  this._allCharSpans?.forEach(s => s.style.visibility = 'visible');
  this._complete = true;
  this.indicatorEl.classList.add('visible');
}
```

**Why this approach over innerHTML rebuild per tick:**
- Zero DOM creation/destruction per tick — only CSS property toggle
- `visibility: hidden` preserves layout — no text reflow during reveal
- All DOM built in single `innerHTML` assignment at start
- `_finishLine()` (click fast-forward) just reveals all spans
- ~30-100 spans per dialogue line is trivial for modern Chromium

**Alternative considered (innerHTML rebuild per tick):** Rebuilding `innerHTML` from segments each tick. Simpler code but forces HTML re-parse every 30ms. Viable for short lines but risks flicker. The span approach is strictly better for visual quality.

### Global Font Settings

```json
{
  "ui": {
    "dialogueStyle": {
      "fontFamily": "UserFont-MyFont",
      "fontSize": 18,
      "textColor": "rgba(255, 255, 255, 0.92)",
      "lineHeight": 1.8,
      "nameplateFontFamily": null,
      "nameplateFontSize": 20
    }
  }
}
```

Applied via `DialogueBox.setGlobalStyle()` at engine init. The existing `_applyStyle(data.style)` handles per-page overrides — global style is the base.

**Config cascade (high → low):**
1. Inline markup: `[color=#f00]text[/color]`
2. Per-page style override (existing `_applyStyle`)
3. Global `ui.dialogueStyle`
4. CSS defaults in style.css

---

## Integration Point 3: Editor — Voice Picker per Dialogue

### Current Inspector Dialogue Editor (PageInspector.vue, lines 96-132)

Speaker combobox → expression select → textarea. No voice field.

### Required Addition: Voice field between expression and content

```html
<div class="form-group">
  <label>🎤 语音</label>
  <div class="field-with-clear">
    <input type="text" :value="voiceDisplay" readonly
      placeholder="点击选择语音..." class="field-input"
      @click="openVoicePicker" />
    <button v-if="selectedDialogue.voice" class="clear-btn"
      @click.stop="clearVoice" title="清除语音">✕</button>
  </div>
</div>
```

Reuses AudioPicker.vue with a 3rd `voice` tab. Voice files live in `audio/` folder — no new asset category or IPC needed.

---

## Integration Point 4: Editor — Rich Text Toolbar

### Why Textarea + Toolbar, NOT contenteditable

1. contenteditable generates unpredictable HTML — varies by browser
2. Normalization from HTML back to BBCode is fragile
3. Undo/redo conflicts with Pinia's `JSON.parse/stringify` snapshot system
4. Textarea value is purely driven by `selectedDialogue.text` — undo just works

### RichTextToolbar.vue — New Component

```html
<template>
  <div class="rich-text-toolbar">
    <button @click="wrapTag('b')" title="粗体">B</button>
    <button @click="wrapTag('i')" title="斜体">I</button>
    <button @click="insertColor" title="颜色">A</button>
    <button @click="insertSize" title="字号">T↕</button>
  </div>
  <textarea ref="textareaRef" :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
    rows="3" class="field-input field-textarea"></textarea>
  <div class="rich-text-preview" v-html="parsedPreview"></div>
</template>
```

Toolbar wraps selected text with markup tags. Preview renders parsed result for WYSIWYG feedback.

---

## Integration Point 5: Global Dialogue Style in Editor

### Data Location (parallels existing ui.titleScreen, ui.settingsScreen)

```json
{
  "ui": {
    "dialogueStyle": {
      "fontFamily": null,
      "fontSize": 18,
      "textColor": "rgba(255, 255, 255, 0.92)",
      "lineHeight": 1.8,
      "nameplateFontFamily": null,
      "nameplateFontSize": 20
    }
  }
}
```

### useScriptStore Helpers (follows get/update pattern)

```javascript
function getDialogueStyle() {
  if (!data.value) return null;
  data.value.ui ??= {};
  data.value.ui.dialogueStyle ??= { /* defaults */ };
  return data.value.ui.dialogueStyle;
}

function updateDialogueStyle(style) {
  if (!data.value) return;
  data.value.ui ??= {};
  data.value.ui.dialogueStyle = style;
  pushState();
}
```

Mirrors existing `getSettingsScreen()` / `updateSettingsScreen()` exactly.

---

## Security Considerations

### Rich Text XSS Prevention

The markup parser **must not** pass through raw HTML:
1. `parseMarkup(raw)` FIRST escapes ALL HTML entities (`<` → `&lt;`)
2. THEN converts whitelisted BBCode tags to HTML
3. User cannot inject arbitrary HTML because entities are escaped before tag conversion

**Existing vulnerability**: `BacklogScreen.show()` at line 40 does:
```javascript
div.innerHTML = `<div class="backlog-text">${entry.text}</div>`;
```
Currently "safe" because text was plain. Once rich text is stored, backlog MUST route through `parseMarkup()`.

---

## Data Flow Summary

### Voice Playback
```
[Editor] PageInspector → dlg.voice = "audio/file.mp3"
  → [script.json] dialogues[i].voice = "audio/file.mp3"
  → [ScriptEngine] emit('dialogue', { ...data, voice })
  → [main.js] audio.stopVoice() + audio.playVoice({ file })
  → [AudioManager] new Audio(basePath + file).play()
```

### Rich Text Rendering
```
[Editor] RichTextToolbar → dlg.text = "hello [color=#F00]world[/color]"
  → [script.json] dialogues[i].text = "hello [color=#F00]world[/color]"
  → [ScriptEngine] emit('dialogue', { text })
  → [DialogueBox.show()] tokenizeForTypewriter() → pre-build hidden spans
  → [typewriter tick] span[charIndex].visibility = 'visible'
```

### Global Font Settings
```
[Editor] ProjectSettings → script.data.ui.dialogueStyle = { fontSize: 22 }
  → [script.json] ui.dialogueStyle = { ... }
  → [main.js init()] dialogueBox.setGlobalStyle(engine.script.ui.dialogueStyle)
  → [DialogueBox] textEl.style.fontSize/fontFamily/color = ...
```

---

## Patterns to Follow

### Pattern 1: Event-Driven Extension
Add data to existing events (voice in `dialogue` event) rather than proliferating new events. Follows how `speakerColor` was added to the dialogue event.

### Pattern 2: Optional Null Fields for Backward Compatibility
`dlg.voice || null` — no migration needed. Missing fields default to null.

### Pattern 3: Pinia get/update Pairs
`getDialogueStyle()` / `updateDialogueStyle()` mirrors existing `getSettingsScreen()` / `getTitleScreen()`.

### Pattern 4: Reuse Existing Pickers
Extend AudioPicker with voice tab rather than building new picker.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: contenteditable for Rich Text
Generates unpredictable HTML, conflicts with JSON undo system. Use textarea + toolbar.

### Anti-Pattern 2: Storing HTML in script.json
XSS vectors, hard to strip for previews. Store BBCode markup, parse at render time.

### Anti-Pattern 3: Voice as Part of BGM/SE Data
Voice is per-dialogue (not per-page), has separate volume, stops on advance. Needs own field and channel.

### Anti-Pattern 4: DOM Rebuild Every Typewriter Tick
innerHTML re-parse every 30ms causes flicker. Pre-build spans, toggle visibility.

---

## Suggested Build Order (Dependency-Driven)

```
Phase A: Voice System                    Phase B: Rich Text Core
├── 1. AudioManager voice channel        ├── 1. markupParser.js (parse + tokenize + strip)
├── 2. ScriptEngine voice in data        ├── 2. DialogueBox typewriter redesign
├── 3. main.js voice wiring             ├── 3. BacklogScreen rich text rendering
├── 4. ConfigManager + settingDefs       ├── 4. sanitize.js extension
└── 5. PageInspector voice picker        └── 5. RichTextToolbar.vue + inspector integration

Phase C: Global Font Settings (depends on B)
├── 1. Data schema (ui.dialogueStyle) + store helpers
├── 2. DialogueBox.setGlobalStyle()
├── 3. Editor UI (font/size/color controls)
└── 4. Preview iframe integration
```

**Recommended sequence:** A → B → C

**Rationale:**
1. Voice (A) and Rich Text (B) are independent — different subsystems
2. Voice is lower risk — good warm-up, immediate testable value
3. Rich text (B) is highest risk — typewriter redesign is the most complex change
4. Global font settings (C) depends on DialogueBox being stable after typewriter redesign

---

## Sources

- **Primary:** Direct codebase analysis (HIGH confidence)
- AudioManager.js — 2 channel pattern, volume/fade infrastructure
- DialogueBox.js — textContent usage lines 78/133/150, typewriter loop lines 130-139
- ScriptEngine.js — `_playCurrentDialogue()` event emission lines 366-404
- PageInspector.vue — dialogue editor section lines 96-132, audio section lines 201-236
- main.js — event wiring lines 91-145, preview mode lines 432-503, applyConfig lines 71-88
- BacklogScreen.js — innerHTML usage line 40 (security concern)
- ConfigManager.js — defaults structure lines 9-18
- settingDefs.js — registry pattern lines 15-81
- script.json — full data schema reference
- sanitize.js — CSS sanitization patterns lines 1-50
- useScriptStore (script.js) — get/update helper pattern lines 58-88
