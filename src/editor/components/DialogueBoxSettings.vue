<template>
  <div class="dlgbox-settings" v-if="settings">
    <h3>🔤 对话框字体 <HelpTip :text="HELP_SETTINGS.dialogueFont" /></h3>

    <div class="font-settings-layout">
      <!-- Top: Mini Preview -->
      <div class="font-preview-box">
        <div class="preview-label">预览</div>
        <div class="preview-dialogue">
          <div class="preview-nameplate" :style="previewNameplateStyle">小明</div>
          <div class="preview-text" :style="previewTextStyle">这是一段示例对话文字，用于预览字体效果。</div>
        </div>
      </div>

      <!-- Bottom: Controls -->
      <div class="font-controls">
        <!-- Dialogue Text Section -->
        <div class="subsection-label">对话文字</div>

        <div class="form-group">
          <label>字号</label>
          <div class="slider-row">
            <input type="range" min="12" max="48" step="1"
              :value="settings.fontSize ?? 18"
              @input="onSliderInput('fontSize', $event)"
              @change="onSliderCommit('fontSize', $event)" />
            <span class="slider-val">{{ settings.fontSize ?? 18 }}px</span>
          </div>
        </div>

        <div class="form-group">
          <label>字体</label>
          <select :value="settings.fontFamily || ''"
            @change="setField('fontFamily', $event.target.value || null)"
            class="font-select">
            <option value="">默认 (Noto Sans SC)</option>
            <optgroup label="已导入字体" v-if="assets.fontFamilies.length">
              <option v-for="f in assets.fontFamilies" :key="f.value"
                :value="f.value" :style="{ fontFamily: f.value }">
                {{ f.label }}
              </option>
            </optgroup>
            <optgroup label="系统字体">
              <option v-for="sf in systemFonts" :key="sf.value"
                :value="sf.value" :style="{ fontFamily: sf.value }">
                {{ sf.label }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="form-group">
          <label>文字色</label>
          <div class="color-row">
            <input type="color"
              :value="settings.textColor || '#eaeaea'"
              @input="setField('textColor', $event.target.value)" />
            <button v-if="settings.textColor" class="reset-btn"
              @click="setField('textColor', null)" title="重置为默认">✕</button>
            <span class="color-hint">{{ settings.textColor || '默认' }}</span>
          </div>
        </div>

        <!-- Nameplate Section -->
        <div class="subsection-label">名牌（说话人名字）</div>

        <div class="form-group">
          <label>字号</label>
          <div class="slider-row">
            <input type="range" min="14" max="36" step="1"
              :value="settings.nameplateFontSize ?? 20"
              @input="onSliderInput('nameplateFontSize', $event)"
              @change="onSliderCommit('nameplateFontSize', $event)" />
            <span class="slider-val">{{ settings.nameplateFontSize ?? 20 }}px</span>
          </div>
        </div>

        <div class="form-group">
          <label>字体</label>
          <select :value="settings.nameplateFontFamily || ''"
            @change="setField('nameplateFontFamily', $event.target.value || null)"
            class="font-select">
            <option value="">默认 (Noto Serif SC)</option>
            <optgroup label="已导入字体" v-if="assets.fontFamilies.length">
              <option v-for="f in assets.fontFamilies" :key="'np-' + f.value"
                :value="f.value" :style="{ fontFamily: f.value }">
                {{ f.label }}
              </option>
            </optgroup>
            <optgroup label="系统字体">
              <option v-for="sf in systemFonts" :key="'np-' + sf.value"
                :value="sf.value" :style="{ fontFamily: sf.value }">
                {{ sf.label }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="form-group">
          <label>名牌色</label>
          <div class="color-row">
            <input type="color"
              :value="settings.nameplateColor || '#ffd700'"
              @input="setField('nameplateColor', $event.target.value)" />
            <button v-if="settings.nameplateColor" class="reset-btn"
              @click="setField('nameplateColor', null)" title="重置为默认">✕</button>
            <span class="color-hint">{{ settings.nameplateColor || '默认' }}</span>
          </div>
        </div>

        <div class="subsection-label">对话框图片</div>

        <div class="form-group">
          <label>名牌背景图</label>
          <div class="image-row">
            <input
              class="image-path"
              :value="getUiImageDisplayValue(settings.nameplateBackgroundImage)"
              readonly
              placeholder="未选择"
            />
            <button type="button" class="picker-btn" @click="pickNameplateBackgroundImage">选择图片</button>
            <button
              v-if="settings.nameplateBackgroundImage"
              type="button"
              class="reset-btn"
              @click="clearNameplateBackgroundImage"
              title="清空图片"
            >✕</button>
          </div>
        </div>

        <div class="form-group">
          <div class="decoration-header">
            <label>装饰图层</label>
            <button type="button" class="picker-btn" @click="addDecoration">添加装饰</button>
          </div>

          <div v-if="!settings.decorations.length" class="empty-hint">暂无装饰图层</div>

          <div
            v-for="(decoration, index) in settings.decorations"
            :key="index"
            class="decoration-card"
          >
            <div class="image-row">
              <input
                class="image-path"
                :value="getUiImageDisplayValue(decoration.src)"
                readonly
                placeholder="未选择"
              />
              <button type="button" class="picker-btn" @click="pickDecorationImage(index)">选择图片</button>
              <button
                v-if="decoration.src"
                type="button"
                class="reset-btn"
                @click="clearDecorationImage(index)"
                title="清空图片"
              >✕</button>
              <button type="button" class="remove-btn" @click="removeDecoration(index)">删除</button>
            </div>

            <div class="decoration-grid">
              <label>
                X
                <input
                  type="number"
                  :value="decoration.x ?? 0"
                  @change="setDecorationNumber(index, 'x', $event.target.value)"
                />
              </label>
              <label>
                Y
                <input
                  type="number"
                  :value="decoration.y ?? 0"
                  @change="setDecorationNumber(index, 'y', $event.target.value)"
                />
              </label>
              <label>
                宽度
                <input
                  type="number"
                  :value="decoration.width ?? 160"
                  @change="setDecorationNumber(index, 'width', $event.target.value)"
                />
              </label>
              <label>
                高度
                <input
                  type="number"
                  :value="decoration.height ?? 160"
                  @change="setDecorationNumber(index, 'height', $event.target.value)"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { useAssetStore } from '../stores/assets.js';
import HelpTip from './HelpTip.vue';
import { HELP_SETTINGS } from '../helpTexts.js';
import {
  clearUiImage,
  getUiImageDisplayValue,
  pickUiImage,
} from '../utils/uiImageField.js';

const script = useScriptStore();
const assets = useAssetStore();
const triggerDialoguePreview = inject('dialoguePreview', async () => {});

const systemFonts = [
  { label: 'Noto Sans SC', value: "'Noto Sans SC', sans-serif" },
  { label: 'Noto Serif SC', value: "'Noto Serif SC', serif" },
  { label: '无衬线体', value: 'sans-serif' },
  { label: '衬线体', value: 'serif' },
  { label: '等宽字体', value: 'monospace' },
];

const settings = computed(() => script.getDialogueBox());

function setField(field, value) {
  if (!settings.value) return;
  const updated = { ...settings.value, [field]: value };
  script.updateDialogueBox(updated);
  void triggerDialoguePreview();
}

function onSliderInput(field, event) {
  if (!settings.value) return;
  settings.value[field] = Number(event.target.value);
}

function onSliderCommit(field, event) {
  if (!settings.value) return;
  const updated = { ...settings.value, [field]: Number(event.target.value) };
  script.updateDialogueBox(updated);
  void triggerDialoguePreview();
}

function commitDialogueSettings() {
  if (!settings.value) return;
  script.updateDialogueBox(JSON.parse(JSON.stringify(settings.value)));
}

async function pickNameplateBackgroundImage() {
  if (!settings.value) return;
  await pickUiImage({
    assets,
    setValue: (value) => {
      settings.value.nameplateBackgroundImage = value;
    },
    preview: () => triggerDialoguePreview(),
    commit: () => commitDialogueSettings(),
  });
}

function clearNameplateBackgroundImage() {
  if (!settings.value) return;
  clearUiImage({
    setValue: (value) => {
      settings.value.nameplateBackgroundImage = value;
    },
    preview: () => triggerDialoguePreview(),
    commit: () => commitDialogueSettings(),
  });
}

function addDecoration() {
  if (!settings.value) return;
  settings.value.decorations.push({
    src: null,
    x: 0,
    y: 0,
    width: 160,
    height: 160,
  });
  commitDialogueSettings();
  void triggerDialoguePreview();
}

function removeDecoration(index) {
  if (!settings.value) return;
  settings.value.decorations.splice(index, 1);
  commitDialogueSettings();
  void triggerDialoguePreview();
}

async function pickDecorationImage(index) {
  if (!settings.value?.decorations?.[index]) return;
  await pickUiImage({
    assets,
    setValue: (value) => {
      settings.value.decorations[index].src = value;
    },
    preview: () => triggerDialoguePreview(),
    commit: () => commitDialogueSettings(),
  });
}

function clearDecorationImage(index) {
  if (!settings.value?.decorations?.[index]) return;
  clearUiImage({
    setValue: (value) => {
      settings.value.decorations[index].src = value;
    },
    preview: () => triggerDialoguePreview(),
    commit: () => commitDialogueSettings(),
  });
}

function setDecorationNumber(index, field, value) {
  if (!settings.value?.decorations?.[index]) return;
  settings.value.decorations[index][field] = Number(value);
  commitDialogueSettings();
  void triggerDialoguePreview();
}

const previewTextStyle = computed(() => ({
  fontSize: (settings.value?.fontSize ?? 18) + 'px',
  fontFamily: settings.value?.fontFamily || "'Noto Sans SC', sans-serif",
  color: settings.value?.textColor || 'rgba(255, 255, 255, 0.92)',
  lineHeight: '1.8',
}));

const previewNameplateStyle = computed(() => ({
  fontSize: (settings.value?.nameplateFontSize ?? 20) + 'px',
  fontFamily: settings.value?.nameplateFontFamily || "'Noto Serif SC', serif",
  color: settings.value?.nameplateColor || '#ffd700',
  fontWeight: '600',
  letterSpacing: '2px',
  marginBottom: '8px',
}));
</script>

<style scoped>
.dlgbox-settings { padding: 0; margin-top: 24px; }
.dlgbox-settings h3 { font-size: 16px; color: #e0e0e0; margin: 0 0 16px; font-weight: 500; }

.font-settings-layout { display: flex; flex-direction: column; gap: 16px; }
.font-controls { min-width: 0; }

.subsection-label {
  font-size: 12px; color: #888; text-transform: uppercase;
  letter-spacing: 1px; margin: 16px 0 8px; padding-bottom: 4px;
  border-bottom: 1px solid #333;
}
.subsection-label:first-child { margin-top: 0; }

.form-group { margin-bottom: 10px; }
.form-group label { display: block; font-size: 12px; color: #aaa; margin-bottom: 4px; }

.slider-row { display: flex; align-items: center; gap: 8px; }
.slider-row input[type="range"] { flex: 1; }
.slider-val { font-size: 12px; color: #888; min-width: 40px; text-align: right; }

.font-select {
  width: 100%; background: #1e1e1e; border: 1px solid #444;
  border-radius: 6px; color: #e0e0e0; font-size: 14px;
  padding: 6px 8px; box-sizing: border-box;
}

.color-row { display: flex; align-items: center; gap: 8px; }
.color-row input[type="color"] {
  width: 36px; height: 28px; border: 1px solid #555;
  border-radius: 4px; background: none; cursor: pointer; padding: 0;
}
.color-hint { font-size: 12px; color: #888; }
.empty-hint { font-size: 12px; color: #777; padding: 8px 0; }
.reset-btn {
  background: none; border: 1px solid #555; color: #aaa;
  border-radius: 3px; cursor: pointer; font-size: 11px;
  padding: 2px 6px; line-height: 1;
}
.reset-btn:hover { border-color: #a22; color: #e88; }
.picker-btn,
.remove-btn {
  background: #333;
  border: 1px solid #555;
  color: #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  padding: 5px 8px;
  white-space: nowrap;
}
.remove-btn:hover { border-color: #a22; color: #ff9a9a; }
.picker-btn:hover { border-color: #007acc; color: #9fd7ff; }
.image-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.image-path {
  flex: 1;
  min-width: 0;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 6px;
  color: #cfcfcf;
  padding: 6px 8px;
}
.decoration-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.decoration-card {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px;
  margin-top: 10px;
  background: rgba(255, 255, 255, 0.02);
}
.decoration-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.decoration-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #aaa;
}
.decoration-grid input {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 13px;
  padding: 6px 8px;
}

.font-preview-box {
  width: 100%; box-sizing: border-box;
  background: rgba(0, 0, 0, 0.7); border-radius: 8px;
  padding: 16px; border: 1px solid #333;
  display: flex; flex-direction: column;
}
.preview-label { font-size: 11px; color: #666; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
</style>
