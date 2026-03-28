import { ipcMain as a, dialog as m, BrowserWindow as h, app as j, protocol as M, net as L } from "electron";
import t from "node:path";
import { fileURLToPath as x, pathToFileURL as C } from "node:url";
import o from "node:fs/promises";
import { existsSync as w } from "node:fs";
const F = t.dirname(x(import.meta.url));
let c = null, u;
function g() {
  return u || h.getFocusedWindow() || h.getAllWindows()[0] || null;
}
function b() {
  return t.join(j.getPath("userData"), "recent-projects.json");
}
async function I() {
  try {
    const n = await o.readFile(b(), "utf-8");
    return JSON.parse(n);
  } catch {
    return { hasCreatedProject: !1, projects: [] };
  }
}
async function E(n) {
  await o.writeFile(b(), JSON.stringify(n, null, 2), "utf-8");
}
async function T(n, r) {
  const e = await I();
  e.projects = e.projects.filter((s) => s.path !== n), e.projects.unshift({ path: n, name: r, openedAt: (/* @__PURE__ */ new Date()).toISOString() }), e.projects.length > 20 && (e.projects = e.projects.slice(0, 20)), e.hasCreatedProject = !0, await E(e);
}
function k(n) {
  const r = t.resolve(n), e = t.resolve(c);
  return r.startsWith(e + t.sep) || r === e;
}
function W(n) {
  return n.replace(/[<>:"|?*\\/]/g, "_").replace(/\.{2,}/g, "_").trim() || "untitled";
}
async function P(n, r) {
  const e = n + ".tmp", s = n + ".bak";
  await o.writeFile(e, r, "utf-8");
  try {
    await o.rename(n, s);
  } catch {
  }
  await o.rename(e, n);
  try {
    await o.unlink(s);
  } catch {
  }
}
function J() {
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
a.handle("create-project", async (n, { name: r, author: e, location: s, resolution: i, template: d }) => {
  try {
    const f = W(r), l = t.join(s, f);
    await o.mkdir(l, { recursive: !0 }), await o.mkdir(t.join(l, "assets", "backgrounds"), { recursive: !0 }), await o.mkdir(t.join(l, "assets", "characters"), { recursive: !0 }), await o.mkdir(t.join(l, "assets", "audio"), { recursive: !0 }), await o.mkdir(t.join(l, "assets", "ui"), { recursive: !0 });
    const V = {
      name: r,
      author: e || "",
      version: "1.0.0",
      description: "",
      resolution: i || { width: 1280, height: 720 },
      engineVersion: "0.1.0",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    };
    await o.writeFile(t.join(l, "project.json"), JSON.stringify(V, null, 2), "utf-8");
    let R = J();
    if (d === "demo") {
      const y = t.join(process.env.APP_ROOT, "public", "game");
      if (w(t.join(y, "script.json"))) {
        const O = JSON.parse(await o.readFile(t.join(y, "script.json"), "utf-8"));
        delete O.meta, R = O;
        for (const D of ["backgrounds", "characters", "audio"]) {
          const v = t.join(y, D), U = t.join(l, "assets", D);
          if (w(v)) {
            const A = await o.readdir(v);
            for (const _ of A)
              await o.copyFile(t.join(v, _), t.join(U, _));
          }
        }
      }
    }
    return await o.writeFile(t.join(l, "script.json"), JSON.stringify(R, null, 2), "utf-8"), await T(l, r), { success: !0, path: l };
  } catch (f) {
    return console.error("Failed to create project:", f), { success: !1, error: f.message };
  }
});
a.handle("open-project", async () => {
  const n = await m.showOpenDialog(g(), {
    properties: ["openDirectory"],
    title: "选择项目文件夹"
  });
  if (n.canceled || n.filePaths.length === 0) return { canceled: !0 };
  const r = n.filePaths[0], e = w(t.join(r, "project.json")), s = w(t.join(r, "script.json"));
  return !e && !s ? { success: !1, error: "不是有效的项目文件夹：找不到 project.json 或 script.json" } : { success: !0, path: r, needsMigration: !e && s };
});
a.handle("load-project", async (n, r) => {
  try {
    let e, s;
    const i = t.join(r, "project.json"), d = t.join(r, "script.json");
    if (w(i) && (e = JSON.parse(await o.readFile(i, "utf-8"))), w(d) ? s = JSON.parse(await o.readFile(d, "utf-8")) : s = J(), !e && s.meta) {
      e = {
        name: s.meta.title || t.basename(r),
        author: s.meta.author || "",
        version: s.meta.version || "1.0.0",
        description: "",
        resolution: s.meta.resolution || { width: 1280, height: 720 },
        engineVersion: "0.1.0",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastModified: (/* @__PURE__ */ new Date()).toISOString()
      }, delete s.meta, await o.writeFile(i, JSON.stringify(e, null, 2), "utf-8"), await o.writeFile(d, JSON.stringify(s, null, 2), "utf-8");
      for (const f of ["backgrounds", "characters", "audio", "ui"])
        await o.mkdir(t.join(r, "assets", f), { recursive: !0 });
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
    }), c = r, await T(r, e.name), { success: !0, project: e, script: s, path: r };
  } catch (e) {
    return console.error("Failed to load project:", e), { success: !1, error: e.message };
  }
});
a.handle("save-project", async (n, { project: r, script: e }) => {
  if (!c) return { success: !1, error: "No project loaded" };
  try {
    return r.lastModified = (/* @__PURE__ */ new Date()).toISOString(), await P(t.join(c, "project.json"), JSON.stringify(r, null, 2)), await P(t.join(c, "script.json"), JSON.stringify(e, null, 2)), { success: !0 };
  } catch (s) {
    return console.error("Failed to save project:", s), { success: !1, error: s.message };
  }
});
a.handle("read-dir", async (n, r) => {
  try {
    if (!c) return [];
    const e = t.join(c, r);
    return k(e) ? (await o.readdir(e, { withFileTypes: !0 })).map((i) => ({ name: i.name, isDirectory: i.isDirectory() })) : [];
  } catch {
    return [];
  }
});
a.handle("upload-asset", async (n, { category: r, name: e, data: s }) => {
  try {
    if (!c) return !1;
    const i = t.join(c, "assets", r);
    return k(i) ? (await o.mkdir(i, { recursive: !0 }), await o.writeFile(t.join(i, e), Buffer.from(s)), !0) : !1;
  } catch (i) {
    return console.error("Failed to upload asset:", i), !1;
  }
});
a.handle("get-recent-projects", async () => await I());
a.handle("update-recent-projects", async (n, r) => (await E(r), !0));
a.handle("close-project", () => {
  c = null;
});
a.handle("set-window-mode", (n, r) => {
  const e = g();
  if (e)
    switch (r) {
      case "fullscreen":
        e.setFullScreen(!0);
        break;
      case "borderless": {
        e.setFullScreen(!1);
        const { screen: s } = require("electron"), i = s.getPrimaryDisplay().bounds;
        e.setBounds(i);
        break;
      }
      case "windowed":
      default:
        e.isFullScreen() && e.setFullScreen(!1), e.setSize(1280, 720), e.center();
        break;
    }
});
a.handle("show-save-dialog", async () => {
  const { response: n } = await m.showMessageBox(g(), {
    type: "warning",
    buttons: ["保存", "不保存", "取消"],
    defaultId: 0,
    cancelId: 2,
    title: "未保存的修改",
    message: "项目有未保存的修改，是否保存？"
  });
  return ["save", "discard", "cancel"][n];
});
a.handle("dialog-open-directory", async () => {
  try {
    const n = await m.showOpenDialog(g(), {
      properties: ["openDirectory"],
      title: "选择保存位置"
    });
    return n.canceled ? null : n.filePaths[0];
  } catch (n) {
    return console.error("dialog-open-directory error:", n), null;
  }
});
let p = null;
a.handle("open-preview", (n, r) => {
  if (p) {
    p.focus();
    return;
  }
  p = new h({
    width: 1280,
    height: 720,
    autoHideMenuBar: !0
  });
  const e = r ? `?project=${encodeURIComponent(r)}` : "";
  process.env.VITE_DEV_SERVER_URL ? p.loadURL(process.env.VITE_DEV_SERVER_URL + "index.html" + e) : p.loadFile(t.join(process.env.APP_ROOT, "dist/index.html"), {
    search: e ? `project=${encodeURIComponent(r)}` : void 0
  }), p.on("closed", () => {
    p = null;
  });
});
process.env.APP_ROOT = t.join(F, "..");
const S = process.env.VITE_DEV_SERVER_URL, K = t.join(process.env.APP_ROOT, "dist-electron"), N = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = S ? t.join(process.env.APP_ROOT, "public") : N;
function B() {
  u = new h({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: t.join(F, "preload.mjs")
    }
  }), u.on("close", async (n) => {
    n.preventDefault();
    try {
      if (await u.webContents.executeJavaScript(
        "window.__hasDirtyProject ? window.__hasDirtyProject() : false"
      )) {
        const { response: e } = await m.showMessageBox(u, {
          type: "warning",
          buttons: ["保存", "不保存", "取消"],
          defaultId: 0,
          cancelId: 2,
          title: "未保存的修改",
          message: "项目有未保存的修改，是否保存？"
        });
        if (e === 2) return;
        e === 0 && await u.webContents.executeJavaScript("window.__saveCurrentProject()");
      }
    } catch {
    }
    u.destroy();
  }), S ? u.loadURL(S + "editor.html") : u.loadFile(t.join(N, "editor.html"));
}
j.on("window-all-closed", () => {
  process.platform !== "darwin" && (j.quit(), u = null);
});
j.whenReady().then(() => {
  M.handle("asset", (n) => {
    const r = new URL(n.url), e = decodeURIComponent(r.hostname + r.pathname), s = c ? t.join(c, "assets") : t.join(process.env.APP_ROOT, "public", "game"), i = t.resolve(t.join(s, e)), d = t.resolve(s);
    return !i.startsWith(d + t.sep) && i !== d ? new Response("Forbidden", { status: 403 }) : L.fetch(C(i).toString());
  }), B();
});
export {
  K as MAIN_DIST,
  N as RENDERER_DIST,
  S as VITE_DEV_SERVER_URL
};
