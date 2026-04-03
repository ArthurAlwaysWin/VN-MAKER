# Phase 18: Voice Polish - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

语音播放与回想屏（Backlog）复听和自动模式（Auto-mode）的无缝集成。包括：回想屏语音重放 ▶ 按钮、播放状态视觉反馈、自动模式语音感知等待逻辑、AudioManager playVoice Promise 化。

不包括：语音引擎基础（Phase 15 已完成）、编辑器语音选择/批量匹配（Phase 16 已完成）、字体设置（Phase 17 已完成）。

Requirements: VOICE-08, VOICE-09

</domain>

<decisions>
## Implementation Decisions

### 回想屏语音重放交互
- **D-01:** 点击 ▶ 直接播放语音，点击另一条目直接替换（playVoice 内部自动停止前一句，延续 Phase 15 D-01 行为）
- **D-02:** 正在播放的条目 ▶ 按钮变为 ■（可点击手动停止），同时条目添加高亮背景色，播完后自动恢复 ▶ 状态
- **D-03:** 关闭回想屏（ESC 或返回按钮）时立即调用 stopVoice() 停止语音

### 自动模式等语音策略
- **D-04:** 等待逻辑：`max(voiceDuration, textComplete + autoSpeed)` — 谁长等谁。无语音时按现有 textComplete + autoSpeed 正常推进（VOICE-09 明确要求）
- **D-05:** 当语音赢得 max 竞争（语音比文字+autoSpeed 更长）时，语音播完后额外加 300ms 微延迟再推进，避免紧接下一句
- **D-06:** `AudioManager.playVoice()` 改为返回 Promise，语音播完 resolve。这是自动模式和回想屏检测语音结束的统一通知机制

### Agent's Discretion
- AudioManager 内部 Promise 实现细节（HTMLAudioElement onended 事件包装）
- 回想屏 ■ 按钮和高亮的具体 CSS 样式
- startAutoTimer 内部重构方式（保持 100ms 轮询还是改用 Promise.race）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Engine backlog
- `src/ui/BacklogScreen.js` — 回想屏完整实现，history entries 渲染。已有 voice 字段在数据中但渲染忽略
- `src/engine/ScriptEngine.js` lines 398-403 — history.push() 已包含 `voice: dlg.voice || null`

### Engine auto-mode
- `src/main.js` lines 338-352 — `startAutoTimer()` 实现：100ms 轮询 dialogueBox.isComplete()，然后 setTimeout(autoSpeed)
- `src/main.js` lines 109-111 — dialogue 事件中 autoMode 触发 startAutoTimer()
- `src/main.js` lines 321-330 — `toggleAuto()` 函数

### Audio manager voice channel
- `src/engine/AudioManager.js` lines 121-127 — `playVoice(file)` 实现（需改为返回 Promise）
- `src/engine/AudioManager.js` lines 132-138 — `stopVoice()` 实现
- `src/engine/AudioManager.js` lines 19-22 — `_voice` HTMLAudioElement + voiceVolume

### Prior phase context
- `.planning/phases/15-voice-engine-foundation/15-CONTEXT.md` — D-01 停止时机, D-02 纯路径字符串
- `.planning/phases/16-voice-editor-integration/16-CONTEXT.md` — D-04 AudioPicker, D-05 编辑器试听

### Config & settings
- `src/engine/ConfigManager.js` line 14 — autoSpeed 默认值 2000, 范围 500-5000

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AudioManager.playVoice()**: 已有 voice 播放/停止 API → 改为返回 Promise（onended resolve）
- **ScriptEngine.history**: 已包含 voice 字段 → BacklogScreen 直接使用
- **BacklogScreen.show(history, chars)**: 已有渲染循环 → 添加 ▶/■ 按钮 + 高亮逻辑

### Established Patterns
- **playVoice 内部替换**: 新语音自动停前一句 → 回想屏点击另一条自动替换
- **backlog-entry 渲染**: forEach 创建 div.backlog-entry → 添加按钮 DOM
- **startAutoTimer 轮询**: 100ms setInterval 检查 isComplete → 可扩展检查 voice Promise

### Integration Points
- **BacklogScreen.show()**: 渲染时检查 `entry.voice`，有则添加 ▶ 按钮 + click handler
- **BacklogScreen.hide()**: 关闭时调用 `audio.stopVoice()`（需要 AudioManager 引用）
- **startAutoTimer()**: 需要 playVoice 返回的 Promise 来实现 max 等待
- **main.js dialogue handler**: playVoice 调用处需适配 Promise 返回值

</code_context>

<specifics>
## Specific Ideas

- playVoice 返回 Promise 是核心改动，影响自动模式和回想屏两个功能
- 回想屏需要持有 AudioManager 引用才能调用 playVoice/stopVoice — 目前 BacklogScreen 构造函数可能需要接收 audio 参数
- 300ms 微延迟建议用常量定义（如 VOICE_END_DELAY = 300），方便后续调整

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-voice-polish*
*Context gathered: 2026-04-03*
