"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (channel, ...data) => {
    electron.ipcRenderer.send(channel, ...data);
  },
  invoke: (channel, ...data) => {
    return electron.ipcRenderer.invoke(channel, ...data);
  },
  on: (channel, func) => {
    const subscription = (event, ...args) => func(event, ...args);
    electron.ipcRenderer.on(channel, subscription);
    return () => electron.ipcRenderer.removeListener(channel, subscription);
  }
});
