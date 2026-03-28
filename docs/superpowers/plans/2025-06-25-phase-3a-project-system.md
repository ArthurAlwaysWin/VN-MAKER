# Phase 3A: Project System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the editor from a single-file script editor into a project-based IDE with welcome screen, project management, tab navigation, and asset panel integration.

**Architecture:** Replace vue-router with a state machine (`welcome` → `editing`). In editing mode, top tab bar switches between 6 views using `<component :is>` with `<keep-alive>`. Project state lives in a new Pinia store. Electron main process manages project I/O via IPC handlers and tracks the current project path for the asset:// protocol.

**Tech Stack:** Vue 3, Pinia, Electron (IPC + dialog + protocol), Vite, plain CSS

**Spec:** `docs/superpowers/specs/2025-06-25-phase-3a-project-system-design.md`

---

## Chunk 1: Foundation — Electron IPC + Project Store

### Task 1: Electron IPC Handlers

**Files:**
- Modify: `electron/main.js`

This task adds all project-related IPC handlers to the Electron main process. The existing `read-script`, `save-script`, `read-dir`, `upload-asset`, and `open-preview` handlers are replaced/extended.

- [ ] **Step 1: Add project IPC handlers to electron/main.js**

Replace the entire `electron/main.js` with the following. Key changes:
- `let currentProjectPath = null` tracks the loaded project
- `create-project`: creates folder structure + project.json + empty script.json
- `open-project`: shows folder dialog, validates project (project.json or script.json must exist)
- `load-project`: reads project.json + script.json, stores path, handles legacy migration
- `save-project`: writes both files atomically (temp + rename)
- `get-recent-projects` / `update-recent-projects`: persists recent list in userData
- `read-dir` / `upload-asset`: now relative to current project path
- `open-preview`: passes project path to preview window
- `asset://` protocol: reads from `currentProjectPath/assets/` when set

```javascript
import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import { existsSync, writeFileSync, renameSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let currentProjectPath = null;

// --- Recent Projects ---

function recentProjectsPath() {
  return path.join(app.getPath('userData'), 'recent-projects.json');
}

async function readRecentProjects() {
  try {
    const raw = await fs.readFile(recentProjectsPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { hasCreatedProject: false, projects: [] };
  }
}

async function writeRecentProjects(data) {
  await fs.writeFile(recentProjectsPath(), JSON.stringify(data, null, 2), 'utf-8');
}

async function addToRecent(projectPath, name) {
  const recent = await readRecentProjects();
  recent.projects = recent.projects.filter(p => p.path !== projectPath);
  recent.projects.unshift({ path: projectPath, name, openedAt: new Date().toISOString() });
  if (recent.projects.length > 20) recent.projects = recent.projects.slice(0, 20);
  recent.hasCreatedProject = true;
  await writeRecentProjects(recent);
}

// --- Atomic File Write (Windows-safe: backup → write → cleanup) ---

function atomicWriteSync(filePath, content) {
  const tmp = filePath + '.tmp';
  const bak = filePath + '.bak';
  writeFileSync(tmp, content, 'utf-8');
  try { renameSync(filePath, bak); } catch {}
  renameSync(tmp, filePath);
  try { require('node:fs').unlinkSync(bak); } catch {}
}

// --- Default Script Template ---

function defaultScript() {
  return {
    characters: {},
    scenes: {
      start: {
        name: '第一幕',
        commands: [
          { type: 'dialogue', speaker: null, text: '故事从这里开始...' },
          { type: 'end' }
        ]
      }
    }
  };
}

// --- IPC Handlers ---

ipcMain.handle('create-project', async (event, { name, author, location, resolution, template }) => {
  try {
    const projectDir = path.join(location, name);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'backgrounds'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'characters'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'audio'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'ui'), { recursive: true });

    const projectJson = {
      name,
      author: author || '',
      version: '1.0.0',
      description: '',
      resolution: resolution || { width: 1280, height: 720 },
      engineVersion: '0.1.0',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(projectJson, null, 2), 'utf-8');

    let scriptData = defaultScript();
    if (template === 'demo') {
      // Copy demo assets and script from public/game/
      const demoDir = path.join(process.env.APP_ROOT, 'public', 'game');
      if (existsSync(path.join(demoDir, 'script.json'))) {
        const demoScript = JSON.parse(await fs.readFile(path.join(demoDir, 'script.json'), 'utf-8'));
        delete demoScript.meta; // Remove meta, it's in project.json now
        scriptData = demoScript;
        // Copy demo assets
        for (const sub of ['backgrounds', 'characters', 'audio']) {
          const srcDir = path.join(demoDir, sub);
          const dstDir = path.join(projectDir, 'assets', sub);
          if (existsSync(srcDir)) {
            const files = await fs.readdir(srcDir);
            for (const f of files) {
              await fs.copyFile(path.join(srcDir, f), path.join(dstDir, f));
            }
          }
        }
      }
    }
    await fs.writeFile(path.join(projectDir, 'script.json'), JSON.stringify(scriptData, null, 2), 'utf-8');

    await addToRecent(projectDir, name);
    return { success: true, path: projectDir };
  } catch (e) {
    console.error('Failed to create project:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('open-project', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择项目文件夹'
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };

  const dir = result.filePaths[0];
  const hasProject = existsSync(path.join(dir, 'project.json'));
  const hasScript = existsSync(path.join(dir, 'script.json'));

  if (!hasProject && !hasScript) {
    return { success: false, error: '不是有效的项目文件夹：找不到 project.json 或 script.json' };
  }

  return { success: true, path: dir, needsMigration: !hasProject && hasScript };
});

ipcMain.handle('load-project', async (event, projectPath) => {
  try {
    let projectData;
    let scriptData;
    const projectJsonPath = path.join(projectPath, 'project.json');
    const scriptJsonPath = path.join(projectPath, 'script.json');

    if (existsSync(projectJsonPath)) {
      projectData = JSON.parse(await fs.readFile(projectJsonPath, 'utf-8'));
    }

    if (existsSync(scriptJsonPath)) {
      scriptData = JSON.parse(await fs.readFile(scriptJsonPath, 'utf-8'));
    } else {
      scriptData = defaultScript();
    }

    // Legacy migration: script.json has meta but no project.json
    if (!projectData && scriptData.meta) {
      projectData = {
        name: scriptData.meta.title || path.basename(projectPath),
        author: scriptData.meta.author || '',
        version: scriptData.meta.version || '1.0.0',
        description: '',
        resolution: scriptData.meta.resolution || { width: 1280, height: 720 },
        engineVersion: '0.1.0',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      delete scriptData.meta;
      // Write migrated files
      await fs.writeFile(projectJsonPath, JSON.stringify(projectData, null, 2), 'utf-8');
      await fs.writeFile(scriptJsonPath, JSON.stringify(scriptData, null, 2), 'utf-8');
      // Ensure assets dirs exist
      for (const sub of ['backgrounds', 'characters', 'audio', 'ui']) {
        await fs.mkdir(path.join(projectPath, 'assets', sub), { recursive: true });
      }
    }

    if (!projectData) {
      projectData = {
        name: path.basename(projectPath),
        author: '', version: '1.0.0', description: '',
        resolution: { width: 1280, height: 720 },
        engineVersion: '0.1.0',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
    }

    currentProjectPath = projectPath;
    await addToRecent(projectPath, projectData.name);
    return { success: true, project: projectData, script: scriptData, path: projectPath };
  } catch (e) {
    console.error('Failed to load project:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-project', async (event, { project, script }) => {
  if (!currentProjectPath) return { success: false, error: 'No project loaded' };
  try {
    project.lastModified = new Date().toISOString();
    atomicWriteSync(path.join(currentProjectPath, 'project.json'), JSON.stringify(project, null, 2));
    atomicWriteSync(path.join(currentProjectPath, 'script.json'), JSON.stringify(script, null, 2));
    return { success: true };
  } catch (e) {
    console.error('Failed to save project:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('read-dir', async (event, relativePath) => {
  try {
    if (!currentProjectPath) return [];
    const fullPath = path.join(currentProjectPath, relativePath);
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    return files.map(f => ({ name: f.name, isDirectory: f.isDirectory() }));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('upload-asset', async (event, { category, name, data }) => {
  try {
    if (!currentProjectPath) return false;
    const dir = path.join(currentProjectPath, 'assets', category);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), Buffer.from(data));
    return true;
  } catch (e) {
    console.error('Failed to upload asset:', e);
    return false;
  }
});

ipcMain.handle('get-recent-projects', async () => {
  return await readRecentProjects();
});

ipcMain.handle('update-recent-projects', async (event, data) => {
  await writeRecentProjects(data);
  return true;
});

ipcMain.handle('close-project', () => {
  currentProjectPath = null;
});

ipcMain.handle('show-save-dialog', async () => {
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['保存', '不保存', '取消'],
    defaultId: 0, cancelId: 2,
    title: '未保存的修改',
    message: '项目有未保存的修改，是否保存？'
  });
  return ['save', 'discard', 'cancel'][response];
});

let previewWin = null;
ipcMain.handle('open-preview', (event, projectPath) => {
  if (previewWin) {
    previewWin.focus();
    return;
  }
  previewWin = new BrowserWindow({
    width: 1280, height: 720,
    autoHideMenuBar: true,
  });

  const projectParam = projectPath ? `?project=${encodeURIComponent(projectPath)}` : '';
  if (process.env['VITE_DEV_SERVER_URL']) {
    previewWin.loadURL(process.env['VITE_DEV_SERVER_URL'] + 'index.html' + projectParam);
  } else {
    previewWin.loadFile(path.join(process.env.APP_ROOT, 'dist/index.html'), {
      search: projectParam ? `project=${encodeURIComponent(projectPath)}` : undefined
    });
  }

  previewWin.on('closed', () => { previewWin = null; });
});

// --- App Setup ---

process.env.APP_ROOT = path.join(__dirname, '..');
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + 'editor.html');
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'editor.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); win = null; }
});

app.whenReady().then(() => {
  protocol.handle('asset', (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.hostname + url.pathname);
    const base = currentProjectPath
      ? path.join(currentProjectPath, 'assets')
      : path.join(process.env.APP_ROOT, 'public', 'game');
    const fullPath = path.join(base, filePath);
    return net.fetch(pathToFileURL(fullPath).toString());
  });
  createWindow();
});
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd E:\projects\my-awesome-project && npx vite build 2>&1 | Select-Object -Last 5`
Expected: Build succeeds (exit code 0)

- [ ] **Step 3: Commit**

```
git add electron/main.js
git commit -m "feat(electron): rewrite IPC handlers for project system"
```

---

### Task 2: Project Store

**Files:**
- Create: `src/editor/stores/project.js`
- Modify: `src/editor/stores/script.js`

- [ ] **Step 1: Create project store**

Create `src/editor/stores/project.js`:

```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useProjectStore = defineStore('project', () => {
  const projectPath = ref(null);
  const projectData = ref(null);
  const recentProjects = ref([]);
  const hasCreatedProject = ref(false);
  const isDirty = ref(false);

  const projectName = computed(() => projectData.value?.name || '');

  async function loadRecentProjects() {
    if (!window.ipcRenderer) return;
    const data = await window.ipcRenderer.invoke('get-recent-projects');
    recentProjects.value = data.projects || [];
    hasCreatedProject.value = data.hasCreatedProject || false;
  }

  async function createProject(opts) {
    if (!window.ipcRenderer) return null;
    const result = await window.ipcRenderer.invoke('create-project', opts);
    if (result.success) {
      await loadRecentProjects();
    }
    return result;
  }

  async function openProjectDialog() {
    if (!window.ipcRenderer) return null;
    return await window.ipcRenderer.invoke('open-project');
  }

  async function loadProject(projPath) {
    if (!window.ipcRenderer) return null;
    const result = await window.ipcRenderer.invoke('load-project', projPath);
    if (result.success) {
      projectPath.value = result.path;
      projectData.value = result.project;
      isDirty.value = false;
    }
    return result;
  }

  async function saveProject(scriptData) {
    if (!window.ipcRenderer || !projectPath.value) return false;
    const result = await window.ipcRenderer.invoke('save-project', {
      project: JSON.parse(JSON.stringify(projectData.value)),
      script: JSON.parse(JSON.stringify(scriptData))
    });
    if (result.success) {
      isDirty.value = false;
    }
    return result.success;
  }

  function closeProject() {
    projectPath.value = null;
    projectData.value = null;
    isDirty.value = false;
    if (window.ipcRenderer) window.ipcRenderer.invoke('close-project');
  }

  function markDirty() {
    isDirty.value = true;
  }

  return {
    projectPath, projectData, recentProjects, hasCreatedProject, isDirty,
    projectName,
    loadRecentProjects, createProject, openProjectDialog, loadProject, saveProject,
    closeProject, markDirty
  };
});
```

- [ ] **Step 2: Update script store for project-based loading**

Replace `src/editor/stores/script.js` with:

```javascript
import { defineStore } from 'pinia';
import { ref, nextTick } from 'vue';

export const useScriptStore = defineStore('script', () => {
  const data = ref(null);
  const isLoading = ref(false);
  const _skipWatch = ref(false);

  // Undo/Redo history
  const history = ref([]);
  const historyIndex = ref(-1);

  function pushState() {
    if (!data.value) return;
    const snapshot = JSON.parse(JSON.stringify(data.value));
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }
    history.value.push(snapshot);
    historyIndex.value++;
    if (history.value.length > 50) {
      history.value.shift();
      historyIndex.value--;
    }
  }

  function undo() {
    if (historyIndex.value > 0) {
      _skipWatch.value = true;
      historyIndex.value--;
      data.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
      nextTick(() => { _skipWatch.value = false; });
    }
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      _skipWatch.value = true;
      historyIndex.value++;
      data.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
      nextTick(() => { _skipWatch.value = false; });
    }
  }

  function loadFromData(scriptData) {
    data.value = scriptData;
    history.value = [];
    historyIndex.value = -1;
    pushState();
  }

  function reset() {
    data.value = null;
    history.value = [];
    historyIndex.value = -1;
  }

  return {
    data, isLoading, _skipWatch,
    pushState, undo, redo,
    historyIndex, history,
    loadFromData, reset
  };
});
```

Key changes from original:
- Removed `loadScript()` and `saveScript()` — loading/saving now goes through project store
- Added `loadFromData(scriptData)` — called by project store after IPC load
- Added `reset()` — called when closing project
- `undo()`/`redo()` no longer auto-save (auto-save handled by App.vue watcher)

- [ ] **Step 3: Verify build**

Run: `cd E:\projects\my-awesome-project && npx vite build 2>&1 | Select-Object -Last 5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```
git add src/editor/stores/project.js src/editor/stores/script.js
git commit -m "feat(stores): add project store, refactor script store for project loading"
```

---

## Chunk 2: Welcome Screen & Project Creation

### Task 3: Welcome Screen

**Files:**
- Create: `src/editor/views/WelcomeScreen.vue`

- [ ] **Step 1: Create WelcomeScreen.vue**

Create `src/editor/views/WelcomeScreen.vue`:

```vue
<template>
  <div class="welcome">
    <div class="welcome-content">
      <div class="brand">
        <div class="brand-icon">🎮</div>
        <h1>Galgame Maker</h1>
        <p class="tagline">可视化视觉小说制作器</p>
      </div>

      <div class="actions">
        <button class="btn-primary" @click="$emit('create-project')">✨ 新建项目</button>
        <button class="btn-secondary" @click="handleOpen">📂 打开项目</button>
      </div>

      <div class="recent" v-if="project.recentProjects.length > 0">
        <div class="recent-label">最近打开</div>
        <div class="recent-list">
          <div
            class="recent-item"
            v-for="p in project.recentProjects"
            :key="p.path"
            @click="$emit('open-recent', p.path)"
          >
            <span class="recent-name">{{ p.name }}</span>
            <span class="recent-path">{{ p.path }}</span>
          </div>
        </div>
      </div>

      <div class="empty-recent" v-else>
        <p>还没有项目，点击上方按钮创建你的第一个视觉小说！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();

const emit = defineEmits(['create-project', 'open-recent', 'open-folder']);

onMounted(() => project.loadRecentProjects());

async function handleOpen() {
  const result = await project.openProjectDialog();
  if (result && !result.canceled && result.success) {
    emit('open-folder', result.path);
  } else if (result && result.error) {
    alert(result.error);
  }
}
</script>

<style scoped>
.welcome {
  display: flex; align-items: center; justify-content: center;
  height: 100vh; background: #1e1e1e;
}
.welcome-content {
  text-align: center; max-width: 480px; width: 100%; padding: 40px 20px;
}
.brand-icon { font-size: 56px; margin-bottom: 8px; }
.brand h1 { margin: 0; font-size: 28px; font-weight: 700; color: #e0e0e0; }
.tagline { color: #888; font-size: 14px; margin: 4px 0 32px; }

.actions { display: flex; gap: 16px; justify-content: center; margin-bottom: 32px; }
.btn-primary {
  background: #0e633c; color: #fff; border: none; padding: 12px 28px;
  border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 500;
}
.btn-primary:hover { background: #117748; }
.btn-secondary {
  background: #333; color: #ccc; border: 1px solid #555; padding: 12px 28px;
  border-radius: 8px; font-size: 15px; cursor: pointer;
}
.btn-secondary:hover { background: #3c3c3c; }

.recent-label { color: #666; font-size: 13px; margin-bottom: 8px; }
.recent-list {
  background: #252526; border: 1px solid #333; border-radius: 8px;
  overflow: hidden; text-align: left;
}
.recent-item {
  padding: 10px 16px; border-bottom: 1px solid #2a2a2a;
  cursor: pointer; display: flex; flex-direction: column; gap: 2px;
}
.recent-item:last-child { border-bottom: none; }
.recent-item:hover { background: #2a2d2e; }
.recent-name { color: #ccc; font-size: 14px; }
.recent-path { color: #555; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.empty-recent p { color: #666; font-size: 13px; }
</style>
```

- [ ] **Step 2: Commit**

```
git add src/editor/views/WelcomeScreen.vue
git commit -m "feat(editor): add welcome screen component"
```

---

### Task 4: Project Creation Views

**Files:**
- Create: `src/editor/views/CreateProjectWizard.vue`
- Create: `src/editor/views/CreateProjectQuick.vue`

- [ ] **Step 1: Create CreateProjectWizard.vue**

Create `src/editor/views/CreateProjectWizard.vue`:

```vue
<template>
  <div class="wizard-overlay">
    <div class="wizard">
      <div class="wizard-header">
        <h2>创建新项目</h2>
        <div class="steps">
          <span v-for="(s, i) in steps" :key="i" :class="{ active: step === i, done: step > i }">
            {{ s }}
          </span>
        </div>
      </div>

      <div class="wizard-body">
        <!-- Step 0: Basic Info -->
        <div v-if="step === 0" class="step-content">
          <label>项目名称
            <input v-model="form.name" placeholder="我的视觉小说" />
          </label>
          <label>保存位置
            <div class="path-input">
              <input v-model="form.location" readonly />
              <button @click="browseLocation">浏览...</button>
            </div>
          </label>
          <label>作者
            <input v-model="form.author" placeholder="（可选）" />
          </label>
        </div>

        <!-- Step 1: Display Settings -->
        <div v-if="step === 1" class="step-content">
          <label>游戏分辨率</label>
          <div class="resolution-options">
            <button
              v-for="r in resolutions" :key="r.label"
              :class="{ selected: form.resolution.width === r.w && form.resolution.height === r.h }"
              @click="form.resolution = { width: r.w, height: r.h }"
            >
              {{ r.label }}<br><small>{{ r.w }}×{{ r.h }}</small>
            </button>
          </div>
        </div>

        <!-- Step 2: Template -->
        <div v-if="step === 2" class="step-content">
          <label>项目模板</label>
          <div class="template-options">
            <div :class="['tpl-card', { selected: form.template === 'blank' }]" @click="form.template = 'blank'">
              <div class="tpl-icon">📄</div>
              <div class="tpl-name">空白项目</div>
              <div class="tpl-desc">从零开始创建</div>
            </div>
            <div :class="['tpl-card', { selected: form.template === 'demo' }]" @click="form.template = 'demo'">
              <div class="tpl-icon">🎮</div>
              <div class="tpl-name">示例项目</div>
              <div class="tpl-desc">包含「樱花之约」完整示例</div>
            </div>
          </div>
        </div>

        <!-- Step 3: Confirm -->
        <div v-if="step === 3" class="step-content confirm">
          <h3>确认项目信息</h3>
          <div class="confirm-row"><span>名称：</span><strong>{{ form.name }}</strong></div>
          <div class="confirm-row"><span>位置：</span><strong>{{ form.location }}/{{ form.name }}</strong></div>
          <div class="confirm-row"><span>分辨率：</span><strong>{{ form.resolution.width }}×{{ form.resolution.height }}</strong></div>
          <div class="confirm-row"><span>模板：</span><strong>{{ form.template === 'demo' ? '示例项目' : '空白项目' }}</strong></div>
        </div>
      </div>

      <div class="wizard-footer">
        <button class="btn-cancel" @click="$emit('cancel')">取消</button>
        <div class="footer-right">
          <button v-if="step > 0" class="btn-back" @click="step--">上一步</button>
          <button v-if="step < 3" class="btn-next" @click="step++" :disabled="!canNext">下一步</button>
          <button v-if="step === 3" class="btn-create" @click="handleCreate" :disabled="creating">
            {{ creating ? '创建中...' : '✨ 创建项目' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();
const emit = defineEmits(['cancel', 'created']);
const step = ref(0);
const creating = ref(false);
const steps = ['基本信息', '画面设置', '选择模板', '确认创建'];

const resolutions = [
  { label: '标准 (16:9)', w: 1280, h: 720 },
  { label: '高清 (16:9)', w: 1920, h: 1080 },
  { label: '方形 (4:3)', w: 1024, h: 768 },
];

const form = reactive({
  name: '',
  location: '',
  author: '',
  resolution: { width: 1280, height: 720 },
  template: 'blank'
});

const canNext = computed(() => {
  if (step.value === 0) return form.name.trim() && form.location.trim();
  return true;
});

async function browseLocation() {
  if (!window.ipcRenderer) return;
  const result = await window.ipcRenderer.invoke('dialog-open-directory');
  if (result) form.location = result;
}

async function handleCreate() {
  creating.value = true;
  const result = await project.createProject({
    name: form.name.trim(),
    author: form.author.trim(),
    location: form.location,
    resolution: form.resolution,
    template: form.template
  });
  creating.value = false;
  if (result.success) {
    emit('created', result.path);
  } else {
    alert('创建失败: ' + result.error);
  }
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.wizard {
  background: #252526; border: 1px solid #444; border-radius: 12px;
  width: 520px; max-height: 80vh; display: flex; flex-direction: column;
}
.wizard-header { padding: 20px 24px 12px; border-bottom: 1px solid #333; }
.wizard-header h2 { margin: 0 0 12px; font-size: 18px; color: #e0e0e0; font-weight: 600; }
.steps { display: flex; gap: 8px; }
.steps span {
  font-size: 12px; color: #666; padding: 4px 12px; border-radius: 12px; background: #1e1e1e;
}
.steps span.active { color: #fff; background: #007acc; }
.steps span.done { color: #4ade80; background: #1a2a1a; }

.wizard-body { padding: 24px; flex: 1; overflow-y: auto; }
.step-content label { display: block; color: #aaa; font-size: 13px; margin-bottom: 12px; }
.step-content input {
  display: block; width: 100%; margin-top: 4px; padding: 8px 12px;
  background: #1e1e1e; border: 1px solid #444; border-radius: 6px;
  color: #e0e0e0; font-size: 14px; box-sizing: border-box;
}
.path-input { display: flex; gap: 8px; margin-top: 4px; }
.path-input input { flex: 1; }
.path-input button {
  background: #333; color: #ccc; border: 1px solid #555; padding: 8px 16px;
  border-radius: 6px; cursor: pointer; white-space: nowrap;
}

.resolution-options { display: flex; gap: 12px; margin-top: 8px; }
.resolution-options button {
  flex: 1; padding: 16px; background: #1e1e1e; border: 2px solid #333;
  border-radius: 8px; color: #ccc; cursor: pointer; text-align: center; font-size: 13px;
}
.resolution-options button.selected { border-color: #007acc; color: #fff; }
.resolution-options button small { color: #888; }

.template-options { display: flex; gap: 16px; margin-top: 8px; }
.tpl-card {
  flex: 1; padding: 24px 16px; background: #1e1e1e; border: 2px solid #333;
  border-radius: 8px; cursor: pointer; text-align: center;
}
.tpl-card.selected { border-color: #007acc; }
.tpl-icon { font-size: 36px; margin-bottom: 8px; }
.tpl-name { color: #e0e0e0; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.tpl-desc { color: #888; font-size: 12px; }

.confirm h3 { color: #e0e0e0; font-size: 16px; margin: 0 0 16px; }
.confirm-row { display: flex; gap: 8px; color: #aaa; font-size: 14px; margin-bottom: 8px; }
.confirm-row strong { color: #e0e0e0; }

.wizard-footer {
  padding: 16px 24px; border-top: 1px solid #333;
  display: flex; justify-content: space-between;
}
.footer-right { display: flex; gap: 8px; }
.btn-cancel { background: transparent; border: none; color: #888; cursor: pointer; font-size: 13px; }
.btn-back { background: #333; color: #ccc; border: 1px solid #555; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.btn-next { background: #007acc; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-create { background: #0e633c; color: #fff; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 2: Create CreateProjectQuick.vue**

Create `src/editor/views/CreateProjectQuick.vue`:

```vue
<template>
  <div class="wizard-overlay">
    <div class="quick-create">
      <h2>新建项目</h2>
      <label>项目名称
        <input v-model="name" placeholder="我的视觉小说" ref="nameInput" />
      </label>
      <label>保存位置
        <div class="path-input">
          <input v-model="location" readonly />
          <button @click="browseLocation">浏览...</button>
        </div>
      </label>
      <div class="footer">
        <button class="btn-cancel" @click="$emit('cancel')">取消</button>
        <button class="btn-create" @click="handleCreate" :disabled="!canCreate || creating">
          {{ creating ? '创建中...' : '✨ 创建项目' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();
const emit = defineEmits(['cancel', 'created']);
const name = ref('');
const location = ref('');
const creating = ref(false);
const nameInput = ref(null);

const canCreate = computed(() => name.value.trim() && location.value.trim());

onMounted(() => { nameInput.value?.focus(); });

async function browseLocation() {
  if (!window.ipcRenderer) return;
  const result = await window.ipcRenderer.invoke('dialog-open-directory');
  if (result) location.value = result;
}

async function handleCreate() {
  creating.value = true;
  const result = await project.createProject({
    name: name.value.trim(),
    author: '',
    location: location.value,
    resolution: { width: 1280, height: 720 },
    template: 'blank'
  });
  creating.value = false;
  if (result.success) {
    emit('created', result.path);
  } else {
    alert('创建失败: ' + result.error);
  }
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.quick-create {
  background: #252526; border: 1px solid #444; border-radius: 12px;
  width: 420px; padding: 24px;
}
.quick-create h2 { margin: 0 0 20px; font-size: 18px; color: #e0e0e0; }
.quick-create label { display: block; color: #aaa; font-size: 13px; margin-bottom: 16px; }
.quick-create input {
  display: block; width: 100%; margin-top: 4px; padding: 8px 12px;
  background: #1e1e1e; border: 1px solid #444; border-radius: 6px;
  color: #e0e0e0; font-size: 14px; box-sizing: border-box;
}
.path-input { display: flex; gap: 8px; margin-top: 4px; }
.path-input input { flex: 1; }
.path-input button {
  background: #333; color: #ccc; border: 1px solid #555; padding: 8px 16px;
  border-radius: 6px; cursor: pointer;
}
.footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.btn-cancel { background: transparent; border: 1px solid #555; color: #888; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.btn-create { background: #0e633c; color: #fff; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 3: Add dialog-open-directory IPC handler**

Both wizard and quick-create use `dialog-open-directory`. Add to `electron/main.js` (before the app setup section):

```javascript
ipcMain.handle('dialog-open-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择保存位置'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});
```

- [ ] **Step 4: Verify build**

Run: `cd E:\projects\my-awesome-project && npx vite build 2>&1 | Select-Object -Last 5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```
git add src/editor/views/CreateProjectWizard.vue src/editor/views/CreateProjectQuick.vue electron/main.js
git commit -m "feat(editor): add project creation wizard and quick create views"
```

---

## Chunk 3: Editor Layout Refactor

### Task 5: Tab Bar Component

**Files:**
- Create: `src/editor/components/TabBar.vue`

- [ ] **Step 1: Create TabBar.vue**

Create `src/editor/components/TabBar.vue`:

```vue
<template>
  <div class="tab-bar">
    <button
      v-for="tab in tabs" :key="tab.id"
      :class="['tab', { active: modelValue === tab.id }]"
      @click="$emit('update:modelValue', tab.id)"
    >
      {{ tab.icon }} {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true }
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.tab-bar {
  display: flex; background: #252526; border-bottom: 2px solid #1e1e1e;
  padding: 0 8px; gap: 2px; flex-shrink: 0;
}
.tab {
  padding: 10px 20px; color: #888; font-size: 13px; cursor: pointer;
  background: transparent; border: none; border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0; white-space: nowrap;
}
.tab:hover { color: #ccc; background: #2a2d2e; }
.tab.active {
  color: #fff; background: #1e1e1e;
  border-bottom-color: #007acc;
}
</style>
```

- [ ] **Step 2: Commit**

```
git add src/editor/components/TabBar.vue
git commit -m "feat(editor): add TabBar component"
```

---

### Task 6: New Tab Views (placeholders + wrappers)

**Files:**
- Create: `src/editor/views/ProjectSettings.vue`
- Create: `src/editor/views/TitleDesigner.vue`
- Create: `src/editor/views/SettingsDesigner.vue`

- [ ] **Step 1: Create ProjectSettings.vue**

Create `src/editor/views/ProjectSettings.vue`:

```vue
<template>
  <div class="project-settings">
    <h2>项目设置</h2>
    <form @submit.prevent class="settings-form">
      <label>项目名称
        <input v-model="project.projectData.name" @input="project.markDirty()" />
      </label>
      <label>作者
        <input v-model="project.projectData.author" @input="project.markDirty()" />
      </label>
      <label>描述
        <textarea v-model="project.projectData.description" rows="3" @input="project.markDirty()"></textarea>
      </label>
      <label>分辨率
        <div class="resolution-group">
          <input type="number" v-model.number="project.projectData.resolution.width" @input="project.markDirty()" /> ×
          <input type="number" v-model.number="project.projectData.resolution.height" @input="project.markDirty()" />
        </div>
      </label>
      <div class="info-row">
        <span class="info-label">引擎版本</span>
        <span class="info-value">{{ project.projectData.engineVersion }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">项目路径</span>
        <span class="info-value path">{{ project.projectPath }}</span>
      </div>
    </form>
  </div>
</template>

<script setup>
import { useProjectStore } from '../stores/project.js';
const project = useProjectStore();
</script>

<style scoped>
.project-settings { padding: 24px; max-width: 600px; }
.project-settings h2 { margin: 0 0 20px; font-size: 20px; color: #e0e0e0; font-weight: 500; }
.settings-form label { display: block; color: #aaa; font-size: 13px; margin-bottom: 16px; }
.settings-form input, .settings-form textarea {
  display: block; width: 100%; margin-top: 4px; padding: 8px 12px;
  background: #1e1e1e; border: 1px solid #444; border-radius: 6px;
  color: #e0e0e0; font-size: 14px; box-sizing: border-box; font-family: inherit;
}
.resolution-group { display: flex; align-items: center; gap: 8px; margin-top: 4px; color: #888; }
.resolution-group input { width: 100px; }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #333; color: #888; font-size: 13px; }
.info-value { color: #ccc; }
.info-value.path { font-size: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
</style>
```

- [ ] **Step 2: Create TitleDesigner.vue**

Create `src/editor/views/TitleDesigner.vue` — wraps existing canvas for title page editing:

```vue
<template>
  <div class="title-designer">
    <div class="td-toolbar">
      <h3>标题页设计</h3>
      <p class="hint">拖拽元素到画布上，自定义你的游戏标题页面</p>
    </div>
    <div class="td-body">
      <div class="td-notice" v-if="!script.data">
        <p>请先加载项目</p>
      </div>
      <div class="td-notice" v-else>
        <p>🎨 标题页设计器</p>
        <p class="sub">使用「游戏内容」标签页中的画布模式编辑标题页布局。</p>
        <p class="sub">标题页元素（如"开始游戏"、"加载存档"等按钮）可在场景编辑器中通过 title_layout 配置。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useScriptStore } from '../stores/script.js';
const script = useScriptStore();
</script>

<style scoped>
.title-designer { display: flex; flex-direction: column; height: 100%; padding: 20px; }
.td-toolbar h3 { margin: 0; color: #e0e0e0; font-size: 18px; font-weight: 500; }
.hint { color: #888; font-size: 13px; margin: 4px 0 16px; }
.td-body { flex: 1; display: flex; align-items: center; justify-content: center; }
.td-notice { text-align: center; color: #888; }
.td-notice p { margin: 8px 0; font-size: 16px; }
.td-notice .sub { font-size: 13px; color: #666; }
</style>
```

- [ ] **Step 3: Create SettingsDesigner.vue (placeholder)**

Create `src/editor/views/SettingsDesigner.vue`:

```vue
<template>
  <div class="placeholder">
    <div class="placeholder-content">
      <div class="placeholder-icon">⚙️</div>
      <h3>设置页设计器</h3>
      <p>即将在 Phase 3B 中推出</p>
      <p class="sub">你将可以自定义游戏设置页的布局、组件样式和功能选项。</p>
    </div>
  </div>
</template>

<style scoped>
.placeholder { display: flex; align-items: center; justify-content: center; height: 100%; }
.placeholder-content { text-align: center; color: #888; }
.placeholder-icon { font-size: 56px; margin-bottom: 12px; }
.placeholder-content h3 { color: #ccc; font-size: 18px; margin: 0 0 8px; }
.placeholder-content p { font-size: 14px; margin: 4px 0; }
.placeholder-content .sub { font-size: 12px; color: #666; }
</style>
```

- [ ] **Step 4: Commit**

```
git add src/editor/views/ProjectSettings.vue src/editor/views/TitleDesigner.vue src/editor/views/SettingsDesigner.vue
git commit -m "feat(editor): add ProjectSettings, TitleDesigner, SettingsDesigner views"
```

---

### Task 7: App.vue Rewrite + Remove Router

**Files:**
- Modify: `src/editor/App.vue` (full rewrite)
- Modify: `src/editor/main.js` (remove router)
- Delete: `src/editor/router/index.js`
- Delete: `src/editor/views/Dashboard.vue`
- Delete: `src/editor/components/layout/Sidebar.vue`

- [ ] **Step 1: Rewrite App.vue**

Replace `src/editor/App.vue` entirely:

```vue
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

import WelcomeScreen from './views/WelcomeScreen.vue';
import CreateProjectWizard from './views/CreateProjectWizard.vue';
import CreateProjectQuick from './views/CreateProjectQuick.vue';
import TabBar from './components/TabBar.vue';
import Scenes from './views/Scenes.vue';
import TitleDesigner from './views/TitleDesigner.vue';
import SettingsDesigner from './views/SettingsDesigner.vue';
import Assets from './views/Assets.vue';
import Characters from './views/Characters.vue';
import ProjectSettings from './views/ProjectSettings.vue';

const script = useScriptStore();
const project = useProjectStore();

// --- State Machine ---
const currentView = ref('welcome'); // 'welcome' | 'editing'
const activeTab = ref('scenes');
const showWizard = ref(false);
const showQuickCreate = ref(false);

const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-design', icon: '⚙️', label: '设置页' },
  { id: 'assets', icon: '🎨', label: '素材库' },
  { id: 'characters', icon: '👤', label: '角色' },
  { id: 'project-settings', icon: '📦', label: '项目设置' },
];

const tabComponents = {
  'scenes': markRaw(Scenes),
  'title': markRaw(TitleDesigner),
  'settings-design': markRaw(SettingsDesigner),
  'assets': markRaw(Assets),
  'characters': markRaw(Characters),
  'project-settings': markRaw(ProjectSettings),
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
    project.saveProject(script.data);
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
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown));

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
    if (action === 'save') await project.saveProject(script.data);
  }
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
```

- [ ] **Step 2: Update main.js — remove router**

Replace `src/editor/main.js`:

```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

import './assets/base.css';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
```

- [ ] **Step 3: Delete old files and remove vue-router**

```bash
git rm src/editor/router/index.js
git rm src/editor/views/Dashboard.vue
git rm src/editor/components/layout/Sidebar.vue
npm uninstall vue-router
```

- [ ] **Step 4: Verify build**

Run: `cd E:\projects\my-awesome-project && npx vite build 2>&1 | Select-Object -Last 5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "feat(editor): rewrite App.vue with state machine, tab bar, remove router/sidebar"
```

---

## Chunk 4: Asset Panel & View Updates

### Task 8: Asset Panel Component

**Files:**
- Create: `src/editor/components/AssetPanel.vue`

- [ ] **Step 1: Create AssetPanel.vue**

Create `src/editor/components/AssetPanel.vue`:

```vue
<template>
  <div class="asset-panel">
    <div class="ap-header">素材面板</div>
    <div class="ap-body">
      <div class="ap-section" v-for="section in sections" :key="section.key">
        <div class="ap-section-label" @click="section.expanded = !section.expanded">
          {{ section.expanded ? '▾' : '▸' }} {{ section.icon }} {{ section.label }}
        </div>
        <div v-if="section.expanded" class="ap-items">
          <div
            v-for="file in section.files"
            :key="file.name"
            class="ap-item"
            draggable="true"
            @dragstart="onDragStart($event, section.key, file.name)"
          >
            <div v-if="section.key !== 'audio'" class="ap-thumb">
              <img :src="assetUrl(section.key, file.name)" :alt="file.name" />
            </div>
            <div v-else class="ap-audio-icon">🎵</div>
            <div class="ap-name" :title="file.name">{{ file.name }}</div>
          </div>
          <div v-if="section.files.length === 0" class="ap-empty">无素材</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, watch } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();

const sections = reactive([
  { key: 'backgrounds', icon: '📁', label: '背景', expanded: true, files: [] },
  { key: 'characters', icon: '👤', label: '角色', expanded: true, files: [] },
  { key: 'audio', icon: '🎵', label: '音频', expanded: true, files: [] },
]);

async function loadAssets() {
  if (!window.ipcRenderer) return;
  for (const s of sections) {
    try {
      const files = await window.ipcRenderer.invoke('read-dir', `assets/${s.key}`);
      s.files = files.filter(f => !f.isDirectory);
    } catch {
      s.files = [];
    }
  }
}

function assetUrl(category, filename) {
  return `asset://${category}/${filename}`;
}

function onDragStart(event, category, filename) {
  event.dataTransfer.setData('application/galgame-asset', JSON.stringify({ category, filename }));
  event.dataTransfer.effectAllowed = 'copy';
}

onMounted(loadAssets);
watch(() => project.projectPath, loadAssets);

defineExpose({ refresh: loadAssets });
</script>

<style scoped>
.asset-panel {
  width: 140px; background: #1e1e1e; border-right: 1px solid #333;
  display: flex; flex-direction: column; flex-shrink: 0;
}
.ap-header {
  padding: 8px; border-bottom: 1px solid #333; color: #888; font-size: 11px;
}
.ap-body { flex: 1; overflow-y: auto; padding: 4px; }
.ap-section { margin-bottom: 4px; }
.ap-section-label {
  color: #888; font-size: 11px; padding: 4px; cursor: pointer; user-select: none;
}
.ap-section-label:hover { color: #ccc; }
.ap-items { padding-left: 4px; }
.ap-item {
  background: #252526; border: 1px solid #333; border-radius: 4px;
  margin-bottom: 4px; cursor: grab; overflow: hidden;
}
.ap-item:hover { border-color: #555; }
.ap-thumb {
  height: 40px; background: #1a1a1a; display: flex; align-items: center; justify-content: center;
}
.ap-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
.ap-audio-icon { text-align: center; padding: 4px; font-size: 16px; }
.ap-name {
  padding: 3px 6px; font-size: 10px; color: #aaa;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ap-empty { color: #555; font-size: 10px; padding: 4px; text-align: center; }
</style>
```

- [ ] **Step 2: Commit**

```
git add src/editor/components/AssetPanel.vue
git commit -m "feat(editor): add AssetPanel component with drag support"
```

---

### Task 9: Update Views for Project-Relative Paths + AssetPanel Integration

**Files:**
- Modify: `src/editor/views/Assets.vue`
- Modify: `src/editor/views/Scenes.vue`
- Modify: `src/editor/components/canvas/CanvasPreview.vue`

- [ ] **Step 1: Update Assets.vue**

The key changes:
- `loadFiles()` reads from `assets/{category}` (relative to project) instead of `public/game/{category}`
- `handleUpload()` uploads to `assets/{category}` via the modified IPC handler
- Image URLs use the `asset://` protocol instead of `/game/`

In `Assets.vue`, make these changes:

Replace the `loadFiles` function:
```javascript
async function loadFiles() {
  if (window.ipcRenderer) {
    try {
      const dirPath = `assets/${currentTab.value}`;
      const result = await window.ipcRenderer.invoke('read-dir', dirPath);
      files.value = result.filter(f => !f.isDirectory);
    } catch (e) {
      console.error(e);
      files.value = [];
    }
  }
}
```

Replace image src in template from `` `/game/${currentTab}/${file.name}` `` to `` `asset://${currentTab}/${file.name}` ``

Replace audio src from `` `/game/audio/${file.name}` `` to `` `asset://audio/${file.name}` ``

- [ ] **Step 2: Update CanvasPreview.vue background URL**

In `src/editor/components/canvas/CanvasPreview.vue`, find the hardcoded `/game/` background path:

```javascript
// OLD:
backgroundImage: `url(game/${img})`,
// NEW:
backgroundImage: `url(asset://backgrounds/${img})`,
```

- [ ] **Step 3: Integrate AssetPanel into Scenes.vue**

In `src/editor/views/Scenes.vue`, add the AssetPanel between the scene list sidebar and the workspace:

Add import:
```javascript
import AssetPanel from '../components/AssetPanel.vue';
```

Add to template (between scene list and workspace area):
```vue
<AssetPanel ref="assetPanelRef" />
```

Add drop handler to the canvas/workspace area:
```vue
<div class="workspace" @dragover.prevent @drop="onAssetDrop">
```

Add the drop handler function:
```javascript
function onAssetDrop(event) {
  const raw = event.dataTransfer.getData('application/galgame-asset');
  if (!raw) return;
  const { category, filename } = JSON.parse(raw);
  const script = useScriptStore();
  const scene = script.data.scenes[currentScene.value];
  if (!scene) return;

  if (category === 'backgrounds') {
    // Find existing background command or add one at the start
    let bgCmd = scene.commands.find(c => c.type === 'background');
    if (bgCmd) {
      bgCmd.image = filename;
    } else {
      scene.commands.unshift({ type: 'background', image: filename });
    }
  } else if (category === 'characters') {
    // Add a character show command
    const charId = filename.replace(/\.[^.]+$/, '').replace(/_\w+$/, '');
    scene.commands.push({ type: 'character', id: charId, action: 'show', expression: 'normal' });
  } else if (category === 'audio') {
    let bgmCmd = scene.commands.find(c => c.type === 'bgm');
    if (bgmCmd) {
      bgmCmd.file = filename;
    } else {
      scene.commands.unshift({ type: 'bgm', file: filename });
    }
  }
  script.pushState();
}
```

Adjust CSS so the workspace is a flex row:
```css
.editor-main { display: flex; flex: 1; overflow: hidden; }
```

- [ ] **Step 4: Verify build**

Run: `cd E:\projects\my-awesome-project && npx vite build 2>&1 | Select-Object -Last 5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```
git add src/editor/views/Assets.vue src/editor/views/Scenes.vue src/editor/components/canvas/CanvasPreview.vue
git commit -m "feat(editor): update views for project paths, integrate AssetPanel with drop support"
```

---

### Task 10: Integration Test

- [ ] **Step 1: Start dev server and verify welcome screen**

Run: `cd E:\projects\my-awesome-project && npm run dev`

Expected:
1. App opens to the **Welcome Screen** (centered layout with "新建项目" and "打开项目" buttons)
2. Click "新建项目" → wizard or quick-create appears
3. Fill in name and browse for location → project created
4. Enters editor with top tab bar (6 tabs)

- [ ] **Step 2: Verify scene editor with asset panel**

Expected:
1. Scene editor (游戏内容 tab) shows AssetPanel on the left
2. Asset panel lists backgrounds, characters, audio from project
3. Drag a background from panel to workspace → sets scene background
4. Canvas preview shows the background image via `asset://` protocol
5. Ctrl+S saves, Ctrl+Z/Y undo/redo works (redo not destroyed after undo)

- [ ] **Step 3: Verify project lifecycle**

Expected:
1. 🏠 button → shows 3-way save dialog (保存/不保存/取消)
2. "取消" returns to editor without navigating
3. "不保存" returns to welcome screen (changes lost)
4. "保存" saves then returns to welcome screen
5. Recent projects list shows the project just closed

- [ ] **Step 4: Verify demo project template**

1. Create new project with "示例项目" template
2. Assets should include demo backgrounds/characters
3. Script should have the "樱花之约" scenes
4. Preview should work

- [ ] **Step 5: Final commit**

```
git add -A
git commit -m "feat: Phase 3A complete — project system with welcome screen, tab navigation, asset panel"
```
