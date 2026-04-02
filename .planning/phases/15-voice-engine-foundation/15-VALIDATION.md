# Phase 15 — Voice Engine Foundation: Validation Architecture

## Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no test framework configured |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-01 | Voice field in dialogue data model | automated | `Select-String` pattern check for `voice` in ScriptEngine event data | ❌ (created by plan) |
| VOICE-04 | AudioManager voice channel API | automated | `node -e "import('./src/engine/AudioManager.js')..."` API existence check | ❌ (created by plan) |
| VOICE-05 | Engine plays voice on dialogue, D-01 conditional stop | automated | `Select-String` for `if (data.voice)` guard in main.js, no unconditional stopVoice | ❌ (created by plan) |
| VOICE-06 | Voice volume slider + master volume scaling | automated | `Select-String` for `voiceVolume` in settingDefs + applyConfig wiring | ❌ (created by plan) |

## Sampling Rate

- **Per task commit:** Automated pattern checks (Select-String / node -e) in plan verify blocks
- **Per wave merge:** Full manual playthrough of voiced dialogue sequence
- **Phase gate:** All 6 truths from PLAN.md verified (automated + manual)

## Wave 0 Gaps

- No test framework exists in the project — all verification is manual + automated pattern checks
- Test infrastructure creation is out of scope for this phase (consistent with all prior phases)
- Both tasks in 15-01-PLAN.md include `<automated>` verify commands

## Automated Verification Commands

### Task 1 — Infrastructure (AudioManager + ConfigManager + settingDefs)
```powershell
node -e "import('./src/engine/AudioManager.js').then(m => { const a = new m.AudioManager(); console.log('playVoice:', typeof a.playVoice); console.log('stopVoice:', typeof a.stopVoice); console.log('setVoiceVolume:', typeof a.setVoiceVolume); })"
```

### Task 2 — Wiring (ScriptEngine + main.js + SettingsScreen)
```powershell
Select-String -Pattern "voice" -Path src/engine/ScriptEngine.js
Select-String -Pattern "playVoice|stopVoice|setVoiceVolume" -Path src/main.js
Select-String -Pattern "voiceVolume" -Path src/engine/settingDefs.js
Select-String -Pattern "voice" -Path src/ui/SettingsScreen.js
```

## Metadata

- **Created:** 2025-07-18
- **Source:** Extracted from 15-RESEARCH.md Validation Architecture (lines 427-452) + 15-01-PLAN.md verify blocks
