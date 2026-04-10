---
phase: 35-chinese-localization
plan: 01
subsystem: editor/theme
tags: [localization, chinese, theme-editor, tokens]
dependency_graph:
  requires: []
  provides: [TOKEN_LABELS-mapping, chinese-token-display]
  affects: [TokenAccordion.vue, ColorTokenRow.vue, FontTokenRow.vue, SliderTokenRow.vue, GradientTokenRow.vue]
tech_stack:
  added: []
  patterns: [label-prop-propagation, central-label-map]
key_files:
  created: []
  modified:
    - src/editor/components/theme/TokenAccordion.vue
    - src/editor/components/theme/ColorTokenRow.vue
    - src/editor/components/theme/FontTokenRow.vue
    - src/editor/components/theme/SliderTokenRow.vue
    - src/editor/components/theme/GradientTokenRow.vue
decisions:
  - TOKEN_LABELS centralized in TokenAccordion.vue, passed via :label prop to children
  - Fallback to key name if label not found (TOKEN_LABELS[key] || key)
  - Font labels simplified: Noto Sans SC (no trailing family), 无衬线体/衬线体 for generics
metrics:
  duration: 1.7m
  completed: "2026-04-11T01:29:30Z"
  tasks: 2
  files_modified: 5
requirements: [L10N-01, L10N-02]
---

# Phase 35 Plan 01: Token Labels 中文化 Summary

Chinese label mapping for 41 theme tokens via TOKEN_LABELS constant + font dropdown localization (无衬线体/衬线体)

## What Was Done

### Task 1: TOKEN_LABELS map in TokenAccordion.vue
- Added `TOKEN_LABELS` constant with 41 entries mapping CSS token keys to 2-4 character Chinese labels
- Labels follow D-01 (简洁派) convention: group name provides context, label only distinguishes within group
- Added `:label="TOKEN_LABELS[key] || key"` prop binding to all 5 row component usages (2× ColorTokenRow, FontTokenRow, SliderTokenRow, GradientTokenRow)
- **Commit:** `802ca80`

### Task 2: Row components label prop + font localization
- Added `label: String` prop to all 4 token row components (ColorTokenRow, FontTokenRow, SliderTokenRow, GradientTokenRow)
- Changed template display from `{{ tokenKey }}` to `{{ label || tokenKey }}` in all 4 components
- Localized FontTokenRow systemFonts: `sans-serif` → `无衬线体`, `serif` → `衬线体`, cleaned up Noto font labels
- **Commit:** `c04d2b9`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `802ca80` | feat(35-01): add TOKEN_LABELS Chinese mapping and pass label prop to row components |
| 2 | `c04d2b9` | feat(35-01): add label prop to row components and localize font labels |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all 41 token labels are mapped, all 4 components display Chinese labels.

## Self-Check: PASSED

- All 5 modified files verified on disk
- Both commits verified in git log (802ca80, c04d2b9)
- SUMMARY.md created and verified
