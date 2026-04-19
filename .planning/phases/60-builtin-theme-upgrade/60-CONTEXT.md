# Phase 60 Context — Built-in Theme Upgrade

## Goal
Upgrade all 5 built-in themes to use colorRecipe format and demonstrate v1.3 structural features.

## Current State
- 5 themes in `builtinThemes.js`: default, wafuu, modern-sky, fantasy-dark, minimal-white
- Only wafuu has full screens config; other 3 have empty screens
- All themes use hand-coded token values (no colorRecipe)
- `applyBuiltinTheme()` doesn't handle colorRecipe — needs update
- Engine supports: tabBar.position='left', columns=2, itemStyle, header.decorations, footer.buttons

## Decisions (auto mode)

### D-01: colorRecipe for all non-default themes
Each theme gets `colorRecipe: { primary, accent, mode }` + derived tokens.
Default theme stays empty (engine defaults).

### D-02: applyBuiltinTheme colorRecipe support
Update to copy `colorRecipe` into `theme` object so Smart Color Panel sees it.

### D-03: Wafuu gets left-tab sidebar (UPGRADE-02)
`tabBar.position = 'left'` with sidebar width and Japanese-style tab icons.

### D-04: Modern-sky gets columns=2 layout (UPGRADE-03)
`contentArea.columns = 2` with itemStyle row decorations.

### D-05: Wafuu + fantasy-dark get header decorations (UPGRADE-04)
`header.decorations` array with positioned ornamental images.
Tab icons on at least 2 themes.
