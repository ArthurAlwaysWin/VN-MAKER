---
phase: 06-asset-library-foundation
plan: 01
subsystem: infra
tags: [ipc, file-validation, magic-bytes, font-loading, fontface-api, electron]
requires:
  - phase: v0.1
    provides: Existing asset:// protocol, IPC layer, isInsideProject() security, atomicWrite()
provides:
  - validateAssetFormat() — magic bytes + extension validation for 12 formats across 5 categories
  - getSupportedFormats() — extension list per asset category
  - select-asset IPC handler — native dialog with category filters, auto-copy + validate external files
  - import-assets IPC handler — batch import with validation, skip-invalid, auto-naming
  - delete-asset IPC handler — secure file deletion from project assets/
  - list-assets IPC handler — directory listing for any asset category
  - uniqueFilename() utility — auto-naming collision resolution (name-1, name-2, ...)
  - fonts/ directory support in create-project and load-project handlers
  - loadAllFonts() / loadSingleFont() — FontFace API wrapper for dual-process font loading
affects: [06-02, phase-7-asset-library-ui, phase-8-title-page-designer]
tech-stack:
  added: []
  patterns: [magic-bytes-validation, riff-container-sub-check, fontface-api-injection, auto-naming-collision-resolution]
key-files:
  created:
    - electron/validateAsset.js
    - src/engine/fontLoader.js
  modified:
    - electron/main.js
key-decisions:
  - "12-format magic bytes validation with RIFF sub-checks for WebP vs WAV disambiguation"
  - "Utility module pattern (exported functions, no class) for both validateAsset.js and fontLoader.js"
  - "select-asset returns relative path string or null — matching existing SettingsDesigner consumer contract"
  - "Sequential await in import-assets prevents auto-naming race conditions"
  - "fonts/ directory auto-created for legacy projects on load (D-08)"
patterns-established:
  - "Asset Library IPC section: grouped handlers with section comment divider"
  - "Magic bytes + extension dual check: never trust extension alone"
  - "FontFace API per-window: each BrowserWindow must load fonts independently"
requirements-completed: [ASSET-03, ASSET-04, INFRA-02, INFRA-03]
duration: 8min
completed: 2026-03-29
---

# Phase 6 Plan 01: Asset Library Backend Infrastructure Summary

**Magic bytes validation for 12 asset formats, 4 new IPC handlers (select/import/delete/list), auto-naming collision resolution, and FontFace API wrapper for dual-process font loading**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-29T13:29:00Z
- **Completed:** 2026-03-29T13:35:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created validateAsset.js with magic bytes + extension whitelist validation covering 12 formats (PNG, JPG, WEBP, MP3, OGG, WAV, TTF, OTF, WOFF, WOFF2) with RIFF container sub-checks
- Added 4 new IPC handlers to electron/main.js: select-asset, import-assets, delete-asset, list-assets — all with isInsideProject() security and { success, error } return pattern
- Implemented uniqueFilename() utility for auto-naming collision resolution (appends -1, -2, etc.)
- Added fonts/ directory creation to create-project (D-07) and auto-creation for legacy projects on load (D-08)
- Created fontLoader.js with loadAllFonts() and loadSingleFont() using FontFace API — works with asset:// protocol URLs in both editor and engine windows

## Task Commits

Each task was committed atomically:

1. **Task 1: Create asset format validation module** — `0b2ff77` (feat)
2. **Task 2: Add IPC handlers and fonts/ directory support** — `3b925e4` (feat)
3. **Task 3: Create shared font loading module** — `c8364d6` (feat)

## Files Created/Modified
- `electron/validateAsset.js` — Magic bytes + extension validation module (12 formats, 5 categories)
- `electron/main.js` — 4 new IPC handlers + uniqueFilename() + fonts/ directory support
- `src/engine/fontLoader.js` — FontFace API wrapper for dual-process font loading

## Decisions Made
- Used utility module pattern (exported functions, no class) matching sanitize.js convention for both new modules
- select-asset handler returns relative path string or null — preserves existing SettingsDesigner.vue consumer contract
- import-assets uses sequential await per file to prevent auto-naming race conditions (Pitfall #3 from research)
- RIFF container sub-check differentiates WebP (0x57454250) from WAV (0x57415645) in same RIFF header
- MP3 validation handles both ID3 header and multiple sync byte variants (0xFFFB, 0xFFF3, 0xFFF2)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- All 4 IPC handlers ready for consumption by Phase 6 Plan 2 (Pinia assets store) and Phase 7 (Asset Library UI)
- fontLoader.js ready for import by both editor stores and engine runtime (wiring in 06-02)
- validateAsset.js imported by main.js — no additional wiring needed
- `npx vite build` passes cleanly

## Self-Check: PASSED

- FOUND: electron/validateAsset.js
- FOUND: src/engine/fontLoader.js
- FOUND: electron/main.js
- FOUND: .planning/phases/06-asset-library-foundation/06-01-SUMMARY.md
- FOUND commit: 0b2ff77
- FOUND commit: 3b925e4
- FOUND commit: c8364d6

---
*Phase: 06-asset-library-foundation*
*Completed: 2026-03-29*
