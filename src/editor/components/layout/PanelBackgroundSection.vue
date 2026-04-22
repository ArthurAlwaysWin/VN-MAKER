<template>
  <div>
    <h4 class="form-group-title">面板背景</h4>
    <div class="config-row">
      <label class="config-label">背景图片</label>
      <input type="text" :value="getUiImageDisplayValue(bgImage)" readonly class="config-text" placeholder="未选择" />
      <button class="config-btn" @click="pickBackgroundImage">选择图片</button>
      <button v-if="bgImage" class="config-btn secondary" @click="clearBackgroundImage">清除</button>
    </div>
    <div class="config-row">
      <label class="config-label">透明度</label>
      <input type="range" :value="bgOpacity" @input="onOpacityInput($event)" @change="commit" min="0" max="1" step="0.05" class="config-range" />
      <span class="range-val">{{ Math.round(bgOpacity * 100) }}%</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import { clearUiImage, getUiImageDisplayValue, pickUiImage } from '../../utils/uiImageField.js';

const editor = useScreenLayoutEditor();
const cfg = computed(() => editor.getActiveScreenConfig() || {});
const bgImage = computed(() => cfg.value.background || '');
const bgOpacity = computed(() => cfg.value.backgroundOpacity ?? 1);

function onBgImage(value) {
  editor.setScreenField('background', value);
}

async function pickBackgroundImage() {
  await pickUiImage({
    setValue: (value) => onBgImage(value),
    commit: () => editor.commitScreenLayout(),
  });
}

function clearBackgroundImage() {
  clearUiImage({
    setValue: (value) => onBgImage(value),
    commit: () => editor.commitScreenLayout(),
  });
}

function onOpacityInput(e) {
  editor.setScreenField('backgroundOpacity', Number(e.target.value));
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
  padding: 6px 0;
}
.config-label {
  width: 80px;
  font-size: 12px;
  color: #aaa;
  flex-shrink: 0;
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
.config-range {
  flex: 1;
  accent-color: #b4a0ff;
}
.range-val {
  font-size: 11px;
  color: #aaa;
  min-width: 32px;
  text-align: right;
}
</style>
