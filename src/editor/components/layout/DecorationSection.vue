<template>
  <div>
    <h4 class="form-group-title">页头装饰</h4>
    <div class="decor-list">
      <div v-for="(deco, idx) in decorations" :key="idx" class="decor-card">
        <div class="config-row">
          <label class="config-label">图片路径</label>
          <input type="text" :value="deco.src || ''" @input="onFieldInput(idx, 'src', $event.target.value || '')" @change="commit" class="config-text" placeholder="assets/ui/ornament.png" />
          <button class="btn-delete" @click="onDelete(idx)" title="删除装饰">×</button>
        </div>
        <div class="decor-grid">
          <div class="config-row">
            <label class="config-label">X</label>
            <input type="number" :value="deco.x ?? 0" @input="onNumInput(idx, 'x', $event)" @change="commit" min="0" max="1920" class="config-num" />
            <span class="unit">px</span>
          </div>
          <div class="config-row">
            <label class="config-label">Y</label>
            <input type="number" :value="deco.y ?? 0" @input="onNumInput(idx, 'y', $event)" @change="commit" min="0" max="1080" class="config-num" />
            <span class="unit">px</span>
          </div>
          <div class="config-row">
            <label class="config-label">宽度</label>
            <input type="number" :value="deco.width ?? 100" @input="onNumInput(idx, 'width', $event)" @change="commit" min="1" max="1920" class="config-num" />
            <span class="unit">px</span>
          </div>
          <div class="config-row">
            <label class="config-label">高度</label>
            <input type="number" :value="deco.height ?? 100" @input="onNumInput(idx, 'height', $event)" @change="commit" min="1" max="1080" class="config-num" />
            <span class="unit">px</span>
          </div>
        </div>
      </div>
    </div>
    <button class="btn-add" @click="onAdd">+ 添加装饰</button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import { addDecoration, deleteDecoration, setDecorationField } from './decorLayoutHelpers.js';

const editor = useScreenLayoutEditor();
const cfg = computed(() => editor.getActiveScreenConfig() || {});
const decorations = computed(() => cfg.value.header?.decorations || []);

function onAdd() {
  const raw = editor.getActiveScreenConfig();
  addDecoration(raw);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onDelete(idx) {
  const raw = editor.getActiveScreenConfig();
  deleteDecoration(raw, idx);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onFieldInput(idx, field, value) {
  const raw = editor.getActiveScreenConfig();
  setDecorationField(raw, idx, field, value);
  editor.sendScreenLayoutToPreview();
}

function onNumInput(idx, field, e) {
  const val = e.target.value === '' ? null : Number(e.target.value);
  const raw = editor.getActiveScreenConfig();
  setDecorationField(raw, idx, field, val);
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
</style>
