# Phase 64 Plan 01: Transition contract and BackgroundLayer Summary

Phase 64 wave 1 expanded the shared transition registry to the locked set `none`, `fade`, `slide-left`, `slide-right`, `dissolve`, `wipe`, `scale`, and `blur`, while keeping unknown transition values intact for editor/store round-trips and falling back only at runtime consumption.

`BackgroundLayer` now remains the sole transition owner on the existing dual-layer DOM, returns a completion promise from `setBackground()`, and clears transition-specific classes, transforms, filters, clip-path state, timers, and stale outgoing imagery when transitions finish, are replaced, or are cleared.

## Verification

- `npx vitest run tests/cinematicContractCompatibility.test.js tests/backgroundLayerTransitions.test.js`
- `node --test tests/scriptEngine.test.js`
- `npm run build`

## Key Files

- `src/shared/cinematicContract.js`
- `src/ui/BackgroundLayer.js`
- `src/style.css`
- `tests/cinematicContractCompatibility.test.js`
- `tests/backgroundLayerTransitions.test.js`
- `tests/scriptEngine.test.js`
