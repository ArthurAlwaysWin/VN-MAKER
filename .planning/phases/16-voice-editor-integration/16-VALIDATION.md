---
phase: 16
slug: voice-editor-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework in project) |
| **Config file** | none |
| **Quick run command** | `npx vite build` (build check only) |
| **Full suite command** | `npx vite build` (build check only) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Manual visual check that the feature works
- **After every plan wave:** Full manual walkthrough of all 3 requirements
- **Before `/gsd-verify-work`:** All 4 success criteria verified manually
- **Max feedback latency:** 10 seconds (build check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | VOICE-02 | manual | Visual — open inspector, select voice | N/A | ⬜ pending |
| 16-01-02 | 01 | 1 | VOICE-03 | manual | Click ▶, verify playback in editor | N/A | ⬜ pending |
| 16-01-03 | 01 | 1 | VOICE-07 | manual | Create test audio files, run batch match | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — all validation is manual visual inspection.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Voice picker selects/clears voice file per dialogue | VOICE-02 | UI interaction — no test framework | 1. Open PageInspector 2. Select a dialogue 3. Click voice field 4. Pick audio file 5. Verify path shown 6. Click ✕ to clear |
| ▶ button plays bound voice, ✕ clears binding | VOICE-03 | Audio playback — requires Electron runtime | 1. Bind a voice to dialogue 2. Click ▶ 3. Verify audio plays 4. Click ▶ again to stop 5. Switch dialogue, verify stops |
| Batch match scans and auto-binds voice files | VOICE-07 | Requires test audio files with naming convention | 1. Create files: `{charId}_{sceneIdx}_{pageIdx}_{dlgIdx}.mp3` 2. Import to project 3. Click 🔊 in SceneTree 4. Verify preview shows matches 5. Confirm and verify bindings applied |
| Undo/redo captures voice changes | VOICE-02/03 | UI interaction | 1. Bind voice 2. Ctrl+Z 3. Verify voice cleared 4. Ctrl+Y 5. Verify voice restored |

---

## Validation Sign-Off

- [x] All tasks have manual verify instructions
- [x] Sampling continuity: manual check after every task
- [x] Wave 0: no framework needed (manual-only phase)
- [x] No watch-mode flags
- [x] Feedback latency < 10s (build check)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
