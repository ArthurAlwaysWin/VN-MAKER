<template>
  <Teleport to="body">
    <div class="preset-overlay" @click.self="onClose">
      <div class="preset-modal">
        <!-- Header -->
        <div class="modal-header">
          <h3>📦 主题预设</h3>
          <button class="close-btn" @click="onClose">✕</button>
        </div>

        <!-- Body: 2×2 preset card grid -->
        <div class="modal-body">
          <div class="preset-grid">
            <div
              v-for="preset in THEME_PRESETS"
              :key="preset.id"
              class="preset-card"
              :class="{ selected: selectedId === preset.id }"
              @click="onSelectPreset(preset)"
            >
              <div class="card-swatches">
                <div class="swatch" :style="{ background: preset.tokens['primary'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['accent'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['text'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['panel-bg'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['btn-bg'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['border-hover'] }"></div>
              </div>
              <div class="card-label">{{ preset.name }}</div>
              <div class="card-desc">{{ preset.description }}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="cancel-btn" @click="onClose">取消</button>
          <button class="apply-btn" :disabled="!selectedId" @click="onApply">应用预设</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import { THEME_PRESETS } from '../../../engine/presets.js';

const emit = defineEmits(['close']);
const editor = useThemeEditor();
const selectedId = ref(null);

function onSelectPreset(preset) {
  selectedId.value = preset.id;
  editor.previewPreset(preset.tokens);
}

function onApply() {
  const preset = THEME_PRESETS.find(p => p.id === selectedId.value);
  if (!preset) return;
  editor.applyPreset(preset.tokens);
  emit('close');
}

function onClose() {
  editor.cancelPreview();
  emit('close');
}
</script>

<style scoped>
.preset-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.preset-modal {
  background: #252526;
  border: 1px solid #444;
  border-radius: 8px;
  width: 520px;
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
.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.preset-card {
  background: #2d2d2d;
  border: 2px solid #444;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 150ms;
}
.preset-card:hover {
  border-color: #666;
}
.preset-card.selected {
  border-color: #b4a0ff;
}
.card-swatches {
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
}
.swatch {
  width: 100%;
  height: 24px;
  border-radius: 2px;
}
.card-label {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 500;
  margin-bottom: 2px;
}
.card-desc {
  font-size: 11px;
  color: #888;
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
