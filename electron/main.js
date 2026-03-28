import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

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

// --- Path Security ---

function isInsideProject(fullPath) {
  const resolved = path.resolve(fullPath);
  const projectResolved = path.resolve(currentProjectPath);
  return resolved.startsWith(projectResolved + path.sep) || resolved === projectResolved;
}

function sanitizeProjectName(name) {
  return name.replace(/[<>:"|?*\\/]/g, '_').replace(/\.{2,}/g, '_').trim() || 'untitled';
}

// --- Atomic File Write (Windows-safe, async) ---

async function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  const bak = filePath + '.bak';
  await fs.writeFile(tmp, content, 'utf-8');
  try { await fs.rename(filePath, bak); } catch {}
  await fs.rename(tmp, filePath);
  try { await fs.unlink(bak); } catch {}
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
    const safeName = sanitizeProjectName(name);
    const projectDir = path.join(location, safeName);
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
      const demoDir = path.join(process.env.APP_ROOT, 'public', 'game');
      if (existsSync(path.join(demoDir, 'script.json'))) {
        const demoScript = JSON.parse(await fs.readFile(path.join(demoDir, 'script.json'), 'utf-8'));
        delete demoScript.meta;
        scriptData = demoScript;
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
      await fs.writeFile(projectJsonPath, JSON.stringify(projectData, null, 2), 'utf-8');
      await fs.writeFile(scriptJsonPath, JSON.stringify(scriptData, null, 2), 'utf-8');
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
    await atomicWrite(path.join(currentProjectPath, 'project.json'), JSON.stringify(project, null, 2));
    await atomicWrite(path.join(currentProjectPath, 'script.json'), JSON.stringify(script, null, 2));
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
    if (!isInsideProject(fullPath)) return [];
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
    if (!isInsideProject(dir)) return false;
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

ipcMain.handle('dialog-open-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择保存位置'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
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

  win.on('close', async (e) => {
    e.preventDefault();
    try {
      const hasUnsaved = await win.webContents.executeJavaScript(
        'window.__hasDirtyProject ? window.__hasDirtyProject() : false'
      );
      if (hasUnsaved) {
        const { response } = await dialog.showMessageBox(win, {
          type: 'warning',
          buttons: ['保存', '不保存', '取消'],
          defaultId: 0,
          cancelId: 2,
          title: '未保存的修改',
          message: '项目有未保存的修改，是否保存？',
        });
        if (response === 2) return;
        if (response === 0) {
          await win.webContents.executeJavaScript('window.__saveCurrentProject()');
        }
      }
    } catch { /* renderer already destroyed */ }
    win.destroy();
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
    const fullPath = path.resolve(path.join(base, filePath));
    const resolvedBase = path.resolve(base);
    if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(fullPath).toString());
  });
  createWindow();
});
