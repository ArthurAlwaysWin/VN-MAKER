# Phase 20: Quick Action Bar - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

将现有 4 按钮 `#quick-controls`（右上角悬浮）替换为 8 按钮 QuickActionBar，嵌入对话框内部底部。新增快速存档/快速读档功能（独立隐藏槽位）。不包含 Save/Load UI 重设计（Phase 21）和 Skip 完整实现（Phase 22）。

</domain>

<decisions>
## Implementation Decisions

### 按钮栏位置 & 可见性
- **D-01:** 嵌入对话框 DOM 内部底部，作为 DialogueBox 的子元素，自动跟随对话框显示/隐藏
- **D-02:** 对话框可见时按钮栏始终可见（不再需要 hover 才显示）

### 按钮配置（8 个）
- **D-03:** 8 个按钮，顺序：自动 / 快进 / 回想 / 存档 / 读档 / 快存 / 快读 / 设置
- **D-04:** 所有 tooltip 使用简体中文（不用日文汉字）
- **D-05:** 原需求 BAR-01 从 6 按钮扩展为 8 按钮，快存/快读从"推迟"提前到本阶段

### 图标方案
- **D-06:** 纯图标按钮，无文字标签
- **D-07:** 鼠标悬停显示简体中文 tooltip（自动/快进/回想/存档/读档/快存/快读/设置）
- **D-08:** 使用 Lucide 图标库的 SVG，直接内联复制 8 个所需图标（不装 npm 包）
- **D-09:** 用户自定义图标推迟到 UI 美化里程碑

### 快速存档/快速读档
- **D-10:** 使用独立隐藏槽位 `quicksave.json` + `quicksave.jpg`，不在存档页面中显示
- **D-11:** 每次快速存档自动覆盖上一次（只保留一个快存位）
- **D-12:** 快速读档直接加载 quicksave 槽位，无需打开界面
- **D-13:** 游戏开始时检查 quicksave 是否存在，据此设置快读按钮初始启用/灰化状态
- **D-14:** 快存成功/快读成功时屏幕左下角显示 toast 提示（如"快速存档完成"）
- **D-15:** 无快速存档时快读按钮灰化（disabled），不可点击

### 存档/读档按钮行为
- **D-16:** 存档按钮 → 打开 SaveLoadScreen（save mode），读档按钮 → 打开 SaveLoadScreen（load mode）

### 架构
- **D-17:** 提取为独立 `src/ui/QuickActionBar.js` UI 类，遵循 GameMenu/BacklogScreen 模式（el, show, hide, _render）
- **D-18:** Auto/Skip 状态逻辑保留在 main.js，QuickActionBar 通过回调通知 main.js
- **D-19:** 通信方式：回调模式（bar.onAuto = () => ..., bar.onSave = () => ... 等），与 GameMenu 一致
- **D-20:** main.js 通过 `bar.setAutoActive(bool)` / `bar.setSkipActive(bool)` / `bar.setQuickLoadEnabled(bool)` 方法更新按钮状态

### 键盘快捷键
- **D-21:** F5 = 快速存档，F9 = 快速读档（业界标准）
- **D-22:** 保留现有快捷键：A=自动，S=快进，L=回想，ESC=关闭覆盖层/切换对话框

### 激活状态指示
- **D-23:** 自动/快进按钮激活时显示高亮样式（图标颜色变化，如紫色高亮）
- **D-24:** 快读按钮灰化时降低透明度 + cursor: not-allowed

### Agent's Discretion
- Lucide 图标的具体选择（每个按钮对应哪个 Lucide icon）
- Toast 通知的具体样式、位置、消失时间
- 按钮栏内的间距、图标尺寸等细节
- QuickActionBar 构造函数参数设计

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有快捷按钮（将被替换）
- `src/main.js:53-62` — 现有 `#quick-controls` 创建（4 按钮，右上角）
- `src/main.js:305-323` — 快捷按钮点击事件处理
- `src/main.js:438-511` — Auto/Skip 模式完整实现（toggleAuto, toggleSkip, startAutoTimer, stopAuto, stopSkip, updateQuickBtnStates）
- `src/main.js:506-511` — `updateQuickBtnStates()` 更新按钮 active 样式
- `src/style.css:1084-1125` — `#quick-controls` 样式（将被替换）

### 对话框集成点
- `src/ui/DialogueBox.js` — 按钮栏将嵌入此组件 DOM 内部
- `src/main.js:338-346` — ESC 切换对话框可见性时同时切换 quickControls
- `src/main.js:395-414` — 右键切换对话框时同时切换 quickControls
- `src/main.js:89-112` — 截屏时隐藏/恢复 quickControls

### UI 类模式参考
- `src/ui/GameMenu.js` — 回调模式参考（onSave, onLoad, onBacklog...）
- `src/ui/BacklogScreen.js` — show/hide 模式参考
- `src/ui/SaveLoadScreen.js` — 存读档交互参考

### 存档系统
- `electron/main.js:586+` — IPC save-slot/load-slot handlers（需新增 quicksave 支持）
- `src/engine/SaveManager.js` — SaveManager async API（需新增 quickSave/quickLoad 方法）

### 覆盖层同步
- `src/main.js:326-333` — ESC 优先级链（按钮栏随对话框隐藏）
- `src/main.js:171-176` — 选择页面隐藏对话框（按钮栏自动隐藏）

### Z-index 层级
- dialogue-layer: 3, ui-overlay: 10, quick-controls: 15(将移除), game-menu: 40, overlays: 200

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `captureGameScreenshot()` — main.js:89-112, 截屏逻辑可复用于快存
- `SaveManager.save()/load()/delete()` — 异步存档 API 可扩展支持 quicksave 槽位
- `atomicWrite()` — electron/main.js:67-74, 原子写入可复用
- `.active` CSS class — 已有激活状态样式模式

### Established Patterns
- UI 类：constructor(container) → this.el → show()/hide() → callback props
- IPC：`{ success, data?, error? }` 返回结构
- DOM：hidden/visible class 切换 + requestAnimationFrame

### Integration Points
- DialogueBox.js 需要接受 QuickActionBar 作为子组件（或在 main.js 中 appendChild）
- main.js 的 quickControls 引用全部替换为 QuickActionBar 实例
- ESC/右键 handler 中 quickControls.style.display 逻辑简化（嵌入对话框后自动同步）
- 截屏函数中的 quickControls 隐藏逻辑可能需要调整

</code_context>

<specifics>
## Specific Ideas

- 嵌入对话框底部后，BAR-04（同步隐藏）自动满足 — 无需额外逻辑
- Toast 通知可用简单 div + CSS animation（fadeIn → hold → fadeOut），不需要库
- quicksave 文件放在 saves/ 目录但 list-saves IPC 排除它（不在存档页面显示）
- F5/F9 快捷键加入现有 keydown handler

</specifics>

<deferred>
## Deferred Ideas

- 用户自定义按钮图标（图片上传，需透明背景）→ UI 美化里程碑
- 快捷按钮编辑器自定义（图片/颜色/位置）→ UI 美化里程碑
- Ctrl 按住持续快进 → 后续版本
- "跳到下一个选择" 模式 → 后续版本

</deferred>

---

*Phase: 20-quick-action-bar*
*Context gathered: 2026-04-05*
