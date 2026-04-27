---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: 完整主题包与图片主题产出
status: defining_requirements
stopped_at: Started v1.6 milestone
last_updated: "2026-04-27T04:15:00Z"
last_activity: 2026-04-27
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 16
  completed_plans: 16
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-27)

**Core value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑  
**Current focus:** v1.6 milestone kickoff

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Next: Decide whether to research first, then write REQUIREMENTS.md / ROADMAP.md
Last activity: 2026-04-27

```
v1.3 ████████████████████ 9/9 phases ✅ archived
v1.4 ████████████████████ 10/10 phases ✅ archived
v1.5 ████████████████████ 7/7 phases ✅ archived
```

## Performance Metrics

**All milestones:**

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
| v0.9 | 2 | 4 | 15 |
| v1.0 | 5 | 7 | 10 ✅ |
| v1.1 | 4 | 9 | 17 ✅ |
| v1.2 | 6 | 8 | 17 ✅ |
| v1.3 | 9 | 21 | 27 ✅ |
| v1.4 | 10 | 20 | 18 ✅ |
| v1.5 | 7 | 16 | 17 ✅ |
| Phase 73-button-family-image-rollout P01 | 3min | 2 tasks | 5 files |
| Phase 76 P01-02 | 35m | 4 tasks | 14 files |
| Phase 77 P01 | 6 min | 4 tasks | 5 files |
| Phase 77 P02 | 4 min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

- v1.5 保持现有 Electron + Vue + Pinia + DOM/CSS runtime，不引入新依赖，也不做渲染栈重写。
- runtime-backed iframe preview 继续作为预览唯一事实来源；禁止 editor-only 假预览。
- `assets/ui/` + 项目相对路径是 v1.5 的标准 UI 图片写法；旧路径与旧 base64 只做兼容读入，并在重新选图后改写为新格式。
- 先冻结 shared contract、slot coverage 与 scan/export gate，再推进对话框、按钮族和 major screens 的 editor/runtime surface。
- v1.5 phase order 已固定为：71 共享契约与资产通路基线 → 72 对话框图片化闭环 → 73 按钮族图片态扩面 → 74 主要界面图片化 → 75 光标图标与全链路收口。
- 按钮族 coverage 冻结为 5 族：`game-menu-button`、`QAB`、`close-button family`、`page-tab / pager`、`settings-tab`。
- major screen coverage 冻结为 4 屏：SaveLoad、Backlog、GameMenu、Settings。
- AST-03 / AST-04 在审计补缺后由 Phase 76 重新闭环，作为 icon/runtime parity 与 fallback gate 的最终 owner。
- [Phase 73]: The button-family contract stays under ui.theme.buttonFamilies and only scans the five locked Phase 73 families.
- [Phase 73]: ThemeManager owns one selector registry for button families and uses .active for selected-state CSS instead of introducing a new state machine.
- [Phase 74]: Chrome 子路径统一 — 所有背景图和装饰层走 `.chrome` 子路径
- [Phase 74]: GameMenu 旧路径迁移 — 带有 `@deprecated` fallback，注释标明下个 major milestone 移除
- [Phase 74]: 装饰层 >3 时编辑器软性性能提示，不硬限
- [Phase 74]: 不预留给 Phase 75 的 overlay/cursor 字段（YAGNI 与 Grey Area 2 Q5 决策一致）
- [Phase 74]: 复用现有 iframe + postMessage 基础设施，不建新预览
- [Phase 76]: Phase 76 reuses the existing ui.theme.icons slots and routes QAB through the same runtime preview path as other icon consumers.
- [Phase 76]: Broken theme icon assets now recover through one shared helper-level fallback contract instead of per-screen icon systems.
- [Phase 77]: Phase 75 verification closes CUR-01 only and cites Phase 76 for ICO-01, AST-03, and AST-04.
- [Phase 77]: Phase 72 and 74 verification retain human-needed visual checks while still recording requirement satisfaction from current focused evidence.
- [Phase 77]: BTN-03 stays owned by Phase 73 because existing verification already satisfied it; Phase 77 only repaired the traceability drift.
- [Phase 77]: The refreshed audit treats human-needed UI smoke checks as follow-ups, not as missing-artifact blockers.

### Blockers/Concerns

- Repo-wide `npx vitest run` 仍有与 v1.5 无关的历史失败；本里程碑应继续优先使用 focused gate，而不是把无关存量债务混进 phase closure。
- brownfield 风险主要在 schema 漂移、导出漏图、预览与运行时分叉；Phase 71 必须先把合同与扫描边界冻结。

## Session Continuity

Last session: 2026-04-27T03:49:14.045Z
Stopped at: Completed v1.5 milestone archival prep
Resume hint: |

  1. v1.5 已完成归档准备，milestones/ 下已有 v1.5 roadmap / requirements / audit
  2. 当前没有 active milestone，也没有待执行 phase/plan
  3. 下一步应由用户决定是否启动新 milestone，或是否进一步整理 phase archive / push tag
  4. 当前工作区仍有与 milestone docs 无关的本地变更，提交时需避免带入

Next action: decide whether to research the theme-package domain before defining v1.6 requirements
