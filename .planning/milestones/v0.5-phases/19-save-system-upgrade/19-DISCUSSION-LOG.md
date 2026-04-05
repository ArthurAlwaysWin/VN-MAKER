# Phase 19: Save System Upgrade - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 19-save-system-upgrade
**Areas discussed:** 截图内容与时机, 迁移体验, 存档失败处理, 预览模式行为

---

## 截图内容与时机

### 截图内容

| Option | Description | Selected |
|--------|-------------|----------|
| 纯游戏场景（背景+角色+对话框） | 最接近玩家此刻看到的内容 | |
| 只截取背景+角色（无对话框） | 更干净的缩略图 | ✓ |
| 全窗口截图（包含所有 UI） | 最简单但可能包含菜单 | |

**User's choice:** 只截取背景+角色（无对话框）— 更干净的缩略图
**Notes:** 用户朋友建议确认：DOM 渲染引擎用 capturePage()，Canvas 渲染引擎用 canvas.toDataURL()。当前引擎为 DOM 渲染，capturePage() 正确。

### 截图时机

| Option | Description | Selected |
|--------|-------------|----------|
| 打开存档界面前自动截取 | 隐藏对话框 → capturePage → 缓存内存 | ✓ |
| 每页对话自动缓存截图 | 存档时直接用缓存，无需等待 | |

**User's choice:** 打开存档界面前自动截取
**Notes:** 重要补充 — 截图缓存在内存中，仅在用户选择槽位确认存档后才写入磁盘。用户取消时丢弃缓存，不做任何写入。

---

## 迁移体验

| Option | Description | Selected |
|--------|-------------|----------|
| 完全透明迁移（无通知） | 旧存档自动出现，用户无感知 | |
| 一次性 toast 提示 | "检测到旧存档，已自动迁移" | ✓ |
| 弹窗确认 | 让用户决定是否迁移 | |

**User's choice:** 显示一次性 toast 提示
**Notes:** None

---

## 存档失败处理

| Option | Description | Selected |
|--------|-------------|----------|
| 游戏内 toast 提示 | "存档失败：磁盘空间不足" 不打断流程 | ✓ |
| 弹窗错误对话框 | 确保用户看到 | |
| 静默失败 + console 日志 | 最简单但用户可能不知道 | |

**User's choice:** 游戏内 toast 提示 — 不打断游戏流程
**Notes:** None

---

## 预览模式行为

| Option | Description | Selected |
|--------|-------------|----------|
| 禁用存读档，按钮置灰 | 最安全，避免复杂性 | ✓ |
| 回退到 localStorage | 预览中也能存读档但不持久化到文件 | |

**User's choice:** 禁用存读档功能，按钮置灰
**Notes:** iframe 预览没有完整 IPC 权限，禁用是最简单安全的方案

---

## Agent's Discretion

- IPC handler 命名和参数设计
- SaveManager 内部缓存策略
- 错误重试逻辑细节
- toast 样式和消失时间

## Deferred Ideas

None
