<script setup>
/**
 * AudioList — Audio file list with singleton playback, context menu, and inline rename.
 * Each row shows 🎵 icon, editable filename, and a MiniPlayer for playback.
 * Only one audio can play at a time — starting a new one pauses the previous.
 * @module components/resource-library/AudioList
 */
import { ref, computed } from 'vue';
import { useAssetStore } from '../../stores/assets.js';
import MiniPlayer from './MiniPlayer.vue';
import InlineEdit from './InlineEdit.vue';
import ContextMenu from './ContextMenu.vue';

const assets = useAssetStore();

// ─── Computed ───────────────────────────────────────────────────────
const audioFiles = computed(() => assets.files.audio);

// ─── Singleton Playback ─────────────────────────────────────────────
const activePlayer = ref(null);

/**
 * Set the active player — deactivates all other MiniPlayers via their `active` prop.
 * @param {string} filename
 */
function onPlay(filename) {
  activePlayer.value = filename;
}

function onStop() {
  activePlayer.value = null;
}

// ─── Context Menu State ─────────────────────────────────────────────
const menuVisible = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuTarget = ref('');

const menuItems = [
  { label: '重命名', action: 'rename' },
  { separator: true },
  { label: '删除', action: 'delete', destructive: true },
];

// ─── InlineEdit Refs ────────────────────────────────────────────────
const editRefs = {};

/**
 * Store InlineEdit component ref for a given filename.
 * @param {string} file
 * @param {object|null} el
 */
function setEditRef(file, el) {
  if (el) {
    editRefs[file] = el;
  }
}

// ─── Event Handlers ─────────────────────────────────────────────────

/**
 * Show context menu at mouse position for the given file.
 * @param {MouseEvent} event
 * @param {string} file
 */
function showMenu(event, file) {
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuTarget.value = file;
  menuVisible.value = true;
}

/**
 * Handle context menu action selection.
 * @param {string} action
 */
function onMenuAction(action) {
  if (action === 'rename') {
    const editRef = editRefs[menuTarget.value];
    if (editRef && editRef.startEdit) {
      editRef.startEdit();
    }
  } else if (action === 'delete') {
    onDelete(menuTarget.value);
  }
}

/**
 * Delete an audio asset after confirmation.
 * @param {string} filename
 */
async function onDelete(filename) {
  if (confirm(`确定要删除 "${filename}" 吗？`)) {
    await assets.deleteAsset('audio', filename);
  }
}

/**
 * Rename an audio asset file.
 * @param {string} oldName
 * @param {string} newName
 */
async function onRename(oldName, newName) {
  if (oldName !== newName) {
    const result = await assets.renameAsset('audio', oldName, newName);
    if (!result.success) {
      alert(result.error);
    }
  }
}
</script>

<template>
  <div class="audio-list-container">
    <!-- Empty state when no audio files -->
    <div v-if="audioFiles.length === 0" class="empty-state">
      <div class="empty-icon">🎵</div>
      <p class="empty-title">当前分类下暂无音频文件</p>
      <p class="empty-subtitle">拖放文件到此处，或点击上方"导入文件"按钮</p>
    </div>

    <!-- Audio file list -->
    <div v-else class="audio-list">
      <div
        class="audio-row"
        v-for="file in audioFiles"
        :key="file"
        @contextmenu.prevent="showMenu($event, file)"
      >
        <span class="audio-icon">🎵</span>
        <div class="audio-filename">
          <InlineEdit
            :ref="el => setEditRef(file, el)"
            :value="file"
            :preserveExtension="true"
            @save="onRename(file, $event)"
          />
        </div>
        <MiniPlayer
          :src="`asset://audio/${file}`"
          :active="activePlayer === file"
          @play="onPlay(file)"
          @stop="onStop"
        />
      </div>
    </div>

    <ContextMenu
      :visible="menuVisible"
      :x="menuX"
      :y="menuY"
      :items="menuItems"
      @select="onMenuAction"
      @close="menuVisible = false"
    />
  </div>
</template>

<style scoped>
.audio-list-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.audio-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
}
.audio-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #252526;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #333;
  transition: border-color 200ms ease;
}
.audio-row:hover {
  border-color: #444;
}
.audio-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.audio-filename {
  flex: 0 0 auto;
  max-width: 200px;
  font-size: 14px;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* ─── Empty State ──────────────────────────────────────────────────── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.empty-icon {
  font-size: 48px;
}
.empty-title {
  font-size: 14px;
  color: #888;
  margin: 0;
}
.empty-subtitle {
  font-size: 12px;
  color: #555;
  margin: 0;
}
</style>
