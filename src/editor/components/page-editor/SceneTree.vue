<template>
  <div class="scene-tree" @click="closeMenu">
    <div class="tree-content">
      <div v-if="sceneEntries.length === 0" class="empty-state">
        暂无场景，点击下方按钮创建第一个场景
      </div>

      <div v-for="[sceneId, scene] in sceneEntries" :key="sceneId" class="scene-node">
        <div class="scene-header"
          :class="{ 'scene-active': selectedSceneId === sceneId }"
          @click.stop="onSelectScene(sceneId)"
          @dblclick.stop="startRenameScene(sceneId, scene.name)"
          @contextmenu.prevent.stop="showSceneMenu(sceneId, $event)">
          <span class="expand-icon">{{ expanded[sceneId] ? '▼' : '▶' }}</span>
          <span class="scene-icon">🎬</span>
          <input v-if="renamingSceneId === sceneId"
            ref="renameInputRef"
            class="rename-input"
            v-model="renameText"
            @keydown.enter.stop="confirmRename"
            @keydown.escape.stop="cancelRename"
            @blur="confirmRename"
            @click.stop />
          <span v-else class="scene-name">{{ scene.name }}</span>
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
            @dblclick.stop="startRenamePage(sceneId, idx, page)"
            @contextmenu.prevent.stop="showPageMenu(sceneId, idx, $event)"
            @dragstart="onDragStart($event, sceneId, idx)"
            @dragover="onDragOver($event, sceneId, idx)"
            @dragleave="onDragLeave"
            @drop="onDrop($event, sceneId, idx)"
            @dragend="onDragEnd">
            <span class="page-icon">{{ pageIcon(page.type) }}</span>
            <span class="page-number">{{ idx + 1 }}</span>
            <input v-if="renamingPageSceneId === sceneId && renamingPageIndex === idx"
              ref="renamePageInputRef"
              class="rename-input page-rename-input"
              v-model="renamePageText"
              placeholder="页面名称"
              @keydown.enter.stop="confirmPageRename"
              @keydown.escape.stop="cancelPageRename"
              @blur="confirmPageRename"
              @click.stop />
            <span v-else class="page-snippet">{{ page.name || pageSnippet(page) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tree-footer">
      <button class="footer-btn" @click.stop="onAddPage" :disabled="!selectedSceneId">+ 添加页面</button>
      <button class="footer-btn" @click.stop="onAddScene">+ 添加场景</button>
    </div>

    <div v-if="contextMenu.visible" class="context-menu" :style="contextMenuStyle" @click.stop>
      <template v-if="contextMenu.type === 'scene'">
        <div class="menu-item" @click="onRenameScene">重命名</div>
        <div class="menu-item" @click="onAddPageToScene">添加页面</div>
        <div class="menu-item danger" @click="onDeleteScene">删除场景</div>
      </template>
      <template v-else-if="contextMenu.type === 'page'">
        <div class="menu-item" @click="onRenamePageFromMenu">重命名</div>
        <div class="menu-item" @click="onTogglePageType">
          {{ contextMenuPageIsChoice ? '转换为普通页' : '转换为选择页' }}
        </div>
        <div class="menu-item danger" @click="onDeletePageFromMenu">删除页面</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';

const editor = usePageEditor();
const { selectedSceneId, selectedPageIndex, selectPage } = editor;
const script = useScriptStore();

const expanded = reactive({});
const dragState = ref({ sceneId: null, fromIndex: -1 });
const dragTarget = reactive({ sceneId: null, index: -1 });
const contextMenu = reactive({ visible: false, type: null, sceneId: null, pageIndex: -1, x: 0, y: 0 });

const renamingSceneId = ref(null);
const renameText = ref('');
const renameInputRef = ref(null);

const renamingPageSceneId = ref(null);
const renamingPageIndex = ref(-1);
const renamePageText = ref('');
const renamePageInputRef = ref(null);

watch(renamingSceneId, async (val) => {
  if (val) {
    await nextTick();
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  }
});

watch(renamingPageSceneId, async (val) => {
  if (val) {
    await nextTick();
    renamePageInputRef.value?.focus();
    renamePageInputRef.value?.select();
  }
});

const sceneEntries = computed(() => Object.entries(script.data?.scenes || {}));

const contextMenuStyle = computed(() => ({
  left: contextMenu.x + 'px',
  top: contextMenu.y + 'px',
}));

const contextMenuPageIsChoice = computed(() => {
  const scene = script.data?.scenes?.[contextMenu.sceneId];
  return scene?.pages?.[contextMenu.pageIndex]?.type === 'choice';
});

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

function onSelectScene(sceneId) {
  toggleExpand(sceneId);
  // Also select this scene (first page, or -1 if no pages)
  const scene = script.data?.scenes?.[sceneId];
  const pageIdx = scene?.pages?.length > 0 ? 0 : -1;
  selectPage(sceneId, pageIdx);
}

function onSelectPage(sceneId, idx) {
  expanded[sceneId] = true;
  selectPage(sceneId, idx);
}

// --- Scene management ---

function onAddScene() {
  const count = sceneEntries.value.length;
  const name = '场景 ' + (count + 1);
  const sceneId = 'scene_' + Date.now();
  script.addScene(sceneId, name);
  expanded[sceneId] = true;
  selectPage(sceneId, 0);
  // Enter inline rename so user can customize the name
  renamingSceneId.value = sceneId;
  renameText.value = name;
}

function startRenameScene(sceneId, currentName) {
  renamingSceneId.value = sceneId;
  renameText.value = currentName;
}

function confirmRename() {
  if (renamingSceneId.value && renameText.value.trim()) {
    script.renameScene(renamingSceneId.value, renameText.value.trim());
  }
  renamingSceneId.value = null;
  renameText.value = '';
}

function cancelRename() {
  renamingSceneId.value = null;
  renameText.value = '';
}

function showSceneMenu(sceneId, event) {
  contextMenu.type = 'scene';
  contextMenu.sceneId = sceneId;
  contextMenu.pageIndex = -1;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.visible = true;
}

function showPageMenu(sceneId, pageIndex, event) {
  contextMenu.type = 'page';
  contextMenu.sceneId = sceneId;
  contextMenu.pageIndex = pageIndex;
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

function onDeletePageFromMenu() {
  const sceneId = contextMenu.sceneId;
  const idx = contextMenu.pageIndex;
  closeMenu();
  const scene = script.data?.scenes?.[sceneId];
  if (!scene || idx < 0 || idx >= scene.pages.length) return;
  if (!confirm('确定删除第 ' + (idx + 1) + ' 页？')) return;
  script.deletePage(sceneId, idx);
  // Adjust selection if deleting the currently selected page
  if (selectedSceneId.value === sceneId) {
    const remaining = scene.pages.length;
    if (remaining === 0) {
      selectedPageIndex.value = -1;
    } else if (selectedPageIndex.value >= remaining) {
      selectPage(sceneId, remaining - 1);
    }
  }
}

function onRenamePageFromMenu() {
  const sceneId = contextMenu.sceneId;
  const idx = contextMenu.pageIndex;
  closeMenu();
  const scene = script.data?.scenes?.[sceneId];
  if (!scene || idx < 0 || idx >= scene.pages.length) return;
  startRenamePage(sceneId, idx, scene.pages[idx]);
}

function onTogglePageType() {
  const sceneId = contextMenu.sceneId;
  const idx = contextMenu.pageIndex;
  closeMenu();
  const scene = script.data?.scenes?.[sceneId];
  if (!scene || idx < 0 || idx >= scene.pages.length) return;
  const page = scene.pages[idx];
  if (page.type === 'choice') {
    if (!confirm('转换为普通页将丢弃选项数据，确定继续？')) return;
  }
  script.convertPageType(sceneId, idx);
}

function startRenamePage(sceneId, idx, page) {
  renamingPageSceneId.value = sceneId;
  renamingPageIndex.value = idx;
  renamePageText.value = page.name || '';
}

function confirmPageRename() {
  if (renamingPageSceneId.value) {
    const scene = script.data?.scenes?.[renamingPageSceneId.value];
    const page = scene?.pages?.[renamingPageIndex.value];
    if (page) {
      page.name = renamePageText.value.trim();
      script.pushState();
    }
  }
  renamingPageSceneId.value = null;
  renamingPageIndex.value = -1;
  renamePageText.value = '';
}

function cancelPageRename() {
  renamingPageSceneId.value = null;
  renamingPageIndex.value = -1;
  renamePageText.value = '';
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

.scene-header.scene-active {
  background: #37373d;
  border-left: 3px solid #007acc;
  padding-left: 5px;
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

.rename-input {
  flex: 1;
  background: #1e1e1e;
  border: 1px solid #007acc;
  color: #ccc;
  font-size: 14px;
  font-weight: 600;
  padding: 0 4px;
  height: 22px;
  outline: none;
  border-radius: 2px;
  min-width: 0;
}

.page-rename-input {
  font-size: 12px;
  font-weight: 400;
  height: 20px;
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
