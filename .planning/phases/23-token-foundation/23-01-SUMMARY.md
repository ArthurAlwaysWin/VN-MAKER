---
phase: 23-token-foundation
plan: 01
subsystem: engine
tags: [css-custom-properties, design-tokens, theme-system, visual-regression-zero]

# Dependency graph
requires:
  - phase: 22-fast-forward
    provides: Complete v0.5 UI with all hardcoded visual values in style.css
provides:
  - DEFAULT_TOKENS constant with 41-token vocabulary covering colors, text, borders, backgrounds, buttons, fonts, radii, blur, controls
  - style.css fully migrated to var(--gm-*, fallback) pattern with 142 usages
  - Unified --gm-panel-bg token for all 5 panel/overlay backgrounds (TKN-04)
  - Unified --gm-btn-* token group for all button types (TKN-05)
  - Font-family tokens --gm-font-body and --gm-font-display (TKN-02)
  - Radius tokens --gm-radius and --gm-radius-lg (TKN-03)
  - CSS-level save/load title color rules for Plan 02 JS migration
  - CSS-level backlog-speaker and dialogue-speaker-name color for Plan 02
affects: [23-02, 24-theme-manager, 25-nine-slice, 26-theme-editor, 27-theme-presets]

# Tech tracking
tech-stack:
  added: []
  patterns: [var(--gm-*, fallback) CSS custom property pattern, nested var() for P19 cascade, complete gradient values in var() fallback per P17]

key-files:
  created:
    - src/engine/tokens.js
  modified:
    - src/style.css

key-decisions:
  - "41 tokens with --gm- prefix to avoid collision with existing --track-color/--thumb-color/--toggle-active (P19)"
  - "All fallback values match v0.5 exactly for zero visual regression (TKN-06/D-03)"
  - "Gradient backgrounds stored as complete CSS gradient strings in var() fallback (P17)"
  - "Added CSS color rules for save-load-title and backlog-speaker to prepare for Plan 02 JS inline removal"
  - "Nested var() cascade: per-element JS override → theme token → hardcoded default (P19)"

patterns-established:
  - "var(--gm-{token}, {v0.5-value}) pattern for all game UI visual properties"
  - "Unified token groups: --gm-panel-bg for all panels, --gm-btn-* for all buttons"
  - "Token vocabulary in DEFAULT_TOKENS with unprefixed keys, CSS consumes with --gm- prefix"

requirements-completed: [TKN-01, TKN-02, TKN-03, TKN-04, TKN-05, TKN-06]

# Metrics
duration: 7min
completed: 2026-04-06
---

# Phase 23 Plan 01: Token Foundation Summary

**41-token design vocabulary (DEFAULT_TOKENS) + full style.css migration to var(--gm-*, fallback) with 142 usages, zero visual regression**

## Performance

- **Duration:** 7.4 min
- **Started:** 2026-04-06T01:56:48Z
- **Completed:** 2026-04-06T02:04:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created src/engine/tokens.js with 41-token DEFAULT_TOKENS covering: 10 core colors, 6 text levels, 3 border states, 7 backgrounds, 6 button properties, 2 fonts, 2 radii, 1 blur, 3 controls, 1 speaker shadow
- Migrated all hardcoded visual values in style.css to var(--gm-*, fallback) — 142 usages total
- Unified 5 panel backgrounds under --gm-panel-bg token (save-load, settings, backlog, game-menu, choice-menu)
- Unified all button types under --gm-btn-* group (game-menu, choice, title, close buttons, page tabs)
- Added CSS color rules for save-load-title (save/load mode) and backlog-speaker to prepare for Plan 02's JS inline style removal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create token vocabulary (src/engine/tokens.js)** - `8fcc27b` (feat)
2. **Task 2: Migrate style.css to consume design tokens via var(--gm-*, fallback)** - `9f8047a` (feat)

## Files Created/Modified
- `src/engine/tokens.js` - Canonical 41-token vocabulary for the theme system (DEFAULT_TOKENS constant)
- `src/style.css` - All hardcoded visual values migrated to var(--gm-*, fallback) pattern

## Decisions Made
- 41 tokens with --gm- prefix namespace to avoid collision with existing custom properties (P19)
- All fallback values exactly match v0.5 values for guaranteed zero visual regression (TKN-06/D-03)
- Gradient backgrounds (dialogue-bg, title-bg) stored as complete CSS gradient strings per P17
- Added color CSS rules for .save-load-title and .backlog-speaker to prepare Plan 02 JS migration
- Nested var() cascade for settings custom layout: per-element JS → theme token → hardcoded default

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Token vocabulary established and CSS fully migrated — ready for Plan 02 (JS inline style migration)
- Plan 02 can now remove JS inline styles that set colors, replacing with token-aware patterns
- Phase 24 ThemeManager can iterate DEFAULT_TOKENS keys and setProperty on #game-container

---
*Phase: 23-token-foundation*
*Completed: 2026-04-06*
