---
phase: 36-tooltip
plan: 01
subsystem: ui
tags: [tooltip, help-system, vue-component, teleport, i18n]
requires:
  - phase: 35-localization
    provides: Chinese labels and translated UI text
provides:
  - HelpTip.vue reusable tooltip component with Teleport + fixed positioning
  - helpTexts.js centralized help text mapping (6 editor areas)
  - Tooltip integration in theme editor, export modal, project settings
affects: [36-02-tooltip, editor-ux]
tech-stack:
  added: []
  patterns: [HelpTip ? icon + hover bubble, centralized help text mapping by area]
key-files:
  created:
    - src/editor/components/HelpTip.vue
    - src/editor/helpTexts.js
  modified:
    - src/editor/components/theme/TokenAccordion.vue
    - src/editor/components/theme/TokenGroup.vue
    - src/editor/components/theme/PaletteModal.vue
    - src/editor/components/theme/NineSliceModal.vue
    - src/editor/components/theme/PresetModal.vue
    - src/editor/components/ExportModal.vue
    - src/editor/views/ProjectSettings.vue
    - src/editor/components/DialogueBoxSettings.vue
key-decisions:
  - "HelpTip uses Teleport to body + position:fixed to avoid overflow:hidden clipping in scrollable panels"
  - "helpTexts.js uses named exports per area (6 constants) for tree-shakeable imports"
  - "Non-scoped CSS for HelpTip since Teleport renders outside component tree"
patterns-established:
  - "HelpTip integration: import HelpTip + HELP_X, place <HelpTip :text='HELP_X.key' /> next to labels/headers"
  - "Button titles: icon-only and action buttons get Chinese title attributes; text-labeled buttons skip per D-15"
requirements-completed: [HELP-01, HELP-03, HELP-04, HELP-05]
duration: 6min
completed: 2026-04-11
---

# Phase 36 Plan 01: HelpTip Infrastructure + Theme/Export/Settings Integration Summary

**HelpTip.vue tooltip component with Teleport positioning + helpTexts.js centralized mapping, integrated into theme editor (9 instances), export modal (6 instances), and project settings (3 instances)**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-11T12:41:24Z
- **Completed:** 2026-04-11T12:47:47Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Created HelpTip.vue — 16px circular ? icon (#007acc), dark semi-transparent bubble (rgba(30,30,30,0.95)), 150ms fade transition, viewport edge detection with flip-to-left, Teleport to body for overflow safety
- Created helpTexts.js — 6 named exports covering all editor areas (HELP_THEME 9 keys, HELP_EXPORT 6 keys, HELP_SETTINGS 4 keys, HELP_SCRIPT 5 keys, HELP_RESOURCE 5 keys, HELP_DESIGNER 6 keys)
- Theme editor: HelpTip on 3 modal headers (palette, nine-slice, preset) + 6 token group headers (core, backgrounds, buttons, controls, blur, speaker)
- Export modal: HelpTip on 6 config fields + button titles on format toggle, picker buttons, warnings toggle, open folder, retry
- Project settings: HelpTip on resolution and project name + export button title
- DialogueBoxSettings: HelpTip on font section header

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HelpTip.vue component and helpTexts.js centralized mapping** - `db46f68` (feat)
2. **Task 2: Integrate HelpTip into theme editor area + add missing button titles** - `a1885bc` (feat)
3. **Task 3: Integrate HelpTip into export modal and project settings + add missing button titles** - `26831ee` (feat)

## Files Created/Modified

- `src/editor/components/HelpTip.vue` - Reusable ? icon tooltip with Teleport + fixed positioning
- `src/editor/helpTexts.js` - Centralized help text mapping for 6 editor areas
- `src/editor/components/theme/TokenGroup.vue` - Added helpText prop + HelpTip rendering
- `src/editor/components/theme/TokenAccordion.vue` - Pass HELP_THEME to 6 token groups
- `src/editor/components/theme/PaletteModal.vue` - HelpTip on palette generator header
- `src/editor/components/theme/NineSliceModal.vue` - HelpTip on nine-slice header + clear button titles
- `src/editor/components/theme/PresetModal.vue` - HelpTip on preset modal header
- `src/editor/components/ExportModal.vue` - 6 HelpTip instances + button titles
- `src/editor/views/ProjectSettings.vue` - HelpTip on resolution + project name + export button title
- `src/editor/components/DialogueBoxSettings.vue` - HelpTip on font section header

## Decisions Made

- HelpTip uses Teleport to body + position:fixed to avoid overflow:hidden clipping in scrollable panels
- helpTexts.js uses named exports per area (6 constants) for tree-shakeable imports
- Non-scoped CSS for HelpTip since Teleport renders outside component tree
- Text-labeled buttons skip title attribute per D-15 (label already describes purpose)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Known Stubs

None — all help texts are fully populated, all HelpTip instances are wired to real data.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HelpTip component and helpTexts.js are ready for Plan 02 integration (script editor, resource library, designers)
- HELP_SCRIPT, HELP_RESOURCE, and HELP_DESIGNER texts are already defined in helpTexts.js awaiting usage
- `npm run build` passes cleanly with all new components

---
*Phase: 36-tooltip*
*Completed: 2026-04-11*

## Self-Check: PASSED

- All 3 key files exist (HelpTip.vue, helpTexts.js, 36-01-SUMMARY.md)
- All 3 commit hashes verified (db46f68, a1885bc, 26831ee)
- `npm run build` passes cleanly (143 modules, 0 errors)
