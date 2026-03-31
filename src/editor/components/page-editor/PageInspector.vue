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
              <option value="fade">fade</option>
              <option value="slide-left">slide-left</option>
              <option value="slide-right">slide-right</option>
              <option value="none">none</option>
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
        </div>
        <div v-if="page.characters.length === 0" class="empty-hint">当前页面无角色</div>
        <button class="add-btn" @click="editor.showCharPicker.value = true">+ 添加角色</button>
      </div>
    </div>

    <!-- Section 3: Dialogues -->
    <div class="inspector-section">
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
          <span class="dlg-speaker-tag">{{ dlg.speaker ? getCharName(dlg.speaker) : '(旁白)' }}:</span>
          <span class="dlg-preview">"{{ truncate(dlg.text, 15) }}"</span>
          <button class="delete-x" @click.stop="removeDialogue(idx)">✕</button>
        </div>
        <button class="add-btn" @click="addDialogue">+ 添加对话</button>

        <!-- Detail editor for selected dialogue -->
        <div v-if="selectedDialogue" class="dialogue-editor">
          <div class="editor-divider">── 编辑选中对话 ──</div>
          <div class="form-group">
            <label>说话者</label>
            <select :value="selectedDialogue.speaker || ''"
              @change="setSpeaker($event.target.value)" class="field-input">
              <option value="">（旁白）</option>
              <option v-for="[charId, char] in characterEntries" :key="charId" :value="charId">
                {{ char.name }}
              </option>
            </select>
          </div>
          <div class="form-group" v-if="selectedDialogue.speaker">
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
            <label>内容</label>
            <textarea :value="selectedDialogue.text"
              @input="setDialogueText($event.target.value)"
              rows="3" class="field-input field-textarea"
              placeholder="输入对话内容..."></textarea>
          </div>
        </div>
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
  </div>

  <!-- Empty state -->
  <div class="page-inspector empty" v-else>
    <div class="empty-hint">选择一个页面以编辑属性</div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';

const editor = usePageEditor();
const script = useScriptStore();

const sections = reactive({ props: true, chars: true, dialogues: true, audio: true });
const dlgDragState = reactive({ fromIndex: -1 });

const page = computed(() => editor.currentPage.value);
const selectedDialogue = computed(() => editor.currentDialogue.value);
const characterEntries = computed(() => Object.entries(script.data?.characters || {}));

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

// Dialogue management
function addDialogue() {
  if (!page.value) return;
  page.value.dialogues.push({ speaker: null, text: '', expression: null });
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

function setSpeaker(charId) {
  if (!selectedDialogue.value) return;
  selectedDialogue.value.speaker = charId || null;
  script.pushState();
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
</style>
