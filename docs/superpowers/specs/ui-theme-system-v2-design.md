# UI Theme System v2 — 设计规格

> **目标**：让用户无需写任何代码，用编辑器做出像《千恋万花》和《蒼の彼方》那样截然不同的界面风格。
>
> **核心原则**：保住下限（内置完整主题一键应用），放开上限（所有屏幕、所有控件都可视化定制）。

---

## 零、设计背景与可行性判断

### 0.1 产品目标的本质

这个系统要解决的不是"给用户几套模板"，而是给用户**做出好 UI 的能力**。

- **下限**：内置主题包，一键应用，社区分享，用户之间互相导入导出 `.gmtheme` 文件。
- **上限**：用户用编辑器从零设计，做出和任何内置主题都完全不同的美术风格。

两者是不同维度的事。模板解决的是"没有设计能力的用户"，编辑器表达力解决的是"有设计能力但不会写代码的用户"。这个系统必须同时服务两类人。

### 0.2 引擎可行性评估（2026-04-15）

**已经支持，可直接利用：**
- 颜色 Token（41 个 CSS 变量）— 整套色系可换
- 九宫格贴图系统 — 对话框/按钮/面板背景图可换
- `settingsScreen` 自由元素布局 — 坐标、字体、颜色可改

**结构性缺口（不改就做不到）：**

| 缺口 | 现状 | 影响范围 |
|------|------|---------|
| 控件形状语言无抽象层 | Tab 形状、开关样式写死在 HTML 里 | Layer 2 全部 |
| 三个核心界面封闭 | `GameMenu` / `SaveLoadScreen` / `BacklogScreen` 构造函数不接受任何配置 | Layer 3 的 3/5 |
| SettingsScreen 设置控件硬编码 | 音量滑块是固定 `<input type="range">`，toggle 不存在 | Layer 2 + Layer 3 |

**结论：引擎架构本身没有根本性障碍。** 它是纯 DOM 渲染，没有 Shadow DOM，没有框架锁死。所有缺口都是"加参数 + 重写 `_render()`"的工作量，不需要推倒重来。

### 0.3 真正的瓶颈不在引擎

瓶颈在两处：

**1. 编辑器的表达力设计**

形状语言（Shape Language）是"无代码做出截然不同风格"中最难的问题。缎带 Tab 和梯形 Tab 背后是完全不同的 DOM 结构。无代码化只有两条路：
- **枚举预设形状**（矩形/缎带/胶囊/梯形/下划线）：用户选一个，引擎决定 DOM 结构。可行，但上限被枚举值限制。
- **贴图驱动**：用户上传形状贴图，引擎用九宫格填充。上限更高，但九宫格配置本身有学习成本。

两者可以共存：先做枚举预设，进阶用户走贴图路线。

**2. 所见即所得的覆盖范围**

目前编辑器只能预览"标题页"和"设置页"。存档界面、游戏菜单、回想界面的外观，用户完全看不到实时效果。做 UI 设计却看不到预览，是核心体验断层，必须随界面配置化一起解决。

### 0.4 各目标难度一览

| 目标 | 难度 | 真正的瓶颈 |
|------|------|-----------|
| 模板一键应用 / 社区分享（下限） | 中等 | 主题包格式 + 资源打包，技术路径清晰 |
| 控件外观可视化选择（Tab 形状/开关样式） | 中等 | 枚举预设值的设计，编辑器 UI 工作量为主 |
| 三个封闭界面开放配置（存档/菜单/回想） | 较低 | 机械工作，改构造函数 + `_render()` |
| 完全任意美术风格（真正的上限） | 高 | 贴图驱动的形状系统 + 编辑器对所有界面的预览覆盖 |

---

## 一、问题分析：为什么现在做不到

看两张参考图，差距不在颜色——在于**形状语言**：

| 维度 | 千恋万花（和风） | 蒼の彼方（现代科幻） | 当前 Galgame Maker |
|------|---------|---------|---------|
| Tab 形状 | 缎带/旗帜造型 | 梯形填色块 | 无 Tab 概念 |
| 开关控件 | 圆角胶囊，粉色激活 | 圆形单选钮 | 仅滑块 |
| 内容面板 | 宣纸质感+花纹水印 | 白色半透明卡片 | 半透明黑色固定样式 |
| 标题区 | 图片旗帜+印章风格 | 纯文字+几何蓝条 | 纯文字 |
| 装饰元素 | 雪花图标、花边 | 几乎无装饰 | 无 |
| 背景处理 | 隐约透出游戏场景 | 天空图透出 | 固定纯黑遮罩 |

**结论**：现在的设置页设计器支持"摆元素"，但这些元素只有文字/图片/按钮三类，且内置的设置控件（音量滑块、文字速度等）是硬编码的 JS 组件，完全不受设计器控制。存档界面、回想界面、游戏菜单也是同样情况。

---

## 二、解决方案架构：四层主题系统

```
Layer 4 ── 完整主题包（Theme Package）         ← 一键应用的"皮肤"
               ↓ 包含
Layer 3 ── 屏幕布局定义（Screen Layouts）       ← 每个界面的结构配置
               ↓ 包含
Layer 2 ── 控件风格定义（Widget Styles）        ← 每类控件的外观规则
               ↓ 使用
Layer 1 ── 颜色 Token（已有）                   ← CSS 自定义属性染色
```

每一层可以独立使用，也可以打包成 Layer 4 整体切换。

---

## 三、Layer 2：控件风格定义（核心新增）

这是实现"形状语言不同"的关键。在 `script.json` 的 `ui.widgetStyles` 节增加以下定义：

### 3.1 Tab 导航栏

```json
"ui": {
  "widgetStyles": {
    "tab": {
      "shape": "ribbon",
      "activeColor": "rgba(220, 80, 80, 0.9)",
      "inactiveColor": "rgba(200, 180, 170, 0.6)",
      "activeTextColor": "#fff",
      "inactiveTextColor": "rgba(100, 60, 60, 0.8)",
      "fontSize": 14,
      "fontFamily": null,
      "iconSize": 24,
      "backgroundImage": null,
      "activeBackgroundImage": "ui/tab_active.png",
      "nineSlice": { "src": "ui/tab_ribbon.png", "slice": [0, 30, 0, 30] }
    }
  }
}
```

`shape` 枚举值：
- `"rectangle"` — 普通矩形（默认）
- `"ribbon"` — 缎带/旗帜（千恋万花风格）
- `"pill"` — 胶囊圆角
- `"trapezoid"` — 梯形（蒼の彼方风格）
- `"underline"` — 仅底部下划线高亮

### 3.2 开关控件

```json
"toggle": {
  "style": "pill",
  "onColor": "rgba(220, 80, 80, 0.85)",
  "offColor": "rgba(220, 210, 200, 0.6)",
  "thumbColor": "#fff",
  "onLabel": "ON",
  "offLabel": "OFF",
  "fontSize": 12,
  "width": 80,
  "height": 32
}
```

`style` 枚举值：
- `"pill"` — 胶囊滑动开关（千恋万花）
- `"radio"` — 圆形单选按钮组（蒼の彼方）
- `"checkbox"` — 方形勾选
- `"button-pair"` — ON/OFF 两个独立按钮

### 3.3 滑块控件

```json
"slider": {
  "trackColor": "rgba(200, 180, 170, 0.4)",
  "fillColor": "rgba(220, 80, 80, 0.7)",
  "thumbStyle": "circle",
  "thumbColor": "#fff",
  "thumbSize": 18,
  "trackHeight": 6,
  "trackImage": null,
  "thumbImage": null
}
```

### 3.4 通用面板/卡片

```json
"panel": {
  "background": "rgba(255, 248, 240, 0.92)",
  "backgroundImage": "ui/panel_paper.png",
  "backgroundImageOpacity": 0.3,
  "borderRadius": 8,
  "border": "1px solid rgba(180, 140, 130, 0.3)",
  "backdropBlur": 0,
  "padding": [24, 32]
}
```

### 3.5 通用按钮

```json
"button": {
  "background": "rgba(240, 220, 210, 0.8)",
  "backgroundImage": "ui/btn_normal.png",
  "hoverBackground": "rgba(220, 180, 170, 0.9)",
  "activeBackground": "rgba(200, 150, 140, 0.95)",
  "textColor": "rgba(120, 50, 50, 0.9)",
  "borderRadius": 20,
  "border": "1px solid rgba(180, 130, 120, 0.4)",
  "fontSize": 14,
  "nineSlice": null
}
```

---

## 四、Layer 3：屏幕布局定义（扩展到所有屏幕）

### 4.1 设置页（已有，扩展）

现有的 `ui.settingsScreen` 只支持自由拖拽元素。扩展为支持**结构化区域**：

```json
"settingsScreen": {
  "background": "ui/settings_bg.jpg",
  "backgroundOpacity": 1.0,
  "header": {
    "height": 90,
    "background": null,
    "backgroundImage": "ui/header_banner.png",
    "title": {
      "text": "系统设定",
      "fontSize": 28,
      "fontFamily": null,
      "color": "#fff",
      "x": 120,
      "y": 30,
      "icon": "ui/settings_icon.png",
      "iconSize": 40
    }
  },
  "tabBar": {
    "x": 0,
    "y": 90,
    "height": 60,
    "background": "rgba(0,0,0,0.3)",
    "tabs": []
  },
  "contentArea": {
    "x": 40,
    "y": 165,
    "width": 1200,
    "height": 520,
    "usePanel": true
  },
  "footer": {
    "y": 720,
    "height": 60,
    "buttons": [
      { "id": "back-to-title", "text": "回到标题界面", "x": 1050, "y": 15 },
      { "id": "reset-defaults", "text": "恢复默认设置", "x": 1220, "y": 15 }
    ]
  },
  "elements": []
}
```

设置内容本身（音量滑块、文字速度等）由引擎根据 `widgetStyles` 渲染，不需要用户手动摆放——这是与现有自由布局模式共存的**结构化模式**。

### 4.2 存档/读档界面（新增可配置）

```json
"saveLoadScreen": {
  "background": "ui/save_bg.jpg",
  "backdropBlur": 8,
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
    "background": "rgba(30, 30, 50, 0.6)",
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

### 4.3 游戏菜单（新增可配置）

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
    "save":    { "text": "存 档", "icon": null },
    "load":    { "text": "读 档", "icon": null },
    "backlog": { "text": "回 想", "icon": null },
    "settings":{ "text": "设 定", "icon": null },
    "title":   { "text": "返回标题", "icon": null },
    "close":   { "text": "返 回", "icon": null }
  }
}
```

### 4.4 回想界面（新增可配置）

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

### 4.5 对话框（扩展现有）

在现有字体/颜色基础上新增：

```json
"dialogueBox": {
  "position": "bottom",
  "nameplateStyle": "inline",
  "showSpeakerPortrait": false,
  "portraitSize": 48,
  "portraitRadius": 24
}
```

`nameplateStyle` 枚举：
- `"inline"` — 文字区上方（默认）
- `"floating"` — 浮动在对话框左上角外侧
- `"banner"` — 横幅条样式（千恋万花风格）

---

## 五、Layer 4：完整主题包格式

主题包是一个可导入/导出的 JSON，完整描述一套视觉风格：

```json
{
  "id": "wafuu-sakura",
  "name": "和风·樱",
  "description": "温暖大地色调，宣纸质感，适合日本传统题材",
  "version": "1.0",
  "author": "Galgame Maker",
  "preview": "ui/theme_preview.jpg",
  "tokens": { ... },
  "widgetStyles": { ... },
  "screens": {
    "settingsScreen": { ... },
    "saveLoadScreen": { ... },
    "gameMenu": { ... },
    "backlogScreen": { ... },
    "dialogueBox": { ... }
  },
  "assets": [
    "ui/panel_paper.png",
    "ui/tab_ribbon.png",
    "ui/header_banner.png"
  ]
}
```

**应用主题包时**，编辑器将上述所有数据写入 `script.json` 对应节点，并将 `assets` 列表中的文件复制到项目的 `assets/ui/` 目录。

---

## 六、编辑器侧：UI 设计器扩展

### 6.1 新增"UI 设计器"标签页

在现有 6 个标签页之外，增加独立的 **UI 设计器**标签页（或合并进现有的设置页设计器），包含以下分区：

```
UI 设计器
├── 主题包    ← 选择/导入/导出/创建主题包
├── 控件风格  ← Tab / 开关 / 滑块 / 按钮 / 面板 的可视化编辑器
├── 屏幕     ← 各屏幕布局编辑
│   ├── 标题页（已有）
│   ├── 设置页（扩展）
│   ├── 存档/读档
│   ├── 游戏菜单
│   └── 回想
└── 对话框   ← 字体/位置/名牌样式（已有，补充新选项）
```

### 6.2 控件风格编辑器（关键新交互）

以 **Tab 风格** 为例，编辑器提供：

1. **形状选择器**：视觉缩略图选择（矩形 / 缎带 / 胶囊 / 梯形 / 下划线）
2. **颜色拾色器**：激活色 / 非激活色 / 文字色
3. **图片槽**：激活状态贴图（nine-slice 配置）
4. **实时预览**：右侧显示一个模拟 Tab 的预览，即时反映所有改动

以 **开关风格** 为例：

1. **样式选择器**：胶囊滑动 / 单选按钮组 / ON-OFF 按钮对
2. **颜色**：开启色 / 关闭色 / 滑块色
3. **文字**：ON/OFF 标签自定义
4. **实时预览**

### 6.3 主题包管理界面

- **内置主题库**：以卡片形式展示所有内置主题，每张卡片有预览截图
- **一键应用**：点击应用后弹出确认框（"这会覆盖当前所有 UI 设置，是否继续？"）
- **导入主题**：拖拽或选择 `.gmtheme` 文件导入
- **导出主题**：将当前 UI 设置打包为 `.gmtheme` 文件（自动收集所有引用的 ui/ 资源）
- **基于当前创建**：以当前项目的 UI 设置为基础创建新主题包

### 6.4 屏幕布局编辑器

所有屏幕（包括存档/游戏菜单/回想）共享同一套编辑模式：

- **结构化模式**：编辑预定义的区域（页头/内容区/页脚），参数通过属性面板调整
- **预览刷新**：修改后在编辑器内嵌的预览 iframe 中立即看到效果
- **自由元素层**：在结构化区域之上，仍可像现有设计器一样拖拽添加装饰元素（图片、文字）

---

## 七、引擎侧实现要点

### 7.1 SettingsScreen 渲染器重写

现有 `SettingsScreen.js` 将系统设置（音量、文字速度等）以硬编码 HTML 渲染。需要改为：

1. 读取 `ui.settingsScreen` 的结构化配置（页头/TabBar/内容区/页脚）
2. 读取 `ui.widgetStyles` 的控件样式
3. 将内置 `SETTING_DEFS` 的设置项动态渲染为对应控件（toggle/slider/select），每个控件都用 `widgetStyles` 的样式规则生成

**关键**：设置项的数量和类型由引擎决定，样式由主题决定，两者解耦。

### 7.2 SaveLoadScreen / BacklogScreen / GameMenu 配置化

三个组件的构造函数增加接受 layout config 参数，`main.js` 初始化时传入：

```js
const saveLoadScreen = new SaveLoadScreen(
  gameContainer,
  saveManager,
  engine.script.ui?.saveLoadScreen   // ← 新增
);
```

各组件内部 `_render()` 方法读取 config，决定背景、边距、标题文字等。无 config 时使用默认值（保持向后兼容）。

### 7.3 Tab 形状渲染

Tab 形状不能用纯 CSS 做到所有枚举值（尤其是 `ribbon` 和 `trapezoid`），推荐方案：

- `rectangle` / `pill` / `underline`：纯 CSS（border-radius + border-bottom）
- `ribbon` / `trapezoid`：用 `clip-path` CSS 属性生成多边形，或使用九宫格贴图

### 7.4 Toggle 样式切换

不同 `style` 值对应不同的 DOM 结构：

- `"pill"`：`<div class="toggle-pill"><div class="toggle-thumb"></div></div>` + CSS 动画
- `"radio"`：`<label><input type="radio"> <span class="radio-custom"></span> 文字</label>`
- `"button-pair"`：`<button class="toggle-btn on">ON</button><button class="toggle-btn off">OFF</button>`

引擎在渲染设置项时，根据 `widgetStyles.toggle.style` 选择对应的 DOM 模板。

---

## 八、内置主题套件规划

建议随版本附带以下主题包，覆盖主流题材：

| 主题 ID | 名称 | 参考风格 | Tab 形状 | 开关样式 | 主色调 |
|---------|------|---------|---------|---------|------|
| `default` | 默认 | 现代暗色 | 矩形 | 胶囊 | 紫色系 |
| `wafuu` | 和风·桜 | 千恋万花 | 缎带 | ON/OFF按钮对 | 粉红/大地 |
| `modern-sky` | 蒼穹 | 蒼の彼方 | 梯形 | 单选按钮 | 蓝/白 |
| `fantasy-dark` | 幻想·夜 | 深色奇幻 | 胶囊 | 胶囊 | 紫/金 |
| `minimal-white` | 纯白 | 现代极简 | 下划线 | 方形勾选 | 白/黑 |
| `cyberpunk` | 赛博 | 科幻霓虹 | 矩形+描边 | 胶囊 | 青/紫/橙 |

每套主题包含：完整 color tokens + widgetStyles + 各屏幕布局配置 + 所需 UI 贴图资源。

---

## 九、实现优先级

### P0 — 解除"假性完整"（下限修复）
1. 把 `widgetStyles.toggle` 实现（pill / button-pair 两种即可覆盖大多数需求）
2. 把 `saveLoadScreen` 和 `gameMenu` 接受 layout config（最少支持：背景图、按钮文字自定义）
3. 内置"和风"和"蒼穹"两套完整主题包（颜色+控件+布局+贴图一体）

### P1 — 编辑器可视化（上限提升）
4. 控件风格编辑器（Tab形状 / 开关样式 的可视化选择）
5. 存档页/游戏菜单的结构化布局编辑器
6. 主题包一键应用（选主题 → 写入所有配置 → 拷贝资源文件）

### P2 — 社区传导（上限惠及下限）
7. 主题包导出（`.gmtheme` 格式）
8. 主题包导入（拖拽文件 → 解包 → 预览 → 应用）
9. 标题页/设置页可从主题包预设布局中选择（不必从空白开始设计）

### P3 — 完整上限
10. Tab 缎带/梯形形状（clip-path 或 nine-slice）
11. `nameplateStyle: "banner"` 对话框名牌横幅样式
12. 设置页 `header` 图片横幅区域（千恋万花顶部旗帜）

---

## 十、设计原则总结

> **不卖工具，卖氛围。**
>
> 普通用户打开编辑器，选一个主题，游戏就有了灵魂。有能力的创作者深入进去，改每一个像素，做出独一无二的东西。两类用户都不需要写一行代码。
>
> 区别他们的不是"能不能用"，而是"愿不愿意调"。

**判断一个新 UI 功能是否符合这个系统的方法**：
- 能从 JSON 配置驱动渲染 → 属于 Layer 2/3，值得做
- 需要用户写 CSS/JS → 不符合，找 JSON 化的替代方案
- 影响多个屏幕的全局视觉 → 属于 Layer 1/2，优先级高
- 只影响单个装饰细节 → 属于 Layer 3 的 `elements` 自由拖拽层，低优先级
