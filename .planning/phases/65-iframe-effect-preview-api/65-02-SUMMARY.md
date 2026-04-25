# Phase 65 Plan 02 Summary

**Completed:** 2026-04-21
**Status:** Done

## What Changed

- Extended `src/main.js` preview handling with a shared runtime `preview-effect` / `preview-effect-stop` protocol.
- Added runtime helpers for:
  - fresh incoming script hydration via `applyPreviewScriptSnapshot()`
  - selected page baseline setup via `establishPreviewPageBaseline()`
  - cleanup-first restore via `restorePreviewSnapshot()`
  - explicit result posting via `postEffectPreviewResult()`
  - global single-instance preview cancellation via `cancelActiveEffectPreview()`
- Added runtime owner-backed replay paths:
  - character preview through `CharacterLayer.show()`
  - camera preview through `CameraController.play()`
  - transition preview through `BackgroundLayer.setBackground()` with `previewVariant: 'same-page'`
- Added explicit runtime reason handling for:
  - `preview-busy`
  - `unsupported-effect`
  - `runtime-error`
  - `restore-failed`
- Extended `BackgroundLayer` and `src/style.css` with preview-only same-page transition classes and cleanup so identical outgoing/incoming backgrounds still produce a visible replay without mutating navigation state.

## Tests

- Created `tests/iframeEffectPreviewWiring.test.js`
- Created `tests/backgroundTransitionPreview.test.js`
- Extended `tests/backgroundTransitionWiring.test.js`
- Extended `tests/cameraCleanupWiring.test.js`

## Verification

- `npx vitest run tests/iframeEffectPreviewWiring.test.js tests/backgroundTransitionPreview.test.js tests/backgroundTransitionWiring.test.js tests/cameraCleanupWiring.test.js`
- `node --test tests/scriptEngine.test.js`
- `npm run build`

## Notes

- Transition preview stays on the current scene/page identity and uses a runtime-only same-page variant instead of real page navigation.
- Cleanup and restore reuse the Phase 64 gate-safe reset ordering instead of introducing a second preview-specific rollback path.

---

*Phase: 65-iframe-effect-preview-api*
*Plan: 65-02*
