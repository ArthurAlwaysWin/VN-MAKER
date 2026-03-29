# Phase 6: Asset Library Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2025-07-21
**Phase:** 06-asset-library-foundation
**Areas discussed:** 验证失败反馈, 字体加载策略, 字体目录与旧项目兼容

---

## 验证失败反馈 (Validation Error Feedback)

### Q1: 导入无效文件时如何向用户反馈？

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog 弹窗 | 明确告知哪些文件被拒绝及原因 | |
| Toast 通知 | 右下角轻提示 | |
| 红色内联提示（自定义） | 上传按钮下方红色文字，列出支持的格式 | ✓ |

**User's choice:** 红色内联提示在上传按钮下方，显示"该资产不支持此文件格式"并列出对应分类支持的格式
**Notes:** 用户明确要求"放在显眼点的位置"，选择内联红字而非浮动 toast

### Q2: 批量导入时有无效文件怎么处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 跳过无效，导入有效，列出失败文件名 | 容错模式 | ✓ |
| 全部拒绝，要求重新选择 | 严格模式 | |

**User's choice:** 跳过无效文件，导入有效文件，并列出导入失败的文件名
**Notes:** 无额外说明

---

## 字体加载策略 (Font Loading Strategy)

### Q3: 自定义字体何时加载到内存？

| Option | Description | Selected |
|--------|-------------|----------|
| 项目打开时一次性加载所有字体 | 字体下拉和预览立即可用 | ✓ |
| 按需加载 | 打开字体下拉时才加载，加快启动 | |

**User's choice:** 项目打开时一次性加载
**Notes:** 用户认同字体文件通常不多

### Q4: 字体文件损坏时如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 跳过 + 红字提示 + 弹窗确认删除（自定义） | 三步处理 | ✓ |
| 跳过 + 红字提示（不删除） | 简单跳过 | |
| 删除 + 通知 | 自动清理 | |

**User's choice:** 跳过损坏字体 + 红字提示"XX.ttf 加载失败" + 弹窗询问是否删除
**Notes:** 用户要求主动询问删除，不是默默跳过也不是自动删除

### Q5: 新导入字体是否需要热加载？

| Option | Description | Selected |
|--------|-------------|----------|
| 立即加载到当前窗口 | 无需重启项目 | ✓ |
| 需重新打开项目 | 简单但体验差 | |

**User's choice:** 立即热加载
**Notes:** 无额外说明

---

## 字体目录与旧项目兼容

### Q6: 旧项目缺少 assets/fonts/ 目录怎么处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 新项目自带 + 旧项目打开时自动创建 | 无感迁移 | ✓ |
| 新项目自带 + 旧项目首次导入字体时创建 | 延迟创建 | |

**User's choice:** 新项目自带 fonts/，旧项目打开时自动创建（无感迁移）
**Notes:** 无额外说明

---

## Agent's Discretion

- Auto-naming 编号算法
- Magic bytes 签名表实现细节
- fontLoader.js 模块结构
- IPC 处理器参数/返回值格式

## Deferred Ideas

None
