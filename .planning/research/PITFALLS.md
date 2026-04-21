# Domain Pitfalls — v1.4 演出力升级

**Domain:** Existing VN maker cinematic presentation upgrade (preset character animation + page camera + expanded transitions + editor preview)
**Researched:** 2026-04-21
**Overall confidence:** HIGH — based on direct review of milestone docs plus current runtime/editor code (`ScriptEngine`, `CharacterLayer`, `BackgroundLayer`, `main.js`, `usePageEditor`, `PageInspector`, script store)

---

## Critical Pitfalls

Mistakes here will cause visible unreliability, preview/runtime mismatch, or schema damage.

---

### Pitfall 1: Transform Ownership Collisions Make Effects Fight Each Other

**What goes wrong:** Character enter transitions, custom positioning, scale, preset animation, camera, and background transitions all compete for `transform`. In the current code, `.character-sprite` already uses `transform` for center positioning and custom scale, and enter states overwrite it with `!important`. Adding shake/nod/breathe on the same node will break positioning or silently cancel animation.

**Why it happens:** The current runtime was built around one transform owner per layer. v1.4 introduces three new transform-heavy systems on top of that.

**Consequences:**  
- centered characters jump off-center  
- custom-scale characters lose scale during animation  
- camera effect cancels page transition feel  
- “works in one preset, breaks in another” bugs

**Prevention:**  
1. **Phase 61:** split character layout and motion ownership. Keep position/scale on an outer container, animation class on an inner motion wrapper or compose via CSS variables.  
2. **Phase 62:** camera owns only the stage container.  
3. **Phase 64:** transitions own only background/page transition layers, not character nodes.  
4. Freeze one explicit order: **cleanup old effects → transition → mount new page → character animation → camera**.

**Warning signs:**  
- new animation classes added directly to `.character-sprite` without wrapper/transform composition  
- more `!important` added to transform rules  
- bug reports like “breathe breaks scale” or “shake moves the sprite to wrong place”

**Phase to absorb risk:** **Phase 61 first**, then re-validated in **62** and **64**

---

### Pitfall 2: Cleanup Gaps Leave the Runtime in a “Dirty Stage” State

**What goes wrong:** Effects survive past the page that created them. Current code already has multiple manual reset paths (`replayCurrentPage()`, preview `stop`, end flow, title return, load flow). Adding camera classes, flash overlays, loop animations, preview-only temporary states, and transition timers will make “forgot one reset path” the most likely failure mode.

**Why it happens:** Reset logic is duplicated today. v1.4 increases the number of transient visual states dramatically.

**Consequences:**  
- flash overlay stays visible after stop/load/title return  
- `breathe` keeps running on wrong page  
- preview ends but iframe stays transformed  
- first page after load inherits old camera or animation state

**Prevention:**  
1. **Phase 62** must introduce one shared runtime visual reset helper and use it everywhere.  
2. `clear()` for each visual subsystem must remove classes, timers, inline styles, and overlays — not just DOM nodes.  
3. Preview cancel and runtime page leave must use the same cleanup primitives.  
4. Add integration tests for: replay, preview stop, title return, end-of-game return, load, and rapid page skip.

**Warning signs:**  
- any new reset path manually calling only some of `characters.clear() / background.clear() / engine.resetRenderState()`  
- camera controller has `play()` but no fully tested `clear()`  
- preview button can be clicked repeatedly and leaves stage altered afterward

**Phase to absorb risk:** **Phase 62** (foundation), regression-owned again in **64/final verification**

---

### Pitfall 3: Preview Parity Breaks if Editor Reimplements Runtime Behavior

**What goes wrong:** Editor preview becomes “close enough” instead of authoritative. `usePageEditor` currently only knows start/stop/mute; if PageInspector adds local fake previews, duplicated preset mapping, or canvas-only animation behavior, runtime and preview will drift immediately.

**Why it happens:** It is tempting to preview simple effects directly in Vue/editor code for speed.

**Consequences:**  
- dropdown says one thing, exported game does another  
- preview supports effects runtime ignores  
- bug fixes must be applied twice  
- trust in the editor drops fast

**Prevention:**  
1. **Phase 63** must only send targeted preview commands into the iframe runtime.  
2. No preview-only preset registry, no second timing model, no fake canvas animation logic.  
3. If iframe is not ready, disable preview with an explicit reason instead of silent fallback.  
4. “Canvas mode = static editing only” should stay true.

**Warning signs:**  
- animation names/options duplicated separately in editor and runtime code  
- preview buttons mutate local canvas DOM instead of postMessage to iframe  
- “works in inspector replay, not in game” bugs

**Phase to absorb risk:** **Phase 63**

---

### Pitfall 4: Unknown Enum Values Get Silently Destroyed on Open/Save

**What goes wrong:** Old or future project data containing unknown `animation`, `camera.effect`, or transition values gets rewritten to `none`, `fade`, or some current default as soon as the editor opens and saves.

**Why it happens:** The current editor uses direct `<select>` controls with fixed options. Without explicit unknown-value preservation, unsupported values are lost.

**Consequences:**  
- forward compatibility breaks  
- user data gets corrupted by merely opening a project  
- legacy transition aliases (`slide-left`, `slide-right`) disappear unpredictably  
- future versions become harder to evolve safely

**Prevention:**  
1. **Phase 63** must preserve unknown enum values in UI with disabled fallback options like `未知效果：xxx`.  
2. Runtime must safe-no-op unknown values and warn in dev mode.  
3. **Phase 64** must normalize old transition aliases on read, not by destructive writeback.  
4. Save should preserve untouched unknown values exactly.

**Warning signs:**  
- setters coercing unknown values directly to `'none'` or `'fade'`  
- open-save-open cycle changes JSON without user edits  
- legacy project loses transition names after first save

**Phase to absorb risk:** **Phase 63** for UI preservation, **Phase 64** for transition normalization

---

### Pitfall 5: Skip/Auto/Fast Navigation Reveal Timer and Ordering Bugs

**What goes wrong:** Effects that feel fine in manual play break in skip, auto mode, quick replay, or rapid preview clicks. Current runtime already special-cases skip for character show/hide, background changes, voice, and BGM. New animation/camera systems are easy to forget in those branches.

**Why it happens:** v1.4 adds more timers, more async, and more “on enter” semantics, but fast navigation is already a first-class mode in this engine.

**Consequences:**  
- old page camera fires after user already advanced  
- one-shot animation finishes on next page  
- skip mode becomes visually noisy or inconsistent  
- preview replays queue on top of each other

**Prevention:**  
1. **Phase 61/62**: every timed effect needs cancellation token/generation semantics, not bare timers only.  
2. Skip mode should clamp new visual effects to instant/no-op policy consistently.  
3. Re-triggering the same preview must cancel the previous instance first.  
4. Add explicit tests for manual, auto, skip, and repeated replay clicks.

**Warning signs:**  
- `setTimeout()` added without token/generation ownership  
- no skip-specific behavior for camera  
- repeated replay clicks produce stacked effects

**Phase to absorb risk:** **Phase 61 and 62**, verified from editor side in **63**

---

### Pitfall 6: Camera Effects Leak Into Non-Gameplay UI Because the Root Container Is Shared

**What goes wrong:** Camera and flash are applied to `#game-container`, but that same root also contains dialogue, menus, save/load, settings, backlog, and title screen. If cleanup is late or overlays open mid-effect, UI screens can shake/zoom/flash unintentionally.

**Why it happens:** The engine does not currently have a separate dedicated “stage only” subtree; most runtime UI sits in the same root stacking context.

**Consequences:**  
- save/load opens while screen is still shaking  
- flash overlays cover menu/title flows  
- preview stop leaves title screen visually offset  
- user perceives the system as flashy but unreliable

**Prevention:**  
1. **Phase 62** must explicitly decide camera scope and document it.  
2. If camera remains on `#game-container`, then cleanup before showing non-gameplay UI is mandatory.  
3. Flash overlay must be owned by the camera controller, not globally appended ad hoc.  
4. Add regression tests around title return, menu open, preview stop, and save/load after camera playback.

**Warning signs:**  
- overlay DOM appended outside the controller lifecycle  
- menu/title bugs only after pages with camera effects  
- UI screenshots show shifted/zoomed menus

**Phase to absorb risk:** **Phase 62**

---

### Pitfall 7: Scope Creep Turns Presets Into a Hidden Animation Language

**What goes wrong:** The milestone starts with simple presets, then accumulates per-effect parameters, chaining, custom curves, trigger variants, multi-camera stacks, or timeline semantics. That pulls the product away from GUI-first authoring and creates a half-built ATL.

**Why it happens:** Cinematic features naturally invite “just one more parameter.”

**Consequences:**  
- editor complexity explodes  
- schema becomes unstable before users benefit  
- more states to preview/test than the current product can safely support  
- milestone misses “reliable basic presentation” and ships an unreliable mini-platform

**Prevention:**  
1. Keep contracts hard-limited: named animation presets, one optional `page.camera`, one trigger (`onEnter`), fixed intensity enums, no composition language.  
2. Reject requests to add curves/timelines/chained effects inside v1.4.  
3. Put any “advanced animation language” ideas into a later milestone, not incremental scope inside 61-64.

**Warning signs:**  
- PRs adding freeform JSON blobs or arrays of effects  
- editor asks for custom keyframes, percentages, or arbitrary easing strings  
- camera becomes `effects[]` during the same milestone

**Phase to absorb risk:** **Milestone-level gating before 61**, reinforced in **63 requirements/UI**

---

## Moderate Pitfalls

### Pitfall 8: New Transitions Fork Into a Second Background System

**What goes wrong:** Expanded transitions are added as special preview logic or separate code paths instead of extending `BackgroundLayer`. The runtime then has one mechanism for `fade`, another for `wipe/blur/scale`, and a third for preview.

**Prevention:**  
- **Phase 64** must keep one transition normalization function and one cleanup path in `BackgroundLayer`  
- preview transition should be a dedicated helper on `BackgroundLayer`, not a separate editor implementation  
- keep legacy `fade/slide/none` behavior working through the same normalization layer

### Pitfall 9: Transition Preview Corrupts the Real Page State

**What goes wrong:** Previewing a transition mutates the iframe into a temporary fake page and fails to restore the true current page state after completion or cancellation.

**Prevention:**  
- **Phase 64** needs explicit snapshot/restore ownership, preview token cancellation, and restoration after every exit path  
- repeated clicks must cancel old preview, restore, then start new preview

### Pitfall 10: Expression Crossfade and Animation Replay Race Each Other

**What goes wrong:** `CharacterLayer` already uses async `decode()` plus generation counters for expression crossfade. Adding animation replay without similar generation ownership can attach the new animation to an outdated DOM/image state.

**Prevention:**  
- **Phase 61** should extend the existing per-character bookkeeping instead of bolting on independent timers  
- animation apply/clear must cooperate with crossfade generation and hide/clear flows

### Pitfall 11: Editor Field Visibility Creates Impossible Runtime States

**What goes wrong:** UI exposes direction/intensity/duration in invalid combinations or leaves stale fields in saved JSON after effect type changes.

**Prevention:**  
- **Phase 63** should hide `direction` except for valid effects and clamp duration in setters  
- when switching effect type, preserve only compatible fields or tolerate extras safely at runtime

---

## Minor Pitfalls

### Pitfall 12: Defaulting Every Page to a Full `camera` Object Creates Noisy Saves

**What goes wrong:** Adding eager default camera payloads to every page bloats diffs and makes unknown-value preservation harder.

**Prevention:**  
- store `camera: null` by default  
- only materialize nested camera config when the user actually enables an effect

### Pitfall 13: Naming Drift Between Product, Schema, and CSS Causes Hidden Bugs

**What goes wrong:** Product copy says `zoom`, transition schema says `scale`, old data still says `slide-left`, CSS classes say something else, and preview messages use a fourth name.

**Prevention:**  
- freeze canonical names once per surface  
- document alias normalization only at the boundary  
- do not let UI labels leak into schema names

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 61 — Character preset animations | Transform collision with position/scale; loop classes survive page change; animation replay races with expression crossfade | Introduce clear transform ownership, extend per-character bookkeeping, add deterministic `_clearAnimation()` on hide/clear/replay |
| Phase 62 — Camera runtime | Shared root causes UI contamination; missing reset paths; multiple camera effects stack unpredictably | Build `CameraController` + shared reset helper first; one active effect at a time; explicit `clear()` used by replay/stop/title/load/end |
| Phase 63 — Editor config + preview | Preview/runtime divergence; unknown enum loss; silent preview failure when iframe not ready | Preview only via iframe runtime commands; preserve unknown values in selects; expose disabled reason instead of fallback preview |
| Phase 64 — Expanded transitions | Second transition system appears; legacy values break; transition preview leaves iframe in fake state | Extend `BackgroundLayer` only; normalize aliases at read boundary; snapshot/restore preview state with cancel tokens |
| Final regression | Milestone looks feature-complete but integration flows are still dirty | Run a fixed matrix: manual play, auto, skip, replay, preview stop, load, title return, end-of-game, legacy project open/save |

---

## Milestone Structure Implications

### Required ordering

1. **Phase 61 must solve character-layer ownership before adding more effects.**  
   If transform ownership is still fuzzy, every later phase compounds the problem.

2. **Phase 62 must land reset infrastructure, not just camera visuals.**  
   Camera without shared cleanup will create the most visible reliability bugs in the milestone.

3. **Phase 63 must consume frozen runtime contracts, never define them.**  
   If editor work starts before runtime contracts stabilize, unknown-enum handling and preview commands will churn.

4. **Phase 64 must integrate into the same page-enter lifecycle.**  
   Do not treat transitions as a side quest; they share cleanup/order guarantees with animation and camera.

### Recommended milestone gates

- **Gate after Phase 61:** prove character animation does not break center/custom positioning, scale, or expression crossfade
- **Gate after Phase 62:** prove replay/stop/title/load/end all fully clear stage state
- **Gate after Phase 63:** prove inspector preview uses runtime path and preserves unknown values on save
- **Gate after Phase 64:** prove legacy transitions still work and new transitions restore preview state correctly

### Integration test matrix this milestone must absorb

- open legacy project with unknown `animation` / `camera` / transition values  
- manual next-page flow with one-shot animation + camera  
- skip mode across pages with camera and loop animation  
- replay current page after a loop animation and flash  
- preview start → replay animation/camera/transition → stop preview  
- load save from a page that previously had active loop/camera  
- return to title immediately after a camera page  
- end-of-game return after cinematic page

---

## Compound Risks

- **Transform collision + weak cleanup:** hardest class of bug; even if effects look good once, they fail after replay/load/skip.
- **Unknown enum loss + GUI-first product:** users lose trust quickly if simply opening a project rewrites unsupported values.
- **Preview divergence + scope creep:** once preview is separate and feature surface keeps growing, v1.4 stops being a milestone and becomes platform debt.

## Sources

- Provided milestone context and requirements
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md`
- `docs/superpowers/plans/2026-04-21-v1.4-cinematic-upgrade.md`
- `docs/gap-analysis-vs-mature-engines.md`
- `.planning/PROJECT.md`
- Direct codebase analysis:
  - `src/ui/CharacterLayer.js`
  - `src/ui/BackgroundLayer.js`
  - `src/engine/ScriptEngine.js`
  - `src/main.js`
  - `src/editor/composables/usePageEditor.js`
  - `src/editor/components/page-editor/PageInspector.vue`
  - `src/editor/stores/script.js`
