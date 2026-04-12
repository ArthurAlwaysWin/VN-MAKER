# Domain Pitfalls — Character Expression/Variant Switching

**Domain:** Adding character expression/variant switching to existing Galgame Maker (visual novel engine + editor)
**Researched:** 2025-01-20
**Overall confidence:** HIGH — based on direct codebase analysis of CharacterLayer.js, ScriptEngine.js, scanAssets.js, exportGame.js, exportDesktop.js, PageInspector.vue, CharacterPicker.vue, PageCanvas.vue, BackgroundLayer.js, and main.js

---

## Critical Pitfalls

Mistakes that cause rewrites, broken exports, or data loss.

---

### Pitfall 1: Crossfade Flicker — Instant `src` Swap on `<img>` Element

**What goes wrong:** The current `CharacterLayer.setExpression()` does a simple `el.src = newPath` on the existing `<img>` element (line 109, CharacterLayer.js). When switching expression, the browser blanks the image while loading the new one, producing a visible flicker — especially on larger images (1000px+ tall character sprites). There is no crossfade; the old expression vanishes instantly and the new one pops in after a decode delay.

**Why it happens:** Unlike `BackgroundLayer.js` which uses a **dual-layer A/B crossfade pattern** (lines 13–24, two `<div>` elements alternating opacity), `CharacterLayer` uses a single `<img>` per character. The browser cannot crossfade from old src to new src on the same element.

**Consequences:** Expression changes look broken — momentary blank frame, no smooth transition. Users will perceive the feature as unpolished.

**Prevention:** Adopt the same dual-element crossfade strategy that `BackgroundLayer.js` already uses. For each character slot, maintain **two** overlapping `<img>` elements (or an outgoing + incoming pair). On expression change:
1. Set the incoming element's `src` to the new expression image
2. Wait for the image `onload` event before starting the transition
3. Fade incoming to `opacity: 1`, outgoing to `opacity: 0`
4. After transition completes, remove the outgoing element

**Detection:** Test with large (2000×3000px) PNG character sprites. If you see a white/blank flash between expressions, the crossfade is broken.

**Phase:** Must be addressed in engine implementation phase (CharacterLayer.js rewrite).

---

### Pitfall 2: scanAssets Already Covers Characters — But Stale Page References Escape Undetected

**What goes wrong:** The export pipeline's `scanAssets()` (lines 51–55) iterates `Object.values(script.characters).expressions` to collect character image paths. This is correct for the **character definitions** but does NOT cross-reference against per-page `page.characters[].expression` values. If a page references an expression key that was deleted from the character definition (stale data), the image path won't be found and the asset won't be exported — silent missing asset in the exported game.

**Why it happens:** scanAssets scans the character registry (global definitions), not the page-level references. A user can delete an expression from the character editor while pages still reference the old expression key.

**Consequences:** Exported game has missing character images. The engine shows `show_character` with an empty `image` string (line 335, ScriptEngine.js: `charDef?.expressions?.[char.expression] || ''`), resulting in a broken `<img>` with no src. No error in the editor — only discovered after export.

**Prevention:**
1. **scanAssets is sufficient IF expression keys are validated** — the real fix is ensuring pages can't reference nonexistent expressions. Add validation when deleting an expression: scan all pages for references and either warn or auto-migrate to fallback.
2. **Defense in depth:** In the engine's `_renderPage()`, when `image` is empty string, either skip the character or fall back to the character's first expression.
3. The export pipeline should also emit a warning (it already does for missing files — line 162 of exportGame.js) but the path would be empty string, which won't match any file.

**Detection:** Delete a character expression that's used on a page, export, check for warnings.

**Phase:** Data migration / validation phase — add expression key validation on delete. Engine phase — add first-expression fallback.

---

### Pitfall 3: Expression Inheritance State Not Saved — Save/Load Breaks Expression Continuity

**What goes wrong:** The design calls for "expression state inheritance" — carry expression from previous page, fallback to first. But `ScriptEngine.getState()` (line 154) only saves `{ currentScene, pageIndex, dialogueIndex, variables, history }`. It does NOT save the **current expression state per character**. After save → load, the engine calls `replayCurrentPage()` which re-renders the page from its static data. If the current page doesn't explicitly set an expression (relying on inheritance from a previous page), the loaded state will show the wrong expression.

**Why it happens:** Expression inheritance is a **runtime computed state** — it depends on the sequence of pages visited. Save/load skips that sequence and jumps directly to a page. The page data only stores an expression if the user explicitly set one; inherited expressions exist only in the engine's runtime tracking.

**Consequences:** After loading a save, characters may show wrong expressions (first expression instead of the inherited one). This is a subtle, hard-to-reproduce bug because it only manifests when:
1. Page N sets expression to "angry"
2. Pages N+1, N+2 don't override expression (inherit "angry")
3. Save on page N+2
4. Load → engine renders page N+2 with no expression override → falls back to first expression instead of "angry"

**Prevention:** Two approaches (choose one):
- **Option A (recommended):** Store per-page expression explicitly. When the user doesn't pick an expression, compute the inherited expression at edit-time and store it in the page data. This eliminates the runtime inheritance problem entirely.
- **Option B:** Add `characterExpressions: { [charId]: expressionKey }` to the engine's save state (`getState()`). On restore, apply these as initial expression states. This requires modifying `restoreState()` and `renderCurrentPage()`.

Option A is simpler and matches the "PPT page = self-contained visual state" philosophy already used by the editor.

**Detection:** Save game mid-sequence where expressions were inherited, load, compare character appearances.

**Phase:** Data model design phase — decide on explicit vs. runtime inheritance. Engine phase — implement save state extension if using Option B.

---

### Pitfall 4: Export Pipelines — Stale Expression References Produce Broken Images

**What goes wrong:** Both `exportGame.js` and `exportDesktop.js` share the same asset copy logic (lines 151–167 / 94–110). They copy all paths returned by `scanAssets()`. For character images, `scanAssets` already collects ALL expression paths from `characters{}.expressions{}`. So every expression image file gets exported regardless of whether it's used on any page. This is actually **correct behavior** — all assets should be available.

The real export pitfall is in the **engine's runtime path resolution**: `ScriptEngine._renderPage()` line 335 does `charDef?.expressions?.[char.expression] || ''`. In the exported game, `charDef` comes from the exported `script.json`. If the page's `char.expression` key doesn't match any key in the exported character definition, the image path is empty string, and `CharacterLayer.show()` will set `el.src = basePath + ''` — loading the base path itself as an image (broken).

**Consequences:** Silent broken image in exported game, no error in editor.

**Prevention:**
1. Add a validation pass before export that checks every `page.characters[].expression` against the character's `expressions{}` keys.
2. Engine fallback: if expression lookup returns empty, use the first available expression.
3. ExportModal could show validation warnings before proceeding.

**Detection:** Export a project where a page references a deleted expression key. Check browser console for image 404s.

**Phase:** Export/validation phase — add pre-export validation. Engine phase — add fallback.

---

### Pitfall 5: Crossfade Z-Order — New Expression Image Renders Behind or On Top of Other Characters

**What goes wrong:** During crossfade transition between expressions, if you use two overlapping `<img>` elements for the same character, the incoming image may render at a different z-order than the outgoing one. With multiple characters on screen, this can cause Character A's incoming expression to appear behind Character B during the transition, then jump in front when the transition completes.

**Why it happens:** `CharacterLayer` uses `container.appendChild(el)` to add characters. DOM order = visual stacking order. If the crossfade creates a new `<img>` element and appends it, it goes to the end of the DOM — on top of ALL other characters, not just on top of its own outgoing image.

**Consequences:** Visual glitch during expression transitions — characters briefly appear in wrong z-order.

**Prevention:** The crossfade elements (incoming/outgoing) must be **siblings within a per-character wrapper `<div>`**, not direct children of `#character-layer`. Structure:
```
#character-layer
  └── .char-wrapper[data-id="hero"]     ← positioned, handles x/y/scale
      ├── img.outgoing (opacity → 0)
      └── img.incoming (opacity → 1)
  └── .char-wrapper[data-id="heroine"]
      ├── img.outgoing
      └── img.incoming
```
This way, crossfade images are stacked within their wrapper and never interfere with other characters' z-order.

**Detection:** Place 3 characters on screen. Change expression on the middle character. Watch if it briefly jumps in front of or behind the others.

**Phase:** Engine implementation phase — CharacterLayer.js architecture change.

---

### Pitfall 6: Image Preloading — Expression Change Blocked on Network/Disk Load

**What goes wrong:** When the engine calls `setExpression()`, it sets `el.src = newPath`. If the image isn't cached, the browser fetches it from disk (Electron `asset://` protocol) or network (web export). During this fetch, the image is blank. For crossfade, the incoming image would fade in while still loading, showing a blank overlay that then pops to the actual image.

**Why it happens:** Character sprites are often 500KB–3MB PNG files. First load from disk takes 50–200ms (Electron) or 200ms+ (web). The crossfade transition starts immediately without waiting for the image to decode.

**Consequences:** First expression change for each image shows a blank-to-visible pop instead of a smooth crossfade. Subsequent changes are fine (browser cache). Particularly bad on web exports with slow hosting.

**Prevention:**
1. **Preload on page enter:** When `_renderPage()` fires for a page, preload ALL expression images for characters on that page (not just the current expression). Use `new Image(); img.src = path;` to prime the browser cache.
2. **Wait for `onload` before starting crossfade:** The crossfade transition must not begin until `img.onload` fires on the incoming image. Set `opacity: 0` initially, wait for load, then animate.
3. **Preload next page's expressions** during dialogue advancement (while user is reading text on current page, preload the next page's character images in the background).

**Detection:** Clear browser cache, load a game, advance to a page with a character that changes expression. Watch for blank flash.

**Phase:** Engine implementation phase — add preloading logic. Can be a separate utility function.

---

## Moderate Pitfalls

---

### Pitfall 7: Per-Dialogue Expression Change + Page-Level Expression — Double Event Confusion

**What goes wrong:** The engine currently supports TWO expression change mechanisms:
1. **Page-level:** `page.characters[].expression` — set when page renders (line 335, ScriptEngine.js)
2. **Dialogue-level:** `dialogue.expression` — set mid-dialogue (lines 380–386, ScriptEngine.js emits `set_expression`)

If a page sets character A's expression to "happy", then dialogue 3 changes it to "angry", the engine correctly shows "happy" → "angry" during playback. But the **inheritance logic** needs to track that the character's expression is now "angry" (from the dialogue), not "happy" (from the page). If the next page inherits expression, it should inherit "angry".

**Prevention:** The expression inheritance tracker must update on BOTH page-level and dialogue-level expression changes. Track `lastKnownExpression[charId]` and update it:
- On `show_character` event: set to `data.expression`
- On `set_expression` event: set to `data.expression`
- On `hide_character` event: clear entry

**Phase:** Engine implementation phase — expression state tracking.

---

### Pitfall 8: CharacterPicker Already Stores Expression — But PageInspector Select is Text-Only

**What goes wrong:** The current `PageInspector.vue` (line 52–56) shows expression selection as a plain `<select>` dropdown with text options. The milestone design calls for a **thumbnail grid dropdown**. If you add thumbnail grid for the page-level expression but forget the dialogue-level expression change (line 118, also a `<select>`), you'll have inconsistent UIs — thumbnails in one place, text in another.

**Prevention:** Create a reusable expression selector component (e.g., `ExpressionDropdown.vue`) that shows thumbnail grid, and use it in BOTH:
1. `PageInspector.vue` character row (line 52) — page-level expression
2. `PageInspector.vue` dialogue editor (line 118) — dialogue-level expression change

The existing `CharacterPicker.vue` already has the thumbnail grid UI (lines 16–26, `.expr-grid` with `.expr-thumb`). Extract that pattern into the reusable component.

**Phase:** Editor UI phase — build reusable component first, then integrate in both locations.

---

### Pitfall 9: Memory Pressure — Many Large Character Images in DOM

**What goes wrong:** Visual novel characters are typically full-body sprites: 1000×2500px to 2000×4000px PNGs, 500KB–4MB each. A character with 10 expression variants = 5MB–40MB of image data. With 5 characters × 10 expressions = 50–200MB of images. If the engine or editor loads all expressions for all characters into DOM/memory at once, it causes:
- Editor: slow CharacterPicker rendering (50+ thumbnails loading simultaneously)
- Engine: memory pressure on web export (mobile browsers may OOM)

**Prevention:**
- **Engine:** Only keep the currently displayed expression `<img>` in DOM. The crossfade pattern naturally handles this — after transition, remove the outgoing `<img>`. Browser cache handles re-fetching.
- **Editor thumbnails:** Use `loading="lazy"` on thumbnail `<img>` elements. Render thumbnails at small size (64×64 or 80×80) — the browser will still fetch full image but CSS constrains display.
- **Consider future optimization:** For projects with 20+ expressions per character, implement thumbnail generation in the asset import pipeline (resize to 128×128 on import, store as separate thumb files). NOT in v1.0 scope — just don't create architecture that prevents it later.

**Phase:** Engine phase — ensure old expression elements are removed after crossfade. Editor phase — add `loading="lazy"` to thumbnail grids.

---

### Pitfall 10: Undo/Redo Snapshot Granularity for Expression Changes

**What goes wrong:** The script store's undo system (script.js lines 13–25) does `JSON.parse(JSON.stringify(data.value))` for every pushState(). The character expressions object `characters{}.expressions{}` contains file paths (strings), not image data, so adding more expressions only adds a few bytes per expression. However, if expression SELECTION on pages is stored per-page (which it should be), and users frequently change expressions while editing, the undo stack (50 snapshots max) fills with nearly-identical large objects where only one expression key differs.

**This is actually a LOW-risk pitfall** because the current undo system already handles this pattern (every page property change triggers pushState), and script.json is text-only (no binary data). 50 snapshots of a typical script.json (~100KB) = ~5MB, well within memory budget.

**Prevention:** No special action needed for v1.0. Just ensure expression changes call `pushState()` at the right granularity — on dropdown selection commit, not on every hover/preview.

**Phase:** Editor phase — ensure pushState() is called on expression commit, not on preview hover.

---

### Pitfall 11: `asset://` Protocol Caching Behavior Differs from HTTP

**What goes wrong:** The Electron `asset://` custom protocol may have different caching semantics than standard HTTP. When the same expression image is referenced multiple times (e.g., character appears on 20 pages with same expression), the browser-within-Electron may or may not cache the response. If not cached, each page transition re-reads the file from disk.

**Also:** When a user REPLACES an expression image file on disk (re-imports with same filename), the `asset://` protocol serves the new file but the browser may display the old cached version in the editor.

**Prevention:**
- For the engine runtime: `asset://` responses should include appropriate `Cache-Control` headers. Verify Electron's protocol handler returns `200 OK` with standard caching.
- For the editor: when re-importing an expression image, bust the cache by appending `?t=timestamp` to the `asset://` URL in the `<img>` src. The resource library `CharacterEditor.vue` currently doesn't do this.

**Phase:** Integration/polish phase — verify caching, add cache-busting on re-import.

---

## Minor Pitfalls

---

### Pitfall 12: Expression Name Collision on Rename — Stale Page References

**What goes wrong:** `CharacterEditor.renameExpression()` (line 385) already checks for duplicates. But `PageInspector`'s expression `<select>` uses expression names as `<option value>`. If a user renames an expression in the resource library while pages reference the old name, those page references become stale (pointing to a nonexistent expression key).

**Prevention:** When renaming an expression, scan all pages in all scenes and update `page.characters[].expression` and `dialogue.expression` references from old name to new name. Add a `renameExpressionGlobal(charId, oldName, newName)` function to the script store.

**Phase:** Data integrity phase — add global rename propagation.

---

### Pitfall 13: First Expression Fallback — Object Key Order Dependency

**What goes wrong:** The design says "fallback to first expression." The current code uses `Object.keys(char.expressions)[0]` to get the "first" expression (CharacterPicker.vue line 59). In JavaScript, object key order is preserved for string keys in insertion order (ES2015+), but this is a fragile dependency — if expressions are re-ordered or the object is reconstructed from JSON, the "first" key may change unexpectedly.

**Prevention:**
- Accept that insertion order is the contract (it's reliable in modern JS engines and JSON.parse preserves it).
- OR define a `defaultExpression` field on the character definition (e.g., `characters.hero.defaultExpression = 'normal'`). This makes the fallback explicit rather than implicit.
- For v1.0, insertion order is fine — just document it. Adding `defaultExpression` is a nice-to-have.

**Phase:** Data model design phase — decide whether to add `defaultExpression` field.

---

### Pitfall 14: Editor Canvas Preview vs. Engine Rendering Mismatch

**What goes wrong:** `PageCanvas.vue` `getCharImage()` (line 156) resolves character images via `script.data.characters[char.id].expressions[char.expression]`. The engine's `ScriptEngine._renderPage()` does the same (line 335). These are independent code paths. If expression inheritance logic is added to the engine but NOT mirrored in the editor canvas, the editor will show one expression (literal page data) while the engine shows another (inherited expression).

**Prevention:** If implementing runtime inheritance (Option B from Pitfall 3), the editor canvas must also resolve inherited expressions. This means `PageCanvas.getCharImage()` needs to walk backward through previous pages to find the last set expression — mimicking the engine's runtime state.

If implementing explicit storage (Option A from Pitfall 3), this pitfall disappears because both editor and engine read the same explicit field.

**Phase:** Editor phase — ensure canvas preview matches engine behavior.

---

### Pitfall 15: Skip Mode + Crossfade — Transition Duration Must Be 0

**What goes wrong:** The main.js skip mode handling (lines 193–207) already overrides character transitions to `duration: 0, transition: 'none'` during skip. But the new crossfade for expression changes (`set_expression` event) is currently handled without skip awareness (line 209: `engine.on('set_expression', (data) => characters.setExpression(data))`). If crossfade is added to `setExpression()`, skip mode won't suppress it.

**Prevention:** Apply the same skip-mode pattern to expression changes:
```js
engine.on('set_expression', (data) => {
  if (skipMode) {
    characters.setExpression({ ...data, duration: 0 });
    return;
  }
  characters.setExpression(data);
});
```

**Detection:** Enable skip mode, advance through pages with expression changes. If there's a visible transition delay, skip mode isn't suppressing crossfade.

**Phase:** Engine integration phase — update skip mode handler.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Data model design | **Pitfall 3** — Inheritance vs. explicit storage decision | Critical | Decide early: Option A (explicit per-page) simplifies everything downstream |
| Data model design | **Pitfall 13** — First expression fallback fragility | Minor | Consider `defaultExpression` field on character definition |
| Engine CharacterLayer rewrite | **Pitfall 1** — Crossfade flicker from single `<img>` | Critical | Dual-element crossfade with wrapper `<div>` per character |
| Engine CharacterLayer rewrite | **Pitfall 5** — Z-order during crossfade | Critical | Per-character wrapper div, not flat children of #character-layer |
| Engine CharacterLayer rewrite | **Pitfall 6** — Image preloading | Critical | Wait for `onload` before starting crossfade animation |
| Engine expression events | **Pitfall 7** — Dual expression change sources | Moderate | Track expression state on both `show_character` and `set_expression` |
| Engine skip mode | **Pitfall 15** — Skip doesn't suppress crossfade | Minor | Add skip-aware handler for `set_expression` |
| Engine save/load | **Pitfall 3** — Expression state lost on save/load | Critical | Either store explicitly or extend save state |
| Editor UI — expression selector | **Pitfall 8** — Inconsistent UI (thumbnails vs. text) | Moderate | Build reusable ExpressionDropdown component first |
| Editor — expression rename | **Pitfall 12** — Stale references after rename | Moderate | Global rename propagation across all pages |
| Editor canvas preview | **Pitfall 14** — Canvas vs. engine mismatch | Moderate | Eliminated if using explicit expression storage |
| Export pipeline | **Pitfall 2, 4** — Stale expression refs in export | Critical | Pre-export validation + engine fallback |
| Memory / performance | **Pitfall 9** — Large images in memory | Moderate | Remove outgoing elements after crossfade, lazy-load thumbnails |
| Asset protocol | **Pitfall 11** — Cache stale after re-import | Minor | Cache-busting query param on re-import |
| Undo/redo | **Pitfall 10** — Snapshot granularity | Low | pushState on commit, not preview |

## Interaction Matrix — How Pitfalls Compound

Several pitfalls interact and can compound into worse problems:

- **Pitfall 1 + 6:** Crossfade without preloading = blank crossfade (fade from old to blank to new). Must solve both together.
- **Pitfall 3 + 7:** Inheritance broken if dialogue-level expression changes aren't tracked in save state.
- **Pitfall 2 + 4 + 12:** Stale expression references cascade through rename → export → runtime. Fix at source (rename propagation) to prevent downstream issues.
- **Pitfall 5 + 9:** Per-character wrapper divs solve z-order AND provide natural cleanup point for memory management (remove old `<img>` from wrapper after crossfade).

## Key Recommendation

**Use explicit expression storage (Option A from Pitfall 3).** This single decision eliminates or simplifies Pitfalls 3, 7, 14, and parts of 2/4. When each page stores the resolved expression for every character (even if inherited), all consumers (editor canvas, engine, save/load, export) read the same data without needing to compute inheritance at runtime. The cost is minor data redundancy in script.json, which is negligible for string values.

## Sources

- Direct codebase analysis — all line references verified against actual source files
- CharacterLayer.js (single `<img>` pattern, no crossfade)
- BackgroundLayer.js (dual-layer crossfade pattern — reference implementation)
- ScriptEngine.js (`_renderPage` expression resolution, `getState` save data)
- scanAssets.js (character asset collection logic)
- exportGame.js / exportDesktop.js (asset copy pipeline)
- PageInspector.vue (current expression `<select>` UI)
- CharacterPicker.vue (thumbnail grid pattern)
- PageCanvas.vue (`getCharImage` resolution)
- main.js (skip mode handlers, save/load wiring)
- style.css (character sprite CSS transitions)
