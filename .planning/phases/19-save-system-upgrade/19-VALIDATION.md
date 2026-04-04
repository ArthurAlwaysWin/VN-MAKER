---
phase: 19
slug: save-system-upgrade
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework installed; manual smoke testing |
| **Config file** | None |
| **Quick run command** | `npx vite build` (build succeeds = no compile errors) |
| **Full suite command** | `npx vite build` + manual smoke test |
| **Estimated runtime** | ~15 seconds (build) + manual |

---

## Sampling Rate

- **After every task commit:** Run `npx vite build` — confirms no syntax/import errors
- **After every plan wave:** Build + manual smoke test in running Electron app
- **Before `/gsd-verify-work`:** Full build green + manual walkthrough of all 8 requirements
- **Max feedback latency:** 15 seconds (build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | SAVE-01 | build + manual | `npx vite build` | ✅ | ⬜ pending |
| 19-01-02 | 01 | 1 | SAVE-02 | build + manual | `npx vite build` | ✅ | ⬜ pending |
| 19-01-03 | 01 | 1 | SAVE-07 | build + manual | `npx vite build` | ✅ | ⬜ pending |
| 19-02-01 | 02 | 1 | SAVE-03 | build + manual | `npx vite build` | ✅ | ⬜ pending |
| 19-02-02 | 02 | 1 | SAVE-04 | build + manual | `npx vite build` | ✅ | ⬜ pending |
| 19-02-03 | 02 | 1 | SAVE-06 | build + manual | `npx vite build` | ✅ | ⬜ pending |
| 19-02-04 | 02 | 1 | SAVE-08 | build + manual | `npx vite build` | ✅ | ⬜ pending |
| 19-03-01 | 03 | 2 | SAVE-05 | build + manual | `npx vite build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework install needed — project uses manual smoke testing (consistent with v0.1-v0.4).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| File writes to saves/ with atomic pattern | SAVE-01 | Electron IPC + file system, no headless runner | Save game → check saves/ dir for slot_NNN.json + slot_NNN.jpg |
| IPC handlers respond correctly | SAVE-02 | Requires running Electron app | Open DevTools → invoke each IPC handler → verify response |
| Async SaveManager works end-to-end | SAVE-03 | Full integration requires running game | Save → load → verify state restored (scene, page, audio) |
| Screenshot captured as 320×180 JPEG | SAVE-04 | Requires running window for capturePage() | Save → check slot_NNN.jpg exists, verify dimensions |
| Migration from localStorage | SAVE-05 | Requires existing localStorage data in renderer | Create old-format saves → open project → verify migration toast + new files |
| asset://saves/ loads thumbnails | SAVE-06 | Requires asset:// protocol in Electron | `<img src="asset://saves/slot_001.jpg">` loads without errors |
| version: 2 in save JSON | SAVE-07 | Quick file read | Save → read slot_NNN.json → confirm version field = 2 |
| saves/ dir created; history truncated | SAVE-08 | Requires running project context | Open project → verify saves/ dir; save with 60+ dialogue lines → verify ≤50 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: build check after every task commit
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (build only)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
