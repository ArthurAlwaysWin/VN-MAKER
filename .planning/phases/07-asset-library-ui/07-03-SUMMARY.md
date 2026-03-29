---
phase: 07-asset-library-ui
plan: 03
subsystem: resource-library
tags: [audio, mini-player, playback, singleton, context-menu]
dependency_graph:
  requires: [07-02]
  provides: [MiniPlayer, AudioList-full]
  affects: [ResourceLibrary.vue]
tech_stack:
  added: []
  patterns: [HTMLAudioElement API, singleton playback, seekable progress bar]
key_files:
  created:
    - src/editor/components/resource-library/MiniPlayer.vue
  modified:
    - src/editor/components/resource-library/AudioList.vue
decisions:
  - "HTMLAudioElement via new Audio() — not native <audio controls> — for dark-theme consistency (D-10)"
  - "Singleton playback pattern: parent tracks activePlayer ref, deactivates others via active prop"
  - "Audio cleanup on unmount: pause + removeAttribute('src') + load() to release media resources (Pitfall #3)"
metrics:
  duration: 4min
  completed: "2026-03-29T09:18:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 07 Plan 03: Audio Sub-Tab with MiniPlayer Summary

Custom MiniPlayer widget (play/pause, seekable progress bar, m:ss duration) and full AudioList with singleton playback, context menu rename/delete, and empty state — replacing scaffold placeholder.

## What Was Done

### Task 1: Create MiniPlayer.vue — custom audio player widget
**Commit:** `5d16e7d`

Created `MiniPlayer.vue` with:
- Props: `src` (String, required), `active` (Boolean, default false)
- Emits: `play`, `stop`
- HTMLAudioElement via `new Audio()` — no native `<audio controls>`
- Play/pause toggle button with ▶/⏸ icons and `aria-label` (播放/暂停)
- Seekable progress bar with track fill (100ms linear transition) and thumb (12px circle, visible on hover)
- Duration display in `m:ss / m:ss` format with `font-variant-numeric: tabular-nums`
- Watcher on `active` prop to pause when parent deactivates (singleton enforcement)
- `onBeforeUnmount` cleanup: pause + removeAttribute('src') + load() to release media resources

### Task 2: Replace AudioList.vue scaffold with full implementation
**Commit:** `815a238`

Replaced the scaffold placeholder entirely with:
- `audioFiles` computed from `assets.files.audio`
- Singleton playback via `activePlayer` ref — only one MiniPlayer active at a time
- Context menu with 重命名/删除 actions on right-click (`@contextmenu.prevent`)
- InlineEdit for filename renaming (with extension preservation)
- Delete confirmation via `confirm()` dialog (matching AssetGrid pattern)
- Empty state: 🎵 icon + "当前分类下暂无音频文件" + subtitle
- Audio rows: 🎵 icon + editable filename (max-width 200px) + MiniPlayer
- CSS: `#252526` backgrounds, `border-radius: 6px`, `gap: 12px` rows, `gap: 8px` list

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npx vite build` passes with zero errors (both tasks)
- MiniPlayer uses `new Audio()` (HTMLAudioElement API, not native `<audio controls>`) per D-10
- Singleton playback: `activePlayer` ref in AudioList, `active` prop + watcher in MiniPlayer
- Progress bar seekable via click handler with fraction calculation
- Audio cleanup on unmount (`onBeforeUnmount` with pause + release)
- Context menu + inline rename + delete confirmation available on audio rows
- Empty state renders when `audioFiles.length === 0`
- Scaffold text "将在后续计划中实现" completely removed

## Known Stubs

None — all functionality is fully wired.

## Self-Check: PASSED
