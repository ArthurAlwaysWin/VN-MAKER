<template>
  <div class="widget-styles-editor" v-if="script.data">
    <!-- Left panel: 360px fixed -->
    <div class="ws-panel">
      <div class="ws-panel-header">
        <span class="ws-panel-title">控件风格</span>
      </div>
      <div class="ws-scroll">
        <p class="ws-placeholder">控件风格表单将在后续阶段添加</p>
      </div>
    </div>
    <!-- Right panel: iframe preview -->
    <div class="ws-preview">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createWidgetStylesEditor } from '../composables/useWidgetStylesEditor.js';

const script = useScriptStore();
const editor = createWidgetStylesEditor();

function onIframeRef(el) {
  editor.iframeRef.value = el;
}

onMounted(() => {
  window.addEventListener('message', editor.onEngineMessage);
});

onActivated(() => {
  if (editor.isEngineReady.value) {
    editor.startEngine();
    editor.flushPreview();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('message', editor.onEngineMessage);
});
</script>

<style scoped>
.widget-styles-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.ws-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.ws-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #333;
  background: #2d2d2d;
}
.ws-panel-title {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}
.ws-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
.ws-placeholder {
  color: #666;
  font-size: 12px;
  text-align: center;
  margin-top: 40px;
}
.ws-preview {
  flex: 1;
  display: flex;
  background: #000;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
