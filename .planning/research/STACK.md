# Technology Stack

**Project:** Galgame Maker v0.4 — Voice & Rich Text
**Researched:** 2025-07-14
**Overall confidence:** HIGH

## Verdict: ZERO New npm Dependencies

All three v0.4 features (voice binding, rich text rendering, global font settings) are achievable using **built-in browser APIs only**. This aligns with the project's established ZERO new npm deps policy from v0.2 onward.

## Existing Stack (Unchanged)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Electron | 41 | Desktop shell (Chromium 134+) | Existing |
| Vue 3 | 3.5.x | Editor UI framework | Existing |
| Pinia | 3.0.x | Editor state management | Existing |
| Vite | 6.3.x | Build tooling | Existing |
| Pure JavaScript (ES Modules) | ES2022+ | No TypeScript | Existing constraint |
| HTMLAudioElement | Built-in | BGM/SE playback | Existing — **extend for voice** |
| FontFace API | Built-in | Custom font loading | Existing via `fontLoader.js` |
| CSS Custom Properties | Built-in | Dynamic styling | Existing in settings sliders |

## New Components (Built In-House)

### 1. Voice Channel — HTMLAudioElement Extension

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Voice playback | `HTMLAudioElement` (3rd audio channel) | Same proven pattern as BGM/SE. Voice is sequential one-at-a-time playback — no need for Web Audio API complexity. |
| Voice volume | Independent `voiceVolume` property + `ConfigManager` | Every visual novel separates Voice/BGM/SE volumes. Players expect this. |
| Voice picker | Vue component reusing AudioPicker + MiniPlayer pattern | Existing `AudioPicker.vue` and `MiniPlayer.vue` are the template. Voice picker is a per-dialogue audio selector. |

**Integration point:** `AudioManager.js` — Add `playVoice(data)`, `stopVoice()`, `setVoiceVolume(vol)` methods. Voice differs from SE in one critical way: voice must **stop the previous line** when a new line plays (`this._voice.pause()` before creating new instance).

```javascript
// AudioManager — new voice channel
this._voice = null;          // HTMLAudioElement | null
this.voiceVolume = 0.8;      // Independent voice volume

playVoice(data) {
  this.stopVoice();           // Stop previous line
  if (!data?.file) return;
  this._voice = new Audio(this.basePath + data.file);
  this._voice.volume = this.voiceVolume;
  this._voice.play().catch(() => {});
}

stopVoice() {
  if (!this._voice) return;
  this._voice.pause();
  this._voice.currentTime = 0;
  this._voice = null;
}
```

**Why not Web Audio API?** Overkill. Web Audio API is for real-time audio processing, mixing, effects, spatial audio. Voice playback is "play file, stop previous" — HTMLAudioElement handles this perfectly, as already proven by the existing BGM/SE implementation.

### 2. Rich Text — Custom BBCode Parser + innerHTML

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Tag syntax | `[color=#hex]text[/color]` (BBCode-like) | Familiar to VN/game creators. Safe to store in JSON. Visible in raw text. |
| Tag parser | Regex + `escapeHtml()` in pure JS | Simple allow-only approach: escape all HTML first, then apply our safe tags. ~30 lines. |
| Typewriter | TreeWalker API (text node iteration) | Walk pre-built DOM tree, reveal text nodes character-by-character. No innerHTML re-parsing per tick. |
| Sanitization | `escapeHtml()` + output allowlist | Escape user text first (prevent XSS), then only our parser generates `<span>` tags. Defense-in-depth. |
| Editor input | Textarea + color toolbar + live preview | Insert `[color]` tags around selected text. Preview pane below shows rendered result. |

**Markup design decision — Why `[color]` BBCode, not raw HTML:**

| Criterion | `[color=#hex]...[/color]` | Raw HTML in data |
|-----------|--------------------------|------------------|
| XSS safety | ✅ Parse → escape → generate safe spans | ❌ Must sanitize user HTML (error-prone) |
| JSON readability | ✅ Plain text with visible tags | ❌ Escaped angle brackets everywhere |
| Editor UX | ✅ Works in textarea, easy to type/edit | ❌ Needs rich text editor component |
| Familiarity | ✅ BBCode is standard in game engines | ❌ HTML knowledge not expected of VN creators |

**Parser implementation (escape-first approach):**

```javascript
const COLOR_RE = /\[color=(#[0-9a-fA-F]{3,8})\](.*?)\[\/color\]/gs;

function parseRichText(raw) {
  let safe = escapeHtml(raw);           // Escape ALL HTML first
  safe = safe.replace(COLOR_RE,         // Then apply our safe markup
    '<span style="color:$1">$2</span>'
  );
  return safe;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}
```

**HTML-aware typewriter (TreeWalker approach):**

The current typewriter in `DialogueBox.js` (line 130-138) uses `textContent` substring:
```javascript
// CURRENT (plain text only):
this.textEl.textContent = this._fullText.substring(0, this._charIndex);
```

This **cannot work with HTML** because substring would break tags mid-character. The solution:

1. Parse full rich text to HTML once → set `innerHTML` on a template element
2. Clone the DOM subtree into the display element
3. Collect all text nodes via `TreeWalker`
4. Set all text nodes to empty string initially
5. On each typewriter tick, reveal one character from the current text node
6. When a text node is fully revealed, move to the next

This approach creates the DOM structure once and only mutates text content — no DOM thrashing, no re-parsing.

### 3. Global Font Settings — CSS Custom Properties

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Data storage | `script.json → ui.dialogueBox` | Same pattern as `ui.titleScreen` and `ui.settingsScreen`. Authored content, not player preference. |
| Engine application | CSS Custom Properties on `#dialogue-box` | `--dlg-font-size`, `--dlg-font-family`, `--dlg-text-color`. DialogueBox reads at render time. |
| Editor UI | Vue form (dropdown + slider + color input) | Font family dropdown from asset store's `fontFamilies` computed, plus system defaults. |

**Data schema (new `ui.dialogueBox` key):**

```json
{
  "ui": {
    "dialogueBox": {
      "fontSize": 18,
      "fontFamily": "Noto Sans SC",
      "textColor": "rgba(255, 255, 255, 0.92)",
      "nameplateFontFamily": "Noto Serif SC",
      "nameplateFontSize": 20
    }
  }
}
```

**Why `ui.dialogueBox` in script.json, not ConfigManager?** Global font settings are *authored content* — the game creator decides the font style for their game. ConfigManager stores *player preferences* (volume, text speed). Different games should have different default fonts.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Voice API | HTMLAudioElement | Web Audio API | WAA is for real-time processing/mixing. Voice is simple sequential playback. |
| Markup syntax | `[color=#hex]...[/color]` | Ren'Py-style `{color=#hex}...{/color}` | Curly braces conflict with JSON escaping; brackets are visually distinct in text. |
| Markup syntax | `[color=#hex]...[/color]` | RPG Maker-style `\C[hex]` | Less readable; harder to extend to future tag types. |
| Markup syntax | `[color=#hex]...[/color]` | Markdown-like `**bold**` | Markdown doesn't support inline color — the primary need. |
| Editor input | Textarea + toolbar | contenteditable div | Cursor management nightmare, paste brings unwanted HTML, undo stack fights Vue reactivity. Not worth complexity for one markup type. |
| Editor input | Textarea + toolbar | Tiptap / ProseMirror / Quill | Massive deps (100KB+ gzipped). Violates zero-deps policy. Overkill for "wrap text in color tags." |
| Tag parser | Regex (escape-first) | State machine | State machine is more robust for deeply nested tags, but we only support `[color]` — no nesting needed. Regex is simpler and sufficient. If future tags need nesting, upgrade then. |
| Sanitization | escapeHtml + regex allowlist | DOMPurify library | Extra dependency. Our allowed set is exactly `<span style="color:...">` and `<br>`. Custom approach is ~15 lines. |
| Typewriter | TreeWalker | Rebuild innerHTML each tick | DOM thrashing, flicker, event listener loss. TreeWalker is dramatically more efficient. |
| Voice volume | Separate `voiceVolume` | Reuse `seVolume` | Every VN engine separates voice/SE volume. Players expect this. Industry standard. |
| Font settings | `script.json → ui.dialogueBox` | ConfigManager | Font is authored content, not player preference. |

## Integration Impact Map

| Existing File | Required Changes | Risk |
|---------------|-----------------|------|
| `AudioManager.js` | Add `playVoice()`, `stopVoice()`, `voiceVolume`, `setVoiceVolume()` | Low — additive, follows BGM/SE pattern exactly |
| `ScriptEngine.js` | Include `voice` field in `'dialogue'` event data (~line 393) | Low — one-line addition to data object |
| `DialogueBox.js` | Replace `textContent` → `innerHTML`, add rich text parser, refactor typewriter to TreeWalker | **Medium** — biggest refactor in this milestone |
| `main.js` (engine) | Wire `voice` to `audio.playVoice()` in dialogue handler; add voiceVolume to `applyConfig()` | Low — follows existing pattern |
| `ConfigManager.js` | Add `voiceVolume: 0.8` default | Low — one line |
| `settingDefs.js` | Add `voiceVolume` setting type registration | Low — follows existing SETTING_DEFS pattern |
| `PageInspector.vue` | Add voice picker per dialogue, add color toolbar for textarea | Medium — new UI in existing component |
| `PageEditor.vue` | Wire voice picker modal event handlers | Low — follows AudioPicker pattern |
| `sanitize.js` | Add `escapeHtml()` utility function | Low — pure function, no side effects |
| `style.css` | Add CSS custom property fallbacks for dialogue font settings | Low |

## What NOT to Add

| Technology | Reason |
|------------|--------|
| **Any npm package** | Zero-deps policy. All features use browser APIs. |
| **Web Audio API** | Overkill for sequential voice playback. |
| **contenteditable** | Cursor management hell. Textarea + toolbar is simpler and more reliable. |
| **Tiptap / Quill / ProseMirror** | Massive deps for wrapping text in color tags. |
| **DOMPurify** | Allowed set is 2 elements. Custom allowlist is trivial. |
| **Markdown parser** | Doesn't support inline color. Wrong tool. |
| **Monaco Editor** | Code editor for dialogue text? No. |

## Browser API Compatibility (Electron 41 / Chromium 134+)

| API | Status | Used For |
|-----|--------|----------|
| `HTMLAudioElement` | ✅ Stable | Voice playback (already used for BGM/SE) |
| `innerHTML` | ✅ Stable | Rich text rendering |
| `TreeWalker` | ✅ Stable | HTML-aware typewriter effect |
| `DOMParser` | ✅ Stable | Sanitization fallback |
| `FontFace` | ✅ Stable | Custom font loading (already used) |
| CSS Custom Properties | ✅ Stable | Dynamic dialogue font styling |
| `selectionStart/End` | ✅ Stable | Textarea markup insertion |

**All APIs are long-stable web standards. No compatibility risk.**

## Voice Data Schema Extension

```json
// Per-dialogue voice field (in page.dialogues[])
{
  "speaker": "sakura",
  "text": "おはよう！",
  "expression": null,
  "voice": "audio/voice/sakura_001.mp3"
}
```

## Batch Voice Naming Convention

Audio files matching pattern `{sceneId}_{pageIndex}_{dialogueIndex}` auto-bind to dialogues when "batch match" is triggered in editor. This is an editor-side convenience that writes `voice` fields into data — engine just reads the field.

## Sources

- **Codebase analysis** (HIGH): `AudioManager.js`, `DialogueBox.js`, `ScriptEngine.js`, `PageInspector.vue`, `sanitize.js`, `fontLoader.js`, `ConfigManager.js`, `settingDefs.js`
- **HTML5 Audio API** (HIGH): MDN Web Docs — stable, universal
- **TreeWalker API** (HIGH): MDN Web Docs — DOM Level 2 Traversal, supported since IE9
- **Project constraint** (HIGH): ZERO new npm deps policy established in v0.2, per PROJECT.md
