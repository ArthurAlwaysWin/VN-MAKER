# Requirements: Galgame Maker

**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v0.1 Requirements — 全部完成 ✅

所有 v0.1 需求均已交付验证（BUG-01~07, COMP-01~07, EDIT-01~15, DATA-01~04, ARCH-01~02）。
详见 MILESTONES.md。

---

## v0.2 Requirements — 资源库 & 标题页 & 设置叠加层

**Goal:** 统一资源管理体系，重做标题页设计器，设置页改为游戏内叠加层模式
**Defined:** 2026-03-28
**Total:** 38 requirements across 4 categories

### 资源库 (ASSET)

- [ ] **ASSET-01**: 用户在一个统一视图中管理所有项目资源（替代分离的素材库+角色标签页，标签数 6→5）
- [ ] **ASSET-02**: 资源按四个分类区显示：背景、角色、音频、字体
- [ ] **ASSET-03**: 导入文件时自动验证格式（magic bytes + 扩展名白名单：图片 PNG/JPG/WEBP，音频 MP3/OGG/WAV，字体 TTF/OTF/WOFF/WOFF2）
- [ ] **ASSET-04**: 文件名冲突时自动追加编号（背景-1.png, 背景-2.png）
- [ ] **ASSET-05**: 图片资源以缩略图网格显示
- [ ] **ASSET-06**: 音频资源带播放控件
- [ ] **ASSET-07**: 角色数据面板可编辑名称、颜色、表情列表
- [ ] **ASSET-08**: 角色表情按角色分组显示缩略图（sakura → normal/smile/angry）
- [ ] **ASSET-09**: 通过文件选择器导入表情图片（替代手动输入路径）
- [ ] **ASSET-10**: 用户可删除资源（带确认对话框）
- [ ] **ASSET-11**: 用户可重命名资源（就地编辑文件名）
- [ ] **ASSET-12**: 自定义字体作为一等资源导入到 assets/fonts/，在所有设计器字体下拉中可用
- [ ] **ASSET-13**: 字体列表显示文字样本预览（"你好世界 AaBbCc 1234"）
- [ ] **ASSET-14**: 支持从系统文件管理器拖放多个文件批量导入（drop zone UI）

### 标题页设计器 (TITLE)

- [ ] **TITLE-01**: 1280×720 画布 + 三面板布局（左侧组件面板 / 中间画布 / 右侧属性面板）
- [ ] **TITLE-02**: 组件面板包含 4 个预制按钮组件（开始游戏/继续游戏/设置/退出）
- [ ] **TITLE-03**: 用户可将按钮组件从面板拖放到画布上自由定位
- [ ] **TITLE-04**: 继续按钮在无存档时显示禁用状态预览（灰色 + 不可点击）
- [ ] **TITLE-05**: 用户可选择标题页背景图片（从资源库选择）
- [ ] **TITLE-06**: 用户可选择标题页 BGM（从资源库选择）
- [ ] **TITLE-07**: 用户可添加文字标签元素到画布（可自定义文本内容和样式）
- [ ] **TITLE-08**: 用户可添加装饰图片元素到画布（从资源库选择图片）
- [ ] **TITLE-09**: 用户可自定义按钮文字和样式（颜色/字体/大小/悬停效果）
- [ ] **TITLE-10**: 属性面板可编辑选中组件的位置/颜色/字体/大小
- [ ] **TITLE-11**: 支持 Z-order 图层控制（上移/下移调整元素层级）
- [ ] **TITLE-12**: 撤销/重做（Ctrl+Z/Y）+ 2s 防抖自动保存

### 设置页叠加层 (OVERLAY)

- [ ] **OVERLAY-01**: 设置页以叠加层形式渲染在当前游戏场景上方（z-index overlay）
- [ ] **OVERLAY-02**: 半透明背景遮罩层
- [ ] **OVERLAY-03**: 打开时滑入过渡动画
- [ ] **OVERLAY-04**: 关闭时滑出过渡动画
- [ ] **OVERLAY-05**: 游戏画面在设置页下方持续显示（不暂停/不隐藏）
- [ ] **OVERLAY-06**: ESC 键关闭设置页叠加层
- [ ] **OVERLAY-07**: 点击遮罩区域关闭设置页叠加层
- [ ] **OVERLAY-08**: 游戏画面背景模糊效果（backdrop-filter: blur）

### 基础设施 (INFRA)

- [ ] **INFRA-01**: TitleScreen.js 运行时数据格式对齐新设计器 schema（type/style 结构，兼容旧格式迁移）
- [ ] **INFRA-02**: fontLoader.js 共享模块在编辑器和引擎双进程独立加载自定义字体（FontFace API）
- [ ] **INFRA-03**: 实现资源管理 IPC 处理器（select-asset / import-assets / delete-asset / list-assets / load-font-metadata）
- [ ] **INFRA-04**: 所有新 IPC 调用解构 Vue reactive Proxy 为纯对象后再发送

---

## Future Requirements (Deferred)

- [ ] **游戏内容编辑器**：PPT 式页面系统（v0.3 候选）
- [ ] **角色表情场景切换**：场景中切换差分表情（依赖资源库数据管理，v0.3 候选）
- [ ] **游戏按钮系统**：存档/读档/自动/快进等功能按钮（v0.3 候选）
- [ ] **存读档界面**：保存/加载共用 UI（需进一步设计讨论）
- [ ] **Smart expression 自动检测**：按文件名模式自动分组表情
- [ ] **Asset usage 指标**：显示资源是否在项目中被引用
- [ ] **可配置滑入方向**：设置页叠加层自定义动画方向

## Out of Scope

- 云存储/在线服务/资源市场 — 纯本地应用
- 内置图片编辑器 — 资源应在外部工具中准备
- 视频资源支持 — 引擎无视频播放系统
- 精灵图生成 — 导出时优化，非编辑器关注点
- 字体子集化 — 导出时优化
- 多页标题画面 — 范围膨胀
- 脚本化按钮逻辑 — 违反"不碰逻辑"核心理念
- TypeScript 迁移 — 保持纯 JavaScript
- 桌面应用导出/打包 — 推迟到后续
- 移动端支持 — 桌面优先

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ASSET-01 | Phase 7 | Pending |
| ASSET-02 | Phase 7 | Pending |
| ASSET-03 | Phase 6 | Pending |
| ASSET-04 | Phase 6 | Pending |
| ASSET-05 | Phase 7 | Pending |
| ASSET-06 | Phase 7 | Pending |
| ASSET-07 | Phase 7 | Pending |
| ASSET-08 | Phase 7 | Pending |
| ASSET-09 | Phase 7 | Pending |
| ASSET-10 | Phase 7 | Pending |
| ASSET-11 | Phase 7 | Pending |
| ASSET-12 | Phase 6 | Pending |
| ASSET-13 | Phase 7 | Pending |
| ASSET-14 | Phase 7 | Pending |
| TITLE-01 | Phase 8 | Pending |
| TITLE-02 | Phase 8 | Pending |
| TITLE-03 | Phase 8 | Pending |
| TITLE-04 | Phase 8 | Pending |
| TITLE-05 | Phase 8 | Pending |
| TITLE-06 | Phase 8 | Pending |
| TITLE-07 | Phase 8 | Pending |
| TITLE-08 | Phase 8 | Pending |
| TITLE-09 | Phase 8 | Pending |
| TITLE-10 | Phase 8 | Pending |
| TITLE-11 | Phase 8 | Pending |
| TITLE-12 | Phase 8 | Pending |
| OVERLAY-01 | Phase 9 | Pending |
| OVERLAY-02 | Phase 9 | Pending |
| OVERLAY-03 | Phase 9 | Pending |
| OVERLAY-04 | Phase 9 | Pending |
| OVERLAY-05 | Phase 9 | Pending |
| OVERLAY-06 | Phase 9 | Pending |
| OVERLAY-07 | Phase 9 | Pending |
| OVERLAY-08 | Phase 9 | Pending |
| INFRA-01 | Phase 8 | Pending |
| INFRA-02 | Phase 6 | Pending |
| INFRA-03 | Phase 6 | Pending |
| INFRA-04 | Phase 6 | Pending |

---
*38 requirements | 4 categories | v0.2 milestone*
*Created: 2026-03-28 | Roadmap: 2025-07-21*
