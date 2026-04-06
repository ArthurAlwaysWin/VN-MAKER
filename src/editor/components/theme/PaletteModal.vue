<template>
  <Teleport to="body">
    <div class="palette-overlay" @click.self="$emit('close')">
      <div class="palette-modal">
        <div class="modal-header">
          <h3>🎨 调色盘生成器</h3>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <!-- Step 1: Pick primary color -->
          <div class="step-section">
            <label class="step-label">选择主色</label>
            <div class="primary-picker">
              <input type="color" v-model="primaryColor" class="color-picker-lg" />
              <span class="primary-hex">{{ primaryColor }}</span>
            </div>
          </div>

          <!-- Step 2: Algorithm cards (2×2 grid) -->
          <div class="step-section">
            <label class="step-label">选择配色方案</label>
            <div class="algorithm-grid">
              <div
                v-for="alg in algorithmPreviews"
                :key="alg.id"
                class="algorithm-card"
                :class="{ selected: selectedAlgorithm === alg.id }"
                @click="selectedAlgorithm = alg.id"
              >
                <div class="card-swatches">
                  <div
                    v-for="(color, i) in alg.swatches"
                    :key="i"
                    class="swatch"
                    :style="{ background: color }"
                  ></div>
                </div>
                <div class="card-label">{{ alg.label }}</div>
                <div class="card-desc">{{ alg.desc }}</div>
              </div>
            </div>
          </div>

          <!-- Step 3: Full palette preview -->
          <div v-if="fullPalette" class="step-section">
            <label class="step-label">生成预览 ({{ Object.keys(fullPalette).length }} 色)</label>
            <div class="palette-preview">
              <div
                v-for="(color, key) in fullPalette"
                :key="key"
                class="palette-item"
                :title="key"
              >
                <div class="palette-swatch" :style="{ background: color }"></div>
                <span class="palette-key">{{ key }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" @click="$emit('close')">取消</button>
          <button class="apply-btn" :disabled="!fullPalette" @click="applyPalette">应用配色</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import { generatePalette } from '../../../engine/colorHarmony.js';
import { DEFAULT_TOKENS } from '../../../engine/tokens.js';

const emit = defineEmits(['close']);
const editor = useThemeEditor();

// ─── State ──────────────────────────────────────────
const primaryColor = ref('#7733aa');
const selectedAlgorithm = ref(null);

const ALGORITHMS = [
  { id: 'complementary', label: '互补色', desc: '对比强烈' },
  { id: 'analogous', label: '类似色', desc: '柔和统一' },
  { id: 'triadic', label: '三角色', desc: '丰富平衡' },
  { id: 'split-complementary', label: '分裂互补', desc: '活泼协调' },
];

// ─── Algorithm Card Previews ────────────────────────
const algorithmPreviews = computed(() => {
  return ALGORITHMS.map(alg => {
    const palette = generatePalette(primaryColor.value, alg.id);
    const previewKeys = ['primary', 'accent', 'text', 'panel-bg', 'btn-bg', 'border-hover'];
    const swatches = previewKeys.map(k => palette[k]);
    return { ...alg, swatches, palette };
  });
});

// ─── Full Palette Preview ───────────────────────────
const fullPalette = computed(() => {
  if (!selectedAlgorithm.value) return null;
  return generatePalette(primaryColor.value, selectedAlgorithm.value);
});

// ─── Apply with Alpha Preservation (Pitfall 1) ─────
function applyPalette() {
  if (!fullPalette.value) return;
  const tokens = editor.getMergedTokens();
  const result = {};

  for (const [key, paletteHex] of Object.entries(fullPalette.value)) {
    const current = tokens[key] || DEFAULT_TOKENS[key];
    if (current && current.startsWith('rgba')) {
      const m = current.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\)/);
      const alpha = m ? parseFloat(m[1]) : 1;
      const r = parseInt(paletteHex.slice(1, 3), 16);
      const g = parseInt(paletteHex.slice(3, 5), 16);
      const b = parseInt(paletteHex.slice(5, 7), 16);
      result[key] = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    } else if (current && current.startsWith('linear-gradient')) {
      result[key] = paletteHex;
    } else {
      result[key] = paletteHex;
    }
  }

  editor.setTokenBatch(result);
  editor.commitTheme();
  emit('close');
}
</script>

<style scoped>
.palette-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.palette-modal {
  background: #252526;
  border: 1px solid #444;
  border-radius: 8px;
  width: 560px;
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
.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}
.step-section {
  margin-bottom: 16px;
}
.step-label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 8px;
}
.primary-picker {
  display: flex;
  align-items: center;
  gap: 8px;
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
.primary-hex {
  font-family: monospace;
  font-size: 13px;
  color: #ccc;
}
.algorithm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.algorithm-card {
  background: #2d2d2d;
  border: 2px solid #444;
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  transition: border-color 150ms;
}
.algorithm-card:hover {
  border-color: #666;
}
.algorithm-card.selected {
  border-color: #b4a0ff;
}
.card-swatches {
  display: flex;
  gap: 2px;
  margin-bottom: 6px;
}
.swatch {
  width: 100%;
  height: 20px;
  border-radius: 2px;
}
.card-label {
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 500;
}
.card-desc {
  font-size: 11px;
  color: #888;
}
.palette-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}
.palette-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
}
.palette-swatch {
  width: 40px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid #444;
}
.palette-key {
  font-size: 9px;
  color: #888;
  text-align: center;
  margin-top: 2px;
  word-break: break-all;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #333;
}
.cancel-btn {
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.apply-btn {
  background: rgba(180, 160, 255, 0.3);
  color: #e0e0e0;
  border: 1px solid rgba(180, 160, 255, 0.5);
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.apply-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
