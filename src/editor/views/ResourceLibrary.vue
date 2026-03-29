<template>
  <DropOverlay :categoryLabel="categoryLabels[activeSubTab]" @drop="onFileDrop">
    <div class="resource-library">
      <div class="toolbar">
        <h2>资源库</h2>
        <div class="toolbar-center">
          <div class="sub-tabs">
            <button
              v-for="tab in subTabs"
              :key="tab.id"
              :class="{ active: activeSubTab === tab.id }"
              @click="switchTab(tab.id)"
            >{{ tab.icon }} {{ tab.label }}</button>
          </div>
        </div>
        <button v-if="showImportButton" class="import-btn" @click="onImportClick">📂 导入文件</button>
        <span v-else style="width: 90px;"></span>
      </div>
      <ImportNotification :result="importResult" @dismiss="importResult = null" />
      <component :is="subTabComponent" />
    </div>
    <input
      type="file"
      ref="fileInputRef"
      multiple
      :accept="acceptTypes"
      @change="handleFileInput"
      style="display: none;"
    />
  </DropOverlay>
</template>

<script setup>
/**
 * ResourceLibrary — Master view for unified asset management.
 * Contains 4 sub-tabs (backgrounds, characters, audio, fonts) with shared
 * toolbar, import button, drop overlay, and import notification.
 * @module views/ResourceLibrary
 */
import { ref, computed, onMounted, onActivated, markRaw } from 'vue';
import { useAssetStore } from '../stores/assets.js';
import { useScriptStore } from '../stores/script.js';
import DropOverlay from '../components/resource-library/DropOverlay.vue';
import ImportNotification from '../components/resource-library/ImportNotification.vue';
import AssetGrid from '../components/resource-library/AssetGrid.vue';
import FontGrid from '../components/resource-library/FontGrid.vue';
import AudioList from '../components/resource-library/AudioList.vue';
import CharacterEditor from '../components/resource-library/CharacterEditor.vue';

const assets = useAssetStore();
const script = useScriptStore();

// ─── State ──────────────────────────────────────────────────────────
const activeSubTab = ref('backgrounds');
const importResult = ref(null);
const fileInputRef = ref(null);

// ─── Sub-tab Config ─────────────────────────────────────────────────
const subTabs = [
  { id: 'backgrounds', icon: '🖼️', label: '背景' },
  { id: 'characters', icon: '👤', label: '角色' },
  { id: 'audio', icon: '🎵', label: '音频' },
  { id: 'fonts', icon: '🔤', label: '字体' },
];

const categoryLabels = {
  backgrounds: '背景',
  characters: '角色',
  audio: '音频',
  fonts: '字体',
};

const subTabComponentMap = {
  backgrounds: markRaw(AssetGrid),
  characters: markRaw(CharacterEditor),
  audio: markRaw(AudioList),
  fonts: markRaw(FontGrid),
};

// ─── Computed ───────────────────────────────────────────────────────
const showImportButton = computed(() => activeSubTab.value !== 'characters');

const subTabComponent = computed(() => subTabComponentMap[activeSubTab.value]);

const acceptTypes = computed(() => {
  if (activeSubTab.value === 'audio') return 'audio/*';
  if (activeSubTab.value === 'fonts') return '.ttf,.otf,.woff,.woff2';
  return 'image/*';
});

// ─── Methods ────────────────────────────────────────────────────────

/**
 * Switch the active sub-tab.
 * @param {string} tabId
 */
function switchTab(tabId) {
  activeSubTab.value = tabId;
}

/**
 * Open native file dialog via hidden input.
 */
function onImportClick() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

/**
 * Handle file input change event.
 * @param {Event} e
 */
async function handleFileInput(e) {
  const fileList = e.target.files;
  if (!fileList || fileList.length === 0) return;
  await importFiles(Array.from(fileList));
  // Reset input so the same file can be re-uploaded
  e.target.value = '';
}

/**
 * Handle files dropped via DropOverlay.
 * @param {File[]} droppedFiles
 */
async function onFileDrop(droppedFiles) {
  if (!droppedFiles || droppedFiles.length === 0) return;
  await importFiles(droppedFiles);
}

/**
 * Common import logic for both file input and drag-drop.
 * Reads files into ArrayBuffer, converts to byte arrays, calls appropriate store method.
 * @param {File[]} fileArray
 */
async function importFiles(fileArray) {
  const category = activeSubTab.value;
  const fileDataArray = [];
  for (const file of fileArray) {
    const buffer = await file.arrayBuffer();
    fileDataArray.push({
      name: file.name,
      data: Array.from(new Uint8Array(buffer)),
    });
  }
  let result;
  if (category === 'fonts') {
    result = await assets.importFont('fonts', fileDataArray, script);
  } else {
    result = await assets.importAssets(category, fileDataArray);
  }
  importResult.value = result;
}

// ─── Lifecycle ──────────────────────────────────────────────────────
onMounted(() => {
  assets.loadAll();
});

onActivated(() => {
  assets.loadAll();
});
</script>

<style scoped>
.resource-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.toolbar h2 {
  margin: 0;
  font-weight: 500;
  font-size: 20px;
  color: #fff;
}
.toolbar-center {
  display: flex;
  align-items: center;
}
.sub-tabs {
  display: flex;
  gap: 0;
}
.sub-tabs button {
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  padding: 6px 16px;
  margin-left: -1px;
  cursor: pointer;
  font-size: 12px;
}
.sub-tabs button:first-child {
  border-radius: 4px 0 0 4px;
}
.sub-tabs button:last-child {
  border-radius: 0 4px 4px 0;
}
.sub-tabs button.active {
  background: #007acc;
  color: #fff;
  border-color: #007acc;
  z-index: 1;
  position: relative;
}
.import-btn {
  background: #0e633c;
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}
.import-btn:hover {
  background: #117748;
}
</style>
