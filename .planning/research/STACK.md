# Technology Stack — v0.2: Asset Library & Title Page & Settings Overlay

**Project:** Galgame Maker v0.2
**Researched:** 2025-07-21

## Verdict: Zero New npm Dependencies

All three v0.2 features are implementable with the existing stack plus built-in browser/Node.js APIs. Adding external packages would contradict the project's lean dependency philosophy (currently only 8 packages total) without providing meaningful benefit.

## Existing Stack (Unchanged)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Electron | 41.0.4 | Desktop shell (Chromium 136 + Node 22.x) | ✅ Keep |
| Vue 3 | 3.5.31 | Editor UI framework | ✅ Keep |
| Pinia | 3.0.4 | State management | ✅ Keep |
| Vite | 6.4.1 | Build tool + dev server | ✅ Keep |
| vite-plugin-electron | 0.29.1 | Electron integration | ✅ Keep |
| @vitejs/plugin-vue | 6.0.5 | Vue SFC compilation | ✅ Keep |
| patch-package | 8.0.1 | Patching vite-plugin-electron HMR bug | ✅ Keep |

## New Built-in APIs to Use (No Installation Needed)

### 1. FontFace API — Custom Font Loading

| Property | Value |
|----------|-------|
| **API** | `FontFace` constructor + `document.fonts.add()` |
| **Available in** | Chromium 35+ (Electron 41 uses Chromium 136) |
| **Purpose** | Load user-imported .ttf/.otf/.woff/.woff2 fonts at runtime |
| **Where used** | Editor (font preview in designers) + Engine (game rendering) |

**Why this over alternatives:**
- Built into Chromium, zero bundle cost
- Async loading with Promise-based API
- Works with `asset://` protocol URLs (verified: `net.fetch` serves local files, FontFace resolves them)
- No CSS injection needed — programmatic font registration

**Usage pattern:**
```javascript
// Load a custom font from project assets
const font = new FontFace('UserFont-MyCustom', 'url(asset://fonts/custom.ttf)');
await font.load();
document.fonts.add(font);
// Font is now available in CSS font-family: 'UserFont-MyCustom'
```

**Confidence:** HIGH — FontFace API is stable, well-documented, and available in Chromium since 2014.

### 2. Magic Byte Validation — File Format Checking

| Property | Value |
|----------|-------|
| **API** | Node.js `fs.read()` (first 12 bytes) |
| **Available in** | Electron main process |
| **Purpose** | Validate uploaded files match their claimed format |
| **Where used** | `upload-asset` IPC handler in electron/main.js |

**Why this over `file-type` package:**
- `file-type@22` requires Node >= 22, version compatibility concerns with Electron's bundled Node
- `file-type@19` (Node >= 18) is ESM-only with 4 transitive dependencies (strtok3, token-types, uint8array-extras, get-stream)
- We only need 12 specific format signatures — a 40-line utility is simpler and has zero deps
- The project serves only local desktop users (not untrusted web uploads), so basic validation suffices

**Supported signatures (12 formats):**

| Format | Magic Bytes (hex) | Category |
|--------|-------------------|----------|
| PNG | `89 50 4E 47` | Image |
| JPEG | `FF D8 FF` | Image |
| WebP | `52 49 46 46 ?? ?? ?? ?? 57 45 42 50` | Image |
| GIF | `47 49 46 38` | Image |
| BMP | `42 4D` | Image |
| MP3 (ID3) | `49 44 33` | Audio |
| MP3 (sync) | `FF FB` or `FF F3` or `FF F2` | Audio |
| OGG | `4F 67 67 53` | Audio |
| WAV | `52 49 46 46 ?? ?? ?? ?? 57 41 56 45` | Audio |
| TTF | `00 01 00 00` | Font |
| OTF | `4F 54 54 4F` | Font |
| WOFF | `77 4F 46 46` | Font |
| WOFF2 | `77 4F 46 32` | Font |

**Confidence:** HIGH — Magic byte detection is a well-established technique. These signatures are stable standards.

### 3. CSS Transitions — Settings Overlay Animation

| Property | Value |
|----------|-------|
| **API** | CSS `transition` + `transform` |
| **Available in** | All Chromium versions |
| **Purpose** | Slide-in/slide-out animation for settings overlay |
| **Where used** | Engine SettingsScreen.js + associated CSS |

**Why this over animation libraries (GSAP, anime.js, etc.):**
- Single animation: slide + fade. CSS handles this natively.
- Hardware-accelerated via `transform: translateX()` (GPU compositing)
- Zero JS animation frames needed — CSS handles the entire transition
- Consistent with the project's CSS-only styling approach

**Animation approach:**
```css
#settings-screen {
  position: fixed;
  inset: 0;
  z-index: 100;
  transform: translateX(100%);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.35s ease;
  pointer-events: none;
}
#settings-screen.visible {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}
```

**Confidence:** HIGH — Standard CSS, used in the existing codebase for show/hide transitions.

### 4. Node.js `path.parse()` + Counter — Auto-naming

| Property | Value |
|----------|-------|
| **API** | `path.parse()` + `fs.readdir()` |
| **Available in** | Electron main process |
| **Purpose** | Generate sequential names (背景-1.png, 背景-2.png) when uploading duplicate filenames |
| **Where used** | Enhanced `upload-asset` IPC handler |

**Why custom logic over any library:**
- 5 lines of code: parse filename, check existing files, append counter
- No library exists for this specific naming convention (Chinese-language sequential)
- Must integrate with existing `isInsideProject()` security check

**Confidence:** HIGH — Trivial string manipulation.

## Alternatives Explicitly Rejected

| Need | Rejected Option | Why Not |
|------|----------------|---------|
| File validation | `file-type` (npm) | v22 needs Node ≥ 22; v19 adds 4 deps for 12 signatures we can check in 40 lines |
| Font loading | `@fontsource/*` packages | Those are for web fonts (Google Fonts). We load user-provided local files. |
| Font loading | CSS `@font-face` injection | Works but messy — creates/removes `<style>` tags. FontFace API is cleaner. |
| CSS animation | GSAP / anime.js / Motion One | Overkill for a single slide transition. 200KB+ for one animation. |
| Asset management | Any "digital asset manager" lib | None exist for Electron desktop apps. Our needs are app-specific. |
| Drag & drop | `vue-draggable` / `dnd-kit` | Already have a working DraggableElement.vue. Adding a lib would conflict. |
| State management | Vuex / additional store lib | Pinia 3 is already installed and proven. |

## New Code Modules to Create (Not npm Packages)

These are project-internal modules, not external dependencies:

| Module | Location | Purpose |
|--------|----------|---------|
| `validateAsset.js` | `electron/` | Magic-byte format validation (40 lines) |
| `titleDefs.js` | `src/engine/` | TITLE_DEFS registry (mirrors settingDefs.js pattern) |
| `useAssetStore.js` | `src/editor/stores/` | Unified asset state (Pinia store) |
| `fontLoader.js` | `src/engine/` | FontFace API wrapper for both editor + engine |

## Installation

```bash
# No new packages to install. Existing dependencies are sufficient.
# If starting from a fresh clone:
npm install
```

## Integration Points with Existing Stack

### Asset Library → IPC Layer (electron/main.js)
New IPC handlers needed:
- `validate-and-upload-asset` — validates magic bytes, auto-names, writes to assets/
- `select-asset` — **currently missing** (referenced by SettingsDesigner.vue but not implemented). Opens file dialog filtered by category.
- `list-fonts` — returns available custom fonts from assets/fonts/
- `delete-asset` — removes an asset file with project-path security check

### Title Designer → Script Store
New store methods needed:
- `script.getTitleScreen()` — returns `ui.titleScreen` (mirrors `getSettingsScreen()`)
- `script.updateTitleScreen(data)` — saves title layout + pushes undo state

### Settings Overlay → Engine
Changes to existing code:
- `SettingsScreen.js` — change from `position: relative` to `position: fixed` + z-index overlay
- `SettingsScreen.css` — add `transition` properties for slide animation
- Game container — ensure overlay renders above all game layers (background, characters, dialogue)

### Font Loading → Both Processes
- Editor: load fonts when asset library detects new .ttf/.otf/.woff/.woff2 files
- Engine: load fonts at game initialization from `project.json` font list
- Both use the same `fontLoader.js` utility

## Sources

- Electron 41 release: `electron@41.0.4` installed in project (verified via `npm ls`)
- FontFace API: [MDN FontFace](https://developer.mozilla.org/en-US/docs/Web/API/FontFace) — available since Chrome 35
- CSS Font Loading API: [MDN CSS Font Loading](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Font_Loading_API)
- `file-type` package: npm registry (v22 requires Node ≥ 22, v19 requires Node ≥ 18) — rejected due to dependency weight
- Magic byte signatures: [Wikipedia: List of file signatures](https://en.wikipedia.org/wiki/List_of_file_signatures)
- Existing codebase: SettingsDesigner.vue, settingDefs.js, electron/main.js (all inspected directly)
