# Domain Pitfalls — Web Export

**Domain:** Visual novel creator → game export/deployment
**Researched:** 2025-07-22

## Critical Pitfalls

Mistakes that cause broken exports or major rewrites.

### Pitfall 1: SaveManager Crashes in Web Mode

**What goes wrong:** The exported game crashes on any save/load interaction because `SaveManager` calls `window.ipcRenderer.invoke()` which doesn't exist in browsers.
**Why it happens:** SaveManager is the ONLY engine component where ALL methods are Electron-dependent with no fallback. Other IPC calls (screenshot, window mode) are already guarded.
**Consequences:** Game starts fine but crashes when player tries to save, load, quick-save, quick-load, or when the title screen checks for existing saves (`hasAnySave()` is called during `showTitle()`). The title screen's "continue" button logic also breaks.
**Prevention:** Create `WebSaveManager` class implementing the exact same async interface. Swap in `main.js` based on `isElectron` flag. Test ALL 8 methods: `save`, `load`, `delete`, `getAllSlots`, `quickSave`, `quickLoad`, `hasQuickSave`, `_checkMigration`.
**Detection:** Title screen fails to render (crash in `showTitle()` → `saveManager.hasAnySave()`). This is the very first thing that happens after script load.

### Pitfall 2: Hardcoded `asset://` in SettingsScreen and TitleScreen

**What goes wrong:** Settings screen and title screen backgrounds/images don't load in the exported web game.
**Why it happens:** `SettingsScreen.js` line 72 hardcodes `asset://` in `url()` construction. `TitleScreen.js` lines 73 and 158 check for `asset://` prefix and fall back to `/game/` — neither works in web mode.
**Consequences:** Custom title screen backgrounds, settings screen backgrounds, and title screen image elements appear as broken images. Default (non-custom) layouts work fine because they don't load asset files.
**Prevention:** Add `basePath` parameter to `SettingsScreen` and `TitleScreen` constructors (same pattern as `AudioManager`, `BackgroundLayer`, `CharacterLayer` which already accept it). Pass `BASE_PATH` from `main.js`.
**Detection:** Test export with a project that has custom title screen and settings screen layouts.

### Pitfall 3: Pre-Built Engine Bundle Not Available

**What goes wrong:** Export fails because `dist-web-engine/` doesn't exist when the user tries to export.
**Why it happens:** The web engine bundle is built by a separate Vite config. If the developer forgets to run the build, or the packaging process doesn't include it, the export handler can't find the engine files.
**Consequences:** Export IPC handler returns an error — "engine bundle not found."
**Prevention:** 
1. Include `build:web` in the main `build` script: `"build": "vite build && vite build --config vite.config.web.js"`
2. In the export handler, check for bundle existence FIRST and give a clear error.
3. In Electron packaging config, include `dist-web-engine/` in the app resources.
**Detection:** Export handler should validate file existence before proceeding.

### Pitfall 4: Asset Reference Scanner Misses Paths

**What goes wrong:** Exported game has missing assets — broken images, silent audio, missing fonts.
**Why it happens:** The scanner doesn't traverse all locations where asset paths exist in script.json. New fields added in future versions aren't scanned.
**Consequences:** Game plays but with visual/audio glitches. Difficult to debug because the game doesn't crash — assets just silently fail to load.
**Prevention:** 
1. Build scanner from the definitive list of asset path locations (see STACK.md §8).
2. Add a verification step: for each path in the scanner's output, check the file exists in the project directory.
3. Log warnings for referenced files that don't exist (catches typos and data corruption).
**Detection:** After export, verify file count. Compare scanner output against actual project `assets/` directory listing.

## Moderate Pitfalls

### Pitfall 5: Google Fonts CDN Dependency

**What goes wrong:** Exported game shows system fonts instead of Noto Sans/Serif SC when played offline or behind a firewall.
**Why it happens:** `style.css` imports fonts from `fonts.googleapis.com`. No internet = no fonts.
**Consequences:** Text renders in fallback fonts (Segoe UI / Microsoft YaHei). Game is playable but looks different from the editor preview.
**Prevention for v0.7:** Document the requirement (internet needed for default fonts). For future: bundle Noto Sans SC (~5 MB) as an optional export setting.
**Detection:** Test export in offline browser.

### Pitfall 6: ZIP Memory Pressure on Large Projects

**What goes wrong:** Electron main process runs out of memory or hangs when creating ZIP of a large game (500+ MB).
**Why it happens:** `zipSync()` or `zip()` loads all file contents into memory before creating the ZIP.
**Consequences:** Export appears to hang, eventually crashes with OOM error.
**Prevention:** 
1. Use `level: 0` (store-only) — avoids memory-intensive compression.
2. For v0.7, set a reasonable project size warning (e.g., > 500 MB → warn user).
3. Future: use fflate's streaming `Zip` + `AsyncZipDeflate` for memory-efficient creation.
**Detection:** Test with a project containing 500+ MB of audio/image assets.

### Pitfall 7: Vite Chunk Splitting Creates Unexpected Files

**What goes wrong:** Vite's build produces unexpected chunk files (e.g., `fontLoader.js` as a separate chunk) that the export doesn't copy.
**Why it happens:** Vite/Rollup automatically code-splits shared modules. The existing build already produces a `fontLoader-*.js` chunk because `fontLoader.js` is imported by both game and editor entries.
**Consequences:** Engine fails to load in browser — missing module error.
**Prevention:** 
1. In `vite.config.web.js`, the web config has only ONE entry point (index.html/game) — no editor entry. With a single entry, Rollup won't split the fontLoader chunk.
2. As extra safety: set `build.rollupOptions.output.inlineDynamicImports: true` to force a single file.
3. Test by loading the built `dist-web-engine/index.html` directly in a browser.
**Detection:** After build, verify `dist-web-engine/` contains exactly the expected files.

### Pitfall 8: Relative Path Resolution in Subdirectories

**What goes wrong:** `fetch('script.json')` fails in some deployment scenarios.
**Why it happens:** When hosted in a subdirectory (e.g., `example.com/my-game/`), relative paths may resolve incorrectly depending on the `<base>` tag or server configuration.
**Consequences:** Game shows "加载游戏失败" error because script.json can't be fetched.
**Prevention:** Use `./script.json` (explicit current-directory relative) instead of `script.json`. Same for `./assets/`. The `./` prefix ensures resolution relative to the HTML file, not the server root.
**Detection:** Test deployment in a subdirectory, not just at domain root.

## Minor Pitfalls

### Pitfall 9: localStorage Key Collisions

**What goes wrong:** Two different exported games hosted on the same domain share save data.
**Why it happens:** `ConfigManager` uses `galgame-maker-config` as the storage key. `ReadHistory` uses `readHistory:{title}`. If two games have the same title, they collide.
**Consequences:** Saves from one game appear in another; settings bleed across games.
**Prevention:** Use a project-specific prefix (e.g., game title hash) for all localStorage keys. `ReadHistory` already uses the title, but `ConfigManager` doesn't.
**Detection:** Deploy two games on the same domain and check for data cross-contamination.

### Pitfall 10: SaveManager Slot Count vs localStorage Quota

**What goes wrong:** Players can't save after filling many slots because localStorage quota is exceeded.
**Why it happens:** `SaveManager.slotCount = 108`. Each save slot stores engine state JSON (~5-50 KB). 108 slots × 50 KB = ~5.4 MB, which is close to the localStorage limit.
**Consequences:** Save silently fails; player loses progress if they're overwriting.
**Prevention:** 
1. Reduce web slot count (e.g., 36 instead of 108).
2. Wrap localStorage writes in try/catch and show a user-friendly error.
3. Log total storage usage and warn before it's full.
**Detection:** Fill 50+ save slots and verify behavior.

### Pitfall 11: Export Overwrites Existing Directory

**What goes wrong:** User exports to a directory with existing files; old files not cleaned, mixed with new export.
**Why it happens:** Export creates files but doesn't clear the target directory first.
**Consequences:** Stale files from previous exports persist. If asset names changed, old assets remain.
**Prevention:** Either clear the target directory before export, or export to a new uniquely-named subdirectory. Warn the user if the directory is non-empty.
**Detection:** Export twice to the same directory and check for stale files.

### Pitfall 12: Favicon Format Compatibility

**What goes wrong:** Favicon doesn't show in browser tab.
**Why it happens:** HTML uses `<link rel="icon" href="favicon.ico">` but user provides a .png file. Some browsers handle this, others don't.
**Consequences:** Missing icon in browser tab. Non-critical but unprofessional.
**Prevention:** Accept .ico and .png. If .png, use `<link rel="icon" type="image/png" href="favicon.png">`. Set the link tag type based on the actual file format.
**Detection:** Test with both .ico and .png favicons in Chrome and Firefox.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Engine web adaptation | **#1 SaveManager crash** — most critical | Test `showTitle()` flow first; it's the immediate crash point |
| Engine web adaptation | **#2 Hardcoded asset://** — silent failures | Test with custom title/settings layouts specifically |
| Asset reference scanning | **#4 Missing paths** — silent asset failures | Use definitive field list from STACK.md §8; add file-exists verification |
| Export pipeline | **#3 Missing bundle** — export fails entirely | Check bundle existence at handler start; clear error message |
| Export pipeline | **#7 Chunk splitting** — broken engine load | Single entry point in web config; verify output file list |
| Export pipeline | **#8 Relative paths** — deployment issues | Use `./` prefix for all relative URLs |
| Export pipeline | **#11 Directory overwrite** — stale files | Warn on non-empty target; option to clean first |
| ZIP packaging | **#6 Memory pressure** — OOM on large projects | Use `level: 0`; warn on projects > 500 MB |
| Web runtime | **#5 Google Fonts offline** — visual degradation | Document internet requirement; future: bundle option |
| Web runtime | **#9 localStorage collisions** — data corruption | Use project-specific key prefix |
| Web runtime | **#10 localStorage quota** — save failures | Reduce web slot count; try/catch on writes |

## Sources

- SaveManager IPC dependency: `src/engine/SaveManager.js` lines 45, 72, 86, 103, 145, 163, 177, 195, 221 (direct grep)
- SettingsScreen hardcoded asset://: `src/ui/SettingsScreen.js` line 72 (direct inspection)
- TitleScreen asset path logic: `src/ui/TitleScreen.js` lines 73, 158 (direct inspection)
- showTitle → hasAnySave call chain: `src/main.js` lines 704-715 (direct inspection)
- Existing build output: `dist/assets/fontLoader-*.js` shared chunk (direct inspection)
- ConfigManager storage key: `src/engine/ConfigManager.js` line 5 — `'galgame-maker-config'` (direct inspection)
- ReadHistory storage key: `src/engine/ReadHistory.js` line 13 — `readHistory:${projectId}` (direct inspection)
- fflate streaming API: `node_modules/fflate/esm/browser.js` — `Zip`, `AsyncZipDeflate` exports (direct inspection)
