import { app, BrowserWindow, ipcMain, protocol, net, dialog, shell, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { validateAssetFormat, getSupportedFormats, checkImageAlpha } from './validateAsset.js';
import { exportGame } from './exportGame.js';
import { exportDesktop } from './exportDesktop.js';
import { preflightThemePackage } from './themePackagePreflight.js';
import { installThemePackage } from './themePackageInstaller.js';
import { exportThemePackage } from './themePackageExporter.js';
import {
  createDefaultPlayerProfile,
  normalizePlayerProfile,
} from '../src/engine/PlayerDataRepository.js';
import { createDefaultGalgameScript, ensureGalgameContract } from '../src/shared/galgameContract.js';
import { migrateLegacyAppliedThemeData } from '../src/shared/themeLegacyMigrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register asset:// as privileged scheme (must be before app.whenReady)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'asset',
    privileges: { standard: true, supportFetchAPI: true, stream: true, bypassCSP: true },
  },
]);

let currentProjectPath = null;
let win;

function getMainWindow() {
  return win || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

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

const ASSET_CATEGORIES = new Set(['backgrounds', 'characters', 'audio', 'fonts', 'ui']);
const dialogGrantedFilePaths = new Set();
const dialogGrantedDirectoryPaths = new Set();
const grantedProjectPaths = new Set();

function isInsidePath(fullPath, basePath) {
  const resolved = path.resolve(fullPath);
  const baseResolved = path.resolve(basePath);
  return resolved === baseResolved || resolved.startsWith(baseResolved + path.sep);
}

function isInsideProject(fullPath) {
  if (!currentProjectPath) return false;
  return isInsidePath(fullPath, currentProjectPath);
}

function normalizeAssetCategory(category) {
  const value = String(category ?? '');
  return ASSET_CATEGORIES.has(value) ? value : null;
}

function isSafeFilename(filename) {
  const value = String(filename ?? '');
  return value.length > 0
    && value === path.basename(value)
    && !value.includes('/')
    && !value.includes('\\');
}

function getAssetsRoot() {
  if (!currentProjectPath) return null;
  return path.join(currentProjectPath, 'assets');
}

function getAssetCategoryDir(category) {
  const normalized = normalizeAssetCategory(category);
  const assetsRoot = getAssetsRoot();
  if (!normalized || !assetsRoot) return null;
  const dir = path.join(assetsRoot, normalized);
  return isInsidePath(dir, assetsRoot) ? dir : null;
}

function getAssetFilePath(category, filename) {
  const dir = getAssetCategoryDir(category);
  if (!dir || !isSafeFilename(filename)) return null;
  const fullPath = path.join(dir, filename);
  return isInsidePath(fullPath, dir) ? fullPath : null;
}

function getAssetRelativePath(filePath) {
  const assetsRoot = getAssetsRoot();
  if (!assetsRoot || !isInsidePath(filePath, assetsRoot)) return null;

  const relative = path.relative(assetsRoot, filePath).replace(/\\/g, '/');
  const parts = relative.split('/');
  if (parts.length !== 2 || parts.some(part => !part) || parts.includes('..')) return null;
  if (!normalizeAssetCategory(parts[0]) || !isSafeFilename(parts[1])) return null;
  return relative;
}

function rememberDialogFilePath(filePath) {
  if (filePath) {
    dialogGrantedFilePaths.add(path.resolve(filePath));
  }
}

function hasDialogFileGrant(filePath) {
  if (!filePath) return false;
  return dialogGrantedFilePaths.has(path.resolve(filePath));
}

function rememberDialogDirectoryPath(dirPath) {
  if (dirPath) {
    dialogGrantedDirectoryPaths.add(path.resolve(dirPath));
  }
}

function hasDialogDirectoryGrant(dirPath) {
  if (!dirPath) return false;
  return dialogGrantedDirectoryPaths.has(path.resolve(dirPath));
}

function isInsideDialogGrantedDirectory(targetPath) {
  if (!targetPath) return false;
  return [...dialogGrantedDirectoryPaths].some((grantedPath) => isInsidePath(targetPath, grantedPath));
}

function rememberProjectPath(projectPath) {
  if (projectPath) {
    grantedProjectPaths.add(path.resolve(projectPath));
  }
}

function hasProjectGrant(projectPath) {
  if (!projectPath) return false;
  return grantedProjectPaths.has(path.resolve(projectPath));
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
  try {
    await fs.rename(tmp, filePath);
  } catch (err) {
    // rename failed — restore backup and clean up temp, then rethrow
    try { await fs.rename(bak, filePath); } catch {}
    try { await fs.unlink(tmp); } catch {}
    throw err;
  }
  try { await fs.unlink(bak); } catch {}
}

// --- Unique Filename (auto-naming collision resolution) ---

async function uniqueFilename(dir, originalName) {
  const { name, ext } = path.parse(originalName);
  const existing = await fs.readdir(dir).catch(() => []);
  let candidate = originalName;
  let counter = 1;
  while (existing.includes(candidate)) {
    candidate = `${name}-${counter}${ext}`;
    counter++;
  }
  return candidate;
}

// --- Default Script Template ---

function defaultScript() {
  return createDefaultGalgameScript();
}

function getPlayerDataDir(projectPath = currentProjectPath) {
  return path.join(projectPath, 'player-data');
}

function getPlayerProfilePath(projectPath = currentProjectPath) {
  return path.join(getPlayerDataDir(projectPath), 'profile.json');
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeJsonAtomic(filePath, data) {
  await atomicWrite(filePath, JSON.stringify(data, null, 2));
}

async function getProjectScriptFileState(projectPath = currentProjectPath) {
  if (!projectPath) {
    return null;
  }

  const scriptPath = path.join(projectPath, 'script.json');
  try {
    const scriptStat = await fs.stat(scriptPath);
    return {
      path: scriptPath,
      mtimeMs: scriptStat.mtimeMs,
      size: scriptStat.size,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function isSameFileState(left, right) {
  if (!left || !right) {
    return false;
  }
  return left.mtimeMs === right.mtimeMs && left.size === right.size;
}

async function ensurePlayerProfile(projectId, projectPath = currentProjectPath) {
  const playerDataDir = getPlayerDataDir(projectPath);
  await fs.mkdir(playerDataDir, { recursive: true });
  const profilePath = getPlayerProfilePath(projectPath);
  const existingProfile = await readJsonIfExists(profilePath);
  const normalizedProfile = normalizePlayerProfile(projectId, existingProfile);

  if (JSON.stringify(existingProfile) !== JSON.stringify(normalizedProfile)) {
    await writeJsonAtomic(profilePath, normalizedProfile);
  }

  return normalizedProfile;
}

async function resetSaveArtifacts(projectPath = currentProjectPath) {
  const savesDir = path.join(projectPath, 'saves');
  await fs.mkdir(savesDir, { recursive: true });
  const files = await fs.readdir(savesDir);

  await Promise.all(files.map(async (file) => {
    if (
      /^slot_\d{3}\.(json|jpg)$/.test(file)
      || file === 'quicksave.json'
      || file === 'quicksave.jpg'
      || file === '.migrated'
    ) {
      await fs.unlink(path.join(savesDir, file)).catch(() => {});
    }
  }));
}

async function rebuildPlayerData(projectId, projectPath = currentProjectPath) {
  const scriptPath = path.join(projectPath, 'script.json');
  const rawScript = await readJsonIfExists(scriptPath);
  const normalizedScript = ensureGalgameContract(rawScript ?? defaultScript());

  if (JSON.stringify(rawScript) !== JSON.stringify(normalizedScript)) {
    await writeJsonAtomic(scriptPath, normalizedScript);
  }

  const resolvedProjectId = projectId || normalizedScript.projectId;
  const profile = await ensurePlayerProfile(resolvedProjectId, projectPath);
  return {
    script: normalizedScript,
    profile,
  };
}

// --- IPC Handlers ---

ipcMain.handle('create-project', async (event, { name, author, location, resolution, template }) => {
  try {
    if (!hasDialogDirectoryGrant(location)) {
      return { success: false, error: 'Invalid project location' };
    }
    const safeName = sanitizeProjectName(name);
    const projectDir = path.join(location, safeName);
    if (existsSync(projectDir)) {
      return { success: false, error: 'Project directory already exists' };
    }
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'backgrounds'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'characters'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'audio'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'ui'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'fonts'), { recursive: true });

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
    scriptData = ensureGalgameContract(scriptData);
    await fs.writeFile(path.join(projectDir, 'script.json'), JSON.stringify(scriptData, null, 2), 'utf-8');

    rememberProjectPath(projectDir);
    await addToRecent(projectDir, name);
    return { success: true, path: projectDir };
  } catch (e) {
    console.error('Failed to create project:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('open-project', async () => {
  const result = await dialog.showOpenDialog(getMainWindow(), {
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

  rememberProjectPath(dir);
  return { success: true, path: dir, needsMigration: !hasProject && hasScript };
});

ipcMain.handle('load-project', async (event, projectPath) => {
  try {
    if (!hasProjectGrant(projectPath)) {
      return { success: false, error: 'Invalid project path' };
    }
    projectPath = path.resolve(projectPath);
    let projectData;
    let scriptData;
    let scriptChanged = false;
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

    const migratedThemeData = migrateLegacyAppliedThemeData(scriptData);
    if (migratedThemeData.changed) {
      scriptData = migratedThemeData.script;
      scriptChanged = true;
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
      scriptChanged = true;
      await fs.writeFile(projectJsonPath, JSON.stringify(projectData, null, 2), 'utf-8');
      for (const sub of ['backgrounds', 'characters', 'audio', 'ui']) {
        await fs.mkdir(path.join(projectPath, 'assets', sub), { recursive: true });
      }
    }

    const normalizedScriptData = ensureGalgameContract(scriptData);
    if (JSON.stringify(normalizedScriptData) !== JSON.stringify(scriptData)) {
      scriptChanged = true;
    }
    scriptData = normalizedScriptData;

    if (scriptChanged && existsSync(scriptJsonPath)) {
      await fs.writeFile(scriptJsonPath, JSON.stringify(scriptData, null, 2), 'utf-8');
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

    // D-08: Auto-create fonts/ directory for legacy projects
     await fs.mkdir(path.join(projectPath, 'assets', 'fonts'), { recursive: true });

     // SAVE-08: Auto-create saves/ directory on project open
     await fs.mkdir(path.join(projectPath, 'saves'), { recursive: true });
     await fs.mkdir(getPlayerDataDir(projectPath), { recursive: true });

     await addToRecent(projectPath, projectData.name);
     return {
       success: true,
       project: projectData,
       script: scriptData,
       path: projectPath,
       scriptFileState: await getProjectScriptFileState(projectPath),
     };
  } catch (e) {
    console.error('Failed to load project:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-project', async (event, { project, script, expectedScriptFileState }) => {
  if (!currentProjectPath) return { success: false, error: 'No project loaded' };
  try {
    const currentScriptFileState = await getProjectScriptFileState();
    if (expectedScriptFileState && !isSameFileState(expectedScriptFileState, currentScriptFileState)) {
      return {
        success: false,
        conflict: true,
        error: 'script.json changed on disk after this project was loaded.',
        scriptFileState: currentScriptFileState,
        expectedScriptFileState,
      };
    }

    project.lastModified = new Date().toISOString();
    const normalizedScript = ensureGalgameContract(script);
    await atomicWrite(path.join(currentProjectPath, 'project.json'), JSON.stringify(project, null, 2));
    await atomicWrite(path.join(currentProjectPath, 'script.json'), JSON.stringify(normalizedScript, null, 2));
    return { success: true, scriptFileState: await getProjectScriptFileState() };
  } catch (e) {
    console.error('Failed to save project:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('check-project-file-state', async () => {
  try {
    if (!currentProjectPath) {
      return { success: false, error: 'No project loaded' };
    }
    return {
      success: true,
      scriptFileState: await getProjectScriptFileState(),
    };
  } catch (e) {
    console.error('Failed to check project file state:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('read-project-script-for-conflict', async () => {
  try {
    if (!currentProjectPath) {
      return { success: false, error: 'No project loaded' };
    }
    const scriptPath = path.join(currentProjectPath, 'script.json');
    return {
      success: true,
      script: ensureGalgameContract(JSON.parse(await fs.readFile(scriptPath, 'utf-8'))),
      scriptFileState: await getProjectScriptFileState(),
    };
  } catch (e) {
    console.error('Failed to read external script for conflict review:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('read-agent-handoff', async () => {
  try {
    if (!currentProjectPath) {
      return { success: false, error: 'No project loaded' };
    }

    const handoffPath = path.join(currentProjectPath, 'agent-handoff.json');
    if (!isInsideProject(handoffPath) || !existsSync(handoffPath)) {
      return { success: true, handoff: null, path: handoffPath };
    }

    const handoff = JSON.parse(await fs.readFile(handoffPath, 'utf-8'));
    return { success: true, handoff, path: handoffPath };
  } catch (e) {
    console.error('Failed to read agent handoff:', e);
    return { success: false, error: e.message };
  }
});

function normalizeAgentReviewState(payload = {}) {
  const items = {};
  for (const [key, value] of Object.entries(payload.items ?? {})) {
    if (
      typeof key === 'string'
      && value
      && ['acknowledged', 'resolved'].includes(value.status)
    ) {
      items[key] = {
        status: value.status,
        updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
      };
    }
  }
  return {
    kind: 'agent-handoff-review-state',
    version: 1,
    handoffCreatedAt: typeof payload.handoffCreatedAt === 'string' ? payload.handoffCreatedAt : null,
    updatedAt: new Date().toISOString(),
    items,
  };
}

ipcMain.handle('read-agent-review-state', async (event, { handoffCreatedAt } = {}) => {
  try {
    if (!currentProjectPath) {
      return { success: false, error: 'No project loaded' };
    }
    const statePath = path.join(currentProjectPath, 'agent-review-state.json');
    if (!isInsideProject(statePath) || !existsSync(statePath)) {
      return { success: true, state: null, path: statePath };
    }
    const state = normalizeAgentReviewState(JSON.parse(await fs.readFile(statePath, 'utf-8')));
    if (state.handoffCreatedAt !== (handoffCreatedAt ?? null)) {
      return { success: true, state: null, path: statePath };
    }
    return { success: true, state, path: statePath };
  } catch (e) {
    console.error('Failed to read agent review state:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('write-agent-review-state', async (event, payload = {}) => {
  try {
    if (!currentProjectPath) {
      return { success: false, error: 'No project loaded' };
    }
    const statePath = path.join(currentProjectPath, 'agent-review-state.json');
    if (!isInsideProject(statePath)) {
      return { success: false, error: 'Invalid agent review state path' };
    }
    const state = normalizeAgentReviewState(payload);
    await atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
    return { success: true, state, path: statePath };
  } catch (e) {
    console.error('Failed to write agent review state:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('read-dir', async (event, relativePath) => {
  try {
    if (!currentProjectPath) return [];
    const normalized = String(relativePath ?? '').replace(/\\/g, '/');
    const match = /^assets\/([^/]+)$/.exec(normalized);
    if (!match) return [];
    const fullPath = getAssetCategoryDir(match[1]);
    if (!fullPath) return [];
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    return files.map(f => ({ name: f.name, isDirectory: f.isDirectory() }));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('upload-asset', async (event, { category, name, data }) => {
  try {
    if (!currentProjectPath) return false;
    const normalizedCategory = normalizeAssetCategory(category);
    const dir = getAssetCategoryDir(normalizedCategory);
    const fullPath = getAssetFilePath(normalizedCategory, name);
    if (!dir || !fullPath) return false;
    const buffer = Buffer.from(data);
    const validation = validateAssetFormat(buffer.subarray(0, 32), path.extname(name), normalizedCategory);
    if (!validation.valid) return false;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return true;
  } catch (e) {
    console.error('Failed to upload asset:', e);
    return false;
  }
});

// ─── Asset Library IPC Handlers ───────────────────────────────────────

ipcMain.handle('select-asset', async (event, { types }) => {
  try {
    if (!currentProjectPath) return null;

    const filterMap = {
      backgrounds: { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
      characters: { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
      audio: { name: '音频', extensions: ['mp3', 'ogg', 'wav', 'm4a', 'mp4', 'aac'] },
      fonts: { name: '字体', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
      ui: { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
    };

    const categories = (Array.isArray(types) ? types : [])
      .map(normalizeAssetCategory)
      .filter(Boolean);
    const category = categories[0] || null;
    if (!category) return null;
    const filters = categories.map(t => filterMap[t]).filter(Boolean);
    const defaultDir = getAssetCategoryDir(category);

    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      filters,
      defaultPath: existsSync(defaultDir) ? defaultDir : currentProjectPath,
      title: '选择资源文件',
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const selectedPath = result.filePaths[0];
    const assetsBase = path.resolve(path.join(currentProjectPath, 'assets'));

    // If file is already inside project assets/, return relative path
    const resolvedSelected = path.resolve(selectedPath);
    if (isInsidePath(resolvedSelected, assetsBase)) {
      return getAssetRelativePath(resolvedSelected);
    }

    // File is outside project — copy it in with validation
    const fileBuffer = await fs.readFile(selectedPath);
    const ext = path.extname(selectedPath);
    const validation = validateAssetFormat(fileBuffer.subarray(0, 32), ext, category);
    if (!validation.valid) return null;

    const targetDir = getAssetCategoryDir(category);
    if (!targetDir) return null;
    await fs.mkdir(targetDir, { recursive: true });
    const safeName = await uniqueFilename(targetDir, path.basename(selectedPath));
    const destPath = getAssetFilePath(category, safeName);
    if (!destPath) return null;

    await fs.copyFile(selectedPath, destPath);
    return `${category}/${safeName}`;
  } catch (e) {
    console.error('[select-asset] Failed:', e);
    return null;
  }
});

ipcMain.handle('import-assets', async (event, { category, paths }) => {
  // paths: string[] — native file paths from renderer
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const normalizedCategory = normalizeAssetCategory(category);
    const dir = getAssetCategoryDir(normalizedCategory);
    if (!dir) return { success: false, error: 'Invalid path' };
    await fs.mkdir(dir, { recursive: true });

    const imported = [];
    const errors = [];

    for (const filePath of Array.isArray(paths) ? paths : []) {
      const name = path.basename(filePath);
      const ext = path.extname(name);

      // Validate format (D-03: magic bytes + extension) — read first 32 bytes (covers PNG IHDR for alpha check)
      let headerBytes;
      try {
        const fh = await fs.open(filePath, 'r');
        const buf = Buffer.alloc(32);
        await fh.read(buf, 0, 32, 0);
        await fh.close();
        headerBytes = buf;
      } catch (readErr) {
        errors.push({ name, reason: `无法读取文件: ${readErr.message}` });
        continue;
      }

      const validation = validateAssetFormat(headerBytes, ext, normalizedCategory);
      if (!validation.valid) {
        errors.push({ name, reason: validation.reason });
        continue; // D-02: skip invalid, continue with valid
      }

      // Auto-name if conflict (ASSET-04)
      const safeName = await uniqueFilename(dir, name);
      const fullPath = getAssetFilePath(normalizedCategory, safeName);

      if (!fullPath) {
        errors.push({ name, reason: 'Path security violation' });
        continue;
      }

      await fs.copyFile(filePath, fullPath);
      const item = { original: name, saved: safeName };

      // Check transparency for character sprites
      if (normalizedCategory === 'characters') {
        const { hasAlpha } = checkImageAlpha(headerBytes, ext);
        if (!hasAlpha) item.noAlpha = true;
      }

      imported.push(item);
    }

    return { success: true, imported, errors, supportedFormats: getSupportedFormats(normalizedCategory) };
  } catch (e) {
    console.error('[import-assets] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-asset', async (event, { category, filename }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const fullPath = getAssetFilePath(category, filename);
    if (!fullPath) return { success: false, error: 'Invalid path' };

    await fs.unlink(fullPath);
    return { success: true };
  } catch (e) {
    console.error('[delete-asset] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('rename-asset', async (event, { category, oldName, newName }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const oldPath = getAssetFilePath(category, oldName);
    const newPath = getAssetFilePath(category, newName);
    if (!oldPath || !newPath) return { success: false, error: 'Invalid path' };
    if (!existsSync(oldPath)) {
      return { success: false, error: 'File not found' };
    }
    if (existsSync(newPath) && oldName !== newName) {
      return { success: false, error: 'File already exists' };
    }

    await fs.rename(oldPath, newPath);
    return { success: true, newName };
  } catch (e) {
    console.error('[rename-asset] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-processed-image', async (event, { category, filename, dataBase64 }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const fullPath = getAssetFilePath(category, filename);
    if (!fullPath) return { success: false, error: 'Invalid path' };

    const buffer = Buffer.from(dataBase64, 'base64');
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_MAGIC)) {
      return { success: false, error: 'Invalid PNG data' };
    }

    await fs.writeFile(fullPath, buffer);
    return { success: true };
  } catch (e) {
    console.error('[save-processed-image] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('list-assets', async (event, { category }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const dir = getAssetCategoryDir(category);
    if (!dir) return { success: false, error: 'Invalid path' };

    if (!existsSync(dir)) return { success: true, files: [] };

    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter(e => !e.isDirectory())
      .map(e => e.name);

    return { success: true, files };
  } catch (e) {
    console.error('[list-assets] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-recent-projects', async () => {
  const recent = await readRecentProjects();
  for (const project of Array.isArray(recent.projects) ? recent.projects : []) {
    rememberProjectPath(project?.path);
  }
  return recent;
});

ipcMain.handle('close-project', () => {
  currentProjectPath = null;
});

// ─── Save System IPC ──────────────────────────────────────────────────

ipcMain.handle('load-player-profile', async (event, { projectId }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const profilePath = getPlayerProfilePath();
    if (!isInsideProject(profilePath)) return { success: false, error: 'Invalid path' };
    const profile = await readJsonIfExists(profilePath);
    if (!profile) {
      return { success: true, data: null };
    }
    return { success: true, data: normalizePlayerProfile(projectId || profile.projectId, profile) };
  } catch (e) {
    console.error('[load-player-profile] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-player-profile', async (event, { projectId, profile }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const profilePath = getPlayerProfilePath();
    if (!isInsideProject(profilePath)) return { success: false, error: 'Invalid path' };
    await fs.mkdir(getPlayerDataDir(), { recursive: true });
    const normalizedProfile = normalizePlayerProfile(projectId, profile);
    await writeJsonAtomic(profilePath, normalizedProfile);
    return { success: true, data: normalizedProfile };
  } catch (e) {
    console.error('[save-player-profile] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-slot', async (event, { slot, state, previewText, thumbnail }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    if (!Number.isInteger(slot) || slot < 1 || slot > 108) {
      return { success: false, error: 'Invalid slot number' };
    }
    const savesDir = path.join(currentProjectPath, 'saves');
    await fs.mkdir(savesDir, { recursive: true });
    const padded = String(slot).padStart(3, '0');
    const jsonPath = path.join(savesDir, `slot_${padded}.json`);
    const jpgPath = path.join(savesDir, `slot_${padded}.jpg`);
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };
    const data = {
      version: 2,
      state,
      previewText: previewText || '',
      sceneName: state?.currentScene || '',
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
    };
    await atomicWrite(jsonPath, JSON.stringify(data, null, 2));
    if (thumbnail) {
      await fs.writeFile(jpgPath, thumbnail);
    }
    return { success: true };
  } catch (e) {
    console.error('[save-slot] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-slot', async (event, { slot }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    if (!Number.isInteger(slot) || slot < 1 || slot > 108) {
      return { success: false, error: 'Invalid slot number' };
    }
    const padded = String(slot).padStart(3, '0');
    const jsonPath = path.join(currentProjectPath, 'saves', `slot_${padded}.json`);
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };
    const raw = await fs.readFile(jsonPath, 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  } catch (e) {
    if (e.code === 'ENOENT') return { success: true, data: null };
    console.error('[load-slot] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-slot', async (event, { slot }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    if (!Number.isInteger(slot) || slot < 1 || slot > 108) {
      return { success: false, error: 'Invalid slot number' };
    }
    const padded = String(slot).padStart(3, '0');
    const jsonPath = path.join(currentProjectPath, 'saves', `slot_${padded}.json`);
    const jpgPath = path.join(currentProjectPath, 'saves', `slot_${padded}.jpg`);
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };
    await fs.unlink(jsonPath).catch(() => {});
    await fs.unlink(jpgPath).catch(() => {});
    return { success: true };
  } catch (e) {
    console.error('[delete-slot] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('list-saves', async () => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const savesDir = path.join(currentProjectPath, 'saves');
    await fs.mkdir(savesDir, { recursive: true });
    const files = await fs.readdir(savesDir);
    const fileSet = new Set(files);
    const readPromises = files
      .filter(f => /^slot_\d{3}\.json$/.test(f))
      .map(async (file) => {
        try {
          const match = file.match(/^slot_(\d{3})\.json$/);
          const raw = await fs.readFile(path.join(savesDir, file), 'utf-8');
          const data = JSON.parse(raw);
          return {
            slot: parseInt(match[1], 10),
            previewText: data.previewText || '',
            sceneName: data.sceneName || data.state?.currentScene || '',
            timestamp: data.timestamp,
            date: data.date,
            hasThumbnail: fileSet.has(`slot_${match[1]}.jpg`),
          };
        } catch { return null; /* skip corrupt saves */ }
      });
    const results = await Promise.all(readPromises);
    return { success: true, data: results.filter(Boolean) };
  } catch (e) {
    console.error('[list-saves] Failed:', e);
    return { success: false, error: e.message };
  }
});

// ─── Quicksave IPC ──────────────────────────────────────────────────

ipcMain.handle('save-quickslot', async (event, { state, previewText, thumbnail }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const savesDir = path.join(currentProjectPath, 'saves');
    await fs.mkdir(savesDir, { recursive: true });
    const jsonPath = path.join(savesDir, 'quicksave.json');
    const jpgPath = path.join(savesDir, 'quicksave.jpg');
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };

    const data = {
      version: 2,
      state,
      previewText: previewText || '',
      sceneName: state?.currentScene || '',
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
    };

    await atomicWrite(jsonPath, JSON.stringify(data, null, 2));

    if (thumbnail) {
      await fs.writeFile(jpgPath, thumbnail);
    }

    return { success: true };
  } catch (e) {
    console.error('[save-quickslot] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('load-quickslot', async () => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const jsonPath = path.join(currentProjectPath, 'saves', 'quicksave.json');
    if (!isInsideProject(jsonPath)) return { success: false, error: 'Invalid path' };

    const raw = await fs.readFile(jsonPath, 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  } catch (e) {
    if (e.code === 'ENOENT') return { success: true, data: null };
    console.error('[load-quickslot] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('capture-screenshot', async () => {
  try {
    const targetWin = previewWin || getMainWindow();
    if (!targetWin) return { success: false, error: 'No window available' };
    const image = await targetWin.webContents.capturePage();
    const resized = image.resize({ width: 320, height: 180 });
    const jpegBuffer = resized.toJPEG(80);
    return { success: true, data: jpegBuffer };
  } catch (e) {
    console.error('[capture-screenshot] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('migrate-legacy-saves', async (event, { saves }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const savesDir = path.join(currentProjectPath, 'saves');
    await fs.mkdir(savesDir, { recursive: true });
    const migratedPath = path.join(savesDir, '.migrated');
    if (existsSync(migratedPath)) return { success: true, migrated: 0 };
    let count = 0;
    for (const { slot, data } of saves) {
      const padded = String(slot + 1).padStart(3, '0');
      const jsonPath = path.join(savesDir, `slot_${padded}.json`);
      if (!isInsideProject(jsonPath)) continue;
      const upgraded = {
        version: 2,
        state: data.state,
        previewText: data.previewText || '',
        sceneName: data.state?.currentScene || '',
        timestamp: data.timestamp,
        date: data.date,
      };
      await atomicWrite(jsonPath, JSON.stringify(upgraded, null, 2));
      count++;
    }
    await fs.writeFile(migratedPath, '', 'utf-8');
    return { success: true, migrated: count };
  } catch (e) {
    console.error('[migrate-legacy-saves] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reset-player-data', async (event, { scope, projectId }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    if (scope === 'contract') {
      const rebuilt = await rebuildPlayerData(projectId, currentProjectPath);
      return { success: true, data: rebuilt };
    }

    if (scope === 'profile' || scope === 'all') {
      const profilePath = getPlayerProfilePath();
      if (!isInsideProject(profilePath)) return { success: false, error: 'Invalid path' };
      await fs.unlink(profilePath).catch(() => {});
    }

    if (scope === 'saves' || scope === 'all') {
      await resetSaveArtifacts(currentProjectPath);
    }

    return { success: true };
  } catch (e) {
    console.error('[reset-player-data] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('rebuild-player-data', async (event, { projectId }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    const rebuilt = await rebuildPlayerData(projectId, currentProjectPath);
    return {
      success: true,
      data: {
        projectId: rebuilt.script.projectId,
        profile: rebuilt.profile,
      },
    };
  } catch (e) {
    console.error('[rebuild-player-data] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('set-window-mode', (event, mode) => {
  const w = getMainWindow();
  if (!w) return;
  switch (mode) {
    case 'fullscreen':
      w.setFullScreen(true);
      break;
    case 'borderless': {
      w.setFullScreen(false);
      const bounds = screen.getPrimaryDisplay().bounds;
      w.setBounds(bounds);
      break;
    }
    case 'windowed':
    default:
      if (w.isFullScreen()) w.setFullScreen(false);
      w.setSize(1280, 720);
      w.center();
      break;
  }
});

ipcMain.handle('show-save-dialog', async () => {
  const { response } = await dialog.showMessageBox(getMainWindow(), {
    type: 'warning',
    buttons: ['保存', '不保存', '取消'],
    defaultId: 0, cancelId: 2,
    title: '未保存的修改',
    message: '项目有未保存的修改，是否保存？'
  });
  return ['save', 'discard', 'cancel'][response];
});

ipcMain.handle('dialog-open-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openDirectory'],
      title: '选择保存位置'
    });
    if (result.canceled) return null;
    const selectedPath = result.filePaths[0];
    rememberDialogDirectoryPath(selectedPath);
    return selectedPath;
  } catch (err) {
    console.error('dialog-open-directory error:', err);
    return null;
  }
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
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

// ─── Theme Export/Import IPC ─────────────────────────────

ipcMain.handle('export-gmtheme', async (event, { metadata } = {}) => {
  try {
    if (!currentProjectPath) {
      return { success: false, error: 'No project loaded' };
    }
    const exported = await exportThemePackage({
      projectPath: currentProjectPath,
      metadata,
    });
    if (!exported.success) {
      return exported;
    }
    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: '导出主题',
      defaultPath: `${exported.themeId || 'theme'}.gmtheme`,
      filters: [{ name: '完整主题包', extensions: ['gmtheme'] }],
    });
    if (result.canceled) return { success: false, canceled: true };
    await fs.writeFile(result.filePath, Buffer.from(exported.buffer));
    return { success: true, path: result.filePath };
  } catch (e) {
    console.error('[export-gmtheme] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import-theme', async () => {
  try {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: '导入主题',
      filters: [{ name: '主题文件', extensions: ['gmtheme', 'theme'] }],
      properties: ['openFile'],
    });
    if (result.canceled) return { success: false, canceled: true };
    const selectedPath = result.filePaths[0];
    rememberDialogFilePath(selectedPath);
    return { success: true, filePath: selectedPath };
  } catch (e) {
    console.error('[import-theme] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('preflight-theme-package', async (event, { filePath }) => {
  try {
    if (!currentProjectPath) {
      return { success: false, error: 'No project loaded' };
    }
    if (!hasDialogFileGrant(filePath)) {
      return { success: false, error: 'Invalid theme package path' };
    }
    return await preflightThemePackage({
      filePath,
      projectPath: currentProjectPath,
    });
  } catch (e) {
    console.error('[preflight-theme-package] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('install-theme-package', async (event, payload) => {
  try {
    if (!currentProjectPath) {
      return { success: false, error: 'No project loaded' };
    }
    if (payload?.source === 'file' && !hasDialogFileGrant(payload.filePath)) {
      return { success: false, error: 'Invalid theme package path' };
    }
    return await installThemePackage({
      ...payload,
      projectPath: currentProjectPath,
    });
  } catch (e) {
    console.error('[install-theme-package] Failed:', e);
    return { success: false, error: e.message };
  }
});

// ─── Game Export IPC ─────────────────────────────────────

ipcMain.handle('export-game', async (event, options) => {
  try {
    if (!hasDialogDirectoryGrant(options?.outputDir)) {
      return { success: false, error: 'Invalid output directory' };
    }
    const safeOptions = {
      ...options,
      faviconPath: options?.faviconPath && hasDialogFileGrant(options.faviconPath)
        ? options.faviconPath
        : null,
    };
    const sendProgress = (payload) => {
      const mw = getMainWindow();
      if (mw && !mw.isDestroyed()) {
        mw.webContents.send('export-progress', payload);
      }
    };
    return await exportGame({
      ...safeOptions,
      projectPath: currentProjectPath,
    }, sendProgress);
  } catch (e) {
    console.error('[ExportGame] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('export-game-desktop', async (event, options) => {
  try {
    if (!hasDialogDirectoryGrant(options?.outputDir)) {
      return { success: false, error: 'Invalid output directory' };
    }
    const safeOptions = {
      ...options,
      iconPath: options?.iconPath && hasDialogFileGrant(options.iconPath)
        ? options.iconPath
        : null,
    };
    const sendProgress = (payload) => {
      const mw = getMainWindow();
      if (mw && !mw.isDestroyed()) {
        mw.webContents.send('export-progress', payload);
      }
    };
    return await exportDesktop({
      ...safeOptions,
      projectPath: currentProjectPath,
    }, sendProgress);
  } catch (e) {
    console.error('[ExportDesktop] Failed:', e);
    return { success: false, error: e.message };
  }
});

// ─── Export UI IPC ────────────────────────────────────────

ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    if (!isInsideDialogGrantedDirectory(folderPath)) {
      return { success: false, error: 'Invalid folder path' };
    }
    await shell.openPath(folderPath);
    return { success: true };
  } catch (e) {
    console.error('[open-folder] Failed:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('dialog-open-file', async (event, { title, filters }) => {
  try {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      title: title || '选择文件',
      filters: filters || [],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const selectedPath = result.filePaths[0];
    rememberDialogFilePath(selectedPath);
    return selectedPath;
  } catch (e) {
    console.error('[dialog-open-file] Failed:', e);
    return null;
  }
});

ipcMain.handle('read-file-base64', async (event, filePath) => {
  try {
    if (!hasDialogFileGrant(filePath)) return null;
    const data = await fs.readFile(filePath);
    return data.toString('base64');
  } catch (e) {
    console.error('[read-file-base64] Failed:', e);
    return null;
  }
});

// --- App Setup ---

process.env.APP_ROOT = path.join(__dirname, '..');
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  let closeInProgress = false;
  win.on('close', async (e) => {
    e.preventDefault();
    if (closeInProgress) return;
    closeInProgress = true;
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
        if (response === 2) {
          closeInProgress = false;
          return;
        }
        if (response === 0) {
          const saved = await win.webContents.executeJavaScript('window.__saveCurrentProject()');
          if (!saved) {
            closeInProgress = false;
            return;
          }
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
  protocol.handle('asset', async (request) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.hostname + url.pathname);

    // ─── saves/ prefix: resolve from project saves directory (SAVE-06) ───
    if (filePath.startsWith('saves/') || filePath.startsWith('saves\\')) {
      if (!currentProjectPath) {
        return new Response('No project loaded', { status: 404 });
      }
      const fullPath = path.resolve(path.join(currentProjectPath, filePath));
      const resolvedBase = path.resolve(path.join(currentProjectPath, 'saves'));
      if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(fullPath).toString());
    }

    // ─── Existing assets/ resolution (unchanged) ───
    const base = currentProjectPath
      ? path.join(currentProjectPath, 'assets')
      : path.join(process.env.APP_ROOT, 'public', 'game');
    const fullPath = path.resolve(path.join(base, filePath));
    const resolvedBase = path.resolve(base);
    if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
      return new Response('Forbidden', { status: 403 });
    }

    // Support Range requests for audio/video seeking & duration detection
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        return new Response('Not Found', { status: 404 });
      }
      const total = stat.size;
      const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
      if (match) {
        const start = parseInt(match[1], 10);
        const requestedEnd = match[2] ? parseInt(match[2], 10) : total - 1;
        if (total === 0 || start >= total || requestedEnd < start) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${total}` },
          });
        }
        const end = Math.min(requestedEnd, total - 1);
        const chunkSize = end - start + 1;
        const { createReadStream } = await import('node:fs');
        const stream = createReadStream(fullPath, { start, end });
        let closed = false;
        const onError = (err) => {
          if (!closed) { closed = true; controller.error(err); }
        };
        let controller;
        const readable = new ReadableStream({
          start(ctrl) {
            controller = ctrl;
            stream.on('data', (chunk) => {
              if (!closed) ctrl.enqueue(chunk);
            });
            stream.on('end', () => {
              if (!closed) { closed = true; ctrl.close(); }
            });
            stream.on('error', onError);
          },
          cancel() {
            closed = true;
            stream.off('error', onError);
            stream.destroy();
            stream.on('error', () => {}); // absorb destroy-triggered errors
          },
        });
        return new Response(readable, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Content-Length': String(chunkSize),
            'Accept-Ranges': 'bytes',
          },
        });
      }
    }

    try {
      return await net.fetch(pathToFileURL(fullPath).toString());
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });
  createWindow();
});
