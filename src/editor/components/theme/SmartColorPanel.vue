<template>
  <div class="smart-color-panel">
    <div class="panel-header">
      <span class="panel-title">🎯 智能配色</span>
    </div>

    <!-- Row 1: Primary (left) + Accent (right) pickers — D-11 -->
    <div class="picker-row">
      <div class="picker-group">
        <label class="picker-label">主色</label>
        <div class="picker-controls">
          <input type="color" :value="primaryColor" @input="onPrimaryInput" @change="onPrimaryChange" class="color-picker-lg" />
          <span class="picker-hex">{{ primaryColor }}</span>
        </div>
      </div>
      <div class="picker-group">
        <label class="picker-label">
          强调色
          <span v-if="!isAccentManual" class="auto-badge">自动</span>
        </label>
        <div class="picker-controls">
          <input type="color" :value="accentColor" @input="onAccentInput" @change="onAccentChange" class="color-picker-lg" />
          <span class="picker-hex">{{ accentColor }}</span>
          <button v-if="isAccentManual" class="reset-btn" @click="resetAccentToAuto" title="恢复自动">↺</button>
        </div>
      </div>
    </div>

    <!-- Row 2: Mode toggle + Algorithm dropdown — D-12, D-13 -->
    <div class="controls-row">
      <div class="mode-toggle">
        <label class="control-label">模式</label>
        <div class="toggle-group">
          <button :class="['toggle-btn', { active: mode === 'dark' }]" @click="setMode('dark')">深色</button>
          <button :class="['toggle-btn', { active: mode === 'light' }]" @click="setMode('light')">浅色</button>
        </div>
      </div>
      <div class="algorithm-select">
        <label class="control-label">色彩和谐</label>
        <select v-model="algorithm" @change="onAlgorithmChange" class="algo-dropdown">
          <option v-for="alg in ALGORITHMS" :key="alg.id" :value="alg.id">{{ alg.label }} — {{ alg.desc }}</option>
        </select>
      </div>
    </div>

    <!-- Row 3: Token preview strip — D-16 -->
    <div class="token-strip">
      <div v-for="(color, key) in currentTokens" :key="key" class="strip-swatch" :style="{ background: color }" :title="key"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import { deriveTokens, hexToOklch, oklchToRgb, clampChroma } from '../../../engine/oklch.js';

const editor = useThemeEditor();

// ─── Harmony Algorithms ─────────────────────────────
const ALGORITHMS = [
  { id: 'complementary', label: '互补色', desc: '对比强烈' },
  { id: 'analogous', label: '类似色', desc: '柔和统一' },
  { id: 'triadic', label: '三角色', desc: '丰富平衡' },
  { id: 'split-complementary', label: '分裂互补', desc: '活泼协调' },
];

const HUE_SHIFTS = {
  'complementary': 180,
  'analogous': 30,
  'triadic': 120,
  'split-complementary': 150,
};

// ─── State ──────────────────────────────────────────
const primaryColor = ref('#7733aa');
const accentColor = ref('#ff6b9d');
const mode = ref('dark');
const algorithm = ref('complementary');
const isAccentManual = ref(false);

// ─── Init from existing recipe ──────────────────────
onMounted(() => {
  const recipe = editor.getColorRecipe();
  if (recipe) {
    primaryColor.value = recipe.primary;
    accentColor.value = recipe.accent;
    mode.value = recipe.mode || 'dark';
    algorithm.value = recipe.algorithm || 'complementary';
    isAccentManual.value = recipe.isAccentManual || false;
  }
});

// ─── Harmony Accent Derivation (D-14) ───────────────
function computeHarmonyAccent(primaryHex, alg) {
  const p = hexToOklch(primaryHex);
  const shift = HUE_SHIFTS[alg] ?? 180;
  const newH = (p.h + shift) % 360;
  const safeC = clampChroma(p.l, p.c, newH);
  const [r, g, b] = oklchToRgb(p.l, safeC, newH);
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

// ─── Derived Tokens for Preview Strip (D-16) ────────
const currentTokens = computed(() => {
  return deriveTokens(primaryColor.value, accentColor.value, mode.value);
});

// ─── Build Recipe Object ────────────────────────────
function buildRecipe() {
  return {
    primary: primaryColor.value,
    accent: accentColor.value,
    mode: mode.value,
    algorithm: algorithm.value,
    isAccentManual: isAccentManual.value,
  };
}

// ─── Push to Preview (no undo) ──────────────────────
function pushPreview() {
  editor.setColorRecipe(buildRecipe());
}

// ─── Commit (undo-safe) ─────────────────────────────
function commit() {
  editor.commitTheme();
}

// ─── Event Handlers (D-18: input → preview, change → commit) ─

function onPrimaryInput(e) {
  primaryColor.value = e.target.value;
  if (!isAccentManual.value) {
    accentColor.value = computeHarmonyAccent(e.target.value, algorithm.value);
  }
  pushPreview();
}

function onPrimaryChange() {
  commit();
}

function onAccentInput(e) {
  accentColor.value = e.target.value;
  isAccentManual.value = true;
  pushPreview();
}

function onAccentChange() {
  commit();
}

function setMode(newMode) {
  mode.value = newMode;
  pushPreview();
  commit();
}

function onAlgorithmChange() {
  if (!isAccentManual.value) {
    accentColor.value = computeHarmonyAccent(primaryColor.value, algorithm.value);
  }
  pushPreview();
  commit();
}

function resetAccentToAuto() {
  isAccentManual.value = false;
  accentColor.value = computeHarmonyAccent(primaryColor.value, algorithm.value);
  pushPreview();
  commit();
}
</script>

<style scoped>
.smart-color-panel {
  padding: 12px;
  border-bottom: 1px solid #333;
  background: #252526;
}
.panel-header {
  margin-bottom: 10px;
}
.panel-title {
  font-size: 14px;
  font-weight: 500;
  color: #e0e0e0;
}
.picker-row {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
}
.picker-group {
  flex: 1;
}
.picker-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}
.auto-badge {
  font-size: 10px;
  color: #888;
  background: #333;
  padding: 1px 5px;
  border-radius: 3px;
}
.picker-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.color-picker-lg {
  width: 48px;
  height: 32px;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  background: none;
  padding: 0;
}
.picker-hex {
  font-family: monospace;
  font-size: 12px;
  color: #ccc;
}
.reset-btn {
  background: #333;
  border: 1px solid #555;
  color: #aaa;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
}
.reset-btn:hover {
  background: #444;
  color: #e0e0e0;
}
.controls-row {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
  align-items: flex-end;
}
.mode-toggle, .algorithm-select {
  flex: 1;
}
.control-label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}
.toggle-group {
  display: flex;
  border: 1px solid #444;
  border-radius: 4px;
  overflow: hidden;
}
.toggle-btn {
  flex: 1;
  padding: 4px 12px;
  border: none;
  background: #333;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
}
.toggle-btn.active {
  background: rgba(180, 160, 255, 0.3);
  color: #e0e0e0;
}
.toggle-btn:hover:not(.active) {
  background: #3a3a3a;
}
.algo-dropdown {
  width: 100%;
  padding: 4px 8px;
  background: #333;
  border: 1px solid #444;
  color: #e0e0e0;
  border-radius: 4px;
  font-size: 12px;
}
.token-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.strip-swatch {
  width: 18px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
