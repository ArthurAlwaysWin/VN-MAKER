import { ipcMain as a, BrowserWindow as u, app as c, protocol as P, net as m } from "electron";
import e from "node:path";
import { fileURLToPath as _, pathToFileURL as w } from "node:url";
import s from "node:fs/promises";
const h = e.dirname(_(import.meta.url));
a.handle("read-dir", async (o, t) => {
  try {
    const r = e.join(process.env.APP_ROOT, t);
    return (await s.readdir(r, { withFileTypes: !0 })).map((n) => ({ name: n.name, isDirectory: n.isDirectory() }));
  } catch (r) {
    return console.error("Failed to read dir:", r), [];
  }
});
a.handle("read-script", async () => {
  try {
    const o = e.join(process.env.APP_ROOT, "public/game/script.json"), t = await s.readFile(o, "utf-8");
    return JSON.parse(t);
  } catch (o) {
    return console.error("Failed to read script.json:", o), null;
  }
});
a.handle("save-script", async (o, t) => {
  try {
    const r = e.join(process.env.APP_ROOT, "public/game/script.json");
    return await s.writeFile(r, JSON.stringify(t, null, 2), "utf-8"), !0;
  } catch (r) {
    return console.error("Failed to save script.json:", r), !1;
  }
});
a.handle("upload-asset", async (o, { category: t, name: r, data: p }) => {
  try {
    const n = e.join(process.env.APP_ROOT, "public/game", t);
    await s.mkdir(n, { recursive: !0 });
    const f = e.join(n, r);
    return await s.writeFile(f, Buffer.from(p)), !0;
  } catch (n) {
    return console.error("Failed to upload asset:", n), !1;
  }
});
let i = null;
a.handle("open-preview", () => {
  if (i) {
    i.focus();
    return;
  }
  i = new u({
    width: 1280,
    height: 720,
    autoHideMenuBar: !0
  }), process.env.VITE_DEV_SERVER_URL ? i.loadURL(process.env.VITE_DEV_SERVER_URL + "index.html") : i.loadFile(e.join(process.env.APP_ROOT, "dist/index.html")), i.on("closed", () => {
    i = null;
  });
});
process.env.APP_ROOT = e.join(h, "..");
const d = process.env.VITE_DEV_SERVER_URL, y = e.join(process.env.APP_ROOT, "dist-electron"), R = e.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = d ? e.join(process.env.APP_ROOT, "public") : R;
let l;
function v() {
  l = new u({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: e.join(h, "preload.js")
    }
  }), d ? l.loadURL(d + "editor.html") : l.loadFile(e.join(R, "editor.html"));
}
c.on("window-all-closed", () => {
  process.platform !== "darwin" && (c.quit(), l = null);
});
c.whenReady().then(() => {
  P.handle("asset", (o) => {
    const t = decodeURIComponent(o.url.replace("asset://", "")), r = e.join(process.env.APP_ROOT, "public/game", t);
    return m.fetch(w(r).toString());
  }), v();
});
export {
  y as MAIN_DIST,
  R as RENDERER_DIST,
  d as VITE_DEV_SERVER_URL
};
