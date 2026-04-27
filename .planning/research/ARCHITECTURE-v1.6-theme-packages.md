# Architecture Research: v1.6 完整主题包与图片主题产出

**Milestone:** v1.6 完整主题包与图片主题产出  
**Focus:** `.gmtheme` 升级、5 套完整图片主题、一键应用/预览  
**Repository:** `VN-MAKER`  
**Researched:** 2026-04-27  
**Confidence:** HIGH

## Executive Summary

这次里程碑最关键的架构决定，不是“怎么再做一个主题弹窗”，而是**把“主题配置”和“主题资源安装”拆开**。

当前工程里已经有三条非常好的基础设施可以直接复用：

1. `script.json` 已经是 UI 真正的运行时来源，`src/editor/stores/script.js` 是最安全的配置写入口  
2. `asset://` + `assets/ui/` + `scanAssets()` 已经形成了 preview/runtime/export 的统一资源链  
3. Electron 主进程已经掌握项目文件系统访问权，适合承担 `.gmtheme` 的读写、解包、拷贝

因此 v1.6 最稳的方案是：

- **Renderer 负责“主题选择、预览、应用到 script store”**
- **Electron main 负责“`.gmtheme` 文件 I/O、资源安装到项目、导出打包”**
- **项目内所有最终生效图片路径仍然统一写成 `ui/...` canonical path**

不要把完整图片主题继续做成“纯 JS 内置对象直接塞进 `script.applyBuiltinTheme()`”。那条路适合 v1.5 的纯配置包，不适合 v1.6 的“配置 + 图片资产 + 内置/导入共存”。

---

## Current State That Matters

## 1) Existing stores / IPC split

| Area | Current state | Architectural implication |
|---|---|---|
| Project lifecycle | `src/editor/stores/project.js` | 继续作为 `projectPath` / dirty / save 的唯一来源 |
| Script mutation | `src/editor/stores/script.js` | 主题应用必须最终落到这里，而不是散落在组件里 |
| Asset inventory | `src/editor/stores/assets.js` | 安装主题后只需要刷新 `ui` 分类，不要让它承担主题编排逻辑 |
| Theme package IPC | `electron/main.js` 只有 `export-theme` / `import-theme` buffer 读写 | 现有 IPC 太薄，只够“存/取 buffer”，不够 v1.6 的安装型主题 |

## 2) Existing path model is already correct

- Electron/preview 走 `asset://`
- Web/desktop export 走 `./assets/`
- `resolvePath()` 会把 `ui/...` 统一映射到当前环境
- `scanAssets()` 已经把 UI 图片作为 `ui` 类资产导出

这意味着：**v1.6 不应该发明第二套主题资源路径体系**。只要最终写回 `script.json` 的仍然是 `ui/...`，预览、运行时、导出都会继续成立。

## 3) Current theme packaging is too v1.5

`src/utils/themePackager.js` 当前只覆盖：

- token
- nineSlice
- base64 内嵌图片
- `.theme` / `formatVersion: 1`

它不适合 v1.6 的完整主题包，因为 v1.6 需要：

- 多个 UI 区块一起应用
- 项目内图片安装
- built-in 与 project-local 共存
- 可追踪 metadata

---

## Recommended Architecture Boundaries

## A. Introduce a real `Theme Bundle` boundary

建议把“完整主题”抽成 3 个对象，不再混成一个大 JSON：

### 1) `ThemeManifest` — 只放元数据

```js
{
  id: 'wafuu-sakura',
  name: '和风·樱',
  version: '1.0.0',
  author: '...',
  description: '...',
  previewImage: 'preview.png',
  engineRange: '^0.1.0',
  packageFormat: 2,
  kind: 'full-theme'
}
```

### 2) `ThemeConfig` — 只放可写入 `script.json` 的配置片段

```js
{
  theme: { ... },          // -> ui.theme
  widgetStyles: { ... },   // -> ui.widgetStyles
  dialogueBox: { ... },    // -> ui.dialogueBox
  screens: {
    titleScreen: { ... },
    settingsScreen: { ... },
    saveLoadScreen: { ... },
    backlogScreen: { ... },
    gameMenu: { ... }
  }
}
```

### 3) `AssetPayload` — 只放图片文件

- ZIP 内实际文件
- 不混进 metadata
- 不内嵌 base64 到 config

**结论：v1.6 的 `.gmtheme` 应该是“manifest + config + files”，不是单个万能 `theme.json`。**

---

## B. Keep script store as the only apply target

应用主题包时，最终落点仍然应该是 `script.json` 的现有 UI 结构：

- `ui.theme`
- `ui.widgetStyles`
- `ui.dialogueBox`
- `ui.titleScreen`
- `ui.settingsScreen`
- `ui.saveLoadScreen`
- `ui.backlogScreen`
- `ui.gameMenu`

不要引入“运行时先读 theme registry 再 overlay”的第二套激活机制。  
**运行时继续只读 `script.json`，主题库只服务编辑器 UX。**

这能保证：

- 预览不用改 boot 流程
- 导出不用读额外 registry 才知道当前主题
- 项目拷贝后不会丢“当前生效主题”

---

## C. Main process owns package I/O and asset installation

这是这次里程碑最重要的边界。

### Renderer should own

- 主题列表 UI
- built-in / project-local 合并展示
- 预览卡片状态
- 将“已安装主题配置”写入 `script store`
- `project.markDirty()` / 保存

### Electron main should own

- 打开 `.gmtheme` 文件
- 读取 / 校验 ZIP
- 将 payload 复制到项目 `assets/ui/...`
- 导出时从项目里收集实际 UI 图片
- 内置主题资源读取

### Why

因为 renderer 现在没有项目文件系统写权限，而 v1.6 的难点正是“安装主题资源到项目中”。

---

## Hook Recommendations: Stores and IPC

## 1) New renderer-side orchestration layer

不要把逻辑塞进 `ThemePackageModal.vue`。

建议新增一个专门层，例如：

- `src/editor/stores/themeLibrary.js`，或
- `src/editor/services/themeLibrary.js`

我更推荐 **store + service split**：

- `themeLibrary store`：列表、来源、选中项、loading、preview state
- `theme install/apply service`：真正编排 IPC + script/project/assets store

### Recommended flow

```js
ThemePackageModal
  -> themeLibraryStore.selectTheme(...)
  -> themeLibraryService.installAndApplyTheme(themeRef)
       -> ipcRenderer.invoke('install-theme-package', ...)
       -> scriptStore.applyThemeBundle(installed.config)
       -> projectStore.markDirty()
       -> assetStore.loadCategory('ui')
```

## 2) Do not reuse `applyBuiltinTheme()` as-is

`script.applyBuiltinTheme()` 目前只适合“纯配置内置主题”。

v1.6 应该新增一个更明确的方法：

```js
script.applyThemeBundle(bundleConfig)
```

职责：

- 原子替换所有 full-theme 负责的 UI 区块
- 一次 push undo state
- 不负责拷贝文件

这样 built-in 与 imported theme 走同一条应用路径。

## 3) Replace thin IPC with install/export IPC

建议把现有：

- `export-theme`
- `import-theme`

升级为更强语义的接口：

### `install-theme-package`

输入：

```js
{
  source: 'builtin' | 'file',
  builtinId?: 'wafuu-sakura',
  replaceExisting?: true
}
```

输出：

```js
{
  success: true,
  installedTheme: {
    id,
    source,
    assetRoot: 'ui/themes/wafuu-sakura/',
    manifest: { ... }
  },
  config: { ... } // already normalized to project-usable ui/... refs
}
```

### `export-gmtheme`

输入：

```js
{
  manifest: { name, author, description, ... },
  config: extractThemeConfig(scriptStore.data)
}
```

主进程用 `currentProjectPath` + `config` 收集 UI 图片并打包。

### Optional `list-builtin-themes`

如果 built-in 改成真实 `.gmtheme` 文件而不是 JS 对象，建议主进程或 preload 暴露只读 catalog。

---

## Packaged Assets: How to Copy Without Breaking Preview / Runtime / Export

## Recommendation: always install into project-local namespace

**不要让 `script.json` 直接引用 app 内置资源。**

正确策略：

- built-in 主题资源：来自 app 安装目录
- imported 主题资源：来自 `.gmtheme` ZIP
- **但一旦“应用到项目”，都复制到项目内**

建议安装目录：

```txt
assets/ui/themes/<theme-id>/**
```

对应 `script.json` 中写：

```js
ui/themes/<theme-id>/panel.png
ui/themes/<theme-id>/tab-selected.png
```

### Why this is the right choice

1. `asset://` 当前天然映射到 `project/assets`  
2. `scanAssets()` 会继续把 `ui/...` 正确纳入导出  
3. web/desktop export 不会漏 app 内置资源  
4. 主题安装后项目是自包含的

## Do not copy into flat `assets/ui/`

不要直接扔到：

```txt
assets/ui/button.png
assets/ui/panel.png
```

这样会带来：

- 文件名冲突
- 主题切换互相污染
- 删除/回滚困难

**必须 namespaced。**

## Install should be copy-on-apply, not reference-on-apply

对于 built-in 主题，最容易踩坑的是“为了省复制，直接让脚本引用 app 内资源”。这会立刻破坏 export parity。

所以 v1.6 应明确采用：

- **预览卡片：用 package 自带 preview image**
- **真正 live runtime：只预览当前已安装/已应用到 script 的主题**

不要为了“预览未安装 built-in 主题”再引入第二套运行时资源协议，除非后续版本真有必要。

这是我对 roadmap 的明确建议：**先上稳定安装型 preview，不做额外 preview scheme。**

---

## Built-in Full Themes vs Project-local Themes

## Recommendation: two catalogs, one apply path

### Catalog A: built-in theme catalog

- app 自带
- 只读
- 来源可以是 bundled `.gmtheme` 文件

### Catalog B: project-local theme catalog

- 当前项目已导入 / 已安装的主题
- 可删除、可重复应用
- 指向项目内 asset root

### Unified UI

编辑器 UI 上把两者合并显示，但保留来源标签：

- Built-in
- Project

### Crucial rule

**built-in 与 project-local 共存于“列表层”，但应用时都走同一条安装/应用流程。**

不要保留两套系统：

- 一套 `builtinThemes.js` 直接写 script
- 一套 `.gmtheme` 导入后安装

那样后续一定分叉。

## Persistence recommendation

如果 milestone 需要“导入后下次打开项目还能继续看到该主题”，建议新增一个轻量 registry：

```txt
themes/library.json
```

只记录：

- id
- source
- name
- version
- preview image path
- installed asset root

不要把这类库信息塞进 `project.json` 主对象，避免项目元数据膨胀。

---

## Separation Between Metadata, Theme Config, and Asset Payload

## Recommended `.gmtheme` v2 layout

```txt
my-theme.gmtheme
├── manifest.json
├── theme.json
├── preview.png
└── assets/
    └── ui/
        └── themes/
            └── my-theme/
                ├── panel.png
                ├── tab.png
                └── ...
```

## File responsibilities

### `manifest.json`

- name / author / description / version
- preview image path
- package format version
- compatibility info
- no runtime UI config

### `theme.json`

- only config fragments that map to `script.json`
- all image refs already use canonical `ui/...`
- no binary blobs

### `assets/`

- actual payload
- portable
- install step copies this subtree into project

## Why this separation matters

1. metadata can be read without loading the whole theme into script  
2. config can be validated independently  
3. payload handling stays in Electron / filesystem land  
4. built-in catalog can show preview cards without applying anything

---

## Rollout Slices for Roadmap Planning

## Slice 1 — Contract and install path

Deliver:

- `.gmtheme` v2 schema
- `ThemeManifest` / `ThemeConfig` normalizer
- install root convention: `assets/ui/themes/<id>/`
- `script.applyThemeBundle()`

Why first:

- 这是后面所有 IPC、内置主题、导出逻辑的共同基础

## Slice 2 — Main-process import/export pipeline

Deliver:

- `install-theme-package` IPC
- `export-gmtheme` IPC
- file copy / overwrite policy
- package validation

Why second:

- 没有这层，完整图片主题只是“编辑器里的假数据”

## Slice 3 — Unified theme library UI

Deliver:

- built-in + project-local 合并列表
- preview cards / source badges
- one-click apply
- import/export entrypoints

Why third:

- 此时底层已稳定，UI 不会绑定到错误数据模型

## Slice 4 — 5 套内置图片主题内容接入

Deliver:

- built-in theme bundle packaging
- preview images
- smoke test on apply / save / reopen / export

Why fourth:

- 内容生产要建立在格式和安装链路稳定之后

## Slice 5 — Cleanup / lifecycle polish

Optional but recommended:

- reinstall overwrite prompts
- orphan asset cleanup strategy
- remove local theme
- active theme badge / current source display

---

## Specific Architectural Decisions I Recommend

1. **Keep runtime source of truth in `script.json` only.**
2. **Install every applied full theme into project-local `assets/ui/themes/<id>/`.**
3. **Use one apply path for built-in and imported themes.**
4. **Split `.gmtheme` into metadata / config / payload, not one blob.**
5. **Keep preview lightweight: preview image for library cards, live iframe for installed/applied theme only.**

---

## Risks / Flags for Milestone Planning

### High-risk if ignored

#### 1) Reusing current `export-theme/import-theme` as-is

会得到一个只能搬 buffer、不会安装资源的伪主题系统。

#### 2) Letting built-in themes bypass project asset installation

会直接破坏 export parity。

#### 3) Continuing to model built-ins only in `builtinThemes.js`

配置和真实资源会逐步失配，最终形成两套主题格式。

### Medium-risk

#### 4) No namespace under `assets/ui/`

5 套图片主题很快会出现重名、覆盖和垃圾文件问题。

#### 5) No project-local theme registry

会导致“导入后本次可见，下次打开项目消失”的 UX 问题。

---

## Source Notes

Repository evidence used:

- `electron/main.js` — existing project IPC, `asset://`, current `export-theme/import-theme`
- `src/editor/stores/project.js`
- `src/editor/stores/script.js`
- `src/editor/stores/assets.js`
- `src/shared/uiImageContract.js`
- `src/engine/assetPath.js`
- `src/engine/scanAssets.js`
- `src/utils/themePackager.js`
- `src/editor/components/theme/ThemePackageModal.vue`
- `docs/superpowers/specs/ui-theme-system-v2-design.md`
