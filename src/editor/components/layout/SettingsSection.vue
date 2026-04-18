<template>
  <div class="settings-form">
    <!-- Header -->
    <h4 class="form-group-title">标题栏</h4>
    <div class="config-row">
      <label class="config-label">标题文字</label>
      <input type="text" :value="title.text || ''" @input="onTitle('text', $event.target.value || null)" @change="commit" class="config-text" placeholder="系统设定" />
    </div>
    <div class="config-row">
      <label class="config-label">标题颜色</label>
      <input type="color" :value="rgbaToHex(title.color)" @input="onTitle('color', $event.target.value)" @change="commit" class="color-picker" />
    </div>
    <div class="config-row">
      <label class="config-label">标题字号</label>
      <input type="number" :value="title.fontSize ?? ''" @input="onTitleNum('fontSize', $event)" @change="commit" min="12" max="48" class="config-num" placeholder="28" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">标题栏高度</label>
      <input type="number" :value="hdr.height ?? ''" @input="onNestedNum('header', 'height', $event)" @change="commit" min="40" max="200" class="config-num" placeholder="90" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">标题背景图</label>
      <input type="text" :value="hdr.backgroundImage || ''" @input="onNested('header', 'backgroundImage', $event.target.value || null)" @change="commit" class="config-text" placeholder="图片路径" />
    </div>

    <!-- Tab Bar (sub-component) -->
    <TabCrudSection />

    <!-- Content Area -->
    <h4 class="form-group-title">内容区</h4>
    <div class="config-row">
      <label class="config-label">X</label>
      <input type="number" :value="area.x ?? ''" @input="onNestedNum('contentArea', 'x', $event)" @change="commit" min="0" max="500" class="config-num" placeholder="40" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">Y</label>
      <input type="number" :value="area.y ?? ''" @input="onNestedNum('contentArea', 'y', $event)" @change="commit" min="0" max="500" class="config-num" placeholder="160" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">宽度</label>
      <input type="number" :value="area.width ?? ''" @input="onNestedNum('contentArea', 'width', $event)" @change="commit" min="200" max="1920" class="config-num" placeholder="1200" />
      <span class="unit">px</span>
    </div>
    <div class="config-row">
      <label class="config-label">高度</label>
      <input type="number" :value="area.height ?? ''" @input="onNestedNum('contentArea', 'height', $event)" @change="commit" min="200" max="1080" class="config-num" placeholder="500" />
      <span class="unit">px</span>
    </div>

    <!-- Setting Assignment Matrix -->
    <SettingMatrix />

    <!-- Layout Controls -->
    <LayoutControlsSection />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import TabCrudSection from './TabCrudSection.vue';
import SettingMatrix from './SettingMatrix.vue';
import LayoutControlsSection from './LayoutControlsSection.vue';

const editor = useScreenLayoutEditor();

const cfg = computed(() => editor.getActiveScreenConfig() || {});
const hdr = computed(() => cfg.value.header || {});
const title = computed(() => hdr.value.title || {});
const area = computed(() => cfg.value.contentArea || {});

function rgbaToHex(color) {
  if (!color) return '#888888';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#888888';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function onNested(group, field, value) { editor.setScreenNestedField(group, field, value); }
function onNestedNum(group, field, e) { editor.setScreenNestedField(group, field, e.target.value === '' ? null : Number(e.target.value)); }

function onTitle(field, value) {
  const current = editor.getActiveScreenConfig();
  if (!current) return;
  current.header ??= {};
  current.header.title ??= {};
  current.header.title[field] = value;
  editor.sendScreenLayoutToPreview();
}

function onTitleNum(field, e) {
  onTitle(field, e.target.value === '' ? null : Number(e.target.value));
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
.unit {
  font-size: 11px;
  color: #666;
}
</style>
