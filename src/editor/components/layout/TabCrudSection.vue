<template>
  <div>
    <h4 class="form-group-title">标签栏</h4>

    <div class="mode-options" role="group" aria-label="设置页显示模式">
      <label class="radio-label">
        <input type="radio" :checked="tabsEnabled" @change="setTabsMode(true)" /> 分标签页
      </label>
      <label class="radio-label">
        <input type="radio" :checked="!tabsEnabled" @change="setTabsMode(false)" /> 单页显示
      </label>
    </div>
    <p class="mode-help">
      {{ tabsEnabled
        ? '设置项按下方标签分组；重复项取首次分配，未分配项会稳定补到最后一个标签。'
        : '不创建标签栏，全部设置项按固定顺序各显示一次；现有标签分配会保留。' }}
    </p>

    <div v-if="tabsEnabled">
      <!-- Tab position radio (D-19) -->
      <div class="config-row">
        <label class="config-label">位置</label>
        <label class="radio-label">
          <input type="radio" :checked="tabPosition === 'top'" @change="setTabPosition('top')" /> 顶部
        </label>
        <label class="radio-label">
          <input type="radio" :checked="tabPosition === 'left'" @change="setTabPosition('left')" /> 侧边
        </label>
      </div>

    <!-- Sidebar width (D-20, only when left) -->
    <div class="config-row" v-if="tabPosition === 'left'">
      <label class="config-label">侧边栏宽度</label>
      <input type="number" :value="tabBar.width ?? ''" @input="onTabBarNum('width', $event)" @change="commit" min="100" max="400" class="config-num" placeholder="180" />
      <span class="unit">px</span>
    </div>

    <!-- Tab bar height -->
    <div class="config-row">
      <label class="config-label">高度</label>
      <input type="number" :value="tabBar.height ?? ''" @input="onTabBarNum('height', $event)" @change="commit" min="30" max="100" class="config-num" placeholder="56" />
      <span class="unit">px</span>
    </div>

    <!-- Tab bar background -->
    <div class="config-row">
      <label class="config-label">背景色</label>
      <input type="color" :value="rgbaToHex(tabBar.background)" @input="onTabBarField('background', $event.target.value)" @change="commit" class="color-picker" />
    </div>

    <!-- Tab list (D-03 through D-07) -->
    <div class="tab-list">
      <div v-for="(tab, idx) in tabs" :key="idx" class="tab-row">
        <input type="text" :value="tab.label" @input="onTabLabelInput(idx, $event.target.value)" @change="commit" class="config-text tab-label-input" placeholder="标签名" />
        <input type="text" :value="tab.icon || ''" @input="onTabIconInput(idx, $event.target.value)" @change="commit" class="config-text tab-icon-input" placeholder="图标路径" />
        <button class="btn-delete" @click="onDeleteTab(idx)" title="删除标签">×</button>
      </div>
    </div>

      <!-- Add tab button (D-04) -->
      <button class="btn-add" @click="onAddTab">+ 添加标签</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import {
  ensureDefaultTabs,
  addTab,
  deleteTab,
  setTabLabel,
  setTabIcon,
  DEFAULT_TABS,
  setTabBarEnabled,
} from './tabLayoutHelpers.js';

const editor = useScreenLayoutEditor();

const cfg = computed(() => editor.getActiveScreenConfig() || {});
const tabBar = computed(() => cfg.value.tabBar || {});
const tabs = computed(() => {
  const raw = tabBar.value.tabs;
  return (Array.isArray(raw) && raw.length > 0) ? raw : DEFAULT_TABS;
});
const tabPosition = computed(() => tabBar.value.position || 'top');
const tabsEnabled = computed(() => tabBar.value.enabled !== false);

function setTabsMode(enabled) {
  const raw = editor.getActiveScreenConfig();
  setTabBarEnabled(raw, enabled);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function rgbaToHex(color) {
  if (!color) return '#888888';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#888888';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function setTabPosition(pos) {
  editor.setScreenNestedField('tabBar', 'position', pos);
  editor.commitScreenLayout();
}

function onTabBarField(field, value) {
  editor.setScreenNestedField('tabBar', field, value);
}

function onTabBarNum(field, e) {
  editor.setScreenNestedField('tabBar', field, e.target.value === '' ? null : Number(e.target.value));
}

function onTabLabelInput(idx, value) {
  const raw = editor.getActiveScreenConfig();
  ensureDefaultTabs(raw);
  setTabLabel(raw, idx, value);
  editor.sendScreenLayoutToPreview();
}

function onTabIconInput(idx, value) {
  const raw = editor.getActiveScreenConfig();
  ensureDefaultTabs(raw);
  setTabIcon(raw, idx, value || null);
  editor.sendScreenLayoutToPreview();
}

function onAddTab() {
  const raw = editor.getActiveScreenConfig();
  ensureDefaultTabs(raw);
  addTab(raw);
  editor.sendScreenLayoutToPreview();
  editor.commitScreenLayout();
}

function onDeleteTab(idx) {
  const raw = editor.getActiveScreenConfig();
  if (!raw?.tabBar?.tabs) return;
  deleteTab(raw, idx);
  editor.sendScreenLayoutToPreview();
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
.form-group-title:first-child { margin-top: 0; }
.mode-options { display: flex; gap: 12px; padding: 4px 0; }
.mode-help { margin: 2px 0 8px; color: #777; font-size: 11px; line-height: 1.5; }
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
.color-picker {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid #444;
  border-radius: 3px;
  cursor: pointer;
  background: none;
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
.tab-list {
  margin: 6px 0;
}
.tab-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
.tab-label-input {
  width: 80px;
  flex: 0 0 80px;
}
.tab-icon-input {
  flex: 1;
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
</style>
