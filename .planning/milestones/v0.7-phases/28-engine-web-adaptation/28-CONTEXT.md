# Phase 28: Engine Web Adaptation - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

让游戏引擎在独立浏览器中完整运行，不依赖任何 Electron API。覆盖：环境自动检测、Web 存档系统（IndexedDB）、资源路径统一参数化。不包含：资源扫描、构建配置、导出 UI（后续阶段）。

</domain>

<decisions>
## Implementation Decisions

### Web 存档方案
- **D-01:** 使用 IndexedDB 作为 Web 模式的存档后端，保留 108 个存档槽 + 1 个快速存档，与 Electron 版完全一致的槽位数量
- **D-02:** Web 版存档不包含缩略图（`capture-screenshot` 是 Electron 专有 IPC），存档槽仅显示文字预览信息（场景名、对话文字、时间戳）

### 环境检测策略
- **D-03:** 功能检测优先 — `window.ipcRenderer` 存在 = Electron 模式，不存在则检查 iframe 上下文
- **D-04:** iframe 内通过 postMessage 握手区分编辑器预览和 itch.io 嵌入：收到 `{type: 'start'}` 消息 = 编辑器预览模式（SaveManager 禁用），超时或无握手 = itch.io/Web 独立模式（WebSaveManager 启用）

### 资源路径管理（assetPath.js 折中方案）
- **D-05:** 新建 `src/engine/assetPath.js` 模块，作为环境检测和资源路径解析的单一真相源
- **D-06:** 导出 `BASE_PATH` 常量 — Electron/预览模式为 `asset://`，Web 模式为 `./assets/`。BackgroundLayer/CharacterLayer/AudioManager 的 basePath 属性在引擎初始化时统一赋值为 `BASE_PATH`，内部代码不动
- **D-07:** 导出 `resolvePath(relativePath)` 函数 — 处理散落的硬编码 `asset://` 引用。自动跳过已经是完整 URL 的路径（http/https/data:）。用于 SettingsScreen.js（2处）、TitleScreen.js（2处）、SaveLoadScreen.js（1处）的硬编码替换
- **D-08:** TitleScreen.js 中现有的前缀判断逻辑（`asset://`/`http`/`/game/`）在改用 `resolvePath` 后可以清理，由 resolvePath 内部统一处理

### Agent's Discretion
- WebSaveManager 的内部实现细节（IndexedDB schema 设计、事务管理等）
- 环境检测的具体超时时长（postMessage 握手等待时间）
- resolvePath 函数的 edge case 处理（空字符串、undefined 等）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 引擎运行时
- `src/main.js` — 引擎入口，`init()`（Electron 模式）和 `initPreview()`（iframe 模式）两条初始化路径，basePath 赋值逻辑在此
- `src/engine/SaveManager.js` — 当前 Electron IPC 存档实现，8 个 async 方法，WebSaveManager 需保持相同接口
- `src/engine/ConfigManager.js` — 已用 localStorage，Web 兼容 ✓
- `src/engine/ReadHistory.js` — 已用 localStorage，Web 兼容 ✓
- `src/engine/fontLoader.js` — `loadAllFonts(fonts, baseUrl)` 已有 baseUrl 参数，需改用 BASE_PATH

### basePath 相关组件
- `src/ui/BackgroundLayer.js` — 构造函数接受 basePath，`this.basePath + data.image` 拼接
- `src/ui/CharacterLayer.js` — 构造函数接受 basePath，`this.basePath + data.image` 拼接
- `src/engine/AudioManager.js` — 构造函数接受 basePath，BGM/SE/Voice 均用 `this.basePath + file`

### asset:// 硬编码位置（需改用 resolvePath）
- `src/ui/SettingsScreen.js:72` — `url("asset://${safeBg}")` 设置页背景
- `src/ui/SettingsScreen.js:214` — `img.src = "asset://${safeSrc}"` 设置页图片元素
- `src/ui/TitleScreen.js:73,158` — 前缀判断 + img.src 赋值
- `src/ui/SaveLoadScreen.js:159` — `asset://saves/slot_${padded}.jpg` 存档缩略图路径

### 需求文档
- `.planning/REQUIREMENTS.md` — WEBRT-01 ~ WEBRT-05 需求定义
- `.planning/ROADMAP.md` — Phase 28 成功标准（5 条）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BackgroundLayer/CharacterLayer/AudioManager basePath 模式** — 已有参数化基础，只需统一赋值来源
- **SaveManager async 接口** — WebSaveManager 可复用完全相同的 public API（save/load/delete/getAllSlots/hasAnySave/quickSave/quickLoad/hasQuickSave）
- **ConfigManager / ReadHistory** — 纯 localStorage，零改动即可在 Web 中工作
- **`capture-screenshot` 守卫** — `if (!window.ipcRenderer) return null` 已存在，Web 模式自动跳过

### Established Patterns
- **双路径初始化** — `init()`（Electron）和 `initPreview()`（iframe），Phase 28 需加第三条路径或统一
- **构造函数 basePath 注入** — BackgroundLayer/CharacterLayer/AudioManager 在 main.js 顶层构造时传入 `/game/`
- **ipcRenderer 守卫** — `if (!window.ipcRenderer) return` 已用于 capture-screenshot 和 set-window-mode

### Integration Points
- `src/main.js` 底部的 `if (window.parent !== window)` 分支 — 需扩展为三路检测
- `new SaveManager()` 在 main.js 顶层构造 — 需根据环境选择 SaveManager 或 WebSaveManager
- `titleScreen.basePath` 和 `settingsScreen` 中的 asset:// — 需改用 resolvePath 导入

</code_context>

<specifics>
## Specific Ideas

- assetPath.js 折中方案来自用户朋友的建议：`BASE_PATH` 常量给已有 basePath 属性的组件赋值，`resolvePath()` 函数给硬编码位置使用，两套机制在同一个文件里管理，保证行为一致性
- TitleScreen.js 现有的 `startsWith('asset://') || startsWith('http') || startsWith('/game/')` 前缀判断在改用 resolvePath 后应当清理掉

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-engine-web-adaptation*
*Context gathered: 2026-04-07*
