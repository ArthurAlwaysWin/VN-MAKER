# Feature Landscape — Character Expression/Variant Scene Switching

**Domain:** Visual novel game editor — character expression picking & runtime switching
**Researched:** 2025-07-27

## Table Stakes

Features users expect when a VN editor offers "character expressions." Missing = feels broken or amateurish.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Visual expression picker (thumbnails)** | Every VN maker shows thumbnails, not text labels. Ren'Py is text-only but it's a scripting tool — GUI editors universally use thumbnail grids. TyranoBuilder, Visual Novel Maker, Naninovel all do this. | Low | Existing `CharacterPicker.vue` already renders thumbnail grid for *adding* characters. Inspector's per-character `<select>` (PageInspector L51-57) must upgrade to thumbnail dropdown. |
| **Per-page expression selection** | Core feature request. Users set which expression each character shows on each page. Every page-based VN editor supports this. | Low | Data model already exists: `page.characters[].expression` stores expression key. Only the picker UI needs upgrading from text `<select>` to thumbnail grid. |
| **Smooth expression transition (crossfade)** | Ren'Py `with dissolve`, TyranoBuilder crossfade, Naninovel fade — all standard. Instant image swap looks jarring, especially for whole-image sprites. | Med | `CharacterLayer.setExpression()` currently does bare `el.src = ...`. Need dual-`<img>` crossfade: old fades out, new fades in over ~300ms. |
| **Expression state inheritance across pages** | Ren'Py: `show` persists until next `show`/`hide`. Every VN engine does this — characters keep their expression until explicitly changed. Users shouldn't re-specify expression on every page. | Med | `ScriptEngine._renderPage()` already diffs character enter/exit. Need to track last-known expression per character and use it when page doesn't specify one (or specifies `null`). |
| **Default fallback expression** | When no expression is set and no previous state exists, show something sensible. Ren'Py uses the first defined image. TyranoBuilder uses `default` face. | Low | Use first key in `character.expressions` object as fallback. Already half-done: `CharacterPicker.watchEffect()` defaults to first expression. |
| **Mid-dialogue expression change** | Ren'Py: expression can change between dialogue lines. Already partially built — `dialogue.expression` field exists in data model and `ScriptEngine._playCurrentDialogue()` emits `set_expression`. | Low | Already wired. Needs: (1) thumbnail picker for dialogue expression too, (2) crossfade in engine's `set_expression` handler. |
| **Canvas preview reflects expression** | WYSIWYG promise — canvas must show current expression image. When user changes expression in inspector, canvas sprite updates immediately. | Low | `PageCanvas.getCharImage()` already reads `char.expression` → looks up path → shows image. Works today with text `<select>`. Will continue working with thumbnail picker since it writes same data. |

## Differentiators

Features that would elevate the product beyond basic expression switching. Not expected, but impressive.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Inline expression thumbnail on character row** | Instead of just text name, show tiny thumbnail next to character name in inspector row — instant visual confirmation of current expression without opening picker. | Low | Render 24×24 `<img>` in `.char-row` using same `asset://` path lookup. Trivial UI enhancement with high perceived quality. |
| **Expression change indicator in page thumbnail** | Scene tree sidebar page thumbnails could badge pages where expression changes occur, helping creators track visual flow. | Med | Requires computing diff between page N and N-1 expressions. Nice-to-have for page management. |
| **Configurable crossfade duration** | Let users control expression transition speed (0ms–1000ms) per page or globally. Ren'Py `with Dissolve(0.5)` exposes this. | Low | Add optional `expressionTransition.duration` to page data, fallback to a default (300ms). |
| **Expression tooltip preview on hover** | In expression picker, hovering a thumbnail shows a larger preview (200×200+). Helps with small thumbnails. | Low | CSS `:hover` + scaled tooltip. Standard pattern from asset pickers. |
| **Batch expression naming from filenames** | Import folder of PNGs → auto-derive expression names from filenames (e.g., `sakura_smile.png` → expression `smile`). | Med | Already partially exists: `Characters.vue` auto-generates path `characters/${id}_${exprName}.png`. Could reverse-map on import. |

## Anti-Features

Features to explicitly NOT build in v1.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Layered image composition** | PROJECT.md explicitly decided: "整图切换（非分层合成）— 每个状态一张完整立绘". Layering (body + face + eyes + mouth as separate layers) is complex, requires compositing pipeline, and doesn't match the "PPT-simple" philosophy. Ren'Py's `LayeredImage` is powerful but adds massive authoring complexity. | Whole-image switching. Each expression/variant is a complete sprite file. Flat `expressions` object handles it. |
| **Expression grouping / hierarchy** | PROJECT.md decided: "扁平式（所有差分/服装+表情组合都是同级表情条目）". Creating nested groups (costume → expression) adds UI complexity and data model changes. | Flat list. Costume variants are just more expression entries: `school_happy`, `school_sad`, `casual_happy`. Naming convention is the user's responsibility. |
| **Lip sync / blinking animation** | Requires frame-by-frame animation system or Live2D integration. Way beyond scope of a PPT-style editor. | Static expression images. Users can create blink/talk variants as separate expressions if desired. |
| **Live2D / Spine integration** | Industry-grade VN engines (Naninovel, Ren'Py with plugins) support this, but it requires entire animation rendering pipeline. Not aligned with "zero-code, PPT-simple" philosophy. | Whole-image sprites only. |
| **Side image portraits** | Small character face in dialogue box corner. Nice feature (Ren'Py supports it) but adds UI complexity to dialogue box system and requires generating/cropping portrait variants. | Defer to future milestone. Not needed for core expression switching. |
| **Per-expression custom transition type** | Different transitions per expression (dissolve for emotions, slide for poses). Over-engineering for PPT-simple editor. | Single crossfade for all expression changes. Consistent, predictable, good enough. |
| **Expression timeline / keyframes** | Frame-by-frame expression choreography within a page. This is animation editor territory (TyranoBuilder has a timeline). | One expression per character per page. Mid-dialogue changes via `dialogue.expression` handle the simple case. |

## Feature Dependencies

```
Thumbnail Expression Picker → asset:// path resolution (existing)
                            → script.data.characters[id].expressions (existing)
                            → CharacterPicker.vue thumbnail pattern (existing, reuse)

Crossfade Transition        → CharacterLayer.setExpression() (existing, modify)
                            → Dual <img> element technique (new)
                            → CSS transition or requestAnimationFrame (new)

State Inheritance           → ScriptEngine render-state tracking (existing _prevPageCharIds)
                            → New: _prevPageCharExpressions Map<string, string>
                            → Resolve expression: page explicit > inherited > first-key fallback

Editor Picker Integration   → PageInspector character row (existing, modify <select> → picker)
                            → PageInspector dialogue expression field (existing, modify)
                            → PageCanvas.getCharImage() (existing, no change needed)
```

## MVP Recommendation

Prioritize (must-have for v1.0):
1. **Thumbnail expression picker component** — Reusable dropdown/popover showing expression thumbnails for a given character. Used in both character-row and dialogue-expression contexts in PageInspector. Pattern: click current expression → popover opens with grid → click to select → popover closes. Copy layout from `CharacterPicker.vue` expr-grid.
2. **PageInspector integration** — Replace `<select>` at L51-57 (character row) and L118-124 (dialogue expression) with thumbnail picker. Both write to same data fields (`char.expression` and `dlg.expression`).
3. **Crossfade in CharacterLayer** — Modify `setExpression()` to create a new `<img>`, fade it in over old one, then remove old. ~300ms default duration. Keep `show()` fade-in as-is (already works for enter transitions).
4. **Expression state inheritance in ScriptEngine** — Track `_prevPageCharExpressions` Map alongside existing `_prevPageCharIds`. In `_renderPage()`, when a character's `expression` is null/undefined, use inherited expression. Fall back to first expression key if no history.

Defer:
- **Expression change indicator in page thumbnails** — Nice UX but not blocking. v1.1 polish.
- **Configurable crossfade duration** — Hardcode 300ms for v1.0. Add config later.
- **Batch import** — Asset management feature, not expression switching per se. Separate milestone.
- **Side image portraits** — Separate dialogue box feature, not expression switching.

## UX Patterns from Domain Analysis

### Expression Picker UX (Industry Standard)

**Pattern observed across TyranoBuilder, Visual Novel Maker, Naninovel Unity editor:**

1. **Thumbnail Grid Popover** — Click on current expression indicator → popover/dropdown opens showing all expressions as thumbnail grid → click to select → closes. Grid is typically 3-4 columns of 64-80px thumbnails.

2. **Current Selection Indicator** — The trigger element shows either: (a) a small thumbnail of current expression, or (b) expression name with colored background. Best: show both (tiny thumbnail + name).

3. **No Separate Modal** — Expression picking should NOT open a full-screen modal (unlike initial character *adding* which can be modal). It's a quick in-place switch, not a deliberation. Popover/dropdown anchored to the trigger element.

4. **Scrollable for Many Expressions** — When character has 10+ expressions, grid becomes scrollable with `max-height`. VN characters commonly have 6-15 expressions.

5. **Highlight Current** — Selected expression shows blue border / checkmark (this project already does this in CharacterPicker). Apply same pattern.

### Expression Transition UX (Engine Runtime)

**Pattern across Ren'Py, TyranoBuilder, Naninovel:**

1. **Crossfade (dissolve)** — Standard default. Old sprite fades out while new fades in simultaneously. Duration 200-500ms is typical. Ren'Py defaults to 0.2s dissolve for `show` changes.

2. **Position-preserving** — Expression change must NOT move the character. New sprite appears in exact same position/scale. This is trivial with whole-image switching but critical to get right.

3. **No transition for same-expression** — If expression doesn't change between pages, no visual effect. Engine already does this implicitly via diffing (`wasVisible` check in `_renderPage()`).

4. **Mid-dialogue is instant or very fast** — When expression changes within a dialogue sequence (between lines), transition should be faster (~150ms) than page-level changes. Some engines skip transition entirely for mid-dialogue. Ren'Py: expression change before dialogue text is instant by default.

### State Inheritance UX

**Universal pattern:**

1. **Sticky state** — Character retains expression from last explicit set until changed. "Show once, persists forever."

2. **Explicit override only** — Page data only needs `expression` when it *differs* from previous. Missing/null = "keep current."

3. **Scene boundary reset** — When entering a new scene, expression history resets. Each scene starts fresh.

4. **Editor preview must match** — Canvas should show inherited expression visually. If page doesn't set expression, canvas still shows what engine would render (the inherited one). This requires editor-side inheritance computation.

## Sources

- Existing codebase analysis (direct inspection, HIGH confidence):
  - `CharacterPicker.vue` — thumbnail grid pattern for expressions
  - `PageInspector.vue` L47-67 — current text-only expression `<select>`
  - `PageInspector.vue` L116-124 — dialogue expression `<select>`
  - `ScriptEngine.js` — `_renderPage()` character diffing, `_playCurrentDialogue()` expression events
  - `CharacterLayer.js` — `setExpression()` instant swap, `show()` with fade transitions
  - `Characters.vue` — expression data structure (`{name: path}` flat object)
- VN maker industry patterns (training data, MEDIUM confidence):
  - Ren'Py character sprite system (show/with dissolve, LayeredImage, persistent state)
  - TyranoBuilder chara_mod tag and expression thumbnail UI
  - Naninovel character expression management
  - Visual Novel Maker expression configuration panels
- PROJECT.md key decisions (direct inspection, HIGH confidence):
  - Flat data model decision
  - Whole-image switching decision
  - Thumbnail grid selector pattern decision
