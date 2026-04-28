---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Galgame 标配系统补全
status: roadmap_created
stopped_at: Roadmap created; Phase 83 ready for planning
last_updated: "2026-04-28T20:08:01.1253616+10:00"
last_activity: 2026-04-28
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-28)

**Core value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑  
**Current focus:** Milestone v1.7 — roadmap created, Phase 83 ready for planning

## Current Position

Phase: 83 — 剧情系统契约与持久化护栏
Plan: —
Status: Roadmap created
Next: /gsd-plan-phase 83
Last activity: 2026-04-28

```
v1.4 ████████████████████ 10/10 phases ✅ archived
v1.5 ████████████████████ 7/7 phases ✅ archived
v1.6 ████████████████████ 5/5 phases ✅ archived
v1.7 ░░░░░░░░░░░░░░░░░░ 0/4 phases (roadmap ready)
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
| v1.6 | 5 | 13 | 14 ✅ |
| Phase 73-button-family-image-rollout P01 | 3min | 2 tasks | 5 files |
| Phase 76 P01-02 | 35m | 4 tasks | 14 files |
| Phase 77 P01 | 6 min | 4 tasks | 5 files |
| Phase 77 P02 | 4 min | 2 tasks | 3 files |
| Phase 78 P01 | 5min | 2 tasks | 4 files |
| Phase 78 P02 | 3min | 3 tasks | 7 files |
| Phase 80 P01 | 3min | 2 tasks | 5 files |
| Phase 80 P02 | 8min | 2 tasks | 5 files |
| Phase 82 P01 | 9 min | 2 tasks | 14 files |
| Phase 82 P02 | 8 min | 2 tasks | 12 files |
| Phase 82 P03 | 6 min | 2 tasks | 12 files |
| Phase 82-4 P04 | 4 min | 2 tasks | 10 files |

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
- [Phase 78+]: v1.6 is locked as a complete theme package system milestone, not a continuation of ad hoc image-slot expansion.
- [Phase 78+]: v1.6 phase order is fixed as 78 contract and compatibility → 79 install/apply/export → 80 browser UX → 81 golden theme → 82 remaining 4 themes.
- [Phase 78+]: This milestone does not include un-applied live iframe preview; the browser uses card preview images plus coverage/overwrite explanation only.
- [Phase 78+]: Built-in themes and imported themes must converge on the same install/apply path.
- [Phase 78+]: `.gmtheme` is the only full export format in v1.6; legacy `.theme` is compatibility import only.
- [Phase 78+]: Content production order is fixed to one golden theme first, then expand to the remaining four themes.
- [Phase 78]: Phase 78 freezes full theme imports as explicit full or legacy-partial metadata with canonical ui/themes/<themeId>/ refs only.
- [Phase 78]: Phase 78 theme selection now stops at dry-run preflight summaries; unopened packages get static summaries instead of live iframe preview.
- [Phase 80]: The browser maps persisted packageMeta.source='file' to UI source='imported' without changing stored schema.
- [Phase 80]: Apply impact messaging is derived from coverage overlap or first-write semantics, not namespace overwrite counts.
- [Phase 80]: Imported browser entries stay session-scoped and are rebuilt from preflight metadata instead of a persisted registry.
- [Phase 80]: ThemeBrowserModal consumes normalized browser items from themeBrowser.js instead of raw built-in/imported objects.
- [Phase 80]: Successful theme apply closes the browser so Project Settings can reuse its existing preview refresh path.
- [Phase 80]: Project Settings keeps a direct .gmtheme export action while unified browser owns browse/import/apply.
- [Phase 81]: Full-theme coverage expands to 8 surfaces by including `titleScreen`, but theme ownership remains visual-only and excludes `titleScreen.bgm`.
- [Phase 81]: Golden `wafuu` is the first title-inclusive shipped baseline and must travel through the same install/apply/export/import pipeline as imported themes.
- [Phase 81]: Structured settings tabs must treat glyph/emoji `tab.icon` values as text, not asset paths.
- [Phase 81]: Golden `wafuu` footer button coordinates are part of shipped baseline data, not runtime layout defaults.
- [Phase 81]: Exported/fullscreen runtime keeps the existing 1280x720 coordinate space and scales the game container to the viewport instead of widening engine layout logic.
- [Phase 81]: Legacy applied built-in `wafuu` data migrates on project load so approved fixes (simplified title text and latest footer layout) reach older projects without manual reapply.
- [Phase 82]: Built-in theme truth now lives in explicit manifest coverage, preview, and visual-signature metadata instead of browser fallback.
- [Phase 82]: Built-in bundled assets are declared in one registry and copied into assets/ui/themes/<id>/... before install returns.
- [Phase 82]: Built-in preview metadata must resolve to real bundled preview SVGs so the static browser surface remains truthful.
- [Phase 82]: Default now ships as the polished neutral baseline by owning canonical dialogue, chrome, and title assets instead of behaving like an empty fallback.
- [Phase 82]: Modern-sky expresses its airy glass-panel identity through slim-radii floating cards and shared canonical art refs instead of token-only recolors.
- [Phase 82]: Both built-ins continue to install through the shared built-in asset registry so apply/export/browser behavior stays unified.
- [Phase 82]: Fantasy-dark now differentiates through crest-led ceremonial chrome, parchment-plaque dialogue treatment, and canonical title/screen assets instead of recolored reuse.
- [Phase 82]: Minimal-white now differentiates through typography-first paper layouts, thin-rule chrome, and quiet editorial buttons instead of a light-mode inversion of default.
- [Phase 82]: Both final Phase 82 production themes stay on the shared built-in asset registry and canonical ui/themes/<id>/ install path.
- [Phase 82-4]: Task 2 human review recorded approval with no follow-up code edits because the shared-pipeline build already met the final differentiation gate.
- [Phase 82-4]: Phase 82 closes only after automated parity evidence and explicit human confirmation of the D-08 role mapping across all five shipped themes.
- [Phase 83+]: v1.7 phase order is fixed as 83 contracts/persistence → 84 variable/branching GUI → 85 affection/endings → 86 CG/validation.
- [Phase 83+]: Affection remains a tagged number-variable preset, not a separate runtime subsystem.
- [Phase 83+]: Ending and CG progression must use explicit registries plus explicit unlock actions; v1.7 will not auto-detect unlocks from save state or asset usage.
- [Phase 83+]: Save slots and persistent profile stay as separate truth sources; this contract is mandatory even if scope has to cut elsewhere.

### Blockers/Concerns

- Repo-wide `npx vitest run` 仍有与 v1.5 无关的历史失败；本里程碑应继续优先使用 focused gate，而不是把无关存量债务混进 phase closure。
- brownfield 风险主要在 schema 漂移、导出漏图、预览与运行时分叉；Phase 71 必须先把合同与扫描边界冻结。

## Session Continuity

Last session: 2026-04-28T19:05:00+10:00
Stopped at: Roadmap created; Phase 83 ready for planning
Resume file: None
Resume hint: |

  1. v1.7 roadmap 已创建，Phase 83-86 顺序已冻结，下一步从 `/gsd-plan-phase 83` 开始
  2. 先守住 stable projectId、effect contract、save/profile separation 与旧项目/旧存档兼容，再推进变量/结局/CG UI
  3. 明确延期：flowchart、replay、BGM room、achievements、字符串变量 / 表达式语言、generic persistent vars、auto-detected unlocks、cloud sync
  4. 当前 worktree 仍有与本次 GSD planning 无关的用户改动；执行时不要自动清理或重置它们

Next action: /gsd-plan-phase 83
