<template>
  <span class="contrast-badge" :class="{ pass: info.passes, fail: !info.passes }">
    {{ info.passes ? '✓' : '⚠️' }} {{ info.ratio }}:1
    <button v-if="!info.passes" class="fix-btn" @click="onFix" title="自动修复对比度">修复</button>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { contrastRatio, autoFix } from '../../../engine/contrast.js';
import { useThemeEditor } from '../../composables/useThemeEditor.js';

const props = defineProps({
  tokenKey: String,
});

const editor = useThemeEditor();

// ─── Helpers ─────────────────────────────────────────

function rgbaToHex(val) {
  if (!val) return '#000000';
  if (val.startsWith('#')) return val;
  const m = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return '#000000';
  const r = parseInt(m[1]).toString(16).padStart(2, '0');
  const g = parseInt(m[2]).toString(16).padStart(2, '0');
  const b = parseInt(m[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function parseAlpha(val) {
  if (!val || !val.startsWith('rgba')) return 1;
  const m = val.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

function buildRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

// ─── Contrast Info ───────────────────────────────────

const info = computed(() => {
  const tokens = editor.getMergedTokens();
  const textVal = tokens[props.tokenKey];
  const bgVal = tokens['panel-bg'];
  const textHex = rgbaToHex(textVal);
  const bgHex = rgbaToHex(bgVal);
  const ratio = contrastRatio(textHex, bgHex);
  return { ratio: ratio.toFixed(1), passes: ratio >= 4.5 };
});

// ─── Auto-Fix ────────────────────────────────────────

function onFix() {
  const tokens = editor.getMergedTokens();
  const textVal = tokens[props.tokenKey];
  const bgVal = tokens['panel-bg'];
  const textHex = rgbaToHex(textVal);
  const bgHex = rgbaToHex(bgVal);
  const result = autoFix(textHex, bgHex, 4.5);
  if (result && result.direction !== 'none') {
    const alpha = parseAlpha(textVal);
    const newValue = buildRgba(result.hex, alpha);
    editor.setToken(props.tokenKey, newValue);
    editor.commitTheme();
  }
}
</script>

<style scoped>
.contrast-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
.contrast-badge.pass {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}
.contrast-badge.fail {
  color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
}
.fix-btn {
  margin-left: 4px;
  font-size: 10px;
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.4);
  color: #ff9800;
  padding: 1px 6px;
  border-radius: 2px;
  cursor: pointer;
}
</style>
