---
phase: 26
slug: visual-theme-editor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vite build (no unit test framework — visual UI phase) |
| **Config file** | vite.config.js |
| **Quick run command** | `npx vite build` |
| **Full suite command** | `npx vite build` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vite build`
- **After every plan wave:** Run `npx vite build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | EDT-01 | build+manual | `npx vite build` | ✅ | ⬜ pending |
| 26-01-02 | 01 | 1 | EDT-02 | build+manual | `npx vite build` | ✅ | ⬜ pending |
| 26-02-01 | 02 | 1 | EDT-04 | build+manual | `npx vite build` | ✅ | ⬜ pending |
| 26-02-02 | 02 | 1 | EDT-03 | build+manual | `npx vite build` | ✅ | ⬜ pending |
| 26-03-01 | 03 | 2 | EDT-05 | build+manual | `npx vite build` | ✅ | ⬜ pending |
| 26-03-02 | 03 | 2 | EDT-02/EDT-05 | build+manual | `npx vite build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework needed — Phase 26 is a visual UI phase verified by build success + manual interaction.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 🎨 tab visible in editor | EDT-01 | UI navigation | Open editor → verify 6th tab "🎨 主题" appears |
| Color picker changes token | EDT-02 | Interactive control | Pick color → verify hex updates → verify preview reflects change |
| Slider adjusts radius/blur | EDT-02 | Interactive control | Drag slider → verify value updates → verify preview |
| 9-slice upload + slice config | EDT-03 | File upload + visual | Upload PNG → set 4 slice values → verify dashed lines on thumbnail |
| Live preview via iframe | EDT-04 | postMessage visual | Change any token → verify engine preview updates within ~200ms |
| Palette generate + apply | EDT-05 | Multi-step interaction | Pick primary color → select algorithm → preview 34 colors → apply → verify all token controls update |
| WCAG contrast indicator | EDT-05 | Visual indicator | Change text color → verify ✓/⚠️ badge → click fix → verify auto-correction |

*All phase behaviors are visual/interactive and require manual verification in addition to build checks.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
