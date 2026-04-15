# Phase 41: 編輯器狀態展示與容錯 - Research

**Researched:** 2026-04-15
**Domain:** Editor canvas expression resolution, expression deletion resilience, PPT-style page creation
**Confidence:** HIGH

## Summary

Phase 41 is the final phase of v1.0, closing the last two requirements (UI-03, UI-04) plus implementing PPT-style page creation (D-03/D-04) and expression deletion with reference checking (D-05). The work spans four distinct areas: (1) PageCanvas `getCharImage()` needs the same expression resolution chain the engine already has (explicit → inherited → first expression → placeholder), (2) expression deletion in CharacterEditor needs reference scanning + confirmation dialog + batch replacement, (3) `script.addPage()` needs to copy the previous page's characters/background/BGM, and (4) defensive fallback validation in both ScriptEngine and PageCanvas for stale expression references.

All changes are to existing files with well-understood patterns. The engine's expression resolution chain (Phase 39) and ExpressionDropdown component (Phase 40) are already in place — this phase extends them to the canvas and adds deletion safety. The project uses `confirm()` / `alert()` for all user-facing dialogs (no custom modal library), which is the correct pattern for the deletion confirmation.

**Primary recommendation:** Implement in 2 plans — Plan 1: canvas expression resolution + PPT-style addPage + engine/canvas fallback validation; Plan 2: expression deletion reference check + confirmation dialog + batch replacement.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** No visual distinction for inherited vs explicit expressions. Inspector and canvas both show resolved expression name + thumbnail uniformly. User mental model is PPT — same scene pages share all elements from previous page.
- **D-02:** No inheritance source hint (no "from page X" tooltip or marker).
- **D-03:** New page copies previous page (same scene): character array (with expressions, positions, scale), background, BGM. Dialogues and voice left empty. User edits on top of the copy.
- **D-04:** New scene's first page is blank (no characters, no background, no BGM).
- **D-05:** Before deleting an expression, system checks all pages across all scenes for references. No references → direct delete. Has references → confirmation dialog listing affected page numbers, confirming will delete + batch-replace all references with first expression.
- **D-06:** Replacement target is `Object.keys(expressions)[0]` (first expression), consistent with Phase 39 D-02 fallback rule.
- **D-07:** ScriptEngine expression resolution chain adds existence validation: after resolving `resolvedExpr`, check `expressions[resolvedExpr]` exists. If not, fallback to `Object.keys(expressions)[0]`.
- **D-08:** PageCanvas `getCharImage()` adds fallback validation: if `char.expression` image not found in expressions dictionary, fallback to first available expression.

### Agent's Discretion
- Deep copy implementation for new page data (JSON.parse(JSON.stringify()) vs structuredClone)
- Confirmation dialog UI style (reuse existing `confirm()` pattern or build custom)
- Reference check traversal scope (all scenes vs current scene) — recommended: all scenes
- Placeholder display when character has zero expressions

### Deferred Ideas (OUT OF SCOPE)
- **Ctrl+C / Ctrl+V page copy-paste** — new feature, not in Phase 41 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-03 | 画布预览显示继承后的实际表情（未显式设置时显示继承来源的表情） | Canvas `getCharImage()` resolution chain mirroring engine logic; previous-page traversal for inheritance |
| UI-04 | 删除表情后的 stale 引用优雅降级 — 引擎和编辑器均 fallback 到第一个可用表情 | Engine D-07 validation + Canvas D-08 fallback + CharacterEditor deletion flow with reference check |
</phase_requirements>

## Standard Stack

No new libraries needed. All changes use existing project dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | Editor SFC components | Already in project |
| Pinia | ^3.0.4 | Script store (useScriptStore) | Already in project |

### Supporting
No new dependencies. All work is in existing Vue components, Pinia stores, and vanilla JS engine.

## Architecture Patterns

### Relevant Project Structure
```
src/
├── editor/
│   ├── components/
│   │   ├── page-editor/
│   │   │   ├── PageCanvas.vue      ← getCharImage() fallback + inheritance
│   │   │   ├── PageInspector.vue   ← no changes (D-01: no visual distinction)
│   │   │   ├── SceneTree.vue       ← addPage triggers modified store method
│   │   │   ├── ExpressionDropdown.vue  ← already done (Phase 40)
│   │   │   └── CharacterPicker.vue ← no changes needed
│   │   └── resource-library/
│   │       └── CharacterEditor.vue ← deleteExpression() → reference check + confirm
│   ├── stores/
│   │   └── script.js              ← addPage() PPT-copy logic + new helper methods
│   └── composables/
│       └── usePageEditor.js       ← no changes needed
├── engine/
│   └── ScriptEngine.js            ← _renderPage() + _playCurrentDialogue() validation
└── ui/
    └── CharacterLayer.js          ← already handles decode() errors (no changes needed)
```

### Pattern 1: Expression Resolution Chain (Engine — Phase 39 established)
**What:** Multi-step expression resolution: explicit page data → inherited state → first expression → empty string
**When to use:** Every time an expression needs to be resolved for display or rendering
**Existing code (ScriptEngine.js:331-338):**
```javascript
const expressions = charDef?.expressions || {};
const resolvedExpr = char.expression
  || this._expressionState.get(char.id)
  || Object.keys(expressions)[0]
  || '';
this._expressionState.set(char.id, resolvedExpr);
```

### Pattern 2: Canvas Expression Resolution (NEW — needs to mirror engine)
**What:** PageCanvas `getCharImage()` currently does simple lookup. Needs same resolution chain as engine but for editor context (traverse previous pages in same scene).
**Current code (PageCanvas.vue:155-158):**
```javascript
function getCharImage(char) {
  const path = script.data?.characters?.[char.id]?.expressions?.[char.expression];
  return path ? resolveAsset(path) : null;
}
```
**Needed:** Resolve through: `char.expression` → previous pages' character expression → first expression → null (show placeholder).

### Pattern 3: Deep Copy for PPT-Style Page Creation
**What:** `addPage()` in script store copies previous page's characters, background, BGM
**Current code (script.js:166-174):** Creates a blank default page via `createDefaultPage()`
**Needed:** If adding within a scene with existing pages, copy the previous page's `characters` (deep clone), `background`, `bgm`. Leave `dialogues` as default empty. `se` also left empty.
**Implementation:**
```javascript
function addPage(sceneId, afterIndex = -1) {
  const scene = data.value?.scenes?.[sceneId];
  if (!scene) return null;
  const newPage = createDefaultPage();
  const insertAt = afterIndex >= 0 ? afterIndex + 1 : scene.pages.length;
  
  // PPT-style copy from previous page (D-03)
  const prevPage = scene.pages[insertAt - 1] || scene.pages[scene.pages.length - 1];
  if (prevPage) {
    newPage.characters = JSON.parse(JSON.stringify(prevPage.characters || []));
    newPage.background = prevPage.background || null;
    newPage.bgm = prevPage.bgm ? JSON.parse(JSON.stringify(prevPage.bgm)) : null;
  }
  
  scene.pages.splice(insertAt, 0, newPage);
  pushState();
  return { page: newPage, index: insertAt };
}
```

### Pattern 4: Confirm Dialog (Existing Project Pattern)
**What:** The project uses native `confirm()` and `alert()` for all user-facing dialogs
**Examples found in codebase:**
- `CharacterEditor.vue:224` — `confirm('确定要删除角色...')`
- `CharacterEditor.vue:403` — `confirm('确定要删除表情...')`
- `SceneTree.vue:298` — `confirm('确定删除场景...')`
**Recommendation:** Use `confirm()` for the deletion confirmation dialog. The message should list affected page numbers. This is consistent with the entire codebase — no custom modal needed.

### Anti-Patterns to Avoid
- **Don't add visual distinction for inherited expressions:** D-01 explicitly forbids this. The ROADMAP success criterion #3 ("Inspector 中繼承的表情與顯式設置的表情有視覺區分") is overridden by D-01 from CONTEXT.md.
- **Don't use structuredClone for page copying:** `JSON.parse(JSON.stringify())` is the established deep-copy pattern in this codebase (used in script store undo/redo, preview snapshot). Stick with it for consistency.
- **Don't traverse only current scene for reference checks:** D-05 implies checking all scenes. A character's expression may be used in multiple scenes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal component | Native `confirm()` | Project standard, consistent with 10+ existing uses across editor |
| Deep cloning page data | Manual property spread | `JSON.parse(JSON.stringify())` | Established project pattern (undo/redo, preview), handles nested objects |
| Expression fallback logic | Separate utility | Inline in each function | Only 3 locations need it, keep simple |

## Common Pitfalls

### Pitfall 1: Canvas Expression Inheritance Requires Previous-Page Traversal
**What goes wrong:** The canvas has no equivalent of engine's `_expressionState` Map. To show inherited expressions, it must walk backward through previous pages in the same scene to find the last explicit expression for that character.
**Why it happens:** The engine builds `_expressionState` incrementally as pages are played. The editor shows any page instantly without "playing" through.
**How to avoid:** Implement a computed or helper that, for a given page index in a scene, walks backward through `scene.pages[0..pageIndex-1]` to find the last explicit `char.expression` for the character ID. Cache via Vue's computed reactivity.
**Warning signs:** Character shows placeholder 🧑 on canvas when expression should be inherited from previous page.

### Pitfall 2: Object.keys() Order for First Expression
**What goes wrong:** `Object.keys(expressions)[0]` depends on JavaScript object property order. In V8, string keys that aren't array indices maintain insertion order (ES2015+), which is what we want. But if expressions were re-ordered via rename operations, the "first" expression might not be what the user expects.
**Why it happens:** Expression dictionary is `{ name: path }` — flat object, not an array.
**How to avoid:** This is an accepted behavior (consistent with Phase 39 D-02 and D-06). Document it. The fallback is defensive only — it should rarely trigger in normal use (D-05 prevents stale references).
**Warning signs:** After deletion, the "wrong" expression shows as replacement. This is expected behavior per design.

### Pitfall 3: addPage Copy Must Use Fresh ID
**What goes wrong:** If the copied page data reuses the same `page.id`, multiple pages will have identical IDs, breaking Vue `:key` bindings and page selection.
**Why it happens:** Deep copy includes the `id` field.
**How to avoid:** `createDefaultPage()` generates a fresh `id`. Copy characters/background/bgm AFTER creating the new page with a fresh ID, preserving the new page's own `id`, `name`, `transition`, and empty `dialogues`.

### Pitfall 4: pushState() Timing After Batch Replace
**What goes wrong:** If `pushState()` is called for each page's expression replacement individually during batch delete, the undo history fills with intermediate states.
**Why it happens:** D-05 batch-replaces expressions across multiple pages.
**How to avoid:** Do all replacements in a loop, then call `pushState()` once at the end. This makes the entire delete+replace operation a single undo step.

### Pitfall 5: Deleting the Last Expression
**What goes wrong:** If all expressions are deleted, `Object.keys(expressions)[0]` returns `undefined`. Fallback chain must handle empty expressions dictionary.
**Why it happens:** User deletes all expressions from a character.
**How to avoid:** The fallback chain terminates at `null` (canvas shows placeholder 🧑) or `''` (engine shows nothing). This is the existing behavior and is acceptable — a character with no expressions simply can't display an image.

### Pitfall 6: Expression Key in Page Data Not Updated After Rename
**What goes wrong:** If an expression is renamed in CharacterEditor, existing page data still references the old name. This creates a stale reference identical to the deletion scenario.
**Why it happens:** `renameExpression()` in CharacterEditor only updates the expressions dict, not page data.
**How to avoid:** This is an existing issue outside Phase 41's scope. The D-07/D-08 fallback validation will catch these cases as a safety net. A full "rename propagation" could be a future enhancement.

## Code Examples

### Example 1: Canvas getCharImage() with Inheritance + Fallback (D-08)
```javascript
function getCharImage(char) {
  const charDef = script.data?.characters?.[char.id];
  if (!charDef?.expressions) return null;
  const expressions = charDef.expressions;

  // Resolution chain: explicit → inherited → first → null
  let resolvedExpr = char.expression;

  // Validate explicit expression exists (D-08 stale reference check)
  if (resolvedExpr && !expressions[resolvedExpr]) {
    resolvedExpr = null;
  }

  // If no valid expression, try inheriting from previous pages in scene
  if (!resolvedExpr) {
    resolvedExpr = findInheritedExpression(char.id);
  }

  // Fallback to first expression
  if (!resolvedExpr) {
    resolvedExpr = Object.keys(expressions)[0] || null;
  }

  if (!resolvedExpr || !expressions[resolvedExpr]) return null;
  return resolveAsset(expressions[resolvedExpr]);
}
```

### Example 2: Inherited Expression Lookup (Walking Previous Pages)
```javascript
function findInheritedExpression(charId) {
  const scene = editor.currentScene.value;
  const pageIdx = editor.selectedPageIndex.value;
  if (!scene?.pages || pageIdx <= 0) return null;

  // Walk backward through previous pages
  for (let i = pageIdx - 1; i >= 0; i--) {
    const prevPage = scene.pages[i];
    const prevChar = prevPage.characters?.find(c => c.id === charId);
    if (prevChar?.expression) {
      // Validate the inherited expression still exists
      const charDef = script.data?.characters?.[charId];
      if (charDef?.expressions?.[prevChar.expression]) {
        return prevChar.expression;
      }
    }
  }
  return null;
}
```

### Example 3: Engine Expression Validation (D-07)
```javascript
// In _renderPage(), after resolution chain:
const resolvedExpr = char.expression
  || this._expressionState.get(char.id)
  || Object.keys(expressions)[0]
  || '';

// D-07: Validate resolved expression exists
const validExpr = expressions[resolvedExpr]
  ? resolvedExpr
  : (Object.keys(expressions)[0] || '');

this._expressionState.set(char.id, validExpr);
```

### Example 4: Expression Reference Scanner
```javascript
function findExpressionReferences(charId, exprName) {
  const pages = [];
  const scenes = script.data?.scenes || {};
  for (const [sceneId, scene] of Object.entries(scenes)) {
    for (let i = 0; i < (scene.pages || []).length; i++) {
      const page = scene.pages[i];
      // Check character expressions on page
      const charMatch = (page.characters || []).some(
        c => c.id === charId && c.expression === exprName
      );
      // Check dialogue expression changes
      const dlgMatch = (page.dialogues || []).some(
        d => d.speaker === charId && d.expression === exprName
      );
      if (charMatch || dlgMatch) {
        pages.push({ sceneId, sceneName: scene.name, pageIndex: i });
      }
    }
  }
  return pages;
}
```

### Example 5: Batch Replace After Deletion
```javascript
function replaceExpressionReferences(charId, oldExpr, newExpr) {
  const scenes = script.data?.scenes || {};
  for (const scene of Object.values(scenes)) {
    for (const page of (scene.pages || [])) {
      for (const char of (page.characters || [])) {
        if (char.id === charId && char.expression === oldExpr) {
          char.expression = newExpr;
        }
      }
      for (const dlg of (page.dialogues || [])) {
        if (dlg.speaker === charId && dlg.expression === oldExpr) {
          dlg.expression = newExpr;
        }
      }
    }
  }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | none — direct `node --test` invocation |
| Quick run command | `node --test tests/scriptEngine.test.js` |
| Full suite command | `node --test tests/*.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-03 | Canvas resolves inherited expression from previous page | unit | `node --test tests/scriptEngine.test.js` (engine resolution already tested; canvas logic is Vue component — manual verify) | ✅ engine tests exist, ❌ canvas unit test |
| UI-04 | Stale expression fallback to first expression in engine | unit | `node --test tests/scriptEngine.test.js` | ❌ Wave 0 |
| UI-04 | Stale expression fallback in canvas getCharImage() | manual | Visual verify in editor | N/A (Vue component) |
| D-05 | Expression reference scanner finds all pages | unit | `node --test tests/scriptEngine.test.js` | ❌ Wave 0 |
| D-07 | Engine validates resolved expression exists | unit | `node --test tests/scriptEngine.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/scriptEngine.test.js`
- **Per wave merge:** `node --test tests/*.test.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/scriptEngine.test.js` — add test for D-07: engine fallback when expression name exists in resolution chain but not in expressions dict
- [ ] `tests/scriptEngine.test.js` — add test for mid-dialogue expression fallback (D-07 in `_playCurrentDialogue`)

## Open Questions

1. **Should expression rename also propagate to page data?**
   - What we know: `renameExpression()` in CharacterEditor only updates the expressions dict, not references in pages
   - What's unclear: Whether this should be done as part of Phase 41
   - Recommendation: Out of scope for Phase 41. D-07/D-08 fallback handles the symptom. A proper rename propagation is a separate feature.

2. **Confirmation dialog message format for many affected pages**
   - What we know: D-05 says list affected page numbers in the dialog
   - What's unclear: What if 50+ pages reference the expression — does the message become unwieldy?
   - Recommendation: Show up to ~10 page numbers, then "...及其他 N 页". Use format: `「您在 场景1 第1,2,3页、场景2 第1,4页 使用了该表情，是否仍然删除？删除后将自动替换为第一个表情。」`

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all canonical reference files listed in CONTEXT.md
- `src/editor/components/page-editor/PageCanvas.vue` — current getCharImage() at line 155-158
- `src/engine/ScriptEngine.js` — expression resolution chain at lines 331-338, mid-dialogue at 395-402
- `src/editor/stores/script.js` — addPage() at lines 166-174, createDefaultPage() at 131-143
- `src/editor/components/resource-library/CharacterEditor.vue` — deleteExpression() at lines 401-413

### Secondary (MEDIUM confidence)
- Pattern analysis of 10+ confirm/alert usages across editor codebase — consistent native dialog pattern
- Expression state inheritance tests in `tests/scriptEngine.test.js` lines 374-449

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing code
- Architecture: HIGH — all patterns established in Phases 37-40, direct codebase analysis
- Pitfalls: HIGH — identified through code reading, each pitfall mapped to specific code locations

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable — no external dependencies)
