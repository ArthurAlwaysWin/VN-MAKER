# Phase 27: Theme Presets + Export/Import - Research

**Researched:** 2026-04-06
**Domain:** ZIP packaging (fflate), canvas screenshot, Electron file dialogs, preset system design
**Confidence:** HIGH

## Summary

Phase 27 adds two distinct capabilities to the theme system: (1) built-in preset themes that users can apply with one click, and (2) export/import of themes as portable `.theme` files (ZIP). The preset system is straightforward — hardcoded token objects in a static module, applied via the existing `setTokenBatch()` + `commitTheme()` flow. The export/import system requires the fflate library for ZIP creation/extraction, new IPC handlers in Electron for file save/open dialogs, base64 ↔ binary conversion for nine-slice images, and a postMessage-based canvas screenshot for preview thumbnails.

The existing codebase provides strong foundations: `useThemeEditor.js` already has `setTokenBatch()`, `commitTheme()`, and `sendThemeToPreview()` that handle the full preset-apply flow. The `PaletteModal.vue` provides a proven modal pattern. The postMessage protocol between editor and engine iframe is well-established. The main gaps are: (1) no existing IPC for file save/open dialogs with custom extensions, (2) no fflate dependency yet, (3) no canvas screenshot implementation in the iframe engine.

**Primary recommendation:** Split into 2 plans — Plan 01 for presets (PresetModal + presets.js data + toolbar integration), Plan 02 for export/import (fflate ZIP packaging + IPC handlers + canvas capture + import flow).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 工具栏新增「预设」按钮，打开预设弹窗（与调色盘/九宫格弹窗同级模式）。弹窗内显示 4 张预设卡片（缩略图 + 名称 + 简介）。
- **D-02:** 点击卡片先「预览」——临时应用到 iframe（通过 sendThemeToPreview），不写入 store。再点「应用」按钮确认后 updateTheme() + pushState()，可 Ctrl+Z 回退。
- **D-03:** 弹窗下方增加「导出」和「导入」按钮（预设 + 导入导出合并一个弹窗）。
- **D-04:** 4 套内置预设：Modern (#4A90D9)、和风/Japanese (#C8A882)、Fantasy (#7B2FBE)、Minimal (#333333)。每套只含 token 值，不含九宫格图片。
- **D-05:** 预设数据硬编码在 `src/engine/presets.js`，导出预设数组，每个预设包含 `{ id, name, description, tokens }` 对象。发布时是静态数据，零运行时开销。
- **D-06:** 预设 token 值产出流程：开发时写 generatePresets 工具脚本 → 以主色 + colorHarmony 算法生成基础色盘 → 手动微调功能色（danger/warning）、透明度、hover/pressed 偏移、对话框相关色约 10-15 个 token → contrastRatio 检查 + autoFix 修正 → 最终结果硬编码进 presets.js。
- **D-07:** 用户可在预设基础上微调任意 token（PRE-02），预设只是一次性覆盖 ui.theme.tokens，之后所有修改独立生效。
- **D-08:** .theme 文件为 ZIP 格式（fflate 库打包），后缀名 `.theme`。
- **D-09:** ZIP 内部结构：`theme.json`（metadata + tokens + nineSlice 引用路径）+ `images/` 目录（九宫格图片提取为独立 PNG 文件 + previewImage）。导出时 base64 Data URL → 二进制文件，导入时反向转换。体积优于 base64 内联（~33% 缩小）。
- **D-10:** metadata 扩展字段：`{ formatVersion: 1, name, description, author, createdAt, previewImage: "images/preview.png" }`。formatVersion 确保未来前向兼容（PKG-03）。
- **D-11:** previewImage 导出时自动截图——通过 postMessage 发送 `capture-preview` 消息到引擎 iframe，引擎端用 canvas 截图返回 base64，然后写入 ZIP 的 `images/preview.png`。纯前端实现，不依赖 Electron API。
- **D-12:** 全量覆盖模式——导入的主题直接替换当前 `ui.theme`（与预设应用行为一致），推入撤销栈可 Ctrl+Z 回退。
- **D-13:** 九宫格图片不提取到项目 assets 目录——导入时直接将 ZIP 内图片文件转回 base64 Data URL 写入 `ui.theme.nineSlice`（运行时已用 base64，无需落盘）。
- **D-14:** 导入时 Electron 原生文件选择对话框选取 .theme 文件，渲染进程读取后解压处理。

### Agent's Discretion
- generatePresets 工具脚本的具体实现位置和运行方式
- 预设弹窗的卡片布局细节（网格排列、卡片尺寸）
- 引擎侧 capture-preview 消息处理的具体 canvas 截图实现
- 导出时 base64 → 二进制的转换工具函数实现
- theme.json 中 nineSlice 引用路径的命名约定
- 导出/导入时的错误处理和格式校验策略
- 预设弹窗中导入进度/状态反馈方式

### Deferred Ideas (OUT OF SCOPE)
- 社区主题市场/分享平台
- 主题包字体内嵌
- 更多内置预设（8-10 套覆盖不同题材）

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRE-01 | 内置 3-4 套精品主题预设，用户一键应用即获得专业美术风格 | presets.js static data + PresetModal card grid + setTokenBatch/commitTheme flow |
| PRE-02 | 用户可在预设基础上微调任意 token，而非只能整体覆盖 | Preset is one-time token batch overwrite; subsequent edits via existing token controls |
| PKG-01 | 用户可将当前主题导出为 .theme 文件（ZIP 包，含 token JSON + 引用的九宫格图片资源） | fflate zipSync API + base64→Uint8Array conversion + new IPC save-dialog |
| PKG-02 | 用户可导入 .theme 文件，自动提取图片到项目资源目录并应用 token | fflate unzipSync + Uint8Array→base64 conversion + new IPC open-dialog + updateTheme |
| PKG-03 | 主题文件包含 formatVersion 字段，确保未来版本前向兼容 | theme.json metadata schema with formatVersion: 1 |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript
- **Style**: Dark theme, pure CSS, Chinese interface
- **Named exports only** — no default exports in JS modules (Vue SFCs are implicit default)
- **Single quotes**, **2-space indent**, **semicolons always**, **explicit .js extensions**
- **File-level JSDoc** at top of every module
- **Constants**: UPPER_SNAKE_CASE
- **Composables**: camelCase with `use` prefix
- **Error handling**: `{ success: boolean, error?: string }` return objects for IPC, `console.error` with `[ModuleName]` prefix
- **Modal pattern**: `showXxx` ref → `v-if` conditional render → `@close` event
- **IPC pattern**: `window.ipcRenderer.invoke()` called in stores/components
- **Security**: No `data:` in `sanitizeCssValue()` — but nine-slice base64 bypasses this via direct DOM injection

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fflate | 0.8.2 | ZIP creation/extraction in browser | 8kB gzipped, fastest pure-JS ZIP, sync API, zero dependencies, ESM-native |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | All other functionality uses existing project dependencies (Vue 3, Pinia, Electron) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fflate | JSZip | JSZip is 45kB+ vs fflate 8kB; JSZip is async-only, fflate has sync API; fflate is significantly faster |
| fflate | Electron Node.js `archiver` | Would require IPC round-trip for every ZIP operation; violates renderer-side processing decision D-14 |

**Installation:**
```bash
npm install fflate
```

**Version verification:** Verified via `npm view fflate version` → `0.8.2` (current latest). Confidence: HIGH.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── engine/
│   ├── presets.js            # NEW: 4 hardcoded preset objects (D-05)
│   ├── tokens.js             # Existing: DEFAULT_TOKENS reference
│   ├── colorHarmony.js       # Existing: used by generate script
│   ├── contrast.js           # Existing: used by generate script
│   └── ThemeManager.js       # Existing: no changes needed
├── editor/
│   ├── composables/
│   │   └── useThemeEditor.js # MODIFIED: add previewPreset(), applyPreset()
│   ├── components/theme/
│   │   ├── PresetModal.vue   # NEW: preset card grid + export/import buttons
│   │   ├── ThemeToolbar.vue  # MODIFIED: add 「预设」button
│   │   └── PaletteModal.vue  # Existing: modal pattern reference
│   └── views/
│       └── ThemeDesigner.vue # MODIFIED: mount PresetModal
├── main.js                   # MODIFIED: add capture-preview handler
└── utils/
    └── themePackager.js      # NEW: export/import ZIP logic (fflate)
electron/
└── main.js                   # MODIFIED: add theme-export/theme-import IPC
tools/
└── generatePresets.js        # NEW: one-time dev script to produce preset tokens
```

### Pattern 1: Preset Preview-Then-Apply (D-02)
**What:** Temporary preview of a preset without committing to the undo stack.
**When to use:** User clicks a preset card — they see the result live before confirming.
**Example:**
```javascript
// In useThemeEditor.js — new methods
function previewPreset(presetTokens) {
  // Temporarily apply to iframe WITHOUT writing to store
  if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
  const previewTheme = {
    tokens: { ...presetTokens },
    nineSlice: script.getTheme()?.nineSlice ?? {},
  };
  iframeRef.value.contentWindow.postMessage({
    type: 'update-theme',
    theme: previewTheme,
  }, '*');
}

function applyPreset(presetTokens) {
  // Write to store + push undo stack
  const theme = script.getTheme();
  theme.tokens = { ...presetTokens };
  const clone = JSON.parse(JSON.stringify(theme));
  script.updateTheme(clone);
  flushPreview();
}
```

### Pattern 2: ZIP Export with fflate (D-08, D-09)
**What:** Package theme.json + images into a ZIP buffer, then write via Electron save dialog.
**When to use:** User clicks "导出" button.
**Example:**
```javascript
import { zipSync, strToU8 } from 'fflate';

function buildThemeZip(themeData, metadata, previewBase64) {
  const files = {};
  const nineSliceRefs = {};
  let imgIndex = 0;

  // Extract nineSlice base64 images → binary files
  if (themeData.nineSlice) {
    for (const [key, config] of Object.entries(themeData.nineSlice)) {
      if (config?.src?.startsWith('data:')) {
        const filename = `images/${key}.png`;
        files[filename] = base64ToUint8Array(config.src);
        nineSliceRefs[key] = { ...config, src: filename };
        // Handle button states
        if (config.states) {
          nineSliceRefs[key].states = {};
          for (const [state, stateConfig] of Object.entries(config.states)) {
            if (stateConfig?.src?.startsWith('data:')) {
              const stateFilename = `images/${key}_${state}.png`;
              files[stateFilename] = base64ToUint8Array(stateConfig.src);
              nineSliceRefs[key].states[state] = { ...stateConfig, src: stateFilename };
            }
          }
        }
      }
    }
  }

  // Add preview image
  if (previewBase64) {
    files['images/preview.png'] = base64ToUint8Array(previewBase64);
  }

  // Build theme.json
  const themeJson = {
    formatVersion: 1,
    ...metadata,
    previewImage: previewBase64 ? 'images/preview.png' : null,
    tokens: themeData.tokens ?? {},
    nineSlice: Object.keys(nineSliceRefs).length > 0 ? nineSliceRefs : undefined,
  };
  files['theme.json'] = strToU8(JSON.stringify(themeJson, null, 2));

  return zipSync(files);
}
```

### Pattern 3: Canvas Screenshot via postMessage (D-11)
**What:** Editor asks engine iframe to capture its canvas content as base64 PNG.
**When to use:** During theme export to generate preview thumbnail.
**Example:**
```javascript
// Engine side (src/main.js) — add to message handler switch:
case 'capture-preview': {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  // Use html2canvas-like approach: draw from DOM
  // OR simpler: use the foreignObject SVG trick
  // Simplest for this DOM-based engine:
  // Capture via OffscreenCanvas + drawImage from the game container
  // Note: game-container is DOM, not canvas-based!
  // Best approach: use window rendering
  try {
    const dataUrl = await domToCanvas(gameContainer);
    window.parent.postMessage({
      type: 'preview-captured',
      data: dataUrl,
    }, '*');
  } catch (err) {
    window.parent.postMessage({
      type: 'preview-captured',
      data: null,
      error: err.message,
    }, '*');
  }
  break;
}
```

### Pattern 4: Electron File Dialogs for Custom Extensions (D-14)
**What:** New IPC handlers for save/open file dialogs with `.theme` extension filter.
**When to use:** Export and import operations.
**Example:**
```javascript
// electron/main.js — new IPC handlers
ipcMain.handle('export-theme', async (event, { buffer }) => {
  try {
    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: '导出主题',
      defaultPath: 'my-theme.theme',
      filters: [{ name: '主题文件', extensions: ['theme'] }],
    });
    if (result.canceled) return { success: false, canceled: true };
    await fs.writeFile(result.filePath, Buffer.from(buffer));
    return { success: true, path: result.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import-theme', async () => {
  try {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: '导入主题',
      filters: [{ name: '主题文件', extensions: ['theme'] }],
      properties: ['openFile'],
    });
    if (result.canceled) return { success: false, canceled: true };
    const data = await fs.readFile(result.filePaths[0]);
    return { success: true, buffer: Array.from(new Uint8Array(data)) };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
```

### Anti-Patterns to Avoid
- **Preset as mutable references:** Preset objects must be deep-cloned before applying to `ui.theme.tokens`. Spreading `{ ...preset.tokens }` is sufficient since tokens are flat string values — no nested objects.
- **base64 in ZIP metadata:** Never store base64 strings inside `theme.json` for images. The whole point of the ZIP is to store images as binary files and reference them by path.
- **Blocking UI during export:** The fflate `zipSync` is synchronous and fast for small payloads (theme files are typically <1MB), but the canvas capture is async (postMessage round-trip). Chain them properly.
- **IPC buffer as JSON string:** Don't JSON.stringify the ZIP buffer. Pass it as an Array (of numbers) via IPC or use Electron's structured clone (Uint8Array is supported via IPC in Electron 41).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP creation/extraction | Manual ZIP binary format | fflate `zipSync`/`unzipSync` | ZIP format has deflate compression, CRC checks, directory entries — impossible to get right manually |
| Base64 → binary | Custom base64 decoder | `atob()` + `Uint8Array` construction | Standard browser API, well-tested, handles Data URL prefix stripping |
| Binary → Base64 | Custom base64 encoder | `btoa()` with `String.fromCharCode` | Standard browser API; for Uint8Array → base64 Data URL pattern is well-known |
| File save/open dialogs | Custom file picker HTML | Electron `dialog.showSaveDialog`/`showOpenDialog` | Native OS dialogs, proper extension filtering, consistent UX |
| Color palette generation | Manual color math | Existing `colorHarmony.js` `generatePalette()` | Already implemented with 4 algorithms, tested in Phase 25 |
| Contrast validation | Manual luminance math | Existing `contrast.js` `contrastRatio()`/`autoFix()` | WCAG 2.x compliant, binary search auto-fix already proven |

**Key insight:** The preset token generation is a **development-time** activity, not runtime. The `generatePresets.js` tool script runs once during development to produce static data. It should NOT be shipped or run at runtime.

## Common Pitfalls

### Pitfall 1: DOM Screenshot in Non-Canvas Engine
**What goes wrong:** The game engine renders via DOM elements (divs, CSS), NOT a `<canvas>` element. You can't simply call `canvas.toDataURL()` on a non-existent canvas.
**Why it happens:** Assumption that "game engine = canvas element" when this engine uses layered DOM.
**How to avoid:** Use an alternative approach for DOM → image conversion:
1. **Option A (Recommended):** Use the existing `capture-screenshot` IPC handler that calls `webContents.capturePage()` — but this only works in standalone BrowserWindow, NOT in an iframe.
2. **Option B (D-11 compliant):** In the iframe context, use `OffscreenCanvas` with SVG `foreignObject` to render the DOM to a canvas. However, this has CORS and styling limitations.
3. **Option C (Pragmatic):** Since the iframe loads same-origin content (`/index.html`), we can access `iframeRef.value.contentWindow.document` and use a simple approach: create a canvas, iterate over visible DOM elements, and draw them. OR even simpler: just use the algorithm-generated preset color swatches as the preview image instead of a full screenshot.
4. **Option D (Simplest & most reliable):** Generate a styled color swatch grid programmatically as the preview image using a `<canvas>` element in the editor (not the iframe). Draw colored rectangles representing the key token colors. This avoids all iframe/DOM capture complexity and still produces a useful preview.
**Warning signs:** Blank or black preview images, SecurityError exceptions.
**Recommendation:** Use **Option D** — draw a programmatic color swatch preview on a canvas in the editor process. The preview image is for identification in the card grid, not pixel-perfect game rendering. A 320×180 swatch grid showing primary, accent, text, panel-bg, btn-bg colors is more than sufficient and 100% reliable. If the user desires a full screenshot, they can use the existing game preview screenshot flow separately.

### Pitfall 2: IPC Buffer Transfer Overhead
**What goes wrong:** Passing large Uint8Array through Electron IPC via `Array.from()` is extremely slow for large buffers (copies every byte as a JSON number).
**Why it happens:** IPC serializes arguments as JSON by default.
**How to avoid:** Electron 41 supports structured clone for IPC, which handles `Uint8Array` and `ArrayBuffer` natively. Pass the buffer directly:
```javascript
// Renderer side:
const zipBuffer = zipSync(files);
await window.ipcRenderer.invoke('export-theme', { buffer: zipBuffer });
// Main process receives actual Uint8Array, not Array
```
For the import direction, return `Uint8Array` from main process — it'll be transferred efficiently via structured clone.
**Warning signs:** Export/import taking >1 second for small theme files.

### Pitfall 3: Alpha/Gradient Token Preservation in Presets
**What goes wrong:** Presets generated via `generatePalette()` return flat hex colors (`#rrggbb`), but DEFAULT_TOKENS uses `rgba()` with alpha channels and `linear-gradient()` for backgrounds.
**Why it happens:** `colorHarmony.js` outputs hex colors; actual tokens need alpha/gradient formats.
**How to avoid:** The preset generation script (D-06) must post-process generated hex colors:
- Apply alpha values from DEFAULT_TOKENS to the new hex colors (same pattern as `PaletteModal.vue` `applyPalette()` lines 113-127)
- Preserve gradient structure for `dialogue-bg`, `title-bg` tokens
- Keep `font-body`, `font-display`, `radius`, `radius-lg`, `blur` tokens as-is or explicitly set them
**Warning signs:** Fully opaque panels where they should be transparent; missing gradients.

### Pitfall 4: nineSlice Image Path Convention in ZIP
**What goes wrong:** Inconsistent path naming between export and import causes images to not be found when re-importing.
**Why it happens:** No standardized naming convention for nine-slice image files in the ZIP.
**How to avoid:** Use a deterministic naming convention:
```
images/preview.png                    # Preview screenshot
images/{elementKey}.png               # Normal state image (e.g., images/dialogueBox.png)
images/{elementKey}_{state}.png       # Button state image (e.g., images/choiceButton_hover.png)
```
Both export and import must use the exact same convention. Store image references in `theme.json` as relative paths.
**Warning signs:** Import succeeds but images don't appear; `undefined` in base64 conversion.

### Pitfall 5: Preset Preview Cleanup on Modal Close
**What goes wrong:** User previews a preset (temporary iframe update) but closes modal without applying. The iframe still shows the previewed theme, but the store has the old theme.
**Why it happens:** Preview sends `update-theme` to iframe but doesn't write to store. Closing the modal doesn't restore the iframe.
**How to avoid:** On modal close (without apply), call `flushPreview()` which re-sends the actual store theme to the iframe, restoring the real state.
**Warning signs:** Iframe shows different theme than what's in the store after closing modal.

### Pitfall 6: Empty nineSlice on Export
**What goes wrong:** Exporting a theme with no nine-slice images configured results in `theme.json` containing empty `nineSlice: {}` and no `images/` directory, which is fine — but import must handle this gracefully.
**Why it happens:** Not all themes use nine-slice images; presets explicitly don't include them (D-04).
**How to avoid:** During import, check if `nineSlice` key exists in `theme.json` and if `images/` directory has files. If not, simply apply tokens only. Don't error on missing `images/` directory.

## Code Examples

### Base64 Data URL → Uint8Array (for ZIP export)
```javascript
// Source: standard Web API pattern
function base64ToUint8Array(dataUrl) {
  // Strip "data:image/png;base64," prefix
  const base64 = dataUrl.split(',')[1];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}
```

### Uint8Array → Base64 Data URL (for ZIP import)
```javascript
// Source: standard Web API pattern
function uint8ArrayToBase64DataUrl(bytes, mimeType = 'image/png') {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
```

### fflate ZIP Creation (verified API)
```javascript
// Source: fflate 0.8.2 npm readme
import { zipSync, strToU8 } from 'fflate';

// Create ZIP with nested directories
const zipped = zipSync({
  'theme.json': strToU8(JSON.stringify(themeJson, null, 2)),
  'images': {
    'preview.png': previewBytes,        // Uint8Array
    'dialogueBox.png': dialogueBytes,   // Uint8Array
  },
});
// zipped is Uint8Array — the complete ZIP file
```

### fflate ZIP Extraction (verified API)
```javascript
// Source: fflate 0.8.2 npm readme
import { unzipSync, strFromU8 } from 'fflate';

const unzipped = unzipSync(new Uint8Array(zipBuffer));
// unzipped is { 'theme.json': Uint8Array, 'images/preview.png': Uint8Array, ... }

const themeJson = JSON.parse(strFromU8(unzipped['theme.json']));
// Access image: unzipped['images/dialogueBox.png'] → Uint8Array
```

### Electron Save Dialog for .theme Files
```javascript
// Source: Electron 41 dialog API
const result = await dialog.showSaveDialog(win, {
  title: '导出主题',
  defaultPath: 'my-theme.theme',
  filters: [{ name: '主题文件', extensions: ['theme'] }],
});
// result.canceled: boolean
// result.filePath: string (chosen path)
```

### Electron Open Dialog for .theme Files
```javascript
// Source: Electron 41 dialog API
const result = await dialog.showOpenDialog(win, {
  title: '导入主题',
  filters: [{ name: '主题文件', extensions: ['theme'] }],
  properties: ['openFile'],
});
// result.canceled: boolean
// result.filePaths: string[]
```

### Preset Data Structure (D-05)
```javascript
// src/engine/presets.js
export const THEME_PRESETS = [
  {
    id: 'modern',
    name: '现代',
    description: '清新蓝色调，适合现代都市题材',
    primaryColor: '#4A90D9',  // for swatch preview
    tokens: {
      'primary': 'rgba(74, 144, 217, 0.9)',
      'primary-subtle': 'rgba(74, 144, 217, 0.08)',
      // ... all 41 tokens
    },
  },
  // ... 3 more presets
];
```

### Canvas Swatch Preview Generation (for preset cards + export)
```javascript
// Generate a color swatch preview image
function generateSwatchPreview(tokens, width = 320, height = 180) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = tokens['panel-bg'] || '#0a0a14';
  ctx.fillRect(0, 0, width, height);

  // Draw primary color bar (top)
  ctx.fillStyle = tokens['primary'] || '#b4a0ff';
  ctx.fillRect(0, 0, width, 40);

  // Draw accent swatch
  ctx.fillStyle = tokens['accent'] || '#ff6b9d';
  ctx.fillRect(16, 56, 60, 40);

  // Draw button sample
  ctx.fillStyle = tokens['btn-bg'] || '#3c3c64';
  ctx.fillRect(92, 56, 100, 40);

  // Draw text samples
  ctx.fillStyle = tokens['text'] || '#ffffffe0';
  ctx.font = '14px sans-serif';
  ctx.fillText('预览文字', 16, 130);

  return canvas.toDataURL('image/png');
}
```

## theme.json Schema (D-09, D-10)

```json
{
  "formatVersion": 1,
  "name": "My Custom Theme",
  "description": "A dark fantasy theme",
  "author": "",
  "createdAt": "2026-04-06T12:00:00.000Z",
  "previewImage": "images/preview.png",
  "tokens": {
    "primary": "rgba(123, 47, 190, 0.9)",
    "primary-subtle": "rgba(123, 47, 190, 0.08)",
    ...
  },
  "nineSlice": {
    "dialogueBox": {
      "src": "images/dialogueBox.png",
      "slice": [20, 20, 20, 20],
      "width": null,
      "outset": null,
      "repeat": "stretch",
      "states": null
    },
    "choiceButton": {
      "src": "images/choiceButton.png",
      "slice": [10, 10, 10, 10],
      "states": {
        "hover": { "src": "images/choiceButton_hover.png" },
        "active": { "src": "images/choiceButton_active.png" }
      }
    }
  }
}
```

**Import validation checklist:**
1. Check `formatVersion` exists and is a number
2. Check `tokens` is an object (not null/array)
3. Validate token keys are subset of `DEFAULT_TOKENS` keys (warn on unknown, don't reject)
4. If `nineSlice` present, verify referenced image paths exist in ZIP
5. If `formatVersion > 1`, warn user but attempt import (forward compat)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSZip (async, 45kB) | fflate (sync+async, 8kB) | 2020+ | fflate is 3-5x faster, much smaller bundle |
| `Blob` + `URL.createObjectURL` for file save | Electron `dialog.showSaveDialog` + `fs.writeFile` | N/A (Electron app) | Native file dialog, proper extension handling |
| html2canvas for screenshots | `webContents.capturePage()` or canvas swatch | N/A | html2canvas can't resolve `asset://` protocol (v0.5 decision) |

## Open Questions

1. **Canvas Screenshot vs. Swatch Preview for Export (D-11)**
   - What we know: D-11 says "postMessage capture-preview → canvas screenshot". But the game engine renders DOM, not canvas. DOM-to-canvas in an iframe is fragile (foreignObject SVG approach has styling/image CORS issues).
   - What's unclear: Whether a full DOM screenshot is truly needed vs. a programmatic swatch preview.
   - Recommendation: **Use programmatic swatch preview** (canvas drawing colored rectangles from token values). It's 100% reliable, fast, cross-platform, and produces a recognizable thumbnail. The existing `capture-screenshot` IPC uses `webContents.capturePage()` which only works for standalone BrowserWindow, not iframes. If full screenshot is desired later, it can be added via a dedicated preview BrowserWindow. For now, a swatch grid is pragmatic and sufficient.

2. **IPC Buffer Transfer Format**
   - What we know: Electron 41 supports structured clone for IPC arguments (Uint8Array passes natively).
   - What's unclear: Whether the preload bridge's `invoke` proxy preserves Uint8Array or serializes to JSON.
   - Recommendation: Test during implementation. Fallback: convert to `Array.from(uint8array)` on send and `new Uint8Array(array)` on receive. For theme files (<1MB typically), this overhead is negligible.

3. **generatePresets Tool Script Location**
   - What we know: D-06 describes a dev-time script using colorHarmony + contrast.
   - What's unclear: Where to put it and how to invoke it.
   - Recommendation: Place at `tools/generatePresets.js` with a `package.json` script entry: `"gen:presets": "node tools/generatePresets.js"`. Output goes to stdout or directly overwrites `src/engine/presets.js`. This script is dev-only, not shipped.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no test framework in project) |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRE-01 | 4 presets apply correctly via setTokenBatch | manual | — | ❌ |
| PRE-02 | Token edits after preset apply independently | manual | — | ❌ |
| PKG-01 | Export produces valid ZIP with theme.json + images | manual | — | ❌ |
| PKG-02 | Import reads ZIP and applies tokens + nineSlice | manual | — | ❌ |
| PKG-03 | formatVersion field present in exported theme.json | manual | — | ❌ |

### Sampling Rate
- **Per task commit:** Manual visual verification in Electron dev mode
- **Per wave merge:** Full export→import round-trip test
- **Phase gate:** All 5 success criteria verified manually

### Wave 0 Gaps
- No test framework exists in the project (confirmed in STACK.md)
- All validation is manual via Electron dev mode (`npm run dev`)

## Sources

### Primary (HIGH confidence)
- **fflate npm page** — version 0.8.2, API: `zipSync`, `unzipSync`, `strToU8`, `strFromU8`
- **Electron 41 dialog API** — `dialog.showSaveDialog`, `dialog.showOpenDialog` with file filters
- **Project source code** — all files listed in canonical_refs examined directly

### Secondary (MEDIUM confidence)
- **fflate README** — ZIP directory structure syntax, nested object = subdirectory pattern
- **Web API atob/btoa** — standard base64 encoding/decoding

### Tertiary (LOW confidence)
- **DOM-to-canvas screenshot approaches** — foreignObject SVG method has known limitations; reliability varies by browser engine

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — fflate is the clear choice, verified version
- Architecture: HIGH — all integration points examined in existing code
- Pitfalls: HIGH — identified from direct code analysis (alpha preservation, DOM screenshot, IPC buffers)
- Presets: HIGH — straightforward static data + existing composable methods
- Export/Import: MEDIUM — IPC buffer transfer and screenshot approach need validation during implementation

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable domain, libraries are mature)
