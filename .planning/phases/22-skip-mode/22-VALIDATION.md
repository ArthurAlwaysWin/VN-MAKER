---
phase: 22
slug: skip-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 22 — Validation Strategy

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
| 22-01-01 | 01 | 1 | SKIP-02 | manual | `npx vite build` | ✅ | ⬜ pending |
| 22-01-02 | 01 | 1 | SKIP-07 | manual | `npx vite build` | ✅ | ⬜ pending |
| 22-02-01 | 02 | 2 | SKIP-01,03,04,05,06 | manual | `npx vite build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skip advances pages at ~30ms intervals | SKIP-01/D-01 | Runtime timing | Activate skip, verify rapid page advance |
| ReadHistory marks pages on page_enter | SKIP-02 | localStorage check | Play some pages, check localStorage for readHistory entries |
| Skip-read-only stops at unread pages | SKIP-03 | Runtime interaction | Switch to read-only mode, skip to unread page, verify stop |
| "▶▶ SKIP" capsule shows/hides | SKIP-04 | Visual | Activate skip, verify capsule appears top-left |
| BGM mutes during skip, restores after | SKIP-05 | Audio | Skip through BGM change, verify mute during + correct track after |
| SE/Voice suppressed during skip | SKIP-05 | Audio | Skip through voice/SE pages, verify silence |
| Transitions instant during skip | SKIP-06 | Visual | Skip through background changes, verify no fade |
| Settings toggle works | SKIP-07 | UI interaction | Open settings, toggle skip mode, verify ConfigManager persists |
| Skip stops at choice pages | D-06 | Runtime | Skip into choice scene, verify auto-stop |
| Click/key stops skip | D-06 | Interaction | During skip, click or press key, verify stop |
| QuickActionBar button toggles skip | D-13 | UI | Press skip button twice, verify toggle on/off |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
