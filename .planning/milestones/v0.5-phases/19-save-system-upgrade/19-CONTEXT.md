# Phase 19: Save System Upgrade - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

将游戏存档系统从 localStorage 8 槽位升级为文件系统 100 槽位，包含 IPC handlers、异步 SaveManager、截图管道、asset:// 协议扩展和旧存档迁移。纯后端/基础设施层 — 不包含 UI 重写（Phase 21）。

</domain>

<decisions>
## Implementation Decisions

### 截图方案
- **D-01:** 使用 `webContents.capturePage()` 截取游戏画面，NOT html2canvas（已废弃，不兼容 asset:// 协议）
- **D-02:** 截图内容为背景+角色（隐藏对话框后截取），产生更干净的缩略图
- **D-03:** 截图时机：打开存档界面前，隐藏对话框 → capturePage → 缓存在内存；用户选择槽位后写入文件；用户取消则丢弃缓存，不写入磁盘
- **D-04:** 缩略图尺寸 320×180 JPEG quality 80（~15-30KB/张）

### 存档文件格式
- **D-05:** 每槽独立文件：`slot_NNN.json` + `slot_NNN.jpg`，存放在项目 `saves/` 目录
- **D-06:** Save JSON 包含 `version: 2` 字段，预留后续格式升级
- **D-07:** 历史记录截断为 50 条（完整历史保留在内存中）
- **D-08:** 使用现有 `atomicWrite()` 模式确保写入原子性

### 迁移策略
- **D-09:** 首次执行 `list-saves` 时 lazy 迁移旧 localStorage 8 槽存档
- **D-10:** 迁移完成后写入 `.migrated` 标记防止重复迁移
- **D-11:** 迁移时显示一次性 toast 通知："检测到旧存档，已自动迁移"

### 错误处理
- **D-12:** 存档写入失败时显示游戏内 toast 提示（如"存档失败：磁盘空间不足"），不打断游戏流程

### 预览模式
- **D-13:** 编辑器内联试玩（iframe 预览）中禁用存读档功能，按钮置灰

### 协议扩展
- **D-14:** 扩展 `asset://` 协议支持 `saves/` 前缀路径，缩略图通过 `asset://saves/slot_NNN.jpg` 加载

### Agent's Discretion
- IPC handler 具体命名和参数设计
- SaveManager 内部缓存策略
- 错误重试逻辑细节
- toast 通知的具体样式和消失时间

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有存档系统
- `src/engine/SaveManager.js` — 现有 SaveManager 类（66 行），8 slot localStorage，需重写为 async IPC
- `src/ui/SaveLoadScreen.js` — 现有 SaveLoad UI（77 行），Phase 19 不重写 UI，但需确保 API 兼容
- `src/main.js:180-200` — Save/Load 回调流程，所有调用者需改为 async/await
- `src/main.js:400-406` — `showTitle()` 中 `hasAnySave()` 调用，需改为 async

### Electron 后端
- `electron/main.js:67-74` — `atomicWrite()` 原子写入模式（复用）
- `electron/main.js:55-59` — `isInsideProject()` 路径安全检查（复用）
- `electron/main.js:614-676` — `asset://` 协议 handler（需扩展 saves/ 支持）

### 引擎交互
- `src/main.js:53-62` — `#quick-controls` 定义（Phase 20 将替换）
- `src/main.js:258-292` — ESC 优先级链（Phase 21 将重构）
- `src/engine/ConfigManager.js` — 设置存储模式参考（保留 localStorage）
- `src/engine/settingDefs.js` — 设置组件注册表（Phase 22 将扩展）

### 研究文档
- `.planning/research/SUMMARY.md` — v0.5 研究综合（截图方案、架构集成、陷阱清单）
- `.planning/research/PITFALLS.md` — 24 个陷阱，P10/P11/P12/P14/P17 与 Phase 19 直接相关

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `atomicWrite(filePath, content)` — electron/main.js:67-74, 原子写入模式可直接复用
- `isInsideProject(resolvedPath)` — electron/main.js:55-59, 路径遍历防护可复用
- `uniqueFilename()` — electron/main.js:78-88, 文件名冲突解决
- `ipcMain.handle()` 模式 — 已有 8+ IPC handler 可作为模板

### Established Patterns
- IPC handler 返回 `{ success, data?, error? }` 结构
- Electron preload 通过 `contextBridge.exposeInMainWorld` 暴露 API
- 所有文件操作使用 `fs/promises`（非 sync 版本）
- `currentProjectPath` 全局变量追踪当前打开的项目

### Integration Points
- `SaveManager` 构造函数接收 `gameId` — 需改为接收 IPC bridge
- `main.js` 中 `saveLoadScreen.onSave/onLoad` 回调 — 需改为 async
- `showTitle()` → `saveManager.hasAnySave()` — 需改为 async 并 await
- `asset://` protocol handler — 需添加 `saves/` 前缀分支
- preview BrowserWindow — 需添加 `preload: preload.mjs`（P10 fix）

</code_context>

<specifics>
## Specific Ideas

- 截图方案：引擎使用 DOM 渲染，`capturePage()` 是正确选择（用户朋友建议确认）
- 截图只包含背景+角色（隐藏对话框），更干净的缩略图
- 缓存截图仅在用户确认存档后才写入磁盘，取消时丢弃
- Toast 通知用于迁移提示和错误反馈，不打断游戏流程

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-save-system-upgrade*
*Context gathered: 2026-04-04*
