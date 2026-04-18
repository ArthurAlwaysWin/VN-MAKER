<template>
  <div class="theme-designer" v-if="script.data">
    <!-- Left panel: 360px fixed -->
    <div class="theme-panel">
      <ThemeToolbar
        @open-palette="editor.showPalette.value = true"
        @open-nine-slice="editor.showNineSlice.value = true"
        @open-preset="editor.showPreset.value = true"
        @open-package="showPackage = true"
      />
      <div class="token-scroll">
        <SmartColorPanel />
        <TokenAccordion />
      </div>
    </div>
    <!-- Right panel: iframe preview -->
    <div class="theme-preview">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>
    <!-- Modals -->
    <PaletteModal v-if="editor.showPalette.value" @close="editor.showPalette.value = false" />
    <NineSliceModal v-if="editor.showNineSlice.value" @close="editor.showNineSlice.value = false" />
    <PresetModal v-if="editor.showPreset.value" @close="editor.showPreset.value = false" />
    <ThemePackageModal v-if="showPackage" @close="onPackageClose" />
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createThemeEditor } from '../composables/useThemeEditor.js';
import ThemeToolbar from '../components/theme/ThemeToolbar.vue';
import TokenAccordion from '../components/theme/TokenAccordion.vue';
import SmartColorPanel from '../components/theme/SmartColorPanel.vue';
import PaletteModal from '../components/theme/PaletteModal.vue';
import NineSliceModal from '../components/theme/NineSliceModal.vue';
import PresetModal from '../components/theme/PresetModal.vue';
import ThemePackageModal from '../components/theme/ThemePackageModal.vue';

const script = useScriptStore();
const editor = createThemeEditor();
const showPackage = ref(false);

function onIframeRef(el) {
  editor.iframeRef.value = el;
}

function onPackageClose() {
  showPackage.value = false;
  if (editor.isEngineReady.value) {
    editor.startEngine();
    editor.flushPreview();
  }
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
.theme-designer {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.theme-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.token-scroll {
  flex: 1;
  overflow-y: auto;
}
.theme-preview {
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
