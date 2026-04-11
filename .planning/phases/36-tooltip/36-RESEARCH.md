# Phase 36: Tooltip 帮助系统 - Research

**Researched:** 2026-04-11
**Domain:** Vue 3 UI Enhancement — Tooltip/Help System
**Confidence:** HIGH

## Summary

Phase 36 adds a contextual help system to the Galgame Maker editor with two delivery modes: (1) a reusable `HelpTip.vue` component (? icon + hover bubble) for detailed configuration explanations, and (2) comprehensive `title` attribute coverage on all icon buttons and toolbar actions. Help content covers all 6 editor areas: theme editor, export, project settings, script editor, resource library, and title/settings page designers.

The codebase currently has **133 total buttons** across 48 Vue components. Of these, **28 already have Chinese `title` attributes** and **105 are missing titles**. Not all 105 need titles — some are textual buttons (e.g., "取消", "确认") whose labels are self-explanatory. The CONTEXT.md decision D-12 estimates ~88 buttons need title additions, which aligns with filtering out dialog close/cancel/confirm buttons and tab-like toggle buttons.

**Primary recommendation:** Build `HelpTip.vue` as a single-file, self-contained component with pure CSS positioning (no external tooltip library), create `helpTexts.js` as a flat keyed object following the existing `TOKEN_LABELS` pattern, then systematically sweep all editor components to add HelpTip instances and missing `title` attributes.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** ? 图标采用圆形底色 + 白色问号风格，类似 macOS 帮助按钮，使用统一强调色
- **D-02:** 帮助气泡智能定位 — 默认在 ? 图标右侧，边缘空间不足时自动翻转
- **D-03:** hover 触发 — 鼠标悬停显示，移开消失，最轻量交互
- **D-04:** 淡入淡出动画 — opacity 过渡，约 150ms
- **D-05:** 半透明暗色气泡配色 — 带微妙透明度，融入暗色主题界面
- **D-06:** 气泡最大宽度 240-280px，适合 2-3 行说明文本
- **D-07:** 纯文本内容 — 不支持富文本，多行用 \n 换行
- **D-08:** 无箭头指示器 — 纯圆角矩形，简洁现代
- **D-09:** 集中映射文件 — 新建 `src/editor/helpTexts.js`，所有帮助文本集中存储，组件通过 key 引用（延续 Phase 35 TOKEN_LABELS 模式）
- **D-10:** 按编辑区分组 — helpTexts.js 内部按 theme/export/settings/script/resource/title 分层组织
- **D-11:** 混合长度文本 — 简单配置项短说明（10-20 字），复杂功能详细说明（20-50 字），灵活处理
- **D-12:** 统一扫描 + 集中处理 — 一次性遍历所有组件，补全 ~88 个缺失 title 的按钮
- **D-13:** title 文本内联写死 — 直接在模板中写 `title="操作名"`，不引用 helpTexts.js
- **D-14:** 一个计划全部实施 — HelpTip 组件 + 所有区域帮助内容 + 按钮 title 补全在一个计划中完成
- **D-15:** ? 图标只加在配置项和复杂操作处 — 用户可能不懂的地方加 ? 图标，简单按钮只用 title

### Agent's Discretion
- 气泡具体 CSS 数值（圆角、padding、字号）由实现决定，保持与暗色主题协调
- 智能定位的具体翻转逻辑（viewport 边界检测算法）
- helpTexts.js 中具体的 key 命名规则

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HELP-01 | HelpTip 组件（? 图标模式）：鼠标悬停显示说明气泡，支持多行文本，统一视觉风格 | HelpTip.vue component design with CSS-only positioning, \n multiline support, dark theme bubble |
| HELP-02 | 按钮/工具栏 hover title 全覆盖：所有图标按钮和工具栏操作都有中文 title 属性 | Audit found 105 buttons without titles across 48 components; ~88 actionable per D-12 |
| HELP-03 | 主题编辑器帮助内容：调色盘生成器、九宫格配置、预设系统、各 token 分组的用途说明 | ThemeToolbar (4 btns with titles), PaletteModal, NineSliceModal, PresetModal, TokenAccordion (10 groups) |
| HELP-04 | 导出功能帮助内容：Web vs 桌面格式区别、ZIP 压缩说明、图标选择说明 | ExportModal.vue (15 buttons, multiple config fields needing HelpTip) |
| HELP-05 | 项目设置帮助内容：分辨率、项目名称等配置项说明 | ProjectSettings.vue (resolution, name, description fields) + DialogueBoxSettings.vue |
| HELP-06 | 剧本编辑器帮助内容：转场效果、语音匹配、角色管理等操作说明 | PageEditor.vue, PageInspector.vue (13 buttons), SceneTree.vue (voice match, scene jump), CanvasToolbar.vue |
| HELP-07 | 资源库帮助内容：格式要求、背景去除工具、字体导入说明 | ResourceLibrary.vue, CharacterEditor.vue, FontGrid.vue, BgRemovalModal.vue, AssetGrid.vue |
| HELP-08 | 标题页/设置页设计器帮助内容：预制组件用途、拖拽定位、属性配置说明 | TitleDesigner.vue (9 buttons), SettingsDesigner.vue (4 buttons), palette panels, property inspectors |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | SFC component framework | Already in project, all editor components use `<script setup>` |
| Pure CSS | — | Tooltip bubble styling + animation | D-04/D-05/D-08 specify CSS transitions, no library needed |

### Supporting
No additional libraries needed. This phase is purely CSS + Vue template work.

### Don't Hand-Roll
| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Complex tooltip positioning library | Full portal/teleport system | Simple CSS absolute positioning + JS getBoundingClientRect() viewport check | D-02 only needs flip logic for edge cases; Teleport adds complexity |
| External tooltip library (Tippy.js, Floating UI) | npm dependency | Self-contained HelpTip.vue | Project has zero UI library dependencies; one component with CSS is simpler |
| i18n framework | vue-i18n or similar | Hardcoded Chinese strings in helpTexts.js | D-09 explicitly chose centralized mapping, project is Chinese-only (REQUIREMENTS Out of Scope) |

## Architecture Patterns

### New File Structure
```
src/editor/
├── helpTexts.js              # NEW: centralized help text mapping
├── components/
│   ├── HelpTip.vue           # NEW: ? icon + hover bubble component
│   └── ... (existing files get HelpTip imports + title attrs)
```

### Pattern 1: HelpTip.vue Component Design
**What:** Self-contained Vue 3 SFC with `<script setup>`, accepting a `textKey` prop (or `text` directly), rendering a ? icon that shows a positioned bubble on hover.
**When to use:** Next to configuration labels, complex features, and anywhere users might need explanation.

**Recommended API:**
```vue
<!-- Usage in parent component -->
<HelpTip text="选择主色后，系统会自动生成\n与之协调的完整配色方案" />

<!-- Or with key from helpTexts.js -->
<HelpTip :text="HELP.theme.paletteGenerator" />
```

**Component props:**
```javascript
defineProps({
  text: { type: String, required: true },  // Help text content (\n for multiline)
  placement: { type: String, default: 'right' },  // 'right' | 'left' | 'top' | 'bottom'
});
```

**Implementation approach:**
```vue
<template>
  <span class="help-tip" @mouseenter="show = true" @mouseleave="show = false" ref="triggerRef">
    <span class="help-tip-icon">?</span>
    <Transition name="help-tip-fade">
      <div v-if="show" class="help-tip-bubble" :style="bubbleStyle" ref="bubbleRef">
        <template v-for="(line, i) in lines" :key="i">
          {{ line }}<br v-if="i < lines.length - 1" />
        </template>
      </div>
    </Transition>
  </span>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';

const props = defineProps({
  text: { type: String, required: true },
  placement: { type: String, default: 'right' },
});

const show = ref(false);
const triggerRef = ref(null);
const bubbleRef = ref(null);
const flip = ref(false);

const lines = computed(() => props.text.split('\n'));

// Smart positioning: flip when near viewport edge
const bubbleStyle = computed(() => {
  // Computed dynamically after show=true via nextTick check
  return {};
});

watch(show, async (val) => {
  if (!val) return;
  await nextTick();
  if (!triggerRef.value || !bubbleRef.value) return;
  const triggerRect = triggerRef.value.getBoundingClientRect();
  const bubbleRect = bubbleRef.value.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Flip if overflowing right edge
  flip.value = (triggerRect.right + bubbleRect.width + 8) > vw;
});
</script>
```

**CSS approach (D-04, D-05, D-06, D-08):**
```css
.help-tip {
  display: inline-flex;
  align-items: center;
  position: relative;
  cursor: help;
}
.help-tip-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007acc;  /* project accent color */
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.help-tip-bubble {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: rgba(30, 30, 30, 0.95);
  color: #ddd;
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 12px;
  border-radius: 6px;
  max-width: 260px;
  width: max-content;
  z-index: 1000;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
/* Flipped (left side) */
.help-tip-bubble.flipped {
  left: auto;
  right: calc(100% + 8px);
}
/* D-04: fade animation 150ms */
.help-tip-fade-enter-active,
.help-tip-fade-leave-active {
  transition: opacity 0.15s ease;
}
.help-tip-fade-enter-from,
.help-tip-fade-leave-to {
  opacity: 0;
}
```

### Pattern 2: helpTexts.js Centralized Mapping (D-09, D-10)
**What:** Single JS file exporting a flat or nested object with all help text strings, organized by editor area.
**When to use:** Every HelpTip instance imports from this file.

**Structure (following TOKEN_LABELS pattern from TokenAccordion.vue):**
```javascript
/**
 * Centralized help text mapping for the editor.
 * Organized by editor area per D-10.
 * @module editor/helpTexts
 */

// ─── 主题编辑器 ──────────────────────────────────────
export const HELP_THEME = {
  paletteGenerator: '选择一个主色，系统自动生成\n与之协调的完整配色方案',
  nineSlice: '为对话框、面板等 UI 元素\n配置九宫格拉伸背景图',
  presets: '选择内置主题预设或\n导入/导出自定义主题包',
  tokenGroupCore: '控制界面的主要色调，\n影响按钮、标题、强调色等',
  // ... more keys
};

// ─── 导出功能 ────────────────────────────────────────
export const HELP_EXPORT = {
  formatDifference: '网页版：生成 HTML 文件，可在浏览器中运行\n桌面版：打包为独立 .exe 应用',
  zipToggle: '启用后将输出目录打包为\n单个 ZIP 压缩文件',
  favicon: '浏览器标签页上显示的小图标\n推荐使用 .ico 或 .png 格式',
  desktopIcon: '桌面版游戏的应用图标\n需要 PNG 格式，推荐 256×256 以上',
};

// ─── 项目设置 ────────────────────────────────────────
export const HELP_SETTINGS = {
  resolution: '游戏画面的分辨率\n推荐 1280×720（16:9）',
  projectName: '项目名称，也是默认的游戏标题',
  dialogueFont: '设置游戏对话框的字体样式\n影响所有对话和名牌显示',
};

// ─── 剧本编辑器 ──────────────────────────────────────
export const HELP_SCRIPT = {
  transition: '页面切换时的过渡动画效果\n时长可自定义（毫秒）',
  voiceMatch: '根据文件名自动匹配语音\n命名格式：场景名_页码.mp3',
  sceneJump: '场景结束后自动跳转到\n指定的下一个场景',
  choicePage: '选择页包含多个选项按钮\n每个选项可链接到不同场景',
};

// ─── 资源库 ──────────────────────────────────────────
export const HELP_RESOURCE = {
  imageFormats: '支持 PNG、JPG、WebP 格式\n拖拽或点击导入按钮添加',
  audioFormats: '支持 MP3、OGG、WAV 格式\n建议 BGM 使用 MP3 以节省空间',
  fontFormats: '支持 TTF、OTF、WOFF、WOFF2\n导入后可在字体选择器中使用',
  bgRemoval: '点击图片上的背景色取色\n调整容差和羽化值去除纯色背景',
  characterExpr: '每个角色可添加多个表情差分\n在剧本编辑器中按页面切换表情',
};

// ─── 标题页/设置页设计器 ─────────────────────────────
export const HELP_DESIGNER = {
  presetButtons: '拖拽预制按钮到画布上\n每种按钮只能放置一个',
  textLabel: '可自由拖拽定位的文字标签\n用于添加标题或装饰文字',
  decorImage: '装饰图片元素\n支持从资源库选择图片',
  settingComponents: '拖拽设置组件到画布上\n玩家在游戏中可交互调节',
  layerOrder: '调整元素的上下层级\n上层元素会遮挡下层',
  canvasBackground: '设置页面的背景图片\n从资源库的背景分类中选择',
};
```

### Pattern 3: Button Title Convention (D-13)
**What:** Inline Chinese `title` attributes directly in template, not referencing helpTexts.js.
**When to use:** Every icon button and toolbar action that doesn't have text labels already.

**Rules for which buttons get titles:**
- ✅ Icon-only buttons (emoji + no text): Always need title
- ✅ Icon + text buttons with ambiguous text: Need title for extra context
- ❌ Clearly labeled text buttons ("取消", "确认", "关闭"): Skip
- ❌ Dialog close (×) buttons: Skip (obvious function)
- ❌ Tab buttons with labels: Skip (already clear)

### Anti-Patterns to Avoid
- **Don't import helpTexts in every component:** Components that only add `title=""` attributes don't need helpTexts.js. Only import where HelpTip is used.
- **Don't use Teleport for bubbles:** The bubble should be positioned relative to the ? icon via CSS absolute positioning, not teleported to body. This keeps the component self-contained and avoids z-index wars.
- **Don't use click-to-show:** D-03 explicitly chose hover. Click-to-show adds state management complexity and accessibility concerns for a help tooltip.
- **Don't add HelpTip to simple obvious buttons:** D-15 says ? icons only for config items and complex operations. Simple buttons just get `title` attributes.

## Common Pitfalls

### Pitfall 1: Tooltip Overflow / Clipping
**What goes wrong:** The help bubble gets clipped by a parent with `overflow: hidden` or `overflow-y: auto` (like `.token-scroll` in ThemeDesigner).
**Why it happens:** CSS `position: absolute` is contained by the nearest positioned ancestor, and many panels use `overflow: auto` for scrolling.
**How to avoid:** Set `overflow: visible` on the direct parent of HelpTip, or use a fixed-position approach that checks `getBoundingClientRect()` and positions relative to the viewport instead. The simplest fix: use `position: fixed` for the bubble and calculate coordinates from the trigger element's viewport rect.
**Warning signs:** Bubble partially visible or completely hidden when used inside scrollable panels.

### Pitfall 2: Z-Index Stacking Context
**What goes wrong:** Help bubbles appear behind modals, overlays, or other high-z-index elements.
**Why it happens:** The editor uses `z-index: 2000` for ExportModal overlay. If HelpTip z-index is lower, bubbles inside modals won't show.
**How to avoid:** Use `z-index: 9999` for help bubbles, or better yet use `position: fixed` which creates its own stacking context at the document level.
**Warning signs:** Bubbles not visible inside modal dialogs.

### Pitfall 3: Hover Flicker on Small Gap
**What goes wrong:** Moving mouse from ? icon to bubble causes flicker (bubble disappears because mouse briefly leaves the trigger element).
**Why it happens:** If there's a gap between the icon and bubble, the `mouseleave` fires on the icon before `mouseenter` on the bubble.
**How to avoid:** Since D-03 says "move away = disappear" and the bubble should use `pointer-events: none`, this isn't an issue — the bubble is not interactive. Just ensure the hover zone is on the wrapping `<span>` that contains both icon and bubble.
**Warning signs:** Bubble rapidly shows/hides when hovering.

### Pitfall 4: Inconsistent Title Text Style
**What goes wrong:** Some titles are verbose ("点击此按钮可以XXX"), others are terse ("保存").
**Why it happens:** Multiple files edited without a style guide.
**How to avoid:** Establish a convention: `title` attributes should be 2-6 Chinese characters describing the action, optionally with keyboard shortcut in parentheses (e.g., `title="保存 (Ctrl+S)"`). Keep consistent across all components.
**Warning signs:** Wide variance in title length and style across the codebase.

### Pitfall 5: Missing \n Rendering
**What goes wrong:** `\n` shows as literal text instead of line breaks in the bubble.
**Why it happens:** Vue template interpolation renders `\n` as text, not as HTML line breaks.
**How to avoid:** Split text by `\n` in the component and render with `<br>` tags between lines (as shown in the code example above), or use `white-space: pre-line` CSS property.
**Warning signs:** Help text showing `\n` characters to users.

## Code Examples

### Example 1: HelpTip Usage in a Form Group
```vue
<!-- In ProjectSettings.vue -->
<label>
  分辨率
  <HelpTip :text="HELP_SETTINGS.resolution" />
  <div class="resolution-group">
    <input type="number" v-model.number="project.projectData.resolution.width" />
    × 
    <input type="number" v-model.number="project.projectData.resolution.height" />
  </div>
</label>
```

### Example 2: HelpTip Next to Section Header
```vue
<!-- In ThemeDesigner/TokenAccordion area -->
<ThemeToolbar
  @open-palette="editor.showPalette.value = true"
  @open-nine-slice="editor.showNineSlice.value = true"
  @open-preset="editor.showPreset.value = true"
/>
<!-- HelpTip goes next to the toolbar or inside ThemeToolbar -->
```

### Example 3: Button Title Addition
```vue
<!-- Before (no title) -->
<button class="import-btn" @click="onImportClick">📂 导入文件</button>

<!-- After (with title) -->
<button class="import-btn" @click="onImportClick" title="导入文件到当前分类">📂 导入文件</button>
```

### Example 4: helpTexts.js Import Pattern
```javascript
// In a component that uses HelpTip
import HelpTip from '../components/HelpTip.vue';
import { HELP_THEME } from '../helpTexts.js';

// In template:
// <HelpTip :text="HELP_THEME.paletteGenerator" />
```

## Button Audit Summary

### Current State (Verified by Codebase Scan)
| Metric | Count |
|--------|-------|
| Total buttons in editor | 133 |
| Buttons WITH title | 28 |
| Buttons WITHOUT title | 105 |
| Estimated actionable (need title) | ~88 (per D-12) |
| Non-actionable (text buttons, dialog close, tabs) | ~17 |

### Buttons Already Having Titles (No Change Needed)
| Component | Buttons with Title | Notes |
|-----------|-------------------|-------|
| App.vue | 4 | 返回首页, 撤销, 重做, 保存 |
| ThemeToolbar.vue | 4 | 重置主题, 调色盘生成器, 九宫格配置, 主题预设 |
| CanvasToolbar.vue | 3 | 试玩, 停止试玩, 静音/取消静音 |
| PageInspector.vue | 6 | 清除背景, 清除BGM, 清除音效, 移除角色, 删除选项, etc. |
| PageEditor.vue | 1 | 停止试玩 (overlay) |
| SceneTree.vue | 2 | 批量语音匹配, 场景操作 |
| PresetModal.vue | 2 | 导出主题, 导入主题 |
| ExportModal.vue | 2 | 清除 (favicon), 清除 (icon) |
| ContrastBadge.vue | 1 | 自动修复对比度 |
| DialogueBoxSettings.vue | 2 | 重置为默认 (×2) |

### Components with Most Buttons Needing Titles
| Component | Buttons Without Title | Priority |
|-----------|----------------------|----------|
| ExportModal.vue | 13 | HIGH (HELP-04) |
| PageInspector.vue | 7 | HIGH (HELP-06) |
| TitleDesigner.vue | 9 | HIGH (HELP-08) |
| Scenes.vue | 10 | MEDIUM (legacy view) |
| SettingsDesigner.vue | 4 | HIGH (HELP-08) |
| CharacterEditor.vue | 4 | HIGH (HELP-07) |
| SceneTree.vue | 3 | HIGH (HELP-06) |
| ResourceLibrary.vue | 2 | MEDIUM (HELP-07) |
| PaletteModal.vue | 3 | MEDIUM (HELP-03) |
| NineSliceModal.vue | 3 | MEDIUM (HELP-03) |

### HelpTip Placement Targets (? icon needed)
Based on D-15 (? icons only for config items and complex operations):

| Area | Target Location | Help Key Purpose |
|------|----------------|-----------------|
| Theme Editor | Next to "调色盘" toolbar button area | Explain palette generator concept |
| Theme Editor | Inside token group headers | Explain what each token group controls |
| Theme Editor | Near 九宫格 section | Explain nine-slice image concept |
| Theme Editor | Near 预设 section | Explain preset system + import/export |
| Export | Format toggle (网页版/桌面版) | Explain difference between formats |
| Export | ZIP toggle | Explain compression option |
| Export | Favicon / Icon field | Explain favicon and icon purpose |
| Project Settings | Resolution field | Explain resolution impact |
| Project Settings | Dialogue box font section header | Explain font settings scope |
| Script Editor | Transition dropdown | Explain transition effects |
| Script Editor | Voice match button area | Explain batch voice matching |
| Script Editor | Scene jump badge | Explain scene jumping |
| Resource Library | Import button area or section header | Explain supported formats |
| Resource Library | BgRemoval modal controls | Explain tolerance/feather |
| Resource Library | Font tab header | Explain font import process |
| Title Designer | Preset buttons palette header | Explain drag-to-canvas workflow |
| Title Designer | Layer order buttons | Explain z-order concept |
| Settings Designer | Setting components palette header | Explain preset component types |

Estimated **~20-25 HelpTip instances** across all 6 editor areas.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test framework in project |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HELP-01 | HelpTip renders ? icon, shows bubble on hover, hides on leave | manual-only | Visual interaction — no test framework | ❌ |
| HELP-02 | All icon buttons have title attributes | manual-only | `grep -r '<button' src/editor/ \| grep -v 'title='` (audit) | ❌ |
| HELP-03 | Theme editor help content appears correctly | manual-only | Visual inspection | ❌ |
| HELP-04 | Export help content appears correctly | manual-only | Visual inspection | ❌ |
| HELP-05 | Project settings help content appears correctly | manual-only | Visual inspection | ❌ |
| HELP-06 | Script editor help content appears correctly | manual-only | Visual inspection | ❌ |
| HELP-07 | Resource library help content appears correctly | manual-only | Visual inspection | ❌ |
| HELP-08 | Designer help content appears correctly | manual-only | Visual inspection | ❌ |

**Justification for manual-only:** This phase is purely UI-presentational (tooltips and title attributes). The project has no test framework, and the requirements are visual in nature (hover interactions, text content display). Automated testing would require a test framework setup + component mounting + hover simulation, which exceeds the value for a LOW-risk pure-UI phase.

### Sampling Rate
- **Per task commit:** Manual visual check — hover over HelpTip instances, verify bubble appears and content is correct
- **Per wave merge:** `grep -r '<button' src/editor/ | grep -v 'title='` — verify button title coverage
- **Phase gate:** Visual sweep of all 6 editor areas + button title audit grep

### Wave 0 Gaps
None — no test infrastructure needed for this manual-only validation phase.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External tooltip libraries (Tippy.js, v-tooltip) | CSS-only or minimal JS position calculation | 2024+ | No dependency overhead, simpler for static help text |
| HTML `title` attribute alone | Custom tooltip components | Always | title has OS-dependent styling, slow 300ms+ delay; custom gives instant, styled feedback |
| Separate docs/help pages | Inline contextual tooltips | UX trend | Users get help exactly where they need it without leaving context |

**Note:** The project's `title` attribute approach for simple buttons is fine — browsers show native tooltips which are sufficient for icon label hints. The HelpTip component is for longer explanatory text where native title would be too limited.

## Open Questions

1. **Exact HelpTip placement in token groups**
   - What we know: 10 token groups exist (core, text, borders, backgrounds, buttons, fonts, radii, blur, controls, speaker)
   - What's unclear: Does each group header get a HelpTip, or only the non-obvious ones?
   - Recommendation: Add HelpTip to the 5-6 less obvious groups (core, backgrounds, buttons, controls, blur, speaker), skip self-explanatory ones (text, borders, fonts, radii)

2. **HelpTip positioning strategy: fixed vs absolute**
   - What we know: Many panels use `overflow: auto/hidden`; absolute positioning may clip bubbles
   - What's unclear: Whether `position: fixed` with viewport-relative coords works reliably in all panel layouts
   - Recommendation: Use `position: fixed` for the bubble, calculate position from `getBoundingClientRect()` on the trigger icon. This avoids all overflow clipping issues.

## Sources

### Primary (HIGH confidence)
- **Codebase scan** — All 48 Vue components in `src/editor/` examined for button counts, existing title attributes, and component structure
- **TokenAccordion.vue** — TOKEN_LABELS pattern (lines 66-118) verified as reference for helpTexts.js design
- **CONTEXT.md (36-CONTEXT.md)** — All 15 locked decisions (D-01 through D-15) defining component design

### Secondary (MEDIUM confidence)
- **Vue 3 Transition component** — `<Transition name="">` pattern for fade animation, standard Vue 3 API
- **CSS `position: fixed` + `getBoundingClientRect()`** — Standard DOM API for viewport-relative positioning

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all Vue 3 + CSS patterns already used in project
- Architecture: HIGH — HelpTip.vue is a standard Vue SFC, helpTexts.js follows TOKEN_LABELS precedent
- Pitfalls: HIGH — overflow/z-index/flicker are well-known tooltip challenges with documented solutions
- Content coverage: MEDIUM — exact HelpTip placement locations require implementation judgment per D-15

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable — no moving dependencies)
