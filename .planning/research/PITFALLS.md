# Domain Pitfalls: Voice + Rich Text for Galgame Maker

**Domain:** Adding voice playback and rich text dialogue to existing DOM-based visual novel engine
**Researched:** 2025-07-14
**Overall confidence:** HIGH — Based on direct codebase analysis + established web platform knowledge

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or player-facing breakage.

---

### Pitfall 1: Typewriter Effect Breaks on HTML Tags

**What goes wrong:** The current `DialogueBox._startTypewriter()` uses `this._fullText.substring(0, this._charIndex)` and assigns to `textContent`. When you switch to innerHTML for rich text, naively slicing the HTML string mid-tag produces broken markup like `<span style="col` which the browser either renders as garbage or silently discards.

**Why it happens:** HTML tags are multi-character sequences (`<span style="color:red">`) but the typewriter must advance one *visible* character at a time. If you count raw string characters, tags get partially revealed.

**Specific code at risk:**
```javascript
// DialogueBox.js line 132-134 — CURRENT
this._charIndex++;
this.textEl.textContent = this._fullText.substring(0, this._charIndex);
```

**Consequences:**
- Flickering DOM as broken HTML gets re-parsed each tick
- Colored text suddenly appearing/disappearing mid-line
- Performance degradation from constant innerHTML re-parsing (setInterval at 30ms)

**Prevention — Two viable approaches:**

**Approach A: Pre-parse to node list (RECOMMENDED)**
Parse the rich text once into a flat list of `{ char, wrapperHTML }` tuples before the typewriter starts. Each tick reveals one tuple by appending to the DOM. No innerHTML re-parsing per tick.

```javascript
// Pseudocode for the approach
_prepareTypewriter(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  this._charNodes = [];  // [{ text: '你', styles: [{tag:'span', attrs:'style="color:red"'}] }, ...]
  this._walkNodes(temp, []);
}

_startTypewriter() {
  this._stopTypewriter();
  this.textEl.innerHTML = '';
  this._charIndex = 0;
  this._typeTimer = setInterval(() => {
    if (this._charIndex < this._charNodes.length) {
      this._revealChar(this._charNodes[this._charIndex]);
      this._charIndex++;
    } else {
      this._finishLine();
    }
  }, this.typeSpeed);
}
```

**Approach B: Invisible wrapper + CSS reveal**
Render all HTML at once but use `<span class="unrevealed">` around each character. The typewriter toggles the class. Avoids DOM mutation but creates many spans.

**Recommendation:** Approach A. It parallels the existing `_charIndex` logic, keeps the DOM mutation minimal per tick, and doesn't bloat the DOM with per-character wrappers.

**Detection:** Test with `"[c=red]你好[/c]世界"` — if the typewriter flickers or the tag text appears literally, it's broken.

---

### Pitfall 2: innerHTML XSS in Dialogue Text (User-Authored Content)

**What goes wrong:** Switching `this.textEl.textContent = text` to `this.textEl.innerHTML = text` means user-authored dialogue content (from the editor) gets parsed as HTML. A dialogue line like `<img src=x onerror=alert(1)>` would execute.

**Why it happens:** textContent is inherently safe — it escapes everything. innerHTML trusts the content. Even without malicious intent, users typing `<3` or `a > b` will break rendering.

**Specific code at risk:**
- `DialogueBox.js` line 78, 134, 150 — all `textContent` assignments
- `BacklogScreen.js` line 40-42 — **already uses innerHTML with user text!** This is a pre-existing XSS vector: `${entry.text}` is interpolated raw into innerHTML

**Consequences:**
- XSS in standalone game mode (user-authored scripts loaded as JSON)
- Broken display when dialogue contains `<`, `>`, `&` characters
- BacklogScreen already vulnerable today for any text containing HTML

**Prevention:**
1. Define a **custom markup** (NOT raw HTML) for rich text. Use a Galgame-standard format like `[color=red]text[/color]` or `[c=#ff0000]text[/c]`. The engine parses this into safe HTML.
2. **Always sanitize** before innerHTML assignment: escape all HTML entities first, then convert your custom tags to real HTML.
3. Create a single `richTextToHTML(markup)` function used by both the engine DialogueBox AND the BacklogScreen.
4. **Allowlist only**: `<span style="color:...">`, `<span style="font-size:...">`, `<b>`, `<i>` — nothing else passes through.

```javascript
// Safe pipeline:
// User input: "[c=#ff0000]重要[/c]的选择"
// Step 1: escapeHTML("重要的选择") → preserves < > &
// Step 2: parse custom tags → <span style="color:#ff0000">重要</span>的选择
// Step 3: assign to innerHTML ← safe, only allowlisted tags
```

**Detection:** Try a dialogue containing `<script>alert(1)</script>` and `a<b & c>d`. Both must render as visible text, not execute or break.

---

### Pitfall 3: Audio Object Memory Leak (Voice Clips)

**What goes wrong:** Creating `new Audio()` for every voice line and not cleaning up. Unlike BGM (one persistent object), voice is many short clips — potentially hundreds per scene. Each `new Audio()` creates an HTMLAudioElement, allocates a network request, and holds a decoded audio buffer in memory.

**Why it happens:** The current `AudioManager.playSe()` does `const se = new Audio(...)` with fire-and-forget — no reference kept, no cleanup. This works for occasional SE but will leak for voice clips played every 3-5 seconds.

**Specific code at risk:**
```javascript
// AudioManager.js line 88-92 — CURRENT
playSe(data) {
  const se = new Audio(this.basePath + data.file);
  se.volume = this.seVolume;
  se.play().catch(() => {});
  // ← se is never cleaned up, no .src = '', no removeEventListener
}
```

**Consequences:**
- Memory grows linearly with dialogue progression (each voice clip ~100KB-1MB decoded)
- After 200+ dialogue lines with voice, Chromium's audio subsystem starts lagging
- In Electron, the renderer process memory balloons; no GC because Audio elements may hold internal references
- `net::ERR_INSUFFICIENT_RESOURCES` after enough Audio objects accumulate

**Prevention:**
1. Create a **voice channel** — a single reusable `Audio` element (or a small pool of 2) dedicated to voice playback.
2. Before playing new voice: `voiceAudio.pause(); voiceAudio.src = ''; voiceAudio.src = newUrl; voiceAudio.play()`.
3. Set `.src = ''` explicitly to release the previous decoded buffer.
4. Listen for `'ended'` event to mark the voice as complete (needed for auto-mode timing).

```javascript
// Recommended pattern:
class AudioManager {
  constructor() {
    // ... existing BGM/SE ...
    this._voice = new Audio();   // single reusable element
    this._voice.addEventListener('ended', () => this._onVoiceEnd());
  }

  playVoice(data) {
    this._voice.pause();
    this._voice.src = this.basePath + data.file;
    this._voice.volume = (data.volume ?? 1) * this.voiceVolume;
    this._voice.play().catch(() => {});
  }

  stopVoice() {
    this._voice.pause();
    this._voice.currentTime = 0;
  }
}
```

**Detection:** Open DevTools → Memory tab → take heap snapshot after 50 dialogue lines → search for "Audio". If count is 50+ instead of 1-3, you're leaking.

---

### Pitfall 4: Data Migration — Old Projects Missing Voice/Style Fields

**What goes wrong:** Adding `voice` field to dialogues and `style` fields to the script data breaks loading of existing v0.3 projects. Code that accesses `dlg.voice.file` throws on old data where `voice` is `undefined`.

**Why it happens:** Existing `script.json` dialogue objects have: `{ speaker, text, expression }`. No `voice` field exists. The engine reads whatever JSON provides — there's no schema migration.

**Specific code at risk:**
```javascript
// Current dialogue structure (from script.json):
{ "speaker": "sakura", "text": "啊……又是一年春天呢。", "expression": null }
// New structure needs:
{ "speaker": "sakura", "text": "...", "expression": null, "voice": null }
// Plus page-level: font settings, text style
```

**Consequences:**
- `TypeError: Cannot read properties of undefined` when engine tries to read voice from old data
- Existing demo project (`public/game/script.json`) breaks immediately
- User projects created in v0.1-v0.3 become unopenable
- Auto-save writes the half-migrated data, corrupting the original

**Prevention:**
1. **Never assume new fields exist.** Use optional chaining: `dlg.voice?.file` not `dlg.voice.file`
2. Add a **migration function** that runs on project load, similar to the existing `TitleScreen.js` schema migration pattern
3. Migration adds defaults: `dlg.voice ??= null` for every dialogue, global style defaults at script level
4. Version the script format: bump `meta.version` or add `meta.formatVersion`
5. **`createDefaultPage()` in script store** (line 92-104) must add `voice: null` to new dialogue templates
6. Test: load the existing `public/game/script.json` unchanged — it must play without errors

```javascript
// Migration example (run once on project load):
function migrateToV4(script) {
  for (const scene of Object.values(script.scenes)) {
    for (const page of scene.pages) {
      for (const dlg of (page.dialogues || [])) {
        dlg.voice ??= null;      // add voice field
      }
      page.dialogueStyle ??= null; // page-level style
    }
  }
  script.settings ??= {};
  script.settings.dialogue ??= { fontSize: 24, fontFamily: null, textColor: '#ffffff' };
}
```

**Detection:** Delete any `voice` field from script.json, reload the project → must work. Open any v0.3 project → must work without migration dialog.

---

### Pitfall 5: BacklogScreen Already Has innerHTML XSS + Will Double-Render Rich Text

**What goes wrong:** `BacklogScreen.show()` already interpolates `entry.text` directly into innerHTML (line 40-42). When text gains rich markup tags, these get double-parsed: once by your rich text converter and once by the backlog's raw interpolation.

**Why it happens:** The backlog stores text in `engine.history[]` which currently holds plain strings. If you switch to storing rich-text markup in history, the backlog's `${entry.text}` becomes a raw HTML injection. If you store the already-converted HTML, you get double-encoding.

**Specific code at risk:**
```javascript
// BacklogScreen.js line 40-42 — ALREADY UNSAFE
div.innerHTML = entry.speakerName
  ? `<div class="backlog-speaker" style="color:${speakerColor}">${entry.speakerName}</div>
     <div class="backlog-text">${entry.text}</div>`
  : `<div class="backlog-text" style="font-style:italic">${entry.text}</div>`;
// Also: speakerColor comes from character definitions — CSS injection possible
```

**Consequences:**
- Same text displays differently in dialogue box vs. backlog
- Rich text markup tags visible as literal text in backlog, OR
- Raw HTML injection in backlog from unescaped user content
- `speakerColor` directly interpolated into `style=` — CSS injection vector

**Prevention:**
1. History array should store **source markup** (the custom tag format), not plain text or pre-rendered HTML
2. BacklogScreen must use the same `richTextToHTML()` function as DialogueBox
3. Build backlog entries with `createElement` + `textContent` / safe innerHTML, not template literals with interpolation
4. Sanitize `speakerColor` through `sanitizeCssValue()` (already exists in `sanitize.js`!)

**Detection:** Add a dialogue with rich text markup → check backlog. The styling must appear correctly, and no literal tags should be visible.

---

## Moderate Pitfalls

Issues that cause bugs, poor UX, or significant rework.

---

### Pitfall 6: Voice Must Stop on Dialogue Advance (Not Overlap)

**What goes wrong:** Player clicks to advance dialogue, but the previous voice line keeps playing. Two voices overlap simultaneously. Or, in auto-mode, the next line advances before the voice finishes.

**Why it happens:** The engine's `next()` emits a new `'dialogue'` event immediately. If the voice isn't explicitly stopped, the old clip plays to completion under the new dialogue text.

**Specific interaction chain:**
```
1. Engine emits 'dialogue' with voice A → AudioManager plays voice A
2. Player clicks → dialogueBox._handleClick() → onAdvance() → engine.next()
3. Engine emits 'dialogue' with voice B → AudioManager plays voice B
4. Voice A is still playing! ← BUG
```

**Prevention:**
1. `playVoice()` must always stop the current voice before starting a new one (see Pitfall 3's reusable element pattern — already handles this)
2. In auto-mode, wait for BOTH typewriter completion AND voice `'ended'` event before advancing
3. Add a `voice.onEnded` callback to the engine's auto-advance logic (main.js `startAutoTimer`)
4. Skip mode should still instantly stop voice and advance

**Detection:** Play two consecutive voiced lines → first voice must cut cleanly when second starts. Test auto-mode → must wait for voice to finish.

---

### Pitfall 7: Electron Audio Auto-Play Policy (iframe Preview)

**What goes wrong:** The editor's inline preview (iframe running the engine) fails to play voice audio because Chromium's auto-play policy blocks it. The engine works in standalone mode but voice is silent in preview.

**Why it happens:** Chromium (which Electron uses) blocks audio auto-play until user gesture. The existing `AudioManager._unlock()` listens for click/keydown on `document`. But in the preview iframe, user clicks happen in the *parent* editor window — the iframe's document may not register them.

**Specific code at risk:**
```javascript
// AudioManager.js line 23-24 — unlock handler
document.addEventListener('click', this._unlockHandler, { once: true });
document.addEventListener('keydown', this._unlockHandler, { once: true });
// In iframe context, the FIRST postMessage 'start' doesn't count as user gesture
```

**Note:** Electron 41 (Chromium ~134) has auto-play policies. The existing `webPreferences` in `main.js` doesn't set `autoplayPolicy`. The default is `'no-user-gesture-required'` for the **main window** in older Electron versions, but this may vary for iframes.

**Prevention:**
1. Verify Electron 41's auto-play policy for iframes within BrowserWindow
2. If needed, add `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')` before app.whenReady()
3. Alternative: trigger a silent audio play in the iframe's `initPreview()` on the first real user gesture forwarded from editor
4. Test specifically: click "试玩" in editor → voiced dialogue must play audio

**Detection:** Click play in editor preview → if BGM works but voice doesn't (or vice versa), it's an auto-play policy issue.

---

### Pitfall 8: contenteditable Undo/Redo Conflicts with Store Undo/Redo

**What goes wrong:** If you use `contenteditable` for the rich text dialogue editor in the inspector, the browser has its own built-in undo/redo stack (Ctrl+Z). This conflicts with the Pinia store's undo/redo (`script.undo()` / `script.redo()`) which works by JSON snapshot. User presses Ctrl+Z — does the browser undo the text edit, or does the store undo the last structural change?

**Why it happens:** Two undo systems operating on overlapping state. The store's `pushState()` takes a full JSON snapshot. The browser's contenteditable undo tracks DOM mutations. They don't know about each other.

**Specific code at risk:**
```javascript
// script.js line 27-42 — store undo/redo
function undo() {
  historyIndex.value--;
  data.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
  // This replaces ALL data, including the text the user was editing
}
```

**Consequences:**
- Ctrl+Z undoes wrong thing (structural change vs. text edit)
- Store undo replaces data, but contenteditable still shows old DOM state
- Double-undo: browser undoes text, then store undoes too, losing two steps
- Cursor position lost after store undo

**Prevention — Avoid contenteditable entirely:**
1. **DON'T use contenteditable for the inspector text editor.** Use a structured approach instead:
   - Regular `<textarea>` for raw text input (as currently exists)
   - A **toolbar** with color/bold/size buttons that wrap selected text in markup tags
   - A **preview pane** below that renders the markup as rich text
2. This keeps the text as a string in the Pinia store (no DOM state to conflict)
3. Undo/redo works exactly as it does now — JSON snapshot of string data
4. If WYSIWYG is truly needed later, consider a `<textarea>` that overlays on a styled preview (like a code editor with syntax highlighting)

**If contenteditable is unavoidable:**
- Disable browser undo: intercept Ctrl+Z/Cmd+Z at `keydown`, call `e.preventDefault()`, sync to store, use store undo
- Sync contenteditable → store on every `input` event (debounced)
- Sync store → contenteditable on every store change (but preserve cursor — see Pitfall 9)

**Detection:** Open the dialogue editor, type text, press Ctrl+Z. Does it undo the text edit or the last page property change? If ambiguous or wrong, the systems conflict.

---

### Pitfall 9: Cursor Position Lost on Store Sync (Rich Text Editor)

**What goes wrong:** When syncing rich text content from a contenteditable element to the Pinia store (or vice versa), the cursor jumps to the beginning or end of the field. User is typing mid-sentence and the cursor teleports.

**Why it happens:** Updating `element.innerHTML` or the store's reactive data resets the DOM, destroying the Selection/Range. Even Vue's reactivity re-rendering a `:value` binding resets cursor.

**Specific current pattern (safe but won't work for rich text):**
```html
<!-- PageInspector.vue line 127-130 — current textarea binding -->
<textarea :value="selectedDialogue.text"
  @input="setDialogueText($event.target.value)"
  rows="3" class="field-input field-textarea" />
<!-- This works because textarea value is a simple string with no re-render -->
```

**Consequences:**
- Unusable text editing — cursor jumps every time reactive state updates
- Users can't place cursor mid-text to insert colored segments
- Workaround attempts (save/restore selection) are fragile across browsers

**Prevention:**
1. If using `<textarea>` + toolbar markup approach (recommended), cursor is managed natively by the textarea — no issue
2. If using contenteditable, save `Selection` + `Range` before any DOM update, restore after
3. Never re-render the contenteditable element from Vue reactivity — use a `ref` and manually sync
4. The safest pattern: `<textarea v-model>` with a separate preview `<div>` rendering the formatted output. Cursor stays in textarea, preview updates reactively.

**Detection:** Type in the middle of existing dialogue text. If cursor jumps to end, the sync is broken.

---

### Pitfall 10: Voice Volume Needs Its Own Channel (Not SE Volume)

**What goes wrong:** Reusing the SE (sound effect) volume for voice playback. Players expect independent control: BGM volume, SE volume, voice volume. Using SE volume for voice means adjusting SE also adjusts voice, or vice versa.

**Why it happens:** The existing `AudioManager` has only `bgmVolume` and `seVolume`. Voice seems like "another sound effect" so developers route it through `playSe()`. But players want to mute SE (turn off click sounds) while keeping voice, or vice versa.

**Specific code at risk:**
```javascript
// ConfigManager.js defaults — CURRENT (no voice volume)
this.defaults = {
  bgmVolume: 0.5,
  seVolume: 0.8,
  // Missing: voiceVolume
};
```

**Consequences:**
- Can't mute voice without muting sound effects
- Settings page has no voice volume slider (the existing 7 settings components don't include one)
- Galgame players expect voice volume control — it's table stakes

**Prevention:**
1. Add `voiceVolume` to `ConfigManager.defaults` (default 1.0)
2. Add `this.voiceVolume` to `AudioManager`
3. Add a voice volume slider to `settingDefs.js` registry
4. Use the existing `SETTING_DEFS` registration pattern — just add one entry
5. `playVoice()` uses `this.voiceVolume * masterVolume`, separate from SE

**Detection:** Open settings → must see separate volume sliders for BGM, SE, and Voice.

---

### Pitfall 11: Fast-Forward / _finishLine() Breaks with Rich Text

**What goes wrong:** When player clicks to fast-forward (skip typewriter to end), the current `_finishLine()` sets `this.textEl.textContent = this._fullText`. After switching to rich text, this would render raw markup tags as literal text instead of formatted output.

**Specific code at risk:**
```javascript
// DialogueBox.js line 149-150 — CURRENT
_finishLine() {
  this._stopTypewriter();
  this.textEl.textContent = this._fullText; // ← will show raw tags
```

**Prevention:** `_finishLine()` must use `innerHTML` with the fully-rendered rich text HTML (from the same `richTextToHTML()` function), not `textContent`. Or if using the pre-parsed char nodes approach, reveal all remaining nodes at once.

---

### Pitfall 12: Voice File Not Found Halts Playback Flow

**What goes wrong:** A bound voice file is missing (deleted, renamed, typo). `new Audio(path).play()` rejects, and if the rejection isn't caught properly, it breaks the dialogue advancement flow. Or the `'ended'` event never fires, so auto-mode hangs forever waiting for voice to finish.

**Prevention:**
1. Always `.catch(() => {})` on `play()` (already done for BGM/SE)
2. Add an `onerror` handler on the voice element that emits the voice-ended signal, so auto-mode doesn't hang
3. Engine should NEVER halt due to a missing voice file — degrade gracefully to voiceless dialogue
4. In editor, show a warning icon next to dialogue entries with broken voice references

---

### Pitfall 13: Save/Load State Doesn't Capture Voice Position

**What goes wrong:** Player saves mid-dialogue, then loads. The dialogue text appears, but the voice for that line doesn't replay. Or, the voice replays from the beginning, overlapping with the already-displayed text.

**Why it happens:** `ScriptEngine.getState()` serializes `currentScene`, `pageIndex`, `dialogueIndex` — but not whether a voice was playing or its playback position. On restore, `renderCurrentPage()` re-emits dialogue events but the voice timing is off.

**Prevention:**
1. **Don't save voice playback position.** This is standard VN behavior — on load, the current dialogue shows with completed text and no voice. Voice plays only on fresh dialogue progression.
2. When restoring, `_playCurrentDialogue()` should show text instantly (no typewriter) and NOT trigger voice playback
3. Alternatively, replay voice from the beginning on load — this is also common in VNs (Ren'Py does this)
4. Document the chosen behavior explicitly so it's not treated as a bug

**Detection:** Save during a voiced line → load → verify no overlapping audio or errors.

---

## Minor Pitfalls

---

### Pitfall 14: Typewriter Speed Setting Interacts with Voice Duration

**What goes wrong:** Text speed set very fast (5ms/char) means text finishes in 0.5s, but voice is 3s. Text speed set very slow (100ms/char) means text takes 10s, but voice finishes in 3s. The mismatch feels jarring.

**Prevention:**
1. In auto-mode, wait for `max(typewriter_done, voice_ended)` before advancing
2. Consider an optional "sync to voice" mode where typewriter speed auto-adjusts to match voice duration (divide voice duration by character count)
3. Skip mode should bypass both typewriter AND voice instantly

---

### Pitfall 15: Font Loading Race in Engine — Rich Text Needs Custom Fonts Loaded First

**What goes wrong:** Rich text specifies a custom font, but `loadAllFonts()` hasn't completed when the first dialogue renders. Text appears in fallback font briefly, then pops to custom font.

**Current code at risk:**
```javascript
// main.js line 451 — Preview mode: font load is fire-and-forget, no await!
loadAllFonts(engine.script.assets.fonts, 'asset://').catch(() => {});
```

**Prevention:**
1. In preview mode, `await` the font load before `renderCurrentPage()`
2. For per-dialogue fonts (if supported), pre-load during scene enter, not dialogue render
3. Use `document.fonts.ready` promise as a gate before first render

---

### Pitfall 16: createDefaultPage() Dialogue Template Drift

**What goes wrong:** `createDefaultPage()` in `script.js` (line 101) creates dialogues with `{ speaker: null, text: '', expression: null }`. After adding voice, new pages get `voice: null` in the template, but the field name or structure might not match what the engine expects. Template and engine contract diverge silently.

**Prevention:**
1. Define a `createDefaultDialogue()` factory function used by BOTH the editor store AND the engine's migration code
2. Single source of truth for dialogue shape
3. Add a test/assertion that validates the dialogue schema

---

### Pitfall 17: Rich Text Markup in History Array Bloats Save Data

**What goes wrong:** If `engine.history[]` stores rich-text markup strings (e.g., `"[c=#ff0000]重要[/c]的选择"`), the save data size grows. More critically, if the markup format changes between versions, old saves display garbled text in the backlog.

**Prevention:**
1. Store **source markup** in history (the custom tag format, not converted HTML)
2. The `richTextToHTML()` function is called at render time, not storage time
3. Keep markup lightweight — `[c=#f00]text[/c]` not `<span style="color:#ff0000">text</span>`
4. Monitor localStorage size — 5MB limit per origin, history can grow unbounded

---

### Pitfall 18: Multiple Markup Formats — Editor vs. Engine Disagreement

**What goes wrong:** The editor stores rich text in one format (e.g., HTML `<span style="color:red">`), but the engine expects another (e.g., `[c=red]`). Or the toolbar generates inconsistent markup depending on how the user applies the color.

**Prevention:**
1. Define ONE canonical markup format project-wide. Use it everywhere: editor storage, engine parsing, backlog rendering
2. Recommendation: Use a simple custom tag format like `[c=#ff0000]text[/c]` — not HTML, not BBCode exactly. Simple parser, no ambiguity
3. The editor converts visual edits → canonical markup
4. The engine converts canonical markup → safe innerHTML
5. Document the format in a shared constants file

---

### Pitfall 19: Textarea Selection Range Lost on Toolbar Click

**What goes wrong:** When user clicks the color toolbar button, the textarea loses focus. `selectionStart`/`selectionEnd` return 0, so the color tag wraps nothing at position 0 instead of around the selected text.

**Prevention:**
1. Store selection range on `blur` or `mouseup` of the textarea
2. When toolbar button is clicked, use the stored range to insert tags at the correct position
3. Use `mousedown.prevent` on toolbar buttons to prevent textarea blur

---

### Pitfall 20: Batch Voice Naming Convention Mismatch

**What goes wrong:** The "batch naming match" feature (auto-binding voice files to dialogues by naming convention) assumes a specific path format like `voice_scene_page_dialogue.mp3`. If users name files differently, nothing matches and they think the feature is broken.

**Prevention:**
1. Document the naming convention clearly in the UI
2. Show a preview of what the expected filename would be
3. Provide both auto-match AND manual per-dialogue binding
4. Show match/no-match status visually in the inspector

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|---|---|---|---|
| **Data format / migration** | Old projects crash on missing `voice` field (#4) | CRITICAL | Migration function + optional chaining everywhere |
| **Engine rich text** | Typewriter breaks on HTML tags (#1) | CRITICAL | Pre-parse to char nodes before typewriter starts |
| **Engine rich text** | innerHTML XSS from user text (#2, #5) | CRITICAL | Custom markup format → sanitized HTML pipeline |
| **Voice playback** | Audio object memory leak (#3) | CRITICAL | Reusable Audio element, explicit `.src = ''` cleanup |
| **Voice playback** | Voice overlaps on advance (#6) | MODERATE | Stop current voice before playing next |
| **Voice playback** | No voice volume channel (#10) | MODERATE | Add voiceVolume to Config + AudioManager |
| **Editor rich text** | Undo/redo conflict with contenteditable (#8) | MODERATE | Avoid contenteditable; use textarea + toolbar + preview |
| **Editor rich text** | Cursor position lost (#9) | MODERATE | textarea + preview pattern preserves cursor |
| **Engine rich text** | _finishLine() shows raw tags (#11) | MODERATE | Use innerHTML with richTextToHTML() for fast-forward |
| **Preview iframe** | Audio autoplay blocked (#7) | MODERATE | Test Electron 41 iframe policy; add autoplay switch if needed |
| **Voice playback** | Missing voice file hangs auto-mode (#12) | MODERATE | onerror → emit voice-ended signal |
| **Save/Load** | Voice state not in save data (#13) | MINOR | Don't save voice position; show completed text on load |
| **Save/Load** | Markup bloats history/save (#17) | MINOR | Store source markup, convert at render time |
| **Global font** | Font loading race in preview (#15) | MINOR | Await font load in preview mode |
| **Auto mode** | Text speed vs voice duration mismatch (#14) | MINOR | Wait for max(typewriter, voice) before auto-advance |

---

## "Looks Done But Isn't" Checklist

These items are easy to miss in testing but will surface as bugs in real use:

- [ ] **Old project loads without crash** — open a v0.3 project, no voice fields → engine doesn't throw
- [ ] **Plain text still works** — dialogue with NO rich text markup renders identically to v0.3 behavior
- [ ] **Backlog shows rich text correctly** — colored text in dialogue appears colored in backlog too
- [ ] **Backlog doesn't XSS** — dialogue containing `<script>` shows as literal text in backlog
- [ ] **Typewriter with mixed content** — `"普通文字[c=red]红色[/c]继续"` typewriter reveals character-by-character, color transitions smoothly
- [ ] **Voice stops on advance** — clicking during voice playback stops it immediately, starts next voice
- [ ] **Voice stops on skip mode** — activating skip doesn't play 50 voice clips simultaneously
- [ ] **Auto mode waits for voice** — auto mode doesn't advance until voice clip finishes
- [ ] **Preview iframe plays voice** — voice audio works in editor preview, not just standalone
- [ ] **Voice volume separate from SE** — muting SE doesn't mute voice; voice slider works independently
- [ ] **Memory stable after 100 voiced lines** — DevTools memory doesn't grow linearly with dialogue progression
- [ ] **Save/load during voiced line** — save during voice, load → no overlapping audio, text shows completed
- [ ] **Ctrl+Z in text editor** — undoes the text edit, doesn't interfere with page-level undo
- [ ] **Custom font in rich text** — font specified in global settings renders correctly after font loads
- [ ] **Empty voice field** — dialogue with `voice: null` plays normally (no errors, no silence delay)
- [ ] **Long dialogue line performance** — 200-character line with 5 color segments, typewriter runs at 60fps

---

## Sources

- **Direct codebase analysis**: `DialogueBox.js`, `AudioManager.js`, `ScriptEngine.js`, `BacklogScreen.js`, `PageInspector.vue`, `script.js` store, `main.js` engine wiring, `sanitize.js`, `fontLoader.js`, `ConfigManager.js`, `SaveManager.js` — all examined line-by-line
- **HTML5 Audio spec**: HTMLAudioElement lifecycle, garbage collection behavior with unreferenced elements — HIGH confidence (established platform behavior)
- **Chromium autoplay policy**: Established since Chrome 66+, applies to Electron via embedded Chromium — HIGH confidence
- **contenteditable Selection/Range API**: Known cross-browser inconsistencies, documented extensively in web platform research — HIGH confidence
- **innerHTML XSS vector**: OWASP-documented, fundamental web security principle — HIGH confidence
- **VN engine conventions** (voice behavior on save/load, volume channels): Standard across Ren'Py, Tyrano, KiriKiri — HIGH confidence from domain knowledge
