# Phase 39 — 表情狀態管理 (Expression State Management)

## Prior Decisions (from Phase 38)

- **D-02 (Phase 38)**: Cross-page expression changes use crossfade via `_crossfade()` — CharacterLayer already handles the visual transition; Phase 39 only needs to supply the correct expression name/image to CharacterLayer.

## Decisions

### D-01: State Storage Location → ScriptEngine Internal Map

**Choice:** `this._expressionState = new Map()` inside ScriptEngine — `charId → expressionName`

**Rationale:**
- ScriptEngine already manages all game logic state (`getState`/`restoreState`)
- Integrates naturally with save/load (STATE-02)
- Follows existing pattern: `_prevPageCharIds`, `_currentBgmFile`, `_currentBg`
- `CharacterLayer.currentImage` is UI-layer tracking (image URL, not expression name); not suitable for persistence

**Impact:** All expression state reads/writes go through ScriptEngine. CharacterLayer remains a pure rendering layer.

### D-02: Fallback Expression → `Object.keys(expressions)[0]`

**Choice:** When a character has no prior expression state and the page data doesn't specify an expression, use the first key from `charDef.expressions`.

**Rationale:**
- JS objects maintain insertion order for non-integer string keys
- Editor already uses this pattern: `CharacterEditor.vue:184-186`, `CharacterPicker.vue:58`
- Users typically add the "normal" or "default" expression first
- If `expressions` is empty or undefined → fall back to empty string (no image, same as current behavior)

**Impact:** `_renderPage()` expression resolution chain: explicit `char.expression` → `_expressionState.get(charId)` → `Object.keys(expressions)[0]` → `''`

### D-03: Scene Boundary Reset → Expression Map Only

**Choice:** `this._expressionState.clear()` in both `_enterScene()` and `_resetRenderState()`

**Rationale:**
- Character visibility already managed by `_prevPageCharIds` (cleared in `_resetRenderState()`)
- Single responsibility: expression state resets independently
- New scene characters naturally use fallback (D-02)
- `_resetRenderState()` called on `start()`, `_enterScene()` called on scene jumps — both paths need the clear

**Impact:** No expression leaks across scene boundaries. Clean separation from visibility tracking.

### D-04: Save Format Backward Compatibility (auto-resolved)

**Choice:** Graceful degradation — if loaded save data has no `expressionState` field, initialize an empty Map.

**Rationale:**
- Old saves simply won't have the field
- `restoreState()` already handles optional fields pattern
- Characters will use fallback expression (D-02) on next render, which is correct behavior

## Codebase Scout Summary

| File | Relevance |
|------|-----------|
| `src/engine/ScriptEngine.js` | PRIMARY — getState/restoreState/\_enterScene/\_renderPage/\_playCurrentDialogue |
| `src/ui/CharacterLayer.js` | Phase 38 output — `setExpression()` accepts expression data, no changes needed |
| `src/main.js` | Event wiring — may need minor adjustment for expression state flow |
| `src/engine/SaveManager.js` | Uses `engine.getState()` — auto-inherits STATE-02 changes |
| `src/engine/WebSaveManager.js` | Uses `engine.getState()` — auto-inherits STATE-02 changes |

## Deferred Ideas

_None identified._
