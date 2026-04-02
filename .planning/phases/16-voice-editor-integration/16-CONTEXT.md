# Phase 16: Voice Editor Integration - Context

**Gathered:** 2025-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

编辑器中对话语音的选择、试听和批量绑定。包括：PageInspector 语音选择器 UI、语音试听 ▶ 按钮、AudioPicker voice 模式、批量命名匹配（单场景+全局）、匹配预览确认弹窗。

不包括：引擎侧语音播放（Phase 15 已完成）、回想屏语音重放（Phase 18）、自动模式等语音播完（Phase 18）。

Requirements: VOICE-02, VOICE-03, VOICE-07

</domain>

<decisions>
## Implementation Decisions

### D-04: AudioPicker 复用方式
- AudioPicker 新增 `mode` prop，可选值 `'audio'`（默认，显示 BGM/SE 标签栏）和 `'voice'`
- `mode="voice"` 时：隐藏标签栏，标题改为"选择语音文件"，fileList 仍显示全部 audio/ 文件
- 其余逻辑（MiniPlayer 试听、确认/取消）不变
- emit 返回的路径格式不变：`audio/{filename}`

### D-05: 编辑器语音试听方式
- 在 PageInspector 的对话编辑区使用 `new Audio()` 直接播放
- **不依赖预览 iframe** — 预览可能未启动，试听应独立工作
- 点击 ▶ 播放绑定语音，再次点击或切换对话时停止
- 与 AudioPicker 内的 MiniPlayer 播放方式一致

### D-06: 批量命名匹配作用域与入口
- **双入口设计**，共享核心匹配函数：
  - **单场景入口**: SceneTree 每个场景标题行添加 🔊 按钮，匹配该场景下所有对话
  - **全局入口**: SceneTree 顶部工具栏添加"批量语音匹配"按钮，匹配所有场景
- 核心匹配函数接受 scope 参数（sceneId 或 'all'）
- 命名规则: `{characterId}_{sceneIndex}_{pageIndex}_{dialogueIndex}.{ext}`
- sceneIndex = 场景在 scenes 对象中的索引顺序（0-based）

### D-07: 批量匹配冲突处理
- 匹配完成后**先弹窗显示预览摘要**，不直接应用
- 摘要内容：将绑定 N 条新语音，已绑定 M 条（可选跳过/覆盖）
- 用户选择后才执行绑定操作
- 使用 Vue 模态弹窗（Teleport to body），不用 window.confirm（Electron 不支持 prompt）

### Agent's Discretion
- 语音字段在对话列表行中的视觉提示方式（如 🔊 图标）由 agent 决定
- 批量匹配预览弹窗的具体布局由 agent 设计
- `setDialogueVoice()` 函数是否调用 `pushState()` 遵循现有模式（select = pushState，continuous input = 不调用）
- 对话默认值 `{ speaker: null, text: '', expression: null, voice: null }` 的添加位置由 agent 决定

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Editor dialogue UI
- `src/editor/components/page-editor/PageInspector.vue` lines 74-134 — 对话列表 + 对话编辑区
- `src/editor/components/page-editor/PageInspector.vue` lines 358-402 — addDialogue, removeDialogue, setSpeaker, setDialogueExpression, setDialogueText 函数
- `src/editor/components/page-editor/PageInspector.vue` line 259 — selectedDialogue computed

### AudioPicker component
- `src/editor/components/page-editor/AudioPicker.vue` — 完整组件（props: visible, defaultTab; emits: select, close）
- `src/editor/components/resource-library/MiniPlayer.vue` — 音频试听播放器组件

### Script store (data model)
- `src/editor/stores/script.js` line 92-104 — `createDefaultPage()` 对话默认值 `{ speaker: null, text: '', expression: null }`
- `src/editor/stores/script.js` line 13 — `pushState()` undo/redo 入栈函数
- `src/editor/stores/script.js` line 172 — `convertPageType()` 中也有硬编码对话默认值

### SceneTree component
- `src/editor/components/page-editor/SceneTree.vue` — 场景树组件，批量匹配按钮入口

### Asset store
- `src/editor/stores/assets.js` — `loadCategory('audio')` 获取音频文件列表

### Phase 15 engine wiring (upstream)
- `src/engine/AudioManager.js` — playVoice/stopVoice/setVoiceVolume
- `src/engine/ScriptEngine.js` — voice field in dialogue event data
- `src/main.js` — voice wiring in dialogue handler, applyConfig, onTitle

### Prior context
- `.planning/phases/15-voice-engine-foundation/15-CONTEXT.md` — D-01 语音停止时机, D-02 纯路径字符串, D-03 无迁移

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AudioPicker.vue**: 已有模态 + MiniPlayer 试听 + 文件列表 → 添加 mode prop 即可复用为语音选择器
- **MiniPlayer.vue**: `asset://audio/` 路径播放 → 语音试听可直接复用或用同样的 `new Audio()` 模式
- **pushState() 模式**: select 操作调用 pushState，continuous 输入不调用 → setDialogueVoice 选择时调 pushState
- **Teleport to body 模态**: AudioPicker 已用此模式 → 批量匹配预览弹窗同理

### Established Patterns
- **对话字段编辑**: form-group > label + input/select/textarea → voice 字段同模式
- **对话 CRUD**: 直接修改 reactive 对象 + pushState → voice 同理
- **asset:// 协议**: 已支持 Range request 的自定义协议 → 语音路径 `asset://audio/xxx.mp3` 可直接用

### Integration Points
- **PageInspector 对话编辑区**: line 123（表情 select 后）插入语音选择器 + 试听按钮
- **PageInspector addDialogue()**: line 360 的 push 对象添加 `voice: null`
- **script.js createDefaultPage()**: line 101 的 dialogues 默认值添加 `voice: null`
- **script.js convertPageType()**: line 172 的硬编码默认值添加 `voice: null`
- **SceneTree.vue**: 场景行添加 🔊 按钮 + 顶部工具栏添加全局按钮

</code_context>

<specifics>
## Specific Ideas

- 批量匹配的核心函数建议放在 composable（如 `useVoiceMatch.js`）中，PageInspector 和 SceneTree 都能调用
- 匹配函数需要遍历 scenes → pages → dialogues，用 characterId + sceneIdx + pageIdx + dlgIdx 组合命名查找 audio/ 文件
- 预览弹窗应单独封装为 VoiceMatchPreview.vue 组件
- 对话列表行中已绑定语音的对话应有视觉提示（如 🔊 图标），帮助用户快速识别

</specifics>

<deferred>
## Deferred Ideas

- 语音波形可视化（未来增强，当前 MiniPlayer 足够）
- 语音文件自动重命名工具（辅助用户按规则命名，Phase 16 只做匹配不做重命名）

</deferred>

---

*Phase: 16-voice-editor-integration*
*Context gathered: 2025-07-19*
