---
phase: 22-skip-mode
plan: "02"
subsystem: engine-orchestration
tags: [skip-mode, audio-suppression, transition-override, read-history, bgm-shadow-state]
dependency_graph:
  requires: [ReadHistory-module, skip-mode-setting]
  provides: [skip-mode-orchestration, skip-indicator, bgm-shadow-state, event-interception]
  affects: [main.js, style.css]
tech_stack:
  added: []
  patterns: [setInterval-skip-loop, bgm-shadow-state-3way, event-handler-wrapping, isRead-before-markRead]
key_files:
  created: []
  modified:
    - src/main.js
    - src/style.css
decisions:
  - "30ms setInterval loop for skip advancement (D-01)"
  - "BGM shadow state: undefined/null/{data} 3-way tracking (D-07)"
  - "isRead checked BEFORE markRead in page_enter for correct stop detection (D-04, SKIP-03)"
  - "All event handlers wrapped inline with skipMode conditional (D-11)"
  - "stopSkip() added to all 6 overlay-open paths (D-06)"
metrics:
  duration: "~4 min"
  completed: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 22 Plan 02: Skip Mode Orchestration Summary

Full skip mode wired into main.js: 30ms setInterval loop, skip-aware event handler wrapping for audio suppression/transition override, ReadHistory integration with correct ordering, BGM 3-state shadow restoration, and 6 stop triggers across all interaction paths.

## What Was Built

### Task 1: Skip Indicator + Core Skip Functions + page_enter Handler + CSS
- **Import ReadHistory** from Wave 1's module, instantiate in `init()` with `engine.script.meta.title`
- **State variables**: `skipTimer`, `pendingBgm` (undefined/null/{data}), `readHistory` at module scope
- **Skip indicator DOM**: `#skip-indicator` div with "▶▶ SKIP" text, `.hidden` class toggle
- **page_enter handler**: checks `isRead()` BEFORE `markRead()` — critical ordering for SKIP-03 read-only stop
- **startSkip()**: mutes BGM, stops voice, shows indicator, starts `setInterval(30)` loop with `engine.waiting` guard
- **stopSkip()**: clears interval, hides indicator, calls `restoreBgmAfterSkip()` for final audio state
- **restoreBgmAfterSkip()**: 3-state check — undefined (unmute current), null (stop), object (play new track)
- **toggleSkip()**: delegates to startSkip/stopSkip
- **CSS**: capsule badge at top-left (12px offset), rgba(0,0,0,0.6), 14px bold, z-index 15, pointer-events none

### Task 2: Event Handler Wrapping + Interaction Handlers
- **dialogue handler**: skip path calls `dialogueBox._finishLine()` for instant text, suppresses voice, returns early (no setTimeout chain)
- **show_character/hide_character**: spread data with `duration: 0` + `transition: 'none'` during skip (D-08)
- **set_background**: spread data with `duration: 0` + `transition: 'cut'` during skip (D-08)
- **play_bgm**: sets `pendingBgm = { ...data }` during skip (shadow tracking, D-07)
- **stop_bgm**: sets `pendingBgm = null` during skip (D-07)
- **play_se**: returns early during skip — SE completely suppressed (D-07)
- **set_expression**: unchanged (no skip modification needed)
- **Click handler**: `if (skipMode) { stopSkip(); return; }` BEFORE advance — prevents double action (Pitfall 7)
- **Keydown handler**: skip-stop check BEFORE switch block — any key stops skip (D-06)
- **Right-click/contextmenu**: stops skip and returns, doesn't open overlays
- **Wheel scroll-up**: stops skip before opening backlog
- **toggleAuto()**: calls `stopSkip()` instead of bare `skipMode = false`
- **gameMenu callbacks**: `stopSkip()` added to onSave, onLoad, onBacklog, onSettings (D-06)
- **quickBar.onBacklog**: `stopSkip()` added (D-06)
- Old `setTimeout(() => engine.next(), 50)` skip chain completely removed

## Verification Results

- `npx vite build` — ✅ passes with no errors
- `dialogueBox._finishLine` — ✅ found in skip path
- `pendingBgm = { ...data }` — ✅ found in play_bgm handler
- `pendingBgm = null` — ✅ found in stop_bgm handler
- `duration: 0, transition: 'none'` — ✅ found in show_character handler
- `duration: 0, transition: 'cut'` — ✅ found in set_background handler
- SE suppression with `if (skipMode) return` — ✅ found in play_se handler
- Click/keydown skip-stop checks — ✅ found
- Old setTimeout skip chain — ✅ removed (not found)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality fully wired.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `751ffcc` | feat(22-02): skip indicator + core skip functions + page_enter handler + CSS |
| 2 | `9f046dc` | feat(22-02): wrap event handlers with skip-aware logic + interaction stop triggers |
