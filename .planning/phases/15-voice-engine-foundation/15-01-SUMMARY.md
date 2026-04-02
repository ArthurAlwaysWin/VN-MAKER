---
phase: 15-voice-engine-foundation
plan: 01
status: complete
started: 2025-07-18
completed: 2025-07-18
tasks_completed: 2
tasks_total: 2
---

## Summary

Added voice audio channel to the runtime engine — a third channel alongside BGM and SE that plays voice clips bound to dialogue lines with independent volume control.

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | Add voice channel to AudioManager, ConfigManager, settingDefs | ✅ Complete |
| 2 | Wire voice through ScriptEngine, main.js, SettingsScreen | ✅ Complete |

## Key Changes

### Task 1 — Infrastructure
- **AudioManager.js**: Added `_voice` property, `playVoice(file)`, `stopVoice()`, `setVoiceVolume(vol)`. `playVoice()` stops previous voice internally (D-01). `clear()` calls `stopVoice()`.
- **ConfigManager.js**: Added `voiceVolume: 0.8` default
- **settingDefs.js**: Added `'voice-volume'` slider registry entry with label `语音音量`

### Task 2 — Wiring
- **ScriptEngine.js**: `voice: dlg.voice || null` added to dialogue event data and history.push
- **main.js**: 
  - Dialogue handler: `if (data.voice) { audio.playVoice(data.voice) }` — D-01 compliant, no unconditional stopVoice
  - `applyConfig()`: `audio.setVoiceVolume(config.get('voiceVolume') * master)`
  - `gameMenu.onTitle`: `audio.stopVoice()`
  - `engine.on('end')`: `audio.stopVoice()` in both preview and normal branches
  - Preview `stop`: `audio.stopVoice()`
  - Preview `mute`: `audio.setVoiceVolume(0)` / restore
- **SettingsScreen.js**: Voice volume slider in default layout + `_bindSlider` call

## Key Decisions
- D-01 honored: voice stops only on `playVoice()` internal call, return-to-title, game-end, preview-stop. Advancing to unvoiced dialogue does NOT stop current voice.
- D-02 honored: Pure path string `dlg.voice || null`, not object format
- D-03 honored: No migration — direct addition

## Deviations
None.

## Build Verification
- `npx vite build`: ✅ 97 modules, all 3 outputs succeed

## Key Files

### Modified
- `src/engine/AudioManager.js` — voice channel (playVoice/stopVoice/setVoiceVolume)
- `src/engine/ConfigManager.js` — voiceVolume default
- `src/engine/settingDefs.js` — voice-volume registry
- `src/engine/ScriptEngine.js` — voice in dialogue event + history
- `src/main.js` — all voice wiring points
- `src/ui/SettingsScreen.js` — voice volume slider

## Self-Check: PASSED
All acceptance criteria verified via automated pattern checks and build.
