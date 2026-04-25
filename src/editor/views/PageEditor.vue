<template>
  <div class="page-editor" v-if="script.data">
    <!-- Left: Scene Tree Sidebar -->
    <div class="sidebar" :class="{ 'preview-readonly': editor.previewSessionType.value !== null }">
      <SceneTree />
    </div>

    <!-- Center: Canvas Area -->
    <div class="canvas-area">
      <CanvasToolbar />
      <div class="canvas-content">
        <PageCanvas v-show="editor.previewSessionType.value === null" />
        <iframe
          v-show="editor.previewSessionType.value !== null"
          :ref="onIframeRef"
          class="preview-iframe"
          src="/index.html"
        ></iframe>
        <!-- Overlay stop button — per D-13, D-14: positioned outside iframe by editor -->
        <button
          v-if="editor.previewSessionType.value !== null"
          class="preview-overlay-stop"
          :title="editor.stopPreviewLabel.value"
          @click="editor.stopPreview()"
        >■ {{ editor.stopPreviewLabel.value }}</button>
      </div>
    </div>

    <!-- Right: Inspector Panel -->
    <div class="inspector" :class="{ 'preview-readonly': editor.previewSessionType.value !== null }">
      <PageInspector />
    </div>

    <!-- Character Picker Modal -->
    <CharacterPicker v-if="editor.showCharPicker.value" />

    <!-- Background Picker Modal -->
    <AssetPickerModal
      category="backgrounds"
      :visible="editor.showBgPicker.value"
      @select="onBgSelect"
      @close="editor.showBgPicker.value = false"
    />

    <!-- Audio Picker Modal -->
    <AudioPicker
      :visible="editor.showAudioPicker.value"
      :defaultTab="editor.audioPickerTab.value"
      @select="onAudioSelect"
      @close="editor.showAudioPicker.value = false"
    />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createPageEditor } from '../composables/usePageEditor.js';
import SceneTree from '../components/page-editor/SceneTree.vue';
import CanvasToolbar from '../components/page-editor/CanvasToolbar.vue';
import PageCanvas from '../components/page-editor/PageCanvas.vue';
import CharacterPicker from '../components/page-editor/CharacterPicker.vue';
import AssetPickerModal from '../components/resource-library/AssetPickerModal.vue';
import AudioPicker from '../components/page-editor/AudioPicker.vue';
import PageInspector from '../components/page-editor/PageInspector.vue';

const script = useScriptStore();
const editor = createPageEditor();

const iframeRef = ref(null);

function onIframeRef(el) {
  iframeRef.value = el;
  editor.previewIframeRef.value = el;
}

function onBgSelect(path) {
  const page = editor.currentPage.value;
  if (!page) return;
  page.background = path;
  script.pushState();
  editor.showBgPicker.value = false;
}

function onAudioSelect(path) {
  const page = editor.currentPage.value;
  if (!page) return;
  const tab = editor.audioPickerTab.value;
  if (tab === 'bgm') {
    page.bgm = { file: path, volume: page.bgm?.volume ?? 0.5 };
  } else {
    page.se = { file: path, volume: page.se?.volume ?? 0.5 };
  }
  script.pushState();
  editor.showAudioPicker.value = false;
}

onMounted(() => {
  editor.initSelection();
  window.addEventListener('message', editor.onEngineMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', editor.onEngineMessage);
});
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
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 400px;
  background: #1e1e1e;
}

.inspector {
  width: 300px;
  background: #252526;
  border-left: 1px solid #111;
  flex-shrink: 0;
  overflow-y: auto;
}

.canvas-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-iframe {
  width: 100%;
  flex: 1;
  border: none;
  background: #000;
}

.preview-overlay-stop {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.5);
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.preview-overlay-stop:hover {
  background: rgba(180, 30, 30, 0.8);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.5);
}

.preview-readonly {
  pointer-events: none;
  opacity: 0.6;
}
</style>
