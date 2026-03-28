import { ipcMain as c, dialog as y, BrowserWindow as _, app as w, protocol as A, net as L } from "electron";
import t from "node:path";
import { fileURLToPath as M, pathToFileURL as x } from "node:url";
import i from "node:fs/promises";
import { existsSync as p } from "node:fs";
const P = t.dirname(M(import.meta.url));
let a = null;
function I() {
  return t.join(w.getPath("userData"), "recent-projects.json");
}
async function E() {
  try {
    const n = await i.readFile(I(), "utf-8");
    return JSON.parse(n);
  } catch {
    return { hasCreatedProject: !1, projects: [] };
  }
}
async function F(n) {
  await i.writeFile(I(), JSON.stringify(n, null, 2), "utf-8");
}
async function T(n, r) {
  const e = await E();
  e.projects = e.projects.filter((s) => s.path !== n), e.projects.unshift({ path: n, name: r, openedAt: (/* @__PURE__ */ new Date()).toISOString() }), e.projects.length > 20 && (e.projects = e.projects.slice(0, 20)), e.hasCreatedProject = !0, await F(e);
}
function N(n) {
  const r = t.resolve(n), e = t.resolve(a);
  return r.startsWith(e + t.sep) || r === e;
}
function C(n) {
  return n.replace(/[<>:"|?*\\/]/g, "_").replace(/\.{2,}/g, "_").trim() || "untitled";
}
async function D(n, r) {
  const e = n + ".tmp", s = n + ".bak";
  await i.writeFile(e, r, "utf-8");
  try {
    await i.rename(n, s);
  } catch {
  }
  await i.rename(e, n);
  try {
    await i.unlink(s);
  } catch {
  }
}
function V() {
  return {
    characters: {},
    scenes: {
      start: {
        name: "第一幕",
        commands: [
          { type: "dialogue", speaker: null, text: "故事从这里开始..." },
          { type: "end" }
        ]
      }
    }
  };
}
c.handle("create-project", async (n, { name: r, author: e, location: s, resolution: o, template: f }) => {
  try {
    const d = C(r), l = t.join(s, d);
    await i.mkdir(l, { recursive: !0 }), await i.mkdir(t.join(l, "assets", "backgrounds"), { recursive: !0 }), await i.mkdir(t.join(l, "assets", "characters"), { recursive: !0 }), await i.mkdir(t.join(l, "assets", "audio"), { recursive: !0 }), await i.mkdir(t.join(l, "assets", "ui"), { recursive: !0 });
    const k = {
      name: r,
      author: e || "",
      version: "1.0.0",
      description: "",
      resolution: o || { width: 1280, height: 720 },
      engineVersion: "0.1.0",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    };
    await i.writeFile(t.join(l, "project.json"), JSON.stringify(k, null, 2), "utf-8");
    let v = V();
    if (f === "demo") {
      const h = t.join(process.env.APP_ROOT, "public", "game");
      if (p(t.join(h, "script.json"))) {
        const S = JSON.parse(await i.readFile(t.join(h, "script.json"), "utf-8"));
        delete S.meta, v = S;
        for (const O of ["backgrounds", "characters", "audio"]) {
          const m = t.join(h, O), J = t.join(l, "assets", O);
          if (p(m)) {
            const U = await i.readdir(m);
            for (const R of U)
              await i.copyFile(t.join(m, R), t.join(J, R));
          }
        }
      }
    }
    return await i.writeFile(t.join(l, "script.json"), JSON.stringify(v, null, 2), "utf-8"), await T(l, r), { success: !0, path: l };
  } catch (d) {
    return console.error("Failed to create project:", d), { success: !1, error: d.message };
  }
});
c.handle("open-project", async () => {
  const n = await y.showOpenDialog({
    properties: ["openDirectory"],
    title: "选择项目文件夹"
  });
  if (n.canceled || n.filePaths.length === 0) return { canceled: !0 };
  const r = n.filePaths[0], e = p(t.join(r, "project.json")), s = p(t.join(r, "script.json"));
  return !e && !s ? { success: !1, error: "不是有效的项目文件夹：找不到 project.json 或 script.json" } : { success: !0, path: r, needsMigration: !e && s };
});
c.handle("load-project", async (n, r) => {
  try {
    let e, s;
    const o = t.join(r, "project.json"), f = t.join(r, "script.json");
    if (p(o) && (e = JSON.parse(await i.readFile(o, "utf-8"))), p(f) ? s = JSON.parse(await i.readFile(f, "utf-8")) : s = V(), !e && s.meta) {
      e = {
        name: s.meta.title || t.basename(r),
        author: s.meta.author || "",
        version: s.meta.version || "1.0.0",
        description: "",
        resolution: s.meta.resolution || { width: 1280, height: 720 },
        engineVersion: "0.1.0",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastModified: (/* @__PURE__ */ new Date()).toISOString()
      }, delete s.meta, await i.writeFile(o, JSON.stringify(e, null, 2), "utf-8"), await i.writeFile(f, JSON.stringify(s, null, 2), "utf-8");
      for (const d of ["backgrounds", "characters", "audio", "ui"])
        await i.mkdir(t.join(r, "assets", d), { recursive: !0 });
    }
    return e || (e = {
      name: t.basename(r),
      author: "",
      version: "1.0.0",
      description: "",
      resolution: { width: 1280, height: 720 },
      engineVersion: "0.1.0",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    }), a = r, await T(r, e.name), { success: !0, project: e, script: s, path: r };
  } catch (e) {
    return console.error("Failed to load project:", e), { success: !1, error: e.message };
  }
});
c.handle("save-project", async (n, { project: r, script: e }) => {
  if (!a) return { success: !1, error: "No project loaded" };
  try {
    return r.lastModified = (/* @__PURE__ */ new Date()).toISOString(), await D(t.join(a, "project.json"), JSON.stringify(r, null, 2)), await D(t.join(a, "script.json"), JSON.stringify(e, null, 2)), { success: !0 };
  } catch (s) {
    return console.error("Failed to save project:", s), { success: !1, error: s.message };
  }
});
c.handle("read-dir", async (n, r) => {
  try {
    if (!a) return [];
    const e = t.join(a, r);
    return N(e) ? (await i.readdir(e, { withFileTypes: !0 })).map((o) => ({ name: o.name, isDirectory: o.isDirectory() })) : [];
  } catch {
    return [];
  }
});
c.handle("upload-asset", async (n, { category: r, name: e, data: s }) => {
  try {
    if (!a) return !1;
    const o = t.join(a, "assets", r);
    return N(o) ? (await i.mkdir(o, { recursive: !0 }), await i.writeFile(t.join(o, e), Buffer.from(s)), !0) : !1;
  } catch (o) {
    return console.error("Failed to upload asset:", o), !1;
  }
});
c.handle("get-recent-projects", async () => await E());
c.handle("update-recent-projects", async (n, r) => (await F(r), !0));
c.handle("close-project", () => {
  a = null;
});
c.handle("show-save-dialog", async () => {
  const { response: n } = await y.showMessageBox({
    type: "warning",
    buttons: ["保存", "不保存", "取消"],
    defaultId: 0,
    cancelId: 2,
    title: "未保存的修改",
    message: "项目有未保存的修改，是否保存？"
  });
  return ["save", "discard", "cancel"][n];
});
c.handle("dialog-open-directory", async () => {
  const n = await y.showOpenDialog({
    properties: ["openDirectory"],
    title: "选择保存位置"
  });
  return n.canceled ? null : n.filePaths[0];
});
let u = null;
c.handle("open-preview", (n, r) => {
  if (u) {
    u.focus();
    return;
  }
  u = new _({
    width: 1280,
    height: 720,
    autoHideMenuBar: !0
  });
  const e = r ? `?project=${encodeURIComponent(r)}` : "";
  process.env.VITE_DEV_SERVER_URL ? u.loadURL(process.env.VITE_DEV_SERVER_URL + "index.html" + e) : u.loadFile(t.join(process.env.APP_ROOT, "dist/index.html"), {
    search: e ? `project=${encodeURIComponent(r)}` : void 0
  }), u.on("closed", () => {
    u = null;
  });
});
process.env.APP_ROOT = t.join(P, "..");
const g = process.env.VITE_DEV_SERVER_URL, G = t.join(process.env.APP_ROOT, "dist-electron"), b = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = g ? t.join(process.env.APP_ROOT, "public") : b;
let j;
function B() {
  j = new _({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: t.join(P, "preload.js")
    }
  }), g ? j.loadURL(g + "editor.html") : j.loadFile(t.join(b, "editor.html"));
}
w.on("window-all-closed", () => {
  process.platform !== "darwin" && (w.quit(), j = null);
});
w.whenReady().then(() => {
  A.handle("asset", (n) => {
    const r = new URL(n.url), e = decodeURIComponent(r.hostname + r.pathname), s = a ? t.join(a, "assets") : t.join(process.env.APP_ROOT, "public", "game"), o = t.join(s, e);
    return L.fetch(x(o).toString());
  }), B();
});
export {
  G as MAIN_DIST,
  b as RENDERER_DIST,
  g as VITE_DEV_SERVER_URL
};
