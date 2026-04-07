# Phase 29: Asset Scanner + Build Config - Research

**Researched:** 2026-04-07
**Domain:** Asset reference extraction from JSON data + Vite build configuration
**Confidence:** HIGH

## Summary

Phase 29 delivers two independent, well-scoped artifacts: (1) a pure JS scanner function that extracts all referenced asset paths from a script.json object, and (2) an independent Vite configuration file (`vite.web.config.js`) that builds the runtime engine into deterministic `engine.js` + `engine.css` bundles.

The scanner is straightforward — script.json has a finite, well-documented set of locations where asset paths appear. Research identified 11 distinct path locations across 5 categories (backgrounds, audio, fonts, characters, UI images). Nine-slice images are base64 data URIs and must be skipped. The scanner is a pure function (no I/O, no filesystem) per D-06, making it trivially testable.

The Vite web config requires creating a standalone `vite.web.config.js` that excludes all Electron plugins and produces deterministic filenames via Rollup's `entryFileNames`/`assetFileNames` options. The project runs Vite 6.4.1 with Rollup 4.x. The entry point is `index.html` (engine only, not `editor.html`).

**Primary recommendation:** Build the scanner as a config-table-driven traversal (mapping path locations to extraction logic), not a recursive tree walker. The data structure is known and finite — a table is more readable, maintainable, and auditable.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Scanner returns categorized dict: `{ backgrounds: [...], audio: [...], fonts: [...], characters: [...], voices: [...] }`, each category contains an array of referenced file paths
- **D-02:** Path values are original relative paths from script.json (e.g. `backgrounds/bg1.png`, `fonts/myfont.ttf`), mapping directly to the export package's `assets/` directory structure
- **D-03:** New `vite.web.config.js` independent config file — builds only `index.html` (game engine), no `vite-plugin-electron`, does not affect existing Electron dev flow
- **D-04:** Deterministic output filenames `engine.js` + `engine.css` (Rollup `entryFileNames` / `assetFileNames`), no content hash, satisfying PIPE-06
- **D-05:** Scanner does NOT handle favicon — favicon is a Phase 31 export UI concern, not stored in script.json
- **D-06:** Scanner is a pure JS function — receives script object as parameter, returns categorized dict. No filesystem dependency, callable from both renderer and Node.js
- **D-07:** SCAN-03 (missing file warnings) — file existence checking delegated to Phase 30. Scanner only extracts reference paths, no I/O

### Agent's Discretion
- Scanner function's internal traversal implementation (recursive vs config-table-driven)
- Vite Web config's optimization options (minify, sourcemap, etc.)
- Category dict key naming and deduplication strategy

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCAN-01 | Auto-scan script.json for all asset references, collect actual file list | Scanner function traverses all 11 known path locations in script.json — see Asset Reference Map below |
| SCAN-02 | Scan covers all asset types: backgrounds, characters, audio, fonts, nine-slice images, favicon | All types covered; nine-slice uses base64 data URIs (skipped by scanner); favicon deferred to Phase 31 per D-05 |
| SCAN-03 | Output warnings for referenced assets that don't exist on disk | Per D-07, scanner only extracts paths. File existence checking delegated to Phase 30 export pipeline |
| PIPE-06 | Vite independent build config produces deterministic engine bundle | `vite.web.config.js` with Rollup `entryFileNames`/`assetFileNames` config — see Build Config section |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack:** JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript migration
- **Code style:** 2-space indent, single quotes, semicolons, named exports only (no default exports)
- **Import style:** Explicit `.js` extensions for JS imports, relative paths only, ESM exclusively
- **Module design:** One class per file for engine modules; utility files export multiple named functions
- **Comments:** File-level JSDoc block at top of every module; inline section dividers with `// ─── Section Name ───────`
- **Error handling:** `console.warn` for non-critical warnings, `[ModuleName]` prefix logging
- **Naming:** Engine modules PascalCase (`AssetScanner.js`), utility modules lowercase (`scanAssets.js`)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 6.4.1 (installed) | Build tool for web config | Already in project, `^6.3.0` in package.json |
| @vitejs/plugin-vue | 6.0.5 (installed) | Vue SFC compilation | Already in project — needed because `index.html` imports `src/main.js` which may resolve through Vite's module graph |

### What's NOT Needed
| Library | Reason |
|---------|--------|
| vite-plugin-electron | Excluded from web config per D-03 |
| vite-plugin-electron-renderer | Excluded from web config per D-03 |
| Any new npm dependency | Zero new dependencies — scanner is pure JS, build uses existing Vite |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── engine/
│   └── scanAssets.js       # Pure scanner function (new)
vite.web.config.js          # Independent web build config (new, project root)
```

### Asset Reference Map (Complete)

All locations in script.json where asset file paths appear:

```
script.json
├── characters[id].expressions[exprName]    → "characters/hero_normal.png"
├── scenes[id].pages[]
│   ├── .background                         → "backgrounds/city.png"
│   ├── .bgm.file                           → "audio/bgm1.mp3"
│   ├── .se.file                            → "audio/click.mp3"
│   ├── .dialogues[].voice                  → "audio/voice01.ogg"
│   └── .characters[].image                 → (derived from expressions, but included in page data)
├── assets.fonts[].file                     → "fonts/myfont.ttf"
├── ui.titleScreen
│   ├── .background                         → "backgrounds/title.png"
│   ├── .bgm                               → "audio/title.mp3" (string, not object)
│   └── .elements[type='image'].src         → "ui/logo.png"
├── ui.settingsScreen
│   ├── .background                         → "backgrounds/settings.png"
│   └── .elements[type='image'].src         → "ui/decoration.png"
└── ui.theme.nineSlice[key]
    ├── .src                                → "data:image/png;base64,..." (SKIP)
    └── .states[state].src                  → "data:image/png;base64,..." (SKIP)
```

**Key observations:**
- Nine-slice images are always base64 data URIs (via `readAsDataURL`) → skip anything starting with `data:`
- `ui.titleScreen.bgm` is a bare string path (not `{file: ...}` like page bgm)
- Character expressions are stored in `script.characters[id].expressions` as `{exprName: path}` — but pages also carry a resolved `image` field. Scanner should extract from `characters[id].expressions` (canonical source)
- `page.characters[].image` is derived at runtime from `characters[id].expressions[expression]` — scanner should use the canonical `characters` dict, not page-level data

### Pattern: Config-Table-Driven Scanner

**What:** Define a configuration table mapping each asset location to its extraction logic, then iterate the table.

**When to use:** When the data structure is finite and known (which it is here — 11 locations).

**Why recommended:** More auditable than recursive traversal. Each extraction rule is visible in one place. Easy to add new asset types in future phases.

**Example:**
```javascript
// Source: project codebase analysis
/**
 * scanAssets — Extract all referenced asset paths from a script object.
 *
 * Pure function. No filesystem dependency. Returns categorized dict
 * with deduplicated relative paths suitable for export.
 *
 * @param {Object} script - The full script.json data object
 * @returns {{ backgrounds: string[], audio: string[], fonts: string[], characters: string[], voices: string[] }}
 */
export function scanAssets(script) {
  const result = {
    backgrounds: new Set(),
    audio: new Set(),
    fonts: new Set(),
    characters: new Set(),
    voices: new Set(),
  };

  // Helper: add path if it's a non-empty string and not a data URI
  const add = (set, path) => {
    if (path && typeof path === 'string' && !path.startsWith('data:')
        && !path.startsWith('http://') && !path.startsWith('https://')) {
      set.add(path);
    }
  };

  // 1. Character expression images
  for (const char of Object.values(script.characters || {})) {
    for (const imgPath of Object.values(char.expressions || {})) {
      add(result.characters, imgPath);
    }
  }

  // 2. Scene pages
  for (const scene of Object.values(script.scenes || {})) {
    for (const page of (scene.pages || [])) {
      add(result.backgrounds, page.background);
      if (page.bgm?.file) add(result.audio, page.bgm.file);
      if (page.se?.file) add(result.audio, page.se.file);
      for (const dlg of (page.dialogues || [])) {
        if (dlg.voice) add(result.voices, dlg.voice);
      }
    }
  }

  // 3. Fonts
  for (const font of (script.assets?.fonts || [])) {
    if (font.file) add(result.fonts, font.file);
  }

  // 4. UI screens (titleScreen, settingsScreen)
  for (const screenKey of ['titleScreen', 'settingsScreen']) {
    const screen = script.ui?.[screenKey];
    if (!screen) continue;
    add(result.backgrounds, screen.background);
    if (screenKey === 'titleScreen' && screen.bgm) {
      add(result.audio, screen.bgm);
    }
    for (const elem of (screen.elements || [])) {
      if (elem.type === 'image' && elem.src) {
        add(result.backgrounds, elem.src);
      }
    }
  }

  // Convert Sets to sorted arrays for deterministic output
  return {
    backgrounds: [...result.backgrounds].sort(),
    audio: [...result.audio].sort(),
    fonts: [...result.fonts].sort(),
    characters: [...result.characters].sort(),
    voices: [...result.voices].sort(),
  };
}
```

### Pattern: Vite Web Build Config

**What:** Standalone `vite.web.config.js` at project root that builds only `index.html` with deterministic output names.

**When to use:** Running `npx vite build --config vite.web.config.js` to produce the web export engine bundle.

**Example:**
```javascript
// Source: Vite 6.x docs + Rollup 4.x output options
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'engine.js',
        chunkFileNames: 'engine-[name].js',
        assetFileNames: (assetInfo) => {
          // CSS → engine.css, everything else keep original name
          if (assetInfo.name?.endsWith('.css')) return 'engine.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
```

**Critical notes:**
- No `vue()` plugin needed — the runtime engine (`src/main.js`) is pure vanilla JS, does NOT import any Vue SFC files. Vue is editor-only.
- No `electron` plugins — explicitly excluded per D-03
- `outDir: 'dist-web'` avoids conflict with existing `dist/` (Vite dev) and `dist-electron/` (Electron build)
- The `@import url('https://fonts.googleapis.com/...')` in `style.css` will be preserved as-is in the output CSS (external URL, Vite doesn't bundle it)

### Anti-Patterns to Avoid
- **Recursive tree walking for known structures:** The script.json schema is finite and documented. A generic recursive walker adds complexity without benefit and risks picking up unintended paths (e.g., variable values that happen to look like paths).
- **Scanning page.characters[].image instead of characters[].expressions:** The `page.characters[].image` field is a runtime-derived value that may not always be present. The canonical source is `script.characters[id].expressions[exprName]`.
- **Including Vue plugin in web config:** The runtime engine is pure vanilla JS — it doesn't use Vue at all. Adding the Vue plugin would be dead weight.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deterministic file naming | Custom post-build rename script | Rollup `entryFileNames` / `assetFileNames` | Built into Vite/Rollup, well-tested, handles sourcemaps correctly |
| Path deduplication | Manual array-based dedup | `Set` → spread to array | Native JS, zero overhead, handles exact string matching |
| Build tool for web export | Custom bundler/concat script | `vite build --config vite.web.config.js` | Vite already installed, handles tree-shaking, CSS extraction, module resolution |

**Key insight:** Both deliverables are thin wrappers around existing capabilities — the scanner is just structured object traversal, and the build config is a slim Vite configuration. No complex logic required.

## Common Pitfalls

### Pitfall 1: Missing UI Screen Image Elements
**What goes wrong:** Scanner finds backgrounds and BGM but misses `elements[type='image'].src` paths in titleScreen and settingsScreen.
**Why it happens:** The `elements` array contains mixed types (button, text, slider, image). Only `image` type elements have a `.src` property.
**How to avoid:** Explicitly filter for `elem.type === 'image'` before extracting `elem.src`.
**Warning signs:** Exported game shows title/settings screens but decorative images are missing.

### Pitfall 2: titleScreen.bgm is a String, not an Object
**What goes wrong:** Scanner tries to read `ui.titleScreen.bgm.file` (like page BGM) but gets undefined.
**Why it happens:** Title screen BGM is stored as a bare string path (`ui.titleScreen.bgm = "audio/title.mp3"`), unlike page BGM which is `{ file: "...", volume: 0.5 }`.
**How to avoid:** Handle `titleScreen.bgm` as a direct string path. Check both `typeof` patterns.
**Warning signs:** Title screen BGM missing from export despite being configured.

### Pitfall 3: Nine-Slice Data URIs Collected as File Paths
**What goes wrong:** Scanner includes `data:image/png;base64,...` strings in the asset list.
**Why it happens:** `ui.theme.nineSlice[key].src` and `.states[state].src` contain data URIs, not file paths.
**How to avoid:** Skip any path starting with `data:` (and `http://`/`https://` for completeness). The `resolvePath()` function in `assetPath.js` already handles this pattern — reuse the same filtering logic.
**Warning signs:** Extremely long "paths" in the output, or export trying to resolve impossible filenames.

### Pitfall 4: Vite Web Config Conflicting with Electron Config
**What goes wrong:** Running `vite build` without specifying `--config` picks up the wrong config file.
**Why it happens:** Vite defaults to `vite.config.js` in the project root.
**How to avoid:** Always invoke with `--config vite.web.config.js`. Add a `build:web` script in package.json: `"build:web": "vite build --config vite.web.config.js"`.
**Warning signs:** Build output includes Electron plugins, or build fails with missing Electron dependencies.

### Pitfall 5: CSS entrypoint naming with multiple CSS files
**What goes wrong:** `assetFileNames` returns `engine.css` for ALL CSS assets, causing naming conflicts if there are multiple CSS chunks.
**Why it happens:** Vite may split CSS if there are multiple entry points or dynamic imports.
**How to avoid:** Since `index.html` is the single entry and `src/main.js` imports only `src/style.css`, there should be exactly one CSS output. But defensively, the `assetFileNames` function should only rename `.css` files to `engine.css` and leave other assets untouched.
**Warning signs:** Build warning about duplicate file names.

### Pitfall 6: Forgetting to Sort Output for Determinism
**What goes wrong:** Scanner returns different array orders on different runs (due to `Object.values()` iteration order).
**Why it happens:** While modern JS engines maintain insertion order for string keys, the order depends on how the user built their script.json.
**How to avoid:** Sort each category array before returning. This ensures deterministic output regardless of input ordering, which aids testing and diffing.
**Warning signs:** Tests that pass/fail intermittently due to array order.

## Code Examples

### Scanner Function Signature
```javascript
// Source: D-01, D-02, D-06
/**
 * scanAssets — Extract all referenced asset paths from a script object.
 * @param {Object} script - The full script.json data object
 * @returns {{ backgrounds: string[], audio: string[], fonts: string[], characters: string[], voices: string[] }}
 */
export function scanAssets(script) { ... }
```

### Vite Web Config (Complete)
```javascript
// Source: Vite 6.x defineConfig + Rollup 4.x output options
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'engine.js',
        chunkFileNames: 'engine-[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'engine.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
```

### package.json build:web Script
```json
{
  "scripts": {
    "build:web": "vite build --config vite.web.config.js"
  }
}
```

### Path Filtering Logic (Reusable)
```javascript
// Source: src/engine/assetPath.js resolvePath() pattern
function isAssetPath(path) {
  return path
    && typeof path === 'string'
    && !path.startsWith('data:')
    && !path.startsWith('http://')
    && !path.startsWith('https://');
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — project has no test framework installed |
| Config file | none — see Wave 0 |
| Quick run command | `node --test tests/scanAssets.test.js` (Node.js built-in test runner) |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-01 | Scanner returns complete file list from script.json | unit | `node --test tests/scanAssets.test.js` | ❌ Wave 0 |
| SCAN-02 | Scanner covers backgrounds, characters, audio, fonts, UI images; skips nine-slice/favicon | unit | `node --test tests/scanAssets.test.js` | ❌ Wave 0 |
| SCAN-03 | (Delegated to Phase 30 per D-07 — scanner only extracts paths) | — | — | — |
| PIPE-06 | Vite build produces engine.js + engine.css with deterministic names | integration/smoke | `npm run build:web && node -e "const fs=require('fs'); console.assert(fs.existsSync('dist-web/engine.js')); console.assert(fs.existsSync('dist-web/engine.css'));"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/scanAssets.test.js`
- **Per wave merge:** `node --test tests/ && npm run build:web`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/scanAssets.test.js` — covers SCAN-01, SCAN-02 (scanner returns correct categorized paths for all asset types, deduplicates, skips data URIs)
- [ ] Test fixture: minimal script.json object covering all 11 path locations
- [ ] Node.js built-in test runner (`node:test`) — no install needed (Node.js v24 supports it natively)

**Note:** Using Node.js built-in test runner (`node:test` + `node:assert`) requires zero npm dependencies. This is appropriate for a project with no existing test framework. The scanner is a pure function, perfect for unit testing without any DOM or browser dependencies.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rollup `[hash]` in filenames | Rollup deterministic names via `entryFileNames`/`assetFileNames` | Rollup 2+ (stable) | Use string or function for exact control |
| `vite.config.js` single config | Multiple Vite configs (`--config` flag) | Vite 2+ (stable) | Allows independent web build without affecting Electron |

**Deprecated/outdated:**
- None relevant — Vite 6.x and Rollup 4.x APIs used here are stable and current

## Open Questions

1. **Where to categorize UI image elements (titleScreen/settingsScreen)?**
   - What we know: D-01 specifies `{ backgrounds, audio, fonts, characters, voices }`. UI screen image elements (e.g., `ui/logo.png`) don't fit neatly into any of these categories.
   - Recommendation: Put them in `backgrounds` (since they're image files in the asset directory). Alternatively, could add a sixth `ui` category — but D-01 explicitly lists only 5 categories. Recommend `backgrounds` for simplicity, or consult user if a `ui` category should be added.

2. **Should `page.characters[].image` be scanned in addition to `characters[].expressions`?**
   - What we know: `page.characters[].image` is derived at runtime from `characters[id].expressions[char.expression]` (see ScriptEngine.js line 334). In properly-formed script.json, these are always a subset of `characters[].expressions` values.
   - Recommendation: Only scan `characters[].expressions` (canonical source). This avoids double-counting and handles the case where character definitions have expressions not yet used in any page.

## Sources

### Primary (HIGH confidence)
- `vite.config.js` — existing project Vite configuration (reviewed)
- `package.json` — project dependencies verified (Vite 6.4.1 installed)
- `src/engine/ScriptEngine.js` — all page-level asset references (`background`, `bgm.file`, `se.file`, `characters[].image`, `dialogues[].voice`)
- `src/engine/assetPath.js` — `resolvePath()` path filtering patterns (data:, http://, asset://)
- `src/engine/fontLoader.js` — font metadata structure (`assets.fonts[].file`)
- `src/engine/ThemeManager.js` — nineSlice uses data URIs (confirmed: `url("${config.src}")` with base64 values)
- `src/editor/stores/script.js` — script.json data structure (scenes, pages, dialogues, UI sections)
- `src/editor/stores/assets.js` — 5 categories: backgrounds, characters, audio, fonts, ui
- `src/editor/views/TitleDesigner.vue` — titleScreen structure (background, bgm string, elements[type=image].src)
- `src/editor/views/SettingsDesigner.vue` — settingsScreen structure (background, elements[type=image].src)
- `src/editor/components/theme/NineSliceModal.vue` — confirmed nineSlice uses `readAsDataURL` → base64 data URIs
- `src/editor/views/Characters.vue` — character expressions stored as `{exprName: path}` dict
- `src/main.js` — bootstrap flow confirming all asset loading paths

### Secondary (MEDIUM confidence)
- Vite `build.rollupOptions` API — `entryFileNames`, `assetFileNames` support verified against installed Vite 6.4.1
- Rollup 4.x output options — string and function signatures for filename control

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all already installed and verified
- Architecture: HIGH — full codebase audit of all 11 asset reference locations completed
- Pitfalls: HIGH — derived from actual codebase patterns (titleScreen.bgm string vs object, nineSlice base64, etc.)
- Build config: HIGH — Vite/Rollup API is stable and well-documented, verified against installed versions

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain, no fast-moving dependencies)
