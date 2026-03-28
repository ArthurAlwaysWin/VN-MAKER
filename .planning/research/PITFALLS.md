# Domain Pitfalls

**Domain:** Canvas-based settings page designer for a visual novel engine
**Project:** Galgame Maker — Settings Page Designer milestone
**Researched:** 2025-07-15

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or architectural dead-ends.

### Pitfall 1: Editor–Runtime Schema Drift (Design Data ≠ Render Data)

**What goes wrong:** The editor stores settings layout in `script.data.ui.settingsScreen` (a JSON schema of positioned components), but the runtime `SettingsScreen.js` currently hardcodes its HTML via `innerHTML` in `_render()`. If these two representations diverge — different property names, different component type names, different coordinate semantics — the editor shows one thing and the runtime renders another. Users design a beautiful settings page and get a broken mess at runtime.

**Why it happens:** The editor (Vue 3) and runtime (vanilla JS DOM) are completely separate codebases with zero shared code. The `TitleScreen.js` already demonstrates this pattern: it has both `_renderDefault()` (hardcoded) and `_renderCustom()` (layout-driven). But the custom layout format was designed implicitly — there's no schema definition, just code that reads properties. When a second developer extends either side, property names silently drift.

**Consequences:**
- Users design layouts that render incorrectly at runtime
- Debugging requires comparing two unrelated codebases
- Every new setting component type must be updated in both editor and runtime — miss one and it silently breaks

**Prevention:**
1. Define a single source-of-truth JSON schema for settings layout *before* writing any code. Document every property, every component type, every valid value.
2. Put the schema definition in a shared location (e.g., `src/shared/settings-schema.js`) that both editor and runtime import.
3. Add a validation function that checks layout data against the schema — call it both when saving (editor) and when loading (runtime). Invalid data should produce a visible error, not silent failure.
4. Write the runtime renderer (`SettingsScreen._renderCustom()`) first, then build the editor to produce data that feeds it. This ensures the schema is dictated by what works at runtime, not by what's convenient in the editor.

**Detection:** Design a settings page in the editor → preview it → compare visually. Any mismatch is this pitfall materializing. Automate this with a snapshot comparison test if possible.

**Phase mapping:** Address in Phase 1 (schema design) before any implementation begins.

---

### Pitfall 2: Interactive Components on a Drag-and-Drop Canvas (Slider Eats Mouse Events)

**What goes wrong:** Settings components like sliders, toggles, and dropdowns are inherently interactive — they consume `mousedown`, `mousemove`, and `mouseup` events. The drag-and-drop canvas (`DraggableElement.vue`) uses those exact same events for positioning. When you put a slider inside a draggable wrapper, the user either drags the element or operates the slider — never both, and which one "wins" is unpredictable.

**Why it happens:** The existing `DraggableElement.vue` starts drag on any `mousedown.stop` within the element. It has no concept of "this child element should handle its own interactions." The current canvas elements (characters, dialogue boxes, choice menus) are all non-interactive display elements — they have `pointer-events: none` on their inner content. Sliders and toggles break this assumption.

**Consequences:**
- Users can't position slider components because dragging the slider handle moves the whole element
- Or the opposite: users can't drag the element because the slider consumes the mousedown
- Frustrated users, bug reports that seem contradictory ("it used to work" / "it never works")

**Prevention:**
1. **Editor mode: components are always non-interactive.** Render visual representations of sliders/toggles/dropdowns in the editor canvas, but make them pure CSS/SVG that don't respond to input. Use `pointer-events: none` on the component interior, same as existing canvas elements. Users position and style components; they never operate them on the editor canvas.
2. **Add a "preview mode" button** (like the existing ▶ 预览 button) that shows the settings page with live-interactive components. This is the only place sliders actually slide.
3. Do NOT try to support both drag-to-position and operate-the-control simultaneously with modifier keys or "edit/interact modes." This is the classic trap — it's complex to implement, fragile, and confuses users.

**Detection:** Try to drag a slider component on the canvas. If the slider thumb moves instead of the element — this pitfall has struck.

**Phase mapping:** Address during Phase 2 (canvas component implementation). Decision must be made upfront: editor components are always non-interactive visuals.

---

### Pitfall 3: Building a Second God-Component (Scenes.vue Clone)

**What goes wrong:** `Scenes.vue` is already 489 lines and flagged as the most complex/fragile component. The natural approach is to copy its structure for the settings designer — scene list becomes component list, timeline becomes component list, canvas preview stays, inspector stays. The result is another 400+ line SFC that's equally fragile, with duplicated canvas/drag logic that diverges over time.

**Why it happens:** The settings designer needs the same building blocks as the scene editor: a component palette, a canvas preview, drag-and-drop, a property inspector. Without discipline, the developer copies `Scenes.vue`, modifies it, and now there are two monoliths with subtly different versions of the same logic.

**Consequences:**
- Two 400-500 line components that drift apart
- Drag-and-drop bugs fixed in one place but not the other
- Canvas scaling, position calculation, and coordinate system logic duplicated
- Any future canvas-based editor (e.g., for dialogue box customization) repeats the pattern again

**Prevention:**
1. **Extract shared canvas infrastructure first.** Before building the settings designer:
   - `CanvasPreview.vue` is already extracted — good.
   - `DraggableElement.vue` is already extracted — good.
   - Extract the property inspector into a reusable `PropertyInspector.vue` that accepts a schema-driven config.
   - Extract the component palette/sidebar into a reusable component.
2. **Keep SettingsDesigner.vue under 200 lines.** It should compose extracted components, not duplicate their logic. The view-layer file orchestrates; logic lives in composables and child components.
3. **Create a `useSettingsDesigner.js` composable** (following the `useCanvasState.js` pattern) to hold all state logic: component list management, selection state, property updates. The `.vue` file should be mostly template.

**Detection:** If `SettingsDesigner.vue` exceeds 250 lines, stop and refactor. If you find yourself copying code from `Scenes.vue`, stop and extract.

**Phase mapping:** Address in Phase 2 (extraction) before building the settings designer view.

---

### Pitfall 4: ConfigManager Extension Without Migration

**What goes wrong:** The current `ConfigManager` has 4 keys: `bgmVolume`, `seVolume`, `textSpeed`, `autoSpeed`. The settings page designer needs to add: fullscreen toggle, skip-read-only toggle, dialogue box opacity, and potentially others. The `defaults` object gets new keys, but existing users' `localStorage` still has the old 4-key config. On first load after update, `Object.assign(this.config, JSON.parse(raw))` merges old data over new defaults — but the old data has no `fullscreen` or `dialogueOpacity` key. This works correctly (defaults fill gaps via `get()` which falls back to `this.defaults`). **The real pitfall is the reverse:** if a config key is *renamed* or its *value range changes* (e.g., `textSpeed` was `30ms per char` but the new slider uses `1-10 scale`), old persisted values silently produce wrong behavior.

**Why it happens:** `ConfigManager` has no version field and no migration logic. `SettingsScreen.js` already does a `_msToSpeed` / `_speedToMs` conversion hack to map between internal ms values and slider 1-10 values. If the new settings designer changes value semantics (e.g., storing the 1-10 value directly instead of ms), old saved configs break.

**Consequences:**
- Existing users' settings silently change meaning after update
- Volume slider shows wrong value because old data is 0-1 float but new code expects 0-100 integer (or vice versa)
- Hard-to-reproduce bugs: "works for me" (fresh install) vs "broken" (existing user with old config)

**Prevention:**
1. **Add a `configVersion` field** to the persisted config. On load, run migrations if the version is old.
2. **Never rename config keys.** Add new keys; deprecate old ones.
3. **Document value ranges** for every config key in the schema (min, max, step, unit). The editor's component definitions and the runtime's `ConfigManager.defaults` must agree on these.
4. **Keep the internal representation stable** (ms for speed, 0-1 for volume). Let the editor slider do display conversion, just as the current `SettingsScreen.js` does with `_msToSpeed`.

**Detection:** Save a config with the current version. Upgrade code. Load the saved config. If any slider shows the wrong value or a toggle has the wrong state, migration is broken.

**Phase mapping:** Address in Phase 1 (schema design) — define all new config keys, their ranges, and the defaults before implementation.

---

### Pitfall 5: Known Blocking Bugs Derail Development

**What goes wrong:** Two known bugs exist right now:
1. **File dialog doesn't open** — `dialog.showOpenDialog()` fails, likely because `win` is undefined in the IPC handler. This blocks creating new projects.
2. **vite-plugin-electron hot reload crash** — Windows-specific crash when `taskkill` can't find the Electron process during HMR. This makes development extremely frustrating.

If these aren't fixed first, the developer either can't test (no project creation) or wastes enormous time manually restarting after every code change.

**Why it happens:** These bugs were documented in the previous phase but deferred. Starting new feature work before fixing blocking infrastructure issues is a classic prioritization mistake.

**Consequences:**
- Can't create test projects → can't test the settings designer
- Hot reload crashes → 30-60 second restart penalty on every code change during canvas work (which requires high iteration speed)
- Developer works around the bugs with manual workarounds, introducing fragile habits

**Prevention:**
1. **Fix both bugs before any settings designer work begins.** They're in the Active requirements for this milestone.
2. For the file dialog: check `electron/main.js` IPC handlers — ensure `win` (the BrowserWindow reference) is available in the handler scope. Likely needs `BrowserWindow.getFocusedWindow()` or passing `win` from the creation scope.
3. For the hot reload: pin `vite-plugin-electron` to a known-stable version, or add a `try/catch` around the `taskkill` call in the plugin's restart logic.

**Detection:** Try to create a new project. If the folder picker doesn't open — Pitfall 5A is active. Change a `.vue` file and save. If Electron crashes — Pitfall 5B is active.

**Phase mapping:** Must be Phase 0 / pre-work. Block all other work on this.

---

## Moderate Pitfalls

Mistakes that cause significant rework or user confusion, but not full rewrites.

### Pitfall 6: innerHTML XSS in Runtime Settings Renderer

**What goes wrong:** The current `SettingsScreen._render()` builds HTML via template literals and sets `innerHTML`. This is the exact same XSS pattern already flagged in `BacklogScreen.js`, `SaveLoadScreen.js`, and `TitleScreen.js` (see CONCERNS.md). If the settings page designer allows user-authored text labels (e.g., custom label for the BGM slider), and the runtime renders those labels via `innerHTML`, XSS is possible.

**Why it happens:** The runtime UI classes all follow a `this.el.innerHTML = \`...\`` pattern. It's the established convention. The natural thing is to copy it.

**Prevention:**
1. When building the new `_renderCustom()` method in `SettingsScreen.js`, use `document.createElement()` + `textContent` for all user-provided strings (labels, descriptions). Never interpolate user data into innerHTML templates.
2. Apply `sanitizeCssValue()` from `sanitize.js` for all user-provided style values, just as `TitleScreen._createTextElement()` already does.
3. Add bounds for any new `clampField` fields needed by settings components (e.g., `sliderWidth`, `toggleSize`).

**Phase mapping:** Address during Phase 3 (runtime renderer implementation).

---

### Pitfall 7: Canvas Coordinate System Mismatch (Editor vs Runtime)

**What goes wrong:** The editor canvas uses CSS `transform: scale()` to fit the 1280×720 artboard into the available space. The `DraggableElement.vue` divides mouse deltas by `canvasScale` to convert screen pixels to artboard coordinates. The runtime renders at actual 1280×720 in `style.css` with hardcoded dimensions. If the settings designer stores coordinates at the artboard's scaled resolution, or if a different scaling method is used, components appear at wrong positions.

**Why it happens:** The hardcoded 1280×720 resolution issue is already documented in CONCERNS.md. The canvas scaling logic in `CanvasPreview.vue` (line 97: `Math.min(sw, sh, 1)`) caps at 1.0 scale — so on a 4K monitor with a large editor panel, the canvas might actually be 1:1 but offset differently. The coordinate space is implicitly "artboard pixels from top-left" but this isn't validated or documented.

**Consequences:**
- Component placed at (100, 200) in editor appears at (150, 300) at runtime due to different origin or scaling
- Boundary clamping in `sanitize.js` rejects valid positions because BOUNDS are based on 1280×720 but the component is positioned in a different space

**Prevention:**
1. **All positions stored in the JSON schema must be artboard coordinates** (0-1280 for X, 0-720 for Y). Document this.
2. Reuse the existing `DraggableElement.vue` coordinate system — it already handles scale conversion correctly.
3. In the runtime renderer, positions are applied as `element.style.left = x + 'px'` within a 1280×720 container — same as `TitleScreen._applyPosition()`. Copy that exact pattern.
4. Add settings-component-specific bounds to `sanitize.js` BOUNDS (e.g., `sliderWidth: [50, 600]`).

**Phase mapping:** Address during Phase 1 (schema) and Phase 2 (canvas implementation).

---

### Pitfall 8: Deep Watcher Amplification on script.data

**What goes wrong:** `App.vue` line 101 sets a `{ deep: true }` watcher on `script.data` that triggers both undo snapshots (JSON deep-clone, 500ms debounce) and auto-save (2000ms debounce). The settings layout lives inside `script.data.ui.settingsScreen`. Every drag movement on the canvas updates `x`/`y` coordinates → triggers deep watcher → triggers JSON.parse(JSON.stringify) clone of the *entire script* → triggers auto-save of the *entire project*.

During a drag operation, `mousemove` fires 60+ times per second. Even with the 500ms snapshot debounce and 2s save debounce, the deep watcher itself fires on every coordinate change, and Vue's reactivity system must traverse the entire `script.data` tree to detect what changed.

**Why it happens:** The existing canvas in `Scenes.vue` already has this problem (dragging characters), but it's less severe because scene editing is less drag-heavy. A settings page designer is *primarily* about positioning — users will drag constantly.

**Consequences:**
- Sluggish editor during drag operations, especially with large scripts
- High memory churn from repeated deep-clone attempts (even if debounced, Vue's watcher traversal is not debounced)
- Auto-save may fire mid-drag, saving an intermediate state

**Prevention:**
1. **Emit position updates only on `mouseup`** (drag end), not on every `mousemove`. During the drag, update a local ref for visual feedback but don't write to `script.data` until the drag completes. This is a one-line change in `DraggableElement.vue` — emit `move` only in the `onUp` handler instead of `onMove`.
2. Alternatively, add a `_skipWatch` flag (already exists in the script store!) that's set during drag operations to suppress the deep watcher.
3. Long-term: migrate to command-based undo (track what changed) instead of full-state snapshots. But this is out of scope for this milestone.

**Detection:** Open a large project. Drag a settings component continuously for 5 seconds. If the editor stutters or the CPU spikes — this pitfall is active.

**Phase mapping:** Address during Phase 2 (canvas implementation) — modify drag behavior to emit on mouseup only.

---

### Pitfall 9: Prebuilt Components Without Extensibility Escape Hatch

**What goes wrong:** The project's core philosophy is "developers don't touch logic — engine handles everything." For settings components, this means the engine has prebuilt slider, toggle, and dropdown components with fixed behavior. But what happens when a game needs a setting the engine doesn't support? (e.g., "screen shake intensity", "voice volume" for a future voice feature, "language selection"). If the component system is completely closed, users hit a wall with no workaround.

**Why it happens:** The philosophy is correct for the MVP — prebuilt components are the right approach. The pitfall is in making the architecture *impossible* to extend later, not in failing to extend it now.

**Consequences (future):**
- Users request custom settings; the engine can't accommodate them
- Adding a new setting type requires modifying engine code, editor code, and the schema in lockstep — a risky change
- The settings system becomes the bottleneck for new engine features (every new engine feature that needs a user-facing setting requires a settings component update)

**Prevention:**
1. **Design the component type system as a registry, not a switch statement.** Instead of:
   ```js
   if (comp.type === 'slider') { ... }
   else if (comp.type === 'toggle') { ... }
   ```
   Use:
   ```js
   const COMPONENT_RENDERERS = { slider: renderSlider, toggle: renderToggle };
   const renderer = COMPONENT_RENDERERS[comp.type];
   if (renderer) renderer(comp, container, configManager);
   ```
   This doesn't add complexity now, but makes future extension trivial.
2. **Include a `configKey` property on each component** that maps to a `ConfigManager` key. New config keys can be added to `defaults` without changing the renderer.
3. Do NOT build a plugin system or custom component API now. Just don't paint yourself into a corner with hardcoded switch statements.

**Phase mapping:** Address during Phase 1 (schema design) — define the component type → configKey → renderer mapping as part of the schema.

---

### Pitfall 10: No Default Layout Fallback for Existing Projects

**What goes wrong:** Existing projects have no `ui.settingsScreen` data in their `script.json`. The runtime `SettingsScreen._render()` currently works fine because it's entirely hardcoded. After this milestone, if the runtime is changed to prefer custom layouts, existing projects that haven't been opened in the editor to get a default layout will break — the settings screen either shows nothing or crashes.

**Why it happens:** Same problem as `TitleScreen.js`, which correctly handles this with the `if (this.layout && this.layout.elements)` → `_renderCustom()` / else → `_renderDefault()` pattern. But it's easy to forget this fallback when building the settings version.

**Consequences:**
- Every existing saved game's settings screen breaks on engine update
- Users who haven't re-opened their project in the updated editor get a blank settings page

**Prevention:**
1. **Keep `SettingsScreen._renderDefault()`** — the current hardcoded render — as the fallback. Never remove it.
2. Add a `_renderCustom()` method that only activates when `this.layout` is set (same pattern as `TitleScreen.js`).
3. In the editor, when a project is loaded that has no `ui.settingsScreen`, auto-generate a default layout matching the current hardcoded design. This way, opening an old project in the new editor gives users an editable starting point.
4. **Test with a project that has no `ui.settingsScreen` field.** This is the most common case at launch.

**Detection:** Load any project created before this milestone. Open the settings page tab. If it crashes or shows blank — this pitfall is active.

**Phase mapping:** Address in Phase 3 (runtime integration) — implement the dual-render pattern.

---

## Minor Pitfalls

Mistakes that cause annoyance or minor rework.

### Pitfall 11: Component Z-Index Conflicts in Runtime

**What goes wrong:** The runtime stacks multiple overlay screens (`SettingsScreen`, `SaveLoadScreen`, `BacklogScreen`, `GameMenu`, `TitleScreen`) using CSS z-index. The settings screen might open from the game menu (z-index on `GameMenu` is via `uiOverlay`), but `SettingsScreen` is appended to `gameContainer` directly. If the settings page has custom-positioned components with explicit z-index values set by the designer, they can conflict with other runtime overlays.

**Prevention:** The settings screen should use a single container with a known z-index. Components within it should use relative z-indexing (stacking context isolation via `position: relative` on the settings container). Don't expose z-index as an editable property to the designer.

**Phase mapping:** Phase 3 (runtime renderer).

---

### Pitfall 12: Forgetting asset:// Protocol for Custom Background Images

**What goes wrong:** If the settings page designer allows a custom background image (like `TitleScreen` does), the editor needs to reference it via the `asset://` protocol for preview. The runtime loads from `/game/` relative paths. If the editor stores the path one way and the runtime expects another, images work in editor but not at runtime (or vice versa).

**Prevention:** Follow the exact pattern from `TitleScreen.js` line 72: the layout stores a relative path (e.g., `backgrounds/settings-bg.png`), the runtime prepends `/game/`, and the editor uses `asset://`. Don't store full paths or protocol-prefixed paths in the JSON schema.

**Phase mapping:** Phase 2 (editor canvas) and Phase 3 (runtime).

---

### Pitfall 13: Missing Undo Integration for Settings Layout Changes

**What goes wrong:** The existing undo system works by snapshotting `script.data` on changes. If settings layout changes don't go through `script.data` (e.g., stored in a separate ref or local state), undo/redo won't capture them. Users expect Ctrl+Z to undo a component position change.

**Prevention:** Store all settings layout data inside `script.data.ui.settingsScreen`. Don't use a separate store or local state for layout data. The existing undo system will automatically capture changes (since it deep-watches `script.data`).

**Phase mapping:** Phase 2 (data architecture).

---

### Pitfall 14: Slider Value Display Mismatch (Editor Preview vs Runtime)

**What goes wrong:** The editor shows a visual representation of a slider at its default position (e.g., BGM volume at 50%). The runtime shows the slider at the *user's actual saved config value* (which might be 80%). The designer sees one thing; the player sees another. This isn't a bug, but it confuses game developers who expect the designed layout to look the same at runtime.

**Prevention:** In the editor canvas, render sliders at their **default** ConfigManager value (which is what a first-time player sees). Document this behavior clearly in the editor UI — "组件在编辑器中显示默认值。玩家的实际设置将由引擎管理。" (Components show default values in editor. Player's actual settings are managed by the engine.)

**Phase mapping:** Phase 2 (editor canvas) — add a tooltip or hint text.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| **Phase 0: Bug fixes** | Pitfall 5 — Blocking bugs prevent all dev/test work | Fix file dialog + hot reload first. Gate all other work on this. |
| **Phase 1: Schema design** | Pitfall 1 — Editor/runtime schema drift | Define shared JSON schema with validation before writing implementation code |
| **Phase 1: Schema design** | Pitfall 4 — ConfigManager extension | Define all new config keys, value ranges, and defaults. Add configVersion. |
| **Phase 1: Schema design** | Pitfall 9 — Non-extensible component system | Use registry pattern for component types. Include configKey mapping. |
| **Phase 2: Editor canvas** | Pitfall 2 — Interactive components eat mouse events | Components are non-interactive visuals in editor. No exceptions. |
| **Phase 2: Editor canvas** | Pitfall 3 — God-component clone | Extract shared components first. Keep SettingsDesigner.vue < 200 lines. |
| **Phase 2: Editor canvas** | Pitfall 7 — Coordinate mismatch | All positions in artboard coordinates. Reuse DraggableElement.vue. |
| **Phase 2: Editor canvas** | Pitfall 8 — Deep watcher perf | Emit position updates on mouseup, not mousemove. Use _skipWatch during drag. |
| **Phase 2: Editor canvas** | Pitfall 13 — Missing undo | Store layout in script.data.ui.settingsScreen, not a separate store. |
| **Phase 3: Runtime renderer** | Pitfall 6 — innerHTML XSS | Use createElement + textContent. Apply sanitizeCssValue for styles. |
| **Phase 3: Runtime renderer** | Pitfall 10 — No fallback for old projects | Keep _renderDefault(). Add _renderCustom() gated on this.layout. |
| **Phase 3: Runtime renderer** | Pitfall 11 — Z-index conflicts | Isolate stacking context. Don't expose z-index to designer. |
| **Phase 3: Runtime renderer** | Pitfall 12 — Asset protocol paths | Store relative paths. Runtime prepends /game/. Editor uses asset://. |

---

## Sources

- **Codebase analysis** (HIGH confidence): Direct inspection of all source files referenced above
  - `src/ui/SettingsScreen.js` — current hardcoded settings renderer
  - `src/engine/ConfigManager.js` — current config storage (4 keys, localStorage, no versioning)
  - `src/ui/TitleScreen.js` — reference for custom layout rendering pattern
  - `src/editor/components/canvas/DraggableElement.vue` — drag-and-drop event handling
  - `src/editor/components/canvas/CanvasPreview.vue` — canvas scaling and coordinate system
  - `src/editor/composables/useCanvasState.js` — canvas state computation pattern
  - `src/editor/views/Scenes.vue` — most complex component (489 lines), pattern to avoid repeating
  - `src/editor/App.vue` — deep watcher + auto-save on script.data
  - `src/editor/stores/script.js` — undo/redo system with JSON deep-clone
  - `src/ui/sanitize.js` — CSS injection prevention and bounds clamping
  - `src/main.js` — runtime wiring, settings screen initialization
- **CONCERNS.md** (HIGH confidence): Known bugs, XSS issues, performance bottlenecks, hardcoded resolution
- **CONVENTIONS.md** (HIGH confidence): Code patterns, module design, error handling conventions
- **PROJECT.md** (HIGH confidence): Requirements, constraints, known issues, key decisions

---

*Pitfalls audit: 2025-07-15*
