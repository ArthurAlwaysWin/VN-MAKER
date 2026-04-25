<template>
  <div class="cursor-icon-settings" v-if="theme">
    <!-- Cursor images -->
    <h3 class="section-title">光标图片</h3>
    <p class="section-hint">配置自定义光标图片；未配置时使用系统默认光标</p>

    <div
      v-for="slot in cursorSlots"
      :key="slot.key"
      class="slot-row"
    >
      <span class="slot-label">{{ slot.label }}</span>
      <input
        class="image-path"
        :value="getUiImageDisplayValue(getCursorValue(slot.key))"
        readonly
        placeholder="未选择"
      />
      <button
        type="button"
        class="picker-btn"
        @click="onPickCursor(slot.key)"
      >选择图片</button>
      <button
        v-if="getCursorValue(slot.key)"
        type="button"
        class="clear-btn"
        @click="onClearCursor(slot.key)"
      >清除</button>
    </div>

    <!-- Icon images -->
    <h3 class="section-title" style="margin-top: 16px;">主题图标</h3>
    <p class="section-hint">配置核心操作图标；未配置时使用默认文字/符号</p>

    <div
      v-for="slot in iconSlots"
      :key="slot.key"
      class="slot-row"
    >
      <span class="slot-label">{{ slot.label }}</span>
      <input
        class="image-path"
        :value="getUiImageDisplayValue(getIconValue(slot.key))"
        readonly
        placeholder="未选择"
      />
      <button
        type="button"
        class="picker-btn"
        @click="onPickIcon(slot.key)"
      >选择图片</button>
      <button
        v-if="getIconValue(slot.key)"
        type="button"
        class="clear-btn"
        @click="onClearIcon(slot.key)"
      >清除</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScriptStore } from '../../stores/script.js';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import { clearUiImage, getUiImageDisplayValue, pickUiImage } from '../../utils/uiImageField.js';

const script = useScriptStore();
const themeEditor = useThemeEditor();

const theme = computed(() => script.getTheme());

const cursorSlots = [
  { key: 'default', label: '默认光标' },
  { key: 'pointer', label: '指针光标' },
];

const iconSlots = [
  { key: 'gameMenu', label: '游戏菜单图标' },
  { key: 'qab', label: '快捷操作图标' },
  { key: 'close', label: '关闭按钮图标' },
  { key: 'voiceReplay', label: '语音重播图标' },
];

function getCursorValue(key) {
  return theme.value?.cursor?.[key] || '';
}

function getIconValue(key) {
  return theme.value?.icons?.[key] || '';
}

function ensureCursor() {
  const t = theme.value;
  if (!t) return null;
  t.cursor ??= {};
  return t.cursor;
}

function ensureIcons() {
  const t = theme.value;
  if (!t) return null;
  t.icons ??= {};
  return t.icons;
}

function onPickCursor(key) {
  const cursor = ensureCursor();
  if (!cursor) return;
  pickUiImage({
    setValue: (value) => {
      cursor[key] = value;
    },
    preview: () => themeEditor.sendThemeToPreview(),
    commit: () => themeEditor.commitTheme(),
  });
}

function onClearCursor(key) {
  const cursor = ensureCursor();
  if (!cursor) return;
  clearUiImage({
    setValue: (value) => {
      cursor[key] = value;
    },
    commit: () => themeEditor.commitTheme(),
  });
}

function onPickIcon(key) {
  const icons = ensureIcons();
  if (!icons) return;
  pickUiImage({
    setValue: (value) => {
      icons[key] = value;
    },
    preview: () => themeEditor.sendThemeToPreview(),
    commit: () => themeEditor.commitTheme(),
  });
}

function onClearIcon(key) {
  const icons = ensureIcons();
  if (!icons) return;
  clearUiImage({
    setValue: (value) => {
      icons[key] = value;
    },
    commit: () => themeEditor.commitTheme(),
  });
}
</script>

<style scoped>
.cursor-icon-settings {
  padding: 0 4px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  margin: 0 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
}
.section-hint {
  font-size: 11px;
  color: #888;
  margin: -4px 0 8px;
}
.slot-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.slot-label {
  font-size: 12px;
  color: #aaa;
  min-width: 90px;
  white-space: nowrap;
}
.image-path {
  flex: 1;
  padding: 4px 8px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  min-width: 0;
}
.picker-btn {
  padding: 4px 10px;
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}
.picker-btn:hover {
  background: #3a3a3a;
  color: #eee;
}
.clear-btn {
  padding: 4px 8px;
  background: none;
  border: 1px solid #555;
  border-radius: 4px;
  color: #999;
  font-size: 11px;
  cursor: pointer;
}
.clear-btn:hover {
  color: #ff6b6b;
  border-color: #ff6b6b;
}
</style>
