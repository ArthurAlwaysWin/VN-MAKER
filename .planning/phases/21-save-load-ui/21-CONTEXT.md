# Phase 21: Save/Load UI - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

全屏替换式存读档界面 — 重写现有 SaveLoadScreen 从 8 槽位升级为 108 槽位（3×3 网格 × 12 页），支持缩略图卡片预览、页码导航、内联覆盖/删除确认、ESC 栈式关闭、上下文感知返回。不包含确认开关设置项（推迟到后续版本）和新存档格式变更。

</domain>

<decisions>
## Implementation Decisions

### 网格布局
- **D-01:** 3×3 网格 = 每页 9 槽位，12 页共 108 槽位（原需求 5×2×10=100，调整为更宽敞的 3×3 布局）
- **D-02:** 横向卡片布局：缩略图在左，文字信息在右（保持现有 SaveLoadScreen 风格）
- **D-03:** 空槽位显示淡色虚线框 + "— 空 —" 文字居中（现有风格延续）

### 页码导航
- **D-04:** 底部横排数字标签（1-12），当前页紫色高亮底色 rgba(180,160,255,0.9)
- **D-05:** 支持左右箭头键翻页（← 上一页 / → 下一页）
- **D-06:** 点击页码标签立即切换，无翻页动画

### 覆盖/删除确认
- **D-07:** 覆盖存档使用内联卡片变换：原内容淡出，显示"确定覆盖?" + 确认/取消按钮，不弹窗
- **D-08:** 删除存档使用同样的内联卡片变换确认方式
- **D-09:** 确认开关设置项（settingDefs 扩展）推迟到后续版本，本阶段默认始终弹确认

### 上下文感知返回
- **D-10:** show(mode, source) 接口，source = 'bar' | 'menu' | 'title'
- **D-11:** 关闭时根据 source 返回：bar → 继续游戏，menu → 重新打开 GameMenu，title → 返回标题页
- **D-12:** ESC 键关闭行为与"返回"按钮行为一致（均根据 source 路由）

### 存档/读档模式
- **D-13:** 无模式切换功能 — 入口决定模式（从"存档"按钮进入 = 存档模式，从"读档"按钮进入 = 读档模式）
- **D-14:** 标题栏左侧显示当前模式名称，存档 = 紫色文字，读档 = 蓝色文字
- **D-15:** 标题栏右侧"返回"按钮（保持现有布局）

### 卡片内容
- **D-16:** 已占用槽位显示：缩略图（320×180）+ 存档序号 + 对话文字预览（2行截断）+ 保存时间
- **D-17:** 删除按钮在卡片右上角，hover 时显示（保持现有交互模式）
- **D-18:** 存档模式下点击已占用槽位 → 触发覆盖确认流程；点击空槽位 → 直接存档
- **D-19:** 读档模式下点击已占用槽位 → 直接加载；点击空槽位 → 无反应（视觉上灰化不可点击）

### Agent's Discretion
- 卡片 hover 动画细节和过渡时间
- 确认按钮的具体颜色和尺寸
- 页码标签的间距和字号
- 翻页时内容切换的过渡效果（有无淡入淡出）
- 读档模式下空槽位的具体灰化样式

### Deferred: 确认开关体系
用户提到业界做法：设置页中允许玩家关闭覆盖/删除/加载/返回标题等操作的确认提示。本阶段不实现，记录为后续版本需求。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有存读档系统
- `src/ui/SaveLoadScreen.js` — 现有 116 行实现，show(mode)/hide/_render 模式，8 槽位 4 列网格
- `src/engine/SaveManager.js` — 异步 SaveManager，getAllSlots()/save()/load()/delete() API
- `src/main.js:227-260` — saveLoadScreen 回调（onSave/onLoad/onDelete）
- `src/main.js:271-311` — 各入口打开 SaveLoadScreen 的代码（gameMenu、quickActionBar）
- `src/main.js:346-360` — ESC 优先级链（SaveLoad 最高优先级）
- `src/style.css:426-580` — 现有 `.save-*` CSS 选择器（~30 条）

### Phase 19 基础设施
- `.planning/phases/19-save-system-upgrade/19-CONTEXT.md` — 存档后端决策（D-01~D-14）
- `electron/main.js` — save-slot/load-slot/delete-slot/list-saves/capture-screenshot IPC handlers

### Phase 20 快捷栏
- `.planning/phases/20-quick-action-bar/20-CONTEXT.md` — D-16: 存档/读档按钮打开 SaveLoadScreen

### UI 规范
- `.planning/phases/20-quick-action-bar/20-UI-SPEC.md` — 颜色令牌、字号、间距参考（Phase 20 已建立）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SaveLoadScreen.js` — 现有类结构（constructor/show/hide/_render），需重写 _render() 并扩展 show() 签名
- `SaveManager.getAllSlots()` — 已返回所有槽位数据（slot, date, previewText, hasThumbnail）
- `asset://saves/slot_NNN.jpg` — 缩略图 URL 协议已就绪（Phase 19）
- `showToast()` — main.js:73 全局 toast 函数可复用
- `captureGameScreenshot()` — main.js:89 截图函数已就绪

### Established Patterns
- 所有覆盖层 UI 类遵循 `el, show(), hide(), _render()` 模式（GameMenu, BacklogScreen, SettingsScreen, SaveLoadScreen）
- 回调通信模式：`screen.onXxx = () => ...`
- CSS 命名：`#screen-id` + `.screen-class` + BEM 风格子元素
- ESC 优先级链：if/else 检查各覆盖层 `hidden` 状态

### Integration Points
- `main.js` saveLoadScreen 实例化和回调（~14 处引用）
- `main.js` ESC 处理链（已有 SaveLoad 最高优先级位）
- `main.js` 右键菜单处理（已有 SaveLoad 检查）
- QuickActionBar callbacks: `bar.onSave` / `bar.onLoad`
- GameMenu callbacks: `gameMenu.onSave` / `gameMenu.onLoad`
- TitleScreen: `titleScreen.onContinue` 打开读档

</code_context>

<specifics>
## Specific Ideas

- 用户强调：存档和读档是独立入口，不需要切换模式（"我玩了很多视觉小说游戏，几乎没有切换存档读档模式的"）
- 存档标题颜色区分：存档=紫色，读档=蓝色，帮助用户识别当前模式
- 确认体系未来方向：设置页中允许玩家关闭各类操作确认（覆盖/删除/加载/返回标题）

</specifics>

<deferred>
## Deferred Ideas

- **确认开关设置体系** — 在设置页中添加开关让玩家关闭覆盖存档、删除存档、加载存档、返回标题页等操作的确认提示。涉及 settingDefs 扩展和 ConfigManager。推迟到 UI 打磨版本。

</deferred>

---

*Phase: 21-save-load-ui*
*Context gathered: 2026-04-05*
