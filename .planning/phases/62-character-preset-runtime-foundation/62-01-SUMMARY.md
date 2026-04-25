---
phase: 62-character-preset-runtime-foundation
plan: 01
subsystem: character-animation-contract
tags: [runtime, cinematic, compatibility, tests]
requires: [ANIM-01, ANIM-02]
provides:
  - Stable page-entry animation contract on show_character
  - Locked seven-preset registry export with none default
  - Unknown animation passthrough compatibility at runtime contract boundary
affects:
  - src/shared/cinematicContract.js
  - src/engine/ScriptEngine.js
  - tests/characterAnimationContract.test.js
tech_stack:
  added:
    - Character animation contract regression suite
  patterns:
    - ScriptEngine emits animation metadata but stays playback-agnostic
    - Unknown non-empty animation enums survive contract emission unchanged
key_files:
  created:
    - tests/characterAnimationContract.test.js
  modified:
    - src/shared/cinematicContract.js
    - src/engine/ScriptEngine.js
decisions:
  - Exported the exact seven locked presets from the shared cinematic contract module.
  - Kept `none`/missing as the runtime-safe no-animation default.
  - Added `show_character.animation` emission while leaving `set_expression` expression-only.
metrics:
  completed_at: 2026-04-21T05:53:30Z
---

# Phase 62 Plan 01: Character animation contract Summary

Phase 62 now has a stable runtime contract: page characters emit `animation` on `show_character`, the seven locked presets are exported centrally, and unknown non-empty animation strings still survive the runtime boundary unchanged for compatibility.

## Tasks Completed

1. Added RED coverage for preset list/default normalization, page-entry `show_character.animation`, unknown animation passthrough, and `set_expression` staying expression-only.
2. Implemented the shared preset export and ScriptEngine emission needed to satisfy that contract.

## Verification

- `npx vitest run tests/characterAnimationContract.test.js` ✅
- `npm run build` ✅

## Decisions Made

1. `src/shared/cinematicContract.js` is now the shared source for the locked seven-preset list as well as the default `none` route.
2. `ScriptEngine` emits animation metadata only during page render entry and does not turn dialogue-time expression changes into ad hoc motion triggers.
3. Unknown non-empty animation enums remain unchanged in emitted contracts so Phase 61 compatibility is preserved while later runtime layers can still choose to no-op them safely.

## Deviations from Plan

None.

## Self-Check: PASSED
