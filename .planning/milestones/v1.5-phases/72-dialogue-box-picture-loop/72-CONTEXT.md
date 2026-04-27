# Phase 72: 对话框图片化闭环 - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

本 phase 只交付 **对话框图片化闭环**：让用户能为对话框主框、名牌背景与至少一层装饰图片配置真实运行时可见的图片皮肤，并在编辑器里通过 runtime-backed 预览立即确认文本层、继续指示与交互没有被遮挡。

不扩面到按钮族、major screens、cursor/icon、主题包格式，也不引入 editor-only 假预览或自由装饰画布系统。

</domain>

<decisions>
## Implementation Decisions

### 主框图片归属
- **D-01:** 对话框主框图片继续沿用现有 `ui.theme.nineSlice.dialogueBox` 作为主视觉载体，不在 Phase 72 再发明第二套“主框图片”字段。
- **D-02:** Phase 72 新增的对话框图片字段集中落在 `ui.dialogueBox`，只负责 **名牌背景** 与 **装饰层** 等对话框专属图片，不重写 theme nine-slice 的职责边界。

### 名牌与装饰组织
- **D-03:** 名牌背景图保持为独立字段，跟随既有 `nameplateStyle`（`inline` / `floating` / `banner`）几何结构生效，而不是变成自由定位的新编辑器系统。
- **D-04:** 装饰层采用可扩展的列表/层概念，但本 phase 只要求满足“至少一层装饰图”的可配置与可运行闭环；不引入自由拖拽装饰画布。

### 层级与可读性保护
- **D-05:** 图片层必须作为 **对话框视觉底层** 存在，文字、名牌文字、继续指示、QAB 热区始终处在图片层之上。
- **D-06:** 所有装饰图片默认 `pointer-events: none`，不能截走对话点击、继续点击或 QAB 的交互。
- **D-07:** 缺图、清空或 legacy 值不可用时，运行时继续回退到现有 CSS 外观；Phase 72 不提前吞掉 AST-04 的最终全链路责任，但本 phase 自己 touch 到的对话框表面必须不因缺图而坏掉。

### 预览入口
- **D-08:** 编辑器预览 owner 继续放在 `ProjectSettings.vue` 右侧 iframe，因为 `ui.dialogueBox` 是全局配置，且这里已经有 runtime-backed preview 通路。
- **D-09:** `DialogueBoxSettings.vue` 现有本地 mini preview 不是 Phase 72 的事实来源；它可以保留作表单辅助，但完成标准以 iframe runtime 结果为准。
- **D-10:** 预览场景使用稳定的示例 speaker + 示例文本，由 runtime 真正渲染对话框，而不是在 Vue 侧拼一个静态假对话框。

### the agent's Discretion
- 具体字段命名、DOM class 命名、以及装饰层列表的最小 schema 由 research / planning 根据现有代码模式决定，只要不违背上述 owner 和层级约束即可。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/ROADMAP.md` — Phase 72 goal, dependency on Phase 71, and success criteria boundary.
- `.planning/REQUIREMENTS.md` — `DLG-01` / `DLG-02` / `DLG-03` acceptance targets for dialogue-box pictureization.
- `.planning/STATE.md` — v1.5 sequencing and current milestone progress.

### Phase 71 contract baseline
- `src/shared/uiImageContract.js` — canonical `ui/...` contract and shared UI image scan/collector baseline.
- `src/editor/utils/uiImageField.js` — standard picker / clear helper contract established in Phase 71.
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-01-SUMMARY.md` — explains the shared UI image contract and picker helper decisions.
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-02-SUMMARY.md` — explains runtime-safe canonical UI image handling for nine-slice.
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-03-SUMMARY.md` — explains screen/decor picker wiring and scan/export baseline that Phase 72 should build on.

### Runtime dialogue behavior
- `src/ui/DialogueBox.js` — current dialogue DOM structure, nameplate styles, text/indicator behavior, and the layering constraints Phase 72 must preserve.
- `src/style.css` — existing `#dialogue-box`, `.dialogue-name-plate`, `.dialogue-text-area`, and `.dialogue-indicator` styling that Phase 72 will extend rather than replace wholesale.
- `src/main.js` — runtime-backed preview snapshot path where `ui.dialogueBox` is applied and preview state is established.
- `src/engine/ThemeManager.js` — existing `ui.theme.nineSlice.dialogueBox` handling, which remains the owner for the main dialogue frame image.

### Editor surfaces
- `src/editor/components/DialogueBoxSettings.vue` — existing editor owner for dialogue-box settings; Phase 72 expands this instead of creating a new settings surface.
- `src/editor/views/ProjectSettings.vue` — current iframe preview owner for project-level dialogue/theme settings.
- `src/editor/stores/script.js` — existing `getDialogueBox()` / `updateDialogueBox()` schema owner and persistence entry point.

### Existing regression coverage
- `tests/dialogueBoxNameplate.test.js` — locks current nameplate style behavior and backward compatibility.
- `tests/uiImageFieldFlow.test.js` — shared UI image picker contract regression tests from Phase 71.
- `tests/themeManagerUiImage.test.js` — canonical UI path handling for nine-slice runtime.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/editor/utils/uiImageField.js`: Phase 71 already provides the canonical image pick / clear flow; DialogueBox settings should reuse it instead of adding another asset path input path.
- `src/engine/ThemeManager.js`: the runtime already supports `ui.theme.nineSlice.dialogueBox`, so Phase 72 can build on a real main-frame image path rather than inventing a new base rendering path.
- `src/editor/views/ProjectSettings.vue`: already hosts an iframe preview loop for global UI/theme settings, making it the natural owner for runtime-backed dialogue preview.

### Established Patterns
- v1.5 keeps **runtime-backed iframe preview** as the only truth source for visual confirmation.
- New UI image writes should use canonical `ui/...` values via the shared picker helper and preserve legacy compatibility until explicit re-selection.
- DOM/CSS runtime is preserved; visual expansion should happen by extending existing layers and classes rather than replacing the rendering stack.

### Integration Points
- `ui.dialogueBox` is persisted through `src/editor/stores/script.js`.
- Runtime application happens in `src/main.js` via `dialogueBox.applyGlobalStyle()` and `dialogueBox.setNameplateStyle()`.
- Actual box/nameplate/text/indicator DOM lives in `src/ui/DialogueBox.js`, with baseline CSS in `src/style.css`.
- Editor-side configuration currently starts from `src/editor/components/DialogueBoxSettings.vue` under `ProjectSettings.vue`.

</code_context>

<specifics>
## Specific Ideas

- 主框图片走现有 nine-slice，避免 Phase 72 出现“两套对话框主框图片字段”并存。
- 名牌背景图应该尊重既有 `inline / floating / banner` 三种名牌风格，而不是引入第四套几何系统。
- 继续指示与 QAB 都必须被视作“文本与交互层”的一部分，不能被图片皮肤压到下面。
- runtime-backed preview 应该直接展示一条稳定示例对话，而不是继续依赖本地 mini preview 作为完成证据。

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 72-dialogue-box-picture-loop*
*Context gathered: 2026-04-23*
