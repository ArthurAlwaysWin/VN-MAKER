---
phase: 55
slug: left-tab-mode-decorations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 55 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 + jsdom |
| **Config file** | vite.config.js (test section) |
| **Quick run command** | `npx vitest run tests/leftTabDecorations.test.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/leftTabDecorations.test.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 55-01-01 | 01 | 1 | STRUCT-06 | unit | `npx vitest run tests/leftTabDecorations.test.js -t "left-tab"` | ❌ W0 | ⬜ pending |
| 55-01-02 | 01 | 1 | DECOR-01 | unit | `npx vitest run tests/leftTabDecorations.test.js -t "decorations"` | ❌ W0 | ⬜ pending |
| 55-01-03 | 01 | 1 | DECOR-02 | unit | `npx vitest run tests/leftTabDecorations.test.js -t "reset"` | ❌ W0 | ⬜ pending |
| 55-01-04 | 01 | 1 | DECOR-03 | unit | `npx vitest run tests/leftTabDecorations.test.js -t "background"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/leftTabDecorations.test.js` — test stubs for STRUCT-06, DECOR-01, DECOR-02, DECOR-03
- Existing infrastructure covers framework and fixture needs

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
