# Phase 72: 对话框图片化闭环 - Validation

**Generated:** 2026-04-23
**Status:** Ready for planning

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + Node built-in `node:test` |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js` |
| Full phase gate | `node --test tests/scanAssets.test.js && npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/dialogueBoxUiSkin.test.js tests/dialogueBoxPreviewWiring.test.js && npm run build` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Planned Artifact |
|--------|----------|-----------|-------------------|------------------|
| DLG-01 | `ui.theme.nineSlice.dialogueBox` 继续作为主框图片 owner，`ui.dialogueBox` 提供名牌背景图与至少一层装饰图，并被 scan/export 识别 | jsdom unit + node data | `node --test tests/scanAssets.test.js && npx vitest run tests/dialogueBoxUiSkin.test.js` | `tests/dialogueBoxUiSkin.test.js`; `tests/scanAssets.test.js`; `72-RESEARCH.md` |
| DLG-02 | 名牌、正文、继续指示与 QAB 始终处于图片层之上，装饰层不截走点击且缺图时回退到现有 CSS 外观 | jsdom unit | `npx vitest run tests/dialogueBoxUiSkin.test.js tests/dialogueBoxNameplate.test.js` | `tests/dialogueBoxUiSkin.test.js`; `tests/dialogueBoxNameplate.test.js`; `72-RESEARCH.md` |
| DLG-03 | `ProjectSettings.vue` 右侧 iframe 可以显示稳定的 runtime-backed 对话框预览，而不是只靠本地 mini preview | source + jsdom wiring | `npx vitest run tests/dialogueBoxPreviewWiring.test.js` | `tests/dialogueBoxPreviewWiring.test.js`; `72-RESEARCH.md` |

## Sampling

- **Per task commit:** `npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js`
- **Wave 1 gate:** `npx vitest run tests/dialogueBoxUiSkin.test.js tests/dialogueBoxNameplate.test.js`
- **Wave 2 gate:** `npx vitest run tests/dialogueBoxPreviewWiring.test.js tests/uiImageFieldFlow.test.js tests/themeManagerUiImage.test.js`
- **Final phase gate:** `node --test tests/scanAssets.test.js && npx vitest run tests/dialogueBoxNameplate.test.js tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/dialogueBoxUiSkin.test.js tests/dialogueBoxPreviewWiring.test.js && npm run build`

## Wave 0 Gaps

- [ ] `tests/dialogueBoxUiSkin.test.js` — 覆盖 DLG-01 / DLG-02 的 runtime layering、fallback、pointer-events 与 floating nameplate 安全性
- [ ] `tests/dialogueBoxPreviewWiring.test.js` — 覆盖 DLG-03 的 preview owner / message flow
- [ ] 扩展 `tests/scanAssets.test.js` — 断言 `ui.dialogueBox` 新图片字段进入 `ui` bucket
- [ ] 若本 phase 触碰旧 preview routing 断言，则修复或替换 `tests/mainConfigRouting.test.js`

## Scope Guardrails

- 本文件只覆盖 Phase 72 的 dialogue-box picture loop。
- 主框图片 owner 仍是 `ui.theme.nineSlice.dialogueBox`；不把按钮族、major screens、cursor/icon 拉进本阶段 gate。
- runtime-backed iframe preview 仍是唯一事实来源；本地 mini preview 不是完成证据。
- repo-wide `npx vitest run` 的历史失败不属于本阶段 gate。

## Evidence Sources

- `.planning/ROADMAP.md` — Phase 72 success criteria
- `.planning/REQUIREMENTS.md` — DLG-01 / DLG-02 / DLG-03
- `.planning/phases/72-dialogue-box-picture-loop/72-CONTEXT.md`
- `.planning/phases/72-dialogue-box-picture-loop/72-RESEARCH.md`
- `src/shared/uiImageContract.js`
- `src/editor/utils/uiImageField.js`
- `src/ui/DialogueBox.js`
- `src/style.css`
- `src/main.js`
- `src/engine/ThemeManager.js`
- `src/editor/components/DialogueBoxSettings.vue`
- `src/editor/views/ProjectSettings.vue`
- `src/editor/stores/script.js`
- `tests/dialogueBoxNameplate.test.js`
- `tests/uiImageFieldFlow.test.js`
- `tests/themeManagerUiImage.test.js`
- `tests/scanAssets.test.js`

---

*Phase: 72-dialogue-box-picture-loop*
*Validation generated: 2026-04-23*
