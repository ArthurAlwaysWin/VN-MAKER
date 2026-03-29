# Phase 7: Asset Library UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 07-asset-library-ui
**Areas discussed:** 视图布局, 角色编辑器, 音频播放控件, 拖放批量导入

---

## 视图布局 (View Layout)

| Option | Description | Selected |
|--------|-------------|----------|
| 子标签页切换 | 顶部 4 个分类标签，每次显示一个分类内容。复用现有 Assets.vue 的子标签模式 | ✓ |
| 垂直滚动四区 | 所有分类上下排列，滚动查看全部。一屏看到所有分类，但资源多时滚动距离长 | |
| 手风琴折叠 | 4 个可展开/收起的分类区，点击标题展开/收起。紧凑但展开多个时内容区域变小 | |

**User's choice:** 子标签页切换
**Notes:** 用户请求在浏览器中查看三种方案的可视化原型后做出选择。创建了 mockup-layout.html 展示三种方案的交互原型。

---

## 角色编辑器 (Character Editor)

### 布局方案

| Option | Description | Selected |
|--------|-------------|----------|
| 卡片展开模式 | 角色列表显示为卡片，点击展开显示名称/颜色/表情网格。与其他分类风格一致 | |
| 侧栏+编辑区 | 左侧角色列表 + 右侧编辑区。保留 Characters.vue 现有布局，编辑空间大 | ✓ |
| 列表→详情导航 | 角色列表页 → 点击进入详情页。层级清晰但需返回按钮，操作步骤多 | |

**User's choice:** 侧栏+编辑区
**Notes:** 用户同样请求可视化原型。创建了 mockup-character.html 展示三种方案。用户重要补充：
- 角色差分/表情是用户自己上传的图片，不提供图片编辑功能
- 可以修改差分名称（重命名）
- 角色头像 = 第一张差分图的上半部分裁剪

### 表情展示方式

| Option | Description | Selected |
|--------|-------------|----------|
| 编辑区内网格 | 表情以缩略图网格显示，点击表情可改名 | ✓ |
| 表情列表模式 | 垂直列表（缩略图+名称+操作横向排列），适合表情多时滚动 | |

**User's choice:** 编辑区内网格

### 表情操作方式

| Option | Description | Selected |
|--------|-------------|----------|
| 右键菜单 | 右键表情缩略图弹出菜单：重命名/删除。简洁不占空间 | ✓ |
| 悬停操作按钮 | 悬停显示编辑/删除按钮，离开时隐藏 | |
| 双击改名+键盘删除 | 双击进入编辑，Delete键删除 | |

**User's choice:** 右键菜单

---

## 音频播放控件 (Audio Playback)

| Option | Description | Selected |
|--------|-------------|----------|
| 迷你播放器 | play/pause 按钮 + 进度条 + 时长显示。紧凑实用，无额外依赖 | ✓ |
| 简单 play/pause | 只有播放/暂停按钮 + 文件名，无进度条。最简洁但不知道播放位置 | |

**User's choice:** 迷你播放器

---

## 拖放批量导入 (Drag-Drop Import)

| Option | Description | Selected |
|--------|-------------|----------|
| 全视图覆盖层 | 拖入文件时全屏半透明蓝色覆盖层 + "释放导入"提示。导入到当前活动子标签分类 | ✓ |
| 每个分类区底部 drop zone | 子标签内容底部虚线框 drop zone。直观但需滚动到底部 | |
| 智能自动分类 | 全屏覆盖层，根据扩展名自动分类到不同类别，不管当前子标签 | |

**User's choice:** 全视图覆盖层

---

## Agent's Discretion

- 子标签页的样式细节（间距、图标大小、过渡动画）
- 缩略图网格列数和卡片尺寸
- 角色侧栏宽度
- 音频进度条精确样式
- 覆盖层动画效果
- 右键菜单实现方式
- 空状态文案和图标

## Deferred Ideas

None — discussion stayed within phase scope
