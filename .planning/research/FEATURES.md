# Feature Landscape

**Domain:** Galgame/Visual Novel Maker — Voice System, Rich Text Dialogue, Global Font Settings
**Researched:** 2025-07-14
**Focus:** v0.4 milestone features only (voice binding, rich text markup, font settings)

## Competitor Analysis

### How Established Engines Handle Voice

| Engine | Voice Binding | Auto-Voice Naming | Voice Volume | Voice in Backlog |
|--------|--------------|-------------------|--------------|------------------|
| **Ren'Py** | `voice "file.ogg"` per line | `config.auto_voice = "voice/{id}_{index}.ogg"` pattern-based | Separate voice volume slider | ✓ Replay button per entry |
| **TyranoScript** | `[playse storage=file buf=1]` or `[vostart]` tag | Convention-based (`chara_001.ogg`) | Per-character voice channel volume | ✓ Replay in backlog |
| **Kirikiri/KAG** | `[voice storage=file]` per line | Pattern matching by scene/line index | Per-character volume + global voice | ✓ Standard feature |
| **RPG Maker (VN plugins)** | Plugin-specific, typically filename match | Convention-based | Global voice volume | Varies by plugin |

**Pattern:** Every serious VN engine binds voice at the per-dialogue-line level. Auto-naming by convention (character + index) is standard for batch workflows. Voice volume is always a separate audio channel from BGM/SE.

### How Established Engines Handle Rich Text

| Engine | Inline Markup Syntax | Features | Editor Support |
|--------|---------------------|----------|----------------|
| **Ren'Py** | `{color=#ff0000}text{/color}`, `{b}bold{/b}`, `{size=+10}text{/size}` | Color, bold, italic, size, alpha, ruby text | Text editor with syntax highlighting |
| **TyranoScript** | `[font color=red size=30]text[resetfont]` | Color, size, bold, shadow, font face | Tag-based in script editor |
| **Kirikiri/KAG** | `[font color=0xff0000]text[resetfont]` | Color, size, bold, italic, shadow, ruby | Script editor with preview |
| **RPG Maker** | `\C[n]` color codes, `\{` size up, `\}` size down | Color palette codes, size change | In-engine preview |

**Pattern:** All engines use some form of inline markup tags within dialogue text. The tags are rendered by the typewriter engine at display time. None use raw HTML. Most use a custom lightweight tag syntax — either `{tag}` (Ren'Py), `[tag]` (TyranoScript/KAG), or `\escape` (RPG Maker).

### How Established Engines Handle Global Font Settings

| Engine | Global Font | Per-Dialogue Override | Font Import |
|--------|-------------|----------------------|-------------|
| **Ren'Py** | `gui.text_font`, `gui.text_size`, `gui.text_color` in gui.rpy | Via style overrides | Copy to game/fonts/ |
| **TyranoScript** | `[deffont]` tag sets defaults | `[font]` tag per-line | Copy to data/others/ |
| **Kirikiri/KAG** | Config file defaults | `[font]` tag | System font or bundled |
| **RPG Maker** | System settings in database | Limited | Plugin-dependent |

**Pattern:** Global defaults for font family, size, and color are set once and apply to all dialogue. Per-line overrides are possible but rare in practice. The global settings are what 95% of creators use.

## Table Stakes

Features users expect from any galgame maker with voice support. Missing = product feels broken.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Per-dialogue voice binding** | Every VN engine does this — it's the fundamental unit of voice acting | Medium | Existing dialogue data model, audio asset store | Add `voice` field to dialogue objects in page data |
| **Voice auto-play on dialogue show** | Players expect voice to start when dialogue text appears | Low | AudioManager, ScriptEngine dialogue event | Play voice file when `dialogue` event fires |
| **Voice stops on advance** | Standard: advancing to next line stops current voice | Low | AudioManager | Stop voice channel on next `dialogue` event |
| **Voice volume control (separate channel)** | BGM/SE/Voice are the 3 standard audio channels in galgame | Medium | ConfigManager, settingDefs, SettingsScreen | Add `voiceVolume` config key + settings component |
| **Voice in backlog (replay button)** | Standard galgame UX — re-hear voice from history | Medium | BacklogScreen, AudioManager, history data | Store voice file path in history entries |
| **Global dialogue font size** | Users need to configure default text appearance | Low | Script data (`ui.dialogue.fontSize`), DialogueBox, editor UI | Already partially exists in `_applyStyle()` |
| **Global dialogue font color** | Same as font size — basic text appearance | Low | Same as above | |
| **Global dialogue font family** | Users import custom fonts; they need to apply them globally | Low | fontLoader, asset store already handles fonts | Dropdown of imported fonts + system fonts |
| **Inline color markup in dialogue** | Emphasizing key words in color is universal in VN | High | DialogueBox typewriter rewrite, editor rich text | Changes `textContent` → innerHTML approach |
| **Typewriter effect works with rich text** | Typewriter must not break when tags are present | High | DialogueBox._startTypewriter() rewrite | Current char-by-char approach needs tag-awareness |

## Differentiators

Features that set the product apart. Not universally expected but highly valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Batch voice naming match** | Ren'Py-level automation: `{characterId}_{sceneId}_{pageIndex}_{dialogueIndex}.ext` auto-detects voice files from naming convention | Medium | Asset store file list, dialogue data traversal | Huge time-saver for projects with hundreds of voice lines |
| **WYSIWYG rich text in editor** | See colored text in the editor textarea, not raw tags — unique for VN makers (most use script editors) | High | Custom contenteditable or inline toolbar | This is the PPT-style editor's advantage over script-based tools |
| **Voice preview in editor** | Click play button next to voice field in PageInspector to preview audio | Low | MiniPlayer component (already exists in AudioPicker) | Small effort, big QOL improvement |
| **Auto-mode waits for voice** | Auto-advance waits for voice to finish before timer starts (Ren'Py standard) | Medium | Voice duration tracking + auto timer integration | Without this, auto-mode cuts off voice mid-sentence |
| **Per-character voice volume** | Kirikiri-level feature: different volume per character voice actor | High | Character definition extension, AudioManager multi-channel | Nice-to-have, defer to later |

## Anti-Features

Features to explicitly NOT build in v0.4.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Raw HTML in dialogue text** | XSS attack vector, complexity explosion, breaks typewriter | Custom lightweight markup tags like `[color=#ff0000]text[/color]` — parsed/rendered safely |
| **Full rich text (bold/italic/underline/size)** | Scope creep for v0.4; color is the primary VN use case | Start with inline color only. Architecture should support extension to bold/size later |
| **Markdown syntax** | Wrong paradigm for VN — Markdown is for documents, not game dialogue | Custom VN-style tags |
| **Text-to-speech** | Not expected in galgame (voice acting is human recordings) | Focus on voice file binding |
| **Voice lip-sync / mouth animation** | Extremely complex, not expected in 2D VN | Character expression switching is sufficient |
| **Per-line font size/family override** | Rarely used in practice, adds editor complexity | Global font settings cover 95% of use cases; inline color covers emphasis |
| **Voice recording integration** | Out of scope — users record externally | Focus on import + bind workflow |
| **Streaming/progressive voice loading** | Over-engineering for local Electron app | Simple Audio element with `asset://` path |

## Feature Dependencies

```
                    ┌──────────────────────┐
                    │  Audio asset store    │ (EXISTS)
                    │  (files.audio list)   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Voice field in       │
                    │  dialogue data model  │──────► Batch voice naming match
                    │  { voice: "..." }     │         (auto-detect from files)
                    └──────────┬───────────┘
                               │
              ┌────────────────┼───────────────────┐
              │                │                     │
   ┌──────────▼─────┐  ┌──────▼────────┐  ┌────────▼────────┐
   │ Voice playback  │  │ Voice in      │  │ Voice preview   │
   │ (AudioManager   │  │ backlog       │  │ in editor       │
   │  voice channel) │  │ (replay btn)  │  │ (MiniPlayer)    │
   └──────────┬──────┘  └───────────────┘  └─────────────────┘
              │
   ┌──────────▼─────────┐
   │ Voice volume        │
   │ (ConfigManager +    │
   │  settingDefs entry) │
   └──────────┬──────────┘
              │
   ┌──────────▼─────────┐
   │ Auto-mode waits     │
   │ for voice to finish │
   └────────────────────┘


   ┌──────────────────────┐
   │  Global font settings │
   │  (fontSize, color,    │──────► DialogueBox._applyStyle() update
   │   fontFamily)         │         (already has style infra)
   └──────────────────────┘


   ┌──────────────────────┐
   │  Markup tag parser    │
   │  (parse "[color=X]") │
   └──────────┬───────────┘
              │
   ┌──────────▼───────────┐
   │  Rich text rendering  │
   │  (innerHTML + spans)  │──────► Typewriter rewrite
   └──────────┬───────────┘         (tag-aware char reveal)
              │
   ┌──────────▼───────────┐
   │  WYSIWYG editor       │
   │  (contenteditable or  │
   │   inline toolbar)     │
   └──────────────────────┘
```

**Critical path:** Voice data model → Voice playback → Voice volume → Everything else.
**Critical path (rich text):** Tag parser → Engine rendering → Typewriter rewrite → Editor WYSIWYG.

## Detailed Feature Specifications

### Voice System

#### Data Model Extension

Current dialogue object:
```json
{ "speaker": "sakura", "text": "Hello!", "expression": "smile" }
```

Required addition:
```json
{ "speaker": "sakura", "text": "Hello!", "expression": "smile", "voice": "audio/voice/sakura_s01_p01_d00.ogg" }
```

The `voice` field is nullable (narration has no voice). Path follows existing `audio/` convention.

#### Batch Voice Naming Convention

Standard pattern used by Ren'Py/Kirikiri projects:
```
{characterId}_{sceneIndex}_{pageIndex}_{dialogueIndex}.{ext}
```
Example: `sakura_001_002_000.ogg` = character sakura, scene 1, page 2, dialogue 0.

The editor should scan `audio/` files, match against this pattern, and offer one-click binding. This alone saves hours on a 1000-line voiced project.

#### Audio Channel Architecture

Current AudioManager has 2 channels:
- `_bgm` (HTMLAudioElement, loop, fade)
- SE (one-shot `new Audio()`)

Voice needs a 3rd dedicated channel:
- `_voice` (HTMLAudioElement, no loop, no fade, stops on next line)
- Separate volume: `voiceVolume` in ConfigManager
- Must integrate with `masterVolume` multiplication

### Rich Text / Inline Color Markup

#### Tag Syntax Decision

Use `[color=#RRGGBB]text[/color]` — bracket-based tags like TyranoScript/KAG.

**Why not `{curly braces}`:** JSON data has curly braces everywhere; bracket tags are visually distinct in JSON strings and avoid escaping issues.

**Why not `<html tags>`:** HTML tags enable XSS. A custom parser is safer and can be strictly limited to allowed tags.

#### Tag Parser Specification

Input: `"这是[color=#ff0000]重要的[/color]消息"`

Output: Array of segments:
```json
[
  { "text": "这是", "style": {} },
  { "text": "重要的", "style": { "color": "#ff0000" } },
  { "text": "消息", "style": {} }
]
```

The parser must:
1. Handle nested tags gracefully (even if not initially supported)
2. Handle unclosed tags (treat as plain text)
3. Be fast (runs per-character during typewriter)

#### Typewriter Rewrite

Current approach: `textEl.textContent = fullText.substring(0, charIndex)`

This breaks with markup because `textContent` strips tags. The rewrite needs:

1. Pre-parse the full text into segments at dialogue start
2. Track a "display character count" (excluding tag syntax)
3. On each typewriter tick, build innerHTML from segments up to the current visible character count
4. Use `<span style="color:...">` for rendering (sanitized, not raw user HTML)

**Performance note:** Re-building innerHTML every 30ms is fine for the text lengths in VN dialogue (typically < 200 characters). No need for DOM diffing.

### Global Font Settings

#### Data Location

```json
{
  "ui": {
    "dialogue": {
      "fontSize": 24,
      "fontColor": "#ffffff",
      "fontFamily": "Noto Sans SC"
    },
    "settingsScreen": { ... },
    "titleScreen": { ... }
  }
}
```

Lives in `script.json → ui.dialogue` — parallel to existing `ui.settingsScreen` and `ui.titleScreen`.

#### Editor UI

Add a new section to the project settings tab (or a dedicated dialogue settings area):
- Font family dropdown (system fonts + imported project fonts from `assets.fonts`)
- Font size number input (range: 12–48px, default: 24)
- Font color picker (hex input + color swatch)
- Preview of how dialogue text looks with current settings

#### Engine Integration

`DialogueBox._applyStyle()` already accepts `style.fontSize`, `style.fontFamily`, `style.textColor`. The global settings become the default style passed to `show()` when no per-element override exists.

## MVP Recommendation

### Must-Have for v0.4 (Table Stakes)

1. **Voice field in dialogue data** — Foundation for everything voice-related
2. **Voice picker in PageInspector** — Reuse AudioPicker pattern with "voice" tab filter
3. **Voice playback in engine** — New `play_voice`/`stop_voice` events, AudioManager voice channel
4. **Voice volume setting** — New `voice-volume` in settingDefs + ConfigManager
5. **Global font size/color/family** — `ui.dialogue` object + editor UI + engine consumption
6. **Inline color markup** — Tag parser + typewriter rewrite + engine rendering
7. **Editor rich text input** — At minimum: toolbar with color picker that inserts `[color=X]...[/color]` tags into textarea (vs full WYSIWYG)

### Should-Have for v0.4

8. **Voice replay in backlog** — Store voice path in history, add play button
9. **Batch voice naming match** — Scan audio files, auto-suggest bindings
10. **Auto-mode voice-aware wait** — Listen for voice `ended` event before auto-advance timer
11. **Voice preview in PageInspector** — MiniPlayer next to voice field

### Defer to Later

12. **Full WYSIWYG contenteditable** — Start with toolbar-inserts-tags approach; upgrade to real WYSIWYG later if users demand it
13. **Per-character voice volume** — Nice but not critical
14. **Bold/italic/size inline markup** — Architecture supports it, but ship color-only first
15. **Voice file drag-and-drop** — Nice UX but not blocking

## Complexity Assessment

| Feature | Effort | Risk | Notes |
|---------|--------|------|-------|
| Voice data model | Small | Low | Add field to dialogue object + createDefaultPage() |
| Voice picker UI | Small | Low | Clone AudioPicker pattern, filter to voice files |
| Voice playback | Medium | Low | New Audio element in AudioManager, new events |
| Voice volume setting | Small | Low | Clone bgm-volume pattern in settingDefs |
| Global font settings | Small | Low | New ui.dialogue object + 3 inputs in editor |
| Tag parser | Medium | Medium | Need robust handling of malformed tags |
| Typewriter rewrite | High | High | **Most complex change** — touch the core rendering loop |
| Editor rich text input | Medium-High | Medium | contenteditable is notoriously tricky; toolbar approach is safer |
| Batch voice match | Medium | Low | File name parsing + UI for confirmation |
| Backlog voice replay | Small | Low | Add play button + reuse AudioManager |
| Auto-mode voice wait | Medium | Medium | Timing coordination between voice and auto timer |

**Highest risk:** Typewriter rewrite for rich text. This touches the core game feel — the character-by-character text reveal. Must be carefully tested to ensure no visual glitches, no performance regressions, and correct handling of edge cases (empty tags, nested tags, unclosed tags, emoji, CJK characters).

## Sources

- Ren'Py documentation: voice system (`config.auto_voice`), text tags (`{color}`, `{size}`)
- TyranoScript documentation: `[playse]`, `[vostart]`, `[font]` tags
- Kirikiri/KAG documentation: `[voice]` tag, `[font]` tag
- RPG Maker MV/MZ: text code system (`\C[n]`, `\{`, `\}`)
- Existing codebase analysis: ScriptEngine.js, AudioManager.js, DialogueBox.js, PageInspector.vue, settingDefs.js, BacklogScreen.js

**Confidence:** HIGH — VN engine voice/text systems are extremely well-documented and stable patterns. The features described are industry-standard across all major engines with minimal variation in approach.
