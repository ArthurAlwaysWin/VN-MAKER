<template>
  <div class="scene-tree" @click="closeMenu">
    <div class="tree-content">
      <div v-if="sceneEntries.length === 0" class="empty-state">
        暂无场景，点击下方按钮创建第一个场景
      </div>

      <div v-for="[sceneId, scene] in sceneEntries" :key="sceneId" class="scene-node">
        <div class="scene-header"
          :class="{
            'scene-active': selectedSceneId === sceneId,
            'agent-changed': hasAgentSceneChange(sceneId)
          }"
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
          <span v-if="hasAgentSceneChange(sceneId)" class="agent-badge" title="外部 Agent 修改了这个场景">Agent</span>
          <span
            v-if="agentIncomingReferenceCount(sceneId)"
            class="agent-badge reference"
            :title="agentIncomingReferenceTitle(sceneId)"
          >引用 {{ agentIncomingReferenceCount(sceneId) }}</span>
          <span
            v-if="agentReviewCount(sceneId)"
            class="agent-badge review"
            :title="agentReviewTitle(sceneId)"
          >审阅 {{ agentReviewCount(sceneId) }}</span>
          <span v-if="scene.next" class="scene-jump-badge" :title="'跳转到: ' + getSceneName(scene.next)">🔗</span>
          <button class="scene-voice-btn" @click.stop="onBatchMatchScene(sceneId)" title="批量语音匹配">🔊</button>
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
            <span v-if="hasAgentPageChange(sceneId, idx)" class="agent-page-dot" title="外部 Agent 修改了这个页面"></span>
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
      <button class="footer-btn" @click.stop="onAddPage" :disabled="!selectedSceneId" title="在当前场景末尾添加新页面">+ 添加页面</button>
      <button class="footer-btn" @click.stop="onAddScene" title="创建新场景">+ 添加场景</button>
      <button class="footer-btn" @click.stop="onBatchMatchAll" title="根据文件名自动匹配全部语音">🔊 批量语音匹配</button>
      <HelpTip :text="HELP_SCRIPT.voiceMatch" />
    </div>

    <div v-if="contextMenu.visible" class="context-menu" :style="contextMenuStyle" @click.stop>
      <template v-if="contextMenu.type === 'scene'">
        <div class="menu-item" @click="onRenameScene">重命名</div>
        <div class="menu-item" @click="onAddPageToScene">添加页面</div>
        <div class="menu-divider"></div>
        <div class="menu-label">🔗 场景跳转</div>
        <div v-for="[sId, s] in otherScenesForMenu" :key="sId"
          class="menu-item" :class="{ selected: contextSceneNext === sId }"
          @click="onMenuSetSceneNext(sId)">
          {{ contextSceneNext === sId ? '✓ ' : '' }}{{ s.name }}
        </div>
        <div v-if="otherScenesForMenu.length === 0" class="menu-item disabled">无其他场景</div>
        <div v-if="contextSceneNext" class="menu-item" @click="onMenuClearSceneNext">✕ 清除跳转</div>
        <div class="menu-divider"></div>
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

    <VoiceMatchPreview
      :visible="showMatchPreview"
      :result="matchResult"
      @close="showMatchPreview = false"
      @apply="onMatchApply"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';
import { useProjectStore } from '../../stores/project.js';
import { useVoiceMatch } from '../../composables/useVoiceMatch.js';
import { useAssetStore } from '../../stores/assets.js';
import { summarizeHandoffByScene } from '../../utils/agentHandoff.js';
import VoiceMatchPreview from './VoiceMatchPreview.vue';
import HelpTip from '../HelpTip.vue';
import { HELP_SCRIPT } from '../../helpTexts.js';

const editor = usePageEditor();
const { selectedSceneId, selectedPageIndex, selectPage } = editor;
const script = useScriptStore();
const project = useProjectStore();

const assetStore = useAssetStore();
const { buildMatches, applyMatches } = useVoiceMatch();
const showMatchPreview = ref(false);
const matchResult = ref({ matches: [], alreadyBound: 0, newBindings: 0 });
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

watch(selectedSceneId, (sceneId) => {
  if (sceneId) {
    expanded[sceneId] = true;
  }
});

const sceneEntries = computed(() => Object.entries(script.data?.scenes || {}));
const agentSceneSummaries = computed(() => summarizeHandoffByScene(project.agentHandoff));

const contextMenuStyle = computed(() => ({
  left: contextMenu.x + 'px',
  top: contextMenu.y + 'px',
}));

const contextMenuPageIsChoice = computed(() => {
  const scene = script.data?.scenes?.[contextMenu.sceneId];
  return scene?.pages?.[contextMenu.pageIndex]?.type === 'choice';
});

const otherScenesForMenu = computed(() => {
  const id = contextMenu.sceneId;
  return Object.entries(script.data?.scenes || {}).filter(([sId]) => sId !== id);
});

const contextSceneNext = computed(() => {
  return script.data?.scenes?.[contextMenu.sceneId]?.next || '';
});

function getSceneName(sceneId) {
  return script.data?.scenes?.[sceneId]?.name || sceneId;
}

function getAgentSceneSummary(sceneId) {
  return agentSceneSummaries.value[sceneId] ?? null;
}

function hasAgentSceneChange(sceneId) {
  return (getAgentSceneSummary(sceneId)?.changedPaths.length ?? 0) > 0;
}

function hasAgentPageChange(sceneId, pageIndex) {
  return getAgentSceneSummary(sceneId)?.changedPages.includes(pageIndex) ?? false;
}

function agentIncomingReferenceCount(sceneId) {
  return getAgentSceneSummary(sceneId)?.incomingReferenceCount ?? 0;
}

function agentReviewCount(sceneId) {
  return getAgentSceneSummary(sceneId)?.reviewItems.length ?? 0;
}

function agentIncomingReferenceTitle(sceneId) {
  const count = agentIncomingReferenceCount(sceneId);
  return `外部 Agent 交接提示：这个场景有 ${count} 个入站引用`;
}

function agentReviewTitle(sceneId) {
  const items = getAgentSceneSummary(sceneId)?.reviewItems ?? [];
  return items.map((item) => item.code || item.message).slice(0, 3).join('\n');
}

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

function onMenuSetSceneNext(targetSceneId) {
  const sceneId = contextMenu.sceneId;
  closeMenu();
  script.setSceneNext(sceneId, targetSceneId);
}

function onMenuClearSceneNext() {
  const sceneId = contextMenu.sceneId;
  closeMenu();
  script.setSceneNext(sceneId, '');
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

// ─── Batch voice matching ──────────────────────────────
async function onBatchMatchScene(sceneId) {
  await assetStore.loadCategory('audio');
  matchResult.value = buildMatches(sceneId);
  if (matchResult.value.matches.length > 0) {
    showMatchPreview.value = true;
  } else {
    alert('未找到匹配的语音文件');
  }
}

async function onBatchMatchAll() {
  await assetStore.loadCategory('audio');
  matchResult.value = buildMatches('all');
  if (matchResult.value.matches.length > 0) {
    showMatchPreview.value = true;
  } else {
    alert('未找到匹配的语音文件');
  }
}

function onMatchApply(overwrite) {
  const applied = applyMatches(matchResult.value.matches, overwrite);
  showMatchPreview.value = false;
  alert(`已绑定 ${applied} 条语音`);
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

.scene-header.agent-changed {
  box-shadow: inset 3px 0 0 #c9a227;
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

.scene-jump-badge {
  font-size: 12px;
  margin-left: 4px;
  flex-shrink: 0;
}

.agent-badge {
  border: 1px solid #6b5a22;
  border-radius: 4px;
  color: #f0c674;
  background: rgba(201, 162, 39, 0.12);
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
  margin-left: 4px;
  flex-shrink: 0;
}

.agent-badge.reference {
  border-color: #3a6a7e;
  color: #83c6e6;
  background: rgba(65, 139, 168, 0.12);
}

.agent-badge.review {
  border-color: #7a5a28;
  color: #ffc06a;
  background: rgba(170, 112, 35, 0.12);
}

.agent-page-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f0c674;
  margin-right: 6px;
  flex-shrink: 0;
}

.menu-divider {
  height: 1px;
  background: #444;
  margin: 4px 0;
}

.menu-label {
  padding: 4px 16px;
  font-size: 11px;
  color: #888;
  font-weight: 600;
}

.menu-item.selected {
  color: #007acc;
}

.menu-item.disabled {
  color: #555;
  cursor: default;
}

.menu-item.disabled:hover {
  background: transparent;
}

.scene-voice-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.15s;
}

.scene-header:hover .scene-voice-btn {
  opacity: 1;
}

.scene-voice-btn:hover {
  color: #007acc;
  background: rgba(0, 122, 204, 0.15);
}
</style>
