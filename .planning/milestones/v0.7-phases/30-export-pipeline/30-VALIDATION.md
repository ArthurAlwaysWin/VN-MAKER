---
phase: 30
slug: export-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---
# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in Node.js test runner) |
| **Config file** | none — tests run directly |
| **Quick run command** | `node --test tests/exportGame.test.js` |
| **Full suite command** | `node --test tests/exportGame.test.js tests/scanAssets.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/exportGame.test.js`
- **After every plan wave:** Run `node --test tests/exportGame.test.js tests/scanAssets.test.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | PIPE-01 | integration | `node --test tests/exportGame.test.js` | ❌ W0 | ⬜ pending |
| 30-01-02 | 01 | 1 | PIPE-02 | integration | `node --test tests/exportGame.test.js` | ❌ W0 | ⬜ pending |
| 30-01-03 | 01 | 1 | PIPE-03 | integration | `node --test tests/exportGame.test.js` | ❌ W0 | ⬜ pending |
| 30-01-04 | 01 | 1 | PIPE-04 | integration | `node --test tests/exportGame.test.js` | ❌ W0 | ⬜ pending |
| 30-01-05 | 01 | 1 | PIPE-05 | integration | `node --test tests/exportGame.test.js` | ❌ W0 | ⬜ pending |
| 30-01-06 | 01 | 1 | PIPE-07 | integration | `node --test tests/exportGame.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/exportGame.test.js` — stubs for PIPE-01 through PIPE-07
- [ ] Test fixtures (mock script.json, mock assets directory)

*Existing scanAssets.test.js (40 tests) covers scanner; new tests focus on export pipeline orchestration.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exported folder playable in browser | PIPE-01 | Requires HTTP server + browser render | Serve output with `npx serve output/` and verify game loads |
| ZIP opens correctly | PIPE-05 | Requires decompression + content check | Extract ZIP, verify all expected files present |
| Progress events reach renderer | PIPE-07 | Requires Electron renderer context | Open dev console during export, verify events received |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
