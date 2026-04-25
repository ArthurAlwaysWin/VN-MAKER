# Editor Tab Reorganization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize editor from 8 feature-based tabs to 8 game-page-based tabs, consolidating all per-page configuration into single tabs with iframe preview.

**Architecture:** Refactor useScreenLayoutEditor to accept a fixed screenId, create 4 new view components (3 single-screen wrappers + 1 merged settings page editor), extend ProjectSettings with theme editor integration, add `show-screen` postMessage handler in engine, update App.vue tab definitions.

**Tech Stack:** Vue 3 (Composition API, provide/inject), Vite, pure JavaScript (ES Modules), iframe postMessage

**Spec:** `docs/superpowers/specs/2026-04-19-editor-tab-reorganization-design.md`

---

## Chunk 1: Engine + Composable Foundation

### Task 1: Add `show-screen` handler to engine main.js

**Files:**
- Modify: `src/main.js:974-984` (inside `handlePreviewMessage` switch)

- [ ] **Step 1: Add the show-screen case to handlePreviewMessage**

Insert after the `update-screen-layout` case (line 983):

```javascript
      case 'show-screen': {
        switch (msg.screenId) {
          case 'settingsScreen': settingsScreen.show(); break;
          case 'gameMenu': gameMenu.show(); break;
          case 'saveLoadScreen': saveLoadScreen.show('save', 'preview'); break;
          case 'backlogScreen': backlogScreen.show([], {}); break;
        }
        break;
      }
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds (or at least no syntax errors in main.js)

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: add show-screen postMessage handler for per-tab preview

Engine responds to 'show-screen' by opening the specified game screen.
Used by new per-page editor tabs to show the correct preview.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Refactor useScreenLayoutEditor to support fixed screenId

**Files:**
- Modify: `src/editor/composables/useScreenLayoutEditor.js`

- [ ] **Step 1: Update createScreenLayoutEditor to accept optional fixed screenId**

Change the function signature and add auto-show-screen logic:

```javascript
export function createScreenLayoutEditor(fixedScreenId) {
  const script = useScriptStore();

  const iframeRef = ref(null);
  const isEngineReady = ref(false);
  const activeScreen = ref(fixedScreenId || 'saveLoadScreen');

  // ... (all existing code unchanged until onEngineMessage)

  function onEngineMessage(event) {
    if (!event.data || !event.data.type) return;
    if (iframeRef.value && event.source !== iframeRef.value.contentWindow) return;

    if (event.data.type === 'ready') {
      isEngineReady.value = true;
      event.source?.postMessage({ type: 'ack-preview' }, '*');
      startEngine();
      flushPreview();
      // Auto-show the target screen in the iframe
      if (fixedScreenId) {
        iframeRef.value?.contentWindow?.postMessage({
          type: 'show-screen',
          screenId: fixedScreenId,
        }, '*');
      }
    }
  }

  // ... rest unchanged
}
```

Key changes:
1. Add `fixedScreenId` parameter to `createScreenLayoutEditor(fixedScreenId)`
2. Initialize `activeScreen` with `fixedScreenId || 'saveLoadScreen'`
3. After engine ready, send `show-screen` postMessage if `fixedScreenId` is set
4. Update error message in `useScreenLayoutEditor()` inject to be generic: `'useScreenLayoutEditor() must be used inside a screen layout provider'`

- [ ] **Step 2: Verify existing ScreenLayoutEditor still works** (it passes no arg, so `fixedScreenId` is undefined — same behavior)

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/editor/composables/useScreenLayoutEditor.js
git commit -m "refactor: support fixed screenId in createScreenLayoutEditor

Accept optional fixedScreenId parameter. When set, locks activeScreen
and auto-sends show-screen postMessage after engine ready.
Backward compatible - no arg = original behavior.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Create useSettingsPageEditor composable

**Files:**
- Create: `src/editor/composables/useSettingsPageEditor.js`

- [ ] **Step 1: Create the composable**

This composable coordinates widget styles + screen layout for the settings screen in a single iframe. It merges patterns from `useWidgetStylesEditor.js` and `useScreenLayoutEditor.js`:

```javascript
/**
 * Settings Page Editor composable — unified state for the merged settings page tab.
 *
 * Coordinates widget styles and screen layout (settingsScreen) editing
 * through a single iframe with debounced postMessage batching.
 * Theme tokens are managed by ProjectSettings — not this composable.
 *
 * @module composables/useSettingsPageEditor
 */

import { ref, provide, inject, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { WIDGET_DEFAULTS } from '../../engine/widgetDefaults.js';

const SETTINGS_PAGE_EDITOR_KEY = Symbol('settingsPageEditor');

export function createSettingsPageEditor() {
  const script = useScriptStore();

  const iframeRef = ref(null);
  const isEngineReady = ref(false);

  let debounceTimer = null;

  // ─── Screen Layout (settingsScreen) ────────────────

  function getScreenConfig() {
    return script.getSettingsScreen();
  }

  function setScreenField(field, value) {
    const cfg = getScreenConfig();
    if (!cfg) return;
    cfg[field] = value;
    schedulePreview();
  }

  function setScreenNestedField(group, field, value) {
    const cfg = getScreenConfig();
    if (!cfg) return;
    cfg[group] ??= {};
    cfg[group][field] = value;
    schedulePreview();
  }

  function commitScreenLayout() {
    const cfg = getScreenConfig();
    if (!cfg) return;
    script.updateSettingsScreen(JSON.parse(JSON.stringify(cfg)));
    flushPreview();
  }

  // ─── Widget Styles ─────────────────────────────────

  function setWidgetField(category, field, value) {
    const ws = script.getWidgetStyles();
    if (!ws) return;
    ws[category] ??= {};
    ws[category][field] = value;
    schedulePreview();
  }

  function commitWidgetStyles() {
    const ws = script.getWidgetStyles();
    if (!ws) return;
    script.updateWidgetStyles(JSON.parse(JSON.stringify(ws)));
    flushPreview();
  }

  // ─── Preview Communication ─────────────────────────

  function schedulePreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
      const win = iframeRef.value.contentWindow;
      // Send screen layout
      const cfg = getScreenConfig();
      if (cfg) {
        win.postMessage({
          type: 'update-screen-layout',
          screen: 'settingsScreen',
          config: JSON.parse(JSON.stringify(cfg)),
        }, '*');
      }
      // Send widget styles
      const ws = script.getWidgetStyles();
      if (ws) {
        win.postMessage({
          type: 'update-widget-styles',
          widgetStyles: JSON.parse(JSON.stringify(ws)),
        }, '*');
      }
    }, 200);
  }

  function flushPreview() {
    clearTimeout(debounceTimer);
    if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
    const win = iframeRef.value.contentWindow;
    const cfg = getScreenConfig();
    if (cfg) {
      win.postMessage({
        type: 'update-screen-layout',
        screen: 'settingsScreen',
        config: JSON.parse(JSON.stringify(cfg)),
      }, '*');
    }
    const ws = script.getWidgetStyles();
    if (ws) {
      win.postMessage({
        type: 'update-widget-styles',
        widgetStyles: JSON.parse(JSON.stringify(ws)),
      }, '*');
    }
  }

  function startEngine() {
    if (!iframeRef.value?.contentWindow) return;
    if (!script.data) return;
    const snapshot = JSON.parse(JSON.stringify(script.data));
    const firstSceneId = Object.keys(script.data.scenes || {})[0] || null;
    iframeRef.value.contentWindow.postMessage({
      type: 'start',
      script: snapshot,
      sceneId: firstSceneId,
      pageIndex: 0,
      previewMode: true,
    }, '*');
  }

  function onEngineMessage(event) {
    if (!event.data || !event.data.type) return;
    if (iframeRef.value && event.source !== iframeRef.value.contentWindow) return;

    if (event.data.type === 'ready') {
      isEngineReady.value = true;
      event.source?.postMessage({ type: 'ack-preview' }, '*');
      startEngine();
      flushPreview();
      // Show settings screen in preview
      iframeRef.value?.contentWindow?.postMessage({
        type: 'show-screen',
        screenId: 'settingsScreen',
      }, '*');
    }
  }

  function cleanup() {
    clearTimeout(debounceTimer);
  }

  onBeforeUnmount(cleanup);

  const editor = {
    iframeRef,
    isEngineReady,
    WIDGET_DEFAULTS,
    // Screen layout
    getScreenConfig,
    setScreenField,
    setScreenNestedField,
    commitScreenLayout,
    // Widget styles
    setWidgetField,
    commitWidgetStyles,
    // Preview
    schedulePreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  };

  provide(SETTINGS_PAGE_EDITOR_KEY, editor);
  return editor;
}

export function useSettingsPageEditor() {
  const editor = inject(SETTINGS_PAGE_EDITOR_KEY);
  if (!editor) throw new Error('useSettingsPageEditor() must be used inside SettingsPageEditor');
  return editor;
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds (file not yet imported anywhere, just needs to be valid)

- [ ] **Step 3: Commit**

```bash
git add src/editor/composables/useSettingsPageEditor.js
git commit -m "feat: add useSettingsPageEditor composable

Unified composable coordinating widget styles + screen layout
for the merged settings page tab. Single iframe, batched preview.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Chunk 2: New View Components

### Task 4: Create GameMenuEditor.vue

**Files:**
- Create: `src/editor/views/GameMenuEditor.vue`

- [ ] **Step 1: Create the view component**

```vue
<template>
  <div class="screen-editor" v-if="script.data">
    <div class="se-panel">
      <div class="se-panel-header">
        <span class="se-panel-title">🎮 游戏菜单</span>
      </div>
      <div class="se-scroll">
        <GameMenuSection />
      </div>
    </div>
    <div class="se-preview">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createScreenLayoutEditor } from '../composables/useScreenLayoutEditor.js';
import GameMenuSection from '../components/layout/GameMenuSection.vue';

const script = useScriptStore();
const editor = createScreenLayoutEditor('gameMenu');

function onIframeRef(el) {
  editor.iframeRef.value = el;
}

onMounted(() => {
  window.addEventListener('message', editor.onEngineMessage);
});

onActivated(() => {
  if (editor.isEngineReady.value) {
    editor.startEngine();
    editor.flushPreview();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('message', editor.onEngineMessage);
});
</script>

<style scoped>
.screen-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.se-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.se-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #333;
  background: #2d2d2d;
}
.se-panel-title {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}
.se-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px 12px;
}
.se-preview {
  flex: 1;
  display: flex;
  background: #000;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/editor/views/GameMenuEditor.vue
git commit -m "feat: add GameMenuEditor view component

Standalone tab for game menu layout editing with iframe preview.
Uses createScreenLayoutEditor('gameMenu') for fixed screen.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: Create SaveLoadEditor.vue

**Files:**
- Create: `src/editor/views/SaveLoadEditor.vue`

- [ ] **Step 1: Create the view component**

Same pattern as GameMenuEditor but with `createScreenLayoutEditor('saveLoadScreen')` and `SaveLoadSection`:

```vue
<template>
  <div class="screen-editor" v-if="script.data">
    <div class="se-panel">
      <div class="se-panel-header">
        <span class="se-panel-title">📋 存读档</span>
      </div>
      <div class="se-scroll">
        <SaveLoadSection />
      </div>
    </div>
    <div class="se-preview">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createScreenLayoutEditor } from '../composables/useScreenLayoutEditor.js';
import SaveLoadSection from '../components/layout/SaveLoadSection.vue';

const script = useScriptStore();
const editor = createScreenLayoutEditor('saveLoadScreen');

function onIframeRef(el) {
  editor.iframeRef.value = el;
}

onMounted(() => {
  window.addEventListener('message', editor.onEngineMessage);
});

onActivated(() => {
  if (editor.isEngineReady.value) {
    editor.startEngine();
    editor.flushPreview();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('message', editor.onEngineMessage);
});
</script>

<style scoped>
.screen-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.se-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.se-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #333;
  background: #2d2d2d;
}
.se-panel-title {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}
.se-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px 12px;
}
.se-preview {
  flex: 1;
  display: flex;
  background: #000;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/editor/views/SaveLoadEditor.vue
git commit -m "feat: add SaveLoadEditor view component

Standalone tab for save/load screen layout editing with iframe preview.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 6: Create BacklogEditor.vue

**Files:**
- Create: `src/editor/views/BacklogEditor.vue`

- [ ] **Step 1: Create the view component**

Same pattern with `createScreenLayoutEditor('backlogScreen')` and `BacklogSection`:

```vue
<template>
  <div class="screen-editor" v-if="script.data">
    <div class="se-panel">
      <div class="se-panel-header">
        <span class="se-panel-title">📖 回想</span>
      </div>
      <div class="se-scroll">
        <BacklogSection />
      </div>
    </div>
    <div class="se-preview">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createScreenLayoutEditor } from '../composables/useScreenLayoutEditor.js';
import BacklogSection from '../components/layout/BacklogSection.vue';

const script = useScriptStore();
const editor = createScreenLayoutEditor('backlogScreen');

function onIframeRef(el) {
  editor.iframeRef.value = el;
}

onMounted(() => {
  window.addEventListener('message', editor.onEngineMessage);
});

onActivated(() => {
  if (editor.isEngineReady.value) {
    editor.startEngine();
    editor.flushPreview();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('message', editor.onEngineMessage);
});
</script>

<style scoped>
.screen-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.se-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.se-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #333;
  background: #2d2d2d;
}
.se-panel-title {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}
.se-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px 12px;
}
.se-preview {
  flex: 1;
  display: flex;
  background: #000;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/editor/views/BacklogEditor.vue
git commit -m "feat: add BacklogEditor view component

Standalone tab for backlog screen layout editing with iframe preview.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 7: Create SettingsPageEditor.vue

**Files:**
- Create: `src/editor/views/SettingsPageEditor.vue`

This is the largest new component. It combines all settings page config into collapsible sections with a unified iframe preview.

- [ ] **Step 1: Create the view component**

```vue
<template>
  <div class="settings-page-editor" v-if="script.data">
    <!-- Left panel: 360px scrollable form -->
    <div class="sp-panel">
      <div class="sp-panel-header">
        <span class="sp-panel-title">⚙️ 设置页</span>
      </div>
      <div class="sp-scroll">
        <!-- Section 1: Tab Structure -->
        <div class="sp-section">
          <button class="sp-section-header" @click="toggle('tabs')">
            <span class="sp-section-arrow">{{ expanded.tabs ? '▼' : '▶' }}</span>
            <span class="sp-section-label">📌 Tab 结构</span>
          </button>
          <div v-if="expanded.tabs" class="sp-section-body">
            <!-- Title bar config (from SettingsSection) -->
            <h4 class="form-group-title">标题栏</h4>
            <div class="config-row">
              <label class="config-label">标题文字</label>
              <input type="text" :value="title.text || ''" @input="onTitle('text', $event.target.value || null)" @change="commitLayout" class="config-text" placeholder="系统设定" />
            </div>
            <div class="config-row">
              <label class="config-label">标题颜色</label>
              <input type="color" :value="rgbaToHex(title.color)" @input="onTitle('color', $event.target.value)" @change="commitLayout" class="color-picker" />
            </div>
            <div class="config-row">
              <label class="config-label">标题字号</label>
              <input type="number" :value="title.fontSize ?? ''" @input="onTitleNum('fontSize', $event)" @change="commitLayout" min="12" max="48" class="config-num" placeholder="28" />
              <span class="unit">px</span>
            </div>
            <div class="config-row">
              <label class="config-label">标题栏高度</label>
              <input type="number" :value="hdr.height ?? ''" @input="onNestedNum('header', 'height', $event)" @change="commitLayout" min="40" max="200" class="config-num" placeholder="90" />
              <span class="unit">px</span>
            </div>
            <div class="config-row">
              <label class="config-label">标题背景图</label>
              <input type="text" :value="hdr.backgroundImage || ''" @input="onNested('header', 'backgroundImage', $event.target.value || null)" @change="commitLayout" class="config-text" placeholder="图片路径" />
            </div>
            <!-- Tab CRUD + matrix (reused sub-components) -->
            <TabCrudSection />
            <SettingMatrix />
          </div>
        </div>

        <!-- Section 2: Layout & Row Styling -->
        <div class="sp-section">
          <button class="sp-section-header" @click="toggle('layout')">
            <span class="sp-section-arrow">{{ expanded.layout ? '▼' : '▶' }}</span>
            <span class="sp-section-label">📐 布局与行样式</span>
          </button>
          <div v-if="expanded.layout" class="sp-section-body">
            <!-- Content area positioning (from SettingsSection) -->
            <h4 class="form-group-title">内容区</h4>
            <div class="config-row">
              <label class="config-label">X</label>
              <input type="number" :value="area.x ?? ''" @input="onNestedNum('contentArea', 'x', $event)" @change="commitLayout" min="0" max="500" class="config-num" placeholder="40" />
              <span class="unit">px</span>
            </div>
            <div class="config-row">
              <label class="config-label">Y</label>
              <input type="number" :value="area.y ?? ''" @input="onNestedNum('contentArea', 'y', $event)" @change="commitLayout" min="0" max="500" class="config-num" placeholder="160" />
              <span class="unit">px</span>
            </div>
            <div class="config-row">
              <label class="config-label">宽度</label>
              <input type="number" :value="area.width ?? ''" @input="onNestedNum('contentArea', 'width', $event)" @change="commitLayout" min="200" max="1920" class="config-num" placeholder="1200" />
              <span class="unit">px</span>
            </div>
            <div class="config-row">
              <label class="config-label">高度</label>
              <input type="number" :value="area.height ?? ''" @input="onNestedNum('contentArea', 'height', $event)" @change="commitLayout" min="200" max="1080" class="config-num" placeholder="500" />
              <span class="unit">px</span>
            </div>
            <!-- Layout controls (reused sub-component) -->
            <LayoutControlsSection />
          </div>
        </div>

        <!-- Section 3: Widget Styles -->
        <div class="sp-section">
          <button class="sp-section-header" @click="toggle('widgets')">
            <span class="sp-section-arrow">{{ expanded.widgets ? '▼' : '▶' }}</span>
            <span class="sp-section-label">🎛️ 控件风格</span>
          </button>
          <div v-if="expanded.widgets" class="sp-section-body">
            <div class="sp-subsection">
              <button class="sp-subsection-header" @click="toggleWidget('tab')">
                <span class="sp-section-arrow">{{ widgetExpanded.tab ? '▼' : '▶' }}</span>
                📑 Tab 形状
              </button>
              <TabShapeSection v-if="widgetExpanded.tab" />
            </div>
            <div class="sp-subsection">
              <button class="sp-subsection-header" @click="toggleWidget('toggle')">
                <span class="sp-section-arrow">{{ widgetExpanded.toggle ? '▼' : '▶' }}</span>
                🔘 Toggle 样式
              </button>
              <ToggleStyleSection v-if="widgetExpanded.toggle" />
            </div>
            <div class="sp-subsection">
              <button class="sp-subsection-header" @click="toggleWidget('slider')">
                <span class="sp-section-arrow">{{ widgetExpanded.slider ? '▼' : '▶' }}</span>
                🎚️ Slider 外观
              </button>
              <SliderConfigSection v-if="widgetExpanded.slider" />
            </div>
            <div class="sp-subsection">
              <button class="sp-subsection-header" @click="toggleWidget('panel')">
                <span class="sp-section-arrow">{{ widgetExpanded.panel ? '▼' : '▶' }}</span>
                📦 Panel 面板
              </button>
              <PanelConfigSection v-if="widgetExpanded.panel" />
            </div>
            <div class="sp-subsection">
              <button class="sp-subsection-header" @click="toggleWidget('button')">
                <span class="sp-section-arrow">{{ widgetExpanded.button ? '▼' : '▶' }}</span>
                🔲 Button 按钮
              </button>
              <ButtonConfigSection v-if="widgetExpanded.button" />
            </div>
          </div>
        </div>

        <!-- Section 4: Decorations & Background (Phase 58 shell) -->
        <div class="sp-section">
          <button class="sp-section-header" @click="toggle('decor')">
            <span class="sp-section-arrow">{{ expanded.decor ? '▼' : '▶' }}</span>
            <span class="sp-section-label">🎨 装饰与背景</span>
          </button>
          <div v-if="expanded.decor" class="sp-section-body">
            <p class="sp-placeholder">Phase 58 内容 — 待实现</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right panel: iframe preview -->
    <div class="sp-preview">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { createSettingsPageEditor } from '../composables/useSettingsPageEditor.js';
// Layout sub-components (inject via useScreenLayoutEditor-compatible interface)
import TabCrudSection from '../components/layout/TabCrudSection.vue';
import SettingMatrix from '../components/layout/SettingMatrix.vue';
import LayoutControlsSection from '../components/layout/LayoutControlsSection.vue';
// Widget style sub-components (inject via useWidgetStylesEditor-compatible interface)
import TabShapeSection from '../components/widget/TabShapeSection.vue';
import ToggleStyleSection from '../components/widget/ToggleStyleSection.vue';
import SliderConfigSection from '../components/widget/SliderConfigSection.vue';
import PanelConfigSection from '../components/widget/PanelConfigSection.vue';
import ButtonConfigSection from '../components/widget/ButtonConfigSection.vue';

const script = useScriptStore();
const editor = createSettingsPageEditor();

// ─── Collapsible sections ────────────────────────────
const expanded = reactive({ tabs: true, layout: false, widgets: false, decor: false });
const widgetExpanded = reactive({ tab: false, toggle: false, slider: false, panel: false, button: false });

function toggle(id) {
  expanded[id] = !expanded[id];
}

function toggleWidget(id) {
  widgetExpanded[id] = !widgetExpanded[id];
}

// ─── Screen config computed ──────────────────────────
const cfg = computed(() => editor.getScreenConfig() || {});
const hdr = computed(() => cfg.value.header || {});
const title = computed(() => hdr.value.title || {});
const area = computed(() => cfg.value.contentArea || {});

function rgbaToHex(color) {
  if (!color) return '#888888';
  if (color.startsWith('#')) return color;
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#888888';
  return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function onNested(group, field, value) { editor.setScreenNestedField(group, field, value); }
function onNestedNum(group, field, e) { editor.setScreenNestedField(group, field, e.target.value === '' ? null : Number(e.target.value)); }

function onTitle(field, value) {
  const cfg = editor.getScreenConfig();
  if (!cfg) return;
  cfg.header ??= {};
  cfg.header.title ??= {};
  cfg.header.title[field] = value;
  editor.schedulePreview();
}

function onTitleNum(field, e) {
  onTitle(field, e.target.value === '' ? null : Number(e.target.value));
}

function commitLayout() { editor.commitScreenLayout(); }

// ─── iframe ref ──────────────────────────────────────
function onIframeRef(el) {
  editor.iframeRef.value = el;
}

onMounted(() => {
  window.addEventListener('message', editor.onEngineMessage);
});

onActivated(() => {
  if (editor.isEngineReady.value) {
    editor.startEngine();
    editor.flushPreview();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('message', editor.onEngineMessage);
});
</script>

<style scoped>
.settings-page-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.sp-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.sp-panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #333;
  background: #2d2d2d;
}
.sp-panel-title {
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}
.sp-scroll {
  flex: 1;
  overflow-y: auto;
}
.sp-section {
  border-bottom: 1px solid #333;
}
.sp-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 14px;
  background: #2d2d2d;
  border: none;
  color: #ccc;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}
.sp-section-header:hover {
  background: #333;
}
.sp-section-arrow {
  font-size: 10px;
  width: 12px;
  color: #888;
}
.sp-section-label {
  font-weight: 500;
}
.sp-section-body {
  padding: 8px 12px 12px;
}
.sp-subsection {
  margin-top: 4px;
}
.sp-subsection-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}
.sp-subsection-header:hover {
  color: #ccc;
}
.sp-placeholder {
  color: #666;
  font-size: 12px;
  font-style: italic;
  padding: 8px 0;
}
.sp-preview {
  flex: 1;
  display: flex;
  background: #000;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
/* Config row styles (same as SettingsSection) */
.form-group-title {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 12px 0 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #333;
}
.form-group-title:first-child { margin-top: 0; }
.config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}
.config-label {
  width: 80px;
  font-size: 12px;
  color: #aaa;
  flex-shrink: 0;
}
.color-picker {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid #444;
  border-radius: 3px;
  cursor: pointer;
  background: none;
}
.config-num {
  width: 56px;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
}
.config-text {
  flex: 1;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
}
.unit {
  font-size: 11px;
  color: #666;
}
</style>
```

**IMPORTANT:** The widget style sub-components (TabShapeSection, etc.) currently inject from `useWidgetStylesEditor()`. They need to work with the new `useSettingsPageEditor()` composable. See Task 8 for the adapter pattern.

- [ ] **Step 2: Commit**

```bash
git add src/editor/views/SettingsPageEditor.vue
git commit -m "feat: add SettingsPageEditor view component

Merged settings page tab with 4 collapsible sections:
Tab structure, layout/row styling, widget styles, decorations.
Unified iframe preview via useSettingsPageEditor composable.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Chunk 3: Inject Compatibility + App.vue Wiring

### Task 8: Make sub-components work with new composable

**Files:**
- Modify: `src/editor/composables/useSettingsPageEditor.js` (add widget + layout provide)
- Modify: `src/editor/composables/useWidgetStylesEditor.js` (export symbol)
- Modify: `src/editor/composables/useScreenLayoutEditor.js` (export symbol)

The widget sub-components (TabShapeSection, etc.) call `useWidgetStylesEditor()` which injects via `WIDGET_STYLES_EDITOR_KEY`. The layout sub-components (TabCrudSection, etc.) call `useScreenLayoutEditor()` which injects via `SCREEN_LAYOUT_EDITOR_KEY`.

**Strategy:** Have `createSettingsPageEditor()` also provide objects under both the widget and screen-layout symbols so existing sub-components can inject without modification.

- [ ] **Step 1: Export symbol keys from composables**

In `useWidgetStylesEditor.js`, export the symbol:
```javascript
export const WIDGET_STYLES_EDITOR_KEY = Symbol('widgetStylesEditor');
```

In `useScreenLayoutEditor.js`, export the symbol:
```javascript
export const SCREEN_LAYOUT_EDITOR_KEY = Symbol('screenLayoutEditor');
```

- [ ] **Step 2: Add dual-provide in useSettingsPageEditor.js**

Import the symbols and provide compatible objects:

```javascript
import { WIDGET_STYLES_EDITOR_KEY } from './useWidgetStylesEditor.js';
import { SCREEN_LAYOUT_EDITOR_KEY } from './useScreenLayoutEditor.js';
```

At the end of `createSettingsPageEditor()`, before `return editor`, add:

```javascript
  // Provide widget-styles-compatible interface for TabShapeSection, etc.
  provide(WIDGET_STYLES_EDITOR_KEY, {
    iframeRef,
    isEngineReady,
    WIDGET_DEFAULTS,
    setWidgetField,
    commitWidgetStyles,
    sendWidgetStylesToPreview: schedulePreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  });

  // Provide screen-layout-compatible interface for TabCrudSection, etc.
  provide(SCREEN_LAYOUT_EDITOR_KEY, {
    iframeRef,
    isEngineReady,
    activeScreen: ref('settingsScreen'),
    SCREENS: [{ id: 'settingsScreen', label: '设置' }],
    getActiveScreenConfig: getScreenConfig,
    setScreenField,
    setScreenNestedField,
    commitScreenLayout,
    sendScreenLayoutToPreview: schedulePreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  });
```

- [ ] **Step 3: Verify build**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/editor/composables/useSettingsPageEditor.js src/editor/composables/useWidgetStylesEditor.js src/editor/composables/useScreenLayoutEditor.js
git commit -m "feat: dual-provide in SettingsPageEditor for sub-component compat

Export symbol keys from widget/screen composables.
SettingsPageEditor provides compatible interfaces under both
keys so TabShapeSection, TabCrudSection, etc. inject seamlessly.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 9: Extend ProjectSettings.vue with theme editor

**Files:**
- Modify: `src/editor/views/ProjectSettings.vue`

- [ ] **Step 1: Rewrite ProjectSettings.vue with split layout + theme components**

Replace the entire file content:

```vue
<template>
  <div class="project-settings-editor" v-if="project.projectData">
    <!-- Left panel: scrollable form -->
    <div class="ps-panel">
      <div class="ps-scroll">
        <!-- Project metadata -->
        <div class="ps-section">
          <h3 class="ps-section-title">📋 项目信息</h3>
          <form @submit.prevent class="settings-form">
            <label>项目名称 <HelpTip :text="HELP_SETTINGS.projectName" />
              <input v-model="project.projectData.name" @input="project.markDirty()" />
            </label>
            <label>作者
              <input v-model="project.projectData.author" @input="project.markDirty()" />
            </label>
            <label>描述
              <textarea v-model="project.projectData.description" rows="3" @input="project.markDirty()"></textarea>
            </label>
            <label>分辨率 <HelpTip :text="HELP_SETTINGS.resolution" />
              <div class="resolution-group">
                <input type="number" v-model.number="project.projectData.resolution.width" @input="project.markDirty()" /> ×
                <input type="number" v-model.number="project.projectData.resolution.height" @input="project.markDirty()" />
              </div>
            </label>
            <div class="info-row">
              <span class="info-label">引擎版本</span>
              <span class="info-value">{{ project.projectData.engineVersion }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">项目路径</span>
              <span class="info-value path">{{ project.projectPath }}</span>
            </div>
          </form>
          <div class="export-section">
            <button class="export-btn" @click="showExport = true" title="打开导出设置">📦 导出游戏</button>
          </div>
          <DialogueBoxSettings />
        </div>

        <!-- Global Theme section -->
        <div class="ps-section" v-if="script.data">
          <h3 class="ps-section-title">🎨 全局配色</h3>
          <div class="theme-toolbar">
            <button class="toolbar-btn" @click="onResetTheme" title="重置主题">🔄 重置</button>
            <button class="toolbar-btn" @click="themeEditor.showPalette.value = true" title="调色盘生成器">🎨 调色盘</button>
            <button class="toolbar-btn" @click="themeEditor.showNineSlice.value = true" title="九宫格配置">🖼️ 九宫格</button>
            <button class="toolbar-btn" @click="themeEditor.showPreset.value = true" title="主题预设">📦 预设</button>
            <button class="toolbar-btn" @click="showPackage = true" title="完整主题包">🎭 完整主题</button>
          </div>
          <SmartColorPanel />
          <TokenAccordion />
        </div>
      </div>
    </div>

    <!-- Right panel: iframe preview -->
    <div class="ps-preview" v-if="script.data">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>

    <!-- Modals -->
    <ExportModal :visible="showExport" @close="showExport = false" />
    <template v-if="script.data">
      <PaletteModal v-if="themeEditor.showPalette.value" @close="themeEditor.showPalette.value = false" />
      <NineSliceModal v-if="themeEditor.showNineSlice.value" @close="themeEditor.showNineSlice.value = false" />
      <PresetModal v-if="themeEditor.showPreset.value" @close="themeEditor.showPreset.value = false" />
      <ThemePackageModal v-if="showPackage" @close="onPackageClose" />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useProjectStore } from '../stores/project.js';
import { useScriptStore } from '../stores/script.js';
import { createThemeEditor } from '../composables/useThemeEditor.js';
import DialogueBoxSettings from '../components/DialogueBoxSettings.vue';
import ExportModal from '../components/ExportModal.vue';
import HelpTip from '../components/HelpTip.vue';
import SmartColorPanel from '../components/theme/SmartColorPanel.vue';
import TokenAccordion from '../components/theme/TokenAccordion.vue';
import PaletteModal from '../components/theme/PaletteModal.vue';
import NineSliceModal from '../components/theme/NineSliceModal.vue';
import PresetModal from '../components/theme/PresetModal.vue';
import ThemePackageModal from '../components/theme/ThemePackageModal.vue';
import { HELP_SETTINGS } from '../helpTexts.js';

const project = useProjectStore();
const script = useScriptStore();
const themeEditor = createThemeEditor();
const showExport = ref(false);
const showPackage = ref(false);

function onIframeRef(el) {
  themeEditor.iframeRef.value = el;
}

function onResetTheme() {
  themeEditor.resetTheme();
  themeEditor.commitTheme();
}

function onPackageClose() {
  showPackage.value = false;
  if (themeEditor.isEngineReady.value) {
    themeEditor.startEngine();
    themeEditor.flushPreview();
    sendShowScreen();
  }
}

function sendShowScreen() {
  themeEditor.iframeRef.value?.contentWindow?.postMessage({
    type: 'show-screen',
    screenId: 'settingsScreen',
  }, '*');
}

onMounted(() => {
  window.addEventListener('message', (event) => {
    themeEditor.onEngineMessage(event);
    // After engine ready, show settings screen for preview context
    if (event.data?.type === 'ready' && themeEditor.iframeRef.value) {
      setTimeout(sendShowScreen, 100);
    }
  });
});

onActivated(() => {
  if (themeEditor.isEngineReady.value) {
    themeEditor.startEngine();
    themeEditor.flushPreview();
    sendShowScreen();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('message', themeEditor.onEngineMessage);
});
</script>

<style scoped>
.project-settings-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.ps-panel {
  width: 400px;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.ps-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.ps-section {
  margin-bottom: 20px;
}
.ps-section-title {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 600;
  margin: 0 0 12px;
}
.ps-preview {
  flex: 1;
  display: flex;
  background: #000;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
/* Existing form styles */
.settings-form label { display: block; color: #aaa; font-size: 13px; margin-bottom: 16px; }
.settings-form input, .settings-form textarea {
  display: block; width: 100%; margin-top: 4px; padding: 8px 12px;
  background: #1e1e1e; border: 1px solid #444; border-radius: 6px;
  color: #e0e0e0; font-size: 14px; box-sizing: border-box; font-family: inherit;
}
.resolution-group { display: flex; align-items: center; gap: 8px; margin-top: 4px; color: #888; }
.resolution-group input { width: 100px; }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #333; color: #888; font-size: 13px; }
.info-value { color: #ccc; }
.info-value.path { font-size: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
.export-section { margin: 16px 0; padding-top: 12px; border-top: 1px solid #333; }
.export-btn {
  padding: 10px 24px; background: #007acc; color: #fff; border: none;
  border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500;
}
.export-btn:hover { background: #0098ff; }
/* Theme toolbar */
.theme-toolbar {
  display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;
}
.toolbar-btn {
  background: #333; color: #ccc; border: 1px solid #444;
  padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
}
.toolbar-btn:hover { background: #444; color: #e0e0e0; }
</style>
```

- [ ] **Step 2: Verify build**

Run: `npx vite build --mode development 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/editor/views/ProjectSettings.vue
git commit -m "feat: extend ProjectSettings with theme editor + iframe preview

Split layout: left panel (metadata + global theme) + right iframe.
Inlines ThemeToolbar buttons, includes SmartColorPanel, TokenAccordion,
and all theme modals (Palette, NineSlice, Preset, ThemePackage).

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 10: Update App.vue tab definitions

**Files:**
- Modify: `src/editor/App.vue`

- [ ] **Step 1: Update imports**

Replace old imports with new:

Remove these imports:
```javascript
import ThemeDesigner from './views/ThemeDesigner.vue';
import WidgetStylesEditor from './views/WidgetStylesEditor.vue';
import ScreenLayoutEditor from './views/ScreenLayoutEditor.vue';
import SettingsDesigner from './views/SettingsDesigner.vue';
```

Add these imports:
```javascript
import SettingsPageEditor from './views/SettingsPageEditor.vue';
import GameMenuEditor from './views/GameMenuEditor.vue';
import SaveLoadEditor from './views/SaveLoadEditor.vue';
import BacklogEditor from './views/BacklogEditor.vue';
```

- [ ] **Step 2: Update tab definitions**

Replace the `tabs` and `tabComponents` arrays:

```javascript
const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-page', icon: '⚙️', label: '设置页' },
  { id: 'game-menu', icon: '🎮', label: '游戏菜单' },
  { id: 'save-load', icon: '📋', label: '存读档' },
  { id: 'backlog', icon: '📖', label: '回想' },
  { id: 'resource-library', icon: '📦', label: '资源库' },
  { id: 'project-settings', icon: '⚡', label: '项目设置' },
];

const tabComponents = {
  'scenes': markRaw(PageEditor),
  'title': markRaw(TitleDesigner),
  'settings-page': markRaw(SettingsPageEditor),
  'game-menu': markRaw(GameMenuEditor),
  'save-load': markRaw(SaveLoadEditor),
  'backlog': markRaw(BacklogEditor),
  'resource-library': markRaw(ResourceLibrary),
  'project-settings': markRaw(ProjectSettings),
};
```

Note: The old `settings-design` tab id changes to `settings-page`. If `activeTab` default was `'scenes'`, no change needed. But check if any code references old tab ids.

- [ ] **Step 3: Verify build**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds with no import errors

- [ ] **Step 4: Commit**

```bash
git add src/editor/App.vue
git commit -m "feat: rewire App.vue to game-page-based tab structure

Replace feature-based tabs (theme, widget-styles, screen-layout,
settings-design) with game-page tabs (settings-page, game-menu,
save-load, backlog). Same count (8 tabs), reorganized by purpose.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 11: Delete old view files

**Files:**
- Delete: `src/editor/views/ThemeDesigner.vue`
- Delete: `src/editor/views/WidgetStylesEditor.vue`
- Delete: `src/editor/views/ScreenLayoutEditor.vue`
- Delete: `src/editor/views/SettingsDesigner.vue`

- [ ] **Step 1: Delete the files**

```bash
git rm src/editor/views/ThemeDesigner.vue
git rm src/editor/views/WidgetStylesEditor.vue
git rm src/editor/views/ScreenLayoutEditor.vue
git rm src/editor/views/SettingsDesigner.vue
```

- [ ] **Step 2: Verify no remaining references to deleted files**

Search for imports of the deleted files:
```bash
grep -r "ThemeDesigner\|WidgetStylesEditor\|ScreenLayoutEditor\|SettingsDesigner" src/editor/ --include="*.vue" --include="*.js"
```
Expected: No results (all references removed in Task 10)

- [ ] **Step 3: Verify full build succeeds**

Run: `npx vite build --mode development 2>&1 | head -20`
Expected: Build succeeds with zero errors

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove superseded view components

Delete ThemeDesigner, WidgetStylesEditor, ScreenLayoutEditor,
and SettingsDesigner — all replaced by game-page-based tabs.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Chunk 4: Verification

### Task 12: Full build verification + smoke test

**Files:** None (verification only)

- [ ] **Step 1: Full production build**

Run: `npx vite build 2>&1`
Expected: Build succeeds with exit code 0, no errors

- [ ] **Step 2: Check for dead imports/references to deleted views**

```bash
grep -r "ThemeDesigner\|WidgetStylesEditor\|ScreenLayoutEditor\|SettingsDesigner" src/ --include="*.vue" --include="*.js" -l
```
Expected: **Zero results.** All four old view names should be completely gone from source.

Also check for stale composable call-sites:
```bash
grep -r "createWidgetStylesEditor\|createScreenLayoutEditor" src/editor/views/ --include="*.vue" -l
```
Expected: **Zero results** (old views deleted; new views use `createSettingsPageEditor` or `createScreenLayoutEditor` with fixed screen arg).

- [ ] **Step 3: Verify provide/inject tree correctness**

```bash
grep -rn "useWidgetStylesEditor\|useScreenLayoutEditor\|useThemeEditor\|useSettingsPageEditor" src/editor/ --include="*.vue" --include="*.js"
```

Expected file list:
- `useWidgetStylesEditor` inject: `TabShapeSection.vue`, `ToggleStyleSection.vue`, `SliderConfigSection.vue`, `PanelConfigSection.vue`, `ButtonConfigSection.vue` — all used inside WidgetStylesEditor (deleted but still works) OR SettingsPageEditor (dual-provide via Task 8)
- `useScreenLayoutEditor` inject: `SaveLoadSection.vue`, `BacklogSection.vue`, `GameMenuSection.vue`, `SettingsSection.vue`, `TabCrudSection.vue`, `SettingMatrix.vue`, `LayoutControlsSection.vue` — used inside new per-screen editors OR SettingsPageEditor (dual-provide)
- `useThemeEditor` inject: `SmartColorPanel.vue`, `TokenAccordion.vue`, `ThemeToolbar.vue` (if still exists), modals — used inside ProjectSettings (provides via `createThemeEditor`)
- `useSettingsPageEditor` inject: only in `useSettingsPageEditor.js` definition

If any file appears that is NOT in the above list, investigate.

- [ ] **Step 4: Verify tab count**

```bash
grep -c "id:" src/editor/App.vue
```
Expected: 8 (confirming all 8 tabs registered)

- [ ] **Step 5: Run existing tests**

```bash
npx vitest run --reporter=verbose 2>&1
```
Expected: All tests pass. If no test configuration exists, this step passes with a note that manual smoke testing is needed.

- [ ] **Step 6: Final commit (only if verification produced changes)**

Only commit if earlier verification steps required minor fixes:
```bash
git diff --stat
```
If there are changes:
```bash
git add -A
git commit -m "fix: address verification findings from tab reorganization

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
If clean: skip this step.
