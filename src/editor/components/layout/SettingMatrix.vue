<template>
  <div>
    <h4 class="form-group-title">设置项分配</h4>
    <div v-if="!tabsEnabled" class="single-page-notice">
      单页模式会忽略标签分配并按固定顺序显示全部 {{ allSettingKeys.length }} 个设置项；重新启用标签页后，下方分配仍会保留。
    </div>
    <div v-else class="matrix-container">
      <table class="setting-matrix">
        <thead>
          <tr>
            <th class="matrix-key-header">设置项</th>
            <th v-for="(tab, tIdx) in tabs" :key="tIdx" class="matrix-tab-header">{{ tab.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in allSettingKeys" :key="key">
            <td class="matrix-key-label">{{ settingLabel(key) }}</td>
            <td v-for="(tab, tIdx) in tabs" :key="tIdx" class="matrix-cell">
              <input
                type="checkbox"
                :checked="keyInTab(key, tIdx)"
                @change="onToggle(key, tIdx)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Unassigned indicator (D-14) -->
    <div v-if="tabsEnabled && unassignedKeys.length" class="unassigned-notice">
      未分配: {{ unassignedKeys.map(k => settingLabel(k)).join('、') }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScreenLayoutEditor } from '../../composables/useScreenLayoutEditor.js';
import { SETTING_DEFS } from '../../../engine/settingDefs.js';
import {
  ensureDefaultTabs,
  toggleKeyAssignment,
  getUnassignedKeys,
  isKeyInTab as _isKeyInTab,
  DEFAULT_TABS,
} from './tabLayoutHelpers.js';

const editor = useScreenLayoutEditor();

const cfg = computed(() => editor.getActiveScreenConfig() || {});
const tabBar = computed(() => cfg.value.tabBar || {});
const tabs = computed(() => {
  const raw = tabBar.value.tabs;
  return (Array.isArray(raw) && raw.length > 0) ? raw : DEFAULT_TABS;
});
const tabsEnabled = computed(() => tabBar.value.enabled !== false);

const allSettingKeys = Object.keys(SETTING_DEFS);

function settingLabel(key) {
  return SETTING_DEFS[key]?.label || key;
}

function keyInTab(key, tabIndex) {
  return _isKeyInTab(tabs.value, key, tabIndex);
}

const unassignedKeys = computed(() => getUnassignedKeys(tabs.value, allSettingKeys));

function onToggle(key, tabIndex) {
  const raw = editor.getActiveScreenConfig();
  ensureDefaultTabs(raw);
  toggleKeyAssignment(raw, key, tabIndex);
  editor.sendScreenLayoutToPreview();
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
.matrix-container {
  overflow-x: auto;
  margin: 6px 0;
}
.setting-matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.setting-matrix th,
.setting-matrix td {
  padding: 4px 8px;
  border: 1px solid #333;
  text-align: center;
}
.matrix-key-header {
  text-align: left;
  color: #aaa;
  background: #2a2a2a;
  position: sticky;
  left: 0;
  z-index: 1;
}
.matrix-tab-header {
  color: #aaa;
  background: #2a2a2a;
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.matrix-key-label {
  text-align: left;
  color: #ccc;
  background: #252526;
  position: sticky;
  left: 0;
  z-index: 1;
  white-space: nowrap;
}
.matrix-cell {
  background: #1e1e1e;
}
.matrix-cell input[type="checkbox"] {
  cursor: pointer;
  accent-color: #007acc;
}
.unassigned-notice {
  font-size: 11px;
  color: #c97a2a;
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(201, 122, 42, 0.1);
  border-radius: 3px;
}
.single-page-notice {
  font-size: 11px;
  color: #8db8dc;
  margin: 6px 0;
  padding: 8px;
  line-height: 1.5;
  background: rgba(0, 122, 204, 0.1);
  border-radius: 3px;
}
</style>
