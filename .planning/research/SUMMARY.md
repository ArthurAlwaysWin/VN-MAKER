# Research Summary: v1.3 Settings Screen Structural Customization

**Domain:** Visual novel engine — settings screen layout parameterization
**Researched:** 2025-07-27
**Overall confidence:** HIGH

## Executive Summary

The settings screen in Galgame Maker currently operates in three modes: custom absolute-position layout (elements[]), structured auto-layout (header/tabBar/contentArea), and default fallback. The v1.3 goal is to extend the structured mode with configurable tab structure, multi-column content layout, row styling options, and header/footer flexibility — all while maintaining the "Canva level" template+parameters philosophy.

Analysis of commercial VN settings screens reveals five dominant patterns: (A) tab+icon with 2-column grid (Aokana), (B) vertical sidebar tabs with full-width content (Senrenbanka), (C) scroll-based no-tab with section headers, (D) multi-column grouped boxes (CLANNAD), and (E) icon grid navigation. Our structured mode can support patterns A, B, and C through a small set of parameters: tab position (top/left), column count (1/2), and content item styling (dividers/zebra/label position).

The existing architecture is exceptionally well-suited for this extension. The sparse-merge-onto-defaults pattern used throughout (`deepMergeWidgetStyles`, `applyTheme`, all screen configs) means every new parameter is additive with a sensible default — zero backward compatibility risk. The SETTING_DEFS registry already decouples setting definitions from layout, and the widgetStyles system already handles control appearance. This milestone only needs to handle **structural arrangement** of these existing controls.

The recommended config schema adds `tabBar.tabs[]` with `settingKeys` arrays for user-defined tab-to-setting mapping, `contentArea.columns` (1 or 2), `contentArea.itemStyle` for row visuals, `header.decorations[]` for ornamental images, and a `reset` footer button action. All fields are optional. Total new parameters: ~15, all with defaults matching current output.

## Key Findings

**Stack:** Zero new dependencies — all features achievable with existing CSS Grid/Flexbox and DOM manipulation in the engine. See [STACK.md](./STACK.md).
**Architecture:** Extension of existing `_renderStructured()` with config-driven tab grouping, CSS Grid 2-column mode, and itemStyle application. See [ARCHITECTURE.md](./ARCHITECTURE.md) and [structural-params.md](./structural-params.md).
**Critical pitfall:** Tab-to-setting assignment must handle future SETTING_DEFS additions gracefully — "unassigned keys append to last tab" pattern prevents settings from silently disappearing. See [PITFALLS.md](./PITFALLS.md).

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Tab Structure + Setting Assignment** — Engine foundation
   - Addresses: Configurable tab count/labels/icons, custom setting-to-tab mapping
   - Avoids: Breaking existing 3-tab default by keeping `SETTING_GROUP_KEYS` as fallback
   - Rationale: All other structural features (columns, left tabs) build on configurable tab content

2. **Content Layout + Row Styling** — Visual variety
   - Addresses: 2-column grid, row dividers, zebra stripes, label position, value label toggle
   - Avoids: Over-engineering by capping at 2 columns (covers 99% of commercial VN patterns)
   - Depends on: Phase 1 (tab content is the rendering surface for layout changes)

3. **Header/Footer + Panel Background + Left Tabs** — Complete the chrome
   - Addresses: Decorative header images, reset-to-defaults action, panel background, sidebar tab position
   - Avoids: DOM restructure risk by isolating left-tab mode as separate render path
   - Mostly independent of Phase 2 but logically groups "chrome" changes

4. **Editor UI** — Configuration surface
   - Addresses: Tab editor (add/remove/assign), layout controls, row style controls, decoration list, footer button editor
   - Depends on: Phases 1-3 (editor must configure what engine supports)

5. **Built-in Theme Updates** — Demonstrate capability
   - Addresses: Update builtinThemes.js with new structural parameters, create showcase themes
   - Depends on: Phase 4 (themes should exercise full parameter range)

**Phase ordering rationale:**
- Engine changes before editor changes (engine defines capability surface)
- Tab structure first because content layout and chrome features all live inside tabs
- Editor UI after engine because it needs stable config schema to bind to
- Theme updates last because they're the integration test of everything

**Research flags for phases:**
- Phase 3 (Left tabs): Likely needs implementation research — DOM restructure from vertical stack to horizontal flex when `tabBar.position: 'left'`
- Phase 4 (Editor): Tab editor with setting-assignment checkboxes may need UX prototyping to validate usability
- Phases 1-2: Standard patterns, low research risk

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps, all CSS Grid/Flexbox, verified in codebase |
| Features | HIGH | Based on codebase analysis + commercial VN domain knowledge |
| Architecture | HIGH | Extends established patterns (sparse merge, config-driven render) |
| Pitfalls | MEDIUM | Future-proofing for SETTING_DEFS growth is logical but untested |
| Commercial VN patterns | MEDIUM | Based on domain expertise, not live-verified screenshots |

## Gaps to Address

- **Tab icon asset format:** Should icons be SVG, PNG, or both? Needs alignment with asset library capabilities
- **Left-tab DOM structure:** Exact CSS approach needs prototyping in Phase 3
- **Editor UX for setting assignment:** Checkbox matrix vs. drag-and-drop — needs mock validation
- **Section headers within tabs:** Deferred from v1.3, may need in future if SETTING_DEFS grows significantly
- **Per-setting label overrides:** Not in v1.3 scope, but frequently requested in VN makers

---
*Research completed: 2025-07-27*
*Ready for roadmap: yes*
*Files synthesized: SUMMARY.md, STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, structural-params.md*
