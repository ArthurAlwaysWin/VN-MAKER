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
        <button class="preview-btn" @click="openPreview">▶ 预览</button>
      </div>
    </header>

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
import { ref, computed, onMounted, onBeforeUnmount, watch, markRaw } from 'vue';
import { useScriptStore } from './stores/script.js';
import { useProjectStore } from './stores/project.js';
import { useAssetStore } from './stores/assets.js';

import WelcomeScreen from './views/WelcomeScreen.vue';
import CreateProjectWizard from './views/CreateProjectWizard.vue';
import CreateProjectQuick from './views/CreateProjectQuick.vue';
import TabBar from './components/TabBar.vue';
import PageEditor from './views/PageEditor.vue';
import TitleDesigner from './views/TitleDesigner.vue';
import SettingsDesigner from './views/SettingsDesigner.vue';
import ResourceLibrary from './views/ResourceLibrary.vue';
import ProjectSettings from './views/ProjectSettings.vue';
import ThemeDesigner from './views/ThemeDesigner.vue';

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
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-design', icon: '⚙️', label: '设置页' },
  { id: 'resource-library', icon: '📦', label: '资源库' },
  { id: 'project-settings', icon: '⚡', label: '项目设置' },
  { id: 'theme', icon: '🎨', label: '主题' },
];

const tabComponents = {
  'scenes': markRaw(PageEditor),
  'title': markRaw(TitleDesigner),
  'settings-design': markRaw(SettingsDesigner),
  'resource-library': markRaw(ResourceLibrary),
  'project-settings': markRaw(ProjectSettings),
  'theme': markRaw(ThemeDesigner),
};

// --- Undo/Redo ---
const canUndo = computed(() => script.historyIndex > 0);
const canRedo = computed(() => script.historyIndex < script.history.length - 1);

// --- Auto-save (2s debounce) ---
let saveTimer = null;
let snapshotTimer = null;

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
      project.saveProject(script.data);
    }
  }, 2000);
}, { deep: true });

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
      project.saveProject(script.data);
    }
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeyDown);
  await project.loadRecentProjects();
  // Expose for Electron close handler
  window.__hasDirtyProject = () => project.isDirty && !!script.data;
  window.__saveCurrentProject = () => script.data ? project.saveProject(script.data) : Promise.resolve();
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown);
  if (saveTimer) clearTimeout(saveTimer);
  if (snapshotTimer) clearTimeout(snapshotTimer);
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
      const saved = await project.saveProject(script.data);
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

function openPreview() {
  if (window.ipcRenderer) {
    window.ipcRenderer.invoke('open-preview', project.projectPath);
  }
}

function manualSave() {
  if (project.projectPath && script.data) {
    project.saveProject(script.data);
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
