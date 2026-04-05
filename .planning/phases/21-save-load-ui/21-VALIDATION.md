---
phase: 21
slug: save-load-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — no test framework in project |
| **Config file** | none |
| **Quick run command** | `npx vite build` |
| **Full suite command** | `npx vite build` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vite build`
- **After every plan wave:** Run `npx vite build`
- **Before `/gsd-verify-work`:** Build must pass
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | SLUI-01,02,03,04,05 | manual | `npx vite build` | ✅ | ⬜ pending |
| 21-01-02 | 01 | 1 | SLUI-01 | manual | `npx vite build` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 2 | SLUI-06,07 | manual | `npx vite build` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 2 | SLUI-01 | manual | `npx vite build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3×3 grid renders 9 slots/page | SLUI-01 | DOM layout, visual | Open save screen, count grid cells per page |
| Pagination switches pages 1-12 | SLUI-01 | DOM interaction | Click each page tab, verify slot numbers change |
| Arrow key pagination | SLUI-01 | Keyboard event | Press ←/→ to navigate pages |
| Slot card shows thumb+text+time | SLUI-02 | Visual content | Save a game, verify card displays all fields |
| Empty slot shows "— 空 —" | SLUI-02 | Visual content | Check empty slot rendering |
| Overwrite inline confirmation | SLUI-04 | DOM interaction | Click occupied slot in save mode, verify confirm overlay |
| Delete inline confirmation | SLUI-05 | DOM interaction | Click delete button, verify confirm overlay |
| ESC closes save/load screen | SLUI-06 | Keyboard event | Open save screen, press ESC, verify closes |
| Source-routed close (bar) | SLUI-07 | Integration | Open from QuickActionBar, close, verify returns to game |
| Source-routed close (menu) | SLUI-07 | Integration | Open from GameMenu, close, verify returns to menu |
| Source-routed close (title) | SLUI-07 | Integration | Open from title screen, close, verify returns to title |
| Mode-colored title | D-14 | Visual | Open in save mode (purple title) and load mode (blue title) |
| Load mode empty slots disabled | D-19 | Visual + interaction | Open load mode, verify empty slots are grey and unclickable |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
