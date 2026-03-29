# Phase 6: Asset Library Foundation - Context

**Gathered:** 2025-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

资源管理后端基础设施：文件导入验证、命名冲突自动解决、自定义字体双进程加载、IPC 处理器实现。
不含 UI 组件（Phase 7 负责），不含标题页设计器（Phase 8），不含设置叠加层（Phase 9）。

</domain>

<decisions>
## Implementation Decisions

### 验证失败反馈 (Validation Error Feedback)
- **D-01:** 单文件导入失败时，在上传按钮下方显示红色内联提示："该资产不支持此文件格式，请上传对应的文件格式"，并列出该分类支持的格式列表
- **D-02:** 批量导入时跳过无效文件，导入所有有效文件，然后列出导入失败的文件名
- **D-03:** 格式验证使用 magic bytes + 扩展名白名单双重检查（PNG/JPG/WEBP, MP3/OGG/WAV, TTF/OTF/WOFF/WOFF2）

### 字体加载策略 (Font Loading Strategy)
- **D-04:** 项目打开时一次性加载所有自定义字体（FontFace API），确保字体下拉和预览立即可用
- **D-05:** 字体文件损坏（FontFace 加载失败）时：跳过该字体 + 红字提示"XX.ttf 加载失败" + 弹窗询问用户是否删除损坏字体文件，其他字体正常加载
- **D-06:** 新导入的字体立即热加载到当前编辑器窗口，无需重新打开项目

### 字体目录与旧项目兼容 (Font Directory & Migration)
- **D-07:** 新建项目自带 `assets/fonts/` 目录（与 backgrounds/characters/audio/ui 并列）
- **D-08:** 旧项目打开时自动创建 `assets/fonts/` 目录（无感迁移，无需用户操作）

### Agent's Discretion
- Auto-naming 具体编号算法（扫描目标目录已有文件，找最大编号+1）
- Magic bytes 签名表的具体实现细节（12 种格式签名）
- fontLoader.js 的模块结构和错误处理内部实现
- IPC 处理器的具体参数和返回值格式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有 IPC 模式
- `electron/main.js` — 13 个现有 IPC 处理器，遵循 `ipcMain.handle` + `{success, error}` 返回模式
- `electron/preload.js` — 暴露 `window.ipcRenderer.{send, invoke, on}` 三个方法

### Store 模式
- `src/editor/stores/project.js` — Composition API Pinia store 参考：ref/computed + IPC 封装 + Proxy 解构
- `src/editor/stores/script.js` — 撤销/重做 JSON 快照模式、`_skipWatch` 防反馈循环

### 资源管理现有代码
- `src/editor/views/Assets.vue` — 当前资源上传模式：File → ArrayBuffer → Uint8Array → plain Array
- `electron/main.js` `upload-asset` handler — 当前资源写入逻辑（缺少格式验证，需增强）
- `electron/main.js` `create-project` handler — 项目目录结构创建（需添加 fonts/）

### 字体相关
- `src/editor/views/SettingsDesigner.vue` lines 150-156 — 硬编码字体下拉框，需改为动态
- `src/editor/settingDefs.js` — `DEFAULT_SETTING_STYLE.fontFamily` 和 `DEFAULT_LABEL_STYLE.fontFamily`

### 安全模式
- `electron/main.js` `isInsideProject()` — 路径遍历防护函数，所有新 IPC 必须调用
- `electron/main.js` `asset://` protocol handler — 自定义协议安全检查参考

### 研究文档
- `.planning/research/STACK.md` — FontFace API 用法、magic bytes 签名表、零依赖策略
- `.planning/research/ARCHITECTURE.md` — 集成架构、数据模型、组件映射
- `.planning/research/PITFALLS.md` — 11 个陷阱及预防策略（#1 schema mismatch, #2 font dual-process, #3 Proxy leak）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `upload-asset` IPC handler: 已有文件写入逻辑，可增强添加 magic bytes 验证
- `isInsideProject()` 安全检查函数：所有新 IPC handler 复用
- `getMainWindow()` 辅助函数：dialog 弹窗父窗口获取
- `atomicWrite()` 函数：可用于安全写入资源元数据
- `JSON.parse(JSON.stringify())` Proxy 解构模式：project.js 和 script.js 已验证可用

### Established Patterns
- IPC handler: `ipcMain.handle(name, async (event, args) => { ... return {success, ...} })`
- Pinia store: Composition API + `ref()` + `computed()` + async IPC wrapper
- 文件操作: `fs.promises` (import from 'node:fs/promises')
- 安全: 所有文件操作前检查 `isInsideProject()`

### Integration Points
- `create-project` handler: 添加 `assets/fonts/` 目录创建
- `load-project` handler: 打开旧项目时检测并创建缺失的 `fonts/` 目录
- `SettingsDesigner.vue` 字体下拉: 从硬编码改为读取 asset store 的字体列表（Phase 7 UI 工作，但 Phase 6 需提供数据源）
- `select-asset` IPC: SettingsDesigner.vue 已引用但未实现 — **必须在本阶段实现**

### Critical Finding
- `select-asset` IPC handler 在 SettingsDesigner.vue lines 508, 525 被调用但 **electron/main.js 中不存在** — Phase 6 必须实现

</code_context>

<specifics>
## Specific Ideas

- 红色内联错误提示位于上传按钮正下方一行，不用 toast 浮动通知
- 批量导入失败时要列出具体失败的文件名，不只是数量
- 字体损坏弹窗要主动询问用户是否删除，不是默默跳过
- 字体热加载要即时生效，用户导入后立刻在下拉菜单中看到

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-asset-library-foundation*
*Context gathered: 2025-07-21*
