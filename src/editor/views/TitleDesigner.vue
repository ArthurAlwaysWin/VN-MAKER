<template>
  <div class="title-designer">
    <!-- ─── 左：组件面板 ─── -->
    <div class="component-palette">
      <div class="palette-section">
        <div class="palette-header">🎮 预制按钮 <HelpTip :text="HELP_DESIGNER.presetButtons" /></div>
        <div v-for="preset in presetButtons" :key="preset.action"
          class="palette-item" :class="{ disabled: isButtonPlaced(preset.action) }"
          :draggable="!isButtonPlaced(preset.action)"
          @dragstart="onDragStart($event, 'button', preset)">
          {{ preset.icon }} {{ preset.label }}
        </div>
      </div>
      <div class="palette-section">
        <div class="palette-header">🎨 元素 <HelpTip :text="HELP_DESIGNER.decorImage" /></div>
        <div class="palette-item" draggable="true" @dragstart="onDragStart($event, 'text')">🏷️ 文字标签</div>
        <div class="palette-item" draggable="true" @dragstart="onDragStart($event, 'image')">🖼️ 装饰图片</div>
      </div>
    </div>

    <!-- ─── 中：画布 ─── -->
    <div class="designer-workspace">
      <div class="toolbar">
        <h3>标题页设计</h3>
        <div class="toolbar-actions">
          <button class="toolbar-btn" @click="pickBackground" title="选择背景图片">🖼️ 背景</button>
          <button class="toolbar-btn" v-if="layout.background" @click="clearBackground" title="清除背景图片">✕ 清除背景</button>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn" :class="{ active: snapEnabled }" @click="snapEnabled = !snapEnabled" title="吸附对齐 (Alt 拖动临时禁用)">🧲</button>
          <button class="toolbar-btn" :class="{ active: gridVisible }" @click="gridVisible = !gridVisible" title="网格显示">▦</button>
          <select v-if="gridVisible" class="grid-size-select" :value="gridSize" @change="gridSize = +$event.target.value" title="网格大小">
            <option value="8">8px</option>
            <option value="16">16px</option>
            <option value="24">24px</option>
            <option value="32">32px</option>
          </select>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn" @click="pickBgm" title="选择背景音乐">🎵 BGM</button>
          <template v-if="layout.bgm">
            <span class="toolbar-info">{{ bgmFilename }}</span>
            <button class="toolbar-btn" @click="toggleBgmPreview" :title="bgmPlaying ? '暂停试听' : '试听背景音乐'">{{ bgmPlaying ? '⏸ 暂停' : '▶ 试听' }}</button>
            <button class="toolbar-btn" @click="clearBgm" title="清除背景音乐">✕ 清除</button>
          </template>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn danger" :disabled="!selectedId" @click="deleteSelected" title="删除选中元素">🗑 删除</button>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn" :class="{ active: showPreview }" @click="togglePreview" :title="showPreview ? '返回编辑器' : '引擎预览'">
            {{ showPreview ? '✏️ 编辑' : '🔍 预览' }}
          </button>
        </div>
      </div>

      <div v-if="!showPreview" class="canvas-wrapper unified-title-wrapper">
        <UnifiedScreenDesignerShell
          v-if="titleInitialDocument"
          :initial-document="titleInitialDocument"
          production-title
          @document-change="onCanonicalTitleDocumentChange"
        />
      </div>

      <!-- Engine iframe preview -->
      <div v-if="showPreview" class="preview-wrapper">
        <iframe
          ref="previewIframeEl"
          class="title-preview-iframe"
          src="/index.html"
        ></iframe>
      </div>
    </div>

    <!-- ─── 右：属性面板 ─── -->
    <div class="inspector" v-if="selectedElement || !showPreview">
      <template v-if="selectedElement">
      <div class="inspector-header">
        <span class="inspector-title">属性</span>
        <span class="elem-type-badge">{{ typeLabel(selectedElement.type) }}</span>
      </div>
      <div class="inspector-body">
        <!-- Position section -->
        <div class="inspector-section">
          <div class="section-title">📍 位置</div>
          <div class="form-grid">
            <div class="form-cell">
              <label>X</label>
              <input type="number" :value="selectedElement.x" @input="setNumProp('x', $event)" />
            </div>
            <div class="form-cell">
              <label>Y</label>
              <input type="number" :value="selectedElement.y" @input="setNumProp('y', $event)" />
            </div>
          </div>
          <div v-if="selectedElement.type !== 'text'" class="form-grid">
            <div class="form-cell">
              <label>宽</label>
              <input type="number" :value="selectedElement.width" @input="setNumProp('width', $event)" />
            </div>
            <div class="form-cell">
              <label>高</label>
              <input type="number" :value="selectedElement.height" @input="setNumProp('height', $event)" />
            </div>
          </div>
        </div>

        <!-- Z-Order section -->
        <div class="inspector-section">
          <div class="section-title">📐 图层 <span class="hint">（↑↓ 方向键）</span></div>
          <div class="form-row">
            <button class="layer-btn" :disabled="!canMoveUp" @click="moveUp" title="上移图层">↑ 上移</button>
            <button class="layer-btn" :disabled="!canMoveDown" @click="moveDown" title="下移图层">↓ 下移</button>
          </div>
        </div>

        <!-- Button-specific -->
        <template v-if="selectedElement.type === 'button'">
          <div class="inspector-section">
            <div class="section-title">🏷️ 内容</div>
            <div class="form-row">
              <label>动作</label>
              <span class="readonly-val">{{ actionLabel(selectedElement.action) }}</span>
            </div>
            <div class="form-row">
              <label>文字</label>
              <input type="text" :value="selectedElement.text" @input="setTextProp('text', $event)" />
            </div>
          </div>
          <div class="inspector-section">
            <div class="section-title">🎨 样式</div>
            <div class="form-row">
              <label>字号</label>
              <input type="number" :value="selectedElement.fontSize || 18" @input="setNumProp('fontSize', $event)" />
            </div>
            <div class="form-row">
              <label>字体</label>
              <select :value="selectedElement.fontFamily || 'sans-serif'" @change="setSelectProp('fontFamily', $event)">
                <option value="sans-serif">无衬线体</option>
                <option value="'Noto Sans SC', sans-serif">Noto Sans SC</option>
                <option value="'Noto Serif SC', serif">Noto Serif SC</option>
                <option value="serif">衬线体</option>
                <option value="monospace">等宽字体</option>
                <option v-for="f in customFonts" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>文字色</label>
              <input type="color" :value="selectedElement.color || '#ffffff'" @input="setColorProp('color', $event)" />
            </div>
            <div class="form-row">
              <label>背景色</label>
              <input type="color" :value="rgbaToHex(selectedElement.backgroundColor)" @input="setColorProp('backgroundColor', $event)" />
            </div>
            <div class="form-row">
              <label>圆角</label>
              <input type="number" :value="selectedElement.borderRadius ?? 8" @input="setNumProp('borderRadius', $event)" />
            </div>
            <div class="form-row">
              <label>边框</label>
              <input type="text" :value="selectedElement.border || ''" @input="setTextProp('border', $event)" />
            </div>
            <div class="form-row">
              <label>悬停色</label>
              <input type="color" :value="selectedElement.hoverColor || '#555555'" @input="setColorProp('hoverColor', $event)" />
            </div>
          </div>
        </template>

        <!-- Text-specific -->
        <template v-if="selectedElement.type === 'text'">
          <div class="inspector-section">
            <div class="section-title">🏷️ 内容</div>
            <div class="form-row">
              <label>文本</label>
              <input type="text" :value="selectedElement.content" @input="setTextProp('content', $event)" />
            </div>
          </div>
          <div class="inspector-section">
            <div class="section-title">🎨 样式</div>
            <div class="form-row">
              <label>字号</label>
              <input type="number" :value="selectedElement.fontSize || 48" @input="setNumProp('fontSize', $event)" />
            </div>
            <div class="form-row">
              <label>字体</label>
              <select :value="selectedElement.fontFamily || &quot;'Noto Serif SC', serif&quot;" @change="setSelectProp('fontFamily', $event)">
                <option value="sans-serif">无衬线体</option>
                <option value="'Noto Sans SC', sans-serif">Noto Sans SC</option>
                <option value="'Noto Serif SC', serif">Noto Serif SC</option>
                <option value="serif">衬线体</option>
                <option value="monospace">等宽字体</option>
                <option v-for="f in customFonts" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>颜色</label>
              <input type="color" :value="selectedElement.color || '#ffffff'" @input="setColorProp('color', $event)" />
            </div>
            <div class="form-row">
              <label>字距</label>
              <input type="number" :value="selectedElement.letterSpacing || 0" @input="setNumProp('letterSpacing', $event)" />
            </div>
            <div class="form-row">
              <label>阴影</label>
              <input type="text" :value="selectedElement.textShadow || ''" @input="setTextProp('textShadow', $event)" />
            </div>
          </div>
        </template>

        <!-- Image-specific -->
        <template v-if="selectedElement.type === 'image'">
          <div class="inspector-section">
            <div class="section-title">🖼️ 图片</div>
            <div class="form-row">
              <label>源</label>
              <button class="pick-btn" @click="pickElementImage">选择…</button>
            </div>
            <div v-if="selectedElement.src" class="image-preview-box">
              <img :src="resolveAsset(selectedElement.src)" />
            </div>
          </div>
        </template>
      </div>
      </template>
      <template v-else>
        <div class="inspector-header">
          <span class="inspector-title">标题设置</span>
          <span class="elem-type-badge">OP</span>
        </div>
        <div class="inspector-body">
          <div class="inspector-section">
            <div class="section-title">🎬 Opening Video</div>
            <VideoReferenceFields
              title="标题 OP"
              :model-value="layout.openingVideo"
              :show-play="true"
              :play-modes="openingPlayModes"
              :play-mode-labels="openingPlayLabels"
              @update:model-value="setOpeningVideo"
              @clear="clearOpeningVideo"
            />
          </div>
        </div>
      </template>
    </div>
  </div>

  <AssetPickerModal
    :category="pickerCategory"
    :visible="pickerVisible"
    @select="onPickerSelect"
    @close="onPickerClose"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { useAssetStore } from '../stores/assets.js';
import DraggableElement from '../components/canvas/DraggableElement.vue';
import AssetPickerModal from '../components/resource-library/AssetPickerModal.vue';
import VideoReferenceFields from '../components/resource-library/VideoReferenceFields.vue';
import UnifiedScreenDesignerShell from '../components/screen-designer/UnifiedScreenDesignerShell.vue';
import { computeSnap } from '../utils/snapGuides.js';
import HelpTip from '../components/HelpTip.vue';
import { HELP_DESIGNER } from '../helpTexts.js';
import { useTitlePreview } from '../composables/useTitlePreview.js';
import { adaptLegacyUiScreen } from '../../shared/uiLegacyAdapters.js';

const scriptStore = useScriptStore();
const assetStore = useAssetStore();
const { iframeRef, sendTitleLayoutToPreview } = useTitlePreview();

// ─── Preview toggle ─────────────────────────────────────
const showPreview = ref(false);
const previewIframeEl = ref(null);

function togglePreview() {
  showPreview.value = !showPreview.value;
  if (showPreview.value) {
    nextTick(() => { iframeRef.value = previewIframeEl.value; });
  }
}

// ─── Preset Button Definitions ──────────────────────────
const PRESET_BUTTONS = [
  { action: 'start',    label: '开始游戏', icon: '▶️', text: '开始游戏' },
  { action: 'continue', label: '继续游戏', icon: '⏩', text: '继续游戏' },
  { action: 'gallery',  label: 'CG 鉴赏', icon: '▣', text: 'CG 鉴赏' },
  { action: 'settings', label: '设置',     icon: '⚙️', text: '设置' },
  { action: 'quit',     label: '退出',     icon: '🚪', text: '退出' },
];
const presetButtons = PRESET_BUTTONS;

// ─── Layout State ───────────────────────────────────────
const layout = reactive({ background: null, bgm: null, openingVideo: null, elements: [] });
const selectedId = ref(null);
const titleInitialDocument = ref(null);
const openingPlayModes = ['after-start', 'before-title', 'manual'];
const openingPlayLabels = {
  'after-start': '开始游戏后',
  'before-title': '标题显示前',
  manual: '手动',
};

const selectedElement = computed(() => {
  if (!selectedId.value) return null;
  return layout.elements.find(e => e.id === selectedId.value) || null;
});

const customFonts = computed(() => assetStore.fontFamilies);

// ─── Asset Picker State ─────────────────────────────────
const pickerVisible = ref(false);
const pickerCategory = ref('backgrounds');
let pickerResolve = null;

function openPicker(category) {
  pickerCategory.value = category;
  pickerVisible.value = true;
  return new Promise((resolve) => { pickerResolve = resolve; });
}

function onPickerSelect(path) {
  pickerVisible.value = false;
  if (pickerResolve) { pickerResolve(path); pickerResolve = null; }
}

function onPickerClose() {
  pickerVisible.value = false;
  if (pickerResolve) { pickerResolve(null); pickerResolve = null; }
}

const bgmFilename = computed(() => {
  if (!layout.bgm) return '';
  return layout.bgm.split('/').pop();
});

// ─── Canvas Scaling ─────────────────────────────────────
const GAME_W = 1280;
const GAME_H = 720;
const canvasScale = ref(1);
const wrapperRef = ref(null);
const artboardRef = ref(null);
let resizeObs = null;

// ─── Snap / Guide state ────────────────────────────────────
const snapEnabled = ref(true);
const gridVisible = ref(false);
const gridSize = ref(16);
const localGuides = ref([]);

const artboardStyle = computed(() => ({
  transform: `scale(${canvasScale.value})`,
  transformOrigin: 'top center',
}));

const bgStyle = computed(() => {
  if (!layout.background) return {};
  return {
    backgroundImage: `url("${resolveAsset(layout.background)}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
});

const titleGridLinesX = computed(() => {
  const gs = gridSize.value;
  const lines = [];
  for (let x = gs; x < GAME_W; x += gs) lines.push(x);
  return lines;
});
const titleGridLinesY = computed(() => {
  const gs = gridSize.value;
  const lines = [];
  for (let y = gs; y < GAME_H; y += gs) lines.push(y);
  return lines;
});

function updateScale() {
  if (!wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();
  const sw = (rect.width - 40) / GAME_W;
  const sh = (rect.height - 40) / GAME_H;
  canvasScale.value = Math.min(sw, sh, 1);
}

// ─── Lifecycle + Undo/Redo Sync ─────────────────────────
let _syncing = false;

onMounted(() => {
  const screen = scriptStore.getTitleScreen();
  titleInitialDocument.value = adaptLegacyUiScreen(scriptStore.data ?? {}, 'title').document;
  if (screen) {
    layout.background = screen.background || null;
    layout.bgm = screen.bgm || null;
    layout.openingVideo = screen.openingVideo ? { ...screen.openingVideo } : null;
    layout.elements = (screen.elements || []).map(e => ({ ...e }));
  }
  nextTick(updateScale);
  resizeObs = new ResizeObserver(updateScale);
  if (wrapperRef.value) resizeObs.observe(wrapperRef.value);
  document.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  resizeObs?.disconnect();
  document.removeEventListener('keydown', onKeyDown);
  stopBgmPreview();
});

watch(
  () => scriptStore.data?.ui?.titleScreen,
  (newScreen) => {
    if (_syncing || !newScreen) return;
    layout.background = newScreen.background || null;
    layout.bgm = newScreen.bgm || null;
    layout.openingVideo = newScreen.openingVideo ? { ...newScreen.openingVideo } : null;
    layout.elements = (newScreen.elements || []).map(e => ({ ...e }));
    if (selectedId.value && !layout.elements.find(e => e.id === selectedId.value)) {
      selectedId.value = null;
    }
  },
  { deep: true }
);

// ─── Preset Button Tracking (D-06) ─────────────────────
function isButtonPlaced(action) {
  return layout.elements.some(e => e.type === 'button' && e.action === action);
}

// ─── Z-Order Controls (D-10, D-11) ─────────────────────
const selectedIndex = computed(() => {
  if (!selectedId.value) return -1;
  return layout.elements.findIndex(e => e.id === selectedId.value);
});
const canMoveUp = computed(() => selectedIndex.value >= 0 && selectedIndex.value < layout.elements.length - 1);
const canMoveDown = computed(() => selectedIndex.value > 0);

function moveUp() {
  const idx = selectedIndex.value;
  if (idx < 0 || idx >= layout.elements.length - 1) return;
  const temp = layout.elements[idx];
  layout.elements[idx] = layout.elements[idx + 1];
  layout.elements[idx + 1] = temp;
  saveLayout();
}

function moveDown() {
  const idx = selectedIndex.value;
  if (idx <= 0) return;
  const temp = layout.elements[idx];
  layout.elements[idx] = layout.elements[idx - 1];
  layout.elements[idx - 1] = temp;
  saveLayout();
}

// ─── Drag & Drop from Palette ───────────────────────────
function onDragStart(e, type, preset) {
  if (type === 'button' && isButtonPlaced(preset.action)) {
    e.preventDefault();
    return;
  }
  e.dataTransfer.setData('application/title-elem', JSON.stringify({ type, preset }));
  e.dataTransfer.effectAllowed = 'copy';
}

function onCanvasDrop(e) {
  e.preventDefault();
  const raw = e.dataTransfer.getData('application/title-elem');
  if (!raw) return;

  const { type, preset } = JSON.parse(raw);
  const rect = artboardRef.value.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / canvasScale.value);
  const y = Math.round((e.clientY - rect.top) / canvasScale.value);

  let elem;
  const id = `${type}-${Date.now()}`;

  if (type === 'button') {
    elem = {
      id, type: 'button',
      action: preset.action,
      text: preset.text,
      x, y,
      width: 200, height: 50,
      fontSize: 18,
      fontFamily: 'sans-serif',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 8,
      hoverColor: '#555555',
    };
  } else if (type === 'text') {
    elem = {
      id, type: 'text',
      content: '标题文字',
      x, y,
      fontSize: 48,
      fontFamily: "'Noto Serif SC', serif",
      color: '#ffffff',
      letterSpacing: 2,
      textShadow: '',
    };
  } else if (type === 'image') {
    elem = {
      id, type: 'image',
      src: '',
      x, y,
      width: 200, height: 150,
    };
  }

  if (elem) {
    layout.elements.push(elem);
    selectedId.value = elem.id;
    saveLayout();
  }
}

// ─── Element Manipulation ───────────────────────────────
function buildTitleSnapFn(elemId) {
  return (rawX, rawY) => {
    if (!snapEnabled.value) return null;

    // Find the element to get its dimensions
    const elem = layout.elements.find(e => e.id === elemId);
    if (!elem) return null;

    const ew = elem.width || 0;
    const eh = elem.height || 0;
    const activeBounds = {
      left: rawX,
      top: rawY,
      right: rawX + ew,
      bottom: rawY + eh,
      centerX: rawX + ew / 2,
      centerY: rawY + eh / 2,
      width: ew,
      height: eh,
    };

    // Peer bounds: all other elements
    const peerBounds = layout.elements
      .filter(e => e.id !== elemId)
      .map(e => ({
        id: e.id,
        x: e.x,
        y: e.y,
        width: e.width || 0,
        height: e.height || 0,
        scale: 1,
      }));

    const result = computeSnap({
      activeBounds,
      canvasBounds: { width: GAME_W, height: GAME_H },
      peerBounds,
      threshold: 6,
      zoom: canvasScale.value,
      enableCanvas: true,
      enablePeers: true,
      enableGrid: gridVisible.value,
      gridSize: gridSize.value,
    });

    return {
      x: rawX + result.deltaX,
      y: rawY + result.deltaY,
      guides: result.guides,
    };
  };
}

function onElementMove(elem, { x, y }) {
  elem.x = x;
  elem.y = y;
  // Continuous drag — do NOT call saveLayout/pushState here
}

function onElementMoveCommit(elem, { x, y }) {
  elem.x = x;
  elem.y = y;
  saveLayout(); // single commit on drag end
}

function onGuidesUpdate(guides) {
  localGuides.value = guides;
}

function onElementResize(elem, { width, height }) {
  elem.width = width;
  elem.height = height;
  // Continuous drag — do NOT call saveLayout/pushState here
}

function onElementResizeCommit(elem, { width, height }) {
  elem.width = width;
  elem.height = height;
  saveLayout(); // single commit on resize end
}

function deleteSelected() {
  if (!selectedId.value) return;
  const idx = layout.elements.findIndex(e => e.id === selectedId.value);
  if (idx >= 0) {
    layout.elements.splice(idx, 1);
    selectedId.value = null;
    saveLayout();
  }
}

function deselect() { selectedId.value = null; }

function onKeyDown(e) {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId.value && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault();
    deleteSelected();
  }
  // Arrow keys for Z-order (when element selected, not editing input)
  if (selectedId.value && document.activeElement?.tagName !== 'INPUT') {
    if (e.key === 'ArrowUp' && canMoveUp.value) {
      e.preventDefault();
      moveUp();
    } else if (e.key === 'ArrowDown' && canMoveDown.value) {
      e.preventDefault();
      moveDown();
    }
  }
}

// ─── Inspector Setters (flat property model) ────────────
function setNumProp(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value[key] = Number(e.target.value);
  saveLayout();
}

function setTextProp(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value[key] = e.target.value;
  saveLayout();
}

function setColorProp(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value[key] = e.target.value;
  saveLayout();
}

function setSelectProp(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value[key] = e.target.value;
  saveLayout();
}

// ─── Asset Pickers ──────────────────────────────────────
async function pickBackground() {
  const result = await openPicker('backgrounds');
  if (result) {
    layout.background = result;
    saveLayout();
  }
}

function clearBackground() {
  layout.background = null;
  saveLayout();
}

async function pickBgm() {
  const result = await openPicker('audio');
  if (result) {
    layout.bgm = result;
    saveLayout();
  }
}

function clearBgm() {
  stopBgmPreview();
  layout.bgm = null;
  saveLayout();
}

function setOpeningVideo(reference) {
  layout.openingVideo = reference && typeof reference === 'object' ? { ...reference } : null;
  saveLayout();
}

function clearOpeningVideo() {
  layout.openingVideo = null;
  saveLayout();
}

// ─── BGM Preview ────────────────────────────────────────
const bgmAudio = ref(null);
const bgmPlaying = ref(false);

function toggleBgmPreview() {
  if (!layout.bgm) return;
  if (bgmPlaying.value) {
    stopBgmPreview();
  } else {
    if (!bgmAudio.value) {
      bgmAudio.value = new Audio();
      bgmAudio.value.loop = true;
      bgmAudio.value.addEventListener('ended', () => { bgmPlaying.value = false; });
    }
    bgmAudio.value.src = `asset://${layout.bgm}`;
    bgmAudio.value.play().then(() => { bgmPlaying.value = true; }).catch(() => {});
  }
}

function stopBgmPreview() {
  if (bgmAudio.value) {
    bgmAudio.value.pause();
    bgmAudio.value.currentTime = 0;
  }
  bgmPlaying.value = false;
}

async function pickElementImage() {
  if (!selectedElement.value) return;
  const result = await openPicker('backgrounds');
  if (result) {
    selectedElement.value.src = result;
    saveLayout();
  }
}

// ─── Save Layout ────────────────────────────────────────
function saveLayout() {
  _syncing = true;
  scriptStore.updateTitleScreen({
    background: layout.background,
    bgm: layout.bgm,
    openingVideo: layout.openingVideo ? { ...layout.openingVideo } : undefined,
    elements: layout.elements.map(e => ({ ...e })),
  });
  nextTick(() => { _syncing = false; });
}

function onCanonicalTitleDocumentChange({ document }) {
  scriptStore.updateCanonicalTitleScreen(document);
}

// ─── Auto-sync layout changes to iframe preview ─────────
watch(layout, () => {
  if (showPreview.value) sendTitleLayoutToPreview();
}, { deep: true });

// ─── Preview Helpers ────────────────────────────────────
function resolveAsset(path) {
  if (!path) return '';
  if (path.startsWith('asset://') || path.startsWith('http')) return path;
  return `asset://${path}`;
}

function typeLabel(type) {
  const map = { button: '按钮', text: '文字', image: '图片' };
  return map[type] || type;
}

function actionLabel(action) {
  const map = { start: '开始游戏', continue: '继续游戏', gallery: 'CG 鉴赏', settings: '设置', quit: '退出' };
  return map[action] || action;
}

function buttonPreviewStyle(elem) {
  const s = {};
  if (elem.backgroundColor) s.background = elem.backgroundColor;
  if (elem.color) s.color = elem.color;
  if (elem.borderRadius != null) s.borderRadius = elem.borderRadius + 'px';
  if (elem.fontSize) s.fontSize = elem.fontSize + 'px';
  if (elem.fontFamily) s.fontFamily = elem.fontFamily;
  if (elem.border) s.border = elem.border;
  return s;
}

function textPreviewStyle(elem) {
  const s = {};
  if (elem.color) s.color = elem.color;
  if (elem.fontSize) s.fontSize = elem.fontSize + 'px';
  if (elem.fontFamily) s.fontFamily = elem.fontFamily;
  if (elem.letterSpacing) s.letterSpacing = elem.letterSpacing + 'px';
  if (elem.textShadow) s.textShadow = elem.textShadow;
  return s;
}

function rgbaToHex(rgba) {
  if (!rgba) return '#333333';
  if (rgba.startsWith('#')) return rgba.length <= 7 ? rgba : rgba.slice(0, 7);
  const m = rgba.match(/[\d.]+/g);
  if (!m || m.length < 3) return '#333333';
  const r = Math.round(Number(m[0])).toString(16).padStart(2, '0');
  const g = Math.round(Number(m[1])).toString(16).padStart(2, '0');
  const b = Math.round(Number(m[2])).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
</script>

<style scoped>
.title-designer {
  display: flex;
  height: 100%;
  gap: 1px;
  background: #111;
}

/* ─── Palette ─── */
.component-palette {
  width: 150px;
  background: #1e1e1e;
  border-right: 1px solid #333;
  flex-shrink: 0;
  overflow-y: auto;
}

.palette-section {
  border-bottom: 1px solid #2a2a2a;
}

.palette-header {
  padding: 8px 10px;
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.palette-item {
  background: #252526;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 7px 10px;
  margin: 0 6px 4px;
  cursor: grab;
  font-size: 12px;
  color: #aaa;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.15s;
}

.palette-item:hover:not(.disabled) {
  background: #2a2d2e;
  color: #ccc;
  border-color: #555;
}

.palette-item:active:not(.disabled) {
  cursor: grabbing;
}

.palette-item.disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

/* ─── Workspace ─── */
.designer-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  min-width: 0;
}

.toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.toolbar h3 {
  margin: 0;
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-btn {
  background: #252526;
  border: 1px solid #333;
  color: #aaa;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.toolbar-btn:hover:not(:disabled) {
  background: #2a2d2e;
  color: #ccc;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.toolbar-btn.danger:hover:not(:disabled) {
  background: #3a1a1a;
  border-color: #622;
  color: #f88;
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: #333;
}

.toolbar-info {
  color: #4ec9b0;
  font-size: 12px;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Canvas ─── */
.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
  padding: 20px;
  background: #111;
}

.unified-title-wrapper {
  display: block;
  padding: 0;
}

.unified-title-wrapper :deep(.usd-shell) {
  height: 100%;
  min-height: 0;
}

.canvas-artboard {
  position: relative;
  width: 1280px;
  height: 720px;
  background: #2a2a2a;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
  overflow: hidden;
}

.canvas-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
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

.grid-size-select {
  background: #3c3c3c;
  color: #ccc;
  border: 1px solid #555;
  border-radius: 3px;
  height: 22px;
  font-size: 11px;
  padding: 0 2px;
  cursor: pointer;
}

/* ─── Element Previews ─── */
.elem-preview {
  pointer-events: none;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.elem-button-title {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 18px;
  justify-content: center;
  padding: 0 16px;
}

.elem-button-title.continue-disabled {
  opacity: 0.35;
  border-style: dashed;
}

.elem-text-title {
  color: #fff;
  font-size: 48px;
  white-space: nowrap;
  padding: 4px;
}

.elem-image-title {
  background: rgba(100, 180, 100, 0.1);
  border: 1px dashed rgba(100, 180, 100, 0.3);
  border-radius: 4px;
  justify-content: center;
  overflow: hidden;
}

.elem-image-title img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.elem-placeholder {
  font-size: 32px;
  opacity: 0.5;
}

/* ─── Inspector ─── */
.inspector {
  width: 220px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  flex-shrink: 0;
  overflow-y: auto;
}

.inspector-header {
  padding: 10px 12px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inspector-title {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 500;
}

.elem-type-badge {
  background: #252526;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  color: #888;
}

.inspector-body {
  padding: 0;
}

.inspector-section {
  padding: 10px 12px;
  border-bottom: 1px solid #2a2a2a;
}

.section-title {
  font-size: 11px;
  color: #888;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.section-title .hint {
  color: #555;
  font-weight: normal;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 6px;
}

.form-cell label {
  display: block;
  color: #666;
  font-size: 10px;
  margin-bottom: 2px;
}

.form-cell input {
  width: 100%;
  background: #252526;
  border: 1px solid #333;
  color: #ccc;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
  box-sizing: border-box;
}

.form-cell input:focus {
  outline: none;
  border-color: #007acc;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.form-row label {
  min-width: 38px;
  color: #888;
  font-size: 11px;
  flex-shrink: 0;
}

.form-row input[type="text"],
.form-row input[type="number"] {
  flex: 1;
  background: #252526;
  border: 1px solid #333;
  color: #ccc;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
  min-width: 0;
}

.form-row input[type="color"] {
  flex: 1;
  height: 26px;
  padding: 1px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 3px;
  cursor: pointer;
}

.form-row select {
  flex: 1;
  background: #252526;
  border: 1px solid #333;
  color: #ccc;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 11px;
  min-width: 0;
}

.form-row select:focus,
.form-row input:focus {
  outline: none;
  border-color: #007acc;
}

.readonly-val {
  color: #666;
  font-size: 11px;
}

.image-preview-box {
  margin-top: 6px;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
  max-height: 100px;
}

.image-preview-box img {
  width: 100%;
  object-fit: contain;
}

.pick-btn {
  background: #252526;
  border: 1px solid #333;
  color: #aaa;
  padding: 4px 10px;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
}

.pick-btn:hover {
  background: #2a2d2e;
  color: #ccc;
}

.layer-btn {
  flex: 1;
  background: #252526;
  border: 1px solid #333;
  color: #aaa;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
}

.layer-btn:hover:not(:disabled) {
  background: #2a2d2e;
  color: #ccc;
}

.layer-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* ─── Preview toggle ─── */
.toolbar-btn.active {
  background: #007acc;
  border-color: #007acc;
  color: #fff;
}

.preview-wrapper {
  flex: 1;
  display: flex;
  min-height: 0;
}

.title-preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #000;
}
</style>
