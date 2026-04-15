# Phase 40: 表情選擇器 UI - Research

**Researched:** 2026-04-15
**Domain:** Vue 3 custom dropdown component, Teleport positioning, CSS grid thumbnails
**Confidence:** HIGH

## Summary

Phase 40 replaces two plain `<select>` elements in PageInspector.vue with a visual thumbnail-based ExpressionDropdown component. The codebase already contains all necessary patterns: CharacterPicker provides the thumbnail grid pattern, HelpTip provides getBoundingClientRect + viewport flip logic, AudioPicker provides the Teleport-to-body structure, and AssetPickerModal provides the click-outside close pattern.

The ExpressionDropdown is a **self-contained dropdown** (not a full-screen modal like AudioPicker/CharacterPicker). It renders a trigger inline within the inspector row, and opens a fixed-positioned thumbnail grid below the trigger via Teleport to body. Two distinct modes are needed: **required** (character row, always has a value) and **nullable** (dialogue row, allows "不變" = no change).

**Primary recommendation:** Build ExpressionDropdown.vue as a single reusable component in `src/editor/components/page-editor/`. Combine HelpTip's positioning math with CharacterPicker's grid CSS (scaled down to 60px/48×48). Use `<Teleport to="body">` + transparent overlay for click-outside close. The two integration points in PageInspector are straightforward template replacements with minimal data flow changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Trigger = 24px thumbnail + expression name text + ▼ arrow, compact inline in inspector row. No thumbnail when "unchanged" (只顯示「不變」文字).
- **D-02:** Dialogue-level expression selector (nullable mode) shows "不變" text card as first grid cell, gray (#3c3c3c) background, same size as thumbnail cards, #007acc border when selected.
- **D-03:** Grid uses 60px columns + 48×48px images + max-height ~300px scrollable. Expression name below thumbnail (truncated).
- **D-04:** Teleport to="body" + fixed positioning below trigger (getBoundingClientRect). Close: click outside + ESC (with stopPropagation to prevent ESC from triggering game menu). Flip up if insufficient space below.

### Agent's Discretion
- Expression name truncation strategy (text-overflow: ellipsis or character limit)
- Grid outer padding/margin specific values
- Selected state animation (subtle transitions)
- Empty expression dictionary placeholder message

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | ExpressionDropdown 缩略图网格选择器组件（Teleport + fixed 定位，复用 CharacterPicker 网格模式） | CharacterPicker grid pattern (§3.1), HelpTip positioning (§3.2), AudioPicker Teleport (§3.3), click-outside close (§3.4) all documented with exact code |
| UI-02 | PageInspector 集成 — 角色行和对话表情处均使用 ExpressionDropdown 替换现有 `<select>` | Integration points fully mapped (§1), data flow traced (§2), exact replacement patterns documented |
</phase_requirements>

## Key Findings

### 1. PageInspector Integration Points

#### Replacement Point #1: Character Row Expression (lines 51-57)

**Current template:**
```html
<select :value="char.expression"
  @change="setCharExpression(idx, $event.target.value)"
  @click.stop class="mini-select">
  <option v-for="(_, expr) in getCharExpressions(char.id)" :key="expr" :value="expr">
    {{ expr }}
  </option>
</select>
```

**Parent structure:** Inside `.char-row` div (flex row, `gap: 6px`, `align-items: center`, `flex-wrap: wrap`):
```
.char-row
  ├─ span.char-name (flex:1, 13px, #ccc)
  ├─ <select>.mini-select  ← REPLACE THIS
  ├─ button.delete-x
  └─ div.char-scale-row (conditionally shown when selected)
```

**Data bindings:**
- Value: `char.expression` (always a string — character always has an expression)
- Options source: `getCharExpressions(char.id)` returns `{ exprName: imagePath }` object
- Change handler: `setCharExpression(idx, $event.target.value)` → sets `page.characters[idx].expression = expr` + `pushState()`
- Has `@click.stop` to prevent parent `.char-row` click handler from firing

**Key notes:**
- NOT nullable — character row always has an active expression
- Uses `@click.stop` — the replacement must also stop click propagation to parent
- `.mini-select` CSS: `background: #3c3c3c; border: 1px solid #555; color: #ccc; border-radius: 3px; padding: 1px 4px; font-size: 11px`

#### Replacement Point #2: Dialogue Expression (lines 116-125)

**Current template:**
```html
<div class="form-group" v-if="selectedDialogue.speaker && isCharId(selectedDialogue.speaker)">
  <label>表情变化</label>
  <select :value="selectedDialogue.expression || ''"
    @change="setDialogueExpression($event.target.value)" class="field-input">
    <option value="">（不变）</option>
    <option v-for="(_, expr) in getCharExpressions(selectedDialogue.speaker)" :key="expr" :value="expr">
      {{ expr }}
    </option>
  </select>
</div>
```

**Parent structure:** Inside `.dialogue-editor` section, only shown when `selectedDialogue.speaker` is a valid character ID:
```
.dialogue-editor
  ├─ .editor-divider
  ├─ .form-group (说话者 combobox)
  ├─ .form-group (表情变化) ← THIS ONE, conditional on isCharId
  ├─ .form-group (语音)
  └─ .form-group (内容 textarea)
```

**Data bindings:**
- Value: `selectedDialogue.expression || ''` (nullable — null maps to empty string)
- Options source: `getCharExpressions(selectedDialogue.speaker)` (uses the dialogue's speaker ID)
- Change handler: `setDialogueExpression($event.target.value)` → converts empty string to null: `selectedDialogue.expression = expr || null` + `pushState()`
- `.field-input` CSS: `width: 100%; background: #3c3c3c; border: 1px solid #555; color: #ccc; padding: 6px 8px; border-radius: 4px; font-size: 13px`

**Key notes:**
- IS nullable — first option is "（不变）" with value ""
- Inside `.form-group` with full-width layout (unlike the inline char-row)
- The label "表情变化" is above the select

#### Component Registration Pattern

PageInspector uses `<script setup>` — imports are auto-registered:
```js
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';
import { useAssetStore } from '../../stores/assets.js';
import AudioPicker from './AudioPicker.vue';
import HelpTip from '../HelpTip.vue';
import { HELP_SCRIPT } from '../../helpTexts.js';
```

To add ExpressionDropdown, simply add:
```js
import ExpressionDropdown from './ExpressionDropdown.vue';
```

### 2. Expression Data Flow

**Complete trace:**

1. **Source of truth:** `script.data.characters[charId].expressions` — a plain object (dictionary):
   ```js
   {
     "normal": "characters/sakura_normal.png",
     "happy": "characters/sakura_happy.png",
     "angry": "characters/sakura_angry.png"
   }
   ```

2. **Access helper in PageInspector (line 447-449):**
   ```js
   function getCharExpressions(charId) {
     return script.data?.characters?.[charId]?.expressions || {};
   }
   ```

3. **Character row data model:** `page.characters[idx]` = `{ id, expression, position, x, y, scale }`
   - `expression` is always a string key (e.g., "normal") — never null for character rows.

4. **Dialogue row data model:** `page.dialogues[idx]` = `{ speaker, text, expression, voice }`
   - `expression` is **nullable** — `null` means "don't change expression on this dialogue line."
   - Default: `{ speaker: null, text: '', expression: null, voice: null }`

5. **Image path construction:** `asset://${expressions[exprName]}` → e.g., `asset://characters/sakura_happy.png`
   - The `asset://` protocol resolves to `{projectPath}/assets/{filePath}` (see electron/main.js line 946-949).

6. **Update handlers:**
   - Character: `setCharExpression(idx, expr)` → `page.characters[idx].expression = expr; script.pushState();`
   - Dialogue: `setDialogueExpression(expr)` → `selectedDialogue.expression = expr || null; script.pushState();`

**ExpressionDropdown props needed:**
| Prop | Type | Description |
|------|------|-------------|
| `expressions` | `Object` | `{ name: path }` dictionary from `getCharExpressions(charId)` |
| `modelValue` | `String` | Current expression name (or `''`/`null` for unchanged) |
| `nullable` | `Boolean` | If true, shows "不變" option. Default: false |

**ExpressionDropdown emit:**
| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `String` | Selected expression name, or `''` for unchanged |

### 3. Reusable Patterns

#### 3.1 CharacterPicker Grid (exact CSS to adapt)

**Source:** `src/editor/components/page-editor/CharacterPicker.vue`

Grid setup:
```css
.expr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));  /* → change to 60px */
  gap: 8px;
  margin-top: 8px;
}
```

Individual thumbnail card:
```css
.expr-thumb {
  width: 80px;           /* → change to 60px for D-03 */
  background: #1a1a1a;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  overflow: hidden;
  border: 1px solid #333;
  transition: border-color 0.15s;
  position: relative;
}
.expr-thumb:hover { border-color: #555; background: #222; }
.expr-thumb.selected { border: 2px solid #007acc; }
```

Image rendering:
```html
<img :src="`asset://${exprPath}`" :alt="exprName" draggable="false" />
```
```css
.expr-img-wrap img {
  width: 64px;    /* → change to 48px for D-03 */
  height: 64px;   /* → change to 48px for D-03 */
  object-fit: contain;
  display: block;
}
```

Expression name label:
```css
.expr-name {
  font-size: 11px;
  color: #aaa;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

**Key adaptation:** Scale from 80px/64×64 → 60px/48×48 per D-03. The `text-overflow: ellipsis` pattern is already established.

#### 3.2 HelpTip Positioning (getBoundingClientRect + viewport flip)

**Source:** `src/editor/components/HelpTip.vue`

Core positioning logic:
```js
async function onEnter() {
  show.value = true;
  await nextTick();
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const centerY = rect.top + rect.height / 2;
  const rightEdge = rect.right + 8;
  const flipped = (rightEdge + 280) > window.innerWidth;
  pos.value = {
    top: centerY,
    left: flipped ? rect.left - 8 : rightEdge,
    flipped,
  };
}
```

Style computation:
```js
const bubbleStyle = computed(() => {
  const style = {
    position: 'fixed',
    top: pos.value.top + 'px',
    transform: 'translateY(-50%)',
    zIndex: 9999,
  };
  if (pos.value.flipped) {
    style.right = (window.innerWidth - pos.value.left) + 'px';
  } else {
    style.left = pos.value.left + 'px';
  }
  return style;
});
```

**Adaptation for ExpressionDropdown:**
- HelpTip flips horizontally (left/right). ExpressionDropdown needs to flip **vertically** (below/above trigger per D-04).
- Logic pattern: `const rect = triggerRef.value.getBoundingClientRect()`, then check if `rect.bottom + dropdownHeight > window.innerHeight` → flip to show above trigger.
- Use `position: fixed; left: rect.left; top: rect.bottom + gap` (or `bottom: window.innerHeight - rect.top + gap` when flipped up).

**CRITICAL: Uses unscoped CSS.** HelpTip uses `<style>` (no scoped) because Teleport renders outside the component DOM tree. The ExpressionDropdown's dropdown panel (Teleported to body) must also use **unscoped CSS** or `:deep()` or a separate `<style>` block for the teleported content.

#### 3.3 AudioPicker Teleport Structure

**Source:** `src/editor/components/page-editor/AudioPicker.vue`

```html
<Teleport to="body">
  <div v-if="visible" class="audio-picker-overlay" @click="onOverlayClick">
    <div class="audio-picker-modal">
      <!-- content -->
    </div>
  </div>
</Teleport>
```

Overlay CSS:
```css
.audio-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);  /* Dark overlay */
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Adaptation for ExpressionDropdown:**
- AudioPicker/AssetPickerModal use a **visible dark overlay** for modal behavior.
- ExpressionDropdown should use a **transparent overlay** (`background: transparent`) — it's a lightweight dropdown, not a modal dialog.
- The overlay provides click-outside-to-close without the visual dimming effect.

#### 3.4 Click-Outside Close Pattern

**Source:** `src/editor/components/resource-library/AssetPickerModal.vue`

```js
function onOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close');
}
```

**For ExpressionDropdown:** Since using a full-viewport transparent overlay, clicking anywhere on the overlay (which is the area outside the dropdown panel) will close it. The `e.target === e.currentTarget` check ensures clicks inside the dropdown panel (which is a child of the overlay) don't close it.

### 4. ESC Key Chain Analysis

#### Runtime Engine ESC Chain (src/main.js lines 452-460)
```js
if (e.key === 'Escape') {
  if (!saveLoadScreen.el.classList.contains('hidden')) { saveLoadScreen.hide(); return; }
  if (settingsScreen.isVisible) { settingsScreen.hide(); return; }
  if (!backlogScreen.el.classList.contains('hidden')) { backlogScreen.hide(); return; }
  if (!gameMenu.el.classList.contains('hidden')) { gameMenu.hide(); return; }
  if (isPlaying) { gameMenu.show(); return; }
}
```

#### Editor ESC Chain (src/editor/App.vue)
The editor has **NO ESC handler** — only Ctrl+Z/Y/S shortcuts:
```js
function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { /* undo */ }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { /* redo */ }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { /* save */ }
}
```

#### ESC Strategy for ExpressionDropdown

The ExpressionDropdown runs in the **editor window**, not the game preview window. The editor has no competing ESC handlers. However, D-04 explicitly requires `stopPropagation` as a safety measure (and future-proofing). Implementation:

```js
function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    close();
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown, true)); // capture phase
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown, true));
```

**Use capture phase** (`true` third argument) to intercept ESC before any other handlers. Only register when dropdown is actually open to avoid blocking other ESC uses.

### 5. Asset Protocol for Expression Images

**Protocol:** `asset://` — registered as privileged scheme in electron/main.js.

**Resolution (electron/main.js lines 928-953):**
```js
protocol.handle('asset', async (request) => {
  const url = new URL(request.url);
  const filePath = decodeURIComponent(url.hostname + url.pathname);
  // ...
  const base = currentProjectPath
    ? path.join(currentProjectPath, 'assets')
    : path.join(process.env.APP_ROOT, 'public', 'game');
  const fullPath = path.resolve(path.join(base, filePath));
  // Security check + serve file
});
```

**Usage pattern:** Given expression data `{ "happy": "characters/sakura_happy.png" }`, the img src is:
```html
<img :src="`asset://${expressions[exprName]}`" />
```
This resolves to: `{projectPath}/assets/characters/sakura_happy.png`

**For the trigger's 24px thumbnail:** Same pattern, just with CSS sizing constraints:
```html
<img :src="`asset://${expressions[modelValue]}`" 
     style="width: 24px; height: 24px; object-fit: contain;" />
```

### 6. File Organization

**New file location:** `src/editor/components/page-editor/ExpressionDropdown.vue`

**Rationale:**
- All page-editor-specific components live in `src/editor/components/page-editor/`
- Peer components in same directory: `CharacterPicker.vue`, `AudioPicker.vue`, `PageInspector.vue`, `PageCanvas.vue`, `SceneTree.vue`
- PascalCase naming convention matches existing components
- ExpressionDropdown is only used by PageInspector (page-editor context)

**Directory listing of page-editor:**
```
src/editor/components/page-editor/
├── AudioPicker.vue
├── CanvasToolbar.vue
├── CharacterPicker.vue
├── ExpressionDropdown.vue  ← NEW
├── PageCanvas.vue
├── PageInspector.vue       ← MODIFIED
├── SceneTree.vue
└── VoiceMatchPreview.vue
```

## Architecture Patterns

### ExpressionDropdown Component API Design

```vue
<!-- Usage in PageInspector — Character row (required mode) -->
<ExpressionDropdown
  :expressions="getCharExpressions(char.id)"
  :modelValue="char.expression"
  @update:modelValue="setCharExpression(idx, $event)"
  @click.stop
/>

<!-- Usage in PageInspector — Dialogue row (nullable mode) -->
<ExpressionDropdown
  :expressions="getCharExpressions(selectedDialogue.speaker)"
  :modelValue="selectedDialogue.expression || ''"
  @update:modelValue="setDialogueExpression($event)"
  nullable
/>
```

### Component Internal Structure

```
ExpressionDropdown.vue
├─ Trigger (inline span/button)
│   ├─ 24px thumbnail img (when value selected)
│   ├─ Expression name text
│   └─ ▼ arrow
├─ <Teleport to="body">
│   └─ div.expr-dropdown-overlay (transparent, fixed, inset:0, z-index:9999)
│       └─ div.expr-dropdown-panel (fixed, positioned by getBoundingClientRect)
│           ├─ div.unchanged-card (only if nullable=true) — "不變" text card
│           └─ div.expr-grid
│               └─ div.expr-cell (for each expression)
│                   ├─ img 48×48
│                   └─ span (expression name, truncated)
```

### Anti-Patterns to Avoid

- **Using `position: absolute` instead of `fixed`:** The inspector panel has `overflow-y: auto` — absolute positioning would be clipped. Must use Teleport + fixed positioning.
- **Scoped CSS for Teleported content:** Teleported DOM lives outside the component tree. Use unscoped `<style>` block (or a second `<style>` without scoped) for dropdown panel styles. The trigger styles can remain scoped.
- **Not stopping event propagation on trigger click:** Character row has a parent `@click="editor.selectCharacter(idx)"` handler. The trigger must use `@click.stop` (or the parent integration must add it).
- **Registering ESC handler when dropdown is closed:** Only add the document-level keydown listener when the dropdown is open; remove it when closed. Otherwise it might interfere with other keyboard behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Viewport-aware positioning | Manual offset calculations from scratch | Copy HelpTip's `getBoundingClientRect()` + flip pattern | Edge cases with scrolling, viewport boundaries already solved |
| Click-outside close | Custom mousedown tracking | Transparent overlay div (AssetPickerModal pattern) | Simpler, handles edge cases like clicks on other teleported elements |
| Thumbnail grid | Custom flexbox layout | CSS Grid (CharacterPicker pattern) | `auto-fill` + `minmax()` handles varying expression counts automatically |

## Common Pitfalls

### Pitfall 1: Teleported Content Gets Clipped by Inspector Overflow
**What goes wrong:** Dropdown panel rendered inside inspector DOM gets cut off by `overflow-y: auto` on `.page-inspector`.
**Why it happens:** Inspector panel scrolls vertically, clipping absolutely-positioned children.
**How to avoid:** Use `<Teleport to="body">` + `position: fixed` (not absolute). This is the established pattern (HelpTip, AudioPicker).
**Warning signs:** Dropdown panel appears but is visually cut off at inspector boundary.

### Pitfall 2: Scoped CSS Doesn't Apply to Teleported Content
**What goes wrong:** Styles on the dropdown panel don't take effect.
**Why it happens:** Vue's `scoped` attribute adds a data attribute to component's DOM tree, but Teleported elements are outside that tree.
**How to avoid:** Use a separate `<style>` block (without `scoped`) for dropdown panel styles, or use `:global()` selectors. HelpTip demonstrates this pattern — it uses `<style>` (no scoped) for the `.help-tip-bubble` class.
**Warning signs:** Dropdown renders with no styling (browser defaults).

### Pitfall 3: ESC Key Closes Dropdown AND Triggers Other Actions
**What goes wrong:** Pressing ESC closes the dropdown but also triggers game menu or other handlers.
**Why it happens:** ESC event bubbles up to other document-level keydown listeners.
**How to avoid:** Use `e.stopPropagation()` in the dropdown's ESC handler. Register on capture phase (`addEventListener('keydown', handler, true)`) so it fires first.
**Warning signs:** Dropdown closes but an overlay or menu appears simultaneously.

### Pitfall 4: Dropdown Positioning Stale After Scroll
**What goes wrong:** User scrolls inspector while dropdown is open; dropdown panel stays at old position.
**Why it happens:** `getBoundingClientRect()` only computed at open time.
**How to avoid:** Either (a) close the dropdown on scroll events from the inspector panel, or (b) recalculate position on scroll. Option (a) is simpler and is acceptable UX for a quick selection dropdown.
**Warning signs:** Dropdown panel floats detached from trigger after scrolling.

### Pitfall 5: Empty Expressions Object
**What goes wrong:** Component crashes or shows nothing when character has no expressions.
**Why it happens:** `Object.entries({})` returns empty array, no grid cells to render.
**How to avoid:** Show a placeholder message like "该角色暂无表情" (matching CharacterPicker's `.expr-empty` pattern). This is discretionary per CONTEXT.md.
**Warning signs:** Empty dropdown with no visual cue about what to do.

## Code Examples

### ExpressionDropdown Positioning Logic (adapted from HelpTip)

```js
import { ref, computed, nextTick, onBeforeUnmount } from 'vue';

const isOpen = ref(false);
const triggerRef = ref(null);
const pos = ref({ top: 0, left: 0, flipUp: false });

async function open() {
  isOpen.value = true;
  await nextTick();
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const dropdownMaxHeight = 300; // D-03
  const gap = 4;
  const flipUp = (rect.bottom + gap + dropdownMaxHeight) > window.innerHeight;
  pos.value = {
    top: flipUp ? rect.top - gap : rect.bottom + gap,
    left: rect.left,
    flipUp,
  };
}

const panelStyle = computed(() => ({
  position: 'fixed',
  left: pos.value.left + 'px',
  zIndex: 9999,
  ...(pos.value.flipUp
    ? { bottom: (window.innerHeight - pos.value.top) + 'px' }
    : { top: pos.value.top + 'px' }),
}));
```

### ExpressionDropdown Grid (adapted from CharacterPicker)

```html
<div class="expr-dropdown-grid">
  <!-- "不變" card for nullable mode -->
  <div v-if="nullable" class="expr-dropdown-cell unchanged-cell"
    :class="{ selected: !modelValue }"
    @click="select('')">
    <div class="unchanged-label">不變</div>
  </div>
  <!-- Expression thumbnails -->
  <div v-for="(path, name) in expressions" :key="name"
    class="expr-dropdown-cell"
    :class="{ selected: modelValue === name }"
    @click="select(name)">
    <img :src="`asset://${path}`" :alt="name" draggable="false" />
    <div class="expr-dropdown-name">{{ name }}</div>
  </div>
</div>
```

```css
/* Unscoped — Teleported content */
.expr-dropdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  padding: 8px;
  max-height: 300px;
  overflow-y: auto;
}
.expr-dropdown-cell {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  overflow: hidden;
  transition: border-color 0.15s;
}
.expr-dropdown-cell:hover { border-color: #555; background: #222; }
.expr-dropdown-cell.selected { border: 2px solid #007acc; }
.expr-dropdown-cell img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  display: block;
  margin: 4px auto 0;
}
.expr-dropdown-name {
  font-size: 10px;
  color: #aaa;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.unchanged-cell {
  background: #3c3c3c;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70px;  /* Approximately match thumbnail cell height */
}
.unchanged-label {
  color: #aaa;
  font-size: 12px;
}
```

### Trigger Template (inline in inspector row)

```html
<span class="expr-dropdown-trigger" ref="triggerRef" @click.stop="toggle">
  <img v-if="modelValue && expressions[modelValue]"
    :src="`asset://${expressions[modelValue]}`"
    class="trigger-thumb" draggable="false" />
  <span class="trigger-text">{{ modelValue || '不變' }}</span>
  <span class="trigger-arrow">▼</span>
</span>
```

```css
/* Scoped — trigger lives inside component tree */
.expr-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 1px 4px;
  border: 1px solid #555;
  border-radius: 3px;
  background: #3c3c3c;
  font-size: 11px;
  color: #ccc;
}
.trigger-thumb {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 2px;
}
.trigger-arrow {
  font-size: 9px;
  color: #888;
}
```

### ESC Handler (register only when open)

```js
function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    close();
  }
}

watch(isOpen, (val) => {
  if (val) {
    document.addEventListener('keydown', onKeyDown, true);  // capture phase
  } else {
    document.removeEventListener('keydown', onKeyDown, true);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown, true);
});
```

### PageInspector Integration Replacement

**Character row — Replace lines 51-57:**
```html
<!-- Before -->
<select :value="char.expression" ...>...</select>

<!-- After -->
<ExpressionDropdown
  :expressions="getCharExpressions(char.id)"
  :modelValue="char.expression"
  @update:modelValue="setCharExpression(idx, $event)"
  @click.stop
/>
```

**Dialogue row — Replace lines 117-125:**
```html
<!-- Before -->
<div class="form-group" v-if="selectedDialogue.speaker && isCharId(selectedDialogue.speaker)">
  <label>表情变化</label>
  <select :value="selectedDialogue.expression || ''" ...>...</select>
</div>

<!-- After -->
<div class="form-group" v-if="selectedDialogue.speaker && isCharId(selectedDialogue.speaker)">
  <label>表情变化</label>
  <ExpressionDropdown
    :expressions="getCharExpressions(selectedDialogue.speaker)"
    :modelValue="selectedDialogue.expression || ''"
    @update:modelValue="setDialogueExpression($event)"
    nullable
  />
</div>
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None — uses `node --test` |
| Quick run command | `node --test tests/scriptEngine.test.js` |
| Full suite command | `node --test tests/scriptEngine.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | ExpressionDropdown renders thumbnail grid, opens/closes, selects expression | manual-only | N/A — Vue component requires browser/Electron environment | ❌ |
| UI-02 | PageInspector uses ExpressionDropdown instead of `<select>` | manual-only | N/A — Vue component integration, no headless test infra | ❌ |

**Justification:** The project has no component testing framework (no Vitest, no @vue/test-utils, no Playwright). All existing tests are engine-level unit tests using `node:test`. UI component testing would require significant infrastructure setup that is out of scope for this phase.

### Sampling Rate
- **Per task commit:** Manual visual verification in editor
- **Per wave merge:** Open editor, verify both expression selectors (character row + dialogue row) work
- **Phase gate:** Visual confirmation of all 4 success criteria

### Wave 0 Gaps
None — no automated test infrastructure for Vue components exists, and adding it is out of scope for this phase.

## Risks and Considerations

### Risk 1: Trigger Width in Character Row
The character row is compact (`gap: 6px`). The trigger (24px thumb + name + arrow) might push the layout if expression names are long. **Mitigation:** Constrain trigger width with `max-width` and `text-overflow: ellipsis` on the name text, similar to `.mini-select` sizing.

### Risk 2: Z-Index Conflicts with Other Teleported Components
Multiple components use `z-index: 9999` for their teleported overlays (HelpTip, AudioPicker, CharacterPicker). If ExpressionDropdown and another popup are open simultaneously, they could conflict. **Mitigation:** ExpressionDropdown should also use `z-index: 9999` for consistency. In practice, only one dropdown/popup should be open at a time — clicking the overlay closes the current one.

### Risk 3: Rapid Open/Close Race Condition
If user clicks trigger rapidly, `nextTick` positioning calculation might fire after component is already closed. **Mitigation:** Guard `open()` with an `isOpen` check before applying position values.

## Sources

### Primary (HIGH confidence)
- `src/editor/components/page-editor/PageInspector.vue` — Full file read, all integration points verified
- `src/editor/components/page-editor/CharacterPicker.vue` — Full file read, grid pattern extracted
- `src/editor/components/page-editor/AudioPicker.vue` — Full file read, Teleport pattern extracted
- `src/editor/components/resource-library/AssetPickerModal.vue` — Full file read, click-outside pattern extracted
- `src/editor/components/HelpTip.vue` — Full file read, positioning logic extracted
- `src/editor/stores/script.js` — Expression data structure verified
- `docs/bugfixes-2026-04-15.md` — ESC key chain fix (Bug 3) reviewed
- `src/main.js` — Runtime ESC handler chain verified (lines 452-460)
- `src/editor/App.vue` — Editor keyboard handler verified (no ESC handling)
- `electron/main.js` — asset:// protocol handler verified (lines 928-954)

### Secondary (MEDIUM confidence)
- `src/editor/views/Characters.vue` — Expression data creation pattern reviewed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed, pure Vue 3 + existing patterns
- Architecture: HIGH — all patterns extracted from real codebase files with exact line references
- Pitfalls: HIGH — all pitfalls derived from actual code analysis (overflow clipping, scoped CSS, ESC chain)

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable — no dependency changes expected)
