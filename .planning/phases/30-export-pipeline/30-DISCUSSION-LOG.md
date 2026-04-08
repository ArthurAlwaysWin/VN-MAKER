# Phase 30: Export Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 30-export-pipeline
**Areas discussed:** 资源缺失处理, script.json 清理, 导出输出结构, 进度反馈方式

---

## 资源缺失处理

| Option | Description | Selected |
|--------|-------------|----------|
| 跳过缺失文件 + 输出警告列表 | 导出继续完成，用户可能是故意删除了素材 | ✓ |
| 终止导出 | 显示缺失文件列表，要求用户修复后重试 | |
| 弹窗询问 | 每次导出都可能弹窗 | |

**User's choice:** 跳过缺失文件 + 输出警告列表
**Notes:** 无

| Option | Description | Selected |
|--------|-------------|----------|
| 导出完成后一次性显示 | 不打断流程 | ✓ |
| 每跳过一个实时显示警告 | 逐条推送 | |

**User's choice:** 导出完成后一次性显示
**Notes:** 无

---

## script.json 清理

| Option | Description | Selected |
|--------|-------------|----------|
| 原样复制 | 简单可靠，引擎已只读需要的字段 | ✓ |
| 剪裁后复制 | 只保留引擎运行时字段，剥离其他 | |

**User's choice:** 原样复制
**Notes:** 无

---

## 导出输出结构

| Option | Description | Selected |
|--------|-------------|----------|
| 扁平结构（assets/ 子分类） | 与 BASE_PATH='./assets/' 对齐 | ✓ |
| 更扁平（无 assets/ 子目录） | 资源直接放根目录 | |

**User's choice:** 扁平结构
**Notes:** 无

| Option | Description | Selected |
|--------|-------------|----------|
| 输出目录同级，{游戏标题}.zip | 下载友好 | ✓ |
| 输出目录内部 game.zip | 与输出混在一起 | |

**User's choice:** 输出目录同级，{游戏标题}.zip
**Notes:** 无

| Option | Description | Selected |
|--------|-------------|----------|
| ZIP 关闭=仅文件夹，ZIP 开启=两者都生成 | 灵活 | ✓ |
| 只生成 ZIP，不保留文件夹 | 简洁但无法本地测试 | |
| 同时保留两者 | 始终生成 | |

**User's choice:** ZIP 关闭=仅文件夹，ZIP 开启=两者都生成
**Notes:** 无

---

## 进度反馈方式

| Option | Description | Selected |
|--------|-------------|----------|
| webContents.send 事件流 | 主进程单向推送，不堵塞，preload 已有 on() | ✓ |
| 单次 handle 返回 | 无中间进度 | |
| Agent 决定 | 灵活 | |

**User's choice:** webContents.send 事件流
**Notes:** 无

| Option | Description | Selected |
|--------|-------------|----------|
| 步骤级（6 步） | 构建引擎 → 扫描资源 → 复制引擎 → 复制资源 → 生成HTML → 打包ZIP | ✓ |
| 文件级 | 每复制一个文件都报告 | |
| Agent 决定 | 灵活 | |

**User's choice:** 步骤级（6 步）
**Notes:** 无

---

## Agent's Discretion

- HTML 模板生成方式
- IPC handler 参数签名
- 导出模块文件组织
- Vite 构建调用方式
- ZIP 内部路径结构

## Deferred Ideas

None — discussion stayed within phase scope
