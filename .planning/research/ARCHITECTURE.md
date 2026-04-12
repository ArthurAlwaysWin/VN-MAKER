# Architecture Patterns — Character Expression/Variant Switching

**Domain:** Expression/variant scene switching in Galgame Maker (visual novel editor + runtime engine)
**Researched:** 2025-07-27
**Confidence:** HIGH — based entirely on direct codebase inspection of existing integration points

## Executive Summary

Character expression switching integrates into an established page-based architecture where the editor (Vue 3 + Pinia) and engine (pure JS + DOM) communicate through a shared `script.json` data model. The existing code already has most scaffolding — `page.characters[].expression` field, `CharacterLayer.setExpression()`, `ScriptEngine._playCurrentDialogue()` expression change events — but lacks **crossfade transitions**, **expression state inheritance**, and a **visual thumbnail picker** in the inspector. The architecture changes are surgical: ~4 modified files, ~1 new component, no new libraries.

## Recommended Architecture

### Integration Map — What Changes Where

```
┌─────────────── EDITOR (Vue 3 + Pinia) ───────────────┐
│                                                        │
│  script.js store        — No changes needed            │
│  usePageEditor.js       — No changes needed            │
│  CharacterPicker.vue    — No changes needed (already   │
│                           picks expression on add)     │
│                                                        │
│  PageInspector.vue      — MODIFY: replace <select>     │
│    ├─ Char expression     with ExpressionPicker        │
│    └─ Dialogue expression  inline thumbnail picker     │
│                                                        │
│  ExpressionPicker.vue   — NEW: thumbnail grid popover  │
│                                                        │
│  PageCanvas.vue         — MODIFY: resolve inherited    │
│                           expression for display       │
│                                                        │
├─────────────── DATA MODEL (script.json) ──────────────┤
│                                                        │
│  characters[id].expressions  — No changes (flat map    │
│    { exprName: "characters/file.png" }    is correct)  │
│                                                        │
│  page.characters[]      — expression field already     │
│    { id, expression, x, y, scale }    exists.          │
│    NEW SEMANTIC: null/undefined = "inherit from        │
│    previous page" (was previously always explicit)     │
│                                                        │
│  page.dialogues[]       — expression field already     │
│    { speaker, text, expression, voice }    exists.     │
│    No changes to schema.                               │
│                                                        │
├─────────────── ENGINE (Pure JS) ──────────────────────┤
│                                                        │
│  ScriptEngine.js        — MODIFY: track per-character  │
│    _prevPageExpressions   expression state, resolve    │
│    Map<charId, exprName>  inheritance, detect changes  │
│                                                        │
│  CharacterLayer.js      — MODIFY: crossfade in         │
│    setExpression()        setExpression() using dual-   │
│                           <img> technique               │
│                                                        │
│  style.css              — MODIFY: add .expr-crossfade  │
│                           transition rules              │
│                                                        │
│  main.js                — MODIFY: pass crossfade       │
│                           data through set_expression  │
│                           event, skip-mode handling     │
│                                                        │
│  scanAssets.js          — No changes (already scans    │
│                           characters[id].expressions)  │
└────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Action | Communicates With |
|-----------|---------------|--------|-------------------|
| **PageInspector.vue** (modify) | Expression selection UI for characters + dialogues | Replace `<select>` with ExpressionPicker | ExpressionPicker, script store |
| **ExpressionPicker.vue** (new) | Thumbnail grid popover for expression selection | Emit selected expression name | PageInspector, script store |
| **PageCanvas.vue** (modify) | Resolve displayed expression (with inheritance) | Add `resolveCharExpression()` helper | script store, usePageEditor |
| **ScriptEngine.js** (modify) | Track expression state, diff across pages, resolve inheritance | Add `_prevPageExpressions` Map, modify `_renderPage()` | CharacterLayer via events |
| **CharacterLayer.js** (modify) | Crossfade expression changes | Dual-`<img>` technique in `setExpression()` | DOM, CSS transitions |
| **style.css** (modify) | Crossfade animation rules | Add `.expr-incoming` / `.expr-outgoing` classes | CharacterLayer |
| **main.js** (modify) | Wire expression crossfade events, skip-mode awareness | Extend `set_expression` handler | ScriptEngine, CharacterLayer |

### Data Flow

#### A. Page Render — Expression Resolution

```
ScriptEngine._renderPage(page)
  │
  ├─ For each char in page.characters[]:
  │   │
  │   ├─ char.expression is set?
  │   │   ├─ YES → resolvedExpr = char.expression
  │   │   └─ NO  → resolvedExpr = _prevPageExpressions.get(char.id)
  │   │             └─ still null? → resolvedExpr = first key of characters[id].expressions
  │   │
  │   ├─ Was this character visible on prev page?
  │   │   ├─ YES, same expression → no event (skip redundant update)
  │   │   ├─ YES, different expression → emit 'set_expression' { id, expression, image, crossfade: true }
  │   │   └─ NO → emit 'show_character' { id, expression, image, ... } (entrance transition)
  │   │
  │   └─ _prevPageExpressions.set(char.id, resolvedExpr)
  │
  └─ _prevPageCharIds = currentCharIds (existing logic)
```

#### B. Mid-Dialogue Expression Change

```
ScriptEngine._playCurrentDialogue()
  │
  ├─ dlg.expression && dlg.speaker?
  │   ├─ YES → emit 'set_expression' { id, expression, image, crossfade: true }
  │   │         _prevPageExpressions.set(dlg.speaker, dlg.expression)
  │   └─ NO  → no expression change
  │
  └─ emit 'dialogue' { speaker, text, voice, ... }
```

#### C. CharacterLayer Crossfade

```
CharacterLayer.setExpression({ id, expression, image, crossfade, duration })
  │
  ├─ Get existing <img> element from this.characters Map
  │
  ├─ crossfade && duration > 0?
  │   │
  │   ├─ Create new <img> clone, position identically
  │   ├─ Set new img.src = basePath + image
  │   ├─ Set old img.style.opacity = 0 (CSS transition handles fade)
  │   ├─ Set new img.style.opacity = 1
  │   ├─ After transition ends: remove old <img>, store new in Map
  │   │
  │   └─ (Same dual-element pattern as BackgroundLayer crossfade)
  │
  └─ No crossfade?
      └─ el.src = basePath + image (instant swap, existing behavior)
```

## Detailed Integration Points

### 1. Data Model Extension

**Current `page.characters[]` item:**
```js
{ id: "char_1", expression: "normal", position: "custom", x: 640, y: 200, scale: 1 }
```

**New semantic (no schema change):**
- `expression: "happy"` → explicit expression for this page
- `expression: null` or `expression: undefined` → inherit from previous page (NEW)
- Inheritance chain: previous page → first expression key (final fallback)

**Why no schema change:** The `expression` field already exists. Adding inheritance semantics (`null` = inherit) is a runtime behavior change in ScriptEngine, not a data format change. Existing projects where every page character has explicit expression set continue to work identically.

**Backward compatibility:** Existing script.json files always have explicit `expression` values (CharacterPicker.confirmAdd() sets it). Inheritance only kicks in for pages created after this feature, where the user explicitly clears the expression field or where state-carry is desired.

### 2. ScriptEngine.js Changes

**New state field:**
```js
constructor() {
  // ... existing fields ...

  /** @type {Map<string, string>} Last resolved expression per character */
  this._prevPageExpressions = new Map();
}
```

**Modified `_resetRenderState()`:**
```js
_resetRenderState() {
  this._prevPageCharIds = new Set();
  this._prevPageExpressions = new Map(); // ← ADD
  this._currentBgmFile = null;
  this._currentBg = null;
}
```

**Modified `_renderPage(page)` — character block:**
```js
// Show/update characters on this page
for (const char of (page.characters || [])) {
  const charDef = this.script.characters[char.id];
  const wasVisible = this._prevPageCharIds.has(char.id);

  // ── Expression resolution (NEW) ──
  let resolvedExpr = char.expression;
  if (!resolvedExpr) {
    resolvedExpr = this._prevPageExpressions.get(char.id);
  }
  if (!resolvedExpr) {
    const exprKeys = Object.keys(charDef?.expressions || {});
    resolvedExpr = exprKeys[0] || 'normal';
  }

  const prevExpr = this._prevPageExpressions.get(char.id);
  const expressionChanged = wasVisible && prevExpr && prevExpr !== resolvedExpr;

  // ── Emit events ──
  if (expressionChanged) {
    // Character already visible, expression changed → crossfade
    this.emit('set_expression', {
      id: char.id,
      expression: resolvedExpr,
      image: charDef?.expressions?.[resolvedExpr] || '',
      crossfade: true,
      duration: 300,
    });
  }

  // Always emit show_character for position/scale updates
  this.emit('show_character', {
    id: char.id,
    expression: resolvedExpr,
    position: char.position || 'center',
    x: char.x,
    y: char.y,
    scale: char.scale ?? 1,
    transition: wasVisible ? 'none' : 'fade',
    duration: wasVisible ? 0 : 500,
    image: charDef?.expressions?.[resolvedExpr] || '',
  });

  this._prevPageExpressions.set(char.id, resolvedExpr);
}
```

**Modified `_playCurrentDialogue()` — expression change:**
```js
if (dlg.expression && dlg.speaker) {
  const charDef = this.script.characters[dlg.speaker];
  this.emit('set_expression', {
    id: dlg.speaker,
    expression: dlg.expression,
    image: charDef?.expressions?.[dlg.expression] || '',
    crossfade: true,    // ← ADD
    duration: 300,      // ← ADD
  });
  this._prevPageExpressions.set(dlg.speaker, dlg.expression); // ← ADD
}
```

**Modified `getState()` / `restoreState()` — save expression state:**
```js
getState() {
  return {
    currentScene: this.currentScene,
    pageIndex: this.pageIndex,
    dialogueIndex: this.dialogueIndex,
    variables: Object.fromEntries(this.variables),
    history: [...this.history],
    expressions: Object.fromEntries(this._prevPageExpressions), // ← ADD
  };
}

restoreState(state) {
  // ... existing ...
  this._prevPageExpressions = new Map(
    Object.entries(state.expressions || {})  // ← ADD
  );
}
```

### 3. CharacterLayer.js Crossfade

**Modified `setExpression()` — dual-image crossfade:**
```js
/**
 * Change a character's expression with optional crossfade
 * @param {Object} data — { id, expression, image, crossfade, duration }
 */
setExpression(data) {
  const el = this.characters.get(data.id);
  if (!el) return;

  const newSrc = this.basePath + data.image;

  // Instant swap (existing behavior) when no crossfade requested
  if (!data.crossfade || !data.duration) {
    el.src = newSrc;
    return;
  }

  // ── Dual-image crossfade ──
  const duration = data.duration || 300;

  // Clone the outgoing image as a fading-out overlay
  const outgoing = el.cloneNode(false);
  outgoing.classList.add('expr-outgoing');
  outgoing.style.transitionDuration = `${duration}ms`;
  el.parentNode.insertBefore(outgoing, el.nextSibling);

  // Update the main element (incoming)
  el.src = newSrc;
  el.style.opacity = '0';

  // Trigger crossfade on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transitionDuration = `${duration}ms`;
      el.style.opacity = '1';
      outgoing.style.opacity = '0';
    });
  });

  // Clean up outgoing element after transition
  setTimeout(() => {
    outgoing.remove();
    el.style.transitionDuration = '';
  }, duration + 50);
}
```

**Why dual-image (not src swap):** Changing `<img>.src` causes a flash — the browser clears the old image before the new one renders. Dual-image crossfade (same pattern as BackgroundLayer's A/B layers) overlaps old and new for smooth blending. The outgoing clone is a temporary disposable element.

### 4. CSS Additions (style.css)

```css
/* Expression crossfade — outgoing clone */
.character-sprite.expr-outgoing {
  transition-property: opacity;
  transition-timing-function: ease-in-out;
  pointer-events: none;
  z-index: -1;  /* behind the incoming sprite */
}
```

The incoming sprite's opacity transition is set inline by `setExpression()`. No additional CSS class needed — the existing `.character-sprite` base styles handle positioning.

### 5. ExpressionPicker.vue Component

**Pattern:** Follows existing thumbnail grid popover pattern from CharacterPicker.vue's expression grid.

```
┌────────────────────────────────┐
│  选择表情             ✕        │
├────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐      │
│ │ img │ │ img │ │ img │      │
│ │     │ │  ✓  │ │     │      │
│ └─────┘ └─────┘ └─────┘      │
│ normal   happy    angry       │
│                                │
│ ┌─────┐ ┌─────┐              │
│ │ img │ │ img │              │
│ │     │ │     │              │
│ └─────┘ └─────┘              │
│  sad      思考                │
│                                │
│  ☑ 继承上一页 (清除显式选择)   │
└────────────────────────────────┘
```

**Props:**
```js
props: {
  characterId: String,     // Which character's expressions to show
  modelValue: String,      // Current expression name (v-model)
  allowInherit: Boolean,   // Show "inherit" checkbox (true for page chars, false for dialogue)
}
emits: ['update:modelValue']
```

**Implementation strategy:** Reuse the exact thumbnail card styling from CharacterPicker.vue's `.expr-grid` / `.expr-thumb` classes. The component is a small popover (position: absolute, triggered by clicking the current expression thumbnail in PageInspector).

### 6. PageInspector.vue Changes

**Character expression section (line ~51-57) — replace `<select>` with thumbnail picker:**

Current code:
```html
<select :value="char.expression"
  @change="setCharExpression(idx, $event.target.value)"
  @click.stop class="mini-select">
  <option v-for="(_, expr) in getCharExpressions(char.id)" :key="expr" :value="expr">
    {{ expr }}
  </option>
</select>
```

Replace with:
```html
<ExpressionPicker
  :character-id="char.id"
  :model-value="char.expression"
  :allow-inherit="true"
  @update:model-value="setCharExpression(idx, $event)" />
```

**Dialogue expression section (line ~117-124) — replace `<select>` with thumbnail picker:**

Current code:
```html
<select :value="selectedDialogue.expression || ''"
  @change="setDialogueExpression($event.target.value)" class="field-input">
  <option value="">（不变）</option>
  <option v-for="..." :value="expr">{{ expr }}</option>
</select>
```

Replace with:
```html
<ExpressionPicker
  v-if="selectedDialogue.speaker && isCharId(selectedDialogue.speaker)"
  :character-id="selectedDialogue.speaker"
  :model-value="selectedDialogue.expression || null"
  :allow-inherit="false"
  @update:model-value="setDialogueExpression($event)" />
```

### 7. PageCanvas.vue — Expression Inheritance for Preview

**Modified `getCharImage()` to resolve inherited expressions for WYSIWYG display:**

```js
function getCharImage(char) {
  let expr = char.expression;

  // Inheritance resolution for canvas preview
  if (!expr) {
    expr = resolveInheritedExpression(char.id);
  }
  if (!expr) {
    const exprKeys = Object.keys(script.data?.characters?.[char.id]?.expressions || {});
    expr = exprKeys[0] || null;
  }

  const path = script.data?.characters?.[char.id]?.expressions?.[expr];
  return path ? resolveAsset(path) : null;
}

/**
 * Walk backwards through pages to find the most recent explicit expression
 * for a character. Used for editor canvas preview only.
 */
function resolveInheritedExpression(charId) {
  const scene = editor.currentScene.value;
  if (!scene?.pages) return null;

  const currentIdx = editor.selectedPageIndex.value;
  for (let i = currentIdx - 1; i >= 0; i--) {
    const pageChar = scene.pages[i].characters?.find(c => c.id === charId);
    if (pageChar?.expression) return pageChar.expression;
  }
  return null;
}
```

### 8. main.js Wiring Changes

**Modified `set_expression` handler (line 209):**

Current:
```js
engine.on('set_expression', (data) => characters.setExpression(data));
```

Updated:
```js
engine.on('set_expression', (data) => {
  if (skipMode) {
    // Instant swap during skip — no crossfade
    characters.setExpression({ ...data, crossfade: false, duration: 0 });
    return;
  }
  characters.setExpression(data);
});
```

## Patterns to Follow

### Pattern 1: Dual-Element Crossfade (Proven)

**What:** Use two overlapping DOM elements to crossfade between states, disposing the outgoing element after transition.

**When:** Any visual transition where `src` swap causes a flash.

**Why:** This exact pattern already works in `BackgroundLayer.js` (layerA/layerB). It's proven in the codebase, has no library dependency, and handles edge cases (rapid switching, cleanup).

**Difference from BackgroundLayer:** BackgroundLayer permanently keeps 2 layers and toggles. CharacterLayer creates a temporary clone because characters have independent positioning that must be preserved. The clone approach is simpler for per-character elements.

### Pattern 2: Engine-Side State Tracking (Not Editor-Side)

**What:** Expression inheritance logic lives in `ScriptEngine._prevPageExpressions`, not in the editor's data model.

**When:** Any feature where "carry forward from previous page" semantics are needed.

**Why:**
- The editor data model stays clean — `null` means "inherit", not "I haven't decided"
- Engine already tracks `_prevPageCharIds` and `_currentBgmFile` with identical diff semantics
- Save/restore naturally captures expression state via `getState()`/`restoreState()`
- Editor canvas preview resolves inheritance separately with a simple backward walk (it has the full page list)

### Pattern 3: Opt-in Crossfade via Event Data

**What:** The `set_expression` event carries `crossfade: true/false` and `duration` as optional fields. CharacterLayer checks these to decide behavior.

**When:** Always — keeps the API backward-compatible.

**Why:** Allows ScriptEngine and main.js to control crossfade behavior per-event. Skip mode passes `crossfade: false` for instant transitions. Future features (like per-character transition settings) only need to modify the event data, not the CharacterLayer API.

### Pattern 4: Thumbnail Grid Popover (Established UI Pattern)

**What:** ExpressionPicker uses the same thumbnail grid design as CharacterPicker's expression cards.

**When:** Any picker that selects from a visual set of options.

**Why:** CharacterPicker already has this UI with `.expr-grid`, `.expr-thumb`, `.expr-img-wrap`, `.expr-name`, `.check-badge` styles. Users are already familiar with it. Extract as reusable component rather than duplicating.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Layered Compositing (Face + Body + Clothes)

**What:** Splitting character art into layers (base body, face overlay, clothing overlay) and compositing at runtime.
**Why bad:** The project decision is explicit: "整图切换（非分层合成）— 每个状态一张完整立绘". Layered compositing adds Canvas2D/WebGL dependency, complicates the asset pipeline, and doesn't match the flat expression model (`expressions: { name: path }`).
**Instead:** Keep full-image switching. Each expression/variant is one complete PNG.

### Anti-Pattern 2: Storing Resolved Expression in Page Data

**What:** When a page inherits expression from previous page, writing the resolved value back into `page.characters[].expression`.
**Why bad:** Mutates the source data. Changes to earlier pages wouldn't propagate. Undo/redo becomes confused. Export produces incorrect data.
**Instead:** Keep `null` in data, resolve at render time (both engine and editor canvas).

### Anti-Pattern 3: Expression State in a Separate Global Store

**What:** Creating a new Pinia store or global variable to track "current expression per character" across pages.
**Why bad:** Duplicates state that ScriptEngine already tracks (`_prevPageExpressions`). Two sources of truth will inevitably desync. The editor canvas only needs backward page-walk (read-only, no store needed).
**Instead:** ScriptEngine owns expression state tracking. Editor canvas derives it from page data.

### Anti-Pattern 4: Animating Src Changes with CSS

**What:** Setting `transition: opacity` on a single `<img>` and swapping `src`, expecting CSS to animate between images.
**Why bad:** CSS cannot transition between two `src` values. Changing `src` causes an abrupt content swap. The only way to crossfade images is overlapping two `<img>` elements.
**Instead:** Dual-image technique (clone outgoing, overlap, fade).

### Anti-Pattern 5: Expression Picker as Modal Dialog

**What:** Opening a full-screen modal overlay for expression selection (like CharacterPicker).
**Why bad:** Expression changes are frequent micro-interactions while editing. A modal is too heavy — it breaks flow and requires explicit open/close. Character addition (CharacterPicker) is an infrequent setup action, so modal is acceptable.
**Instead:** Inline popover anchored to the expression field. Click thumbnail → popover grid appears → click expression → popover closes. Same interaction weight as a dropdown.

## Build Order (Dependency-Driven)

```
Phase 1: Data Model + Engine Foundation
  ├─ ScriptEngine: _prevPageExpressions, inheritance resolution, save/restore
  ├─ ScriptEngine: expression diff detection in _renderPage()
  └─ No UI changes yet — can be tested with console/unit tests

Phase 2: CharacterLayer Crossfade
  ├─ CharacterLayer.setExpression() dual-image technique
  ├─ style.css .expr-outgoing rule
  ├─ main.js set_expression handler (skip-mode awareness)
  └─ Testable: manually emit set_expression events → see crossfade

Phase 3: Editor UI
  ├─ ExpressionPicker.vue component
  ├─ PageInspector.vue integration (both char section + dialogue section)
  ├─ PageCanvas.vue inherited expression resolution
  └─ Testable: full editor workflow, preview mode verification
```

**Why this order:**
- Phase 1 is pure logic, no visual deps — safest to build and verify first
- Phase 2 depends on Phase 1's event shape (`crossfade`, `duration` fields)
- Phase 3 depends on both (needs engine to render expressions correctly in preview)

## Scalability Considerations

| Concern | 5 Characters | 20 Characters | 50+ Characters |
|---------|-------------|---------------|----------------|
| Expression thumbnails in picker | Grid fits in viewport | Scrollable, still fast | Consider search/filter |
| Backward walk for inheritance | Instant (<50 pages) | Instant (<500 pages) | Consider caching if >1000 pages |
| DOM elements during crossfade | Max 2 per character | Max 2 per character | Max 2 per character (bounded) |
| Memory (preloaded images) | Negligible | Moderate if all loaded | Browser handles via cache eviction |

Expression crossfade is inherently bounded: at most 2 `<img>` elements per character during a transition, cleaned up within 300-500ms. No accumulation risk.

## Sources

- `src/ui/CharacterLayer.js` — current show/hide/setExpression implementation (direct inspection, HIGH confidence)
- `src/engine/ScriptEngine.js` — _renderPage, _playCurrentDialogue, event schema, state tracking (direct inspection, HIGH confidence)
- `src/editor/components/page-editor/PageInspector.vue` — character expression select, dialogue expression select (direct inspection, HIGH confidence)
- `src/editor/components/page-editor/PageCanvas.vue` — getCharImage, DraggableElement rendering (direct inspection, HIGH confidence)
- `src/editor/components/page-editor/CharacterPicker.vue` — expression thumbnail grid pattern (direct inspection, HIGH confidence)
- `src/ui/BackgroundLayer.js` — dual-layer crossfade pattern as reference (direct inspection, HIGH confidence)
- `src/main.js` — event wiring, skip-mode pattern (direct inspection, HIGH confidence)
- `src/editor/composables/usePageEditor.js` — provide/inject architecture (direct inspection, HIGH confidence)
- `src/editor/stores/script.js` — page CRUD, undo/redo, pushState pattern (direct inspection, HIGH confidence)
- `src/engine/scanAssets.js` — already scans character expressions, no changes needed (direct inspection, HIGH confidence)
