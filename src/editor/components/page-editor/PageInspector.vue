<template>
  <div class="page-inspector" v-if="page">
    <!-- Section 1: Page Properties -->
    <div class="inspector-section">
      <div class="section-toggle" @click="sections.props = !sections.props">
        {{ sections.props ? '▼' : '▶' }} 📄 页面属性
      </div>
      <div v-if="sections.props" class="section-body">
        <div class="form-group">
          <label>背景</label>
          <div class="field-with-clear">
            <input type="text" :value="page.background ? page.background.replace('backgrounds/', '') : ''"
              readonly placeholder="点击选择背景..." class="field-input"
              @click="editor.showBgPicker.value = true" />
            <button v-if="page.background" class="clear-btn" @click.stop="clearBackground" title="清除背景">✕</button>
          </div>
          <div v-if="page.background" class="bg-preview">
            <img :src="`asset://${page.background}`" alt="背景预览" draggable="false" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group half">
            <label>过渡</label>
            <select :value="page.transition?.type || 'fade'"
              @change="setTransitionType($event.target.value)" class="field-input">
              <option value="fade">淡入淡出</option>
              <option value="slide-left">左滑入</option>
              <option value="slide-right">右滑入</option>
              <option value="none">无</option>
            </select>
          </div>
          <div class="form-group half">
            <label>时长(ms)</label>
            <input type="number" :value="page.transition?.duration || 800"
              @change="setTransitionDuration($event.target.value)" class="field-input" />
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Characters -->
    <div class="inspector-section">
      <div class="section-toggle" @click="sections.chars = !sections.chars">
        {{ sections.chars ? '▼' : '▶' }} 🧑 角色列表
      </div>
      <div v-if="sections.chars" class="section-body">
        <div v-for="(char, idx) in page.characters" :key="char.id + '-' + idx"
          class="char-row" :class="{ active: editor.selectedCharIndex.value === idx }"
          @click="editor.selectCharacter(idx)">
          <span class="char-name">{{ getCharName(char.id) }}</span>
          <select :value="char.expression"
            @change="setCharExpression(idx, $event.target.value)"
            @click.stop class="mini-select">
            <option v-for="(_, expr) in getCharExpressions(char.id)" :key="expr" :value="expr">
              {{ expr }}
            </option>
          </select>
          <button class="delete-x" @click.stop="removeCharacter(idx)" title="移除角色">✕</button>
          <div v-if="editor.selectedCharIndex.value === idx" class="char-scale-row" @click.stop>
            <label class="scale-label">缩放</label>
            <input type="range" min="0.2" max="3" step="0.1"
              :value="char.scale || 1"
              @input="setCharScale(idx, parseFloat($event.target.value))"
              class="scale-slider" />
            <span class="scale-val">{{ (char.scale || 1).toFixed(1) }}</span>
          </div>
        </div>
        <div v-if="page.characters.length === 0" class="empty-hint">当前页面无角色</div>
        <button class="add-btn" @click="editor.showCharPicker.value = true">+ 添加角色</button>
      </div>
    </div>

    <!-- Section 3: Dialogues (normal pages only) -->
    <div class="inspector-section" v-if="!page || page.type !== 'choice'">
      <div class="section-toggle" @click="sections.dialogues = !sections.dialogues">
        {{ sections.dialogues ? '▼' : '▶' }} 💬 对话列表
      </div>
      <div v-if="sections.dialogues" class="section-body">
        <div v-for="(dlg, idx) in page.dialogues" :key="idx"
          class="dialogue-row"
          :class="{ active: editor.selectedDialogueIndex.value === idx }"
          draggable="true"
          @click="editor.selectDialogue(idx)"
          @dragstart="onDlgDragStart($event, idx)"
          @dragover.prevent
          @drop="onDlgDrop($event, idx)"
          @dragend="onDlgDragEnd">
          <span class="dlg-index">#{{ idx + 1 }}</span>
          <span v-if="dlg.voice" class="dlg-voice-badge" title="已绑定语音">🔊</span>
          <span class="dlg-speaker-tag" v-if="dlg.speaker">{{ getCharName(dlg.speaker) }}:</span>
          <span class="dlg-preview">"{{ truncate(dlg.text, 15) }}"</span>
          <button class="delete-x" @click.stop="removeDialogue(idx)">✕</button>
        </div>
        <button class="add-btn" @click="addDialogue">+ 添加对话</button>

        <!-- Detail editor for selected dialogue -->
        <div v-if="selectedDialogue" class="dialogue-editor">
          <div class="editor-divider">── 编辑选中对话 ──</div>
          <div class="form-group">
            <label>说话者</label>
            <div class="speaker-combobox">
              <input type="text" :value="speakerDisplay"
                @input="onSpeakerInput($event.target.value)"
                @focus="showSpeakerDropdown = true"
                @blur="onSpeakerBlur"
                class="field-input" placeholder="无（不设置说话者）" />
              <div v-if="showSpeakerDropdown && pageCharOptions.length > 0" class="speaker-dropdown">
                <div class="speaker-option" @mousedown.prevent="setSpeaker('')">无</div>
                <div v-for="opt in pageCharOptions" :key="opt.id"
                  class="speaker-option" @mousedown.prevent="setSpeaker(opt.id)">
                  {{ opt.name }}
                </div>
              </div>
            </div>
          </div>
          <div class="form-group" v-if="selectedDialogue.speaker && isCharId(selectedDialogue.speaker)">
            <label>表情变化</label>
            <select :value="selectedDialogue.expression || ''"
              @change="setDialogueExpression($event.target.value)" class="field-input">
              <option value="">（不变）</option>
              <option v-for="(_, expr) in getCharExpressions(selectedDialogue.speaker)" :key="expr" :value="expr">
                {{ expr }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>语音</label>
            <div class="voice-field">
              <input type="text"
                :value="selectedDialogue.voice ? selectedDialogue.voice.replace('audio/', '') : ''"
                readonly placeholder="点击选择语音..."
                class="field-input"
                @click="showVoicePicker = true" />
              <button v-if="selectedDialogue.voice" class="voice-preview-btn"
                @click.stop="toggleVoicePreview"
                :title="isVoicePlaying ? '停止' : '试听'">
                {{ isVoicePlaying ? '⏹' : '▶' }}
              </button>
              <button v-if="selectedDialogue.voice" class="voice-clear-btn"
                @click.stop="clearDialogueVoice" title="清除语音">✕</button>
            </div>
          </div>
          <div class="form-group">
            <label>内容</label>
            <textarea :value="selectedDialogue.text"
              @input="setDialogueText($event.target.value)"
              rows="3" class="field-input field-textarea"
              placeholder="输入对话内容..."></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3b: Choice Options (choice pages only) -->
    <div class="inspector-section" v-if="page && page.type === 'choice'">
      <div class="section-toggle" @click="sections.choices = !sections.choices">
        {{ sections.choices ? '▼' : '▶' }} 🔀 选项编辑
      </div>
      <div v-if="sections.choices" class="section-body">
        <div class="form-group">
          <label>提示文本</label>
          <input type="text" :value="page.prompt || ''"
            @input="setPrompt($event.target.value)"
            class="field-input" placeholder="请做出选择..." />
        </div>

        <div class="options-list">
          <div v-for="(opt, idx) in page.options" :key="idx"
            class="option-card"
            draggable="true"
            @dragstart="onOptDragStart($event, idx)"
            @dragover.prevent="onOptDragOver($event, idx)"
            @drop="onOptDrop($event, idx)"
            @dragend="onOptDragEnd">
            <div class="option-header">
              <span class="option-index">#{{ idx + 1 }}</span>
              <span class="option-drag-handle">⠿</span>
              <button class="delete-x" @click.stop="removeOption(idx)" title="删除选项">✕</button>
            </div>
            <div class="form-group">
              <label>选项文本</label>
              <input type="text" :value="opt.text"
                @input="setOptionText(idx, $event.target.value)"
                class="field-input" placeholder="选项内容..." />
            </div>
            <div class="form-group">
              <label>跳转场景</label>
              <select :value="opt.target || ''"
                @change="setOptionTarget(idx, $event.target.value)"
                class="field-input">
                <option value="">（不跳转 — 继续下一页）</option>
                <option v-for="[sId, s] in allScenes" :key="sId" :value="sId">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div class="form-group option-variable">
              <label>设置变量</label>
              <div class="variable-row">
                <input type="text" :value="optionVarKey(opt)"
                  @input="setOptionVarKey(idx, $event.target.value)"
                  class="field-input var-key" placeholder="变量名" />
                <span class="var-eq">=</span>
                <input type="number" :value="optionVarValue(opt)"
                  @input="setOptionVarValue(idx, $event.target.value)"
                  class="field-input var-value" placeholder="值" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="!page.options || page.options.length === 0" class="empty-hint">
          暂无选项，点击下方按钮添加
        </div>
        <button class="add-btn" @click="addOption">+ 添加选项</button>
      </div>
    </div>

    <!-- Section 4: Audio -->
    <div class="inspector-section">
      <div class="section-toggle" @click="sections.audio = !sections.audio">
        {{ sections.audio ? '▼' : '▶' }} 🎵 音频
      </div>
      <div v-if="sections.audio" class="section-body">
        <div class="form-group">
          <label>BGM</label>
          <div class="field-with-clear">
            <input type="text" :value="page.bgm?.file ? page.bgm.file.replace('audio/', '') : ''"
              readonly placeholder="点击选择BGM..." class="field-input"
              @click="openAudioPicker('bgm')" />
            <button v-if="page.bgm?.file" class="clear-btn" @click.stop="clearBgm" title="清除BGM">✕</button>
          </div>
        </div>
        <div class="form-group" v-if="page.bgm">
          <label>音量</label>
          <div class="volume-row">
            <input type="range" min="0" max="1" step="0.1"
              :value="page.bgm.volume || 0.5"
              @input="setBgmVolume(parseFloat($event.target.value))"
              class="volume-slider" />
            <span class="volume-val">{{ (page.bgm?.volume || 0.5).toFixed(1) }}</span>
          </div>
        </div>
        <div class="form-group">
          <label>SE</label>
          <div class="field-with-clear">
            <input type="text" :value="page.se?.file ? page.se.file.replace('audio/', '') : ''"
              readonly placeholder="点击选择音效..." class="field-input"
              @click="openAudioPicker('se')" />
            <button v-if="page.se?.file" class="clear-btn" @click.stop="clearSe" title="清除音效">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 6: Per-page Font Override -->
    <div class="inspector-section">
      <div class="section-toggle" @click="sections.fonts = !sections.fonts">
        {{ sections.fonts ? '▼' : '▶' }} 🔤 字体
      </div>
      <div v-if="sections.fonts" class="section-body">
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" :checked="useGlobalFont" @change="toggleUseGlobal" />
            使用全局字体设置
          </label>
          <div v-if="useGlobalFont" class="override-hint">当前使用项目全局字体，取消勾选可为本页单独设置</div>
        </div>

        <template v-if="!useGlobalFont">
          <div class="form-group">
            <label>对话字号</label>
            <div class="slider-row">
              <input type="range" min="12" max="36" step="1"
                :value="fontOverride.fontSize || 18"
                @input="setOverrideField('fontSize', parseInt($event.target.value))"
                @change="script.pushState()"
                class="volume-slider" />
              <span class="volume-val">{{ fontOverride.fontSize || 18 }}px</span>
            </div>
          </div>
          <div class="form-group">
            <label>对话字体</label>
            <select class="field-input"
              :value="fontOverride.fontFamily || ''"
              @change="setOverrideField('fontFamily', $event.target.value || null); script.pushState()">
              <option value="">默认</option>
              <optgroup label="系统字体">
                <option v-for="sf in systemFonts" :key="'ov-' + sf.value"
                  :value="sf.value">{{ sf.label }}</option>
              </optgroup>
              <optgroup label="已导入字体" v-if="assets.fontFamilies.length">
                <option v-for="f in assets.fontFamilies" :key="'ov-' + f.value"
                  :value="f.value">{{ f.label }}</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>文字颜色</label>
            <div class="color-row">
              <input type="color"
                :value="fontOverride.textColor || '#ffffff'"
                @input="setOverrideField('textColor', $event.target.value)"
                @change="script.pushState()" />
              <button v-if="fontOverride.textColor" class="reset-btn" @click="setOverrideField('textColor', null); script.pushState()">重置</button>
            </div>
          </div>
          <div class="form-group">
            <label>铭牌字号</label>
            <div class="slider-row">
              <input type="range" min="12" max="36" step="1"
                :value="fontOverride.nameplateFontSize || 20"
                @input="setOverrideField('nameplateFontSize', parseInt($event.target.value))"
                @change="script.pushState()"
                class="volume-slider" />
              <span class="volume-val">{{ fontOverride.nameplateFontSize || 20 }}px</span>
            </div>
          </div>
          <div class="form-group">
            <label>铭牌字体</label>
            <select class="field-input"
              :value="fontOverride.nameplateFontFamily || ''"
              @change="setOverrideField('nameplateFontFamily', $event.target.value || null); script.pushState()">
              <option value="">默认</option>
              <optgroup label="系统字体">
                <option v-for="sf in systemFonts" :key="'ovnp-' + sf.value"
                  :value="sf.value">{{ sf.label }}</option>
              </optgroup>
              <optgroup label="已导入字体" v-if="assets.fontFamilies.length">
                <option v-for="f in assets.fontFamilies" :key="'ovnp-' + f.value"
                  :value="f.value">{{ f.label }}</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label>铭牌颜色</label>
            <div class="color-row">
              <input type="color"
                :value="fontOverride.nameplateColor || '#ffffff'"
                @input="setOverrideField('nameplateColor', $event.target.value)"
                @change="script.pushState()" />
              <button v-if="fontOverride.nameplateColor" class="reset-btn" @click="setOverrideField('nameplateColor', null); script.pushState()">重置</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
  <div class="page-inspector empty" v-else>
    <div class="empty-hint">选择一个页面以编辑属性</div>
  </div>

  <AudioPicker
    :visible="showVoicePicker"
    mode="voice"
    @select="onVoiceSelect"
    @close="showVoicePicker = false"
  />
</template>

<script setup>
import { reactive, ref, computed, watch, onBeforeUnmount } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';
import { useAssetStore } from '../../stores/assets.js';
import AudioPicker from './AudioPicker.vue';

const editor = usePageEditor();
const script = useScriptStore();
const assets = useAssetStore();

const sections = reactive({ props: true, chars: true, dialogues: true, audio: true, choices: true, fonts: false });
const dlgDragState = reactive({ fromIndex: -1 });
const optDragState = reactive({ fromIndex: -1 });
const showSpeakerDropdown = ref(false);
const showVoicePicker = ref(false);
const isVoicePlaying = ref(false);
let previewAudio = null;

const page = computed(() => editor.currentPage.value);
const selectedDialogue = computed(() => editor.currentDialogue.value);
const characterEntries = computed(() => Object.entries(script.data?.characters || {}));
const allScenes = computed(() => Object.entries(script.data?.scenes || {}));

// Page-scoped character list for speaker combobox
const pageCharOptions = computed(() => {
  if (!page.value?.characters) return [];
  const chars = script.data?.characters || {};
  return page.value.characters
    .filter(c => chars[c.id])
    .map(c => ({ id: c.id, name: chars[c.id].name || c.id }));
});

// Display text for current speaker
const speakerDisplay = computed(() => {
  const dlg = selectedDialogue.value;
  if (!dlg?.speaker) return '';
  const char = script.data?.characters?.[dlg.speaker];
  return char ? char.name : dlg.speaker;
});

// ─── Per-page font override ──────────────────────────────
const systemFonts = [
  { label: 'Noto Sans SC', value: "'Noto Sans SC', sans-serif" },
  { label: 'Noto Serif SC', value: "'Noto Serif SC', serif" },
  { label: '无衬线体', value: 'sans-serif' },
  { label: '衬线体', value: 'serif' },
  { label: '等宽字体', value: 'monospace' },
];

const fontOverride = computed(() => page.value?.fontOverride || {});

const useGlobalFont = computed(() => {
  const fo = page.value?.fontOverride;
  return !fo || fo.useGlobal !== false;
});

function toggleUseGlobal() {
  if (!page.value) return;
  if (useGlobalFont.value) {
    // Switch to per-page override
    page.value.fontOverride = { useGlobal: false };
  } else {
    // Revert to global
    page.value.fontOverride = { useGlobal: true };
  }
  script.pushState();
}

function setOverrideField(field, value) {
  if (!page.value) return;
  if (!page.value.fontOverride) page.value.fontOverride = { useGlobal: false };
  page.value.fontOverride[field] = value;
  // pushState called by @change handler for undo/redo commit
}

function isCharId(id) {
  return !!(script.data?.characters?.[id]);
}

function getCharName(charId) {
  return script.data?.characters?.[charId]?.name || charId || '';
}

function getCharExpressions(charId) {
  return script.data?.characters?.[charId]?.expressions || {};
}

function truncate(text, len) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '…' : text;
}

function openAudioPicker(tab) {
  editor.audioPickerTab.value = tab;
  editor.showAudioPicker.value = true;
}

function clearBackground() {
  if (!page.value) return;
  page.value.background = '';
  script.pushState();
}

function clearBgm() {
  if (!page.value) return;
  page.value.bgm = null;
  script.pushState();
}

function clearSe() {
  if (!page.value) return;
  page.value.se = null;
  script.pushState();
}

// Page property setters
function setTransitionType(type) {
  if (!page.value) return;
  page.value.transition ??= {};
  page.value.transition.type = type;
  script.pushState();
}

function setTransitionDuration(val) {
  if (!page.value) return;
  page.value.transition ??= {};
  page.value.transition.duration = parseInt(val) || 800;
  script.pushState();
}

// Character management
function setCharExpression(idx, expr) {
  if (!page.value?.characters?.[idx]) return;
  page.value.characters[idx].expression = expr;
  script.pushState();
}

function removeCharacter(idx) {
  if (!page.value) return;
  page.value.characters.splice(idx, 1);
  script.pushState();
  if (editor.selectedCharIndex.value === idx) {
    editor.selectCharacter(-1);
  }
}

function setCharScale(idx, val) {
  if (!page.value?.characters?.[idx]) return;
  page.value.characters[idx].scale = val;
  // Continuous slider — do NOT call pushState
}

// Dialogue management
function addDialogue() {
  if (!page.value) return;
  page.value.dialogues.push({ speaker: null, text: '', expression: null, voice: null });
  script.pushState();
  editor.selectDialogue(page.value.dialogues.length - 1);
}

function removeDialogue(idx) {
  if (!page.value || page.value.dialogues.length <= 1) return;
  page.value.dialogues.splice(idx, 1);
  script.pushState();
  if (editor.selectedDialogueIndex.value >= page.value.dialogues.length) {
    editor.selectDialogue(page.value.dialogues.length - 1);
  }
}

function setSpeaker(val) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.speaker = val || null;
  showSpeakerDropdown.value = false;
  script.pushState();
}

function onSpeakerInput(text) {
  if (!selectedDialogue.value) return;
  // Free text input — store as custom speaker name directly
  selectedDialogue.value.speaker = text || null;
  // Continuous typing — do NOT call pushState
}

function onSpeakerBlur() {
  // Delay to allow mousedown on dropdown options to fire first
  setTimeout(() => { showSpeakerDropdown.value = false; }, 150);
}

function setDialogueExpression(expr) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.expression = expr || null;
  script.pushState();
}

function setDialogueText(text) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.text = text;
  // Continuous typing — do NOT call pushState (Pitfall 4)
}

// ─── Voice management ──────────────────────────────────
function setDialogueVoice(path) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.voice = path || null;
  script.pushState();
}

function clearDialogueVoice() {
  if (!selectedDialogue.value) return;
  stopVoicePreview();
  selectedDialogue.value.voice = null;
  script.pushState();
}

function onVoiceSelect(path) {
  setDialogueVoice(path);
  showVoicePicker.value = false;
}

function toggleVoicePreview() {
  if (isVoicePlaying.value) {
    stopVoicePreview();
    return;
  }
  const voice = selectedDialogue.value?.voice;
  if (!voice) return;
  stopVoicePreview();
  previewAudio = new Audio(`asset://${voice}`);
  previewAudio.play().catch(() => {});
  isVoicePlaying.value = true;
  previewAudio.addEventListener('ended', () => {
    isVoicePlaying.value = false;
  });
}

function stopVoicePreview() {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.removeAttribute('src');
    previewAudio.load();
    previewAudio = null;
  }
  isVoicePlaying.value = false;
}

watch(() => editor.selectedDialogueIndex.value, () => stopVoicePreview());
watch(() => editor.selectedPageIndex.value, () => stopVoicePreview());
onBeforeUnmount(() => stopVoicePreview());

// Dialogue drag-reorder
function onDlgDragStart(e, idx) {
  dlgDragState.fromIndex = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(idx));
}

function onDlgDrop(e, toIndex) {
  e.preventDefault();
  const fromIndex = dlgDragState.fromIndex;
  if (fromIndex === toIndex || fromIndex < 0) return;
  if (!page.value) return;
  const [moved] = page.value.dialogues.splice(fromIndex, 1);
  const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex;
  page.value.dialogues.splice(adjusted, 0, moved);
  script.pushState();
  editor.selectDialogue(adjusted);
  dlgDragState.fromIndex = -1;
}

function onDlgDragEnd() {
  dlgDragState.fromIndex = -1;
}

// Audio
function setBgmVolume(vol) {
  if (!page.value?.bgm) return;
  page.value.bgm.volume = vol;
  // Continuous slider — do NOT call pushState (Pitfall 4)
}

// ─── Choice option helpers ──────────────────────────────

function setPrompt(text) {
  if (!page.value || page.value.type !== 'choice') return;
  page.value.prompt = text;
  // Continuous typing — do NOT call pushState
}

function addOption() {
  if (!page.value || page.value.type !== 'choice') return;
  if (!page.value.options) page.value.options = [];
  page.value.options.push({ text: '', target: null, setVariable: null });
  script.pushState();
}

function removeOption(idx) {
  if (!page.value?.options) return;
  page.value.options.splice(idx, 1);
  script.pushState();
}

function setOptionText(idx, text) {
  if (!page.value?.options?.[idx]) return;
  page.value.options[idx].text = text;
  // Continuous typing — do NOT call pushState
}

function setOptionTarget(idx, target) {
  if (!page.value?.options?.[idx]) return;
  page.value.options[idx].target = target || null;
  script.pushState();
}

function optionVarKey(opt) {
  if (!opt.setVariable) return '';
  const keys = Object.keys(opt.setVariable);
  return keys.length > 0 ? keys[0] : '';
}

function optionVarValue(opt) {
  if (!opt.setVariable) return '';
  const keys = Object.keys(opt.setVariable);
  return keys.length > 0 ? opt.setVariable[keys[0]] : '';
}

function setOptionVarKey(idx, newKey) {
  if (!page.value?.options?.[idx]) return;
  const opt = page.value.options[idx];
  const oldValue = opt.setVariable ? Object.values(opt.setVariable)[0] ?? 0 : 0;
  if (newKey.trim()) {
    opt.setVariable = { [newKey.trim()]: oldValue };
  } else {
    opt.setVariable = null;
  }
  // Continuous typing — do NOT call pushState
}

function setOptionVarValue(idx, newVal) {
  if (!page.value?.options?.[idx]) return;
  const opt = page.value.options[idx];
  const oldKey = opt.setVariable ? Object.keys(opt.setVariable)[0] : '';
  if (oldKey) {
    opt.setVariable = { [oldKey]: parseFloat(newVal) || 0 };
    script.pushState();
  }
}

// Option drag reorder
function onOptDragStart(e, idx) {
  optDragState.fromIndex = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(idx));
}

function onOptDragOver(e, toIndex) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onOptDrop(e, toIndex) {
  e.preventDefault();
  const fromIndex = optDragState.fromIndex;
  if (fromIndex === toIndex || fromIndex < 0) return;
  if (!page.value?.options) return;
  const [moved] = page.value.options.splice(fromIndex, 1);
  const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex;
  page.value.options.splice(adjusted, 0, moved);
  script.pushState();
  optDragState.fromIndex = -1;
}

function onOptDragEnd() {
  optDragState.fromIndex = -1;
}
</script>

<style scoped>
.page-inspector {
  height: 100%;
  overflow-y: auto;
}

.page-inspector.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.inspector-section {
  border-bottom: 1px solid #333;
}

.section-toggle {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  background: #2d2d2d;
  user-select: none;
}

.section-toggle:hover {
  background: #333;
}

.section-body {
  padding: 8px 12px;
}

.form-group {
  margin-bottom: 8px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-group.half {
  flex: 1;
}

.field-input {
  width: 100%;
  background: #3c3c3c;
  border: 1px solid #555;
  color: #ccc;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.field-input:focus {
  border-color: #007acc;
  outline: none;
}

.field-input[readonly] {
  cursor: pointer;
  color: #888;
}

.field-textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.4;
}

.char-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  cursor: pointer;
  border-radius: 3px;
  flex-wrap: wrap;
}

.char-row.active {
  background: #37373d;
}

.char-row:hover {
  background: #2a2d2e;
}

.char-name {
  font-size: 13px;
  color: #ccc;
  flex: 1;
}

.mini-select {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #ccc;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 11px;
}

.dialogue-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  cursor: pointer;
  border-left: 3px solid transparent;
  font-size: 13px;
}

.dialogue-row.active {
  background: #37373d;
  border-left-color: #007acc;
}

.dialogue-row:hover {
  background: #2a2d2e;
}

.dlg-index {
  color: #666;
  font-size: 11px;
  min-width: 20px;
}

.dlg-speaker-tag {
  color: #aaa;
  font-size: 12px;
  white-space: nowrap;
}

.dlg-preview {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #888;
  font-size: 12px;
}

.delete-x {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
}

.delete-x:hover {
  color: #a22;
}

.add-btn {
  background: transparent;
  border: none;
  color: #007acc;
  cursor: pointer;
  font-size: 13px;
  padding: 6px 0;
  display: block;
}

.add-btn:hover {
  text-decoration: underline;
}

.dialogue-editor {
  margin-top: 12px;
}

.editor-divider {
  text-align: center;
  color: #555;
  font-size: 11px;
  margin-bottom: 8px;
  border-top: 1px solid #333;
  padding-top: 8px;
}

.volume-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  flex: 1;
}

.volume-val {
  color: #aaa;
  font-size: 12px;
  min-width: 24px;
}

.field-with-clear {
  position: relative;
}

.field-with-clear .field-input {
  padding-right: 28px;
}

.clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
}

.clear-btn:hover {
  color: #a22;
}

.bg-preview {
  margin-top: 4px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  background: #1a1a1a;
}

.bg-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-hint {
  color: #555;
  font-size: 13px;
  text-align: center;
  padding: 8px 0;
}

/* ─── Choice Options ─── */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.option-card {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: grab;
}

.option-card:active {
  cursor: grabbing;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.option-index {
  color: #007acc;
  font-size: 12px;
  font-weight: 600;
}

.option-drag-handle {
  color: #666;
  font-size: 14px;
  cursor: grab;
  flex: 1;
}

.option-variable .variable-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.var-key {
  flex: 2;
}

.var-eq {
  color: #888;
  font-size: 13px;
  flex-shrink: 0;
}

.var-value {
  flex: 1;
}

/* ─── Speaker Combobox ─── */
.speaker-combobox {
  position: relative;
}

.speaker-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: #2d2d2d;
  border: 1px solid #555;
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: 160px;
  overflow-y: auto;
  z-index: 10;
}

.speaker-option {
  padding: 6px 8px;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
}

.speaker-option:hover {
  background: #094771;
  color: #fff;
}

/* ─── Character Scale ─── */
.char-scale-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 0 0;
}

.scale-label {
  color: #888;
  font-size: 11px;
  flex-shrink: 0;
}

.scale-slider {
  flex: 1;
  height: 4px;
}

.scale-val {
  color: #aaa;
  font-size: 11px;
  min-width: 24px;
  text-align: right;
}

/* ─── Voice Field ─── */
.dlg-voice-badge {
  font-size: 11px;
  margin-right: 2px;
  opacity: 0.7;
}

.voice-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.voice-field .field-input {
  flex: 1;
  cursor: pointer;
}

.voice-preview-btn,
.voice-clear-btn {
  background: none;
  border: 1px solid #555;
  border-radius: 3px;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 6px;
  line-height: 1;
}

.voice-preview-btn:hover {
  background: #007acc;
  border-color: #007acc;
  color: #fff;
}

.voice-clear-btn:hover {
  background: #a22;
  border-color: #a22;
  color: #fff;
}

/* ─── Font Override ─── */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #007acc;
}

.override-hint {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-row input[type="color"] {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid #555;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.reset-btn {
  background: transparent;
  border: 1px solid #555;
  color: #aaa;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
}

.reset-btn:hover {
  background: #444;
  color: #ccc;
}
</style>
