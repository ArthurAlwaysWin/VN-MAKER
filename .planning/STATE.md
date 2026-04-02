---
gsd_state_version: 1.0
milestone: v0.4
milestone_name: 语音 & 全局字体设置
status: planning
stopped_at: Phase 16 plan-phase step 5 (research gate)
last_updated: "2025-07-19"
last_activity: 2025-07-19
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** 开发者不碰逻辑 — 只做视觉设计，引擎处理一切游戏逻辑
**Current focus:** Phase 16 — voice-editor-integration (plan-phase workflow)

## Current Position

Phase: 16
Plan: Not started (plan-phase at step 5 — research gate)
Status: Phase 15 complete, Phase 16 context gathered, planning in progress
Last activity: 2025-07-19

Progress: [██░░░░░░░░] 25% (1/4 phases)

## Performance Metrics

**Previous milestones:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v0.1 | 5 | 5 | ~2 sessions |
| v0.2 | 4 | 7 | ~3 days |
| v0.3 | 5 | 11 | ~2 days |

## Accumulated Context

### Decisions

**v0.2 decisions (carried forward):**

- [Phase 06]: 12-format magic bytes validation with RIFF sub-checks
- [Phase 06]: Asset store uses Composition API defineStore with ref/computed
- [Phase 07]: App.vue reduced from 6 to 5 tabs — 素材库+角色 merged into 资源库
- [Phase 07]: Expression path format: characters/{filename} matching asset:// protocol
- [Phase 09]: ESC priority check before isPlaying guard
- [Phase 09]: Stack-based layer management (GameMenu + Settings overlay)

**v0.3 decisions:**

- [Phase 10]: Page-based data schema replaces command-based format
- [Phase 11]: Tab-based navigation, usePageEditor composable (provide/inject)
- [Phase 12]: Modal pickers for characters, backgrounds, audio
- [Phase 13]: Choice pages with type toggle, setVariable support
- [Phase 14]: iframe preview with postMessage protocol, asset:// basePath, read-only CSS overlay

**v0.4 decisions:**

- [Phase 15]: D-01 voice stop timing — playVoice() internally stops previous, no explicit stopVoice on advance without voice
- [Phase 15]: D-02 pure path string — dialogue.voice = "audio/xxx.mp3" or null
- [Phase 15]: D-03 no migration — null default backward-compatible
- [Phase 16]: D-04 AudioPicker mode prop — mode="voice" hides tab bar
- [Phase 16]: D-05 editor voice preview via new Audio() — no iframe dependency
- [Phase 16]: D-06 dual-entry batch match — per-scene 🔊 + global button in SceneTree
- [Phase 16]: D-07 match preview dialog — confirm before applying batch bindings

### Key Context for v0.4

- AudioManager 已有 BGM (_bgm) + SE (_se) 双通道，voice 为第 3 个 HTMLAudioElement
- Inspector 已有 AudioPicker 组件可复用于语音选择器
- DialogueBox 有 `_applyStyle()` 方法接受 font size/family/color — 全局字体设置直接扩展
- ConfigManager 已管理 bgmVolume/seVolume/masterVolume — voiceVolume 同模式添加
- SETTING_DEFS 注册表 + 工厂函数 — 语音音量滑块只需加注册表条目
- 对话框透明度设置组件已存在于 SETTING_DEFS
- BacklogScreen.js 已有历史记录渲染 — 语音重放添加 ▶ 按钮
- 资源库 5 类资源（背景/角色/音频/字体/通用） — 语音文件归入音频类
- v0.4 descoped: 局部文字着色 [color] 标记 + innerHTML 重构，延后到独立里程碑

## Session Continuity

Last session: 2025-07-19
Stopped at: Phase 16 plan-phase step 5 (research gate)
Resume hint: Continue planning Phase 16 — Voice Editor Integration
Next action: `/gsd-plan-phase 16`
