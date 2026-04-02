# Phase 15: Voice Engine Foundation - Context

**Gathered:** 2025-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

引擎可播放对话语音，独立音量控制。包括：数据模型添加 voice 字段、AudioManager voice 通道、ScriptEngine 传递语音数据、dialogue 事件触发播放、ConfigManager 语音音量、settingDefs 注册语音音量滑块。

不包括：编辑器语音选择器 UI（Phase 16）、批量命名匹配（Phase 16）、回想屏重放（Phase 18）、自动模式等语音（Phase 18）。

</domain>

<decisions>
## Implementation Decisions

### D-01: 语音停止时机
- **推进到有语音的下一句** → 停止上一句，播放新语音（`playVoice()` 内部自动停前一句）
- **推进到无语音的下一句** → 不停止当前语音，让它自然播完
- **返回标题页 / 关闭游戏** → 强制停止语音
- **打开菜单 / 设置** → 不中断语音（与 BGM 行为一致）
- 关键：`stopVoice()` 不在每次 `engine.next()` 时调用，只在 `playVoice()` 内部、返回标题、关闭游戏时调用

### D-02: Voice 字段数据格式
- **纯路径字符串**: `dialogue.voice = "audio/voice_s001.mp3"` 或 `null`
- 不使用对象格式 `{ file, volume }`
- 所有语音统一使用 `voiceVolume * masterVolume` 计算音量
- 后续如需逐句音量可扩展为对象（向后兼容）

### D-03: 设置页迁移
- **不需要迁移逻辑** — 项目未上线，无旧数据需要兼容
- 直接在 settingDefs 注册 `voice-volume`，新项目默认布局包含
- 设置页设计器组件面板可选语音音量组件

### Agent's Discretion
- voice 通道使用持久 HTMLAudioElement（类似 BGM 的 `_voice` 属性），而非 SE 的 one-shot `new Audio()` 模式
- voiceVolume 默认值由 agent 决定（建议 0.8，与 SE 一致）
- `playVoice()` / `stopVoice()` / `setVoiceVolume()` 方法签名由 agent 设计

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine audio architecture
- `src/engine/AudioManager.js` — BGM/SE 双通道模式，volume 乘法模式，basePath 用法
- `src/engine/ScriptEngine.js` lines 366-405 — `_playCurrentDialogue()` 方法，dialogue 事件数据结构
- `src/engine/ConfigManager.js` — defaults 对象，get/set/save API，localStorage 持久化
- `src/engine/settingDefs.js` — SETTING_DEFS 注册表模式（bgm-volume/se-volume/master-volume）

### Event wiring & auto-mode
- `src/main.js` lines 92-104 — dialogue 事件处理器，auto/skip 逻辑
- `src/main.js` lines 70-74 — applyConfig() 音量乘法模式
- `src/main.js` lines 323-337 — startAutoTimer() 自动模式实现

### Data model
- `public/game/script.json` — 当前 dialogue 结构 `{ speaker, text, expression }`

### Research
- `.planning/research/ARCHITECTURE.md` — Voice channel 集成方案（注意：rich text 部分已被 descope）
- `.planning/research/PITFALLS.md` — Pitfall 3（语音未停止）、Pitfall 5（master volume）相关

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AudioManager._bgm pattern**: 持久 HTMLAudioElement + volume 属性 + pause/currentTime=0 停止模式 → voice 通道直接复用
- **ConfigManager.defaults**: 已有 bgmVolume/seVolume/masterVolume → 添加 voiceVolume 同模式
- **settingDefs 注册表**: 已有 3 个 slider 定义 → 添加 `voice-volume` 完全同构
- **applyConfig() 乘法模式**: `audio.setBgmVolume(config.get('bgmVolume') * master)` → voice 同理

### Established Patterns
- **事件驱动**: ScriptEngine emit → main.js handler → AudioManager 方法调用
- **可选 null 字段**: `dlg.expression || null` 模式 → `dlg.voice || null` 同理，零迁移
- **multiplicative volume**: effective = channelVolume * masterVolume

### Integration Points
- **ScriptEngine._playCurrentDialogue()**: 在 emit('dialogue', data) 前添加 `voice: dlg.voice || null`
- **main.js dialogue handler**: 在 `dialogueBox.show(data)` 后检查 `data.voice` 并调用 `audio.playVoice()`
- **main.js applyConfig()**: 添加 `audio.setVoiceVolume(config.get('voiceVolume') * master)`
- **main.js 返回标题**: 在返回标题逻辑中调用 `audio.stopVoice()`

</code_context>

<specifics>
## Specific Ideas

- 语音停止行为是特殊的：不像 BGM（持续播放）也不像 SE（fire-and-forget），而是"有新语音时替换，无语音时让当前自然播完"
- 这意味着 dialogue handler 中不应无条件调用 `audio.stopVoice()`，而是在 `audio.playVoice()` 内部处理替换逻辑

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-voice-engine-foundation*
*Context gathered: 2025-07-18*
