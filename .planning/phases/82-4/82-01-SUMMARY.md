---
phase: 82-4
plan: 01
subsystem: ui
tags: [themes, vitest, electron, vue, installer, browser]

requires:
  - phase: 80-theme-browser-ux
    provides: unified static-preview browser normalization and apply-impact UX
  - phase: 81-golden-theme
    provides: golden `wafuu` baseline and title-inclusive full-theme contract
provides:
  - explicit built-in theme coverage, preview, and visual-signature metadata for all 5 shipped themes
  - shared built-in asset registry plus project-local materialization in the unified installer
  - completeness and visual-contract regression gates for later Phase 82 theme production plans
affects: [82-02, 82-03, 82-04, theme-browser, theme-installer]

tech-stack:
  added: []
  patterns:
    - explicit built-in manifest metadata for coverage, preview, and visual signatures
    - canonical built-in asset declarations copied through the same installer contract as imported themes

key-files:
  created:
    - src/editor/builtinThemeAssets.js
    - tests/builtinThemeCompleteness.test.js
    - tests/builtinThemeVisualContract.test.js
    - public/builtin-themes/default/chrome/frame.svg
    - public/builtin-themes/default/preview.svg
    - public/builtin-themes/wafuu/preview.svg
    - public/builtin-themes/modern-sky/preview.svg
    - public/builtin-themes/fantasy-dark/preview.svg
    - public/builtin-themes/minimal-white/preview.svg
  modified:
    - src/editor/builtinThemes.js
    - src/editor/services/themeBrowser.js
    - electron/themePackageInstaller.js
    - tests/themeBrowserService.test.js
    - tests/themePackageInstaller.test.js

key-decisions:
  - "BUILTIN_THEMES now carries explicit full-theme coverage, preview metadata, and visual signatures instead of relying on browser inference."
  - "Built-in bundled files are declared in one registry and copied into assets/ui/themes/<id>/... before install returns, preserving shared built-in/imported apply semantics."
  - "Explicit built-in preview metadata must resolve to real bundled preview SVGs so the browser stays truthful instead of rendering broken images."

patterns-established:
  - "Built-in truth first: browser coverage and missingCoverage now reflect manifest declarations, not implicit full-theme fallback."
  - "Installer materializes built-in files from public/builtin-themes/... into project-local canonical paths before returning packageMeta."

requirements-completed: [THM-02, THM-03]
duration: 9 min
completed: 2026-04-28
---

# Phase 82 Plan 01: Built-in Truth & Installer Hardening Summary

**Explicit 5-theme built-in manifests with preview/signature contracts and shared bundled-asset materialization through the unified installer**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-28T04:28:59Z
- **Completed:** 2026-04-28T04:38:10Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Added failing completeness and visual-contract tests that lock the shipped built-in roster to the 8-surface full-theme contract.
- Rebuilt `BUILTIN_THEMES` into an explicit manifest source with `coverage`, `preview`, `visualSignature`, and full `ui` payloads while removing browser full-theme assumptions.
- Added one shared built-in asset registry plus project-local materialization in `electron/themePackageInstaller.js`, keeping built-in and imported installs on the same bundle/packageMeta contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add explicit built-in completeness and visual-contract gates, then make browser truth follow them** - `4efefc0` (test), `e6e142c` (feat)
2. **Task 2: Add the shared built-in bundled-asset registry and project-local materialization path** - `6bae600` (test), `7fbd63b` (feat)

**Additional auto-fix:** `5fd7c1b` (fix: add shipped built-in preview SVG assets)

## Files Created/Modified
- `src/editor/builtinThemes.js` - Single built-in manifest source with explicit coverage, preview, visual-signature, and full `ui` data.
- `src/editor/services/themeBrowser.js` - Browser normalization now trusts explicit built-in coverage and derives missing coverage honestly.
- `src/editor/builtinThemeAssets.js` - Shared registry of built-in bundled files mapped from app-bundled sources to canonical project targets.
- `electron/themePackageInstaller.js` - Built-in installer now materializes declared bundled files before returning the shared install result.
- `tests/builtinThemeCompleteness.test.js` - 5-theme completeness gate across `FULL_THEME_COVERAGE_KEYS`.
- `tests/builtinThemeVisualContract.test.js` - Preview and visual-signature contract gate for shipped built-ins.
- `tests/themeBrowserService.test.js` - Browser regression coverage for explicit built-in metadata.
- `tests/themePackageInstaller.test.js` - Built-in copy-path and no-files built-in install coverage.
- `public/builtin-themes/*/preview.svg` - Real static preview assets for all five shipped built-ins.

## Decisions Made
- Built-in theme truth is now declared in manifest data, not synthesized by browser defaults, so later theme-production plans inherit honest coverage state.
- Shared built-in asset declarations live in `src/editor/builtinThemeAssets.js`, and installer writes them into `assets/ui/themes/<id>/...` before apply/export parity depends on them.
- Static preview metadata must point at real bundled assets to preserve the Phase 80 browser contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added real bundled preview SVGs for all built-in browser cards**
- **Found during:** Post-task verification after Task 2
- **Issue:** Task 1 added explicit `preview.src` metadata, but the browser renders those values through `<img>` tags; without shipped files the new truthful metadata would still produce broken previews.
- **Fix:** Added bundled preview SVG assets for `default`, `wafuu`, `modern-sky`, `fantasy-dark`, and `minimal-white` under `public/builtin-themes/<id>/preview.svg`.
- **Files modified:** `public/builtin-themes/default/preview.svg`, `public/builtin-themes/wafuu/preview.svg`, `public/builtin-themes/modern-sky/preview.svg`, `public/builtin-themes/fantasy-dark/preview.svg`, `public/builtin-themes/minimal-white/preview.svg`
- **Verification:** Focused Vitest suites passed and preview asset existence checks returned `FOUND` for all 5 paths.
- **Committed in:** `5fd7c1b`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The auto-fix kept the browser honest and usable without changing Phase 82 scope or adding a second preview pipeline.

## Issues Encountered
None.

## Authentication Gates
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ready for `82-02-PLAN.md` to start authoring `default` and `modern-sky` against explicit completeness, preview, and installer contracts.
- Built-in asset rollout now has one canonical registry/materialization path, so later plans can add real theme art without inventing a second built-in pipeline.

## Self-Check: PASSED

---
*Phase: 82-4*
*Completed: 2026-04-28*
