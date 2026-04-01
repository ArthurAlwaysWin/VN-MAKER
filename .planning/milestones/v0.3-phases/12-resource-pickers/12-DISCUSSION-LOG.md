# Phase 12: Resource Pickers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 12-resource-pickers
**Areas discussed:** 背景选择器, 角色表情选择器, 音频选择器, 选择器触发方式

---

## 背景选择器

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 AssetPickerModal 弹窗 | 已有现成组件，弹窗 + 图片缩略图网格 | ✓ |
| 在检查器中内嵌缩略图网格 | 不弹窗，直接嵌入面板 | |
| 侧边滑出面板 | 类似抽屉式展开 | |

**User's choice:** 复用 AssetPickerModal 弹窗（推荐，已有现成组件）
**Notes:** 直接复用资源库已有的 AssetPickerModal，传入 backgrounds 类别

---

## 角色表情选择器

| Option | Description | Selected |
|--------|-------------|----------|
| 缩略图网格 | 直观展示每个表情图片 | ✓ |
| 保持当前下拉菜单 | 文字列表，简单但不直观 | |
| 左右分栏 | 左边角色列表，右边表情网格 | |

**User's choice:** 缩略图网格（推荐，直观展示每个表情图片）
**Notes:** 替换当前的 <select> 下拉为表情精灵缩略图网格

---

## 音频选择器

| Option | Description | Selected |
|--------|-------------|----------|
| 同一选择器 + 类型 tab 切换 | 减少组件重复，BGM/SE 共用 | ✓ |
| 各自独立的两个选择器 | 完全独立的 BGM 和 SE 选择器 | |
| 不分类型统一列表 | 所有音频文件在一个列表里 | |

**User's choice:** 同一个选择器加类型 tab 切换（推荐，减少组件重复）
**Notes:** 复用 MiniPlayer 做内嵌播放预览

---

## 选择器触发方式

| Option | Description | Selected |
|--------|-------------|----------|
| 点击整行输入框触发 | 已有样式，readonly input 点击弹窗 | ✓ |
| 在输入框右侧加"选择"按钮 | 额外按钮触发 | |
| 右侧图标按钮 | 文件夹图标触发 | |

**User's choice:** 点击整行输入框触发（推荐，已有样式）
**Notes:** 保持 PageInspector 当前的 readonly input 样式不变

---

## Agent's Discretion

- 缩略图大小和网格间距细节
- 各选择器的空状态文案
- "清除"按钮（清除当前背景/BGM/SE）
- 音频 tab 视觉样式
- 表情网格 hover/动画效果

## Deferred Ideas

None
