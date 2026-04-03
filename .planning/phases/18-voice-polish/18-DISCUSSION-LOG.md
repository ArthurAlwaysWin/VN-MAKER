# Phase 18: Voice Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 18-voice-polish
**Areas discussed:** 回想屏语音重放交互, 自动模式等语音策略

---

## 回想屏语音重放交互

### Q1: ▶ 按钮点击行为

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle 模式 | 点击 ▶ 播放，再次点击停止 | |
| 直接替换模式 | 点击 ▶ 播放，点另一条直接替换，无需手动停 | ✓ |

**User's choice:** 方案2的核心逻辑是对的——用户点另一条直接替换，不需要先手动停，这是最自然的行为。但需要播放状态视觉反馈。

### Q2: 播放中视觉反馈

| Option | Description | Selected |
|--------|-------------|----------|
| ▶ 变 ■ + 高亮背景 | 正在播放条目图标变停止按钮，背景高亮 | ✓ |
| ▶ 变 ■ + 脉冲动画 | 图标变停止按钮，图标闪烁 | |

**User's choice:** ▶ 变 ■（可点击手动停止）+ 高亮背景

### Q3: 关闭回想屏时语音行为

| Option | Description | Selected |
|--------|-------------|----------|
| 立即停止语音 | 关闭回想屏时调用 stopVoice() | ✓ |
| 语音继续播完 | 关闭后语音自然播完 | |

**User's choice:** 关闭回想屏时立即停止语音

---

## 自动模式等语音策略

### Q4: 核心等待逻辑

| Option | Description | Selected |
|--------|-------------|----------|
| max(语音, 文字+autoSpeed) | 谁长等谁 | ✓ |
| 语音 + autoSpeed | 语音播完后总有完整停顿 | |
| 语音 + 500ms | 语音后固定短延迟 | |

**User's choice:** max(语音时长, 文字完成+autoSpeed) — 谁长等谁

### Q5: 语音赢得竞争时的微延迟

| Option | Description | Selected |
|--------|-------------|----------|
| 加 300ms 微延迟 | 避免语音刚结束就跳下一句 | ✓ |
| 不加延迟 | 语音播完立即推进 | |

**User's choice:** 语音播完后加 300ms 微延迟

### Q6: AudioManager 语音完成通知方式

| Option | Description | Selected |
|--------|-------------|----------|
| 回调/事件通知 | AudioManager emit 或 callback | |
| Promise | playVoice 返回 Promise，播完 resolve | ✓ |
| Agent 决定 | 只要能检测结束就行 | |

**User's choice:** 用 Promise（playVoice 返回 Promise，播完 resolve）

---

## Agent's Discretion

- AudioManager 内部 Promise 实现细节
- 回想屏 CSS 样式
- startAutoTimer 重构方式

## Deferred Ideas

None
