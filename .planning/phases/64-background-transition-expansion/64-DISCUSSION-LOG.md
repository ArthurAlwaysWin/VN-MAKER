# Phase 64 Discussion Log

## Auto-selected decisions

- Keep `BackgroundLayer` as the sole transition owner; do not introduce a second transition subsystem.
- Extend the known transition set to `none`, `fade`, `slide-left`, `slide-right`, `dissolve`, `wipe`, `scale`, and `blur`.
- Keep new effects CSS/DOM-only and compatible with the existing two-layer background structure.
- Treat skip / rapid page changes as cleanup-first `0ms` / cut paths, consistent with Phase 62 and Phase 63.
- Delay new-page visual entry so background transition finishes before character motion and camera playback begin.
- Keep `wipe` preset-only in v1.4 with no direction parameter.

## User confirmation

- User confirmed that the scale-style transition should use the internal enum name `scale` instead of `zoom` to avoid confusion with page camera `zoom`.
