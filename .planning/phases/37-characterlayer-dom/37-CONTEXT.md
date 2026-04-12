# Phase 37: CharacterLayer DOM 重构 - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

将 CharacterLayer 从单 `<img>` 元素重构为双图层容器结构（div 容器 + 两个 img 子元素），为 Phase 38 crossfade 奠定基础。保持 4 种定位模式和进出场动画完全不变，接口签名不变。

</domain>

<decisions>
## Implementation Decisions

### DOM 结构
- **D-01:** 容器 div 承载定位 class + 进出场动画（opacity+transform），两个 img 子元素只负责图片显示
- **D-02:** 两个 img 子元素命名 `.char-img-a` / `.char-img-b`，当前活跃的加 `.active` 类（与 BackgroundLayer 的 `bg-image-layer` 模式一致）
- **D-03:** `this.characters` Map value 从 `HTMLImageElement` 改为 `{container, imgA, imgB}` 结构化对象，另需记录 `_activeImg: 'A'|'B'`

### 尺寸与定位
- **D-04:** 容器 div 接管原 `.character-sprite` 的所有定位/尺寸属性（`position:absolute; bottom:0; height:90%; max-width:50%`）
- **D-05:** 子 img 用 `position:absolute; width:100%; height:100%; object-fit:contain; object-position:bottom center` 填满容器，两个 img 完全重叠
- **D-06:** 容器设 `position:relative`（或保留 absolute）使 img children 相对容器定位

### 进出场动画兼容
- **D-07:** 容器 div 负责 opacity+transform（进出场），子 img 只负责 opacity（crossfade，Phase 38 启用）
- **D-08:** Phase 37 中只有一个 img 显示（`.active` opacity:1），另一个隐藏（opacity:0），进出场动画行为与重构前完全一致

### 改动范围
- **D-09:** 只修改 CharacterLayer.js 的 4 个方法（show/hide/setExpression/clear）+ style.css
- **D-10:** 接口签名不变 — show(data)/hide(data)/setExpression(data)/clear() 参数和行为不变
- **D-11:** setExpression() 在 Phase 37 仍为即时 src 切换（crossfade 延到 Phase 38）
- **D-12:** 外部调用方（main.js/ScriptEngine）无需改动

### Agent's Discretion
- img 子元素的 z-index 策略（只要两个 img 重叠正确即可）
- 容器 div 的 overflow 属性（visible or hidden）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 引擎渲染层
- `src/ui/CharacterLayer.js` — 重构目标文件，当前单 img 实现（120 行）
- `src/ui/BackgroundLayer.js` — 双层 crossfade 参考模式（layerA/layerB + .active 切换）
- `src/style.css:117-173` — .character-sprite 全部 CSS 规则（定位、动画、尺寸）

### 引擎入口
- `src/main.js:19,45` — CharacterLayer 实例化点
- `.planning/research/ARCHITECTURE.md` — v1.0 架构研究（crossfade 实现方案）

### 需求
- `.planning/REQUIREMENTS.md` — ENG-01（本 Phase 覆盖的需求）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BackgroundLayer.js** 双层模式：layerA/layerB + `.active` 类 + `_activeLayer` 状态追踪 → 直接照搬到 CharacterLayer
- **style.css `.bg-image-layer`** 的 opacity 过渡 CSS → 可作为 `.char-img-a/.char-img-b` 的模板

### Established Patterns
- **进出场动画**: `enter-fade`/`enter-slide-left`/`enter-slide-right` + `entered` 类，用 `requestAnimationFrame` 双帧触发
- **定位**: `pos-left`/`pos-center`/`pos-right`/`pos-custom` 四个 class
- **退场**: `entered` 移除 + setTimeout cleanup

### Integration Points
- `main.js` L45 实例化 `new CharacterLayer(charLayer, '')` — basePath 为空字符串
- ScriptEngine 调用 `characters.show(data)`/`.hide(data)`/`.setExpression(data)` — 接口不变

</code_context>

<specifics>
## Specific Ideas

- 与 BackgroundLayer 完全对齐的 A/B 双层模式
- 用户强调接口签名不变，外部零改动
- Phase 37 是纯重构 — 视觉上必须零回归

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-characterlayer-dom*
*Context gathered: 2026-04-12*
