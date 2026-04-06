# Phase 27: Theme Presets + Export/Import - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 27-theme-presets-export-import
**Areas discussed:** 预设选择界面, 导出包格式, 导入流程, 预设内容策略

---

## 预设选择界面

| Option | Description | Selected |
|--------|-------------|----------|
| 工具栏「预设」按钮 → 弹窗卡片 | 弹窗内 3-4 张预设卡片（缩略图+名称+简介），点击应用。复用弹窗模式与调色盘/九宫格一致 | ✓ |
| 工具栏下拉菜单 | 点「预设」按钮弹出下拉列表，选中直接应用 | |
| 工具栏上方横向滚动条 | 预设卡片始终可见 | |

**User's choice:** 弹窗卡片模式
**Notes:** 与现有调色盘/九宫格弹窗模式一致

| Option | Description | Selected |
|--------|-------------|----------|
| 先预览再应用 | 点击卡片临时应用到 iframe，再点「应用」确认写入 store（可 Ctrl+Z） | ✓ |
| 直接应用 | 点击卡片直接写入，无预览步骤 | |

**User's choice:** 先预览再应用

| Option | Description | Selected |
|--------|-------------|----------|
| 弹窗内合并 | 预设弹窗下方增加「导出」和「导入」按钮 | ✓ |
| 工具栏独立按钮 | 导出/导入与预设弹窗分开 | |

**User's choice:** 弹窗内合并

---

## 导出包格式

| Option | Description | Selected |
|--------|-------------|----------|
| 图片提取为独立文件 | ZIP 含 theme.json + images/ 目录。缩小包体积（base64 大 33%）但需转换逻辑 | ✓ |
| base64 保留内联 | ZIP 只含 theme.json，图片以 data:URI 内联。简单但包体积较大 | |

**User's choice:** 图片提取为独立文件

| Option | Description | Selected |
|--------|-------------|----------|
| 最小 metadata | formatVersion + name + description | |
| 扩展 metadata | formatVersion + name + description + author + createdAt + previewImage | ✓ |

**User's choice:** 扩展 metadata
**Notes:** 用户朋友建议：author/createdAt 加了没有成本，将来社区分享必然需要。previewImage 导出时自动截 iframe 画面，用户无需额外操作。

| Option | Description | Selected |
|--------|-------------|----------|
| iframe postMessage 截图 | 发送 capture-preview 消息，引擎端 canvas 截图返回 base64。纯前端实现 | ✓ |
| Electron capturePage | 通过 IPC 调用主进程截图（与 Phase 19 存档截图一致） | |
| Agent 决定 | | |

**User's choice:** iframe postMessage 截图（纯前端实现）

---

## 导入流程

| Option | Description | Selected |
|--------|-------------|----------|
| 全量覆盖 | 导入主题直接替换当前 ui.theme，推撤销栈可 Ctrl+Z | ✓ |
| 合并模式 | 保留当前主题已有值，只填充缺失 token | |
| 用户选择 | 弹出对话框让用户选覆盖或合并 | |

**User's choice:** 全量覆盖

| Option | Description | Selected |
|--------|-------------|----------|
| 自动添加后缀避免冲突 | 图片提取到项目 assets，沿用资源库自动命名 | |
| 不提取到 assets | 导入时图片转回 base64 Data URL 写入 ui.theme.nineSlice | ✓ |

**User's choice:** 不提取到 assets（保持运行时 base64 数据模型一致）

---

## 预设内容策略

| Option | Description | Selected |
|--------|-------------|----------|
| token + 九宫格图片 | 完整主题包，含配色+图片素材 | |
| 只含 token 值 | 纯配色方案，不含九宫格图片 | ✓ |

**User's choice:** 只含 token 值

**预设数量:** 4 套 — Modern (#4A90D9)、和风 (#C8A882)、Fantasy (#7B2FBE)、Minimal (#333333)

| Option | Description | Selected |
|--------|-------------|----------|
| 硬编码 JS 模块 | presets.js 导出预设数组，零运行时开销 | ✓ |
| JSON 文件按需加载 | presets/*.json，方便扩展但增加 IO | |

**User's choice:** 硬编码 JS 模块

| Option | Description | Selected |
|--------|-------------|----------|
| 手动设计 164 个色值 | 精心调配但工作量大 | |
| 纯算法生成 | colorHarmony 自动填充，简单一致但不够精致 | |
| 混合模式 | 算法基础 + 手动微调 10-15 个功能色 | ✓ |

**User's choice:** 混合模式
**Notes:** 算法生成基础色盘 → 手动微调功能色(danger/warning)、透明度、hover/pressed、对话框相关色 → contrastRatio 检查 + autoFix

| Option | Description | Selected |
|--------|-------------|----------|
| 开发时生成 | generatePresets 脚本产出完整 token → 手动微调 → 硬编码进 presets.js | ✓ |
| 运行时生成 | presets.js 只存主色+覆盖，用户应用时实时调 generatePalette | |

**User's choice:** 开发时生成（发布时是静态数据）

---

## Agent's Discretion

- generatePresets 工具脚本实现细节
- 弹窗卡片布局和尺寸
- 引擎侧 capture-preview canvas 截图实现
- base64 ↔ 二进制转换工具函数
- 导出/导入错误处理策略

## Deferred Ideas

- 社区主题市场/分享平台 — v0.8+
- 主题包字体内嵌 — v0.7+
- 更多内置预设（8-10 套）— 持续补充
