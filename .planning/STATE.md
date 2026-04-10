---
gsd_state_version: 1.0
milestone: v0.9
milestone_name: — 编辑器本地化与帮助系统
status: planning
stopped_at: Milestone started, awaiting requirements + roadmap
last_updated: "2026-04-10T16:00:00.000Z"
last_activity: 2026-04-10
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-10)

**Core value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑
**Current focus:** v0.9 里程碑规划 — 中文本地化 + Tooltip 帮助系统

## Current Position

Phase: TBD (awaiting roadmap)
Plan: Not started
Status: Planning v0.9 milestone
Last activity: 2026-04-10

```
v0.9 ░░░░░░░░░░░░░░░░░░░░ 0/? phases (35+)
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
| v0.8 | 3 | 4 | 15 |

## Accumulated Context

### Key Context for v0.9

- v0.9 scope: (1) 中文本地化 — 残留英文 UI 翻译 (2) Tooltip 帮助系统 — ? 图标 + hover 提示双模式
- English text areas identified: token labels, font dropdowns, AudioPicker BGM/SE, ExportModal "Web", coordinate labels, placeholder text
- Tooltip approach: ? icons for config explanations, direct hover for buttons/toolbar icons
- Tab structure just reorganized: 剧本编辑 → 标题页 → 设置页 → 主题 → 资源库 → 项目设置
- Theme token labels display raw CSS key names (primary, dialogue-bg, etc.) — need Chinese mapping
- ThemeToolbar already has 重置 button — no separate reset feature needed

### Key Decisions

- [v0.9]: Tab renamed 游戏内容 → 剧本编辑, reordered for design/management grouping (commit 9524ae2)
- [v0.9]: Tooltip dual-mode: ? icons for config items, direct hover for buttons
- [v0.9]: No full tutorial or standalone docs — tooltips cover 90% of user confusion at lowest cost

### Decisions (carried forward from v0.8)

- [v0.8]: Use @electron/packager — simplest API, official
- [v0.8]: asar: false — plain files
- [v0.8]: 4-way env detection: __DESKTOP_GAME → desktop, ipcRenderer → electron, iframe → preview, default → web

## Session Continuity

Last session: 2026-04-10
Stopped at: v0.9 milestone started, PROJECT.md and STATE.md updated
Resume hint: Continue with research decision → requirements → roadmap
Next action: Decide if research is needed, then create REQUIREMENTS.md and ROADMAP.md
