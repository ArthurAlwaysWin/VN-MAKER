<template>
  <div class="scene-tree" @click="closeMenu">
    <div class="tree-content">
      <div v-if="sceneEntries.length === 0" class="empty-state">
        暂无场景，点击下方按钮创建第一个场景
      </div>

      <div v-for="[sceneId, scene] in sceneEntries" :key="sceneId" class="scene-node">
        <div class="scene-header"
          @click.stop="toggleExpand(sceneId)"
          @dblclick.stop="startRenameScene(sceneId, scene.name)">
          <span class="expand-icon">{{ expanded[sceneId] ? '▼' : '▶' }}</span>
          <span class="scene-icon">🎬</span>
          <span class="scene-name">{{ scene.name }}</span>
          <button class="scene-menu-btn" @click.stop="showSceneMenu(sceneId, $event)" title="场景操作">⋯</button>
        </div>

        <div v-if="expanded[sceneId]" class="scene-pages">
          <div v-if="!scene.pages || scene.pages.length === 0" class="empty-pages">
            暂无页面
          </div>

          <div v-for="(page, idx) in scene.pages" :key="page.id"
            class="page-item"
            :class="{
              active: isSelected(sceneId, idx),
              'drag-over': dragTarget.sceneId === sceneId && dragTarget.index === idx
            }"
            draggable="true"
            @click.stop="onSelectPage(sceneId, idx)"
            @dragstart="onDragStart($event, sceneId, idx)"
            @dragover="onDragOver($event, sceneId, idx)"
            @dragleave="onDragLeave"
            @drop="onDrop($event, sceneId, idx)"
            @dragend="onDragEnd">
            <span class="page-icon">{{ pageIcon(page.type) }}</span>
            <span class="page-number">{{ idx + 1 }}</span>
            <span class="page-snippet">{{ pageSnippet(page) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tree-footer">
      <button class="footer-btn" @click.stop="onAddPage" :disabled="!selectedSceneId">+ 添加页面</button>
      <button class="footer-btn" @click.stop="onAddScene">+ 添加场景</button>
    </div>

    <div v-if="contextMenu.visible" class="context-menu" :style="contextMenuStyle" @click.stop>
      <div class="menu-item" @click="onRenameScene">重命名</div>
      <div class="menu-item" @click="onAddPageToScene">添加页面</div>
      <div class="menu-item danger" @click="onDeleteScene">删除场景</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';

const editor = usePageEditor();
const { selectedSceneId, selectedPageIndex, selectPage } = editor;
const script = useScriptStore();

const expanded = reactive({});
const dragState = ref({ sceneId: null, fromIndex: -1 });
const dragTarget = reactive({ sceneId: null, index: -1 });
const contextMenu = reactive({ visible: false, sceneId: null, x: 0, y: 0 });

const sceneEntries = computed(() => Object.entries(script.data?.scenes || {}));

const contextMenuStyle = computed(() => ({
  left: contextMenu.x + 'px',
  top: contextMenu.y + 'px',
}));

onMounted(() => {
  // Auto-expand first scene
  const entries = sceneEntries.value;
  if (entries.length > 0) {
    expanded[entries[0][0]] = true;
  }
  document.addEventListener('click', closeMenu);
  document.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenu);
  document.removeEventListener('keydown', onKeyDown);
});

function pageIcon(type) {
  if (type === 'choice') return '🔀';
  if (type === 'condition') return '❓';
  return '📑';
}

function pageSnippet(page) {
  if (page.type === 'choice') return '[选择页]';
  if (page.type === 'condition') return '[条件页]';
  const dlg = page.dialogues?.[0];
  if (!dlg?.text) return '';
  return dlg.text.length > 20 ? dlg.text.slice(0, 20) + '…' : dlg.text;
}

function isSelected(sceneId, idx) {
  return selectedSceneId.value === sceneId && selectedPageIndex.value === idx;
}

function toggleExpand(sceneId) {
  expanded[sceneId] = !expanded[sceneId];
}

function onSelectPage(sceneId, idx) {
  expanded[sceneId] = true;
  selectPage(sceneId, idx);
}

// --- Scene management ---

function onAddScene() {
  const name = prompt('输入新的场景名称');
  if (!name || !name.trim()) return;
  const sceneId = 'scene_' + Date.now();
  script.addScene(sceneId, name.trim());
  expanded[sceneId] = true;
  selectPage(sceneId, 0);
}

function startRenameScene(sceneId, currentName) {
  const newName = prompt('输入新的场景名称', currentName);
  if (!newName || !newName.trim() || newName.trim() === currentName) return;
  script.renameScene(sceneId, newName.trim());
}

function showSceneMenu(sceneId, event) {
  contextMenu.sceneId = sceneId;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.visible = true;
}

function closeMenu() {
  contextMenu.visible = false;
}

function onRenameScene() {
  const sceneId = contextMenu.sceneId;
  const scene = script.data?.scenes?.[sceneId];
  closeMenu();
  if (!scene) return;
  startRenameScene(sceneId, scene.name);
}

function onDeleteScene() {
  const sceneId = contextMenu.sceneId;
  const scene = script.data?.scenes?.[sceneId];
  closeMenu();
  if (!scene) return;
  if (!confirm('确定删除场景「' + scene.name + '」及其所有页面？')) return;
  script.deleteScene(sceneId);
  // Select first remaining scene
  if (selectedSceneId.value === sceneId) {
    const entries = sceneEntries.value;
    if (entries.length > 0) {
      selectPage(entries[0][0], 0);
      expanded[entries[0][0]] = true;
    } else {
      selectedSceneId.value = null;
      selectedPageIndex.value = 0;
    }
  }
}

// --- Page management ---

function onAddPage() {
  if (!selectedSceneId.value) return;
  const result = script.addPage(selectedSceneId.value, selectedPageIndex.value);
  if (result) selectPage(selectedSceneId.value, result.index);
}

function onAddPageToScene() {
  const sceneId = contextMenu.sceneId;
  closeMenu();
  const result = script.addPage(sceneId, -1);
  if (result) {
    expanded[sceneId] = true;
    selectPage(sceneId, result.index);
  }
}

function onDeletePage() {
  if (!selectedSceneId.value) return;
  const scene = script.data?.scenes?.[selectedSceneId.value];
  if (!scene || scene.pages.length === 0) return;
  if (!confirm('确定删除第 ' + (selectedPageIndex.value + 1) + ' 页？')) return;
  const sceneId = selectedSceneId.value;
  const idx = selectedPageIndex.value;
  script.deletePage(sceneId, idx);
  // Adjust selection
  const remaining = scene.pages.length;
  if (remaining === 0) {
    selectedPageIndex.value = -1;
  } else if (idx >= remaining) {
    selectPage(sceneId, remaining - 1);
  }
}

function onKeyDown(e) {
  if (e.key === 'Delete' && selectedSceneId.value && selectedPageIndex.value >= 0) {
    // Don't delete if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    onDeletePage();
  }
}

// --- Drag reorder ---

function onDragStart(e, sceneId, idx) {
  dragState.value = { sceneId, fromIndex: idx };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(idx));
  e.target.style.opacity = '0.5';
}

function onDragOver(e, sceneId, idx) {
  if (dragState.value.sceneId !== sceneId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  dragTarget.sceneId = sceneId;
  dragTarget.index = idx;
}

function onDragLeave() {
  dragTarget.sceneId = null;
  dragTarget.index = -1;
}

function onDrop(e, sceneId, toIndex) {
  e.preventDefault();
  const { fromIndex } = dragState.value;
  if (dragState.value.sceneId !== sceneId || fromIndex === toIndex) {
    onDragEnd();
    return;
  }
  const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex;
  script.reorderPages(sceneId, fromIndex, adjustedTo);
  selectPage(sceneId, adjustedTo);
  onDragEnd();
}

function onDragEnd() {
  dragState.value = { sceneId: null, fromIndex: -1 };
  dragTarget.sceneId = null;
  dragTarget.index = -1;
  // Reset opacity on all page items
  document.querySelectorAll('.page-item').forEach(el => { el.style.opacity = ''; });
}
</script>

<style scoped>
.scene-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.scene-header {
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  cursor: pointer;
  color: #ccc;
  font-size: 14px;
  font-weight: 600;
  user-select: none;
}

.scene-header:hover {
  background: #2a2d2e;
}

.expand-icon {
  width: 16px;
  font-size: 10px;
  text-align: center;
  flex-shrink: 0;
}

.scene-icon {
  margin: 0 4px;
}

.scene-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-menu-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 3px;
  visibility: hidden;
}

.scene-header:hover .scene-menu-btn {
  visibility: visible;
}

.scene-menu-btn:hover {
  background: #3c3c3c;
  color: #ccc;
}

.page-item {
  height: 30px;
  display: flex;
  align-items: center;
  padding: 0 12px 0 28px;
  cursor: pointer;
  color: #ccc;
  font-size: 14px;
  border-left: 3px solid transparent;
  user-select: none;
}

.page-item:hover {
  background: #2a2d2e;
}

.page-item.active {
  background: #37373d;
  border-left-color: #007acc;
}

.page-item.drag-over {
  border-top: 2px solid #007acc;
}

.page-icon {
  margin-right: 4px;
  font-size: 12px;
}

.page-number {
  margin-right: 6px;
  color: #aaa;
  font-size: 11px;
  min-width: 14px;
}

.page-snippet {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #aaa;
  font-size: 12px;
}

.tree-footer {
  border-top: 1px solid #333;
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.footer-btn {
  background: transparent;
  border: none;
  color: #007acc;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 0;
}

.footer-btn:hover {
  text-decoration: underline;
}

.footer-btn:disabled {
  color: #555;
  cursor: default;
  text-decoration: none;
}

.context-menu {
  position: fixed;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 0;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  min-width: 120px;
}

.menu-item {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #ccc;
}

.menu-item:hover {
  background: #094771;
}

.menu-item.danger {
  color: #f48771;
}

.menu-item.danger:hover {
  background: #5a1d1d;
}

.empty-state,
.empty-pages {
  padding: 20px 16px;
  color: #555;
  font-size: 13px;
  text-align: center;
}
</style>
