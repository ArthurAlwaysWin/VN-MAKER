/**
 * Game Main Process — Standalone exported game runtime.
 * Created by Galgame Maker export pipeline.
 *
 * This file uses only Electron built-in modules and Node.js standard library.
 * Zero external dependencies — the exported game needs no node_modules.
 */
import { app, BrowserWindow, ipcMain, screen, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Game Configuration (baked at export time by Phase 33) ──
const GAME_TITLE = 'My Game';
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

// ─── Path Helpers ───────────────────────────────────────────

/**
 * Sanitize game title for filesystem use (D-05).
 * Replaces path separators and characters illegal on Windows.
 * @param {string} title
 * @returns {string}
 */
function sanitizeTitle(title) {
  return title.replace(/[<>:"|?*\\/]/g, '_').trim() || 'Untitled';
}

const userDataDir = path.join(
  app.getPath('userData'),
  'GalgameMaker',
  sanitizeTitle(GAME_TITLE)
);
const savesDir = path.join(userDataDir, 'saves');
const windowStatePath = path.join(userDataDir, 'window-state.json');
const crashLogPath = path.join(userDataDir, 'crash.log');

/**
 * Validate that a resolved path stays within the saves directory.
 * Game equivalent of editor's isInsideProject().
 * @param {string} fullPath
 * @returns {boolean}
 */
function isInsideSaves(fullPath) {
  const resolved = path.resolve(fullPath);
  const savesResolved = path.resolve(savesDir);
  return resolved.startsWith(savesResolved + path.sep) || resolved === savesResolved;
}

// ─── Atomic File Write (Windows-safe, async) ────────────────

/**
 * Write file atomically: write to .tmp → rename .bak → rename .tmp → delete .bak.
 * Same proven pattern as electron/main.js line 68-75.
 * @param {string} filePath
 * @param {string} content
 */
async function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp';
  const bak = filePath + '.bak';
  await fs.writeFile(tmp, content, 'utf-8');
  try { await fs.rename(filePath, bak); } catch {}
  try {
    await fs.rename(tmp, filePath);
  } catch (err) {
    try { await fs.rename(bak, filePath); } catch {}
    try { await fs.unlink(tmp); } catch {}
    throw err;
  }
  try { await fs.unlink(bak); } catch {}
}

function isValidSlot(slot) {
  return Number.isInteger(slot) && slot >= 1 && slot <= 108;
}

// ─── Crash Handler (D-08) ───────────────────────────────────

process.on('uncaughtException', (err) => {
  const timestamp = new Date().toISOString();
  const detail = err?.stack || err?.message || String(err ?? 'Unknown error');
  const entry = `[${timestamp}] ${detail}\n`;
  try {
    mkdirSync(path.dirname(crashLogPath), { recursive: true });
    let existing = '';
    try { existing = readFileSync(crashLogPath, 'utf-8'); } catch {}
    const combined = existing + entry;
    // Simple rotation: keep last 100KB
    const MAX_SIZE = 100 * 1024;
    const trimmed = combined.length > MAX_SIZE
      ? combined.slice(combined.length - MAX_SIZE)
      : combined;
    writeFileSync(crashLogPath, trimmed, 'utf-8');
  } catch { /* last resort — can't even write crash log */ }
  dialog.showErrorBox('游戏错误', `发生了一个错误：\n${err.message}`);
});

// ─── Window State Persistence (D-02) ────────────────────────

let mainWindow = null;
let saveStateTimeout = null;

/**
 * Load saved window state with monitor bounds validation.
 * If saved position is off-screen (disconnected monitor), falls back to defaults.
 * @param {number} defaultWidth
 * @param {number} defaultHeight
 * @returns {{ width: number, height: number, x?: number, y?: number, mode?: string }}
 */
function loadWindowState(defaultWidth, defaultHeight) {
  try {
    const raw = readFileSync(windowStatePath, 'utf-8');
    const state = JSON.parse(raw);
    if (typeof state.width !== 'number' || typeof state.height !== 'number') {
      return { width: defaultWidth, height: defaultHeight };
    }
    // Validate position against connected displays
    if (typeof state.x === 'number' && typeof state.y === 'number') {
      const display = screen.getDisplayMatching({
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
      });
      const bounds = display.workArea;
      if (
        state.x >= bounds.x &&
        state.y >= bounds.y &&
        state.x + state.width <= bounds.x + bounds.width &&
        state.y + state.height <= bounds.y + bounds.height
      ) {
        return state;
      }
    }
  } catch { /* no saved state or corrupt — use defaults */ }
  return { width: defaultWidth, height: defaultHeight };
}

/**
 * Debounced window state save — 500ms debounce.
 * Writes position, size, and window mode to window-state.json.
 * @param {BrowserWindow} win
 */
function scheduleStateSave(win) {
  clearTimeout(saveStateTimeout);
  saveStateTimeout = setTimeout(() => {
    if (win.isDestroyed()) return;
    const bounds = win.getBounds();
    const state = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      mode: win.isFullScreen() ? 'fullscreen' : 'windowed',
    };
    try {
      mkdirSync(path.dirname(windowStatePath), { recursive: true });
      writeFileSync(windowStatePath, JSON.stringify(state), 'utf-8');
    } catch { /* non-critical — ignore */ }
  }, 500);
}

// ─── App Ready ──────────────────────────────────────────────

app.whenReady().then(async () => {
  // Ensure saves directory exists before any IPC handler runs
  await fs.mkdir(savesDir, { recursive: true });

  const state = loadWindowState(GAME_WIDTH, GAME_HEIGHT);
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(typeof state.x === 'number' && typeof state.y === 'number'
      ? { x: state.x, y: state.y }
      : {}),
    title: GAME_TITLE,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  // D-07: No DevTools in exported game
  win.webContents.on('devtools-opened', () => {
    win.webContents.closeDevTools();
  });

  // Window state tracking (debounced)
  win.on('resize', () => scheduleStateSave(win));
  win.on('move', () => scheduleStateSave(win));

  // Restore fullscreen if that was the last mode (D-02)
  if (state.mode === 'fullscreen') {
    win.setFullScreen(true);
  }

  win.loadFile(path.join(__dirname, 'index.html'));

  // ─── Save Slot IPC (RUNTIME-02) ───────────────────────

  ipcMain.handle('save-slot', async (event, { slot, state, previewText, thumbnail }) => {
    try {
      if (!isValidSlot(slot)) return { success: false, error: 'Invalid slot number' };
      await fs.mkdir(savesDir, { recursive: true });
      const padded = String(slot).padStart(3, '0');
      const jsonPath = path.join(savesDir, `slot_${padded}.json`);
      const jpgPath = path.join(savesDir, `slot_${padded}.jpg`);
      if (!isInsideSaves(jsonPath)) return { success: false, error: 'Invalid path' };

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
      if (!isValidSlot(slot)) return { success: false, error: 'Invalid slot number' };
      const padded = String(slot).padStart(3, '0');
      const jsonPath = path.join(savesDir, `slot_${padded}.json`);
      if (!isInsideSaves(jsonPath)) return { success: false, error: 'Invalid path' };
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
      if (!isValidSlot(slot)) return { success: false, error: 'Invalid slot number' };
      const padded = String(slot).padStart(3, '0');
      const jsonPath = path.join(savesDir, `slot_${padded}.json`);
      const jpgPath = path.join(savesDir, `slot_${padded}.jpg`);
      if (!isInsideSaves(jsonPath)) return { success: false, error: 'Invalid path' };
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
          } catch { return null; }
        });
      const results = await Promise.all(readPromises);
      return { success: true, data: results.filter(Boolean) };
    } catch (e) {
      console.error('[list-saves] Failed:', e);
      return { success: false, error: e.message };
    }
  });

  // ─── Quicksave IPC ────────────────────────────────────

  ipcMain.handle('save-quickslot', async (event, { state, previewText, thumbnail }) => {
    try {
      await fs.mkdir(savesDir, { recursive: true });
      const jsonPath = path.join(savesDir, 'quicksave.json');
      const jpgPath = path.join(savesDir, 'quicksave.jpg');

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
      const jsonPath = path.join(savesDir, 'quicksave.json');
      const raw = await fs.readFile(jsonPath, 'utf-8');
      return { success: true, data: JSON.parse(raw) };
    } catch (e) {
      if (e.code === 'ENOENT') return { success: true, data: null };
      console.error('[load-quickslot] Failed:', e);
      return { success: false, error: e.message };
    }
  });

  // ─── Screenshot IPC ───────────────────────────────────

  ipcMain.handle('capture-screenshot', async () => {
    try {
      if (!mainWindow) return { success: false, error: 'No window available' };
      const image = await mainWindow.webContents.capturePage();
      const resized = image.resize({ width: 320, height: 180 });
      const jpegBuffer = resized.toJPEG(80);
      return { success: true, data: jpegBuffer };
    } catch (e) {
      console.error('[capture-screenshot] Failed:', e);
      return { success: false, error: e.message };
    }
  });

  // ─── Window Mode IPC (RUNTIME-03) ─────────────────────

  ipcMain.handle('set-window-mode', (event, mode) => {
    if (!mainWindow) return;
    switch (mode) {
      case 'fullscreen':
        mainWindow.setFullScreen(true);
        break;
      case 'borderless': {
        mainWindow.setFullScreen(false);
        // ESM import at top — NOT require('electron') like editor (Pitfall #5)
        const bounds = screen.getPrimaryDisplay().bounds;
        mainWindow.setBounds(bounds);
        break;
      }
      case 'windowed':
      default:
        if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
        mainWindow.setSize(GAME_WIDTH, GAME_HEIGHT);
        mainWindow.center();
        break;
    }
    // Persist mode change immediately (D-02)
    scheduleStateSave(mainWindow);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
