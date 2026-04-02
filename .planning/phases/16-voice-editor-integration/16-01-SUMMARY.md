---
phase: 16-voice-editor-integration
plan: 01
subsystem: editor/page-inspector
tags: [voice, audio-picker, dialogue, preview, undo]
dependency_graph:
  requires: [phase-15-voice-engine-foundation]
  provides: [per-dialogue-voice-binding, voice-preview-playback, voice-badge]
  affects: [PageInspector.vue, AudioPicker.vue, script.js]
tech_stack:
  added: []
  patterns: [new Audio() for editor preview, mode prop for component reuse]
key_files:
  created: []
  modified:
    - src/editor/stores/script.js
    - src/editor/components/page-editor/AudioPicker.vue
    - src/editor/components/page-editor/PageInspector.vue
decisions:
  - D-04 AudioPicker mode prop reuses existing picker for voice selection
  - D-05 Editor voice preview via new Audio() independent of iframe engine
metrics:
  duration: 3.7 min
  completed: 2026-04-02
requirements:
  - VOICE-02
  - VOICE-03
---

# Phase 16 Plan 01: Per-Dialogue Voice Picker & Preview Summary

Per-dialogue voice binding with AudioPicker voice mode, ▶ preview via new Audio(asset://), ✕ clear, 🔊 badge, undo-aware mutations.

## What Was Done

### Task 1: Add voice:null defaults + AudioPicker mode prop
- **Commit:** `3a8da05`
- Added `voice: null` to dialogue defaults in `createDefaultPage()` and `convertPageType()` in `script.js`
- Added `mode` prop to `AudioPicker.vue` (default: `'audio'`)
- Voice mode shows title "选择语音文件" instead of "选择音频"
- Tab bar (BGM/SE) hidden when `mode === 'voice'`

### Task 2: Add voice field UI, preview playback, and voice badge to PageInspector
- **Commit:** `69fb2d4`
- Added 🔊 voice badge in dialogue list rows when `dlg.voice` exists
- Added voice form-group between expression and content fields with:
  - Readonly input showing voice filename (click to open picker)
  - ▶ preview button that plays via `new Audio(\`asset://${voice}\`)`
  - ✕ clear button with `clearDialogueVoice()`
- Rendered `<AudioPicker>` with `mode="voice"` + `@select`/`@close` handlers
- Imported `AudioPicker` component and added `watch`/`onBeforeUnmount` from Vue
- Added state refs: `showVoicePicker`, `isVoicePlaying`, `previewAudio`
- All voice mutations (`setDialogueVoice`, `clearDialogueVoice`) call `script.pushState()` for undo support
- `toggleVoicePreview()` plays voice with proper `ended` listener
- `stopVoicePreview()` does full cleanup: pause + removeAttribute('src') + load + null
- Watchers stop preview on dialogue/page index change
- `onBeforeUnmount` stops preview on component unmount
- Updated `addDialogue()` push to include `voice: null`
- Added scoped CSS for `.voice-field`, `.voice-preview-btn`, `.voice-clear-btn`, `.dlg-voice-badge`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AudioPicker placement between v-if/v-else**
- **Found during:** Task 2
- **Issue:** Plan suggested placing AudioPicker after the page inspector v-if div but before the v-else empty state, which would break Vue's conditional chain
- **Fix:** Placed AudioPicker after both v-if and v-else divs (Teleport renders to body regardless of template position)
- **Files modified:** PageInspector.vue
- **Commit:** `69fb2d4`

## Known Stubs

None — all voice features are fully wired with data flow from UI → store → undo history.

## Self-Check: PASSED
