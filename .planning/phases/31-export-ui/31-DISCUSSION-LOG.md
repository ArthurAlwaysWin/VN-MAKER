# Phase 31: Export UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 31-export-ui
**Areas discussed:** 导出入口位置, 对话框交互流程, 导出完成反馈

---

## 导出入口位置

| Option | Description | Selected |
|--------|-------------|----------|
| "项目设置" Tab 内添加"导出游戏"按钮 | 与项目管理聚合，无需新 Tab | ✓ |
| 新增一个"导出" Tab 页 | 独立空间，但 Tab 已有6个 | |
| 顶部工具栏/菜单栏按钮 | 始终可见，但目前没有工具栏 | |

**User's choice:** 项目设置 Tab 内按钮
**Notes:** 保持现有 6 Tab 布局不变

### 配置界面形式

| Option | Description | Selected |
|--------|-------------|----------|
| 弹窗对话框（Modal） | 覆盖当前页面，用完关闭，与 BgRemovalModal 一致 | ✓ |
| 内联面板 | 直接在项目设置页展开导出区域 | |

**User's choice:** Modal 弹窗
**Notes:** 与已有 Modal 组件模式保持一致

---

## 对话框交互流程

### 状态切换模式

| Option | Description | Selected |
|--------|-------------|----------|
| 单个 Modal 多状态 | 配置→导出中→完成，同一弹窗内切换 | ✓ |
| 分步向导（Stepper） | 每步一个页面，有进度条指示 | |

**User's choice:** 单 Modal 三状态
**Notes:** 简单紧凑

### 导出过程中取消

| Option | Description | Selected |
|--------|-------------|----------|
| 可以取消 | 中断导出，清理文件，回到配置状态 | ✓ |
| 不可取消 | 开始后等完成，禁用关闭按钮 | |

**User's choice:** 可以取消
**Notes:** 清理已生成文件

---

## 导出完成反馈

### 成功界面

| Option | Description | Selected |
|--------|-------------|----------|
| 成功图标 + 输出路径 + "打开文件夹"按钮 | 简洁明了 | ✓ |
| 详细报告（文件列表、大小等） | 信息丰富但可能过于复杂 | |

**User's choice:** 简洁：成功图标 + 路径 + 打开按钮
**Notes:** 用户可直接查看产出

### 警告呈现

| Option | Description | Selected |
|--------|-------------|----------|
| 完成界面下方显示折叠警告列表 | "导出成功，但有N个资源未找到" + 展开详情 | ✓ |
| 只显示警告数量，不展示详情 | 简单但不够有用 | |

**User's choice:** 折叠警告列表
**Notes:** 继承 Phase 30 D-01/D-02 的批量返回设计

### 失败处理

| Option | Description | Selected |
|--------|-------------|----------|
| 显示错误信息 + "重试"按钮 | 回到配置状态可重新尝试 | ✓ |
| 弹 alert 提示失败 | 简单但体验差 | |

**User's choice:** 错误信息 + 重试按钮
**Notes:** 回到配置状态

---

## Agent's Discretion

- 进度条样式、Modal 布局细节、按钮文案/图标、输入验证、打开文件夹 IPC

## Deferred Ideas

None
