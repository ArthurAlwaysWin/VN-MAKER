# UI Theme System v2 — 实现规格

> 本文档面向实现者（AI 或开发者）。目标是让你在不了解该项目历史的情况下，
> 也能准确理解当前代码状态、需要做什么、以及如何做。

---

## 一、项目背景与产品目标

### 1.1 这个项目是什么

**Galgame Maker** — 一个面向零代码用户的视觉小说制作器。

- **技术栈**：Electron 壳 + Vue 3 编辑器 + 纯 JavaScript 游戏引擎（DOM 渲染，无框架）
- **核心目录结构**：
  ```
  src/
    main.js              ← 引擎入口，所有 UI 组件在此实例化并连线
    engine/
      ScriptEngine.js    ← 脚本执行器
      ThemeManager.js    ← 主题系统（颜色 Token + 九宫格贴图）
      settingDefs.js     ← 设置项注册表（SETTING_DEFS）
      tokens.js          ← 41 个颜色 Token 默认值
      ConfigManager.js   ← 运行时配置（音量、文字速度等）
    ui/
      SettingsScreen.js  ← 游戏内设置界面
      SaveLoadScreen.js  ← 存档/读档界面
      BacklogScreen.js   ← 回想（对话历史）界面
      GameMenu.js        ← ESC 暂停菜单
      DialogueBox.js     ← 对话框
      TitleScreen.js     ← 标题页
  electron/
    main.js              ← Electron 主进程（文件 I/O、IPC）
  ```

- **游戏数据文件**：每个项目是一个文件夹，核心数据存在 `script.json`，结构如下：
  ```json
  {
    "meta": { "title": "..." },
    "assets": { "fonts": [], "images": [], "audio": [] },
    "ui": {
      "theme": {
        "tokens": {},
        "nineSlice": {}
      },
      "settingsScreen": {
        "background": null,
        "elements": []
      },
      "titleScreen": { ... }
    },
    "scenes": { ... }
  }
  ```

### 1.2 产品目标：能力，不只是模板

这个系统要解决两件不同的事，必须同时做到：

**下限（模板系统）**：内置多套完整主题，用户一键应用；支持 `.gmtheme` 主题包格式，用户之间可以导入导出，社区共享。

**上限（编辑器表达力）**：用户通过编辑器界面，无需写任何代码，自己做出和任何内置主题都完全不同的美术风格。
目标参照：《千恋万花》（和风·宣纸质感）和《蒼の彼方のフォーリズム》（现代科幻·梯形 Tab）这两款游戏的系统界面风格截然不同——这个差距不在于颜色，在于**形状语言**（Tab 是什么形状、开关是胶囊还是单选钮、面板是什么质感）。

用户不需要懂 CSS，但要能做出这种差距。

---

## 二、现状：当前代码能做什么，不能做什么

### 2.1 已有能力（可直接利用）

| 能力 | 实现位置 | 说明 |
|------|---------|------|
| 颜色 Token 系统 | `ThemeManager.applyTheme()` | 41 个 `--gm-*` CSS 变量，从 `script.json` 的 `ui.theme.tokens` 读取覆盖 |
| 九宫格贴图 | `ThemeManager.applyNineSlice()` | 对话框/按钮/面板支持九宫格背景图，从 `ui.theme.nineSlice` 读取 |
| 设置页自由布局 | `SettingsScreen._renderCustom()` | 当 `ui.settingsScreen.elements` 非空时，以 JSON 坐标渲染设置控件、标签、图片 |
| 设置项注册表 | `src/engine/settingDefs.js` | `SETTING_DEFS` 定义了所有设置项（bgm-volume / text-speed 等），类型为 slider/toggle/select |

### 2.2 结构性缺口（必须修改才能支持 v2）

**缺口 1：三个核心界面完全封闭**

以下三个组件的构造函数**不接受任何配置参数**，背景/布局/文字全部硬编码：

```js
// 当前 src/main.js — 实例化时无法传入任何配置
const saveLoadScreen = new SaveLoadScreen(gameContainer, null);
const backlogScreen  = new BacklogScreen(gameContainer, audio);
const gameMenu       = new GameMenu(uiOverlay);
```

**缺口 2：SettingsScreen 的默认渲染硬编码**

当 `ui.settingsScreen.elements` 为空时，`_renderDefault()` 渲染的是一套完全写死的 HTML，用户无法控制其视觉风格（背景、控件样式、布局）。

**缺口 3：控件形状语言不存在**

现有系统只有颜色层（Token）和贴图层（nineSlice），没有"控件形状"的概念。Tab 形状、开关控件样式（胶囊/单选/按钮对）在 HTML 里写死，无法从数据驱动。

**缺口 4：编辑器预览覆盖不足**

编辑器目前只能预览标题页和设置页。存档界面、游戏菜单、回想界面的外观，用户在编辑器里看不到效果。

---

## 三、解决方案架构：四层主题系统

```
Layer 4 ── 完整主题包（.gmtheme 文件）          ← 一键应用的"皮肤"，包含下面三层
               ↓
Layer 3 ── 屏幕布局配置（Screen Layouts）        ← script.json ui.* 各界面配置节
               ↓
Layer 2 ── 控件风格定义（Widget Styles）         ← script.json ui.widgetStyles
               ↓
Layer 1 ── 颜色 Token（已有）                    ← script.json ui.theme.tokens
```

**重要原则**：每层独立可用。用户可以只改颜色（Layer 1），也可以叠加控件形状（Layer 2），也可以整包替换（Layer 4）。

---

## 四、Layer 2：控件风格定义（新增）

在 `script.json` 的 `ui` 节新增 `widgetStyles` 字段。引擎读取此配置决定控件的 DOM 结构和样式。

### 4.1 完整 schema

```json
"ui": {
  "widgetStyles": {

    "tab": {
      "shape": "rectangle",
      "activeColor": "rgba(180, 160, 255, 0.9)",
      "inactiveColor": "rgba(255,255,255,0.15)",
      "activeTextColor": "#fff",
      "inactiveTextColor": "rgba(255,255,255,0.6)",
      "fontSize": 14,
      "fontFamily": null,
      "activeBackgroundImage": null,
      "nineSlice": null
    },

    "toggle": {
      "style": "pill",
      "onColor": "rgba(180, 160, 255, 0.85)",
      "offColor": "rgba(255,255,255,0.15)",
      "thumbColor": "#fff",
      "onLabel": "ON",
      "offLabel": "OFF",
      "fontSize": 12,
      "width": 64,
      "height": 28
    },

    "slider": {
      "trackColor": "rgba(255,255,255,0.15)",
      "fillColor": "rgba(180,160,255,0.8)",
      "thumbStyle": "circle",
      "thumbColor": "#fff",
      "thumbSize": 16,
      "trackHeight": 4,
      "trackImage": null,
      "thumbImage": null
    },

    "panel": {
      "background": "rgba(0,0,0,0.6)",
      "backgroundImage": null,
      "backgroundImageOpacity": 0.3,
      "borderRadius": 8,
      "border": "1px solid rgba(255,255,255,0.1)",
      "backdropBlur": 12,
      "padding": [24, 32]
    },

    "button": {
      "background": "rgba(255,255,255,0.12)",
      "backgroundImage": null,
      "hoverBackground": "rgba(255,255,255,0.2)",
      "activeBackground": "rgba(255,255,255,0.3)",
      "textColor": "#fff",
      "borderRadius": 8,
      "border": "none",
      "fontSize": 14,
      "nineSlice": null
    }

  }
}
```

### 4.2 枚举值说明

**`tab.shape`**（决定 Tab 的 DOM 结构和 CSS）：
- `"rectangle"` — 普通矩形，纯 CSS（默认）
- `"pill"` — 胶囊圆角，纯 CSS
- `"underline"` — 仅底部高亮线，纯 CSS
- `"trapezoid"` — 梯形，用 `clip-path: polygon(...)` 实现
- `"ribbon"` — 缎带，用 `clip-path` 或九宫格贴图实现

**`toggle.style`**（决定开关的 DOM 结构，完全不同）：
- `"pill"` — 胶囊滑动开关（最常见）
- `"radio"` — 圆形单选按钮组（ON 旁一个圆，OFF 旁一个圆）
- `"checkbox"` — 方形勾选框
- `"button-pair"` — ON / OFF 两个独立按钮

### 4.3 默认值规则

所有字段的默认值（`null` 表示"不配置此项，使用引擎内置默认"）。引擎读取时做深合并：用户只需提供想覆盖的字段，其余保持默认。这样向后兼容——没有 `widgetStyles` 节的旧项目不受影响。

---

## 五、Layer 3：屏幕布局配置（扩展 + 新增）

### 5.1 存档/读档界面（新增）

在 `script.json` 的 `ui` 节新增 `saveLoadScreen` 配置。

当前 `SaveLoadScreen` 构造函数签名：
```js
constructor(container, saveManager)
```

**需要改为**：
```js
constructor(container, saveManager, layoutConfig = null)
```

`layoutConfig` 对应 `script.json` 的 `ui.saveLoadScreen`，schema：

```json
"saveLoadScreen": {
  "background": null,
  "backdropBlur": 12,
  "header": {
    "saveTitle": "存 档",
    "loadTitle": "读 档",
    "saveTitleColor": null,
    "loadTitleColor": null,
    "backgroundImage": null,
    "height": 70
  },
  "slotGrid": {
    "columns": 3,
    "rows": 3,
    "gap": 12,
    "x": 60,
    "y": 90,
    "width": 1160,
    "height": 540
  },
  "slot": {
    "background": "rgba(30,30,50,0.6)",
    "backgroundImage": null,
    "borderRadius": 6,
    "border": "1px solid rgba(255,255,255,0.1)",
    "emptyText": "— 空 —",
    "thumbnailRadius": 4
  },
  "pagination": {
    "style": "dots",
    "activeColor": null,
    "inactiveColor": null
  }
}
```

`layoutConfig` 为 `null` 时，组件使用当前硬编码的默认值（保持向后兼容，无视觉变化）。

### 5.2 游戏菜单（新增）

当前 `GameMenu` 构造函数：
```js
constructor(container)
```

**需要改为**：
```js
constructor(container, layoutConfig = null)
```

schema：
```json
"gameMenu": {
  "position": "center",
  "width": 260,
  "background": "rgba(0,0,0,0.75)",
  "backgroundImage": null,
  "borderRadius": 8,
  "backdropBlur": 12,
  "buttonGap": 8,
  "buttons": {
    "save":     { "text": "存 档", "icon": null },
    "load":     { "text": "读 档", "icon": null },
    "backlog":  { "text": "回 想", "icon": null },
    "settings": { "text": "设 定", "icon": null },
    "title":    { "text": "返回标题", "icon": null },
    "close":    { "text": "返 回", "icon": null }
  }
}
```

### 5.3 回想界面（新增）

当前 `BacklogScreen` 构造函数：
```js
constructor(container, audio = null)
```

**需要改为**：
```js
constructor(container, audio = null, layoutConfig = null)
```

schema：
```json
"backlogScreen": {
  "background": "rgba(0,0,0,0.85)",
  "backgroundImage": null,
  "header": {
    "title": "回 想",
    "backgroundImage": null,
    "height": 60
  },
  "entry": {
    "speakerColor": null,
    "speakerFontSize": 13,
    "textFontSize": 15,
    "background": "transparent",
    "hoverBackground": "rgba(255,255,255,0.05)",
    "borderBottom": "1px solid rgba(255,255,255,0.06)",
    "padding": [12, 20]
  }
}
```

### 5.4 设置页（扩展现有结构化模式）

现有的 `ui.settingsScreen` 已支持 `background` + `elements[]` 自由布局。在此基础上新增结构化字段，两种模式共存：

```json
"settingsScreen": {
  "background": null,
  "header": {
    "height": 90,
    "backgroundImage": null,
    "title": {
      "text": "系统设定",
      "fontSize": 28,
      "fontFamily": null,
      "color": "#fff",
      "x": 60,
      "y": 28
    }
  },
  "tabBar": {
    "y": 90,
    "height": 56,
    "background": "rgba(0,0,0,0.2)",
    "tabs": ["声音", "画面", "游戏"]
  },
  "contentArea": {
    "x": 40,
    "y": 160,
    "width": 1200,
    "height": 500
  },
  "footer": {
    "height": 60,
    "buttons": [
      { "id": "back-to-title", "text": "返回标题", "x": 1050, "y": 15 }
    ]
  },
  "elements": []
}
```

**渲染优先级**：当 `elements` 非空时，保持现有的自由布局渲染逻辑（`_renderCustom`）。当 `elements` 为空但存在 `header`/`tabBar`/`contentArea` 时，使用新的结构化渲染——引擎自动把 `SETTING_DEFS` 里的设置项渲染成 `widgetStyles` 指定样式的控件，按分组放入对应 Tab。

### 5.5 对话框（扩展现有）

在 `ui.theme` 的对话框配置基础上新增：
```json
"dialogueBox": {
  "nameplateStyle": "inline",
  "showSpeakerPortrait": false,
  "portraitSize": 48,
  "portraitRadius": 24
}
```

`nameplateStyle` 枚举：
- `"inline"` — 说话人名字在文字区上方（当前默认行为）
- `"floating"` — 浮动气泡，定位在对话框左上角外侧
- `"banner"` — 横幅条样式（千恋万花风格，横跨整个宽度）

---

## 六、Layer 4：主题包格式（`.gmtheme`）

主题包是一个 ZIP 文件，后缀名为 `.gmtheme`，解压后得到：

```
wafuu-sakura.gmtheme (ZIP)
├── theme.json          ← 主题元数据 + 所有配置数据
└── assets/             ← 所需 UI 贴图（对应 theme.json 中引用的路径）
    ├── panel_paper.png
    ├── tab_ribbon.png
    └── ...
```

`theme.json` 结构：
```json
{
  "id": "wafuu-sakura",
  "name": "和风·樱",
  "description": "温暖大地色调，宣纸质感，适合日本传统题材",
  "version": "1.0",
  "author": "Galgame Maker",
  "preview": "assets/preview.jpg",
  "tokens": {
    "primary": "rgba(220, 80, 80, 0.9)",
    "..."
  },
  "widgetStyles": { "..." },
  "screens": {
    "settingsScreen": { "..." },
    "saveLoadScreen": { "..." },
    "gameMenu": { "..." },
    "backlogScreen": { "..." },
    "dialogueBox": { "..." }
  }
}
```

**应用主题包的流程**（编辑器侧执行）：
1. 解压 `.gmtheme` 文件
2. 将 `theme.json` 的 `tokens` 写入 `script.json` → `ui.theme.tokens`
3. 将 `widgetStyles` 写入 `script.json` → `ui.widgetStyles`
4. 将 `screens.*` 各字段写入 `script.json` → `ui.*`
5. 将 `assets/` 目录下的文件复制到项目的 `assets/ui/` 目录
6. 触发编辑器保存

**导出主题包的流程**（编辑器侧执行）：
1. 从 `script.json` 读取 `ui.theme.tokens`、`ui.widgetStyles`、`ui.settingsScreen` 等
2. 扫描所有配置字段中引用的图片路径（背景图、贴图等），这些路径都以 `ui/` 开头
3. 从项目 `assets/ui/` 目录收集这些文件
4. 打包为 ZIP，写入 `theme.json` 和 `assets/` 目录

---

## 七、引擎侧实现细节

### 7.1 main.js 需要改动的部分

当前实例化代码（`src/main.js` 约第 50 行）：
```js
const saveLoadScreen = new SaveLoadScreen(gameContainer, null);
const backlogScreen  = new BacklogScreen(gameContainer, audio);
const gameMenu       = new GameMenu(uiOverlay);
```

加载脚本后（`init()` 函数内，`engine.load()` 之后），需要把配置传入。**注意**：因为 UI 组件在 `engine.load()` 之前就已实例化，需要提供一个 `setLayout(config)` 方法（与 `SettingsScreen` 已有的 `setLayout` 保持一致）：

```js
// 加载脚本成功后
const ui = engine.script.ui ?? {};
saveLoadScreen.setLayout(ui.saveLoadScreen ?? null);
backlogScreen.setLayout(ui.backlogScreen ?? null);
gameMenu.setLayout(ui.gameMenu ?? null);
```

或者在实例化后通过构造函数第三参数传入——两种方式都可以，选一种保持和 `SettingsScreen` 一致。

同时，`widgetStyles` 需要传给 `SettingsScreen`：
```js
settingsScreen.setWidgetStyles(ui.widgetStyles ?? null);
```

### 7.2 Tab 形状的 DOM 和 CSS 实现

`rectangle` / `pill` / `underline` 用纯 CSS 实现（`border-radius` + `border-bottom`），无需特殊 DOM。

`trapezoid` 用 `clip-path`：
```css
/* 梯形 Tab，左右各裁 12px */
clip-path: polygon(12px 0%, calc(100% - 12px) 0%, 100% 100%, 0% 100%);
```

`ribbon` 用 `clip-path` 或九宫格贴图（若 `tab.nineSlice` 非空则优先贴图）：
```css
/* 缎带：右侧切角 */
clip-path: polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%);
```

### 7.3 Toggle 控件的 DOM 结构

不同 `style` 值对应完全不同的 HTML，由引擎根据 `widgetStyles.toggle.style` 选择：

**`"pill"`**：
```html
<div class="gm-toggle gm-toggle-pill" data-on="false">
  <div class="gm-toggle-thumb"></div>
  <span class="gm-toggle-label-on">ON</span>
  <span class="gm-toggle-label-off">OFF</span>
</div>
```

**`"radio"`**：
```html
<div class="gm-toggle gm-toggle-radio">
  <label><input type="radio" name="{id}" value="on"> <span class="gm-radio-custom"></span> ON</label>
  <label><input type="radio" name="{id}" value="off" checked> <span class="gm-radio-custom"></span> OFF</label>
</div>
```

**`"button-pair"`**：
```html
<div class="gm-toggle gm-toggle-btnpair">
  <button class="gm-toggle-btn gm-btn-on">ON</button>
  <button class="gm-toggle-btn gm-btn-off active">OFF</button>
</div>
```

### 7.4 SettingsScreen 结构化模式渲染逻辑

当进入结构化模式时（`elements` 为空，存在 `header`/`tabBar` 等字段），`SettingsScreen` 的 `_renderDefault()` 需要重写为：

1. 渲染 `header` 区域（背景图 + 标题文字）
2. 渲染 `tabBar`（按 `widgetStyles.tab` 的 shape 渲染 Tab 形状）
3. 渲染 `contentArea`（一个 `panel`，应用 `widgetStyles.panel` 样式）
4. 将 `SETTING_DEFS` 里的设置项分组（声音/画面/游戏），按当前激活 Tab 渲染到 `contentArea`
5. 每个设置控件根据 `widgetStyles.toggle` / `widgetStyles.slider` 渲染对应 DOM

设置项与 Tab 分组的映射关系（可硬编码）：
```js
const SETTING_GROUPS = {
  '声音': ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'],
  '画面': ['window-mode', 'dialogue-opacity'],
  '游戏': ['text-speed', 'auto-speed', 'skip-mode'],
};
```

---

## 八、内置主题套件

随版本附带以下主题包，作为可直接应用的内置选项：

| ID | 名称 | 风格参考 | Tab 形状 | 开关样式 | 主色调 |
|----|------|---------|---------|---------|------|
| `default` | 默认 | 现代暗色 | `rectangle` | `pill` | 紫色系 |
| `wafuu` | 和风·桜 | 千恋万花 | `ribbon` | `button-pair` | 粉红/大地色 |
| `modern-sky` | 蒼穹 | 蒼の彼方 | `trapezoid` | `radio` | 蓝/白 |
| `fantasy-dark` | 幻想·夜 | 深色奇幻 | `pill` | `pill` | 紫/金 |
| `minimal-white` | 纯白 | 现代极简 | `underline` | `checkbox` | 白/黑 |

每套主题包含：完整 `tokens`（41 个颜色变量）+ `widgetStyles`（5 类控件）+ 各屏幕布局配置 + 所需 UI 贴图资源。

---

## 九、编辑器侧：UI 设计器（新标签页）

### 9.1 整体结构

在现有 6 个标签页（游戏内容/标题页/设置页/素材库/角色/项目设置）之外，新增第 7 个标签页：**UI 设计器**。

包含以下子区域：
```
UI 设计器
├── 主题包    ← 内置主题库卡片 + 导入/导出
├── 控件风格  ← widgetStyles 可视化编辑器（Tab/开关/滑块/按钮/面板）
├── 各界面   ← 各界面布局编辑 + 预览
│   ├── 标题页（已有，迁移入此）
│   ├── 设置页（已有，扩展）
│   ├── 存档/读档（新增）
│   ├── 游戏菜单（新增）
│   └── 回想（新增）
└── 对话框   ← 字体/名牌样式/说话人头像
```

### 9.2 控件风格编辑器交互

以 **Tab 风格** 为例：
- 形状选择器：5 个可视化缩略图，点击选择（rectangle / pill / underline / trapezoid / ribbon）
- 颜色选择：激活色 / 非激活色 / 激活文字色 / 非激活文字色
- 图片槽：激活状态贴图（选填，触发九宫格配置）
- 右侧实时预览：即时渲染一个模拟 Tab 条（2-3 个假 Tab）

以 **开关风格** 为例：
- 样式选择器：4 个可视化缩略图（pill / radio / checkbox / button-pair）
- 颜色：开启色 / 关闭色 / 滑块/按钮色
- 标签文字：ON/OFF 文字自定义
- 右侧实时预览

### 9.3 主题包管理

- **内置主题库**：卡片网格，每张卡显示预览图 + 名称 + 描述
- **一键应用**：确认弹窗（"这会覆盖当前所有 UI 设置，是否继续？"），确认后写入 `script.json` 并触发保存
- **导入**：选择文件对话框，接受 `.gmtheme`；解压、校验 `theme.json` 格式、写入
- **导出**：将当前 `ui.*` 配置 + 所有 `assets/ui/` 引用文件打包为 `.gmtheme`
- **基于当前创建**：以现有配置为基础，弹出对话框填写名称/描述/作者后打包导出

### 9.4 界面预览方案

所有界面（存档/游戏菜单/回想）的预览使用编辑器内嵌的 `<iframe>`，指向游戏引擎的 `index.html`，通过 `postMessage` 传入当前 `script.json` 的 UI 配置。修改任何配置字段后，debounce 500ms 刷新预览。

---

## 十、实现优先级

### P0 — 引擎配置化（基础必做）

这是后续一切的前提，不依赖编辑器 UI，纯引擎改动：

1. **`GameMenu` 接受 `layoutConfig`**：支持背景图、按钮文字自定义，`null` 时行为不变
2. **`SaveLoadScreen` 接受 `layoutConfig`**：支持背景图、标题文字、slot 样式，`null` 时行为不变
3. **`BacklogScreen` 接受 `layoutConfig`**：支持背景图、条目样式，`null` 时行为不变
4. **`main.js` 传入配置**：`init()` 成功加载脚本后，从 `engine.script.ui` 取出各界面配置传给对应组件
5. **`SettingsScreen` 结构化模式**：`elements` 为空时使用 `header/tabBar/contentArea` 结构渲染，从 `widgetStyles` 取控件样式
6. **Toggle 控件实现**：`pill` 和 `button-pair` 两种 DOM 结构（覆盖大多数需求）

### P1 — 内置主题 + 编辑器可视化

7. **内置 2 套主题**（`wafuu` 和 `modern-sky`）：完整 tokens + widgetStyles + 各界面配置 + 贴图资源
8. **编辑器 UI 设计器标签页**：控件风格编辑器 + 内置主题一键应用
9. **各封闭界面的结构化编辑器**：存档/游戏菜单/回想的布局参数编辑

### P2 — 社区分享

10. **主题包导出**（`.gmtheme` 格式，ZIP 打包）
11. **主题包导入**（解压、校验、写入、拷贝资源）
12. 内置主题扩充至 5 套

### P3 — 完整上限

13. **Tab `ribbon` / `trapezoid` 精细实现**（clip-path 调优或九宫格贴图支持）
14. **`nameplateStyle: "banner"`** 对话框名牌横幅
15. **设置页 `header` 图片横幅**

---

## 十一、关键约束与注意事项

1. **向后兼容**：所有改动对无 `widgetStyles` 字段的旧项目必须零视觉变化。每个新字段缺失时用原有硬编码默认值。

2. **不要改 `SETTING_DEFS`**：设置项的类型和数量由 `src/engine/settingDefs.js` 的 `SETTING_DEFS` 决定，这个文件只需要增，不需要改现有条目。

3. **不要改 Layer 1（`tokens.js` + `ThemeManager`）**：颜色 Token 系统已经稳定，v2 是在它之上新增层，不是替换它。

4. **`script.json` 是唯一数据源**：引擎和编辑器都从 `script.json` 读取 UI 配置，不要引入额外的配置文件。

5. **图片路径约定**：主题相关的 UI 贴图统一存放在项目的 `assets/ui/` 目录，配置中的路径相对于 `assets/` 目录（即 `"ui/panel.png"` 对应 `assets/ui/panel.png`）。

6. **不要动 `DialogueBox`、`CharacterLayer`、`BackgroundLayer`**：这三个组件不在本次改动范围内，稳定性优先。
