<script setup>
/**
 * AssetGrid — Thumbnail grid for background/UI image assets.
 * Displays asset:// thumbnails with context menu (rename/delete) and inline edit.
 * @module components/resource-library/AssetGrid
 */
import { ref, computed } from 'vue';
import { useAssetStore } from '../../stores/assets.js';
import InlineEdit from './InlineEdit.vue';
import ContextMenu from './ContextMenu.vue';

const props = defineProps({
  category: { type: String, default: 'backgrounds' },
});

const assets = useAssetStore();

// ─── Computed ───────────────────────────────────────────────────────
const fileList = computed(() => assets.files[props.category] || []);

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
 * Delete an asset after confirmation.
 * @param {string} filename
 */
async function onDelete(filename) {
  if (confirm(`确定要删除 "${filename}" 吗？`)) {
    await assets.deleteAsset(props.category, filename);
  }
}

/**
 * Rename an asset file.
 * @param {string} oldName
 * @param {string} newName
 */
async function onRename(oldName, newName) {
  if (oldName !== newName) {
    const result = await assets.renameAsset(props.category, oldName, newName);
    if (!result.success) {
      alert(result.error);
    }
  }
}
</script>

<template>
  <!-- Empty state when no files -->
  <div v-if="fileList.length === 0" class="empty-state">
    <div class="empty-icon">📁</div>
    <p class="empty-title">当前分类下暂无背景图</p>
    <p class="empty-subtitle">拖放文件到此处，或点击上方"导入文件"按钮</p>
    <p class="empty-formats">支持格式：PNG、JPG、JPEG、WEBP</p>
  </div>

  <!-- Thumbnail grid -->
  <div v-else class="asset-grid">
    <div
      class="asset-card"
      v-for="file in fileList"
      :key="file"
      @contextmenu.prevent="showMenu($event, file)"
    >
      <div class="thumbnail">
        <img :src="`asset://${category}/${file}`" :alt="file" draggable="false" />
      </div>
      <div class="filename">
        <InlineEdit
          :ref="el => setEditRef(file, el)"
          :value="file"
          :preserveExtension="true"
          @save="onRename(file, $event)"
        />
      </div>
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
</template>

<style scoped>
.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  overflow-y: auto;
  align-content: start;
  flex: 1;
}
.asset-card {
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 200ms ease;
}
.asset-card:hover {
  border-color: #007acc;
}
.thumbnail {
  height: 100px;
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}
.thumbnail img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.filename {
  padding: 8px;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-top: 1px solid #333;
  color: #ccc;
}
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
.empty-formats {
  font-size: 11px;
  color: #444;
  margin: 0;
}
</style>
