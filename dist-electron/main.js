import { protocol as k, ipcMain as f, dialog as F, BrowserWindow as D, app as O, net as $ } from "electron";
import r from "node:path";
import { fileURLToPath as L, pathToFileURL as W } from "node:url";
import o from "node:fs/promises";
import { existsSync as w } from "node:fs";
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
    bytes: [255],
    offset: 0,
    // MPEG audio frame sync: 0xFF followed by byte with upper 3 bits set (0xE0+)
    checkSecondByte: !0
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
}, E = {
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
  if (t.checkSecondByte && (n[1] & 224) !== 224)
    return !1;
  if (t.sub) {
    for (let e = 0; e < t.sub.bytes.length; e++)
      if (n[t.sub.offset + e] !== t.sub.bytes[e]) return !1;
  }
  return !0;
}
function T(n, t, e) {
  const s = E[e];
  if (!s)
    return { valid: !1, reason: `Unknown category: ${e}` };
  const a = t.toLowerCase();
  return s.extensions.includes(a) ? s.signatures.some((u) => {
    const c = q[u];
    return c && z(n, c);
  }) ? { valid: !0 } : { valid: !1, reason: `文件内容与 ${a} 格式不匹配` } : { valid: !1, reason: `不支持的文件格式 ${a}` };
}
function G(n) {
  var t;
  return ((t = E[n]) == null ? void 0 : t.extensions) || [];
}
const A = r.dirname(L(import.meta.url));
k.registerSchemesAsPrivileged([
  {
    scheme: "asset",
    privileges: { standard: !0, supportFetchAPI: !0, stream: !0, bypassCSP: !0 }
  }
]);
let l = null, p;
function S() {
  return p || D.getFocusedWindow() || D.getAllWindows()[0] || null;
}
function N() {
  return r.join(O.getPath("userData"), "recent-projects.json");
}
async function U() {
  try {
    const n = await o.readFile(N(), "utf-8");
    return JSON.parse(n);
  } catch {
    return { hasCreatedProject: !1, projects: [] };
  }
}
async function J(n) {
  await o.writeFile(N(), JSON.stringify(n, null, 2), "utf-8");
}
async function V(n, t) {
  const e = await U();
  e.projects = e.projects.filter((s) => s.path !== n), e.projects.unshift({ path: n, name: t, openedAt: (/* @__PURE__ */ new Date()).toISOString() }), e.projects.length > 20 && (e.projects = e.projects.slice(0, 20)), e.hasCreatedProject = !0, await J(e);
}
function h(n) {
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
async function B(n, t) {
  const { name: e, ext: s } = r.parse(t), a = await o.readdir(n).catch(() => []);
  let i = t, u = 1;
  for (; a.includes(i); )
    i = `${e}-${u}${s}`, u++;
  return i;
}
function M() {
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
    const u = H(t), c = r.join(s, u);
    await o.mkdir(c, { recursive: !0 }), await o.mkdir(r.join(c, "assets", "backgrounds"), { recursive: !0 }), await o.mkdir(r.join(c, "assets", "characters"), { recursive: !0 }), await o.mkdir(r.join(c, "assets", "audio"), { recursive: !0 }), await o.mkdir(r.join(c, "assets", "ui"), { recursive: !0 }), await o.mkdir(r.join(c, "assets", "fonts"), { recursive: !0 });
    const x = {
      name: t,
      author: e || "",
      version: "1.0.0",
      description: "",
      resolution: a || { width: 1280, height: 720 },
      engineVersion: "0.1.0",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastModified: (/* @__PURE__ */ new Date()).toISOString()
    };
    await o.writeFile(r.join(c, "project.json"), JSON.stringify(x, null, 2), "utf-8");
    let j = M();
    if (i === "demo") {
      const m = r.join(process.env.APP_ROOT, "public", "game");
      if (w(r.join(m, "script.json"))) {
        const g = JSON.parse(await o.readFile(r.join(m, "script.json"), "utf-8"));
        delete g.meta, j = g;
        for (const b of ["backgrounds", "characters", "audio"]) {
          const d = r.join(m, b), y = r.join(c, "assets", b);
          if (w(d)) {
            const P = await o.readdir(d);
            for (const R of P)
              await o.copyFile(r.join(d, R), r.join(y, R));
          }
        }
      }
    }
    return await o.writeFile(r.join(c, "script.json"), JSON.stringify(j, null, 2), "utf-8"), await V(c, t), { success: !0, path: c };
  } catch (u) {
    return console.error("Failed to create project:", u), { success: !1, error: u.message };
  }
});
f.handle("open-project", async () => {
  const n = await F.showOpenDialog(S(), {
    properties: ["openDirectory"],
    title: "选择项目文件夹"
  });
  if (n.canceled || n.filePaths.length === 0) return { canceled: !0 };
  const t = n.filePaths[0], e = w(r.join(t, "project.json")), s = w(r.join(t, "script.json"));
  return !e && !s ? { success: !1, error: "不是有效的项目文件夹：找不到 project.json 或 script.json" } : { success: !0, path: t, needsMigration: !e && s };
});
f.handle("load-project", async (n, t) => {
  try {
    let e, s;
    const a = r.join(t, "project.json"), i = r.join(t, "script.json");
    if (w(a) && (e = JSON.parse(await o.readFile(a, "utf-8"))), w(i) ? s = JSON.parse(await o.readFile(i, "utf-8")) : s = M(), !e && s.meta) {
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
      for (const u of ["backgrounds", "characters", "audio", "ui"])
        await o.mkdir(r.join(t, "assets", u), { recursive: !0 });
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
    }), l = t, await o.mkdir(r.join(t, "assets", "fonts"), { recursive: !0 }), await V(t, e.name), { success: !0, project: e, script: s, path: t };
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
    return h(e) ? (await o.readdir(e, { withFileTypes: !0 })).map((a) => ({ name: a.name, isDirectory: a.isDirectory() })) : [];
  } catch {
    return [];
  }
});
f.handle("upload-asset", async (n, { category: t, name: e, data: s }) => {
  try {
    if (!l) return !1;
    const a = r.join(l, "assets", t);
    return h(a) ? (await o.mkdir(a, { recursive: !0 }), await o.writeFile(r.join(a, e), Buffer.from(s)), !0) : !1;
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
    }, s = t[0], a = t.map((R) => e[R]).filter(Boolean), i = r.join(l, "assets", s || ""), u = await F.showOpenDialog(S(), {
      properties: ["openFile"],
      filters: a,
      defaultPath: w(i) ? i : l,
      title: "选择资源文件"
    });
    if (u.canceled || u.filePaths.length === 0) return null;
    const c = u.filePaths[0], x = r.resolve(r.join(l, "assets")), j = r.resolve(c);
    if (j.startsWith(x + r.sep))
      return j.slice(x.length + 1).replace(/\\/g, "/");
    if (!s) return null;
    const m = await o.readFile(c), g = r.extname(c);
    if (!T(m.subarray(0, 12), g, s).valid) return null;
    const d = r.join(l, "assets", s);
    await o.mkdir(d, { recursive: !0 });
    const y = await B(d, r.basename(c)), P = r.join(d, y);
    return h(P) ? (await o.copyFile(c, P), `${s}/${y}`) : null;
  } catch (e) {
    return console.error("[select-asset] Failed:", e), null;
  }
});
f.handle("import-assets", async (n, { category: t, paths: e }) => {
  try {
    if (!l) return { success: !1, error: "No project loaded" };
    const s = r.join(l, "assets", t);
    if (!h(s)) return { success: !1, error: "Invalid path" };
    await o.mkdir(s, { recursive: !0 });
    const a = [], i = [];
    for (const u of e) {
      const c = r.basename(u), x = r.extname(c);
      let j;
      try {
        const d = await o.open(u, "r"), y = Buffer.alloc(12);
        await d.read(y, 0, 12, 0), await d.close(), j = y;
      } catch (d) {
        i.push({ name: c, reason: `无法读取文件: ${d.message}` });
        continue;
      }
      const m = T(j, x, t);
      if (!m.valid) {
        i.push({ name: c, reason: m.reason });
        continue;
      }
      const g = await B(s, c), b = r.join(s, g);
      if (!h(b)) {
        i.push({ name: c, reason: "Path security violation" });
        continue;
      }
      await o.copyFile(u, b), a.push({ original: c, saved: g });
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
    return h(s) ? (await o.unlink(s), { success: !0 }) : { success: !1, error: "Invalid path" };
  } catch (s) {
    return console.error("[delete-asset] Failed:", s), { success: !1, error: s.message };
  }
});
f.handle("rename-asset", async (n, { category: t, oldName: e, newName: s }) => {
  try {
    if (!l) return { success: !1, error: "No project loaded" };
    const a = r.join(l, "assets", t), i = r.join(a, e), u = r.join(a, s);
    return !h(i) || !h(u) ? { success: !1, error: "Invalid path" } : w(i) ? w(u) && e !== s ? { success: !1, error: "File already exists" } : (await o.rename(i, u), { success: !0, newName: s }) : { success: !1, error: "File not found" };
  } catch (a) {
    return console.error("[rename-asset] Failed:", a), { success: !1, error: a.message };
  }
});
f.handle("list-assets", async (n, { category: t }) => {
  try {
    if (!l) return { success: !1, error: "No project loaded" };
    const e = r.join(l, "assets", t);
    return h(e) ? w(e) ? { success: !0, files: (await o.readdir(e, { withFileTypes: !0 })).filter((i) => !i.isDirectory()).map((i) => i.name) } : { success: !0, files: [] } : { success: !1, error: "Invalid path" };
  } catch (e) {
    return console.error("[list-assets] Failed:", e), { success: !1, error: e.message };
  }
});
f.handle("get-recent-projects", async () => await U());
f.handle("update-recent-projects", async (n, t) => (await J(t), !0));
f.handle("close-project", () => {
  l = null;
});
f.handle("set-window-mode", (n, t) => {
  const e = S();
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
  const { response: n } = await F.showMessageBox(S(), {
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
    const n = await F.showOpenDialog(S(), {
      properties: ["openDirectory"],
      title: "选择保存位置"
    });
    return n.canceled ? null : n.filePaths[0];
  } catch (n) {
    return console.error("dialog-open-directory error:", n), null;
  }
});
let v = null;
f.handle("open-preview", (n, t) => {
  if (v) {
    v.focus();
    return;
  }
  v = new D({
    width: 1280,
    height: 720,
    autoHideMenuBar: !0
  });
  const e = t ? `?project=${encodeURIComponent(t)}` : "";
  process.env.VITE_DEV_SERVER_URL ? v.loadURL(process.env.VITE_DEV_SERVER_URL + "index.html" + e) : v.loadFile(r.join(process.env.APP_ROOT, "dist/index.html"), {
    search: e ? `project=${encodeURIComponent(t)}` : void 0
  }), v.on("closed", () => {
    v = null;
  });
});
process.env.APP_ROOT = r.join(A, "..");
const _ = process.env.VITE_DEV_SERVER_URL, te = r.join(process.env.APP_ROOT, "dist-electron"), C = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = _ ? r.join(process.env.APP_ROOT, "public") : C;
function Y() {
  p = new D({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: r.join(A, "preload.mjs")
    }
  }), p.on("close", async (n) => {
    n.preventDefault();
    try {
      if (await p.webContents.executeJavaScript(
        "window.__hasDirtyProject ? window.__hasDirtyProject() : false"
      )) {
        const { response: e } = await F.showMessageBox(p, {
          type: "warning",
          buttons: ["保存", "不保存", "取消"],
          defaultId: 0,
          cancelId: 2,
          title: "未保存的修改",
          message: "项目有未保存的修改，是否保存？"
        });
        if (e === 2) return;
        e === 0 && await p.webContents.executeJavaScript("window.__saveCurrentProject()");
      }
    } catch {
    }
    p.destroy();
  }), _ ? p.loadURL(_ + "editor.html") : p.loadFile(r.join(C, "editor.html"));
}
O.on("window-all-closed", () => {
  process.platform !== "darwin" && (O.quit(), p = null);
});
O.whenReady().then(() => {
  k.handle("asset", (n) => {
    const t = new URL(n.url), e = decodeURIComponent(t.hostname + t.pathname), s = l ? r.join(l, "assets") : r.join(process.env.APP_ROOT, "public", "game"), a = r.resolve(r.join(s, e)), i = r.resolve(s);
    return !a.startsWith(i + r.sep) && a !== i ? new Response("Forbidden", { status: 403 }) : $.fetch(W(a).toString());
  }), Y();
});
export {
  te as MAIN_DIST,
  C as RENDERER_DIST,
  _ as VITE_DEV_SERVER_URL
};
