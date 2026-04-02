# Research Summary: Galgame Maker v0.4 — Voice & Rich Text

**Domain:** Visual Novel / Galgame Maker — Voice system, rich text dialogue, global font settings
**Researched:** 2025-07-14
**Overall confidence:** HIGH

## Executive Summary

The v0.4 milestone adds three feature clusters to an already-functional galgame maker: per-dialogue voice binding with playback, inline color markup in dialogue text, and global font settings. Research into Ren'Py, TyranoScript, Kirikiri/KAG, and RPG Maker reveals these are extremely standardized features with well-established patterns. There is very little ambiguity in what to build — the VN engine ecosystem has converged on consistent solutions over 20+ years.

The existing codebase is architecturally well-prepared for these additions. AudioManager already handles BGM and SE with a clean channel pattern that directly extends to voice. The DialogueBox already has a `_applyStyle()` method accepting font size, family, and color — making global font settings nearly trivial. The highest-risk item is the typewriter rewrite for rich text: the current `textContent` substring approach must be replaced with an `innerHTML` segment-based renderer, which touches the core game feel and requires careful XSS prevention.

No new npm dependencies are needed. All features are built with existing vanilla JS DOM APIs, Vue 3 components, and Pinia stores. The tag syntax `[color=#hex]...[/color]` is chosen over HTML tags (XSS risk) and Ren'Py braces (JSON escaping conflicts), following TyranoScript/KAG convention.

Voice batch naming match (auto-detecting voice files from naming conventions like `{charId}_{scene}_{page}_{line}.ogg`) is the standout differentiator — it saves hours on projects with hundreds of voiced lines. Most no-code VN makers require manual file-by-file binding; automated matching is a Ren'Py-level feature that sets this tool apart.

## Key Findings

**Stack:** No new dependencies needed. HTMLAudioElement for voice (3rd channel), hand-written tag parser for markup, existing sanitize.js for XSS prevention.
**Architecture:** Voice = extend AudioManager with `_voice` channel + ScriptEngine `play_voice` event. Rich text = parse-once segment array + innerHTML typewriter. Global fonts = `ui.dialogue` config object consumed by DialogueBox.
**Critical pitfall:** Typewriter rewrite is the highest-risk change. Must pre-parse markup into segments, then reveal characters from segments — never expose raw tags during typing animation.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Voice Data + Engine Playback** — Foundation phase
   - Addresses: voice field in dialogue data model, AudioManager voice channel, ScriptEngine play_voice/stop_voice events, voice volume in ConfigManager + settingDefs
   - Avoids: Memory leak (single _voice instance pattern), missing voice crash (onerror handler)
   - Rationale: All subsequent voice features (editor picker, backlog replay, batch match, auto-mode wait) depend on this working first

2. **Voice Editor UI** — Editor integration
   - Addresses: voice picker in PageInspector per-dialogue, voice preview (MiniPlayer reuse), voice in backlog (replay button)
   - Avoids: Batch naming wrong bindings (show confirmation UI)
   - Rationale: Once engine plays voice correctly, wire up the editor to let users bind files

3. **Global Font Settings** — Low-risk, high-value
   - Addresses: `ui.dialogue` data schema, editor font size/color/family controls, engine consumption via `_applyStyle()`
   - Avoids: Settings lost after save/load (persistent reference pattern)
   - Rationale: Independent of voice. Small scope. Can ship alongside voice features or in parallel.

4. **Rich Text Parser + Engine Rendering** — Highest-risk phase
   - Addresses: `parseMarkup()` module, DialogueBox typewriter rewrite, innerHTML rendering with sanitization, backlog rich text
   - Avoids: XSS (escapeHtml + sanitizeCssValue), raw tags in typewriter (segment approach), raw tags in backlog, fast-forward showing partial tags
   - Rationale: Touches core rendering. Needs dedicated focus and thorough testing. Ship voice first so that rich text doesn't block voiced dialogue.

5. **Rich Text Editor UI** — Editor-side markup
   - Addresses: color picker toolbar for dialogue textarea, tag insertion around text selection, WYSIWYG preview below textarea
   - Avoids: Lost selection range (store on blur), contenteditable nightmares (use toolbar + textarea instead)
   - Rationale: Editor UI depends on the tag format being finalized (phase 4)

6. **Voice Polish** — Auto-mode + batch match
   - Addresses: auto-mode waits for voice `ended` event, batch voice naming convention matching, confirmation UI
   - Avoids: Voice cut off during auto-play (wait for ended), wrong batch bindings (preview + confirm)
   - Rationale: Polish features that make voiced games feel professional. Can be last because core voice works from phase 1-2.

**Phase ordering rationale:**
- Voice data model is strict foundation — nothing voice-related works without it
- Global fonts are independent and low-risk — can parallel with voice work
- Rich text parser must come before editor UI (defines the tag format the editor inserts)
- Voice polish (auto-mode wait, batch match) is iterative improvement — ship core first
- Engine-side features (phases 1, 3, 4) should precede editor-side features (phases 2, 5) within each feature cluster

**Research flags for phases:**
- Phase 4 (Rich Text Parser + Engine): HIGH RISK — needs careful testing of typewriter rewrite, XSS prevention, and edge cases (empty tags, unclosed tags, emoji, CJK)
- Phase 6 (Voice Polish): MEDIUM RISK — auto-mode timing coordination is subtle
- All other phases: LOW RISK — direct extensions of proven existing patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies; all patterns extend existing code |
| Features | HIGH | VN voice/rich text features are standardized across all engines with 20+ years of convergence |
| Architecture | HIGH | Voice channel pattern directly mirrors existing BGM. Segment-based rendering is the industry standard approach |
| Pitfalls | HIGH | Identified from direct codebase analysis (specific file/line references) and well-documented VN development issues |

## Gaps to Address

- **Voice file organization:** Should voice files go in `audio/voice/` subdirectory or flat in `audio/`? Need to decide convention and update asset store category handling.
- **Batch naming pattern specifics:** The exact naming convention format (`{charId}_{sceneIndex}_{pageIndex}_{dlgIndex}` vs scene name-based) needs finalization during implementation. Scene name-based is more resilient to reordering.
- **Rich text tag extension points:** The parser should be designed for future tags (bold, size, ruby text) even though v0.4 only ships color. Verify the segment architecture supports `{ text, style: { color, bold, fontSize, ... } }` cleanly.
- **Existing XSS in BacklogScreen:** Line 41 of BacklogScreen.js already interpolates `entry.text` into innerHTML unsafely. This should be fixed as part of the rich text work, not deferred.
