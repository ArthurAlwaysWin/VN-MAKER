<script setup>
/**
 * FontGrid — Font preview cards with sample text rendered in each font.
 * Includes context menu (rename/delete) with font metadata cleanup.
 * @module components/resource-library/FontGrid
 */
import { ref, computed } from 'vue';
import { useAssetStore } from '../../stores/assets.js';
import { useScriptStore } from '../../stores/script.js';
import InlineEdit from './InlineEdit.vue';
import ContextMenu from './ContextMenu.vue';

const assets = useAssetStore();
const script = useScriptStore();

// ─── Computed ───────────────────────────────────────────────────────
const fontFiles = computed(() => assets.files.fonts || []);

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

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Get the CSS font-family for a font file by looking up fontMeta.
 * @param {string} filename - Font filename (e.g. 'MyFont.ttf')
 * @returns {string} CSS font-family value
 */
function getFontFamily(filename) {
  const meta = assets.fontMeta.find(m => m.file === `fonts/${filename}`);
  return meta ? meta.family : 'sans-serif';
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
 * Delete a font file after confirmation, cleaning up metadata.
 * @param {string} filename
 */
async function onDelete(filename) {
  if (confirm(`确定要删除 "${filename}" 吗？`)) {
    const result = await assets.deleteAsset('fonts', filename);
    if (result.success) {
      // Clean up font metadata from script data (Pitfall #5)
      if (script.data?.assets?.fonts) {
        script.data.assets.fonts = script.data.assets.fonts.filter(
          m => m.file !== `fonts/${filename}`
        );
        script.pushState();
      }
      assets.syncFontMeta(script.data);
    }
  }
}

/**
 * Rename a font file, updating metadata accordingly.
 * @param {string} oldName
 * @param {string} newName
 */
async function onRename(oldName, newName) {
  if (oldName !== newName) {
    const result = await assets.renameAsset('fonts', oldName, newName);
    if (result.success) {
      // Update font metadata path in script data
      if (script.data?.assets?.fonts) {
        const meta = script.data.assets.fonts.find(m => m.file === `fonts/${oldName}`);
        if (meta) {
          meta.file = `fonts/${newName}`;
          script.pushState();
        }
      }
      assets.syncFontMeta(script.data);
    } else {
      alert(result.error);
    }
  }
}
</script>

<template>
  <!-- Empty state when no font files -->
  <div v-if="fontFiles.length === 0" class="empty-state">
    <div class="empty-icon">🔤</div>
    <p class="empty-title">当前分类下暂无字体文件</p>
    <p class="empty-subtitle">拖放文件到此处，或点击上方"导入文件"按钮</p>
  </div>

  <!-- Font preview grid -->
  <div v-else class="font-grid">
    <div
      class="font-card"
      v-for="file in fontFiles"
      :key="file"
      @contextmenu.prevent="showMenu($event, file)"
    >
      <div class="font-preview" :style="{ fontFamily: getFontFamily(file) }">
        你好世界 AaBbCc 1234
      </div>
      <div class="font-filename">
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
.font-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  overflow-y: auto;
  align-content: start;
  flex: 1;
}
.font-card {
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 200ms ease;
}
.font-card:hover {
  border-color: #007acc;
}
.font-preview {
  padding: 20px 16px;
  font-size: 20px;
  color: #e0e0e0;
  line-height: 1.4;
}
.font-filename {
  padding: 8px 16px;
  font-size: 12px;
  color: #888;
  border-top: 1px solid #333;
  background: #1e1e1e;
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
</style>
