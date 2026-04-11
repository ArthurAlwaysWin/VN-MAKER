<template>
  <div class="settings-designer">
    <!-- ─── 左：组件面板 ─── -->
    <div class="component-palette">
      <div class="palette-section">
        <div class="palette-header">⚙️ 设置组件 <HelpTip :text="HELP_DESIGNER.settingComponents" /></div>
        <div
          v-for="comp in settingComponents"
          :key="comp.settingType"
          class="palette-item"
          draggable="true"
          @dragstart="onDragStart($event, 'setting', comp)">
          {{ comp.icon }} {{ comp.label }}
        </div>
        <div class="palette-item" draggable="true" @dragstart="onDragStart($event, 'button')">✕ 关闭按钮</div>
      </div>
      <div class="palette-section">
        <div class="palette-header">🎨 装饰元素 <HelpTip :text="HELP_DESIGNER.decorImage" /></div>
        <div class="palette-item" draggable="true" @dragstart="onDragStart($event, 'label')">🏷️ 文字标签</div>
        <div class="palette-item" draggable="true" @dragstart="onDragStart($event, 'image')">🖼️ 装饰图片</div>
      </div>
    </div>

    <!-- ─── 中：画布 ─── -->
    <div class="designer-workspace">
      <div class="toolbar">
        <h3>设置页设计</h3>
        <div class="toolbar-actions">
          <button class="toolbar-btn" @click="pickBackground" title="选择背景图片">🖼️ 背景</button>
          <button class="toolbar-btn" v-if="layout.background" @click="clearBackground" title="清除背景图片">✕ 清除背景</button>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn danger" :disabled="!selectedId" @click="deleteSelected" title="删除选中元素">🗑 删除</button>
        </div>
      </div>

      <div class="canvas-wrapper" ref="wrapperRef" @click="deselect" @dragover.prevent @drop="onCanvasDrop">
        <div class="canvas-artboard" ref="artboardRef" :style="artboardStyle">
          <!-- Background -->
          <div class="canvas-bg" :style="bgStyle"></div>

          <!-- Elements -->
          <DraggableElement
            v-for="elem in layout.elements"
            :key="elem.id"
            :x="elem.x"
            :y="elem.y"
            :width="elem.width || null"
            :height="elem.height || null"
            :is-selected="selectedId === elem.id"
            :resizable="elem.type !== 'label'"
            :canvas-scale="canvasScale"
            @select="selectedId = elem.id"
            @move="onElementMove(elem, $event)"
            @resize="onElementResize(elem, $event)">
            <!-- Setting preview -->
            <div v-if="elem.type === 'setting'" class="elem-preview elem-setting"
              :style="settingPreviewStyle(elem)">
              <span class="elem-icon">{{ settingIcon(elem.settingType) }}</span>
              <span class="elem-label">{{ elem.label || settingLabel(elem.settingType) }}</span>
              <div v-if="isSlider(elem.settingType)" class="elem-slider-track"
                :style="{ background: elem.style?.trackColor || undefined }">
                <div class="elem-slider-fill" :style="{ background: elem.style?.fillColor || '#ff6b9d' }"></div>
              </div>
              <div v-else-if="isSelect(elem.settingType)" class="elem-segment-group">
                <span v-for="opt in selectOptions(elem.settingType)" :key="opt.value"
                  class="elem-segment-btn" :class="{ active: opt.value === selectDefault(elem.settingType) }">
                  {{ opt.label }}
                </span>
              </div>
              <div v-else class="elem-toggle-preview"
                :style="{ background: elem.style?.fillColor ? undefined : undefined }"></div>
            </div>

            <!-- Label preview -->
            <div v-else-if="elem.type === 'label'" class="elem-preview elem-label-text"
              :style="labelPreviewStyle(elem)">
              {{ elem.text || '标题' }}
            </div>

            <!-- Image preview -->
            <div v-else-if="elem.type === 'image'" class="elem-preview elem-image">
              <img v-if="resolveAsset(elem.src)" :src="resolveAsset(elem.src)" />
              <span v-else class="elem-placeholder">🖼️</span>
            </div>

            <!-- Button preview -->
            <div v-else-if="elem.type === 'button'" class="elem-preview elem-button"
              :style="buttonPreviewStyle(elem)">
              <span v-if="elem.displayMode === 'icon'" class="elem-close-icon">×</span>
              <span v-else>{{ elem.label || '返回' }}</span>
            </div>
          </DraggableElement>
        </div>
      </div>
    </div>

    <!-- ─── 右：属性面板 ─── -->
    <div class="inspector" v-if="selectedElement">
      <div class="inspector-header">
        <span class="inspector-title">属性</span>
        <span class="elem-type-badge">{{ typeLabel(selectedElement.type) }}</span>
      </div>
      <div class="inspector-body">
        <!-- ── 位置 & 尺寸 ── -->
        <div class="inspector-section">
          <div class="section-title">📐 位置</div>
          <div class="form-grid">
            <div class="form-cell">
              <label>X</label>
              <input type="number" :value="selectedElement.x" @input="setProp('x', $event)" />
            </div>
            <div class="form-cell">
              <label>Y</label>
              <input type="number" :value="selectedElement.y" @input="setProp('y', $event)" />
            </div>
          </div>
          <div class="form-grid" v-if="selectedElement.width != null">
            <div class="form-cell">
              <label>宽</label>
              <input type="number" :value="selectedElement.width" @input="setProp('width', $event)" />
            </div>
            <div class="form-cell">
              <label>高</label>
              <input type="number" :value="selectedElement.height" @input="setProp('height', $event)" />
            </div>
          </div>
        </div>

        <!-- ── 设置组件属性 ── -->
        <template v-if="selectedElement.type === 'setting'">
          <div class="inspector-section">
            <div class="section-title">🏷️ 内容</div>
            <div class="form-row">
              <label>标签</label>
              <input type="text" :value="selectedElement.label" @input="setTextProp('label', $event)" />
            </div>
            <div class="form-row">
              <label>类型</label>
              <span class="readonly-val">{{ settingLabel(selectedElement.settingType) }}</span>
            </div>
          </div>
          <div class="inspector-section">
            <div class="section-title">🎨 样式</div>
            <div class="form-row">
              <label>字号</label>
              <input type="number" :value="selectedElement.style?.fontSize || 16" @input="setStyleProp('fontSize', $event)" />
            </div>
            <div class="form-row">
              <label>字体</label>
              <select :value="selectedElement.style?.fontFamily || 'sans-serif'" @change="setStyleSelect('fontFamily', $event)">
                <option value="sans-serif">无衬线体</option>
                <option value="'Noto Sans SC', sans-serif">Noto Sans SC</option>
                <option value="'Noto Serif SC', serif">Noto Serif SC</option>
                <option value="serif">衬线体</option>
                <option value="monospace">等宽字体</option>
              </select>
            </div>
            <div class="form-row">
              <label>文字色</label>
              <input type="color" :value="selectedElement.style?.labelColor || '#ffffff'" @input="setStyleColor('labelColor', $event)" />
            </div>
            <template v-if="isSlider(selectedElement.settingType)">
              <div class="form-row">
                <label>滑块色</label>
                <input type="color" :value="selectedElement.style?.fillColor || '#ff6b9d'" @input="setStyleColor('fillColor', $event)" />
              </div>
              <div class="form-row">
                <label>轨道色</label>
                <input type="color" :value="selectedElement.style?.trackColor || '#555555'" @input="setStyleColor('trackColor', $event)" />
              </div>
              <div class="form-row">
                <label>滑钮色</label>
                <input type="color" :value="selectedElement.style?.thumbColor || '#ffffff'" @input="setStyleColor('thumbColor', $event)" />
              </div>
            </template>
            <template v-else>
              <div class="form-row">
                <label>激活色</label>
                <input type="color" :value="selectedElement.style?.fillColor || '#ff6b9d'" @input="setStyleColor('fillColor', $event)" />
              </div>
            </template>
          </div>
        </template>

        <!-- ── 标签属性 ── -->
        <template v-if="selectedElement.type === 'label'">
          <div class="inspector-section">
            <div class="section-title">🏷️ 内容</div>
            <div class="form-row">
              <label>文本</label>
              <input type="text" :value="selectedElement.text" @input="setTextProp('text', $event)" />
            </div>
          </div>
          <div class="inspector-section">
            <div class="section-title">🎨 样式</div>
            <div class="form-row">
              <label>字号</label>
              <input type="number" :value="selectedElement.style?.fontSize || 24" @input="setStyleProp('fontSize', $event)" />
            </div>
            <div class="form-row">
              <label>字体</label>
              <select :value="selectedElement.style?.fontFamily || 'sans-serif'" @change="setStyleSelect('fontFamily', $event)">
                <option value="sans-serif">无衬线体</option>
                <option value="'Noto Sans SC', sans-serif">Noto Sans SC</option>
                <option value="'Noto Serif SC', serif">Noto Serif SC</option>
                <option value="serif">衬线体</option>
                <option value="monospace">等宽字体</option>
              </select>
            </div>
            <div class="form-row">
              <label>颜色</label>
              <input type="color" :value="selectedElement.style?.color || '#ffffff'" @input="setStyleColor('color', $event)" />
            </div>
          </div>
        </template>

        <!-- ── 图片属性 ── -->
        <template v-if="selectedElement.type === 'image'">
          <div class="inspector-section">
            <div class="section-title">🖼️ 图片</div>
            <div class="form-row">
              <label>源</label>
              <button class="pick-btn" @click="pickImage">选择…</button>
            </div>
            <div v-if="selectedElement.src" class="image-preview-box">
              <img :src="resolveAsset(selectedElement.src)" />
            </div>
          </div>
        </template>

        <!-- ── 按钮属性 ── -->
        <template v-if="selectedElement.type === 'button'">
          <div class="inspector-section">
            <div class="section-title">🏷️ 内容</div>
            <div class="form-row">
              <label>显示</label>
              <select :value="selectedElement.displayMode || 'text'" @change="setDirectSelect('displayMode', $event)">
                <option value="icon">× 图标</option>
                <option value="text">文字</option>
              </select>
            </div>
            <div class="form-row" v-if="selectedElement.displayMode !== 'icon'">
              <label>文字</label>
              <input type="text" :value="selectedElement.label" @input="setTextProp('label', $event)" />
            </div>
          </div>
          <div class="inspector-section">
            <div class="section-title">🎨 样式</div>
            <div class="form-row">
              <label>字号</label>
              <input type="number" :value="selectedElement.style?.fontSize || 18" @input="setStyleProp('fontSize', $event)" />
            </div>
            <div class="form-row">
              <label>字体</label>
              <select :value="selectedElement.style?.fontFamily || 'sans-serif'" @change="setStyleSelect('fontFamily', $event)">
                <option value="sans-serif">无衬线体</option>
                <option value="'Noto Sans SC', sans-serif">Noto Sans SC</option>
                <option value="'Noto Serif SC', serif">Noto Serif SC</option>
                <option value="serif">衬线体</option>
                <option value="monospace">等宽字体</option>
              </select>
            </div>
            <div class="form-row">
              <label>文字色</label>
              <input type="color" :value="selectedElement.style?.textColor || '#ffffff'" @input="setStyleColor('textColor', $event)" />
            </div>
            <div class="form-row">
              <label>背景色</label>
              <input type="color" :value="rgbaToHex(selectedElement.style?.backgroundColor)" @input="setStyleColor('backgroundColor', $event)" />
            </div>
            <div class="form-row">
              <label>圆角</label>
              <input type="number" :value="selectedElement.style?.borderRadius || 8" @input="setStyleProp('borderRadius', $event)" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useScriptStore } from '../stores/script.js';
import DraggableElement from '../components/canvas/DraggableElement.vue';
import HelpTip from '../components/HelpTip.vue';
import { HELP_DESIGNER } from '../helpTexts.js';
import {
  SETTING_DEFS,
  createSettingElement,
  createLabelElement,
  createImageElement,
  createButtonElement,
} from '../../engine/settingDefs.js';

const scriptStore = useScriptStore();

// ─── Palette data ────────────────────────────────────────
const settingComponents = Object.entries(SETTING_DEFS).map(([key, def]) => ({
  settingType: key,
  label: def.label,
  icon: def.type === 'toggle' ? '🔘' : def.type === 'select' ? '📋' : '🎚️',
}));

// ─── Layout state ────────────────────────────────────────
const layout = reactive({ background: null, elements: [] });
const selectedId = ref(null);

const selectedElement = computed(() => {
  if (!selectedId.value) return null;
  return layout.elements.find(e => e.id === selectedId.value) || null;
});

// ─── Canvas scaling ──────────────────────────────────────
const GAME_W = 1280;
const GAME_H = 720;
const canvasScale = ref(1);
const wrapperRef = ref(null);
const artboardRef = ref(null);
let resizeObs = null;

const artboardStyle = computed(() => ({
  transform: `scale(${canvasScale.value})`,
  transformOrigin: 'top center',
}));

const bgStyle = computed(() => {
  if (!layout.background) return {};
  const resolved = resolveAsset(layout.background);
  if (!resolved) return {};
  return {
    backgroundImage: `url("${resolved}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
});

function updateScale() {
  if (!wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();
  const sw = (rect.width - 40) / GAME_W;
  const sh = (rect.height - 40) / GAME_H;
  canvasScale.value = Math.min(sw, sh, 1);
}

// ─── Lifecycle ───────────────────────────────────────────
let _syncing = false;

onMounted(() => {
  const screen = scriptStore.getSettingsScreen();
  if (screen) {
    layout.background = screen.background || null;
    layout.elements = (screen.elements || []).map(e => ({ ...e, style: { ...(e.style || {}) } }));
  }

  nextTick(updateScale);
  resizeObs = new ResizeObserver(updateScale);
  if (wrapperRef.value) resizeObs.observe(wrapperRef.value);
  document.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  resizeObs?.disconnect();
  document.removeEventListener('keydown', onKeyDown);
});

// Sync layout from store on undo/redo
watch(
  () => scriptStore.data?.ui?.settingsScreen,
  (newScreen) => {
    if (_syncing || !newScreen) return;
    layout.background = newScreen.background || null;
    layout.elements = (newScreen.elements || []).map(e => ({ ...e, style: { ...(e.style || {}) } }));
    // Clear selection if the selected element no longer exists
    if (selectedId.value && !layout.elements.find(e => e.id === selectedId.value)) {
      selectedId.value = null;
    }
  },
  { deep: true }
);

// ─── Drag & Drop ─────────────────────────────────────────
function onDragStart(e, type, comp) {
  e.dataTransfer.setData('application/settings-elem', JSON.stringify({ type, comp }));
  e.dataTransfer.effectAllowed = 'copy';
}

function onCanvasDrop(e) {
  e.preventDefault();
  const raw = e.dataTransfer.getData('application/settings-elem');
  if (!raw) return;

  const { type, comp } = JSON.parse(raw);
  const rect = artboardRef.value.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / canvasScale.value);
  const y = Math.round((e.clientY - rect.top) / canvasScale.value);

  let elem;
  switch (type) {
    case 'setting': elem = createSettingElement(comp.settingType, x, y); break;
    case 'label':   elem = createLabelElement('标题', x, y); break;
    case 'image':   elem = createImageElement('', x, y); break;
    case 'button':  elem = createButtonElement(x, y); break;
    default: return;
  }

  layout.elements.push(elem);
  selectedId.value = elem.id;
  saveLayout();
}

// ─── Element manipulation ────────────────────────────────
function onElementMove(elem, { x, y }) {
  elem.x = x;
  elem.y = y;
  saveLayout();
}

function onElementResize(elem, { width, height }) {
  elem.width = width;
  elem.height = height;
  saveLayout();
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

function deselect() {
  selectedId.value = null;
}

function onKeyDown(e) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedId.value && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      deleteSelected();
    }
  }
}

// ─── Inspector setters ───────────────────────────────────
function setProp(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value[key] = Number(e.target.value);
  saveLayout();
}

function setTextProp(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value[key] = e.target.value;
  saveLayout();
}

function setStyleProp(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value.style ??= {};
  selectedElement.value.style[key] = Number(e.target.value);
  // Auto-adjust height when fontSize increases beyond current bounds
  if (key === 'fontSize' && selectedElement.value.height != null) {
    const minH = Math.max(40, Math.round(Number(e.target.value) * 2.5));
    if (selectedElement.value.height < minH) {
      selectedElement.value.height = minH;
    }
  }
  saveLayout();
}

function setStyleColor(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value.style ??= {};
  selectedElement.value.style[key] = e.target.value;
  saveLayout();
}

function setStyleSelect(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value.style ??= {};
  selectedElement.value.style[key] = e.target.value;
  saveLayout();
}

function setDirectSelect(key, e) {
  if (!selectedElement.value) return;
  selectedElement.value[key] = e.target.value;
  saveLayout();
}

function rgbaToHex(rgba) {
  if (!rgba) return '#262626';
  if (rgba.startsWith('#')) return rgba.length <= 7 ? rgba : rgba.slice(0, 7);
  const m = rgba.match(/[\d.]+/g);
  if (!m || m.length < 3) return '#262626';
  const r = Math.round(Number(m[0])).toString(16).padStart(2, '0');
  const g = Math.round(Number(m[1])).toString(16).padStart(2, '0');
  const b = Math.round(Number(m[2])).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// ─── Background ──────────────────────────────────────────
async function pickBackground() {
  if (!window.ipcRenderer) return;
  try {
    const result = await window.ipcRenderer.invoke('select-asset', { types: ['backgrounds'] });
    if (result) {
      layout.background = result;
      saveLayout();
    }
  } catch { /* user cancelled */ }
}

function clearBackground() {
  layout.background = null;
  saveLayout();
}

// ─── Image picking ───────────────────────────────────────
async function pickImage() {
  if (!window.ipcRenderer || !selectedElement.value) return;
  try {
    const result = await window.ipcRenderer.invoke('select-asset', { types: ['backgrounds'] });
    if (result) {
      selectedElement.value.src = result;
      saveLayout();
    }
  } catch { /* user cancelled */ }
}

// ─── Save ────────────────────────────────────────────────
function saveLayout() {
  _syncing = true;
  scriptStore.updateSettingsScreen({
    background: layout.background,
    elements: layout.elements.map(e => ({ ...e, style: { ...(e.style || {}) } })),
  });
  nextTick(() => { _syncing = false; });
}

// ─── Preview helpers ─────────────────────────────────────
function settingIcon(settingType) {
  const iconMap = {
    'bgm-volume': '🎵', 'se-volume': '🔊', 'text-speed': '⚡',
    'auto-speed': '⏱️', 'fullscreen-toggle': '🖥️',
    'dialogue-opacity': '👁️', 'master-volume': '🔉',
  };
  return iconMap[settingType] || '⚙️';
}

function settingLabel(settingType) {
  return SETTING_DEFS[settingType]?.label || settingType;
}

function isSlider(settingType) {
  return SETTING_DEFS[settingType]?.type === 'slider';
}

function isSelect(settingType) {
  return SETTING_DEFS[settingType]?.type === 'select';
}

function selectOptions(settingType) {
  return SETTING_DEFS[settingType]?.options || [];
}

function selectDefault(settingType) {
  return SETTING_DEFS[settingType]?.default || '';
}

function typeLabel(type) {
  const map = { setting: '设置', label: '标签', image: '图片', button: '按钮' };
  return map[type] || type;
}

function labelPreviewStyle(elem) {
  const s = {};
  if (elem.style?.color) s.color = elem.style.color;
  if (elem.style?.fontSize) s.fontSize = elem.style.fontSize + 'px';
  if (elem.style?.fontFamily) s.fontFamily = elem.style.fontFamily;
  return s;
}

function buttonPreviewStyle(elem) {
  const s = {};
  if (elem.style?.backgroundColor) s.background = elem.style.backgroundColor;
  if (elem.style?.textColor) s.color = elem.style.textColor;
  if (elem.style?.borderRadius != null) s.borderRadius = elem.style.borderRadius + 'px';
  if (elem.style?.fontSize) s.fontSize = elem.style.fontSize + 'px';
  if (elem.style?.fontFamily) s.fontFamily = elem.style.fontFamily;
  return s;
}

function settingPreviewStyle(elem) {
  const s = {};
  if (elem.style?.fontSize) s.fontSize = elem.style.fontSize + 'px';
  if (elem.style?.fontFamily) s.fontFamily = elem.style.fontFamily;
  if (elem.style?.labelColor) s.color = elem.style.labelColor;
  return s;
}

function resolveAsset(path) {
  if (!path) return '';
  if (path.startsWith('asset://') || path.startsWith('http')) return path;
  return `asset://${path}`;
}
</script>

<style scoped>
.settings-designer {
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

.palette-item:hover {
  background: #2a2d2e;
  color: #ccc;
  border-color: #555;
}

.palette-item:active {
  cursor: grabbing;
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

/* ─── Element previews ─── */
.elem-preview {
  pointer-events: none;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.elem-setting {
  gap: 8px;
  padding: 0 10px;
  background: rgba(80, 120, 200, 0.12);
  border: 1px dashed rgba(80, 120, 200, 0.35);
  border-radius: 4px;
  color: #aac;
  font-size: 12px;
}

.elem-icon { flex-shrink: 0; }

.elem-label {
  flex-shrink: 0;
  white-space: nowrap;
  min-width: 50px;
}

.elem-slider-track {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.12);
  border-radius: 2px;
  overflow: hidden;
}

.elem-slider-fill {
  width: 50%;
  height: 100%;
  border-radius: 2px;
}

.elem-toggle-preview {
  width: 36px;
  height: 20px;
  background: rgba(255,255,255,0.15);
  border-radius: 10px;
  position: relative;
  flex-shrink: 0;
}

.elem-toggle-preview::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
}

.elem-select-preview,
.elem-segment-group {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 0;
}

.elem-segment-btn {
  flex: 1;
  text-align: center;
  padding: 2px 4px;
  font-size: 10px;
  color: #888;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-right-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.elem-segment-btn:first-child {
  border-radius: 3px 0 0 3px;
}

.elem-segment-btn:last-child {
  border-radius: 0 3px 3px 0;
  border-right-width: 1px;
}

.elem-segment-btn.active {
  background: rgba(100, 160, 255, 0.25);
  color: #aac;
  border-color: rgba(100, 160, 255, 0.4);
}

.elem-close-icon {
  font-size: 1.5em;
  line-height: 1;
  font-weight: 300;
}

.elem-label-text {
  color: #fff;
  font-size: 24px;
  white-space: nowrap;
  padding: 4px;
}

.elem-image {
  background: rgba(100, 180, 100, 0.1);
  border: 1px dashed rgba(100, 180, 100, 0.3);
  border-radius: 4px;
  justify-content: center;
  overflow: hidden;
}

.elem-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.elem-placeholder {
  font-size: 32px;
  opacity: 0.5;
}

.elem-button {
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  justify-content: center;
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
</style>
