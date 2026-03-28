import { ipcRenderer, contextBridge } from 'electron';

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
