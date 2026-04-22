# Technology Stack — v1.5 UI 图片驱动体系

**Project:** Galgame Maker v1.5 — UI 图片驱动体系  
**Researched:** 2026-04-22  
**Scope:** 只回答本里程碑新增 UI 图片能力：对话框图片化、主要按钮图片态扩面、全屏界面背景/装饰层、自定义光标与图标集、编辑器侧图片 UI 资产管理与即时预览。  
**Overall confidence:** HIGH

## Executive Recommendation

**Required npm dependencies: 0. Required stack migrations: 0.**

v1.5 应该继续建立在 **Electron 41 + Vue 3 + Pinia + Vite + 纯 JavaScript DOM/CSS runtime** 上。当前技术栈已经足够支撑这批功能；真正需要补的是：

1. **运行时数据模型扩展**：把“UI 图片资产”从零散背景图字段升级为结构化配置  
2. **ThemeManager/各 UI 组件的图片层能力**：从“单层 nine-slice”升级到“多层图片 + 更多按钮状态 + cursor/icon 注入”  
3. **导出扫描链路补齐**：确保 `assets/ui/*` 和新字段会进入 Web/桌面导出  
4. **编辑器资产工作流补齐**：直接复用现有 `ui` 资源分类、AssetPicker、iframe 预览，不另起一套系统

**结论很明确：这是能力扩面，不是技术换代。**  
不要为 v1.5 引入 PixiJS、Canvas/WebGL、GSAP、图标字体、图片处理库、主题包格式重做，或任何“为了图片化而平台重写”的方案。

## Current Stack Sufficiency

| Area | Current stack | Sufficiency | What it already covers |
|---|---|---|---|
| Runtime shell | Electron 41 | Sufficient | Chromium 级 DOM/CSS、`cursor:url()`、绝对定位层、滤镜、伪类状态、图片预加载 |
| Editor UI | Vue 3.5 + Pinia 3 | Sufficient | 现有 Theme/Screen/Title 编辑器、store 驱动表单、iframe 预览通信 |
| Build/dev | Vite 6 | Sufficient | 无需新增 loader；项目资产本来就是文件夹结构 |
| Asset pathing | `asset://` + `resolvePath()` | Sufficient | 预览/Electron/Web/Desktop 四环境路径统一 |
| Asset storage | `assets/ui/` + IPC `list-assets/import-assets/select-asset` | Sufficient | UI 图本来就有独立分类，可直接接入 |
| Preview architecture | 现有 `postMessage` + runtime-backed iframe | Sufficient | 主题、screen layout、widgetStyles 已支持热更新预览 |

## What Can Be Built With The Current Stack

这些能力 **不用加依赖**，直接用现有栈实现：

- **对话框图片主题化**：DOM 子层 + `<img>` / `background-image`
- **按钮多状态图片**：CSS `:hover/:active` + `.active/.disabled` + 现有 style injection
- **SaveLoad / Backlog / GameMenu / Settings 全屏插画背景**：绝对定位背景层 + 装饰层数组
- **主题光标**：根层 CSS `cursor: url(...) x y, auto`
- **主题图标替换**：把硬编码 emoji / inline SVG 改成“优先用主题图片，否则回退默认 SVG/文本”
- **编辑器即时预览**：继续走现有 iframe runtime，不要新做第二套预览

## Actual Stack Changes Needed

## 1. Add a structured UI asset config layer

当前问题不是“Electron 不行”，而是**数据结构太窄**。现在：

- `ThemeManager.applyNineSlice()` 只覆盖 6 个 selector，且按钮只支持 `hover/active`
- `DialogueBox` 只有基础 nameplate/style，没有图片层模型
- 各 screen editor 大量图片字段仍是手填路径字符串

**v1.5 需要的不是新库，而是新 schema。**

### Recommended milestone-scoped schema direction

```js
ui: {
  theme: {
    uiSkins: {
      buttons: {
        gameMenuButton: { mode: 'nineSlice', normal: {}, hover: {}, active: {}, disabled: {} },
        saveLoadClose:  { mode: 'nineSlice', normal: {}, hover: {}, active: {} },
        backlogClose:   { mode: 'nineSlice', normal: {}, hover: {}, active: {} },
        settingsClose:  { mode: 'nineSlice', normal: {}, hover: {}, active: {} },
        qabButton:      { mode: 'nineSlice', normal: {}, hover: {}, active: {}, disabled: {} },
        pageTab:        { mode: 'nineSlice', normal: {}, hover: {}, active: {}, selected: {} }
      },
      icons: {
        auto: 'ui/icons/auto.png',
        skip: 'ui/icons/skip.png',
        backlog: 'ui/icons/backlog.png',
        save: 'ui/icons/save.png',
        load: 'ui/icons/load.png',
        quicksave: 'ui/icons/quicksave.png',
        quickload: 'ui/icons/quickload.png',
        settings: 'ui/icons/settings.png',
        close: 'ui/icons/close.png'
      },
      cursor: {
        default: { src: 'ui/cursor-default.png', x: 4, y: 2, fallback: 'auto' },
        pointer: { src: 'ui/cursor-pointer.png', x: 8, y: 2, fallback: 'pointer' }
      }
    }
  },
  dialogueBox: {
    visuals: {
      frame: 'ui/dialogue/frame.png',
      fullReplacement: null,
      nameplateImage: 'ui/dialogue/nameplate.png',
      decorations: [{ src: 'ui/dialogue/deco-left.png', x: 0, y: 0, width: 180, height: 80 }]
    }
  },
  saveLoadScreen: { backgroundImage: 'ui/screens/save-load-bg.png', decorations: [] },
  backlogScreen:  { backgroundImage: 'ui/screens/backlog-bg.png', decorations: [] },
  gameMenu:       { backgroundImage: 'ui/screens/game-menu-panel.png', decorations: [] },
  settingsScreen: { backgroundImage: 'ui/screens/settings-bg.png', decorations: [] }
}
```

**Opinionated recommendation:**  
把路径都存成 **项目相对路径**（如 `ui/...png`），不要把 v1.5 的大图继续存成 data URL。

## 2. Generalize ThemeManager beyond single-layer nine-slice

现有 `ThemeManager.js` 方向是对的，但能力不够：

- selector map 只覆盖 6 个目标
- state model 太少（主要只有 normal/hover/active）
- 只能处理 `::before` 单层，不适合对话框多装饰层

### Required internal additions

| Module / File | Change | Why |
|---|---|---|
| `src/engine/ThemeManager.js` | 保留 `applyTheme()`；把 `applyNineSlice()` 扩成更通用的 `applyUiAssetStyles()` 或并行新函数 | v1.5 不再只是 nine-slice |
| `src/ui/DialogueBox.js` | 新增结构化图片层 DOM | 对话框多层图片不能继续硬塞进单个 `::before` |
| `src/ui/QuickActionBar.js` | 图标来源改为主题可替换 | 当前图标硬编码为 inline SVG |
| `src/ui/GameMenu.js` | 按钮背景/图标状态接入主题图片 | 当前只有 panel 背景图和按钮文字/icon |
| `src/ui/SaveLoadScreen.js` | 支持 screen decorations + close/tab/button skin | 当前有背景图，但缺装饰层和统一按钮皮肤 |
| `src/ui/BacklogScreen.js` | 支持 decorations + close/voice button skin | 当前只有背景/header 背景 |
| `src/ui/SettingsScreen.js` | 复用现有 decorations 模式，扩到全屏层/close/icon skin | 当前已经有局部 decorations，是最佳复用点 |

### Implementation stance

- **Stretchable 框体**：继续用 nine-slice / border-image
- **装饰层、名牌图、整图替换**：用真实 DOM 子层（absolute positioned img/div）
- **按钮状态**：用结构化状态配置，不要把所有状态拼成任意 CSS 字符串

## 3. Add one small shared image preload utility, not a library

v1.5 会比 v1.4 更频繁地切换 UI 图。为避免 hover/打开界面时闪图，建议新增一个很小的内部工具：

| Internal utility | Needed? | Purpose |
|---|---|---|
| `src/engine/preloadImage.js` 或同类模块 | Yes | `new Image()` + `img.decode()` 预热 UI 图 |

**Why:**  
`CharacterLayer` 已证明 `img.decode()` 预加载路线可靠。UI 图片也应复用这个思路，而不是引入图片缓存库。

## 4. Asset pipeline changes are mandatory

这是 v1.5 唯一必须动到“构建/导出链”的地方。

### Current gap

`scanAssets()` 目前只扫描：

- scene backgrounds / bgm / se / voices
- fonts
- `titleScreen`
- `settingsScreen` 的 `background` 与 `elements[].image`

**它不会完整扫描 v1.5 新增的 UI 图引用。**

### Required pipeline work

| File | Required change |
|---|---|
| `src/engine/scanAssets.js` | 扫描 `ui.dialogueBox.visuals.*`、`ui.theme.uiSkins.*`、各 screen `decorations[]`、新增按钮状态图、cursor/icon 图 |
| `electron/exportGame.js` | 复制新增 UI 资产集合 |
| `electron/exportDesktop.js` | 同步复制新增 UI 资产集合 |
| `src/utils/themePackager.js` | **v1.5 不做格式升级**；仅确保不会错误吞掉项目内图片引用 |

### Strong recommendation

给 `scanAssets()` 新增明确的 `ui` 资产桶，而不是继续把所有 UI 图混进 `backgrounds`。

这样更利于：

- 导出审计
- 后续 v1.6 主题包升级
- 排查“某个 UI 图为什么没打包”

## 5. Editor-side asset management should reuse existing asset infrastructure

这部分最不该新起炉灶。现有基础已经够好：

- `assets` store 已有 `ui` 分类
- Electron IPC 已支持 `ui` 的导入/列举/选择/校验
- `AssetGrid.vue` 已支持图片缩略图网格
- `AssetPickerModal.vue` 已支持 `category="ui"`

### Minimal editor additions

| Area | Minimal addition |
|---|---|
| `ResourceLibrary.vue` | 增加 “UI 图片” 子标签，直接复用 `AssetGrid category="ui"` |
| Theme editor | 在现有 theme editor / screen editors 中接入 `AssetPickerModal`，不要继续让用户手打路径 |
| Live preview | 继续复用 `useThemeEditor` / `useScreenLayoutEditor` 的 iframe postMessage |
| Dialogue/theme inspectors | 增加缩略图 + 清除按钮 + “从 UI 资源库选择” |

**Editor recommendation:**  
v1.5 的“图片 UI 资产管理”应该是对现有 theme/screen editors 的增强，不是新增一个独立设计器产品。

## Browser / Runtime Capabilities To Rely On

| Capability | Use in v1.5 | Notes |
|---|---|---|
| Absolute-positioned image layers | 对话框装饰层、screen decorations | 现有 SettingsScreen decorations 已验证 |
| `border-image` / nine-slice CSS | 可拉伸框体与按钮皮肤 | 继续沿用已有模型 |
| `:hover`, `:active`, `.active`, `.disabled`, `[data-*]` | 按钮状态图切换 | `page-tab`/`QAB` 需要类状态，不只鼠标伪类 |
| `cursor: url(...) x y, auto` | 主题 cursor | 用结构化字段生成，别让用户输入原始 CSS |
| `img.decode()` | 预加载 UI 图，减少闪图 | 内部 utility 足够 |
| `object-fit: contain/cover` | 图标与背景图适配 | 已在标题页/资源库使用 |
| `pointer-events: none` | 装饰层不抢点击 | 对话框、screen decoration 必需 |

## Feature-by-Feature Stack Guidance

### 1. Dialogue box image-driven theming

**Can current stack do it?**  
**Yes, with runtime DOM changes only.**

**Needed approach:**

- 在 `DialogueBox` 内增加 `frameLayer / decorationLayer / nameplateLayer / contentLayer`
- `full image replacement` 也走同一 DOM 结构，不单独发明新渲染器
- 图片路径通过 `resolvePath()`，不要直接写 `url(...)`

**Do not do:**  
继续把所有视觉层塞到 `#dialogue-box::before`。

### 2. Wider button image states across major UI surfaces

**Can current stack do it?**  
**Mostly yes, but ThemeManager state model must expand.**

**Needed approach:**

- 把按钮皮肤目标扩到 `game-menu-button / save-load-close / backlog-close / settings-close / qab-btn / page-tab`
- 支持 `selected/disabled`，因为仅有 `hover/active` 不够覆盖 page tab 和 quickload disabled
- 保持 CSS 驱动状态，不加 JS 动画库

### 3. Full-screen illustration backgrounds + decorative layers

**Can current stack do it?**  
**Yes.**

**Needed approach:**

- 每个 screen 统一支持 `backgroundImage + decorations[]`
- 直接复用 `SettingsScreen` 已有的 decoration 渲染思路
- 把背景图作为独立 layer，而不是把所有东西都写成 overlay `background`

### 4. Themed cursor and icon set replacement

**Can current stack do it?**  
**Yes.**

**Needed approach:**

- cursor 配置采用 `{ src, x, y, fallback }`
- icon set 采用“按语义 key 映射路径”
- `QuickActionBar`、`GameMenu`、`Settings` tabs 等组件优先读 theme icon，缺失时回退默认 SVG/emoji

**Do not do:**  
引入 icon font、SVG sprite build step、第三方 cursor library。

### 5. Editor-side image UI asset management with live preview

**Can current stack do it?**  
**Yes.**

**Needed approach:**

- UI 图统一进 `assets/ui/`
- ResourceLibrary 增加 UI 子页
- Theme/Screen/Dialogue 编辑面板接 AssetPickerModal
- 改值后继续用现有 iframe preview 热刷新

## Integration Points

| Layer | Files / systems to touch |
|---|---|
| Runtime theme/style | `src/engine/ThemeManager.js`, `src/main.js` |
| Runtime UI components | `src/ui/DialogueBox.js`, `QuickActionBar.js`, `GameMenu.js`, `SaveLoadScreen.js`, `BacklogScreen.js`, `SettingsScreen.js` |
| Shared pathing/export | `src/engine/assetPath.js`, `src/engine/scanAssets.js`, `electron/exportGame.js`, `electron/exportDesktop.js` |
| Editor stores/composables | `src/editor/stores/assets.js`, `src/editor/stores/script.js`, `useThemeEditor.js`, `useScreenLayoutEditor.js` |
| Editor UI | `ResourceLibrary.vue`, `AssetGrid.vue`, `AssetPickerModal.vue`, theme/layout section components |
| Native asset IPC | `electron/main.js`, `electron/validateAsset.js` |

## Do NOT Add In v1.5

| Do not add | Why not |
|---|---|
| PixiJS / Phaser / Canvas/WebGL renderer | 这批需求是 DOM UI 皮肤化，不是渲染引擎切换 |
| GSAP / anime.js / motion | 没有复杂时间轴需求；状态切换和层渲染原生 CSS 足够 |
| 图标字体 / Font Awesome 类依赖 | 需求是主题图片图标替换，不是统一矢量图标体系 |
| 图片压缩/转码/贴图打包工具 | 里程碑重点是通路打通，不是资源优化 |
| 独立媒体数据库或在线素材服务 | 当前项目是本地文件夹项目，现有资产库足够 |
| TypeScript 迁移 | 与项目约束冲突，且对本里程碑收益极低 |
| 新 preview framework | 已有 runtime-backed iframe 是正确方案 |
| `.gmtheme` / 主题包格式大改 | 这是 v1.6 话题；v1.5 先把运行时与项目资产通路打通 |
| Base64 大图长期存进 `script.json` | 会让项目数据膨胀、导出难审计、资产复用变差 |

## Recommended Milestone Stack Decision

**Final recommendation:**  
v1.5 只做 **内部能力扩展**：

- **继续用现有 Electron/Vue/Pinia/Vite/纯 JS**
- **新增结构化 UI 图片 schema**
- **扩展 ThemeManager 与各 UI 组件的图片层/state 能力**
- **补齐 `assets/ui` 的编辑器入口与导出扫描**

**不要做平台级新增依赖，不要做主题包格式翻修，不要做渲染栈替换。**

这是最小、最稳、最符合项目“创作者留在视觉工作流、引擎负责逻辑”的路线。

## Sources

- `package.json`
- `.planning/PROJECT.md`
- `docs/gap-analysis-vs-mature-engines.md`
- `src/engine/ThemeManager.js`
- `src/engine/scanAssets.js`
- `src/engine/assetPath.js`
- `src/engine/widgetDefaults.js`
- `src/ui/DialogueBox.js`
- `src/ui/QuickActionBar.js`
- `src/ui/GameMenu.js`
- `src/ui/SaveLoadScreen.js`
- `src/ui/BacklogScreen.js`
- `src/ui/SettingsScreen.js`
- `src/main.js`
- `src/editor/stores/assets.js`
- `src/editor/stores/script.js`
- `src/editor/views/ResourceLibrary.vue`
- `src/editor/components/resource-library/AssetGrid.vue`
- `src/editor/components/resource-library/AssetPickerModal.vue`
- `src/editor/components/theme/NineSliceModal.vue`
- `src/editor/composables/useThemeEditor.js`
- `src/editor/composables/useScreenLayoutEditor.js`
- `electron/main.js`
- `electron/exportGame.js`
- `electron/exportDesktop.js`
- `electron/validateAsset.js`
