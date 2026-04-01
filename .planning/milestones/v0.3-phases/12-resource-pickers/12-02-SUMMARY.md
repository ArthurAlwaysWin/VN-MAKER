---
phase: 12-resource-pickers
plan: 02
status: complete
started: 2026-04-01
completed: 2026-04-01
---

# Plan 12-02 Summary: AudioPicker + PageInspector + PageEditor Wiring

## What Was Built

Created AudioPicker modal with BGM/SE tab switching and inline MiniPlayer preview, overhauled PageInspector to replace all placeholder `alertPicker()` calls with functional picker triggers and clear buttons, and wired everything through PageEditor.vue.

## Key Files

### Created
- `src/editor/components/page-editor/AudioPicker.vue` — Audio picker modal with BGM/SE tabs, MiniPlayer per row, confirm/cancel flow

### Modified
- `src/editor/components/page-editor/PageInspector.vue` — Real picker triggers, clear buttons (✕), 48px background thumbnail preview
- `src/editor/views/PageEditor.vue` — Mounts AssetPickerModal + AudioPicker, handles select/close events

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| All audio shown in both tabs (tab selects target field) | Simpler UX — user doesn't need to pre-categorize audio files |
| MiniPlayer singleton via `activePlayerId` ref | Only one audio preview plays at a time, consistent with MiniPlayer contract |
| `field-with-clear` CSS pattern for ✕ buttons | Reusable pattern: absolute-positioned clear button inside input wrapper |
| Volume preserved on re-selection (`page.bgm?.volume ?? 0.5`) | User doesn't lose volume preference when changing audio file |

## Metrics

- Files changed: 3 (1 created, 2 modified)
- Lines added: ~426
- Lines removed: ~11
- Build: ✓ Clean (0 errors)

## Self-Check: PASSED
- [x] AudioPicker.vue has BGM/SE tabs with MiniPlayer per row
- [x] AudioPicker singleton pattern (`activePlayerId`)
- [x] PageInspector has zero `alertPicker` references
- [x] PageInspector has clear buttons for bg/bgm/se
- [x] PageInspector has 48px background thumbnail preview
- [x] PageEditor mounts AssetPickerModal + AudioPicker
- [x] All selections call `script.pushState()` for undo
- [x] Build passes cleanly
