# Milestone 8 Release Note: Canvas-Mask Transition Add-On

Milestone 8 ships a contract-first canvas-mask transition milestone. It adds
three built-in procedural background transitions without adding new project fields,
user-uploaded mask assets, WebGL/shaders, plugin code, arbitrary JavaScript, or a
new effect DSL.

## What ships

- Three background transition ids in the shared catalog:
  `noise-dissolve`, `ripple`, and `burn`.
- All three ids are stored as normal page transition values under
  `scenes.<sceneId>.pages.<pageIndex>.transition.type`.
- Runtime routing in `BackgroundLayer` detects catalog entries with
  `renderMode: "canvas-mask"` and calls the procedural Canvas 2D helper.
- Runtime safety covers cancellation, cleanup, Canvas 2D fallback, zero-duration
  skip behavior, and `prefers-reduced-motion`.
- Page transition CLI, apply-plan, Page Inspector options, validation, preview
  planning, and handoff all continue using the existing transition contract.
- `author-check --transaction --write-preview-plan` and handoff reports now route
  changed transition paths to scene-page targets with `transition-preview` review
  items.

## Why this is complete

The milestone goal was to prove a small canvas-mask add-on could fit the existing
transition contract without opening asset, plugin, shader, or DSL scope. The three
procedural presets exercise the required runtime path and authoring workflow while
keeping the schema stable.

## Deferred

- Additional canvas-mask presets beyond the shipped built-ins.
- User-uploaded mask images and related asset scanning/export readiness.
- WebGL, shaders, Live2D, plugin/runtime packs, marketplace work, and arbitrary
  project JavaScript.
- Milestone 11 agent advanced effect packs.
