---
phase: 29
slug: asset-scanner-build-config
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert / inline verification |
| **Config file** | none — phase uses inline test scripts |
| **Quick run command** | `node -e "require('./src/engine/assetScanner.js')"` |
| **Full suite command** | `npx vite build --config vite.web.config.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | SCAN-01, SCAN-02 | unit | `node -e "import('./src/engine/assetScanner.js').then(m => console.log(typeof m.scanAssets))"` | ❌ W0 | ⬜ pending |
| 29-01-02 | 01 | 1 | PIPE-06 | build | `npx vite build --config vite.web.config.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements — no test framework setup needed.
- Scanner is a pure function verifiable with Node.js import check.
- Build config verifiable with Vite build command.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scanner detects all asset types | SCAN-02 | Needs real script.json with all types | Create test script with bg, char, audio, font refs |
| Missing asset warnings | SCAN-03 | File existence check is Phase 30 | Verify scanner returns all refs, Phase 30 checks existence |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
