import { ipcMain as f, dialog as b, BrowserWindow as O, app as P, protocol as C, net as L } from "electron";
import r from "node:path";
import { fileURLToPath as $, pathToFileURL as W } from "node:url";
import o from "node:fs/promises";
import { existsSync as p } from "node:fs";
const q = {
  png: { bytes: [137, 80, 78, 71], offset: 0 },
  jpeg: { bytes: [255, 216, 255], offset: 0 },
  webp: {
    bytes: [82, 73, 70, 70],
    offset: 0,
    sub: { bytes: [87, 69, 66, 80], offset: 8 }
  },
  mp3_id3: { bytes: [73, 68, 51], offset: 0 },
  mp3_sync: {
    bytes: [255, 251],
    offset: 0,
    alt: [[255, 243], [255, 242]]
  },
  ogg: { bytes: [79, 103, 103, 83], offset: 0 },
  wav: {
    bytes: [82, 73, 70, 70],
    offset: 0,
    sub: { bytes: [87, 65, 86, 69], offset: 8 }
  },
  ttf: { bytes: [0, 1, 0, 0], offset: 0 },
  otf: { bytes: [79, 84, 84, 79], offset: 0 },
  woff: { bytes: [119, 79, 70, 70], offset: 0 },
  woff2: { bytes: [119, 79, 70, 50], offset: 0 }
}, k = {
  backgrounds: {
    extensions: [".png", ".jpg", ".jpeg", ".webp"],
    signatures: ["png", "jpeg", "webp"]
  },
  characters: {
    extensions: [".png", ".jpg", ".jpeg", ".webp"],
    signatures: ["png", "jpeg", "webp"]
  },
  audio: {
    extensions: [".mp3", ".ogg", ".wav"],
    signatures: ["mp3_id3", "mp3_sync", "ogg", "wav"]
  },
  fonts: {
    extensions: [".ttf", ".otf", ".woff", ".woff2"],
    signatures: ["ttf", "otf", "woff", "woff2"]
  },
  ui: {
    extensions: [".png", ".jpg", ".jpeg", ".webp"],
    signatures: ["png", "jpeg", "webp"]
  }
};
function z(n, t) {
  for (let e = 0; e < t.bytes.length; e++)
    if (n[t.offset + e] !== t.bytes[e])
      return t.alt ? t.alt.some((s) => {
        for (let a = 0; a < s.length; a++)
          if (n[a] !== s[a]) return !1;
        return !0;
      }) : !1;
  if (t.sub) {
    for (let e = 0; e < t.sub.bytes.length; e++)
      if (n[t.sub.offset + e] !== t.sub.bytes[e]) return !1;
  }
  return !0;
}
function E(n, t, e) {
  const s = k[e];
  if (!s)
    return { valid: !1, reason: `Unknown category: ${e}` };
  const a = t.toLowerCase();
  return s.extensions.includes(a) ? s.signatures.some((c) => {
    const u = q[c];
    return u && z(n, u);
  }) ? { valid: !0 } : { valid: !1, reason: `文件内容与 ${a} 格式不匹配` } : { valid: !1, reason: `不支持的文件格式 ${a}` };
}
function G(n) {
  var t;
  return ((t = k[n]) == null ? void 0 : t.extensions) || [];
}
const T = r.dirname($(import.meta.url));
let l = null, d;
function F() {
  return d || O.getFocusedWindow() || O.getAllWindows()[0] || null;
}
function N() {
  return r.join(P.getPath("userData"), "recent-projects.json");
}
async function A() {
  try {
    const n = await o.readFile(N(), "utf-8");
    return JSON.parse(n);
  } catch {
    return { hasCreatedProject: !1, projects: [] };
  }
}
async function U(n) {
  await o.writeFile(N(), JSON.stringify(n, null, 2), "utf-8");
}
async function J(n, t) {
  const e = await A();
  e.projects = e.projects.filter((s) => s.path !== n), e.projects.unshift({ path: n, name: t, openedAt: (/* @__PURE__ */ new Date()).toISOString() }), e.projects.length > 20 && (e.projects = e.projects.slice(0, 20)), e.hasCreatedProject = !0, await U(e);
}
function w(n) {
  const t = r.resolve(n), e = r.resolve(l);
  return t.startsWith(e + r.sep) || t === e;
}
function H(n) {
  return n.replace(/[<>:"|?*\\/]/g, "_").replace(/\.{2,}/g, "_").trim() || "untitled";
}
async function I(n, t) {
  const e = n + ".tmp", s = n + ".bak";
  await o.writeFile(e, t, "utf-8");
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
async function V(n, t) {
  const { name: e, ext: s } = r.parse(t), a = await o.readdir(n).catch(() => []);
  let i = t, c = 1;
  for (; a.includes(i); )
    i = `${e}-${c}${s}`, c++;
  return i;
}
function B() {
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
f.handle("create-project", async (n, { name: t, author: e, location: s, resolution: a, template: i }) => {
  try {
    const c = H(t), u = r.join(s, c);
    await o.mkdir(u, { recursive: !0 }), await o.mkdir(r.join(u, "assets", "backgrounds"), { recursive: !0 }), await o.mkdir(r.join(u, "assets", "characters"), { recursive: !0 }), await o.mkdir(r.join(u, "assets", "audio"), { recursive: !0 }), await o.mkdir(r.join(u, "assets", "ui"), { recursive: !0 }), await o.mkdir(r.join(u, "assets", "fonts"), { recursive: !0 });
    const v = {
      name: t,
      author: e || "",
      version: "1.0.0",
      description: "",
      resolution: a || { width: 1280, height: 720 },
      engineVersion: "0.1.0",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    };
    await o.writeFile(r.join(u, "project.json"), JSON.stringify(v, null, 2), "utf-8");
    let m = B();
    if (i === "demo") {
      const h = r.join(process.env.APP_ROOT, "public", "game");
      if (p(r.join(h, "script.json"))) {
        const j = JSON.parse(await o.readFile(r.join(h, "script.json"), "utf-8"));
        delete j.meta, m = j;
        for (const x of ["backgrounds", "characters", "audio"]) {
          const g = r.join(h, x), S = r.join(u, "assets", x);
          if (p(g)) {
            const R = await o.readdir(g);
            for (const D of R)
              await o.copyFile(r.join(g, D), r.join(S, D));
          }
        }
      }
    }
    return await o.writeFile(r.join(u, "script.json"), JSON.stringify(m, null, 2), "utf-8"), await J(u, t), { success: !0, path: u };
  } catch (c) {
    return console.error("Failed to create project:", c), { success: !1, error: c.message };
  }
});
f.handle("open-project", async () => {
  const n = await b.showOpenDialog(F(), {
    properties: ["openDirectory"],
    title: "选择项目文件夹"
  });
  if (n.canceled || n.filePaths.length === 0) return { canceled: !0 };
  const t = n.filePaths[0], e = p(r.join(t, "project.json")), s = p(r.join(t, "script.json"));
  return !e && !s ? { success: !1, error: "不是有效的项目文件夹：找不到 project.json 或 script.json" } : { success: !0, path: t, needsMigration: !e && s };
});
f.handle("load-project", async (n, t) => {
  try {
    let e, s;
    const a = r.join(t, "project.json"), i = r.join(t, "script.json");
    if (p(a) && (e = JSON.parse(await o.readFile(a, "utf-8"))), p(i) ? s = JSON.parse(await o.readFile(i, "utf-8")) : s = B(), !e && s.meta) {
      e = {
        name: s.meta.title || r.basename(t),
        author: s.meta.author || "",
        version: s.meta.version || "1.0.0",
        description: "",
        resolution: s.meta.resolution || { width: 1280, height: 720 },
        engineVersion: "0.1.0",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastModified: (/* @__PURE__ */ new Date()).toISOString()
      }, delete s.meta, await o.writeFile(a, JSON.stringify(e, null, 2), "utf-8"), await o.writeFile(i, JSON.stringify(s, null, 2), "utf-8");
      for (const c of ["backgrounds", "characters", "audio", "ui"])
        await o.mkdir(r.join(t, "assets", c), { recursive: !0 });
    }
    return e || (e = {
      name: r.basename(t),
      author: "",
      version: "1.0.0",
      description: "",
      resolution: { width: 1280, height: 720 },
      engineVersion: "0.1.0",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    }), l = t, await o.mkdir(r.join(t, "assets", "fonts"), { recursive: !0 }), await J(t, e.name), { success: !0, project: e, script: s, path: t };
  } catch (e) {
    return console.error("Failed to load project:", e), { success: !1, error: e.message };
  }
});
f.handle("save-project", async (n, { project: t, script: e }) => {
  if (!l) return { success: !1, error: "No project loaded" };
  try {
    return t.lastModified = (/* @__PURE__ */ new Date()).toISOString(), await I(r.join(l, "project.json"), JSON.stringify(t, null, 2)), await I(r.join(l, "script.json"), JSON.stringify(e, null, 2)), { success: !0 };
  } catch (s) {
    return console.error("Failed to save project:", s), { success: !1, error: s.message };
  }
});
f.handle("read-dir", async (n, t) => {
  try {
    if (!l) return [];
    const e = r.join(l, t);
    return w(e) ? (await o.readdir(e, { withFileTypes: !0 })).map((a) => ({ name: a.name, isDirectory: a.isDirectory() })) : [];
  } catch {
    return [];
  }
});
f.handle("upload-asset", async (n, { category: t, name: e, data: s }) => {
  try {
    if (!l) return !1;
    const a = r.join(l, "assets", t);
    return w(a) ? (await o.mkdir(a, { recursive: !0 }), await o.writeFile(r.join(a, e), Buffer.from(s)), !0) : !1;
  } catch (a) {
    return console.error("Failed to upload asset:", a), !1;
  }
});
f.handle("select-asset", async (n, { types: t }) => {
  try {
    if (!l) return null;
    const e = {
      backgrounds: { name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] },
      characters: { name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] },
      audio: { name: "音频", extensions: ["mp3", "ogg", "wav"] },
      fonts: { name: "字体", extensions: ["ttf", "otf", "woff", "woff2"] },
      ui: { name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] }
    }, s = t[0], a = t.map((D) => e[D]).filter(Boolean), i = r.join(l, "assets", s || ""), c = await b.showOpenDialog(F(), {
      properties: ["openFile"],
      filters: a,
      defaultPath: p(i) ? i : l,
      title: "选择资源文件"
    });
    if (c.canceled || c.filePaths.length === 0) return null;
    const u = c.filePaths[0], v = r.resolve(r.join(l, "assets")), m = r.resolve(u);
    if (m.startsWith(v + r.sep))
      return m.slice(v.length + 1).replace(/\\/g, "/");
    if (!s) return null;
    const h = await o.readFile(u), j = r.extname(u);
    if (!E(h.subarray(0, 12), j, s).valid) return null;
    const g = r.join(l, "assets", s);
    await o.mkdir(g, { recursive: !0 });
    const S = await V(g, r.basename(u)), R = r.join(g, S);
    return w(R) ? (await o.copyFile(u, R), `${s}/${S}`) : null;
  } catch (e) {
    return console.error("[select-asset] Failed:", e), null;
  }
});
f.handle("import-assets", async (n, { category: t, files: e }) => {
  try {
    if (!l) return { success: !1, error: "No project loaded" };
    const s = r.join(l, "assets", t);
    if (!w(s)) return { success: !1, error: "Invalid path" };
    await o.mkdir(s, { recursive: !0 });
    const a = [], i = [];
    for (const c of e) {
      const u = Buffer.from(c.data), v = r.extname(c.name), m = u.subarray(0, 12), h = E(m, v, t);
      if (!h.valid) {
        i.push({ name: c.name, reason: h.reason });
        continue;
      }
      const j = await V(s, c.name), x = r.join(s, j);
      if (!w(x)) {
        i.push({ name: c.name, reason: "Path security violation" });
        continue;
      }
      await o.writeFile(x, u), a.push({ original: c.name, saved: j });
    }
    return { success: !0, imported: a, errors: i, supportedFormats: G(t) };
  } catch (s) {
    return console.error("[import-assets] Failed:", s), { success: !1, error: s.message };
  }
});
f.handle("delete-asset", async (n, { category: t, filename: e }) => {
  try {
    if (!l) return { success: !1, error: "No project loaded" };
    const s = r.join(l, "assets", t, e);
    return w(s) ? (await o.unlink(s), { success: !0 }) : { success: !1, error: "Invalid path" };
  } catch (s) {
    return console.error("[delete-asset] Failed:", s), { success: !1, error: s.message };
  }
});
f.handle("rename-asset", async (n, { category: t, oldName: e, newName: s }) => {
  try {
    if (!l) return { success: !1, error: "No project loaded" };
    const a = r.join(l, "assets", t), i = r.join(a, e), c = r.join(a, s);
    return !w(i) || !w(c) ? { success: !1, error: "Invalid path" } : p(i) ? p(c) && e !== s ? { success: !1, error: "File already exists" } : (await o.rename(i, c), { success: !0, newName: s }) : { success: !1, error: "File not found" };
  } catch (a) {
    return console.error("[rename-asset] Failed:", a), { success: !1, error: a.message };
  }
});
f.handle("list-assets", async (n, { category: t }) => {
  try {
    if (!l) return { success: !1, error: "No project loaded" };
    const e = r.join(l, "assets", t);
    return w(e) ? p(e) ? { success: !0, files: (await o.readdir(e, { withFileTypes: !0 })).filter((i) => !i.isDirectory()).map((i) => i.name) } : { success: !0, files: [] } : { success: !1, error: "Invalid path" };
  } catch (e) {
    return console.error("[list-assets] Failed:", e), { success: !1, error: e.message };
  }
});
f.handle("get-recent-projects", async () => await A());
f.handle("update-recent-projects", async (n, t) => (await U(t), !0));
f.handle("close-project", () => {
  l = null;
});
f.handle("set-window-mode", (n, t) => {
  const e = F();
  if (e)
    switch (t) {
      case "fullscreen":
        e.setFullScreen(!0);
        break;
      case "borderless": {
        e.setFullScreen(!1);
        const { screen: s } = require("electron"), a = s.getPrimaryDisplay().bounds;
        e.setBounds(a);
        break;
      }
      case "windowed":
      default:
        e.isFullScreen() && e.setFullScreen(!1), e.setSize(1280, 720), e.center();
        break;
    }
});
f.handle("show-save-dialog", async () => {
  const { response: n } = await b.showMessageBox(F(), {
    type: "warning",
    buttons: ["保存", "不保存", "取消"],
    defaultId: 0,
    cancelId: 2,
    title: "未保存的修改",
    message: "项目有未保存的修改，是否保存？"
  });
  return ["save", "discard", "cancel"][n];
});
f.handle("dialog-open-directory", async () => {
  try {
    const n = await b.showOpenDialog(F(), {
      properties: ["openDirectory"],
      title: "选择保存位置"
    });
    return n.canceled ? null : n.filePaths[0];
  } catch (n) {
    return console.error("dialog-open-directory error:", n), null;
  }
});
let y = null;
f.handle("open-preview", (n, t) => {
  if (y) {
    y.focus();
    return;
  }
  y = new O({
    width: 1280,
    height: 720,
    autoHideMenuBar: !0
  });
  const e = t ? `?project=${encodeURIComponent(t)}` : "";
  process.env.VITE_DEV_SERVER_URL ? y.loadURL(process.env.VITE_DEV_SERVER_URL + "index.html" + e) : y.loadFile(r.join(process.env.APP_ROOT, "dist/index.html"), {
    search: e ? `project=${encodeURIComponent(t)}` : void 0
  }), y.on("closed", () => {
    y = null;
  });
});
process.env.APP_ROOT = r.join(T, "..");
const _ = process.env.VITE_DEV_SERVER_URL, te = r.join(process.env.APP_ROOT, "dist-electron"), M = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = _ ? r.join(process.env.APP_ROOT, "public") : M;
function Y() {
  d = new O({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: r.join(T, "preload.mjs")
    }
  }), d.on("close", async (n) => {
    n.preventDefault();
    try {
      if (await d.webContents.executeJavaScript(
        "window.__hasDirtyProject ? window.__hasDirtyProject() : false"
      )) {
        const { response: e } = await b.showMessageBox(d, {
          type: "warning",
          buttons: ["保存", "不保存", "取消"],
          defaultId: 0,
          cancelId: 2,
          title: "未保存的修改",
          message: "项目有未保存的修改，是否保存？"
        });
        if (e === 2) return;
        e === 0 && await d.webContents.executeJavaScript("window.__saveCurrentProject()");
      }
    } catch {
    }
    d.destroy();
  }), _ ? d.loadURL(_ + "editor.html") : d.loadFile(r.join(M, "editor.html"));
}
P.on("window-all-closed", () => {
  process.platform !== "darwin" && (P.quit(), d = null);
});
P.whenReady().then(() => {
  C.handle("asset", (n) => {
    const t = new URL(n.url), e = decodeURIComponent(t.hostname + t.pathname), s = l ? r.join(l, "assets") : r.join(process.env.APP_ROOT, "public", "game"), a = r.resolve(r.join(s, e)), i = r.resolve(s);
    return !a.startsWith(i + r.sep) && a !== i ? new Response("Forbidden", { status: 403 }) : L.fetch(W(a).toString());
  }), Y();
});
export {
  te as MAIN_DIST,
  M as RENDERER_DIST,
  _ as VITE_DEV_SERVER_URL
};
