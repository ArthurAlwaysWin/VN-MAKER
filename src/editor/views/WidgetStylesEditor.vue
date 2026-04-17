<template>
  <div class="widget-styles-editor" v-if="script.data">
    <!-- Left panel: 360px fixed -->
    <div class="ws-panel">
      <div class="ws-panel-header">
        <span class="ws-panel-title">控件风格</span>
      </div>
      <div class="ws-scroll">
        <div
          v-for="section in SECTIONS"
          :key="section.id"
          class="ws-section"
        >
          <button
            class="ws-section-header"
            @click="toggleSection(section.id)"
          >
            <span class="ws-section-arrow">{{ expanded[section.id] ? '▼' : '▶' }}</span>
            <span class="ws-section-label">{{ section.label }}</span>
          </button>
          <div v-if="expanded[section.id]" class="ws-section-body">
            <TabShapeSection v-if="section.id === 'tab'" />
            <ToggleStyleSection v-if="section.id === 'toggle'" />
            <SliderConfigSection v-if="section.id === 'slider'" />
            <PanelConfigSection v-if="section.id === 'panel'" />
            <ButtonConfigSection v-if="section.id === 'button'" />
          </div>
        </div>
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
import { reactive, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createWidgetStylesEditor } from '../composables/useWidgetStylesEditor.js';
import TabShapeSection from '../components/widget/TabShapeSection.vue';
import ToggleStyleSection from '../components/widget/ToggleStyleSection.vue';
import SliderConfigSection from '../components/widget/SliderConfigSection.vue';
import PanelConfigSection from '../components/widget/PanelConfigSection.vue';
import ButtonConfigSection from '../components/widget/ButtonConfigSection.vue';

const script = useScriptStore();
const editor = createWidgetStylesEditor();

const SECTIONS = [
  { id: 'tab', label: '📑 Tab 形状' },
  { id: 'toggle', label: '🔘 Toggle 样式' },
  { id: 'slider', label: '🎚️ Slider 外观' },
  { id: 'panel', label: '📦 Panel 面板' },
  { id: 'button', label: '🔲 Button 按钮' },
];

const expanded = reactive({ tab: true, toggle: false, slider: false, panel: false, button: false });

function toggleSection(id) {
  for (const key of Object.keys(expanded)) {
    expanded[key] = key === id ? !expanded[key] : false;
  }
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
}
.ws-section {
  border-bottom: 1px solid #333;
}
.ws-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 14px;
  background: #2d2d2d;
  border: none;
  color: #ccc;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.ws-section-header:hover {
  background: #333;
}
.ws-section-arrow {
  font-size: 10px;
  width: 12px;
  color: #888;
}
.ws-section-label {
  font-weight: 500;
}
.ws-section-body {
  padding: 8px 12px 12px;
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
