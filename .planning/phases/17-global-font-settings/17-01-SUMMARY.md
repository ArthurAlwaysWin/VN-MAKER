---
phase: 17-global-font-settings
plan: 01
status: complete
started: 2026-04-02T23:10:00Z
completed: 2026-04-02T23:15:00Z
---

# Plan 17-01 Summary: Data Model + Engine Font Rendering

## What Was Built

Global font settings data model (6 fields: fontSize, fontFamily, textColor, nameplateFontSize, nameplateFontFamily, nameplateColor) with engine consumption via DialogueBox.applyGlobalStyle() and per-page fontOverride support.

## Key Changes

### src/editor/stores/script.js
- Added `getDialogueBox()` — lazy init with `??=`, returns 6-field defaults (fontSize:18, nameplateFontSize:20, rest null)
- Added `updateDialogueBox()` — replaces settings + pushState() for undo/redo
- Both exported in store return statement

### src/ui/DialogueBox.js
- Added `applyGlobalStyle(settings)` — stores settings as baseline, applies via _applyFontSettings
- Added `_applyFontSettings(s)` — applies 6 font properties with sanitizeCssValue/clampField guards
- Refactored `_applyStyle(style, fontOverride)` — resets cssText, re-applies global baseline, then per-page override (if !useGlobal), then per-dialogue overrides
- Updated `show(data)` — passes data.fontOverride to _applyStyle, uses _activeNameplateColor for nameplate color fallback
- Constructor initializes `_globalSettings = {}` and `_activeNameplateColor = null`

### src/main.js
- `init()`: calls `dialogueBox.applyGlobalStyle()` after settingsScreen.setLayout, before showTitle
- `initPreview()` case 'start': calls `dialogueBox.applyGlobalStyle()` after loadAllFonts
- `engine.on('dialogue')`: reads currentPage.fontOverride and injects into dialogue data

## Decisions
- D-03 confirmed: null means "use CSS default" — backward compatible
- D-04 confirmed: fontOverride.useGlobal checkbox determines whether page overrides global
- D-09 confirmed: nameplate fully independent (own font size, family, color)

## Self-Check: PASSED

## key-files
created: []
modified:
  - src/editor/stores/script.js
  - src/ui/DialogueBox.js
  - src/main.js
