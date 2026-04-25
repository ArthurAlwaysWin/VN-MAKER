# Phase 67: Integration & Regression Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 67-integration-regression-gate
**Areas discussed:** Cleanup ownership, High-risk flow scope, Regression strategy, Preview-stop semantics

---

## Cleanup ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing owners and patch current cleanup entrypoints | Keep CharacterLayer / CameraController / BackgroundLayer ownership intact and fix orchestration in place | ✓ |
| Add a new centralized cleanup manager | Introduce a fourth owner to clear all cinematic state | |
| Rework the runtime lifecycle broadly | Redesign phase boundaries and cleanup architecture before regression work | |

**User's choice:** Auto-selected recommended default: reuse existing owners and patch current cleanup entrypoints.
**Notes:** Best match for a regression gate phase; avoids scope drift and respects Phases 61-66 boundaries.

## High-risk flow scope

| Option | Description | Selected |
|--------|-------------|----------|
| Lock to PREV-05 flows only | Focus on skip, auto, load, return-to-title, preview-stop, and rapid replay/supersede | ✓ |
| Expand to every runtime flow | Attempt exhaustive lifecycle coverage in one phase | |
| Add new product behaviors while validating | Mix regression with new cinematic capability work | |

**User's choice:** Auto-selected recommended default: lock to PREV-05 flows only.
**Notes:** Keeps the phase bounded and directly traceable to roadmap success criteria.

## Regression strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Focused automated integration/wiring regressions | Extend main.js and owner cleanup tests, allowing small fixes needed to make them pass | ✓ |
| Mostly manual UAT | Rely on interactive preview/play testing as primary signoff | |
| Build a large new test framework first | Invest in broader infrastructure before fixing the regressions | |

**User's choice:** Auto-selected recommended default: focused automated integration/wiring regressions.
**Notes:** Reuses the existing Phase 64/65 test surfaces and matches the repo’s current verification style.

## Preview-stop semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current stop/supersede contract and prove cleanliness | Old preview restores cleanly before the next one starts; no protocol redesign | ✓ |
| Redesign preview locking semantics | Change request flow and protocol to solve regressions differently | |
| Add queueing / parallel preview support | Expand preview capabilities during regression work | |

**User's choice:** Auto-selected recommended default: keep current stop/supersede contract and prove cleanliness.
**Notes:** Phase 67 should validate and patch cleanliness, not reopen the already-frozen Phase 65 protocol.

---

[auto] Selected all gray areas: Cleanup ownership, High-risk flow scope, Regression strategy, Preview-stop semantics.
[auto] Cleanup ownership → Selected: reuse existing owners and patch current cleanup entrypoints (recommended default).
[auto] High-risk flow scope → Selected: lock to PREV-05 flows only (recommended default).
[auto] Regression strategy → Selected: focused automated integration/wiring regressions (recommended default).
[auto] Preview-stop semantics → Selected: keep current stop/supersede contract and prove cleanliness (recommended default).
