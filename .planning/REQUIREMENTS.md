# Requirements: Galgame Maker v1.1

**Defined:** 2026-04-16
**Core Value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑

## v1.1 Requirements

UI Theme System v2 — 引擎配置化。让游戏所有 UI 界面都可通过 `script.json` 的 `ui.*` 配置来定制外观，无需修改引擎代码。

### 控件风格系统

- [x] **WIDGET-01**: 引擎从 `ui.widgetStyles` 读取控件风格配置（tab/toggle/slider/panel/button），与内置默认值深合并
- [ ] **WIDGET-02**: Tab 控件支持 5 种形状（rectangle/pill/underline/trapezoid/ribbon），由 `tab.shape` 驱动 DOM 结构和 CSS
- [ ] **WIDGET-03**: Toggle 控件支持 4 种样式（pill/radio/checkbox/button-pair），由 `toggle.style` 驱动完全不同的 DOM 结构
- [ ] **WIDGET-04**: Slider 控件的轨道颜色/填充颜色/滑块形状和颜色由 `widgetStyles.slider` 配置驱动
- [x] **WIDGET-05**: Panel 和 Button 的背景/圆角/边框/模糊效果/背景贴图由 `widgetStyles.panel` 和 `widgetStyles.button` 驱动

### 界面配置化

- [ ] **SCREEN-01**: SaveLoadScreen 新增 `setLayout(config)` 方法，可配置背景/标题文字和颜色/网格布局（行列数/间距/位置）/槽位样式/分页样式
- [ ] **SCREEN-02**: BacklogScreen 新增 `setLayout(config)` 方法，可配置背景/标题栏（标题文字/背景图/高度）/条目样式（说话人颜色/字号/文字字号/悬停效果）
- [ ] **SCREEN-03**: GameMenu 新增 `setLayout(config)` 方法，可配置位置/宽度/背景/圆角/模糊/按钮间距/各按钮文字和图标
- [ ] **SCREEN-04**: SettingsScreen 结构化模式：当 `elements` 为空但存在 `header`/`tabBar`/`contentArea` 配置时，自动将 SETTING_DEFS 按分组渲染到对应 Tab 页
- [ ] **SCREEN-05**: SettingsScreen 结构化模式的控件从 `widgetStyles` 取样式（Tab 使用 tab.shape 渲染形状，Toggle 使用 toggle.style 渲染样式，Slider 使用 slider.* 渲染外观）

### 配置传入统一

- [ ] **CONFIG-01**: `main.js` 的 `init()` 函数在 `engine.load()` 之后，从 `ui.*` 读取 saveLoadScreen/backlogScreen/gameMenu/widgetStyles 配置并通过 setLayout/setWidgetStyles 传入各组件
- [ ] **CONFIG-02**: 编辑器试玩 iframe（postMessage 协议）正确传递所有 `ui.*` 配置到引擎，使预览效果与最终游戏一致

### 名牌样式

- [ ] **NAMEPLATE-01**: DialogueBox 支持 `nameplateStyle` 配置项，inline 为默认值（保持当前行为不变）
- [ ] **NAMEPLATE-02**: floating 样式将名牌浮动定位在对话框左上角外侧（气泡形式）
- [ ] **NAMEPLATE-03**: banner 样式将名牌渲染为横跨对话框整个宽度的横幅条

### 向后兼容

- [ ] **COMPAT-01**: 未提供 `widgetStyles` 的旧项目（v1.0 及之前）保持现有外观不变，零视觉回归
- [ ] **COMPAT-02**: 所有 `setLayout(null)` 调用保持现有硬编码行为，零视觉变化

## Future Requirements

### 编辑器（P1 — 下一里程碑）

- **EDITOR-01**: 控件风格编辑器——可视化编辑 widgetStyles（形状缩略图选择 + 颜色 + 实时预览）
- **EDITOR-02**: 各界面布局编辑器——SaveLoad/Backlog/GameMenu 的结构化可视化编辑
- **EDITOR-03**: 1-2 套完整示范主题（default + wafuu），包含 tokens + widgetStyles + 各界面配置 + 贴图

### 主题包扩展（P2/P3 — 后续里程碑）

- **THEME-01**: .gmtheme 主题包格式升级，包含 widgetStyles + screens 配置
- **THEME-02**: 5 套内置主题（wafuu/modern-sky/fantasy-dark/minimal-white + default）
- **THEME-03**: Tab ribbon/trapezoid 精细 clip-path 实现

## Out of Scope

| Feature | Reason |
|---------|--------|
| 编辑器 UI 设计器标签页 | P1 范围，本里程碑只做引擎侧 |
| 主题包格式升级 | P2 范围，需要先完成引擎配置化 |
| showSpeakerPortrait 说话人头像 | 设计文档中有提及但与核心配置化无关 |
| 编辑器内预览存档/菜单/回想界面 | P1 编辑器范围 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WIDGET-01 | Phase 42 | Complete |
| WIDGET-02 | Phase 42 | Pending |
| WIDGET-03 | Phase 42 | Pending |
| WIDGET-04 | Phase 42 | Pending |
| WIDGET-05 | Phase 42 | Complete |
| SCREEN-01 | Phase 43 | Pending |
| SCREEN-02 | Phase 43 | Pending |
| SCREEN-03 | Phase 43 | Pending |
| SCREEN-04 | Phase 44 | Pending |
| SCREEN-05 | Phase 44 | Pending |
| CONFIG-01 | Phase 45 | Pending |
| CONFIG-02 | Phase 45 | Pending |
| NAMEPLATE-01 | Phase 45 | Pending |
| NAMEPLATE-02 | Phase 45 | Pending |
| NAMEPLATE-03 | Phase 45 | Pending |
| COMPAT-01 | Phase 42 | Pending |
| COMPAT-02 | Phase 43 | Pending |

**Coverage:**
- v1.1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 after initial definition*
