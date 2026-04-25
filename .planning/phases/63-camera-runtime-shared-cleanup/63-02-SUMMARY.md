---
phase: 63-camera-runtime-shared-cleanup
plan: 02
subsystem: camera-runtime
tags: [runtime, camera, cleanup, css, tests]
requires: [CAM-02, CAM-03, CAM-04]
provides:
  - Dedicated CameraController bound to #stage-layer
  - Stage-local flash overlay and single-active camera playback
  - Deterministic camera cleanup across replay, title, preview start/stop, and end flows
affects:
  - src/ui/CameraController.js
  - src/style.css
  - src/main.js
  - tests/cameraRuntimePlayback.test.js
  - tests/cameraCleanupWiring.test.js
key_files:
  created:
    - src/ui/CameraController.js
    - tests/cameraRuntimePlayback.test.js
    - tests/cameraCleanupWiring.test.js
  modified:
    - src/style.css
    - src/main.js
decisions:
  - Kept camera playback inside a dedicated CameraController instead of spreading effect state into existing layer owners.
  - Scoped flash to a stage-local overlay and left #ui-overlay untouched.
  - Preferred deterministic clear/no-op behavior for rapid page changes and skip-safe entry over forcing every effect to remain visible.
---

# Phase 63 Plan 02: Camera runtime Summary

`CameraController` now owns page camera playback on `#stage-layer`, `flash` is stage-local instead of UI-global, and `main.js` clears camera state through the existing replay/title/preview/end reset paths so camera effects do not stack or leak.

## Verification

- `npx vitest run tests/cameraRuntimePlayback.test.js tests/cameraCleanupWiring.test.js` ✅
- `npx vitest run tests/cameraContract.test.js tests/cameraRuntimePlayback.test.js tests/cameraCleanupWiring.test.js tests/characterMotionPlayback.test.js tests/stageLayerOwnership.test.js` ✅
- `node --test tests/scriptEngine.test.js` ✅
- `npm run build` ✅

## Self-Check: PASSED
