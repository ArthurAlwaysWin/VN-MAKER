# Phase 32: Desktop Game Runtime — Discussion Log

**Date:** 2025-07-15
**Participants:** User + Copilot
**Mode:** Interactive (discuss, one-question-at-a-time)

## Gray Areas Identified

3 gray areas identified from codebase scout analysis:
1. 游戏启动行为 (Game Launch Behavior)
2. 存档目录策略 (Save Directory Strategy)
3. 游戏进程功能边界 (Game Process Scope)

**User selection:** 全部讨论 (all 3)

---

## Area 1: 游戏启动行为 (Game Launch Behavior)

### Q1: 默认窗口模式
- **Options:** 窗口模式启动（推荐）/ 项目设置决定 / 全屏启动
- **Decision:** 窗口模式启动 — 匹配编辑器预览体验，玩家可在设置中切换全屏

### Q2: 记住窗口状态
- **Options:** 不记住（推荐）/ 记住上次状态
- **User asked:** 记住状态功能难做吗？有额外开销吗？
- **Agent clarified:** ~20行代码，无额外依赖，启动时读 JSON + resize 防抖写入，需 `screen.getDisplayMatching()` 处理外接显示器拔除情况
- **Decision:** 记住上次状态 — 开销小，体验更好

### Q3: 标题栏样式
- **Options:** 标准系统标题栏（推荐）/ 无框窗口+自定义标题栏
- **Decision:** 标准系统标题栏 — 原生感，无额外工作

---

## Area 2: 存档目录策略 (Save Directory Strategy)

### Q4: 文件夹命名策略
- **Options:** 游戏名作文件夹名（推荐）/ 随机 ID 文件夹名
- **Decision:** 游戏名作文件夹名 — 直观，如 `AppData/GalgameMaker/我的游戏/saves/`

### Q5: 特殊字符处理
- **Options:** 替换为下划线（推荐）/ 游戏名 hash + 元数据文件
- **Decision:** 替换为下划线 — 如 `My:Game*v2` → `My_Game_v2`，简单可靠

---

## Area 3: 游戏进程功能边界 (Game Process Scope)

### Q6: 单实例锁定
- **Options:** 不锁定（推荐）/ 单实例锁
- **Decision:** 不锁定 — 简单，允许多开（类 RPGMaker 行为）

### Q7: DevTools 访问
- **Options:** 不开放 DevTools（推荐）/ 隐藏快捷键
- **Decision:** 不开放 DevTools — 干净的玩家体验，无调试入口

### Q8: 崩溃处理
- **Options:** 简单弹窗+日志文件（推荐）/ 无处理
- **Decision:** 简单弹窗 + 日志文件 — `dialog.showErrorBox()` + `crash.log` 写入 userData

---

## Summary

- 8 decisions made (D-01 through D-08)
- 0 deferred to other phases from discussion (4 items carried from research)
- All areas resolved with recommended options (user confirmed all after clarification on Q2)
- Output: `32-CONTEXT.md` — ready for planning
