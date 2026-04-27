# Phase 80 Theme Browser Design

## Context

Phase 79 closed the full theme package pipeline: full themes can now be preflighted, installed into the project, applied into `script.json`, and exported as self-contained `.gmtheme` archives. The next gap is not package mechanics but selection UX: before applying a theme, the user still lacks one unified place to understand what a theme is, what it covers, what it will overwrite, and what state it is currently in.

This design covers **Phase 80: 主题浏览器与选择 UX** only.

## Goal

Provide one unified theme browser where the user can:

1. See all available themes in one place.
2. Distinguish built-in themes, imported full themes, and compatibility-only partial themes.
3. Understand theme coverage and current-project overwrite impact before applying.
4. Browse through static card previews and text summaries only, without introducing live iframe preview for unopened themes.

## Non-Goals

- No new live iframe preview for unopened themes.
- No second install/apply path separate from the Phase 79 pipeline.
- No shipped golden theme content authoring in this phase.
- No Phase 81/82 asset production work beyond shaping the browser so those phases can plug in.

## Recommended Approach

Build a **single unified theme browser** instead of preserving separate built-in/import surfaces.

### Alternatives considered

1. **Unified browser with shared data model** — recommended.
   - Best fit for mixed built-in / imported / partial states.
   - Scales to Phase 81/82 when the number of complete themes grows.
   - Keeps Phase 79 import/apply/export work as the only package pipeline.

2. **Keep the two current modals and enhance them**
   - Lower short-term surface change.
   - Keeps state, filtering, and explanation logic split across multiple UIs.
   - More likely to reintroduce drift between built-in and imported themes.

3. **Lightweight list with secondary detail modal**
   - Faster to implement.
   - Weakens the “browse → compare → inspect overwrite impact → apply” flow.
   - Adds extra hopping at the exact moment where clarity matters.

## UX Structure

The browser uses a **four-region layout**:

### 1. Top toolbar

- Import theme package action.
- Search input.
- Quick entry points to filtering.

The toolbar owns ingestion into the browser. Import is no longer visually framed as a separate workflow outside browsing.

### 2. Left filter rail

The left rail filters the theme list by normalized metadata only. It does not own theme state itself.

Filters:

- **Source**: built-in / imported
- **Type**: full theme / compatibility-only partial
- **Lifecycle**: currently applied / available
- **Coverage**: theme areas such as dialogue, save/load, backlog, game menu, settings, full coverage

### 3. Center card list

Each card shows:

- Preview image
- Name
- Author
- Version
- Source badge
- Complete vs partial badge
- Current status badge
- Short coverage summary

The list is optimized for scanning and comparing, not for deep explanation.

### 4. Right detail panel

The right panel explains the selected card in full:

- Coverage provided by the theme
- Missing coverage for partial themes
- Compatibility label and boundary text
- “If applied now” overwrite impact against the current project
- Apply CTA when allowed by phase boundaries

The detail panel is the primary place for overwrite explanation. The card remains compact.

## Action States

The browser does not invent a new apply path. It only exposes actions already permitted by the Phase 79 install/apply boundary.

### Full built-in themes

- Show **Apply** CTA.
- Applying uses the shared Phase 79 built-in install/apply service.

### Full imported themes

- Show **Apply** CTA.
- Applying uses the shared Phase 79 imported install/apply service.

### Compatibility-only partial themes

- Do **not** show the same full-theme replace CTA.
- Show compatibility-only framing instead: the user can inspect coverage and missing coverage, but the browser must not present the item as a whole-theme replacement candidate.

### Currently applied theme

- Show explicit `当前已应用` state.
- Hide the primary **Apply** CTA for the selected applied theme item in Phase 80.
- The state badge remains primary so users do not confuse “already imported” with “currently active”.

## Data Model

The browser renders one normalized theme item shape regardless of source:

```js
{
  id,
  source,
  mode,
  lifecycle,
  name,
  author,
  version,
  preview,
  coverage,
  missingCoverage,
  applyImpact
}
```

### Normalized fields

- `source`: `builtin` | `imported`
- `mode`: `full` | `legacy-partial`
- `lifecycle`: `available` | `applied`
- `coverage`: theme-owned UI areas this theme can provide
- `missingCoverage`: areas absent from compatibility-only partial themes
- `applyImpact`: normalized description of what current-project theme-owned areas would be replaced if applied now
- `preview`: either a packaged/imported preview asset when available, or a deterministic fallback thumbnail generated from theme metadata and theme tokens

## Data Sources

### Built-in themes

Built-in themes are normalized from the local built-in manifest and the same full-theme assumptions already locked by earlier phases.

### Imported themes

Imported themes are normalized from installed/imported package metadata and the project-local package information created by Phase 79.

### Current applied state

The browser uses current project theme metadata from `script.json` as the source of truth when determining:

- which theme is currently applied
- what coverage is currently active
- what a future apply action would overwrite

No extra registry or browser-only truth is introduced.

## Lifecycle Rules

### Full themes

Full themes can appear as these orthogonal tuples:

- `source=builtin, mode=full, lifecycle=available`
- `source=imported, mode=full, lifecycle=available`
- `source=builtin|imported, mode=full, lifecycle=applied`

### Compatibility-only partial themes

Partial themes:

- are visible in the same browser
- are explicitly labeled `兼容导入 / 部分主题`
- show missing coverage in both card and detail surfaces
- must never be visually equivalent to a full theme ready for whole-theme replacement
- remain `lifecycle=available` unless and until a later phase explicitly introduces a different partial-theme lifecycle rule

## Overwrite Impact Rules

Before apply, the browser computes impact using current project theme metadata plus coverage:

- If there is an applied package and overlapping coverage, the browser explains which theme-owned areas will be replaced.
- If the project has no prior `packageMeta` yet, the browser degrades gracefully to “first write into these theme areas”.
- The browser explains overwrite impact without performing apply.

## Error Handling and Empty States

- If there are no imported themes, the browser still shows built-in themes and gives a scoped empty state for imported filters.
- If import produces a compatibility-only partial theme, it still appears in the browser list with restricted action framing.
- If project metadata is incomplete, the browser avoids hard failure and falls back to conservative explanatory text.
- If a selected theme cannot currently be applied, the reason is stated in the detail panel rather than silently disabling understanding.
- If a theme has no real preview asset, the card uses a stable fallback preview instead of a broken or blank image slot.
- After import, the browser refreshes immediately, selects the newly added theme item, and surfaces short in-context status feedback so the user stays inside the browser flow.
- If import preflight or install fails, the browser keeps the current filter state, search state, and current selection unchanged, and surfaces the Phase 79 validation/install error inline near the toolbar import action.
- Import failure must not clear the current detail panel or silently drop the user out of the browser context.

## Preview Policy

Phase 80 continues the milestone rule:

- **Allowed**: static card preview image, text summary, coverage explanation, overwrite explanation
- **Not allowed**: live iframe preview for unopened themes

This keeps pre-apply browsing informative without creating a second truth separate from the runtime-backed preview model.

## Component Boundaries

### `ThemeBrowserModal` or `ThemeBrowserView`

Owns composition, selection state, filter state, and orchestration between subcomponents.

### `ThemeBrowserFilters`

Owns filter UI only. Emits filter changes. Does not compute theme state.

### `ThemeBrowserCardList`

Renders filtered items and current selection.

### `ThemeBrowserCard`

Renders one compact summary card.

### `ThemeBrowserDetails`

Renders selected theme explanation, compatibility text, coverage details, and apply CTA.

### `themeBrowser` service/helper layer

Owns:

- normalization of built-in and imported records
- lifecycle calculation
- coverage summary formatting
- overwrite impact calculation
- preview fallback resolution

The service layer is split into explicit units so each boundary is independently understandable and testable:

- `normalizeThemeBrowserItem(rawTheme, currentProjectState) -> ThemeBrowserItem`
- `filterThemeBrowserItems(items, filterState) -> ThemeBrowserItem[]`
- `computeThemeBrowserLifecycle(item, currentProjectState) -> lifecycle`
- `computeThemeApplyImpact(item, currentProjectState) -> applyImpact`
- `resolveThemeBrowserPreview(item) -> previewDescriptor`

This logic stays outside the view layer so the UI remains thin and testable.

## Testing Strategy

### Service/helper tests

Cover:

- item normalization
- status derivation
- coverage and missing coverage display inputs
- overwrite impact calculation

### Component flow tests

Cover:

- filter updates changing the visible list
- selecting a card updating the detail panel
- source/status/mode badges rendering correctly
- partial-theme messaging staying distinct from full-theme messaging

### Regression coverage

Cover:

- built-in, imported full, and legacy-partial themes all appearing in the same browser
- no reintroduction of unopened-theme live iframe preview
- current applied theme badge remaining distinct from imported-but-not-applied state

### Verification gate

Continue using focused phase-specific verification rather than mixing unrelated legacy repository failures into Phase 80 closure.

## Why this sets up the next phases cleanly

- **Phase 81** can plug the first golden theme into an already-stable browser surface.
- **Phase 82** can scale from 1 to 5 complete themes without changing browser architecture.
- Package pipeline logic remains owned by Phases 78–79, while Phase 80 focuses only on browse/understand/select UX.
