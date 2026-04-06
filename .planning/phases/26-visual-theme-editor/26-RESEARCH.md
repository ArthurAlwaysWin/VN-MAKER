# Phase 26: Visual Theme Editor - Research

**Researched:** 2026-04-06
**Domain:** Vue 3 editor UI — visual theme editing with live engine preview
**Confidence:** HIGH

## Summary

Phase 26 builds a complete visual theme editor as a new tab ("🎨 主题") in the editor. The architecture is a left-right split: 360px fixed control panel (left) + adaptive engine preview iframe (right). The control panel contains a toolbar (reset/palette/9-slice buttons) and a scrollable 10-group accordion of token controls. Two modal popups provide palette generation and 9-slice image configuration.

All infrastructure is already in place: `DEFAULT_TOKENS` (41 tokens, 10 groups), `ThemeManager.js` (applyTheme/applyNineSlice), `colorHarmony.js` (4 algorithms, generatePalette returning 34 color keys), `contrast.js` (contrastRatio/autoFix), `script.js` store (getTheme/updateTheme with undo/redo), and the engine's `update-theme` postMessage handler. This phase is purely editor-side UI work — no engine modifications needed.

The primary technical challenge is building heterogeneous controls (color pickers with alpha, font selectors, numeric sliders, gradient editors, WCAG indicators) that all funnel through a single data pipeline: token change → reactive state → debounced postMessage → iframe preview, while maintaining undo/redo support through the existing store pattern.

**Primary recommendation:** Organize as one main view (`ThemeDesigner.vue`) with a dedicated composable (`useThemeEditor.js`) managing iframe lifecycle, debounced postMessage, and token CRUD. Split controls into typed subcomponents (color row, slider row, font row, gradient row) and modals (palette, 9-slice) as separate SFCs. Target 3 plans: foundation + controls, palette modal + WCAG, 9-slice modal + polish.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 左右分栏布局：左侧固定 360px 控件面板 + 右侧自适应引擎预览 iframe。不采用三栏模式。
- **D-02:** 左侧面板顶部一行工具栏（重置主题 / 调色盘生成器入口 / 九宫格配置入口），下方是可滚动的 token 控件区。
- **D-03:** 注册为编辑器新标签页「🎨 主题」，与现有 5 个标签同级（共 6 个 tab）。
- **D-04:** 原生 `<input type="color">` + hex 文本输入框，零第三方依赖。
- **D-05:** 带 alpha 通道的 token 额外显示 opacity 滑块（0-100%）。纯色 token 只显示颜色选择器。控件根据 token 默认值自动判断。
- **D-06:** 颜色变更通过 200ms debounce 后 postMessage 到 iframe 预览。
- **D-07:** 调色盘生成器以弹窗/浮层形式展示，从工具栏按钮打开。
- **D-08:** 弹窗内交互：选主色 → 4 张色块卡片（互补/类似/三角/分裂互补）→ 点选一张 → 预览全部 34 个生成色 → 「应用」按钮一键写入所有颜色 token。
- **D-09:** 应用后通过 updateTheme() 推入撤销栈，用户可 Ctrl+Z 回退。
- **D-10:** 九宫格配置以弹窗形式展示（独立于调色盘弹窗）。
- **D-11:** 弹窗内 6 个目标元素以页签或折叠板组织。
- **D-12:** 每个元素配置区：图片上传（base64 Data URL）、4 个 number input（上/右/下/左 slice）、缩略图预览（虚线标注切片位置）。
- **D-13:** 按钮类元素（选项按钮/标题按钮）额外显示 hover 和 active 状态图片上传区。
- **D-14:** 使用折叠面板（accordion）展示，与 tokens.js 现有 10 个分组注释一致。
- **D-15:** 字体 token 使用字体选择器（下拉列表从资源库已导入字体 + 系统默认字体中选择）。
- **D-16:** 圆角和模糊 token 使用数值滑块 + 输入框。
- **D-17:** 渐变类 token（dialogue-bg、title-bg）需特殊处理——简化的渐变编辑器或文本输入。
- **D-18:** 文字色 token（text 组 6 个）旁显示 vs 背景色的对比度值。绿色 ✓ ≥4.5:1，黄色 ⚠️ 未通过，附带「修复」按钮。
- **D-19:** 修复按钮调用 contrast.js autoFix，立即更新预览。

### Agent's Discretion
- iframe 预览的具体初始化和通信实现细节
- 折叠面板的展开/收起动画方式
- 弹窗的尺寸和定位策略
- 渐变类 token 的编辑方式（简化渐变编辑器 vs 文本输入）
- 九宫格缩略图的虚线绘制实现（canvas vs CSS overlay）
- 颜色控件内部的 rgba ↔ hex+alpha 转换逻辑

### Deferred Ideas (OUT OF SCOPE)
- 社区模板分享：Phase 27 PKG-01/02/03 包含 .theme 文件导出导入，社区分享平台为更远期。
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDT-01 | 编辑器新增「🎨 主题」标签页，提供可视化主题编辑界面 | Tab registration in App.vue (tabs[] + tabComponents), ThemeDesigner.vue as new view |
| EDT-02 | 主题编辑器包含颜色选择器、字体选择器、圆角滑块、透明度滑块等控件 | 10-group accordion with typed control rows; native `<input type="color">` + opacity slider, font dropdown from asset store, range slider for radius/blur |
| EDT-03 | 主题编辑器包含九宫格图片上传和切片参数配置界面 | NineSliceModal with FileReader.readAsDataURL for base64 upload, 4 number inputs per element, canvas/CSS overlay for slice preview |
| EDT-04 | 主题编辑器内嵌引擎预览 iframe，修改任何 token 立即看到变化 | Embedded `/index.html` iframe, `update-theme` postMessage with 200ms debounce, engine handler already exists in main.js:858-861 |
| EDT-05 | 配色方案生成器：选主色 → 预览调色盘 → 一键应用 | PaletteModal using colorHarmony.js generatePalette(), 4 algorithm cards, batch apply via updateTheme() |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Tech stack**: JavaScript (ES Modules) + Vue 3 + Electron — no TypeScript migration
- **Design philosophy**: Developer only does visual design, engine handles all game logic
- **Style**: Dark theme, pure CSS, Chinese interface
- **Zero new npm dependencies**: Native browser APIs only (D-04 confirms)
- **Named exports only**: No default exports in JS modules
- **Vue SFCs**: `<script setup>` pattern, Pinia stores, composables with `use` prefix
- **ES Modules**: Explicit `.js` extensions for JS imports
- **Single quotes, 2-space indent, semicolons always**
- **JSDoc**: File-level block at top of every module, `@param`/`@type` annotations
- **Section dividers**: `// ─── Section Name ───────` pattern
- **Error handling**: `{ success, error? }` return objects, `console.error` with `[ModuleName]` prefix

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Vue 3 | ^3.5.31 | SFC components, reactivity, computed | ✅ Installed |
| Pinia | ^3.0.4 | State management (useScriptStore) | ✅ Installed |
| Vite | ^6.3.0 | Build tool, dev server, HMR | ✅ Installed |

### Engine Modules (Already Built)
| Module | Location | Purpose |
|--------|----------|---------|
| DEFAULT_TOKENS | `src/engine/tokens.js` | 41 token vocabulary, 10 groups |
| ThemeManager | `src/engine/ThemeManager.js` | applyTheme + applyNineSlice (4 exports) |
| colorHarmony | `src/engine/colorHarmony.js` | hexToHsl, hslToHex, 4 algorithms, generatePalette (34 keys) |
| contrast | `src/engine/contrast.js` | contrastRatio, autoFix (WCAG binary search) |

### Editor Infrastructure (Already Built)
| Module | Location | Purpose |
|--------|----------|---------|
| script.js store | `src/editor/stores/script.js` | getTheme() / updateTheme() with undo/redo |
| assets.js store | `src/editor/stores/assets.js` | fontFamilies computed, loadCategory() |
| TabBar.vue | `src/editor/components/TabBar.vue` | Tab navigation (v-model + tabs array) |
| AssetPickerModal.vue | `src/editor/components/resource-library/` | Asset selection pattern reference |

### No New Dependencies
Per D-04, this phase adds zero npm packages. All controls use native HTML5 elements:
- `<input type="color">` for color picking
- `<input type="range">` for sliders
- `<input type="number">` for numeric inputs
- `<select>` for font selection
- `<input type="file">` for 9-slice image upload

## Architecture Patterns

### Recommended Project Structure
```
src/editor/
├── views/
│   └── ThemeDesigner.vue        # Main view — left-right split, iframe management
├── composables/
│   └── useThemeEditor.js        # Shared state: iframe ref, debounced postMessage, token CRUD
├── components/
│   └── theme/
│       ├── ThemeToolbar.vue      # Reset / Palette / 9-Slice toolbar buttons
│       ├── TokenAccordion.vue    # 10-group collapsible container
│       ├── TokenGroup.vue        # Single collapsible group header + content
│       ├── ColorTokenRow.vue     # Color picker + hex input + optional opacity slider
│       ├── FontTokenRow.vue      # Font family dropdown selector
│       ├── SliderTokenRow.vue    # Range slider + number input (radius/blur)
│       ├── GradientTokenRow.vue  # Gradient token text input (D-17 special handling)
│       ├── ContrastBadge.vue     # WCAG ✓/⚠️ indicator + ratio + fix button
│       ├── PaletteModal.vue      # Palette generator popup
│       └── NineSliceModal.vue    # 9-slice config popup with element tabs
```

### Pattern 1: Composable for Shared Theme State (`useThemeEditor.js`)
**What:** Centralized reactive state and logic for the theme editor, similar to `usePageEditor.js` but for theme editing
**When to use:** Shared between ThemeDesigner.vue and all subcomponents

```javascript
// src/editor/composables/useThemeEditor.js
import { ref, reactive, computed, provide, inject, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { DEFAULT_TOKENS } from '../../engine/tokens.js';

const THEME_EDITOR_KEY = Symbol('themeEditor');

export function createThemeEditor() {
  const script = useScriptStore();
  const iframeRef = ref(null);
  const isEngineReady = ref(false);

  // Build working copy merged with defaults
  function getMergedTokens() {
    const theme = script.getTheme();
    return { ...DEFAULT_TOKENS, ...(theme?.tokens ?? {}) };
  }

  // ─── Debounced preview update (D-06) ────────────────
  let debounceTimer = null;
  function sendThemeToPreview() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
      const theme = script.getTheme();
      const snapshot = JSON.parse(JSON.stringify(theme));
      iframeRef.value.contentWindow.postMessage({
        type: 'update-theme',
        theme: snapshot,
      }, '*');
    }, 200);
  }

  // ─── Token mutation ─────────────────────────────────
  function setToken(key, value) {
    const theme = script.getTheme();
    theme.tokens[key] = value;
    sendThemeToPreview();
  }

  function setTokenBatch(partial) {
    const theme = script.getTheme();
    Object.assign(theme.tokens, partial);
    sendThemeToPreview();
  }

  // Commit to undo stack (call after user finishes editing, not per keystroke)
  function commitTheme() {
    const theme = script.getTheme();
    script.updateTheme(JSON.parse(JSON.stringify(theme)));
  }

  // ... provide/inject pattern
  const editor = { iframeRef, isEngineReady, getMergedTokens, setToken, setTokenBatch, commitTheme, sendThemeToPreview };
  provide(THEME_EDITOR_KEY, editor);
  return editor;
}

export function useThemeEditor() {
  return inject(THEME_EDITOR_KEY);
}
```

### Pattern 2: Token Type Detection for Control Rendering (D-05)
**What:** Determine which control type to render based on DEFAULT_TOKENS default value
**When to use:** TokenAccordion iterates tokens and selects the appropriate row component

```javascript
// Token type classification based on DEFAULT_TOKENS values
function getTokenType(key) {
  const defaultValue = DEFAULT_TOKENS[key];
  if (key.startsWith('font-')) return 'font';
  if (key === 'radius' || key === 'radius-lg' || key === 'blur') return 'slider';
  if (defaultValue.startsWith('linear-gradient')) return 'gradient';
  if (defaultValue.startsWith('rgba')) return 'color-alpha';  // color + opacity
  return 'color';  // hex only
}
```

### Pattern 3: RGBA ↔ Hex+Alpha Conversion (Agent Discretion)
**What:** Convert between rgba string format and separate hex + opacity for control binding
**When to use:** ColorTokenRow needs hex for `<input type="color">` and 0-100 for opacity slider

```javascript
// Parse rgba(r, g, b, a) → { hex: '#rrggbb', alpha: 0-100 }
function parseRgba(rgba) {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/);
  if (!m) return { hex: '#000000', alpha: 100 };
  const r = parseInt(m[1]).toString(16).padStart(2, '0');
  const g = parseInt(m[2]).toString(16).padStart(2, '0');
  const b = parseInt(m[3]).toString(16).padStart(2, '0');
  const a = m[4] !== undefined ? Math.round(parseFloat(m[4]) * 100) : 100;
  return { hex: `#${r}${g}${b}`, alpha: a };
}

// Build rgba string from hex + alpha (0-100)
function buildRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${(alpha / 100).toFixed(2)})`;
}
```

### Pattern 4: Iframe Lifecycle with keep-alive
**What:** App.vue uses `<keep-alive>`, so ThemeDesigner is not destroyed when switching tabs
**When to use:** Handle iframe initialization on mount and re-activation

```javascript
// ThemeDesigner.vue — iframe lifecycle
onMounted(() => {
  window.addEventListener('message', onEngineMessage);
  // iframe loads /index.html automatically
});

onActivated(() => {
  // Re-send theme when returning to tab (iframe may have stale state)
  if (isEngineReady.value) {
    sendFullStart(); // Re-initialize preview with current script data
  }
});

onDeactivated(() => {
  // Optional: pause iframe to save resources
});

onBeforeUnmount(() => {
  window.removeEventListener('message', onEngineMessage);
});
```

### Pattern 5: 9-Slice Image Upload (base64 Data URL per Phase 25 D-03)
**What:** Read user-selected image file as base64 Data URL, store directly in theme data
**When to use:** NineSliceModal image upload areas

```javascript
// File input handler for 9-slice image upload
function onImageSelected(event, elementKey, state = null) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result; // "data:image/png;base64,..."
    const theme = script.getTheme();
    theme.nineSlice ??= {};
    theme.nineSlice[elementKey] ??= { src: null, slice: [20, 20, 20, 20], width: null, outset: null, repeat: 'stretch', states: null };
    if (state) {
      // Button hover/active state
      theme.nineSlice[elementKey].states ??= {};
      theme.nineSlice[elementKey].states[state] = { src: dataUrl };
    } else {
      theme.nineSlice[elementKey].src = dataUrl;
    }
    sendThemeToPreview();
  };
  reader.readAsDataURL(file);
}
```

### Anti-Patterns to Avoid
- **Direct store mutation without pushState:** Always call `commitTheme()` (which calls `updateTheme()` + `pushState()`) when user finishes an edit action (e.g., color picker closed, slider released). Do NOT call pushState on every intermediate change — that floods the undo history.
- **Sending Vue Proxy objects via postMessage:** Always `JSON.parse(JSON.stringify())` before `postMessage` — Vue reactive proxies cannot be cloned by structured clone algorithm.
- **Binding `<input type="color">` directly to rgba values:** The native color input only accepts `#rrggbb`. Must convert rgba → hex for the input, then hex+alpha → rgba on change.
- **Recreating iframe on every tab switch:** The iframe is heavy — use keep-alive and re-send theme data on `onActivated`, don't destroy/recreate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color harmony algorithms | Custom HSL math | `colorHarmony.js` generatePalette() | Already built in Phase 25, tested, returns 34 token keys |
| WCAG contrast ratio | Manual luminance calc | `contrast.js` contrastRatio() + autoFix() | Exact sRGB linearization per WCAG 2.x spec, binary search fix |
| Theme data persistence | Custom save/load | `script.js` getTheme() / updateTheme() | Already has undo/redo, auto-save, dirty flag integration |
| CSS variable injection | Manual setProperty loops | Engine's `update-theme` postMessage | Engine handler at main.js:858-861 already calls applyTheme + applyNineSlice |
| Font list | Hardcoded font names | `useAssetStore().fontFamilies` computed | Dynamically reads imported project fonts |
| Token defaults | Hardcoded fallback values | `DEFAULT_TOKENS` from tokens.js | Single source of truth for all 41 tokens |

**Key insight:** Phase 23-25 built all the engine infrastructure. Phase 26 is purely UI — it wires existing APIs into Vue controls. The entire data pipeline (token → CSS var → visual change) already works.

## Common Pitfalls

### Pitfall 1: Palette Overwrites Alpha Channels
**What goes wrong:** `generatePalette()` returns plain hex values (`#aabbcc`). Most DEFAULT_TOKENS use rgba with alpha (e.g., `rgba(180, 160, 255, 0.9)`). Applying a palette replaces rgba with hex, losing semi-transparency on panels/overlays.
**Why it happens:** The palette generator was designed to produce base colors, not full rgba values.
**How to avoid:** When applying a palette, preserve original alpha: for each token that was rgba, convert palette hex to rgba using the original alpha. For tokens that were hex (only `danger`), use hex directly. For gradient tokens (`dialogue-bg`, `title-bg`), the palette generates flat hex — apply as-is (user can re-add gradients manually).
**Warning signs:** Panels lose transparency after applying a palette.

### Pitfall 2: Debounce vs Commit Timing
**What goes wrong:** If debounced preview update fires after user commits (updateTheme → pushState), the postMessage sends stale data.
**Why it happens:** 200ms debounce timer and pushState are independently timed.
**How to avoid:** On commit, flush the debounce timer immediately (clearTimeout + send now). Or: send preview update using the committed data, not intermediate state.
**Warning signs:** Preview briefly shows old colors after undo/redo.

### Pitfall 3: WCAG Contrast Against Gradient Backgrounds
**What goes wrong:** Text tokens (6 in the text group) need contrast checks against their background. But `dialogue-bg` and `title-bg` are linear-gradients, and `contrastRatio()` only accepts hex.
**Why it happens:** `contrast.js` was designed for simple hex color pairs.
**How to avoid:** Use `panel-bg` (rgba, not gradient) as the reference background for contrast calculations. Parse the rgb components from the rgba value, ignore alpha for contrast (worst case: fully opaque). Panel-bg is the most common background for text elements.
**Warning signs:** Error when trying to pass a gradient string to contrastRatio().

### Pitfall 4: keep-alive iframe State Sync
**What goes wrong:** User edits theme → switches to another tab → switches back. The iframe still shows the old theme state (before any external changes like undo).
**Why it happens:** `<keep-alive>` preserves component DOM but doesn't re-trigger onMounted. The iframe's internal state doesn't auto-refresh.
**How to avoid:** Use `onActivated()` hook to re-send the full theme to the iframe via `update-theme` postMessage. Ensure the iframe receives the current `getTheme()` state every time the tab becomes active.
**Warning signs:** Theme preview is stale after switching tabs.

### Pitfall 5: 9-Slice Base64 Size in Undo History
**What goes wrong:** Each 9-slice image is a base64 Data URL (~50-200KB). Uploading images creates large `pushState()` snapshots. With 50-entry undo history and 6 elements × 3 states, memory can spike.
**Why it happens:** The undo system deep-clones entire script.data (including base64 strings) per snapshot.
**How to avoid:** This is a known trade-off accepted in Phase 25 D-03 (images <100KB). Document for users that heavy 9-slice use increases memory. Consider calling pushState only on meaningful commits (not on every slice number change).
**Warning signs:** Memory usage climbing with many 9-slice image uploads.

### Pitfall 6: Native Color Picker Format
**What goes wrong:** `<input type="color">` always returns lowercase 6-digit hex (`#aabbcc`). Some browsers may trigger `input` events frequently during dragging.
**Why it happens:** Browser implementation variation.
**How to avoid:** Use `input` event for live preview (debounced), `change` event for commit. Always normalize hex to lowercase. Validate hex input text field with regex before applying.
**Warning signs:** Rapid-fire postMessage during color picker drag.

### Pitfall 7: Font Selector Missing Imported Fonts
**What goes wrong:** Font dropdown is empty because `useAssetStore().fontFamilies` hasn't loaded yet.
**Why it happens:** Font metadata is loaded on project open, but if asset store wasn't refreshed, fontMeta could be stale.
**How to avoid:** Ensure `assets.fontMeta` is populated before rendering FontTokenRow. The metadata is loaded at project open time via `assets.loadProjectFonts()`, so it should be available. Add system defaults as fallback options that are always present.
**Warning signs:** Font selector shows only system defaults, no project fonts.

## Code Examples

### Tab Registration in App.vue
```javascript
// App.vue — add to tabs array (after existing 5 tabs)
const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-design', icon: '⚙️', label: '设置页' },
  { id: 'resource-library', icon: '📦', label: '资源库' },
  { id: 'project-settings', icon: '⚡', label: '项目设置' },
  { id: 'theme', icon: '🎨', label: '主题' },  // NEW — D-03
];

// Add to tabComponents
import ThemeDesigner from './views/ThemeDesigner.vue';
const tabComponents = {
  // ... existing 5 ...
  'theme': markRaw(ThemeDesigner),
};
```

### Token Group Definition (mapping to tokens.js 10 groups)
```javascript
// Token groups matching tokens.js comment sections
const TOKEN_GROUPS = [
  { id: 'core', label: '🎨 核心色', keys: ['primary', 'primary-subtle', 'danger', 'danger-hover', 'accent', 'accent-border', 'shadow', 'title-glow', 'save-title', 'load-title'] },
  { id: 'text', label: '📝 文字', keys: ['text', 'text-heading', 'text-secondary', 'text-muted', 'text-dim', 'text-faint'] },
  { id: 'borders', label: '📏 边框', keys: ['border', 'border-hover', 'border-active'] },
  { id: 'backgrounds', label: '🖼️ 背景', keys: ['dialogue-bg', 'panel-bg', 'menu-bg', 'card-bg', 'card-bg-hover', 'title-bg', 'confirm-bg'] },
  { id: 'buttons', label: '🔘 按钮', keys: ['btn-bg', 'btn-text', 'btn-border', 'btn-hover-bg', 'btn-hover-text', 'btn-hover-border'] },
  { id: 'fonts', label: '🔤 字体', keys: ['font-body', 'font-display'] },
  { id: 'radii', label: '⭕ 圆角', keys: ['radius', 'radius-lg'] },
  { id: 'blur', label: '🌫️ 模糊', keys: ['blur'] },
  { id: 'controls', label: '🎛️ 控件', keys: ['slider-track', 'slider-thumb', 'scrollbar'] },
  { id: 'speaker', label: '💬 说话人', keys: ['speaker-shadow'] },
];
```

### WCAG Contrast Badge Logic (D-18, D-19)
```javascript
// ContrastBadge.vue — for text group tokens
import { contrastRatio, autoFix } from '../../engine/contrast.js';

// Determine reference background for contrast check
// Use panel-bg as primary reference (most common text background)
function getContrastInfo(textTokenValue, bgTokenValue) {
  // Extract hex from rgba for contrast calculation
  const textHex = rgbaToHex(textTokenValue);
  const bgHex = rgbaToHex(bgTokenValue);
  const ratio = contrastRatio(textHex, bgHex);
  const passes = ratio >= 4.5;
  return { ratio: ratio.toFixed(1), passes };
}

function onFixClick(textTokenKey, textTokenValue, bgTokenValue) {
  const textHex = rgbaToHex(textTokenValue);
  const bgHex = rgbaToHex(bgTokenValue);
  const result = autoFix(textHex, bgHex, 4.5);
  if (result && result.direction !== 'none') {
    // Preserve original alpha, update color
    const originalAlpha = parseRgba(textTokenValue).alpha;
    const newValue = buildRgba(result.hex, originalAlpha);
    setToken(textTokenKey, newValue);
    commitTheme();
  }
}
```

### 9-Slice Preview with Dashed Lines (CSS Overlay approach)
```html
<!-- NineSlicePreview — CSS overlay for dashed slice lines -->
<template>
  <div class="ns-preview" v-if="src">
    <img :src="src" class="ns-thumb" />
    <!-- Horizontal dashed lines for top/bottom slice -->
    <div class="ns-line ns-line-top" :style="{ top: topPct + '%' }"></div>
    <div class="ns-line ns-line-bottom" :style="{ bottom: bottomPct + '%' }"></div>
    <!-- Vertical dashed lines for left/right slice -->
    <div class="ns-line ns-line-left" :style="{ left: leftPct + '%' }"></div>
    <div class="ns-line ns-line-right" :style="{ right: rightPct + '%' }"></div>
  </div>
</template>

<style scoped>
.ns-preview { position: relative; width: 200px; height: 200px; border: 1px solid #444; }
.ns-thumb { width: 100%; height: 100%; object-fit: contain; }
.ns-line { position: absolute; }
.ns-line-top, .ns-line-bottom {
  left: 0; right: 0; height: 0;
  border-top: 1px dashed rgba(255, 100, 100, 0.7);
}
.ns-line-left, .ns-line-right {
  top: 0; bottom: 0; width: 0;
  border-left: 1px dashed rgba(255, 100, 100, 0.7);
}
</style>
```

### Palette Application with Alpha Preservation (Pitfall 1 fix)
```javascript
// When applying palette, preserve original alpha channels
function applyPalette(paletteTokens) {
  const theme = script.getTheme();
  const merged = { ...DEFAULT_TOKENS, ...(theme.tokens ?? {}) };

  for (const [key, paletteHex] of Object.entries(paletteTokens)) {
    const current = merged[key] || DEFAULT_TOKENS[key];
    if (current.startsWith('rgba')) {
      // Preserve original alpha
      const { alpha } = parseRgba(current);
      theme.tokens[key] = buildRgba(paletteHex, alpha);
    } else if (current.startsWith('linear-gradient')) {
      // Gradient tokens: palette generates flat color — apply as flat hex
      theme.tokens[key] = paletteHex;
    } else {
      // Pure hex token — apply directly
      theme.tokens[key] = paletteHex;
    }
  }

  script.updateTheme(JSON.parse(JSON.stringify(theme)));
  sendThemeToPreview();
}
```

## Token Analysis

### Complete Token Classification (41 tokens)

| Type | Count | Tokens | Control |
|------|-------|--------|---------|
| Color + Alpha (rgba) | 30 | primary, primary-subtle, danger-hover, accent, accent-border, shadow, title-glow, save-title, load-title, text (×6), border (×3), panel-bg, menu-bg, card-bg, card-bg-hover, confirm-bg, btn-* (×6), slider-track, slider-thumb, scrollbar, speaker-shadow | ColorTokenRow (picker + hex + opacity slider) |
| Color (hex only) | 1 | danger | ColorTokenRow (picker + hex, no opacity) |
| Gradient | 2 | dialogue-bg, title-bg | GradientTokenRow (text input) |
| Font | 2 | font-body, font-display | FontTokenRow (dropdown selector) |
| Pixel value | 3 | radius, radius-lg, blur | SliderTokenRow (range + number input) |
| **Palette-covered** | **34** | All color tokens (including gradients as flat colors) | Via generatePalette() |
| **Not palette-covered** | **7** | danger, danger-hover, font-body, font-display, radius, radius-lg, blur | Manual edit only |

**Correction on palette coverage:** Looking at `generatePalette()` return, it does include `danger` equivalent mapping... Actually no — re-checking the source: `generatePalette()` does NOT output `danger` or `danger-hover`. These two stay constant. The palette outputs 34 keys covering: core colors (8, not danger/danger-hover), text (6), backgrounds (7), borders (3), buttons (6), controls (3), speaker (1) = 34.

### 9-Slice Elements (D-11)

| Key | CSS Selector | Label | Has States |
|-----|-------------|-------|------------|
| dialogueBox | `#dialogue-box` | 对话框 | No |
| menuPanel | `.game-menu-panel` | 菜单面板 | No |
| saveSlot | `.save-slot` | 存档槽 | No |
| choiceButton | `.choice-button` | 选项按钮 | Yes (hover/active) |
| titleButton | `.title-button` | 标题按钮 | Yes (hover/active) |
| settingsPanel | `#settings-screen` | 设置面板 | No |

## State of the Art

| Aspect | Status | Implication |
|--------|--------|-------------|
| `<input type="color">` | Well-supported in all Chromium browsers | Safe for Electron — no polyfill needed |
| `<input type="range">` | Fully supported | CSS styling via `::-webkit-slider-*` for dark theme |
| FileReader.readAsDataURL | Stable API | Used for 9-slice base64 inline storage |
| postMessage structured clone | Cannot clone Vue Proxy | Must JSON.parse(JSON.stringify()) before sending |

## Gradient Token Handling (D-17 — Agent Discretion)

**Recommendation: Text input with live preview**

The two gradient tokens (`dialogue-bg`, `title-bg`) have complex `linear-gradient()` values. Building a visual gradient editor is disproportionately complex for 2 tokens. Instead:

1. Display a `<textarea>` or `<input type="text">` with the current gradient CSS value
2. Show a small preview swatch (div with the gradient as background) next to the input
3. User can manually edit the CSS gradient string
4. Validate that the value starts with `linear-gradient(` before applying
5. When a palette is applied, these become flat hex colors (user can re-add gradient manually)

This approach is simple, honest about the complexity, and doesn't block the workflow.

## 9-Slice Preview Implementation (Agent Discretion)

**Recommendation: CSS overlay (not canvas)**

Use CSS absolute-positioned divs with dashed borders for slice visualization:
- Simpler implementation — no canvas API, no redraw logic
- Naturally responsive to container resize
- Slice percentages calculated from image natural dimensions and slice pixel values
- Update dashed line positions reactively when slice numbers change

The four dashed lines divide the thumbnail into a 3×3 grid matching the 9-slice concept. Red dashed lines for clear visibility on dark theme.

## Accordion Animation (Agent Discretion)

**Recommendation: CSS `max-height` transition**

```css
.group-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 200ms ease;
}
.group-content.expanded {
  max-height: 600px; /* generous upper bound */
}
```

Simple, performant, no JavaScript animation library needed. The 200ms duration matches the project's existing transition patterns.

## Modal Sizing and Positioning (Agent Discretion)

**Recommendation: Centered overlay with fixed dimensions**

Following the existing `AssetPickerModal.vue` pattern:
- **Palette modal:** ~560px wide × 500px tall (fits 4 algorithm cards in a 2×2 grid + color preview area)
- **9-Slice modal:** ~640px wide × 520px tall (needs space for 6 element tabs + image upload + slice controls + preview)
- Both use `<Teleport to="body">` + overlay backdrop (click-to-close)
- Dark background matching project style (`#252526` body, `#333` borders)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no test framework in project) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDT-01 | 🎨 主题 tab appears in editor navigation | manual | Visual check | N/A |
| EDT-02 | Color picker, font selector, radius slider, opacity slider work | manual | Visual check | N/A |
| EDT-03 | 9-slice image upload and slice config work | manual | Visual check | N/A |
| EDT-04 | Token changes instantly visible in iframe preview | manual | Visual check | N/A |
| EDT-05 | Palette generation → preview → one-click apply | manual | Visual check | N/A |

### Wave 0 Gaps
No test framework exists in this project. All validation is manual/visual. This is consistent with project conventions (no test infrastructure per STACK.md).

## Open Questions

1. **Palette doesn't cover `danger` and `danger-hover`**
   - What we know: generatePalette() outputs 34 keys, skipping these 2 color tokens
   - What's unclear: Should palette application set danger colors or leave them untouched?
   - Recommendation: Leave `danger` and `danger-hover` untouched — they are semantic (error/delete actions) and should stay red regardless of theme palette. This is a deliberate design choice.

2. **Gradient tokens after palette apply**
   - What we know: Palette generates flat hex for `dialogue-bg` and `title-bg`, replacing gradients
   - What's unclear: Is losing the gradient on palette apply acceptable?
   - Recommendation: Accept this trade-off. Document it. User can manually restore gradients via the text input. Phase 27 presets can include proper gradients.

3. **iframe initial scene for preview**
   - What we know: The iframe needs a `start` message with script data + sceneId to show any content
   - What's unclear: Which scene to show in the theme preview? User may have multiple scenes.
   - Recommendation: Send `start` with the first scene (same as initSelection in usePageEditor). The theme preview just needs any content to show token effects.

## Sources

### Primary (HIGH confidence)
- `src/engine/tokens.js` — 41 token vocabulary, 10 groups, exact default values
- `src/engine/ThemeManager.js` — 4 exports: applyTheme, resetTheme, applyNineSlice, resetNineSlice
- `src/engine/colorHarmony.js` — hexToHsl, hslToHex, 4 algorithms, generatePalette (34 keys)
- `src/engine/contrast.js` — contrastRatio, autoFix with binary search
- `src/editor/stores/script.js` — getTheme/updateTheme store methods (lines 113-127)
- `src/editor/App.vue` — tabs array (line 77-83), tabComponents (line 85-91)
- `src/editor/composables/usePageEditor.js` — iframe postMessage protocol reference
- `src/editor/views/PageEditor.vue` — iframe embedding pattern, keep-alive lifecycle
- `src/editor/views/SettingsDesigner.vue` — inspector panel pattern, `<input type="color">` usage
- `src/editor/components/resource-library/BgRemovalModal.vue` — FileReader.readAsDataURL base64 pattern
- `src/editor/components/resource-library/FontGrid.vue` — fontMeta usage pattern
- `src/editor/stores/assets.js` — fontFamilies computed, loadCategory
- `src/main.js:858-861` — `update-theme` postMessage handler in engine
- `.planning/phases/26-visual-theme-editor/26-CONTEXT.md` — 19 locked decisions

### Secondary (MEDIUM confidence)
- `.planning/phases/23-token-foundation/23-CONTEXT.md` — D-01 font priority, D-04 element > token > fallback
- `.planning/phases/24-thememanager-engine/24-CONTEXT.md` — D-01 sparse storage, D-10 update-theme protocol
- `.planning/phases/25-nine-slice-color-harmony/25-CONTEXT.md` — D-03 base64 Data URL, D-12 nineSlice schema

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed and verified in codebase
- Architecture: HIGH — patterns derived from existing codebase (PageEditor, SettingsDesigner, AssetPickerModal)
- Token analysis: HIGH — directly counted from tokens.js source and colorHarmony.js return values
- Pitfalls: HIGH — identified from actual code analysis (rgba/hex conversion, keep-alive behavior, undo history size)
- Controls classification: HIGH — derived from DEFAULT_TOKENS default value format analysis

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable — no external dependency changes expected)
