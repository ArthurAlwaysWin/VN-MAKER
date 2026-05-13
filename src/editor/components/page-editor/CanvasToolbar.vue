<template>
  <div class="canvas-toolbar">
    <template v-if="editor.previewSessionType.value === null">
      <button class="add-char-btn" @click="editor.showCharPicker.value = true"
        :disabled="editor.currentPage.value?.type === 'normal' ? false : true" title="添加角色到当前页面">
        + 添加角色
      </button>
      <HelpTip :text="HELP_SCRIPT.addCharacter" />
      <span class="toolbar-sep"></span>
      <span class="toolbar-info" v-if="editor.currentPage.value">
        页面 {{ editor.selectedPageIndex.value + 1 }}
        <template v-if="editor.currentPage.value?.type === 'choice'">(选择页)</template>
        <template v-else-if="editor.currentPage.value?.type === 'condition'">(条件页)</template>
      </span>
      <span class="toolbar-info" v-else>未选中页面</span>

      <!-- Snap / Grid / Align controls -->
      <span class="toolbar-sep"></span>
      <button class="toolbar-btn icon-btn" :class="{ active: editor.snapEnabled.value }"
        @click="editor.snapEnabled.value = !editor.snapEnabled.value"
        title="吸附对齐 (Alt 拖动临时禁用)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>
          <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>
          <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>
          <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      </button>
      <button class="toolbar-btn icon-btn" :class="{ active: editor.gridVisible.value }"
        @click="editor.gridVisible.value = !editor.gridVisible.value"
        title="网格显示">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="7" y1="0" x2="7" y2="14" stroke="currentColor" stroke-width="1"/>
          <line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1"/>
          <line x1="3.5" y1="0" x2="3.5" y2="14" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
          <line x1="10.5" y1="0" x2="10.5" y2="14" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
          <line x1="0" y1="3.5" x2="14" y2="3.5" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
          <line x1="0" y1="10.5" x2="14" y2="10.5" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
        </svg>
      </button>
      <select v-if="editor.gridVisible.value" class="grid-size-select" :value="editor.gridSize.value"
        @change="editor.gridSize.value = +$event.target.value" title="网格大小">
        <option value="8">8px</option>
        <option value="16">16px</option>
        <option value="24">24px</option>
        <option value="32">32px</option>
      </select>

      <!-- Alignment commands — disabled until multi-select is implemented -->
      <span class="toolbar-sep"></span>
      <button class="toolbar-btn icon-btn" disabled title="左对齐（需要多选）">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.2"/><rect x="4" y="3" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="4" y="8" width="5" height="3" rx="0.5" fill="currentColor" opacity="0.6"/></svg>
      </button>
      <button class="toolbar-btn icon-btn" disabled title="水平居中（需要多选）">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 1"/><rect x="2" y="3" width="10" height="3" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="3" y="8" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.6"/></svg>
      </button>
      <button class="toolbar-btn icon-btn" disabled title="右对齐（需要多选）">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="3" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="5" y="8" width="5" height="3" rx="0.5" fill="currentColor" opacity="0.6"/></svg>
      </button>
      <button class="toolbar-btn icon-btn" disabled title="顶对齐（需要多选）">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="2" x2="12" y2="2" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="4" width="4" height="8" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="8" y="4" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.6"/></svg>
      </button>
      <button class="toolbar-btn icon-btn" disabled title="垂直居中（需要多选）">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 1"/><rect x="2" y="2" width="4" height="10" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="8" y="3" width="4" height="8" rx="0.5" fill="currentColor" opacity="0.6"/></svg>
      </button>
      <button class="toolbar-btn icon-btn" disabled title="底对齐（需要多选）">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="2" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="2" width="4" height="8" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="8" y="5" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.6"/></svg>
      </button>
      <button class="toolbar-btn icon-btn" disabled title="水平均匀分布（需要多选）">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="5.5" y="3" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="10" y="3" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6"/><line x1="2.5" y1="12" x2="11.5" y2="12" stroke="currentColor" stroke-width="0.8"/><path d="M4 12L3 11.5L4 11" stroke="currentColor" stroke-width="0.6"/><path d="M10 12L11 11.5L10 11" stroke="currentColor" stroke-width="0.6"/></svg>
      </button>
      <button class="toolbar-btn icon-btn" disabled title="垂直均匀分布（需要多选）">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="1" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="3" y="5.5" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="3" y="10" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.6"/><line x1="12" y1="2.5" x2="12" y2="11.5" stroke="currentColor" stroke-width="0.8"/><path d="M12 4L11.5 3L11 4" stroke="currentColor" stroke-width="0.6"/><path d="M12 10L11.5 11L11 10" stroke="currentColor" stroke-width="0.6"/></svg>
      </button>
    </template>
    <template v-else>
      <span class="toolbar-info preview-label">🎮 {{ editor.previewModeLabel.value }}</span>
    </template>

    <span class="toolbar-spacer"></span>

    <!-- Mute toggle (per D-16) — only in preview mode -->
    <button
      v-if="editor.previewSessionType.value !== null"
      class="toolbar-btn"
      :title="editor.isMuted.value ? '取消静音' : '静音'"
      @click="editor.toggleMute()"
    >{{ editor.isMuted.value ? '🔇' : '🔊' }}</button>

    <!-- Play / Stop toggle (per D-13) -->
    <button
      v-if="editor.previewSessionType.value === null"
      class="toolbar-btn play-btn"
      :disabled="!editor.currentPage.value || !editor.isEngineReady.value"
      title="试玩 (从当前页面开始)"
      @click="editor.startPreview()"
    >▶ 试玩</button>
    <button
      v-else
      class="toolbar-btn stop-btn"
      :title="editor.stopPreviewLabel.value"
      @click="editor.stopPreview()"
    >■ {{ editor.stopPreviewLabel.value }}</button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import HelpTip from '../HelpTip.vue';
import { HELP_SCRIPT } from '../../helpTexts.js';

const editor = usePageEditor();
</script>

<style scoped>
.canvas-toolbar {
  height: 32px;
  background: #2d2d2d;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
  flex-shrink: 0;
}

.add-char-btn {
  background: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 12px;
  height: 24px;
  font-size: 12px;
  cursor: pointer;
}

.add-char-btn:hover:not(:disabled) {
  background: #0098ff;
}

.add-char-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: #444;
}

.toolbar-info {
  color: #aaa;
  font-size: 12px;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-btn {
  background: transparent;
  color: #ccc;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 0 10px;
  height: 24px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn:hover:not(:disabled) {
  background: #3c3c3c;
  border-color: #777;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background: #264f78;
  border-color: #007acc;
  color: #9cdcfe;
}

.icon-btn {
  padding: 0 5px;
}

.grid-size-select {
  background: #3c3c3c;
  color: #ccc;
  border: 1px solid #555;
  border-radius: 3px;
  height: 22px;
  font-size: 11px;
  padding: 0 2px;
  cursor: pointer;
}

.play-btn {
  background: #0e633c;
  color: #fff;
  border-color: #0e633c;
}

.play-btn:hover:not(:disabled) {
  background: #117748;
  border-color: #117748;
}

.stop-btn {
  background: #a22;
  color: #fff;
  border-color: #a22;
}

.stop-btn:hover {
  background: #c33;
  border-color: #c33;
}

.preview-label {
  color: #4ec9b0;
  font-weight: 500;
}
</style>
