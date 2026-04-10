<template>
  <div class="gradient-row">
    <label class="token-label">{{ label || tokenKey }}</label>
    <div class="gradient-controls">
      <div class="gradient-swatch" :style="{ background: currentValue }"></div>
      <input
        type="text"
        v-model="inputValue"
        @focus="onFocus"
        @input="onInput"
        @blur="onBlur"
        class="gradient-input"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';

const props = defineProps({
  tokenKey: String,
  label: String,
});

const editor = useThemeEditor();

const currentValue= computed(() => editor.getMergedTokens()[props.tokenKey]);

const inputValue = ref(currentValue.value || '');
const isEditing = ref(false);

watch(currentValue, (v) => {
  if (!isEditing.value) inputValue.value = v || '';
});

function onFocus() {
  isEditing.value = true;
}

function onInput() {
  const val = inputValue.value;
  if (val.startsWith('linear-gradient(') || /^#[0-9a-fA-F]{3,8}$/.test(val) || val.startsWith('rgba')) {
    editor.setToken(props.tokenKey, val);
  }
}

function onBlur() {
  isEditing.value = false;
  editor.commitTheme();
}
</script>

<style scoped>
.gradient-row {
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
.gradient-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.gradient-swatch {
  width: 32px;
  height: 24px;
  border: 1px solid #444;
  border-radius: 3px;
  flex-shrink: 0;
}
.gradient-input {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
}
</style>
