import { ipcMain, BrowserWindow, app, protocol, net } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs/promises";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
ipcMain.handle("read-dir", async (event, dirPath) => {
  try {
    const fullPath = path.join(process.env.APP_ROOT, dirPath);
    const files = await fs.readdir(fullPath, { withFileTypes: true });
    return files.map((f) => ({ name: f.name, isDirectory: f.isDirectory() }));
  } catch (e) {
    console.error("Failed to read dir:", e);
    return [];
  }
});
ipcMain.handle("read-script", async () => {
  try {
    const filePath = path.join(process.env.APP_ROOT, "public/game/script.json");
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to read script.json:", e);
    return null;
  }
});
ipcMain.handle("save-script", async (event, data) => {
  try {
    const filePath = path.join(process.env.APP_ROOT, "public/game/script.json");
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Failed to save script.json:", e);
    return false;
  }
});
ipcMain.handle("upload-asset", async (event, { category, name, data }) => {
  try {
    const dir = path.join(process.env.APP_ROOT, "public/game", category);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, name);
    await fs.writeFile(filePath, Buffer.from(data));
    return true;
  } catch (e) {
    console.error("Failed to upload asset:", e);
    return false;
  }
});
let previewWin = null;
ipcMain.handle("open-preview", () => {
  if (previewWin) {
    previewWin.focus();
    return;
  }
  previewWin = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true
  });
  if (process.env["VITE_DEV_SERVER_URL"]) {
    previewWin.loadURL(process.env["VITE_DEV_SERVER_URL"] + "index.html");
  } else {
    previewWin.loadFile(path.join(process.env.APP_ROOT, "dist/index.html"));
  }
  previewWin.on("closed", () => {
    previewWin = null;
  });
});
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js")
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + "editor.html");
  } else {
    win.loadFile(path.join(RENDERER_DIST, "editor.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.whenReady().then(() => {
  protocol.handle("asset", (request) => {
    const filePath = decodeURIComponent(request.url.replace("asset://", ""));
    const fullPath = path.join(process.env.APP_ROOT, "public/game", filePath);
    return net.fetch(pathToFileURL(fullPath).toString());
  });
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
