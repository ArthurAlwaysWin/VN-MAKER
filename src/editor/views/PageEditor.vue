<template>
  <div class="page-editor" v-if="script.data">
    <!-- Left: Scene Tree Sidebar -->
    <div class="sidebar">
      <SceneTree />
    </div>

    <!-- Center: Canvas Area -->
    <div class="canvas-area">
      <CanvasToolbar />
      <PageCanvas />
    </div>

    <!-- Right: Inspector Panel -->
    <div class="inspector">
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
import { onMounted } from 'vue';
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
</style>
