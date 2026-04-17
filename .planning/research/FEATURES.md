# Feature Landscape — Settings Screen Structural Customization

**Domain:** Visual novel engine — settings screen layout parameterization
**Researched:** 2025-07-27

## Table Stakes

Features users expect from a configurable settings screen in a VN maker. Missing = can't reproduce commercial VN quality.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Custom tab count & labels** | Every commercial VN chooses its own tab grouping (2-5 tabs). Hardcoded 3 tabs is too rigid. | Low | Replace `DEFAULT_TAB_LABELS` + `SETTING_GROUP_KEYS` with config-driven `tabs[]` array. |
| **Custom setting-to-tab assignment** | Sound/Display/Game grouping doesn't fit all games. Some want 2 tabs, some want 4. Users need to decide which settings go where. | Low | `tabs[].settingKeys` maps SETTING_DEFS keys to tabs. |
| **2-column layout option** | Aokana, CLANNAD, and many commercial VNs use 2-column settings grids. Single column wastes horizontal space with only 3-4 items per tab. | Low | CSS Grid `grid-template-columns: 1fr 1fr` on content container. |
| **Row visual separators** | Most commercial VN settings have dividers or alternating backgrounds between rows. Current bare flex layout looks amateur. | Low | `showDividers` and `alternateBackground` toggles with color config. |
| **Reset to defaults button** | デフォルトに戻す is standard in virtually every Japanese VN settings screen. Currently missing from our footer. | Low | New `action: 'reset'` for footer buttons, calling `ConfigManager` reset method. |
| **Panel background image** | Senrenbanka, Muv-Luv, etc. use custom panel backgrounds (often a translucent character watermark). | Low | Background image layer with opacity, same pattern as custom layout mode's bg layer. |

## Differentiators

Features that elevate beyond basic structural customization. Not expected from a no-code maker, but impressive.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Left-side tab navigation** | Senrenbanka-style sidebar tabs. Visually distinctive, more content space. Only 2 VN makers (our competitors) support this. | Medium | Requires DOM restructure from column to row flexbox. Isolated render path. |
| **Tab icons** | Aokana-style icon+text tabs. Gives settings a polished, game-like feel. | Low | `<img>` prepended to tab buttons, using existing `resolvePath()`. |
| **Header decorative images** | Ornamental corner images, decorative strips. Many commercial VNs use these for brand identity. | Low | `decorations[]` array with positioned images, same as existing `_renderImageElem()`. |
| **Label position: top** | Stacked label (above control) enables compact 2-column layouts. Useful when label text is long or when using shorter controls. | Low | `flexDirection: 'column'` on item instead of `'row'`. |
| **Value label toggle** | Some VN settings hide the "80%" readout for cleaner look. Currently always shown. | Low | `showValueLabel: false` skips value span creation. |
| **Custom label widths** | Different games need different label/control proportions. 140px fixed is too rigid. | Low | `labelWidth` as configurable pixel value. |

## Anti-Features

Features to explicitly NOT build in v1.3.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Free-position settings in structured mode** | That's what custom layout mode (elements[]) already does. Structured mode's value IS the auto-layout. Mixing absolute positioning defeats the purpose. | Use custom layout mode for pixel-perfect placement. |
| **3+ column grid** | No commercial VN uses 3+ column settings. Over-engineering. | Cap at 2 columns. |
| **Per-setting style overrides** | Each setting having its own color/size breaks visual consistency and explodes editor complexity. | Use widgetStyles for global control appearance. |
| **Animated decorations** | GIF/APNG in header decorations is a rabbit hole (memory, performance, loading). | Static PNG/WebP images only. |
| **Tab drag-and-drop reordering** | In the editor, tab order is set by config array order. Drag-and-drop adds library dependency (vuedraggable) for minimal value. | Up/down arrow buttons in editor, or just edit the array order. |
| **Section headers within tabs** | Sub-grouping within tabs adds editor CRUD complexity for sections. With only 3-4 items per tab, it's unnecessary. | DEFER. Revisit if SETTING_DEFS grows beyond 15 items. |
| **Custom control types** | User-defined slider/toggle appearance per-setting. Already handled by widgetStyles system globally. | widgetStyles handles all control appearance. |
| **Tab switch animations** | Configurable slide/fade on content change. Low value, high complexity. | Default CSS opacity transition. Not configurable. |

## Feature Dependencies

```
Tab Structure (tabs[].settingKeys)
  → Content Layout (columns, gap) — builds on tab content
  → Row Styling (itemStyle) — applied within content
  → Left Tabs (tabBar.position: 'left') — restructures tab+content relationship

Header Decorations (header.decorations[])
  → Independent of content/tab features

Footer Reset (action: 'reset')
  → Needs ConfigManager.resetToDefaults() method
  → Content re-render after reset

Panel Background
  → Independent, applies to entire settings screen
```

## MVP Recommendation

Prioritize (Phase 1-2, must-have for v1.3):
1. **Custom tab structure** — tabs[].settingKeys replaces hardcoded grouping
2. **2-column layout** — `contentArea.columns: 2` with CSS Grid
3. **Row dividers / zebra** — `itemStyle.showDividers`, `itemStyle.alternateBackground`
4. **Reset to defaults** — Footer button `action: 'reset'`
5. **Panel background** — Background image with opacity

Defer to Phase 3-5:
- **Left-side tabs**: More complex DOM restructure, can ship after core features
- **Tab icons**: Polish feature, not blocking
- **Header decorations**: Polish feature, not blocking
- **Editor UI for all above**: Follows engine implementation

## Sources

- Codebase analysis (HIGH confidence): `SettingsScreen.js` structured mode, `settingDefs.js` SETTING_DEFS registry, `widgetDefaults.js` merge pattern, `TabWidget.js` 5 shapes, `SettingsSection.vue` editor form
- Commercial VN patterns (MEDIUM confidence): Aokana, Senrenbanka, CLANNAD, Muv-Luv, Steins;Gate settings screens
- VN engine patterns (MEDIUM confidence): Ren'Py preferences screen, TyranoBuilder config, Naninovel settings
