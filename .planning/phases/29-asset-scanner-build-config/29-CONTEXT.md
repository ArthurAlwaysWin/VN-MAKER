# Phase 29: Asset Scanner + Build Config - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

扫描 script.json 中所有被引用的资源文件，生成分类资源清单；创建独立 Vite Web 构建配置，产出确定性文件名的引擎 bundle（engine.js + engine.css）。

不包含：导出管道（Phase 30）、导出 UI（Phase 31）、favicon（Phase 31）、文件存在性验证（Phase 30）。

</domain>

<decisions>
## Implementation Decisions

### 扫描器输出格式
- **D-01:** 扫描器返回分类字典格式：`{ backgrounds: [...], audio: [...], fonts: [...], characters: [...], voices: [...] }`，每个分类包含该类型下所有被引用的文件路径数组
- **D-02:** 路径值保持 script.json 中的原始相对路径（如 `backgrounds/bg1.png`、`fonts/myfont.ttf`），直接映射到导出包的 `assets/` 目录结构

### Vite 构建策略
- **D-03:** 新建 `vite.web.config.js` 独立配置文件，仅构建 `index.html`（游戏引擎），不含 `vite-plugin-electron`，不影响现有 Electron 开发流程
- **D-04:** 输出确定性文件名 `engine.js` + `engine.css`（Rollup `entryFileNames` / `assetFileNames` 配置），不带 content hash，满足 PIPE-06 要求

### Favicon 处理
- **D-05:** 扫描器不处理 favicon。favicon 是导出时的用户配置项，由 Phase 31 导出 UI 提供选择（"选一张图片作为浏览器标签图标"），不存储在 script.json 中

### 扫描器设计
- **D-06:** 扫描器实现为纯 JS 函数，接收 script 对象作为参数，返回分类字典。不依赖文件系统，renderer 和 Node.js 环境均可调用
- **D-07:** SCAN-03（引用资源不存在时警告）的文件存在性检查由 Phase 30 导出管道负责。扫描器只负责提取引用路径，不做 I/O

### Agent's Discretion
- 扫描器函数的内部遍历实现（递归 vs 配置表驱动）
- Vite Web 配置的具体优化选项（minify、sourcemap 等）
- 分类字典中的 key 命名和去重策略

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目配置
- `vite.config.js` — 现有 Electron Vite 配置（新配置需参考其结构）
- `package.json` — 构建脚本和依赖

### 引擎核心（资源引用来源）
- `src/engine/ScriptEngine.js` — 引擎如何消费 script.json（background, bgm, se, characters, voice）
- `src/engine/assetPath.js` — Phase 28 产出，环境检测 + BASE_PATH + resolvePath()
- `src/engine/ThemeManager.js` — 主题系统如何处理 nineSlice（base64 data: URLs，跳过扫描）
- `src/engine/fontLoader.js` — 字体加载逻辑（`assets.fonts[].file` 路径格式）

### 编辑器数据结构
- `src/editor/stores/script.js` — script.json 的数据结构定义（scenes、pages、ui sections）
- `src/editor/stores/assets.js` — 现有资源分类：backgrounds, characters, audio, fonts, ui

### Phase 28 上下文
- `.planning/phases/28-engine-web-adaptation/28-CONTEXT.md` — Web 运行时决策（BASE_PATH、环境检测）

### 需求文档
- `.planning/REQUIREMENTS.md` — SCAN-01, SCAN-02, SCAN-03, PIPE-06 详细要求

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/editor/stores/assets.js` 的 5 个分类（backgrounds, characters, audio, fonts, ui）可作为扫描器分类的参考
- `src/engine/assetPath.js` 的 `BASE_PATH` 和 `resolvePath()` 已就绪，Web 构建可直接使用

### Established Patterns
- script.json 数据结构：`scenes[id].pages[]` 包含 background、bgm.file、se.file、characters[].image/expression、dialogues[].voice
- UI 数据：`ui.titleScreen.background/bgm`、`ui.settingsScreen.background`
- 字体数据：`assets.fonts[].file`（如 `fonts/xxx.ttf`）
- 九宫格：`ui.theme.nineSlice` 存储为 base64 data: URL，不是文件引用

### Integration Points
- 扫描器函数将被 Phase 30 导出管道调用
- Vite Web 配置将被 Phase 30 构建步骤使用
- 构建入口：`index.html`（游戏页面，不含 editor.html）

</code_context>

<specifics>
## Specific Ideas

- 用户强调无代码平台定位 — 技术细节（如 favicon）不应暴露给最终用户，需要简化为直观操作
- 分类字典格式与现有 assets store 的分类一致，保持项目内一致性

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-asset-scanner-build-config*
*Context gathered: 2026-04-07*
