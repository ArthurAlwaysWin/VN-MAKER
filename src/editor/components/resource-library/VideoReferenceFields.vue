<script setup>
import { computed, ref } from 'vue';
import { useScriptStore } from '../../stores/script.js';
import AssetPickerModal from './AssetPickerModal.vue';

const props = defineProps({
  modelValue: { type: Object, default: null },
  title: { type: String, default: '视频' },
  playModes: { type: Array, default: () => [] },
  playModeLabels: { type: Object, default: () => ({}) },
  showPlay: { type: Boolean, default: false },
  showClear: { type: Boolean, default: true },
});

const emit = defineEmits(['update:modelValue', 'clear']);

const script = useScriptStore();
const pickerVisible = ref(false);
const pickerField = ref('file');

const reference = computed(() => props.modelValue && typeof props.modelValue === 'object'
  ? props.modelValue
  : {});

const videoOptions = computed(() => Object.entries(script.data?.assets?.videos || {})
  .map(([id, video]) => ({
    id,
    label: video.label || id,
    file: video.file || '',
    kind: video.kind || 'other',
  }))
  .sort((left, right) => left.label.localeCompare(right.label)));

const sourceLabel = computed(() => {
  if (reference.value.videoId) {
    return `assets.videos.${reference.value.videoId}`;
  }
  if (reference.value.file) {
    return reference.value.file;
  }
  return '';
});

function cleanPatchValue(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

function emitPatch(patch) {
  const next = { ...reference.value };
  for (const [key, value] of Object.entries(patch)) {
    const cleaned = cleanPatchValue(value);
    if (cleaned === undefined) {
      delete next[key];
    } else {
      next[key] = cleaned;
    }
  }
  emit('update:modelValue', next);
}

function setRegistrySource(videoId) {
  const nextId = cleanPatchValue(videoId);
  if (!nextId) {
    emitPatch({ videoId: undefined });
    return;
  }
  emitPatch({ videoId: nextId, file: undefined });
}

function setDirectFile(path) {
  emitPatch({ file: path, videoId: undefined });
}

function setNumberField(field, rawValue) {
  const value = Number(rawValue);
  emitPatch({ [field]: Number.isFinite(value) ? value : undefined });
}

function setBooleanField(field, checked) {
  emitPatch({ [field]: checked });
}

function openVideoPicker(field = 'file') {
  pickerField.value = field;
  pickerVisible.value = true;
}

function onPickerSelect(path) {
  pickerVisible.value = false;
  if (!path) return;
  if (pickerField.value === 'poster') {
    emitPatch({ poster: path });
  } else {
    setDirectFile(path);
  }
}

function clearReference() {
  emit('clear');
  emit('update:modelValue', null);
}
</script>

<template>
  <div class="video-reference-fields">
    <div class="video-reference-header">
      <div>
        <strong>{{ title }}</strong>
        <span v-if="sourceLabel" class="source-chip">{{ sourceLabel }}</span>
      </div>
      <button v-if="showClear" type="button" class="mini-btn danger" @click="clearReference">清除</button>
    </div>

    <label class="video-field">
      <span>注册视频</span>
      <select class="field-input" :value="reference.videoId || ''" @change="setRegistrySource($event.target.value)">
        <option value="">直接引用文件</option>
        <option v-for="option in videoOptions" :key="option.id" :value="option.id">
          {{ option.label }} ({{ option.id }})
        </option>
      </select>
    </label>

    <label class="video-field">
      <span>文件</span>
      <div class="field-with-clear">
        <input
          class="field-input"
          type="text"
          readonly
          :value="reference.file || ''"
          placeholder="videos/intro.mp4"
          @click="openVideoPicker('file')"
        >
        <button type="button" class="mini-btn" @click.prevent="openVideoPicker('file')">选择</button>
      </div>
    </label>

    <label class="video-field">
      <span>封面</span>
      <div class="field-with-clear">
        <input
          class="field-input"
          type="text"
          :value="reference.poster || ''"
          placeholder="videos/intro.poster.png"
          @input="emitPatch({ poster: $event.target.value })"
        >
        <button type="button" class="mini-btn" @click.prevent="openVideoPicker('poster')">选择</button>
      </div>
    </label>

    <div class="video-field-grid">
      <label class="video-field">
        <span>适配</span>
        <select class="field-input" :value="reference.fit || 'contain'" @change="emitPatch({ fit: $event.target.value })">
          <option value="contain">contain</option>
          <option value="cover">cover</option>
          <option value="native">native</option>
        </select>
      </label>

      <label class="video-field">
        <span>音频模式</span>
        <select class="field-input" :value="reference.audioMode || 'replace'" @change="emitPatch({ audioMode: $event.target.value })">
          <option value="replace">replace</option>
          <option value="duck">duck</option>
          <option value="mix">mix</option>
        </select>
      </label>
    </div>

    <label v-if="showPlay && playModes.length" class="video-field">
      <span>播放时机</span>
      <select class="field-input" :value="reference.play || playModes[0]" @change="emitPatch({ play: $event.target.value })">
        <option v-for="mode in playModes" :key="mode" :value="mode">
          {{ playModeLabels[mode] || mode }}
        </option>
      </select>
    </label>

    <label class="video-field">
      <span>音量 {{ Number(reference.volume ?? 1).toFixed(1) }}</span>
      <input
        class="volume-slider"
        type="range"
        min="0"
        max="1"
        step="0.1"
        :value="reference.volume ?? 1"
        @input="setNumberField('volume', $event.target.value)"
      >
    </label>

    <div class="video-toggles">
      <label><input type="checkbox" :checked="reference.skippable !== false" @change="setBooleanField('skippable', $event.target.checked)"> 可跳过</label>
      <label><input type="checkbox" :checked="reference.controls === true" @change="setBooleanField('controls', $event.target.checked)"> 显示控件</label>
    </div>

    <AssetPickerModal
      category="videos"
      :visible="pickerVisible"
      @select="onPickerSelect"
      @close="pickerVisible = false"
    />
  </div>
</template>

<style scoped>
.video-reference-fields {
  display: grid;
  gap: 10px;
}

.video-reference-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #ddd;
}

.source-chip {
  display: inline-block;
  max-width: 220px;
  margin-left: 8px;
  color: #8ab4f8;
  font-size: 11px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.video-field {
  display: grid;
  gap: 5px;
  color: #aaa;
  font-size: 12px;
}

.video-field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
}

.field-with-clear {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
}

.mini-btn {
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  background: #2a2a2a;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  padding: 5px 8px;
}

.mini-btn:hover {
  border-color: #007acc;
  color: #fff;
}

.mini-btn.danger:hover {
  border-color: #8a3a3a;
  color: #ffb4b4;
}

.volume-slider {
  width: 100%;
}

.video-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #bbb;
  font-size: 12px;
}
</style>
