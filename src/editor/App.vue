<template>
  <!-- Welcome Screen -->
  <WelcomeScreen
    v-if="currentView === 'welcome'"
    @create-project="showCreateDialog"
    @open-recent="openProject"
    @open-folder="openProject"
  />

  <!-- Editor -->
  <div v-else class="editor-layout">
    <header class="editor-header">
      <div class="header-left">
        <button class="icon-btn home-btn" title="返回首页" @click="goHome">🏠</button>
        <span class="project-name">
          {{ project.projectName }}
          <span v-if="project.isDirty" class="dirty-dot">●</span>
        </span>
        <span class="project-path">{{ project.projectPath }}</span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" title="撤销 (Ctrl+Z)" :disabled="!canUndo" @click="script.undo(); project.markDirty()">↩</button>
        <button class="icon-btn" title="重做 (Ctrl+Y)" :disabled="!canRedo" @click="script.redo(); project.markDirty()">↪</button>
        <button class="icon-btn save-btn" title="保存 (Ctrl+S)" :disabled="!project.isDirty" @click="manualSave">💾</button>
        <button class="preview-btn" @click="openPreview" title="在新窗口中预览游戏">▶ 预览</button>
      </div>
    </header>

    <ExternalScriptDiffPanel
      v-if="project.externalScriptChange"
      :diff="project.externalScriptDiff"
      @refresh="project.loadExternalScriptDiff(script.data)"
      @reload="reloadCurrentProject"
      @dismiss="project.clearExternalScriptChange()"
    />

    <TabBar v-model="activeTab" :tabs="tabs" />

    <main class="workspace">
      <keep-alive>
        <component :is="tabComponents[activeTab]" />
      </keep-alive>
    </main>
  </div>

  <!-- Create Project Dialog -->
  <CreateProjectWizard
    v-if="showWizard"
    @cancel="showWizard = false"
    @created="onProjectCreated"
  />
  <CreateProjectQuick
    v-if="showQuickCreate"
    @cancel="showQuickCreate = false"
    @created="onProjectCreated"
  />
</template>

<script setup>
import { ref, computed, defineAsyncComponent, onMounted, onBeforeUnmount, watch, markRaw } from 'vue';
import { useScriptStore } from './stores/script.js';
import { useProjectStore } from './stores/project.js';
import { useAssetStore } from './stores/assets.js';

import WelcomeScreen from './views/WelcomeScreen.vue';
import TabBar from './components/TabBar.vue';
import ExternalScriptDiffPanel from './components/ExternalScriptDiffPanel.vue';

function lazyComponent(loader) {
  return defineAsyncComponent(() => loader().then(module => module.default));
}

const CreateProjectWizard = lazyComponent(() => import('./views/CreateProjectWizard.vue'));
const CreateProjectQuick = lazyComponent(() => import('./views/CreateProjectQuick.vue'));

const script = useScriptStore();
const project = useProjectStore();
const assets = useAssetStore();

// --- State Machine ---
const currentView = ref('welcome'); // 'welcome' | 'editing'
const activeTab = ref('scenes');
const showWizard = ref(false);
const showQuickCreate = ref(false);

const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'story-systems', icon: '📊', label: '剧情系统' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-page', icon: '⚙️', label: '设置页' },
  { id: 'game-menu', icon: '🎮', label: '游戏菜单' },
  { id: 'save-load', icon: '📋', label: '存读档' },
  { id: 'backlog', icon: '📖', label: '回想' },
  { id: 'resource-library', icon: '📦', label: '资源库' },
  { id: 'project-settings', icon: '⚡', label: '项目设置' },
];

function asyncWorkspace(loader) {
  return markRaw(lazyComponent(loader));
}

const tabComponents = {
  'scenes': asyncWorkspace(() => import('./views/PageEditor.vue')),
  'story-systems': asyncWorkspace(() => import('./views/StorySystems.vue')),
  'title': asyncWorkspace(() => import('./views/TitleDesigner.vue')),
  'settings-page': asyncWorkspace(() => import('./views/SettingsPageEditor.vue')),
  'game-menu': asyncWorkspace(() => import('./views/GameMenuEditor.vue')),
  'save-load': asyncWorkspace(() => import('./views/SaveLoadEditor.vue')),
  'backlog': asyncWorkspace(() => import('./views/BacklogEditor.vue')),
  'resource-library': asyncWorkspace(() => import('./views/ResourceLibrary.vue')),
  'project-settings': asyncWorkspace(() => import('./views/ProjectSettings.vue')),
};

// --- Undo/Redo ---
const canUndo = computed(() => script.historyIndex > 0);
const canRedo = computed(() => script.historyIndex < script.history.length - 1);

// --- Auto-save (2s debounce) ---
let saveTimer = null;
let snapshotTimer = null;
let externalChangeTimer = null;
let removeOpenProjectListener = null;

watch(() => script.data, () => {
  if (!script.data || script._skipWatch) return;
  project.markDirty();
  // Auto-snapshot for undo history
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => script.pushState(), 500);
  // Auto-save to disk
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (script.data && project.projectPath) {
      void attemptSave({ silent: true, source: 'autosave' });
    }
  }, 2000);
}, { deep: true });

watch(() => script.storySystemsRepairRequest?.nonce, (nonce) => {
  if (!nonce || currentView.value !== 'editing') {
    return;
  }

  activeTab.value = 'story-systems';
});

watch(() => project.sceneNavigationRequest?.nonce, (nonce) => {
  if (!nonce || currentView.value !== 'editing') {
    return;
  }

  activeTab.value = 'scenes';
});

watch(() => project.agentPathNavigationRequest?.nonce, (nonce) => {
  const request = project.agentPathNavigationRequest;
  if (!nonce || currentView.value !== 'editing' || !request?.tab) {
    return;
  }

  activeTab.value = request.tab;
});

// --- Keyboard Shortcuts ---
function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    if (canUndo.value) { script.undo(); project.markDirty(); }
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    if (canRedo.value) { script.redo(); project.markDirty(); }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (project.projectPath && script.data) {
      void attemptSave({ source: 'shortcut' });
    }
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeyDown);
  await project.loadRecentProjects();
  if (window.ipcRenderer) {
    removeOpenProjectListener = window.ipcRenderer.on('open-project-path', (_event, projectPath) => {
      void openProjectFromExternal(projectPath);
    });
  }
  // Expose for Electron close handler
  window.__hasDirtyProject = () => project.isDirty && !!script.data;
  window.__saveCurrentProject = () => script.data
    ? attemptSave({ source: 'electron-close' })
    : Promise.resolve(false);
  externalChangeTimer = setInterval(() => {
    if (currentView.value === 'editing' && project.projectPath) {
      void project.checkExternalScriptChange(script.data);
    }
  }, 3000);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown);
  removeOpenProjectListener?.();
  removeOpenProjectListener = null;
  if (saveTimer) clearTimeout(saveTimer);
  if (snapshotTimer) clearTimeout(snapshotTimer);
  if (externalChangeTimer) clearInterval(externalChangeTimer);
});

// --- Actions ---
function showCreateDialog() {
  if (project.hasCreatedProject) {
    showQuickCreate.value = true;
  } else {
    showWizard.value = true;
  }
}

async function openProject(projectPath) {
  const result = await project.loadProject(projectPath);
  if (result && result.success) {
    script.loadFromData(result.script);
    await project.loadPlayerProfile(script.data?.projectId);

    // Load asset file lists for all categories
    try {
      await assets.loadAll();
    } catch (e) {
      console.error('[Editor] Failed to load assets:', e);
    }

    // Load custom fonts into editor window (D-04: all fonts on project open)
    const fontResult = await assets.loadProjectFonts(script.data);
    if (fontResult.failed.length > 0) {
      for (const f of fontResult.failed) {
        console.error(`[FontLoader] ${f.file} 加载失败:`, f.error);
        const shouldDelete = confirm(`字体 ${f.file} 加载失败。\n\n是否删除此损坏的字体文件？`);
        if (shouldDelete) {
          const filename = f.file.split('/').pop();
          await assets.deleteAsset('fonts', filename);
          // Also remove from script metadata
          if (script.data?.assets?.fonts) {
            script.data.assets.fonts = script.data.assets.fonts.filter(fm => fm.file !== f.file);
            script.pushState();
          }
          assets.syncFontMeta(script.data);
        }
      }
    }

    currentView.value = 'editing';
    activeTab.value = 'scenes';
  } else if (result && result.error) {
    alert(result.error);
  }
}

async function openProjectFromExternal(projectPath) {
  if (!projectPath || typeof projectPath !== 'string') {
    return;
  }

  if (project.isDirty && script.data) {
    const action = await window.ipcRenderer.invoke('show-save-dialog');
    if (action === 'cancel') return;
    if (action === 'save') {
      const saved = await attemptSave({ source: 'external-open-project' });
      if (!saved) return;
    }
  }

  if (saveTimer) clearTimeout(saveTimer);
  if (snapshotTimer) clearTimeout(snapshotTimer);
  await openProject(projectPath);
}

async function onProjectCreated(projectPath) {
  showWizard.value = false;
  showQuickCreate.value = false;
  await openProject(projectPath);
}

async function goHome() {
  if (project.isDirty && script.data) {
    const action = await window.ipcRenderer.invoke('show-save-dialog');
    if (action === 'cancel') return;
    if (action === 'save') {
      const saved = await attemptSave({ source: 'go-home' });
      if (!saved) return;
    }
  }
  if (saveTimer) clearTimeout(saveTimer);
  if (snapshotTimer) clearTimeout(snapshotTimer);
  script.reset();
  project.closeProject();
  currentView.value = 'welcome';
  await project.loadRecentProjects();
}

async function reloadCurrentProject() {
  if (!project.projectPath) return;
  const currentPath = project.projectPath;
  if (saveTimer) clearTimeout(saveTimer);
  if (snapshotTimer) clearTimeout(snapshotTimer);
  await openProject(currentPath);
}

function openPreview() {
  if (window.ipcRenderer) {
    window.ipcRenderer.invoke('open-preview', project.projectPath);
  }
}

async function attemptSave({ silent = false, source = 'manual' } = {}) {
  if (!project.projectPath || !script.data) {
    return false;
  }

  if (!script.canSaveConditionPages) {
    script.requestStorySystemsRepair({
      source,
      issueId: script.conditionPageIssues[0]?.sceneId || 'condition-save-gate',
      variableId: script.conditionPageIssues[0]?.variableId || script.selectedVariableId,
    });
    activeTab.value = 'story-systems';

    if (!silent) {
      alert('无法保存剧情系统设置，请检查变量 ID 是否重复、引用对象是否仍存在，然后重试。');
    }

    return false;
  }

  const saved = await project.saveProject(script.data);
  if (!saved && project.externalScriptChange && !silent) {
    alert('检测到 script.json 已被外部工具修改。请先重新载入项目，确认外部 Agent 的更改后再继续保存。');
  }
  return saved;
}

function manualSave() {
  if (project.projectPath && script.data) {
    void attemptSave();
  }
}
</script>

<style scoped>
.editor-layout { display: flex; flex-direction: column; height: 100vh; }

.editor-header {
  height: 40px; background: #2d2d2d; border-bottom: 1px solid #111;
  display: flex; align-items: center; padding: 0 12px; justify-content: space-between; flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 8px; overflow: hidden; }
.home-btn { font-size: 14px; }
.project-name { color: #e0e0e0; font-size: 13px; font-weight: 500; white-space: nowrap; }
.dirty-dot { color: #fbbf24; font-size: 10px; }
.project-path { color: #555; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }

.header-actions { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
.icon-btn {
  background: transparent; border: 1px solid transparent; color: #ccc;
  width: 30px; height: 28px; border-radius: 4px; cursor: pointer;
  font-size: 16px; display: flex; align-items: center; justify-content: center;
}
.icon-btn:hover:not(:disabled) { background: #3c3c3c; border-color: #555; }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.preview-btn {
  background: #0e633c; color: #fff; border: none; padding: 4px 14px;
  border-radius: 4px; font-size: 12px; cursor: pointer; margin-left: 8px;
}
.preview-btn:hover { background: #117748; }

.workspace { flex: 1; background: #1e1e1e; position: relative; overflow-y: auto; }

</style>
