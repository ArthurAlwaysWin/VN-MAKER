<template>
  <div class="slider-section">
    <div class="config-row">
      <label class="config-label">轨道颜色</label>
      <input type="color" :value="trackColorHex" @input="onTrackColorInput" @change="onTrackColorChange" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">填充颜色</label>
      <input type="color" :value="fillColorHex" @input="onFillColorInput" @change="onFillColorChange" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">滑块颜色</label>
      <input type="color" :value="thumbColorHex" @input="onThumbColorInput" @change="onThumbColorChange" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">滑块形状</label>
      <select :value="thumbStyle" @change="onThumbStyleChange" class="config-select">
        <option v-for="ts in THUMB_STYLES" :key="ts.id" :value="ts.id">{{ ts.label }}</option>
      </select>
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

const THUMB_STYLES = [
  { id: 'circle', label: '圆形' },
  { id: 'square', label: '方形' },
];

const ws = () => script.getWidgetStyles()?.slider;
const trackColor = computed(() => ws()?.trackColor ?? WIDGET_DEFAULTS.slider.trackColor);
const fillColor = computed(() => ws()?.fillColor ?? WIDGET_DEFAULTS.slider.fillColor);
const thumbColor = computed(() => ws()?.thumbColor ?? WIDGET_DEFAULTS.slider.thumbColor);
const thumbStyle = computed(() => ws()?.thumbStyle ?? WIDGET_DEFAULTS.slider.thumbStyle);

function rgbaToHex(color) {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#000000';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

const trackColorHex = computed(() => rgbaToHex(trackColor.value));
const fillColorHex = computed(() => rgbaToHex(fillColor.value));
const thumbColorHex = computed(() => rgbaToHex(thumbColor.value));

function onTrackColorInput(e) { editor.setWidgetField('slider', 'trackColor', e.target.value); }
function onTrackColorChange() { editor.commitWidgetStyles(); }
function onFillColorInput(e) { editor.setWidgetField('slider', 'fillColor', e.target.value); }
function onFillColorChange() { editor.commitWidgetStyles(); }
function onThumbColorInput(e) { editor.setWidgetField('slider', 'thumbColor', e.target.value); }
function onThumbColorChange() { editor.commitWidgetStyles(); }

function onThumbStyleChange(e) {
  editor.setWidgetField('slider', 'thumbStyle', e.target.value);
  editor.commitWidgetStyles();
}
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
.config-select {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
