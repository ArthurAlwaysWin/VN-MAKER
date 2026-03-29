# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑
**Current focus:** Milestone v0.2 — 资源库重构 & 标题页设计器 & 设置叠加层

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-28 — Milestone v0.2 started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 5 (v0.1) + 3 hotfix commits (v0.1 后)
- Total execution time: 2 sessions

**By Phase (v0.1):**

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Bug Fixes | ✅ | BUG-01 (preload.mjs) + BUG-02 (patch-package) |
| 2. Data Schema | ✅ | settingDefs.js + ConfigManager + script store |
| 3. Runtime Renderer | ✅ | SettingsScreen dual-mode + CSS + IPC fullscreen |
| 4. Editor Canvas | ✅ | 画布 + 组件面板 + DraggableElement + 拖拽放置 |
| 5. Property Panel | ✅ | 属性编辑 + 颜色/字体 + auto-save + undo/redo |

**Post-milestone 修复 (2025-03-29):**

| Commit | Description |
|--------|-------------|
| 1406258 | fix: 创建项目 reactive Proxy clone 错误 |
| 6dd6207 | fix: 设置页设计器 5 项 bug（样式预览/撤销重做/自动调高等） |
| 7228472 | feat: 关闭按钮移至设置组件 + 窗口模式三选一 |
| d8d147e | feat: 窗口模式 radio 按钮 + 保存按钮 |

## Accumulated Context

### Decisions

- [Phase 1]: Preload path must match Vite output extension (.mjs for ESM projects)
- [Phase 2]: Schema-first approach with SETTING_DEFS registry as single source of truth
- [Phase 3]: masterVolume scales bgm/se proportionally; fullscreen via Electron IPC
- [Phase 4]: Reuse DraggableElement + ResizeObserver pattern from Scenes canvas
- [Phase 5]: Color picker via native input[type=color]; rgba→hex conversion for defaults
- [Post]: Vue reactive Proxy 不能通过 Electron IPC 序列化 — 必须先解构为纯对象
- [Post]: 窗口模式改为 select 类型（3 选项），UI 用 segment radio 按钮横排显示
- [Post]: 关闭按钮从装饰元素移至设置组件区，支持 icon(×)/text 两种显示模式
- [Post]: 保存按钮 💾 添加到顶部工具栏（撤销/重做旁边）

### Blockers/Concerns

None — 当前工作全部完成。

## 用户未来愿景（已讨论，待规划）

以下需求已在 2025-03-29 讨论中明确，待下一个里程碑规划：

1. **资源库重构** — 合并角色管理到资源库，文件格式验证，自动命名（背景-1），角色表情/差分系统
2. **标题页设计器** — 4 个组件（开始/继续/设置/退出），画布 + 背景/BGM 选择
3. **游戏内容编辑器** — PPT 式页面系统，新建页面，添加背景/BGM/角色/对话/按钮
4. **角色表情系统** — 角色有多个差分表情，场景中可切换
5. **游戏按钮** — 存档/读档/自动/快进/设置/返回标题，支持文字/图标/混合模式
6. **设置页叠加层** — 设置页覆盖在当前页面上方（z-index），× 关闭
7. **存读档** — 同一 UI，不同操作（保存/加载）
8. **自定义字体导入** — 用户非常重视此功能

## Session Continuity

Last session: 2026-03-28
Stopped at: v0.2 milestone started, defining requirements
Resume hint: 下一步完成 requirements 定义 → 创建 roadmap
Next action: Continue requirements → roadmap
