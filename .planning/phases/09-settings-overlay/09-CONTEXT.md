# Phase 9: Settings Overlay - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

设置页从全屏替换模式改为全屏叠加层模式 — 设置页仍然是完整的全屏页面体验，但渲染为叠加层（z-index overlay），游戏画面在下方通过半透明背景+模糊效果隐约可见，带右侧滑入/滑出过渡动画。仅修改引擎运行时代码（SettingsScreen.js + style.css + main.js），编辑器 SettingsDesigner 无需改动。

不含：侧边面板模式、编辑器设计器改动、自定义布局数据迁移、可配置滑入方向（deferred）。

</domain>

<decisions>
## Implementation Decisions

### 叠加层形态 (Overlay Form)
- **D-01:** 全屏叠加层（`inset: 0`）— 设置页仍然覆盖整个游戏画面区域，但背景从不透明(95%)改为半透明+模糊，游戏画面可透视。不是侧边面板或居中弹窗。
- **D-02:** 自定义布局完全兼容 — 容器大小不变（仍然 inset: 0），所有绝对定位数据无需迁移，设计器预览无需改变画布尺寸。

### 过渡动画 (Transition Animation)
- **D-03:** 从右侧滑入 — 使用 `translateX(100%)` → `translateX(0)` + `opacity` 组合过渡动画，cubic-bezier 缓动函数，约 0.35-0.4s 时长
- **D-04:** 关闭时反向滑出 — `translateX(0)` → `translateX(100%)` 配合 opacity 淡出

### 背景处理 (Backdrop)
- **D-05:** 双模式背景 — 有自定义背景图时：背景图以半透明方式显示（opacity < 1），游戏隐约可见；无自定义背景图时：使用半透明深色遮罩 + `backdrop-filter: blur()` 模糊效果
- **D-06:** 需求 OVERLAY-08（模糊效果）通过 `backdrop-filter: blur()` 实现

### 关闭交互 (Dismiss Controls)
- **D-07:** 栈式层级管理 — 关闭设置叠加层后，返回上一层页面（游戏菜单/标题页/游戏画面），不做任何额外跳转
- **D-08:** 打开设置时不关闭游戏菜单 — 设置叠加层直接盖在游戏菜单上方（z-index 高于游戏菜单的 40）。当前实现中 `gameMenu.hide()` 需移除
- **D-09:** 关闭方式：ESC 键 + × 关闭按钮（自定义布局中的 action:'close' 按钮）。ESC 优先级：设置叠加层 > 游戏菜单
- **D-10:** 不支持点击遮罩关闭 — 全屏叠加层模式下无明显遮罩区域可点击，OVERLAY-07 需求移除

### Agent's Discretion
- 过渡动画的精确 timing function 和时长
- 半透明背景的具体 opacity 值（建议 0.7-0.85 范围）
- 模糊效果的 blur 半径（建议 6-10px）
- 默认布局在叠加层模式下的视觉微调
- z-index 的具体数值（需高于游戏菜单 40，低于或等于 save/load 200）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 核心修改目标
- `src/ui/SettingsScreen.js` — 设置页运行时渲染器，show()/hide() 方法需改为滑入/滑出，背景处理需改为双模式
- `src/style.css` — `#settings-screen` CSS 需从全屏不透明改为全屏半透明叠加层 + translateX 过渡动画
- `src/main.js` — ESC 键处理优先级需改为：设置叠加层 > 游戏菜单；gameMenu.onSettings 不再调用 gameMenu.hide()

### 参考实现（现有 overlay 模式）
- `src/ui/GameMenu.js` — 游戏菜单 overlay 模式参考（z-index: 40, show/hide 类切换）
- `src/ui/SettingsScreen.js:35-48` — 现有 show/hide 实现，需改造
- `src/style.css` 中 `#settings-screen` 相关 CSS — 现有全屏覆盖样式，需改为半透明+滑入

### Z-Index 体系
- `#game-menu` z-index: 40 — 设置叠加层必须高于此值
- `#settings-screen` 当前 z-index: 200 — 与 save/load 相同，可保持或调整
- `#save-load-screen` z-index: 200, `#backlog-screen` z-index: 200 — 参考其他全屏页面

### 数据结构（不变）
- `src/editor/stores/script.js` — `data.ui.settingsScreen` 读写方法，叠加层不改变数据格式
- `src/engine/settingDefs.js` — SETTING_DEFS 注册表，设置组件定义不变

### 需求文档
- `.planning/REQUIREMENTS.md` — OVERLAY-01~08（注意 OVERLAY-07 已移除）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SettingsScreen.js` show/hide 类切换 + requestAnimationFrame 模式 → 保留并扩展为 translateX 过渡
- `#settings-screen.hidden / .visible` CSS 类 → 保留类名，改变过渡属性
- `sanitizeCssValue()` 内联样式安全函数 → 继续使用
- 自定义/默认双模式渲染 → 完全保留，仅改变容器视觉样式

### Established Patterns
- 所有 UI 层用 `position: absolute; inset: 0` + z-index 分层
- show: `classList.remove('hidden') → rAF → classList.add('visible')`
- hide: `classList.remove('visible') → classList.add('hidden')`
- 现有过渡全部用 opacity（0.3s ease），本次是首个 translateX 过渡

### Integration Points
- `src/main.js:253` — `gameMenu.onSettings` 回调：当前调用 `gameMenu.hide()` + `settingsScreen.show()`，需移除 `gameMenu.hide()`
- `src/main.js:288-293` — ESC 键处理：需增加设置叠加层优先级判断
- `SettingsScreen.js` — 需添加 `isVisible` getter，供 ESC 键处理判断
- 标题页 "设置" 按钮 → 调用 `settingsScreen.show()`，已有此连接

### Z-Index 现状
| 元素 | 当前 z-index |
|------|-------------|
| #background-layer | 1 |
| #character-layer | 2 |
| #dialogue-layer | 3 |
| #quick-controls | 5 |
| #ui-overlay | 10 |
| #game-menu | 40 |
| #title-screen | 100 |
| #settings-screen | 200 |
| #save-load-screen | 200 |
| #backlog-screen | 200 |

</code_context>

<specifics>
## Specific Ideas

- 全屏叠加层体验 — 不是侧边面板或弹窗，而是覆盖整个画面的完整设置页面，但背景透明化让游戏隐约可见
- 栈式层级 — 关闭设置就是移除最顶层，下面是什么就显示什么，无需额外逻辑判断
- 游戏菜单不关闭 — 设置直接盖在游戏菜单上方，关闭设置后菜单仍在
- 右侧滑入动画是引擎中的首个 translateX 过渡，建议配合 opacity 做组合动画确保视觉流畅

</specifics>

<deferred>
## Deferred Ideas

- **可配置滑入方向** — 已在 REQUIREMENTS.md Future Requirements 中记录，允许用户自定义设置页滑入方向（从右/从下/从左），当前固定为右侧滑入

</deferred>

---

*Phase: 09-settings-overlay*
*Context gathered: 2026-03-31*
