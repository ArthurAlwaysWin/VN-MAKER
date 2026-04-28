---
phase: 84
slug: variable-registry-and-branching-gui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-28
---

# Phase 84 — Validation Strategy

> Automation-first validation contract for variable registry and branching GUI work. Focus on small, phase-owned suites instead of repo-wide historical debt.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Node `node:test` |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/variableRegistryContract.test.js tests/branchingContract.test.js tests/variableRegistryWorkspace.test.js tests/variableReferenceSafety.test.js tests/pageInspectorVariableEffects.test.js tests/conditionPageEditor.test.js tests/conditionSummary.test.js tests/sceneTreeConditionSnippet.test.js tests/conditionPageSurfaceAudit.test.js && node --test tests/effectDsl.test.js tests/scriptEngine.test.js` |
| **Full suite command** | `npx vitest run tests/variableRegistryContract.test.js tests/branchingContract.test.js tests/variableRegistryWorkspace.test.js tests/variableReferenceSafety.test.js tests/pageInspectorVariableEffects.test.js tests/conditionPageEditor.test.js tests/conditionSummary.test.js tests/sceneTreeConditionSnippet.test.js tests/conditionPageSurfaceAudit.test.js && node --test tests/effectDsl.test.js tests/scriptEngine.test.js && npm run build` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** run that task’s exact `<automated>` command from the owning plan.
- **After every wave:** rerun the Quick run command.
- **Before `/gsd-verify-work`:** run the Full suite command.
- **Max feedback latency:** 120 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 84-01-01 | 01 | 1 | VAR-01, BRN-01 | unit / contract | `npx vitest run tests/variableRegistryContract.test.js tests/branchingContract.test.js` | ✅ | ⬜ pending |
| 84-01-02 | 01 | 1 | VAR-01, BRN-01 | integration / runtime / build | `npx vitest run tests/variableRegistryContract.test.js tests/branchingContract.test.js && node --test tests/scriptEngine.test.js && npm run build` | ✅ | ⬜ pending |
| 84-02-01 | 02 | 2 | VAR-01 | jsdom / component | `npx vitest run tests/variableRegistryWorkspace.test.js` | ✅ | ⬜ pending |
| 84-02-02 | 02 | 2 | VAR-01 | jsdom / store | `npx vitest run tests/variableRegistryWorkspace.test.js` | ✅ | ⬜ pending |
| 84-02-03 | 02 | 2 | VAR-03 | unit / jsdom / build | `npx vitest run tests/variableRegistryWorkspace.test.js tests/variableReferenceSafety.test.js && npm run build` | ✅ | ⬜ pending |
| 84-03-01 | 03 | 2 | VAR-02 | jsdom / component | `npx vitest run tests/pageInspectorVariableEffects.test.js` | ✅ | ⬜ pending |
| 84-03-02 | 03 | 2 | VAR-02 | jsdom / contract / build | `npx vitest run tests/pageInspectorVariableEffects.test.js && node --test tests/effectDsl.test.js && npm run build` | ✅ | ⬜ pending |
| 84-04-01 | 04 | 3 | BRN-01 | jsdom / component | `npx vitest run tests/conditionPageEditor.test.js` | ✅ | ⬜ pending |
| 84-04-02 | 04 | 3 | BRN-01, BRN-02 | jsdom / derived-summary / build | `npx vitest run tests/conditionPageEditor.test.js tests/conditionSummary.test.js tests/sceneTreeConditionSnippet.test.js && npm run build` | ✅ | ⬜ pending |
| 84-05-01 | 05 | 4 | BRN-01 | source / jsdom audit | `npx vitest run tests/conditionPageSurfaceAudit.test.js` | ✅ | ⬜ pending |
| 84-05-02 | 05 | 4 | BRN-01, BRN-02 | source / build audit | `npx vitest run tests/conditionPageSurfaceAudit.test.js && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None. Each plan creates or extends its focused test coverage inside its first code-producing task, so no `MISSING` automated verifies remain.

---

## Manual-Only Verifications

None planned for phase closure. UI behavior is covered by focused jsdom/source tests plus build verification.

---

## Phase Risk Watchlist

| Risk | Why It Matters | Detection Signal |
|------|----------------|------------------|
| Registry defaults stay editor-only | Would make VAR-01 look complete in UI while gameplay still starts from wrong values | `tests/scriptEngine.test.js` or `tests/variableRegistryContract.test.js` fails on new-game / restore seeding |
| Dual condition schemas survive normal save paths | Would break summaries, rename scans, and runtime evaluation consistency | `tests/branchingContract.test.js` or `tests/conditionPageEditor.test.js` still sees legacy single-field output after save-side normalization |
| Rename/delete counts drift from actual rewrites | Would violate VAR-03 by showing safety UI that is only decorative | `tests/variableReferenceSafety.test.js` finds mismatched count vs rewritten/cleared references |
| Invalid condition pages remain savable after destructive variable cleanup | Would let Phase 84 promise safety while persisting broken branch pages | `tests/variableReferenceSafety.test.js` or `tests/conditionPageEditor.test.js` allows save with zero valid rows after delete |
| Condition pages still leak normal-page assumptions | Would keep authoring UX inconsistent outside PageInspector | `tests/conditionPageSurfaceAudit.test.js` catches dialogue/voice/canvas controls on condition pages |

---

## Validation Sign-Off

- [x] All tasks have concrete automated verification commands
- [x] Sampling continuity preserves at least one automated check per task
- [x] No Wave 0 gaps remain
- [x] Focused suites cover every Phase 84 requirement area
- [x] Build verification remains in the phase gate
- [x] `nyquist_compliant: true` is accurate for this phase plan set

**Approval:** pending
