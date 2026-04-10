<template>
  <div class="slider-row">
    <label class="token-label">{{ label || tokenKey }}</label>
    <div class="slider-controls">
      <input
        type="range"
        :value="numericValue"
        :min="config.min"
        :max="config.max"
        :step="config.step"
        @input="onInput"
        @change="onChange"
        class="token-slider"
      />
      <input
        type="number"
        :value="numericValue"
        :min="config.min"
        :max="config.max"
        @input="onInput"
        @change="onChange"
        class="num-input"
      />
      <span class="unit-label">px</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';

const props = defineProps({
  tokenKey: String,
  label: String,
});

const editor = useThemeEditor();

const SLIDER_CONFIG= {
  'radius': { min: 0, max: 24, step: 1 },
  'radius-lg': { min: 0, max: 32, step: 1 },
  'blur': { min: 0, max: 30, step: 1 },
};

const config = computed(() => SLIDER_CONFIG[props.tokenKey] || { min: 0, max: 50, step: 1 });

const numericValue = computed(() => {
  const val = editor.getMergedTokens()[props.tokenKey];
  return parseInt(val) || 0;
});

function onInput(e) {
  editor.setToken(props.tokenKey, e.target.value + 'px');
}

function onChange() {
  editor.commitTheme();
}
</script>

<style scoped>
.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
}
.token-label {
  width: 120px;
  font-size: 12px;
  color: #aaa;
  flex-shrink: 0;
}
.slider-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.token-slider {
  flex: 1;
  accent-color: #b4a0ff;
}
.num-input {
  width: 48px;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
}
.unit-label {
  font-size: 11px;
  color: #888;
}
</style>
