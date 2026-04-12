# Phase 36: Tooltip 帮助系统 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 36-tooltip
**Areas discussed:** HelpTip 组件设计, 帮助文本管理, 按钮 title 补全, 帮助内容分区

---

## HelpTip 组件设计

### ? 图标视觉风格

| Option | Description | Selected |
|--------|-------------|----------|
| 圆形底色 + 白色 ? | 类似 macOS 帮助按钮，小圆圈里一个问号，统一强调色 | ✓ |
| 纯文字 ? 平淡样式 | 只是一个灰色 ? 字符，不加背景，最不打扰 | |
| 你来决定 | 只要和暗色主题协调即可 | |

**User's choice:** 圆形底色 + 白色 ?

### 气泡定位方式

| Option | Description | Selected |
|--------|-------------|----------|
| 智能定位 | 默认在右侧，边缘空间不足时自动翻转 | ✓ |
| 固定方向 | 气泡始终在 ? 图标上方或右侧，不做动态调整 | |
| 你来决定 | 只要不被截断就行 | |

**User's choice:** 智能定位

### 触发方式

| Option | Description | Selected |
|--------|-------------|----------|
| hover 触发 | 鼠标悬停显示，移开消失（最轻量） | ✓ |
| click 触发 | 点击 ? 显示，再次点击或点其他地方消失 | |
| hover + click 双模式 | hover 显示，点击锁定（方便复制内容） | |

**User's choice:** hover 触发

### 动画效果

| Option | Description | Selected |
|--------|-------------|----------|
| 淡入淡出 | opacity 过渡，150ms 左右，简洁不拖治 | ✓ |
| 无动画 | 立即显示/消失，最快速 | |

**User's choice:** 淡入淡出

### 气泡配色

| Option | Description | Selected |
|--------|-------------|----------|
| 深色气泡 + 白字 | 类似原生 tooltip，深灰或黑色背景，在暗色主题中突出 | |
| 半透明暗色气泡 | 有微妙透明度，更融入界面 | ✓ |

**User's choice:** 半透明暗色气泡

### 气泡最大宽度

| Option | Description | Selected |
|--------|-------------|----------|
| 240-280px | 适合 2-3 行说明文本，不会太宽 | ✓ |
| 320px | 宽一些，适合长一点的说明 | |

**User's choice:** 240-280px

### 内容格式

| Option | Description | Selected |
|--------|-------------|----------|
| 纯文本 | 只支持纯文字，多行用 \n 换行 | ✓ |
| 简单富文本 | 支持加粗、换行，不支持链接/图片 | |

**User's choice:** 纯文本

### 箭头指示器

| Option | Description | Selected |
|--------|-------------|----------|
| 小三角箭头 | 气泡连接处有小三角指向 ? 图标，更像"对话框" | |
| 无箭头 | 纯圆角矩形，更简洁现代 | ✓ |

**User's choice:** 无箭头

---

## 帮助文本管理

### 文本存储方式

| Option | Description | Selected |
|--------|-------------|----------|
| 集中映射文件 | 一个 helpTexts.js 集中存储所有帮助文本，组件通过 key 引用 | ✓ |
| 分散在各组件 | 每个组件内部定义自己的帮助文本，就近维护 | |
| 按区域分文件 | 每个编辑区一个 helpTexts 文件 | |

**User's choice:** 集中映射文件
**Notes:** 延续 Phase 35 TOKEN_LABELS 的集中映射模式

### 内部结构

| Option | Description | Selected |
|--------|-------------|----------|
| 按编辑区分组 | 对象按 theme/export/settings/script/resource/title 分层 | ✓ |
| 扁平 key-value | 所有帮助文本平铺在一层，用命名前缀区分 | |

**User's choice:** 按编辑区分组

### 文本详细程度

| Option | Description | Selected |
|--------|-------------|----------|
| 简洁一句话 | 每条 10-20 字，像原生 title 那样简短 | |
| 中等说明 | 每条 20-50 字，包含"是什么"+"怎么用" | |
| 混合长度 | 简单的短，复杂的长，灵活处理 | ✓ |

**User's choice:** 混合长度

---

## 按钮 title 补全

### 补全策略

| Option | Description | Selected |
|--------|-------------|----------|
| 统一扫描 + 集中处理 | 一次性遍历所有组件，统一添加 title，保证无遗漏 | ✓ |
| 按区域分批 | 随各区域 HelpTip 工作一起补全，每个计划处理一批 | |

**User's choice:** 统一扫描 + 集中处理

### title 文本来源

| Option | Description | Selected |
|--------|-------------|----------|
| 内联写死 | 直接在模板中写 title="操作名"，最简单直接 | ✓ |
| 从 helpTexts.js 引用 | 和 HelpTip 共用同一个文本源，保持一致性 | |

**User's choice:** 内联写死

---

## 帮助内容分区

### 工作量分配

| Option | Description | Selected |
|--------|-------------|----------|
| 一个计划全部做完 | HelpTip 组件 + 所有区域帮助内容 + 按钮 title 一起实施 | ✓ |
| 分两个计划 | Plan 1: HelpTip 组件 + 核心区域，Plan 2: 剩余区域 + title 补全 | |

**User's choice:** 一个计划全部做完

### ? 图标覆盖密度

| Option | Description | Selected |
|--------|-------------|----------|
| 只加配置项/复杂操作 | 只在用户可能不懂的地方加 ?，简单按钮只用 title | ✓ |
| 尽可能多加 | 每个配置区、每个面板都加 ? 图标，全面覆盖 | |

**User's choice:** 只加配置项/复杂操作

---

## Agent's Discretion

- 气泡 CSS 细节（圆角、padding、字号）
- 智能定位翻转逻辑
- helpTexts.js key 命名规则

## Deferred Ideas

None — discussion stayed within phase scope
