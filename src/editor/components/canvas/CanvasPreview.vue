<template>
  <div class="canvas-wrapper" ref="wrapperRef" @click="selectedElement = null">
    <div class="canvas-artboard" :style="artboardStyle">
      <!-- Background -->
      <div class="canvas-bg" :style="bgStyle"></div>

      <!-- Characters -->
      <DraggableElement
        v-for="[id, char] in sceneState.chars"
        :key="'char-' + id"
        :x="getCharX(char)"
        :y="getCharY(char)"
        :scale="char.scale || 1"
        :is-selected="selectedElement === 'char-' + id"
        :canvas-scale="canvasScale"
        @select="selectElement('char-' + id)"
        @move="onCharMove(char.id, $event)">
        <div class="canvas-character" :title="id + ' (' + char.expression + ')'">
          <div class="char-placeholder">
            <span class="char-icon">🧑</span>
            <span class="char-label">{{ id }}</span>
            <span class="char-expr">{{ char.expression }}</span>
          </div>
        </div>
      </DraggableElement>

      <!-- Dialogue Box -->
      <DraggableElement
        v-if="sceneState.dlg"
        :x="getDialogueX(sceneState.dlg)"
        :y="getDialogueY(sceneState.dlg)"
        :width="getDialogueWidth(sceneState.dlg)"
        :height="getDialogueHeight(sceneState.dlg)"
        :is-selected="selectedElement === 'dialogue'"
        :resizable="true"
        :canvas-scale="canvasScale"
        @select="selectElement('dialogue')"
        @move="onDialogueMove($event)"
        @resize="onDialogueResize($event)">
        <div class="canvas-dialogue" :style="getDialogueStyle(sceneState.dlg)">
          <div class="dlg-speaker" v-if="sceneState.dlg.speaker">{{ sceneState.dlg.speaker }}</div>
          <div class="dlg-text">{{ sceneState.dlg.text }}</div>
        </div>
      </DraggableElement>

      <!-- Choice Menu -->
      <DraggableElement
        v-if="sceneState.cho"
        :x="getChoiceX(sceneState.cho)"
        :y="getChoiceY(sceneState.cho)"
        :is-selected="selectedElement === 'choice'"
        :canvas-scale="canvasScale"
        @select="selectElement('choice')"
        @move="onChoiceMove($event)">
        <div class="canvas-choices">
          <div class="choice-prompt" v-if="sceneState.cho.prompt">{{ sceneState.cho.prompt }}</div>
          <div class="choice-btn" v-for="(opt, i) in sceneState.cho.options" :key="i">
            {{ opt.text }}
          </div>
        </div>
      </DraggableElement>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import DraggableElement from './DraggableElement.vue';

const GAME_W = 1280;
const GAME_H = 720;

// Default positions for preset character positions
const PRESET_X = { left: 200, center: 640, right: 1080 };
const PRESET_Y = 200;

const props = defineProps({
  sceneState: { type: Object, required: true },
  selectedScene: { type: Object, default: null },
  selectedCmdIndex: { type: Number, default: -1 },
});

const emit = defineEmits(['position-update']);

const wrapperRef = ref(null);
const canvasScale = ref(1);
const selectedElement = ref(null);

// ResizeObserver for responsive scaling
let resizeObserver = null;

function updateScale() {
  if (!wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();
  const sw = rect.width / GAME_W;
  const sh = rect.height / GAME_H;
  canvasScale.value = Math.min(sw, sh, 1);
}

onMounted(() => {
  updateScale();
  resizeObserver = new ResizeObserver(updateScale);
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value);
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
});

const artboardStyle = computed(() => ({
  width: GAME_W + 'px',
  height: GAME_H + 'px',
  transform: `scale(${canvasScale.value})`,
  transformOrigin: 'top left',
}));

const bgStyle = computed(() => {
  const img = props.sceneState.bg?.image;
  if (!img) return { background: '#1a1a2e' };
  return {
    backgroundImage: `url(asset://backgrounds/${img})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
});

// --- Character helpers ---
function getCharX(char) {
  if (char.x !== undefined) return char.x;
  return (PRESET_X[char.position] || PRESET_X.center) - 75;
}
function getCharY(char) {
  if (char.y !== undefined) return char.y;
  return PRESET_Y;
}
function onCharMove(charId, pos) {
  selectedElement.value = 'char-' + charId;
  emit('position-update', { type: 'character', elementId: charId, ...pos });
}

// --- Dialogue helpers ---
function getDialogueX(dlg) {
  return dlg.style?.x ?? 40;
}
function getDialogueY(dlg) {
  return dlg.style?.y ?? 520;
}
function getDialogueWidth(dlg) {
  return dlg.style?.width ?? 1200;
}
function getDialogueHeight(dlg) {
  return dlg.style?.height ?? 160;
}
function getDialogueStyle(dlg) {
  const s = {
    width: '100%',
    height: '100%',
    padding: '15px 20px',
    background: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    color: '#fff',
    fontFamily: "'Noto Sans SC', sans-serif",
    fontSize: '16px',
    overflow: 'hidden',
  };
  if (dlg.style) {
    if (dlg.style.fontSize) s.fontSize = dlg.style.fontSize + 'px';
    if (dlg.style.fontFamily) s.fontFamily = dlg.style.fontFamily;
    if (dlg.style.textColor) s.color = dlg.style.textColor;
    if (dlg.style.backgroundColor) s.background = dlg.style.backgroundColor;
    if (dlg.style.borderRadius != null) s.borderRadius = dlg.style.borderRadius + 'px';
    if (dlg.style.padding != null) s.padding = dlg.style.padding + 'px';
  }
  return s;
}
function onDialogueMove(pos) {
  selectedElement.value = 'dialogue';
  emit('position-update', { type: 'dialogue', ...pos });
}
function onDialogueResize(size) {
  emit('position-update', { type: 'dialogue', ...size });
}

// --- Choice helpers ---
function getChoiceX(cho) {
  return cho.style?.x ?? 440;
}
function getChoiceY(cho) {
  return cho.style?.y ?? 200;
}
function onChoiceMove(pos) {
  selectedElement.value = 'choice';
  emit('position-update', { type: 'choice', ...pos });
}

function selectElement(id) {
  selectedElement.value = id;
}
</script>

<style scoped>
.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #111;
  overflow: hidden;
  padding: 20px;
  position: relative;
}

.canvas-artboard {
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  flex-shrink: 0;
}

.canvas-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 0;
}

/* Character placeholder */
.canvas-character {
  width: 150px;
  min-height: 300px;
  pointer-events: none;
}

.char-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 300px;
  background: rgba(100, 100, 255, 0.15);
  border: 2px dashed rgba(100, 100, 255, 0.4);
  border-radius: 8px;
}

.char-icon { font-size: 48px; }
.char-label { color: #aaf; font-size: 14px; margin-top: 8px; font-weight: bold; }
.char-expr { color: #88a; font-size: 12px; margin-top: 4px; }

/* Dialogue */
.canvas-dialogue {
  pointer-events: none;
  box-sizing: border-box;
}

.dlg-speaker {
  font-weight: bold;
  margin-bottom: 6px;
  color: #ffd700;
  font-size: 14px;
}

.dlg-text {
  line-height: 1.5;
}

/* Choice Menu */
.canvas-choices {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 400px;
  padding: 20px;
  pointer-events: none;
}

.choice-prompt {
  color: #fff;
  font-size: 18px;
  margin-bottom: 10px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}

.choice-btn {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 10px 40px;
  border-radius: 6px;
  font-size: 16px;
  min-width: 300px;
  text-align: center;
}
</style>
