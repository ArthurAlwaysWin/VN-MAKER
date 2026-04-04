# Phase 20 Discussion Log

> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 20-quick-action-bar
**Areas discussed:** 按钮位置, 按钮样式, 图标方案, 存档/读档行为, 快存快读, Auto/Skip逻辑位置, 通信方式, 反馈机制, 键盘快捷键

---

## 按钮栏位置与可见性

| Option | Description | Selected |
|--------|-------------|----------|
| 嵌入对话框内部底部 | 作为对话框 DOM 的一部分，自动跟随显示/隐藏 | ✓ |
| 对话框外部下方 | 独立元素，视觉上紧贴对话框底部边缘 | |
| 保持右上角 | 改为常驻显示（不用 hover） | |

**User's choice:** 嵌入对话框内部底部
**Notes:** 自动解决 BAR-04 同步需求

---

## 按钮样式

| Option | Description | Selected |
|--------|-------------|----------|
| 文字按钮 | 中文标签直接显示 | |
| 图标+文字 | 每个按钮带小 icon + 中文标签 | |
| 纯图标 | 简洁，鼠标悬停显示 tooltip | ✓ |

**User's choice:** 纯图标 + tooltip

---

## 图标来源

| Option | Description | Selected |
|--------|-------------|----------|
| Unicode 符号 | 零依赖 | |
| CSS 自绘 | 纯 CSS 形状 | |
| SVG 内联 | 最精细 | |
| Lucide CDN 内联 | 复制 Lucide 图标 SVG，不装 npm | ✓ |

**User's choice:** Lucide SVG 内联复制
**Notes:** 用户还提到希望支持自定义图标上传 → 推迟到 UI 美化里程碑

---

## 按钮数量与配置

| Option | Description | Selected |
|--------|-------------|----------|
| 6 按钮 | 自动/快进/回想/存档/读档/设置 | |
| 7 按钮 | + 快存 | |
| 8 按钮 | + 快存 + 快读 | ✓ |

**User's choice:** 8 按钮（自动/快进/回想/存档/读档/快存/快读/设置）
**Notes:** 用户指出业界标准是存档/读档和快存/快读分开。快存/快读原为推迟项，提前到本阶段。

---

## 快速存档机制

**User's design:** 快存使用独立隐藏槽位（`quicksave.json`），每次覆盖，不显示在存档页面。快读直接加载该槽位。无快存时快读按钮灰化。
**Notes:** 游戏开始时检查 quicksave 存在性以设置初始状态。成功时显示 toast。

---

## Auto/Skip 逻辑位置

| Option | Description | Selected |
|--------|-------------|----------|
| 保留在 main.js | 简单，当前能用 | ✓ |
| 移入 QuickActionBar | 更封装 | |
| 独立模块 | AutoMode.js + SkipMode.js | |

**User's choice:** 保留在 main.js

---

## 通信方式

| Option | Description | Selected |
|--------|-------------|----------|
| 回调模式 | bar.onSave = () => ...，与 GameMenu 一致 | ✓ |
| 事件派发 | CustomEvent | |

**User's choice:** 回调模式

---

## 快存/快读反馈

| Option | Description | Selected |
|--------|-------------|----------|
| Toast 提示 | 屏幕左下角显示文字 | ✓ |
| 按钮闪烁 | 无文字 | |
| 无反馈 | 静默执行 | |

**User's choice:** Toast 提示 + 无快存时快读按钮灰化

---

## 键盘快捷键

| Option | Description | Selected |
|--------|-------------|----------|
| F5 快存 / F9 快读 | 业界标准 | ✓ |
| 不绑定 | 只用按钮 | |

**User's choice:** F5/F9

---

## Agent's Discretion

- Lucide 具体图标选择
- Toast 样式/位置/时间
- 按钮间距/尺寸
- 构造函数参数

## Deferred Ideas

- 用户自定义按钮图标（图片上传，透明背景） → UI 美化里程碑
- 快捷按钮编辑器自定义（图片/颜色/位置） → UI 美化里程碑
- Ctrl 持续快进 → 后续版本
