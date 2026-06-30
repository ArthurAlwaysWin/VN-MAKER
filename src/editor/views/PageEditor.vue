<template>
  <div class="page-editor" v-if="script.data">
    <div class="page-editor-mode-toolbar" data-test="page-editor-mode-toolbar">
      <button type="button" data-test="page-editor-story-mode" :class="{ active: editMode === 'story' }" @click="editMode = 'story'">Story Edit</button>
      <button type="button" data-test="page-editor-ui-mode" :class="{ active: editMode === 'ui' }" @click="editMode = 'ui'">Gameplay UI Edit</button>
      <span>{{ editMode === 'story' ? 'Page Editor owns story staging' : 'Unified Designer owns persistent gameplay chrome' }}</span>
    </div>
    <div v-if="editMode === 'ui'" class="gameplay-ui-editor" data-test="gameplay-ui-edit-mode">
      <UnifiedScreenDesignerShell
        :initial-document="gameplayDocument"
        production-screen-id="gameplay"
        production-screen-label="Gameplay UI"
        @document-change="onGameplayDocumentChange"
      />
    </div>
    <template v-else>
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
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { useProjectStore } from '../stores/project.js';
import { createPageEditor } from '../composables/usePageEditor.js';
import SceneTree from '../components/page-editor/SceneTree.vue';
import CanvasToolbar from '../components/page-editor/CanvasToolbar.vue';
import PageCanvas from '../components/page-editor/PageCanvas.vue';
import CharacterPicker from '../components/page-editor/CharacterPicker.vue';
import AssetPickerModal from '../components/resource-library/AssetPickerModal.vue';
import AudioPicker from '../components/page-editor/AudioPicker.vue';
import PageInspector from '../components/page-editor/PageInspector.vue';
import UnifiedScreenDesignerShell from '../components/screen-designer/UnifiedScreenDesignerShell.vue';
import { adaptLegacyUiScreen } from '../../shared/uiLegacyAdapters.js';

const script = useScriptStore();
const project = useProjectStore();
const editor = createPageEditor();

const iframeRef = ref(null);
const editMode = ref('story');
const gameplayDocument = computed(() => adaptLegacyUiScreen(script.data ?? {}, 'gameplay').document);
function onGameplayDocumentChange(event) {
  if (!event?.document) return;
  script.updateCanonicalGameplayScreen(event.document);
}

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

function applySceneNavigationRequest(request = project.sceneNavigationRequest) {
  if (!request?.sceneId || !script.data?.scenes?.[request.sceneId]) {
    return;
  }

  const scene = script.data.scenes[request.sceneId];
  const pageCount = scene.pages?.length ?? 0;
  let pageIndex = 0;
  if (pageCount === 0) {
    pageIndex = -1;
  } else if (Number.isInteger(request.pageIndex)) {
    pageIndex = Math.max(0, Math.min(request.pageIndex, pageCount - 1));
  }
  editor.selectPage(request.sceneId, pageIndex);
}

watch(() => project.sceneNavigationRequest?.nonce, () => {
  applySceneNavigationRequest();
});

onMounted(() => {
  editor.initSelection();
  applySceneNavigationRequest();
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
  position: relative;
  padding-top: 38px;
  box-sizing: border-box;
}

.page-editor-mode-toolbar {
  position: absolute;
  inset: 0 0 auto 0;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: #18181a;
  border-bottom: 1px solid #34343a;
  z-index: 20;
}

.page-editor-mode-toolbar button { color: #ddd; background: #2b2b30; border: 1px solid #454550; border-radius: 4px; padding: 4px 10px; }
.page-editor-mode-toolbar button.active { color: #fff; background: #4d3d78; border-color: #8069bb; }
.page-editor-mode-toolbar span { color: #9ca3af; font-size: 12px; }
.gameplay-ui-editor { width: 100%; height: 100%; overflow: hidden; }

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
