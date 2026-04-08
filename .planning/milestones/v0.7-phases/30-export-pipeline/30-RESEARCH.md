# Phase 30: Export Pipeline - Research

**Researched:** 2026-04-08
**Domain:** Electron IPC + Node.js file system + Vite build + fflate ZIP
**Confidence:** HIGH

## Summary

Phase 30 implements the backend export pipeline that generates a complete, self-contained Web static bundle from a Galgame Maker project. The pipeline orchestrates 6 sequential steps: Vite engine build, asset scanning, engine artifact copy, referenced asset copy, HTML template generation, and optional ZIP packaging — all driven by a single IPC handler with progress feedback via `webContents.send`.

All required technology is already available in the project's dependency tree. **Zero new npm packages needed.** The pipeline uses `child_process.exec` for Vite build invocation, `fs/promises` for file operations, `scanAssets()` (Phase 29) for asset reference extraction, and `fflate.zipSync` (already used in themePackager.js) for ZIP creation. The HTML is generated from a template string with custom title/favicon injection — no need to parse or modify the Vite build output HTML.

**Primary recommendation:** Implement as a single `electron/exportGame.js` module exporting an async `exportGame(options, progressCallback)` function, registered via `ipcMain.handle('export-game')` in `electron/main.js`. Progress events sent via `getMainWindow().webContents.send('export-progress', payload)`. Preload whitelist updated with both channels.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** scanAssets 返回的路径在磁盘上找不到时，跳过该文件并记录到警告列表，导出流程不中断
- **D-02:** 缺失文件警告列表在导出完成后一次性返回给前端，不逐条实时推送
- **D-03:** script.json 原样复制到输出目录，不做任何字段清理或剪裁。引擎运行时已只读它需要的字段
- **D-04:** 扁平结构，与 `BASE_PATH='./assets/'` 完全对齐：output/ → index.html, engine.js, engine.css, script.json, assets/{backgrounds,characters,audio,fonts,voices}/
- **D-05:** ZIP 文件放在输出目录同级，命名为 `{游戏标题}.zip`
- **D-06:** ZIP 开关关闭 → 仅生成文件夹；ZIP 开关开启 → 文件夹 + ZIP 都生成
- **D-07:** 进度通过 `webContents.send('export-progress', { step, percent })` 单向推送到 renderer 进程
- **D-08:** 6 步进度粒度：构建引擎 → 扫描资源 → 复制引擎产物 → 复制资源文件 → 生成 HTML → 打包 ZIP。每步推送当前步骤名和百分比

### Agent's Discretion
- HTML 模板生成方式（基于 dist-web/index.html 注入 title/favicon，或从头生成）
- IPC handler 的具体参数签名和返回值格式
- 导出模块的文件组织（单文件 vs 分模块）
- Vite 构建调用方式（child_process exec vs Vite API）
- ZIP 内部路径结构（根目录名是否使用游戏标题）

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | 用户选择输出目录后一键导出完整 Web 静态包（HTML + JS + CSS + assets） | IPC handler pattern from `electron/main.js`; `child_process.exec` for Vite build; `fs/promises` for file copy; single `exportGame()` orchestration function |
| PIPE-02 | 只复制实际引用的资源文件到输出目录（不含未使用资源） | `scanAssets()` from `src/engine/scanAssets.js` returns categorized asset dict; iterate paths, copy only those that exist on disk (D-01: skip + warn on missing) |
| PIPE-03 | 生成的 HTML 包含用户自定义的游戏标题 | Template string generation; inject `<title>` with user-provided gameTitle |
| PIPE-04 | 用户可指定 favicon，导出时包含在输出中 | Copy favicon file to output root; inject `<link rel="icon">` in generated HTML |
| PIPE-05 | 用户可选择将输出打包为 ZIP 文件（方便上传 itch.io） | `fflate.zipSync` pattern from `src/utils/themePackager.js`; read all output files → Uint8Array → zipSync → write buffer |
| PIPE-07 | 导出过程中显示进度反馈（当前步骤/百分比） | `getMainWindow().webContents.send('export-progress', { step, percent })`; 6-step granularity per D-08 |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript
- **Naming**: PascalCase for classes (`ExportGame.js`), camelCase for functions/variables, `_` prefix for private
- **Exports**: Named exports only (`export function exportGame`), no default exports
- **Error handling**: Return `{ success: boolean, error?: string }` from IPC handlers; never throw across IPC boundary
- **Logging**: Bracket-prefix tags (`[ExportGame]`), `console.error` for failures, `console.warn` for non-critical
- **Comments**: File-level JSDoc block at top of every module; `// ─── Section Name ───────` dividers
- **Code style**: 2-space indent, single quotes, semicolons, trailing commas in multi-line
- **Import style**: Explicit `.js` extensions, relative paths, ESM only
- **IPC pattern**: `ipcMain.handle(channel, async (event, args) => { ... })` with try/catch returning `{ success, error }`
- **Security**: `isInsideProject()` for path validation; preload whitelist enforcement

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs/promises` | built-in (Node 24) | Async file read/write/copy/mkdir | Already used throughout `electron/main.js` |
| Node.js `child_process` | built-in (Node 24) | Invoke `vite build` subprocess | Only way to shell out to Vite CLI from main process |
| Node.js `path` | built-in (Node 24) | Path joining/resolution | Already used throughout `electron/main.js` |
| fflate | 0.8.2 | ZIP file creation | Already in `dependencies`; used by `themePackager.js` |
| scanAssets | Phase 29 | Asset reference extraction | Pure function, direct import from `src/engine/scanAssets.js` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite CLI | 6.3.0 (installed) | Build engine.js + engine.css | Invoked via `child_process.exec('npx vite build --config vite.web.config.js')` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `child_process.exec` (Vite build) | Vite Node API (`import { build } from 'vite'`) | API is cleaner but adds import overhead in main process; exec is simpler, matches CONTEXT.md suggestion |
| `fflate.zipSync` | Node.js `archiver` package | archiver is stream-based (better for huge files) but adds new dependency; fflate already available |
| Template string HTML | Read+modify dist-web/index.html | Parsing HTML is fragile; template string gives full control, ~20 lines |

**Installation:**
```bash
# No installation needed — zero new dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
electron/
├── main.js            # Add import + IPC registration for exportGame
├── exportGame.js      # NEW — Export pipeline module (single file)
├── preload.js         # Add 'export-game' + 'export-progress' to ALLOWED_CHANNELS
└── ...
```

### Pattern 1: Export Pipeline as Single Async Function
**What:** One module (`electron/exportGame.js`) exports an async `exportGame(options, sendProgress)` function that orchestrates the 6-step pipeline. The IPC handler in `main.js` calls it.
**When to use:** Always — this is the core pattern.
**Example:**
```javascript
// electron/exportGame.js
/**
 * Export Pipeline — Generate deployable Web static bundle from project data.
 * @module exportGame
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import { scanAssets } from '../src/engine/scanAssets.js';

const execAsync = promisify(exec);

/**
 * @param {Object} options
 * @param {string} options.projectPath - Absolute path to project directory
 * @param {string} options.outputDir - Absolute path to output directory
 * @param {string} options.gameTitle - Game title for HTML <title>
 * @param {string|null} options.faviconPath - Absolute path to favicon file, or null
 * @param {boolean} options.zip - Whether to create ZIP alongside folder
 * @param {(payload: {step: string, percent: number}) => void} sendProgress
 * @returns {Promise<{success: boolean, warnings?: string[], outputPath?: string, zipPath?: string, error?: string}>}
 */
export async function exportGame(options, sendProgress) {
  const { projectPath, outputDir, gameTitle, faviconPath, zip } = options;
  const warnings = [];

  // Step 1: Build engine
  sendProgress({ step: '构建引擎', percent: 0 });
  // ... exec vite build ...

  // Step 2: Scan assets
  sendProgress({ step: '扫描资源', percent: 17 });
  // ... read script.json, call scanAssets() ...

  // Step 3: Copy engine artifacts
  sendProgress({ step: '复制引擎产物', percent: 33 });
  // ... copy engine.js, engine.css from dist-web/ ...

  // Step 4: Copy asset files
  sendProgress({ step: '复制资源文件', percent: 50 });
  // ... iterate scanAssets results, fs.copyFile each ...

  // Step 5: Generate HTML
  sendProgress({ step: '生成 HTML', percent: 67 });
  // ... write index.html from template ...

  // Step 6: ZIP (if enabled)
  sendProgress({ step: '打包 ZIP', percent: 83 });
  // ... fflate zipSync ...

  sendProgress({ step: '完成', percent: 100 });
  return { success: true, warnings, outputPath: outputDir };
}
```

### Pattern 2: IPC Registration in main.js
**What:** Register `export-game` handler in main.js, delegate to `exportGame()`.
**When to use:** Single registration point for the export IPC.
**Example:**
```javascript
// In electron/main.js — add after existing IPC handlers
import { exportGame } from './exportGame.js';

ipcMain.handle('export-game', async (event, options) => {
  try {
    const sendProgress = (payload) => {
      const mw = getMainWindow();
      if (mw) mw.webContents.send('export-progress', payload);
    };
    return await exportGame({
      ...options,
      projectPath: currentProjectPath,
    }, sendProgress);
  } catch (e) {
    console.error('[ExportGame] Failed:', e);
    return { success: false, error: e.message };
  }
});
```

### Pattern 3: HTML Template Generation
**What:** Generate index.html from a template string instead of modifying dist-web output.
**When to use:** Always — cleaner than regex HTML manipulation.
**Example:**
```javascript
/**
 * Generate the exported index.html with custom title and favicon.
 * @param {string} gameTitle
 * @param {string|null} faviconFilename - Filename only (e.g., 'favicon.ico'), or null
 * @returns {string} Complete HTML string
 */
function generateHtml(gameTitle, faviconFilename) {
  const faviconLink = faviconFilename
    ? `\n  <link rel="icon" href="./${faviconFilename}">`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1280" />
  <title>${escapeHtml(gameTitle)}</title>${faviconLink}
  <script type="module" crossorigin src="./engine.js"></script>
  <link rel="stylesheet" crossorigin href="./engine.css">
</head>
<body>
  <div id="game-container">
    <div id="background-layer"></div>
    <div id="character-layer"></div>
    <div id="dialogue-layer"></div>
    <div id="ui-overlay"></div>
  </div>
</body>
</html>`;
}
```

### Pattern 4: Asset Copy with Missing File Tracking (D-01, D-02)
**What:** Copy assets by iterating scanAssets output, collect warnings for missing files.
**Example:**
```javascript
/**
 * Copy referenced assets from project to output directory.
 * Skips missing files and records warnings (D-01).
 *
 * @param {Object} assetDict - Output from scanAssets()
 * @param {string} projectAssetsDir - e.g., /path/to/project/assets
 * @param {string} outputAssetsDir - e.g., /path/to/output/assets
 * @returns {Promise<string[]>} warnings for missing files
 */
async function copyAssets(assetDict, projectAssetsDir, outputAssetsDir) {
  const warnings = [];
  const allPaths = [
    ...assetDict.backgrounds,
    ...assetDict.characters,
    ...assetDict.audio,
    ...assetDict.fonts,
    ...assetDict.voices,
  ];

  for (const relPath of allPaths) {
    const src = path.join(projectAssetsDir, relPath);
    const dst = path.join(outputAssetsDir, relPath);

    if (!existsSync(src)) {
      warnings.push(relPath);
      continue;
    }

    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
  }

  return warnings;
}
```

### Pattern 5: ZIP Creation with fflate (matching themePackager.js)
**What:** Read all output files into memory, use `zipSync` to create ZIP buffer.
**Example:**
```javascript
import { zipSync } from 'fflate';

async function createZip(outputDir, zipPath) {
  const files = {};

  async function addDir(dirPath, prefix) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const zipKey = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await addDir(fullPath, zipKey);
      } else {
        files[zipKey] = new Uint8Array(await fs.readFile(fullPath));
      }
    }
  }

  await addDir(outputDir, '');
  const zipBuffer = zipSync(files);
  await fs.writeFile(zipPath, zipBuffer);
}
```

### Pattern 6: Preload Whitelist Update
**What:** Add export IPC channels to `ALLOWED_CHANNELS` in `electron/preload.js`.
**Example:**
```javascript
const ALLOWED_CHANNELS = [
  // ... existing channels ...
  'export-game',        // invoke: trigger export
  'export-progress',    // on: receive progress events
];
```

### Anti-Patterns to Avoid
- **Don't read+modify dist-web/index.html:** Regex-based HTML manipulation is fragile. Generate from template string instead.
- **Don't use Vite API in main process:** Importing Vite's `build()` function pulls in the entire Vite dependency tree into the main process. Use `child_process.exec` instead.
- **Don't use synchronous fs operations for file copy:** The main process serves the renderer. Use `fs/promises` (async) for all file operations.
- **Don't send progress per-file:** D-08 defines 6 steps. Per-file progress would flood the IPC channel. One event per step is sufficient.
- **Don't modify script.json during export:** D-03 explicitly states "原样复制，不做任何字段清理或剪裁".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP creation | Custom file-by-file compression | `fflate.zipSync` | Handles compression, CRC, ZIP format structure — 100s of edge cases |
| Asset scanning | Walk script.json manually | `scanAssets()` from Phase 29 | Already covers all 11 path locations, tested with 40 tests |
| Path resolution | Manual string concatenation | `path.join()` / `path.resolve()` | Cross-platform separator handling (Windows backslash vs Unix forward slash) |
| HTML escaping | Custom regex replacement | Simple `escapeHtml()` helper | `<`, `>`, `&`, `"` in game titles could break HTML |
| Vite engine build | Copy src/ files manually | `npx vite build --config vite.web.config.js` | Vite handles bundling, tree-shaking, CSS extraction, module resolution |

**Key insight:** The export pipeline is an orchestrator — it coordinates existing tools (Vite, scanAssets, fflate, fs), not a builder of new functionality.

## Common Pitfalls

### Pitfall 1: Absolute vs Relative Paths in Generated HTML
**What goes wrong:** Vite build output uses root-relative paths (`/engine.js`). If the exported game is hosted in a subdirectory (e.g., `https://example.com/my-game/`), root-relative paths break.
**Why it happens:** Vite's default `base: '/'` produces `/engine.js` instead of `./engine.js`.
**How to avoid:** Generate HTML from template string with explicit `./engine.js` and `./engine.css` relative paths. Don't copy dist-web/index.html.
**Warning signs:** Game works from server root but breaks in subdirectory or itch.io iframe.

### Pitfall 2: Windows Path Separators in ZIP
**What goes wrong:** `path.join()` on Windows produces `assets\backgrounds\city.png` with backslashes. ZIP entries must use forward slashes.
**Why it happens:** Node.js `path` module uses platform-specific separators.
**How to avoid:** When building ZIP entry keys, always normalize to forward slashes: `relPath.split(path.sep).join('/')`.
**Warning signs:** ZIP extracts with backslash-named files on macOS/Linux.

### Pitfall 3: Vite Build CWD
**What goes wrong:** `exec('npx vite build --config vite.web.config.js')` fails because CWD is wrong.
**Why it happens:** Electron main process CWD may differ from project root in packaged apps.
**How to avoid:** Always specify `cwd: process.env.APP_ROOT` in exec options.
**Warning signs:** "Cannot find vite.web.config.js" error during export.

### Pitfall 4: Large Project Memory During ZIP
**What goes wrong:** `zipSync` loads all files into memory. A project with 500MB of assets could cause out-of-memory.
**Why it happens:** fflate's sync API requires all data upfront.
**How to avoid:** For v0.7, this is acceptable (most visual novels are <200MB). Document the limitation. Future: switch to streaming ZIP or archiver.
**Warning signs:** Electron crash during ZIP step on large projects.

### Pitfall 5: Race Condition with webContents.send
**What goes wrong:** If the main window is closed or navigated away during export, `webContents.send` throws.
**Why it happens:** Export is async and long-running; user could close the window mid-export.
**How to avoid:** Guard `webContents.send` with null check: `if (mw && !mw.isDestroyed()) mw.webContents.send(...)`.
**Warning signs:** Unhandled exception in main process during export.

### Pitfall 6: Google Fonts @import in Exported CSS
**What goes wrong:** The engine's `style.css` starts with `@import url('https://fonts.googleapis.com/...')`. When Vite builds, this gets inlined into `engine.css`. The exported game requires internet access for Google Fonts (Noto Sans SC, Noto Serif SC).
**Why it happens:** Google Fonts are loaded via CSS @import, not bundled locally.
**How to avoid:** This is by design — out of scope for v0.7 (REQUIREMENTS.md explicitly defers "离线 Google Fonts 打包"). Just be aware the exported game needs internet for fonts.
**Warning signs:** Text displays in fallback font when opened offline.

### Pitfall 7: scanAssets Path vs Filesystem Path Mapping
**What goes wrong:** `scanAssets()` returns paths like `backgrounds/city.png`. The copy logic must map these to `{projectPath}/assets/backgrounds/city.png` (source) and `{outputDir}/assets/backgrounds/city.png` (destination).
**Why it happens:** scanAssets paths are relative to `assets/` directory (matching `BASE_PATH='./assets/'`). They already include the subdirectory prefix.
**How to avoid:** Source: `path.join(projectPath, 'assets', relPath)`. Destination: `path.join(outputDir, 'assets', relPath)`.
**Warning signs:** "File not found" warnings for all assets even though they exist.

## Code Examples

### Vite Build Invocation
```javascript
// Source: Verified from package.json scripts.build:web
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);

const appRoot = process.env.APP_ROOT;
const configPath = path.join(appRoot, 'vite.web.config.js');

// Use local npx to invoke the project's installed Vite
await execAsync(`npx vite build --config "${configPath}"`, {
  cwd: appRoot,
  env: { ...process.env },
});
// Output: dist-web/engine.js + dist-web/engine.css + dist-web/index.html
```

### IPC Handler Registration (follows existing pattern)
```javascript
// Source: Pattern from electron/main.js lines 101-151, 757-771
ipcMain.handle('export-game', async (event, options) => {
  try {
    const sendProgress = (payload) => {
      const mw = getMainWindow();
      if (mw && !mw.isDestroyed()) {
        mw.webContents.send('export-progress', payload);
      }
    };
    return await exportGame({
      ...options,
      projectPath: currentProjectPath,
    }, sendProgress);
  } catch (e) {
    console.error('[ExportGame] Failed:', e);
    return { success: false, error: e.message };
  }
});
```

### Preload Whitelist (follows existing pattern)
```javascript
// Source: electron/preload.js lines 4-14
const ALLOWED_CHANNELS = [
  // ... all existing channels ...
  'export-game',        // ipcRenderer.invoke('export-game', options)
  'export-progress',    // ipcRenderer.on('export-progress', callback)
];
```

### fflate ZIP Creation (follows themePackager.js pattern)
```javascript
// Source: Pattern from src/utils/themePackager.js lines 105-160
import { zipSync } from 'fflate';
import fs from 'node:fs/promises';

async function createZipFromDir(dirPath) {
  const files = {};

  async function walk(dir, prefix) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      // ZIP paths MUST use forward slashes
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, key);
      } else {
        files[key] = new Uint8Array(await fs.readFile(full));
      }
    }
  }

  await walk(dirPath, '');
  return zipSync(files);
}
```

### HTML Escaping Helper
```javascript
/**
 * Escape HTML special characters in user-provided strings.
 * @param {string} str
 * @returns {string}
 */
function _escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

## Key Technical Details

### dist-web/ Build Output Structure (verified)
```
dist-web/
  index.html         (633 bytes — Vite-generated, root-relative paths)
  engine.js          (70,196 bytes — bundled engine runtime)
  engine.css         (21,825 bytes — bundled engine styles)
  game/              (demo content — NOT part of export)
```

### Export Output Structure (per D-04)
```
{outputDir}/
  index.html         # Generated from template (relative paths, custom title)
  engine.js          # Copied from dist-web/
  engine.css         # Copied from dist-web/
  script.json        # Copied verbatim from project (D-03)
  favicon.ico        # Copied if user specified (PIPE-04)
  assets/
    backgrounds/     # Only referenced files (PIPE-02)
    characters/
    audio/
    fonts/
    voices/
{outputDir}/../{gameTitle}.zip   # If ZIP enabled (D-05)
```

### scanAssets() Return Format (verified from source)
```javascript
{
  backgrounds: ['backgrounds/city.png', 'backgrounds/park.png'],
  audio: ['audio/bgm1.mp3', 'audio/click.mp3'],
  fonts: ['fonts/custom.ttf'],
  characters: ['characters/hero_normal.png'],
  voices: ['audio/voice01.ogg'],
}
```
Paths are relative to the project's `assets/` directory. Each array is sorted and deduplicated.

### Progress Event Format (per D-07, D-08)
```javascript
// 6 events total, sent via webContents.send('export-progress', payload)
{ step: '构建引擎',   percent: 0 }
{ step: '扫描资源',   percent: 17 }
{ step: '复制引擎产物', percent: 33 }
{ step: '复制资源文件', percent: 50 }
{ step: '生成 HTML',   percent: 67 }
{ step: '打包 ZIP',   percent: 83 }
// Final on completion:
{ step: '完成',       percent: 100 }
```

### IPC Return Format (follows project convention)
```javascript
// Success
{
  success: true,
  outputPath: '/path/to/output',
  zipPath: '/path/to/output/../GameTitle.zip',  // or null if zip disabled
  warnings: ['audio/missing_voice.ogg'],        // D-02: all at once
}

// Failure
{
  success: false,
  error: 'Failed to build engine: ...',
}
```

## Discretion Recommendations

### HTML Generation: Template String (recommended)
Generate from a ~20-line template string. Reasons:
1. Full control over path format (`./engine.js` vs `/engine.js`)
2. No HTML parsing/regex needed
3. Clean favicon injection
4. Easier to test

### IPC Parameter Signature
```javascript
// Renderer → Main (via invoke)
ipcRenderer.invoke('export-game', {
  outputDir: '/absolute/path/to/output',
  gameTitle: 'My Visual Novel',
  faviconPath: '/absolute/path/to/favicon.ico',  // or null
  zip: true,
});
```
Note: `projectPath` is added by main.js from `currentProjectPath` (not sent from renderer — security).

### Module Organization: Single File
`electron/exportGame.js` — one file is sufficient. The pipeline is linear (~150 lines). No need for multiple modules.

### Vite Build: child_process.exec
`exec('npx vite build --config vite.web.config.js', { cwd: APP_ROOT })` — simplest approach, matches existing npm script `build:web`.

### ZIP Internal Structure: Flat (no root folder)
ZIP entries should be `index.html`, `engine.js`, `assets/backgrounds/...` — no wrapping root directory. This is standard for itch.io uploads where the ZIP is extracted directly.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fs.copyFileSync` | `fs/promises` async | Node 14+ | Non-blocking main process |
| `archiver` npm package | `fflate` (already in deps) | Project convention | Zero new dependencies |
| Manual asset list | `scanAssets()` pure function | Phase 29 | Automated, tested, deterministic |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert/strict` |
| Config file | none — direct `node --test` invocation |
| Quick run command | `node --test tests/exportGame.test.js` |
| Full suite command | `node --test tests/scanAssets.test.js tests/exportGame.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Full export produces index.html + engine files + script.json + assets | integration | `node --test tests/exportGame.test.js` | ❌ Wave 0 |
| PIPE-02 | Only referenced assets copied (not all project assets) | unit | `node --test tests/exportGame.test.js` | ❌ Wave 0 |
| PIPE-03 | Generated HTML contains custom game title | unit | `node --test tests/exportGame.test.js` | ❌ Wave 0 |
| PIPE-04 | Favicon copied and linked in HTML | unit | `node --test tests/exportGame.test.js` | ❌ Wave 0 |
| PIPE-05 | ZIP file created when option enabled | integration | `node --test tests/exportGame.test.js` | ❌ Wave 0 |
| PIPE-07 | Progress callback invoked with 6 steps | unit | `node --test tests/exportGame.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/exportGame.test.js`
- **Per wave merge:** `node --test tests/scanAssets.test.js tests/exportGame.test.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/exportGame.test.js` — covers PIPE-01 through PIPE-07
- [ ] Test needs to mock `child_process.exec` (Vite build) and use temp directories via `fs.mkdtemp`

### Test Strategy Notes
The export pipeline's `exportGame()` function can be tested by:
1. **Mocking Vite build:** Create fake `dist-web/engine.js` and `dist-web/engine.css` files in a temp dir, skip actual Vite invocation
2. **Using temp directories:** `os.tmpdir()` + `fs.mkdtemp` for isolated output dirs
3. **Testing HTML generation separately:** The `generateHtml()` helper is a pure function — easy to unit test
4. **Testing asset copy:** Create a mock project structure in temp dir, verify only referenced assets are copied
5. **Testing ZIP:** Verify ZIP file is created and can be unzipped with correct contents using `fflate.unzipSync`

IPC integration (preload whitelist, `webContents.send`) cannot be unit-tested — verified manually in Phase 31.

## Open Questions

1. **Favicon file format handling**
   - What we know: User selects a favicon file (PIPE-04). It gets copied to output root.
   - What's unclear: Should we validate the favicon format (ico/png/svg)? Should the HTML `<link rel="icon">` include a `type` attribute?
   - Recommendation: Accept any image file. Use the filename extension to determine MIME type for the `type` attribute. If `.ico`, omit `type` (browsers auto-detect). If `.png`, add `type="image/png"`.

2. **Output directory collision handling**
   - What we know: User selects an output directory. Files are written to it.
   - What's unclear: What if the directory already contains files from a previous export?
   - Recommendation: Use `emptyOutDir`-like behavior — warn but overwrite. Or simply overwrite silently (export is idempotent). The dialog-open-directory handler already exists for directory selection.

## Sources

### Primary (HIGH confidence)
- `electron/main.js` — 20+ IPC handler patterns, `getMainWindow()`, `currentProjectPath`, `atomicWrite()`
- `electron/preload.js` — ALLOWED_CHANNELS whitelist pattern (line 4-14)
- `src/engine/scanAssets.js` — Full implementation reviewed, returns 5-category asset dict
- `src/utils/themePackager.js` — fflate `zipSync`/`strToU8` usage pattern
- `vite.web.config.js` — Build config producing deterministic engine.js + engine.css
- `dist-web/index.html` — Verified Vite output: root-relative paths, 633 bytes
- `src/engine/assetPath.js` — `BASE_PATH = './assets/'` for web mode, `SCRIPT_PATH = './script.json'`
- `index.html` — Source HTML template (4-layer div structure)
- `package.json` — `build:web` script, fflate 0.8.2 in dependencies

### Secondary (MEDIUM confidence)
- `30-CONTEXT.md` — All 8 locked decisions + discretion areas + canonical references

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, zero new dependencies
- Architecture: HIGH — follows established IPC/module patterns from 6 previous milestones
- Pitfalls: HIGH — identified from actual codebase analysis (dist-web paths, Windows separators, Google Fonts)
- Validation: MEDIUM — test strategy defined but requires mocking Vite build

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — stable domain, no external API changes expected)
