# Phase 12: Resource Pickers - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can visually select characters, expressions, backgrounds, and audio from the resource library within the page editor. This replaces the placeholder alerts currently in PageInspector with functional visual pickers.

This phase delivers:
- Enhanced character picker with expression thumbnail grid
- Background picker via AssetPickerModal (image thumbnail grid)
- Audio picker (BGM/SE) with tab switching and MiniPlayer inline preview
- Integration into PageInspector's existing readonly input fields

This phase does NOT include:
- Importing new assets (already in Phase 7)
- Transition effects or branching (Phase 13)
- New asset types or formats

</domain>

<decisions>
## Implementation Decisions

### Background Picker
- **D-01:** Reuse existing `AssetPickerModal.vue` — modal popup with thumbnail grid (120px thumbnails), selecting a background applies it to the current page's `background` field
- **D-02:** Trigger by clicking the readonly "背景" input in PageInspector — entire row is clickable

### Character Expression Picker
- **D-03:** Replace the current `<select>` dropdown in CharacterPicker with a thumbnail grid of expression images — each expression shows its actual sprite image via `asset://characters/{filename}`
- **D-04:** Expression grid layout: auto-fill grid with ~80px thumbnails, expression name below each image

### Audio Picker (BGM/SE)
- **D-05:** Single audio picker modal with BGM/SE tab switching — reuse AssetPickerModal pattern but with audio-specific UI
- **D-06:** Each audio item shows filename + inline MiniPlayer (reuse existing MiniPlayer.vue for play preview)
- **D-07:** Selecting an audio file applies it to the current page's `bgm` or `se` field depending on which tab is active / which field triggered the picker

### Picker Trigger
- **D-08:** All pickers triggered by clicking the readonly input row in PageInspector — consistent with current UX pattern (click input → open picker)

### Agent's Discretion
- Thumbnail sizes and grid spacing details
- Empty state messages for each picker (no backgrounds imported, etc.)
- "Clear" button to remove current background/BGM/SE selection
- Audio picker tab visual styling
- Expression grid animation/hover effects

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Picker Infrastructure
- `src/editor/components/resource-library/AssetPickerModal.vue` — Reusable modal with thumbnail grid for images + audio row list. Already supports `asset://` image loading.
- `src/editor/components/resource-library/MiniPlayer.vue` — Singleton audio player with play/pause, seek, progress bar. Props: `src`, `active`. Emits: `play`, `stop`.
- `src/editor/components/resource-library/AssetGrid.vue` — Thumbnail grid with 140px cards, `asset://` protocol images, inline rename.

### Current Pickers to Enhance
- `src/editor/components/page-editor/CharacterPicker.vue` — Current implementation: text list + select dropdown. Needs expression thumbnail grid.
- `src/editor/components/page-editor/PageInspector.vue` — Has placeholder `alertPicker()` calls on background/BGM/SE readonly inputs. Replace with actual picker triggers.

### Data Layer
- `src/editor/stores/assets.js` — Pinia store exposing `files.backgrounds[]`, `files.audio[]`, `files.characters[]`. Has `loadCategory()`, `loadAll()` actions.
- `src/editor/stores/script.js` — `script.data.characters` for character data (name, color, expressions map). `currentPage` via usePageEditor composable.

### Asset Protocol
- `electron/main.js` (lines 614-674) — `asset://` protocol handler with Range support for audio streaming. Usage: `asset://backgrounds/filename.png`, `asset://characters/filename.png`, `asset://audio/filename.wav`

### Composable
- `src/editor/composables/usePageEditor.js` — Shared editor state via provide/inject. `currentPage`, `showCharPicker`, `selectPage`, etc.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AssetPickerModal.vue**: Modal overlay with image thumbnail grid and audio row list — reuse directly for background picker
- **MiniPlayer.vue**: Audio preview player with singleton playback — embed in audio picker rows
- **AssetGrid.vue**: Thumbnail grid pattern (auto-fill, 140px) — reference for expression grid sizing
- **CharacterPicker.vue**: Already has select-then-confirm flow — extend with expression thumbnails

### Established Patterns
- **Asset loading**: `useAssetsStore().loadCategory('backgrounds')` loads file list; images rendered via `asset://backgrounds/${file}`
- **Modal overlay**: `.picker-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5) }` pattern in CharacterPicker
- **Singleton audio**: MiniPlayer deactivates previous player when new one starts (active prop)

### Integration Points
- **PageInspector.vue**: Replace `alertPicker()` calls with actual picker show/hide logic
- **usePageEditor.js**: May need new refs for `showBgPicker`, `showAudioPicker` (or a generic `activePicker` ref)
- **script.js**: Page data already has `background`, `bgm { file, volume }`, `se { file, volume }` fields — pickers write to these

</code_context>

<specifics>
## Specific Ideas

- Background picker should feel instant — reuse AssetPickerModal directly with backgrounds category
- Expression thumbnails should show the actual character sprite so users know what they're picking
- Audio picker needs clear BGM vs SE distinction via tabs
- All pickers close on selection + confirm (consistent with current CharacterPicker UX)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-resource-pickers*
*Context gathered: 2026-04-01*
