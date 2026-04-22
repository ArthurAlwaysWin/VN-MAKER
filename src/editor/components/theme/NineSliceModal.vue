<template>
  <Teleport to="body">
    <div class="ns-overlay" @click.self="onClose">
      <div class="ns-modal">
        <div class="modal-header">
          <h3>🖼️ 九宫格配置 <HelpTip :text="HELP_THEME.nineSlice" /></h3>
          <button class="close-btn" @click="onClose" title="关闭">✕</button>
        </div>

        <!-- Element tabs (D-11) -->
        <div class="element-tabs">
          <button
            v-for="elem in ELEMENTS"
            :key="elem.key"
            class="tab-btn"
            :class="{ active: activeTab === elem.key }"
            @click="activeTab = elem.key"
          >{{ elem.label }}</button>
        </div>

        <div class="modal-body">
          <template v-for="elem in ELEMENTS" :key="elem.key">
            <div v-show="activeTab === elem.key" class="element-config">
              <!-- Normal state image (D-12) -->
              <div class="config-section">
                <label class="section-label">背景图片</label>
                <div class="upload-area">
                  <div class="ns-preview" v-if="getElementConfig(elem.key).src">
                    <img :src="getPreviewSrc(getElementConfig(elem.key).src)" class="ns-thumb" />
                    <div class="ns-line ns-line-top" :style="{ top: slicePcts(getElementConfig(elem.key)).top + '%' }"></div>
                    <div class="ns-line ns-line-bottom" :style="{ bottom: slicePcts(getElementConfig(elem.key)).bottom + '%' }"></div>
                    <div class="ns-line ns-line-left" :style="{ left: slicePcts(getElementConfig(elem.key)).left + '%' }"></div>
                    <div class="ns-line ns-line-right" :style="{ right: slicePcts(getElementConfig(elem.key)).right + '%' }"></div>
                  </div>
                  <div class="upload-actions">
                    <button class="upload-btn" type="button" @click="pickElementImage(elem.key)">选择图片</button>
                    <button v-if="getElementConfig(elem.key).src" class="clear-btn" @click="clearImage(elem.key)" title="清除背景图片">清除</button>
                  </div>
                </div>
              </div>

              <!-- Slice parameters (D-12) -->
              <div class="config-section">
                <label class="section-label">切片参数 (px)</label>
                <div class="slice-grid">
                  <div class="slice-field" v-for="(label, idx) in ['上', '右', '下', '左']" :key="idx">
                    <span class="slice-label">{{ label }}</span>
                    <input
                      type="number"
                      :value="getElementConfig(elem.key).slice[idx]"
                      min="0"
                      @input="onSliceChange(elem.key, idx, $event.target.value)"
                      class="slice-input"
                    />
                  </div>
                </div>
              </div>

              <!-- Button states: hover + active (D-13) -->
              <template v-if="elem.hasStates">
                <div class="config-section" v-for="state in ['hover', 'active']" :key="state">
                  <label class="section-label">{{ state === 'hover' ? '悬停状态' : '按下状态' }} 图片</label>
                  <div class="upload-area">
                    <div class="ns-preview-sm" v-if="getElementConfig(elem.key).states?.[state]?.src">
                      <img :src="getPreviewSrc(getElementConfig(elem.key).states[state].src)" class="ns-thumb" />
                    </div>
                    <div class="upload-actions">
                      <button class="upload-btn" type="button" @click="pickElementImage(elem.key, state)">选择图片</button>
                      <button v-if="getElementConfig(elem.key).states?.[state]?.src" class="clear-btn" @click="clearImage(elem.key, state)" title="清除背景图片">清除</button>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import { useScriptStore } from '../../stores/script.js';
import { clearUiImage, pickUiImage } from '../../utils/uiImageField.js';
import HelpTip from '../HelpTip.vue';
import { HELP_THEME } from '../../helpTexts.js';

const emit = defineEmits(['close']);
const editor = useThemeEditor();
const script = useScriptStore();

// ─── 6 Target Elements (D-11) ───────────────────────
const ELEMENTS = [
  { key: 'dialogueBox', label: '对话框', hasStates: false },
  { key: 'menuPanel', label: '菜单面板', hasStates: false },
  { key: 'saveSlot', label: '存档槽', hasStates: false },
  { key: 'choiceButton', label: '选项按钮', hasStates: true },
  { key: 'titleButton', label: '标题按钮', hasStates: true },
  { key: 'settingsPanel', label: '设置面板', hasStates: false },
];

const activeTab = ref('dialogueBox');

// ─── Get/Set 9-slice Config ─────────────────────────

function getElementConfig(key) {
  const theme = script.getTheme();
  if (!theme) return { src: null, slice: [20, 20, 20, 20], states: null };
  theme.nineSlice ??= {};
  theme.nineSlice[key] ??= {
    src: null,
    slice: [20, 20, 20, 20],
    width: null,
    outset: null,
    repeat: 'stretch',
    states: null,
  };
  return theme.nineSlice[key];
}

function setImageValue(elementKey, state, value) {
  const config = getElementConfig(elementKey);
  if (state) {
    config.states ??= {};
    config.states[state] ??= {};
    config.states[state].src = value;
    return;
  }

  config.src = value;
}

async function pickElementImage(elementKey, state = null) {
  await pickUiImage({
    setValue: (value) => setImageValue(elementKey, state, value),
    preview: () => editor.sendThemeToPreview(),
  });
}

// ─── Clear Image ────────────────────────────────────

function clearImage(elementKey, state = null) {
  clearUiImage({
    setValue: (value) => setImageValue(elementKey, state, value),
    preview: () => editor.sendThemeToPreview(),
  });
}

// ─── Slice Value Change ─────────────────────────────

function onSliceChange(elementKey, index, value) {
  const config = getElementConfig(elementKey);
  config.slice[index] = Math.max(0, parseInt(value) || 0);
  editor.sendThemeToPreview();
}

// ─── Dashed Line Positions ──────────────────────────

function slicePcts(config) {
  const s = config.slice || [20, 20, 20, 20];
  return {
    top: Math.min((s[0] / 200) * 100, 50),
    right: Math.min((s[1] / 200) * 100, 50),
    bottom: Math.min((s[2] / 200) * 100, 50),
    left: Math.min((s[3] / 200) * 100, 50),
  };
}

function getPreviewSrc(value) {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('asset://')) {
    return value;
  }
  if (value.startsWith('/game/')) {
    return `asset://${value.slice(6)}`;
  }
  if (value.startsWith('assets/')) {
    return `asset://${value.slice(7)}`;
  }
  return `asset://${value}`;
}

// ─── Commit on Close ────────────────────────────────

function onClose() {
  editor.commitTheme();
  emit('close');
}
</script>

<style scoped>
.ns-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.ns-modal {
  background: #252526;
  border: 1px solid #444;
  border-radius: 8px;
  width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}
.modal-header h3 {
  margin: 0;
  font-size: 15px;
  color: #e0e0e0;
}
.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
}
.element-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #333;
  padding: 0 8px;
}
.tab-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #aaa;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
}
.tab-btn:hover {
  color: #e0e0e0;
}
.tab-btn.active {
  color: #e0e0e0;
  border-bottom-color: #b4a0ff;
}
.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}
.config-section {
  margin-bottom: 16px;
}
.section-label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 6px;
}
.upload-area {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.ns-preview {
  position: relative;
  width: 200px;
  height: 200px;
  border: 1px solid #444;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.ns-preview-sm {
  position: relative;
  width: 120px;
  height: 120px;
  border: 1px solid #444;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.ns-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ns-line {
  position: absolute;
  pointer-events: none;
}
.ns-line-top,
.ns-line-bottom {
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px dashed rgba(255, 100, 100, 0.7);
}
.ns-line-left,
.ns-line-right {
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed rgba(255, 100, 100, 0.7);
}
.upload-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.upload-btn {
  display: inline-block;
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  text-align: center;
}
.upload-btn:hover {
  background: #444;
}
.clear-btn {
  background: rgba(170, 34, 34, 0.2);
  color: #ff6b6b;
  border: 1px solid rgba(170, 34, 34, 0.4);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.slice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 8px;
}
.slice-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.slice-label {
  font-size: 11px;
  color: #888;
}
.slice-input {
  width: 60px;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 4px 6px;
  border-radius: 3px;
  font-size: 12px;
  text-align: center;
}
</style>
