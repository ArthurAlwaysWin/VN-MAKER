---
phase: 58
slug: decoration-background-editor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 58 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vite.config.js (vitest inline config) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 58-01-01 | 01 | 1 | EDITOR-03 | unit | `npx vitest run tests/decorationEditor.test.js` | ❌ W0 | ⬜ pending |
| 58-01-02 | 01 | 1 | EDITOR-03 | unit | `npx vitest run tests/decorationEditor.test.js` | ❌ W0 | ⬜ pending |
| 58-01-03 | 01 | 1 | EDITOR-05 | unit | `npx vitest run tests/decorationEditor.test.js` | ❌ W0 | ⬜ pending |
| 58-01-04 | 01 | 1 | EDITOR-06 | manual | Manual iframe preview verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers most phase requirements. New test file needed:

- [ ] `tests/decorationEditor.test.js` — unit tests for decoration CRUD helpers, footer button helpers, panel background helpers
- Pure function tests: addDecoration, deleteDecoration, updateDecoration, addFooterButton, deleteFooterButton, updateFooterButton, setPanelBackground, setPanelOpacity

*Existing test infrastructure (vitest + jsdom) is sufficient.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live iframe preview updates | EDITOR-06 | postMessage to iframe requires running Electron | Open editor, modify decoration/footer/background, verify preview updates |
| Visual layout of form controls | N/A | CSS visual verification | Confirm form layout matches existing Section 1-3 patterns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
