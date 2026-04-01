# Phase 14: Editor Test Play - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 14-editor-test-play
**Areas discussed:** 预览容器方案, 试玩起始位置, 覆盖方式, 试玩交互边界, 音频处理, 数据同步

---

## 预览容器方案

| Option | Description | Selected |
|--------|-------------|----------|
| iframe 加载 index.html | 完全隔离，CSS/JS 不冲突，引擎零修改，需 postMessage 通信 | ✓ |
| Vue 组件内 new ScriptEngine() | 直接 import 引擎类，通信简单，但需处理 CSS 隔离和 DOM 清理 | |
| BrowserView/webview | Electron 级别隔离，近似独立窗口但嵌入编辑器 | |

**User's choice:** iframe 加载 index.html
**Notes:** 用户朋友建议 postMessage 通信优于 URL query 参数（避免 iframe 重载闪烁），并强调 READY 握手协议防消息丢失。

### 通信方式（追问）

| Option | Description | Selected |
|--------|-------------|----------|
| asset:// URL + query 参数 | iframe src 带参数，引擎解析 URL 启动 | |
| postMessage 启动 | iframe 加载后编辑器发消息，引擎监听响应 | ✓ |

**User's choice:** postMessage + READY 握手
**Notes:** URL 参数每次"跳转"需重载 iframe（闪烁），postMessage 引擎已加载直接跳转。READY 握手防止引擎未初始化时消息丢失。

### 加载时机（追问）

| Option | Description | Selected |
|--------|-------------|----------|
| iframe 预加载 | 编辑器启动时加载 hidden iframe，试玩秒开 | ✓ |
| 按需加载 | 点试玩才创建 iframe，首次有延迟但省内存 | |

**User's choice:** 懒预加载（不在启动时立即加载，稍后空闲时加载）
**Notes:** galgame 引擎内存占用极小，预加载完全可接受。折中方案：懒预加载（不阻塞启动，空闲时加载）。

---

## 试玩起始位置

| Option | Description | Selected |
|--------|-------------|----------|
| 仅从当前编辑页开始 | 最常用场景，每页自包含已支持 | ✓ |
| 仅从场景开头开始 | 测试完整场景流程 | |
| 两者都支持 | 双按钮/选项 | |

**User's choice:** 仅从当前编辑页开始
**Notes:** Phase 10 D-03 每页自包含设计直接支持从任意页启动。

---

## 覆盖方式

| Option | Description | Selected |
|--------|-------------|----------|
| 全屏遮罩层 | iframe 覆盖整个编辑器，最沉浸 | |
| 画布区域内切换 | iframe 替换 PageCanvas，侧栏/Inspector 保留 | ✓ |
| 右侧分屏 | 编辑器左半屏 + 试玩右半屏 | |

**User's choice:** 画布区域内切换
**Notes:** 侧栏和 Inspector 保持可见。

### 侧栏/Inspector 状态（追问）

| Option | Description | Selected |
|--------|-------------|----------|
| 只读/禁用 | 显示但不可操作 | |
| 完全隐藏 | 最大化画布区域 | |
| 保持可用 + 只读浏览 | 可点击浏览但不可编辑 | ✓ |

**User's choice:** 保持可用 + 只读浏览（可浏览不可编辑）

---

## 试玩交互边界

| Option | Description | Selected |
|--------|-------------|----------|
| 纯播放模式 | 对话推进 + 选项点击 + 停止，无游戏菜单 | ✓ |
| 基础播放 + 核心菜单 | ESC 菜单可用但禁用存档/读档 | |
| 完整体验 | 所有菜单可用 | |

**User's choice:** 纯播放模式 + 引擎 `previewMode: true` 参数
**Notes:** 用户朋友建议引擎接受 previewMode 参数内部隐藏菜单入口，比编辑器外部拦截键盘更干净。

### 停止试玩入口（追问）

| Option | Description | Selected |
|--------|-------------|----------|
| 工具栏按钮 | CanvasToolbar "■ 停止试玩" 按钮 | |
| iframe 叠层悬浮按钮 | 游戏画面右上角半透明 × 按钮 | |
| 两者都有 | 覆盖两种注意力状态 | ✓ |

**User's choice:** 两者都有（互补非冗余）
**Notes:** 用户朋友详细分析：沉浸状态用叠层按钮，对比操作用工具栏按钮。叠层按钮应半透明、hover 才清晰。关键：叠层按钮放 iframe 外层绝对定位，引擎零感知。

---

## 音频处理

**AI 建议:** 正常播放，iframe AudioContext 天然隔离
**User 补充:** 基本同意，但需加 🔇 静音开关。场景："听到 BGM 不对 → 去资源库试听" 时两个音源同时出声。零代码用户不会意识到要先停止试玩。

**Final decision:** 正常播放 + 🔇 静音开关

---

## 数据同步

**AI 建议:** postMessage 传内存数据，不走磁盘 IO
**User 补充:** 完全同意，但补充关键细节 — 必须传 JSON 深拷贝快照而非 reactive 引用。试玩期间编辑器数据可能变化（侧栏只读浏览），引用会导致引擎运行时数据悄悄变化。

**Final decision:** postMessage 传 JSON.parse(JSON.stringify(data)) 快照

---

## Agent's Discretion

- iframe 加载的具体 URL 和引擎初始化流程适配
- postMessage 消息协议完整字段定义
- 懒预加载具体触发时机
- 只读模式实现方式
- 按钮图标和样式细节
- 叠层悬浮按钮位置和动画

## Deferred Ideas

- **游戏 UI 组件视觉美化** — 功能按钮从"功能块"升级为"设计元素"，后续 milestone
- **从场景开头/游戏开头试玩** — 后续扩展
- **试玩中实时热更新** — 后续扩展
