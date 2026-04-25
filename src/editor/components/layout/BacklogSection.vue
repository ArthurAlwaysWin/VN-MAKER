<template>
  <div class="backlog-form">
    <!-- Background -->
    <h4 class="form-group-title">背景</h4>
    <div class="config-row">
      <label class="config-label">背景色</label>
      <input type="color" :value="rgbaToHex(cfg.background)" @input="onField('background', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">背景图</label>
      <input type="text" :value="getUiImageDisplayValue(cfg.backgroundImage)" readonly class="config-text" placeholder="未选择" />
      <button class="config-btn" @click="pickBackgroundImage">选择图片</button>
      <button v-if="cfg.backgroundImage" class="config-btn secondary" @click="clearBackgroundImage">清除</button>
    </div>

    <!-- Header -->
    <h4 class="form-group-title">标题栏</h4>
    <div class="config-row">
      <label class="config-label">标题文字</label>
      <input type="text" :value="hdr.title || ''" @input="onNested('header', 'title', $event.target.value || null)" @change="commit" class="config-text" placeholder="回 想" />
    </div>
    <div class="config-row">
      <label class="config-label">标题背景图</label>
      <input type="text" :value="getUiImageDisplayValue(hdr.backgroundImage)" readonly class="config-text" placeholder="未选择" />
      <button class="config-btn" @click="pickHeaderBackgroundImage">选择图片</button>
      <button v-if="hdr.backgroundImage" class="config-btn secondary" @click="clearHeaderBackgroundImage">清除</button>
    </div>
    <div class="config-row">
      <label class="config-label">标题栏高度</label>
      <input type="number" :value="hdr.height ?? ''" @input="onNestedNum('header', 'height', $event)" @change="commit" min="20" max="200" class="config-num" placeholder="auto" />
      <span class="unit">px</span>
    </div>

    <!-- Chrome: Background & Decorations -->
    <MajorScreenImageSettings />

    <!-- Entry Styling -->
    <h4 class="form-group-title">条目样式</h4>
    <div class="config-row">
      <label class="config-label">说话人颜色</label>
      <input type="color" :value="rgbaToHex(entry.speakerColor)" @input="onNested('entry', 'speakerColor', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">说话人字号</label>
      <input type="number" :value="entry.speakerFontSize ?? ''" @input="onNestedNum('entry', 'speakerFontSize', $event)" @change="commit" min="10" max="32" class="config-num" placeholder="14" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">文本字号</label>
      <input type="number" :value="entry.textFontSize ?? ''" @input="onNestedNum('entry', 'textFontSize', $event)" @change="commit" min="10" max="32" class="config-num" placeholder="14" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">条目背景</label>
      <input type="color" :value="rgbaToHex(entry.background)" @input="onNested('entry', 'background', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">悬停背景</label>
      <input type="color" :value="rgbaToHex(entry.hoverBackground)" @input="onNested('entry', 'hoverBackground', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">下边框</label>
      <input type="text" :value="entry.borderBottom || ''" @input="onNested('entry', 'borderBottom', $event.target.value || null)" @change="commit" class="config-text" placeholder="1px solid ..." />
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
const entry = computed(() => cfg.value.entry || {});

function rgbaToHex(color) {
  if (!color) return '#888888';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#888888';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function onField(field, value) { editor.setScreenField(field, value); }
function onNested(group, field, value) { editor.setScreenNestedField(group, field, value); }
function onNestedNum(group, field, e) { editor.setScreenNestedField(group, field, e.target.value === '' ? null : Number(e.target.value)); }
async function pickBackgroundImage() {
  await pickUiImage({
    setValue: (value) => onField('backgroundImage', value),
    commit: () => editor.commitScreenLayout(),
  });
}
function clearBackgroundImage() {
  clearUiImage({
    setValue: (value) => onField('backgroundImage', value),
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
.unit {
  font-size: 11px;
  color: #666;
}
</style>
