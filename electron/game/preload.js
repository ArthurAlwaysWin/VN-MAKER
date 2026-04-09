/**
 * Game Preload — Exposes minimal IPC bridge for exported game runtime.
 * Only game-runtime channels are whitelisted. No file upload, no project management.
 */
import { ipcRenderer, contextBridge } from 'electron';

const ALLOWED_CHANNELS = [
  'save-slot', 'load-slot', 'delete-slot', 'list-saves',
  'save-quickslot', 'load-quickslot',
  'capture-screenshot', 'set-window-mode',
];

// Environment flag — checked by assetPath.js detectEnvironment()
// BEFORE the ipcRenderer check, so desktop is distinguished from editor.
contextBridge.exposeInMainWorld('__DESKTOP_GAME', true);

// IPC bridge — matches editor's window.ipcRenderer.invoke interface.
// Game runtime only uses invoke (request-response). No send/on needed.
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...data) => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...data);
  },
});
