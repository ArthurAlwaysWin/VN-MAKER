---
phase: 78-theme-package-contract-compatibility-boundaries
plan: 01
subsystem: infra
tags: [theme-packages, gmtheme, zip, compatibility, vitest]
requires:
  - phase: 77-audit-traceability-and-verification-closeout
    provides: locked v1.5 UI image coverage and canonical ui/... asset rules
provides:
  - shared .gmtheme contract validation and namespace helpers
  - dual-mode parser metadata for full and legacy theme packages
  - focused regression coverage for canonical refs and deterministic re-imports
affects: [79-install-apply-export, 80-theme-browser, theme-import]
tech-stack:
  added: []
  patterns: [fail-closed package validation, same-namespace copy-skip-overwrite planning]
key-files:
  created: [src/shared/themePackageContract.js, tests/themePackageContract.test.js]
  modified: [src/utils/themePackager.js, tests/themePackager.test.js]
key-decisions:
  - "Full theme packages now expose explicit full vs legacy mode metadata instead of pretending all imports are equivalent."
  - "Re-import planning is locked to the same ui/themes/<themeId>/ namespace with copy/skip/overwrite only."
patterns-established:
  - "Theme package refs must stay canonical ui/... paths rooted under ui/themes/<themeId>/."
  - "Legacy .theme imports remain compatibility-only and report missing coverage instead of full-theme success."
requirements-completed: [PKG-03, PKG-04]
duration: 5min
completed: 2026-04-27
---

# Phase 78 Plan 01: Freeze `.gmtheme` schema, canonical namespace rules, and deterministic re-import policy Summary

**Fail-closed `.gmtheme` validation plus explicit legacy-partial parsing now freeze canonical `ui/themes/<themeId>/` refs and deterministic same-namespace re-import actions.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-27T15:00:08Z
- **Completed:** 2026-04-27T15:05:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added a shared theme package contract module for format versions, coverage tracking, canonical ref checks, and re-import planning.
- Upgraded the packager parser to classify full `.gmtheme` archives separately from legacy `.theme` compatibility payloads.
- Locked the contract with focused regression tests for invalid refs, namespace safety, corrupt archives, and legacy missing-coverage reporting.

## Task Commits

1. **Task 1: Write failing contract tests for full-package, re-import, and legacy compatibility rules** - `fb9906e` (test)
2. **Task 2: Implement shared theme package contract and dual-mode parser helpers** - `9528d9e` (feat)

## Files Created/Modified
- `src/shared/themePackageContract.js` - Shared format-version, canonical path, coverage, and re-import helpers.
- `src/utils/themePackager.js` - Full-package parser path, legacy classification, and safer binary helpers.
- `tests/themePackageContract.test.js` - Contract coverage for canonical refs, namespace planning, and legacy classification.
- `tests/themePackager.test.js` - Parser coverage for full `.gmtheme`, corrupt archives, and compatibility-only legacy imports.

## Decisions Made
- Full packages surface explicit `mode`, `themeId`, `assetRoot`, `coverage`, and blocking errors at parse time.
- Re-import never uses filename suffixing; it only returns `copy`, `skip`, or `overwrite` within the same namespace.
- Legacy `.theme` parsing keeps compatibility but always reports `legacy-partial` plus missing coverage.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 78-02 can now build dry-run IPC and renderer summaries on top of the frozen parser/contract output.
- Full install/apply/export work remains intentionally deferred to Phase 79.

## Self-Check: PASSED
- Found summary target: `.planning/phases/78-theme-package-contract-compatibility-boundaries/78-01-SUMMARY.md`
- Found task commits: `fb9906e`, `9528d9e`
