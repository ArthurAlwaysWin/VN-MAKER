# Phase 32: Desktop Game Runtime - Context

**Gathered:** 2025-07-15
**Status:** Ready for planning

<domain>

## Phase Boundary

Exported game engine runs correctly in standalone Electron context with desktop saves, window management, and correct asset loading. This phase produces the runtime templates (game-main.js, game-preload.js) and extends engine environment detection — NOT the export pipeline itself (Phase 33).

</domain>

<decisions>

## Implementation Decisions

### 游戏启动行为 (Game Launch Behavior)
- **D-01:** 默认以窗口模式启动（使用项目配置的分辨率，默认 1280×720），玩家可在游戏内设置中切换全屏/无边框
- **D-02:** 记住上次窗口状态（位置、大小、窗口模式），存储在 `userData/window-state.json`。启动时用 `screen.getDisplayMatching()` 验证保存位置是否仍在屏幕范围内，若超出则回退到默认居中
- **D-03:** 使用标准系统标题栏（非无框窗口），原生感、无额外拖拽/关闭按钮实现

### 存档目录策略 (Save Directory Strategy)
- **D-04:** 每个导出游戏在 `app.getPath('userData')` 下有独立文件夹，以游戏标题命名。路径格式：`{userData}/GalgameMaker/{游戏名}/saves/`
- **D-05:** 游戏标题中的文件系统非法字符（`:*?"<>|`）统一替换为下划线 `_`

### 游戏进程功能边界 (Game Process Scope)
- **D-06:** 不做单实例锁定，允许多开（类 RPGMaker 行为）
- **D-07:** 导出游戏不开放 DevTools，无调试快捷键入口
- **D-08:** 未捕获异常/崩溃时使用 `dialog.showErrorBox()` 显示简单弹窗，同时将错误信息写入 `userData/crash.log`

### Agent's Discretion
- window-state.json 的防抖写入间隔
- crash.log 的具体格式和轮转策略
- game-preload.js 中 IPC channel 白名单的精确列表（参考 editor preload.js）

</decisions>

<specifics>

## Specific Ideas

- game-main.js 作为字符串模板嵌入 exportDesktop.js 中（Phase 33 消费），Phase 32 先以独立文件开发和测试
- 4-way 环境检测：`window.__DESKTOP_GAME` → desktop, `window.electronAPI?.ipcRenderer` → electron editor, `window.parent !== window` → preview iframe, 默认 → web
- Desktop 环境是 HYBRID 模式：web-style 相对路径加载资源（`./assets/`）+ electron-style IPC 实现存档
- SaveManager 8 个 IPC channel 全部需实现：save-slot, load-slot, delete-slot, list-saves, save-quickslot, load-quickslot, capture-screenshot, set-window-mode
- IPC 响应统一遵循 `{success: boolean, error?: string, data?: ...}` 模式

</specifics>

<canonical_refs>

## Canonical References

### 环境检测 & 资源路径
- `.planning/research/ARCHITECTURE.md` — 4-way 环境检测设计、desktop 资源加载策略
- `src/engine/assetPath.js` — 现有 3-way 环境检测实现，需扩展为 4-way

### 存档系统 & IPC
- `src/engine/SaveManager.js` — 8 个 IPC channel 签名和响应格式（game-main.js 必须实现全部）
- `electron/main.js` §498-703 — 编辑器 IPC handler 参考实现（原子写入、截图等）
- `electron/preload.js` §4-16 — channel 白名单模式（game-preload.js 模板）

### 窗口管理
- `electron/main.js` §682-703 — 编辑器 set-window-mode handler（fullscreen/borderless/windowed 切换逻辑）

### 导出管线上下文
- `.planning/research/SUMMARY.md` — v0.8 整体架构决策、技术栈选择、14 个已知陷阱
- `.planning/research/FEATURES.md` — 功能清单和优先级

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets
- `electron/main.js` save handlers (lines 498-703): 原子写入模式（写临时文件 → rename）可直接复用到 game-main.js
- `electron/preload.js` channel whitelist: game-preload.js 使用相同模式，仅保留游戏运行时需要的 channels
- `src/engine/settingDefs.js` window-mode: 已有 windowed/fullscreen/borderless 三选项定义，游戏运行时直接复用

### Established Patterns
- IPC response pattern: `{success, error?, data?}` — 编辑器和游戏必须保持一致，SaveManager.js 依赖此格式
- 原子文件写入: `writeFileSync(tmpPath) → renameSync(tmpPath, finalPath)` — 防止断电数据丢失
- asset:// protocol: 编辑器使用 `registerSchemesAsPrivileged` + custom protocol handler — 游戏运行时 **不需要** 此机制，直接 `loadFile()` + 相对路径

### Integration Points
- `src/engine/assetPath.js`: 新增 `desktop` 分支，检测 `window.__DESKTOP_GAME`，路径返回 `./assets/` (同 web)
- `src/engine/SaveManager.js`: 无需修改 — 已通过 `window.electronAPI.ipcRenderer` 调用 IPC，game-preload.js 会暴露相同接口
- Phase 33 将消费本阶段产出的 game-main.js 和 game-preload.js 模板

</code_context>

<deferred>

## Deferred Ideas

- macOS/Linux 平台支持 — v0.9+
- ASAR 打包（代码保护） — v0.9+
- 游戏启动画面/加载动画 — 保持简单，不在 v0.8 范围
- DevTools 隐藏快捷键（制作者调试用） — 可后续版本考虑

</deferred>

---

*Phase: 32-desktop-game-runtime*
*Context gathered: 2025-07-15*
