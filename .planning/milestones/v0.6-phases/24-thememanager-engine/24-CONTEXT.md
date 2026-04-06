# Phase 24: ThemeManager Engine - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

引擎侧 ThemeManager 模块：从 `script.json` 的 `ui.theme` 读取主题数据，启动时自动将 `--gm-*` CSS 自定义属性注入到 `#game-container`，支持 postMessage 接收编辑器实时主题更新，以及一键重置到默认值。

不包含：九宫格图片系统（Phase 25）、可视化主题编辑器 UI（Phase 26）、主题预设/导出（Phase 27）。编辑器侧主题发送逻辑属 Phase 26 范畴。

</domain>

<decisions>
## Implementation Decisions

### 数据模型
- **D-01:** `ui.theme` 采用嵌套结构：`{ tokens: { ... }, nineSlice: { ... } }`。`tokens` 子对象稀疏存储——只存用户覆盖的 token，未覆盖的由 `DEFAULT_TOKENS` 提供默认值。注入时 `{ ...DEFAULT_TOKENS, ...ui.theme.tokens }` 合并。
- **D-02:** `nineSlice` 子对象预留给 Phase 25，本阶段不实现但数据结构中保留位置。
- **D-03:** 新项目 `ui.theme` 初始值为 `null` 或不存在——ThemeManager 检测后直接使用全部 DEFAULT_TOKENS。

### 重置行为
- **D-04:** 重置操作只清 `ui.theme.tokens`（设为 `{}` 或删除），不影响未来 `nineSlice` 等字段。
- **D-05:** 重置不弹确认对话框——直接执行并推送撤销记录（pushState），用户可 Ctrl+Z 回退。
- **D-06:** 重置后 ThemeManager 重新注入 DEFAULT_TOKENS 全量值，CSS 立即恢复原始外观。

### 初始化时机
- **D-07:** ThemeManager 以独立模块 `src/engine/ThemeManager.js` 存在，导出 `applyTheme(container, themeData)` 和 `resetTheme(container)` 纯函数。
- **D-08:** 在 `init()` 中，ThemeManager 注入应在 `applyGlobalStyle()` 之前执行——先设主题色，字体设置（Phase 17）可叠加覆盖主题字体，符合 Phase 23 D-01 三层优先级。
- **D-09:** `initPreview()` 同理——在 `start` 消息处理中，先 applyTheme 再 applyGlobalStyle。

### 编辑器预览通信
- **D-10:** 新增 `update-theme` postMessage 类型，整包替换策略：`{ type: 'update-theme', theme: { tokens: {...} } }`。引擎收到后重新执行 applyTheme，41 个 token 全量重注入（量小，无需 diff）。
- **D-11:** Phase 24 只在引擎侧 `initPreview()` 的 message handler 添加 `update-theme` case。编辑器侧发送逻辑留到 Phase 26 主题设计器。
- **D-12:** 当前 `start` 消息已传递完整 `script` 数据（含 `ui.theme`），预览启动时主题自动通过 applyTheme 生效，无需额外处理。

### 编辑器 Store 集成
- **D-13:** 在 `script.js` store 中添加 `getTheme()` / `updateTheme()` 方法，与 `getSettingsScreen()` / `updateSettingsScreen()` 模式一致——享有自动保存和撤销/重做（ENG-02）。

### Agent's Discretion
- applyTheme 内部是否需要先清除旧 token 再注入新 token（或直接覆盖即可）
- ThemeManager 是否需要缓存当前主题状态用于比较
- resetTheme 内部实现细节（removeProperty vs setProperty 回默认值）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 研究文档
- `.planning/research/SUMMARY.md` — v0.6 主题系统研究摘要，推荐架构和关键决策
- `.planning/research/ARCHITECTURE.md` — 主题系统集成架构：数据流、组件边界、Token 注入模型
- `.planning/research/PITFALLS.md` — 17 个陷阱及防护方案（P1: 内联样式覆盖、P2: cssText 重置 对本阶段关键）

### 前序阶段
- `.planning/phases/23-token-foundation/23-CONTEXT.md` — Phase 23 Token 决策，D-01 字体三层优先级、D-04 元素自定义 > Token > fallback
- `.planning/phases/23-token-foundation/23-02-SUMMARY.md` — JS 内联样式迁移结果

### 需求文档
- `.planning/REQUIREMENTS.md` — ENG-01, ENG-02, ENG-03 为本阶段需求

### 关键源码
- `src/engine/tokens.js` — DEFAULT_TOKENS 常量（41 个 token，73 行）
- `src/main.js:730-860` — init() 和 initPreview() 流程，postMessage handler
- `src/editor/stores/script.js:58-111` — ui.settingsScreen / ui.titleScreen / ui.dialogueBox store 模式（复用模式参考）
- `src/editor/composables/usePageEditor.js:67-95` — postMessage 发送逻辑（start/stop/mute）
- `src/style.css` — 142 处 `var(--gm-*)` CSS 消费点

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **DEFAULT_TOKENS** (`src/engine/tokens.js`): 完整的 41 token 词汇表，applyTheme 直接合并使用
- **postMessage 协议** (`src/main.js:784-849`): 已有 start/stop/mute 三种消息类型，新增 update-theme 只需加一个 case
- **script store 模式** (`src/editor/stores/script.js`): getX() / updateX() + pushState() 模式直接复用

### Established Patterns
- **CSS var 注入**: `element.style.setProperty('--var', value)` 在 SettingsScreen.js 和 main.js 中已使用
- **store 数据初始化**: `data.value.ui ??= {}; data.value.ui.xxx ??= defaultValue` 模式
- **iframe 通信**: JSON.parse(JSON.stringify()) 深拷贝去除 Vue Proxy 后 postMessage

### Integration Points
- **`#game-container`**: Token CSS 变量注入目标元素
- **`init()` 流程 (main.js:730+)**: ThemeManager 注入插入点在 applyGlobalStyle 之前
- **`initPreview()` 流程 (main.js:770+)**: start 消息中调用 applyTheme；新增 update-theme handler
- **`ui.theme` in script.json**: 与 ui.titleScreen / ui.settingsScreen 同级的数据位置

</code_context>

<specifics>
## Specific Ideas

- 继承 Phase 23 设计哲学：主题管"皮肤"（颜色/图片/圆角），内容层管"创作意图"（字体/文字/布局）
- ThemeManager.js 设计为纯函数模块（非类），便于引擎和编辑器双端复用
- 预览启动自动带主题：start 消息传递 script 对象时已含 ui.theme，applyTheme 在 start handler 中调用

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-thememanager-engine*
*Context gathered: 2026-04-06*
