---
phase: 14-editor-test-play
plan: 02
subsystem: editor
tags: [preview-ui, iframe, toolbar, read-only-mode]
requires: [14-01]
provides: [editor-preview-ui, inline-test-play]
affects:
  - src/editor/composables/usePageEditor.js
  - src/editor/views/PageEditor.vue
  - src/editor/components/page-editor/CanvasToolbar.vue
  - src/main.js
tech-stack:
  added: []
  patterns: [v-show-toggle, provide-inject, postMessage, function-ref]
key-files:
  created: []
  modified:
    - src/editor/composables/usePageEditor.js
    - src/editor/views/PageEditor.vue
    - src/editor/components/page-editor/CanvasToolbar.vue
    - src/main.js
key-decisions:
  - "iframe uses v-show (not v-if) for lazy preload — stays loaded after first mount"
  - "Overlay stop button positioned by editor outside iframe (absolute pos)"
  - "Read-only mode via CSS pointer-events:none + opacity:0.6 on sidebar/inspector"
  - "asset:// basePath set in initPreview() for project resource resolution"
requirements-completed: [PLAY-01, PLAY-02, PLAY-03]
duration: "15 min"
completed: 2026-04-01
---

# Phase 14 Plan 02: Editor Preview UI Summary

Editor-side inline test play UI — iframe toggle, play/stop/mute toolbar buttons, overlay stop button, read-only mode, and asset:// path fix.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add preview state and methods to usePageEditor | 074ac3a | usePageEditor.js |
| 2 | Add iframe, toolbar buttons, overlay stop, read-only | cc46b68 | PageEditor.vue, CanvasToolbar.vue |
| 2.1 | Fix asset:// basePath for preview iframe | dbf838f | main.js |
| 3 | Human-verify checkpoint — 13 E2E steps | approved | — |

## What Was Built

1. **usePageEditor preview state** — isPreviewMode, isMuted, isEngineReady, previewIframeRef refs
2. **Preview methods** — startPreview() (deep-copy + postMessage), stopPreview(), toggleMute(), onEngineMessage()
3. **iframe toggle** — PageCanvas v-show when not previewing, iframe v-show when previewing (lazy preload)
4. **Toolbar buttons** — ▶ 试玩 / ■ 停止 toggle, 🔊/🔇 mute, 🎮 试玩中 label
5. **Overlay stop button** — semi-transparent absolute-positioned button over iframe
6. **Read-only mode** — sidebar and inspector get pointer-events:none + dimmed opacity during preview
7. **Asset path fix** — initPreview() sets basePath to 'asset://' for BackgroundLayer, CharacterLayer, AudioManager

## Deviations from Plan

| Deviation | Reason | Impact |
|-----------|--------|--------|
| Added asset:// basePath fix (not in plan) | Engine UI layers used /game/ prefix which doesn't resolve project assets in iframe | Additional commit dbf838f — critical bug fix |

## Human Verification

User confirmed all features working: backgrounds render, characters appear, BGM plays, play/stop/mute all functional.

## Next

Phase 14 complete — ready for phase verification.
