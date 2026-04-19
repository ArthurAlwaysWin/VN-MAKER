<template>
  <div>
    <h4 class="form-group-title">页脚按钮</h4>
    <div class="config-row">
      <label class="config-label">页脚高度</label>
      <input type="number" :value="footerHeight ?? ''" @input="onFooterHeight($event)" @change="commit" min="30" max="200" class="config-num" placeholder="60" />
      <span class="unit">px</span>
    </div>
    <div class="btn-list">
      <div v-for="(btn, idx) in buttons" :key="idx" class="btn-row">
        <input type="text" :value="btn.text || ''" @input="onBtnFieldInput(idx, 'text', $event.target.value)" @change="commit" class="config-text btn-text-input" placeholder="按钮文案" />
        <select :value="btn.action || 'close'" @change="onActionChange(idx, $event.target.value)" class="config-select">
          <option value="close">关闭设置</option>
          <option value="title">返回标题</option>
          <option value="reset">恢复默认</option>
        </select>
        <input type="number" :value="btn.x ?? 0" @input="onBtnNumInput(idx, 'x', $event)" @change="commit" min="0" max="1920" class="config-num" placeholder="0" title="X" />
        <input type="number" :value="btn.y ?? 0" @input="onBtnNumInput(idx, 'y', $event)" @change="commit" min="0" max="1080" class="config-num" placeholder="0" title="Y" />
        <button class="btn-delete" @click="onDeleteBtn(idx)" title="删除按钮">×</button>
      </div>
    </div>
    <button class="btn-add" @click="onAddBtn">+ 添加按钮</button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import { addFooterButton, deleteFooterButton, setFooterButtonField } from './decorLayoutHelpers.js';

const editor = useScreenLayoutEditor();
const cfg = computed(() => editor.getActiveScreenConfig() || {});
const footerHeight = computed(() => cfg.value.footer?.height);
const buttons = computed(() => cfg.value.footer?.buttons || []);

function onFooterHeight(e) {
  const raw = editor.getActiveScreenConfig();
  if (!raw) return;
  raw.footer ??= {};
  raw.footer.height = e.target.value === '' ? null : Number(e.target.value);
  editor.sendScreenLayoutToPreview();
}

function onAddBtn() {
  const raw = editor.getActiveScreenConfig();
  addFooterButton(raw);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onDeleteBtn(idx) {
  const raw = editor.getActiveScreenConfig();
  deleteFooterButton(raw, idx);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onBtnFieldInput(idx, field, value) {
  const raw = editor.getActiveScreenConfig();
  setFooterButtonField(raw, idx, field, value);
  editor.sendScreenLayoutToPreview();
}

function onBtnNumInput(idx, field, e) {
  const val = e.target.value === '' ? null : Number(e.target.value);
  const raw = editor.getActiveScreenConfig();
  setFooterButtonField(raw, idx, field, val);
  editor.sendScreenLayoutToPreview();
}

function onActionChange(idx, value) {
  const raw = editor.getActiveScreenConfig();
  setFooterButtonField(raw, idx, 'action', value);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
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
.btn-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
.btn-text-input {
  width: 80px;
  flex: 0 0 80px;
}
.config-select {
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
