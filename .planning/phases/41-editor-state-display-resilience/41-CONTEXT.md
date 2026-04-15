# Phase 41: 編輯器狀態展示與容錯 - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

编辑器画布准确显示角色表情（含继承逻辑），新建页面时自动复制前一页的角色/背景/BGM 数据，删除表情前确认并自动替换引用，引擎增加防御性表情验证。

</domain>

<decisions>
## Implementation Decisions

### 继承表情的视觉展示
- **D-01:** 不需要视觉区分继承 vs 显式设置。Inspector 和画布统一显示解析后的表情名 + 缩略图，无论表情来自页面数据还是继承。用户的心智模型是 PPT 式操作——同一场景下新页面默认拥有前一页的所有元素。
- **D-02:** 不需要继承来源提示（无「来自第 X 页」tooltip 或标记）。

### 新建页面行为（PPT 式复制）
- **D-03:** 新建页面时自动复制前一页（同一场景内）的：角色数组（含表情、位置、缩放）、背景图、BGM。对话数组和语音留空。用户在复制的基础上进行编辑。
- **D-04:** 新场景的第一页为空白状态（无角色、无背景、无 BGM）。

### 删除表情的确认与自动替换
- **D-05:** 删除表情前，系统检查所有页面对该表情的引用。如无引用 → 直接删除。如有引用 → 弹窗提示「您在页面 1, 2, 3, 4 使用了该角色表情差分，是否仍然删除该表情？删除后，将自动把所有引用替换为第一个表情」，用户确认后才执行删除 + 批量替换。
- **D-06:** 替换目标为 `Object.keys(expressions)[0]`（第一个表情），与 Phase 39 D-02 的 fallback 规则一致。

### 引擎防御性验证
- **D-07:** ScriptEngine 表情解析链增加一层验证：解析出 `resolvedExpr` 后，检查 `expressions[resolvedExpr]` 是否存在。不存在则 fallback 到 `Object.keys(expressions)[0]`。这是防御性编程，正常使用下不会触发（D-05 已预防 stale reference）。

### 画布 fallback
- **D-08:** PageCanvas 的 `getCharImage()` 同样增加验证：如果 `char.expression` 对应的图片不存在于 expressions 字典，fallback 到第一个可用表情。兼容旧数据和极端情况。

### Agent's Discretion
- 新建页面复制数据的具体实现方式（深拷贝 vs 结构化 clone）
- 弹窗 UI 样式（复用现有 confirm dialog 或新建）
- 引用检查的遍历范围（全部场景 vs 仅当前场景）— 建议全部场景
- 画布上角色无任何表情时的占位显示

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 核心修改目标
- `src/editor/components/page-editor/PageCanvas.vue:155-158` — `getCharImage(char)` 当前只做直接查找，需增加 fallback
- `src/editor/components/page-editor/PageCanvas.vue:8-27` — 角色渲染循环
- `src/editor/components/page-editor/PageInspector.vue` — 新建页面数据流、表情显示
- `src/engine/ScriptEngine.js:331-338` — 引擎表情解析链（需增加存在性验证）

### 新建页面相关
- `src/editor/components/page-editor/` — 页面 CRUD 操作所在目录，寻找 addPage / newPage 函数
- `src/editor/stores/script.js` — 脚本数据 store，页面操作方法

### 表情删除相关
- `src/editor/components/resource-library/` — 资源库组件，角色表情管理 UI
- `src/editor/stores/script.js` — `script.data.characters[charId].expressions` 字典
- 需要遍历 `script.data.scenes[].pages[].characters[]` 和 `script.data.scenes[].pages[].dialogues[]` 检查表情引用

### 引擎表情处理
- `src/engine/ScriptEngine.js:66` — `_expressionState` Map 声明
- `src/engine/ScriptEngine.js:331-338` — 表情解析链
- `src/engine/ScriptEngine.js:395-402` — 对话中途表情变更
- `src/ui/CharacterLayer.js:182-232` — crossfade 渲染（decode 错误已 catch）

### 可复用模式
- `src/editor/components/page-editor/CharacterPicker.vue:54-62` — 第一个表情作为默认值的模式
- `src/editor/components/page-editor/ExpressionDropdown.vue` — 表情触发器显示（Phase 40 输出）
- 现有确认弹窗模式（窗口关闭保护 3 选项对话框）可参考

### 需求
- `.planning/REQUIREMENTS.md` — UI-03（画布继承表情预览）、UI-04（stale 引用降级）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **PageCanvas.vue `getCharImage()`**: 当前只做 `expressions[char.expression]` 直接查找 → 需扩展为带 fallback 的解析链
- **PageCanvas.vue `resolveAsset()`**: `asset://` 协议解析已就绪
- **CharacterPicker.vue 默认表情模式**: `Object.keys(expressions)[0] || 'normal'` → 复用 fallback 逻辑
- **窗口关闭保护弹窗**: 已有 Electron dialog 确认弹窗模式可参考

### Established Patterns
- **引擎表情解析链**: `char.expression → _expressionState.get() → Object.keys()[0] → ''`（Phase 39 已建立）
- **asset:// 协议**: 所有资源引用统一走 `asset://` 前缀
- **表情字典**: `characters[charId].expressions = { name: imagePath }` — 扁平 key-value 结构

### Integration Points
- 新建页面函数（在 PageEditor 或 script store 中）→ 增加前页数据复制逻辑
- 角色表情删除函数（在资源库组件中）→ 增加引用检查 + 确认弹窗 + 批量替换
- PageCanvas `getCharImage()` → 增加 fallback 验证
- ScriptEngine 表情解析链 → 增加存在性检查

</code_context>

<specifics>
## Specific Ideas

- 用户的心智模型是 PPT：新页面 = 前页的复制 + 修改
- 同一场景内的页面共享角色/背景/BGM 状态，只有对话内容不同
- 新场景第一页是空白起点
- 删除表情的确认弹窗要明确列出受影响的页面编号
- 替换行为与 Phase 39 fallback 规则一致（第一个表情）

</specifics>

<deferred>
## Deferred Ideas

- **Ctrl+C / Ctrl+V 页面复制粘贴** — 用户期望像 PPT 一样选中页面后 Ctrl+C/V 复制粘贴。这是新功能，不在 Phase 41 范围内，建议作为后续 phase。

</deferred>

---

*Phase: 41-editor-state-display-resilience*
*Context gathered: 2026-04-15*
