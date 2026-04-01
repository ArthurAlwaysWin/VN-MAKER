---
phase: 14-editor-test-play
plan: 01
subsystem: engine
tags: [preview-mode, postmessage, iframe]
requires: []
provides: [engine-preview-mode, postmessage-protocol]
affects: [src/engine/ScriptEngine.js, src/main.js]
tech-stack:
  added: []
  patterns: [postMessage, iframe-detection]
key-files:
  created: []
  modified:
    - src/engine/ScriptEngine.js
    - src/main.js
key-decisions:
  - "iframe detection via window.parent !== window to split init paths"
  - "READY handshake sent immediately after initPreview() — engine tells editor it's ready"
  - "previewMode guards added to ESC, context menu, and quick controls MENU button"
requirements-completed: [PLAY-01, PLAY-02, PLAY-03]
duration: "5 min"
completed: 2026-04-01
---

# Phase 14 Plan 01: Engine Preview Mode Summary

Engine-side preview mode with postMessage protocol — ScriptEngine._previewMode flag, iframe-detection init path, start/stop/mute message handlers, READY handshake, and previewMode guards on all game menu access points.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add _previewMode flag to ScriptEngine | 64ac9fc | ScriptEngine.js |
| 2 | Add postMessage listener + previewMode guards | 3c49347 | main.js |

## What Was Built

1. **ScriptEngine._previewMode** — boolean flag, defaults to false, set by postMessage start command
2. **initPreview()** — iframe-specific init path: registers postMessage listener, sends READY handshake
3. **postMessage protocol**: start (receives script data + position), stop (resets engine), mute (toggles audio)
4. **previewMode guards** — ESC handler, context menu, quick controls MENU button all blocked in preview
5. **Engine 'end' event** — sends {type:'ended'} to parent instead of returning to title in preview mode
6. **Iframe detection** — `window.parent !== window` switches between initPreview() and normal init()

## Deviations from Plan

None — plan executed exactly as written.

## Next

Ready for Plan 14-02 (editor-side UI: iframe toggle, toolbar buttons, read-only mode).
