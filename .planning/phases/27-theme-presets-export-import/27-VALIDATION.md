---
phase: 27
slug: theme-presets-export-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework in project) |
| **Config file** | none |
| **Quick run command** | `npx vite build` (build verification) |
| **Full suite command** | `npx vite build && npm run dev` (build + manual check) |
| **Estimated runtime** | ~15 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npx vite build` — verify zero build errors
- **After every plan wave:** Manual visual verification in Electron dev mode
- **Before `/gsd-verify-work`:** Full export→import round-trip test
- **Max feedback latency:** 15 seconds (build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-* | 01 | 1 | PRE-01 | manual | `npx vite build` | ❌ W0 | ⬜ pending |
| 27-01-* | 01 | 1 | PRE-02 | manual | `npx vite build` | ❌ W0 | ⬜ pending |
| 27-02-* | 02 | 2 | PKG-01 | manual | `npx vite build` | ❌ W0 | ⬜ pending |
| 27-02-* | 02 | 2 | PKG-02 | manual | `npx vite build` | ❌ W0 | ⬜ pending |
| 27-02-* | 02 | 2 | PKG-03 | manual | `npx vite build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install fflate` — ZIP library dependency (new for v0.6)
- [ ] Verify `npx vite build` passes after fflate install

*No test framework install needed — all validation is manual via Electron dev mode.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 4 preset cards display and preview works | PRE-01 | UI interaction, no test framework | Open 主题 tab → click 预设 → verify 4 cards → click one → verify iframe updates |
| Token edit after preset doesn't reset others | PRE-02 | Multi-step UI interaction | Apply preset → change one token → verify other tokens unchanged |
| Export produces valid .theme ZIP | PKG-01 | File system + ZIP verification | Export → open .theme as ZIP → verify theme.json + images/ |
| Import .theme applies tokens + images | PKG-02 | Full round-trip visual check | Export → close project → import → verify visual match |
| formatVersion present in exported file | PKG-03 | File content inspection | Export → extract ZIP → check theme.json has formatVersion: 1 |

---

## Validation Sign-Off

- [ ] All tasks have build verification via `npx vite build`
- [ ] Manual verification covers all 5 requirements
- [ ] Wave 0 covers fflate installation
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s (build only)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
