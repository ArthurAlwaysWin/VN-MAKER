<template>
  <div class="theme-toolbar">
    <button class="toolbar-btn" @click="onReset" title="重置主题">🔄 重置</button>
    <button class="toolbar-btn" @click="$emit('open-palette')" title="调色盘生成器">🎨 调色盘</button>
    <button class="toolbar-btn" @click="$emit('open-nine-slice')" title="九宫格配置">🖼️ 九宫格</button>
    <button class="toolbar-btn" @click="$emit('open-preset')" title="主题预设">📦 预设</button>
  </div>
</template>

<script setup>
import { useThemeEditor } from '../../composables/useThemeEditor.js';

defineEmits(['open-palette', 'open-nine-slice', 'open-preset']);

const editor = useThemeEditor();

function onReset() {
  editor.resetTheme();
  editor.commitTheme();
}
</script>

<style scoped>
.theme-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
  background: #1e1e1e;
}
.toolbar-btn {
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.toolbar-btn:hover {
  background: #444;
  color: #e0e0e0;
}
</style>
