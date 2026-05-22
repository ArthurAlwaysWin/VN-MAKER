import { ipcRenderer, contextBridge, webUtils } from 'electron';

// Whitelist of allowed IPC channels
const ALLOWED_CHANNELS = [
  'create-project', 'open-project', 'load-project', 'save-project', 'close-project',
  'read-agent-handoff', 'check-project-file-state',
  'read-dir', 'upload-asset', 'select-asset', 'import-assets', 'delete-asset',
  'rename-asset', 'save-processed-image', 'list-assets',
  'get-recent-projects', 'update-recent-projects',
  'save-slot', 'load-slot', 'delete-slot', 'list-saves',
  'save-quickslot', 'load-quickslot',
  'load-player-profile', 'save-player-profile', 'reset-player-data', 'rebuild-player-data',
  'capture-screenshot', 'migrate-legacy-saves',
  'set-window-mode', 'show-save-dialog', 'dialog-open-directory',
  'open-preview', 'export-gmtheme', 'import-theme', 'preflight-theme-package', 'install-theme-package',
  'export-game', 'export-game-desktop', 'export-progress',
  'open-folder', 'dialog-open-file', 'read-file-base64',
];

// Expose safe ipcRenderer to the Vue app
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, ...data) => {
    if (!ALLOWED_CHANNELS.includes(channel)) throw new Error(`Blocked IPC channel: ${channel}`);
    ipcRenderer.send(channel, ...data);
  },
  invoke: (channel, ...data) => {
    if (!ALLOWED_CHANNELS.includes(channel)) throw new Error(`Blocked IPC channel: ${channel}`);
    return ipcRenderer.invoke(channel, ...data);
  },
  on: (channel, func) => {
    if (!ALLOWED_CHANNELS.includes(channel)) throw new Error(`Blocked IPC channel: ${channel}`);
    const subscription = (event, ...args) => func(event, ...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});

// Expose webUtils for getting native file paths from File objects
contextBridge.exposeInMainWorld('getPathForFile', (file) => {
  return webUtils.getPathForFile(file);
});
