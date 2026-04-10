# Phase 34: Export UI Integration - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>

## Phase Boundary

扩展 ExportModal.vue，新增 Web/桌面版格式切换，桌面模式下显示 PNG 图标选择器（含缩略图预览），调用 `export-game-desktop` IPC handler 执行桌面导出。不包含新的管线逻辑（Phase 33 已完成），不包含分辨率/窗口模式配置（属于项目设置）。

</domain>

<decisions>

## Implementation Decisions

### 格式切换 UI (Format Toggle)
- **D-01:** Segment 按钮（横向两段：Web | 桌面版），与设置页窗口模式 radio 风格一致
- **D-02:** Segment 按钮放在 header 栏内，"📦 导出游戏"标题旁边
- **D-03:** 默认选中"桌面版"（v0.8 重点是桌面导出）
- **D-04:** 切换格式时保留共享字段（游戏标题、输出目录、ZIP），只切换专属字段（Web: favicon | 桌面: 图标）

### 图标选择器 (Icon Picker)
- **D-05:** 桌面模式的图标选择器接受 PNG 文件，选择后显示缩略图预览 + 文件名
- **D-06:** 用户未选自定义图标时，显示默认图标缩略图 + "使用默认图标"文字（默认图标: `public/default-game-icon.png`，Phase 33 D-02）

### 桌面版专属配置 (Desktop-specific Config)
- **D-07:** 桌面模式不添加额外配置选项，保持简洁。分辨率和窗口模式由项目设置管理

### Agent's Discretion
- 缩略图预览的尺寸和样式
- Segment 按钮的具体 CSS 实现
- 格式切换时的动画/过渡效果（如有）
- 默认图标的 asset:// URL 构建方式
- Web 模式 favicon 选择器是否也升级为缩略图预览（保持一致性 vs 最小改动）

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有导出 UI（Phase 31 — 扩展基础）
- `src/editor/components/ExportModal.vue` — 当前 3 态导出弹窗，480px 宽，含 gameTitle/outputDir/faviconPath/enableZip 字段，调用 `export-game` IPC
- `src/editor/stores/project.js` — Pinia 项目 store，提供 `projectData.name`

### 桌面导出管线（Phase 33 — 调用目标）
- `electron/main.js` §811+ — `export-game-desktop` IPC handler，接受 `{outputDir, gameTitle, iconPath, zip}` 参数
- `electron/exportDesktop.js` — 9 步桌面导出管线，`sendProgress({step, percent})` 回调

### Web 导出管线（Phase 30 — 对照参考）
- `electron/main.js` §793-809 — `export-game` IPC handler，参数格式 `{outputDir, gameTitle, faviconPath, zip}`

### 默认图标
- `public/default-game-icon.png` — 默认游戏图标（Phase 33 D-02）

### 项目研究
- `.planning/research/SUMMARY.md` — v0.8 整体架构决策

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets
- `ExportModal.vue` 3 态状态机：`state = 'config' | 'exporting' | 'done'` — 桌面导出复用相同状态机
- `export-progress` IPC 事件：`window.ipcRenderer.on('export-progress', ...)` — Web/桌面共用同一进度通道
- `dialog-open-directory` / `dialog-open-file` IPC — 已有目录和文件选择对话框
- Segment 按钮样式参考：设置页 SettingsScreen.js 窗口模式三选一 radio 按钮

### Established Patterns
- 配置表单：`<label class="export-field">` + `<span class="field-label">` + 输入控件
- Picker 行：`<div class="picker-row">` 包含显示值 + 选择按钮 + 清除按钮
- IPC 调用：`window.ipcRenderer.invoke('channel', options)` 返回 `{success, error?, outputPath?, zipPath?, warnings?}`
- 进度监听：`window.ipcRenderer.on('export-progress', callback)` + `cleanupProgressListener()`

### Integration Points
- `ExportModal.vue` `startExport()`: 根据当前格式选择调用 `export-game` 或 `export-game-desktop`
- Header 栏：当前 `<div class="export-header">` 包含标题和关闭按钮，需插入 segment 按钮
- `pickFavicon()`: Web 模式保留 ico/png 过滤；桌面模式新建 `pickIcon()` 仅接受 PNG

</code_context>

<specifics>

## Specific Ideas

- Segment 按钮 HTML 结构：`<div class="format-toggle"><button :class="{active: format==='desktop'}">桌面版</button><button :class="{active: format==='web'}">Web</button></div>`
- 图标缩略图：使用 `<img>` + `asset://` URL 或 `URL.createObjectURL()` 显示本地 PNG 预览
- 默认图标缩略图可直接引用 `/default-game-icon.png`（Vite public 目录）
- `startExport()` 分发逻辑：`format === 'desktop' ? ipcRenderer.invoke('export-game-desktop', ...) : ipcRenderer.invoke('export-game', ...)`

</specifics>

<deferred>

## Deferred Ideas

- **默认分辨率提升到 1920×1080** — 用户反馈 1280×720 太低，属于项目设置范畴，不在导出 UI scope
- macOS/Linux 平台导出格式选项 — v0.9+
- 导出预设（记住上次导出配置） — 可后续优化

</deferred>

---

*Phase: 34-export-ui-integration*
*Context gathered: 2026-04-10*
