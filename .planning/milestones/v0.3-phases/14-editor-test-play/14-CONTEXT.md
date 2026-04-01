# Phase 14: Editor Test Play - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

用户可在编辑器内一键预览游戏，无需离开编辑界面。点击试玩后，画布区域切换为 iframe 内嵌的游戏引擎预览，从当前编辑页面开始播放，随时可停止返回编辑。

此阶段交付：
- 画布区域内嵌 iframe 游戏预览（替换 PageCanvas）
- 从当前编辑页面启动试玩（postMessage 通信）
- 停止试玩返回编辑器（双入口：工具栏 + 叠层按钮）
- 引擎 previewMode 支持（隐藏游戏菜单入口）
- 侧栏/Inspector 只读浏览模式

此阶段不包含：
- 完整游戏功能（存档/读档/设置菜单）
- 从场景开头或游戏开头试玩
- 试玩中实时热更新编辑内容
- 游戏 UI 组件视觉美化

</domain>

<decisions>
## Implementation Decisions

### 预览容器方案
- **D-01:** 使用 iframe 加载 index.html（引擎页面），完全隔离 CSS/JS，引擎零修改
- **D-02:** 编辑器与 iframe 通过 postMessage 双向通信
- **D-03:** READY 握手协议 — 引擎加载完成后主动发 `{type:'ready'}` 消息，编辑器收到后才发启动指令，防止消息丢失
- **D-04:** iframe 懒预加载 — 不在编辑器启动时加载，而是在用户切到游戏内容 tab 时后台加载（hidden），首次试玩时引擎已就绪，秒开无等待

### 试玩起始位置
- **D-05:** 仅支持从当前编辑页面开始试玩（Phase 10 D-03 已设计每页自包含，任意页面可独立渲染）
- **D-06:** 编辑器通过 postMessage 发送 `{type:'start', sceneId, pageIndex}` 告知引擎起始位置

### 数据同步
- **D-07:** 试玩前编辑器通过 postMessage 将 `scriptStore.data` 的 JSON 深拷贝快照发给 iframe，引擎直接使用内存数据，不走磁盘 IO
- **D-08:** 必须传快照（`JSON.parse(JSON.stringify(data))`）而非 reactive 引用 — Vue Proxy 过 structured clone 会报错，且运行时数据变化会导致难排查 bug

### 覆盖方式
- **D-09:** iframe 替换 PageEditor 的画布区域（PageCanvas 位置），侧栏（SceneTree）和 Inspector（PageInspector）保留显示
- **D-10:** 试玩期间侧栏和 Inspector 进入只读浏览模式 — 可点击查看其他页面内容，但不可编辑修改数据

### 引擎 previewMode
- **D-11:** 引擎接受 `previewMode: true` 启动参数，隐藏所有游戏内菜单入口（ESC 菜单、存档/读档等），其他行为完全一致
- **D-12:** previewMode 由 postMessage 启动指令携带，引擎内部判断，编辑器不拦截键盘事件

### 停止试玩入口
- **D-13:** 双停止入口覆盖两种注意力状态：
  - 工具栏按钮（CanvasToolbar）— 用户在编辑器 UI 操作时使用，主操作样式
  - 叠层悬浮按钮 — 用户沉浸游戏画面时使用，半透明、小尺寸、hover 才变清晰
- **D-14:** 叠层按钮由编辑器在 iframe **外层**用绝对定位叠加，引擎完全不感知此按钮，职责边界干净

### 音频处理
- **D-15:** 试玩时 BGM/SE 正常播放（iframe AudioContext 天然隔离，不与编辑器冲突）
- **D-16:** 工具栏提供 🔇 静音开关 — 覆盖"听到 BGM 不对→去资源库试听其他音频"的真实使用场景，实现成本极低

### Agent's Discretion
- iframe 加载的具体 URL 和引擎初始化流程适配细节
- postMessage 消息协议的完整字段定义
- 懒预加载的具体触发时机（requestIdleCallback / tab 切换 / 其他）
- 只读模式的实现方式（CSS pointer-events / 条件渲染 / 状态标志）
- 工具栏试玩/停止按钮的具体图标和样式
- 叠层悬浮按钮的具体位置（右上角 / 左上角）和动画

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 引擎核心
- `src/engine/ScriptEngine.js` — `startGame()`（line 86-92）、`restoreState()`（line 165-173）、`renderCurrentPage()`（line 180-200）、事件系统
- `src/engine/AudioManager.js` — BGM/SE 播放，iframe 内独立 AudioContext
- `src/engine/SaveManager.js` — 试玩模式下不需要，但需确认 previewMode 跳过初始化

### 引擎入口与 DOM 结构
- `index.html` — 引擎宿主页面，iframe 加载目标
- `src/main.js` — 引擎初始化流程（line 382-421）、DOM 结构（game-container > 4 层）、事件绑定（line 92-150）

### 编辑器核心
- `src/editor/views/PageEditor.vue` — 画布区域结构（CanvasToolbar + PageCanvas + 侧栏 + Inspector），Play 按钮放 CanvasToolbar
- `src/editor/composables/usePageEditor.js` — `selectedSceneId`、`selectedPageIndex`、`currentPage` 提供试玩起始位置
- `src/editor/App.vue` — tab 系统（line 77-91），已有 `openPreview` 按钮（line 25，独立窗口），iframe 懒预加载可在此处管理

### 编辑器数据层
- `src/editor/stores/script.js` — `scriptStore.data` 是试玩时传给 iframe 的数据源

### Phase 10 上下文
- `.planning/phases/10-page-data-schema-engine-adaptation/10-CONTEXT.md` — D-03 每页自包含设计是"从任意页试玩"的基础

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ScriptEngine.restoreState()**: 已支持跳转到任意 scene + pageIndex + dialogueIndex，试玩起始位置直接复用
- **usePageEditor composable**: 提供 selectedSceneId / selectedPageIndex / currentPage，完美对接试玩启动参数
- **CanvasToolbar**: 已有按钮样式和布局，添加 ▶/■ 按钮自然融入
- **index.html DOM 结构**: 引擎 4 层 DOM 结构已定义，iframe 直接加载

### Established Patterns
- **postMessage 通信**: Electron 应用中 iframe 通信的标准模式
- **provide/inject**: usePageEditor 通过 Symbol 提供共享状态，只读模式可在此层控制
- **事件驱动**: ScriptEngine emit → UI render，试玩在 iframe 内完全自治
- **reactive Proxy 解构**: 已知坑（Phase 3A），data 必须深拷贝后才能通过 IPC/postMessage 传递

### Integration Points
- **PageEditor.vue CanvasToolbar**: 添加试玩/停止按钮 + 静音开关
- **PageEditor.vue 画布区**: 条件渲染 PageCanvas vs iframe 容器
- **App.vue**: 管理 iframe 懒预加载生命周期
- **ScriptEngine.js**: 添加 previewMode 参数支持，隐藏菜单入口
- **src/main.js**: 添加 postMessage 监听器，接收启动指令和数据

</code_context>

<specifics>
## Specific Ideas

- 编辑→试玩→编辑的"改一改看一看"循环是核心工作流，试玩必须秒开无等待
- 叠层悬浮按钮不放引擎内部，而是编辑器绝对定位叠加 — 引擎零感知，职责边界干净
- 数据传递必须是快照而非引用 — Vue Proxy + structured clone 双重原因
- iframe READY 握手防止消息丢失是 iframe 通信的经典坑，必须做

</specifics>

<deferred>
## Deferred Ideas

- **游戏 UI 组件视觉美化** — 标题页/设置页的功能按钮组件从"功能块"升级为"设计元素"，让用户做出的游戏有设计感和美感。当前组件太像开发者工具，缺乏面向玩家的视觉品质。属于后续 milestone 范畴。
- **从场景开头/游戏开头试玩** — 当前仅支持从当前页开始，后续可扩展起始位置选项
- **试玩中实时热更新** — 编辑器修改后自动刷新引擎预览，当前需重新点击试玩

</deferred>

---

*Phase: 14-editor-test-play*
*Context gathered: 2026-04-01*
