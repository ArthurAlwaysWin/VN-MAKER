# Requirements: Galgame Maker v0.9

**Defined:** 2026-04-10
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v0.9 Requirements

### 本地化 (L10N)

- [ ] **L10N-01**: 主题编辑器 token 标签全部显示中文名（primary → 主色，dialogue-bg → 对话框背景 等 35+ 个 token）
- [ ] **L10N-02**: 字体选择器显示中文标签（Sans Serif → 无衬线体，Serif → 衬线体，Monospace → 等宽字体），覆盖所有 6+ 处下拉框
- [ ] **L10N-03**: 转场选项显示中文（fade → 淡入淡出，slide-left → 左滑入，slide-right → 右滑入，none → 无）
- [ ] **L10N-04**: AudioPicker tab 标签中文化（BGM → 背景音乐，SE → 音效）
- [ ] **L10N-05**: ExportModal 格式按钮中文化（Web → 网页版）
- [ ] **L10N-06**: 坐标/占位符本地化（Scenes.vue 的 X (px)/Y (px)、英文路径占位符改为中文示例）
- [ ] **L10N-07**: Characters.vue 占位符中文化（"表情名称（如 smile）" → 纯中文示例）

### 帮助系统 (HELP)

- [ ] **HELP-01**: HelpTip 组件（? 图标模式）：鼠标悬停显示说明气泡，支持多行文本，统一视觉风格
- [ ] **HELP-02**: 按钮/工具栏 hover title 全覆盖：所有图标按钮和工具栏操作都有中文 title 属性
- [ ] **HELP-03**: 主题编辑器帮助内容：调色盘生成器、九宫格配置、预设系统、各 token 分组的用途说明
- [ ] **HELP-04**: 导出功能帮助内容：Web vs 桌面格式区别、ZIP 压缩说明、图标选择说明
- [ ] **HELP-05**: 项目设置帮助内容：分辨率、项目名称等配置项说明
- [ ] **HELP-06**: 剧本编辑器帮助内容：转场效果、语音匹配、角色管理等操作说明
- [ ] **HELP-07**: 资源库帮助内容：格式要求、背景去除工具、字体导入说明
- [ ] **HELP-08**: 标题页/设置页设计器帮助内容：预制组件用途、拖拽定位、属性配置说明

## Out of Scope

| Feature | Reason |
|---------|--------|
| i18n 多语言框架 | 产品只面向中文用户，硬编码中文即可 |
| 引导式教程 (onboarding) | 用户反馈太强制，tooltip 更轻量 |
| 独立文档页面 | 用户不会主动阅读，tooltip 在上下文中更有效 |
| 引擎（运行时）本地化 | 引擎 UI 已全中文，本次只改编辑器 |
| 视频教程 | 超出当前范围，未来考虑 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| L10N-01 | Phase 35 | Pending |
| L10N-02 | Phase 35 | Pending |
| L10N-03 | Phase 35 | Pending |
| L10N-04 | Phase 35 | Pending |
| L10N-05 | Phase 35 | Pending |
| L10N-06 | Phase 35 | Pending |
| L10N-07 | Phase 35 | Pending |
| HELP-01 | Phase 36 | Pending |
| HELP-02 | Phase 36 | Pending |
| HELP-03 | Phase 36 | Pending |
| HELP-04 | Phase 36 | Pending |
| HELP-05 | Phase 36 | Pending |
| HELP-06 | Phase 36 | Pending |
| HELP-07 | Phase 36 | Pending |
| HELP-08 | Phase 36 | Pending |

**Coverage:**
- v0.9 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after initial definition*
