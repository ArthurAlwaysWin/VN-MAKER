---
phase: 27-theme-presets-export-import
plan: 01
subsystem: ui
tags: [theme, presets, color-harmony, vue, design-tokens]

# Dependency graph
requires:
  - phase: 23-token-foundation
    provides: DEFAULT_TOKENS 41-key vocabulary, CSS custom properties
  - phase: 25-nine-slice-color-harmony
    provides: colorHarmony.js generatePalette, contrast.js autoFix
  - phase: 26-visual-theme-editor
    provides: useThemeEditor composable, ThemeDesigner, PaletteModal pattern
provides:
  - 4 built-in theme presets (Modern, 和風, Fantasy, Minimal) with full 41-token vocabularies
  - PresetModal.vue — preview-then-apply modal UI
  - previewPreset/applyPreset/cancelPreview composable methods
  - Dev-time generatePresets.js regeneration script
affects: [27-02-export-import]

# Tech tracking
tech-stack:
  added: []
  patterns: [preset-preview-without-store-write, immediate-postMessage-preview]

key-files:
  created:
    - src/engine/presets.js
    - tools/generatePresets.js
    - src/editor/components/theme/PresetModal.vue
  modified:
    - src/editor/composables/useThemeEditor.js
    - src/editor/components/theme/ThemeToolbar.vue
    - src/editor/views/ThemeDesigner.vue

key-decisions:
  - "Preset preview bypasses debounce — immediate postMessage for instant iframe response"
  - "applyPreset replaces full tokens object (not merge) for clean preset application"
  - "cancelPreview restores store state via flushPreview — no temporary snapshot needed"

patterns-established:
  - "Preview-without-store: send theme to iframe directly without writing to Pinia store"
  - "Preset data as static module: zero runtime overhead, dev-time generation script for regeneration"

requirements-completed: [PRE-01, PRE-02]

# Metrics
duration: 7min
completed: 2026-04-07
---

# Phase 27 Plan 01: Theme Presets Summary

**4 built-in theme presets (Modern, 和風, Fantasy, Minimal) with preview-then-apply modal, colorHarmony-generated 41-token palettes, and WCAG contrast-checked readability**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-07T00:20:03Z
- **Completed:** 2026-04-07T00:26:49Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- 4 professional presets with complete 41-token vocabularies, proper rgba/gradient/font formats
- PresetModal with 2×2 card grid, 6-swatch color preview per preset
- Preview-then-apply flow: clicking card previews in iframe instantly without store write
- Cancel/close restores iframe to actual store state; 应用 commits with undo support
- Dev-time generation script using colorHarmony + contrast engine modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Create preset token data and dev generation script** - `3875e50` (feat)
2. **Task 2: Create PresetModal and wire into toolbar + ThemeDesigner** - `6f95bdf` (feat)

## Files Created/Modified
- `src/engine/presets.js` - Static THEME_PRESETS array with 4 preset objects (41 tokens each)
- `tools/generatePresets.js` - Dev-time Node.js ESM script for regenerating preset values
- `src/editor/components/theme/PresetModal.vue` - Modal with 2×2 card grid, preview-then-apply flow
- `src/editor/composables/useThemeEditor.js` - Added showPreset ref, previewPreset/applyPreset/cancelPreview methods
- `src/editor/components/theme/ThemeToolbar.vue` - Added 📦 预设 button with open-preset emit
- `src/editor/views/ThemeDesigner.vue` - Wired PresetModal conditional render + toolbar handler

## Decisions Made
- Preset preview bypasses the 200ms debounce — sends immediate postMessage for instant iframe response on card click
- applyPreset replaces the full tokens object (not merge with existing) for a clean preset starting point
- cancelPreview restores store state via existing flushPreview() — no temporary snapshot needed
- Danger tokens (#ff6b6b) hardcoded as universal UX convention across all presets

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all presets contain complete 41-token data, modal is fully wired.

## Next Phase Readiness
- Preset system complete, ready for Phase 27 Plan 02 (theme export/import)
- PresetModal can be extended with export/import buttons per D-03

---
*Phase: 27-theme-presets-export-import*
*Completed: 2026-04-07*
