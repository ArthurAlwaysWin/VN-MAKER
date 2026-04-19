<template>
  <div class="screen-editor" v-if="script.data">
    <div class="se-panel">
      <div class="se-panel-header">
        <span class="se-panel-title">📖 回想</span>
      </div>
      <div class="se-scroll">
        <BacklogSection />
      </div>
    </div>
    <div class="se-preview">
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
import { createScreenLayoutEditor } from '../composables/useScreenLayoutEditor.js';
import BacklogSection from '../components/layout/BacklogSection.vue';

const script = useScriptStore();
const editor = createScreenLayoutEditor('backlogScreen');

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
.screen-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.se-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.se-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #333;
  background: #2d2d2d;
}
.se-panel-title {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}
.se-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px 12px;
}
.se-preview {
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
