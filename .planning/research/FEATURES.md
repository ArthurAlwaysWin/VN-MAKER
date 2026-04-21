# Feature Research — v1.4 演出力升级

**Milestone:** v1.4 cinematic presentation upgrade  
**Product context:** No-code / visual / PPT-style Galgame maker  
**Focus:** User-facing behavior for character animations, page camera effects, transition variety, and editor preview UX  
**Researched:** 2026-04-21  
**Confidence:** MEDIUM-HIGH

## Milestone Goal

v1.4 should make creators feel: **“I can add commercial-VN-style motion and punch without writing code or learning an animation system.”**

For users, **done** should feel like:

- Characters are no longer static cutouts; they can enter, react, and feel alive.
- A page can have a clear “camera moment” without becoming a full timeline tool.
- Background/page changes no longer all look the same.
- The editor preview is trustworthy: what creators preview is basically what exports.

---

## v1.4 Cut Line

### Must ship in v1.4

1. **Per-character preset animation selection**
2. **Single page-level camera effect on page enter**
3. **Expanded built-in transition set**
4. **GUI configuration + reliable runtime-backed preview**

### Explicitly later

- Freeform animation language
- Timeline / curve / keyframe editor
- Multi-effect choreography per page
- Particle/weather systems
- Asset-dependent cinematic packs
- Theme-driven animation systems

---

## Table Stakes — Must-Have Behaviors for v1.4

## 1) Character Preset Animations

These are the minimum behaviors needed for creators to feel the character layer has basic VN “life”.

| Behavior | Why users expect it | Complexity | Done should feel like | Scope note |
|---|---|---:|---|---|
| **Choose one animation preset per character on a page** | Mature VN tools all support at least basic entrance/emphasis motion. | Low | Creator picks an animation from a dropdown; no code, no hidden setup. | Must-have v1.4 |
| **Preset list covers both entrance and emphasis** (`fade-in`, `slide-in-left`, `slide-in-right`, `shake`, `nod`, `breathe`, optional `bounce`) | Users expect more than only “fade”. They need both “comes in” and “reacts”. | Low | A shy entrance, a surprised shake, a subtle idle breathe are all one click away. | Must-have v1.4 |
| **One-shot vs looping behavior is automatic** | GUI-first users should not manage animation lifecycle manually. | Medium | `breathe` stays alive while the page is active; `shake` finishes and stops by itself. | Must-have v1.4 |
| **Animation replays cleanly when previewed again** | Users will iterate rapidly; replay must be reliable. | Medium | Clicking replay always gives a fresh, obvious result instead of stacking weird motion. | Must-have v1.4 |
| **Animations clean up on page leave / fast navigation** | Mature engines feel stable under auto/skip; amateur tools leave visual residue. | Medium | Fast-forwarding never leaves a sprite stuck shaking or offset. | Must-have v1.4 |
| **Unknown/legacy values do not silently break projects** | Existing projects must remain safe as the editor evolves. | Medium | Old pages still open; unsupported values are visible but don’t corrupt data. | Must-have v1.4 |

### Recommendation

Treat the character animation feature as **preset selection only**, not “animation authoring”. That is the correct match for this product’s no-code promise.

---

## 2) Page-Level Camera Effects

Camera effects are the main short-term realism gap vs mature VN engines, but they must stay page-centric and bounded.

| Behavior | Why users expect it | Complexity | Done should feel like | Scope note |
|---|---|---:|---|---|
| **One camera effect can be configured per page** | VN creators expect a page to have a cinematic accent, not a full scene rig. | Medium | A page can shake for impact, zoom for intimacy, pan for reveal, or flash for hit/emphasis. | Must-have v1.4 |
| **Supported effects are small but high-value** (`shake`, `zoom`, `pan`, `flash`) | These cover most common VN presentation beats without overbuilding. | Medium | Creators can already do “surprise”, “dramatic reveal”, “focus push”, “impact flash”. | Must-have v1.4 |
| **Controls stay simple and GUI-friendly** (`duration`, `intensity`, `direction` when relevant) | Users want results, not dozens of parameters. | Low | Camera setup feels like picking a preset with a few sensible knobs. | Must-have v1.4 |
| **Camera triggers on page enter only** | Fits the page-based editor model and avoids hidden temporal complexity. | Low | “When this page appears, play this camera beat” is easy to understand. | Must-have v1.4 |
| **Only one camera effect active at a time** | Prevents chaotic stacking and keeps preview/export predictable. | Medium | Users never wonder why zoom + shake + pan fought each other. | Must-have v1.4 |
| **Camera effects never damage dialogue/UI readability** | VN users tolerate motion only if text remains readable and controls stay stable. | Medium | Dramatic, but not nauseating; menu/dialogue still feel anchored and usable. | Must-have v1.4 |

### Recommendation

Use camera as a **single page accent**, not a sequencing system. This is enough to close the biggest “game feel” gap without creating a new sub-language.

---

## 3) Transition Variety

More transitions matter because repetitive page changes make every scene feel mechanically identical.

| Behavior | Why users expect it | Complexity | Done should feel like | Scope note |
|---|---|---:|---|---|
| **Transition list expands beyond `none / fade / slide`** | Three options is below market expectation for VN presentation. | Low | Creators can choose a transition that matches scene tone instead of reusing fade everywhere. | Must-have v1.4 |
| **New transitions are visibly distinct and understandable** (`dissolve`, `wipe`, `scale`, `blur`) | More options only help if users can predict the look from the name. | Medium | Each option feels meaningfully different in preview. | Must-have v1.4 |
| **Transitions remain page-based, not a separate subsystem** | Users already think in pages; do not introduce another mental model. | Low | Transition is just another page setting, not a timeline step. | Must-have v1.4 |
| **Transitions play in a predictable order with character/camera effects** | Mature-feeling tools avoid layered chaos. | Medium | Old page clears → transition plays → new page appears → character motion → camera beat. | Must-have v1.4 |
| **Previewing a transition does not force real navigation** | Creators need to test the feel quickly while editing the current page. | Medium | “Preview transition” shows the effect once, then returns to the page. | Must-have v1.4 |

### Recommendation

Shipping **7 total transition choices** is enough for v1.4. Do not chase dozens of named variants yet.

---

## 4) Editor Configuration + Preview UX

This is the make-or-break area. Even good runtime effects will underperform if setup and preview feel unreliable.

| Behavior | Why users expect it | Complexity | Done should feel like | Scope note |
|---|---|---:|---|---|
| **All cinematic controls live in the existing page editing flow** | Users should not switch tools or enter a special “animation mode”. | Low | Character animation, camera, and transition settings are where users already edit page content. | Must-have v1.4 |
| **Each effect type has a clear preview/replay button** | Users need confirmation without running the full game flow. | Medium | Click once, see the exact effect, click again to replay from a clean state. | Must-have v1.4 |
| **Runtime-backed iframe preview is the authority** | Fake canvas previews create trust problems. | Medium | If it looks right in preview, users trust export will match. | Must-have v1.4 |
| **Disabled preview states explain why** | Silent failure feels broken in GUI products. | Low | If preview isn’t available, the UI says why. | Must-have v1.4 |
| **Preview always restores the current editing state afterward** | Authors must never lose place or accidentally mutate page state during preview. | Medium | After preview, the editor is exactly where it was before. | Must-have v1.4 |
| **Unknown values are preserved instead of auto-reset to `none`** | Requirements authoring must protect forward/backward compatibility. | Medium | Opening an older/newer project never silently erases cinematic settings. | Must-have v1.4 |

### Recommendation

For this milestone, **preview reliability is part of the feature**, not polish. If preview is flaky, users will underuse the whole cinematic upgrade.

---

## Useful Differentiators — Valuable, but Not Required for v1.4

These are strong follow-ups once the bounded preset model is stable.

| Category | Differentiator | Value | Complexity | Why later |
|---|---|---|---:|---|
| Character animation | **Preset combo macros** (example: “slide-in + breathe”) | Lets creators get richer motion without custom authoring. | High | Breaks the clean “one preset per slot” model; better after v1.4 stabilizes. |
| Character animation | **Per-character default idle animation** | Speeds up setup for recurring cast. | Medium | Needs inheritance UX and clear override rules. |
| Camera | **Reusable camera presets / favorites** | Great for repeatability across long projects. | Low-Med | UX convenience, not core capability. |
| Camera | **Flash color choice** (white/black) | Useful tonal control for impact and memory scenes. | Low | Nice polish once base flash is proven. |
| Transitions | **Directional variants for wipe/slide** | Adds expression without adding new categories. | Medium | Should come after the base 7 transitions are stable and well-labeled. |
| Preview UX | **One-click “preview full page cinematic”** | Plays transition + character + camera together for confidence. | Medium | Nice synthesis feature; not needed before individual previews work well. |
| Preview UX | **Copy/paste cinematic settings between pages** | Big productivity win for no-code authors. | Low-Med | Better after data contracts settle. |

---

## Anti-Features — Do Not Build in v1.4

| Anti-feature | Why avoid | What to do instead |
|---|---|---|
| **Freeform animation language / ATL-style scripting** | Powerful, but it violates the milestone goal of low learning cost and bounded scope. | Ship a curated preset library. |
| **Timeline / keyframe / curve editor** | Turns a high-ROI milestone into a new platform project. | Keep animation and camera page-triggered and preset-based. |
| **Multiple camera effects chained on one page** | High conflict risk, unclear UI, hard-to-trust preview. | Allow one page-level camera effect only. |
| **Per-property animation knobs** (x/y/scale/rotation/easing etc.) | Too many controls for a GUI-first maker; users will spend time tweaking instead of authoring. | Expose only duration/intensity/direction where justified. |
| **Canvas-only fake previews** | Creates mismatch with exported runtime and destroys trust. | Use iframe runtime preview as the single source of truth. |
| **Effect systems that depend on new art assets** | Slows the milestone and changes the problem from “presentation motion” to “content pipeline”. | Limit v1.4 to CSS/transform/overlay style effects. |
| **Huge transition list with subtle differences** | Choice overload; hard to label and harder to QA. | Ship a small, distinct set of transitions. |
| **Continuous cinematic state spanning multiple pages** | Hidden state is hard to reason about in a PPT/page model. | Reset and replay effects page by page. |

---

## Feature Dependencies

```text
Character preset catalog
  → Character animation dropdown
  → Character replay button
  → Safe cleanup on page leave / skip

Page camera contract
  → Camera configuration UI
  → Camera preview button
  → Single-effect replacement rules

Expanded transition enum
  → Transition dropdown expansion
  → Transition preview button
  → Clear effect ordering with animation/camera

Runtime-backed iframe preview
  → Trustworthy replay for animation / camera / transition
  → Explicit disabled/error states
  → Preview state restore
```

## Complexity Notes by Area

| Area | Complexity | Why |
|---|---:|---|
| Character preset selection | Low | Mostly bounded enum UX. |
| Character lifecycle cleanup | Medium | Must survive fast navigation and repeat preview. |
| Camera effect UI | Low | Small number of fields. |
| Camera runtime predictability | Medium | Must avoid conflicts with other transforms and keep UI readable. |
| Transition expansion | Medium | Easy to add options badly; harder to keep them distinct and stable. |
| Preview UX | Medium-High | Biggest trust surface; state reset and failure messaging matter. |

---

## Recommended Requirement Shape for v1.4

### Must-have requirements

1. **Character animations**
   - User can select one preset animation per character on a page.
   - At least 6 stable presets are available; 7 is preferred.
   - Looping vs one-shot behavior is automatic.
   - Replay is available from the editor.

2. **Camera effects**
   - User can configure one page-level camera effect.
   - Supported effects: shake, zoom, pan, flash.
   - Controls are limited to effect type, duration, intensity, and direction when relevant.
   - Camera plays on page enter only.

3. **Transitions**
   - User can choose from at least 7 total transition types.
   - New transitions are visually distinct and previewable.
   - Transition ordering with animation/camera is stable and predictable.

4. **Editor preview**
   - All cinematic features are configurable in the normal page editing UI.
   - Preview/replay is runtime-backed, explicit, cancelable, and state-restoring.
   - Unsupported values are visible and preserved, not silently erased.

### Defer requirements

- Combination animation authoring
- Multi-camera choreography
- Custom timing graphs
- Visual timeline editor
- Per-project/global animation policy tools

---

## “Done” Checklist for User Experience

v1.4 is truly done when a creator can:

1. Open a page,
2. Pick a character animation from a dropdown,
3. Add a camera beat for that page,
4. Choose a more expressive transition,
5. Click preview and immediately understand the result,
6. Export and see essentially the same behavior in the game.

If users still say **“it technically has animations, but it still feels static / hard to trust / too fiddly”**, the milestone is not done.

---

## Sources

- `.planning/PROJECT.md` — current milestone, product positioning, active scope
- `docs/gap-analysis-vs-mature-engines.md` — mature-engine expectation baseline and short-term gap framing
- `docs/superpowers/plans/2026-04-21-v1.4-cinematic-upgrade.md` — phase breakdown and intended implementation shape
- `docs/superpowers/specs/2026-04-21-v1.4-cinematic-upgrade-design.md` — explicit scope, behavioral constraints, preview contract, acceptance direction

## Confidence Notes

- **High confidence** on v1.4 scope boundaries and intended behavior: backed by milestone plan/spec.
- **Medium confidence** on “mature VN engine expectations”: based on internal comparative analysis rather than fresh external market verification.
