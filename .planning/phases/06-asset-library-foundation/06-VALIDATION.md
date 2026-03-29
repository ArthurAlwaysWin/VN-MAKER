---
phase: 6
slug: asset-library-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2025-07-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification + Node.js scripts (no test framework in project) |
| **Config file** | none — no test framework installed |
| **Quick run command** | `npx vite build` |
| **Full suite command** | `npx vite build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vite build`
- **After every plan wave:** Run `npx vite build` + manual IPC verification
- **Before `/gsd-verify-work`:** Full build must be green + manual testing
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | INFRA-03 | build | `npx vite build` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | ASSET-03 | build | `npx vite build` | ✅ | ⬜ pending |
| 06-01-03 | 01 | 1 | ASSET-04 | build | `npx vite build` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 1 | INFRA-02 | build | `npx vite build` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 1 | ASSET-12 | build | `npx vite build` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 2 | INFRA-04 | build | `npx vite build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework install needed — Phase 6 is backend infrastructure verified via build + manual IPC testing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Magic bytes reject invalid file | ASSET-03 | Requires running Electron app + importing bad file | Import a .txt file renamed to .png → expect red error |
| Auto-naming on collision | ASSET-04 | Requires running app + importing same-name file twice | Import file.png twice → expect file.png + file-1.png |
| Font loads in editor window | INFRA-02 | Requires visual verification of font dropdown | Import .ttf → font appears in SettingsDesigner dropdown |
| Font loads in engine preview | INFRA-02 | Requires opening preview window | Import .ttf → font renders in engine preview |
| Corrupt font dialog prompt | ASSET-12 | Requires visual confirmation of dialog | Import broken .ttf → expect red text + delete dialog |
| Reactive Proxy safe IPC | INFRA-04 | Requires triggering IPC from Vue component | All new IPC calls work without serialization errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
