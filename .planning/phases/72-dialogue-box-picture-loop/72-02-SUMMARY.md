---
phase: 72-dialogue-box-picture-loop
plan: 02
subsystem: dialogue-box
tags: [dialogue-box, runtime, underlay, theme-manager, css-layering, vitest]
requires:
  - phase: 72-01
    provides: dialogue-box image schema and collector baseline
provides:
  - runtime dialogue underlay nodes for nameplate and decoration art
  - preview-safe completed-line rendering on DialogueBox
  - overflow-safe dialogue nine-slice rule for floating nameplates
affects: [Phase 72, iframe preview, dialogue runtime layering]
tech-stack:
  added: []
  patterns:
    - dialogue art renders through dedicated DOM nodes under #dialogue-box instead of root background inline styles
    - dialogueBox nine-slice keeps overflow visible while other nine-slice owners remain clipped
key-files:
  created:
    - tests/dialogueBoxUiSkin.test.js
  modified:
    - src/ui/DialogueBox.js
    - src/engine/ThemeManager.js
    - src/style.css
    - tests/themeManagerUiImage.test.js
key-decisions:
  - "DialogueBox accepts only canonical or runtime-resolvable art paths for nameplate/decor nodes; legacy strings clear back to CSS fallback."
  - "Floating nameplates stay visible by making only the dialogueBox nine-slice owner overflow-visible instead of weakening the whole nine-slice system."
patterns-established:
  - "Any future dialogue runtime art should join the dedicated underlay stack and keep foreground controls above it via explicit z-index rules."
requirements-completed: [DLG-01, DLG-02]
completed: 2026-04-22
---

# Phase 72 Plan 02: Dialogue Runtime Underlay Summary

**Phase 72 now renders dialogue-specific art through a safe runtime underlay, while keeping text, indicator, and quick actions above the artwork and preserving floating nameplates under nine-slice themes**

## Accomplishments

- Refactored `DialogueBox` DOM to include `.dialogue-visual-underlay`, `.dialogue-nameplate-art`, and deterministic decoration nodes addressed by `data-dialogue-decoration-index`.
- Added runtime art application logic so `applyGlobalStyle()` consumes `nameplateBackgroundImage` and `decorations[]`, resolves valid runtime paths, and clears invalid legacy values back to CSS fallback.
- Added public `renderPreviewLine()` so preview mode can render a fully completed dialogue line without calling private typewriter internals.
- Updated dialogue CSS layering so underlay art stays below the nameplate, text area, indicator, and quick action bar, with decoration-related nodes locked to `pointer-events: none`.
- Changed `ThemeManager` nine-slice generation so `#dialogue-box` keeps `overflow: visible`, preventing floating nameplate clipping while preserving the rest of the nine-slice isolation model.

## Task Commits

Execution completed with two plan commits:

1. **Plan 72-02 implementation and focused coverage** - `26afa8c` (`feat`)
2. **Plan 72-02 summary** - `pending` (`docs`)

## Files Created/Modified

- `src/ui/DialogueBox.js` - adds dedicated underlay DOM, dialogue art rendering, and `renderPreviewLine()`.
- `src/engine/ThemeManager.js` - makes the dialogue nine-slice owner overflow-safe for floating nameplates.
- `src/style.css` - adds dialogue underlay, z-index, and pointer-event rules while keeping the existing root background as fallback.
- `tests/dialogueBoxUiSkin.test.js` - locks underlay node creation, preview-safe rendering, and layering selector presence.
- `tests/themeManagerUiImage.test.js` - locks the overflow-visible dialogue nine-slice rule.

## Decisions Made

- Kept the main dialogue frame image owned exclusively by `ui.theme.nineSlice.dialogueBox`; runtime code only paints dialogue-specific art in dedicated nodes.
- Treated non-canonical legacy art paths as fallback cases instead of opportunistically resolving them, so invalid data does not overwrite the current CSS dialogue look.

## Deviations from Plan

None - plan executed within the intended scope.

## Issues Encountered

- Existing dirty worktree state required another scoped commit so unrelated files stayed out of the Phase 72 execution history.

## User Setup Required

None.

## Known Stubs

None.

## Next Phase Readiness

- `72-03` can now wire picker UI and runtime preview messaging directly onto the public `renderPreviewLine()` surface.
- Preview and editor code no longer need to invent their own dialogue art layering, because the runtime owner is now explicit and covered by focused tests.

## Verification Evidence

- `npx vitest run tests/dialogueBoxUiSkin.test.js tests/themeManagerUiImage.test.js tests/dialogueBoxNameplate.test.js`

## Self-Check: PASSED

---
*Phase: 72-dialogue-box-picture-loop*
*Completed: 2026-04-22*
