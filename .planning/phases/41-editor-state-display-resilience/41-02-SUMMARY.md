---
phase: 41
plan: "02"
subsystem: script-store, character-editor
tags: [expression-deletion, reference-check, batch-replace]
requires:
  - engine-expression-validation
  - canvas-expression-inheritance
provides:
  - expression-reference-scan
  - safe-expression-deletion
affects:
  - script.js
  - CharacterEditor.vue
tech-stack:
  added: []
  patterns: [cross-scene-scan, batch-mutation-single-undo]
key-files:
  created: []
  modified:
    - src/editor/stores/script.js
    - src/editor/components/resource-library/CharacterEditor.vue
key-decisions:
  - D-05 scan all scenes for expression references
  - D-06 auto-replace to first remaining expression
  - Single pushState after batch replace + delete
requirements-completed: []
---

# Phase 41 Plan 02: Expression Deletion Reference Check Summary

Expression deletion now scans all scenes for stale references, shows affected pages in confirmation dialog, and batch-replaces references as a single undo-able operation.

**Tasks:** 2 | **Files modified:** 2

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Store helpers: findExpressionReferences + replaceExpressionReferences | `9fb483a` | script.js |
| 2 | Rewrite deleteExpression with reference check + confirmation | `ce99490` | CharacterEditor.vue |

## Issues Encountered

None

## Next

Phase 41 complete, ready for verification.
