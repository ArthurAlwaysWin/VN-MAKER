# Phase 73: button-family-image-rollout - Research

**Researched:** 2026-04-23
**Domain:** Shared `ui.theme` button-family image contract, runtime selector registry, and runtime-backed preview wiring
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### 按钮图片所有权与 schema
- **D-01:** Phase 73 的按钮族图片状态统一继续挂在 **`ui.theme` 的共享 button-family contract** 下，而不是散落到 `ui.gameMenu`、`ui.saveLoadScreen`、`ui.settingsScreen` 等每屏配置里。
- **D-02:** 覆盖矩阵在本 phase 冻结为 roadmap 已定义的 5 族：`game-menu-button`、`QAB`、`close-button family`、`page-tab / pager`、`settings-tab`；其余按钮不顺手扩 scope。

### 状态模型与 family mapping
- **D-03:** `game-menu-button`、`QAB`、`close-button family` 只要求 `normal / hover / pressed` 三态图片；QAB 现有 `.active` / `.disabled` 行为继续保留现有 CSS 语义，不在本 phase 升级成额外必填图片槽位。
- **D-04:** `page-tab / pager` 与 `settings-tab` 提供 `normal / hover / pressed / selected` 四态图片，其中 `selected` 必须直接复用现有 `.active` 选中语义，不引入新的选中状态机。
- **D-05:** `close-button family` 按“返回/关闭当前 screen”的 shared role 组织，至少覆盖现有 `.save-load-close`、`.backlog-close`、`.settings-close` 以及同职能的 structured settings close surface；`game-menu` 里的 `data-action="close"` 仍属于 `game-menu-button` 家族，而不是 close family。

### Runtime 接线方式
- **D-06:** Runtime 应沿用 Phase 71 的 shared UI image contract 与 `ThemeManager` 风格的 selector registry / CSS 注入方式扩面，避免在 `GameMenu.js`、`QuickActionBar.js`、`SaveLoadScreen.js`、`BacklogScreen.js`、`SettingsScreen.js` 中各自拼接一套 inline 背景逻辑。
- **D-07:** 选择器映射必须同时覆盖 default DOM 与现有 config-driven DOM 路径，让默认界面与已自定义布局的界面都能自动吃到同一套按钮族皮肤，而不是只覆盖某一条渲染分支。

### 可读性与交互保护
- **D-08:** 按钮图片必须作为视觉底层/背景层存在，文本、SVG 图标、对齐、padding 与 hit target 继续沿用现有按钮 DOM 作为事实来源；图片皮肤不能把文案或图标“画死”进素材里来替代现有内容层。
- **D-09:** 缺图、legacy 值失效、或只配置部分状态时，运行时继续回退到现有 CSS 按钮外观与现有 modifier class 行为；Phase 73 自己 touch 到的按钮表面不能因为图片缺失而失去点击能力或出现错位。

### 编辑器入口与真预览
- **D-10:** 按钮族图片配置入口应放在现有 **全局 / theme-oriented editor surface** 上集中管理，而不是在每个 screen section 中各自增加一套重复的三态字段表单。
- **D-11:** 完成标准继续以现有 runtime-backed 预览为准：`game-menu-button` 用 game menu screen 预览，`page-tab / pager` 用 save/load 预览，`settings-tab` 与 close family 用 settings/backlog/save-load 真实 screen 预览，`QAB` 用 dialogue/runtime surface；不新增 editor-only 本地按钮预览。

### the agent's Discretion
- `ui.theme` 下按钮族字段的具体命名（例如 `buttonFamilies.gameMenu` vs `buttons.gameMenuButton`）
- selector registry 的最终数据结构（静态映射、helper factory 或 contract-exported table）
- `close-button family` 是否通过别名表映射到多组 selector，还是通过单独 family key + multi-selector 输出
- editor 配置 UI 的具体排版方式，只要保持“集中配置、真实预览”原则即可

### Deferred Ideas (OUT OF SCOPE)
- 为 `QAB` 的 `.active` / `.disabled` 再新增专门图片槽位 —— 可在后续 polish 或 Phase 75 统一 parity / fallback 时再评估
- 把更多 screen 内部按钮、slot card CTA、或任意 editor 按钮一起纳入按钮族 rollout —— 超出本 phase 冻结矩阵
- 单独的按钮预览沙盒、hover/pressed 调试器、或 editor-only 假按钮舞台 —— 明确不纳入本 phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BTN-01 | 用户可以为 3 个非选中态按钮族配置 `normal / hover / pressed` 图片态：`game-menu-button`、`QAB`、`close-button family` | 推荐 `ui.theme.buttonFamilies` 共享 contract + ThemeManager selector registry，覆盖 `.game-menu-button` / `.qab-btn` / close-role selectors |
| BTN-02 | 用户可以为 2 个需要选中态的按钮族配置 `normal / hover / pressed / selected` 图片态：`page-tab / pager`、`settings-tab` | 推荐 4-state family schema，`selected` 映射到 `.active`；并明确修补 `gm-tab` 路径的 active-class 缺口 |
| BTN-03 | 用户应用按钮图片皮肤后，这 5 个按钮族上的文字或图标仍保持可读、对齐稳定且可点击 | 推荐只做 underlay/background CSS injection，不替换 DOM 内容；保持 SVG/text/hit target 继续由现有 button DOM 承担 |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- 保持现有 **JavaScript ES Modules + Vue 3 + Electron + DOM/CSS runtime**，不要迁移到 TypeScript。
- 本 milestone 继续使用现有栈与现有 preview/runtime 结构，不建议引入新依赖或重写渲染栈。
- JS 模块保持 **named exports**；导入继续使用显式 `.js` 扩展名。
- 编辑器 UI 保持现有暗色、纯 CSS、中文界面约定。
- 继续走 GSD phase workflow，不在 planner 建议里引入绕开既有流程的做法。

## Summary

这个 phase 不需要外部技术选型研究，核心问题完全在 repo 内：把 Phase 71/72 已建立的 shared contract、ThemeManager CSS 注入、以及 runtime-backed iframe preview 继续扩到 5 个按钮族。现有代码已经给出正确方向：`src/shared/uiImageContract.js` 是 schema/scan owner，`src/engine/ThemeManager.js` 是集中 selector registry + style tag 注入 owner，`src/main.js` 已经有 `update-theme` / `show-screen` / `show-dialogue-preview` 预览协议，5 个目标 family 的 DOM 也都已存在。

最佳做法是新增一个 **轻量的 shared button-family contract**，放在 `ui.theme` 下，与现有 `tokens` / `nineSlice` 并列；运行时则继续在 ThemeManager 内集中生成状态 CSS，而不是在 `GameMenu.js`、`QuickActionBar.js`、`SaveLoadScreen.js`、`BacklogScreen.js`、`SettingsScreen.js` 里散落 inline background 逻辑。这样才能同时覆盖默认 DOM、config-driven DOM、settings fallback tabs、widget-style tabs，以及 close family 的多 surface 映射。

最大风险不在“怎么加图片”，而在“哪些 surface 真正共用同一语义”：QAB 的 `.active/.disabled` 不是新图片槽位；`page-tab`/`page-dot` 已有 `.active`，但 widget-style `gm-tab` 目前没有 `.active` class；settings footer button class 又过于泛化，不能整类当 close family。planner 必须把这些 selector/semantics 缺口单独拆任务。

**Primary recommendation:** 在 `ui.theme.buttonFamilies` 新增 5 个 family 的 state contract，并在 `ThemeManager.js` 增加专用 button-family selector registry + CSS underlay 注入；只在 UI renderers 里补最少量 role/class 钩子以消除 selector 歧义。

## Standard Stack

### Core
| Library / Module | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing vanilla JS runtime (`src/ui/*`, `src/main.js`) | repo-local | Buttons still render as DOM/CSS widgets | All target families already live here; no new rendering layer needed |
| `src/engine/ThemeManager.js` | repo-local | Central style-tag injection and selector registry precedent | Already owns `ui.theme` application and stateful CSS generation |
| `src/shared/uiImageContract.js` | repo-local | Canonical UI image schema root + scan/export registry | Existing shared contract owner from Phase 71 |
| Vue 3 editor + `useThemeEditor.js` | `^3.5.31` | Global theme editing + runtime iframe preview | Button-family config is frozen to global `ui.theme`, so theme owner is the right editor owner |

### Supporting
| Library / Module | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/editor/utils/uiImageField.js` | repo-local | Canonical pick/clear flow for `ui/...` asset values | All button state image fields |
| `src/editor/views/ProjectSettings.vue` | repo-local | Global/theme-oriented surface with iframe preview | Preferred config surface for this phase |
| `src/editor/composables/useScreenLayoutEditor.js` / `useSettingsPageEditor.js` | repo-local | Existing screen preview owners | Reuse for runtime-backed preview targets, not for ownership of the new contract |
| Vitest 4.1.4 + Node test runner | 4.1.4 / Node v24.13.1 | Focused regression verification | Planner should insist on focused gates, not repo-wide historical debt |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ui.theme.buttonFamilies` | per-screen image fields | Violates frozen ownership and guarantees per-screen drift |
| ThemeManager CSS injection | per-component inline style logic | Breaks shared fallback behavior and duplicates state mapping |
| Global theme editor surface | per-screen repeated forms | Conflicts with D-10 and makes shared family rollout harder to keep consistent |

**Installation:**
```bash
# No new packages recommended for Phase 73
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── shared/uiImageContract.js          # canonical ui.theme button-family schema + scan collector
├── engine/ThemeManager.js             # selector registry + CSS injection
├── editor/composables/useThemeEditor.js
├── editor/views/ProjectSettings.vue   # global config surface + preview switching
├── ui/GameMenu.js
├── ui/QuickActionBar.js
├── ui/SaveLoadScreen.js
├── ui/BacklogScreen.js
├── ui/SettingsScreen.js
└── ui/widgets/TabWidget.js            # widget-style settings tabs
```

### Pattern 1: Shared button-family contract under `ui.theme`
**What:** Add a dedicated `buttonFamilies` object parallel to `tokens` and `nineSlice`.
**When to use:** For all 5 frozen families in this phase.
**Recommended shape:**
```js
ui.theme.buttonFamilies = {
  gameMenuButton: {
    normal: 'ui/buttons/game-menu-normal.webp',
    hover: 'ui/buttons/game-menu-hover.webp',
    pressed: 'ui/buttons/game-menu-pressed.webp',
  },
  qab: {
    normal: 'ui/buttons/qab-normal.webp',
    hover: 'ui/buttons/qab-hover.webp',
    pressed: 'ui/buttons/qab-pressed.webp',
  },
  closeButton: {
    normal: 'ui/buttons/close-normal.webp',
    hover: 'ui/buttons/close-hover.webp',
    pressed: 'ui/buttons/close-pressed.webp',
  },
  pageTabPager: {
    normal: 'ui/buttons/page-tab-normal.webp',
    hover: 'ui/buttons/page-tab-hover.webp',
    pressed: 'ui/buttons/page-tab-pressed.webp',
    selected: 'ui/buttons/page-tab-selected.webp',
  },
  settingsTab: {
    normal: 'ui/buttons/settings-tab-normal.webp',
    hover: 'ui/buttons/settings-tab-hover.webp',
    pressed: 'ui/buttons/settings-tab-pressed.webp',
    selected: 'ui/buttons/settings-tab-selected.webp',
  },
};
```
**Why this shape:** no per-state metadata is needed here, so direct state→path strings are simpler than nine-slice-style nested `{ src }` wrappers.

### Pattern 2: Central selector registry with explicit family aliases
**What:** Keep family→selector/state mapping in ThemeManager, not in individual screens.
**When to use:** For runtime application and preview updates.
**Example:**
```js
// Source: src/engine/ThemeManager.js + current screen DOM classes
const BUTTON_FAMILY_SELECTORS = {
  gameMenuButton: ['.game-menu-button'],
  qab: ['.qab-btn'],
  closeButton: [
    '.save-load-close',
    '.backlog-close',
    '.settings-close',
    '.settings-structured-close',
  ],
  pageTabPager: ['.page-tab', '.page-dot'],
  settingsTab: ['.settings-tab-btn', '.gm-tab'],
};
```

### Pattern 3: Preview switching stays inside existing runtime-backed owners
**What:** Reuse existing iframe + `postMessage` protocol; add preview target switching, not a new sandbox.
**When to use:** Editing button-family images from the global theme surface.
**Example:**
```js
// Source: src/editor/views/ProjectSettings.vue + src/main.js
iframe.contentWindow.postMessage({ type: 'update-theme', theme }, '*');
iframe.contentWindow.postMessage({ type: 'show-screen', screenId: 'gameMenu' }, '*');
iframe.contentWindow.postMessage({ type: 'show-screen', screenId: 'saveLoadScreen' }, '*');
iframe.contentWindow.postMessage({ type: 'show-dialogue-preview', speakerName: '预览角色', text: '...' }, '*');
```

### Anti-Patterns to Avoid
- **Per-screen inline image logic:** duplicates fallback/state handling across 5 surfaces.
- **Replacing button text/SVG with baked art:** breaks BTN-03 and current semantics.
- **Styling every `.settings-structured-footer-btn` as close-family:** that class is reused for reset/title actions.
- **Depending on `.active` for `gm-tab` without fixing `TabWidget.js`:** current widget tab path has active styling but no `.active` class.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Button image state wiring | per-screen JS listeners + inline backgrounds | ThemeManager selector registry + injected CSS | Keeps fallback and selector coverage centralized |
| Preview harness | editor-only button sandbox | existing ProjectSettings / screen iframe preview protocol | Runtime is already the source of truth |
| Contract storage | ad-hoc fields in `ui.gameMenu`, `ui.saveLoadScreen`, etc. | `ui.theme.buttonFamilies` | Prevents schema drift |
| Asset field editing | manual text-path inputs | `pickUiImage` / `clearUiImage` helpers | Preserves canonical `ui/...` values and legacy handling |

**Key insight:** this phase is mostly a contract-and-selector problem, not a rendering-engine problem.

## Common Pitfalls

### Pitfall 1: Missing one DOM branch and thinking the family is “done”
**What goes wrong:** only one render path gets the skin.
**Why it happens:** brownfield buttons come from both default and config-driven renderers.
**How to avoid:** verify each family against its actual DOM sources, not just one screen state.
**Warning signs:** game menu skin works in previewed custom layout but not in default layout, or vice versa.

### Pitfall 2: Treating QAB `.active` / `.disabled` as new image states
**What goes wrong:** auto/skip/quickload semantics drift or become unreadable.
**Why it happens:** `.active` and `.disabled` already carry meaning outside hover/pressed.
**How to avoid:** keep QAB family to `normal/hover/pressed`; leave `.active` and `.disabled` CSS semantics intact.
**Warning signs:** quickload loses disabled opacity, or auto/skip no longer look toggled.

### Pitfall 3: Relying on `.active` for settings tabs without normalizing `gm-tab`
**What goes wrong:** selected image works for `.settings-tab-btn` fallback tabs but not for widget-style tabs.
**Why it happens:** `TabWidget.js` updates inline styles via `setActive()` but never adds `.active`.
**How to avoid:** planner should require one explicit normalization task: either add `.active` class in `TabWidget.setActive()` or provide an equivalent selector hook.
**Warning signs:** selected image appears in fallback settings mode but disappears when widgetStyles.tab is enabled.

### Pitfall 4: Over-broad close-family selectors
**What goes wrong:** reset/title/footer buttons get skinned as close buttons.
**Why it happens:** structured settings footer uses one generic class for multiple actions.
**How to avoid:** target only close-role surfaces; add a dedicated class/data-role where current markup is ambiguous.
**Warning signs:** non-close footer buttons suddenly inherit close artwork.

### Pitfall 5: Image layer intercepts or hides content
**What goes wrong:** labels, SVG icons, or hit targets become unreadable or unclickable.
**Why it happens:** background image is applied on the wrong node or with the wrong stacking.
**How to avoid:** render skins as CSS underlay/pseudo-layer with `pointer-events:none` and preserve current padding/layout.
**Warning signs:** QAB SVG icons disappear, text alignment shifts, or click delegation stops firing.

## Code Examples

Verified patterns from current codebase:

### Theme-driven CSS injection owner
```js
// Source: src/engine/ThemeManager.js
export function applyNineSlice(themeData) {
  let styleEl = document.getElementById('galgame-nine-slice');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'galgame-nine-slice';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildNineSliceCSS(themeData?.nineSlice);
}
```

### Theme preview message path
```js
// Source: src/editor/composables/useThemeEditor.js
iframeRef.value.contentWindow.postMessage({
  type: 'update-theme',
  theme: JSON.parse(JSON.stringify(theme)),
}, '*');
```

### Screen preview target switching
```js
// Source: src/main.js
case 'show-screen': {
  switch (msg.screenId) {
    case 'settingsScreen': settingsScreen.show(); break;
    case 'gameMenu': gameMenu.show(); break;
    case 'saveLoadScreen': saveLoadScreen.show('save', 'preview'); break;
    case 'backlogScreen': backlogScreen.show([], {}); break;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Screen-specific style fields and CSS only | Shared `ui.theme` ownership + runtime style injection | Phase 71-72 baseline | Phase 73 should extend the shared owner, not fork it |
| Nine-slice only for a few theme surfaces | Selector-registry pattern reusable for more UI families | Already present in `ThemeManager.js` | Button families can reuse the same runtime pattern |
| Fallback settings tabs only | Split world: fallback `.settings-tab-btn` + widget-style `.gm-tab` | existing code | Planner must cover both or selected state will drift |

**Deprecated/outdated:**
- Adding new button image config under individual screen configs
- Local editor-only button preview sandbox
- Treating generic footer button classes as semantic role classes

## Open Questions

1. **How should structured settings “close surface” be made selector-safe?**
   - What we know: `.settings-structured-close` is safe; `.settings-structured-footer-btn` is shared by close/title/reset.
   - What's unclear: whether planner wants header close only, or also footer close action.
   - Recommendation: require an explicit close-role class/data attribute for any footer close action before skinning it.

2. **How should widget-style settings tabs expose selected semantics?**
   - What we know: `TabWidget.js` has `setActive()` but no `.active` class.
   - What's unclear: whether to normalize via `.active` or another stable hook.
   - Recommendation: prefer adding `.active` to `gm-tab` for parity with frozen decision D-04.

3. **Is extra external/web research needed?**
   - What we know: all relevant behavior is repo-local and already frozen by CONTEXT + existing runtime/editor code.
   - What's unclear: nothing material for planning.
   - Recommendation: **No extra external/web research is needed for this phase.**

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + Node built-in test runner |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run tests/themeManagerUiImage.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/settingsStructured.test.js && node --test tests/uiImageContract.test.js tests/configurableTabs.test.js` |
| Full suite command | `npx vitest run tests/themeManagerUiImage.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/settingsStructured.test.js && node --test tests/uiImageContract.test.js tests/configurableTabs.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BTN-01 | 3-state family CSS generated for game-menu/QAB/close family and applied without replacing DOM | unit | `npx vitest run tests/themeManagerUiImage.test.js` | ⚠️ extend existing |
| BTN-02 | 4-state family CSS generated for page-tab/pager/settings-tab, including selected state | unit | `npx vitest run tests/themeManagerUiImage.test.js tests/settingsStructured.test.js tests/saveLoadScreenLayout.test.js` | ⚠️ partial |
| BTN-03 | text, SVG icons, active/disabled semantics, and click behavior remain stable | unit/integration | `npx vitest run tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/settingsStructured.test.js` | ⚠️ missing QAB-specific |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/themeManagerUiImage.test.js`
- **Per wave merge:** `npx vitest run tests/themeManagerUiImage.test.js tests/gameMenuLayout.test.js tests/saveLoadScreenLayout.test.js tests/settingsStructured.test.js && node --test tests/uiImageContract.test.js tests/configurableTabs.test.js`
- **Phase gate:** Focused phase suite green. Repo-wide historical unrelated failures remain documented in `.planning/STATE.md`.

### Wave 0 Gaps
- [ ] Extend `tests/themeManagerUiImage.test.js` for button-family style tag generation, partial-state fallback, and multi-selector close family coverage
- [ ] Add focused QAB regression (`tests/quickActionBar...`) for `.active` / `.disabled` preservation and SVG visibility
- [ ] Extend `tests/uiImageContract.test.js` (or add a sibling test) for `ui.theme.buttonFamilies` scan/export collection
- [ ] Add preview-owner regression for ProjectSettings/theme preview target switching if new family preview navigation is introduced

## Sources

### Primary (HIGH confidence)
- `src/shared/uiImageContract.js` — current `ui.theme` root and scan/export collector model
- `src/engine/ThemeManager.js` — centralized selector registry and style-tag injection pattern
- `src/main.js` — `update-theme`, `update-screen-layout`, `show-screen`, `show-dialogue-preview` runtime preview protocol
- `src/editor/composables/useThemeEditor.js` — global theme preview owner
- `src/editor/views/ProjectSettings.vue` — current global/theme editor surface
- `src/ui/GameMenu.js` — shared `.game-menu-button` default + config-driven rendering
- `src/ui/QuickActionBar.js` — QAB DOM, `.active`, `.disabled`, SVG-content semantics
- `src/ui/SaveLoadScreen.js` — `.save-load-close`, `.page-tab`, `.page-dot`, default/config paths
- `src/ui/BacklogScreen.js` — `.backlog-close` runtime surface
- `src/ui/SettingsScreen.js` — `.settings-close`, `.settings-structured-close`, `.settings-tab-btn`, footer-button ambiguity, widget/fallback split
- `src/ui/widgets/TabWidget.js` — `gm-tab` selected-state gap
- `src/style.css` — current button/close/tab/QAB CSS semantics

### Secondary (MEDIUM confidence)
- `tests/themeManagerUiImage.test.js` — existing ThemeManager regression baseline
- `tests/gameMenuLayout.test.js` — default/config path stability for game menu buttons
- `tests/saveLoadScreenLayout.test.js` — page-tab/pager and close-button behavior
- `tests/settingsStructured.test.js` / `tests/leftTabDecorations.test.js` — settings tab surfaces and structured footer behavior
- `tests/uiImageContract.test.js` / `tests/configurableTabs.test.js` — current contract and settings-tab behavior baseline

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - repo-local stack and versions are explicit in `package.json`, `vitest.config.js`, and current source structure
- Architecture: HIGH - required owners and message paths already exist in code
- Pitfalls: HIGH - each pitfall is tied to current DOM/CSS/test evidence

**Research date:** 2026-04-23
**Valid until:** 2026-05-23
