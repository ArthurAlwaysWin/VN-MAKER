---
gsd_state_version: 1.0
milestone: v0.8
milestone_name: 游戏导出 Electron 桌面版
status: roadmapped
stopped_at: Roadmap created — ready for phase planning
last_updated: "2026-04-08"
last_activity: 2026-04-08
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-08)

**Core value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑
**Current focus:** v0.8 游戏导出 Electron 桌面版 — roadmap created, ready for phase planning

## Current Position

Phase: 32 (not started)
Plan: —
Status: Roadmap created, awaiting `/gsd-plan-phase 32`
Last activity: 2026-04-08 — v0.8 roadmap created

```
v0.8 ░░░░░░░░░░░░░░░░░░░░ 0/3 phases (32-34)
```

## Performance Metrics

**Previous milestones:**

| Milestone | Phases | Plans | Requirements |
|-----------|--------|-------|--------------|
| v0.1 | 5 | 5 | ~15 |
| v0.2 | 4 | 7 | 14 |
| v0.3 | 6 | 11 | 23 |
| v0.4 | 4 | 6 | 13 |
| v0.5 | 4 | 8 | 27 |
| v0.6 | 5 | 4 | 26 |
| v0.7 | 4 | 6 | 21 |

**Current milestone: v0.8**

- Phases: 3 (32-34)
- Requirements: 15

## Accumulated Context

### Key Context for v0.8

- v0.7 established 3-way env detection (Electron/Preview/Web) — v0.8 adds 4th: `__DESKTOP_GAME`
- Desktop game reuses web-style relative paths (`./assets/`) — no asset:// protocol needed
- Same IPC contract as editor: game-main.js implements same channel names, different storage backend (app.getPath('userData'))
- game-main.js and game-preload.js embedded as template strings in exportDesktop.js (avoids ASAR path issues)
- asar: false — plain files in resources/app/ for simplicity and debuggability
- Two new devDependencies: @electron/packager (packaging), png-to-ico (icon conversion)
- Existing Vite build + scanAssets + fflate ZIP all reused from v0.7
- Electron binary (~90 MB) cached after first download by @electron/get
- Win.loadFile() + relative fetch() paths — no custom protocol in exported game

### Key Decisions

- [v0.8]: Use @electron/packager (not electron-builder or forge) — simplest API, official, handles icon via resedit
- [v0.8]: asar: false — plain files, defer ASAR to v0.9+
- [v0.8]: 4-way env detection: __DESKTOP_GAME → desktop, ipcRenderer → electron, iframe → preview, default → web
- [v0.8]: Template embedding — game-main.js/game-preload.js as strings in exportDesktop.js
- [v0.8]: No asset:// in game — win.loadFile() makes relative paths just work

### Decisions (carried forward from v0.6/v0.7)

- [Phase 27]: Preset preview bypasses debounce
- [Phase 27]: applyPreset replaces full tokens object
- [Phase 27]: JSON.parse unwrap before IPC
- [Phase 27]: formatVersion:1 in theme.json
- [Phase 27]: Import full overwrite via updateTheme()

## Session Continuity

Last session: 2026-04-08
Stopped at: v0.8 roadmap created
Resume hint: Run `/gsd-plan-phase 32` to begin Desktop Game Runtime
Next action: Plan Phase 32
