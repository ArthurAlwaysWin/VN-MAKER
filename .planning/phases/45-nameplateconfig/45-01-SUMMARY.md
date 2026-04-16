---
phase: 45-nameplateconfig
plan: "01"
subsystem: ui/DialogueBox
tags: [nameplate, dialogue, css-injection, style-switching]
dependency_graph:
  requires: []
  provides: [setNameplateStyle, nameplate-css-classes]
  affects: [DialogueBox.show]
tech_stack:
  added: []
  patterns: [css-class-injection, style-enum-validation]
key_files:
  created:
    - tests/dialogueBoxNameplate.test.js
  modified:
    - src/ui/DialogueBox.js
decisions:
  - CSS injected lazily on first non-inline style to avoid unused rules
  - Inline style class (nameplate-inline) has no CSS rules — preserves exact current behavior
  - All three nameplate-* classes applied in show() before speaker name handling
metrics:
  duration: 4m
  tasks_completed: 3
  tests_added: 12
  completed: "2026-04-16"
---

# Phase 45 Plan 01: DialogueBox Nameplate Styles Summary

**One-liner:** setNameplateStyle() supporting inline/floating/banner via CSS class switching with lazy injection

## What Was Done

### Task 1: Add setNameplateStyle() method and CSS injection
- Added `_nameplateStyle` (default 'inline') and `_nameplateCssInjected` fields to constructor
- Added `setNameplateStyle(style)` method with validation — accepts 'inline'|'floating'|'banner', falls back to 'inline'
- Added `_injectNameplateCSS()` that creates a `<style>` element with floating (absolute positioned bubble) and banner (full-width bar) rules
- CSS injected once into `document.head` on first non-inline usage

### Task 2: Apply nameplate style class in show()
- In `show()`, before speaker name handling, removes all nameplate-* classes and adds `nameplate-${this._nameplateStyle}`
- Ensures correct class is always applied regardless of style changes between show() calls

### Task 3: Unit tests (12 tests, all passing)
- Default style is 'inline'
- setNameplateStyle sets floating/banner correctly
- Invalid style falls back to 'inline'
- show() applies correct CSS class for each style
- Name-plate hidden when speakerName empty regardless of style
- CSS injected for non-inline, not for inline, only once
- NAMEPLATE-01 backward compat: inline matches never calling setNameplateStyle

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1+2 | ea16ca3 | feat(45-01): add setNameplateStyle() with CSS injection and class application in show() |
| 3 | 7a8669a | test(45-01): add nameplate style unit tests (12 tests) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality is fully wired and tested.

## Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| NAMEPLATE-01 | ✅ | inline default preserves current behavior, test #10 verifies |
| NAMEPLATE-02 | ✅ | floating CSS positions bubble at top:-32px left:16px with background |
| NAMEPLATE-03 | ✅ | banner CSS renders full-width bar with padding |

## Self-Check: PASSED

- All 3 key files exist on disk
- Both commits (ea16ca3, 7a8669a) found in git log
- All required methods/fields present in DialogueBox.js
