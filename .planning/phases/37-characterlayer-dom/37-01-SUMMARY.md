# 37-01 SUMMARY — CharacterLayer Dual-Layer DOM Refactoring

## Result: ✅ COMPLETE

## What was done

### Task 1: Code Changes (auto)
- **CharacterLayer.js** — Complete rewrite from single `<img>` to dual-layer DOM:
  - Map values: `{container: HTMLDivElement, imgA: HTMLImageElement, imgB: HTMLImageElement, activeImg: 'A'|'B'}`
  - `show()`: Creates container `<div>` + two `<img>` children, applies position/transition on container
  - `setExpression()`: Instant swap on active img's `src` (crossfade deferred to Phase 38)
  - `hide()`: Removes container after exit animation
  - `_updateContainerSize()`: Sets CSS `aspect-ratio` from loaded image dimensions
- **style.css** — Migrated `object-fit`/`object-position` from `.character-sprite` (now a div) to `.char-img-a`/`.char-img-b` (actual img elements). Added `.active` opacity rule.

### Task 2: Human Visual Verification (checkpoint)
- ✅ Characters display and position correctly (left/center/right)
- ✅ Enter/exit animations work (fade, slide)
- ✅ Expression change works (instant swap via per-dialogue "表情变化")
- ✅ Build passes (143 modules, no errors)

### Bonus: Preview Handshake Fix
During verification, discovered pre-existing bug: editor preview iframe's `_waitForEditorHandshake()` waited for 'start' message (only sent on user click) instead of an immediate acknowledgment. Fixed by:
- Editor now replies `{ type: 'ack-preview' }` on receiving 'ready'
- Handshake listens for 'ack-preview' instead of 'start'

## Commits
- `08af622` — `refactor(37-01): CharacterLayer dual-layer DOM structure`
- `8e72e0f` — `fix: preview handshake — editor replies ack-preview on ready`

## Files Changed
- `src/ui/CharacterLayer.js` (rewrite: 120 → 156 lines)
- `src/style.css` (CSS rule migration + new rules)
- `src/engine/assetPath.js` (handshake fix)
- `src/editor/composables/usePageEditor.js` (handshake reply)

## Verification
- 15 automated checks: 14 PASS + 1 false positive (resolved)
- Build: `npm run build` — ✅
- Human visual verification: ✅ (positioning, animations, expression swap)

## Notes
- Container div uses `aspect-ratio` (CSS) for intrinsic sizing since absolutely-positioned img children don't contribute to parent dimensions
- No `overflow: hidden` on container (sprites may extend beyond box)
- Both imgs have `draggable = false`
- Phase 38 will add crossfade transitions between imgA and imgB
