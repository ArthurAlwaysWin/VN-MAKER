import { protocol as T, ipcMain as d, dialog as P, BrowserWindow as D, app as O, net as q } from "electron";
import r from "node:path";
import { fileURLToPath as G, pathToFileURL as H } from "node:url";
import o from "node:fs/promises";
import { existsSync as y } from "node:fs";
const Y = {
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
  mp4_audio: {
    bytes: [102, 116, 121, 112],
    offset: 4
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
}, A = {
  backgrounds: {
    extensions: [".png", ".jpg", ".jpeg", ".webp"],
    signatures: ["png", "jpeg", "webp"]
  },
  characters: {
    extensions: [".png", ".jpg", ".jpeg", ".webp"],
    signatures: ["png", "jpeg", "webp"]
  },
  audio: {
    extensions: [".mp3", ".ogg", ".wav", ".m4a", ".mp4", ".aac"],
    signatures: ["mp3_id3", "mp3_sync", "mp4_audio", "ogg", "wav"]
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
function K(n, t) {
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
function N(n, t, e) {
  const s = A[e];
  if (!s)
    return { valid: !1, reason: `Unknown category: ${e}` };
  const a = t.toLowerCase();
  return s.extensions.includes(a) ? s.signatures.some((l) => {
    const c = Y[l];
    return c && K(n, c);
  }) ? { valid: !0 } : { valid: !1, reason: `文件内容与 ${a} 格式不匹配` } : { valid: !1, reason: `不支持的文件格式 ${a}` };
}
function Q(n) {
  var t;
  return ((t = A[n]) == null ? void 0 : t.extensions) || [];
}
const U = r.dirname(G(import.meta.url));
T.registerSchemesAsPrivileged([
  {
    scheme: "asset",
    privileges: { standard: !0, supportFetchAPI: !0, stream: !0, bypassCSP: !0 }
  }
]);
let u = null, g;
function _() {
  return g || D.getFocusedWindow() || D.getAllWindows()[0] || null;
}
function J() {
  return r.join(O.getPath("userData"), "recent-projects.json");
}
async function V() {
  try {
    const n = await o.readFile(J(), "utf-8");
    return JSON.parse(n);
  } catch {
    return { hasCreatedProject: !1, projects: [] };
  }
}
async function $(n) {
  await o.writeFile(J(), JSON.stringify(n, null, 2), "utf-8");
}
async function B(n, t) {
  const e = await V();
  e.projects = e.projects.filter((s) => s.path !== n), e.projects.unshift({ path: n, name: t, openedAt: (/* @__PURE__ */ new Date()).toISOString() }), e.projects.length > 20 && (e.projects = e.projects.slice(0, 20)), e.hasCreatedProject = !0, await $(e);
}
function x(n) {
  const t = r.resolve(n), e = r.resolve(u);
  return t.startsWith(e + r.sep) || t === e;
}
function X(n) {
  return n.replace(/[<>:"|?*\\/]/g, "_").replace(/\.{2,}/g, "_").trim() || "untitled";
}
async function E(n, t) {
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
async function C(n, t) {
  const { name: e, ext: s } = r.parse(t), a = await o.readdir(n).catch(() => []);
  let i = t, l = 1;
  for (; a.includes(i); )
    i = `${e}-${l}${s}`, l++;
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
d.handle("create-project", async (n, { name: t, author: e, location: s, resolution: a, template: i }) => {
  try {
    const l = X(t), c = r.join(s, l);
    await o.mkdir(c, { recursive: !0 }), await o.mkdir(r.join(c, "assets", "backgrounds"), { recursive: !0 }), await o.mkdir(r.join(c, "assets", "characters"), { recursive: !0 }), await o.mkdir(r.join(c, "assets", "audio"), { recursive: !0 }), await o.mkdir(r.join(c, "assets", "ui"), { recursive: !0 }), await o.mkdir(r.join(c, "assets", "fonts"), { recursive: !0 });
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
    await o.writeFile(r.join(c, "project.json"), JSON.stringify(v, null, 2), "utf-8");
    let w = M();
    if (i === "demo") {
      const h = r.join(process.env.APP_ROOT, "public", "game");
      if (y(r.join(h, "script.json"))) {
        const m = JSON.parse(await o.readFile(r.join(h, "script.json"), "utf-8"));
        delete m.meta, w = m;
        for (const b of ["backgrounds", "characters", "audio"]) {
          const f = r.join(h, b), p = r.join(c, "assets", b);
          if (y(f)) {
            const j = await o.readdir(f);
            for (const S of j)
              await o.copyFile(r.join(f, S), r.join(p, S));
          }
        }
      }
    }
    return await o.writeFile(r.join(c, "script.json"), JSON.stringify(w, null, 2), "utf-8"), await B(c, t), { success: !0, path: c };
  } catch (l) {
    return console.error("Failed to create project:", l), { success: !1, error: l.message };
  }
});
d.handle("open-project", async () => {
  const n = await P.showOpenDialog(_(), {
    properties: ["openDirectory"],
    title: "选择项目文件夹"
  });
  if (n.canceled || n.filePaths.length === 0) return { canceled: !0 };
  const t = n.filePaths[0], e = y(r.join(t, "project.json")), s = y(r.join(t, "script.json"));
  return !e && !s ? { success: !1, error: "不是有效的项目文件夹：找不到 project.json 或 script.json" } : { success: !0, path: t, needsMigration: !e && s };
});
d.handle("load-project", async (n, t) => {
  try {
    let e, s;
    const a = r.join(t, "project.json"), i = r.join(t, "script.json");
    if (y(a) && (e = JSON.parse(await o.readFile(a, "utf-8"))), y(i) ? s = JSON.parse(await o.readFile(i, "utf-8")) : s = M(), !e && s.meta) {
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
      for (const l of ["backgrounds", "characters", "audio", "ui"])
        await o.mkdir(r.join(t, "assets", l), { recursive: !0 });
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
    }), u = t, await o.mkdir(r.join(t, "assets", "fonts"), { recursive: !0 }), await B(t, e.name), { success: !0, project: e, script: s, path: t };
  } catch (e) {
    return console.error("Failed to load project:", e), { success: !1, error: e.message };
  }
});
d.handle("save-project", async (n, { project: t, script: e }) => {
  if (!u) return { success: !1, error: "No project loaded" };
  try {
    return t.lastModified = (/* @__PURE__ */ new Date()).toISOString(), await E(r.join(u, "project.json"), JSON.stringify(t, null, 2)), await E(r.join(u, "script.json"), JSON.stringify(e, null, 2)), { success: !0 };
  } catch (s) {
    return console.error("Failed to save project:", s), { success: !1, error: s.message };
  }
});
d.handle("read-dir", async (n, t) => {
  try {
    if (!u) return [];
    const e = r.join(u, t);
    return x(e) ? (await o.readdir(e, { withFileTypes: !0 })).map((a) => ({ name: a.name, isDirectory: a.isDirectory() })) : [];
  } catch {
    return [];
  }
});
d.handle("upload-asset", async (n, { category: t, name: e, data: s }) => {
  try {
    if (!u) return !1;
    const a = r.join(u, "assets", t);
    return x(a) ? (await o.mkdir(a, { recursive: !0 }), await o.writeFile(r.join(a, e), Buffer.from(s)), !0) : !1;
  } catch (a) {
    return console.error("Failed to upload asset:", a), !1;
  }
});
d.handle("select-asset", async (n, { types: t }) => {
  try {
    if (!u) return null;
    const e = {
      backgrounds: { name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] },
      characters: { name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] },
      audio: { name: "音频", extensions: ["mp3", "ogg", "wav", "m4a", "mp4", "aac"] },
      fonts: { name: "字体", extensions: ["ttf", "otf", "woff", "woff2"] },
      ui: { name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] }
    }, s = t[0], a = t.map((S) => e[S]).filter(Boolean), i = r.join(u, "assets", s || ""), l = await P.showOpenDialog(_(), {
      properties: ["openFile"],
      filters: a,
      defaultPath: y(i) ? i : u,
      title: "选择资源文件"
    });
    if (l.canceled || l.filePaths.length === 0) return null;
    const c = l.filePaths[0], v = r.resolve(r.join(u, "assets")), w = r.resolve(c);
    if (w.startsWith(v + r.sep))
      return w.slice(v.length + 1).replace(/\\/g, "/");
    if (!s) return null;
    const h = await o.readFile(c), m = r.extname(c);
    if (!N(h.subarray(0, 12), m, s).valid) return null;
    const f = r.join(u, "assets", s);
    await o.mkdir(f, { recursive: !0 });
    const p = await C(f, r.basename(c)), j = r.join(f, p);
    return x(j) ? (await o.copyFile(c, j), `${s}/${p}`) : null;
  } catch (e) {
    return console.error("[select-asset] Failed:", e), null;
  }
});
d.handle("import-assets", async (n, { category: t, paths: e }) => {
  try {
    if (!u) return { success: !1, error: "No project loaded" };
    const s = r.join(u, "assets", t);
    if (!x(s)) return { success: !1, error: "Invalid path" };
    await o.mkdir(s, { recursive: !0 });
    const a = [], i = [];
    for (const l of e) {
      const c = r.basename(l), v = r.extname(c);
      let w;
      try {
        const f = await o.open(l, "r"), p = Buffer.alloc(12);
        await f.read(p, 0, 12, 0), await f.close(), w = p;
      } catch (f) {
        i.push({ name: c, reason: `无法读取文件: ${f.message}` });
        continue;
      }
      const h = N(w, v, t);
      if (!h.valid) {
        i.push({ name: c, reason: h.reason });
        continue;
      }
      const m = await C(s, c), b = r.join(s, m);
      if (!x(b)) {
        i.push({ name: c, reason: "Path security violation" });
        continue;
      }
      await o.copyFile(l, b), a.push({ original: c, saved: m });
    }
    return { success: !0, imported: a, errors: i, supportedFormats: Q(t) };
  } catch (s) {
    return console.error("[import-assets] Failed:", s), { success: !1, error: s.message };
  }
});
d.handle("delete-asset", async (n, { category: t, filename: e }) => {
  try {
    if (!u) return { success: !1, error: "No project loaded" };
    const s = r.join(u, "assets", t, e);
    return x(s) ? (await o.unlink(s), { success: !0 }) : { success: !1, error: "Invalid path" };
  } catch (s) {
    return console.error("[delete-asset] Failed:", s), { success: !1, error: s.message };
  }
});
d.handle("rename-asset", async (n, { category: t, oldName: e, newName: s }) => {
  try {
    if (!u) return { success: !1, error: "No project loaded" };
    const a = r.join(u, "assets", t), i = r.join(a, e), l = r.join(a, s);
    return !x(i) || !x(l) ? { success: !1, error: "Invalid path" } : y(i) ? y(l) && e !== s ? { success: !1, error: "File already exists" } : (await o.rename(i, l), { success: !0, newName: s }) : { success: !1, error: "File not found" };
  } catch (a) {
    return console.error("[rename-asset] Failed:", a), { success: !1, error: a.message };
  }
});
d.handle("list-assets", async (n, { category: t }) => {
  try {
    if (!u) return { success: !1, error: "No project loaded" };
    const e = r.join(u, "assets", t);
    return x(e) ? y(e) ? { success: !0, files: (await o.readdir(e, { withFileTypes: !0 })).filter((i) => !i.isDirectory()).map((i) => i.name) } : { success: !0, files: [] } : { success: !1, error: "Invalid path" };
  } catch (e) {
    return console.error("[list-assets] Failed:", e), { success: !1, error: e.message };
  }
});
d.handle("get-recent-projects", async () => await V());
d.handle("update-recent-projects", async (n, t) => (await $(t), !0));
d.handle("close-project", () => {
  u = null;
});
d.handle("set-window-mode", (n, t) => {
  const e = _();
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
d.handle("show-save-dialog", async () => {
  const { response: n } = await P.showMessageBox(_(), {
    type: "warning",
    buttons: ["保存", "不保存", "取消"],
    defaultId: 0,
    cancelId: 2,
    title: "未保存的修改",
    message: "项目有未保存的修改，是否保存？"
  });
  return ["save", "discard", "cancel"][n];
});
d.handle("dialog-open-directory", async () => {
  try {
    const n = await P.showOpenDialog(_(), {
      properties: ["openDirectory"],
      title: "选择保存位置"
    });
    return n.canceled ? null : n.filePaths[0];
  } catch (n) {
    return console.error("dialog-open-directory error:", n), null;
  }
});
let F = null;
d.handle("open-preview", (n, t) => {
  if (F) {
    F.focus();
    return;
  }
  F = new D({
    width: 1280,
    height: 720,
    autoHideMenuBar: !0
  });
  const e = t ? `?project=${encodeURIComponent(t)}` : "";
  process.env.VITE_DEV_SERVER_URL ? F.loadURL(process.env.VITE_DEV_SERVER_URL + "index.html" + e) : F.loadFile(r.join(process.env.APP_ROOT, "dist/index.html"), {
    search: e ? `project=${encodeURIComponent(t)}` : void 0
  }), F.on("closed", () => {
    F = null;
  });
});
process.env.APP_ROOT = r.join(U, "..");
const I = process.env.VITE_DEV_SERVER_URL, ae = r.join(process.env.APP_ROOT, "dist-electron"), L = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = I ? r.join(process.env.APP_ROOT, "public") : L;
function Z() {
  g = new D({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: r.join(U, "preload.mjs")
    }
  }), g.on("close", async (n) => {
    n.preventDefault();
    try {
      if (await g.webContents.executeJavaScript(
        "window.__hasDirtyProject ? window.__hasDirtyProject() : false"
      )) {
        const { response: e } = await P.showMessageBox(g, {
          type: "warning",
          buttons: ["保存", "不保存", "取消"],
          defaultId: 0,
          cancelId: 2,
          title: "未保存的修改",
          message: "项目有未保存的修改，是否保存？"
        });
        if (e === 2) return;
        e === 0 && await g.webContents.executeJavaScript("window.__saveCurrentProject()");
      }
    } catch {
    }
    g.destroy();
  }), I ? g.loadURL(I + "editor.html") : g.loadFile(r.join(L, "editor.html"));
}
O.on("window-all-closed", () => {
  process.platform !== "darwin" && (O.quit(), g = null);
});
O.whenReady().then(() => {
  T.handle("asset", async (n) => {
    const t = new URL(n.url), e = decodeURIComponent(t.hostname + t.pathname), s = u ? r.join(u, "assets") : r.join(process.env.APP_ROOT, "public", "game"), a = r.resolve(r.join(s, e)), i = r.resolve(s);
    if (!a.startsWith(i + r.sep) && a !== i)
      return new Response("Forbidden", { status: 403 });
    const l = n.headers.get("Range");
    if (l) {
      const v = (await o.stat(a)).size, w = l.match(/bytes=(\d+)-(\d*)/);
      if (w) {
        const h = parseInt(w[1], 10), m = w[2] ? parseInt(w[2], 10) : v - 1, b = m - h + 1, { createReadStream: f } = await import("node:fs"), p = f(a, { start: h, end: m });
        let j = !1;
        const S = (R) => {
          j || (j = !0, k.error(R));
        };
        let k;
        const W = new ReadableStream({
          start(R) {
            k = R, p.on("data", (z) => {
              j || R.enqueue(z);
            }), p.on("end", () => {
              j || (j = !0, R.close());
            }), p.on("error", S);
          },
          cancel() {
            j = !0, p.off("error", S), p.destroy(), p.on("error", () => {
            });
          }
        });
        return new Response(W, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${h}-${m}/${v}`,
            "Content-Length": String(b),
            "Accept-Ranges": "bytes"
          }
        });
      }
    }
    return q.fetch(H(a).toString());
  }), Z();
});
export {
  ae as MAIN_DIST,
  L as RENDERER_DIST,
  I as VITE_DEV_SERVER_URL
};
