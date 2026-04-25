# Phase 72: dialogue-box-picture-loop - Research

**Researched:** 2026-04-22
**Domain:** Dialogue box runtime/editor image skinning in the existing Electron + Vue + Pinia + DOM/CSS stack
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 对话框主框图片继续沿用现有 `ui.theme.nineSlice.dialogueBox` 作为主视觉载体，不在 Phase 72 再发明第二套“主框图片”字段。
- **D-02:** Phase 72 新增的对话框图片字段集中落在 `ui.dialogueBox`，只负责 **名牌背景** 与 **装饰层** 等对话框专属图片，不重写 theme nine-slice 的职责边界。
- **D-03:** 名牌背景图保持为独立字段，跟随既有 `nameplateStyle`（`inline` / `floating` / `banner`）几何结构生效，而不是变成自由定位的新编辑器系统。
- **D-04:** 装饰层采用可扩展的列表/层概念，但本 phase 只要求满足“至少一层装饰图”的可配置与可运行闭环；不引入自由拖拽装饰画布。
- **D-05:** 图片层必须作为 **对话框视觉底层** 存在，文字、名牌文字、继续指示、QAB 热区始终处在图片层之上。
- **D-06:** 所有装饰图片默认 `pointer-events: none`，不能截走对话点击、继续点击或 QAB 的交互。
- **D-07:** 缺图、清空或 legacy 值不可用时，运行时继续回退到现有 CSS 外观；Phase 72 不提前吞掉 AST-04 的最终全链路责任，但本 phase 自己 touch 到的对话框表面必须不因缺图而坏掉。
- **D-08:** 编辑器预览 owner 继续放在 `ProjectSettings.vue` 右侧 iframe，因为 `ui.dialogueBox` 是全局配置，且这里已经有 runtime-backed preview 通路。
- **D-09:** `DialogueBoxSettings.vue` 现有本地 mini preview 不是 Phase 72 的事实来源；它可以保留作表单辅助，但完成标准以 iframe runtime 结果为准。
- **D-10:** 预览场景使用稳定的示例 speaker + 示例文本，由 runtime 真正渲染对话框，而不是在 Vue 侧拼一个静态假对话框。

### the agent's Discretion
- 具体字段命名、DOM class 命名、以及装饰层列表的最小 schema 由 research / planning 根据现有代码模式决定，只要不违背上述 owner 和层级约束即可。

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DLG-01 | 用户可以为对话框配置主框图片、名牌背景图片与至少一层装饰图片 | Keep main frame on `ui.theme.nineSlice.dialogueBox`; add `ui.dialogueBox` image fields plus scan/export registry coverage and picker wiring |
| DLG-02 | 用户启用对话框图片皮肤后，名牌、正文、继续指示在真实运行时中仍保持可见且不被遮挡 | Use dedicated visual-underlay layers in `DialogueBox.js`; keep text/name/indicator/QAB in foreground; decorations `pointer-events:none`; preserve CSS fallback |
| DLG-03 | 用户可以在编辑器中通过 runtime-backed 预览立即查看对话框图片效果，而不是只看本地静态模拟 | Extend `ProjectSettings.vue` iframe owner / preview channel with a runtime dialogue preview message and stable sample content |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- Keep the current stack: JavaScript ES modules, Vue 3 editor only, Pinia stores, Electron shell, DOM/CSS runtime.
- Do not migrate to TypeScript.
- Use explicit `.js` extensions in JS imports.
- Keep named exports in JS modules; no new default-export JS modules.
- Follow existing manual style: 2 spaces, semicolons, single quotes.
- Preserve Windows-first behavior and avoid solutions that assume Unix-only tooling.
- Route filesystem access through existing IPC/store patterns; renderer code should not invent direct file access.
- Keep existing sanitization/security patterns intact (`sanitizeCssValue`, path validation, `asset://` flow).
- Work inside the existing GSD workflow; do not introduce side-channel editing patterns.

## Summary

Phase 72 should be planned as an extension of the existing dialogue box owner chain, not as a new rendering system. The repo already has the three critical anchors needed for this work: canonical `ui/...` image selection (`src/editor/utils/uiImageField.js`), runtime main-frame ownership via `ui.theme.nineSlice.dialogueBox` (`src/engine/ThemeManager.js`), and a runtime-backed iframe preview transport in `ProjectSettings.vue` + `src/main.js`. The missing piece is the dialogue-box-specific surface: `ui.dialogueBox` currently stores typography settings only and needs to grow into the owner for nameplate background plus a minimal decoration list.

The biggest implementation risk is not asset picking; it is layering. `DialogueBox.js` currently renders nameplate, text, indicator, and QAB inside `#dialogue-box`, while `ThemeManager` injects a `#dialogue-box::before` nine-slice background. Any Phase 72 image layer that uses the wrong z-index, inline-style reset path, or pointer-event behavior can break text readability, indicator visibility, auto progression, or QAB clicks. The plan should therefore budget explicit runtime layering work, not just editor form fields.

**Primary recommendation:** extend `ui.dialogueBox` with a minimal image schema, render those images through dedicated runtime underlay elements in `DialogueBox.js`, and add a new ProjectSettings-owned iframe preview message that shows a stable sample dialogue via the real runtime component.

### Recommended plan decomposition

1. **Schema + contract task** — extend `ui.dialogueBox`, preserve existing fields, and register new dialogue-box image collectors in `uiImageContract.js`.
2. **Runtime rendering task** — add dialogue visual underlay DOM/CSS in `DialogueBox.js`/`style.css`, including nameplate background and decoration list, with fallback behavior.
3. **Editor + preview task** — expand `DialogueBoxSettings.vue`, reuse Phase 71 picker helpers, and wire runtime-backed iframe preview from `ProjectSettings.vue`.
4. **Focused validation task** — add new jsdom/source tests for layering and preview wiring; update `scanAssets.test.js`; do not rely on repo-wide `vitest run`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | project `^41.0.4` / registry `41.2.2` (verified 2026-04-22) | Desktop shell + preview iframe host | Already owns editor/runtime split and `asset://` path flow |
| Vue 3 | project `^3.5.31` / registry `3.5.33` (verified 2026-04-22) | Editor UI only | Existing settings surfaces and provider/inject preview ownership already use it |
| Pinia | project `^3.0.4` / registry `3.0.4` (verified 2025-11-05) | Script/config persistence owner | `src/editor/stores/script.js` is the schema owner for `ui.dialogueBox` |
| DOM/CSS runtime | repo-local | Actual game dialogue rendering | Locked architecture; `DialogueBox.js` and `style.css` are the real render path |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | project `^4.1.4` / registry `4.1.5` (verified 2026-04-21) | jsdom unit/source tests | Runtime DOM, store, and source-wiring checks |
| Node `node:test` | Node v24.13.1 local | pure data/scan tests | `scanAssets` and other non-Vue pure functions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ui.theme.nineSlice.dialogueBox` for the main frame | new `ui.dialogueBox.frameImage` | Reject — duplicates ownership and violates D-01 |
| ProjectSettings iframe runtime preview | local Vue-only fake dialogue mock | Reject — violates D-08/D-09/D-10 |
| DOM/CSS underlay layers in `DialogueBox.js` | canvas/WebGL/editor-only render path | Reject — violates architecture lock and increases rewrite risk |

**Installation:**
```bash
# No new dependencies required for Phase 72.
```

**Version verification:** registry versions confirmed with:
```bash
npm view vue version time.modified
npm view pinia version time.modified
npm view electron version time.modified
npm view vitest version time.modified
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── editor/
│   ├── components/DialogueBoxSettings.vue   # form owner for ui.dialogueBox
│   ├── views/ProjectSettings.vue            # iframe preview owner
│   └── stores/script.js                     # schema persistence owner
├── shared/uiImageContract.js                # canonical ui/... roots + collectors
├── ui/DialogueBox.js                        # runtime DOM owner
├── engine/ThemeManager.js                   # main frame image owner remains here
└── style.css                                # dialogue/QAB layering rules
tests/
├── dialogueBoxNameplate.test.js
├── themeManagerUiImage.test.js
├── uiImageFieldFlow.test.js
└── scanAssets.test.js
```

### Pattern 1: Extend the existing `ui.dialogueBox` object, do not replace it
**What:** `script.getDialogueBox()` / `script.updateDialogueBox()` already own the schema. Extend that object in place and preserve existing typography fields.
**When to use:** Any new dialogue-box-only field.
**Recommended minimal schema:**
```js
ui.dialogueBox = {
  // existing fields stay
  fontSize,
  fontFamily,
  textColor,
  nameplateFontSize,
  nameplateFontFamily,
  nameplateColor,
  nameplateStyle,

  // Phase 72 additions
  nameplateBackgroundImage: null,
  decorations: [
    { src: null, x: 0, y: 0, width: 160, height: 160 },
  ],
};
```
**Why this shape:** flat nameplate fields match the existing flat typography shape, while `decorations` matches the established decoration-item schema already used elsewhere (`src/editor/components/layout/DecorationSection.vue`).

### Pattern 2: Render image skin layers as dedicated runtime underlays
**What:** Keep image skin elements separate from text/name/indicator/QAB so `_applyStyle()` and click handlers do not break them.
**When to use:** Dialogue background decoration, nameplate background image, fallback-safe skin rendering.
**Example:**
```js
// Source: src/ui/DialogueBox.js
this.el.innerHTML = `
  <div class="dialogue-name-plate">
    <span class="dialogue-speaker-name"></span>
  </div>
  <div class="dialogue-text-area">
    <span class="dialogue-text"></span>
    <span class="dialogue-indicator">▼</span>
  </div>
`;
```
Use this existing structure as the foreground; add new visual-only siblings/children beneath it rather than moving text into image containers.

### Pattern 3: Reuse Phase 71 canonical picker helpers
**What:** All new image writes should flow through `pickUiImage()` / `clearUiImage()`.
**When to use:** Nameplate background selection and each decoration image row.
**Example:**
```js
// Source: src/editor/components/theme/NineSliceModal.vue
await pickUiImage({
  setValue: (value) => setImageValue(elementKey, state, value),
  preview: () => editor.sendThemeToPreview(),
});
```
Phase 72 should use the same callback shape, but call dialogue-box preview/commit owners instead of theme-only owners.

### Pattern 4: Keep preview ownership in `ProjectSettings.vue`
**What:** The iframe owner stays in `ProjectSettings.vue`; child components should call an injected/shared preview owner, not touch `window.postMessage` ad hoc.
**When to use:** Runtime-backed dialogue preview updates.
**Example:**
```js
// Source: src/editor/views/ProjectSettings.vue
function sendShowScreen() {
  themeEditor.iframeRef.value?.contentWindow?.postMessage({
    type: 'show-screen',
    screenId: 'settingsScreen',
  }, '*');
}
```
For Phase 72, follow this owner pattern but add a dialogue-specific runtime message instead of abusing settings-screen preview.

### Anti-Patterns to Avoid
- **Second main-frame field under `ui.dialogueBox`:** violates D-01/D-02 and creates schema drift.
- **Applying skin images as root inline styles on `#dialogue-box`:** `_applyStyle()` resets inline styles each dialogue render.
- **Using the mini preview as completion evidence:** violates D-09.
- **Relying on the first project page as the preview sample:** violates D-10 and makes preview unstable across projects.
- **Replacing the entire dialogueBox object with hand-written defaults:** risks dropping existing `nameplateStyle` or future fields.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canonical UI image path handling | manual text-path inputs / FileReader flow | `pickUiImage()`, `clearUiImage()`, `classifyUiImageValue()` | Phase 71 already locked canonical `ui/...` semantics and legacy handling |
| Main dialogue frame image | new dialogue-box image field | `ui.theme.nineSlice.dialogueBox` via `ThemeManager` | Locked owner; already runtime-safe |
| Preview transport | bespoke iframe handshake | existing ProjectSettings iframe + `postMessage` preview channel | `ready`/`ack-preview`/`start` flow already exists |
| UI asset scan registration | custom `scanAssets()` conditionals | `collectUiImagePaths()` / registry extension | Phase 71 established collector-based expansion |
| Click shielding for decorations | per-decoration click handlers | CSS `pointer-events: none` + existing dialogue/QAB click owners | Prevents auto/advance/QAB regressions |

**Key insight:** the hard part of this phase is not selecting images; it is preserving the already-correct runtime ownership boundaries while adding one more visual layer.

## Common Pitfalls

### Pitfall 1: `_applyStyle()` silently wipes runtime skin styles
**What goes wrong:** image skin appears once, then disappears or partially resets on the next dialogue line.
**Why it happens:** `DialogueBox._applyStyle()` clears `this.el.style`, `this.textEl.style`, and `this.nameEl.style` on every `show()`, preserving only root CSS custom properties.
**How to avoid:** store skin state separately and apply it through dedicated DOM nodes/class toggles, or preserve explicit CSS variables rather than root inline background styles.
**Warning signs:** first preview looks correct, next line loses nameplate background or decorations.

### Pitfall 2: Floating nameplate can be clipped by nine-slice overflow rules
**What goes wrong:** floating nameplate background/text is cut off when the main dialogue frame image is enabled.
**Why it happens:** `ThemeManager` sets `overflow: hidden` on `#dialogue-box` when nine-slice is active, while floating nameplates are positioned above the box with `top: -32px`.
**How to avoid:** budget explicit work for the floating-nameplate + nine-slice interaction; do not assume current CSS remains safe once image skinning is added.
**Warning signs:** inline/banner styles pass, floating style clips at the top edge.

### Pitfall 3: Decorations block clicks or cover indicator/QAB
**What goes wrong:** auto/advance clicks stop working, QAB buttons miss clicks, or the ▼ indicator disappears under art.
**Why it happens:** decoration layers are placed above foreground content or allowed to receive pointer events.
**How to avoid:** keep decorations in a visual-underlay container, set `pointer-events: none`, and explicitly put `.dialogue-name-plate`, `.dialogue-text-area`, `.dialogue-indicator`, and `#quick-action-bar` in the foreground stack.
**Warning signs:** clicking the dialogue box stops advancing, or only some areas remain clickable.

### Pitfall 4: Preview wiring stays theme-only
**What goes wrong:** editor form changes update the mini preview or theme iframe state but never show a stable runtime dialogue sample.
**Why it happens:** current ProjectSettings preview owner only knows `update-theme` and `show-screen`.
**How to avoid:** add a dialogue-preview message path owned by ProjectSettings and handled in `src/main.js`.
**Warning signs:** image fields save correctly but the iframe never shows a dialogue box unless the current script happens to do so.

### Pitfall 5: New dialogue image fields are never scanned
**What goes wrong:** preview/runtime may work locally, but UI asset scanning/export misses the new files.
**Why it happens:** `src/shared/uiImageContract.js` does not currently collect `ui.dialogueBox` image fields.
**How to avoid:** extend the shared collector registry as part of the schema task, even though AST-03 final ownership lands in Phase 75.
**Warning signs:** `scanAssets()` output omits the new dialogue-box images.

### Pitfall 6: Validation gate accidentally depends on a stale test
**What goes wrong:** focused phase verification fails for an unrelated assertion mismatch.
**Why it happens:** `tests/mainConfigRouting.test.js` currently fails because it expects preview routing strings directly inside `initPreview()`, while routing now lives in `applyPreviewScriptSnapshot()`.
**How to avoid:** either repair/replace that test in Wave 0 or exclude it from the phase gate and add a new Phase 72-specific preview-wiring test.
**Warning signs:** `npx vitest run tests/mainConfigRouting.test.js` fails before any Phase 72 code changes.

## Code Examples

Verified patterns from current repo code:

### Canonical UI image picker flow
```js
// Source: src/editor/utils/uiImageField.js
const canonicalPath = normalizeUiImageSelection(selection);
setValue(canonicalPath);
await runCallback(preview, canonicalPath);
await runCallback(commit, canonicalPath);
```

### Preview iframe theme update flow
```js
// Source: src/editor/composables/useThemeEditor.js
iframeRef.value.contentWindow.postMessage({
  type: 'update-theme',
  theme: JSON.parse(JSON.stringify(theme)),
}, '*');
```

### Runtime preview message handling pattern
```js
// Source: src/main.js
case 'show-screen': {
  switch (msg.screenId) {
    case 'settingsScreen': settingsScreen.show(); break;
    case 'gameMenu': gameMenu.show(); break;
  }
  break;
}
```

### Dialogue/QAB click separation pattern
```js
// Source: src/ui/QuickActionBar.js
this.el.addEventListener('click', (e) => {
  e.stopPropagation();
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.classList.contains('disabled')) return;
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FileReader/base64-oriented UI image writes | canonical `ui/...` paths via shared helper | Phase 71 | Phase 72 should not invent another asset path format |
| Per-surface asset flow | shared `pickUiImage()` / `clearUiImage()` callbacks | Phase 71 | Dialogue settings can reuse existing image-selection contract |
| hard-coded UI scan logic | registry-driven `collectUiImagePaths()` | Phase 71 | Dialogue-box image fields should be added by extending the registry |
| ad hoc preview simulation | runtime-backed iframe with `ready`/`start`/`update-*` messages | existing v1.x + Phase 71/preview work | Dialogue preview should be another message on the same channel, not a fake renderer |

**Deprecated/outdated:**
- Direct text-path editing as the main mutation path for UI images — Phase 71 replaced this with canonical picker flow.
- Source assertions that expect preview config routing directly inside `initPreview()` — stale after preview snapshot refactor.

## Open Questions

1. **Should Phase 72 repair `tests/mainConfigRouting.test.js`, or add a new dedicated dialogue preview-wiring test and leave the stale file out of gate scope?**
   - What we know: the file currently fails before Phase 72 because preview routing moved into `applyPreviewScriptSnapshot()`.
   - What's unclear: whether the team wants that old test modernized in this phase or treated as pre-existing debt.
   - Recommendation: treat it as Wave 0 validation work if Phase 72 touches preview routing files; otherwise add a new dedicated test and keep the stale file out of the focused gate.

2. **How much decoration schema should Phase 72 expose beyond `src/x/y/width/height`?**
   - What we know: the requirement only needs at least one decoration layer, and existing decoration editors already use `src/x/y/width/height`.
   - What's unclear: whether opacity/fit/repeat are desired now.
   - Recommendation: keep the schema minimal in Phase 72; use array order as layer order and defer richer visual controls.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.4` (project) + Node `node:test` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js` |
| Full suite command | `node --test tests/scanAssets.test.js && npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/dialogueBoxUiSkin.test.js tests/dialogueBoxPreviewWiring.test.js && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DLG-01 | `ui.dialogueBox` can store nameplate background + at least one decoration and scan them as canonical UI assets | unit + node data | `node --test tests/scanAssets.test.js` and `npx vitest run tests/dialogueBoxUiSkin.test.js` | `scanAssets.test.js` ✅ / `dialogueBoxUiSkin.test.js` ❌ Wave 0 |
| DLG-02 | runtime keeps nameplate/text/indicator/QAB above image layers and decorations do not steal interaction | jsdom unit | `npx vitest run tests/dialogueBoxUiSkin.test.js tests/dialogueBoxNameplate.test.js` | `dialogueBoxNameplate.test.js` ✅ / `dialogueBoxUiSkin.test.js` ❌ Wave 0 |
| DLG-03 | ProjectSettings iframe shows stable runtime dialogue preview for dialogue-box settings | source/jsdom wiring | `npx vitest run tests/dialogueBoxPreviewWiring.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js`
- **Per wave merge:** `node --test tests/scanAssets.test.js && npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/dialogueBoxUiSkin.test.js tests/dialogueBoxPreviewWiring.test.js`
- **Phase gate:** focused phase suite above + `npm run build`

### Wave 0 Gaps
- [ ] `tests/dialogueBoxUiSkin.test.js` — covers DLG-01 and DLG-02 runtime layering, fallback, and pointer-event behavior
- [ ] `tests/dialogueBoxPreviewWiring.test.js` — covers DLG-03 preview owner/message flow
- [ ] Extend `tests/scanAssets.test.js` — assert `ui.dialogueBox` image fields enter the `ui` bucket
- [ ] Repair or replace `tests/mainConfigRouting.test.js` if preview-routing changes are touched in this phase

**Current baseline evidence:**
- `node --test tests/scanAssets.test.js` ✅
- `npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js` ✅
- `npx vitest run tests/mainConfigRouting.test.js` ❌ (stale preview assertions; pre-existing)
- `npm run build` ✅

## Sources

### Primary (HIGH confidence)
- `src/ui/DialogueBox.js` — dialogue DOM structure, style reset behavior, nameplate-style owner
- `src/style.css` — dialogue/text/indicator/QAB layout and current z-index/pointer-event behavior
- `src/main.js` — runtime preview transport, auto/skip flow, config routing, preview message handling
- `src/editor/components/DialogueBoxSettings.vue` — current `ui.dialogueBox` editor owner and mini-preview limitation
- `src/editor/views/ProjectSettings.vue` — iframe preview owner for global settings
- `src/editor/stores/script.js` — `getDialogueBox()` / `updateDialogueBox()` schema owner
- `src/shared/uiImageContract.js` — canonical roots and collector registry
- `src/editor/utils/uiImageField.js` — canonical picker/clear contract
- `tests/dialogueBoxNameplate.test.js`, `tests/uiImageFieldFlow.test.js`, `tests/themeManagerUiImage.test.js`, `tests/scanAssets.test.js`, `tests/iframeEffectPreviewWiring.test.js`, `tests/mainConfigRouting.test.js`
- `package.json`
- Registry verification commands:
  - `npm view vue version time.modified`
  - `npm view pinia version time.modified`
  - `npm view electron version time.modified`
  - `npm view vitest version time.modified`

### Secondary (MEDIUM confidence)
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-01-SUMMARY.md`
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-02-SUMMARY.md`
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-03-SUMMARY.md`

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - repo-local package/config data plus npm registry verification
- Architecture: HIGH - runtime/editor ownership is directly visible in repo code
- Pitfalls: HIGH - derived from current DOM/CSS/runtime code paths and focused test/baseline runs

**Research date:** 2026-04-22
**Valid until:** 2026-05-22
