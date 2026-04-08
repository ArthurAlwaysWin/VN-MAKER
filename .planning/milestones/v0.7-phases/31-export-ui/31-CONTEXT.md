# Phase 31: Export UI - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

编辑器内导出对话框，用于配置和监控游戏导出。覆盖：导出入口按钮、配置 Modal（标题/目录/favicon/ZIP）、进度显示、完成反馈（含警告列表）、错误处理。不包含：导出管线逻辑（Phase 30 已完成）、新 Tab 页或工具栏。

</domain>

<decisions>
## Implementation Decisions

### 导出入口
- **D-01:** 导出入口放在"项目设置"Tab 内，添加一个"导出游戏"按钮，点击后弹出 Modal 对话框
- **D-02:** 不新增 Tab 页或顶部工具栏，保持现有 6 Tab 布局不变

### 对话框形式与交互
- **D-03:** 使用 Modal 弹窗，与 BgRemovalModal/PresetModal 保持一致的呈现模式
- **D-04:** 单个 Modal 内三状态切换：配置（config）→ 导出中（exporting）→ 完成（done）
- **D-05:** 导出过程中支持取消 — 点取消中断导出，清理已生成文件，回到配置状态

### 配置表单
- **D-06:** 表单包含：游戏标题输入框（默认取 project.json 的 name）、输出目录选择器、favicon 文件选择器、ZIP 打包开关
- **D-07:** 输出目录选择器使用 Electron 原生文件夹选择对话框（已有 `dialog-open-directory` IPC）

### 进度显示
- **D-08:** 进度区域显示当前步骤名称 + 百分比进度条，直接使用 Phase 30 的 `export-progress` 事件（6 步推送）

### 完成反馈
- **D-09:** 成功：显示成功图标 + 输出路径 + "打开文件夹"按钮（使用 Electron shell.openPath）
- **D-10:** 如有缺失资源警告：完成界面下方显示折叠警告列表（"导出成功，但有N个资源未找到" + 展开详情）
- **D-11:** 失败：显示错误信息 + "重试"按钮，回到配置状态可重新尝试

### Agent's Discretion
- 进度条样式（条形 vs 环形）
- Modal 宽度和内部布局细节
- 按钮文案和图标选择
- 输入验证逻辑（空标题、无效路径等）
- "打开文件夹"的具体 IPC 实现方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 30 产出（直接依赖）
- `electron/exportGame.js` — 导出管线模块，`exportGame(options, sendProgress)` 函数接口
- `electron/main.js` — 已注册 `export-game` IPC handler，通过 `webContents.send('export-progress')` 推送进度
- `electron/preload.js` — 已白名单 `export-game` + `export-progress` 通道
- `.planning/phases/30-export-pipeline/30-CONTEXT.md` — 导出管线决策（D-01~D-08），进度 6 步定义

### 编辑器 UI 模式参考
- `src/editor/views/ProjectSettings.vue` — 导出按钮将添加在此视图内
- `src/editor/App.vue` — Tab 路由、Modal 弹出模式参考
- `src/editor/components/resource-library/BgRemovalModal.vue` — Modal 组件模式参考（遮罩 + 居中弹窗）
- `src/editor/components/theme/PresetModal.vue` — 另一个 Modal 模式参考
- `src/editor/stores/project.js` — 项目元数据（name 用作默认游戏标题）

### IPC 模式参考
- `electron/main.js` — `dialog-open-directory` handler（目录选择器已有）
- `electron/preload.js` — `ipcRenderer.on()` 用于监听 `export-progress` 推送事件

### 需求文档
- `.planning/REQUIREMENTS.md` — EXUI-01 ~ EXUI-06 需求定义
- `.planning/ROADMAP.md` — Phase 31 成功标准（4 条）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BgRemovalModal.vue** — Modal 弹窗 pattern（overlay + 居中内容 + 关闭按钮），可复用样式
- **PresetModal.vue / NineSliceModal.vue** — 更多 Modal 变体参考
- **useProjectStore** — `projectData.name` 作为默认游戏标题
- **`dialog-open-directory` IPC** — 已有目录选择器 handler
- **`ipcRenderer.on('export-progress')`** — Phase 30 已在 preload 白名单中

### Established Patterns
- Vue 3 SFC `<script setup>` + scoped CSS
- Modal: overlay div + 居中容器 + ESC/点击遮罩关闭
- IPC: `window.ipcRenderer.invoke(channel, args)` 调用，`window.ipcRenderer.on(channel, cb)` 监听
- 暗色主题：`#1e1e1e` ~ `#252526` 背景，`#ccc` ~ `#e0e0e0` 文本

### Integration Points
- `ProjectSettings.vue` — 添加导出按钮 + 导入 ExportModal 组件
- `electron/main.js` — 可能需要新增 `open-folder` IPC handler（shell.openPath）
- `electron/preload.js` — 如需新 IPC channel 则追加白名单

</code_context>

<specifics>
## Specific Ideas

- 用户强调无代码平台定位 — 导出 UI 应简单直观，尽量少操作
- 默认值尽可能预填充（标题取项目名，目录取上次导出路径或项目同级）
- 与已有 Modal 组件保持视觉一致性

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-export-ui*
*Context gathered: 2026-04-08*
