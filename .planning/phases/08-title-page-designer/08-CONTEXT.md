# Phase 8: Title Page Designer - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

用户在"标题页"标签页中可视化设计游戏标题画面 — 在 1280×720 画布上放置 4 种预制按钮（开始游戏/继续游戏/设置/退出）、文字标签和装饰图片，自定义样式和位置，引擎正确渲染自定义布局。包含：三面板设计器（组件面板/画布/属性面板）、撤销重做、自动保存、Z-order 图层控制、TitleScreen.js schema 对齐与旧格式迁移。

不含：可配置项目分辨率（固定 1280×720）、自定义按钮逻辑、动画/过渡效果编辑、多页标题画面。

</domain>

<decisions>
## Implementation Decisions

### 装饰图片元素 (Decorative Images)
- **D-01:** 新增 `image` 元素类型到 TitleScreen.js schema — 当前只有 `text` 和 `button`，需扩展支持图片
- **D-02:** 默认自由缩放（拖拽右下角调整宽高），按住 Shift 键锁定宽高比等比缩放
- **D-03:** 初始放置时显示原始图片尺寸，用户可通过缩放调整
- **D-04:** 图片来源：通过现有 `select-asset` IPC 从资源库选择（types: `['backgrounds']`）

### 预制按钮机制 (Preset Buttons)
- **D-05:** 固定 4 个预制按钮，不支持自定义按钮：
  - 开始游戏 → action: `start` → 触发 onStart 回调
  - 继续游戏 → action: `continue` → 触发 onContinue 回调
  - 设置 → action: `settings` → 触发 onSettings 回调
  - 退出 → action: `quit` → 触发 `window.close()`
- **D-06:** 每种按钮只能放 1 个 — 放置后从组件面板灰掉（disabled 状态），删除后恢复
- **D-07:** `quit` 是新 action，需要在 TitleScreen.js 中实现

### 悬停效果 (Hover Effects)
- **D-08:** 按钮悬停效果仅支持背景色变化 — 使用 `hoverColor` 字段（TitleScreen.js 已有此字段）
- **D-09:** 不支持缩放、透明度、发光等复杂悬停动画

### 图层管理 (Z-Order)
- **D-10:** 图层控制放在属性面板中 — 选中元素后显示 ↑上移 / ↓下移 按钮
- **D-11:** 元素在 `elements[]` 数组中的索引即为渲染顺序（越后面越上层）

### 继承自先前阶段的决策
- **D-12:** 复用 DraggableElement + CanvasPreview 画布基础设施（Phase 4/5）
- **D-13:** 复用 SettingsDesigner.vue 的三面板布局模式（左:面板 / 中:画布 / 右:属性）
- **D-14:** 复用 script.js undo/redo 模式：pushState + history[] + historyIndex
- **D-15:** 复用 auto-save 模式：每次元素变更调用 updateTitleScreen() → pushState()
- **D-16:** 颜色选择用 `input[type=color]`（Phase 5 决策）
- **D-17:** 画布固定 1280×720（分辨率配置留给后续 milestone）

### Agent's Discretion
- 组件面板中预制按钮和元素的排列方式和图标样式
- 属性面板各属性字段的排列顺序
- 画布空状态的文案和视觉提示
- 工具栏的具体布局（删除/选择背景/选择BGM 等按钮排列）
- 继续游戏按钮禁用状态的编辑器内预览方式
- 旧格式迁移的具体策略（TitleScreen._renderDefault 已有 fallback）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 运行时渲染器（需 schema 对齐）
- `src/ui/TitleScreen.js` — 标题页运行时渲染，当前支持 text/button 类型，需新增 image 类型和 quit action。**INFRA-01 核心修改目标**

### 金牌参考（三面板设计器模式）
- `src/editor/views/SettingsDesigner.vue` — 完整参考：三面板布局、undo/redo watch 同步、auto-save、元素选择、属性编辑、_syncing 防反馈循环
- `src/editor/components/canvas/DraggableElement.vue` — 拖拽+缩放组件，canvasScale 缩放修正
- `src/editor/components/canvas/CanvasPreview.vue` — 1280×720 artboard + ResizeObserver 自适应缩放

### 现有空壳（将被替换）
- `src/editor/views/TitleDesigner.vue` — 当前只有占位文字，需完整重写

### Store 模式
- `src/editor/stores/script.js` — 需新增 getTitleScreen()/updateTitleScreen() 方法，参考现有 getSettingsScreen()/updateSettingsScreen()
- `src/editor/stores/assets.js` — selectAsset() 用于背景图/BGM/装饰图片选择

### 资源选择 IPC
- `electron/main.js` — select-asset handler（line ~281）：打开文件对话框，验证+复制到 assets/，返回相对路径

### 字体系统
- `src/engine/fontLoader.js` — FontFace API 加载器，标题页文字需要支持自定义字体

### 需求文档
- `.planning/REQUIREMENTS.md` — TITLE-01~TITLE-12 + INFRA-01 共 13 个需求

### 研究文档
- `.planning/research/ARCHITECTURE.md` — 集成架构、数据模型
- `.planning/research/PITFALLS.md` — 陷阱 #1：TitleScreen.js schema 对齐必须先于 UI 开发

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SettingsDesigner.vue` 三面板布局（150px 面板 / flex:1 画布 / auto 属性）→ 标题页设计器直接复用结构
- `DraggableElement.vue` 拖拽+缩放组件 → 标题页所有元素类型通用
- `CanvasPreview.vue` 1280×720 artboard → 标题页画布直接复用
- `script.js` getSettingsScreen/updateSettingsScreen → 复制为 getTitleScreen/updateTitleScreen
- `script.js` undo/redo (pushState/history[]/historyIndex) → 自动继承，无需重新实现
- `select-asset` IPC → 背景图、BGM、装饰图片选择
- `input[type=color]` 颜色选择器模式 → 按钮颜色/文字颜色编辑
- `_syncing` flag 防反馈循环模式 → watch scriptStore.data 同步时使用

### Established Patterns
- 暗色主题色板：`#1e1e1e`(bg) / `#252526`(cards) / `#007acc`(accent) / `#333`(borders)
- Pinia Composition API store + ref/computed
- `JSON.parse(JSON.stringify())` 解构 Vue Proxy
- `asset://category/filename` 自定义协议显示资源
- ResizeObserver 监听容器大小变化 → 计算 canvasScale

### Integration Points
- `src/editor/App.vue` — "标题页" tab 已存在，组件映射到 TitleDesigner.vue（空壳→重写）
- `src/editor/stores/script.js` — 新增 `data.ui.titleScreen` 读写方法
- `src/ui/TitleScreen.js` — schema 扩展（image 类型、quit action）+ 旧格式兼容
- `electron/main.js` — select-asset 已有，无需新增 IPC

### TitleScreen.js 现有数据结构
```javascript
layout = {
  background: 'path/to/bg.png',
  elements: [{
    id, type: 'text'|'button',
    x, y, anchor?,
    // text: content, fontSize, fontFamily, color, letterSpacing, textShadow
    // button: text, action, width, height, backgroundColor, border, borderRadius, hoverColor
  }]
}
```

需扩展：
- `type: 'image'` — 新增字段: `src`, `width`, `height`
- `action: 'quit'` — 新增按钮动作
- `bgm` 字段 — 标题页背景音乐路径

</code_context>

<specifics>
## Specific Ideas

- 装饰图片支持自由缩放 + Shift 锁定宽高比，初始按原尺寸显示
- 预制按钮放置后面板灰掉，不允许重复放置同类型按钮
- 退出按钮 action 为 `quit`，执行 `window.close()`
- 悬停效果仅限背景色变化（hoverColor），保持简洁
- 图层控制在属性面板中用 ↑↓ 按钮，不需要独立图层面板

</specifics>

<deferred>
## Deferred Ideas

- **可配置项目分辨率** — 用户提出需要在项目创建时设置分辨率（影响画布尺寸和所有资源）。属于基础架构改动，影响所有设计器和引擎渲染，建议作为独立 phase 或 v0.3 功能。
- **复杂悬停动画** — 缩放、透明度、发光等效果，当前仅支持 hoverColor。

</deferred>

---

*Phase: 08-title-page-designer*
*Context gathered: 2026-03-30*
