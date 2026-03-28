# Galgame Maker — 「PPT 式可视化编辑器」升级方案

## 一、设计理念

视觉小说的每一帧本质上就是一张**幻灯片**：一张背景图、若干角色立绘、一段对白文本、几个可交互按钮。这与 PowerPoint 的「画布 + 可拖拽元素」模型天然吻合。

**核心目标**：让开发者像制作 PPT 一样，在一块 1280×720 的画布上**自由拖放、定位、调整**所有视觉元素——角色、对话框、按钮、标题文字等，并实时看到效果。

---

## 二、现有引擎兼容性评估

### 2.1 总体结论

> **现有引擎架构可以支持此升级，且无需重写。**

引擎采用 **事件驱动 + 模块解耦** 设计（ScriptEngine 发射事件 → UI 组件响应渲染），核心执行循环不含任何定位逻辑，这意味着我们可以在不改动引擎核心的前提下，逐步扩展各 UI 组件的定位能力。

### 2.2 各模块改造难度

| 模块 | 当前定位方式 | 支持自由定位的难度 | 说明 |
|------|-------------|-------------------|------|
| **BackgroundLayer** | `position: absolute; inset: 0`（全屏铺满） | 🟢 极低 | 背景本身就是全屏的，几乎无需改动 |
| **ScriptEngine** | 不涉及定位，只传递数据 | 🟢 极低 | 只需在事件数据中透传新的 x/y/style 字段 |
| **DialogueBox** | CSS 硬编码 `bottom: 0; left: 0; right: 0` | 🟡 中等 | 需将硬编码位置改为可由 JS 内联样式覆盖 |
| **ChoiceMenu** | Flex 居中全屏遮罩 | 🟡 中等 | 需增加 `layout: "custom"` 模式，支持按钮独立定位 |
| **TitleScreen** | Flex 居中排列 | 🟡 中等 | 需将按钮改为可独立定位的元素 |
| **CharacterLayer** | CSS 类 `.pos-left/center/right` | 🟠 较高 | 需从 3 个预设位置改为任意坐标，且过渡动画依赖定位原点 |

### 2.3 向后兼容策略

所有新增字段均设为**可选**。引擎采用「优先检测新字段，回退旧行为」的混合模式：

```javascript
// 示例：CharacterLayer.show()
if (data.x !== undefined || data.y !== undefined) {
  // 新模式：自由坐标定位
  el.style.left = `${data.x}px`;
  el.style.top = `${data.y}px`;
} else {
  // 旧模式：预设位置（left/center/right）
  el.classList.add(`pos-${data.position || 'center'}`);
}
```

**结论**：现有的 `script.json` 脚本无需任何修改即可在升级后的引擎中正常运行。

---

## 三、script.json 数据模型扩展

### 3.1 角色立绘：从 3 个预设 → 自由坐标

```jsonc
// 旧格式（继续支持）
{ "type": "show_character", "id": "sakura", "position": "center" }

// 新格式
{
  "type": "show_character",
  "id": "sakura",
  "expression": "smile",
  "x": 320,          // 像素坐标
  "y": 80,
  "scale": 1.0,      // 缩放比例
  "transition": "fade",
  "duration": 500
}
```

### 3.2 对话框：可自定义外观与位置

```jsonc
{
  "type": "dialogue",
  "speaker": "sakura",
  "text": "这段对白使用了自定义样式。",
  "style": {
    "x": 50, "y": 520,
    "width": 1180, "height": 170,
    "fontSize": 20,
    "fontFamily": "Microsoft YaHei",
    "textColor": "#ffffff",
    "backgroundColor": "rgba(8, 8, 20, 0.85)",
    "padding": [20, 40, 20, 40],
    "borderRadius": 12
  }
}
```

### 3.3 选项按钮：支持独立定位

```jsonc
{
  "type": "choice",
  "layout": "custom",
  "options": [
    {
      "text": "开始冒险",
      "jump": "chapter1",
      "style": {
        "x": 540, "y": 400,
        "width": 200, "height": 50,
        "fontSize": 18,
        "fontFamily": "serif",
        "color": "#fff",
        "backgroundColor": "rgba(0,0,0,0.6)",
        "borderRadius": 8
      }
    },
    {
      "text": "读取存档",
      "action": "load",
      "style": {
        "x": 540, "y": 470,
        "width": 200, "height": 50,
        "fontSize": 18
      }
    }
  ]
}
```

### 3.4 标题画面：完全自定义布局

在 `script.json` 的 `meta` 或新增 `ui` 节点中配置：

```jsonc
{
  "ui": {
    "titleScreen": {
      "background": "backgrounds/title_bg.png",
      "elements": [
        {
          "type": "text",
          "content": "樱花之约",
          "x": 640, "y": 200,
          "fontSize": 56,
          "fontFamily": "STKaiti, serif",
          "color": "#ffffff",
          "anchor": "center"       // 锚点：center / topLeft / bottomRight...
        },
        {
          "type": "button",
          "action": "start",
          "text": "开 始 游 戏",
          "x": 640, "y": 420,
          "width": 240, "height": 48,
          "fontSize": 18,
          "color": "#ffffff",
          "hoverColor": "#ffcc00",
          "anchor": "center"
        },
        {
          "type": "button",
          "action": "load",
          "text": "载入存档",
          "x": 640, "y": 490,
          "width": 240, "height": 48
        },
        {
          "type": "button",
          "action": "settings",
          "text": "系统设置",
          "x": 640, "y": 560,
          "width": 240, "height": 48
        }
      ]
    }
  }
}
```

---

## 四、编辑器端：PPT 式画布的实现方案

### 4.1 核心交互：画布预览 + 拖拽定位

编辑器的中间工作区需要新增一个 **Canvas Preview Panel**——一块等比缩放的 1280×720 画布，实时渲染当前帧的所有元素。

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar  │        Canvas Preview (1280×720)       │ Inspector │
│           │  ┌──────────────────────────────────┐  │           │
│  Scenes   │  │  [背景图]                         │  │  Position │
│  Assets   │  │       ┌──────┐                    │  │  x: 320   │
│  Chars    │  │       │ 立绘  │                    │  │  y: 80    │
│           │  │       └──────┘                    │  │  Scale    │
│           │  │                                    │  │  1.0      │
│           │  │  ┌─────────────────────────────┐  │  │           │
│           │  │  │  对话框（可拖拽调整位置/大小）│  │  │  Font     │
│           │  │  └─────────────────────────────┘  │  │  Size: 20 │
│           │  └──────────────────────────────────┘  │  Color:    │
│  ▶ Play   │         ← 等比缩放，所见即所得 →       │  #ffffff   │
└─────────────────────────────────────────────────────────┘
```

**关键交互**：
- **点击元素** → 选中，右侧 Inspector 显示其属性
- **拖拽元素** → 实时更新 x/y 坐标
- **拖拽边角** → 调整宽高
- **右键菜单** → 层级调整（置顶/置底）、删除、复制
- **双击文本** → 进入文字编辑模式

### 4.2 技术方案

| 组件 | 推荐方案 | 理由 |
|------|---------|------|
| 画布渲染 | **HTML/CSS DOM**（非 Canvas 2D） | 与引擎渲染方式一致，所见即所得保真度最高 |
| 拖拽交互 | **原生 mousedown/mousemove/mouseup** 或 `@vueuse/core` 的 `useDraggable` | 轻量、可控 |
| 缩放适配 | CSS `transform: scale()` | 将 1280×720 画布缩放到编辑器实际可用区域 |
| 选中框/控制柄 | 自研 SVG 覆盖层 | 类似 Figma 的选中蓝框 + 八个拖拽柄 |
| 对齐辅助 | 磁吸参考线（snap guides） | 居中线、等距线，提升摆放效率 |

### 4.3 编辑器视图模式

建议编辑器支持两种视图模式，用户可自由切换：

| 模式 | 适用场景 | 说明 |
|------|---------|------|
| **📋 时间轴模式**（现有） | 编排对话流程、分支逻辑 | 类似 Twine / Yarn，聚焦叙事结构 |
| **🖼️ 画布模式**（新增） | 调整视觉布局、自定义 UI | 类似 PPT / Figma，聚焦视觉呈现 |

两种模式操作同一份数据（Pinia store），切换无缝。

---

## 五、实施路线图

### Phase 2.1 — 引擎层：数据驱动定位

**目标**：让运行时引擎能读取并正确渲染 x/y 坐标、自定义样式。

- 扩展 `ScriptEngine` 事件数据，透传 `x, y, scale, style` 字段
- 改造 `CharacterLayer`：支持像素坐标定位，保留旧 `position` 字段兼容
- 改造 `DialogueBox`：支持位置、字体、颜色等自定义样式
- 改造 `ChoiceMenu`：支持按钮独立定位与样式
- 改造 `TitleScreen`：支持从 `script.json` 读取布局配置
- 重构相关 CSS：将硬编码定位移至 JS 内联样式
- 全面回归测试：确保现有脚本无损运行

### Phase 2.2 — 编辑器层：画布预览与拖拽

**目标**：在编辑器中实现所见即所得的拖拽式编辑体验。

- 新建 `CanvasPreview.vue` 组件：1280×720 等比缩放画布
- 实现元素渲染层：将当前帧的背景/立绘/对话框/按钮渲染为可交互 DOM 节点
- 实现拖拽系统：mousedown → mousemove → mouseup，实时同步坐标到 Pinia store
- 实现选中框与控制柄（resize handles）
- Inspector 面板联动：选中元素后右侧显示 x/y/width/height/font/color 等属性表单
- 实现视图模式切换（时间轴 ↔ 画布）

### Phase 2.3 — 编辑器层：标题画面设计器

**目标**：专门针对标题画面提供独立的画布编辑体验。

- 新建 `TitleDesigner.vue` 视图
- 支持拖入文本元素、按钮元素到画布
- 按钮支持绑定内置动作（`start` / `load` / `settings`）
- 文本支持自定义字体、字号、颜色、阴影
- 实时预览标题画面效果

### Phase 2.4 — 打磨与增强

- 磁吸对齐参考线（居中线、等距线）
- 键盘微调（方向键 ±1px，Shift + 方向键 ±10px）
- 复制/粘贴元素
- 多选与批量移动
- Ctrl+Z / Ctrl+Y 撤销重做（已有基础设施）
- 右键上下文菜单

---

## 六、风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 向后兼容性 | 旧脚本在新引擎上表现异常 | 所有新字段可选，缺失时回退到硬编码默认值 |
| 坐标系统复杂度 | 不同分辨率下元素错位 | 统一以 1280×720 设计分辨率为基准，运行时按比例缩放 |
| 过渡动画适配 | 角色进退场动画依赖固定定位原点 | 重构过渡动画以元素当前坐标为起点 |
| 编辑器性能 | 画布实时渲染大量元素可能卡顿 | 使用虚拟化、节流渲染更新频率 |
| 设计自由度 vs 易用性 | 过度自由导致新手困惑 | 提供模板预设（经典布局/现代布局等），可一键应用后微调 |

---

## 七、总结

现有引擎的**事件驱动、模块解耦**架构为此次升级提供了良好基础。核心改造集中在 **UI 组件的定位方式**（从 CSS 硬编码 → JS 数据驱动）和 **编辑器新增画布交互层** 两个方面，无需重写引擎核心逻辑。

升级完成后，Galgame Maker 将成为一个真正意义上的「**视觉小说版 PowerPoint**」——创作者可以像做幻灯片一样，用鼠标拖放、调整每一个画面元素的位置和样式，大幅降低创作门槛。
