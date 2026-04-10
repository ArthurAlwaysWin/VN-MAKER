# Phase 34: Export UI Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 34-export-ui-integration
**Areas discussed:** 格式切换 UI, 图标选择器, 桌面版专属配置

---

## 格式切换 UI

| Option | Description | Selected |
|--------|-------------|----------|
| Segment 按钮（横向两段：Web \| 桌面版） | 与设置页窗口模式风格一致 | ✓ |
| Tab 栏 | 弹窗顶部两个 tab | |
| 下拉菜单 | | |

**User's choice:** Segment 按钮
**Notes:** 用户一贯偏好 segment/radio 按钮而非下拉框

| Option | Description | Selected |
|--------|-------------|----------|
| 表单顶部，游戏标题之前 | 第一个字段 | |
| 游戏标题和输出目录之间 | | |
| Header 栏内 | "📦 导出游戏"旁边 | ✓ |

**User's choice:** Header 栏内

| Option | Description | Selected |
|--------|-------------|----------|
| 保留共享字段，只切换专属字段 | 标题/目录/ZIP 共用 | ✓ |
| 全部重置 | 切换时清空所有字段 | |

**User's choice:** 保留共享字段

| Option | Description | Selected |
|--------|-------------|----------|
| 默认 Web | 兼容现有行为 | |
| 默认桌面版 | v0.8 重点是桌面导出 | ✓ |
| 记住上次选择 | | |

**User's choice:** 默认桌面版

---

## 图标选择器

| Option | Description | Selected |
|--------|-------------|----------|
| 缩略图预览 + 文件名 | 直观确认图标是否正确 | ✓ |
| 只显示文件名 | 和现有 favicon 选择器一样 | |

**User's choice:** 缩略图预览 + 文件名

| Option | Description | Selected |
|--------|-------------|----------|
| 默认图标缩略图 + "使用默认图标"文字 | 明确显示会用什么图标 | ✓ |
| 只显示"未选择（将使用默认图标）"文字 | | |
| 空状态，不提示默认图标 | | |

**User's choice:** 显示默认图标缩略图 + "使用默认图标"文字

---

## 桌面版专属配置

| Option | Description | Selected |
|--------|-------------|----------|
| 不需要额外选项，简洁为主 | 分辨率和窗口模式在项目设置中配置 | ✓ |
| 显示只读分辨率预览 | 让用户确认当前分辨率 | |

**User's choice:** 不需要额外选项，简洁为主
**Notes:** 用户指出 1280×720 分辨率太低，应升到高清。此为项目设置范畴，记为 deferred idea。

---

## Agent's Discretion

- 缩略图预览尺寸和样式
- Segment 按钮 CSS 实现
- 默认图标 URL 构建方式

## Deferred Ideas

- 默认分辨率提升到 1920×1080 — 用户明确需求，属于项目设置
- macOS/Linux 导出格式选项 — v0.9+
- 导出预设 — 可后续优化
