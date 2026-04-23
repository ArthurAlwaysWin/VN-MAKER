# Requirements: Galgame Maker v1.5 UI 图片驱动体系

**Defined:** 2026-04-22
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v1.5 Requirements

本里程碑聚焦把图片素材打通为游戏 UI 的主要视觉通路。每条 requirement 都以“可配置、可预览、可运行、可导出、可回退”为完成边界。

### Dialogue Box

- [ ] **DLG-01**: 用户可以为对话框配置主框图片、名牌背景图片与至少一层装饰图片
- [ ] **DLG-02**: 用户启用对话框图片皮肤后，名牌、正文、继续指示在真实运行时中仍保持可见且不被遮挡
- [ ] **DLG-03**: 用户可以在编辑器中通过 runtime-backed 预览立即查看对话框图片效果，而不是只看本地静态模拟

### Buttons

- [x] **BTN-01**: 用户可以为 3 个非选中态按钮族配置 `normal / hover / pressed` 图片态：`game-menu-button`、`QAB`、`close-button family`
- [x] **BTN-02**: 用户可以为 2 个需要选中态的按钮族配置 `normal / hover / pressed / selected` 图片态：`page-tab / pager`、`settings-tab`
- [ ] **BTN-03**: 用户应用按钮图片皮肤后，这 5 个按钮族上的文字或图标仍保持可读、对齐稳定且可点击

### Major Screens

- [ ] **SCR-01**: 用户可以为 SaveLoad、Backlog、GameMenu、Settings 分别配置全屏背景图
- [ ] **SCR-02**: 用户可以为这 4 个 major screen 配置装饰层图片，且装饰层启用后主要交互元素仍可点击和触发
- [ ] **SCR-03**: 用户可以在编辑器中逐个预览这 4 个界面的真实运行时图片效果

### Cursor / Icons

- [ ] **CUR-01**: 用户可以为主题配置 `default / pointer` 两种光标图片；缺图或路径失效时回退到系统 cursor
- [ ] **ICO-01**: 用户可以为核心 action slots 配置主题图标：`game menu`、`QAB`、`close`、`voice-replay`；缺图时回退到默认图标

### Asset Workflow / Compatibility

- [ ] **AST-01**: 用户选取 UI 图片时，编辑器会将文件复制到 `assets/ui/`，并在项目配置中只记录项目相对路径
- [ ] **AST-02**: 用户可以导入 PNG / WebP / JPEG 作为 UI 图片资源
- [ ] **AST-03**: 用户配置的 UI 图片会被预览、运行时和导出链路一致识别，不会出现“编辑器可见、导出丢图”
- [ ] **AST-04**: 当 UI 图片缺失、路径失效或未配置时，运行时会回退到现有 CSS 外观 / 默认图标 / 系统光标，界面仍可正常使用
- [ ] **AST-05**: 旧项目中的旧路径或旧 base64 UI 图片配置仍可被读取并正常运行，不会导致项目损坏或运行时崩溃
- [ ] **AST-06**: 当用户通过 v1.5 的标准选图流程重新设置旧字段时，新值按 AST-01 写入 `assets/ui/` 并记录为项目相对路径

## v2 Requirements

延后到后续 milestone，不进入本次 roadmap。

### Theme Packaging

- **THEME-01**: 用户可以将图片化 UI 主题导入 / 导出为完整 `.gmtheme` 主题包
- **THEME-02**: 用户可以在项目之间共享包含图片资产的主题包

### Theme Scope

- **TSCP-01**: 用户可以为单个 scene 或 page 覆盖项目级主题皮肤
- **TSCP-02**: 用户可以为同一主题配置动画装饰、视差或其他动态视觉层

## Out of Scope

明确排除，防止 v1.5 范围继续膨胀。

| Feature | Reason |
|---------|--------|
| 任意 selector 注入 | 超出无代码产品定位，测试面与兼容面过宽 |
| 插件 / 扩展系统 | 属于长期自由度路线，不是本 milestone 的目标 |
| 通用 UI 组件注册 | 会把固定槽位皮肤化升级成平台化改造 |
| 社区分享 / 主题市场 | 依赖主题包体系成熟，留到后续 milestone |
| 图片压缩 / 优化管线 | 不是图片 UI 通路闭环的必要条件 |
| 编辑器内绘图 / 自由装饰画布 | 会把皮肤化 milestone 拉成新编辑器系统 |

## Traceability

Roadmap 创建后回填。每条 requirement 必须映射到且只映射到一个 phase。

| Requirement | Phase | Status |
|-------------|-------|--------|
| DLG-01 | Phase 72 | Pending |
| DLG-02 | Phase 72 | Pending |
| DLG-03 | Phase 72 | Pending |
| BTN-01 | Phase 73 | Complete |
| BTN-02 | Phase 73 | Complete |
| BTN-03 | Phase 73 | Pending |
| SCR-01 | Phase 74 | Pending |
| SCR-02 | Phase 74 | Pending |
| SCR-03 | Phase 74 | Pending |
| CUR-01 | Phase 75 | Pending |
| ICO-01 | Phase 75 | Pending |
| AST-01 | Phase 71 | Pending |
| AST-02 | Phase 71 | Pending |
| AST-03 | Phase 75 | Pending |
| AST-04 | Phase 75 | Pending |
| AST-05 | Phase 71 | Pending |
| AST-06 | Phase 71 | Pending |

**Coverage:**
- v1.5 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after v1.5 roadmap traceability mapping*
