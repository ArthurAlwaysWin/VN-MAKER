# Phase 29: Asset Scanner + Build Config - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 29-asset-scanner-build-config
**Areas discussed:** 扫描器输出格式, Vite 构建策略, Favicon 来源, 扫描器运行位置

---

## 扫描器输出格式

| Option | Description | Selected |
|--------|-------------|----------|
| 分类字典 | `{ backgrounds: [...], audio: [...], fonts: [...] }`，下游复制时可按类型分目录 | ✓ |
| 纯文件列表 | `['bg1.png', 'bgm1.mp3', ...]`，最简单 | |
| 带元信息的对象数组 | `[{ path, type, usedBy }]`，可追溯但更复杂 | |

**User's choice:** 分类字典
**Notes:** 与现有 assets store 的 5 个分类一致

### 路径格式

| Option | Description | Selected |
|--------|-------------|----------|
| 保持原始相对路径 | 如 'backgrounds/bg1.png'，直接映射到 assets/ 目录 | ✓ |
| 只返回文件名 | 如 'bg1.png'，由下游决定目录结构 | |

**User's choice:** 保持原始相对路径

---

## Vite 构建策略

### 配置文件方案

| Option | Description | Selected |
|--------|-------------|----------|
| 独立配置文件 | 新建 vite.web.config.js，干净分离，不影响现有开发流程 | ✓ |
| 环境变量切换 | 复用现有 vite.config.js，通过 MODE=web 条件分支 | |

**User's choice:** 独立配置文件

### 文件名策略

| Option | Description | Selected |
|--------|-------------|----------|
| 确定性文件名 | 固定输出 engine.js + engine.css，不带 hash | ✓ |
| 带 hash | engine.[hash].js，用于 CDN 缓存破坏 | |

**User's choice:** 确定性文件名（满足 PIPE-06）

---

## Favicon 来源

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 31 导出 UI 处理 | 扫描器跳过 favicon，导出时由用户选择图片 | ✓ |
| script.json 新字段 | 新增 ui.favicon 字段，由编辑器设置页管理 | |
| 默认图标 | 内置通用 favicon，不让用户操心 | |

**User's choice:** Phase 31 导出 UI 处理
**Notes:** 用户提出无代码平台定位的考量 — favicon 概念对终端用户来说可能难理解。最终同意在导出 UI 中以简单方式提供选择（"选一张图片作为浏览器标签图标"）。

---

## 扫描器运行位置

### 运行环境

| Option | Description | Selected |
|--------|-------------|----------|
| 纯 JS 函数 | 接收 script 对象作为参数，renderer 和 Node.js 都能调用 | ✓ |
| Electron 主进程 IPC | 新增 ipc handler，主进程读取文件系统验证资源存在 | |

**User's choice:** 纯 JS 函数

### 文件存在性检查（SCAN-03）

| Option | Description | Selected |
|--------|-------------|----------|
| 下游导出管道负责 | Phase 30 复制文件时检查存在性，收集警告 | ✓ |
| 扫描器内部检查 | 扫描时就检查文件是否存在，需要传入项目路径 | |

**User's choice:** 下游导出管道负责

---

## Agent's Discretion

- 扫描器函数的内部遍历实现
- Vite Web 配置的优化选项
- 分类字典去重策略

## Deferred Ideas

None
