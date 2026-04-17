<template>
  <div class="panel-section">
    <div class="config-row">
      <label class="config-label">背景色</label>
      <input type="color" :value="bgHex" @input="onBgInput" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">圆角</label>
      <input type="number" :value="borderRadius" @input="onNumInput('borderRadius', $event)" @change="commit" min="0" max="50" class="config-num" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">边框</label>
      <input type="text" :value="border" @input="onTextInput('border', $event)" @change="commit" class="config-text" placeholder="1px solid rgba(...)" />
    </div>
    <div class="config-row">
      <label class="config-label">模糊</label>
      <input type="number" :value="backdropBlur" @input="onNumInput('backdropBlur', $event)" @change="commit" min="0" max="50" class="config-num" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">内边距</label>
      <div class="padding-inputs">
        <input type="number" :value="paddingY" @input="onPaddingInput(0, $event)" @change="commit" min="0" max="100" class="config-num" placeholder="上下" />
        <input type="number" :value="paddingX" @input="onPaddingInput(1, $event)" @change="commit" min="0" max="100" class="config-num" placeholder="左右" />
      </div>
    </div>
    <div class="config-row">
      <label class="config-label">背景图</label>
      <input type="text" :value="backgroundImage" @input="onTextInput('backgroundImage', $event)" @change="commit" class="config-text" placeholder="URL 或留空" />
    </div>
    <div class="config-row" v-if="backgroundImage">
      <label class="config-label">图不透明度</label>
      <input type="range" :value="backgroundImageOpacity" @input="onRangeInput('backgroundImageOpacity', $event)" @change="commit" min="0" max="1" step="0.05" class="config-range" />
      <span class="range-val">{{ Math.round(backgroundImageOpacity * 100) }}%</span>
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

const ws = () => script.getWidgetStyles()?.panel;
const background = computed(() => ws()?.background ?? WIDGET_DEFAULTS.panel.background);
const borderRadius = computed(() => ws()?.borderRadius ?? WIDGET_DEFAULTS.panel.borderRadius);
const border = computed(() => ws()?.border ?? WIDGET_DEFAULTS.panel.border);
const backdropBlur = computed(() => ws()?.backdropBlur ?? WIDGET_DEFAULTS.panel.backdropBlur);
const padding = computed(() => ws()?.padding ?? [...WIDGET_DEFAULTS.panel.padding]);
const paddingY = computed(() => (padding.value?.[0]) ?? 24);
const paddingX = computed(() => (padding.value?.[1]) ?? 32);
const backgroundImage = computed(() => ws()?.backgroundImage ?? WIDGET_DEFAULTS.panel.backgroundImage);
const backgroundImageOpacity = computed(() => ws()?.backgroundImageOpacity ?? WIDGET_DEFAULTS.panel.backgroundImageOpacity);

function rgbaToHex(color) {
  if (!color) return '#000000';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#000000';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

const bgHex = computed(() => rgbaToHex(background.value));

function onBgInput(e) { editor.setWidgetField('panel', 'background', e.target.value); }
function onNumInput(field, e) { editor.setWidgetField('panel', field, Number(e.target.value)); }
function onTextInput(field, e) { editor.setWidgetField('panel', field, e.target.value || null); }
function onRangeInput(field, e) { editor.setWidgetField('panel', field, Number(e.target.value)); }

function onPaddingInput(idx, e) {
  const cur = [...(script.getWidgetStyles()?.panel?.padding ?? [...WIDGET_DEFAULTS.panel.padding])];
  cur[idx] = Number(e.target.value);
  editor.setWidgetField('panel', 'padding', cur);
}

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
.config-range {
  flex: 1;
  accent-color: #b4a0ff;
}
.unit {
  font-size: 11px;
  color: #666;
}
.range-val {
  font-size: 11px;
  color: #aaa;
  min-width: 32px;
  text-align: right;
}
.padding-inputs {
  display: flex;
  gap: 6px;
}
</style>
