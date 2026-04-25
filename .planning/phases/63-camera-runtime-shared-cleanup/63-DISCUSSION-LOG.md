# Phase 63 Discussion Log

**Date:** 2026-04-21
**Mode:** `--auto` + user-confirmed key defaults
**Phase:** 63 — Camera Runtime & Shared Cleanup

## Auto-selected gray areas

[auto] Selected the highest-impact gray areas only:
1. camera owner 与 shared cleanup 归属
2. 触发与并发模型
3. flash 的视觉作用域
4. skip / 快速切页下的镜头语义

## Auto-selected decisions

[auto] owner 与 cleanup — Q: "镜头能力应该由谁持有、谁负责跨入口清理？" → Selected: "独立 `CameraController` 持有镜头能力，`main.js` 在现有 reset/replay/title/load/preview end 入口统一调 `clear()`" (recommended default)

[auto] 触发模型 — Q: "页面镜头何时触发、是否允许多个效果并发？" → Selected: "`page_enter` 后触发一次；同一时刻只允许一个页面级镜头；新效果前先清旧效果" (recommended default)

[auto] flash 作用域 — Q: "flash 应该如何实现才不污染 UI？" → Selected: "在 `#stage-layer` 内新增专用 flash overlay，不复用 `#ui-overlay`" (recommended default)

[auto] skip 语义 — Q: "快速切页和 skip 下镜头是否必须完整播放？" → Selected: "优先安全降级为 0ms / no-op，先保证页面推进和 cleanup 确定性" (recommended default)

## User confirmation

用户已确认按以下关键默认值继续自动推进：

1. 新增独立 `CameraController`，只绑定 `#stage-layer`
2. 镜头只在 `page_enter` 后触发一次，同一时刻只允许一个页面级镜头
3. `flash` 在舞台层内用专用 overlay 实现，不影响 `#ui-overlay`
4. skip / 快速切页下镜头默认安全降级，并在本 phase 先铺 shared cleanup

## Notes

- 用户继续沿用“只同步少量关键技术选型，其余实现细节由 agent 自主决定”的模式。
- 这些默认值延续了前两阶段冻结的 ownership 边界：`ScriptEngine` 发契约、Camera 作用于 stage、角色动作作用于 `.character-motion`、UI 留在 stage 外。

---

*Auto discussion completed for Phase 63 on 2026-04-21*
