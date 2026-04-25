# Phase 65: Iframe Effect Preview API - Discussion Log

**Date:** 2026-04-21
**Mode:** Auto (`--auto` chain)
**Status:** Completed

## Summary

Auto mode was used for Phase 65. No user-interactive branch selection was needed; the agent selected the recommended defaults to keep momentum and avoid reopening decisions already implied by the v1.4 spec and Phase 64 runtime boundaries.

## Auto-selected Gray Areas

1. Preview protocol shape
2. Runtime restore model
3. Transition preview construction
4. Disabled / failure feedback semantics

## Decisions Taken

### 1. Preview protocol shape
- **Question:** Should Phase 65 add separate messages per effect type, or one shared command family?
- **Selected:** One shared effect preview command family.
- **Why:** Character / camera / transition previews all need the same request identity, busy handling, cancel semantics, and result reporting. A shared protocol keeps Phase 66 UI thin.

### 2. Runtime restore model
- **Question:** Should the editor fake effect playback or should runtime own execution and restoration?
- **Selected:** Runtime owns execution and restoration.
- **Why:** The v1.4 spec explicitly defines iframe runtime as the only authoritative preview path. Existing `getState()` / `restoreState()` / `replayCurrentPage()` already provide the right recovery foundation.

### 3. Transition preview construction
- **Question:** Should transition preview require real navigation to another page?
- **Selected:** No. Use the current page as the old state and construct a temporary new-page variant inside the iframe runtime.
- **Why:** This satisfies `TRAN-03` and the spec's “single transition replay without actually switching pages” rule while keeping editor data untouched.

### 4. Preview concurrency
- **Question:** Should preview instances be isolated per effect type or globally serialized?
- **Selected:** Global single-instance preview lock.
- **Why:** More conservative, easier to reason about, and safer for restore correctness than allowing multiple overlapping effect sessions.

### 5. Disabled / failure semantics
- **Question:** How should unavailable preview actions surface to the editor?
- **Selected:** Standard reason codes split between editor preflight and runtime execution failures.
- **Why:** The roadmap and spec both require explicit disabled/failure feedback. Reason codes let Phase 66 present clear UI without inventing new protocol semantics later.

## Prior Decisions Reused

- Phase 61-64 already froze owner boundaries: `CharacterLayer`, `CameraController`, and `BackgroundLayer` stay the only playback owners.
- Phase 64 already established transition cleanup and preview lifecycle cleanup expectations in `main.js`.
- Existing page preview already uses `usePageEditor` as the editor-side bridge and `main.js` `initPreview()` as the runtime-side message entrypoint.

## Out of Scope Confirmed

- Full PageInspector cinematic configuration UX
- Canvas-side fake effect previews
- Multiple concurrent previews or effect queues
- Full high-risk integration regression matrix

---

*Decisions captured in `65-CONTEXT.md`; this log preserves the reasoning path used in auto mode.*
