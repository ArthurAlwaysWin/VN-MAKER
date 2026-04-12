# Project Research Summary

**Project:** Galgame Maker v1.0 — 角色表情/差分場景切換 (Character Expression/Variant Switching)
**Domain:** Visual novel editor — expression picking, runtime crossfade, state inheritance
**Researched:** 2025-07-15
**Overall confidence:** HIGH

## Executive Summary

Galgame Maker v1.0 adds character expression/variant switching to the PPT-style page editor and runtime engine. The central finding is that **the existing codebase already has 80% of the scaffolding in place.** The `script.json` data model already stores per-page character expressions (`page.characters[].expression`), per-dialogue expression changes (`dialogue.expression`), and the character expression registry (`characters[id].expressions`). The editor's `PageInspector.vue` already has a working (but text-only) expression `<select>` dropdown. The engine's `ScriptEngine.js` already emits `show_character` and `set_expression` events with expression data. `CharacterLayer.js` already has a `setExpression()` method.

What's missing is surgical: (1) a **visual thumbnail expression picker** replacing the plain `<select>`, (2) a **crossfade transition** in `CharacterLayer.setExpression()` using the dual-image pattern already proven by `BackgroundLayer.js`, (3) **expression state inheritance** tracking in `ScriptEngine` so characters keep their expression across pages without re-specification, and (4) minor **save/restore state extension** to persist expression state through save/load cycles.

**Zero new npm dependencies are needed.** The entire feature uses CSS transitions (established pattern), native `Image()` preloading, and pure JS logic. This is a refinement milestone, not a stack expansion.

## Key Findings

**Stack:** Zero new dependencies — all capabilities achieved with existing CSS transitions, browser-native Image() API, and vanilla JS. See [STACK.md](./STACK.md).
**Architecture:** Dual-image crossfade (replicating BackgroundLayer.js pattern), expression state Map in ScriptEngine, new ExpressionDropdown.vue component. See [ARCHITECTURE.md](./ARCHITECTURE.md).
**Critical pitfall:** Image flash during crossfade if `img.src` is set without waiting for `onload` — must preload before starting CSS transition. See [PITFALLS.md](./PITFALLS.md) P1.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **CharacterLayer Refactor (Dual-Image Structure)** — Foundation for crossfade
   - Addresses: DOM structure change from single `<img>` to container + two `<img>` layers
   - Avoids: Pitfall P3 (positioning breakage) by doing structural refactor BEFORE adding crossfade logic
   - Rationale: Must validate all 4 positioning modes (`pos-left`, `pos-center`, `pos-right`, `pos-custom`) still work with the new DOM structure before adding any animation

2. **Expression Crossfade Transition** — Smooth visual switching
   - Addresses: Crossfade between expression images, image preloading, mid-dialogue expression changes
   - Avoids: Pitfall P1 (blank frame flash) with preload-before-swap pattern
   - Avoids: Pitfall P7 (rapid page transition glitches) with interruption handling
   - Depends on: Phase 1 (dual-image structure must be in place)

3. **Expression State Inheritance in Engine** — Characters remember their expression
   - Addresses: `_charExpressionState` Map tracking, 3-tier fallback resolution, save/restore integration
   - Avoids: Pitfall P4 (save/load expression reset) by extending getState/restoreState
   - Avoids: Pitfall P8 (unstable first-key order) by documenting behavior
   - Independent of crossfade — can be built/tested separately

4. **Expression Thumbnail Picker Component** — Visual selector replacing text `<select>`
   - Addresses: ExpressionDropdown.vue component, PageInspector integration (both character-row and dialogue-expression contexts)
   - Avoids: Pitfall P5 (overflow clipping) with Teleport/fixed positioning
   - Avoids: Pitfall P10 (click timing) with mousedown.prevent pattern
   - Reuses: CharacterPicker.vue thumbnail grid pattern (proven CSS)
   - Depends on: Phase 3 (inheritance display needs resolution logic)

5. **Editor Inheritance Display + Polish** — WYSIWYG accuracy
   - Addresses: Canvas showing inherited expression, inline thumbnails in inspector rows, edge case handling
   - Avoids: Pitfall P2 (editor/engine desync) with shared resolution logic
   - Avoids: Pitfall P6 (dangling references) with graceful fallback chain

**Phase ordering rationale:**
- Phase 1 before Phase 2: DOM structure must be stable before adding animation. Debugging CSS transitions on a broken DOM structure is extremely painful.
- Phase 3 can parallel Phase 2: Engine state tracking is independent of CharacterLayer rendering. Both modify `ScriptEngine.js` but different methods.
- Phase 4 after Phase 3: The thumbnail picker needs to display "inherited" expression state, which requires the inheritance resolution logic from Phase 3.
- Phase 5 last: Polish and edge cases after core functionality works end-to-end.

**Research flags for phases:**
- Phase 1: **Needs careful testing** — DOM restructure affects all character rendering. Regression test with demo script.json across all position modes.
- Phase 2: Standard CSS transition pattern (BackgroundLayer.js is working reference). Low risk.
- Phase 3: Pure logic. Low risk.
- Phase 4: Standard Vue SFC. Low risk. CharacterPicker.vue is working reference.
- Phase 5: Polish pass. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Direct codebase analysis. Zero ambiguity — no new deps needed. |
| Features | **HIGH** | FEATURES.md based on codebase + VN industry patterns. Table stakes clearly identified. |
| Architecture | **HIGH** | All integration points verified against source code. BackgroundLayer proves the crossfade pattern. |
| Pitfalls | **HIGH** | 10 pitfalls catalogued (4 critical, 4 moderate, 2 minor). Each traced to specific code locations. |

## Gaps to Address

- **Expression crossfade timing for Fast Skip mode:** Currently Fast Skip runs at 30ms/page. Need to decide: skip crossfade entirely during skip, or use 0ms instant swap. Recommend instant swap.
- **`defaultExpression` field:** Not adding for v1.0 (uses first key in expressions object). If users report confusion, add a `defaultExpression: "normal"` field to character definition in v1.1.
- **Expression change indicator in page thumbnails:** Deferred differentiator. Not needed for MVP but would improve UX of managing multi-page expression flows.
- **Scene boundary behavior for inheritance:** When entering a new scene, should expression state carry over or reset? Recommend reset per scene (clean slate), but needs explicit design decision.

---
*Research completed: 2025-07-15*
*Ready for roadmap: yes*
*Files synthesized: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, SUMMARY.md*
