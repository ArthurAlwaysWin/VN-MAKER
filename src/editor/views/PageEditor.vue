<template>
  <div class="page-editor" v-if="script.data">
    <!-- Left: Scene Tree Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">📑 场景/页面</div>
      <div class="sidebar-placeholder">场景树将在下一步实现</div>
    </div>

    <!-- Center: Canvas Area -->
    <div class="canvas-area">
      <div class="canvas-toolbar-placeholder">工具栏</div>
      <div class="canvas-placeholder">
        <div class="placeholder-label">1280×720 画布</div>
        <div class="placeholder-info" v-if="editor.currentPage.value">
          当前页面: {{ editor.currentPage.value.id }}
        </div>
        <div class="placeholder-info" v-else>未选中页面</div>
      </div>
    </div>

    <!-- Right: Inspector Panel -->
    <div class="inspector">
      <div class="inspector-header-bar">📋 属性检查器</div>
      <div class="inspector-placeholder">属性面板将在下一步实现</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createPageEditor } from '../composables/usePageEditor.js';

const script = useScriptStore();
const editor = createPageEditor();

onMounted(() => editor.initSelection());
</script>

<style scoped>
.page-editor {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  background: #252526;
  border-right: 1px solid #111;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  border-bottom: 1px solid #333;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 400px;
  background: #1e1e1e;
}

.canvas-toolbar-placeholder {
  height: 36px;
  background: #2d2d2d;
  border-bottom: 1px solid #111;
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: #888;
  font-size: 12px;
}

.canvas-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #555;
}

.placeholder-label {
  font-size: 18px;
  margin-bottom: 8px;
}

.placeholder-info {
  font-size: 12px;
  color: #666;
}

.inspector {
  width: 300px;
  background: #252526;
  border-left: 1px solid #111;
  flex-shrink: 0;
  overflow-y: auto;
}

.inspector-header-bar {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  border-bottom: 1px solid #333;
}

.sidebar-placeholder,
.inspector-placeholder {
  padding: 20px;
  color: #555;
  font-size: 12px;
  text-align: center;
}
</style>
