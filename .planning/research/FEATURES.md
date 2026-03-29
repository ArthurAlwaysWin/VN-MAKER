# Feature Landscape: v0.2 — Unified Asset Library, Title Page Designer, Settings Overlay

**Domain:** Visual novel / galgame maker — editor asset management, title page design, runtime overlay mode
**Researched:** 2025-07-18
**Overall confidence:** HIGH (based on full codebase audit + VN engine domain analysis)

## Context

v0.2 builds on a working Galgame Maker that already has:
- **SettingsDesigner.vue**: Complete canvas drag-drop designer (left palette → center canvas → right inspector), `SETTING_DEFS` registry, undo/redo, auto-save, property editing — **this is the gold reference** for the title page designer
- **Assets.vue**: Basic file browser with 3 tabs (backgrounds/characters/audio), thumbnail grid, upload-to-disk
- **Characters.vue**: Separate character data editor (name, color, expression paths — manually typed, no image picker)
- **TitleDesigner.vue**: Placeholder stub ("请先加载项目") — being **completely rebuilt**
- **TitleScreen.js**: Engine runtime already supports custom layout (`layout.elements[]` with buttons + text)
- **SettingsScreen.js**: Full custom-layout renderer, show/hide pattern — needs **overlay mode** retrofit
- **DraggableElement.vue**: Shared drag/resize component used by SettingsDesigner
- **AssetPanel.vue**: 140px sidebar for scene editor (backgrounds/characters/audio sections, drag-to-canvas)
- `asset://` protocol: Custom Electron protocol resolving to `{projectPath}/assets/` with path-traversal protection
- Project folder structure: `assets/backgrounds/`, `assets/characters/`, `assets/audio/`, `assets/ui/`

v0.2 targets three features:
1. **Unified Asset Library** — Merge Assets + Characters into one view, add fonts, file validation, auto-naming, expression grouping
2. **Title Page Designer** — Full canvas designer with 4 preset button components, following SettingsDesigner patterns
3. **Settings Overlay Mode** — Settings screen renders as overlay on the game, not a separate screen

---

## Feature Area 1: Unified Asset Library

### Table Stakes

| # | Feature | Why Expected | Complexity | Depends On |
|---|---------|--------------|------------|------------|
| L1 | **Single unified view replacing Assets + Characters tabs** | Having separate "素材库" and "角色" tabs for related asset operations is confusing. Ren'Py, TyranoBuilder, Visual Novel Maker all use one resource manager | Med | Merges `Assets.vue` + `Characters.vue` into one view. Tab count in App.vue drops from 6→5 |
| L2 | **Category sections: Backgrounds, Characters, Audio, Fonts** | Every VN maker categorizes assets. Users expect clear separation. Current Assets.vue already has 3 tabs — extend to 4 categories | Low | Existing `read-dir` IPC + `assets/` subfolders. Add `assets/fonts/` folder |
| L3 | **File format validation on import** | Accepting `.exe` or `.docx` as "background" is a data corruption risk. Ren'Py validates extensions, TyranoBuilder shows format errors | Low | Client-side MIME check + extension allowlist before `upload-asset` IPC call |
| L4 | **Auto-naming on conflict** | Importing `bg.png` when one already exists should not silently overwrite. Standard file manager behavior: append `-1`, `-2` | Low | Check `read-dir` results before `upload-asset`, rename if collision. Pattern: `背景-1.png`, `背景-2.png` |
| L5 | **Thumbnail grid for images** | Users need to visually identify assets. Current Assets.vue has a 140px card grid — keep and improve it | Low | Already implemented in Assets.vue. Use `asset://` URLs for thumbnails |
| L6 | **Audio list with playback** | Audio files need play controls, not just filenames. Current Assets.vue already shows `<audio controls>` | Low | Already implemented. Preserve in unified view |
| L7 | **Character data management panel** | Characters need name, color, expression list — not just files. Current Characters.vue provides this but separately from asset files | Med | Embed character editing into the asset library. When selecting a character, show data panel (name/color/expressions) |
| L8 | **Expression grouping per character** | Character expressions must be grouped visually (`sakura → normal, smile, angry`). This is how Ren'Py `image` declarations and TyranoBuilder character panels work — expressions are children of a character | Med | Current Characters.vue uses manual text paths. New: show actual image thumbnails from `assets/characters/`, allow assigning images to expression slots |
| L9 | **Import expressions via file picker (not manual path typing)** | Current Characters.vue requires typing `characters/sakura_smile.png` by hand. Every modern tool uses file selection | Med | Replace text inputs with image picker buttons. Select from already-imported character assets, or import new file and assign simultaneously |
| L10 | **Delete asset with confirmation** | Users need to remove wrong/unused assets. No delete currently exists in Assets.vue | Low | `delete-asset` IPC handler (with `isInsideProject` check). Confirmation dialog before delete |
| L11 | **Rename asset** | Basic file management. Not present in current Assets.vue | Low | `rename-asset` IPC handler. In-place filename editing |

### Differentiators

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| L-D1 | **Custom fonts as first-class assets** | Most VN makers use system fonts or hardcode font paths. Importing `.ttf`/`.otf`/`.woff2` into the project and using them in any designer is a real differentiator | Med | New `assets/fonts/` folder. Load via `@font-face` with `asset://` URLs. Populate font dropdowns in SettingsDesigner and TitleDesigner dynamically |
| L-D2 | **Font preview in asset library** | Show a text sample rendered in each imported font. TyranoBuilder doesn't do this well | Low | Render "你好世界 AaBbCc 1234" in each font via dynamic `@font-face` loading |
| L-D3 | **Drag-from-library to designers** | Drag a background from asset library directly onto TitleDesigner canvas to set it as background. Drag a font to set it as the font | Med | Cross-tab drag-and-drop. `AssetPanel.vue` already has drag-start for scene canvas. Extend to title/settings designers |
| L-D4 | **Smart expression detection** | When importing multiple character images, auto-detect expression grouping by filename pattern (e.g., `sakura_normal.png`, `sakura_smile.png` → character "sakura" with expressions "normal", "smile") | Med | Parse filenames on import. `{charName}_{expression}.{ext}` pattern matching. Suggest grouping, user confirms |
| L-D5 | **Asset usage indicators** | Show which assets are actually used in the project (referenced in script.json). Grey out or badge unused ones | High | Requires scanning all commands + UI configs for asset references. Useful but expensive |
| L-D6 | **Bulk import with drag-and-drop** | Drag multiple files from OS file explorer onto the asset library to import them. Standard desktop app behavior | Low | Already partially supported (Assets.vue `<input multiple>`). Add drop-zone UI with visual feedback |

### Anti-Features

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| L-X1 | **Cloud asset storage / syncing** | App is purely local (Out of Scope: OAuth/online services). No cloud | Keep everything in local `assets/` folder. Portable project folders |
| L-X2 | **Built-in image editor (crop/resize/filters)** | Scope creep. This is a VN maker, not Photoshop. Assets should be prepared externally | Import pre-made assets. Show dimensions in info tooltip if helpful |
| L-X3 | **Asset marketplace / template packs** | Requires online services, content licensing, moderation. Way out of scope | Users import their own files |
| L-X4 | **Video asset support** | No video playback system in the engine. Adding video support crosses a major complexity boundary | Defer to future milestone when video cutscene support is considered |
| L-X5 | **Automatic sprite sheet generation** | Combining character expressions into spritesheets is an optimization for export, not authoring. Premature | Individual image files per expression. Spritesheet generation is a build/export concern |
| L-X6 | **Font subsetting / optimization** | Subsetting CJK fonts is complex (large character sets). This is a build/export concern, not an authoring one | Import full font files. Optimization at export time if ever needed |

---

## Feature Area 2: Title Page Designer

### Table Stakes

| # | Feature | Why Expected | Complexity | Depends On |
|---|---------|--------------|------------|------------|
| T1 | **Canvas-based designer (1280x720)** | Exact same pattern as SettingsDesigner. Users expect consistent editor experience across tabs | Low | Direct port from SettingsDesigner — `canvasScale`, `artboardStyle`, `ResizeObserver`, `wrapperRef/artboardRef` |
| T2 | **Component palette (left sidebar)** | 4 preset button types + decorative elements. Same layout as SettingsDesigner palette | Low | Copy SettingsDesigner palette structure. Different items: buttons instead of settings components |
| T3 | **4 preset button components** | Every VN title screen has: Start Game, Continue Game, Settings, Exit. Ren'Py, TyranoBuilder, Visual Novel Maker all ship these | Low | Each button has `action: 'start'|'continue'|'settings'|'exit'`. Engine `TitleScreen.js` already handles `start`, `continue`, `settings` actions. Add `exit` (calls `window.close()` or Electron quit) |
| T4 | **Continue button disabled state** | When no save exists, the continue button must be visually disabled (grayed out, `pointer-events: none`). Universal galgame convention | Low | `TitleScreen.js` already does this: `if (!this.hasSave) { btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none'; }`. Designer should show a "no save" preview state |
| T5 | **Background image selection** | Title screens always have a background CG/art. Every VN maker supports this | Low | Same `pickBackground()` pattern from SettingsDesigner. Stored in `ui.titleScreen.background` |
| T6 | **BGM selection** | Title screens almost always play music. Ren'Py `main_menu` screen typically has `play music`, TyranoBuilder has BGM setting | Low | New field: `ui.titleScreen.bgm`. Asset picker filtered to audio. Engine plays on `showTitle()` |
| T7 | **Text label elements** | Game title display, subtitle, copyright text. Every title screen has styled text | Low | Same `createLabelElement()` pattern from SettingsDesigner. Text, color, fontSize, fontFamily |
| T8 | **Property panel (right sidebar)** | Edit position, size, text content, colors, fonts for selected element | Low | Direct port from SettingsDesigner inspector panel pattern |
| T9 | **Decorative image elements** | Logos, ornamental frames, character art on title screen | Low | Same `createImageElement()` pattern from SettingsDesigner |
| T10 | **Default fallback** | If no custom layout exists, engine shows a basic built-in title screen | Low | Already works: `TitleScreen._renderDefault()` fires when `!this.layout` |
| T11 | **Drag-and-drop positioning** | Same DraggableElement.vue reuse | Low | Already proven in SettingsDesigner |
| T12 | **Undo/Redo + Auto-save** | Must work like SettingsDesigner — update `script.data.ui.titleScreen`, triggers auto-save via deep watcher | Low | Follow `saveLayout()` → `scriptStore.updateTitleScreen()` pattern. Add `getTitleScreen()` + `updateTitleScreen()` to script store |

### Differentiators

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| T-D1 | **Button hover state preview** | Show what buttons look like on hover right in the editor. TitleScreen.js already supports `hoverColor` | Med | Add hover color to inspector. Preview by toggling class on mouse-enter in editor |
| T-D2 | **Live BGM preview** | Play the selected title BGM in the editor while designing. Immediate feedback | Low | Simple `<audio>` element in the designer toolbar. Play/pause toggle |
| T-D3 | **Button style presets** | "Glass button", "Flat button", "Outlined button" — one-click styles. Saves styling time | Med | Pre-built style bundles for `backgroundColor`, `borderRadius`, `border`, `color`. Applied per-button |
| T-D4 | **Z-order / layer control** | Move elements forward/backward. Important when images overlap text | Med | `elements[]` array order = z-order. Add buttons to inspector. Low effort, decent value |
| T-D5 | **Gallery/CG Room/Extras buttons** | Post-game unlockable title screen buttons (common in commercial galgames) | High | Requires unlock system, gallery system — way beyond v0.2. Defer |
| T-D6 | **Animated title screen elements** | Particle effects, floating elements, animated backgrounds | High | Requires animation system. Current DOM-based approach can't easily do this. Defer |

### Anti-Features

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| T-X1 | **Multiple title screen pages** | Some VN engines let you navigate between title sub-screens (settings, load, gallery, etc. all from title). This is a mini-navigation system within title — massive scope | Title screen is one page. Buttons navigate to game/settings/etc. as full screen transitions |
| T-X2 | **Title screen scripting/conditionals** | "Show different title screen after finishing the game". Violates no-code philosophy | One static title screen design. Dynamic title screens are a future milestone |
| T-X3 | **Video background for title** | No video system in the engine. Requires `<video>` element management, format compatibility, memory concerns | Image background only. Video support is engine-level work |
| T-X4 | **Custom button actions (arbitrary jump targets)** | Buttons should only trigger pre-defined actions. Custom action wiring creates a scripting surface | Fixed actions: `start`, `continue`, `settings`, `exit`. No custom script execution |

---

## Feature Area 3: Settings Overlay Mode

### Table Stakes

| # | Feature | Why Expected | Complexity | Depends On |
|---|---------|--------------|------------|------------|
| S1 | **Overlay on top of current game scene** | Settings appear over the running game, scene stays visible underneath (dimmed). This is how modern commercial galgames work. The alternative (navigating away to a separate screen) loses visual context | Med | Currently `SettingsScreen` appends to `gameContainer` with `position: fixed` and z-index. Needs semi-transparent backdrop + proper stacking |
| S2 | **Semi-transparent backdrop** | Dark overlay behind settings panel so game scene is visible but de-emphasized. Standard overlay pattern | Low | CSS `::before` pseudo-element or a backdrop div with `rgba(0,0,0,0.6)`. Click-outside-to-close on backdrop |
| S3 | **Slide-in animation** | Settings panel slides in from right (or bottom). Provides spatial context for where the panel "lives". Modern galgame UI convention | Low | CSS transition: `transform: translateX(100%)` to `translateX(0)`. Existing `classList.add('visible')` pattern already in place, just change the CSS transition |
| S4 | **Slide-out animation on close** | Reverse of slide-in. Smooth dismissal | Low | Reverse CSS transition. `transitionend` event to clean up DOM/state after animation completes |
| S5 | **Close button** | Universal dismiss affordance. Already supported in SettingsDesigner as button component with `displayMode: 'icon'` and `action: 'close'` | Low | Already built into SettingsScreen renderer (`_renderButtonElem` handles `action: 'close'`). Ensure it triggers overlay hide |
| S6 | **ESC key closes overlay** | Standard keyboard shortcut for dismissing overlays. Current ESC toggles GameMenu — when settings overlay is visible, ESC should close settings first | Low | `keydown` handler in `main.js` checks `settingsScreen.isVisible()` before toggling game menu |
| S7 | **Click-outside closes overlay** | Clicking the dimmed backdrop area should close settings. Standard modal behavior | Low | Event listener on backdrop div. Prevent event propagation from settings content |
| S8 | **Game state preserved** | Audio continues, visual state unchanged. Returning from settings = exact same scene | Low | Already works — `SettingsScreen.show()` doesn't touch game state. Audio/characters/background persist |
| S9 | **Settings changes apply immediately** | Volume changes audible while overlay is open. Text speed changes reflected on next dialogue | Low | Already works — `settingsScreen.onChange` to `applyConfig()` adjusts AudioManager volumes and typewriter speed in real-time |

### Differentiators

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| S-D1 | **Blurred game backdrop** | CSS `backdrop-filter: blur(8px)` on the overlay background. Looks polished, modern galgame aesthetic | Low | Single CSS property. Chromium in Electron supports it. Graceful fallback to solid dim |
| S-D2 | **Configurable slide direction** | Let creator choose: slide from right, left, bottom, or fade-in. Adds personality to the game | Med | New field in `ui.settingsScreen.overlay.transition`. CSS variable for transform direction |
| S-D3 | **Overlay mode preview in editor** | SettingsDesigner shows a miniature "overlay preview" toggle that dims the canvas background to simulate how settings look over the game | Low | Toggle button in designer toolbar. Overlays a semi-transparent dark div on the canvas. Quick visual check |

### Anti-Features

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| S-X1 | **Custom overlay animation editor** | Timeline-based animation authoring for overlay transitions. Massive scope creep | Provide 2-3 built-in transition presets (slide-right, fade). No custom animation timeline |
| S-X2 | **Multiple overlay panels** | Supporting stacked overlays (settings on top of save/load on top of game) creates z-index hell and focus management complexity | One overlay at a time. Opening settings closes any other overlay. Simple state machine |
| S-X3 | **Resizable overlay panel** | Letting players resize the settings panel adds edge cases (responsive layout within settings, min/max constraints) | Fixed panel size matching the 1280x720 game canvas. Settings is always full-overlay |
| S-X4 | **Partial-screen overlay (sidebar panel)** | Settings as a side panel (taking 1/3 of screen) is more complex than full overlay — requires responsive layout adaptation and game scene rescaling | Full-screen overlay is simpler and matches how commercial galgames do it. Game scene is fully covered (but dimmed/blurred behind) |

---

## Feature Dependencies (Cross-Area)

```
ASSET LIBRARY (foundation — other features depend on it):
  L1 (unified view)
  ├── L2 (categories) ──→ L-D1 (fonts category)
  ├── L3 (format validation)
  ├── L4 (auto-naming)
  ├── L7 (character data panel) ──→ L8 (expression grouping)
  │                               ──→ L9 (image picker for expressions)
  ├── L10 (delete asset)
  └── L11 (rename asset)

TITLE PAGE DESIGNER (depends on asset library for background/BGM/image picking):
  T1 (canvas) ──→ T2 (palette) ──→ T3 (4 buttons)
           │                    ──→ T7 (text labels)
           │                    ──→ T9 (images)
           └──→ T8 (property panel)
           └──→ T5 (background) ←── needs asset picker (L2 backgrounds)
           └──→ T6 (BGM) ←── needs asset picker (L2 audio)
  T10 (default fallback) — standalone
  T12 (undo/redo + auto-save) ←── needs script store methods

SETTINGS OVERLAY (independent of other v0.2 features — runtime change only):
  S1 (overlay mode) ──→ S2 (backdrop) ──→ S3 (slide-in)
                                       ──→ S4 (slide-out)
  S5 (close button) — already built
  S6 (ESC key) ──→ needs main.js change
  S7 (click-outside) ──→ needs backdrop event handling

FONT INTEGRATION (cross-cutting):
  L-D1 (font import) ──→ T8 (title designer font picker uses imported fonts)
                     ──→ SettingsDesigner font picker uses imported fonts
                     ──→ Engine runtime loads @font-face for custom fonts
```

Critical path:
```
L1 → L2 → [L3,L4,L10,L11] → L7 → L8/L9 → L-D1 (fonts)
                                               ↓
T1 → T2 → T3 → T5/T6 → T7/T8/T9 → T12 (uses font data from L-D1)

S1 → S2 → S3/S4 → S5/S6/S7 (parallel track, no dependency on L or T)
```

---

## MVP Recommendation

### Must Ship

**Phase order: Asset Library → Title Designer → Settings Overlay**

Rationale: Title Designer needs asset pickers from the library. Settings Overlay is runtime-only (no editor dependency on other features), so it can be last.

#### Asset Library Core
1. **L1** — Unified view replacing Assets + Characters tabs
2. **L2** — Four category sections (backgrounds, characters, audio, fonts)
3. **L3** — File format validation (allowlist: `.png/.jpg/.webp` for images, `.mp3/.ogg/.wav` for audio, `.ttf/.otf/.woff2` for fonts)
4. **L4** — Auto-naming on conflict
5. **L7** — Character data panel (name, color) embedded in library
6. **L8** — Expression grouping with thumbnail previews
7. **L9** — Image picker for expression assignment (replaces manual path typing)
8. **L10** — Delete asset with confirmation
9. **L-D1** — Custom font import to `assets/fonts/`

#### Title Designer Core
10. **T1** — 1280x720 canvas artboard (port from SettingsDesigner)
11. **T2** — Component palette with button types + decorative elements
12. **T3** — 4 preset button components (start/continue/settings/exit)
13. **T5** — Background image selection
14. **T6** — BGM selection
15. **T7** — Text label elements
16. **T8** — Property panel (position, size, text, colors, fonts)
17. **T9** — Decorative image elements
18. **T11** — Drag-and-drop (DraggableElement.vue reuse)
19. **T12** — Undo/redo + auto-save integration

#### Settings Overlay Core
20. **S1** — Overlay rendering mode (on top of game scene)
21. **S2** — Semi-transparent backdrop
22. **S3 + S4** — Slide-in / slide-out CSS transitions
23. **S5** — Close button (already built)
24. **S6** — ESC key closes overlay
25. **S7** — Click-outside closes overlay

### Should Ship (time permitting)
- **L11** — Rename asset
- **L-D2** — Font preview in library
- **L-D6** — Bulk import drop-zone
- **T4** — Continue button disabled state preview in editor
- **T-D4** — Z-order layer control
- **S-D1** — Blurred game backdrop (`backdrop-filter`)

### Defer to Later
- **L-D4** (Smart expression detection): Useful but non-trivial filename parsing. Users can manually assign expressions
- **L-D5** (Asset usage indicators): Requires full project scanning. Better as a "project health" tool later
- **T-D3** (Button style presets): Nice DX, not blocking
- **T-D5/T-D6** (Gallery buttons / Animations): Require systems that don't exist
- **S-D2** (Configurable slide direction): Low value for effort. Default slide-right is fine

---

## Data Schema Specifications

### `ui.titleScreen` (script.json)
```json
{
  "background": "backgrounds/title_bg.png",
  "bgm": "audio/title_bgm.mp3",
  "elements": [
    {
      "id": "button-1721234567890-1",
      "type": "button",
      "action": "start",
      "x": 640, "y": 400,
      "width": 200, "height": 48,
      "text": "开始游戏",
      "style": {
        "fontSize": 18,
        "fontFamily": "sans-serif",
        "color": "#ffffff",
        "backgroundColor": "rgba(255,255,255,0.15)",
        "borderRadius": 8,
        "hoverColor": "#ff6b9d"
      }
    },
    {
      "id": "label-1721234567890-2",
      "type": "label",
      "x": 640, "y": 200,
      "text": "My Game Title",
      "style": {
        "fontSize": 48,
        "fontFamily": "'MyCustomFont', sans-serif",
        "color": "#ffffff",
        "letterSpacing": 8,
        "textShadow": "2px 2px 4px rgba(0,0,0,0.5)"
      }
    }
  ]
}
```

### Font Registration (script.json addition)
```json
{
  "fonts": [
    { "name": "MyCustomFont", "file": "fonts/my-custom-font.ttf" }
  ]
}
```

### Settings Overlay Config (script.json addition to `ui.settingsScreen`)
```json
{
  "ui": {
    "settingsScreen": {
      "background": "backgrounds/settings_bg.png",
      "overlay": {
        "transition": "slideRight",
        "backdropColor": "rgba(0,0,0,0.6)",
        "backdropBlur": true
      },
      "elements": []
    }
  }
}
```

---

## Competitive Landscape (v0.2 Features)

### Asset Management

| Engine/Maker | Asset Management | Our Approach |
|---|---|---|
| **Ren'Py** | Folder-based, `image` declarations in script, auto-detection by naming convention | **Visual library** with categories, thumbnails, expression grouping. No naming convention required |
| **TyranoBuilder** | Asset panel with categories, import dialog, character pose management | **Comparable**, but adding font management and auto-naming that TyranoBuilder lacks |
| **Visual Novel Maker (Degica)** | Resource manager with categories, naming conventions | **Similar model** but integrated character expression management (not just file listing) |
| **Naninovel (Unity)** | Unity asset system. Powerful but requires Unity knowledge | **Self-contained.** No external tool knowledge |

### Title Screen

| Engine/Maker | Title Screen | Our Approach |
|---|---|---|
| **Ren'Py** | `screen main_menu` in script. Code-based, extremely flexible | **Visual drag-drop designer.** Same result, zero code. 4 preset button types |
| **TyranoBuilder** | Visual title editor with button placement | **Direct competitor approach.** We add BGM picker and better property editing |
| **Kirikiri/KAG** | Full script-based title. Maximum effort | **Pre-built components.** Zero effort for logic |

### Settings Overlay

| Engine/Maker | Settings Display | Our Approach |
|---|---|---|
| **Ren'Py** | `screen preferences`. Default: navigates away. Can be overlaid with custom work | **Overlay by default.** Modern UX out of the box |
| **TyranoBuilder** | Settings as separate screen navigation | **Overlay mode.** Game scene visible behind. More immersive |
| **Commercial Galgames** (CLANNAD, Steins;Gate, etc.) | Almost always overlay/modal pattern. Settings slide in, game visible behind | **Matches commercial quality.** Slide-in animation, backdrop blur |

**Our edge for v0.2:** Unified asset management (competitors have fragmented views), visual title page designer (competitors require code), and overlay settings (competitors default to screen navigation). The combination delivers "commercial galgame quality" settings UX with zero code.

---

## Codebase Impact Analysis

### Files to Create
| File | Purpose |
|------|---------|
| `src/editor/views/AssetLibrary.vue` | Unified asset library (replaces `Assets.vue` + `Characters.vue`) |
| `src/editor/views/TitleDesigner.vue` | Complete rewrite (current is a stub) |
| `src/engine/titleDefs.js` | Title button registry + factory functions (mirrors `settingDefs.js`) |

### Files to Modify
| File | Change |
|------|--------|
| `src/editor/App.vue` | Replace 2 tabs (assets + characters) with 1 (asset library). Update `tabComponents` |
| `src/editor/stores/script.js` | Add `getTitleScreen()` + `updateTitleScreen()` methods |
| `src/ui/SettingsScreen.js` | Add overlay mode: backdrop, slide animation, click-outside |
| `src/ui/TitleScreen.js` | Add `exit` action handling. Load custom fonts |
| `src/main.js` | ESC key priority (settings overlay before game menu). BGM on title. Font loading |
| `electron/main.js` | New IPC: `delete-asset`, `rename-asset`, `select-asset-dialog`, `assets/fonts/` folder creation |
| `src/style.css` | Overlay animation CSS, backdrop blur styles |

### Files to Delete/Deprecate
| File | Reason |
|------|--------|
| `src/editor/views/Assets.vue` | Replaced by `AssetLibrary.vue` |
| `src/editor/views/Characters.vue` | Merged into `AssetLibrary.vue` |

### Shared Components (reuse without modification)
| Component | Used By |
|-----------|---------|
| `DraggableElement.vue` | TitleDesigner (same as SettingsDesigner) |
| `sanitize.js` | TitleDesigner + SettingsScreen overlay |

---

## Sources

- **Codebase audit:** Full analysis of `SettingsDesigner.vue` (800+ lines), `Assets.vue`, `Characters.vue`, `TitleDesigner.vue` (stub), `TitleScreen.js`, `SettingsScreen.js`, `settingDefs.js`, `main.js` (runtime), `App.vue`, `DraggableElement.vue`, `AssetPanel.vue`, `electron/main.js`, `script.js` store, `project.js` store — **HIGH confidence**
- **PROJECT.md v0.2 milestone:** Explicit feature requirements — **HIGH confidence**
- **VN engine domain knowledge:** Ren'Py screen language, TyranoBuilder UI, Kirikiri/KAG patterns, Naninovel Unity approach, commercial galgame UX conventions — **MEDIUM confidence** (training data, well-established domain conventions)
- **Web standards:** CSS transitions, `backdrop-filter`, `@font-face`, drag-and-drop API — **HIGH confidence**
