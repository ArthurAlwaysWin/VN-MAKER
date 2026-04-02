# Phase 15: Voice Engine Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2025-07-18
**Phase:** 15-voice-engine-foundation
**Areas discussed:** 语音停止时机, 逐句音量, 设置页迁移

---

## 语音停止时机

| Option | Description | Selected |
|--------|-------------|----------|
| 推进对话时停止，菜单/设置时继续播放 | 主流 galgame 行为 | |
| 推进对话时停止，菜单/设置时暂停（恢复后继续） | 暂停+恢复模式 | |
| 任何操作都停止 | 最简单实现 | |

**User's choice:** 自定义方案 — 推进到有语音的下一句时停止上一句，推进到无语音的下一句时让当前语音自然播完。返回标题/关闭游戏时强制停止，打开菜单/设置时不中断。
**Notes:** 关键区别在于 `stopVoice()` 不在每次推进时调用，只在 `playVoice()` 内部自动替换、返回标题、关闭游戏时调用。

---

## 逐句音量

| Option | Description | Selected |
|--------|-------------|----------|
| 纯路径字符串 `"audio/voice.mp3"` | 简单，统一 voiceVolume * masterVolume | ✓ |
| 对象 `{ file, volume }` | 支持逐句音量差异 | |

**User's choice:** 纯路径字符串
**Notes:** 后续如需逐句音量可扩展为对象格式（向后兼容）。

---

## 设置页迁移

| Option | Description | Selected |
|--------|-------------|----------|
| 旧项目不动，新项目默认包含 | 零迁移风险 | ✓ |
| 旧项目自动追加语音音量滑块 | 需计算放置位置 | |

**User's choice:** 不需要迁移 — 项目未上线，无旧数据
**Notes:** 直接注册 voice-volume 到 settingDefs，新项目默认布局包含即可。

---

## Agent's Discretion

- voice 通道架构选择（持久 HTMLAudioElement vs one-shot）
- voiceVolume 默认值
- playVoice/stopVoice/setVoiceVolume 方法签名

## Deferred Ideas

None
