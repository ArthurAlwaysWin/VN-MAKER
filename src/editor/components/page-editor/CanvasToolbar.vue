<template>
  <div class="canvas-toolbar">
    <button class="add-char-btn" @click="editor.showCharPicker.value = true"
      :disabled="!editor.currentPage.value">
      + 添加角色
    </button>
    <span class="toolbar-sep"></span>
    <span class="toolbar-info" v-if="editor.currentPage.value">
      页面 {{ editor.selectedPageIndex.value + 1 }}
      <template v-if="editor.currentPage.value.type !== 'normal'">
        ({{ editor.currentPage.value.type === 'choice' ? '选择页' : '条件页' }})
      </template>
    </span>
    <span class="toolbar-info" v-else>未选中页面</span>
  </div>
</template>

<script setup>
import { usePageEditor } from '../../composables/usePageEditor.js';

const editor = usePageEditor();
</script>

<style scoped>
.canvas-toolbar {
  height: 32px;
  background: #2d2d2d;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  flex-shrink: 0;
}

.add-char-btn {
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 12px;
  height: 24px;
  font-size: 12px;
  cursor: pointer;
}

.add-char-btn:hover:not(:disabled) {
  background: #0098ff;
}

.add-char-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: #444;
}

.toolbar-info {
  color: #aaa;
  font-size: 12px;
}
</style>
