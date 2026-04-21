# Phase 61 Discussion Log

**Date:** 2026-04-21
**Mode:** `--auto`
**Phase:** 61 — Contract Freeze & Visual Ownership

## Auto-selected gray areas

[auto] Selected all gray areas:
1. 舞台层所有权
2. 角色 transform 所有权
3. 未知枚举兼容策略
4. 运行时职责边界

## Auto-selected decisions

[auto] 舞台层所有权 — Q: "镜头效果应该挂在哪一层？" → Selected: "新增 `#stage-layer`，只包住背景层和角色层" (recommended default)

[auto] 角色 transform 所有权 — Q: "未来角色动画应该叠加在哪个节点？" → Selected: "保留 `.character-sprite` 管定位/scale，新增 `.character-motion` 管演出动作" (recommended default)

[auto] 未知枚举兼容策略 — Q: "打开和保存带未知演出值的项目时应如何处理？" → Selected: "原样保留未知值，UI 可降级显示，runtime 安全回退" (recommended default)

[auto] 运行时职责边界 — Q: "谁负责镜头 / 动画 / 转场 / 预览真源？" → Selected: "`ScriptEngine` 发契约事件；`CharacterLayer` 管角色动作；`BackgroundLayer` 管转场；独立 `CameraController` 管镜头；iframe runtime 是唯一真预览" (recommended default)

## Notes

- 这些选择与 v1.4 研究结论一致：先冻结契约与视觉所有权，再进入具体效果实现。
- 用户额外确认：只需要同步关键技术细节，其余实现细节由 agent 自主决定。

---

*Auto discussion completed for Phase 61 on 2026-04-21*
