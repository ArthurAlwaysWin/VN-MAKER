# Architecture: v1.5「UI 图片驱动体系」

**Milestone:** v1.5 UI 图片驱动体系  
**Repository:** `VN-MAKER`  
**Researched:** 2026-04-22  
**Confidence:** HIGH

## Executive Summary

这次里程碑不需要重做 UI 架构。现有工程已经有三条可复用主线：

1. **主题主线**：`ui.theme` + `ThemeManager.applyTheme()` / `applyNineSlice()`
2. **屏幕主线**：`ui.saveLoadScreen` / `ui.backlogScreen` / `ui.gameMenu` / `ui.settingsScreen` + `setLayout()`
3. **编辑器预览主线**：iframe runtime + `update-theme` / `update-screen-layout` / `show-screen`

最安全的做法是：

- 把“跨界面共用的皮肤资产”继续放在 `ui.theme`
- 把“某个界面的背景/装饰层摆放”继续放在对应 screen config
- 对话框继续走 `ui.dialogueBox`，但新增 `chrome` 子对象承载图片层

这样可以最大化复用现有 `ThemeManager.js`、`main.js`、各 screen 的 `setLayout()`、`ProjectSettings.vue`、`useThemeEditor.js`、`useScreenLayoutEditor.js`、theme package/builtin theme 与 export pipeline。

## Current Integration Points

| Area | Existing integration point | Why it matters for v1.5 |
|---|---|---|
| Theme tokens / skin CSS | `src/engine/ThemeManager.js` | 现有图片皮肤入口，最适合扩展按钮态 / cursor |
| Dialogue runtime | `src/ui/DialogueBox.js` | 需要新增名牌底图、装饰层、框体层 |
| Screen runtime | `src/ui/GameMenu.js`, `SaveLoadScreen.js`, `BacklogScreen.js`, `SettingsScreen.js` | 已有 layout/config 化能力，适合加 full-screen bg / decor |
| Preview runtime boot | `src/main.js` | `start/update-theme/update-screen-layout/show-screen` 都在这里收口 |
| Project settings preview | `src/editor/views/ProjectSettings.vue`, `useThemeEditor.js` | 主题/对话框图片编辑应复用这里 |
| Screen editors | `useScreenLayoutEditor.js` + 各 Section 组件 | major screen 的背景 / 装饰层沿这条线扩展 |
| Theme packaging | `src/utils/themePackager.js`, `src/editor/builtinThemes.js`, `script.applyBuiltinTheme()` | v1.5 产物最终要能进 theme package / builtin theme |
| Export asset discovery | `src/engine/scanAssets.js` | 当前几乎没扫到 v1.5 新增 UI 图片路径，必须补 |

## Recommended Data Contracts

## 1) Theme-level shared skin assets

继续扩展 `ui.theme`，不要新开平行根对象。

```js
ui.theme = {
  tokens: {},
  colorRecipe: {},
  tokenOverrides: {},
  nineSlice: {
    dialogueBox: SkinConfig,
    menuPanel: SkinConfig,
    saveSlot: SkinConfig,
    choiceButton: SkinConfig,
    titleButton: SkinConfig,
    settingsPanel: SkinConfig,
    gameMenuButton: SkinConfig,
    saveLoadClose: SkinConfig,
    backlogClose: SkinConfig,
    qabButton: SkinConfig,
    pageTab: SkinConfig,
    settingsTab: SkinConfig,
    settingsClose: SkinConfig
  },
  cursor: {
    default: null,
    pointer: null,
    text: null
  },
  icons: {
    gameMenu: {
      save: null, load: null, backlog: null,
      settings: null, title: null, close: null
    },
    quickActionBar: {
      auto: null, skip: null, backlog: null,
      save: null, load: null, quicksave: null,
      quickload: null, settings: null
    },
    common: {
      close: null,
      voiceReplay: null
    }
  }
}
```

### Recommendation

- 按钮态继续沿用 `nineSlice` contract，不要另起第二套 button-skin schema
- `SkinConfig.states` 从 `hover/active` 扩成 `hover/active/selected/disabled`

## 2) Dialogue box chrome

继续放在 `ui.dialogueBox`，但新增 `chrome` 子对象：

```js
ui.dialogueBox = {
  fontSize: 18,
  fontFamily: null,
  textColor: null,
  nameplateFontSize: 20,
  nameplateFontFamily: null,
  nameplateColor: null,
  nameplateStyle: 'inline',
  chrome: {
    fillImage: null,
    nameplateBackgroundImage: null,
    decorations: []
  }
}
```

`DialogueBox.js` 已通过 `applyGlobalStyle()` 消费 `ui.dialogueBox`，把图片 chrome 放在同一个对象里最少破坏。

## 3) Screen-level background / decor contract

不要把 major screen 的背景 / 装饰塞回 `ui.theme`。继续挂在各 screen config 下，但统一加一个 `chrome` 子对象：

```js
ui.saveLoadScreen.chrome = { backgroundImage: null, decorations: [] }
ui.backlogScreen.chrome = { backgroundImage: null, decorations: [] }
ui.gameMenu.chrome = { backgroundImage: null, decorations: [] }
ui.settingsScreen.chrome = { backgroundImage: null, decorations: [] }
```

运行时建议：

- `SaveLoadScreen`: `cfg.chrome?.backgroundImage ?? cfg.background`
- `BacklogScreen`: `cfg.chrome?.backgroundImage ?? cfg.backgroundImage`
- `GameMenu`: `cfg.chrome?.backgroundImage`
- `SettingsScreen`: `cfg.chrome?.backgroundImage`

`chrome.*` 是最安全的新字段，不会和旧项目字段语义冲突。

## New Shared Runtime Pieces

## 1) `src/shared/uiImageContract.js` (new)

职责：

- 定义 skin key registry
- 定义 decoration item shape
- 导出默认值 / normalizer
- 给 editor / runtime / builtinThemes / themePackager / scanAssets 共用

## 2) `src/ui/helpers/renderDecorations.js` (new)

职责：

- 根据 `decorations[]` 创建 / 销毁绝对定位图片层
- 统一 `resolvePath()`、`sanitizeCssValue()`
- 支持 z-index / opacity / `pointer-events: none`

## 3) Theme skin CSS injector

继续在 `ThemeManager.js` 内扩展：

- `applyTheme(container, themeData)` — token
- `applyUiSkins(themeData)` — nine-slice + multi-state selectors + cursor
- `resetUiSkins()`

不要改成一堆运行时 JS 切图；继续让 CSS pseudo-class 和 class state 驱动。

## Existing Modules to Modify

| Module | Change |
|---|---|
| `src/engine/ThemeManager.js` | 扩展 selector registry；支持更多 target key；支持 `selected/disabled` state；应用 cursor CSS |
| `src/main.js` | preview bootstrap 时应用新增 theme/dialogue chrome；新增 `update-dialogue-box` message；`update-theme` 时重新应用 cursor / icons / skins |
| `src/ui/DialogueBox.js` | 增加 nameplate bg 节点、decoration layer、fill layer；新增 `setChrome()` 或扩展 `applyGlobalStyle()` |
| `src/ui/GameMenu.js` | 支持 `chrome.backgroundImage` + decorations；按钮图标从 theme icon set 覆盖；按钮 skin key 接入 |
| `src/ui/SaveLoadScreen.js` | root chrome、close/page-tab skin、delete icon / skin、decorations |
| `src/ui/BacklogScreen.js` | root chrome、close skin、voice replay icon theme、decorations |
| `src/ui/SettingsScreen.js` | root chrome 与现有 panel-bg 分层；settings tab / close / footer button skin；复用 decorations helper |
| `src/ui/QuickActionBar.js` | 支持 theme icon set 替换硬编码 SVG；按钮 skin key 接入 |
| `src/style.css` | 新增 dialogue decoration layer / screen decoration layer / cursor fallback class / selected-state selectors |
| `src/editor/components/DialogueBoxSettings.vue` | 从“纯字体设置”升级为“字体 + 图片 chrome”；接 iframe runtime 预览 |
| `src/editor/components/theme/NineSliceModal.vue` | target key 扩面；state 从 2 态扩成 4 态 |
| `src/editor/components/layout/*Section.vue` | major screen 各自新增 `chrome.backgroundImage` 与 `decorations[]` 编辑入口 |
| `src/editor/views/ProjectSettings.vue` | 继续作为主题 / 对话框图片编辑入口，不要新开 tab |
| `src/editor/composables/useThemeEditor.js` | 增加 theme skin / cursor / icons 预览发送；最好也支持 dialogue chrome 发送 |
| `src/editor/stores/script.js` | `applyBuiltinTheme()` 需要覆盖 dialogueBox chrome / theme icons / cursor |
| `src/editor/builtinThemes.js` | builtin theme 数据结构补图像皮肤字段 |
| `src/utils/themePackager.js` | 不能只打 nine-slice，要打 cursor / icons / dialogue chrome 相关图片引用 |
| `src/engine/scanAssets.js` | 明确加入新路径扫描，否则导出漏资源 |

## New vs Modified Modules

## New

| Module | Purpose |
|---|---|
| `src/shared/uiImageContract.js` | 统一 v1.5 skin / decor schema |
| `src/ui/helpers/renderDecorations.js` | 所有 screen / dialogue 共用装饰层渲染 |

## Modified

| Module | Purpose |
|---|---|
| `ThemeManager.js` | 统一 UI 图片皮肤注入中心 |
| `DialogueBox.js` | 对话框图片层承载 |
| `GameMenu.js` / `SaveLoadScreen.js` / `BacklogScreen.js` / `SettingsScreen.js` | major screen full-screen bg + decor + skinned buttons |
| `QuickActionBar.js` | icon set / skin 接入 |
| `main.js` | preview/runtime 消息入口 |
| `ProjectSettings.vue` / `DialogueBoxSettings.vue` / `NineSliceModal.vue` / screen sections | editor side 配置入口 |
| `script.js` / `builtinThemes.js` / `themePackager.js` / `scanAssets.js` | 主题应用、打包、导出链路补齐 |

## Runtime Hook Recommendations

## 1) New preview message: `update-dialogue-box`

当前 `ProjectSettings` iframe 只会增量接收：

- `update-theme`
- `update-screen-layout`

但 `DialogueBoxSettings.vue` 改的是 `ui.dialogueBox`。如果不加这个消息，图片化对话框只能靠整次 `start` 才能看到。

建议 payload：

```js
{
  type: 'update-dialogue-box',
  config: { ...script.data.ui.dialogueBox }
}
```

Runtime 侧：

- `dialogueBox.applyGlobalStyle(config)`
- `dialogueBox.setChrome(config.chrome || null)`

## 2) Extend `show-screen` for better preview context

`show-screen` 基本够用，但 SaveLoad / Backlog 预览样本过空。建议扩展：

```js
{
  type: 'show-screen',
  screenId: 'saveLoadScreen',
  mode: 'save',
  previewSeed: true
}
```

并增加：

```js
{
  type: 'preview-dialogue',
  speakerName: '小明',
  text: '这是一段预览文本'
}
```

## 3) Keep screen editors on existing `update-screen-layout`

screen background / decor 不需要新协议。只要把新增字段挂在现有 config 上，`useScreenLayoutEditor.js` 现有发送逻辑就能继续用。

## Data Flow Impact

## Editor → Store

- `DialogueBoxSettings.vue` 修改 `script.data.ui.dialogueBox`
- 各 screen section 修改 `script.data.ui.<screen>`
- theme modal / toolbar 修改 `script.data.ui.theme`

## Store → Preview

- `useThemeEditor.js` 发送 `update-theme`
- `useScreenLayoutEditor.js` 发送 `update-screen-layout`
- 新增对话框编辑发送 `update-dialogue-box`

## Preview Runtime

- `main.js` 收消息
- `ThemeManager` 注入 CSS skin / cursor
- 各 screen `setLayout()` 重渲染
- `DialogueBox` 更新 chrome

## Export / Packaging

- `scanAssets.js` 扫新路径
- `themePackager.js` 打 / 解包新字段
- `applyBuiltinTheme()` 一次性落地 theme + dialogueBox + screens

## Preview / Runtime Parity

必须沿用 v1.4 的原则：**预览必须走真实 runtime owner，不要做 editor-only 假预览。**

### Specific parity requirements

- **Dialogue box**：图片 chrome 必须接 iframe runtime
- **Screen backgrounds / decor**：继续走各 screen editor 现有 iframe
- **Cursor / icons**：必须通过 `update-theme` 落到 iframe runtime

任何新增 image path 都必须同时满足：

1. editor form 可配置
2. preview 可增量看到
3. `scanAssets.js` 可导出
4. builtin theme / package 可承载

## Safest Build Order

## Phase 1 — Shared contract + injector foundation

- `uiImageContract.js`
- `ThemeManager.js` 扩面：selector registry + 4-state skins + cursor
- `renderDecorations.js`
- `scanAssets.js` 新路径扫描框架

## Phase 2 — Dialogue box runtime first

- `DialogueBox.js` 多层 DOM
- `ui.dialogueBox.chrome`
- `main.js` 的 `update-dialogue-box`
- `DialogueBoxSettings.vue` 接 runtime-backed preview

## Phase 3 — Button image state rollout

目标 surface：

- `.game-menu-button`
- `.save-load-close`
- `.backlog-close`
- `.qab-btn`
- `.page-tab`
- `.settings-tab-btn`
- `.settings-structured-close`

## Phase 4 — Major screen full-screen bg + decorations

- `screen.chrome.backgroundImage`
- `screen.chrome.decorations[]`
- 各 screen editor section 配置入口
- 运行时复用 `renderDecorations.js`

## Phase 5 — Cursor + icon theming

- `ui.theme.cursor`
- `ui.theme.icons`
- `QuickActionBar.js` / `GameMenu.js` / `BacklogScreen.js` icon override
- `update-theme` 增量预览

## Phase 6 — Editor / package / export backfill

- `NineSliceModal.vue` 扩面
- builtin theme 数据升级
- `themePackager.js` 打 / 解包新字段
- `script.applyBuiltinTheme()` 覆盖新字段
- regression for preview / export / theme apply

## Concrete Recommendations

1. 不要新建一套独立 “UI image engine”
2. 不要把所有图片配置都塞进 `ui.theme`
3. 不要改 screen editor 总架构
4. 不要再做 editor-only 对话框图片预览
5. 不要漏 `scanAssets.js`

## Biggest Risk

最大的返工风险不是 runtime，而是 **schema 漂移**：

- editor 配的是 A 字段
- preview 用的是 B 字段
- export 扫的是 C 字段
- builtin theme 写的是 D 字段

所以 v1.5 第一阶段最重要的不是 UI，而是先统一 **shared contract + asset scan + preview message**。
