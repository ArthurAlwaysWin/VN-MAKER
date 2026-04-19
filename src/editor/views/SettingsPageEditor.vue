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
