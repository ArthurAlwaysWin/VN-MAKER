---
phase: 32
slug: desktop-game-runtime
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2025-07-15
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected (project uses node:test for scanAssets but no game runtime tests) |
| **Config file** | none — Wave 0 may add test helpers |
| **Quick run command** | `npx electron electron/game/main.js --test-dir tests/game-runtime/fixture` |
| **Full suite command** | Manual walkthrough: launch → save → quit → relaunch → load → verify → toggle modes |
| **Estimated runtime** | ~60 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Manual verification — launch test game dir with `npx electron electron/game/main.js`
- **After every plan wave:** Full manual walkthrough: launch → save → quit → relaunch → load → verify saves persist → toggle window modes
- **Before `/gsd-verify-work`:** Full suite must pass all 4 requirements
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | RUNTIME-01 | manual | Launch test game, verify BrowserWindow + index.html loads | ❌ Manual | ⬜ pending |
| 32-01-02 | 01 | 1 | CUSTOM-03 | manual | Launch test game, verify window dimensions match config | ❌ Manual | ⬜ pending |
| 32-02-01 | 02 | 1 | RUNTIME-02 | manual | Save/load/delete slots, verify files in userData | ❌ Manual | ⬜ pending |
| 32-02-02 | 02 | 1 | RUNTIME-03 | manual | Toggle fullscreen/windowed/borderless from settings | ❌ Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Assemble minimal test game directory at `tests/game-runtime/fixture/` with pre-built engine output
- [ ] Verify `npx electron electron/game/main.js` can launch with test fixture directory

*No automated test framework needed — this phase is Electron runtime code verified by manual launch and IPC interaction.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Game launches and shows engine UI | RUNTIME-01 | Requires Electron process + display | 1. Build engine 2. Assemble test game dir 3. `npx electron electron/game/main.js` 4. Verify window appears with engine UI |
| Saves persist across sessions | RUNTIME-02 | Requires filesystem + relaunch | 1. Save to slot 1 2. Close game 3. Relaunch 4. Load slot 1 5. Verify data intact |
| Window mode toggle works | RUNTIME-03 | Requires display + user interaction | 1. Open settings 2. Toggle fullscreen 3. Toggle borderless 4. Toggle windowed 5. Verify each mode |
| Window opens at configured resolution | CUSTOM-03 | Requires display measurement | 1. Set project resolution to 1280×720 2. Launch game 3. Verify window size matches |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: manual verification after each task commit
- [ ] Wave 0 covers test fixture assembly
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
