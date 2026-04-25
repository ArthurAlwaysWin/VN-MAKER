<template>
  <div class="gamemenu-form">
    <!-- Panel -->
    <h4 class="form-group-title">面板</h4>
    <div class="config-row">
      <label class="config-label">位置</label>
      <select :value="cfg.position || 'center'" @change="onSelect('position', $event.target.value === 'center' ? null : $event.target.value)" class="config-select">
        <option value="center">居中</option>
        <option value="left">靠左</option>
        <option value="right">靠右</option>
      </select>
    </div>
    <div class="config-row">
      <label class="config-label">宽度</label>
      <input type="number" :value="cfg.width ?? ''" @input="onNum('width', $event)" @change="commit" min="100" max="600" class="config-num" placeholder="auto" />
      <span class="unit">px</span>
    </div>
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
    <div class="config-row">
      <label class="config-label">圆角</label>
      <input type="number" :value="cfg.borderRadius ?? ''" @input="onNum('borderRadius', $event)" @change="commit" min="0" max="30" class="config-num" placeholder="0" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">模糊</label>
      <input type="number" :value="cfg.backdropBlur ?? ''" @input="onNum('backdropBlur', $event)" @change="commit" min="0" max="50" class="config-num" placeholder="0" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">按钮间距</label>
      <input type="number" :value="cfg.buttonGap ?? ''" @input="onNum('buttonGap', $event)" @change="commit" min="0" max="30" class="config-num" placeholder="0" />
      <span class="unit">px</span>
    </div>

    <!-- Chrome: Background & Decorations -->
    <MajorScreenImageSettings />

    <!-- Buttons -->
    <h4 class="form-group-title">按钮文字</h4>
    <div v-for="btn in BUTTONS" :key="btn.action" class="config-row">
      <label class="config-label">{{ btn.label }}</label>
      <input type="text" :value="getButtonText(btn.action)" @input="onButtonText(btn.action, $event.target.value)" @change="commit" class="config-text" :placeholder="btn.defaultText" />
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

const BUTTONS = [
  { action: 'save', label: '存档', defaultText: '存 档' },
  { action: 'load', label: '读档', defaultText: '读 档' },
  { action: 'backlog', label: '回想', defaultText: '回 想' },
  { action: 'settings', label: '设定', defaultText: '设 定' },
  { action: 'title', label: '返回标题', defaultText: '返回标题' },
  { action: 'close', label: '返回', defaultText: '返 回' },
];

function rgbaToHex(color) {
  if (!color) return '#888888';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#888888';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function getButtonText(action) {
  return cfg.value.buttons?.[action]?.text || '';
}

function onField(field, value) { editor.setScreenField(field, value); }
function onNum(field, e) { editor.setScreenField(field, e.target.value === '' ? null : Number(e.target.value)); }
function onSelect(field, value) { editor.setScreenField(field, value); editor.commitScreenLayout(); }
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

function onButtonText(action, text) {
  const current = editor.getActiveScreenConfig();
  if (!current) return;
  current.buttons ??= {};
  current.buttons[action] ??= {};
  current.buttons[action].text = text || null;
  editor.sendScreenLayoutToPreview();
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
