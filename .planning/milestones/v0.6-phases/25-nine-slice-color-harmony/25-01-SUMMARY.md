---
phase: 25-nine-slice-color-harmony
plan: 01
subsystem: engine
tags: [css, nine-slice, border-image, pseudo-element, theme]

requires:
  - phase: 24-thememanager-engine
    provides: ThemeManager.js with applyTheme/resetTheme, main.js integration points
provides:
  - applyNineSlice/resetNineSlice functions in ThemeManager.js
  - buildNineSliceCSS generator for 6 UI element types
  - Button 3-state via CSS pseudo-classes (:hover/:active)
  - main.js wiring at 3 integration points
affects: [26-visual-theme-editor, 27-theme-presets-export-import]

tech-stack:
  added: []
  patterns: [style-tag-injection, pseudo-element-border-image, css-pseudo-class-states]

key-files:
  created: []
  modified:
    - src/engine/ThemeManager.js
    - src/main.js

key-decisions:
  - "::before pseudo-element with border-image for 9-slice, parent overflow:hidden preserves border-radius"
  - "Dedicated <style id='galgame-nine-slice'> tag with textContent overwrite"
  - "isolation:isolate on parents for z-index stacking context"
  - "backdrop-filter:none on elements with existing blur when 9-slice active"

patterns-established:
  - "Style tag injection: create/reuse <style> by id, overwrite textContent"
  - "Parent setup pattern: overflow:hidden + isolation:isolate + conditional position:relative"
  - "3-state buttons: base ::before + :hover::before + :active::before (CSS only)"

requirements-completed: [9SL-01, 9SL-02, 9SL-03, 9SL-04]

duration: 5min
completed: 2026-04-06
---

# Phase 25 Plan 01: 9-Slice CSS Rendering System

**Extended ThemeManager with applyNineSlice/resetNineSlice — generates ::before pseudo-element CSS rules with border-image for 6 UI elements, with button 3-state via CSS pseudo-classes**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- ThemeManager.js extended with 9-slice system (applyNineSlice, resetNineSlice, buildNineSliceCSS)
- 6 UI target elements with proper parent setup (position, overflow, isolation, backdrop-filter)
- Button 3-state (:hover::before, :active::before) for choiceButton and titleButton
- main.js wired at init(), initPreview(), and update-theme handler

## Task Commits

1. **Task 1: Extend ThemeManager.js** - `db3cb84` (feat)
2. **Task 2: Wire applyNineSlice into main.js** - `56f547e` (feat)

## Files Created/Modified
- `src/engine/ThemeManager.js` — Added NINE_SLICE_SELECTORS, BUTTON_KEYS, NEEDS_POSITION, HAS_BACKDROP constants; buildNineSliceCSS generator; applyNineSlice/resetNineSlice exports
- `src/main.js` — Updated import to include applyNineSlice; added 3 call sites after applyTheme

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 9-slice rendering system ready for Phase 26 editor integration
- ThemeManager now exports 4 functions: applyTheme, resetTheme, applyNineSlice, resetNineSlice

---
*Phase: 25-nine-slice-color-harmony*
*Completed: 2026-04-06*
