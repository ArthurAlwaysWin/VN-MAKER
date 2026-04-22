# Phase 71: 共享契约与资产通路基线 - Validation

**Generated:** 2026-04-23
**Status:** Ready for execution

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + Node built-in `node:test` |
| Config file | `vitest.config.js` |
| Quick run command | `node --test tests/scanAssets.test.js tests/decorLayoutEditor.test.js tests/uiImageContract.test.js && npx vitest run tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js` |
| Full phase gate | `node --test tests/scanAssets.test.js tests/decorLayoutEditor.test.js tests/uiImageContract.test.js tests/exportDesktop.test.js && npx vitest run tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/screenUiImageEntryWiring.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/gameMenuLayout.test.js tests/dialogueBoxNameplate.test.js tests/exportGame.test.js && npm run build` |

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Planned Artifact |
|--------|----------|-----------|-------------------|------------------|
| AST-01 | 标准选图会把 UI 图片写成 `assets/ui/` 对应的 canonical `ui/...` 相对路径 | unit + focused integration | `npx vitest run tests/uiImageFieldFlow.test.js` | `tests/uiImageFieldFlow.test.js`; `71-01-SUMMARY.md` |
| AST-02 | UI 图片入口只接受 PNG / WebP / JPEG | unit + focused integration | `npx vitest run tests/uiImageFieldFlow.test.js` | `tests/uiImageFieldFlow.test.js`; `71-01-SUMMARY.md` |
| AST-05 | 旧路径与历史 nine-slice data URL 仍可读取并正常运行 | unit + runtime compatibility | `npx vitest run tests/themeManagerUiImage.test.js` | `tests/themeManagerUiImage.test.js`; `71-02-SUMMARY.md` |
| AST-06 | 只有用户显式重选时 legacy 值才会被改写为 canonical 路径 | unit + focused integration | `npx vitest run tests/uiImageFieldFlow.test.js tests/screenUiImageEntryWiring.test.js` | `tests/uiImageFieldFlow.test.js`; `tests/screenUiImageEntryWiring.test.js`; `71-01-SUMMARY.md`; `71-03-SUMMARY.md` |
| AST-01 / AST-06 | canonical `ui/...` 值经过保存 / 重新读取 round-trip 后仍保持 canonical，legacy 值在未显式重选时不被静默改写 | persistence-focused integration | `npx vitest run tests/uiImageFieldFlow.test.js` | `tests/uiImageFieldFlow.test.js`; `71-01-SUMMARY.md` |

## Sampling

- **Per task commit:** `node --test tests/uiImageContract.test.js tests/scanAssets.test.js && npx vitest run tests/uiImageFieldFlow.test.js tests/themeManagerUiImage.test.js`
- **Wave 1 gate:** `node --test tests/uiImageContract.test.js && npx vitest run tests/uiImageFieldFlow.test.js`
- **Wave 2 gate:** `npx vitest run tests/themeManagerUiImage.test.js tests/uiImageFieldFlow.test.js tests/dialogueBoxNameplate.test.js`
- **Wave 3 gate:** `node --test tests/scanAssets.test.js tests/exportDesktop.test.js && npx vitest run tests/screenUiImageEntryWiring.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/gameMenuLayout.test.js tests/exportGame.test.js && npm run build`

## Scope Guardrails

- 本文件只覆盖 Phase 71 的 contract / canonical path / legacy read / scan-export foundation。
- 不把对话框图片 DOM、按钮族 rollout、major screen decorations、cursor/icon slots 拉进本阶段 gate。
- 不把 `.gmtheme` / `themePackager` 相对路径打包升级作为 Phase 71 完成条件。
- repo-wide `npx vitest run` 的历史失败不属于本阶段 gate。

## Evidence Sources

- `.planning/ROADMAP.md` — Phase 71 success criteria
- `.planning/REQUIREMENTS.md` — AST-01 / AST-02 / AST-05 / AST-06
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-CONTEXT.md`
- `.planning/phases/71-shared-contract-asset-pipeline-baseline/71-RESEARCH.md`
- `src/shared/uiImageContract.js`
- `src/editor/utils/uiImageField.js`
- `src/engine/ThemeManager.js`
- `src/engine/scanAssets.js`
- `electron/exportGame.js`
- `electron/exportDesktop.js`
- `tests/uiImageContract.test.js`
- `tests/uiImageFieldFlow.test.js`
- `tests/themeManagerUiImage.test.js`
- `tests/screenUiImageEntryWiring.test.js`
- `tests/scanAssets.test.js`
- `tests/exportGame.test.js`
- `tests/exportDesktop.test.js`

---

*Phase: 71-shared-contract-asset-pipeline-baseline*
*Validation generated: 2026-04-23*
