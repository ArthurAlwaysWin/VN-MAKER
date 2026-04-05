# Phase 21: Save/Load UI - Research

**Researched:** 2026-04-05
**Domain:** Full-screen save/load UI — vanilla JS DOM, CSS grid, pagination, inline confirmations
**Confidence:** HIGH

## Summary

Phase 21 is a complete rewrite of `src/ui/SaveLoadScreen.js` (currently 116 lines, 8 slots, 4-column grid) into a 108-slot paginated interface (3×3 grid × 12 pages). The rewrite also touches `src/style.css` (replace lines 426-580) and `src/main.js` (~12 callsites that need `source` parameter added to `show()` calls plus a new `onClose` callback). All upstream infrastructure is in place from Phase 19 (async SaveManager, IPC handlers, screenshots) and Phase 20 (QuickActionBar integration points).

The phase is entirely front-end DOM/CSS work within an established vanilla-JS UI class pattern. No new dependencies are needed. The SaveManager already supports 100 slots (`this.slotCount = 100`), but Phase 21 expands the UI to 108 slots — the extra 8 slots beyond 100 need the SaveManager `slotCount` bumped to 108. The existing `getAllSlots()` IPC returns only occupied slots as an array, so slot numbering 1–108 is purely a UI concern; empty slots are rendered by absence from the data.

**Primary recommendation:** Rewrite SaveLoadScreen.js in-place following the established `el/show()/hide()/_render()` pattern, update CSS in a single block replacement, then wire the new `onClose(source)` callback and `show(mode, source)` signature into all main.js callsites. The slotCount in SaveManager needs bumping from 100 to 108.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 3×3 grid = 每页 9 槽位，12 页共 108 槽位（原需求 5×2×10=100，调整为更宽敞的 3×3 布局）
- **D-02:** 横向卡片布局：缩略图在左，文字信息在右（保持现有 SaveLoadScreen 风格）
- **D-03:** 空槽位显示淡色虚线框 + "— 空 —" 文字居中（现有风格延续）
- **D-04:** 底部横排数字标签（1-12），当前页紫色高亮底色 rgba(180,160,255,0.9)
- **D-05:** 支持左右箭头键翻页（← 上一页 / → 下一页）
- **D-06:** 点击页码标签立即切换，无翻页动画
- **D-07:** 覆盖存档使用内联卡片变换：原内容淡出，显示"确定覆盖?" + 确认/取消按钮，不弹窗
- **D-08:** 删除存档使用同样的内联卡片变换确认方式
- **D-09:** 确认开关设置项（settingDefs 扩展）推迟到后续版本，本阶段默认始终弹确认
- **D-10:** show(mode, source) 接口，source = 'bar' | 'menu' | 'title'
- **D-11:** 关闭时根据 source 返回：bar → 继续游戏，menu → 重新打开 GameMenu，title → 返回标题页
- **D-12:** ESC 键关闭行为与"返回"按钮行为一致（均根据 source 路由）
- **D-13:** 无模式切换功能 — 入口决定模式（从"存档"按钮进入 = 存档模式，从"读档"按钮进入 = 读档模式）
- **D-14:** 标题栏左侧显示当前模式名称，存档 = 紫色文字，读档 = 蓝色文字
- **D-15:** 标题栏右侧"返回"按钮（保持现有布局）
- **D-16:** 已占用槽位显示：缩略图（320×180）+ 存档序号 + 对话文字预览（2行截断）+ 保存时间
- **D-17:** 删除按钮在卡片右上角，hover 时显示（保持现有交互模式）
- **D-18:** 存档模式下点击已占用槽位 → 触发覆盖确认流程；点击空槽位 → 直接存档
- **D-19:** 读档模式下点击已占用槽位 → 直接加载；点击空槽位 → 无反应（视觉上灰化不可点击）

### Agent's Discretion
- 卡片 hover 动画细节和过渡时间
- 确认按钮的具体颜色和尺寸
- 页码标签的间距和字号
- 翻页时内容切换的过渡效果（有无淡入淡出）
- 读档模式下空槽位的具体灰化样式

### Deferred Ideas (OUT OF SCOPE)
- **确认开关设置体系** — 在设置页中添加开关让玩家关闭覆盖存档、删除存档、加载存档、返回标题页等操作的确认提示。涉及 settingDefs 扩展和 ConfigManager。推迟到 UI 打磨版本。

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SLUI-01 | 全屏替换式存读档界面，3×3 网格×12 页 = 108 槽位，页码标签导航 | Grid layout from UI-SPEC, pagination component, SaveManager slotCount bump to 108 |
| SLUI-02 | 卡片显示缩略图截图、保存时间、对话文字预览；空槽位灰色 "— 空 —" | Existing card pattern + asset://saves/ thumbnail URL + UI-SPEC card layout |
| SLUI-03 | ~~存档/读档模式通过顶部标签切换~~ → **Overridden by D-13**: No mode switching, entry determines mode | show(mode, source) signature; D-14 mode-colored title |
| SLUI-04 | 覆盖已有存档时在槽位卡片内显示内联确认 | Inline .save-confirm-overlay pattern from UI-SPEC |
| SLUI-05 | 支持删除单个存档（带确认提示） | Same inline confirmation reused with red delete variant |
| SLUI-06 | ESC 键可关闭存读档界面，栈式覆盖层优先级 | Existing ESC chain in main.js:347-351 already has SaveLoad as highest priority |
| SLUI-07 | 关闭时根据来源上下文返回正确位置 | onClose(source) callback + main.js routing table |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack:** JavaScript ES Modules + vanilla JS for engine/UI + Electron — no TypeScript
- **UI classes:** PascalCase, one class per file, named exports only (`export class SaveLoadScreen`)
- **Methods:** `show()`/`hide()`/`_render()` pattern, underscore prefix for private methods
- **Callbacks:** `this.onXxx = null` callback properties (not events)
- **DOM:** Direct DOM manipulation, `hidden`/`visible` class toggle + `requestAnimationFrame`
- **CSS:** BEM-like naming, dark theme, Chinese UI text
- **Error handling:** `{ success, error? }` returns, `console.error('[ModuleName]')` prefix logging
- **Imports:** Explicit `.js` extensions, relative paths, ESM only
- **No new npm dependencies** (zero-dependency policy for v0.5)
- **Indentation:** 2 spaces, single quotes, semicolons always

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | ES2022+ | All UI logic | Project convention — runtime engine uses no frameworks |
| CSS Grid | — | 3×3 slot layout | Already used in current `.save-load-grid` |
| Electron IPC | v41 | SaveManager backend | Phase 19 infrastructure, already deployed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SaveManager | async IPC-based | `getAllSlots()`, `save()`, `load()`, `delete()` | All data operations from UI |
| asset:// protocol | Phase 19 | Thumbnail loading via `<img src="asset://saves/slot_NNN.jpg">` | Occupied slot thumbnails |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure CSS pagination | Virtual scroll | Overkill — only 9 items visible, 108 total. Pagination is simpler, per REQUIREMENTS out-of-scope note |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended File Structure (changes only)
```
src/
├── ui/
│   └── SaveLoadScreen.js   # REWRITE — 3×3×12 paginated grid
├── engine/
│   └── SaveManager.js       # MINOR EDIT — slotCount 100→108
├── main.js                  # MODIFY — show(mode,source) calls + onClose wiring
└── style.css                # REPLACE — lines 426-580 with new CSS from UI-SPEC
```

### Pattern 1: SaveLoadScreen Class Structure
**What:** Single vanilla JS class with el/show/hide/_render pattern
**When to use:** All overlay UI screens in this project
**Example:**
```javascript
// Source: existing pattern from GameMenu.js, BacklogScreen.js
export class SaveLoadScreen {
  constructor(container, saveManager) {
    this.container = container;
    this.saveManager = saveManager;
    this.el = document.createElement('div');
    this.el.id = 'save-load-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);

    this.mode = 'save';
    this._source = 'bar';
    this._currentPage = 1;

    // Callbacks
    this.onSave = null;
    this.onLoad = null;
    this.onDelete = null;
    this.onClose = null;  // NEW — source-routed close

    // Keyboard handler reference for cleanup
    this._keyHandler = null;
  }

  show(mode = 'save', source = 'bar') {
    this.mode = mode;
    this._source = source;
    this._currentPage = 1;
    this.el.dataset.mode = mode; // for CSS [data-mode="load"]
    this._render();
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
    this._attachKeyboard();
  }

  hide() {
    this._detachKeyboard();
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
    if (this.onClose) this.onClose(this._source);
  }
}
```

### Pattern 2: Inline Confirmation Overlay
**What:** Absolute-positioned overlay inside individual card elements
**When to use:** Overwrite and delete confirmations (D-07, D-08)
**Example:**
```javascript
// Source: UI-SPEC .save-confirm-overlay specification
_showConfirmation(slotEl, slotNum, type) {
  // Remove any existing confirmation first
  this._clearConfirmation();

  const overlay = document.createElement('div');
  overlay.className = 'save-confirm-overlay';
  const isDelete = type === 'delete';
  overlay.innerHTML = `
    <div class="save-confirm-text">${isDelete ? '确定删除?' : '确定覆盖?'}</div>
    <div class="save-confirm-actions">
      <button class="save-confirm-btn ${isDelete ? 'confirm-delete' : 'confirm'}">${isDelete ? '删除' : '覆盖'}</button>
      <button class="save-confirm-btn cancel">取消</button>
    </div>
  `;

  overlay.querySelector('.confirm, .confirm-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (isDelete) {
      if (this.onDelete) await this.onDelete(slotNum);
    } else {
      if (this.onSave) await this.onSave(slotNum);
    }
    this._renderGrid(); // re-render just the grid portion
  });

  overlay.querySelector('.cancel').addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.remove();
  });

  slotEl.appendChild(overlay);
  this._activeConfirmation = overlay;
}
```

### Pattern 3: Scoped Keyboard Listeners
**What:** Arrow key listeners attached on show(), detached on hide()
**When to use:** Pagination keyboard shortcuts that must not conflict with game controls
**Example:**
```javascript
// Source: UI-SPEC Keyboard Shortcuts section
_attachKeyboard() {
  this._keyHandler = (e) => {
    if (e.key === 'ArrowLeft' && this._currentPage > 1) {
      this._currentPage--;
      this._renderGrid();
      this._renderPagination();
    } else if (e.key === 'ArrowRight' && this._currentPage < 12) {
      this._currentPage++;
      this._renderGrid();
      this._renderPagination();
    }
  };
  document.addEventListener('keydown', this._keyHandler);
}

_detachKeyboard() {
  if (this._keyHandler) {
    document.removeEventListener('keydown', this._keyHandler);
    this._keyHandler = null;
  }
}
```

### Pattern 4: Partial Re-render (Grid Only)
**What:** Re-render only the grid section (not header/pagination) after save/delete operations
**When to use:** After save or delete completes — avoids flicker of entire screen
**Example:**
```javascript
async _renderGrid() {
  const grid = this.el.querySelector('.save-load-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const allSlots = await this.saveManager.getAllSlots();
  const slotMap = new Map();
  for (const s of allSlots) slotMap.set(s.slot, s);

  const startSlot = (this._currentPage - 1) * 9 + 1;
  const endSlot = this._currentPage * 9;

  for (let i = startSlot; i <= endSlot; i++) {
    const slot = slotMap.get(i) || null;
    grid.appendChild(this._createSlotCard(i, slot));
  }
}
```

### Pattern 5: Source-Routed Close (main.js wiring)
**What:** `onClose` callback determines navigation after screen hides
**When to use:** Every `saveLoadScreen.hide()` triggers source-based routing
**Example:**
```javascript
// Source: CONTEXT.md D-10, D-11
saveLoadScreen.onClose = (source) => {
  if (source === 'menu') {
    gameMenu.show();
  }
  // source === 'bar' → do nothing (return to gameplay)
  // source === 'title' → do nothing (title screen still underneath)
};
```

### Anti-Patterns to Avoid
- **Full innerHTML rebuild after every action:** Rebuilding the entire screen on save/delete causes visible flicker. Use partial `_renderGrid()` for data changes, full `_render()` only on `show()`.
- **Global keyboard listeners without cleanup:** Arrow key handlers MUST be detached on `hide()` or they'll conflict with game navigation. Use named function references, not inline arrow functions.
- **Synchronous slot iteration up to 108:** The `getAllSlots()` returns only occupied slots. Build a `Map<number, slot>` and check existence per position — don't iterate all 108 with individual load calls.
- **Calling `onClose` when navigating after load:** The `onLoad` callback in main.js already hides the title screen and restores state. Don't trigger `onClose` routing logic after a successful load — `hide()` will call `onClose` which tries to re-open GameMenu, but the game state has changed. Add a guard: skip `onClose` routing when load succeeds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slot data fetching | Individual IPC calls per slot | `SaveManager.getAllSlots()` (single IPC) | P15 pitfall from Phase 19 research — N+1 IPC calls cause visible lag |
| Screenshot capture | Manual canvas manipulation | `captureGameScreenshot()` in main.js | Already handles dialogue hiding, frame wait, IPC call |
| Toast notifications | Custom notification system | `showToast()` in main.js:66 | Already exists, consistent with Phase 19/20 style |
| Thumbnail URLs | Manual path construction | `asset://saves/slot_${padded}.jpg` | Protocol already handles path resolution and security |

## Common Pitfalls

### Pitfall 1: SlotCount Mismatch (100 vs 108)
**What goes wrong:** SaveManager has `slotCount = 100` but UI needs 108 slots. Slots 101-108 would silently fail to save.
**Why it happens:** Phase 19 set slotCount based on original REQUIREMENTS (100 slots). D-01 changed to 108.
**How to avoid:** Update `SaveManager.slotCount` from 100 to 108. Also check if `electron/main.js` IPC handlers have any 100 slot ceiling.
**Warning signs:** Save operations on page 12 (slots 100-108) fail silently.

### Pitfall 2: onClose Firing After Successful Load
**What goes wrong:** User loads a game → `hide()` fires `onClose('menu')` → GameMenu re-opens on top of the now-playing game.
**Why it happens:** `hide()` always calls `onClose(source)`, but after a successful load, the game state has changed and routing should not apply.
**How to avoid:** Either: (a) set a flag `this._loadSucceeded = true` before hide, check in onClose; or (b) in `onLoad` callback in main.js, temporarily null out onClose before hide; or (c) don't call `hide()` from inside SaveLoadScreen for load — let the main.js `onLoad` callback hide it with a different code path that skips onClose.
**Warning signs:** GameMenu appears briefly after loading a game from menu context.

### Pitfall 3: Keyboard Event Conflict with ESC Chain
**What goes wrong:** Arrow key handler captures ESC or interferes with the existing ESC priority chain in main.js.
**Why it happens:** Both the SaveLoadScreen's scoped keydown listener and main.js's global keydown listener fire on the same events.
**How to avoid:** The scoped listener should ONLY handle ArrowLeft/ArrowRight. ESC handling stays in main.js's existing priority chain (line 347-351). Don't duplicate ESC handling inside SaveLoadScreen.
**Warning signs:** ESC closes the screen but also toggles the dialogue box or triggers other handlers.

### Pitfall 4: Data-mode Attribute Not Set on Initial Render
**What goes wrong:** Load mode empty slots aren't disabled because `data-mode` attribute is missing.
**Why it happens:** CSS rule `#save-load-screen[data-mode="load"] .save-slot.empty` requires the data attribute.
**How to avoid:** Set `this.el.dataset.mode = mode` in `show()` BEFORE calling `_render()`.
**Warning signs:** Empty slots are clickable in load mode.

### Pitfall 5: Stale Screenshot After Page Navigation
**What goes wrong:** User captures screenshot, navigates to different page, saves — screenshot is still the old one cached in `cachedScreenshot`.
**Why it happens:** Screenshot is captured in main.js before `show()` is called, then cached. This is actually correct behavior (screenshot represents the game state at time of opening save screen), but devs might think it's a bug.
**How to avoid:** Document that `cachedScreenshot` is intentionally captured once before opening and reused for any slot save during that session. Already implemented correctly in main.js:272,305.
**Warning signs:** None — this is correct behavior per D-03 in Phase 19.

### Pitfall 6: Confirmation Overlay Click Propagation
**What goes wrong:** Clicking the confirm/cancel button also triggers the slot card click handler, causing double-action.
**Why it happens:** Event bubbles from confirm button → slot card → triggers save/load logic.
**How to avoid:** Use `e.stopPropagation()` on ALL buttons inside the confirmation overlay. Also add stopPropagation on the overlay itself.
**Warning signs:** Saving twice to the same slot, or loading triggers immediately after confirming overwrite.

## Code Examples

### Complete show() Signature and Integration Points in main.js

```javascript
// Source: CONTEXT.md D-10, D-11; main.js current callsites

// All callsites that need updating (currently only pass 'save'/'load'):

// Line 273: gameMenu.onSave
gameMenu.onSave = async () => {
  cachedScreenshot = await captureGameScreenshot();
  saveLoadScreen.show('save', 'menu');  // ADD source='menu'
};

// Line 275: gameMenu.onLoad
gameMenu.onLoad = () => saveLoadScreen.show('load', 'menu');  // ADD source='menu'

// Line 306: quickBar.onSave
quickBar.onSave = async () => {
  stopAuto();
  stopSkip();
  cachedScreenshot = await captureGameScreenshot();
  saveLoadScreen.show('save', 'bar');  // ADD source='bar'
};

// Line 311: quickBar.onLoad
quickBar.onLoad = () => {
  stopAuto();
  stopSkip();
  saveLoadScreen.show('load', 'bar');  // ADD source='bar'
};

// Line 546: titleScreen.onContinue
titleScreen.onContinue = () => {
  saveLoadScreen.show('load', 'title');  // ADD source='title'
};

// NEW: Close routing callback
saveLoadScreen.onClose = (source) => {
  if (source === 'menu') {
    gameMenu.show();
  }
  // 'bar' → no action (return to gameplay)
  // 'title' → no action (title screen is still visible underneath)
};
```

### Slot Number Calculation

```javascript
// Source: UI-SPEC Slot Numbering table
// Page N shows slots (N-1)*9+1 through N*9
const SLOTS_PER_PAGE = 9;
const TOTAL_PAGES = 12;

function getSlotRange(page) {
  const start = (page - 1) * SLOTS_PER_PAGE + 1;
  const end = page * SLOTS_PER_PAGE;
  return { start, end };
}
// Page 1: slots 1-9, Page 12: slots 100-108
```

### CSS Block Replacement

The complete CSS to replace `style.css:426-580` is provided verbatim in `21-UI-SPEC.md` lines 694-975. This should be copied exactly — it has been verified against all existing and new selectors. Key changes from current CSS:
- `.save-load-grid`: `repeat(4, 1fr)` → `repeat(3, 1fr)`, add `grid-template-rows: repeat(3, 1fr)`, remove `overflow-y: auto`
- `.save-load-title`: Remove static `color`, set via JS inline style per mode
- `.save-slot.empty`: Add `border-style: dashed`, change to `justify-content: center`
- NEW: `.save-load-pagination`, `.page-tab`, `.save-confirm-overlay`, `.save-confirm-btn` variants
- NEW: `#save-load-screen[data-mode="load"] .save-slot.empty` (disabled empty slots in load mode)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 8 slots, localStorage | 100 slots, file-system IPC | Phase 19 (complete) | SaveManager fully async, thumbnails via asset:// |
| 4-column grid, no pagination | 3×3 grid, 12 pages | This phase (Phase 21) | Complete UI rewrite |
| show(mode) — no source tracking | show(mode, source) — context-aware close | This phase (Phase 21) | onClose callback wired to source-based routing |
| window.confirm() for overwrite | Inline card confirmation overlay | This phase (Phase 21) | No browser-native dialogs, consistent with dark theme |

## Open Questions

1. **SaveManager slotCount validation in electron/main.js**
   - What we know: `SaveManager.slotCount = 100`. UI needs 108. SaveManager JS-side doesn't validate slot numbers against slotCount before IPC.
   - What's unclear: Whether electron IPC `save-slot` handler has a max-slot guard.
   - Recommendation: Bump `SaveManager.slotCount` to 108. Check electron/main.js for any slot ceiling validation. If there's a guard, update it too.

2. **Post-load hide() routing conflict**
   - What we know: `hide()` always calls `onClose(source)`. After a successful load from 'menu' source, onClose would re-open GameMenu.
   - What's unclear: Best clean approach without adding boolean flags.
   - Recommendation: In the `onLoad` callback (main.js:236), call `saveLoadScreen.hide()` manually, but set a guard. Simplest: add `hideWithoutRouting()` or a parameter to `hide(skipRoute = false)`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework in project |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SLUI-01 | 3×3 grid, 12 pages, 108 slots | manual | Visual inspection in Electron preview | ❌ N/A |
| SLUI-02 | Card content: thumbnail, time, preview text | manual | Visual inspection | ❌ N/A |
| SLUI-03 | Mode determined by entry (D-13 override) | manual | Open from save vs load entry points | ❌ N/A |
| SLUI-04 | Inline overwrite confirmation | manual | Click occupied slot in save mode | ❌ N/A |
| SLUI-05 | Delete with confirmation | manual | Click ✕ button on occupied slot | ❌ N/A |
| SLUI-06 | ESC closes screen | manual | Press ESC while screen is open | ❌ N/A |
| SLUI-07 | Source-routed close | manual | Open from menu→close→verify GameMenu reopens; open from bar→close→verify return to game | ❌ N/A |

### Sampling Rate
- **Per task commit:** Manual visual verification in Electron dev mode (`npm run dev`)
- **Per wave merge:** Full manual walkthrough: save from bar, save from menu, load from title, delete, paginate, ESC close
- **Phase gate:** Complete manual test matrix before `/gsd-verify-work`

### Wave 0 Gaps
- No test infrastructure exists in the project (confirmed by STACK.md scan)
- All validation is manual via running the Electron app

## Sources

### Primary (HIGH confidence)
- `src/ui/SaveLoadScreen.js` — Current 116-line implementation, directly inspected
- `src/main.js` — All 12 saveLoadScreen references traced (lines 18, 227, 236, 251, 273, 275, 306, 311, 350, 425, 441, 546)
- `src/engine/SaveManager.js` — Async API verified: getAllSlots/save/load/delete, slotCount=100
- `src/style.css:426-580` — Current CSS selectors, all 30 rules mapped
- `.planning/phases/21-save-load-ui/21-UI-SPEC.md` — Complete visual specification with exact CSS
- `.planning/phases/21-save-load-ui/21-CONTEXT.md` — 19 locked decisions (D-01 through D-19)
- `src/ui/GameMenu.js`, `src/ui/BacklogScreen.js` — Pattern reference for overlay UI classes

### Secondary (MEDIUM confidence)
- `.planning/phases/19-save-system-upgrade/19-CONTEXT.md` — Phase 19 backend decisions
- `.planning/phases/20-quick-action-bar/20-CONTEXT.md` — Phase 20 QuickActionBar integration
- `electron/main.js` — IPC handler structure (only header inspected, slot ceiling not fully verified)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all existing vanilla JS/CSS
- Architecture: HIGH — established pattern (GameMenu, BacklogScreen), detailed UI-SPEC with exact CSS
- Pitfalls: HIGH — all identified from direct code inspection (slotCount mismatch, onClose routing, event propagation)

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable — vanilla JS, no dependency churn risk)
