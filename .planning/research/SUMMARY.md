# Project Research Summary

**Project:** Galgame Maker v0.2  
**Domain:** Visual novel / galgame maker — Electron desktop app (editor + runtime engine)  
**Researched:** 2025-07-21  
**Confidence:** HIGH

## Executive Summary

Galgame Maker v0.2 adds three features — a unified asset library, a title page designer, and a settings overlay — to an existing Electron 41 + Vue 3 + Pinia desktop application. The critical finding across all research is that **the existing codebase already establishes every pattern needed**. The SettingsDesigner.vue (800+ lines, 3-panel canvas editor) is the gold reference for the title designer. The existing IPC layer and `asset://` protocol handle all file I/O. The runtime engine's z-index stacking already positions the settings screen correctly for overlay mode. Zero new npm dependencies are required; all new capabilities (font loading, file validation, slide animations) use built-in browser and Node.js APIs.

The recommended approach is a strict dependency-ordered build: **Asset Library first** (it provides the asset store, file pickers, and font infrastructure that both designers consume), **Title Designer second** (it replicates the proven SettingsDesigner pattern with a new component registry), and **Settings Overlay last** (it's a pure CSS/JS runtime change with the smallest scope and no dependency on the other two features). This ordering is unambiguous — the title designer literally cannot function without the asset picker infrastructure, and the settings overlay touches zero editor code.

The primary risk is **schema mismatch between the editor and engine runtime**. The existing TitleScreen.js uses a legacy element schema (`type: 'text'`, flat props) that differs from the SettingsScreen.js pattern (`type: 'label'`, nested `style: {}`). If the new TitleDesigner outputs the new format but TitleScreen.js still expects the old format, custom title layouts render as blank screens — silently. The mitigation is clear: update `TitleScreen.js._renderCustom()` to the new schema **before** building the designer UI. Secondary risks include dual-process font loading (editor vs engine windows need independent `FontFace` injection) and the recurring reactive-proxy-in-IPC bug already encountered in v0.1.

## Key Findings

### Recommended Stack

No new packages. The existing 8-dependency stack (Electron 41, Vue 3.5, Pinia 3, Vite 6) is sufficient. All new capabilities come from built-in APIs:

- **FontFace API** (Chromium 136): Load user-imported .ttf/.otf/.woff/.woff2 fonts programmatically — no CSS `@font-face` injection needed
- **Magic byte validation** (Node.js `fs.read`): 40-line utility checking 12 format signatures — replaces the `file-type` package (rejected: 4 transitive deps for 12 checks)
- **CSS transitions** (`transform` + `opacity`): Hardware-accelerated slide-in/out for settings overlay — no animation library needed
- **`path.parse()` + counter**: Auto-naming on filename conflicts — 5 lines of code

**Rejected alternatives:** `file-type` (dep weight), GSAP/anime.js (overkill for one animation), `vue-draggable` (conflicts with existing DraggableElement.vue), `@fontsource` (wrong use case — we load user files, not Google Fonts).

See: [STACK.md](./STACK.md)

### Expected Features

**Must have (25 table-stakes features across 3 areas):**

*Asset Library (11 features):*
- L1: Single unified view replacing separate Assets + Characters tabs (6→5 tabs)
- L2: Four category sections (backgrounds, characters, audio, fonts)
- L3: File format validation via magic bytes + extension allowlist
- L4: Auto-naming on filename collision (背景-1.png, 背景-2.png)
- L7/L8/L9: Character expression management with image picker (replaces manual path typing)
- L10: Delete asset with confirmation
- L-D1: Custom fonts as first-class assets in `assets/fonts/`

*Title Designer (10 features):*
- T1: 1280×720 canvas with 3-panel layout (palette → canvas → inspector)
- T2/T3: Component palette with 4 preset buttons (start/continue/settings/exit)
- T5/T6: Background image and BGM selection via asset pickers
- T7/T9: Text labels and decorative image elements
- T12: Undo/redo + auto-save (mirroring SettingsDesigner pattern)

*Settings Overlay (7 features):*
- S1: Overlay rendering on top of game scene (game continues underneath)
- S2: Semi-transparent backdrop with optional blur
- S3/S4: Slide-in/slide-out CSS transitions
- S6/S7: ESC key and click-outside dismiss

**Should have (time permitting):**
- L11: Rename asset, L-D2: Font preview, L-D6: Bulk import drop-zone
- T4: Continue button disabled-state preview, T-D4: Z-order layer control
- S-D1: Blurred game backdrop (`backdrop-filter: blur`)

**Defer to v2+:**
- Smart expression auto-detection by filename pattern (L-D4)
- Asset usage indicators / project health scanning (L-D5)
- Gallery/CG Room buttons, animated title elements (T-D5/T-D6)
- Configurable slide direction (S-D2)
- Video backgrounds (T-X3) — no video system in engine

See: [FEATURES.md](./FEATURES.md)

### Architecture Approach

The architecture is an incremental extension of the existing editor/engine split. The editor (Vue 3 + Pinia) gains one new store (`assets.js` for filesystem state), one new view (`AssetLibrary.vue` merging two old views), one full rewrite (`TitleDesigner.vue`), and one new shared registry (`titleDefs.js`). The engine (pure JS + DOM) gets schema alignment in `TitleScreen.js` and CSS animation changes in `SettingsScreen.js`. A cross-cutting `fontLoader.js` utility serves both processes. Four new IPC handlers bridge the gap (`import-assets`, `delete-asset`, `list-assets`, `load-font-metadata`).

**Major components and responsibilities:**

1. **`AssetLibrary.vue`** (NEW) — Unified UI for all asset types; delegates to `assets.js` store for file operations
2. **`assets.js` Pinia store** (NEW) — Caches file lists, manages import/delete, provides `assetUrl()` helper to all consumers
3. **`TitleDesigner.vue`** (REWRITE) — 3-panel canvas editor cloned from SettingsDesigner pattern, uses `titleDefs.js` registry
4. **`titleDefs.js`** (NEW) — Component registry + factory functions for title elements (mirrors `settingDefs.js`)
5. **`fontLoader.js`** (NEW) — FontFace API wrapper used by both editor and engine windows
6. **`SettingsScreen.js`** (MODIFY) — CSS slide transition + `transitionend` cleanup for overlay mode

**Key patterns to replicate:** Registry+Factory (settingDefs→titleDefs), Store Method Pair (get/update with lazy init), Local Reactive + `_syncing` Flag (high-frequency drag → batched undo), IPC with `isInsideProject()` security check.

**Anti-patterns to avoid:** Storing file bytes in Pinia (kills undo), different element schemas between designers (doubles rendering logic), font loading via IPC on every render (inject once on load).

See: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Critical Pitfalls

1. **Schema mismatch between TitleDesigner and TitleScreen.js runtime** — TitleScreen.js uses legacy `type: 'text'` + flat props; the new designer outputs `type: 'label'` + nested `style: {}`. Custom layouts silently render blank. **Fix:** Update `TitleScreen.js._renderCustom()` to the new schema *before* building the designer UI. Add migration for old `type: 'text'` elements.

2. **Font not loaded in both renderer processes** — Editor and engine run in separate Electron windows (`editor.html` vs `index.html`). FontFace registered in one window is invisible in the other. **Fix:** Shared `fontLoader.js` called independently in both processes — on project load + after font import (editor), and in engine `init()` before rendering (engine).

3. **Reactive proxy leaking into IPC calls** — Vue reactive objects fail Electron's structured clone. Already hit in v0.1 but the new asset store introduces more IPC touchpoints. **Fix:** `JSON.parse(JSON.stringify(data))` before every `ipcRenderer.invoke` call, same pattern as existing `project.js` store.

4. **Title BGM overlapping game BGM** — Title BGM starts, player clicks "开始游戏", but title BGM keeps playing alongside the first scene's BGM. **Fix:** Explicitly call `audio.stopBgm({ fadeOut: 500 })` in the `titleScreen.onStart` and `titleScreen.onContinue` callbacks.

5. **Settings overlay transition interrupted by rapid open/close** — Quick toggling causes animation glitch or stuck state. **Fix:** Track `_animating` state flag, force-reset transform on re-trigger, skip `transitionend` listener if interrupted mid-animation.

See: [PITFALLS.md](./PITFALLS.md)

## Implications for Roadmap

Based on combined research, the phase structure is dictated by hard dependencies: the title designer **cannot** function without the asset library's file pickers, and the settings overlay is fully independent of both.

### Phase 1: Asset Library Foundation

**Rationale:** Both the TitleDesigner and SettingsDesigner need asset pickers (backgrounds, audio, fonts). The asset store is consumed by AssetLibrary, AssetPanel, and both designer views. This is the dependency root — nothing else can be built properly without it.

**Delivers:** Unified asset management UI, new Pinia asset store, IPC handlers for import/delete/list, file format validation, auto-naming, character expression editor with image picker, font import + FontFace loading.

**Features addressed:** L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L-D1 (fonts)

**Pitfalls to avoid:**
- Pitfall #3 (reactive proxy in IPC) — JSON.parse/stringify in all new IPC calls
- Pitfall #2 (dual-process fonts) — fontLoader.js must work in both windows from day one
- Pitfall #5 (auto-naming race) — sequential `await` in import handler
- Pitfall #8 (orphaned font metadata) — delete-asset must also clean script.data.assets.fonts[]

**Build order:** assets.js store → list-assets + delete-asset IPC → import-assets IPC (validation + auto-naming) → AssetLibrary.vue (bg/audio tabs) → Characters sub-tab migration → Fonts sub-tab + fontLoader.js → App.vue tab swap → AssetPanel.vue update

### Phase 2: Title Page Designer

**Rationale:** Depends on Phase 1 for asset pickers (background, BGM, image, font selection). The SettingsDesigner is the proven template — this is a structured replication, not invention. The runtime schema alignment (TitleScreen.js) must happen first to avoid the #1 critical pitfall.

**Delivers:** Full 3-panel canvas designer for title pages, 4 preset button components, text labels, decorative images, BGM selection, undo/redo, auto-save. Plus runtime engine support for the new schema.

**Features addressed:** T1, T2, T3, T5, T6, T7, T8, T9, T11, T12

**Pitfalls to avoid:**
- Pitfall #1 (schema mismatch) — **Update TitleScreen.js _renderCustom() FIRST**, before building designer
- Pitfall #7 (BGM overlap) — Stop title BGM in onStart/onContinue callbacks
- Pitfall #9 (click vs drag) — Consider adding 3px drag threshold to DraggableElement.vue

**Build order:** titleDefs.js registry → script.js store methods (getTitleScreen/updateTitleScreen) → TitleScreen.js schema update → TitleDesigner.vue rewrite → Engine wiring (BGM, fonts)

### Phase 3: Settings Overlay

**Rationale:** Smallest scope (CSS + minor JS changes in engine), zero dependency on other v0.2 features. Pure runtime modification — no editor changes needed. Can be built and tested independently.

**Delivers:** Settings screen renders as slide-in overlay on top of the running game. Semi-transparent backdrop, ESC/click-outside dismiss, smooth CSS transitions.

**Features addressed:** S1, S2, S3, S4, S5, S6, S7

**Pitfalls to avoid:**
- Pitfall #6 (rapid open/close glitch) — `_animating` state flag, force-reset on re-trigger
- Pitfall #11 (backdrop-filter performance) — Keep blur ≤ 12px, CSS variable fallback

**Build order:** style.css slide animation → SettingsScreen.js show()/hide() update → main.js ESC key priority → Test with both custom and default layouts

### Phase Ordering Rationale

- **Dependency chain is unambiguous:** Asset Library → Title Designer → Settings Overlay. The title designer's background picker, BGM picker, and font selector all consume the asset store built in Phase 1.
- **Risk front-loading:** The two hardest pitfalls (schema mismatch #1, dual-process fonts #2) are confronted early — Phase 1 builds fontLoader.js, Phase 2 begins with TitleScreen.js schema alignment.
- **Pattern replication reduces risk over time:** Phase 2 copies a proven 800-line component. Phase 3 is CSS-only. Complexity decreases as the milestone progresses.
- **Settings overlay is the safety valve:** If timeline pressure hits, Phase 3 is the smallest and most independent — it could ship in a follow-up patch without blocking the other two features.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1 (Asset Library):** Character expression editor UX — merging Characters.vue data management into the unified view requires careful UI design. The image-picker-for-expressions flow replaces manual text input and needs interaction design.
- **Phase 2 (Title Designer):** TitleScreen.js backward compatibility — if any existing projects use the old `type: 'text'` schema, a migration path is needed. Verify whether any test projects exist.

**Phases with standard patterns (skip deep research):**
- **Phase 2 (TitleDesigner.vue rewrite):** Direct port of SettingsDesigner.vue patterns. The architecture doc provides complete code patterns, registry definitions, and store methods. This is execution, not invention.
- **Phase 3 (Settings Overlay):** Pure CSS transitions + minor JS. Well-documented approach with exact CSS provided in architecture research. No unknowns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Verified all APIs available in Electron 41 (Chromium 136 + Node 22.x). No new deps needed. |
| Features | **HIGH** | Full codebase audit performed. Feature list cross-referenced with Ren'Py, TyranoBuilder, Visual Novel Maker, and commercial galgame conventions. All features have clear implementation paths. |
| Architecture | **HIGH** | Every pattern derived from existing source code. SettingsDesigner.vue, settingDefs.js, script.js store, and IPC handlers all inspected directly. No speculation. |
| Pitfalls | **HIGH** | All pitfalls traced to actual code patterns in the repository. Schema mismatch verified by reading both TitleScreen.js and SettingsScreen.js. Reactive proxy bug documented in PROJECT.md from v0.1. |

**Overall confidence: HIGH** — This is an unusually well-grounded research set because the existing codebase provides proven patterns for every feature. The v0.2 milestone is primarily replication and extension, not greenfield invention.

### Gaps to Address

- **Backward compatibility for `ui.titleScreen` schema:** If any saved projects already contain title screen data in the old format (`type: 'text'`), a migration function is needed. Verify during Phase 2 planning whether any test projects have this data.
- **Font family name extraction:** The FontFace API needs a CSS-safe family name. Research assumes the filename stem is used (e.g., `MyFont.ttf` → family `MyFont`), but some fonts have internal family names that differ from filenames. May need to read the `name` table from TTF/OTF headers — or accept filename-based naming as sufficient for v0.2.
- **DraggableElement.vue drag threshold:** Pitfall #9 suggests adding a 3px minimum drag distance. This affects both SettingsDesigner and TitleDesigner. Decide during Phase 2 planning whether to fix this globally or defer.
- **`select-asset` IPC handler:** Referenced by existing SettingsDesigner.vue but not implemented (opens file dialog filtered by category). Needs implementation in Phase 1 — currently a silent gap in the codebase.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:** SettingsDesigner.vue, Assets.vue, Characters.vue, TitleDesigner.vue (stub), TitleScreen.js, SettingsScreen.js, settingDefs.js, main.js (engine), App.vue, DraggableElement.vue, AssetPanel.vue, electron/main.js, script.js store, project.js store — all inspected directly
- **PROJECT.md:** v0.2 milestone requirements and known issues (reactive proxy IPC bug)
- **MDN Web Docs:** FontFace API, CSS Font Loading API, CSS transitions
- **Wikipedia:** File signature magic bytes (stable standards)

### Secondary (MEDIUM confidence)
- **VN engine domain patterns:** Ren'Py screen language, TyranoBuilder UI, Kirikiri/KAG, Naninovel — established domain conventions
- **Commercial galgame UX:** CLANNAD, Steins;Gate, etc. — overlay settings pattern is industry standard

### Tertiary (LOW confidence)
- **Font family name extraction from TTF headers** — may need validation during implementation if filename-based naming proves insufficient

---
*Research completed: 2025-07-21*  
*Ready for roadmap: yes*
