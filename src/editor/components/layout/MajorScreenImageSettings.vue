<template>
  <div class="major-screen-image-settings">
    <!-- Background Image -->
    <h4 class="form-group-title">屏幕背景</h4>
    <div class="config-row">
      <label class="config-label">背景图</label>
      <input type="text" :value="getUiImageDisplayValue(chrome.backgroundImage)" readonly class="config-text" placeholder="未选择" />
      <button class="config-btn" @click="pickChromeBackgroundImage">选择图片</button>
      <button v-if="chrome.backgroundImage" class="config-btn secondary" @click="clearChromeBackgroundImage">清除</button>
    </div>

    <!-- Decorations -->
    <h4 class="form-group-title">装饰层</h4>
    <div class="decor-list">
      <div v-for="(deco, idx) in decorations" :key="idx" class="decor-card">
        <div class="config-row">
          <label class="config-label">图片</label>
          <input type="text" :value="getUiImageDisplayValue(deco.src)" readonly class="config-text" placeholder="未选择" />
          <button class="config-btn" @click="pickDecorationImage(idx)">选择</button>
          <button v-if="deco.src" class="config-btn secondary" @click="clearDecorationImage(idx)">清除</button>
          <button class="btn-delete" @click="onDeleteDecoration(idx)" title="删除装饰">×</button>
        </div>
        <div class="decor-grid">
          <div class="config-row">
            <label class="config-label">X</label>
            <input type="number" :value="deco.x ?? 0" @input="onDecoNumInput(idx, 'x', $event)" @change="commit" min="0" max="1920" class="config-num" />
            <span class="unit">px</span>
          </div>
          <div class="config-row">
            <label class="config-label">Y</label>
            <input type="number" :value="deco.y ?? 0" @input="onDecoNumInput(idx, 'y', $event)" @change="commit" min="0" max="1080" class="config-num" />
            <span class="unit">px</span>
          </div>
          <div class="config-row">
            <label class="config-label">宽度</label>
            <input type="number" :value="deco.width ?? 100" @input="onDecoNumInput(idx, 'width', $event)" @change="commit" min="1" max="1920" class="config-num" />
            <span class="unit">px</span>
          </div>
          <div class="config-row">
            <label class="config-label">高度</label>
            <input type="number" :value="deco.height ?? 100" @input="onDecoNumInput(idx, 'height', $event)" @change="commit" min="1" max="1080" class="config-num" />
            <span class="unit">px</span>
          </div>
        </div>
      </div>
    </div>
    <button class="btn-add" @click="onAddDecoration">+ 添加装饰</button>
    <p v-if="decorations.length > 3" class="perf-hint">装饰层较多可能影响性能</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import { addChromeDecoration, deleteChromeDecoration, setChromeDecorationField } from './chromeDecorHelpers.js';
import { clearUiImage, getUiImageDisplayValue, pickUiImage } from '../../utils/uiImageField.js';

const editor = useScreenLayoutEditor();

const cfg = computed(() => editor.getActiveScreenConfig() || {});
const chrome = computed(() => cfg.value.chrome || {});
const decorations = computed(() => chrome.value.decorations || []);

// ─── Chrome background image ───────────────────────────

async function pickChromeBackgroundImage() {
  await pickUiImage({
    setValue: (value) => editor.setScreenNestedField('chrome', 'backgroundImage', value),
    commit: () => editor.commitScreenLayout(),
  });
}

function clearChromeBackgroundImage() {
  clearUiImage({
    setValue: (value) => editor.setScreenNestedField('chrome', 'backgroundImage', value),
    commit: () => editor.commitScreenLayout(),
  });
}

// ─── Chrome decorations ────────────────────────────────

function onAddDecoration() {
  const raw = editor.getActiveScreenConfig();
  addChromeDecoration(raw);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onDeleteDecoration(idx) {
  const raw = editor.getActiveScreenConfig();
  deleteChromeDecoration(raw, idx);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function setDecoValue(idx, field, value) {
  const raw = editor.getActiveScreenConfig();
  setChromeDecorationField(raw, idx, field, value);
  editor.sendScreenLayoutToPreview();
}

function onDecoNumInput(idx, field, e) {
  const val = e.target.value === '' ? null : Number(e.target.value);
  setDecoValue(idx, field, val);
}

async function pickDecorationImage(idx) {
  await pickUiImage({
    setValue: (value) => setDecoValue(idx, 'src', value),
    commit: () => editor.commitScreenLayout(),
  });
}

function clearDecorationImage(idx) {
  clearUiImage({
    setValue: (value) => setDecoValue(idx, 'src', value),
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
.btn-delete {
  background: none;
  border: none;
  color: #a22;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 3px;
}
.btn-delete:hover {
  background: rgba(170, 34, 34, 0.15);
}
.btn-add {
  background: none;
  border: 1px dashed #555;
  color: #888;
  padding: 4px 12px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 4px;
  width: 100%;
}
.btn-add:hover {
  border-color: #007acc;
  color: #007acc;
}
.decor-card {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 6px;
}
.decor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}
.perf-hint {
  font-size: 11px;
  color: #b8860b;
  margin: 6px 0 0;
  padding: 0;
}
</style>
