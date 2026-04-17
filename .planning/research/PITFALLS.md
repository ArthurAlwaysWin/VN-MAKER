# Domain Pitfalls — Settings Screen Structural Customization

**Domain:** Settings screen layout parameterization in Galgame Maker (visual novel engine + editor)
**Researched:** 2025-07-27
**Overall confidence:** HIGH — based on direct codebase analysis of SettingsScreen.js, settingDefs.js, ConfigManager.js, TabWidget.js, SettingsSection.vue, builtinThemes.js

---

## Critical Pitfalls

Mistakes that cause settings screen to break, settings to silently disappear, or backward compatibility failures.

---

### Pitfall 1: Future SETTING_DEFS Keys Silently Disappear

**What goes wrong:** When users define custom `tabBar.tabs[].settingKeys` arrays, they explicitly list which settings appear in each tab. If a future engine version adds a new SETTING_DEFS key (e.g., `'language'`), it won't appear in any tab. The user's saved config has no mention of it, so the setting is invisible and unconfigurable in-game.

**Why it happens:** Explicit tab assignment is closed — it only shows what you list. New engine capabilities are invisible to old configs.

**Consequences:** Players can't access new settings. Feature appears broken. Users don't know the setting exists.

**Prevention:** "Unassigned keys append to last tab" fallback. At render time, collect all keys assigned across all tabs. Any SETTING_DEFS key not in this set gets appended to the last tab's content. This ensures all settings are always accessible, even if placement isn't ideal.

```js
const allAssigned = new Set(tabs.flatMap(t => t.settingKeys));
const unassigned = Object.keys(SETTING_DEFS).filter(k => !allAssigned.has(k));
if (unassigned.length > 0 && tabs.length > 0) {
  tabs[tabs.length - 1].settingKeys.push(...unassigned);
}
```

**Detection:** Unit test that adds a fake key to SETTING_DEFS and verifies it appears in rendered output when not in any tab config.

---

### Pitfall 2: Same Setting Key in Multiple Tabs

**What goes wrong:** User accidentally assigns `'bgm-volume'` to both Tab 1 and Tab 2. The slider appears in both tabs, and changes in one tab don't visually update the other until re-render. Worse: if the engine creates two slider controls for the same ConfigManager key, they can fight (one writes, the other shows stale value).

**Why it happens:** No validation on `settingKeys` uniqueness across tabs. Editor UI doesn't prevent it.

**Consequences:** Duplicate sliders with conflicting state. Confusing UX. Potential stale values.

**Prevention:** 
1. **Engine:** Deduplicate at render time — first occurrence wins. `console.warn` about duplicates.
2. **Editor:** Gray out already-assigned keys in other tab checkboxes. Prevent the same key from being checked in multiple tabs.

**Detection:** Engine `console.warn` on duplicate detection. Editor UI visual feedback.

---

### Pitfall 3: Backward Compatibility Break — Empty `tabs` Array

**What goes wrong:** User creates a `tabBar.tabs: []` (empty array, e.g., by removing all tabs in editor). Current fallback logic checks `tabCfg.tabs || DEFAULT_TAB_LABELS` — if `tabs` is `[]` (truthy), the fallback doesn't trigger. Result: no tabs render, no settings visible.

**Why it happens:** Empty array `[]` is truthy in JavaScript. Fallback only triggers for `null`/`undefined`.

**Consequences:** Settings screen renders empty. User can't access any settings.

**Prevention:** Check `tabs?.length > 0` not just `tabs`:
```js
const tabs = (tabCfg.tabs?.length > 0) ? tabCfg.tabs : DEFAULT_TAB_LABELS.map(...);
```

**Detection:** Unit test with empty `tabs: []` verifying fallback renders.

---

### Pitfall 4: Reset Action Without Confirmation

**What goes wrong:** User clicks "恢复默认" footer button and all their carefully tuned volume/speed settings are instantly wiped. No confirmation dialog. No undo.

**Why it happens:** Direct `ConfigManager.resetToDefaults()` call on button click. No gating mechanism.

**Consequences:** Accidental data loss of user preferences. Frustrating UX.

**Prevention:** Inline confirmation before reset. Options:
1. Double-click-to-confirm: first click shows "确认?" label, second click within 3s executes reset
2. `confirm()` dialog: simple but breaks immersion
3. Undo buffer: store previous config, allow Ctrl+Z — too complex for runtime

**Recommendation:** Option 1 (double-click). Simple, no dialog, no undo system needed. Same pattern as save slot delete confirmation in SaveLoadScreen.

**Detection:** Manual testing — click reset, verify confirmation appears before execution.

---

## Moderate Pitfalls

### Pitfall 5: Left-Tab DOM Restructure Breaks Content Positioning

**What goes wrong:** When `tabBar.position === 'left'`, the content area needs different absolute positioning calculations. Current content area uses `position: absolute; left: 40px; top: 160px` — these values assume top-tab layout where header+tabbar consume vertical space. With left tabs, the header is shorter and the content needs to account for the sidebar width, not tab bar height.

**Prevention:** 
- Left-tab mode uses a completely separate render path (`_renderLeftTabStructured()`)
- Content area positioning is recalculated based on sidebar width
- Don't try to toggle between modes with conditionals — two clean paths

### Pitfall 6: Two-Column Grid with Odd Item Count

**What goes wrong:** With `columns: 2` and 3 items in a tab, the third item sits alone in the left column. With 1 item, it takes half the width, looking awkward.

**Prevention:** 
- 1 item: span full width with `grid-column: 1 / -1`
- Odd last item: let it sit in left column (natural grid behavior, acceptable)
- Alternative: detect single-item tabs and force `columns: 1` automatically

### Pitfall 7: Tab Icon Image Loading Failures

**What goes wrong:** User sets a tab icon path that doesn't exist (deleted asset, wrong path). Tab renders with a broken image icon, looking worse than no icon.

**Prevention:** 
- `img.onerror` handler that hides the icon element and shows text-only fallback
- In editor: validate icon path against asset library on assignment

### Pitfall 8: Label Position 'top' Breaks Two-Column Layout

**What goes wrong:** With `labelPosition: 'top'` + `columns: 2`, each setting item becomes taller (label above control). But the grid items may have different heights — a slider with value label is taller than a toggle. Grid rows misalign.

**Prevention:** CSS Grid handles this naturally with `grid-auto-rows: auto`. Each row adjusts to its tallest item. No special handling needed, but test visually with mixed slider/toggle/select combinations.

### Pitfall 9: Header Decoration Images Overflow

**What goes wrong:** User positions a decoration image at x: 1200 in a 1280-wide header. The image overflows, causing horizontal scrollbar or visual glitch.

**Prevention:** 
- Header container has `overflow: hidden`
- `clampField()` already clamps positional values — extend to decoration positions

### Pitfall 10: Editor Checkbox Matrix for Setting Assignment Gets Unwieldy

**What goes wrong:** With 9+ SETTING_DEFS and 4-5 tabs, the checkbox matrix in the editor becomes a wall of checkboxes. Users lose track of which settings are assigned where.

**Prevention:**
- Show assignment status per setting: "BGM 音量 → Tab: 声音 ✓"
- Highlight unassigned settings prominently
- Consider a drag-to-tab or dropdown-per-setting approach instead of checkbox matrix
- Start simple (checkbox matrix), iterate based on user feedback

---

## Minor Pitfalls

### Pitfall 11: Config Size Growth in script.json

**What goes wrong:** Full structural config with decorations, per-tab icons, and footer buttons adds ~500 bytes to script.json per project. Not a real problem, but sloppy empty fields waste space.

**Prevention:** Editor should only write non-default values to config (sparse output). `null` fields should be omitted, not written as `null`. The engine merge pattern handles missing fields.

### Pitfall 12: Divider Color Not Visible on Dark Backgrounds

**What goes wrong:** Default divider color `rgba(255,255,255,0.1)` is invisible against some custom panel backgrounds.

**Prevention:** Make divider color configurable (already in schema: `itemStyle.dividerColor`). Provide sensible defaults per theme in builtinThemes.js.

### Pitfall 13: Value Label Width Inconsistency

**What goes wrong:** In 2-column mode, the value label (e.g., "80%", "3.0s") has different widths for different settings, causing sliders to have inconsistent widths between columns.

**Prevention:** Apply `min-width: 48px; text-align: right` to value labels for consistent alignment. Already partially handled by the existing `sc-setting-value` class.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Tab structure | P1 (disappearing settings), P2 (duplicate keys), P3 (empty tabs) | Unassigned fallback + dedup + empty array check |
| Content layout | P6 (odd items in 2-col), P8 (label-top + 2-col) | CSS Grid auto-rows, visual testing |
| Header/footer | P4 (no reset confirmation), P9 (decoration overflow) | Double-click confirm, overflow:hidden |
| Left tabs | P5 (positioning break) | Separate render path |
| Editor UI | P10 (checkbox matrix UX) | Start simple, iterate |
| Theme updates | P12 (divider visibility) | Per-theme divider colors |

---

## Compound Risks

- **P1 + P3:** Both involve invisible settings. Combined: if tabs[] is empty AND unassigned fallback doesn't trigger, ALL settings disappear. Fix both with the `tabs?.length > 0` check.
- **P4 + reset action:** If reset happens without confirmation AND the settings screen auto-closes after reset, user loses preferences with no way to verify what happened. Ensure settings screen stays open after reset so user can see the effect.
- **P5 + P8:** Left-tab + label-top + 2-column is the most complex visual combination. Test this specific combo explicitly.

## Sources

- Direct codebase analysis:
  - `src/ui/SettingsScreen.js` — rendering modes, tab construction, content rendering
  - `src/engine/settingDefs.js` — SETTING_DEFS keys, types, defaults
  - `src/engine/ConfigManager.js` — defaults, get/set, save methods
  - `src/ui/widgets/TabWidget.js` — tab button creation, shape application
  - `src/editor/components/layout/SettingsSection.vue` — current editor form fields
  - `src/editor/builtinThemes.js` — existing theme config shape for settings screen
