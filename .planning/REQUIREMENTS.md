# Requirements: Galgame Maker — 设置页设计器

**Defined:** 2026-03-28
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v1 Requirements

Requirements for current milestone. Each maps to roadmap phases.

### Bug Fixes

- [ ] **BUG-01**: 修复创建项目向导中 "浏览..." 按钮点击无响应（文件对话框不弹出）
- [ ] **BUG-02**: 修复 vite-plugin-electron Windows 热重载偶尔崩溃（taskkill 找不到进程）

### Settings Components（预制设置组件）

- [ ] **COMP-01**: BGM 音量滑块 — 开发者可放置到画布，引擎内置音量控制逻辑
- [ ] **COMP-02**: SE 音量滑块 — 同上，控制音效音量
- [ ] **COMP-03**: 文字速度滑块 — 控制打字机效果速度（已有 ConfigManager 支持）
- [ ] **COMP-04**: 自动播放速度滑块 — 控制 Auto 模式等待时间（已有 ConfigManager 支持）
- [ ] **COMP-05**: 全屏切换开关 — 新增 ConfigManager key + Electron IPC `BrowserWindow.setFullScreen()`
- [ ] **COMP-06**: 对话框透明度滑块 — 新增 ConfigManager key + 运行时动态设置 DialogueBox 背景透明度
- [ ] **COMP-07**: 总音量滑块 — 新增 ConfigManager key，按比例缩放 BGM/SE 音量

### Designer Features（编辑器设计功能）

- [ ] **EDIT-01**: 1280×720 画布画板 — 复用 CanvasPreview 模式，canvasScale 响应缩放
- [ ] **EDIT-02**: 组件面板侧栏 — 列出所有可用设置组件，拖拽添加到画布（参考 AssetPanel 140px 模式）
- [ ] **EDIT-03**: 拖放定位 — 复用 DraggableElement.vue，canvasScale 补偿，mouseup 时提交位置
- [ ] **EDIT-04**: 属性面板 — 选中组件后显示右侧属性编辑（位置、颜色、字体、大小）
- [ ] **EDIT-05**: 背景图设置 — 单图选择器，存储在 `ui.settingsScreen.background`
- [ ] **EDIT-06**: 返回/关闭按钮组件 — 预制按钮，action: 'close'，可自定义样式
- [ ] **EDIT-07**: 默认回退渲染 — 无自定义布局时引擎渲染内置默认设置页
- [ ] **EDIT-08**: 文字标签元素 — 可拖拽文本（用于分区标题如 "音频设置"），自定义字体/颜色/大小
- [ ] **EDIT-09**: 装饰图片元素 — 拖放自定义图片（分割线、装饰、角色立绘），复用素材系统

### Data & Integration（数据与集成）

- [ ] **DATA-01**: `ui.settingsScreen` schema 定义 — 在 script.json 中新增，包含 background + elements[] 数组
- [ ] **DATA-02**: 自动保存集成 — 设置布局变更通过现有 2s 防抖 deep watcher 自动保存
- [ ] **DATA-03**: 撤销/重做支持 — 布局操作纳入现有 undo/redo 栈（pushState 触发）
- [ ] **DATA-04**: CSS 消毒 — 对所有设置元素的样式值应用现有 sanitize.js

### Architecture（架构约束）

- [ ] **ARCH-01**: 组件注册表模式 — 使用 SETTING_DEFS 注册表，方便未来扩展新组件类型
- [ ] **ARCH-02**: 预留扩展空间 — 架构设计支持未来新增组件类型（如语音音量、跳过已读等）而无需大改

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### 高级设置组件

- **COMP-08**: 跳过已读切换 — 需 read-history 追踪系统，在引擎中记录已读文本
- **COMP-09**: 语音音量滑块 — 需先实现语音播放系统（AudioManager 语音通道）

### 高级编辑器功能

- **EDIT-10**: 实时交互预览 — 编辑器画布中滑块/开关可交互，所见即所得
- **EDIT-11**: 样式预设/主题 — 一键应用 "暗色玻璃"、"明亮纸质"、"极简" 等主题
- **EDIT-12**: 组件分组/分区容器 — 拖拽 "分区容器" 将相关设置可视化分组
- **EDIT-13**: 对齐辅助线 — Figma 风格智能对齐线（拖拽时自动吸附）
- **EDIT-14**: 组件悬停/激活状态 — 配置悬停颜色、激活高亮等交互视觉反馈

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 分辨率/窗口大小选择器 | 游戏固定 1280×720，全屏切换已足够 |
| 单角色语音音量 | 无语音系统，不为不存在的功能建 UI |
| 语言选择器 | 纯中文应用，无 i18n 框架 |
| 自定义逻辑/脚本设置 | 违反核心理念"开发者不碰逻辑" |
| 无障碍设置（字体大小、高对比度等） | 无 a11y 基础设施，半成品比没有更差 |
| 设置页过渡动画编辑器 | 范围膨胀，CSS fade 已足够 |
| 键盘快捷键重映射 | 引擎快捷键固定（A=自动, S=跳过, ESC=菜单） |
| 玩家设置配置文件/预设 | 过度工程，VN 玩家设置一次即忘 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | TBD | Pending |
| BUG-02 | TBD | Pending |
| COMP-01 | TBD | Pending |
| COMP-02 | TBD | Pending |
| COMP-03 | TBD | Pending |
| COMP-04 | TBD | Pending |
| COMP-05 | TBD | Pending |
| COMP-06 | TBD | Pending |
| COMP-07 | TBD | Pending |
| EDIT-01 | TBD | Pending |
| EDIT-02 | TBD | Pending |
| EDIT-03 | TBD | Pending |
| EDIT-04 | TBD | Pending |
| EDIT-05 | TBD | Pending |
| EDIT-06 | TBD | Pending |
| EDIT-07 | TBD | Pending |
| EDIT-08 | TBD | Pending |
| EDIT-09 | TBD | Pending |
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| DATA-04 | TBD | Pending |
| ARCH-01 | TBD | Pending |
| ARCH-02 | TBD | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24 ⚠️

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after initial definition*
