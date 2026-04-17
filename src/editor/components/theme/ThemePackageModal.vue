<template>
  <Teleport to="body">
    <div class="pkg-overlay" @click.self="$emit('close')">
      <div class="pkg-modal">
        <!-- Header -->
        <div class="modal-header">
          <h3>🎭 内置主题包</h3>
          <button class="close-btn" @click="$emit('close')" title="关闭">✕</button>
        </div>

        <div class="modal-desc">
          选择一套完整主题包，一键应用色彩、控件风格和界面布局。应用后可按 <kbd>Ctrl+Z</kbd> 撤销。
        </div>

        <!-- Body: theme cards -->
        <div class="modal-body">
          <div class="theme-grid">
            <div
              v-for="theme in BUILTIN_THEMES"
              :key="theme.id"
              class="theme-card"
              :class="{ selected: selectedId === theme.id }"
              @click="selectedId = theme.id"
            >
              <div class="card-accent" :style="{ background: theme.primaryColor }"></div>
              <div class="card-info">
                <div class="card-name">{{ theme.name }}</div>
                <div class="card-desc">{{ theme.description }}</div>
                <div class="card-badges">
                  <span class="badge">色彩</span>
                  <span class="badge" v-if="Object.keys(theme.widgetStyles).length">控件</span>
                  <span class="badge" v-if="Object.keys(theme.screens).length">布局</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="cancel-btn" @click="$emit('close')">取消</button>
          <button class="apply-btn" :disabled="!selectedId" @click="onApply">应用主题包</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { useScriptStore } from '../../stores/script.js';
import { BUILTIN_THEMES } from '../../builtinThemes.js';

const emit = defineEmits(['close']);
const script = useScriptStore();
const selectedId = ref(null);

function onApply() {
  const theme = BUILTIN_THEMES.find(t => t.id === selectedId.value);
  if (!theme) return;
  script.applyBuiltinTheme(theme);
  emit('close');
}
</script>

<style scoped>
.pkg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.pkg-modal {
  background: #252526;
  border: 1px solid #444;
  border-radius: 8px;
  width: 480px;
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
.modal-desc {
  padding: 10px 16px 4px;
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}
.modal-desc kbd {
  background: #333;
  border: 1px solid #555;
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 11px;
  color: #ccc;
}
.modal-body {
  padding: 12px 16px;
  overflow-y: auto;
  flex: 1;
}
.theme-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.theme-card {
  display: flex;
  background: #2d2d2d;
  border: 2px solid #444;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 150ms;
}
.theme-card:hover {
  border-color: #666;
}
.theme-card.selected {
  border-color: #b4a0ff;
}
.card-accent {
  width: 8px;
  flex-shrink: 0;
}
.card-info {
  padding: 10px 12px;
  flex: 1;
}
.card-name {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 600;
  margin-bottom: 2px;
}
.card-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}
.card-badges {
  display: flex;
  gap: 4px;
}
.badge {
  font-size: 10px;
  color: #aaa;
  background: #383838;
  padding: 1px 6px;
  border-radius: 3px;
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
