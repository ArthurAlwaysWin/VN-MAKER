# Phase 40: 表情選擇器 UI - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

编辑器提供视觉化缩略图表情选择器组件（ExpressionDropdown），替换 PageInspector 中角色行和对话行的纯文字 `<select>`。涵盖组件创建、两处集成点替换、Teleport 定位、点击外部/ESC 关闭。

</domain>

<decisions>
## Implementation Decisions

### 触发器外观
- **D-01:** 触发器显示为 24px 缩略图（当前表情图）+ 表情名文字 + ▼ 下拉箭头，紧凑嵌入 inspector 行内。无表情时（"不变"状态）只显示「不变」文字，无缩略图。

### 「不变」选项呈现
- **D-02:** 对话级表情选择器（nullable 模式）在网格第一格显示「不变」文字卡片，与缩略图同等尺寸，灰色背景 (#3c3c3c) 视觉区分。选中时边框与表情卡片一致（#007acc）。

### 网格布局参数
- **D-03:** 缩略图网格使用 60px 列宽 + 48×48px 图片 + max-height 约 300px 可滚动。比 CharacterPicker 的 80px 网格更紧凑，适合 inspector 下拉场景。表情名文字在缩略图下方显示（截断长名）。

### 定位与关闭行为
- **D-04:** 使用 Teleport to="body" + fixed 定位，出现在触发器正下方（通过 getBoundingClientRect 计算）。关闭方式：点击网格外部任意位置 + ESC 键。ESC 需要 stopPropagation 防止冒泡到游戏菜单 ESC 优先级链。如果下方空间不足，向上弹出。

### Agent's Discretion
- 表情名截断策略（text-overflow: ellipsis 或字符限制）
- 网格外层 padding/margin 具体数值
- 选中态动画（是否有微小过渡效果）
- 空表情字典时的占位提示

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 核心修改目标
- `src/editor/components/page-editor/PageInspector.vue:51-57` — 角色行表情 `<select>`（替换点 #1）
- `src/editor/components/page-editor/PageInspector.vue:116-125` — 对话行表情 `<select>`（替换点 #2）
- `src/editor/components/page-editor/PageInspector.vue:447-449` — `getCharExpressions(charId)` 数据访问函数
- `src/editor/components/page-editor/PageInspector.vue:495-499` — `setCharExpression(idx, expr)` 更新函数
- `src/editor/components/page-editor/PageInspector.vue:552-556` — `setDialogueExpression(expr)` 更新函数

### 可复用模式参考
- `src/editor/components/page-editor/CharacterPicker.vue` — 表情缩略图网格模式（80px grid + 64×64 img + #007acc 选中边框 + fixed overlay）
- `src/editor/components/page-editor/AudioPicker.vue` — Teleport to body + fixed 定位 modal 模式
- `src/editor/components/resource-library/AssetPickerModal.vue` — 点击外部关闭模式（overlay click handler）
- `src/editor/components/HelpTip.vue` — Teleport + getBoundingClientRect 固定定位 + viewport flip 模式

### 数据模型
- `src/editor/stores/script.js` — `script.data.characters[charId].expressions` 字典（expressionName → imagePath）
- 角色行数据: `page.characters[idx] = { id, expression, position, x, y, scale }`
- 对话行数据: `page.dialogues[idx] = { speaker, expression (nullable), text, voice }`

### Bug 修复记录
- `docs/bugfixes-2026-04-15.md` — Bug 3 (ESC 键优先级链变更) 影响 D-04 的 ESC 关闭实现

### 需求
- `.planning/REQUIREMENTS.md` — UI-01（ExpressionDropdown 组件）、UI-02（PageInspector 集成）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **CharacterPicker.vue 网格模式**: `grid-template-columns: repeat(auto-fill, minmax(80px, 1fr))` + 64×64 缩略图 + `.selected { border: 2px solid #007acc }` → 调整为 60px/48×48 后直接复用
- **AssetPickerModal.vue 关闭模式**: overlay click handler `if (e.target === e.currentTarget) emit('close')` → 复用
- **HelpTip.vue 定位计算**: `getBoundingClientRect()` + viewport flip + `position: fixed` → 复用定位逻辑
- **AudioPicker.vue Teleport 结构**: `<Teleport to="body">` + overlay div → 复用组件结构

### Established Patterns
- **Teleport + fixed**: 所有弹出组件（HelpTip、AudioPicker、AssetPickerModal）统一使用 Teleport to body + fixed 定位 + z-index 9999
- **选中态**: `border: 2px solid #007acc` 是全编辑器统一的选中高亮色
- **暗色主题**: 背景 `#1e1e1e` / `#2a2a2a`，边框 `#3c3c3c`，文字 `#ccc`
- **表情数据**: `script.data?.characters?.[charId]?.expressions || {}` — dict of name → path

### Integration Points
- PageInspector 角色行 (line 51-57): 替换 `<select>` 为 `<ExpressionDropdown>`
- PageInspector 对话行 (line 116-125): 替换 `<select>` 为 `<ExpressionDropdown :nullable="true">`
- 数据流: 组件接收 charId + value，emit change 事件，父组件调用 setCharExpression/setDialogueExpression

</code_context>

<specifics>
## Specific Ideas

- 触发器在 inspector 行内要足够紧凑（24px 缩略图），不能破坏现有行高
- 缩略图使用 `object-fit: contain` 保持表情完整显示
- 对话级的「不变」选项是灰色文字卡片，视觉明确区分于真实表情
- 选择表情后下拉框自动关闭

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 40-expression-selector-ui*
*Context gathered: 2026-04-15*
