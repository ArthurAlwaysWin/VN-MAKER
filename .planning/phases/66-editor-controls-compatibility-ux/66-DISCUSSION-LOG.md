# Phase 66: Editor Controls & Compatibility UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 66-editor-controls-compatibility-ux
**Areas discussed:** Inspector integration, Control model, Preview entry and feedback, Compatibility UX

---

## Inspector integration

| Option | Description | Selected |
|--------|-------------|----------|
| Keep everything in the existing PageInspector flow | Extend current page properties and character sections; no new mode or panel | ✓ |
| Add a dedicated cinematic tab inside the editor | Separate cinematic controls from normal page editing | |
| Add a modal/drawer for cinematic settings | Open focused controls outside the normal inspector flow | |

**User's choice:** Auto-selected recommended default: keep cinematic controls in the existing PageInspector flow.
**Notes:** Auto mode preferred the lowest-friction option that satisfies PREV-01 and matches the current editor architecture.

## Control model

| Option | Description | Selected |
|--------|-------------|----------|
| Preset-first structured controls | Use selects and bounded inputs for known fields and spec ranges | ✓ |
| Freeform JSON / advanced object editor | Expose raw cinematic payloads directly | |
| Hybrid mode with advanced overrides | Basic controls plus optional raw override editing | |

**User's choice:** Auto-selected recommended default: preset-first structured controls.
**Notes:** This preserves the project's no-code direction and keeps unknown values compatible without exposing raw schema editing.

## Preview entry and feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Inline preview buttons near each control group | Trigger character/camera/transition preview from the related inspector block | ✓ |
| Put all single-effect preview controls in CanvasToolbar | Centralize replay buttons outside the inspector | |
| Create a dedicated preview mini-panel | Group effect preview controls in a separate preview-only area | |

**User's choice:** Auto-selected recommended default: inline preview buttons near each control group.
**Notes:** Phase 65 already provides the shared preview state; Phase 66 should consume it locally where the user edits the corresponding data.

## Compatibility UX

| Option | Description | Selected |
|--------|-------------|----------|
| Show unknown values explicitly and preserve them | Render “未知值” entries, keep save round-trips safe, block unsafe preview with explicit reason | ✓ |
| Coerce unknown values to the nearest known preset | Simplify the UI by forcing a supported option | |
| Hide unknown values until the user edits the field | Keep UI clean but risk silent ambiguity | |

**User's choice:** Auto-selected recommended default: show unknown values explicitly and preserve them.
**Notes:** This carries forward the frozen compatibility rules from Phases 61-65 and avoids silent data loss.

---

[auto] Selected all gray areas: Inspector integration, Control model, Preview entry and feedback, Compatibility UX.
[auto] Inspector integration → Selected: existing PageInspector flow (recommended default).
[auto] Control model → Selected: preset-first structured controls (recommended default).
[auto] Preview entry and feedback → Selected: inline preview buttons near each control group (recommended default).
[auto] Compatibility UX → Selected: show unknown values explicitly and preserve them (recommended default).
