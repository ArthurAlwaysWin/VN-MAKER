<template>
  <div class="canvas-wrapper" ref="wrapperRef" @click="onCanvasClick">
    <div class="canvas-artboard" :style="artboardStyle" v-if="page">
      <!-- Background -->
      <div class="canvas-bg" :style="bgStyle"></div>

      <!-- Grid overlay -->
      <svg v-if="editor.gridVisible.value" class="canvas-grid-overlay" :width="GAME_W" :height="GAME_H">
        <line v-for="gx in gridLinesX" :key="'gx-'+gx" :x1="gx" y1="0" :x2="gx" :y2="GAME_H" />
        <line v-for="gy in gridLinesY" :key="'gy-'+gy" x1="0" :y1="gy" :x2="GAME_W" :y2="gy" />
      </svg>

      <!-- Snap guide overlay -->
      <svg class="canvas-guide-overlay" :width="GAME_W" :height="GAME_H" v-if="localGuides.length">
        <line v-for="(g, i) in localGuides" :key="'g-'+i"
          :x1="g.axis === 'x' ? g.at : 0"
          :y1="g.axis === 'y' ? g.at : 0"
          :x2="g.axis === 'x' ? g.at : GAME_W"
          :y2="g.axis === 'y' ? g.at : GAME_H"
          class="guide-line"
        />
      </svg>

      <!-- Characters -->
      <DraggableElement
        v-for="(char, idx) in page.characters"
        :key="char.id + '-' + idx"
        :x="getCharX(char)"
        :y="getCharY(char)"
        :scale="char.scale || 1"
        :is-selected="editor.selectedCharIndex.value === idx"
        :canvas-scale="canvasScale"
        :scalable="true"
        :snap-fn="buildCharSnapFn(idx)"
        @select="editor.selectCharacter(idx)"
        @move="onCharMove(idx, $event)"
        @move-end="onCharMoveCommit(idx, $event)"
        @scale="onCharScale(idx, $event)"
        @scale-end="onCharScaleCommit(idx, $event)"
        @guides="onGuidesUpdate">
        <div class="canvas-character">
          <img v-if="getCharImage(char)" :src="getCharImage(char)" class="char-sprite" />
          <div v-else class="char-placeholder">
            <span class="char-icon">🧑</span>
            <span class="char-label">{{ getCharName(char.id) }}</span>
          </div>
        </div>
      </DraggableElement>

      <!-- Dialogue box -->
      <div v-if="page && page.type === 'normal' && currentDialogue" class="canvas-dialogue"
        :style="dialogueBoxStyle"
        :class="{ editing: isEditingDialogue }"
        @dblclick.stop="startInlineEdit"
        @click.stop="onDialogueClick">
        <template v-if="!isEditingDialogue">
          <div class="dlg-speaker" v-if="currentDialogue.speaker" :style="speakerStyle">
            {{ getCharName(currentDialogue.speaker) }}
          </div>
          <div class="dlg-text" :style="dialogueTextStyle">{{ currentDialogue.text || '...' }}</div>
        </template>
        <textarea v-else
          ref="inlineTextarea"
          :value="currentDialogue.text"
          @input="onInlineTextInput($event.target.value)"
          @blur="stopInlineEdit"
          @keydown.escape="stopInlineEdit"
          class="inline-edit-textarea"
        />
      </div>

      <!-- Dialogue index navigation pills -->
      <div v-if="page && page.type === 'normal' && page.dialogues && page.dialogues.length > 1" class="dialogue-nav">
        <button v-for="(dlg, i) in page.dialogues" :key="i"
          class="dlg-nav-btn" :class="{ active: editor.selectedDialogueIndex.value === i }"
          @click.stop="editor.selectDialogue(i)"
          :title="`切换到第 ${i + 1} 条对话`">
          {{ i + 1 }}
        </button>
      </div>

      <!-- Choice options preview (choice pages only) -->
      <div v-if="page && page.type === 'choice'" class="canvas-choices">
        <div class="choice-prompt" v-if="page.prompt">{{ page.prompt }}</div>
        <div class="choice-prompt choice-prompt-empty" v-else>请做出选择...</div>
        <button v-for="(opt, idx) in (page.options || [])" :key="idx"
          class="choice-btn" @click.stop :title="opt.text || `选项 ${idx + 1}`">
          {{ opt.text || `选项 ${idx + 1}` }}
        </button>
      </div>

      <div v-if="page && page.type === 'condition'" class="canvas-condition-hint">
        条件页不显示对白画布预览
      </div>

      <div v-if="page && page.type === 'input'" class="canvas-input-preview">
        <div class="input-prompt">{{ page.prompt || '请输入主角名字' }}</div>
        <div class="input-row">
          <div class="input-field-preview">{{ page.defaultValue || page.placeholder || '名字' }}</div>
          <button type="button">{{ page.submitText || '确定' }}</button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="canvas-empty">
      <div class="empty-label">未选中页面</div>
      <div class="empty-hint">在左侧选择一个页面开始编辑</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import DraggableElement from '../canvas/DraggableElement.vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';
import { getElementBounds, computeSnap } from '../../utils/snapGuides.js';

const editor = usePageEditor();
const script = useScriptStore();
const wrapperRef = ref(null);
const canvasScale = ref(1);
const isEditingDialogue = ref(false);
const inlineTextarea = ref(null);
const localGuides = ref([]); // guide lines during drag

const GAME_W = 1280;
const GAME_H = 720;
const PRESET_X = { left: 200, center: 640, right: 1080 };
const PRESET_Y = 200;

let resizeObserver = null;

const page = computed(() => editor.currentPage.value);
const currentDialogue = computed(() => editor.currentDialogue.value);

const gridLinesX = computed(() => {
  const gs = editor.gridSize.value;
  const lines = [];
  for (let x = gs; x < GAME_W; x += gs) lines.push(x);
  return lines;
});
const gridLinesY = computed(() => {
  const gs = editor.gridSize.value;
  const lines = [];
  for (let y = gs; y < GAME_H; y += gs) lines.push(y);
  return lines;
});

const artboardStyle = computed(() => ({
  width: GAME_W + 'px',
  height: GAME_H + 'px',
  transform: `scale(${canvasScale.value})`,
  transformOrigin: 'top left',
}));

const bgStyle = computed(() => {
  const bg = page.value?.background;
  if (!bg) return { background: '#1a1a2e' };
  return {
    backgroundImage: `url("${resolveAsset(bg)}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
});

function resolveAsset(path) {
  if (!path) return '';
  if (path.startsWith('asset://') || path.startsWith('http')) return path;
  return `asset://${path}`;
}

function updateScale() {
  if (!wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();
  const padded_w = rect.width - 32;
  const padded_h = rect.height - 32;
  canvasScale.value = Math.min(padded_w / GAME_W, padded_h / GAME_H, 1);
}

onMounted(() => {
  updateScale();
  if (wrapperRef.value) {
    resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(wrapperRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

// Character helpers
function getCharX(char) {
  return char.x != null ? char.x : (PRESET_X[char.position] || PRESET_X.center);
}

function getCharY(char) {
  return char.y != null ? char.y : PRESET_Y;
}

function findInheritedExpression(charId) {
  const scene = script.data?.scenes?.[editor.selectedSceneId.value];
  if (!scene?.pages) return null;
  const pageIdx = editor.selectedPageIndex.value;
  for (let i = pageIdx - 1; i >= 0; i--) {
    const prevChars = scene.pages[i]?.characters || [];
    const match = prevChars.find(c => c.id === charId);
    if (match?.expression) return match.expression;
  }
  return null;
}

function getCharImage(char) {
  const charDef = script.data?.characters?.[char.id];
  const expressions = charDef?.expressions || {};
  // D-08 resolution: explicit (validated) → inherited → first expression → null
  const explicit = char.expression && expressions[char.expression] ? char.expression : null;
  const inherited = !explicit ? findInheritedExpression(char.id) : null;
  const validInherited = inherited && expressions[inherited] ? inherited : null;
  const resolved = explicit || validInherited || Object.keys(expressions)[0] || null;
  if (!resolved) return null;
  const path = expressions[resolved];
  return path ? resolveAsset(path) : null;
}

function getCharName(charId) {
  return script.data?.characters?.[charId]?.name || charId || '';
}

// ─── Snap computation ──────────────────────────────────────
function buildCharSnapFn(charIndex) {
  return (rawX, rawY) => {
    if (!editor.snapEnabled.value) return null;
    const char = page.value?.characters?.[charIndex];
    if (!char) return null;

    // Estimate character bounding box
    const charW = char._width || 120;
    const charH = char._height || 200;
    const sc = char.scale || 1;
    const activeBounds = {
      left: rawX,
      top: rawY,
      right: rawX + charW * sc,
      bottom: rawY + charH * sc,
      centerX: rawX + (charW * sc) / 2,
      centerY: rawY + (charH * sc) / 2,
      width: charW * sc,
      height: charH * sc,
    };

    // Build peer bounds from other characters
    const peerBounds = [];
    for (let i = 0; i < (page.value?.characters?.length || 0); i++) {
      if (i === charIndex) continue;
      const peer = page.value.characters[i];
      const pw = peer._width || 120;
      const ph = peer._height || 200;
      const ps = peer.scale || 1;
      peerBounds.push({
        id: peer.id + '-' + i,
        x: getCharX(peer),
        y: getCharY(peer),
        width: pw * ps,
        height: ph * ps,
        scale: 1,
      });
    }

    const result = computeSnap({
      activeBounds,
      canvasBounds: { width: GAME_W, height: GAME_H },
      peerBounds,
      threshold: 6,
      zoom: canvasScale.value,
      enableCanvas: true,
      enablePeers: true,
      enableGrid: editor.gridVisible.value,
      gridSize: editor.gridSize.value,
    });

    return {
      x: rawX + result.deltaX,
      y: rawY + result.deltaY,
      guides: result.guides,
    };
  };
}

function onGuidesUpdate(guides) {
  localGuides.value = guides;
  editor.activeGuides.value = guides;
}

function onCharMove(charIndex, { x, y }) {
  const char = page.value?.characters?.[charIndex];
  if (!char) return;
  char.x = x;
  char.y = y;
  char.position = 'custom';
  // Continuous drag — do NOT call pushState (Pitfall 4)
}

function onCharMoveCommit(charIndex, { x, y }) {
  const char = page.value?.characters?.[charIndex];
  if (!char) return;
  char.x = x;
  char.y = y;
  char.position = 'custom';
  // Drag ended — commit one undo state
  script.pushState();
}

function onCharScale(charIndex, newScale) {
  const char = page.value?.characters?.[charIndex];
  if (!char) return;
  char.scale = newScale;
  // Continuous drag — do NOT call pushState (Pitfall 4)
}

function onCharScaleCommit(charIndex, newScale) {
  const char = page.value?.characters?.[charIndex];
  if (!char) return;
  char.scale = newScale;
  // Scale ended — commit one undo state
  script.pushState();
}

function onCanvasClick() {
  editor.selectCharacter(-1);
  if (isEditingDialogue.value) stopInlineEdit();
}

function onDialogueClick() {
  // Prevent canvas click deselect
}

function startInlineEdit() {
  isEditingDialogue.value = true;
  nextTick(() => {
    inlineTextarea.value?.focus();
  });
}

function onInlineTextInput(value) {
  if (!currentDialogue.value) return;
  currentDialogue.value.text = value;
  // Continuous typing — do NOT call pushState (Pitfall 4)
}

function stopInlineEdit() {
  isEditingDialogue.value = false;
}

// Global + per-page font settings for canvas dialogue
const dialogueBoxStyle = computed(() => {
  const globalFont = script.data?.ui?.dialogueBox;
  const override = page.value?.fontOverride;
  const useOverride = override && !override.useGlobal;
  const s = {};
  if (globalFont?.fontFamily) s.fontFamily = globalFont.fontFamily;
  if (useOverride && override.fontFamily) s.fontFamily = override.fontFamily;
  return s;
});

const dialogueTextStyle = computed(() => {
  const globalFont = script.data?.ui?.dialogueBox;
  const override = page.value?.fontOverride;
  const useOverride = override && !override.useGlobal;
  const s = {};
  if (globalFont) {
    if (globalFont.fontSize) s.fontSize = globalFont.fontSize + 'px';
    if (globalFont.textColor) s.color = globalFont.textColor;
    if (globalFont.fontFamily) s.fontFamily = globalFont.fontFamily;
  }
  if (useOverride) {
    if (override.fontSize) s.fontSize = override.fontSize + 'px';
    if (override.textColor) s.color = override.textColor;
    if (override.fontFamily) s.fontFamily = override.fontFamily;
  }
  return s;
});

const speakerStyle = computed(() => {
  const globalFont = script.data?.ui?.dialogueBox;
  const override = page.value?.fontOverride;
  const useOverride = override && !override.useGlobal;
  const s = {};
  if (globalFont) {
    if (globalFont.nameplateFontSize) s.fontSize = globalFont.nameplateFontSize + 'px';
    if (globalFont.nameplateFontFamily) s.fontFamily = globalFont.nameplateFontFamily;
    if (globalFont.nameplateColor) s.color = globalFont.nameplateColor;
  }
  if (useOverride) {
    if (override.nameplateFontSize) s.fontSize = override.nameplateFontSize + 'px';
    if (override.nameplateFontFamily) s.fontFamily = override.nameplateFontFamily;
    if (override.nameplateColor) s.color = override.nameplateColor;
  }
  return s;
});
</script>

<style scoped>
.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.canvas-artboard {
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.canvas-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.canvas-grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.canvas-grid-overlay line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 1;
}

.canvas-guide-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}

.guide-line {
  stroke: #00e5ff;
  stroke-width: 1;
  stroke-dasharray: 4 3;
}

.canvas-character {
  cursor: grab;
}

.canvas-character img.char-sprite {
  max-height: 400px;
  pointer-events: none;
  user-select: none;
}

.char-placeholder {
  width: 120px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px dashed #555;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 12px;
}

.char-icon {
  font-size: 32px;
  margin-bottom: 4px;
}

.canvas-dialogue {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  min-height: 140px;
  background: rgba(0, 0, 0, 0.7);
  padding: 16px 24px;
  color: #fff;
  cursor: default;
  border: 2px solid transparent;
  border-radius: 0;
  z-index: 2;
}

.canvas-dialogue:hover {
  border-color: rgba(0, 122, 204, 0.3);
  cursor: text;
}

.canvas-dialogue.editing {
  border-color: #007acc;
}

.dlg-speaker {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #ffd700;
}

.dlg-text {
  font-size: 15px;
  line-height: 1.6;
  color: #fff;
}

.inline-edit-textarea {
  width: 100%;
  min-height: 60px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  font-family: inherit;
}

.dialogue-nav {
  position: absolute;
  bottom: 148px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  z-index: 5;
}

.dlg-nav-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #555;
  background: rgba(0, 0, 0, 0.6);
  color: #aaa;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dlg-nav-btn.active {
  background: #007acc;
  color: white;
  border-color: #007acc;
}

.canvas-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #555;
}

.empty-label {
  font-size: 18px;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 12px;
  color: #666;
}

/* ─── Choice Options Preview ─── */
.canvas-choices {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 400px;
  padding: 20px;
  z-index: 3;
  pointer-events: none;
}

.choice-prompt {
  color: #fff;
  font-size: 18px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
  margin-bottom: 8px;
  text-align: center;
}

.choice-prompt-empty {
  opacity: 0.4;
}

.choice-btn {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 16px;
  min-width: 300px;
  padding: 12px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  text-align: center;
  pointer-events: none;
}

.canvas-condition-hint {
  position: absolute;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.55);
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  color: #c9c9c9;
  font-size: 13px;
  padding: 10px 14px;
  z-index: 3;
}

.canvas-input-preview {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  gap: 12px;
  width: 460px;
  padding: 20px;
  z-index: 3;
  pointer-events: none;
}

.input-prompt {
  color: #fff;
  font-size: 18px;
  text-align: center;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
}

.input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.input-field-preview,
.input-row button {
  height: 42px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  background: rgba(0, 0, 0, 0.62);
  font-size: 15px;
}

.input-field-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0 14px;
  color: rgba(255, 255, 255, 0.72);
}

.input-row button {
  min-width: 88px;
  padding: 0 16px;
}
</style>
