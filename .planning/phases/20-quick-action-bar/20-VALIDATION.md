---
phase: 20
slug: quick-action-bar
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---
# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework in project (UI-heavy, manual validation) |
| **Config file** | none |
| **Quick run command** | `npx vite build` (build validation only) |
| **Full suite command** | `npx vite build` + manual game runtime testing |
| **Estimated runtime** | ~10 seconds (build) + manual testing |

---

## Sampling Rate

- **After every task commit:** `npx vite build` — confirms no syntax/import errors
- **After every plan wave:** Manual visual testing in game runtime
- **Before `/gsd-verify-work`:** Full button bar functionality walkthrough
- **Max feedback latency:** 10 seconds (build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | BAR-02 | build | `npx vite build` | N/A | ⬜ pending |
| 20-01-02 | 01 | 1 | BAR-01 | manual | Visual: 8 buttons in dialogue box | N/A | ⬜ pending |
| 20-01-03 | 01 | 1 | BAR-03 | manual | Toggle auto/skip, check highlight | N/A | ⬜ pending |
| 20-01-04 | 01 | 1 | BAR-04 | manual | Choice page / ESC / right-click | N/A | ⬜ pending |
| 20-01-05 | 01 | 1 | BAR-05 | manual | Click button, verify no text advance | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers build validation
- No test framework needed — all BAR requirements are UI-visual behaviors
- Manual test checklist embedded in PLAN.md verification steps

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 8 buttons visible at dialogue bottom | BAR-01 | Visual DOM layout | Open game, start dialogue, verify 8 icon buttons visible |
| QuickActionBar class structure | BAR-02 | Architecture pattern | Code review: constructor, el, show/hide, callbacks |
| Auto/Skip active state highlight | BAR-03 | Visual CSS state | Toggle auto → verify purple highlight, toggle skip → same |
| Bar hides with dialogue | BAR-04 | Multi-trigger visual | Open choice page, ESC menu, right-click hide → bar hidden |
| Click doesn't advance text | BAR-05 | Event propagation | Click each button, verify dialogue text unchanged |
| F5 quicksave toast | D-10~D-14 | Runtime behavior | Press F5, verify toast + quicksave.json created |
| F9 quickload restore | D-12~D-15 | Runtime behavior | Press F9, verify game state restored from quicksave |
| Quickload disabled when no save | D-15 | Visual state | Fresh game, verify quickload button greyed out |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
