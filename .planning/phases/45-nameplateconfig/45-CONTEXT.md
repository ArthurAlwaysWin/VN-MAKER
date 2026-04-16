# Phase 45: 名牌样式 + 配置统一 + 编辑器预览 — Smart Discuss Context

## Decisions

### 1. Nameplate Style API: setNameplateStyle(style) method
- DialogueBox gets `setNameplateStyle(style)` accepting 'inline'|'floating'|'banner'
- Stores as `this._nameplateStyle`, defaults to 'inline'
- Style applied in show() when rendering speaker name section
- Called from main.js after engine.load() when ui.dialogueBox.nameplateStyle is set

### 2. Nameplate DOM Strategy: CSS class switching, not DOM rebuild
- All 3 styles use the SAME DOM structure (dialogue-name-plate > dialogue-speaker-name)
- Style is applied via CSS class on the name-plate div: `nameplate-inline`, `nameplate-floating`, `nameplate-banner`
- inline: default positioning (inside box, above text) — no extra CSS needed (current behavior)
- floating: position: absolute; top: -28px; left: 16px; background bubble; border-radius; z-index
- banner: width: 100%; background-color; padding; no border-radius; full-width banner bar
- CSS injected once via a style element, not inline styles (keeps DOM clean)

### 3. CONFIG-01: Centralized config application in init()
- After engine.load(), read all ui.* configs and call setLayout/setWidgetStyles:
  - ui.saveLoadScreen → saveLoadScreen.setLayout()
  - ui.backlogScreen → backlogScreen.setLayout()
  - ui.gameMenu → gameMenu.setLayout()
  - ui.widgetStyles → settingsScreen.setWidgetStyles()
  - ui.dialogueBox.nameplateStyle → dialogueBox.setNameplateStyle()
- Existing titleScreen.setLayout and settingsScreen.setLayout calls already present — don't duplicate
- All calls are null-safe (setLayout(null) is a no-op by design)

### 4. CONFIG-02: Mirror config in preview initPreview()
- In the 'start' message handler, after applying theme/fonts:
  - Same setLayout/setWidgetStyles/setNameplateStyle calls as init()
  - Source: engine.script.ui.* (same as init, since msg.script is set to engine.script)

## Phase Boundary
- Phase 45 modifies: DialogueBox.js (nameplate styles) + main.js (config routing)
- Does NOT modify any screen's setLayout implementation (done in Phase 42-44)
- Does NOT create new files (only modify existing)
- After Phase 45, all v1.1 requirements should be complete

## Codebase Context
- DialogueBox.js: ~230 lines. DOM: dialogue-name-plate > dialogue-speaker-name. show() handles speakerName display.
- main.js: ~920 lines. init() at line 782, initPreview() at line 845. Already has titleScreen.setLayout + settingsScreen.setLayout + dialogueBox.applyGlobalStyle
- saveLoadScreen, backlogScreen, gameMenu, settingsScreen all instantiated before init() is called
