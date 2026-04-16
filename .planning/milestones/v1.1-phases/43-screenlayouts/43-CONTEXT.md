# Phase 43: 界面布局配置 — Smart Discuss Context

## Decisions

### 1. API Pattern: setLayout() method (not constructor param)
Design spec suggests constructor changes, but setLayout() is the established pattern:
- SettingsScreen already uses setLayout()
- Phase 42 added setWidgetStyles() as post-construction method
- Components instantiated before engine.load(); config applied after script loading
- Constructor signatures remain unchanged for backward compatibility

### 2. Config Timing: Store on setLayout, apply during show()
- All 3 screens rebuild DOM on each show() call
- setLayout(config) stores config; show() checks config and branches rendering
- setLayout(null) → existing hardcoded rendering path (COMPAT-02)

### 3. Default Values: Inline per-screen
- Each screen has unique DOM structure and defaults
- No shared defaults module needed (unlike widgetStyles which cross screen boundaries)
- Defaults extracted from design spec Section 5.1/5.2/5.3 schemas

### 4. DOM Strategy: Config branching in existing _render flow
- SaveLoadScreen._render() → if config, apply styles; else hardcoded HTML unchanged
- BacklogScreen.show() → if config, apply entry/header styles; else hardcoded
- GameMenu._render() → if config, apply button/position/background; else hardcoded
- Pattern: `if (this._layoutConfig) { applyConfig... } else { existingCode }`
- COMPAT-02: null config = byte-for-byte identical rendering

## Phase Boundary
- Phase 43 adds setLayout() to 3 screens only
- Does NOT touch main.js init flow (that's Phase 45: CONFIG-01)
- Does NOT touch SettingsScreen (already has setLayout from previous milestones)
- Does NOT use widgetStyles (screen layouts are independent of widget styling)

## Codebase Context
- SaveLoadScreen.js: 255 lines, has _render/_renderGrid/_renderPagination, 3×3 grid + 12-page pagination
- BacklogScreen.js: 116 lines, creates entries with speaker name + text + voice replay
- GameMenu.js: 61 lines, 6 buttons with data-action delegation
- Design spec: Section 5.1 (saveLoadScreen), 5.2 (gameMenu), 5.3 (backlogScreen) have complete JSON schemas
- sanitize.js: sanitizeCssValue + clampField available for safe CSS application
- assetPath.js: resolvePath for backgroundImage paths
