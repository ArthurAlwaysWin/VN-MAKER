# Phase 6: Asset Library Foundation - Research

**Researched:** 2025-07-21
**Domain:** Electron IPC file management, magic bytes validation, FontFace API, Pinia store patterns
**Confidence:** HIGH

## Summary

Phase 6 builds the backend infrastructure for asset management: file import with dual validation (magic bytes + extension whitelist), automatic naming conflict resolution, custom font loading in both Electron renderer processes, and new IPC handlers. This is a zero-dependency phase — all capabilities come from built-in Node.js and browser APIs already available in the Electron 41 stack.

The existing codebase has clear patterns to follow: 13 IPC handlers in `electron/main.js` using `ipcMain.handle` + `{success, error}` returns, two Pinia stores (project.js, script.js) using Composition API, and an established `upload-asset` handler that needs enhancement rather than replacement. The critical finding from CONTEXT.md is that `select-asset` IPC is called in SettingsDesigner.vue (lines 508, 525) but **does not exist** in main.js — this must be implemented in Phase 6.

**Primary recommendation:** Enhance the existing `upload-asset` IPC handler with validation + auto-naming (don't create a separate handler), create a new `assets.js` Pinia store for cached file lists, and build a shared `fontLoader.js` module that uses FontFace API for both editor and engine windows.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 单文件导入失败时，在上传按钮下方显示红色内联提示："该资产不支持此文件格式，请上传对应的文件格式"，并列出该分类支持的格式列表
- **D-02:** 批量导入时跳过无效文件，导入所有有效文件，然后列出导入失败的文件名
- **D-03:** 格式验证使用 magic bytes + 扩展名白名单双重检查（PNG/JPG/WEBP, MP3/OGG/WAV, TTF/OTF/WOFF/WOFF2）
- **D-04:** 项目打开时一次性加载所有自定义字体（FontFace API），确保字体下拉和预览立即可用
- **D-05:** 字体文件损坏（FontFace 加载失败）时：跳过该字体 + 红字提示"XX.ttf 加载失败" + 弹窗询问用户是否删除损坏字体文件，其他字体正常加载
- **D-06:** 新导入的字体立即热加载到当前编辑器窗口，无需重新打开项目
- **D-07:** 新建项目自带 `assets/fonts/` 目录（与 backgrounds/characters/audio/ui 并列）
- **D-08:** 旧项目打开时自动创建 `assets/fonts/` 目录（无感迁移，无需用户操作）

### Agent's Discretion
- Auto-naming 具体编号算法（扫描目标目录已有文件，找最大编号+1）
- Magic bytes 签名表的具体实现细节（12 种格式签名）
- fontLoader.js 的模块结构和错误处理内部实现
- IPC 处理器的具体参数和返回值格式

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASSET-03 | 导入文件时自动验证格式（magic bytes + 扩展名白名单：图片 PNG/JPG/WEBP，音频 MP3/OGG/WAV，字体 TTF/OTF/WOFF/WOFF2） | Magic bytes signature table (§Standard Stack), validateAsset.js pattern (§Architecture Patterns), dual-check validation flow (§Code Examples) |
| ASSET-04 | 文件名冲突时自动追加编号（背景-1.png, 背景-2.png） | Auto-naming algorithm using path.parse + fs.readdir (§Architecture Patterns), race condition prevention (§Common Pitfalls) |
| ASSET-12 | 自定义字体作为一等资源导入到 assets/fonts/，在所有设计器字体下拉中可用 | Font metadata in script.json assets.fonts[] (§Architecture Patterns), FontFace API usage (§Code Examples), font data model (§Standard Stack) |
| INFRA-02 | fontLoader.js 共享模块在编辑器和引擎双进程独立加载自定义字体（FontFace API） | Shared fontLoader.js module design (§Architecture Patterns), dual-process font injection (§Code Examples), Pitfall #2 prevention (§Common Pitfalls) |
| INFRA-03 | 实现资源管理 IPC 处理器（select-asset / import-assets / delete-asset / list-assets / load-font-metadata） | IPC handler patterns from existing codebase (§Architecture Patterns), handler signatures and return types (§Code Examples), select-asset critical finding (§Architecture Patterns) |
| INFRA-04 | 所有新 IPC 调用解构 Vue reactive Proxy 为纯对象后再发送 | JSON.parse(JSON.stringify()) pattern from project.js line 51 (§Code Examples), Pitfall #3 prevention (§Common Pitfalls) |
</phase_requirements>

## Standard Stack

### Core (Existing — No Changes)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Electron | 41.0.4 | Desktop shell (Chromium 136 + Node 22.x) | ✅ Keep |
| Vue 3 | 3.5.31 | Editor UI framework | ✅ Keep |
| Pinia | 3.0.4 | State management | ✅ Keep |
| Vite | 6.3.0 | Build tool + dev server | ✅ Keep |

### New Built-in APIs (Zero npm Dependencies)

| API | Available In | Purpose | Confidence |
|-----|-------------|---------|------------|
| `FontFace` constructor + `document.fonts.add()` | Chromium 136 (Electron 41) | Load custom .ttf/.otf/.woff/.woff2 fonts programmatically | HIGH |
| `fs.promises.readFile` (first 12 bytes) | Node.js 22 (Electron main) | Read magic bytes for format validation | HIGH |
| `path.parse()` + `fs.readdir()` | Node.js 22 (Electron main) | Auto-naming conflict resolution | HIGH |
| `dialog.showOpenDialog` with filters | Electron 41 | File picker for asset selection (`select-asset`) | HIGH |
| `dialog.showMessageBox` | Electron 41 | Corrupt font deletion confirmation | HIGH |

### Alternatives Explicitly Rejected

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Custom magic bytes (40 lines) | `file-type` npm v22 | Requires Node ≥ 22 version concern with Electron bundled Node; adds 4 transitive deps for 12 signatures |
| FontFace API | CSS `@font-face` style injection | Messy — creates/removes `<style>` tags; FontFace is cleaner programmatic API |
| Custom auto-naming | No library exists | 5-line string manipulation; naming convention is app-specific (Chinese-language support) |

**Installation:**
```bash
# No new packages to install. Zero new npm dependencies.
npm install  # only if fresh clone
```

### Magic Bytes Signature Table

These 12 format signatures cover all required asset types:

| Format | Extension | Magic Bytes (hex) | Offset | Bytes to Read |
|--------|-----------|-------------------|--------|---------------|
| PNG | .png | `89 50 4E 47` | 0 | 4 |
| JPEG | .jpg/.jpeg | `FF D8 FF` | 0 | 3 |
| WebP | .webp | `52 49 46 46` + `57 45 42 50` at offset 8 | 0, 8 | 12 |
| MP3 (ID3) | .mp3 | `49 44 33` | 0 | 3 |
| MP3 (sync) | .mp3 | `FF FB` or `FF F3` or `FF F2` | 0 | 2 |
| OGG | .ogg | `4F 67 67 53` | 0 | 4 |
| WAV | .wav | `52 49 46 46` + `57 41 56 45` at offset 8 | 0, 8 | 12 |
| TTF | .ttf | `00 01 00 00` | 0 | 4 |
| OTF | .otf | `4F 54 54 4F` | 0 | 4 |
| WOFF | .woff | `77 4F 46 46` | 0 | 4 |
| WOFF2 | .woff2 | `77 4F 46 32` | 0 | 4 |

**Note on GIF/BMP:** The REQUIREMENTS say PNG/JPG/WEBP for images — GIF and BMP are NOT in the required whitelist. The ARCHITECTURE research listed them as extras, but user decision D-03 specifies only PNG/JPG/WEBP. Follow D-03.

### Font Metadata Data Model

Fonts are unique among asset types because they need metadata in `script.json` (the CSS font-family mapping). Other assets (images, audio) are just files on disk.

```json
{
  "assets": {
    "fonts": [
      {
        "id": "font-1719000000000-1",
        "name": "My Custom Font",
        "file": "fonts/MyCustomFont.ttf",
        "family": "UserFont-MyCustomFont"
      }
    ]
  }
}
```

**Key design choice:** Use a `UserFont-` prefix for the CSS font-family name to avoid collisions with system fonts. The `family` field is what goes into CSS `font-family` declarations.

## Architecture Patterns

### New Module Map

```
electron/
├── main.js              ← MODIFY: add fonts/ to create-project, auto-create in load-project
│                          add new IPC handlers: select-asset, import-assets, delete-asset, list-assets
├── validateAsset.js     ← NEW: magic bytes + extension whitelist validation
└── preload.mjs          (unchanged — already exposes invoke/send/on)

src/
├── engine/
│   └── fontLoader.js    ← NEW: shared FontFace API wrapper (used by both editor + engine)
├── editor/
│   └── stores/
│       └── assets.js    ← NEW: Pinia store for cached asset file lists
└── main.js              ← MODIFY: load custom fonts after engine.load() in init()
```

### Pattern 1: IPC Handler Pattern (Follow Existing)

**What:** All IPC handlers return `{ success: boolean, error?: string, ...data }`. Never throw across IPC boundary.

**Existing pattern from `electron/main.js`:**
```javascript
ipcMain.handle('handler-name', async (event, args) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };
    // ... do work ...
    return { success: true, /* ...result data */ };
  } catch (e) {
    console.error('Failed to [action]:', e);
    return { success: false, error: e.message };
  }
});
```

**Apply to all 4 new handlers:** `select-asset`, `import-assets`, `delete-asset`, `list-assets`.

### Pattern 2: Pinia Store Pattern (Follow project.js / script.js)

**What:** Composition API stores using `ref()` + `computed()` + async IPC wrappers.

**Key considerations for the new `assets.js` store:**
- Asset file lists are **filesystem state**, NOT document state — they must NOT be in undo history
- That's why it's a separate store (not extending script.js)
- Multiple components will read it: AssetLibrary (Phase 7), SettingsDesigner (font dropdown), TitleDesigner (Phase 8)
- Must use `JSON.parse(JSON.stringify())` before any IPC call (INFRA-04)

```javascript
// src/editor/stores/assets.js — Composition API Pinia store
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAssetStore = defineStore('assets', () => {
  const files = ref({
    backgrounds: [],
    characters: [],
    audio: [],
    fonts: [],
    ui: [],
  });

  const fontMeta = ref([]);  // script.data.assets.fonts[] mirror
  const isLoading = ref(false);

  async function loadCategory(category) { /* IPC list-assets */ }
  async function loadAll() { /* load all categories */ }
  async function importAssets(category, fileDataArray) { /* IPC import-assets */ }
  async function deleteAsset(category, filename) { /* IPC delete-asset */ }

  return { files, fontMeta, isLoading, loadAll, loadCategory, importAssets, deleteAsset };
});
```

### Pattern 3: Validation Flow (Main Process Only)

**What:** All file validation happens in the Electron main process, not the renderer. The renderer sends raw file data; main process validates.

```
Renderer (Vue)                    Main Process (Node.js)
─────────────────                 ──────────────────────
File input → ArrayBuffer      →  import-assets IPC handler
  → Uint8Array → Array           ├─ 1. Check extension whitelist
                                  ├─ 2. Read first 12 bytes (magic bytes)
                                  ├─ 3. Compare against signature table
                                  ├─ 4. If invalid: add to errors[]
                                  ├─ 5. If valid: auto-name if conflict
                                  ├─ 6. Write file to assets/{category}/
                                  └─ Return { imported[], errors[] }
```

### Pattern 4: Font Loading (Shared Module — Dual Process)

**What:** A single `fontLoader.js` module that works in both renderer processes.

**Critical insight:** The editor (`editor.html`) and engine preview (`index.html`) are separate Electron BrowserWindows with independent `document` objects. Fonts registered via FontFace API in one window are NOT visible in the other. Each window must independently load fonts.

**Location:** `src/engine/fontLoader.js` — importable by both `src/editor/` and `src/main.js`

```javascript
// src/engine/fontLoader.js
/**
 * FontLoader — Load custom fonts via FontFace API
 * Shared between editor and engine renderer processes.
 */

/**
 * Load all project fonts into the current document.
 * @param {Array<{family: string, file: string}>} fonts — from script.assets.fonts
 * @param {string} baseUrl — 'asset://' for Electron, '/game/' for fallback
 * @returns {Promise<{loaded: string[], failed: Array<{family: string, error: string}>}>}
 */
export async function loadAllFonts(fonts, baseUrl = 'asset://') {
  const loaded = [];
  const failed = [];

  for (const fontMeta of fonts) {
    try {
      const url = `${baseUrl}${fontMeta.file}`;
      const face = new FontFace(fontMeta.family, `url('${url}')`);
      await face.load();
      document.fonts.add(face);
      loaded.push(fontMeta.family);
    } catch (err) {
      failed.push({ family: fontMeta.family, file: fontMeta.file, error: err.message });
    }
  }

  return { loaded, failed };
}

/**
 * Load a single font (for hot-reload after import).
 * @param {{family: string, file: string}} fontMeta
 * @param {string} baseUrl
 * @returns {Promise<boolean>}
 */
export async function loadSingleFont(fontMeta, baseUrl = 'asset://') {
  try {
    const url = `${baseUrl}${fontMeta.file}`;
    const face = new FontFace(fontMeta.family, `url('${url}')`);
    await face.load();
    document.fonts.add(face);
    return true;
  } catch (err) {
    console.error(`[FontLoader] Failed to load ${fontMeta.file}:`, err);
    return false;
  }
}
```

### Pattern 5: Auto-Naming Algorithm

**What:** When a file name conflicts with an existing file, append `-N` where N is the smallest available number.

```
Input: "背景.png" into backgrounds/ (which already has 背景.png, 背景-1.png)
Algorithm:
  1. path.parse("背景.png") → { name: "背景", ext: ".png" }
  2. readdir backgrounds/ → ["背景.png", "背景-1.png", "其他.png"]
  3. Filter: files starting with "背景" + optional "-N" + ".png"
  4. Extract existing numbers: [0 (implicit), 1]
  5. Next number: max(0, 1) + 1 = 2
  6. Result: "背景-2.png"
```

### Pattern 6: select-asset IPC (Missing Handler)

**Critical:** `SettingsDesigner.vue` lines 508 and 525 call `window.ipcRenderer.invoke('select-asset', { types: ['backgrounds'] })` but this handler does NOT exist in `electron/main.js`. It must be implemented.

```javascript
// Expected behavior: open native file dialog filtered by asset type
ipcMain.handle('select-asset', async (event, { types }) => {
  // Map types to dialog filters
  const filterMap = {
    backgrounds: { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
    characters: { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
    audio: { name: '音频', extensions: ['mp3', 'ogg', 'wav'] },
    fonts: { name: '字体', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
  };
  
  const filters = types.map(t => filterMap[t]).filter(Boolean);
  const result = await dialog.showOpenDialog(getMainWindow(), {
    properties: ['openFile'],
    filters,
    title: '选择资源文件',
  });
  
  if (result.canceled) return null;
  // Return relative path from project assets directory
  // ... copy file to assets/ + return asset:// relative path
});
```

### Anti-Patterns to Avoid

- **Don't validate in the renderer:** All file validation (magic bytes, extension checks) MUST happen in the main process. The renderer sends raw data; main process validates before writing.
- **Don't store font binary data in script.json:** Only store metadata (name, path, family). The font file lives on disk at `assets/fonts/`.
- **Don't use `@font-face` CSS injection:** Use the FontFace constructor API instead. It's cleaner and doesn't require managing `<style>` elements.
- **Don't create a separate `upload-validated-asset` handler:** Enhance the existing `upload-asset` handler with validation, or rename it to `import-assets` with new behavior. Don't add both.

### Project Directory Changes

**`create-project` handler (line 86):** Add `assets/fonts/` directory creation:
```javascript
await fs.mkdir(path.join(projectDir, 'assets', 'fonts'), { recursive: true });
```

**`load-project` handler (line 155):** Auto-create fonts/ for legacy projects:
```javascript
// After loading project, ensure fonts/ directory exists (D-08: backwards compatibility)
await fs.mkdir(path.join(projectPath, 'assets', 'fonts'), { recursive: true });
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File format detection | Full MIME type library | 40-line magic bytes checker with 12 signatures | Only 12 specific formats needed; `file-type` adds 4 deps |
| Font loading | CSS `@font-face` style tag injection | FontFace constructor API | Programmatic, promise-based, cleaner lifecycle |
| File dialog | Custom file browser component | Electron `dialog.showOpenDialog` with filters | Native OS dialog, already used in 3 existing handlers |
| Path security | Custom path validation | Existing `isInsideProject()` function | Already battle-tested, used by every file handler |
| Atomic file write | Manual temp/rename | Existing `atomicWrite()` function | Already handles Windows edge cases |

**Key insight:** This phase creates ~4 new utility files. Everything else is enhancing existing patterns. Don't invent new patterns when the codebase has proven ones.

## Common Pitfalls

### Pitfall 1: Reactive Proxy Leaking into IPC Calls (INFRA-04)

**What goes wrong:** Sending Vue reactive objects through Electron IPC fails with structured clone errors ("could not be cloned").
**Why it happens:** Already encountered and fixed in v0.1. New asset store introduces more IPC calls with reactive data.
**How to avoid:** Always `JSON.parse(JSON.stringify(data))` before IPC calls. The existing `project.js` store does this at line 51. Apply the same pattern in the new `assets.js` store for all IPC calls.
**Warning signs:** Console errors mentioning "could not be cloned" or silent failure of import/delete operations.

### Pitfall 2: Font Not Loading in Engine Preview Window (INFRA-02)

**What goes wrong:** Custom fonts work in the editor but not in the game preview window, or vice versa.
**Why it happens:** Editor and engine run in separate BrowserWindows with separate `document` objects. FontFace registered in one is invisible in the other.
**How to avoid:** The shared `fontLoader.js` must be called independently in each window's initialization:
  - Editor: call in `App.vue` project-load flow + after font import (hot-reload)
  - Engine: call in `src/main.js init()` after `engine.load()` and before `showTitle()`
**Warning signs:** Font dropdown shows the font name but preview renders fallback system font in one window.

### Pitfall 3: Auto-Naming Race Condition

**What goes wrong:** Two rapid imports of same-named files could both check existence simultaneously and write to the same counter.
**Why it happens:** If `import-assets` is called twice in quick succession.
**How to avoid:** Process files sequentially within a single `import-assets` call using `for...of` with `await`. The main process is single-threaded, so sequential `await` prevents races.
**Warning signs:** File overwrite despite auto-naming logic being present.

### Pitfall 4: Font Metadata Orphaned After Font File Deletion

**What goes wrong:** User deletes a font file via asset library, but the metadata entry in `script.data.assets.fonts[]` remains.
**Why it happens:** Font metadata lives in `script.json`, separate from the filesystem.
**How to avoid:** When `delete-asset` is called for a font, also remove the corresponding entry from `script.data.assets.fonts[]`. The IPC handler returns the filename; the store/component must update both sources.
**Warning signs:** Font dropdown shows a font name that fails to load (because the file was deleted).

### Pitfall 5: WebP/WAV 12-Byte Validation Needs RIFF Container Check

**What goes wrong:** A WAV file passes as WebP (or vice versa) because both start with `RIFF` header bytes.
**Why it happens:** WebP and WAV both use the RIFF container format: `52 49 46 46 [size] [type]`. The differentiator is at bytes 8-11: `WEBP` vs `WAVE`.
**How to avoid:** For RIFF-based formats, always read 12 bytes and check the sub-type at offset 8.
**Warning signs:** WAV files rejected as "invalid image" or WebP files accepted as "valid audio".

### Pitfall 6: FontFace URL Must Use Proper asset:// Protocol Format

**What goes wrong:** FontFace constructor rejects the URL, font doesn't load despite file existing on disk.
**Why it happens:** The `asset://` protocol URL format must match how `electron/main.js` registers the protocol handler (line 387). The handler parses `url.hostname + url.pathname` — so `asset://fonts/MyFont.ttf` means hostname=`fonts`, pathname=`/MyFont.ttf`.
**How to avoid:** Test font loading with the exact URL format the protocol handler expects. Look at existing usage in `Assets.vue`: `` `asset://${currentTab}/${file.name}` `` — this is the proven pattern.
**Warning signs:** 403 Forbidden or network error in console when loading font.

## Code Examples

### Example 1: Magic Bytes Validation Module

```javascript
// electron/validateAsset.js
/**
 * Asset format validation — magic bytes + extension whitelist.
 * @module validateAsset
 */
import { readFile } from 'node:fs/promises';

const SIGNATURES = {
  // Images
  png:  { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
  jpeg: { bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
  webp: { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, sub: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 } },
  // Audio
  mp3_id3: { bytes: [0x49, 0x44, 0x33], offset: 0 },
  mp3_sync: { bytes: [0xFF, 0xFB], offset: 0, alt: [[0xFF, 0xF3], [0xFF, 0xF2]] },
  ogg:  { bytes: [0x4F, 0x67, 0x67, 0x53], offset: 0 },
  wav:  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, sub: { bytes: [0x57, 0x41, 0x56, 0x45], offset: 8 } },
  // Fonts
  ttf:  { bytes: [0x00, 0x01, 0x00, 0x00], offset: 0 },
  otf:  { bytes: [0x4F, 0x54, 0x54, 0x4F], offset: 0 },
  woff: { bytes: [0x77, 0x4F, 0x46, 0x46], offset: 0 },
  woff2:{ bytes: [0x77, 0x4F, 0x46, 0x32], offset: 0 },
};

const CATEGORY_FORMATS = {
  backgrounds: { extensions: ['.png', '.jpg', '.jpeg', '.webp'], signatures: ['png', 'jpeg', 'webp'] },
  characters:  { extensions: ['.png', '.jpg', '.jpeg', '.webp'], signatures: ['png', 'jpeg', 'webp'] },
  audio:       { extensions: ['.mp3', '.ogg', '.wav'], signatures: ['mp3_id3', 'mp3_sync', 'ogg', 'wav'] },
  fonts:       { extensions: ['.ttf', '.otf', '.woff', '.woff2'], signatures: ['ttf', 'otf', 'woff', 'woff2'] },
  ui:          { extensions: ['.png', '.jpg', '.jpeg', '.webp'], signatures: ['png', 'jpeg', 'webp'] },
};

function matchesSignature(buffer, sig) {
  // Check main bytes
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buffer[sig.offset + i] !== sig.bytes[i]) return false;
  }
  // Check sub-type (RIFF containers: WebP vs WAV)
  if (sig.sub) {
    for (let i = 0; i < sig.sub.bytes.length; i++) {
      if (buffer[sig.sub.offset + i] !== sig.sub.bytes[i]) return false;
    }
  }
  return true;
}

/**
 * Validate a file buffer against the allowed formats for a category.
 * @param {Buffer} buffer — first 12+ bytes of the file
 * @param {string} extension — file extension including dot (e.g., '.png')
 * @param {string} category — 'backgrounds' | 'characters' | 'audio' | 'fonts' | 'ui'
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateAssetFormat(buffer, extension, category) {
  const rules = CATEGORY_FORMATS[category];
  if (!rules) return { valid: false, reason: `Unknown category: ${category}` };

  const ext = extension.toLowerCase();
  if (!rules.extensions.includes(ext)) {
    return { valid: false, reason: `不支持的文件格式 ${ext}` };
  }

  const matchesAny = rules.signatures.some(sigName => {
    const sig = SIGNATURES[sigName];
    if (matchesSignature(buffer, sig)) return true;
    // Check alt signatures (e.g., MP3 sync bytes)
    if (sig.alt) return sig.alt.some(altBytes => matchesSignature(buffer, { bytes: altBytes, offset: 0 }));
    return false;
  });

  if (!matchesAny) {
    return { valid: false, reason: `文件内容与 ${ext} 格式不匹配` };
  }

  return { valid: true };
}

/** Get the list of supported extensions for a category (for error messages) */
export function getSupportedFormats(category) {
  return CATEGORY_FORMATS[category]?.extensions || [];
}
```

### Example 2: Auto-Naming Conflict Resolution

```javascript
// Inside electron/main.js — utility for import-assets handler
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Generate a unique filename in the target directory.
 * If "背景.png" exists, returns "背景-1.png", "背景-2.png", etc.
 */
async function uniqueFilename(dir, originalName) {
  const { name, ext } = path.parse(originalName);
  const existing = await fs.readdir(dir).catch(() => []);

  let candidate = originalName;
  let counter = 1;

  while (existing.includes(candidate)) {
    candidate = `${name}-${counter}${ext}`;
    counter++;
  }

  return candidate;
}
```

### Example 3: import-assets IPC Handler

```javascript
// In electron/main.js
ipcMain.handle('import-assets', async (event, { category, files }) => {
  // files: Array<{ name: string, data: number[] }>
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const dir = path.join(currentProjectPath, 'assets', category);
    if (!isInsideProject(dir)) return { success: false, error: 'Invalid path' };
    await fs.mkdir(dir, { recursive: true });

    const imported = [];
    const errors = [];

    for (const file of files) {
      const buffer = Buffer.from(file.data);
      const ext = path.extname(file.name);

      // Validate format
      const validation = validateAssetFormat(buffer, ext, category);
      if (!validation.valid) {
        errors.push({ name: file.name, reason: validation.reason });
        continue;  // D-02: skip invalid, continue with valid
      }

      // Auto-name if conflict (ASSET-04)
      const safeName = await uniqueFilename(dir, file.name);
      const fullPath = path.join(dir, safeName);

      if (!isInsideProject(fullPath)) {
        errors.push({ name: file.name, reason: 'Path security violation' });
        continue;
      }

      await fs.writeFile(fullPath, buffer);
      imported.push({ original: file.name, saved: safeName });
    }

    return { success: true, imported, errors, supportedFormats: getSupportedFormats(category) };
  } catch (e) {
    console.error('[import-assets] Failed:', e);
    return { success: false, error: e.message };
  }
});
```

### Example 4: Font Loading in Engine Init

```javascript
// In src/main.js — add after engine.load() in init()
import { loadAllFonts } from './engine/fontLoader.js';

async function init() {
  // ... existing code ...
  await engine.load('/game/script.json');

  // Load custom fonts before any rendering (INFRA-02)
  if (engine.script.assets?.fonts?.length) {
    const fontResult = await loadAllFonts(engine.script.assets.fonts, 'asset://');
    if (fontResult.failed.length) {
      console.warn('[GalgameMaker] Some fonts failed to load:', fontResult.failed);
    }
  }

  // ... continue with title screen setup ...
}
```

### Example 5: Font Hot-Reload After Import in Editor

```javascript
// In editor: after import-assets returns successfully for fonts category
import { loadSingleFont } from '../../engine/fontLoader.js';

async function onFontImported(fontMeta) {
  // 1. Add metadata to script.data.assets.fonts[]
  script.data.assets ??= {};
  script.data.assets.fonts ??= [];
  script.data.assets.fonts.push(fontMeta);
  script.pushState();

  // 2. Hot-load the font in current editor window (D-06)
  const success = await loadSingleFont(fontMeta, 'asset://');
  if (!success) {
    // D-05: font corrupt — show error, offer delete
  }
}
```

### Example 6: Proxy Deconstruction Pattern (INFRA-04)

```javascript
// The proven pattern from project.js line 51:
const result = await window.ipcRenderer.invoke('save-project', {
  project: JSON.parse(JSON.stringify(projectData.value)),
  script: JSON.parse(JSON.stringify(scriptData))
});

// Apply the same in assets.js store:
async function importAssets(category, fileDataArray) {
  const cleanData = JSON.parse(JSON.stringify(fileDataArray));
  return await window.ipcRenderer.invoke('import-assets', {
    category,
    files: cleanData,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `type: 'text'` in TitleScreen schema | `type: 'label'` (aligned with SettingsScreen) | Phase 8 (not Phase 6) | Phase 6 doesn't touch TitleScreen schema — font loading only |
| Hardcoded font dropdown (5 options) | Dynamic from `assets.fonts[]` | This phase | SettingsDesigner font dropdown becomes dynamic (data source ready in Phase 6, UI update can happen in Phase 7 or Phase 8) |
| No format validation on upload | Magic bytes + extension whitelist | This phase | Old `upload-asset` just wrote blindly; new `import-assets` validates first |
| No `assets/fonts/` directory | Auto-created for new + legacy projects | This phase | Project folder structure gains 5th subdirectory |

## Open Questions

1. **select-asset return value format**
   - What we know: SettingsDesigner.vue calls `invoke('select-asset', { types: ['backgrounds'] })` and uses the result directly as `layout.background` (a string path)
   - What's unclear: Should select-asset also copy the file into the project, or just open a picker from existing project assets? Looking at usage context (line 508-510), it appears to be selecting from **already-imported** project assets, not importing a new external file.
   - Recommendation: `select-asset` should open a native file dialog filtered to the project's `assets/{category}/` directory and return a relative path like `backgrounds/sunset.png`. This matches how `asset://` URLs are constructed. If the user picks a file from outside the project, copy it in first (using the import-assets validation pipeline).

2. **Font family name generation from filename**
   - What we know: Need a CSS font-family string derived from the font file name
   - What's unclear: Should it use the internal font name (from the font file's name table) or derive from filename?
   - Recommendation: Derive from filename with `UserFont-` prefix (e.g., `UserFont-NotoSerifSC` from `NotoSerifSC.ttf`). Reading the font name table would require parsing binary font format — overkill for Phase 6. Users can rename in Phase 7's asset library UI.

3. **Should the old `upload-asset` handler be replaced or kept?**
   - What we know: `upload-asset` is used in `Assets.vue` (line 77) which will be replaced by `AssetLibrary.vue` in Phase 7
   - What's unclear: Will Phase 7 replace all callers of `upload-asset`?
   - Recommendation: Keep `upload-asset` unchanged for now (backward compat), add `import-assets` as the new validated handler. Phase 7 can remove `upload-asset` when `Assets.vue` is retired.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework installed |
| Config file | None — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASSET-03 | Magic bytes + extension validates correctly / rejects bad files | unit | Manual validation in dev — no test runner | ❌ Wave 0 |
| ASSET-04 | Auto-naming generates unique filenames | unit | Manual validation in dev | ❌ Wave 0 |
| ASSET-12 | Font imported, metadata saved, FontFace loads | integration | Manual: import font, check in both windows | ❌ Wave 0 |
| INFRA-02 | fontLoader.js works in both editor + engine windows | integration | Manual: open preview, check font rendering | ❌ Wave 0 |
| INFRA-03 | IPC handlers return correct results | integration | Manual: trigger each handler, verify response | ❌ Wave 0 |
| INFRA-04 | No Proxy serialization errors in new IPC calls | smoke | Manual: import asset from Vue component, check console | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Manual smoke test — import a file, check console for errors
- **Per wave merge:** Manual integration test — import PNG, import invalid file, import font, check preview window
- **Phase gate:** All 4 success criteria verified manually before `/gsd-verify-work`

### Wave 0 Gaps
- No test framework is installed. Project has zero test infrastructure.
- Adding a test framework is OUT OF SCOPE for Phase 6 (not in requirements). All validation is manual.
- If Wave 0 tasks are desired, they would be: `npm install -D vitest`, create `vitest.config.js`, write unit tests for `validateAsset.js` and `uniqueFilename`. But this is purely optional — the project has shipped v0.1 without any tests.

*(Decision: Skip Wave 0 — project has no test infrastructure and adding it is not a Phase 6 requirement. All validation is manual via the running application.)*

## Sources

### Primary (HIGH confidence)
- **Codebase analysis**: `electron/main.js` (13 IPC handlers, 401 lines), `electron/preload.js`, `src/editor/stores/project.js`, `src/editor/stores/script.js`, `src/editor/views/Assets.vue`, `src/editor/views/Characters.vue`, `src/editor/views/SettingsDesigner.vue`, `src/ui/TitleScreen.js`, `src/main.js`, `src/engine/settingDefs.js`
- **FontFace API**: MDN Web Docs — stable API, available in Chromium since Chrome 35 (Electron 41 uses Chromium 136)
- **Magic byte signatures**: Wikipedia: List of file signatures — well-established standard signatures

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — Verified against actual package.json; zero-dependency conclusion confirmed
- `.planning/research/ARCHITECTURE.md` — Verified integration patterns against actual codebase
- `.planning/research/PITFALLS.md` — All 11 pitfalls verified by reading referenced code locations

### Tertiary (LOW confidence)
- None — all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Zero new deps; all built-in APIs verified in Electron 41/Chromium 136
- Architecture: HIGH — All patterns derived from existing codebase code review
- Pitfalls: HIGH — Every pitfall traced to actual code locations in the repository
- Font loading: HIGH — FontFace API is a stable web standard; asset:// protocol verified working in existing Assets.vue

**Research date:** 2025-07-21
**Valid until:** 2025-08-21 (stable — no fast-moving dependencies)
