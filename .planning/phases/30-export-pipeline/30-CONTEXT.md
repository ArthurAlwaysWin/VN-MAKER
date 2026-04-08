# Phase 30: Export Pipeline - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

从项目数据生成完整可部署的 Web 静态包。覆盖：引擎构建、资源扫描+复制、HTML 生成（自定义标题/favicon）、可选 ZIP 打包、IPC 进度反馈。不包含：导出 UI 对话框（Phase 31）、编辑器入口按钮（Phase 31）。

</domain>

<decisions>
## Implementation Decisions

### 资源缺失处理
- **D-01:** scanAssets 返回的路径在磁盘上找不到时，跳过该文件并记录到警告列表，导出流程不中断
- **D-02:** 缺失文件警告列表在导出完成后一次性返回给前端，不逐条实时推送

### script.json 处理
- **D-03:** script.json 原样复制到输出目录，不做任何字段清理或剪裁。引擎运行时已只读它需要的字段

### 导出输出结构
- **D-04:** 扁平结构，与 `BASE_PATH='./assets/'` 完全对齐：
  ```
  output/
    index.html
    engine.js
    engine.css
    script.json
    assets/
      backgrounds/
      characters/
      audio/
      fonts/
      voices/
  ```
- **D-05:** ZIP 文件放在输出目录同级，命名为 `{游戏标题}.zip`
- **D-06:** ZIP 开关关闭 → 仅生成文件夹；ZIP 开关开启 → 文件夹 + ZIP 都生成

### 进度反馈
- **D-07:** 进度通过 `webContents.send('export-progress', { step, percent })` 单向推送到 renderer 进程
- **D-08:** 6 步进度粒度：构建引擎 → 扫描资源 → 复制引擎产物 → 复制资源文件 → 生成 HTML → 打包 ZIP。每步推送当前步骤名和百分比

### Agent's Discretion
- HTML 模板生成方式（基于 dist-web/index.html 注入 title/favicon，或从头生成）
- IPC handler 的具体参数签名和返回值格式
- 导出模块的文件组织（单文件 vs 分模块）
- Vite 构建调用方式（child_process exec vs Vite API）
- ZIP 内部路径结构（根目录名是否使用游戏标题）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 28 & 29 产出（直接依赖）
- `src/engine/scanAssets.js` — 资源扫描器纯函数，返回 `{ backgrounds, audio, fonts, characters, voices }` 分类字典
- `src/engine/assetPath.js` — 环境检测 + `BASE_PATH` + `resolvePath()`，Web 模式 `BASE_PATH = './assets/'`
- `src/engine/WebSaveManager.js` — IndexedDB 存档后端，Web 模式自动使用
- `vite.web.config.js` — Vite Web 构建配置，产出 `dist-web/`（engine.js + engine.css）
- `.planning/phases/28-engine-web-adaptation/28-CONTEXT.md` — Web 运行时决策
- `.planning/phases/29-asset-scanner-build-config/29-CONTEXT.md` — 扫描器和构建配置决策

### IPC 模式参考
- `electron/main.js` — 现有 20+ IPC handler 模式（ipcMain.handle）
- `electron/preload.js` — IPC 白名单 ALLOWED_CHANNELS，需添加导出相关通道

### ZIP 打包参考
- `src/utils/themePackager.js` — fflate zipSync 用法参考（buildThemeZip/parseThemeZip）

### 引擎 HTML 模板
- `index.html` — 游戏运行时 HTML（div 结构 + module script），导出 HTML 基于此

### 需求文档
- `.planning/REQUIREMENTS.md` — PIPE-01 ~ PIPE-07 需求定义
- `.planning/ROADMAP.md` — Phase 30 成功标准（5 条）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **scanAssets()** — 纯函数，接收 script 对象返回分类字典，Phase 30 直接调用
- **fflate zipSync** — themePackager.js 已用 fflate 创建 ZIP，可复用相同模式
- **IPC handler 模式** — electron/main.js 中统一的 `ipcMain.handle(channel, async (event, args) => {...})` 模式
- **preload.js IPC 白名单** — 添加新通道只需在 ALLOWED_CHANNELS 数组追加

### Established Patterns
- **原子写入** — 项目保存用 temp → rename 模式，导出可能不需要（一次性输出）
- **webContents.send** — preload.js 已暴露 `ipcRenderer.on()`，主进程可通过 `BrowserWindow.webContents.send()` 推送事件
- **child_process** — electron/main.js 未使用过，但 Vite 构建需要 `exec('npx vite build --config ...')`

### Integration Points
- 导出 IPC handler 注册在 `electron/main.js`
- `preload.js` ALLOWED_CHANNELS 追加 `'export-game'` + `'export-progress'`
- Phase 31 UI 将调用 `ipcRenderer.invoke('export-game', options)` 并监听 `'export-progress'` 事件

</code_context>

<specifics>
## Specific Ideas

- 用户强调无代码平台定位 — 导出过程应完全自动化，用户只需选目录和配置标题
- ZIP 命名使用游戏标题，对 itch.io 上传友好
- 文件夹始终生成（方便本地 http-server 测试），ZIP 可选

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-export-pipeline*
*Context gathered: 2026-04-08*
