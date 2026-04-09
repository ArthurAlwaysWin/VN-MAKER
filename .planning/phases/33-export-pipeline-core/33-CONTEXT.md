# Phase 33: Export Pipeline Core - Context

**Gathered:** 2025-07-15
**Status:** Ready for planning

<domain>

## Phase Boundary

创建 `exportDesktop.js` 模块，实现完整的 Windows 桌面游戏导出管线——从 Vite 引擎构建、资源扫描复制、模板文件填充、@electron/packager 打包到可选 ZIP 压缩。输出可直接双击运行的 .exe 游戏文件夹。不包含导出 UI（Phase 34）。

</domain>

<decisions>

## Implementation Decisions

### 模板嵌入策略 (Template Strategy)
- **D-01 (Agent):** 运行时从 `electron/game/` 读取 game-main.js 和 game-preload.js 源文件，替换 `GAME_TITLE`/`GAME_WIDTH`/`GAME_HEIGHT` 占位符后写入 staging 目录。不嵌入为字符串常量——便于维护和调试

### 缺省图标行为 (Default Icon)
- **D-02:** 内置默认图标 `public/default-game-icon.png`，用户未提供自定义 PNG 时自动使用此默认图标转换为 .ico 嵌入 .exe

### 导出产物命名 (Output Naming)
- **D-03:** 游戏标题作为输出文件夹名和 .exe 名（`{sanitizedTitle}-win32-x64/{sanitizedTitle}.exe`），复用 Phase 32 D-05 的非法字符→下划线替换策略

### 错误处理与清理 (Error Handling)
- **D-04:** 失败时清理 staging 临时目录，但保留已产出的最终输出文件夹（如有），便于用户排查问题

### Agent's Discretion
- 导出管线的具体步骤数量和进度百分比分配
- staging 目录的命名和位置（临时目录策略）
- @electron/packager 的具体配置参数（overwrite、prune 等）
- png-to-ico 转换的图标尺寸集合
- Electron 二进制缓存路径管理

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有导出管线（Phase 30 — 复用模式）
- `electron/exportGame.js` — 6 步 web 导出管线，sendProgress 回调模式，exportDesktop.js 应复用相同架构
- `tests/exportGame.test.js` — 20 个导出测试，TDD 模式参考
- `src/engine/scanAssets.js` — 纯函数资源扫描器，直接复用

### Phase 32 运行时模板（导出时嵌入）
- `electron/game/main.js` — 游戏主进程模板，368 行，含 GAME_TITLE/WIDTH/HEIGHT 占位符
- `electron/game/preload.js` — 游戏 IPC 预加载桥，27 行，8 通道白名单

### 编辑器 IPC 集成
- `electron/main.js` §792-808 — export-game IPC handler 模式（exportDesktop 需新增类似 handler）
- `src/editor/components/ExportModal.vue` — 3 态导出 UI（Phase 34 扩展）

### Vite 构建
- `vite.web.config.js` — web 引擎构建配置，输出 dist-web/

### 项目研究
- `.planning/research/SUMMARY.md` — v0.8 技术架构决策、@electron/packager 选型、14 个已知陷阱
- `.planning/research/ARCHITECTURE.md` — 导出管线架构设计

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets
- `electron/exportGame.js` exportGame(): 6 步管线 + sendProgress 回调——desktop 版应遵循相同模式
- `src/engine/scanAssets.js` scanAssets(): 纯函数资源扫描，返回 5 类资源路径字典
- fflate `zipSync()`: 已在 exportGame.js 中使用，Phase 33 复用相同 ZIP 逻辑

### Established Patterns
- Progress 报告：`sendProgress({ step: string, percent: number })` → `webContents.send('export-progress')`
- IPC handler 模式：`ipcMain.handle('export-game', ...)` + `projectPath` 服务端注入
- 文件拷贝：`fs.copyFile()` + `fs.mkdir(recursive: true)` + 跳过缺失资源并收集 warnings
- 测试钩子：`_skipBuild`、`_appRoot` 参数隔离测试

### Integration Points
- `electron/main.js`: 新增 `'export-game-desktop'` IPC handler（或扩展现有 handler 增加 format 参数）
- `package.json`: 需添加 devDependencies `@electron/packager` + `png-to-ico`
- Phase 34 将扩展 ExportModal.vue 添加 Web/Desktop 切换

</code_context>

<specifics>

## Specific Ideas

- exportDesktop.js 管线步骤预期：构建引擎 → 扫描资源 → 创建 staging 目录 → 复制引擎+资源+script.json → 填充模板(game-main.js/preload.js) → 生成 package.json → 转换图标 → 调用 @electron/packager → 可选 ZIP
- @electron/packager 的 `electronVersion` 参数应读取当前项目安装的 electron 版本（process.versions.electron 或 package.json）
- 模板填充使用简单字符串替换（`GAME_TITLE = 'My Game'` → `GAME_TITLE = '实际标题'`），无需模板引擎

</specifics>

<deferred>

## Deferred Ideas

- macOS/Linux 平台导出 — v0.9+
- ASAR 打包（代码保护） — v0.9+
- 资源压缩优化（图片压缩、音频转码） — v0.9+
- 增量导出（只导出变更资源） — 复杂度高
- 自动更新机制 — v1.0+

</deferred>

---

*Phase: 33-export-pipeline-core*
*Context gathered: 2025-07-15*
