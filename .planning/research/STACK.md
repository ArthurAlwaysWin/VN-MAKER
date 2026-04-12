# Technology Stack — Character Expression/Variant Switching

**Project:** Galgame Maker v1.0 — 角色表情/差分場景切換
**Researched:** 2025-07-15
**Scope:** Only NEW capabilities needed for expression/variant switching. Existing stack (Electron 41, Vue 3, Pinia, Vite 6.3) is validated and not re-evaluated.

## Executive Summary: ZERO New Dependencies

This milestone requires **no new libraries, no npm installs, no stack changes.** Every capability needed is already present in the codebase or achievable with browser-native APIs and pure CSS.

The existing data model (`page.characters[].expression`, `dialogue.expression`, `script.characters[id].expressions`) already stores everything needed. The work is purely about enhancing existing rendering (crossfade in CharacterLayer.js), adding inheritance logic (ScriptEngine.js), and improving editor UX (expression thumbnail selector).

**Confidence: HIGH** — Based on direct source code analysis of 10+ files spanning engine, UI layer, editor components, stores, and data model.

## Existing Stack (Unchanged)

### Core
| Technology | Version | Purpose | v1.0 Impact |
|------------|---------|---------|-------------|
| Electron | 41.x | Desktop shell | No change |
| Vue 3 | 3.5.31 | Editor UI | No change |
| Pinia | 3.0.4 | State management | No change |
| Vite | 6.3.0 | Build tool | No change |
| fflate | 0.8.2 | Theme ZIP | Irrelevant to this milestone |

### Runtime Engine
| Technology | Purpose | v1.0 Impact |
|------------|---------|-------------|
| Pure JS (ES Modules) | Game engine | Extend ScriptEngine + CharacterLayer |
| CSS transitions | All animations | Extend for expression crossfade |
| DOM rendering | Character/BG layers | Extend CharacterLayer.js |

## Capabilities Needed (All Built With Existing Stack)

### 1. CSS Crossfade for Expression Changes

**What:** Smooth opacity fade between expression images when a character's expression changes while they remain on screen.

**How:** Dual-image technique, **exactly** as `BackgroundLayer.js` already implements for background crossfades (lines 13-54). This proven pattern exists in the codebase today.

**BackgroundLayer pattern (already working):**
```javascript
// Two <div> layers: layerA, layerB
// Swap .active class → CSS opacity transition handles the fade
// Clean up old layer's backgroundImage after transition to free memory
```

**Applied to CharacterLayer.js:** Instead of a single `<img>` per character, use two `<img>` elements (imgA/imgB) wrapped in a container `<div>`. When expression changes:
1. Set new image `src` on the inactive `<img>`
2. Wait for `onload` to ensure image is decoded
3. Swap `.active` class (CSS `opacity: 0 → 1` and `1 → 0`)
4. After transition duration, clear old image `src`

**CSS needed (pure CSS, no libraries):**
```css
.character-sprite-wrap {
  position: absolute;
  /* inherits positioning from existing .pos-left / .pos-center / .pos-right / .pos-custom */
}
.character-sprite-wrap .expr-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom center;
  opacity: 0;
  transition: opacity 300ms ease;
}
.character-sprite-wrap .expr-layer.active {
  opacity: 1;
}
```

**Confidence: HIGH** — BackgroundLayer.js proves this exact dual-layer crossfade pattern works in this codebase. The CSS transition infrastructure is already established in style.css.

### 2. Image Preloading for Smooth Transitions

**What:** Preload expression images before swapping to prevent a blank flash during crossfade.

**How:** Browser-native `Image()` constructor — no library needed.

```javascript
function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
}
```

**Preload strategy:**
- **On page enter:** Preload all expression images for characters appearing on the page
- **On dialogue advance:** If `dlg.expression` differs from current, preload before emitting `set_expression`
- **Scene-level (optional):** Preload all expressions for characters referenced anywhere in the scene

**Confidence: HIGH** — `Image()` is a standard Web API. Works with `asset://` protocol (proven: all `<img>` elements in the editor already load via `asset://`), relative paths (Web export), and `basePath` parameter (preview iframe).

### 3. Expression State Inheritance (Engine Logic)

**What:** When a character persists from page N to page N+1 but page N+1 doesn't explicitly set an expression, inherit the last known expression.

**How:** A `Map<string, string>` tracking `charId → lastExpression` in ScriptEngine, with a 3-tier fallback resolution:

```javascript
// Add to ScriptEngine constructor:
/** @type {Map<string, string>} charId → last resolved expression */
this._charExpressionState = new Map();

// In _renderPage(), resolve expression:
const resolvedExpression = char.expression                          // 1. explicit page value
  || this._charExpressionState.get(char.id)                        // 2. inherited from prev page
  || Object.keys(charDef?.expressions || {})[0]                    // 3. first defined expression
  || 'normal';                                                     // 4. ultimate fallback

// Store resolved state:
this._charExpressionState.set(char.id, resolvedExpression);
```

**Reset on:** `startGame()`, `restoreState()` (then rebuild from page walk or store in save state).

**Confidence: HIGH** — Pure logic addition, no external dependencies. The existing `_prevPageCharIds` Set in ScriptEngine (line 60) already demonstrates per-page state tracking for character diffing.

### 4. Expression Thumbnail Selector (Editor UI)

**What:** Replace the plain `<select>` dropdown in PageInspector (line 52-57) with a visual thumbnail grid.

**How:** New Vue 3 component `ExpressionDropdown.vue`, reusing the thumbnail grid pattern from `CharacterPicker.vue` (lines 16-36).

**Existing patterns to reuse directly:**
- `CharacterPicker.vue` `.expr-grid` / `.expr-thumb` / `.expr-img-wrap` — 80px thumbnail grid with `asset://` URLs
- `AssetPickerModal.vue` — overlay positioning pattern
- `resolveAsset()` from `PageCanvas.vue` — `asset://` URL resolution

**No new component libraries needed.** This is a ~100-line SFC with a click-to-toggle dropdown containing an expression thumbnail grid. The CSS is already 90% written in CharacterPicker.vue's `<style>` block.

**Confidence: HIGH** — CharacterPicker.vue is a working reference implementation of the exact thumbnail grid needed.

## Data Model: No Schema Changes Required

The current `script.json` schema **already supports** everything needed:

### Page-level character expression (EXISTS)
```json
{
  "characters": [
    { "id": "sakura", "expression": "smile", "position": "center", "x": null, "y": null, "scale": 1 }
  ]
}
```

### Mid-dialogue expression change (EXISTS)
```json
{
  "dialogues": [
    { "speaker": "sakura", "text": "...", "expression": "sad" }
  ]
}
```

### Character definition with expressions (EXISTS)
```json
{
  "characters": {
    "sakura": {
      "name": "樱",
      "color": "#FF9CAE",
      "expressions": {
        "normal": "characters/sakura_normal.png",
        "smile": "characters/sakura_smile.png",
        "制服_普通": "characters/sakura_uniform_normal.png"
      }
    }
  }
}
```

**Flat model (per PROJECT.md):** Costume/variant + expression combos are all same-level expression entries. "制服_普通" (uniform + normal) is just another expression key. No hierarchical variant structure needed.

### Optional Future Enhancement (NOT for v1.0)

Per-character expression fade duration override:
```json
{ "id": "sakura", "expression": "smile", "expressionTransition": { "duration": 300 } }
```
**Recommendation:** YAGNI. Use a hardcoded 300ms default. Add per-page control only if users request it.

## What NOT to Add

| Don't Add | Why Not |
|-----------|---------|
| **GreenSock / GSAP** | CSS transitions handle all needed fades. BackgroundLayer proves this. Adds 30KB+ for zero benefit. |
| **anime.js** | Same — CSS transitions are simpler and already the established pattern in this codebase. |
| **Framer Motion / Vue Motion** | Engine runs outside Vue (pure JS + DOM). Vue animation libs can't help engine rendering. |
| **TypeScript** | Project explicitly excludes TS (PROJECT.md line 149). JSDoc is the pattern. |
| **Canvas 2D / WebGL** | Engine is DOM-based. Switching rendering paradigm for a fade effect is absurd overkill. |
| **Vue `<Transition>`** | Engine UI layer is pure JS DOM manipulation, not Vue components. Editor canvas uses Vue but expression display is just `<img>` binding. |
| **Pinia plugin for expression state** | Expression inheritance is an engine runtime concern, not editor state. Keep it in ScriptEngine. |
| **Image sprite sheets** | Current model is one full image per expression. Sprite sheets add complexity for no benefit at this scale. |
| **Lottie / Rive** | Animated expressions are out of scope. Static image crossfade is the requirement. |
| **lazy-loading library** | Native `Image()` preloading is 5 lines. A library adds overhead for nothing. |

## Integration Points (All Compatible)

### asset:// Protocol — ✓ No Change
Expression images already load through `asset://` just like everything else. `CharacterLayer.js` uses `this.basePath + data.image` which resolves correctly across all 4 environments (Electron editor, preview iframe, Web export, Desktop export).

### scanAssets.js — ✓ No Change
Already scans `characters[id].expressions` values (lines 52-56). All expression images are already included in both Web and Desktop export pipelines.

### Save/Restore State — Minor Addition
`ScriptEngine.getState()` saves `currentScene`, `pageIndex`, `dialogueIndex`. **Recommend adding** `charExpressionState: Object.fromEntries(this._charExpressionState)` to the save state for instant restore without replaying page history. Small, backward-compatible addition — old saves without this field gracefully fall back to resolving from page data.

### Preview iframe — ✓ No Change
`usePageEditor.startPreview()` deep-copies script data via `JSON.parse(JSON.stringify())` and sends via `postMessage`. Expression data is already part of the script. No protocol changes needed.

### Editor Canvas (PageCanvas.vue) — Compatible
`getCharImage(char)` at line 155-158 already resolves `script.data.characters[char.id].expressions[char.expression]` → `asset://` URL. The expression thumbnail selector just needs to update `char.expression` on the page data — the canvas reactively updates via Vue computed properties.

## Implementation Summary

| Capability | Approach | File(s) to Modify/Create | Effort |
|-----------|----------|--------------------------|--------|
| Expression crossfade | Dual-img + CSS opacity (BackgroundLayer pattern) | `CharacterLayer.js`, `style.css` | Medium |
| Image preloading | Native `Image()` API | `CharacterLayer.js` (or new util) | Low |
| State inheritance | `Map<string, string>` in ScriptEngine | `ScriptEngine.js` | Low |
| Thumbnail selector | Vue SFC, reuse CharacterPicker grid CSS | New `ExpressionDropdown.vue` | Medium |
| Inheritance display in editor | Computed walk-back through pages | `PageInspector.vue` | Low |
| Save state extension | Add `charExpressionState` to getState/restoreState | `ScriptEngine.js` | Low |

**Total new npm dependencies: 0**
**Total new files: ~1-2** (ExpressionDropdown.vue, possibly a preload utility)
**Total modified files: ~4-5** (CharacterLayer.js, ScriptEngine.js, PageInspector.vue, style.css, possibly PageCanvas.vue)

## Sources

All sources are direct codebase analysis (HIGH confidence):

- `src/ui/CharacterLayer.js` — Current character rendering: `show()`, `hide()`, `setExpression()`, CSS class transitions
- `src/ui/BackgroundLayer.js` — Dual-layer crossfade pattern (proven model to replicate for expressions)
- `src/engine/ScriptEngine.js` — Page rendering with character diffing, `_renderPage()`, `_playCurrentDialogue()`, expression event emission
- `src/editor/components/page-editor/PageInspector.vue` — Current expression `<select>` dropdown (lines 51-57), dialogue expression editor (lines 116-124)
- `src/editor/components/page-editor/CharacterPicker.vue` — Expression thumbnail grid pattern (lines 16-36, reusable CSS)
- `src/editor/components/page-editor/PageCanvas.vue` — `getCharImage()` resolution, canvas character rendering
- `public/game/script.json` — Live data model showing character/expression/page structure
- `src/editor/stores/script.js` — `createDefaultPage()` default data shape
- `src/style.css` (lines 117-173) — Character sprite CSS: positioning, enter transitions, `.entered` state
- `src/engine/scanAssets.js` — Confirms expression images already tracked for export (lines 52-56)
- `.planning/PROJECT.md` — Flat model decision, no-TypeScript constraint, whole-image switching approach
