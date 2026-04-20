# Phase 58: Decoration & Background Editor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 58-decoration-background-editor
**Areas discussed:** Editor Placement, Header Decoration Manager, Footer Button Config, Panel Background, Live Preview
**Mode:** Auto — all decisions auto-selected with recommended defaults

---

## Editor Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Section 4 in SettingsPageEditor.vue | Use existing placeholder, 3 collapsible sub-sections | ✓ |
| New standalone view | Separate Decoration editor view/tab | |
| Inline in layout section | Add to Section 2 (Layout & Row Styling) | |

**User's choice:** [auto] Section 4 in SettingsPageEditor.vue (recommended — placeholder already exists)
**Notes:** Section 4 "🎨 装饰与背景" placeholder was created during the tab reorganization earlier in this session.

---

## Header Decoration Manager

| Option | Description | Selected |
|--------|-------------|----------|
| List-based form | Vertical list of decoration cards with text inputs for path/x/y/w/h | ✓ |
| Visual canvas | Drag decorations on a preview canvas | |
| Table grid | Spreadsheet-style row editing | |

**User's choice:** [auto] List-based form (recommended — consistent with TabCrudSection pattern, no new interaction paradigm needed)
**Notes:** Each decoration is a card with image path input + 4 number inputs (x/y/width/height) + delete button.

---

## Footer Button Config

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed action dropdown | 3 actions: close/title/reset with dropdown selector | ✓ |
| Free-form action text | User types action string directly | |
| Checkbox toggles | Enable/disable each action type | |

**User's choice:** [auto] Fixed action dropdown (recommended — matches engine's 3 supported actions)
**Notes:** Button list with text input + action dropdown + x/y position + delete. Footer height as separate field.

---

## Panel Background

| Option | Description | Selected |
|--------|-------------|----------|
| Text input + opacity slider | Image path text input + range slider for opacity | ✓ |
| Asset picker + opacity | File browse dialog + opacity | |
| Full background editor | Color/image/gradient + opacity + position | |

**User's choice:** [auto] Text input + opacity slider (recommended — consistent with existing image path pattern, minimal scope)
**Notes:** Stored as `settingsScreen.background` + `settingsScreen.backgroundOpacity` in customLayout.

---

## Agent's Discretion

- CSS styling for decoration card layout
- Sub-section header icons/emojis
- Footer height min/max constraints
- Test structure and verification approach

## Deferred Ideas

- Asset picker dialog for image paths (future phase)
- Visual drag-and-drop decoration positioning (future phase)
- Footer button styling customization (future phase)
