<template>
  <div class="font-row">
    <label class="token-label">{{ label || tokenKey }}</label>
    <select :value="currentValue" @change="onChange" class="font-select">
      <optgroup v-if="assets.fontFamilies.length" label="项目字体">
        <option v-for="f in assets.fontFamilies" :key="f.value" :value="f.value">{{ f.label }}</option>
      </optgroup>
      <optgroup label="系统字体">
        <option v-for="f in systemFonts" :key="f.value" :value="f.value">{{ f.label }}</option>
      </optgroup>
    </select>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import { useAssetStore } from '../../stores/assets.js';

const props = defineProps({
  tokenKey: String,
  label: String,
});

const editor = useThemeEditor();
const assets = useAssetStore();

const currentValue = computed(() => editor.getMergedTokens()[props.tokenKey]);

const systemFonts = [
  { label: 'Noto Sans SC', value: "'Noto Sans SC', 'Segoe UI', 'Microsoft YaHei', sans-serif" },
  { label: 'Noto Serif SC', value: "'Noto Serif SC', serif" },
  { label: '无衬线体', value: 'sans-serif' },
  { label: '衬线体', value: 'serif' },
];

function onChange(e) {
  editor.setToken(props.tokenKey, e.target.value);
  editor.commitTheme();
}
</script>

<style scoped>
.font-row {
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
.font-select {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
