# Requirements: Galgame Maker — 设置页设计器

**Defined:** 2025-03-28
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v1 Requirements — 全部完成

所有 v1 需求均已交付验证。

### Bug Fixes

- [x] **BUG-01**: 修复创建项目向导中浏览按钮点击无响应 — preload.mjs 路径修复
- [x] **BUG-02**: 修复 vite-plugin-electron Windows 热重载崩溃 — patch-package
- [x] **BUG-03**: 修复创建项目 reactive Proxy 序列化失败 — 解构为纯对象
- [x] **BUG-04**: 修复设置组件样式预览不生效 — settingPreviewStyle() + :style
- [x] **BUG-05**: 修复撤销/重做画布不同步 — watch scriptStore.data + _syncing 防循环
- [x] **BUG-06**: 修复按钮字体预览缺失 — buttonPreviewStyle() 补全 fontFamily
- [x] **BUG-07**: 修复字号变大组件不跟着变高 — 自动调整最小高度

### Settings Components（预制设置组件）

- [x] **COMP-01**: BGM 音量滑块
- [x] **COMP-02**: SE 音量滑块
- [x] **COMP-03**: 文字速度滑块
- [x] **COMP-04**: 自动播放速度滑块
- [x] **COMP-05**: 窗口模式选择 — 原 fullscreen-toggle 改为 select + radio 按钮
- [x] **COMP-06**: 对话框透明度滑块
- [x] **COMP-07**: 总音量滑块

### Designer Features

- [x] **EDIT-01** ~ **EDIT-09**: 画布/面板/拖拽/属性/背景/关闭按钮/回退渲染/标签/图片 全部完成
- [x] **EDIT-15**: 保存按钮添加到顶部工具栏

### Data & Architecture

- [x] **DATA-01~04**: schema + 自动保存 + 撤销重做 + CSS消毒 全部完成
- [x] **ARCH-01~02**: 注册表模式 + 扩展空间 全部完成

## v2 Requirements — 候选（已讨论）

以下需求在 2025-03-29 讨论中明确，待正式规划里程碑。

### 资源库重构
- [ ] ASSET-01: 合并角色管理到统一资源库
- [ ] ASSET-02: 文件格式验证
- [ ] ASSET-03: 自动命名规则
- [ ] ASSET-04: 角色表情/差分系统

### 标题页设计器
- [ ] TITLE-01: 4个按钮组件（开始/继续/设置/退出）
- [ ] TITLE-02: 画布 + 背景/BGM选择

### 游戏内容编辑器
- [ ] GAME-01: PPT式页面系统
- [ ] GAME-02~06: 背景/BGM/角色/对话/按钮

### 游戏按钮系统
- [ ] BTN-01: 6种游戏按钮（存档/读档/自动/快进/设置/返回标题）
- [ ] BTN-02: 文字/图标/混合显示模式
- [ ] BTN-03: 设置页叠加层模式

### 存读档界面
- [ ] SAVE-01: 保存和加载共用同一UI
- [ ] SAVE-02: 点击存档槽执行不同操作

### 自定义字体
- [ ] FONT-01: 自定义字体文件导入 — **用户非常重视**
- [ ] FONT-02: 字体在编辑器和运行时中均可使用

---
*Last updated: 2025-03-29 — v1 完成 + v2 候选需求*
