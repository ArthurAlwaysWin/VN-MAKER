# Feature Landscape — v1.5 UI 图片驱动体系

**Domain:** Image-driven VN UI theming for a no-code visual novel maker  
**Milestone:** v1.5  
**Researched:** 2026-04-22  
**Confidence:** HIGH for milestone scope and current product fit; MEDIUM for broader “mature engine” expectation baseline

## Milestone Goal

v1.5 should make creators feel: **“I can skin the game UI with art assets, not just tweak software-like CSS.”**

For this product, the right cut line is:

- **GUI-first, slot-based, previewable**
- **Theme skinning, not freeform UI programming**
- **Image assets as the primary visual channel**
- **Strictly focused on in-game UI, not long-term plugin/extensibility**

---

## Table Stakes by Feature Category

## 1) Dialogue Box Image Customization

These are the minimum user-facing capabilities needed for the dialogue box to stop feeling like a tinted software panel.

| Capability | Why users expect it | Complexity | Notes |
|---|---|---:|---|
| **Separate image slot for nameplate background** | Mature VN UIs commonly treat the nameplate as its own art element, not just text on top of the box. | Medium | Must work with existing `inline / floating / banner` nameplate modes. |
| **Dialogue box main background can be replaced by art** | The dialogue box is the most visible UI element in a VN; if it stays CSS-like, the whole game still feels tool-made. | Medium | Support full replacement through image/nine-slice, not color-only styling. |
| **At least one additional decoration layer on top of or around the dialogue box** | Corners, flourishes, trim, light streaks, and separators are where “commercial VN polish” comes from. | High | Must not be limited to the current single `::before` nine-slice layer. |
| **Text-safe layout survives image skinning** | No-code users should not manually re-debug padding/readability after adding art. | Medium-High | Text area, indicator, and name placement need stable safe zones. |
| **Instant preview of dialogue art in editor** | Users must see the effect on a sample line immediately. | Medium | Preview should show speaker name + sample text, not only a static thumbnail. |

### Recommendation

Treat dialogue box imageization as **three explicit slots**: **main box art**, **nameplate art**, **decoration overlay(s)**. That is simple enough for GUI users and wide enough to unlock real VN aesthetics.

### Nice Differentiators

| Differentiator | Value Proposition | Complexity | Notes |
|---|---|---:|---|
| **Multiple decoration layers with ordering controls** | Lets users stack corner ornaments + center trim + glow without code. | High | Valuable only after one-layer decoration is stable. |
| **Independent preview toggles for nameplate/background/decor** | Makes editing faster when diagnosing clutter. | Low-Med | Good UX win for the editor. |
| **Preset art-safe padding templates** | Helps novice users avoid unreadable text when using ornate frames. | Medium | Example: compact / balanced / ornate. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Freeform dialogue box compositor/canvas editor** | Too much scope for v1.5; turns a skinning milestone into a layout tool rewrite. | Use fixed slots with bounded position/size controls where needed. |
| **Per-scene/per-page dialogue skin switching** | Adds state complexity and makes theme management harder for no-code users. | Keep v1.5 at project/theme-level UI skinning. |
| **Automatic image slicing/magic frame detection** | Nice idea, but unreliable and time-consuming to polish. | Let users supply explicit image assets and slice values. |

### Dependency Notes

- Depends on extending current dialogue box config beyond font/nameplate text settings.
- Depends on a reusable image-slot data model the editor can manage.
- Preview depends on runtime-backed rendering, not a fake mockup.

---

## 2) Wider Button Image States

This category closes the biggest “still looks like software” gap outside the dialogue box.

| Capability | Why users expect it | Complexity | Notes |
|---|---|---:|---|
| **Image-backed button states for major in-game buttons beyond choice/title** | Mature VN tools support themed buttons across all major menus, not just one or two special cases. | Medium-High | Must explicitly cover `game-menu-button`, `save-load-close`, `backlog-close`, `qab-btn`, pagination/tab-style buttons, and similar primary controls. |
| **At least `normal / hover / pressed` states for clickable buttons** | Static buttons immediately feel unfinished once the rest of the UI is image-driven. | Medium | This is the baseline state model for v1.5. |
| **Selected/current-state support for tab-like buttons where needed** | Page tabs and current-page indicators need a persistent active look, not only press feedback. | Medium | Keep this limited to controls that truly have an active state. |
| **Text/icon overlay remains centered and readable over custom art** | Users expect to replace the art, not rebuild alignment manually. | Medium | Important for non-rectangular or highly decorated buttons. |
| **Consistent preview across all affected screens** | If users cannot verify hover/pressed states quickly, they will underuse the feature. | Medium | Preview should show state switching, not only the default image. |

### Recommendation

Define button skinning by **button family**, not by every individual DOM class. Users should think in terms of **menu button**, **close button**, **quick bar button**, **tab/pager button**, not implementation details.

### Nice Differentiators

| Differentiator | Value Proposition | Complexity | Notes |
|---|---|---:|---|
| **State-copy helpers** | Speeds up creation when hover/pressed art is similar to normal art. | Low | Example: duplicate normal → hover, then tweak. |
| **Preview state switcher in editor** | Lets users inspect all states without manually hovering the iframe. | Low-Med | Strong UX win. |
| **Shared button family presets** | Makes it easy to apply one style to many buttons consistently. | Medium | Useful after family taxonomy is stable. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Per-button bespoke state schema** | Hard to learn, hard to test, and fights the no-code product promise. | Use a small set of button families with shared fields. |
| **Arbitrary polygon hit areas** | Technically possible, but not worth the complexity for this milestone. | Keep normal rectangular hit targets even if art is irregular. |
| **Dozens of rare state types** (`focused`, `visited`, `warning`, etc.) | Adds QA cost without meaningful value for VN menu UI. | Ship `normal / hover / pressed / selected(where needed)` only. |

### Dependency Notes

- Depends on expanding nine-slice/image-state support beyond current `choiceButton` and `titleButton`.
- Depends on identifying a stable set of button families used across Save/Load, Backlog, GameMenu, Settings, and QAB.
- Depends on editor preview that can expose hover/pressed/selected states intentionally.

---

## 3) Full-Screen Background Illustrations + Decoration Layers for Non-Title Screens

This is the feature that makes Save/Load, Backlog, GameMenu, and Settings feel like real game screens rather than app overlays.

| Capability | Why users expect it | Complexity | Notes |
|---|---|---:|---|
| **Per-screen full-screen background illustration** | Mature VN UIs usually give each major menu screen a dedicated illustrated backdrop. | Medium | Must cover SaveLoad, Backlog, GameMenu, and Settings. Title is already out of scope for this milestone. |
| **Per-screen decoration layer support** | Background art alone is not enough; corner ornaments, separators, and ambient overlays provide the “finished” feel. | Medium-High | At least one reusable decoration layer model should exist across screens. |
| **Decoration layers stay separate from functional content** | Users want to style the screen without breaking buttons, slots, or settings controls. | Medium | Decorations should not require manual DOM hacking. |
| **Screen-specific preview in the editor** | Users need to inspect each screen in its real runtime context. | Medium | Existing iframe screen preview infrastructure is a strong base. |
| **Readability protection over busy art** | Full-screen illustrations can easily reduce legibility. | Medium | Keep content panes/headers/buttons readable without requiring art editing skills. |

### Recommendation

Use a **shared screen art model** across all non-title game screens: **background illustration + optional decoration elements + existing layout/content config**. Do not invent a separate theming system for each screen.

### Nice Differentiators

| Differentiator | Value Proposition | Complexity | Notes |
|---|---|---:|---|
| **Shared decoration element schema across screens** | Users learn one mental model and reuse it everywhere. | Medium | Strong editor consistency benefit. |
| **Decoration visibility toggle in preview** | Helps authors separate “art problem” from “layout problem”. | Low | Especially useful for dense settings screens. |
| **Screen-level art presets** | Quick-start for novice users who want “framed backlog” or “ornate save/load” without full manual setup. | Medium | Valuable, but not required for v1.5. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Full title-screen-style free placement editor for every screen** | Too much UI/editor scope for this milestone. | Keep screen layouts structured; add bounded decoration/image slots. |
| **Animated/parallax decoration system** | Changes the milestone from skinning to motion design. | Keep v1.5 decoration static. |
| **Per-screen theme inheritance graph or advanced override logic** | Too abstract for current users and too risky for roadmap speed. | Use direct per-screen config with sensible theme defaults. |

### Dependency Notes

- Depends on reusing/extending the current screen layout config objects.
- Depends on a shared decoration-element schema, not ad hoc fields per screen.
- Depends on editor preview being able to jump directly into each screen.

---

## 4) Custom Cursor and Icon Sets

Small assets, big perceived polish. This should be real but bounded.

| Capability | Why users expect it | Complexity | Notes |
|---|---|---:|---|
| **Project/theme-level custom cursor support for gameplay UI** | The default system cursor breaks immersion once the rest of the UI is heavily themed. | Medium | Apply to runtime game UI, not the editor chrome. |
| **At least separate cursor visuals for default and clickable states** | Users expect clickable UI to feel intentionally themed, not globally flattened. | Medium | Keep scope narrow; VN UI rarely needs a full desktop cursor suite. |
| **Theme-replaceable icon set for core UI actions** | Emoji/SVG placeholders are the wrong visual language for image-driven themes. | Medium | Must cover the main recurring icons used in QAB and menu-related controls. |
| **Fallback behavior when some cursor/icon assets are missing** | No-code users should be able to theme incrementally without breaking usability. | Low-Med | Missing assets should fall back cleanly to built-ins. |
| **Preview in editor** | Users need to verify scale and style coherence quickly. | Medium | Especially important for icons used across multiple screens. |

### Recommendation

Keep this intentionally narrow: **default cursor + clickable cursor + core icon slots for recurring UI actions**. That delivers the polish benefit without dragging v1.5 into full OS-style cursor pack territory.

### Nice Differentiators

| Differentiator | Value Proposition | Complexity | Notes |
|---|---|---:|---|
| **Cursor hotspot controls** | Prevents “click point feels off” problems with decorative pointers. | Medium | Valuable if cursor art is a real milestone priority. |
| **Icon set preview grid** | Lets authors judge consistency at a glance. | Low | Strong editor-side affordance. |
| **One-click apply icon set across all mapped actions** | Good for speed and consistency. | Low-Med | Helpful once slot mapping is stable. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Full OS cursor suite support** (`text`, `resize`, `move`, etc.) | Not needed for a VN runtime and adds unnecessary complexity. | Support only the few cursor states relevant to in-game UI. |
| **Editable vector icon authoring inside the editor** | Wrong product layer; this is an asset assignment milestone, not a drawing tool. | Let users import ready-made icon images. |
| **Editor UI theming with the same cursor/icon system** | Different problem, different risk, not part of the milestone. | Restrict v1.5 to exported game/runtime UI. |

### Dependency Notes

- Depends on a stable icon slot registry for recurring actions.
- Depends on asset management UI that can show small-image previews well.
- Cursor support should be project/theme scoped, not scattered per screen.

---

## 5) Editor-Side Visual Asset Management + Live Preview

This is the make-or-break category. Without it, the rest becomes “paste image paths into fields,” which is wrong for this product.

| Capability | Why users expect it | Complexity | Notes |
|---|---|---:|---|
| **Central UI asset management surface in the editor** | A no-code theme feature fails if users must remember file paths manually. | High | Must manage dialogue assets, button states, screen backgrounds, decorations, cursors, and icons in one coherent place. |
| **Thumbnail-based asset picking and replacement** | Users think visually, not by filename. | Medium-High | Reuse existing asset library where possible, but surface UI-specific slots clearly. |
| **Live runtime-backed preview for dialogue and target screens** | Trust is critical: what users see while editing must match the game. | High | Existing iframe preview patterns are the correct foundation. |
| **Slot-oriented editing, not raw JSON/path editing** | Product positioning is GUI-first and no-code. | Medium | Users should edit “Dialogue nameplate image”, not `ui.theme.dialogueBox.nameplate.backgroundImage`. |
| **Fast iteration workflow** (replace asset → immediately see result) | Image-driven UI work is trial-and-error; friction kills usage. | High | Low-latency preview matters more than extra fields. |

### Recommendation

Build the editor UX around **visual slot assignment** and **real preview**, not around exposing config structure. v1.5 succeeds only if a creator can treat UI theming like swapping art in a design tool.

### Nice Differentiators

| Differentiator | Value Proposition | Complexity | Notes |
|---|---|---:|---|
| **Unassigned/missing asset warnings in the UI panel** | Helps users understand why a theme feels incomplete. | Low | Great fit for no-code UX. |
| **Reuse indicators** (“this image is used by 4 slots”) | Prevents accidental side effects when editing theme assets. | Medium | Useful once slot count grows. |
| **Mini preview gallery per slot family** | Makes comparing button states or icon sets much faster. | Medium | Strong productivity enhancement. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Raw path-input-first workflow** | Technically easy, but wrong for product positioning and too error-prone. | Use pickers, thumbnails, and clear slot labels. |
| **Theme/package import-export overhaul in v1.5** | Important later, but it shifts focus away from making the core image pipeline actually usable. | Defer `.gmtheme` format expansion to v1.6 as already planned. |
| **Plugin/extensibility hooks for custom asset slot types** | Explicitly outside milestone focus. | Hardcode the v1.5 slot set and revisit later. |

### Dependency Notes

- Depends on a unified asset-slot schema across dialogue, buttons, screens, cursor, and icons.
- Depends on the existing `assets.ui` library and iframe preview infrastructure.
- Should land early in implementation because every other v1.5 feature is harder to validate without it.

---

## Cross-Category Feature Dependencies

```text
Shared UI image-slot schema
  → Dialogue box image slots
  → Button family state slots
  → Screen background/decor slots
  → Cursor/icon slots
  → Editor-side visual asset manager

Runtime-backed preview hooks
  → Dialogue preview
  → Button state preview
  → Screen-specific preview
  → Cursor/icon preview confidence

Shared decoration element model
  → Dialogue decorations
  → SaveLoad / Backlog / GameMenu / Settings decorations

Button family taxonomy
  → Wider image states rollout
  → Icon slot mapping
```

---

## Complexity Notes

| Area | Complexity | Why |
|---|---:|---|
| Dialogue box imageization | Medium-High | Needs multi-part art support without breaking text layout. |
| Wider button states | Medium-High | Broad surface area across many existing controls. |
| Screen backgrounds + decorations | Medium | Existing screen config/preview systems reduce risk. |
| Cursor + icon sets | Medium | Small scope if kept bounded; risky only if overexpanded. |
| Editor asset management + preview | High | Core UX surface; touches every other category. |

---

## MVP Recommendation for v1.5

Prioritize in this order:

1. **Editor-side visual asset management + live preview**
2. **Dialogue box image customization**
3. **Wider button image states**
4. **Full-screen backgrounds + decoration layers for non-title screens**
5. **Custom cursor + icon sets**

### Why this order

- The editor workflow is the enabling layer; without it, the milestone becomes path-editing instead of no-code theming.
- The dialogue box is the most visible UI element, so it carries the biggest perception win.
- Buttons are the second-biggest “software feel” culprit and need broad but bounded rollout.
- Screen backgrounds/decor benefit from existing screen preview architecture and should reuse the same art-slot model.
- Cursor/icons are high polish but should stay the smallest scoped category.

---

## Explicit Deferrals / Exclusions for v1.5

| Deferred / Excluded | Why |
|---|---|
| **Complete theme package format upgrade / community sharing flow** | Planned for v1.6; not needed to prove the image-driven system itself. |
| **Shipping 5 complete art-heavy built-in themes** | Content production belongs after the pipeline is stable. |
| **Plugin/extensibility architecture for custom UI asset types** | Outside milestone scope and explicitly not the focus. |
| **Per-page or per-scene UI skin switching** | Adds complexity before the base theme pipeline is stable. |
| **Animated decoration, parallax, timeline-driven UI FX** | Turns a skinning milestone into an effects milestone. |
| **Vector/icon editor, image optimizer, auto-slicing tools** | Helpful later, but not required to deliver the core capability. |

---

## Sources

- `E:\projects\my-awesome-project\.planning\PROJECT.md` — current milestone goal, active scope, product positioning
- `E:\projects\my-awesome-project\docs\gap-analysis-vs-mature-engines.md` — mature-engine gap framing and v1.5 target categories
- `E:\projects\my-awesome-project\src\engine\ThemeManager.js` — current nine-slice coverage and current button limitations
- `E:\projects\my-awesome-project\src\ui\DialogueBox.js` — current nameplate modes and dialogue styling baseline
- `E:\projects\my-awesome-project\src\ui\SaveLoadScreen.js` / `src\ui\BacklogScreen.js` — current per-screen background/layout capabilities
- `E:\projects\my-awesome-project\src\editor\composables\useThemeEditor.js` / `useScreenLayoutEditor.js` — current preview architecture
- `E:\projects\my-awesome-project\src\editor\stores\assets.js` — existing `ui` asset library foundation

## Confidence Notes

- **High confidence** on milestone cut line, required categories, and what should be deferred: directly supported by `PROJECT.md` and gap analysis.
- **High confidence** on current product strengths and enabling infrastructure: supported by current editor/runtime source.
- **Medium confidence** on broader “table stakes” wording versus external market practice: based on internal mature-engine comparison rather than fresh external ecosystem research.
