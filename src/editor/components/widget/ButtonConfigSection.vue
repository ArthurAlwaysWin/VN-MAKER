<template>
  <div class="button-section">
    <div class="config-row">
      <label class="config-label">背景色</label>
      <input type="color" :value="bgHex" @input="onColorInput('background', $event)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">悬停背景</label>
      <input type="color" :value="hoverBgHex" @input="onColorInput('hoverBackground', $event)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">按下背景</label>
      <input type="color" :value="activeBgHex" @input="onColorInput('activeBackground', $event)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">文字颜色</label>
      <input type="color" :value="textColorHex" @input="onColorInput('textColor', $event)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">字号</label>
      <input type="number" :value="fontSize" @input="onNumInput('fontSize', $event)" @change="commit" min="10" max="32" class="config-num" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">圆角</label>
      <input type="number" :value="borderRadius" @input="onNumInput('borderRadius', $event)" @change="commit" min="0" max="50" class="config-num" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">边框</label>
      <input type="text" :value="border" @input="onTextInput('border', $event)" @change="commit" class="config-text" placeholder="none 或 1px solid ..." />
    </div>
    <div class="config-row">
      <label class="config-label">背景图</label>
      <input type="text" :value="backgroundImage" @input="onTextInput('backgroundImage', $event)" @change="commit" class="config-text" placeholder="URL 或留空" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScriptStore } from '../../stores/script.js';
import { useWidgetStylesEditor } from '../../composables/useWidgetStylesEditor.js';
import { WIDGET_DEFAULTS } from '../../../engine/widgetDefaults.js';

const script = useScriptStore();
const editor = useWidgetStylesEditor();

const ws = () => script.getWidgetStyles()?.button;
const background = computed(() => ws()?.background ?? WIDGET_DEFAULTS.button.background);
const hoverBackground = computed(() => ws()?.hoverBackground ?? WIDGET_DEFAULTS.button.hoverBackground);
const activeBackground = computed(() => ws()?.activeBackground ?? WIDGET_DEFAULTS.button.activeBackground);
const textColor = computed(() => ws()?.textColor ?? WIDGET_DEFAULTS.button.textColor);
const fontSize = computed(() => ws()?.fontSize ?? WIDGET_DEFAULTS.button.fontSize);
const borderRadius = computed(() => ws()?.borderRadius ?? WIDGET_DEFAULTS.button.borderRadius);
const border = computed(() => ws()?.border ?? WIDGET_DEFAULTS.button.border);
const backgroundImage = computed(() => ws()?.backgroundImage ?? WIDGET_DEFAULTS.button.backgroundImage);

function rgbaToHex(color) {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#000000';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

const bgHex = computed(() => rgbaToHex(background.value));
const hoverBgHex = computed(() => rgbaToHex(hoverBackground.value));
const activeBgHex = computed(() => rgbaToHex(activeBackground.value));
const textColorHex = computed(() => rgbaToHex(textColor.value));

function onColorInput(field, e) { editor.setWidgetField('button', field, e.target.value); }
function onNumInput(field, e) { editor.setWidgetField('button', field, Number(e.target.value)); }
function onTextInput(field, e) { editor.setWidgetField('button', field, e.target.value || null); }
function commit() { editor.commitWidgetStyles(); }
</script>

<style scoped>
.config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
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
.unit {
  font-size: 11px;
  color: #666;
}
</style>
