# PPT-Style Visual Editor — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Galgame Maker into a "PowerPoint-style" editor where users can freely position all visual elements (characters, dialogue boxes, buttons) by dragging on a 1280×720 canvas, with custom fonts/colors/sizes.

**Architecture:** Two-layer upgrade: (1) Extend the runtime engine to accept and render arbitrary x/y coordinates and style overrides for all visual elements while maintaining backward compatibility with existing scripts. (2) Add a canvas-based WYSIWYG editing mode to the Vue editor where elements can be dragged and configured visually.

**Tech Stack:** Vue 3 + Pinia (editor), Vanilla JS + CSS (engine), Electron IPC (desktop integration)

---

## Chunk 1: Engine Layer — Data-Driven Positioning

This chunk makes the runtime engine capable of rendering elements at arbitrary coordinates with custom styles. All changes are backward-compatible — existing `script.json` files continue to work unchanged.

### Task 1: Extend ScriptEngine Event Data

Pass through new optional positioning/style fields in all command executor methods.

**Files:**
- Modify: `src/engine/ScriptEngine.js:252-328`

- [ ] **Step 1: Extend `_execShowCharacter` to pass through x/y/scale**

In `src/engine/ScriptEngine.js`, replace lines 252-265:

```javascript
_execShowCharacter(cmd) {
  const char = this.script.characters[cmd.id];
  this.emit('show_character', {
    id: cmd.id,
    expression: cmd.expression,
    position: cmd.position || 'center',
    x: cmd.x,
    y: cmd.y,
    scale: cmd.scale,
    transition: cmd.transition || 'fade',
    duration: cmd.duration || 500,
    image: char?.expressions?.[cmd.expression] || '',
  });
  // Auto-advance after brief delay
  this.commandIndex++;
  setTimeout(() => this._executeCurrentCommand(), 50);
}
```

- [ ] **Step 2: Extend `_execDialogue` to pass through style**

Replace lines 235-249:

```javascript
_execDialogue(cmd) {
  const char = cmd.speaker ? this.script.characters[cmd.speaker] : null;
  const data = {
    speaker: cmd.speaker,
    speakerName: char?.name || null,
    speakerColor: char?.color || null,
    text: cmd.text,
    style: cmd.style || null,
  };
  this.history.push({
    speaker: cmd.speaker,
    speakerName: data.speakerName,
    text: cmd.text,
  });
  this.waiting = true;
  this.emit('dialogue', data);
}
```

- [ ] **Step 3: Extend `_execChoice` to pass through layout/style**

Replace lines 323-329:

```javascript
_execChoice(cmd) {
  this.waiting = true;
  this.emit('choice', {
    prompt: cmd.prompt,
    options: cmd.options,
    layout: cmd.layout || 'default',
    style: cmd.style || null,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/engine/ScriptEngine.js
git commit -m "feat(engine): pass through x/y/scale/style fields in command events

Extend ScriptEngine event data to include optional positioning and style
fields for show_character, dialogue, and choice commands. All fields are
optional to maintain backward compatibility.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Refactor CharacterLayer for Free Positioning

Support pixel coordinates alongside the existing left/center/right presets.

**Files:**
- Modify: `src/ui/CharacterLayer.js:21-61`
- Modify: `src/style.css:97-146`

- [ ] **Step 1: Update `show()` to support x/y/scale**

Replace `src/ui/CharacterLayer.js` lines 21-61 (the `show` method):

```javascript
show(data) {
  let el = this.characters.get(data.id);

  if (!el) {
    el = document.createElement('img');
    el.classList.add('character-sprite');
    el.dataset.characterId = data.id;
    el.draggable = false;
    this.container.appendChild(el);
    this.characters.set(data.id, el);
  }

  el.src = this.basePath + data.image;

  // Reset classes and inline positioning
  el.className = 'character-sprite';
  el.style.left = '';
  el.style.right = '';
  el.style.top = '';
  el.style.bottom = '';
  el.style.transform = '';

  // Positioning: prefer explicit x/y over preset position strings
  if (data.x !== undefined || data.y !== undefined) {
    el.classList.add('pos-custom');
    el.style.left = `${data.x ?? 640}px`;
    if (data.y !== undefined) {
      el.style.bottom = 'auto';
      el.style.top = `${data.y}px`;
    }
    if (data.scale) {
      el.style.transform = `scale(${data.scale})`;
    }
  } else {
    el.classList.add(`pos-${data.position || 'center'}`);
  }

  // Transition in
  const transition = data.transition || 'fade';
  const duration = data.duration || 500;
  el.style.transitionDuration = `${duration}ms`;

  if (transition === 'fade') {
    el.classList.add('enter-fade');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('entered'));
    });
  } else if (transition === 'slide_left') {
    el.classList.add('enter-slide-left');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('entered'));
    });
  } else if (transition === 'slide_right') {
    el.classList.add('enter-slide-right');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('entered'));
    });
  } else {
    el.classList.add('entered');
  }
}
```

- [ ] **Step 2: Add `.pos-custom` CSS rule and update `.entered` for custom positioning**

In `src/style.css`, after line 121 (after `.pos-right`), insert:

```css
.character-sprite.pos-custom {
  /* x/y set via inline style; don't anchor to bottom */
  bottom: auto;
}
```

Update the `.entered` rules (lines 139-146) to handle custom positioning:

Replace lines 139-146 with:

```css
.character-sprite.entered {
  opacity: 1;
}

.character-sprite.entered:not(.pos-custom) {
  transform: translateX(0) !important;
}

.character-sprite.pos-center.entered:not(.pos-custom) {
  transform: translateX(-50%) !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/CharacterLayer.js src/style.css
git commit -m "feat(character): support free x/y/scale positioning

CharacterLayer.show() now accepts optional x, y, and scale fields.
When provided, the sprite uses absolute pixel positioning instead of
preset left/center/right CSS classes. Backward compatible.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Refactor DialogueBox for Custom Styles

Allow the dialogue box position, size, font, and colors to be overridden per-command.

**Files:**
- Modify: `src/ui/DialogueBox.js:56-77`

- [ ] **Step 1: Add `_applyStyle` method and integrate into `show()`**

In `src/ui/DialogueBox.js`, add a new method before `hide()` (before line 79) and update `show()`:

Replace lines 56-77 (the `show` method):

```javascript
show(data) {
  this.el.classList.add('visible');

  // Apply custom style if provided
  this._applyStyle(data.style);

  // Speaker name
  if (data.speakerName) {
    this.nameEl.textContent = data.speakerName;
    this.nameEl.style.color = data.speakerColor || '#fff';
    this.nameEl.parentElement.classList.add('visible');
  } else {
    this.nameEl.textContent = '';
    this.nameEl.parentElement.classList.remove('visible');
  }

  // Start typewriter
  this._fullText = data.text;
  this._charIndex = 0;
  this._complete = false;
  this.textEl.textContent = '';
  this.indicatorEl.classList.remove('visible');

  this._startTypewriter();
}

_applyStyle(style) {
  // Reset to CSS defaults when no custom style
  if (!style) {
    this.el.style.cssText = '';
    this.textEl.style.cssText = '';
    return;
  }
  const s = style;
  if (s.x !== undefined) this.el.style.left = `${s.x}px`;
  if (s.y !== undefined) {
    this.el.style.bottom = 'auto';
    this.el.style.top = `${s.y}px`;
    this.el.style.right = 'auto';
  }
  if (s.width) this.el.style.width = `${s.width}px`;
  if (s.height) {
    this.el.style.height = `${s.height}px`;
    this.el.style.minHeight = 'unset';
  }
  if (s.fontSize) this.textEl.style.fontSize = `${s.fontSize}px`;
  if (s.fontFamily) this.textEl.style.fontFamily = s.fontFamily;
  if (s.textColor) this.textEl.style.color = s.textColor;
  if (s.backgroundColor) this.el.style.background = s.backgroundColor;
  if (s.borderRadius !== undefined) this.el.style.borderRadius = `${s.borderRadius}px`;
  if (s.padding) {
    const p = Array.isArray(s.padding) ? s.padding : [s.padding, s.padding, s.padding, s.padding];
    this.el.style.padding = p.map(v => `${v}px`).join(' ');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/DialogueBox.js
git commit -m "feat(dialogue): support custom position/font/color styles

DialogueBox.show() now accepts an optional 'style' object with fields
for x, y, width, height, fontSize, fontFamily, textColor, backgroundColor,
borderRadius, and padding. Falls back to CSS defaults when not provided.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Refactor ChoiceMenu for Custom Layout

Support per-button positioning and styling.

**Files:**
- Modify: `src/ui/ChoiceMenu.js:24-56`
- Modify: `src/style.css:236-256`

- [ ] **Step 1: Update `show()` to support custom layout**

Replace `src/ui/ChoiceMenu.js` lines 24-56:

```javascript
show(data) {
  this.el.innerHTML = '';
  this.el.style.cssText = '';

  // Custom layout mode
  const isCustom = data.layout === 'custom' && data.style;
  if (isCustom) {
    this.el.classList.add('layout-custom');
    const s = data.style;
    if (s.x !== undefined) this.el.style.left = `${s.x}px`;
    if (s.y !== undefined) this.el.style.top = `${s.y}px`;
    if (s.width) this.el.style.width = `${s.width}px`;
    if (s.backgroundColor) this.el.style.background = s.backgroundColor;
  } else {
    this.el.classList.remove('layout-custom');
  }

  if (data.prompt) {
    const promptEl = document.createElement('div');
    promptEl.className = 'choice-prompt';
    promptEl.textContent = data.prompt;
    this.el.appendChild(promptEl);
  }

  const list = document.createElement('div');
  list.className = 'choice-list';

  data.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'choice-button';
    btn.textContent = option.text;

    // Per-button custom style
    if (option.style) {
      const os = option.style;
      if (os.x !== undefined || os.y !== undefined) {
        btn.style.position = 'absolute';
        btn.style.left = `${os.x ?? 0}px`;
        btn.style.top = `${os.y ?? 0}px`;
      }
      if (os.width) btn.style.width = `${os.width}px`;
      if (os.height) btn.style.height = `${os.height}px`;
      if (os.fontSize) btn.style.fontSize = `${os.fontSize}px`;
      if (os.fontFamily) btn.style.fontFamily = os.fontFamily;
      if (os.color) btn.style.color = os.color;
      if (os.backgroundColor) btn.style.background = os.backgroundColor;
      if (os.borderRadius !== undefined) btn.style.borderRadius = `${os.borderRadius}px`;
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
      if (this.onSelect) this.onSelect(index);
    });
    list.appendChild(btn);
  });

  this.el.appendChild(list);
  this.el.classList.remove('hidden');

  // Animate in
  requestAnimationFrame(() => {
    this.el.classList.add('visible');
  });
}
```

- [ ] **Step 2: Add `.layout-custom` CSS**

In `src/style.css`, after line 256 (after `#choice-menu.hidden`), insert:

```css
#choice-menu.layout-custom {
  inset: auto;
  display: block;
  background: transparent;
  backdrop-filter: none;
}

#choice-menu.layout-custom .choice-list {
  position: relative;
  min-width: unset;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/ChoiceMenu.js src/style.css
git commit -m "feat(choice): support custom layout with per-button positioning

ChoiceMenu now supports layout:'custom' mode where the menu and individual
buttons can be freely positioned using x/y/width/height/style properties.
Default centered layout preserved for backward compatibility.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Refactor TitleScreen for Configurable Layout

Allow title screen elements (title text, buttons) to be positioned and styled from `script.json`.

**Files:**
- Modify: `src/ui/TitleScreen.js` (full rewrite of `_render`)
- Modify: `src/main.js:418-420` (pass UI config to title screen)

- [ ] **Step 1: Add `setLayout` method and update `_render` in TitleScreen**

Replace `src/ui/TitleScreen.js` entirely:

```javascript
/**
 * TitleScreen — Main menu (start, continue, settings)
 * Supports custom layout from script.json ui.titleScreen config.
 */
export class TitleScreen {
  /**
   * @param {HTMLElement} container
   * @param {string} gameTitle
   */
  constructor(container, gameTitle = 'Galgame Maker') {
    this.container = container;
    this.gameTitle = gameTitle;
    this.layout = null;

    this.el = document.createElement('div');
    this.el.id = 'title-screen';
    this.container.appendChild(this.el);

    /** @type {Function|null} */ this.onStart = null;
    /** @type {Function|null} */ this.onContinue = null;
    /** @type {Function|null} */ this.onSettings = null;

    /** @type {boolean} */ this.hasSave = false;
  }

  /**
   * Set custom layout configuration from script.json
   * @param {Object|null} layout — ui.titleScreen config object
   */
  setLayout(layout) {
    this.layout = layout;
  }

  show(hasSave = false) {
    this.hasSave = hasSave;
    if (this.layout && this.layout.elements) {
      this._renderCustom();
    } else {
      this._renderDefault();
    }
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    setTimeout(() => this.el.classList.add('hidden'), 800);
  }

  _renderDefault() {
    this.el.style.cssText = '';
    this.el.innerHTML = `
      <div class="title-game-name">${this.gameTitle}</div>
      <div class="title-menu">
        <button class="title-button" id="title-start">开 始 游 戏</button>
        ${this.hasSave ? '<button class="title-button" id="title-continue">继 续 游 戏</button>' : ''}
        <button class="title-button" id="title-settings">设 定</button>
      </div>
      <div class="title-subtitle">Powered by Galgame Maker</div>
    `;
    this._bindButtons();
  }

  _renderCustom() {
    this.el.innerHTML = '';
    // Keep flex layout as base but allow absolute children
    this.el.style.position = 'absolute';
    this.el.style.inset = '0';

    // Custom background
    if (this.layout.background) {
      this.el.style.backgroundImage = `url('/game/${this.layout.background}')`;
      this.el.style.backgroundSize = 'cover';
      this.el.style.backgroundPosition = 'center';
    }

    this.layout.elements.forEach(elem => {
      if (elem.type === 'text') {
        this._createTextElement(elem);
      } else if (elem.type === 'button') {
        this._createButtonElement(elem);
      }
    });
  }

  _createTextElement(cfg) {
    const el = document.createElement('div');
    el.className = 'title-custom-element';
    el.textContent = cfg.content || this.gameTitle;
    this._applyPosition(el, cfg);
    if (cfg.fontSize) el.style.fontSize = `${cfg.fontSize}px`;
    if (cfg.fontFamily) el.style.fontFamily = cfg.fontFamily;
    if (cfg.color) el.style.color = cfg.color;
    if (cfg.letterSpacing) el.style.letterSpacing = `${cfg.letterSpacing}px`;
    if (cfg.textShadow) el.style.textShadow = cfg.textShadow;
    this.el.appendChild(el);
  }

  _createButtonElement(cfg) {
    const btn = document.createElement('button');
    btn.className = 'title-custom-element title-custom-button';
    btn.textContent = cfg.text || '';
    this._applyPosition(btn, cfg);
    if (cfg.width) btn.style.width = `${cfg.width}px`;
    if (cfg.height) btn.style.height = `${cfg.height}px`;
    if (cfg.fontSize) btn.style.fontSize = `${cfg.fontSize}px`;
    if (cfg.fontFamily) btn.style.fontFamily = cfg.fontFamily;
    if (cfg.color) btn.style.color = cfg.color;
    if (cfg.backgroundColor) btn.style.background = cfg.backgroundColor;
    if (cfg.borderRadius !== undefined) btn.style.borderRadius = `${cfg.borderRadius}px`;
    if (cfg.border) btn.style.border = cfg.border;

    // Hover color
    if (cfg.hoverColor) {
      btn.addEventListener('mouseenter', () => { btn.style.color = cfg.hoverColor; });
      btn.addEventListener('mouseleave', () => { btn.style.color = cfg.color || ''; });
    }

    // Action binding
    const action = cfg.action;
    if (action === 'start') {
      btn.addEventListener('click', () => { if (this.onStart) this.onStart(); });
    } else if (action === 'continue') {
      if (!this.hasSave) { btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none'; }
      btn.addEventListener('click', () => { if (this.onContinue) this.onContinue(); });
    } else if (action === 'settings') {
      btn.addEventListener('click', () => { if (this.onSettings) this.onSettings(); });
    }
    this.el.appendChild(btn);
  }

  _applyPosition(el, cfg) {
    el.style.position = 'absolute';
    if (cfg.anchor === 'center') {
      el.style.left = `${cfg.x ?? 640}px`;
      el.style.top = `${cfg.y ?? 360}px`;
      el.style.transform = 'translate(-50%, -50%)';
    } else {
      if (cfg.x !== undefined) el.style.left = `${cfg.x}px`;
      if (cfg.y !== undefined) el.style.top = `${cfg.y}px`;
    }
  }

  _bindButtons() {
    this.el.querySelector('#title-start')?.addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });
    const continueBtn = this.el.querySelector('#title-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (this.onContinue) this.onContinue();
      });
    }
    this.el.querySelector('#title-settings')?.addEventListener('click', () => {
      if (this.onSettings) this.onSettings();
    });
  }
}
```

- [ ] **Step 2: Add CSS for custom title elements**

In `src/style.css`, after line 382 (after `.title-subtitle`), insert:

```css
.title-custom-element {
  position: absolute;
  user-select: none;
}

.title-custom-button {
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Noto Sans SC', sans-serif;
  letter-spacing: 2px;
  transition: all 0.3s ease;
}

.title-custom-button:hover {
  border-color: rgba(180, 160, 255, 0.4);
  background: rgba(180, 160, 255, 0.08);
}
```

- [ ] **Step 3: Wire layout config in main.js**

In `src/main.js`, update the `init()` function (around line 419). After `titleScreen.gameTitle = engine.script.meta.title;`, add:

```javascript
// Apply custom title screen layout if defined in script
if (engine.script.ui?.titleScreen) {
  titleScreen.setLayout(engine.script.ui.titleScreen);
}
```

- [ ] **Step 4: Also update `replayCurrentScene` in main.js to pass through new fields**

In `src/main.js`, update the `show_character` case in `replayCurrentScene` (around line 187-195) to include new fields:

```javascript
case 'show_character': {
  const char = engine.script.characters[cmd.id];
  characters.show({
    id: cmd.id,
    expression: cmd.expression,
    position: cmd.position || 'center',
    x: cmd.x,
    y: cmd.y,
    scale: cmd.scale,
    transition: 'none',
    duration: 0,
    image: char?.expressions?.[cmd.expression] || '',
  });
  break;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/TitleScreen.js src/style.css src/main.js
git commit -m "feat(title): support custom layout with freely positioned elements

TitleScreen now supports a configurable layout from script.json ui.titleScreen,
allowing text and button elements to be positioned at arbitrary coordinates
with custom fonts, colors, and sizes. Falls back to the default centered
layout when no custom config is provided.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Update script-format.md Documentation

Document the new positioning and style fields.

**Files:**
- Modify: `docs/script-format.md`

- [ ] **Step 1: Add new fields documentation**

Append a new section to `docs/script-format.md` documenting all new optional fields for each command type (x, y, scale, style, layout) and the new `ui.titleScreen` configuration object. Include code examples.

- [ ] **Step 2: Commit**

```bash
git add docs/script-format.md
git commit -m "docs: add free-positioning fields to script format reference

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Verify Engine Changes

Run the existing demo game to confirm backward compatibility.

- [ ] **Step 1: Run `npm run dev` and open the game in browser at localhost:3000**

Verify: The existing 「樱花之約」 demo plays correctly — title screen, dialogue, character sprites, choices, and endings all work as before.

- [ ] **Step 2: Add a test scene to `script.json` using new positioning fields**

Add a temporary test scene that uses `x`, `y`, `scale` on `show_character` and `style` on `dialogue` to verify new features render correctly.

- [ ] **Step 3: Remove test scene and commit clean state**

---

## Chunk 2: Editor — Canvas Preview Mode

This chunk adds the PPT-like visual editing experience to the Vue editor.

### Task 8: Create CanvasPreview Component

A reusable component that renders a 1280×720 preview of the current scene frame.

**Files:**
- Create: `src/editor/components/canvas/CanvasPreview.vue`

- [ ] **Step 1: Create the CanvasPreview component**

Create `src/editor/components/canvas/CanvasPreview.vue`:

This component:
- Renders a 1280×720 area scaled to fit the available space
- Shows background image, character sprites, dialogue box, and choice buttons as positioned DOM elements
- Emits `select(element)` when an element is clicked
- Emits `update:position(element, {x, y})` when an element is dragged

```vue
<template>
  <div class="canvas-container" ref="containerRef">
    <div class="canvas-viewport" ref="viewportRef"
         :style="{ transform: `scale(${viewScale})`, transformOrigin: 'top left' }">

      <!-- Background -->
      <div class="cv-background" v-if="background"
           :style="{ backgroundImage: `url(${assetUrl(background)})` }">
      </div>

      <!-- Character sprites -->
      <div v-for="char in visibleCharacters" :key="'char-'+char.id"
           class="cv-element cv-character"
           :class="{ selected: selectedId === 'char-'+char.id }"
           :style="getCharacterStyle(char)"
           @mousedown.stop="startDrag($event, 'char-'+char.id, char)"
           @click.stop="$emit('select', { type: 'character', data: char })">
        <img :src="assetUrl(char.image)" draggable="false" />
      </div>

      <!-- Dialogue box -->
      <div v-if="dialogue" class="cv-element cv-dialogue"
           :class="{ selected: selectedId === 'dialogue' }"
           :style="getDialogueStyle(dialogue)"
           @mousedown.stop="startDrag($event, 'dialogue', dialogue)"
           @click.stop="$emit('select', { type: 'dialogue', data: dialogue })">
        <div class="cv-dialogue-speaker" v-if="dialogue.speakerName">
          {{ dialogue.speakerName }}
        </div>
        <div class="cv-dialogue-text">{{ dialogue.text }}</div>
      </div>

      <!-- Choice buttons -->
      <div v-for="(opt, i) in choiceOptions" :key="'choice-'+i"
           class="cv-element cv-choice-btn"
           :class="{ selected: selectedId === 'choice-'+i }"
           :style="getChoiceButtonStyle(opt, i)"
           @mousedown.stop="startDrag($event, 'choice-'+i, opt)"
           @click.stop="$emit('select', { type: 'choice', index: i, data: opt })">
        {{ opt.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  background: String,
  visibleCharacters: { type: Array, default: () => [] },
  dialogue: { type: Object, default: null },
  choiceOptions: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
});

const emit = defineEmits(['select', 'update:position']);

const containerRef = ref(null);
const viewportRef = ref(null);
const viewScale = ref(1);

function assetUrl(path) {
  if (!path) return '';
  if (window.ipcRenderer) return `asset://${path}`;
  return `/game/${path}`;
}

function updateScale() {
  if (!containerRef.value) return;
  const { clientWidth, clientHeight } = containerRef.value;
  viewScale.value = Math.min(clientWidth / 1280, clientHeight / 720);
}

onMounted(() => {
  updateScale();
  window.addEventListener('resize', updateScale);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScale);
});

function getCharacterStyle(char) {
  const s = {};
  if (char.x !== undefined) {
    s.left = `${char.x}px`;
    s.top = char.y !== undefined ? `${char.y}px` : 'auto';
    s.bottom = char.y !== undefined ? 'auto' : '0';
  } else {
    const posMap = { left: '5%', center: '50%', right: '95%' };
    s.left = posMap[char.position] || '50%';
    s.bottom = '0';
    if (char.position === 'center') s.transform = 'translateX(-50%)';
    if (char.position === 'right') s.transform = 'translateX(-100%)';
  }
  s.height = '90%';
  if (char.scale) s.transform = `scale(${char.scale})`;
  return s;
}

function getDialogueStyle(dlg) {
  if (dlg.style) {
    const ds = dlg.style;
    return {
      left: ds.x !== undefined ? `${ds.x}px` : '0',
      top: ds.y !== undefined ? `${ds.y}px` : 'auto',
      bottom: ds.y !== undefined ? 'auto' : '0',
      width: ds.width ? `${ds.width}px` : '100%',
      height: ds.height ? `${ds.height}px` : 'auto',
      fontSize: ds.fontSize ? `${ds.fontSize}px` : undefined,
    };
  }
  return { bottom: '0', left: '0', right: '0', minHeight: '200px' };
}

function getChoiceButtonStyle(opt, index) {
  if (opt.style) {
    const os = opt.style;
    return {
      position: 'absolute',
      left: `${os.x ?? 440}px`,
      top: `${os.y ?? (300 + index * 60)}px`,
      width: os.width ? `${os.width}px` : '400px',
      height: os.height ? `${os.height}px` : '50px',
      fontSize: os.fontSize ? `${os.fontSize}px` : '17px',
    };
  }
  return {
    position: 'absolute',
    left: '440px',
    top: `${300 + index * 60}px`,
    width: '400px',
    height: '50px',
  };
}

// ─── Drag logic ─────────────────────────────────────────
let dragging = null;

function startDrag(e, id, data) {
  emit('select', { type: id.split('-')[0], data });
  const rect = e.currentTarget.getBoundingClientRect();
  dragging = {
    id,
    data,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(e) {
  if (!dragging || !viewportRef.value) return;
  const vpRect = viewportRef.value.getBoundingClientRect();
  const scale = viewScale.value;
  const x = Math.round((e.clientX - vpRect.left) / scale - dragging.offsetX);
  const y = Math.round((e.clientY - vpRect.top) / scale - dragging.offsetY);
  emit('update:position', { id: dragging.id, data: dragging.data, x, y });
}

function stopDrag() {
  dragging = null;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}
</script>

<style scoped>
.canvas-container {
  flex: 1;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.canvas-viewport {
  width: 1280px;
  height: 720px;
  position: relative;
  overflow: hidden;
  background: #222;
  box-shadow: 0 0 40px rgba(0,0,0,0.5);
}

.cv-background {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.cv-element {
  position: absolute;
  cursor: move;
  box-sizing: border-box;
}

.cv-element.selected {
  outline: 2px solid #007acc;
  outline-offset: 2px;
}

.cv-character { pointer-events: auto; }
.cv-character img { height: 100%; object-fit: contain; pointer-events: none; }

.cv-dialogue {
  background: rgba(8, 8, 20, 0.85);
  padding: 16px 40px;
  color: #fff;
  font-size: 16px;
}

.cv-dialogue-speaker {
  font-weight: bold;
  margin-bottom: 6px;
  font-size: 18px;
}

.cv-choice-btn {
  background: rgba(60, 60, 100, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/editor/components/canvas/CanvasPreview.vue
git commit -m "feat(editor): add CanvasPreview component with drag support

Renders a 1280x720 scaled preview showing background, characters, dialogue,
and choice buttons. Elements can be selected and dragged to update positions.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 9: Add Canvas Mode to Scenes View

Integrate the canvas preview into the Scenes view with a timeline/canvas toggle.

**Files:**
- Modify: `src/editor/views/Scenes.vue`

- [ ] **Step 1: Add view mode toggle and canvas integration**

Update `src/editor/views/Scenes.vue`:

1. Import `CanvasPreview` component
2. Add a `viewMode` ref (`'timeline'` | `'canvas'`)
3. Add toggle buttons in the toolbar
4. Add computed properties that extract the visual state of the currently selected command
5. Conditionally render either the timeline or the canvas preview
6. Handle `update:position` events to write x/y back into the command data

Key additions to the `<script setup>`:

```javascript
import CanvasPreview from '../components/canvas/CanvasPreview.vue';

const viewMode = ref('timeline');

// Compute visual state for canvas preview by scanning commands up to selectedCmdIndex
const canvasState = computed(() => {
  if (!selectedScene.value || selectedCmdIndex.value < 0) {
    return { background: null, characters: [], dialogue: null, choices: [] };
  }
  const cmds = selectedScene.value.commands;
  const chars = {};
  let bg = null;
  let dlg = null;
  let choices = [];

  for (let i = 0; i <= selectedCmdIndex.value; i++) {
    const c = cmds[i];
    if (!c) break;
    if (c.type === 'set_background') bg = c.image;
    if (c.type === 'show_character') {
      const charDef = script.data?.characters?.[c.id];
      chars[c.id] = {
        id: c.id, position: c.position || 'center',
        x: c.x, y: c.y, scale: c.scale,
        image: charDef?.expressions?.[c.expression] || '',
      };
    }
    if (c.type === 'hide_character') delete chars[c.id];
    if (c.type === 'set_expression') {
      if (chars[c.id]) {
        const charDef = script.data?.characters?.[c.id];
        chars[c.id].image = charDef?.expressions?.[c.expression] || '';
      }
    }
    if (c.type === 'dialogue') {
      const charDef = c.speaker ? script.data?.characters?.[c.speaker] : null;
      dlg = { speakerName: charDef?.name || null, text: c.text, style: c.style };
    }
    if (c.type === 'choice') choices = c.options || [];
  }
  return { background: bg, characters: Object.values(chars), dialogue: dlg, choices };
});
```

Add `handlePositionUpdate` function that updates the command's x/y fields when dragged on canvas.

- [ ] **Step 2: Add toggle buttons to toolbar in template**

In the toolbar `<div class="actions">`, prepend view mode buttons:

```html
<div class="view-toggle">
  <button :class="{ active: viewMode === 'timeline' }" @click="viewMode = 'timeline'">📋 Timeline</button>
  <button :class="{ active: viewMode === 'canvas' }" @click="viewMode = 'canvas'">🖼️ Canvas</button>
</div>
```

- [ ] **Step 3: Conditionally render timeline or canvas in template**

Wrap the existing `<div class="timeline">` in `v-if="viewMode === 'timeline'"` and add the canvas view:

```html
<CanvasPreview
  v-if="viewMode === 'canvas'"
  :background="canvasState.background"
  :visible-characters="canvasState.characters"
  :dialogue="canvasState.dialogue"
  :choice-options="canvasState.choices"
  :selected-id="canvasSelectedId"
  @select="onCanvasSelect"
  @update:position="onCanvasPositionUpdate"
/>
```

- [ ] **Step 4: Add CSS for view toggle**

```css
.view-toggle { display: flex; gap: 4px; margin-right: 10px; }
.view-toggle button {
  background: #3c3c3c; border: 1px solid #555; color: #aaa;
  padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
}
.view-toggle button.active { background: #007acc; color: #fff; border-color: #007acc; }
```

- [ ] **Step 5: Commit**

```bash
git add src/editor/views/Scenes.vue
git commit -m "feat(editor): integrate canvas preview mode in scenes view

Add timeline/canvas view toggle. Canvas mode shows a 1280x720 preview
of the current scene frame with draggable elements. Dragging updates
x/y coordinates in the command data.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 10: Extend Inspector for Position/Style Properties

When in canvas mode and an element is selected, show x/y/size/style fields in the inspector.

**Files:**
- Modify: `src/editor/views/Scenes.vue` (inspector section)

- [ ] **Step 1: Add position/style fields to the inspector template**

In the inspector body, add a new section for spatial properties that appears for relevant command types:

```html
<!-- Position & Style (for show_character with custom positioning) -->
<template v-if="selectedCmd.type === 'show_character'">
  <div class="form-group">
    <label>Positioning Mode</label>
    <select v-model="positioningMode" @change="onPositioningModeChange">
      <option value="preset">Preset (Left / Center / Right)</option>
      <option value="custom">Custom (x / y coordinates)</option>
    </select>
  </div>
  <!-- show preset or custom fields based on mode -->
</template>

<!-- Dialogue Style -->
<template v-if="selectedCmd.type === 'dialogue'">
  <details class="style-section">
    <summary>Custom Style</summary>
    <!-- x, y, width, height, fontSize, fontFamily, textColor, backgroundColor fields -->
  </details>
</template>
```

- [ ] **Step 2: Add computed `positioningMode` and handler**

```javascript
const positioningMode = computed({
  get() {
    if (!selectedCmd.value) return 'preset';
    return (selectedCmd.value.x !== undefined || selectedCmd.value.y !== undefined) ? 'custom' : 'preset';
  },
  set(mode) {
    if (!selectedCmd.value) return;
    if (mode === 'custom') {
      selectedCmd.value.x = selectedCmd.value.x ?? 640;
      selectedCmd.value.y = selectedCmd.value.y ?? 200;
    } else {
      delete selectedCmd.value.x;
      delete selectedCmd.value.y;
      delete selectedCmd.value.scale;
      if (!selectedCmd.value.position) selectedCmd.value.position = 'center';
    }
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/editor/views/Scenes.vue
git commit -m "feat(editor): add position/style fields to inspector panel

Inspector now shows x/y/scale fields for characters and style options
for dialogue/choice commands. Supports toggling between preset and
custom positioning modes.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 11: End-to-End Verification

Run both the editor and runtime to verify everything works together.

- [ ] **Step 1: Run `npm run dev` and open the Electron editor**

Verify:
- Editor launches without errors
- Navigate to Scenes → select a scene → see commands
- Toggle to Canvas view → see 1280×720 preview with background and characters
- Click a character in canvas → see it highlighted + inspector shows properties
- Drag a character → see x/y update in inspector
- Switch to timeline → see x/y values in the command data
- Click "Save Script" → confirm script.json is updated
- Click "Play Preview" → confirm the game renders with new positions

- [ ] **Step 2: Test backward compatibility**

Reset `script.json` to its original state (no x/y fields). Verify the runtime plays normally with all preset positions working.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: PPT-style visual editor — engine + canvas preview

Phase 2.1: Runtime engine now supports free x/y/scale positioning for
characters, custom styles for dialogue boxes and choice menus, and
configurable title screen layouts — all backward compatible.

Phase 2.2: Editor now includes a canvas preview mode where elements
can be dragged to set positions visually, like editing a PowerPoint slide.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
