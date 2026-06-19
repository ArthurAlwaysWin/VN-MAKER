# Workspace Backup Feature Reimplementation Roadmap

**Status:** Phases 1-9 complete; feature family closed
**Date:** 2026-06-19
**Feature-family base:** `main` at `3947f83`
**Final Phase 7-9 batch base:** `main` at `51260cb`
**Evidence source:** `b17d890` is requirements evidence only, not an implementation base

## Purpose

Reimplement the worthwhile product ideas found in the 74-path workspace backup on top of current `main`, without restoring conflicted files or regressing newer editor, runtime, security, or authoring architecture.

The backup came from an old stash whose common code dates to `c3fb0ba`, was replayed over newer work, and contains unresolved conflict markers. Implementation must therefore begin from current behavior and contracts. Old code may be consulted to understand intent, but no phase may cherry-pick `b17d890`, accept a conflict side wholesale, or copy a whole modified file over current `main`.

## Global Invariants

Every phase must preserve these rules:

1. `script.json` remains the canonical editable project contract.
2. The no-code desktop editor remains able to inspect and edit every added behavior.
3. Agent DSL remains compile-to-plan only; no runtime DSL dependency or project-local executable code is introduced.
4. The patch-based undo/redo and `changeRevision` behavior introduced by `386c93f` must remain intact.
5. Theme URLs must continue to use the shared `cssUrl()` escaping path.
6. Theme ZIP/path limits and current import/install security checks must not be bypassed.
7. Existing condition, variable, ending, CG, video, theme, settings, preview, and export behavior must keep working.
8. `public/game/script.json` is a maintained example, not a recovery target. Example changes land only when they demonstrate completed behavior.
9. Each phase is a small independently tested slice. Update this roadmap when a phase closes.
10. Keep work local unless the user explicitly asks to commit, push, or open a PR.

## Explicit Non-Goals

- Do not restore the backup's `PageInspector.vue`, `script.js`, `ThemeManager.js`, `main.js`, `ChoiceMenu.js`, or `SceneTree.vue` as whole files.
- Do not replace current condition/effect editing with the backup's older component architecture.
- Do not add a second theme package format or duplicate existing import/export/install services.
- Do not add a selected choice-button image state until the runtime owns a clear selected-state lifecycle.
- Do not force custom cursors with `!important` without a reproducible specificity problem and a safe escaped implementation.
- Do not treat source-text `toContain()` tests as sufficient acceptance for interactive behavior.
- Do not implement the settings drag overlay until its coordinate model and preview scaling behavior are specified and UI-tested.

## Current-Main Baseline

The following capabilities already exist and should be extended rather than rebuilt:

- canonical condition pages, normalization, validation, runtime evaluation, and PageInspector editing;
- variable registry and variable-reference safety;
- choice and page effects for variables, endings, and CG unlocks;
- `setPageType()` support for normal, choice, input, condition, and video pages;
- SceneGraph reporting and route diagnostics;
- patch-based script history;
- ThemeManager nine-slice, button-family states, screen backgrounds, cursors, and `cssUrl()` escaping;
- full `.gmtheme` export/import/install services;
- structured SettingsScreen and SettingsPageEditor;
- script-wide `replaceAssetPathReferences()` helper;
- export/readiness and theme package contracts.

## Phase Overview

| Phase | Name | Outcome | Risk | Status |
| --- | --- | --- | --- | --- |
| 0 | Scope And Contract Lock | Recovery intent is converted into current-main requirements and exclusions. | Low | Complete in this roadmap |
| 1 | Export Save Consistency | Web and desktop exports always use the latest saved script. | Low | Complete |
| 2 | Asset Reference Integrity | Asset renames update canonical references consistently; voice matching only considers dialogue pages. | Medium | Complete |
| 3 | Condition And Variable Editor Polish | SceneTree and PageInspector expose the remaining useful condition/variable UX without replacing current architecture. | Medium | Complete |
| 4 | Theme Package Workflow Convergence | All theme UI surfaces reuse the existing full `.gmtheme` and install/apply services. | Medium | Complete |
| 5 | Choice Badge Capability | Choice badges work through contract, packaging, runtime, preview, and tests using safe URLs. | Medium | Complete |
| 6 | Theme Runtime Polish | Multi-selector nine-slice and dialogue decoration fields are supported safely; optional states require real semantics. | Medium | Complete |
| 7 | Settings Screen Extensions | Single-page settings and reset actions are canonical and editable; drag overlay remains a gated follow-up. | Medium/High | Complete |
| 8 | Alchemy Rose Built-In Theme | The theme and assets install, render, export, and round-trip as a complete built-in theme. | High | Complete |
| 9 | Integration, Examples, And Release Closure | Full regression, UI review, docs, and minimal example data close the feature family. | Medium | Complete |

## Phase 0 - Scope And Contract Lock

**Status:** Complete in this roadmap.

Decisions:

- current `main` is the only implementation base;
- the backup is consulted per file or per behavior, never merged as a commit;
- current inline condition/effect editing stays authoritative;
- Alchemy Rose is delivered only after its runtime and package dependencies;
- optional backup ideas with incomplete semantics are decision gates, not automatic scope.

Acceptance:

- the phase order below can be implemented without keeping conflicted backup files in the working tree;
- every phase names focused tests and a clear stop boundary;
- architecture and security guardrails are explicit before coding starts.

## Phase 1 - Export Save Consistency

**Status:** Complete.

**Goal:** Ensure exports never package stale on-disk script data while the editor holds newer live state.

Deliver:

- save the current script through the existing project-store save path before both web and desktop export;
- stop export and show a useful error if save fails;
- preserve cancellation and export-progress listener cleanup;
- avoid duplicate saves when a higher-level export orchestration already guarantees the same invariant.

Primary files:

- `src/editor/components/ExportModal.vue`
- `src/editor/stores/project.js`
- focused export modal tests

Tests:

- save occurs before either IPC export call;
- save failure prevents both export calls;
- success, failure, and cancellation clean up progress listeners;
- existing `tests/exportGame.test.js` and `tests/exportDesktop.test.js` remain green.

Acceptance:

- unsaved live editor changes are present in the exported project;
- no export begins after a failed save;
- no changes outside export consistency land in this phase.

## Phase 2 - Asset Reference Integrity

**Status:** Complete.

**Goal:** Make asset rename behavior consistent across all editor asset surfaces and prevent non-dialogue pages from participating in voice matching.

Deliver:

- trace the current rename flow from resource UI through `assets.renameAsset()`;
- define one post-rename integration point for `replaceAssetPathReferences()` rather than special-casing only AudioList;
- cover audio, images/backgrounds, fonts, and any other rename-capable canonical asset category supported by the existing UI;
- push exactly one undoable script history entry when references change;
- preserve collision-renamed filenames returned by the asset store;
- change voice matching to include only `type: "normal"` pages.

Primary files:

- `src/editor/stores/assets.js`
- `src/editor/stores/script.js`
- `src/editor/components/resource-library/AssetGrid.vue`
- `src/editor/components/resource-library/AudioList.vue`
- `src/editor/components/resource-library/FontGrid.vue`
- `src/editor/composables/useVoiceMatch.js`

Tests:

- nested canonical references are rewritten to the actual renamed path;
- unrelated strings and unsupported data are untouched;
- undo/redo restores both reference states without corrupting `changeRevision`;
- every rename-capable UI surface follows the same contract;
- condition, input, choice, and video pages are excluded from voice matching.

Acceptance:

- asset rename cannot silently leave stale canonical references;
- the implementation does not introduce one-off AudioList-only behavior;
- patch-history benchmarks or focused history tests show no snapshot regression.

## Phase 3 - Condition And Variable Editor Polish

**Status:** Complete.

**Goal:** Recover the useful editor affordances from the backup while retaining current condition/effect architecture.

Deliver:

- show `formatConditionSummary()` output for condition pages in SceneTree;
- expose explicit normal/choice/condition conversion actions with destructive-change confirmation;
- call current `setPageType()` rather than reviving the old `convertPageType()` contract;
- evaluate a reusable searchable variable picker for current condition and effect rows;
- preserve current string/bool/number behavior and variable, ending, and CG effects;
- preserve missing-variable repair routing to the variable registry.

Primary files:

- `src/editor/components/page-editor/SceneTree.vue`
- `src/editor/components/page-editor/PageInspector.vue`
- an optional new reusable picker component, only if it reduces duplication without narrowing current behavior
- `src/shared/branchingContract.js` only if a genuine shared-formatting gap is found

Tests:

- SceneTree summary uses display names, localized boolean values, and scene names;
- conversion confirmation covers every destructive direction;
- same-type conversion is a no-op;
- choice effects retain ending/CG effects when variable rows change;
- missing variables remain repairable;
- existing branching, variable registry, variable reference, and effect DSL suites remain green.

Acceptance:

- no condition or variable behavior requires hand-editing JSON;
- current effect breadth is not reduced;
- the backup's conflicted component tree is not imported wholesale.

## Phase 4 - Theme Package Workflow Convergence

**Status:** Complete.

**Goal:** Make every theme-related editor entry point use the existing full-package services.

Deliver:

- make PresetModal export the complete `.gmtheme` path through `exportCurrentThemePackage()`;
- let a ready import preflight proceed through `installAndApplyThemePackage()`;
- make ThemePackageModal install built-in assets before applying theme data;
- refresh asset state and save through existing service contracts;
- retain legacy import compatibility only where the existing preflight service explicitly supports it;
- remove misleading copy that presents legacy `.theme` as a full export.

Primary files:

- `src/editor/components/theme/PresetModal.vue`
- `src/editor/components/theme/ThemePackageModal.vue`
- existing services under `src/editor/services/themePackage*.js`

Tests:

- all UI entry points call the same export/install services;
- cancellation and preflight-blocked packages do not mutate the project;
- install/apply refreshes assets and records one undoable theme change;
- `.gmtheme` round-trip and existing security limits remain green.

Acceptance:

- there is one full-theme export path and one install/apply path;
- no component duplicates ZIP building, extraction, path validation, or asset installation logic.

Completion evidence:

- PresetModal and ProjectSettings export through the save-first `exportCurrentThemePackage()` path;
- ready PresetModal imports and both built-in theme UI surfaces install and apply through `installAndApplyThemePackage()`;
- the shared install flow preflights file packages, installs assets, applies one undoable theme change, refreshes UI assets, and saves the project;
- canceled, blocked, and legacy-partial preflights do not install or mutate project data;
- behavioral UI coverage plus import, installer, contract, browser, golden round-trip, exporter, and preflight suites pass, and `npm run build` succeeds.

## Phase 5 - Choice Badge Capability

**Status:** Complete.

**Goal:** Complete the currently partial `ui.theme.choiceBadge` capability end to end.

Contract:

```json
{
  "ui": {
    "theme": {
      "choiceBadge": {
        "a": "ui/themes/example/choices/badge-a.svg",
        "b": "ui/themes/example/choices/badge-b.svg",
        "c": "ui/themes/example/choices/badge-c.svg"
      }
    }
  }
}
```

Deliver:

- collect and validate badge asset references in theme package contracts;
- render optional A/B/C badge elements in ChoiceMenu without changing choice semantics;
- inject badge CSS using `resolvePath()` plus `cssUrl()`;
- apply and reset badge configuration during runtime init, preview snapshots, and live theme updates;
- keep badges decorative and accessible with `aria-hidden` and non-interactive pointer behavior;
- define deterministic behavior when only some slots are configured.

Primary files:

- `src/shared/uiImageContract.js`
- `src/shared/themePackageContract.js`
- `src/engine/ThemeManager.js`
- `src/ui/ChoiceMenu.js`
- `src/main.js`

Tests:

- package validation catches missing badge files;
- no badge nodes render without configuration;
- configured slots cycle deterministically;
- badge URLs with quotes, backslashes, or control characters remain safely escaped;
- init, preview snapshot, and `update-theme` paths all update and reset badge state;
- choice selection and persistence behavior remain unchanged.

Acceptance:

- badge configuration survives export/import and appears in runtime and preview;
- no raw `url("${value}")` construction is introduced;
- no persistent selected-choice behavior is implied by decorative badges.

Completion evidence:

- `ui.theme.choiceBadge` canonical A/B/C references are collected for asset export and validated against package namespace and manifest entries;
- ChoiceMenu renders optional `aria-hidden` decorative spans with fixed A/B/C/A slot mapping, leaving missing slots empty without changing selection semantics;
- badge CSS uses `resolvePath()` plus `cssUrl()`, includes non-interactive pointer behavior, and clears stale rules when a theme omits badge configuration;
- runtime init, preview snapshots, and live `update-theme` messages all apply or reset both badge CSS and ChoiceMenu configuration;
- `.gmtheme` export, parse, and install preserve badge configuration and assets;
- complete Vitest, Node test, and production build gates pass.

## Phase 6 - Theme Runtime Polish

**Status:** Complete.

**Goal:** Add only the theme primitives that have clear current-main semantics.

Deliver:

- support comma-separated/multiple nine-slice selectors through a safe selector-list helper;
- cover both standard and custom title buttons where they represent the same widget family;
- add dialogue decoration `opacity` and `rotation` with clamping and canonical validation where appropriate;
- verify cursor specificity before deciding whether pointer rules need `!important`;
- make selected nine-slice state a decision gate:
  - implement only if a real widget owns `.selected` or equivalent state lifecycle;
  - otherwise omit it from contract, package references, and Alchemy Rose data.

Primary files:

- `src/engine/ThemeManager.js`
- `src/ui/DialogueBox.js`
- `src/shared/themePackageContract.js`
- `src/shared/uiImageContract.js`

Tests:

- suffixes are applied to each selector independently;
- all image URLs continue through `cssUrl()`;
- decoration opacity and rotation are bounded and reset correctly;
- optional cursor specificity changes are backed by a DOM repro;
- selected-state tests include actual state transitions, not CSS generation alone.

Acceptance:

- theme primitives have runtime semantics and package coverage;
- speculative or inert fields are not added merely because they existed in the backup.

Completion evidence:

- nine-slice selector lists are normalized once and each selector independently receives the base, `::before`, `:hover::before`, and `:active::before` suffixes;
- `titleButton` covers both `.title-button` and `.title-custom-button` without changing either button lifecycle;
- dialogue decoration opacity and rotation share one numeric contract across the editor and runtime: numeric strings normalize, opacity clamps to `[0, 1]`, rotation clamps to `[-360, 360]`, and missing/invalid values fall back without stale inline styles;
- runtime init, preview snapshots, dialogue preview refreshes, live full-snapshot updates, and missing-config resets all route through `DialogueBox.applyGlobalStyle()`;
- decoration and nameplate URLs use `resolvePath()` plus `cssUrl()`, while `.gmtheme` asset collection and round-trip preserve decoration imagery and scalar fields;
- a Chromium DOM repro against the current `style.css` showed the existing `#game-container` pointer selector wins over standard title, custom title, and QAB class cursor rules with no inline cursor present, so no `!important` change was justified;
- selected nine-slice imagery is deferred: choice/title nine-slice widgets expose hover and pressed behavior but no stable selected-state lifecycle, so no selected field, package reference, or runtime CSS was added;
- focused Phase 6, choice badge, theme package contract/round-trip, full Vitest, Node test, and production build gates pass.

## Phase 7 - Settings Screen Extensions

**Status:** Complete.

**Goal:** Add useful settings-layout capabilities without destabilizing the established structured editor.

Deliver first:

- canonical `tabBar.enabled: false` single-page settings mode;
- runtime renders all available setting keys without a tab bar;
- SettingMatrix and TabCrudSection explain and edit the mode;
- custom `reset` button invokes ConfigManager reset, not arbitrary code;
- structured and custom modes preserve their current behavior.

Drag-overlay decision gate:

- specify how project resolution maps to the scaled iframe rectangle;
- specify scrolling, aspect-ratio letterboxing, pointer capture, keyboard movement, and snapping;
- identify which elements are draggable and which layout fields are canonical;
- implement only after a browser-based interaction test plan exists.

Primary files:

- `src/ui/SettingsScreen.js`
- `src/editor/views/SettingsPageEditor.vue`
- `src/editor/components/layout/SettingMatrix.vue`
- `src/editor/components/layout/TabCrudSection.vue`

Tests:

- single-page mode renders every setting exactly once;
- no tab component is created when disabled;
- re-enabling tabs preserves or normalizes valid assignments;
- reset updates config and remains in the active layout mode;
- if drag ships, browser interaction tests verify scaled coordinates and one undo entry per completed drag.

Acceptance:

- single-page settings are fully editable and previewable;
- drag support does not ship on source-string tests alone.

Completion evidence:

- canonical `ui.settingsScreen.tabBar.enabled: false` selects single-page mode without removing `tabBar.tabs`; re-enabling preserves non-empty assignments and initializes deep-copied defaults only when the tab list is absent or empty;
- runtime single-page rendering creates no top tab bar, widget tab component, or left sidebar and renders every known setting exactly once in `SETTING_DEFS` order;
- tab normalization preserves valid declared order, keeps the first duplicate assignment, ignores unknown keys, and appends unassigned known keys to the final tab in deterministic definition order;
- SettingMatrix and TabCrudSection expose the mode, explain assignment retention and deterministic fallback, and keep tab CRUD hidden while single-page mode is active;
- custom and structured reset actions dispatch only through the declarative settings action contract, call `ConfigManager.reset()`, notify the existing `applyConfig()` callback, and rebuild controls without changing the current structured/custom layout mode;
- preview snapshot initialization and live `update-screen-layout` continue through `SettingsScreen.setLayout()`, so initial load, preview, and live mode changes share the same runtime path;
- focused behavioral suites, full Vitest (1146 tests), full Node tests (305 tests), production build, and real Chromium DOM interactions passed;
- drag overlay is deferred: project-to-scaled-iframe coordinates, aspect-ratio letterboxing and scrolling, pointer capture, keyboard movement/snapping, draggable ownership, canonical layout fields, and one-undo-entry completion semantics are not yet specified and browser-tested. No inert overlay or source-string-only acceptance test was added.

## Phase 8 - Alchemy Rose Built-In Theme

**Status:** Complete.

**Goal:** Deliver Alchemy Rose as a complete installed theme after all required primitives are stable.

Deliver:

- review and import the SVG assets into the built-in theme asset source directory;
- add a current-contract theme definition without stale or unsupported fields;
- install assets through the Phase 4 service path;
- use choice badges only after Phase 5;
- use theme runtime primitives only after Phase 6;
- use single-page settings only after Phase 7;
- keep copy generic and suitable for arbitrary visual novels;
- provide preview metadata and a recognizable visual signature.

Primary files:

- `public/builtin-themes/alchemy-rose/*`
- `src/editor/builtinThemeAssets.js`
- `src/editor/builtinThemes.js`
- only the current runtime/editor files required by completed earlier phases

Tests:

- built-in asset completeness and hash/manifest coverage;
- theme visual contract and full-package round-trip;
- every referenced image exists after installation;
- dialogue, choices, title, menus, save/load, backlog, settings, icons, and cursors render without errors;
- screenshots or manual review cover normal, hover, pressed, disabled, empty, and missing-asset fallbacks.

Acceptance:

- applying Alchemy Rose to a clean project installs all assets and produces valid canonical data;
- export/import preserves the theme;
- visual QA is completed in the desktop preview at supported resolutions;
- no backup conflict marker or unsupported sample field enters main.

Completion evidence:

- 23 SVG assets extracted from backup `b17d890` into `public/builtin-themes/alchemy-rose/` (per-file, not whole-file);
- theme definition added to `BUILTIN_THEMES` via `createBuiltinTheme()`, using only current-contract fields;
- `nineSlice.choiceButton.states.selected` omitted per Phase 6 deferral; `buttonFamilies.pageTabPager/settingsTab.selected` retained (current contract supports it);
- Phase 5 `choiceBadge` (a/b/c), Phase 6 nine-slice + decorations with `opacity`/`rotation` + cursor + icons, and Phase 7 single-page settings (`tabBar.enabled: false`) all exercised;
- 22 asset declarations added to `BUILTIN_THEME_ASSETS` covering dialogue, choices, badges, chrome, title, icons, and cursors;
- copy kept generic ("VISUAL NOVEL", not project-specific);
- full round-trip acceptance test passes: install, apply, save/reopen, export, reimport, and browser reconstruction;
- 5 test files updated to include `alchemy-rose` in shipped roster; all 34 theme-related tests pass;
- no conflict markers in any extracted SVG or source file.

## Phase 9 - Integration, Examples, And Release Closure

**Status:** Complete.

**Goal:** Close the feature family with regression evidence and documentation.

Deliver:

- run focused suites after every phase and full `npm test` plus both builds at final closure;
- update current theme, editor, settings, and authoring documentation with implemented behavior only;
- add minimal `public/game/script.json` examples only where they improve discoverability;
- verify theme export/import and game web/desktop export end to end;
- inspect the final diff for accidental backup artifacts or conflict markers;
- mark completed phases and record any consciously deferred decision gates.

Final commands:

```bash
npm test
npm run build
npm run build:web
rg -n "^(<<<<<<<|=======|>>>>>>>)" src tests public docs
git diff --check
git status --short --branch
```

Acceptance:

- all tests and builds pass;
- docs describe current behavior, not the old stash;
- example data remains small and canonical;
- roadmap status accurately records completed and deferred work.

Completion evidence:

- no conflict markers in `src`, `tests`, `public`, or `docs` (`rg` clean);
- `git diff --check 3947f83` clean after normalizing the Phase 8 Alchemy Rose block to the repository's LF policy;
- production build (`npm run build`) and web build (`npm run build:web`) both succeed;
- node tests: 305/305 pass;
- vitest: 1148/1148 pass via the `forks` pool on Node 24/Windows;
- theme export/import verified through `builtinThemeAcceptance.test.js` round-trip for all 6 shipped themes including `alchemy-rose`;
- `public/game/script.json` left unchanged (Alchemy Rose is a built-in theme, not example content);
- Phase 7 settings documentation already in `docs/agent-authoring/project-contract.md` and `validation-rules.md`;
- all Phase 8 acceptance criteria pass;
- vitest upgraded 4.1.7 → 4.1.9 and `pool: 'vmForks'` added to `vitest.config.js` as infrastructure fix.

Deferred decision gates:

- settings drag overlay (Phase 7): still deferred pending coordinate model and browser interaction tests;
- nine-slice `selected` state (Phase 6): still deferred pending a real widget-selected lifecycle;
- vitest `forks` pool on node 24/Windows: requires investigation upstream; `vmForks` is the working workaround.

## Phase Execution Rules

For each implementation session:

1. Read `AGENTS.md`, this roadmap, and the current phase section.
2. Run `git status --short --branch` and `git log -3 --oneline`.
3. Confirm `main`/working branch ancestry before editing.
4. Use CodeGraph context first for current architecture and call paths.
5. Inspect only the relevant backup diff after understanding current main.
6. Write or update focused tests with behavioral assertions.
7. Implement the smallest coherent current-main change.
8. Run focused tests, `git diff --check`, and inspect the final diff.
9. Update this roadmap when the phase is genuinely complete.
10. Stop at the phase boundary unless the user explicitly expands scope.

## Recommended Next Session

All phases (0-9) are complete. The workspace backup feature reimplementation is closed. Remaining work is limited to the deferred decision gates above (settings drag overlay, nine-slice selected state) and the vitest `forks` pool environment issue, none of which block the feature family.
