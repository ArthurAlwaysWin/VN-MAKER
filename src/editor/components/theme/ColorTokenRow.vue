<template>
  <div class="color-row" :class="{ 'is-overridden': isOverridden }">
    <label class="token-label">
      {{ label || tokenKey }}
      <span v-if="isOverridden" class="override-badge" title="已覆盖（手动编辑）">✎</span>
    </label>
    <div class="color-controls">
      <input
        type="color"
        :value="hexValue"
        @input="onColorInput"
        @change="onColorChange"
        class="color-picker"
      />
      <input
        type="text"
        :value="hexInput"
        @input="onHexInput"
        @blur="onHexBlur"
        class="hex-input"
        maxlength="7"
      />
      <template v-if="hasAlpha">
        <input
          type="range"
          :value="alphaValue"
          min="0"
          max="100"
          @input="onAlphaInput"
          @change="onAlphaChange"
          class="alpha-slider"
        />
        <span class="alpha-label">{{ alphaValue }}%</span>
      </template>
      <button v-if="isOverridden" class="reset-derived-btn" @click="resetToDerived" title="恢复派生值">↺</button>
    </div>
    <ContrastBadge v-if="showContrast" :token-key="tokenKey" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import ContrastBadge from './ContrastBadge.vue';

const props = defineProps({
  tokenKey: String,
  label: String,
  hasAlpha: Boolean,
  showContrast: Boolean,
});

const editor = useThemeEditor();

// ─── Override Detection (D-20, D-21) ─────────────────
const isOverridden = computed(() => {
  const overrides = editor.getTokenOverrides();
  return props.tokenKey in overrides;
});

function resetToDerived() {
  editor.removeTokenOverride(props.tokenKey);
  editor.commitTheme();
}

// ─── Helpers ─────────────────────────────────────────

function parseRgba(rgba) {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/);
  if (!m) return { hex: '#000000', alpha: 100 };
  const r = parseInt(m[1]).toString(16).padStart(2, '0');
  const g = parseInt(m[2]).toString(16).padStart(2, '0');
  const b = parseInt(m[3]).toString(16).padStart(2, '0');
  const a = m[4] !== undefined ? Math.round(parseFloat(m[4]) * 100) : 100;
  return { hex: `#${r}${g}${b}`, alpha: a };
}

function buildRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${(alpha / 100).toFixed(2)})`;
}

// ─── Computed ────────────────────────────────────────

const currentValue = computed(() => editor.getMergedTokens()[props.tokenKey]);

const hexValue = computed(() => {
  const val = currentValue.value;
  if (props.hasAlpha && val && val.startsWith('rgba')) return parseRgba(val).hex;
  return val || '#000000';
});

const alphaValue = computed(() => {
  if (!props.hasAlpha) return 100;
  const val = currentValue.value;
  if (val && val.startsWith('rgba')) return parseRgba(val).alpha;
  return 100;
});

const hexInput = ref(hexValue.value);
watch(hexValue, (v) => { hexInput.value = v; });

// ─── Event Handlers ──────────────────────────────────

function onColorInput(e) {
  const hex = e.target.value;
  hexInput.value = hex;
  if (props.hasAlpha) {
    editor.setToken(props.tokenKey, buildRgba(hex, alphaValue.value));
  } else {
    editor.setToken(props.tokenKey, hex);
  }
}

function onColorChange() {
  editor.commitTheme();
}

function onHexInput(e) {
  hexInput.value = e.target.value;
  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
    if (props.hasAlpha) {
      editor.setToken(props.tokenKey, buildRgba(e.target.value, alphaValue.value));
    } else {
      editor.setToken(props.tokenKey, e.target.value);
    }
  }
}

function onHexBlur() {
  editor.commitTheme();
}

function onAlphaInput(e) {
  const a = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
  editor.setToken(props.tokenKey, buildRgba(hexValue.value, a));
}

function onAlphaChange() {
  editor.commitTheme();
}
</script>

<style scoped>
.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  flex-wrap: wrap;
}
.token-label {
  width: 120px;
  font-size: 12px;
  color: #aaa;
  flex-shrink: 0;
}
.color-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
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
.hex-input {
  width: 72px;
  font-size: 12px;
  font-family: monospace;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  padding: 2px 6px;
  border-radius: 3px;
}
.alpha-slider {
  width: 60px;
  accent-color: #b4a0ff;
}
.alpha-label {
  font-size: 11px;
  color: #888;
  width: 32px;
}
.is-overridden {
  background: rgba(180, 160, 255, 0.05);
}
.override-badge {
  font-size: 10px;
  color: #b4a0ff;
  margin-left: 4px;
}
.reset-derived-btn {
  background: none;
  border: 1px solid #555;
  color: #aaa;
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
}
.reset-derived-btn:hover {
  background: #444;
  color: #e0e0e0;
}
</style>
