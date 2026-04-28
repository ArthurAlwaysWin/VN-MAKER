---
phase: 83
slug: galgame-core-contract-persistence
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-28
---

# Phase 83 — Validation Strategy

> Per-phase validation contract for contract/persistence work. This phase is automation-first; no human-only UI gate is required.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Node `node:test` |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/galgameContract.test.js tests/playerDataRepository.test.js && node --test tests/effectDsl.test.js tests/scriptEngine.test.js` |
| **Full suite command** | `npx vitest run tests/galgameContract.test.js tests/playerDataRepository.test.js && node --test tests/effectDsl.test.js tests/scriptEngine.test.js && npm run build` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** run that task's exact `<automated>` command from the owning plan.
- **After every plan wave:** rerun the Quick run command.
- **Before `/gsd-verify-work`:** run the Full suite command.
- **Max feedback latency:** 90 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 83-01-01 | 01 | 1 | DATA-01, DATA-02, PERS-02 | unit / contract | `npx vitest run tests/galgameContract.test.js` | ✅ | ⬜ pending |
| 83-01-02 | 01 | 1 | DATA-01, DATA-02, PERS-02 | integration / build | `npx vitest run tests/galgameContract.test.js && npm run build` | ✅ | ⬜ pending |
| 83-02-01 | 02 | 2 | DATA-01, PERS-01, PERS-02 | unit / integration | `npx vitest run tests/playerDataRepository.test.js` | ✅ | ⬜ pending |
| 83-02-02 | 02 | 2 | DATA-01, PERS-01, PERS-02 | integration / build | `npx vitest run tests/playerDataRepository.test.js && npm run build` | ✅ | ⬜ pending |
| 83-03-01 | 03 | 3 | DATA-03 | unit / contract | `node --test tests/effectDsl.test.js` | ✅ | ⬜ pending |
| 83-03-02 | 03 | 3 | DATA-03 | integration / regression / build | `npx vitest run tests/playerDataRepository.test.js && node --test tests/effectDsl.test.js tests/scriptEngine.test.js && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None. Each plan creates its own focused test coverage in Task 1 before implementation proceeds, so there are no `MISSING` automated verifies.

---

## Manual-Only Verifications

None planned for Phase 83. This phase is contract/persistence infrastructure only; closure should come from focused automated evidence.

---

## Phase Risk Watchlist

| Risk | Why It Matters | Detection Signal |
|------|----------------|------------------|
| Title-derived persistence keys survive somewhere in runtime boot | Would silently fork player progress after rename, violating DATA-01 | Grep/test still references `meta.title` or `untitled` in persistence setup |
| Slot payloads start carrying unlock/read-history truth | Would break PERS-01 by making load/delete mutate persistent progress | `tests/playerDataRepository.test.js` shows slot operations or `unlock:*` integration changing profile state incorrectly |
| `setVariable` remains a saved peer of `effects[]` | Would keep two first-class write contracts alive and block later UI work | `tests/effectDsl.test.js` or `tests/scriptEngine.test.js` still need canonical legacy-field assertions |

---

## Validation Sign-Off

- [x] All tasks have concrete automated verification commands
- [x] Sampling continuity preserves at least one automated check per task
- [x] No Wave 0 gaps remain
- [x] No watch-mode or manual-only gates are required for phase closure
- [x] Feedback latency target stays under 90 seconds
- [x] `nyquist_compliant: true` is accurate for this phase plan set

**Approval:** pending
