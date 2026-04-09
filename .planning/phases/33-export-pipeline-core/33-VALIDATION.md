---
phase: 33
slug: export-pipeline-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2025-07-15
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test + node:assert/strict) |
| **Config file** | None — uses `node --test` CLI |
| **Quick run command** | `node --test tests/exportDesktop.test.js` |
| **Full suite command** | `node --test tests/exportDesktop.test.js tests/exportGame.test.js tests/scanAssets.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/exportDesktop.test.js`
- **After every plan wave:** Run `node --test tests/exportDesktop.test.js tests/exportGame.test.js tests/scanAssets.test.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | PIPE-01 | integration | `node --test tests/exportDesktop.test.js` | ❌ W0 | ⬜ pending |
| 33-01-02 | 01 | 1 | PIPE-02 | unit | `node --test tests/exportDesktop.test.js` | ❌ W0 | ⬜ pending |
| 33-01-03 | 01 | 1 | PIPE-03 | integration | `node --test tests/exportDesktop.test.js` | ❌ W0 | ⬜ pending |
| 33-01-04 | 01 | 1 | PIPE-06 | integration | `node --test tests/exportDesktop.test.js` | ❌ W0 | ⬜ pending |
| 33-01-05 | 01 | 1 | PIPE-07 | manual-only | N/A | N/A | ⬜ pending |
| 33-01-06 | 01 | 1 | CUSTOM-01 | unit | `node --test tests/exportDesktop.test.js` | ❌ W0 | ⬜ pending |
| 33-01-07 | 01 | 1 | CUSTOM-02 | unit | `node --test tests/exportDesktop.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/exportDesktop.test.js` — covers PIPE-01, PIPE-02, PIPE-03, PIPE-06, CUSTOM-01, CUSTOM-02
- [ ] Mock fixtures: mock appRoot with `dist-web/` + `electron/game/` + `public/default-game-icon.png`
- [ ] Test hook: `_skipPackager` to bypass actual @electron/packager invocation in unit tests

*Test design strategy: Mirror `tests/exportGame.test.js` structure — 7 describe blocks covering staging structure, asset filtering, missing assets (warnings), icon conversion, template filling, ZIP, progress callbacks. Use `_skipBuild: true` + `_appRoot: mockAppRoot` + `_skipPackager: true`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Electron binary auto-cached after first download | PIPE-07 | Requires real @electron/packager network download | Export twice on clean machine, verify second is near-instant |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
