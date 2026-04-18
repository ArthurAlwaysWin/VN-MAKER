# Phase 55: Left-Tab Mode + Decorations (Engine) - Research

**Researched:** 2026-04-18
**Domain:** DOM layout rendering, CSS flexbox, settings engine, decorative image placement
**Confidence:** HIGH

## Summary

Phase 55 extends the existing `_renderStructured()` method in `SettingsScreen.js` with four new features: left-sidebar tab navigation (`tabBar.position='left'`), header decoration images, a footer `reset` action, and a panel background image layer. All changes are engine-side DOM manipulation using established patterns (inline styles, `document.createElement`, `clampField`/`sanitizeCssValue`/`resolvePath`).

The implementation is well-scoped: the existing `_renderStructured()` method (lines 433-621) already has clear sections for header, tab bar, content area, and footer. The left-tab mode requires restructuring the DOM layout from vertical stack to a flex-row wrapper. Decorations are straightforward absolute-positioned `<img>` elements. The reset button extends the footer handler with one new `action` case. The panel background is a z-indexed div behind content.

**Primary recommendation:** Implement as a single plan with TDD. Tests first (following `contentLayout.test.js` pattern with vitest + jsdom), then implementation. Group by feature: (1) left-tab sidebar layout, (2) header decorations, (3) footer reset + ConfigManager.reset(), (4) panel background.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `tabBar.position` accepts `'top'` (default, current behavior) or `'left'`. When `'left'`, the settings-structured layout switches from vertical stack (header → tabBar → content) to a flex row with sidebar
- **D-02:** Layout structure when `position='left'`: outer flex container `flex-direction: row`. Left sidebar contains the tab buttons stacked vertically. Right side contains header + content area + footer in a column
- **D-03:** Sidebar width: fixed `180px` by default, configurable via `tabBar.width` (clamped via `clampField('width', ...)`)
- **D-04:** Tab buttons in left mode: stacked vertically with `flex-direction: column`, full-width, left-aligned text + optional icon. Active tab highlighted same as top mode
- **D-05:** Icon + label in left mode: icon (24×24) left of text, same as top mode but full-width button
- **D-06:** When `position='top'` (default or omitted): existing horizontal tab bar renders identically to Phase 53/54 (backward compat)
- **D-07:** The header element stays at the top of the right column (not inside the sidebar). The sidebar spans full height beside the entire right column
- **D-08:** `header.decorations[]` is an array of decoration objects: `{ src: string, x: number, y: number, width: number, height: number }`
- **D-09:** Each decoration renders as an absolute-positioned `<img>` element within the header div (header already has `position: relative`)
- **D-10:** Decoration positions/sizes clamped via `clampField()` — same as all other position fields
- **D-11:** Image paths resolved via `resolvePath()` (same as all asset paths)
- **D-12:** Decorations render ON TOP of the header background image (higher z-index) but BEHIND the title text and close button
- **D-13:** When `decorations` is omitted or empty: no decoration elements rendered (backward compat)
- **D-14:** Footer buttons already support `close` (hide settings) and `title` (return to title page) actions. Add `'reset'` action
- **D-15:** Reset action: copy `ConfigManager.defaults` into `ConfigManager.config`, call `save()`, then re-render current tab content to reflect reset values. Add a `reset()` method to ConfigManager for this
- **D-16:** Button click handler pattern: extend existing if/else chain in footer button handler to detect `action === 'reset'`
- **D-17:** After reset, settings UI immediately shows default values (re-render structured content). Also fire `_notifyChange()` so any audio volumes etc. take effect
- **D-18:** The action field is read from `btnCfg.action` (currently the code uses `btnCfg.id.includes('title')` — normalize to use `action` field consistently)
- **D-19:** `settingsScreen.background` is a separate property from `layout.background` (which is the full-screen backdrop behind the settings panel). Panel background sits INSIDE the settings panel, behind the content area
- **D-20:** Implementation: create a `div.settings-panel-bg` with absolute positioning, `z-index: 0`, full panel dimensions. Content elements get `z-index: 1` (via `position: relative`)
- **D-21:** Background image rendered via `background-image: url(...)`, `background-size: cover`, `background-position: center`
- **D-22:** Opacity controlled via `settingsScreen.backgroundOpacity` (0-1, default 1). Applied as CSS `opacity` on the background layer div
- **D-23:** When `settingsScreen.background` is omitted: no panel background div created (backward compat)

### Agent's Discretion
- CSS details for sidebar button hover/active states
- Exact z-index values for decoration layering
- Test structure and helper utilities
- Whether to refactor the footer button handler into a cleaner switch/map pattern

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRUCT-06 | 左侧 Tab 模式 — tabBar.position='left' 时渲染为垂直侧边栏导航（Senrenbanka 风格） | D-01 through D-07: flex-row layout with sidebar left, header+content+footer right |
| DECOR-01 | 页头装饰图 — header.decorations[] 数组支持放置装饰图片（src/x/y/width/height） | D-08 through D-13: absolute-positioned `<img>` within header div |
| DECOR-02 | 页脚按钮扩展 — footer.buttons[] 新增 'reset' action（恢复默认设置） | D-14 through D-18: extend footer handler, ConfigManager.reset() |
| DECOR-03 | 设置页面板背景 — settingsScreen.background 独立于 widgetStyles.panel 的背景图 | D-19 through D-23: absolute div with z-index layering |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.4 | Unit testing framework | Already installed, used by all Phase 53-54 tests |
| jsdom | 29.0.2 | DOM environment for tests | Already installed, `@vitest-environment jsdom` directive used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none — vanilla JS) | — | All DOM rendering | Engine never uses frameworks |

**No new dependencies needed.** Phase 55 uses existing project infrastructure exclusively.

## Architecture Patterns

### DOM Structure: Left-Tab Mode

When `tabBar.position === 'left'`:

```
.settings-structured (el)
├── div.settings-structured-outer (flex-direction: row)
│   ├── div.settings-structured-sidebar (width: 180px, flex-direction: column)
│   │   └── [tab buttons stacked vertically]
│   └── div.settings-structured-right (flex: 1, flex-direction: column)
│       ├── div.settings-structured-header (position: relative)
│       │   ├── [background image via CSS]
│       │   ├── img.settings-decoration × N (absolute, z-index: 1)
│       │   ├── div.settings-structured-title (absolute, z-index: 2)
│       │   └── button.settings-structured-close (absolute, z-index: 2)
│       ├── div.settings-structured-content (scrollable)
│       └── div.settings-structured-footer
└── div.settings-panel-bg (absolute, z-index: 0, covers el)
```

When `tabBar.position === 'top'` (default):
```
.settings-structured (el) — UNCHANGED from Phase 54
├── div.settings-panel-bg (absolute, z-index: 0) — NEW if background set
├── div.settings-structured-header (position: relative)
│   ├── img.settings-decoration × N — NEW
│   ├── div.settings-structured-title
│   └── button.settings-structured-close
├── div.settings-structured-tab-bar (horizontal)
├── div.settings-structured-content (position: relative, z-index: 1)
└── div.settings-structured-footer
```

### Pattern 1: Layout Branching in `_renderStructured()`

**What:** Early branch on `tabBar.position` to choose between current vertical layout and new flex-row wrapper layout.
**When to use:** At the start of `_renderStructured()` after clearing `el.innerHTML`.
**Example:**
```javascript
// Source: Decision D-01, D-02
const tabPosition = (layout.tabBar?.position === 'left') ? 'left' : 'top';

if (tabPosition === 'left') {
  this._renderStructuredLeft(layout);
} else {
  // existing code path (top mode) — extract to _renderStructuredTop(layout) or keep inline
}
```

### Pattern 2: Header Decorations Rendering

**What:** After header background but before title/close button, iterate `header.decorations[]` and create absolute `<img>` elements.
**When to use:** Inside header assembly block.
**Example:**
```javascript
// Source: Decisions D-08 through D-12
if (Array.isArray(hdr.decorations)) {
  for (const deco of hdr.decorations) {
    if (!deco.src) continue;
    const safeSrc = sanitizeCssValue(deco.src);
    if (!safeSrc) continue;
    const img = document.createElement('img');
    img.className = 'settings-decoration';
    img.src = resolvePath(safeSrc);
    img.style.position = 'absolute';
    img.style.zIndex = '1';
    const dx = clampField('x', deco.x);
    const dy = clampField('y', deco.y);
    const dw = clampField('width', deco.width);
    const dh = clampField('height', deco.height);
    if (dx !== undefined) img.style.left = dx + 'px';
    if (dy !== undefined) img.style.top = dy + 'px';
    if (dw !== undefined) img.style.width = dw + 'px';
    if (dh !== undefined) img.style.height = dh + 'px';
    img.style.pointerEvents = 'none';
    header.appendChild(img);
  }
}
```

### Pattern 3: Footer Button Action Dispatch

**What:** Replace `btnCfg.id.includes('title')` with `btnCfg.action`-based dispatch.
**When to use:** In the footer button click handler (lines 609-615).
**Example:**
```javascript
// Source: Decisions D-14 through D-18
btn.addEventListener('click', () => {
  const action = btnCfg.action || '';
  if (action === 'title' && this.onTitle) {
    this.onTitle();
  } else if (action === 'reset') {
    this.configManager.reset();
    this._notifyChange();
    this._renderStructuredContent(layout);
  } else if (action === 'close') {
    this.hide();
  } else if (btnCfg.id && btnCfg.id.includes('title') && this.onTitle) {
    // Legacy fallback for backward compat
    this.onTitle();
  } else {
    this.hide();
  }
});
```

### Pattern 4: ConfigManager.reset() Method

**What:** Simple method that resets config to defaults and persists.
**Example:**
```javascript
// Source: Decision D-15
reset() {
  this.config = { ...this.defaults };
  this.save();
}
```

### Pattern 5: Panel Background Layer

**What:** Absolute-positioned div behind all content with background image.
**Example:**
```javascript
// Source: Decisions D-19 through D-23
if (layout.settingsScreen?.background) {
  const safeBg = sanitizeCssValue(layout.settingsScreen.background);
  if (safeBg) {
    const bgDiv = document.createElement('div');
    bgDiv.className = 'settings-panel-bg';
    bgDiv.style.position = 'absolute';
    bgDiv.style.inset = '0';
    bgDiv.style.zIndex = '0';
    bgDiv.style.backgroundImage = `url("${resolvePath(safeBg)}")`;
    bgDiv.style.backgroundSize = 'cover';
    bgDiv.style.backgroundPosition = 'center';
    bgDiv.style.pointerEvents = 'none';
    const opacity = clampField('scale', layout.settingsScreen.backgroundOpacity) ?? 1;
    bgDiv.style.opacity = String(opacity);
    this.el.appendChild(bgDiv);
  }
}
```

### Anti-Patterns to Avoid
- **Modifying `createTabBar()` API for left mode:** The `createTabBar()` in TabWidget.js is already complex (5 shapes). Don't add orientation logic there. Instead, render sidebar tabs directly in `_renderStructured()` using the same pattern as the existing fallback buttons (lines 526-563), just with vertical layout.
- **Deep nesting of conditionals:** Don't nest position='left' checks inside every sub-section. Branch once at the top of `_renderStructured()`.
- **Forgetting `position: relative` on content elements:** Panel background needs z-index to work — content siblings must establish stacking context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path resolution | Custom path joining | `resolvePath()` from assetPath.js | Handles asset://, /game/, relative paths across all environments |
| CSS value sanitization | Inline regex checks | `sanitizeCssValue()` from sanitize.js | Prevents CSS injection consistently |
| Numeric clamping | Manual Math.min/max | `clampField()` from sanitize.js | Uses predefined bounds for x/y/width/height/scale |
| Widget-style tab rendering | New tab widget for left mode | Reuse same button pattern from existing fallback code | Consistency with `createTabBar()` already handling widgetStyles |

**Key insight:** All building blocks exist. This phase is pure composition — no new utilities needed, just new arrangement of existing primitives.

## Common Pitfalls

### Pitfall 1: Breaking Backward Compatibility (Top Mode)
**What goes wrong:** Refactoring `_renderStructured()` for left mode accidentally breaks existing top-mode rendering.
**Why it happens:** The method is 190 lines long; wrapping it in a conditional can introduce subtle DOM structure changes.
**How to avoid:** Keep existing top-mode path as-is. Extract left-mode as a parallel code path. Run existing `settingsStructured.test.js` and `contentLayout.test.js` after changes.
**Warning signs:** Existing tests fail after adding left-mode code.

### Pitfall 2: Footer Button Handler Backward Compat
**What goes wrong:** Changing from `btnCfg.id.includes('title')` to `btnCfg.action` breaks existing layouts that only have `id` field.
**Why it happens:** Existing layouts in the wild may use `{ id: 'back-to-title', text: '...' }` without an `action` field.
**How to avoid:** Check `action` first, then fall back to legacy `id.includes('title')` check. The test `settingsStructured.test.js` line 585 uses `id: 'back-to-title'` — must still pass.
**Warning signs:** Test "footer button with title id calls onTitle callback" fails.

### Pitfall 3: Panel Background Z-Index Stacking
**What goes wrong:** Panel background div covers content, making settings unclickable.
**Why it happens:** Absolute-positioned background with z-index competes with content.
**How to avoid:** Set `pointer-events: none` on background div. Ensure content elements have `position: relative; z-index: 1` to sit above.
**Warning signs:** Click events on settings controls stop working.

### Pitfall 4: Content Area Positioning in Left Mode
**What goes wrong:** Content area uses `position: absolute` with hard-coded `left`/`top` (lines 572-581) which doesn't work inside a flex container.
**Why it happens:** Current content area is absolute-positioned relative to `el`. In left mode, it should be in flow within the right column.
**How to avoid:** In left mode, don't use absolute positioning on content area — use flex layout within the right column. The content area dimensions (width/height) can still be applied, but positioning should be flow-based.
**Warning signs:** Content area overlaps sidebar or appears outside visible area.

### Pitfall 5: `_renderStructuredContent()` Selector Assumption
**What goes wrong:** `_renderStructuredContent()` uses `this.el.querySelector('.settings-structured-content')` to find the container — this works regardless of DOM nesting as long as the class exists.
**Why it happens:** querySelector searches all descendants, so even when content is nested deeper (inside flex right column), it still finds it.
**How to avoid:** This is actually safe. Just ensure the content div keeps its `.settings-structured-content` class in both modes.
**Warning signs:** (None — this is naturally safe)

### Pitfall 6: settingsScreen vs layout namespace confusion
**What goes wrong:** `layout.settingsScreen.background` vs `layout.background` — accessing wrong property.
**Why it happens:** The schema has TWO backgrounds: `layout.background` (full-screen backdrop, used in custom mode) and `settingsScreen.background` (panel-internal decoration). Per D-19, they're different.
**How to avoid:** In `_renderStructured()`, read from `layout.settingsScreen?.background` or accept it as a peer property. Check how the layout object is structured when passed to this method.
**Warning signs:** Panel background renders as full-screen overlay instead of panel-internal layer.

## Code Examples

### ConfigManager.reset() Implementation
```javascript
// File: src/engine/ConfigManager.js
// Add after save() method:
reset() {
  this.config = { ...this.defaults };
  this.save();
}
```

### Left-Mode Sidebar Tab Rendering
```javascript
// Inside _renderStructured() left-mode branch:
const sidebar = document.createElement('div');
sidebar.className = 'settings-structured-sidebar';
const sideW = clampField('width', tabCfg.width) || 180;
sidebar.style.width = sideW + 'px';
sidebar.style.flexShrink = '0';
sidebar.style.display = 'flex';
sidebar.style.flexDirection = 'column';
sidebar.style.gap = '4px';
sidebar.style.padding = '12px 8px';

for (let i = 0; i < resolvedTabs.length; i++) {
  const tab = resolvedTabs[i];
  const btn = document.createElement('button');
  btn.className = `settings-tab-btn${i === this._activeTab ? ' active' : ''}`;
  btn.style.width = '100%';
  btn.style.textAlign = 'left';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.gap = '8px';
  btn.style.padding = '10px 12px';
  btn.style.background = i === this._activeTab ? 'rgba(255,255,255,0.12)' : 'none';
  btn.style.border = 'none';
  btn.style.color = i === this._activeTab ? '#fff' : 'rgba(255,255,255,0.5)';
  btn.style.cursor = 'pointer';
  btn.style.fontSize = '15px';
  btn.style.borderRadius = '4px';

  if (tab.icon) {
    const img = document.createElement('img');
    img.src = resolvePath(tab.icon);
    img.width = 24;
    img.height = 24;
    img.style.objectFit = 'contain';
    img.alt = '';
    btn.appendChild(img);
  }
  const span = document.createElement('span');
  span.textContent = tab.label;
  btn.appendChild(span);

  btn.addEventListener('click', () => {
    this._activeTab = i;
    this._renderStructured(layout); // Full re-render to update active state
  });
  sidebar.appendChild(btn);
}
```

### Test Pattern for Left-Tab Mode
```javascript
// Following contentLayout.test.js pattern:
describe('left-tab mode — STRUCT-06', () => {
  it('position=left renders sidebar + right column layout', () => {
    const layout = structuredLayoutWithPosition('left');
    screen.setLayout(layout);
    screen.show();
    const sidebar = screen.el.querySelector('.settings-structured-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar.style.width).toBe('180px');
    expect(sidebar.style.flexDirection).toBe('column');
  });

  it('position=top (default) renders unchanged horizontal layout', () => {
    screen.setLayout(structuredLayout()); // no position set
    screen.show();
    const sidebar = screen.el.querySelector('.settings-structured-sidebar');
    expect(sidebar).toBeNull();
    const tabBar = screen.el.querySelector('.settings-structured-tab-bar');
    expect(tabBar).not.toBeNull();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded 3-tab horizontal layout | Configurable tabs via `tabBar.tabs[]` objects | Phase 53 | Tab structure is already flexible |
| `btnCfg.id.includes('title')` dispatch | `btnCfg.action` field-based dispatch | Phase 55 (this phase) | Cleaner extensibility for new actions |
| No panel background support | `settingsScreen.background` + opacity | Phase 55 (this phase) | Decorative watermarks possible |

## Open Questions

1. **Where does `settingsScreen.background` live in the layout object passed to `_renderStructured()`?**
   - What we know: `_renderStructured(layout)` receives `this.customLayout`. The existing `customLayout.background` is used in `_renderCustom()` for the full-screen backdrop. Per D-19, panel background is a DIFFERENT property.
   - What's unclear: Is it `layout.settingsScreen.background` (new sub-object) or should it be read from a parent scope?
   - Recommendation: Use `layout.settingsScreen?.background` as the path. The `customLayout` object is the full `ui.settingsScreen` from script.json, so adding a `settingsScreen` sub-key would be redundant. **Better: use `layout.panelBackground`** as a top-level key on the layout object OR follow the convention from D-19 literally and check `this.customLayout?.background` for panel bg in structured mode (since `_renderCustom` handles elements mode, `_renderStructured` can use the same `background` field for panel bg). This needs confirmation during implementation — check existing usage of `layout.background` in structured mode path.

2. **Should `_renderStructured()` be split or branched?**
   - What we know: The method is 190 lines. Adding left-mode doubles its complexity.
   - Recommendation: Extract a helper `_buildHeader(layout)` that handles decorations, and branch the main body with `if (position === 'left') { ... } else { ... }`. The header decoration logic and footer logic are shared between both modes.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | None (uses defaults + `@vitest-environment jsdom` pragma) |
| Quick run command | `npx vitest run tests/leftTabDecorations.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRUCT-06 | `position='left'` renders vertical sidebar with content beside it | unit | `npx vitest run tests/leftTabDecorations.test.js -t "left-tab"` | ❌ Wave 0 |
| STRUCT-06 | `position='top'` (or omitted) renders identically to Phase 54 | unit | `npx vitest run tests/leftTabDecorations.test.js -t "backward compat"` | ❌ Wave 0 |
| DECOR-01 | `header.decorations[]` renders positioned `<img>` elements | unit | `npx vitest run tests/leftTabDecorations.test.js -t "decoration"` | ❌ Wave 0 |
| DECOR-02 | Footer button `action='reset'` resets ConfigManager + re-renders | unit | `npx vitest run tests/leftTabDecorations.test.js -t "reset"` | ❌ Wave 0 |
| DECOR-03 | `settingsScreen.background` renders panel background div | unit | `npx vitest run tests/leftTabDecorations.test.js -t "panel background"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/leftTabDecorations.test.js`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/leftTabDecorations.test.js` — All Phase 55 tests (STRUCT-06, DECOR-01, DECOR-02, DECOR-03)
- [ ] ConfigManager.reset() test coverage (can be in same file or separate)
- [ ] Framework install: Already installed (vitest 4.1.4 + jsdom 29.0.2)

## Sources

### Primary (HIGH confidence)
- `src/ui/SettingsScreen.js` — Full source read, lines 1-878. Complete understanding of `_renderStructured()`, footer handler, content rendering
- `src/engine/ConfigManager.js` — Full source read, 49 lines. Simple class, trivial to add `reset()`
- `src/ui/widgets/TabWidget.js` — Full source read, 292 lines. `createTabBar()` API documented
- `src/engine/settingDefs.js` — Full source read, 249 lines. Schema docs need updating
- `src/ui/sanitize.js` — Full source read, 51 lines. `clampField()` bounds verified
- `src/engine/assetPath.js` — Full source read, `resolvePath()` API verified
- `tests/contentLayout.test.js` — Full source read, test pattern reference
- `tests/settingsStructured.test.js` — Partial read (450 lines), mock patterns verified
- `.planning/phases/55-left-tab-mode-decorations/55-CONTEXT.md` — All 23 decisions documented

### Secondary (MEDIUM confidence)
- Phase 53 CONTEXT.md — Tab data format and rendering decisions (confirmed in code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all tools already in use
- Architecture: HIGH — codebase fully read, patterns clear, DOM manipulation approach established
- Pitfalls: HIGH — based on actual code analysis (absolute positioning issues, z-index, backward compat)
- Implementation: HIGH — all decisions locked, existing patterns directly applicable

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stable — no external dependencies, internal project)
