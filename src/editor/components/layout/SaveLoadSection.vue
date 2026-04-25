<template>
  <div class="saveload-form">
    <!-- Background -->
    <h4 class="form-group-title">背景</h4>
    <div class="config-row">
      <label class="config-label">背景图</label>
      <input type="text" :value="getUiImageDisplayValue(cfg.background)" readonly class="config-text" placeholder="未选择" />
      <button class="config-btn" @click="pickBackgroundImage">选择图片</button>
      <button v-if="cfg.background" class="config-btn secondary" @click="clearBackgroundImage">清除</button>
    </div>
    <div class="config-row">
      <label class="config-label">模糊</label>
      <input type="number" :value="cfg.backdropBlur ?? ''" @input="onNum('backdropBlur', $event)" @change="commit" min="0" max="50" class="config-num" placeholder="0" />
      <span class="unit">px</span>
    </div>

    <!-- Header -->
    <h4 class="form-group-title">标题栏</h4>
    <div class="config-row">
      <label class="config-label">存档标题</label>
      <input type="text" :value="hdr.saveTitle || ''" @input="onNested('header', 'saveTitle', $event.target.value || null)" @change="commit" class="config-text" placeholder="存 档" />
    </div>
    <div class="config-row">
      <label class="config-label">读档标题</label>
      <input type="text" :value="hdr.loadTitle || ''" @input="onNested('header', 'loadTitle', $event.target.value || null)" @change="commit" class="config-text" placeholder="読 档" />
    </div>
    <div class="config-row">
      <label class="config-label">存档标题色</label>
      <input type="color" :value="rgbaToHex(hdr.saveTitleColor)" @input="onNested('header', 'saveTitleColor', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">读档标题色</label>
      <input type="color" :value="rgbaToHex(hdr.loadTitleColor)" @input="onNested('header', 'loadTitleColor', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">标题栏高度</label>
      <input type="number" :value="hdr.height ?? ''" @input="onNestedNum('header', 'height', $event)" @change="commit" min="20" max="200" class="config-num" placeholder="auto" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">标题背景图</label>
      <input type="text" :value="getUiImageDisplayValue(hdr.backgroundImage)" readonly class="config-text" placeholder="未选择" />
      <button class="config-btn" @click="pickHeaderBackgroundImage">选择图片</button>
      <button v-if="hdr.backgroundImage" class="config-btn secondary" @click="clearHeaderBackgroundImage">清除</button>
    </div>

    <!-- Slot Grid -->
    <h4 class="form-group-title">存档网格</h4>
    <div class="config-row">
      <label class="config-label">列数</label>
      <input type="number" :value="grid.columns ?? ''" @input="onNestedNum('slotGrid', 'columns', $event)" @change="commit" min="1" max="10" class="config-num" placeholder="2" />
    </div>
    <div class="config-row">
      <label class="config-label">行数</label>
      <input type="number" :value="grid.rows ?? ''" @input="onNestedNum('slotGrid', 'rows', $event)" @change="commit" min="1" max="10" class="config-num" placeholder="3" />
    </div>
    <div class="config-row">
      <label class="config-label">间距</label>
      <input type="number" :value="grid.gap ?? ''" @input="onNestedNum('slotGrid', 'gap', $event)" @change="commit" min="0" max="50" class="config-num" placeholder="12" />
      <span class="unit">px</span>
    </div>

    <!-- Slot Styling -->
    <h4 class="form-group-title">槽位样式</h4>
    <div class="config-row">
      <label class="config-label">背景色</label>
      <input type="color" :value="rgbaToHex(slot.background)" @input="onNested('slot', 'background', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">槽位背景图</label>
      <input type="text" :value="getUiImageDisplayValue(slot.backgroundImage)" readonly class="config-text" placeholder="未选择" />
      <button class="config-btn" @click="pickSlotBackgroundImage">选择图片</button>
      <button v-if="slot.backgroundImage" class="config-btn secondary" @click="clearSlotBackgroundImage">清除</button>
    </div>
    <div class="config-row">
      <label class="config-label">圆角</label>
      <input type="number" :value="slot.borderRadius ?? ''" @input="onNestedNum('slot', 'borderRadius', $event)" @change="commit" min="0" max="30" class="config-num" placeholder="6" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">边框</label>
      <input type="text" :value="slot.border || ''" @input="onNested('slot', 'border', $event.target.value || null)" @change="commit" class="config-text" placeholder="1px solid ..." />
    </div>
    <div class="config-row">
      <label class="config-label">缩略图圆角</label>
      <input type="number" :value="slot.thumbnailRadius ?? ''" @input="onNestedNum('slot', 'thumbnailRadius', $event)" @change="commit" min="0" max="30" class="config-num" placeholder="4" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">空槽文字</label>
      <input type="text" :value="slot.emptyText || ''" @input="onNested('slot', 'emptyText', $event.target.value || null)" @change="commit" class="config-text" placeholder="— 空 —" />
    </div>

    <!-- Chrome: Background & Decorations -->
    <MajorScreenImageSettings />

    <!-- Pagination -->
    <h4 class="form-group-title">分页</h4>
    <div class="config-row">
      <label class="config-label">样式</label>
      <select :value="pag.style || 'default'" @change="onNested('pagination', 'style', $event.target.value === 'default' ? null : $event.target.value); commit()" class="config-select">
        <option value="default">按钮</option>
        <option value="dots">圆点</option>
      </select>
    </div>
    <div class="config-row">
      <label class="config-label">激活色</label>
      <input type="color" :value="rgbaToHex(pag.activeColor)" @input="onNested('pagination', 'activeColor', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">非激活色</label>
      <input type="color" :value="rgbaToHex(pag.inactiveColor)" @input="onNested('pagination', 'inactiveColor', $event.target.value)" @change="commit" class="color-picker" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import { clearUiImage, getUiImageDisplayValue, pickUiImage } from '../../utils/uiImageField.js';
import MajorScreenImageSettings from './MajorScreenImageSettings.vue';

const editor = useScreenLayoutEditor();

const cfg = computed(() => editor.getActiveScreenConfig() || {});
const hdr = computed(() => cfg.value.header || {});
const grid = computed(() => cfg.value.slotGrid || {});
const slot = computed(() => cfg.value.slot || {});
const pag = computed(() => cfg.value.pagination || {});

function rgbaToHex(color) {
  if (!color) return '#888888';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#888888';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function onField(field, value) { editor.setScreenField(field, value); }
function onNum(field, e) { editor.setScreenField(field, e.target.value === '' ? null : Number(e.target.value)); }
function onNested(group, field, value) { editor.setScreenNestedField(group, field, value); }
function onNestedNum(group, field, e) { editor.setScreenNestedField(group, field, e.target.value === '' ? null : Number(e.target.value)); }
async function pickBackgroundImage() {
  await pickUiImage({
    setValue: (value) => onField('background', value),
    commit: () => editor.commitScreenLayout(),
  });
}
function clearBackgroundImage() {
  clearUiImage({
    setValue: (value) => onField('background', value),
    commit: () => editor.commitScreenLayout(),
  });
}
async function pickHeaderBackgroundImage() {
  await pickUiImage({
    setValue: (value) => onNested('header', 'backgroundImage', value),
    commit: () => editor.commitScreenLayout(),
  });
}
function clearHeaderBackgroundImage() {
  clearUiImage({
    setValue: (value) => onNested('header', 'backgroundImage', value),
    commit: () => editor.commitScreenLayout(),
  });
}
async function pickSlotBackgroundImage() {
  await pickUiImage({
    setValue: (value) => onNested('slot', 'backgroundImage', value),
    commit: () => editor.commitScreenLayout(),
  });
}
function clearSlotBackgroundImage() {
  clearUiImage({
    setValue: (value) => onNested('slot', 'backgroundImage', value),
    commit: () => editor.commitScreenLayout(),
  });
}
function commit() { editor.commitScreenLayout(); }
</script>

<style scoped>
.form-group-title {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 12px 0 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
}
.form-group-title:first-child { margin-top: 0; }
.config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}
.config-label {
  width: 80px;
  font-size: 12px;
  color: #aaa;
  flex-shrink: 0;
}
.color-picker {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid #444;
  border-radius: 3px;
  cursor: pointer;
  background: none;
}
.config-num {
  width: 56px;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
}
.config-text {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}
.config-btn {
  background: #3a3a3a;
  border: 1px solid #4a4a4a;
  color: #ddd;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}
.config-btn:hover {
  border-color: #6a6a6a;
}
.config-btn.secondary {
  color: #bbb;
}
.config-select {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}
.unit {
  font-size: 11px;
  color: #666;
}
</style>
