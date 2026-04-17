<template>
  <div class="screen-layout-editor" v-if="script.data">
    <!-- Left panel: 360px fixed -->
    <div class="sl-panel">
      <div class="sl-panel-header">
        <span class="sl-panel-title">界面布局</span>
      </div>
      <div class="sl-scroll">
        <div
          v-for="screen in editor.SCREENS"
          :key="screen.id"
          class="sl-section"
          :class="{ 'sl-section-active': editor.activeScreen.value === screen.id }"
        >
          <button
            class="sl-section-header"
            @click="toggleSection(screen.id)"
          >
            <span class="sl-section-arrow">{{ expanded[screen.id] ? '▼' : '▶' }}</span>
            <span class="sl-section-label">{{ screen.label }}</span>
          </button>
          <div v-if="expanded[screen.id]" class="sl-section-body">
            <p class="sl-placeholder">{{ screen.label }}配置表单将在后续阶段添加</p>
          </div>
        </div>
      </div>
    </div>
    <!-- Right panel: iframe preview -->
    <div class="sl-preview">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createScreenLayoutEditor } from '../composables/useScreenLayoutEditor.js';

const script = useScriptStore();
const editor = createScreenLayoutEditor();

const expanded = reactive({
  saveLoadScreen: true,
  backlogScreen: false,
  gameMenu: false,
  settingsScreen: false,
});

function toggleSection(screenId) {
  expanded[screenId] = !expanded[screenId];
  editor.activeScreen.value = screenId;
}

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
.screen-layout-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.sl-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.sl-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #333;
  background: #2d2d2d;
}
.sl-panel-title {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}
.sl-scroll {
  flex: 1;
  overflow-y: auto;
}
.sl-section {
  border-bottom: 1px solid #333;
}
.sl-section-active {
  background: #2a2d2e;
}
.sl-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 14px;
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.sl-section-header:hover {
  background: #2a2d2e;
}
.sl-section-arrow {
  font-size: 10px;
  width: 12px;
  color: #888;
}
.sl-section-label {
  font-weight: 500;
}
.sl-section-body {
  padding: 8px 14px 12px;
}
.sl-placeholder {
  color: #666;
  font-size: 12px;
  text-align: center;
  margin: 12px 0;
}
.sl-preview {
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
