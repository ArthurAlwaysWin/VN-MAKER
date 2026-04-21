# Project Research Summary

**Project:** VN-MAKER / Galgame Maker  
**Domain:** GUI-first, no-code visual novel authoring tool with Electron/Vue editor and pure-JS DOM runtime  
**Researched:** 2026-04-21  
**Confidence:** HIGH

## Executive Summary

v1.4 is a **bounded cinematic upgrade**, not an animation-platform rewrite. The product remains a page-based, GUI-first VN maker where creators choose presets rather than author timelines. Research is aligned across stack, feature, architecture, and pitfalls: the right move is to extend the existing **Electron + Vue + Pinia editor** and **pure JavaScript DOM runtime** with preset character motion, one page-level camera effect, a few higher-value transitions, and runtime-backed iframe preview.

The strongest recommendation is also the simplest: **add zero new npm dependencies**. Native DOM/CSS primitives already cover the target scope. The real work is architectural ownership: add a dedicated `#stage-layer` for camera effects, add a per-character motion wrapper so transforms stop colliding, centralize camera logic in a `CameraController`, centralize cleanup in a shared reset helper, and keep the existing iframe preview path as the only truth source.

The main delivery risk is not visual polish but **runtime reliability**: transform collisions, stale classes/overlays after preview or fast navigation, and editor/runtime drift if preview is reimplemented locally. Roadmap order should therefore prioritize **contracts, layer ownership, cleanup, and runtime foundations before editor UI**. If v1.4 stays preset-based and refuses timeline/freeform scope creep, it is high-confidence and high-ROI.

## Key Findings

### Recommended Stack

Research conclusion: **no stack migration, no new runtime library, no new dev dependency**. v1.4 should ship on the existing Electron 41 + Vue 3 + Pinia + Vite + pure JS ES modules stack, using CSS keyframes/transitions, DOM wrappers, `requestAnimationFrame`, and the current iframe `postMessage` preview path.

What actually gets added is internal structure, not packages: a stage wrapper for camera ownership, a character motion wrapper for transform isolation, a shared preset registry, a small camera controller, a shared runtime visual reset helper, and a few new preview commands on the existing iframe contract.

**Core technologies:**
- **Electron 41 / Chromium runtime:** already sufficient for transforms, opacity, blur, flash overlays, and preview parity.
- **Vue 3.5 + Pinia 3:** keep existing editor state/UI patterns for PageInspector controls and schema updates.
- **Pure JS DOM/CSS runtime:** use CSS keyframes/transitions for presets and transitions; avoid GSAP/anime.js/PixiJS/timeline systems.
- **`#stage-layer` + `CameraController`:** isolate page camera effects to stage visuals only; keep dialogue/UI stable.
- **Character preset registry + motion wrapper:** share one canonical enum table and avoid transform collisions between layout and animation.
- **Existing iframe preview path:** extend `postMessage`; do not build a second preview implementation.

**Critical version requirements:**
- Keep current validated baseline: Electron `41.0.4`, Vue `3.5.31`, Pinia `3.0.4`, Vite `6.3.0`, Vitest `4.1.4`, jsdom `29.0.2`.
- Preserve pure JavaScript; **no TypeScript migration** in v1.4.

**Explicit non-additions:**
- No GSAP, anime.js, Motion, PixiJS, Phaser, canvas/WebGL renderer, timeline engine, ATL-like scripting, particle system, or new preview renderer.

### Expected Features

v1.4 table stakes are clear and tightly bounded: creators should be able to add **basic commercial-VN-style motion** without code and preview it through the real runtime. This is not the milestone for choreography, scripting, or asset-heavy cinematic systems.

**Must have (table stakes):**
- **Per-character preset animation** — one preset per character on a page, with at least 6 stable presets: `fade-in`, `slide-in-left`, `slide-in-right`, `shake`, `nod`, `breathe` (`bounce` recommended as a 7th).
- **Automatic lifecycle** — one-shot vs loop behavior handled by runtime; replay, page leave, skip, and fast navigation clean up correctly.
- **One page-level camera effect** — `shake`, `zoom`, `pan`, or `flash`, with simple controls (`durationMs`, `intensity`, `direction` when relevant), triggered on page enter only.
- **Expanded transitions** — grow from `none / fade / slide-*` to a 7-option family including `dissolve`, `wipe`, `scale`, and `blur`.
- **Editor-side configuration + runtime-backed preview** — PageInspector controls, targeted replay buttons, disabled reasons, cancelable preview, and state restoration.
- **Backward/forward compatibility** — old pages still work; unknown enum values are preserved in editor data and safe-no-op in runtime.

**Should have (competitive, if capacity remains after foundations):**
- **`bounce` as the 7th shipped preset** — rounds out the preset library without changing architecture.
- **Tighter preview UX messaging** — explicit ok/error reasons and strong disabled-state explanations.

**Defer (v2+ / intentionally out for v1.4):**
- Freeform animation language or ATL-style scripting
- Timeline / keyframe / curve editor
- Multi-effect camera choreography or `effects[]`
- Combination preset authoring/macros
- Particle/weather systems, video, asset-driven cinematic packs
- Theme-driven animation system
- Continuous cross-page cinematic state
- Any feature that requires a heavyweight animation dependency

### Architecture Approach

The architecture should stay additive and page-based. `ScriptEngine` emits data contracts; `CharacterLayer` owns character motion; `BackgroundLayer` owns page transitions; a new `CameraController` owns stage camera effects; `main.js` only wires events and lifecycle; editor code writes schema and sends iframe preview commands. The milestone succeeds if each visual concern has **one owner** and every temporary visual state has **one cleanup path**.

**Major components:**
1. **`ScriptEngine`** — extend contracts only: pass through `character.animation`, emit `page_camera`, preserve old-page behavior when fields are absent.
2. **`CharacterLayer`** — keep expression crossfade, add inner `.character-motion` wrapper, manage preset class lifecycle and replay.
3. **`CameraController`** — own `#stage-layer` shake/zoom/pan/flash lifecycle, replacement rules, overlay handling, and cleanup.
4. **`BackgroundLayer`** — remain the single home for transition rendering, normalization, fallback, and transition preview helpers.
5. **`resetRuntimeVisualState()`** — one shared cleanup entrypoint for replay, preview stop, page leave, title return, load, and end flow.
6. **`usePageEditor` + `PageInspector`** — editor-only consumers of frozen runtime contracts; send targeted iframe preview requests, never simulate runtime locally.

### Critical Pitfalls

The biggest risks are integration bugs, not lack of effect power.

1. **Transform ownership collisions** — avoid by splitting ownership: `#stage-layer` for camera, `.character-sprite` for position/scale, `.character-motion` for animation, `BackgroundLayer` for transitions only.
2. **Dirty-stage cleanup leaks** — avoid by adding a shared reset helper and requiring every subsystem to expose a full `clear()` path for classes, timers, inline styles, and overlays.
3. **Preview/runtime drift** — avoid by making iframe runtime preview the only authority; never add canvas-only or Vue-local effect playback.
4. **Unknown enum loss on open/save** — avoid by preserving unsupported values in editor UI (`未知效果：...`) and only overwriting when user explicitly changes them.
5. **Skip/auto/rapid replay timing bugs** — avoid with cancellation/generation semantics, explicit skip behavior, and tests for replay, preview cancel, fast navigation, title return, and load.

## Implications for Roadmap

Based on combined research, the roadmap should treat editor work as a **consumer** of engine/runtime foundations, not the starting point.

### Phase 1: Contract Freeze + Layer Ownership Refactor
**Rationale:** This is the dependency root. Without clear transform ownership, later animation/camera/transition work will fight itself.  
**Delivers:** final page schema additions, runtime event contract, `#stage-layer` decision, `.character-motion` wrapper decision, canonical enum names.  
**Addresses:** stack additions/non-additions, compatibility rules, predictable effect ordering.  
**Avoids:** transform collision, naming drift, accidental scope creep.

### Phase 2: Character Preset Runtime Foundation
**Rationale:** Highest user-visible gain with lowest architectural blast radius once ownership is frozen.  
**Delivers:** preset registry, CharacterLayer motion wrapper, one-shot/loop lifecycle, replay support, cleanup on page leave/hide/replace.  
**Addresses:** per-character preset animation, automatic lifecycle, replay reliability.  
**Avoids:** crossfade/animation races, stale loop classes, position/scale breakage.

### Phase 3: Camera Runtime + Shared Cleanup
**Rationale:** Camera is the second big presentation gap, but it must land with reset infrastructure or it will be visibly unreliable.  
**Delivers:** `CameraController`, flash layer/overlay handling, `page_camera` event binding, single-active-effect rules, `resetRuntimeVisualState()`.  
**Uses:** existing DOM/CSS runtime only; no new deps.  
**Implements:** stage-only camera ownership and cross-flow cleanup.  
**Avoids:** dirty-stage state, UI contamination, replay/stop/title/load bugs.

### Phase 4: Background Transition Expansion
**Rationale:** Transitions are valuable but should extend the existing `BackgroundLayer`, not create a parallel system.  
**Delivers:** transition enum expansion, `dissolve / wipe / scale / blur` implementations, fallback behavior for unknown/unstable transitions.  
**Addresses:** 7-option transition set and stable page-enter ordering.  
**Avoids:** second transition subsystem, broken legacy values, transition preview corruption.

### Phase 5: Iframe Effect Preview API
**Rationale:** Preview should expose already-stable runtime behavior, not invent it.  
**Delivers:** targeted `postMessage` commands (`preview-character-animation`, `preview-camera`, `preview-transition`), ok/error replies, cancel/override behavior, state restore rules.  
**Addresses:** runtime-backed preview, replay buttons, explicit failure/disabled states.  
**Avoids:** preview/runtime drift, hidden iframe-state dependency, flaky replay.

### Phase 6: Editor Controls + Compatibility UX
**Rationale:** Once runtime and preview contracts are frozen, PageInspector can safely become a thin contract editor.  
**Delivers:** character animation dropdowns, camera config section, transition option expansion, unknown-value preservation UI, disabled-state messaging, default `camera: null` / `animation: 'none'` behavior.  
**Addresses:** no-code authoring and backwards/forwards compatibility.  
**Avoids:** destructive save behavior, impossible runtime states, premature UI churn.

### Phase 7: Full Integration and Regression Gate
**Rationale:** v1.4 will fail in practice if only happy-path previews work. Regression is a milestone deliverable here.  
**Delivers:** fixed test matrix across manual play, auto, skip, rapid replay, preview stop, load, title return, end-of-game return, and legacy project open/save.  
**Addresses:** preview/export trust and production stability.  
**Avoids:** shipping flashy but unreliable behavior.

### Phase Ordering Rationale

- **Contracts before effects:** schema, DOM ownership, and enum names affect every later file touch.
- **Runtime before editor:** the iframe runtime is the truth source; UI should consume, not define, effect behavior.
- **Cleanup before preview UX:** replay/preview is only credible once reset semantics are centralized.
- **Transitions before final editor polish:** transition work is still runtime-layer work and should stabilize before final preview/config UX.
- **Regression as a real phase:** the top risks are cross-flow integration bugs, not missing CSS.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Transition expansion):** validate final `wipe` implementation (`clip-path` vs reveal wrapper) and define degradation-to-`fade` policy for unstable environments.
- **Phase 5 (Iframe effect preview API):** verify current iframe readiness/read-only constraints and finalize reply/error semantics so inspector controls remain trustworthy.
- **Phase 7 (Regression gate):** define exact skip/auto behavior policy for each effect type to prevent ambiguous acceptance criteria.

Phases with standard patterns (skip research-phase):
- **Phase 1:** architecture direction is already well documented and high confidence.
- **Phase 2:** preset character animation via CSS classes/wrappers is straightforward and already aligned with current CharacterLayer patterns.
- **Phase 3:** camera implementation is clear once stage ownership and reset boundaries are accepted.
- **Phase 6:** editor controls are thin consumers of stable contracts; mostly implementation, not discovery.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase inspection and milestone docs all point to zero new package needs and additive internal modules only. |
| Features | HIGH | v1.4 cut line is explicit across PROJECT, feature research, milestone spec, and gap analysis. |
| Architecture | HIGH | File/module boundaries, event flow, and DOM ownership decisions are strongly supported by current code structure. |
| Pitfalls | HIGH | Risks are concrete, code-informed, and repeated consistently across architecture + pitfalls research. |

**Overall confidence:** HIGH

### Gaps to Address

- **Final preview command naming/ack contract:** lock this in during planning so editor and iframe do not drift.
- **Exact skip/auto degradation policy:** decide which effects become instant/no-op under skip and document it in requirements.
- **Transition implementation choice for `wipe`:** decide early whether `clip-path` is stable enough or whether reveal-wrapper + `fade` fallback is safer.
- **Legacy transition naming UX:** keep schema-compatible values (`slide-left` / `slide-right`) while presenting clearer UI labels.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — stack additions, non-additions, internal modules, DOM/CSS strategy
- `.planning/research/FEATURES.md` — v1.4 cut line, table stakes, anti-features, UX expectations
- `.planning/research/ARCHITECTURE.md` — module boundaries, data contracts, runtime/editor ownership, implementation order
- `.planning/research/PITFALLS.md` — critical failure modes, mitigation rules, milestone gating
- `.planning/PROJECT.md` — product constraints, current stack, active milestone definition
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` — official v1.4 scope, contracts, lifecycle, acceptance criteria

### Secondary (MEDIUM-HIGH confidence)
- `docs/gap-analysis-vs-mature-engines.md` — validates that animation, camera, and transition breadth are the right near-term gap to close
- Current codebase paths cited by the research files (`src/main.js`, `src/engine/ScriptEngine.js`, `src/ui/CharacterLayer.js`, `src/ui/BackgroundLayer.js`, `src/editor/composables/usePageEditor.js`, `src/editor/components/page-editor/PageInspector.vue`, `src/editor/stores/script.js`, `index.html`, `src/style.css`) — implementation anchor points

### Tertiary (LOW-MEDIUM confidence)
- Mature-engine comparisons in gap analysis — useful for expectation-setting, but less authoritative than the project’s own milestone spec and codebase constraints

---
*Research completed: 2026-04-21*  
*Ready for roadmap: yes*
