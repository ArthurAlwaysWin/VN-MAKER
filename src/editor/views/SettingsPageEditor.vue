<template>
  <div class="screen-editor" v-if="script.data">
    <div class="se-canvas">
      <UnifiedScreenDesignerShell
        v-if="initialDocument"
        :initial-document="initialDocument"
        production-screen-id="settings"
        production-screen-label="Settings"
        @document-change="onDocumentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScriptStore } from '../stores/script.js';
import UnifiedScreenDesignerShell from '../components/screen-designer/UnifiedScreenDesignerShell.vue';
import { adaptLegacyUiScreen } from '../../shared/uiLegacyAdapters.js';

const script = useScriptStore();
const initialDocument = computed(() => script.data ? adaptLegacyUiScreen(script.data, 'settings').document : null);

function onDocumentChange({ document }) {
  script.updateCanonicalSettingsScreen(document);
}
</script>

<style scoped>
.screen-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.se-canvas {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
