---
phase: 36
slug: tooltip
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-11
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework in project |
| **Config file** | none |
| **Quick run command** | `grep -r '<button' src/editor/ \| grep -v 'title='` (title audit) |
| **Full suite command** | Manual visual sweep of all 6 editor areas |
| **Estimated runtime** | ~30 seconds (grep) / ~5 minutes (visual) |

---

## Sampling Rate

- **After every task commit:** Manual visual check — hover over HelpTip instances, verify bubble appears
- **After every plan wave:** `grep -r '<button' src/editor/ | grep -v 'title='` — verify button title coverage
- **Before `/gsd-verify-work`:** Visual sweep of all 6 editor areas + button title audit grep
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 1 | HELP-01 | manual-only | Visual: hover ? icon → bubble appears | N/A | ⬜ pending |
| 36-01-02 | 01 | 1 | HELP-02 | semi-auto | `grep -r '<button' src/editor/ \| grep -v 'title='` | N/A | ⬜ pending |
| 36-01-03 | 01 | 1 | HELP-03 | manual-only | Visual: theme editor help content | N/A | ⬜ pending |
| 36-01-04 | 01 | 1 | HELP-04 | manual-only | Visual: export help content | N/A | ⬜ pending |
| 36-01-05 | 01 | 1 | HELP-05 | manual-only | Visual: project settings help | N/A | ⬜ pending |
| 36-01-06 | 01 | 1 | HELP-06 | manual-only | Visual: script editor help | N/A | ⬜ pending |
| 36-01-07 | 01 | 1 | HELP-07 | manual-only | Visual: resource library help | N/A | ⬜ pending |
| 36-01-08 | 01 | 1 | HELP-08 | manual-only | Visual: designer help content | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework setup needed — this is a manual-only validation phase (pure UI-presentational).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HelpTip ? icon hover → bubble display | HELP-01 | Visual interaction, no test framework | Hover over ? icon, verify bubble appears with correct text, verify fade animation |
| Button title attributes | HELP-02 | Semi-automated via grep | Run grep audit, visually verify remaining cases |
| Theme editor help content | HELP-03 | Content correctness | Navigate to theme editor, hover all HelpTip instances |
| Export help content | HELP-04 | Content correctness | Open export modal, hover all HelpTip instances |
| Project settings help | HELP-05 | Content correctness | Navigate to project settings, hover all HelpTip instances |
| Script editor help | HELP-06 | Content correctness | Navigate to script editor, hover all HelpTip instances |
| Resource library help | HELP-07 | Content correctness | Navigate to resource library, hover all HelpTip instances |
| Designer help content | HELP-08 | Content correctness | Navigate to title/settings designers, hover all HelpTip instances |

---

## Validation Sign-Off

- [x] All tasks have manual verify or Wave 0 dependencies
- [x] Sampling continuity: grep audit between visual checks
- [x] Wave 0 covers all MISSING references (none needed)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
