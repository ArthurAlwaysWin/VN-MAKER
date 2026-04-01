# Phase 13: Transitions & Branching - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

用户可以创建选择分支页面，编辑选项（文本 + 跳转目标 + 变量设置），以及通过场景级跳转实现分叉→汇合故事结构。

此阶段交付：
- 右键菜单切换页面类型（普通页 ↔ 选择页）
- 选择页的 Inspector 编辑器（prompt + options 列表）
- 每个选项支持 text + target（场景跳转）+ setVariable
- 场景 `nextScene` 属性用于分支汇合
- 选项卡片拖拽排序 + 删除

此阶段不包含：
- 新增转场类型（已有 fade/slide-left/slide-right/none 满足 EFFECT-01/02）
- 好感度系统/仪表板
- 故事结构可视化图
- 条件页（condition type）编辑器 UI

</domain>

<decisions>
## Implementation Decisions

### 页面类型切换 UX
- **D-01:** 通过侧栏 SceneTree 右键菜单实现，菜单项"转换为选择页"/"转换为普通页"
- **D-02:** 双向切换支持——普通页可转选择页，选择页可转回普通页
- **D-03:** 转回普通页时丢弃 prompt 和 options 数据（可加确认提示）

### 选项编辑器布局
- **D-04:** Inspector 内嵌列表式编辑器——选择页时，对话编辑区域替换为选项编辑区域
- **D-05:** 布局：prompt 输入框 + 选项卡片列表 + 底部"添加选项"按钮
- **D-06:** 每个选项卡片包含：text 输入框 + target 场景下拉 + setVariable 区域（变量名 + 值）
- **D-07:** 选项卡片右侧有 ✕ 删除按钮，支持拖拽排序
- **D-08:** 选项数量无上限，新建选择页默认创建 2 个空选项

### 跳转目标
- **D-09:** 场景级跳转——每个选项的 target 指向场景 ID，引擎执行 `_enterScene(sceneId)` 跳到场景首页
- **D-10:** 跳转目标使用下拉选择器，列出所有场景名称
- **D-11:** 场景数据增加 `nextScene` 属性（默认 null = 按顺序播放），用于分支场景末尾自动跳回主线

### setVariable 支持
- **D-12:** 每个选项卡片有"设置变量"区域，可配置变量名和值
- **D-13:** 数据格式沿用引擎已有 `option.setVariable = { key: value }`

### 转场系统
- **D-14:** 现有转场系统已满足 EFFECT-01/EFFECT-02，Phase 13 不修改转场功能
- **D-15:** 转场架构已预留扩展空间（新类型 = CSS class + Inspector 选项 + Engine 匹配）

### Agent's Discretion
- 选项卡片的视觉样式（颜色、间距、图标）
- 空状态显示（无选项时的提示文案）
- setVariable 区域的折叠/展开行为
- "转换为选择页"时的确认弹窗措辞
- nextScene 下拉选择器中的默认提示文本

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 引擎选择系统
- `src/engine/ScriptEngine.js` — choice page 处理（line 258-269: emit 'choice' event），selectChoice()（line 120-144: variable 设置 + scene 跳转），condition page（line 430-451）
- `src/engine/ScriptEngine.js:290-291` — 转场类型读取（`page.transition.type`）

### 引擎 UI 层
- `src/ui/ChoiceMenu.js` — 选项渲染（line 26-94: prompt + buttons），自定义布局模式
- `src/style.css:242-263` — 选项菜单淡入动画

### 编辑器核心
- `src/editor/components/page-editor/PageInspector.vue` — 右侧检查器面板，选择页时需替换对话区为选项编辑器
- `src/editor/components/page-editor/SceneTree.vue` — 侧栏场景树，已显示 [选择页] 标记，需添加右键菜单项
- `src/editor/stores/script.js` — Pinia store，createDefaultPage()（line ~92-103），需扩展选择页模板

### 数据格式参考
- `.planning/phases/10-page-data-schema-engine-adaptation/10-CONTEXT.md` — D-04 定义了选择页数据模型
- `public/game/script.json` — 页面式脚本示例

### 编辑器状态
- `src/editor/composables/usePageEditor.js` — provide/inject 共享状态，可能需要新 refs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **SceneTree.vue 右键菜单**: 已有右键菜单基础设施（删除/重命名），扩展"转换类型"菜单项
- **PageInspector.vue 分区模式**: collapsible sections + form-group 模式，选项编辑器沿用
- **Inspector 拖拽**: 对话列表已实现拖拽排序（如果有的话），选项列表可复用相同模式
- **下拉选择器**: Inspector 中已有 select 控件模式（转场类型下拉），场景选择器沿用

### Established Patterns
- **pushState()**: 所有数据变更需调用 `script.pushState()` 支持撤销/重做
- **provide/inject**: usePageEditor.js 通过 Symbol 提供共享状态
- **响应式表单**: Inspector form-group + field-input CSS class 模式
- **asset:// 协议**: 已有的自定义协议用于资源加载

### Integration Points
- **SceneTree.vue 右键菜单**: 添加"转换为选择页/普通页"菜单项
- **PageInspector.vue**: 根据 page.type 条件渲染对话编辑区或选项编辑区
- **script.js store**: createDefaultPage() 需要选择页模板；场景数据需 nextScene 字段
- **ScriptEngine.js**: nextScene 逻辑——场景最后一页播完后检查 nextScene

</code_context>

<specifics>
## Specific Ideas

- 分叉→汇合模式：选项跳到分支场景，分支场景 nextScene 跳回主线，实现"走不同小路但最终回到同一条大路"
- 选项编辑器灵感参考 PPT 的"超链接设置"——每个选项是一个可配置的动作卡片
- setVariable 为未来好感度系统打基础（每个选项可以给角色加好感分数）

</specifics>

<deferred>
## Deferred Ideas

- **好感度/亲密度系统** — 每个角色维护好感度变量，共通线结束后按好感度自动路由到个人线。需要：好感度仪表板 UI、条件自动路由逻辑、角色好感度配置界面
- **故事结构可视化图** — 只读的树状/图状场景关系图，显示主线→分支→汇合关系。帮助用户"看清自己在写什么"。纯参考用，不可在其上直接操作
- **条件页（condition type）编辑器 UI** — 引擎已支持条件页（变量检查 + 分支跳转），但编辑器 UI 未做
- **更多转场类型** — 溶解、百叶窗、放大缩小等。架构已预留扩展空间

</deferred>

---

*Phase: 13-transitions-branching*
*Context gathered: 2026-04-01*
