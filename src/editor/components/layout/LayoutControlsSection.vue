<template>
  <div>
    <h4 class="form-group-title">布局</h4>

    <!-- Column count (D-16) -->
    <div class="config-row">
      <label class="config-label">列数</label>
      <label class="radio-label">
        <input type="radio" :checked="columns === 1" @change="setColumns(1)" /> 1
      </label>
      <label class="radio-label">
        <input type="radio" :checked="columns === 2" @change="setColumns(2)" /> 2
      </label>
    </div>

    <!-- Row dividers -->
    <div class="config-row">
      <label class="config-label">分隔线</label>
      <input type="checkbox" :checked="itemStyle.showDividers" @change="setItemStyleAndCommit('showDividers', $event.target.checked)" />
    </div>

    <!-- Zebra stripes -->
    <div class="config-row">
      <label class="config-label">条纹背景</label>
      <input type="checkbox" :checked="itemStyle.alternateBackground" @change="setItemStyleAndCommit('alternateBackground', $event.target.checked)" />
    </div>

    <!-- Value labels -->
    <div class="config-row">
      <label class="config-label">值标签</label>
      <input type="checkbox" :checked="itemStyle.showValueLabel !== false" @change="setItemStyleAndCommit('showValueLabel', $event.target.checked)" />
    </div>

    <!-- Label position (D-17) -->
    <div class="config-row">
      <label class="config-label">标签位置</label>
      <label class="radio-label">
        <input type="radio" :checked="labelPosition === 'left'" @change="setItemStyleAndCommit('labelPosition', 'left')" /> 左侧
      </label>
      <label class="radio-label">
        <input type="radio" :checked="labelPosition === 'top'" @change="setItemStyleAndCommit('labelPosition', 'top')" /> 顶部
      </label>
    </div>

    <!-- Label width (D-18, only when position=left) -->
    <div class="config-row" v-if="labelPosition === 'left'">
      <label class="config-label">标签宽度</label>
      <input type="number" :value="itemStyle.labelWidth ?? ''" @input="setItemStyleNum('labelWidth', $event)" @change="commit" min="60" max="300" class="config-num" placeholder="140" />
      <span class="unit">px</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';

const editor = useScreenLayoutEditor();

const cfg = computed(() => editor.getActiveScreenConfig() || {});
const area = computed(() => cfg.value.contentArea || {});
const itemStyle = computed(() => area.value.itemStyle || {});
const columns = computed(() => area.value.columns || 1);
const labelPosition = computed(() => itemStyle.value.labelPosition || 'left');

function setColumns(value) {
  editor.setScreenNestedField('contentArea', 'columns', value);
  editor.commitScreenLayout();
}

function setItemStyle(field, value) {
  const raw = editor.getActiveScreenConfig();
  if (!raw) return;
  raw.contentArea ??= {};
  raw.contentArea.itemStyle ??= {};
  raw.contentArea.itemStyle[field] = value;
  editor.sendScreenLayoutToPreview();
}

function setItemStyleNum(field, e) {
  setItemStyle(field, e.target.value === '' ? null : Number(e.target.value));
}

function setItemStyleAndCommit(field, value) {
  setItemStyle(field, value);
  editor.commitScreenLayout();
}

function commit() {
  editor.commitScreenLayout();
}
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
.unit {
  font-size: 11px;
  color: #666;
}
.radio-label {
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
}
</style>
