import { ipcRenderer, contextBridge, webUtils } from 'electron';

// Expose safe ipcRenderer to the Vue app
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, ...data) => {
    ipcRenderer.send(channel, ...data);
  },
  invoke: (channel, ...data) => {
    return ipcRenderer.invoke(channel, ...data);
  },
  on: (channel, func) => {
    const subscription = (event, ...args) => func(event, ...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
});

// Expose webUtils for getting native file paths from File objects
contextBridge.exposeInMainWorld('getPathForFile', (file) => {
  return webUtils.getPathForFile(file);
});
