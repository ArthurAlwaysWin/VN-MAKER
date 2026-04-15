# Phase 37: CharacterLayer DOM 重構 - Research

**Researched:** 2026-04-12
**Domain:** DOM refactoring — vanilla JS UI component (CharacterLayer)
**Confidence:** HIGH

## Summary

Phase 37 is a surgical refactoring of `src/ui/CharacterLayer.js` (120 lines) and its CSS in `src/style.css`. The current implementation creates a single `<img>` element per character; the target is a container `<div>` holding two overlapping `<img>` children (A/B dual-layer), following the exact pattern already established in `BackgroundLayer.js`. The refactoring preserves all 4 public methods (`show`/`hide`/`setExpression`/`clear`) with identical signatures and zero visual regression.

The codebase already contains the complete dual-layer reference pattern in `BackgroundLayer.js` (66 lines): two child elements with `.active` class toggling and an `_activeLayer: 'A'|'B'` state tracker. The CharacterLayer refactoring maps this same pattern but with additional complexity — multiple characters (Map-based), per-character container positioning, and enter/exit animations applied to the container rather than the images.

**Primary recommendation:** Follow BackgroundLayer's dual-layer pattern exactly. Container div inherits all positioning/animation CSS from `.character-sprite`. Child imgs use absolute positioning to fill the container. Only `.active` img is visible (opacity:1). Phase 37 does NOT enable crossfade — that's Phase 38.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 容器 div 承载定位 class + 進出場動畫（opacity+transform），两個 img 子元素只負責圖片顯示
- **D-02:** 两個 img 子元素命名 `.char-img-a` / `.char-img-b`，当前活躍的加 `.active` 類（與 BackgroundLayer 的 `bg-image-layer` 模式一致）
- **D-03:** `this.characters` Map value 從 `HTMLImageElement` 改為 `{container, imgA, imgB}` 結構化對象，另需記錄 `_activeImg: 'A'|'B'`
- **D-04:** 容器 div 接管原 `.character-sprite` 的所有定位/尺寸屬性（`position:absolute; bottom:0; height:90%; max-width:50%`）
- **D-05:** 子 img 用 `position:absolute; width:100%; height:100%; object-fit:contain; object-position:bottom center` 填滿容器，两個 img 完全重疊
- **D-06:** 容器設 `position:relative`（或保留 absolute）使 img children 相對容器定位
- **D-07:** 容器 div 負責 opacity+transform（進出場），子 img 只負責 opacity（crossfade，Phase 38 啟用）
- **D-08:** Phase 37 中只有一個 img 顯示（`.active` opacity:1），另一個隱藏（opacity:0），進出場動畫行為與重構前完全一致
- **D-09:** 只修改 CharacterLayer.js 的 4 個方法（show/hide/setExpression/clear）+ style.css
- **D-10:** 接口簽名不變 — show(data)/hide(data)/setExpression(data)/clear() 參數和行為不變
- **D-11:** setExpression() 在 Phase 37 仍為即時 src 切換（crossfade 延到 Phase 38）
- **D-12:** 外部調用方（main.js/ScriptEngine）無需改動

### Agent's Discretion
- img 子元素的 z-index 策略（只要两個 img 重疊正確即可）
- 容器 div 的 overflow 屬性（visible or hidden）

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENG-01 | CharacterLayer 從單 `<img>` 重構為雙圖層結構（容器 div + 两個 img），保持 4 種定位模式（left/center/right/custom）不變 | BackgroundLayer dual-layer pattern provides exact reference; CSS restructuring strategy documented below; all 4 positioning modes analyzed |

</phase_requirements>

## Standard Stack

No new libraries needed. This is a pure refactoring of existing vanilla JS + CSS.

### Core (Existing — No Changes)
| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| Vanilla JS (ES2022+) | — | CharacterLayer class | No framework, direct DOM manipulation |
| CSS3 transitions | — | Enter/exit animations + future crossfade opacity | Already in use for `.character-sprite` |

### Supporting (Existing — No Changes)
| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| `sanitize.js` | — | `clampField()` for custom positioning | Already imported by CharacterLayer |

### Alternatives Considered
None — this is a refactoring within existing stack, not a technology choice.

## Architecture Patterns

### Current CharacterLayer Structure (BEFORE)
```
#character-layer
  └─ <img class="character-sprite pos-center enter-fade entered">  ← one per character
```

Map: `this.characters = Map<string, HTMLImageElement>`

### Target CharacterLayer Structure (AFTER — D-01 through D-08)
```
#character-layer
  └─ <div class="character-sprite pos-center enter-fade entered">  ← container per character
       ├─ <img class="char-img-a active">                          ← visible
       └─ <img class="char-img-b">                                 ← hidden (opacity:0)
```

Map: `this.characters = Map<string, { container: HTMLDivElement, imgA: HTMLImageElement, imgB: HTMLImageElement, activeImg: 'A'|'B' }>`

### Pattern 1: Dual-Layer from BackgroundLayer (Reference)
**What:** Two overlapping child elements, one `.active` (opacity:1), one inactive (opacity:0). `_activeLayer` tracks which is current.
**When to use:** Any component that needs crossfade transitions between two states.
**Source:** `src/ui/BackgroundLayer.js` lines 13-24

```javascript
// BackgroundLayer pattern — to be adapted for CharacterLayer
this.layerA = document.createElement('div');
this.layerA.className = 'bg-image-layer active';
this.layerB = document.createElement('div');
this.layerB.className = 'bg-image-layer';
this.container.appendChild(this.layerA);
this.container.appendChild(this.layerB);
this._activeLayer = 'A';
```

**CharacterLayer adaptation:** Each character in the Map gets its own `{container, imgA, imgB, activeImg}` struct. The container div is what gets appended to `#character-layer` and receives positioning/animation classes. The two imgs fill the container via CSS.

### Pattern 2: Enter/Exit Animation on Container (D-07)
**What:** The container div handles opacity+transform transitions (enter-fade, enter-slide-left, enter-slide-right, entered). Child imgs ONLY handle their own opacity for crossfade (Phase 38).
**Why:** Separating concerns — container controls visibility/position of the whole character, imgs control which expression is shown.

```javascript
// Container handles enter transition (same as current img handling)
container.classList.add('enter-fade');
requestAnimationFrame(() => {
  requestAnimationFrame(() => container.classList.add('entered'));
});

// Exit: remove 'entered', then cleanup after duration
container.classList.remove('entered');
setTimeout(() => {
  container.remove();
  this.characters.delete(data.id);
}, duration);
```

### Pattern 3: setExpression — Instant Switch (D-11)
**What:** In Phase 37, `setExpression()` simply changes the `src` of the active img. No crossfade.
**Why:** Crossfade is Phase 38's scope. Phase 37 only restructures the DOM.

```javascript
setExpression(data) {
  const entry = this.characters.get(data.id);
  if (!entry) return;
  const activeEl = entry.activeImg === 'A' ? entry.imgA : entry.imgB;
  activeEl.src = this.basePath + data.image;
}
```

### Recommended Project Structure (Files Modified)
```
src/
├── ui/
│   └── CharacterLayer.js   # MODIFY — refactor all 4 methods
├── style.css                # MODIFY — restructure .character-sprite CSS
```

### Anti-Patterns to Avoid
- **Duplicating animation on both container and img:** Container handles enter/exit. Img handles crossfade (Phase 38). Never put transition on both for the same property.
- **Breaking the Map value shape partially:** Always update ALL fields in the struct. Don't leave `activeImg` out of sync with actual DOM state.
- **Adding crossfade logic in Phase 37:** D-11 explicitly says instant switch only. Don't add opacity transitions to `.char-img-a`/`.char-img-b` yet.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dual-layer pattern | Custom state machine | Copy BackgroundLayer's `_activeLayer` pattern | Already proven in the same codebase |
| CSS transitions | JavaScript animation library | CSS `transition` property on classes | Consistent with existing codebase; zero dependencies |

## Common Pitfalls

### Pitfall 1: Container positioning breaks `pos-center` transform
**What goes wrong:** `.pos-center` uses `transform: translateX(-50%)` for centering. If the container div doesn't inherit this properly, characters will be misaligned.
**Why it happens:** The `transform` property is on `.character-sprite`, which moves from `<img>` to `<div>`. The img inside needs `object-position: bottom center` but does NOT need `translateX(-50%)`.
**How to avoid:** Keep `transform` on the container div's `.character-sprite` class exactly as-is. Child imgs use only `position:absolute; inset:0` (or `width:100%; height:100%`) to fill the container. The container handles all transforms.
**Warning signs:** Character appears offset (particularly center-positioned ones shifted left or right).

### Pitfall 2: `object-fit: contain` on container div instead of img
**What goes wrong:** `object-fit` and `object-position` are CSS properties that only apply to replaced elements (`<img>`, `<video>`). They have no effect on `<div>`.
**Why it happens:** When moving CSS from `<img>` to container `<div>`, developers may forget to separate image-specific properties.
**How to avoid:** Keep `object-fit: contain; object-position: bottom center` on `.char-img-a, .char-img-b` (the img elements). The container div uses `overflow: hidden` (or visible) and standard box model sizing.
**Warning signs:** Characters stretched, cropped incorrectly, or not bottom-aligned.

### Pitfall 3: Enter transition opacity conflict between container and img
**What goes wrong:** Container has `opacity: 0` (from `.enter-fade`), then transitions to `opacity: 1` (from `.entered`). If the child img also has `opacity: 0` by default (for future crossfade), the character never becomes visible (0 × 0 = 0).
**Why it happens:** CSS opacity is multiplicative in the render tree. A child with `opacity: 1` inside a parent with `opacity: 0` is still invisible — correct. But if BOTH start at 0 and only one transitions to 1, the character stays invisible.
**How to avoid:** In Phase 37, `.char-img-a.active` MUST have `opacity: 1` and `.char-img-b` (without `.active`) MUST have `opacity: 0`. The `.active` class is applied immediately on creation (imgA starts active). Container's `opacity` handles enter/exit animation independently.
**Warning signs:** Characters invisible after entering, or flickering during enter animation.

### Pitfall 4: `max-width: 50%` on container doesn't constrain child imgs
**What goes wrong:** Container div has `max-width: 50%` but child imgs with `width: 100%` respect the container's computed width, not the max-width. If the container has no explicit width, it may collapse or expand incorrectly.
**Why it happens:** Block elements (`<div>`) auto-size based on content; `max-width` limits but doesn't set width. An `<img>` with `object-fit: contain` auto-sizes based on the image intrinsic dimensions.
**How to avoid:** The container needs sizing that makes sense. Use the same approach as the old `<img>`: the container should have `height: 90%; max-width: 50%` and the child imgs should be `width: 100%; height: 100%; object-fit: contain` — this way the container size is determined by `height:90%` of parent, and imgs fit inside. The container needs to also auto-size its width from the image. One approach: give the container `width: auto; height: 90%` and let the active img with `height: 100%; width: auto; object-fit: contain` determine the actual width.
**Warning signs:** Characters either too wide, too narrow, or not maintaining aspect ratio.

### Pitfall 5: Forgetting `draggable = false` on both imgs
**What goes wrong:** Browser default allows dragging images. Without `draggable = false`, clicking a character sprite triggers browser drag behavior instead of game interaction.
**Why it happens:** The current code sets `el.draggable = false` on the single img. With two imgs, both need this.
**How to avoid:** Set `imgA.draggable = false; imgB.draggable = false;` during creation.
**Warning signs:** Dragging a character shows a ghost image instead of advancing dialogue.

### Pitfall 6: `hide()` timeout removes container while children still transitioning
**What goes wrong:** The `hide()` method removes the container after `duration` ms. This is fine for the container's own opacity transition. But if Phase 38 later adds crossfade transitions on child imgs, the timing could conflict.
**Why it happens:** Not a problem in Phase 37, but worth noting for forward compatibility.
**How to avoid:** In Phase 37, keep the same setTimeout cleanup pattern. Phase 38 will need to coordinate container exit and img crossfade timing.
**Warning signs:** N/A for Phase 37 — monitor in Phase 38.

## Code Examples

### Example 1: New `show()` method structure
```javascript
// Source: derived from current CharacterLayer.show() + BackgroundLayer dual-layer pattern
show(data) {
  let entry = this.characters.get(data.id);

  if (!entry) {
    // Create container div
    const container = document.createElement('div');
    container.classList.add('character-sprite');
    container.dataset.characterId = data.id;

    // Create two overlapping img elements
    const imgA = document.createElement('img');
    imgA.className = 'char-img-a active';
    imgA.draggable = false;

    const imgB = document.createElement('img');
    imgB.className = 'char-img-b';
    imgB.draggable = false;

    container.appendChild(imgA);
    container.appendChild(imgB);
    this.container.appendChild(container);

    entry = { container, imgA, imgB, activeImg: 'A' };
    this.characters.set(data.id, entry);
  }

  // Set image on active img
  const activeEl = entry.activeImg === 'A' ? entry.imgA : entry.imgB;
  activeEl.src = this.basePath + data.image;

  // Reset classes and inline positioning (on container, not img)
  entry.container.className = 'character-sprite';
  entry.container.style.left = '';
  entry.container.style.right = '';
  entry.container.style.top = '';
  entry.container.style.bottom = '';
  entry.container.style.transform = '';

  // Positioning (same logic, applied to container)
  if (data.x !== undefined || data.y !== undefined) {
    entry.container.classList.add('pos-custom');
    entry.container.style.left = `${clampField('x', data.x ?? 640)}px`;
    if (data.y !== undefined) {
      entry.container.style.bottom = 'auto';
      entry.container.style.top = `${clampField('y', data.y)}px`;
    }
    if (data.scale) {
      entry.container.style.transform = `scale(${clampField('scale', data.scale)})`;
    }
  } else {
    entry.container.classList.add(`pos-${data.position || 'center'}`);
  }

  // Transition in (same logic, applied to container)
  const transition = data.transition || 'fade';
  const duration = data.duration || 500;
  entry.container.style.transitionDuration = `${duration}ms`;

  if (transition === 'fade') {
    entry.container.classList.add('enter-fade');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => entry.container.classList.add('entered'));
    });
  } else if (transition === 'slide_left') {
    entry.container.classList.add('enter-slide-left');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => entry.container.classList.add('entered'));
    });
  } else if (transition === 'slide_right') {
    entry.container.classList.add('enter-slide-right');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => entry.container.classList.add('entered'));
    });
  } else {
    entry.container.classList.add('entered');
  }
}
```

### Example 2: New CSS structure for character sprites
```css
/* Container div inherits all positioning/animation from original .character-sprite */
.character-sprite {
  position: absolute;
  bottom: 0;
  height: 90%;
  max-width: 50%;
  opacity: 0;
  transition-property: opacity, transform;
  transition-timing-function: ease-out;
}

/* Child img elements — fill container, overlap completely */
.char-img-a,
.char-img-b {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom center;
  opacity: 0;
  pointer-events: none;
}

/* Active img is visible */
.char-img-a.active,
.char-img-b.active {
  opacity: 1;
}

/* Position classes — unchanged, still on container */
.character-sprite.pos-left { left: 5%; }
.character-sprite.pos-center { left: 50%; transform: translateX(-50%); }
.character-sprite.pos-right { right: 5%; }
.character-sprite.pos-custom { bottom: auto; }

/* Enter transitions — unchanged, still on container */
.character-sprite.enter-fade { opacity: 0; }
.character-sprite.enter-slide-left { opacity: 0; transform: translateX(-80px); }
.character-sprite.enter-slide-right { opacity: 0; transform: translateX(80px); }

.character-sprite.entered { opacity: 1; }
.character-sprite.entered:not(.pos-custom) { transform: translateX(0) !important; }
.character-sprite.pos-center.entered:not(.pos-custom) { transform: translateX(-50%) !important; }
```

### Example 3: Updated hide/setExpression/clear
```javascript
hide(data) {
  const entry = this.characters.get(data.id);
  if (!entry) return;

  const duration = data.duration || 400;
  entry.container.style.transitionDuration = `${duration}ms`;
  entry.container.classList.remove('entered');

  setTimeout(() => {
    entry.container.remove();
    this.characters.delete(data.id);
  }, duration);
}

setExpression(data) {
  const entry = this.characters.get(data.id);
  if (!entry) return;
  // Phase 37: instant switch on active img only (D-11)
  const activeEl = entry.activeImg === 'A' ? entry.imgA : entry.imgB;
  activeEl.src = this.basePath + data.image;
}

clear() {
  this.characters.forEach(entry => entry.container.remove());
  this.characters.clear();
}
```

## Agent Discretion Recommendations

### z-index strategy for child imgs
**Recommendation:** No explicit z-index needed. Both imgs are `position: absolute` within the same container. DOM order determines stacking (imgB renders on top of imgA). Since only one has `.active` (opacity:1) at a time in Phase 37, visual overlap order is irrelevant. In Phase 38 during crossfade, the incoming image should be on top — this naturally works if the incoming is always the one higher in DOM order, or z-index can be toggled then.

**Chosen approach:** No z-index. Let DOM order handle it. Phase 38 can add z-index if needed during crossfade.

### Container overflow property
**Recommendation:** Use `overflow: visible` (the default). Character sprites may have elements (hair, weapons) that extend slightly beyond the logical bounding box. Using `overflow: hidden` could clip these elements and cause visual regression. Since the `#character-layer` already has `pointer-events: none`, there's no interaction concern from overflow content.

**Chosen approach:** Don't set overflow explicitly (defaults to `visible`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None — tests run directly with `node --test` |
| Quick run command | N/A — no CharacterLayer tests exist |
| Full suite command | `node --test tests/*.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENG-01 | Dual-layer DOM structure created correctly | manual | Visual inspection via demo script | N/A |
| ENG-01 | 4 positioning modes (left/center/right/custom) render correctly | manual | Visual inspection of all positions | N/A |
| ENG-01 | Enter/exit animations work on container | manual | Visual inspection of transitions | N/A |
| ENG-01 | Zero visual regression vs. pre-refactoring | manual | Side-by-side comparison with demo script | N/A |

### Sampling Rate
- **Per task commit:** Visual inspection — run dev server, load demo script, verify characters render correctly
- **Per wave merge:** Full demo script walkthrough — all 4 positions, enter/exit animations, expression changes
- **Phase gate:** Zero visual differences from pre-refactoring rendering

### Wave 0 Gaps
CharacterLayer is a DOM-manipulating UI class. The project has no DOM testing infrastructure (no jsdom, no Playwright, no browser test framework). All existing tests (`tests/*.test.js`) are Node.js-only integration tests for file I/O and export pipelines. 

Setting up DOM testing infrastructure for a single UI refactoring phase would be disproportionate effort. **Manual visual verification is the appropriate validation strategy for this phase.**

- No test files to create — manual verification via demo script rendering
- Verify: `npm run dev` → open preview window → load project with characters → confirm all 4 positions + enter/exit animations

## Open Questions

1. **Container width sizing with `max-width: 50%`**
   - What we know: The old `<img>` with `object-fit: contain` auto-sized its width based on the image's intrinsic aspect ratio. A `<div>` container doesn't have intrinsic dimensions from its child images.
   - What's unclear: Whether `height: 90%; max-width: 50%` on a div with absolutely-positioned children gives the correct visual result, since absolutely-positioned children don't contribute to parent sizing.
   - Recommendation: The container may need explicit width management. Two approaches: (1) keep the container as `position:absolute` with full width/height of `#character-layer` and move sizing constraints to the imgs — but this breaks positioning. (2) Set an explicit width on the container from JS when the image loads (listen for `onload`, read `naturalWidth`/`naturalHeight`, compute container width from `height * aspectRatio`). The simpler approach is to let the container be sized by the intrinsic behavior — test with actual images to verify. If it fails, fall back to the `onload` approach. **This is the highest-risk area of the refactoring and MUST be tested first.**

## Sources

### Primary (HIGH confidence)
- `src/ui/CharacterLayer.js` — complete current implementation (120 lines), all 4 methods analyzed
- `src/ui/BackgroundLayer.js` — dual-layer reference pattern (66 lines), identical A/B + .active approach
- `src/style.css` lines 73-173 — complete CSS for `#character-layer` and `.character-sprite`
- `src/main.js` lines 19, 45 — CharacterLayer import and instantiation
- `index.html` — DOM structure: `#character-layer` container div
- `src/editor/components/page-editor/PageCanvas.vue` — editor renders characters independently (no impact)
- `src/editor/composables/useCanvasState.js` — editor canvas state replay (no CharacterLayer dependency)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — v1.0 architecture research confirming dual-img crossfade approach
- `37-CONTEXT.md` — user decisions D-01 through D-12 defining exact refactoring approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, pure refactoring of existing code
- Architecture: HIGH — BackgroundLayer provides exact proven pattern within the same codebase
- Pitfalls: HIGH — based on direct analysis of CSS cascade, DOM rendering, and existing code behavior
- Container sizing (Open Question 1): MEDIUM — needs empirical validation with actual images

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable — no external dependencies, internal codebase only)
