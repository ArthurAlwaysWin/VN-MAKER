---
phase: "43"
plan: "01"
subsystem: ui/SaveLoadScreen
tags: [setLayout, screen-config, pagination, slot-styling, COMPAT-02]
dependency_graph:
  requires: [sanitize.js, assetPath.js]
  provides: [SaveLoadScreen.setLayout]
  affects: [main.js (Phase 45 wiring)]
tech_stack:
  added: []
  patterns: [config-branching, setLayout-pattern, dynamic-pagination]
key_files:
  created:
    - tests/saveLoadScreenLayout.test.js
  modified:
    - src/ui/SaveLoadScreen.js
    - package.json
decisions:
  - "Used clampField('padding') bounds [0,200] for gap and backdropBlur since no dedicated bounds exist"
  - "Dots pagination uses <span class='page-dot'> vs tabs <button class='page-tab'> per design spec"
  - "Partial config falls back per-field to defaults (not all-or-nothing)"
metrics:
  duration: "7m"
  completed: "2026-04-16T12:30:30Z"
  tasks: 3
  files: 4
---

# Phase 43 Plan 01: Add setLayout(config) to SaveLoadScreen Summary

**One-liner:** SaveLoadScreen.setLayout(config) with full schema support — background, header, slotGrid (dynamic columns×rows pagination), slot styling, dots/tabs pagination, and CSS injection safety via sanitize.js.

## What Was Done

### Task 1: Write Failing Tests (TDD RED)
Created `tests/saveLoadScreenLayout.test.js` with 47 vitest tests covering:
- API existence and storage (`setLayout`, `_layoutConfig`, `_getSlotsPerPage`, `_getTotalPages`)
- COMPAT-02: null config produces identical HTML to never calling setLayout
- SCREEN-01: full config application for header, background, slotGrid, slot, pagination
- Partial config fallback behavior
- CSS injection safety for background, border, title color
- Keyboard navigation with custom page counts
- Occupied slot styling and thumbnail radius

**Commit:** `81dae05`

### Task 2: Implement setLayout(config) (TDD GREEN)
Modified `src/ui/SaveLoadScreen.js` from 295 to 468 lines:
- Added `this._layoutConfig = null` in constructor
- Added `setLayout(config)` public API (SettingsScreen pattern)
- Added `_getSlotsPerPage()` → config columns×rows or default 9
- Added `_getTotalPages()` → ceil(108/slotsPerPage) or default 12
- Config branching in `_render()`: background, backdropBlur, header (height, backgroundImage, title text/color)
- Config branching in `_renderGrid()`: dynamic slots per page
- Config branching in `_renderPagination()`: dots (`<span class="page-dot">`) vs tabs (`<button class="page-tab">`), with active/inactive colors
- Config branching in `_createSlotCard()`: slot background, backgroundImage, borderRadius, border, emptyText, thumbnailRadius
- Keyboard navigation updated to use `_getTotalPages()`
- All CSS string values sanitized via `sanitizeCssValue()`
- All numeric values clamped via `clampField()`
- All image paths resolved via `resolvePath()`

**Commit:** `542cc26`

### Task 3: Dev Dependencies
Added vitest and jsdom as devDependencies for test infrastructure.

**Commit:** `58719cc`

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SCREEN-01 | ✅ | 36 tests verify all schema fields applied correctly |
| COMPAT-02 | ✅ | 6 tests verify null config = identical rendering; HTML comparison test passes |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all config fields are fully wired and functional.

## Verification

- 47/47 tests passing
- COMPAT-02 HTML identity test confirms zero visual change when config is null
- CSS injection safety verified for background, border, and title color

## Self-Check: PASSED

- All 3 key files exist on disk
- All 3 commits (81dae05, 542cc26, 58719cc) found in git log
