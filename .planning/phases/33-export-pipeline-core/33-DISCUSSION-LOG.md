# Phase 33: Export Pipeline Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2025-07-15
**Phase:** 33-export-pipeline-core
**Areas discussed:** 模板嵌入策略, 缺省图标行为, 导出产物命名, 导出错误处理

---

## 模板嵌入策略

| Option | Description | Selected |
|--------|-------------|----------|
| 运行时读取 + 占位符替换 | 从 electron/game/ 读取源文件，替换 GAME_TITLE/WIDTH/HEIGHT，写入 staging 目录 | ✓ (Agent) |
| 嵌入为模板字符串 | exportDesktop.js 内含 game-main.js 全文作为字符串常量，用模板替换生成 | |
| Agent 决定 | 由 Agent 选择最佳方案 | |

**User's choice:** 跳过（由 Agent 决定）
**Agent's choice:** 运行时读取 + 占位符替换——game-main.js 已 368 行且将来可能调整，读取文件更易维护

---

## 缺省图标行为

| Option | Description | Selected |
|--------|-------------|----------|
| 使用 Electron 默认图标 | 用户不提供就用 Electron 自带图标，最简单 | |
| 内置一个默认图标 | 在 public/ 下放默认 game.png，无自定义时转换这个 | ✓ |
| 强制要求用户提供图标 | 未设置图标时不允许导出 | |

**User's choice:** 内置一个默认图标
**Notes:** 放在 public/default-game-icon.png，导出时无自定义 PNG 则使用此文件转 .ico

---

## 导出产物命名

| Option | Description | Selected |
|--------|-------------|----------|
| 游戏标题作为文件夹名和 .exe 名 | 如「我的游戏-win32-x64/我的游戏.exe」，非法字符替换为下划线 | ✓ |
| 固定名称 game | 如「game-win32-x64/game.exe」，简单无编码问题 | |

**User's choice:** 游戏标题作为文件夹名和 .exe 名
**Notes:** 复用 Phase 32 D-05 的非法字符→下划线替换策略

---

## 导出错误处理

| Option | Description | Selected |
|--------|-------------|----------|
| 失败时清理 staging，保留最终输出 | 清理中间文件，已完成的产物保留便于调试 | ✓ |
| 失败时全部清理 | 任何错误都删除所有产物，干净彻底 | |
| 失败时不清理 | 保留所有文件便于用户排查 | |

**User's choice:** 失败时清理 staging 目录，保留最终输出
**Notes:** staging 是临时目录，最终输出可能有助于用户排查

---

## Agent's Discretion

- 导出管线的具体步骤数量和进度百分比分配
- staging 目录命名和位置
- @electron/packager 配置参数
- png-to-ico 转换的图标尺寸
- Electron 缓存路径管理

## Deferred Ideas

- macOS/Linux 平台导出 — v0.9+
- ASAR 打包 — v0.9+
