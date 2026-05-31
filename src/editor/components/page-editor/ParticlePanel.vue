<template>
  <div class="particle-panel" data-test="particle-panel">
    <div class="particle-header">
      <label>页面粒子 <HelpTip :text="helpText" /></label>
      <select
        class="field-input mode-select"
        :value="mode"
        @change="emitMode($event.target.value)"
      >
        <option value="inherit">继承上一页</option>
        <option value="stop">停止粒子</option>
        <option value="play">播放粒子</option>
      </select>
    </div>

    <div v-if="mode === 'play'" class="particle-controls">
      <div class="form-row">
        <div class="form-group half">
          <label>预设</label>
          <select
            class="field-input"
            :value="draftConfig.preset"
            @change="setPreset($event.target.value)"
          >
            <option v-for="option in presetOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="form-group half">
          <label>方向</label>
          <select
            class="field-input"
            :value="draftConfig.direction"
            @change="setField('direction', $event.target.value)"
          >
            <option v-for="option in directionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="slider-row">
        <label>密度</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="draftConfig.density"
          @change="setNumberField('density', $event.target.value)"
        />
        <span>{{ formatNumber(draftConfig.density, 2) }}</span>
      </div>
      <div class="slider-row">
        <label>速度</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          :value="draftConfig.speed"
          @change="setNumberField('speed', $event.target.value)"
        />
        <span>{{ formatNumber(draftConfig.speed, 2) }}</span>
      </div>
      <div class="slider-row">
        <label>风力</label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.05"
          :value="draftConfig.wind"
          @change="setNumberField('wind', $event.target.value)"
        />
        <span>{{ formatNumber(draftConfig.wind, 2) }}</span>
      </div>
      <div class="slider-row">
        <label>透明度</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="draftConfig.opacity"
          @change="setNumberField('opacity', $event.target.value)"
        />
        <span>{{ formatNumber(draftConfig.opacity, 2) }}</span>
      </div>

      <div class="color-row">
        <label>颜色</label>
        <input
          type="color"
          :value="draftConfig.color"
          @change="setField('color', $event.target.value)"
        />
        <span>{{ draftConfig.color }}</span>
      </div>
    </div>

    <p v-else class="particle-summary">
      {{ mode === 'stop' ? '进入本页时淡出并停止粒子。' : '本页不写入粒子设置，沿用前面页面的有效状态。' }}
    </p>

    <div class="transition-toolbar particle-preview">
      <button
        class="preview-btn"
        :disabled="previewDisabled"
        @click="emitPreview"
      >
        {{ previewUiState?.isBusy ? '预览中…' : '▶ 预览粒子' }}
      </button>
      <span class="preview-status" :class="statusClass">
        {{ visibleStatusText }}
      </span>
      <HelpTip :text="previewHelpText" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import HelpTip from '../HelpTip.vue';
import {
  PARTICLE_PRESETS,
  PARTICLE_PRESET_DEFS,
  normalizeParticleConfig,
  formatParticleLabel,
} from '../../../shared/particleContract.js';

const props = defineProps({
  particles: { default: undefined },
  previewUiState: { type: Object, default: () => ({}) },
  disabledReason: { type: String, default: null },
  statusText: { type: String, default: '' },
  statusClass: { type: String, default: '' },
  helpText: { type: String, default: '' },
  previewHelpText: { type: String, default: '' },
});

const emit = defineEmits(['mode-change', 'update-particles', 'preview']);

const directionOptions = [
  { value: 'down', label: '向下' },
  { value: 'up', label: '向上' },
  { value: 'left', label: '向左' },
  { value: 'right', label: '向右' },
];

const presetOptions = PARTICLE_PRESETS.map((preset) => ({
  value: preset,
  label: formatParticleLabel(preset),
}));

const mode = computed(() => {
  if (props.particles === null) return 'stop';
  if (props.particles && typeof props.particles === 'object') return 'play';
  return 'inherit';
});

const draftConfig = computed(() => (
  normalizeParticleConfig(props.particles) || normalizeParticleConfig({ preset: 'dust' })
));

const previewDisabled = computed(() => (
  props.previewUiState?.isBusy
  || mode.value !== 'play'
  || Boolean(props.disabledReason)
));

const visibleStatusText = computed(() => {
  if (props.statusText) return props.statusText;
  if (mode.value !== 'play') return '选择播放粒子后可预览';
  return '';
});

function formatNumber(value, digits) {
  return Number(value || 0).toFixed(digits);
}

function emitMode(nextMode) {
  emit('mode-change', nextMode);
}

function emitConfig(config) {
  const normalized = normalizeParticleConfig(config);
  if (normalized) {
    emit('update-particles', normalized);
  }
}

function setPreset(preset) {
  const def = PARTICLE_PRESET_DEFS[preset] || PARTICLE_PRESET_DEFS.dust;
  emitConfig({
    ...draftConfig.value,
    preset: def.id,
    density: def.defaultDensity,
    color: def.color,
    direction: def.direction,
  });
}

function setField(field, value) {
  emitConfig({
    ...draftConfig.value,
    [field]: value,
  });
}

function setNumberField(field, value) {
  setField(field, Number(value));
}

function emitPreview() {
  if (previewDisabled.value) return;
  emit('preview', draftConfig.value);
}
</script>

<style scoped>
.particle-panel {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.particle-header {
  display: grid;
  grid-template-columns: 1fr 150px;
  gap: 10px;
  align-items: center;
}

.particle-header label,
.form-group label {
  display: block;
  margin-bottom: 4px;
  color: #aaa;
  font-size: 12px;
}

.mode-select {
  min-width: 0;
}

.form-row {
  display: flex;
  gap: 10px;
}

.form-group {
  margin-bottom: 10px;
}

.form-group.half {
  flex: 1;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid #4a4d5f;
  border-radius: 4px;
  background: #252837;
  color: #f5f7ff;
  font-size: 13px;
}

.field-input:focus {
  border-color: #6aa9ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(106, 169, 255, 0.18);
}

.particle-controls {
  margin-top: 10px;
}

.slider-row,
.color-row {
  display: grid;
  grid-template-columns: 56px 1fr 54px;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #d4d7e2;
}

.slider-row input[type='range'] {
  width: 100%;
}

.color-row input[type='color'] {
  width: 100%;
  height: 28px;
  padding: 1px;
  border: 1px solid #3a3d4d;
  border-radius: 6px;
  background: #1a1d29;
}

.color-row span,
.slider-row span {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: #9ea4b8;
}

.particle-summary {
  margin: 10px 0 0;
  color: #9ea4b8;
  font-size: 12px;
  line-height: 1.45;
}

.particle-preview {
  margin-top: 10px;
}

.transition-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 28px;
}

.preview-btn {
  border: none;
  border-radius: 4px;
  background: linear-gradient(135deg, #2d7dff, #43a1ff);
  color: white;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}

.preview-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.preview-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.preview-status {
  min-width: 0;
  color: #9ea4b8;
  font-size: 12px;
}

.preview-status.is-busy {
  color: #7db8ff;
}

.preview-status.is-warning {
  color: #f0bd66;
}

.preview-status.is-error {
  color: #ff8f8f;
}

.preview-status.is-success {
  color: #9adc8f;
}
</style>
