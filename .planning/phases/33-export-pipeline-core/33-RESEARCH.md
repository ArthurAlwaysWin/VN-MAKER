# Phase 33: Export Pipeline Core - Research

**Researched:** 2025-07-15
**Domain:** Electron desktop game packaging pipeline (Node.js main process)
**Confidence:** HIGH

## Summary

Phase 33 creates `exportDesktop.js` — a programmatic export pipeline that takes a Galgame Maker project and produces a complete, working Windows desktop game folder with a renamed `.exe`. The pipeline reuses 70% of the existing web export infrastructure (Vite engine build, `scanAssets()`, asset copying, fflate ZIP) and adds desktop-specific steps: template filling (reading `electron/game/main.js` and `preload.js`, replacing placeholders), package.json generation, PNG→ICO icon conversion, and `@electron/packager` invocation.

The existing codebase provides clear architectural precedent. `electron/exportGame.js` implements a 6-step pipeline with `sendProgress()` callback, `_skipBuild`/`_appRoot` test hooks, and `{ success, outputPath, zipPath, warnings }` return shape. `tests/exportGame.test.js` has 20 tests using Node.js built-in test runner (`node:test`). Phase 33 should follow these patterns exactly. The Phase 32 templates (`electron/game/main.js` at 368 lines and `electron/game/preload.js` at 27 lines) are already complete and use `GAME_TITLE = 'My Game'` / `GAME_WIDTH = 1280` / `GAME_HEIGHT = 720` as string-replaceable placeholders (per D-01).

Two new devDependencies are needed: `@electron/packager@^19.1.0` (packaging) and `png-to-ico@^3.0.1` (icon conversion). Both are pure JavaScript with no native compilation requirements. The project uses `asar: false` (plain files) per locked decision, which eliminates the two most critical pitfalls (ASAR path mismatch and preload resolution). The Electron binary (~90 MB) is cached by `@electron/get` after first download, making subsequent exports near-instant for the packaging step.

**Primary recommendation:** Create `electron/exportDesktop.js` following the exact same architecture as `electron/exportGame.js` — same sendProgress pattern, same test hook parameters, same return shape — with ~9 pipeline steps for desktop-specific staging, template filling, icon conversion, and @electron/packager invocation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Template Strategy):** Read game-main.js and game-preload.js from `electron/game/` source files at export time, replace `GAME_TITLE`/`GAME_WIDTH`/`GAME_HEIGHT` placeholders, write to staging directory. Do NOT embed as string constants — maintain as separate files for easy maintenance and debugging.
- **D-02 (Default Icon):** Built-in default icon `public/default-game-icon.png` — when user provides no custom PNG, this default is auto-converted to .ico and embedded in .exe.
- **D-03 (Output Naming):** Game title as output folder name and .exe name (`{sanitizedTitle}-win32-x64/{sanitizedTitle}.exe`). Reuse Phase 32 D-05 illegal-character-to-underscore sanitization strategy.
- **D-04 (Error Handling):** On failure, clean up staging temp directory but preserve any already-produced final output folder (if exists) for user troubleshooting.

### Agent's Discretion
- Pipeline step count and progress percentage allocation
- Staging directory naming and temp directory strategy
- @electron/packager configuration parameters (overwrite, prune, etc.)
- png-to-ico icon size set for .ico conversion
- Electron binary cache path management

### Deferred Ideas (OUT OF SCOPE)
- macOS/Linux platform export — v0.9+
- ASAR packaging (code protection) — v0.9+
- Asset compression optimization (image compression, audio transcoding) — v0.9+
- Incremental export (only changed assets) — complexity too high
- Auto-update mechanism — v1.0+

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | User can one-click export a complete runnable Windows desktop game folder (.exe) | Core pipeline in `exportDesktop.js` — Vite build → stage → @electron/packager → output folder |
| PIPE-02 | Export uses @electron/packager for integrated packaging, outputs green portable directory | `@electron/packager@19.1.0` with `asar: false`, `platform: 'win32'`, `arch: 'x64'` |
| PIPE-03 | Export fully copies all game assets (images, audio, fonts, voices) to output | Reuse `scanAssets()` pure function + existing asset copy loop from `exportGame.js` |
| PIPE-06 | Post-export optional ZIP compression of output directory | Reuse existing `_createZip()` function and `fflate.zipSync()` from `exportGame.js` |
| PIPE-07 | Electron runtime binary auto-cached, second export skips download | `@electron/get` (bundled in @electron/packager) caches to `~/.electron/` automatically |
| CUSTOM-01 | User can customize game title (window title + .exe metadata) | Template placeholder replacement in `electron/game/main.js` + `executableName` packager option |
| CUSTOM-02 | User can provide PNG icon, auto-converted to .ico and embedded in .exe | `png-to-ico@3.0.1` converts PNG buffer → .ico buffer; passed to packager's `icon` option |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript migration
- **Style**: Dark theme, pure CSS, Chinese UI (中文界面)
- **Module convention**: Named exports only (`export function`/`export class`), no default exports (EXCEPT: `@electron/packager` uses default export — must use `import packager from '@electron/packager'`)
- **Import style**: Always use explicit `.js` extensions for project imports
- **ESM throughout**: `"type": "module"` in package.json
- **Error handling**: IPC handlers return `{ success: boolean, error?: string }` — never throw across IPC boundary
- **Logging**: Bracket-prefix tags: `[ExportDesktop]`
- **Comments**: File-level JSDoc block, section dividers using `// ─── Section Name ───────`
- **Indentation**: 2 spaces, single quotes, semicolons always

## Standard Stack

### Core (New devDependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @electron/packager | 19.1.0 | Package staged game dir into standalone .exe folder | Official Electron team project, simplest programmatic API (`await packager(opts)`), built-in icon embedding via resedit |
| png-to-ico | 3.0.1 | Convert user PNG to Windows .ico format | Pure JS (pngjs only), 50KB footprint, one function call — no native deps like sharp |

### Existing (Reused — No Changes)

| Library | Version | Purpose | Reuse Point |
|---------|---------|---------|-------------|
| fflate | 0.8.2 | Optional ZIP compression of output | `_createZip()` from `exportGame.js` or equivalent |
| scanAssets | (project module) | Extract referenced asset paths from script.json | `src/engine/scanAssets.js` — pure function, direct import |
| Vite | 6.3.0 | Build runtime engine bundle (dist-web/) | Same `vite.web.config.js` as web export |
| Electron | 41.0.4 (installed) | Editor runtime; 41.2.0 as target for exported game | `electronVersion: '41.2.0'` pinned in packager config |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @electron/packager | electron-builder | Overkill — downloads Go binary, complex config, installer-focused |
| @electron/packager | @electron-forge | Designed to own project lifecycle, wraps packager internally |
| png-to-ico | sharp | 30 MB native binary vs 50 KB pure JS — massive overkill |
| png-to-ico | require .ico from user | Bad UX for visual novel creators who work with PNG |

**Installation:**
```bash
npm install -D @electron/packager@^19.1.0 png-to-ico@^3.0.1
```

**Version verification:**
- `@electron/packager`: 19.1.0 (latest, verified via npm registry)
- `png-to-ico`: 3.0.1 (latest, verified via npm registry)
- `electron`: 41.2.0 is latest 41.x (editor installs 41.0.4, export targets 41.2.0)

## Architecture Patterns

### Recommended Project Structure (New/Modified Files)

```
electron/
├── exportGame.js         # EXISTING — web export pipeline (reference pattern)
├── exportDesktop.js      # NEW — desktop export pipeline (~200 lines)
├── main.js               # MODIFIED — add 'export-game-desktop' IPC handler
├── game/
│   ├── main.js           # EXISTING (Phase 32) — game runtime template (368 lines)
│   └── preload.js        # EXISTING (Phase 32) — game preload template (27 lines)
public/
├── default-game-icon.png # NEW — default game icon (256×256 PNG)
tests/
├── exportGame.test.js    # EXISTING — reference test pattern
├── exportDesktop.test.js # NEW — desktop export pipeline tests
```

### Pattern 1: Pipeline Architecture (Mirror exportGame.js)

**What:** Desktop export follows the exact same pipeline architecture as web export — numbered steps with sendProgress callbacks, test hooks (_skipBuild, _appRoot), and standardized return shape.

**When:** Always — consistency with existing patterns is critical.

**Example (from existing exportGame.js):**
```javascript
// Source: electron/exportGame.js lines 122-189
export async function exportDesktop(options, sendProgress) {
  const { projectPath, outputDir, gameTitle, iconPath, zip,
          gameWidth, gameHeight, _skipBuild, _appRoot } = options;
  const appRoot = _appRoot || process.env.APP_ROOT;
  const warnings = [];

  // Step 1 — 构建引擎 (0%)
  sendProgress({ step: '构建引擎', percent: 0 });
  // ... Vite build (reuse from exportGame.js pattern)

  // Step 2 — 扫描资源 (10%)
  sendProgress({ step: '扫描资源', percent: 10 });
  // ... scanAssets(scriptData)

  // Step N — 完成 (100%)
  sendProgress({ step: '完成', percent: 100 });
  return { success: true, outputPath: finalOutputDir, zipPath, warnings };
}
```

### Pattern 2: Template Placeholder Replacement (D-01)

**What:** Read `electron/game/main.js` source, replace three `const` lines with actual values, write to staging.

**When:** Step where templates are filled — after staging directory creation, before packager invocation.

**Key detail:** The Phase 32 templates use these exact placeholder lines:
```javascript
// electron/game/main.js lines 17-19
const GAME_TITLE = 'My Game';
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
```

**Replacement strategy:** Simple string replacement on the const declarations:
```javascript
const templatePath = path.join(appRoot, 'electron', 'game', 'main.js');
let mainContent = await fs.readFile(templatePath, 'utf-8');
mainContent = mainContent
  .replace("GAME_TITLE = 'My Game'", `GAME_TITLE = ${JSON.stringify(gameTitle)}`)
  .replace('GAME_WIDTH = 1280', `GAME_WIDTH = ${gameWidth}`)
  .replace('GAME_HEIGHT = 720', `GAME_HEIGHT = ${gameHeight}`);
await fs.writeFile(path.join(stagingDir, 'main.js'), mainContent, 'utf-8');
```

**Why `JSON.stringify` for title:** Handles single quotes, backslashes, and Unicode in game titles safely.

### Pattern 3: Staging Directory Layout

**What:** Create a temp directory that represents the game app's complete source before packager processes it.

**Staging layout:**
```
staging-{random}/
├── package.json      # Generated: { name, main, version, type }
├── main.js           # Filled template from electron/game/main.js
├── preload.js        # Copied from electron/game/preload.js
├── index.html        # Generated via generateHtml() — relative paths
├── engine.js         # Copied from dist-web/
├── engine.css        # Copied from dist-web/
├── script.json       # Copied from project
└── assets/           # Only referenced assets (via scanAssets)
    ├── backgrounds/
    ├── characters/
    ├── audio/
    ├── fonts/
    └── voices/
```

### Pattern 4: @electron/packager Configuration

**What:** Programmatic API call with specific options for this project's use case.

```javascript
import packager from '@electron/packager';

const outputPaths = await packager({
  dir: stagingDir,
  out: outputDir,
  name: sanitizedTitle,
  platform: 'win32',
  arch: 'x64',
  electronVersion: '41.2.0',
  executableName: sanitizedTitle,
  icon: icoPath,     // .ico file path (without extension)
  asar: false,       // D-LOCKED: plain files, no ASAR (v0.9+)
  overwrite: true,   // Allow re-export to same directory
  prune: false,      // Game app has zero node_modules
});
// outputPaths[0] → "C:/output/MyGame-win32-x64/"
```

**Critical notes:**
- `icon` parameter: pass path WITHOUT `.ico` extension — packager appends it
- `asar: false` — locked decision, eliminates ASAR path pitfalls
- `prune: false` — no node_modules in game app (all code is Electron built-ins)
- `overwrite: true` — user may re-export to same directory
- `electronVersion: '41.2.0'` — latest 41.x, same major as editor's 41.0.4

### Pattern 5: IPC Handler Registration

**What:** Add new IPC handler in `electron/main.js` for desktop export.

**Example (mirrors existing export-game handler at lines 792-808):**
```javascript
ipcMain.handle('export-game-desktop', async (event, options) => {
  try {
    const sendProgress = (payload) => {
      const mw = getMainWindow();
      if (mw && !mw.isDestroyed()) {
        mw.webContents.send('export-progress', payload);
      }
    };
    return await exportDesktop({
      ...options,
      projectPath: currentProjectPath,
    }, sendProgress);
  } catch (e) {
    console.error('[ExportDesktop] Failed:', e);
    return { success: false, error: e.message };
  }
});
```

### Pattern 6: Test Hooks (Same as exportGame.js)

**What:** `_skipBuild` and `_appRoot` parameters enable testing without Vite build or real app root.

```javascript
// Test usage:
const result = await exportDesktop({
  projectPath: mockProjectDir,
  outputDir: tempOutputDir,
  gameTitle: 'Test Game',
  iconPath: null,
  zip: false,
  gameWidth: 1280,
  gameHeight: 720,
  _skipBuild: true,      // Skip Vite build in tests
  _appRoot: mockAppRoot,  // Use mock app root with mock dist-web/
  _skipPackager: true,    // NEW: Skip @electron/packager (tests mock staging only)
}, noop);
```

**Additional test hook `_skipPackager`:** The @electron/packager step downloads Electron binaries and takes 10+ seconds. Tests should mock/skip this step and verify staging directory structure instead.

### Anti-Patterns to Avoid

- **Embedding templates as string literals:** D-01 explicitly requires reading from `electron/game/` files — do NOT embed game-main.js content in exportDesktop.js as template strings
- **Using ASAR:** Locked decision — `asar: false` always
- **Including node_modules in staging:** Game app has ZERO npm dependencies — only Electron built-ins
- **Hardcoded absolute paths in generated code:** All paths in staging are relative to `__dirname` or use `app.getPath()` — never reference editor project paths
- **Using `electronVersion: 'latest'`:** Pin to `41.2.0` (latest 41.x) — untested major versions may break

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Electron app packaging | Manual binary copy + rcedit | `@electron/packager` | Handles binary download, caching, icon embedding, exe renaming — 1 API call |
| PNG to ICO conversion | Custom image manipulation | `png-to-ico` | Multi-size ICO format is complex; pure JS library handles it correctly |
| ZIP compression | Custom archive code | `fflate.zipSync()` (existing) | Already proven in web export pipeline |
| Asset scanning | Manual script.json traversal | `scanAssets()` (existing) | Already handles 11 path locations across 5 categories |
| Title sanitization | Custom regex | Reuse `sanitizeTitle()` from `electron/game/main.js` or equivalent | Handles Windows illegal filename characters `<>:"|?*` |
| HTML generation | Manual string concatenation | Reuse/adapt `generateHtml()` from `exportGame.js` | Already handles title escaping, favicon, correct structure |

**Key insight:** ~70% of the desktop export pipeline reuses existing infrastructure. The truly new work is: template filling, package.json generation, icon conversion, and @electron/packager invocation.

## Common Pitfalls

### Pitfall 1: First Export Downloads ~90 MB Electron Binary
**What goes wrong:** `@electron/packager` uses `@electron/get` to download Electron binary on first export. Fails on slow networks, behind GFW/corporate proxy, or if GitHub is rate-limited.
**Why it happens:** Electron binary is ~90 MB ZIP from GitHub Releases. Cached to `~/.electron/` after first download.
**How to avoid:** Catch download errors specifically, show clear Chinese error message: "首次导出需要下载运行时（约 90 MB），请检查网络连接". Consider supporting `ELECTRON_MIRROR` env var.
**Warning signs:** First export takes much longer than expected; network-related error messages from @electron/get.

### Pitfall 2: Game Title Sanitization
**What goes wrong:** Characters `<>:"|?*` are valid in the title text field but invalid in Windows filenames. @electron/packager may fail or produce unexpected results.
**Why it happens:** `executableName` and output folder name derived from title.
**How to avoid:** Sanitize title before passing to packager — replace illegal chars with underscore. Phase 32's `sanitizeTitle()` in `electron/game/main.js` line 29-31 does exactly this.
**Warning signs:** Export fails with "ENOENT" or produces folders with replaced characters.

### Pitfall 3: Staging Directory Cleanup on Failure (D-04)
**What goes wrong:** Failed export leaves hundreds of MB in temp directory.
**Why it happens:** Pipeline fails mid-way through asset copy or packager invocation.
**How to avoid:** `try/finally` that always removes staging dir. Per D-04: clean staging on failure, but preserve final output folder if it was already created.
**Warning signs:** Disk space gradually consumed by orphaned temp directories.

### Pitfall 4: @electron/packager `icon` Path Must Omit Extension
**What goes wrong:** Passing `icon: '/path/to/icon.ico'` causes packager to look for `icon.ico.ico`.
**Why it happens:** @electron/packager auto-appends platform-specific extension (`.ico` for win32).
**How to avoid:** Pass icon path WITHOUT the `.ico` extension: `icon: path.join(tempDir, 'icon')` where the file is actually `icon.ico`.
**Warning signs:** Icon not embedded in .exe despite .ico file existing.

### Pitfall 5: ESM Package.json for Generated Game App
**What goes wrong:** Game's main.js uses `import` statements but generated package.json lacks `"type": "module"`, causing CJS parse errors at runtime.
**Why it happens:** Node.js defaults to CommonJS for `.js` files without `"type": "module"`.
**How to avoid:** Always include `"type": "module"` in generated package.json.
**Warning signs:** "Cannot use import statement outside a module" error when launching exported game.

### Pitfall 6: `generateHtml()` Paths Must Be Relative
**What goes wrong:** The dist-web/index.html generated by Vite uses absolute paths (`/engine.js`). If copied directly, `win.loadFile()` with `file://` protocol cannot resolve absolute `/engine.js`.
**Why it happens:** Vite assumes web server root. Desktop game uses `file://` protocol.
**How to avoid:** Generate index.html with relative paths (`./engine.js`, `./engine.css`) — use `generateHtml()` from `exportGame.js` which already does this correctly. Do NOT copy dist-web/index.html directly.
**Warning signs:** Blank white screen when launching exported game.

### Pitfall 7: JSON.stringify for Game Title in Template Replacement
**What goes wrong:** Game title with quotes or backslashes produces invalid JavaScript in the generated main.js.
**Why it happens:** Naive string interpolation: `GAME_TITLE = '${title}'` breaks if title contains `'`.
**How to avoid:** Use `JSON.stringify(title)` which properly escapes all special characters.
**Warning signs:** Exported game crashes on launch with syntax error.

## Code Examples

### Complete Pipeline Signature (Recommended)

```javascript
/**
 * Export Pipeline — Desktop — Generate standalone Windows game from project.
 *
 * Orchestrates N steps: Vite engine build → asset scanning → staging →
 * template fill → icon conversion → @electron/packager → optional ZIP.
 *
 * @module exportDesktop
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import packager from '@electron/packager';
import pngToIco from 'png-to-ico';
import { scanAssets } from '../src/engine/scanAssets.js';
import { generateHtml } from './exportGame.js';
// Reuse _createZip from exportGame.js or extract to shared module

const execAsync = promisify(exec);
```

### Generated package.json for Game App

```javascript
const gamePackageJson = {
  name: sanitizedTitle,
  version: '1.0.0',
  main: 'main.js',
  type: 'module',
};
await fs.writeFile(
  path.join(stagingDir, 'package.json'),
  JSON.stringify(gamePackageJson, null, 2),
  'utf-8',
);
```

### PNG to ICO Conversion with Default Fallback (D-02)

```javascript
// Source: png-to-ico API
const defaultIconPath = path.join(appRoot, 'public', 'default-game-icon.png');
const pngPath = iconPath && existsSync(iconPath) ? iconPath : defaultIconPath;
const pngBuffer = await fs.readFile(pngPath);
const icoBuffer = await pngToIco(pngBuffer);
const icoOutputPath = path.join(stagingDir, 'icon.ico');
await fs.writeFile(icoOutputPath, icoBuffer);
// Pass to packager WITHOUT extension:
// icon: path.join(stagingDir, 'icon')
```

### Staging Cleanup Pattern (D-04)

```javascript
const stagingDir = path.join(tmpdir(), `gm-export-${randomUUID()}`);
let packagerOutputDir = null;
try {
  await fs.mkdir(stagingDir, { recursive: true });
  // ... pipeline steps ...
  const outputPaths = await packager({ dir: stagingDir, out: outputDir, ... });
  packagerOutputDir = outputPaths[0];
  // ... optional ZIP ...
} finally {
  // D-04: Always clean staging; preserve final output
  await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
}
```

### Test Pattern (Mirrors exportGame.test.js)

```javascript
import { describe, it, before, after } from 'node:test';
import { strictEqual, ok, match } from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

// Mock project + mock appRoot with dist-web/ + mock electron/game/ templates
async function createMockAppRoot(baseDir) {
  // dist-web/ (mock engine artifacts)
  await fs.mkdir(path.join(baseDir, 'dist-web'), { recursive: true });
  await fs.writeFile(path.join(baseDir, 'dist-web', 'engine.js'), '// mock', 'utf-8');
  await fs.writeFile(path.join(baseDir, 'dist-web', 'engine.css'), '/* mock */', 'utf-8');

  // electron/game/ (template files for D-01)
  await fs.mkdir(path.join(baseDir, 'electron', 'game'), { recursive: true });
  await fs.writeFile(path.join(baseDir, 'electron', 'game', 'main.js'),
    "const GAME_TITLE = 'My Game';\nconst GAME_WIDTH = 1280;\nconst GAME_HEIGHT = 720;\n",
    'utf-8');
  await fs.writeFile(path.join(baseDir, 'electron', 'game', 'preload.js'),
    '// mock preload', 'utf-8');

  // public/ (default icon for D-02)
  await fs.mkdir(path.join(baseDir, 'public'), { recursive: true });
  // Create a minimal valid PNG for testing...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Template strings embedded in export module | Read from `electron/game/` source files (D-01) | Phase 33 CONTEXT.md | Templates are debuggable, editable as standalone files |
| `asar: true` with unpack patterns | `asar: false` — plain files | v0.8 architectural decision | Eliminates ASAR path pitfalls entirely |
| electron-builder / forge | @electron/packager | v0.8 stack decision | Simplest API, no Go binary, no lifecycle ownership |

**Deprecated/outdated patterns from research:**
- STATE.md says "game-main.js and game-preload.js embedded as template strings in exportDesktop.js" — **OVERRIDDEN by CONTEXT.md D-01** which reads from source files instead
- ARCHITECTURE.md Pattern 1 shows template as string literal — **OVERRIDDEN by D-01**
- ARCHITECTURE.md mentions `asset://` protocol in generated game main.js — **NOT USED** — desktop games use `win.loadFile()` + relative `./assets/` paths (confirmed by actual `electron/game/main.js`)

## Open Questions

1. **Default icon file creation**
   - What we know: D-02 specifies `public/default-game-icon.png` as default icon
   - What's unclear: This file doesn't exist yet in the repo — needs to be created as part of this phase
   - Recommendation: Create a simple 256×256 PNG with a generic game icon (controller or "G" logo)

2. **`_createZip` function reuse**
   - What we know: `exportGame.js` has a private `_createZip()` function that does recursive directory ZIP via fflate
   - What's unclear: It's a private function (prefixed `_`) — should exportDesktop.js duplicate it or should it be extracted to a shared module?
   - Recommendation: Extract `_createZip` to a shared utility (e.g., `electron/zipHelper.js`) or make it a named export from `exportGame.js`

3. **IPC handler approach: new channel vs format parameter**
   - What we know: CONTEXT.md suggests new `'export-game-desktop'` IPC channel; alternatively could extend existing `'export-game'` with format parameter
   - What's unclear: Which approach ExportModal.vue (Phase 34) will prefer
   - Recommendation: Add separate `'export-game-desktop'` handler — cleaner separation, easier to test, Phase 34 can route to it

4. **Electron version: installed (41.0.4) vs latest 41.x (41.2.0)**
   - What we know: Project installs `electron@^41.0.4`. Latest 41.x is 41.2.0.
   - What's unclear: Whether to use `process.versions.electron` at runtime or hardcode
   - Recommendation: Use `process.versions.electron` (reads actual installed version) — this ensures the exported game always matches the editor's Electron

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Everything | ✓ | v24.13.1 | — |
| npm | Package installation | ✓ | v11.11.1 | — |
| Electron | Editor runtime + export target | ✓ | 41.0.4 | — |
| @electron/packager | PIPE-02 packaging | ✗ (not installed) | — | Must `npm install -D` |
| png-to-ico | CUSTOM-02 icon conversion | ✗ (not installed) | — | Must `npm install -D` |
| Vite | Engine build | ✓ | 6.3.0 | — |
| fflate | ZIP compression | ✓ | 0.8.2 | — |
| dist-web/ | Engine bundle output | ✓ (build artifacts present) | — | Rebuilt by pipeline Step 1 |

**Missing dependencies with no fallback:**
- `@electron/packager` — must be installed before pipeline can work
- `png-to-ico` — must be installed for icon conversion
- `public/default-game-icon.png` — must be created for D-02 default icon

**Missing dependencies with fallback:**
- None — all missing items are must-have

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test + node:assert/strict) |
| Config file | None — uses `node --test` CLI |
| Quick run command | `node --test tests/exportDesktop.test.js` |
| Full suite command | `node --test tests/exportDesktop.test.js tests/exportGame.test.js tests/scanAssets.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | exportDesktop() produces output folder with correct structure | integration | `node --test tests/exportDesktop.test.js` | ❌ Wave 0 |
| PIPE-02 | @electron/packager is invoked with correct config (asar:false, win32, x64) | unit | `node --test tests/exportDesktop.test.js` | ❌ Wave 0 |
| PIPE-03 | All 5 asset categories copied to staging (backgrounds, characters, audio, fonts, voices) | integration | `node --test tests/exportDesktop.test.js` | ❌ Wave 0 |
| PIPE-06 | ZIP created when zip=true, absent when zip=false | integration | `node --test tests/exportDesktop.test.js` | ❌ Wave 0 |
| PIPE-07 | Electron binary caching behavior | manual-only | N/A — requires first+second export on clean machine | N/A |
| CUSTOM-01 | Template filling replaces GAME_TITLE/WIDTH/HEIGHT correctly | unit | `node --test tests/exportDesktop.test.js` | ❌ Wave 0 |
| CUSTOM-02 | PNG→ICO conversion + default icon fallback | unit | `node --test tests/exportDesktop.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/exportDesktop.test.js`
- **Per wave merge:** `node --test tests/exportDesktop.test.js tests/exportGame.test.js tests/scanAssets.test.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/exportDesktop.test.js` — covers PIPE-01, PIPE-02, PIPE-03, PIPE-06, CUSTOM-01, CUSTOM-02
- [ ] Mock fixtures: mock appRoot with `dist-web/` + `electron/game/` + `public/default-game-icon.png`
- [ ] Test hook: `_skipPackager` to bypass actual @electron/packager invocation in unit tests

**Test design strategy:** Mirror `tests/exportGame.test.js` structure exactly — 7 describe blocks covering: staging structure, asset filtering, missing assets (warnings), icon conversion, template filling, ZIP, progress callbacks. Use `_skipBuild: true` + `_appRoot: mockAppRoot` + `_skipPackager: true` to test pipeline logic without Vite build or Electron binary download.

## Sources

### Primary (HIGH confidence)
- `electron/exportGame.js` — existing 6-step web export pipeline architecture, sendProgress pattern, test hooks
- `tests/exportGame.test.js` — 20 tests using node:test, fixture patterns, mock project/appRoot helpers
- `src/engine/scanAssets.js` — pure function asset scanner, 5-category output
- `electron/game/main.js` — Phase 32 game runtime template (368 lines), placeholder lines 17-19
- `electron/game/preload.js` — Phase 32 preload template (27 lines), 8-channel whitelist
- `electron/main.js` lines 792-808 — export-game IPC handler pattern
- `src/engine/assetPath.js` — 4-way environment detection (desktop/electron/preview/web) already implemented
- `package.json` — current dependencies and scripts
- npm registry: `@electron/packager@19.1.0`, `png-to-ico@3.0.1`, `electron@41.2.0` — verified versions

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` — v0.8 technology decisions, pitfall catalog, phase ordering
- `.planning/research/ARCHITECTURE.md` — two-app model, data flow, anti-patterns
- `.planning/research/PITFALLS.md` — 14 pitfalls across 3 severity levels
- `.planning/research/STACK.md` — @electron/packager API surface, png-to-ico usage

### Tertiary (LOW confidence)
- @electron/packager `icon` parameter extension behavior — stated in research but not verified against source code; needs validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified, API surfaces confirmed from research documents
- Architecture: HIGH — existing `exportGame.js` provides exact pattern to follow; Phase 32 templates verified in codebase
- Pitfalls: HIGH — 14 pitfalls documented in research; most critical (ASAR-related) eliminated by locked decisions

**Research date:** 2025-07-15
**Valid until:** 2025-08-15 (stable domain — Electron packaging patterns change slowly)
