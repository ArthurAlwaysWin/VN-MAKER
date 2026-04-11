<template>
  <div class="canvas-toolbar">
    <template v-if="!editor.isPreviewMode.value">
      <button class="add-char-btn" @click="editor.showCharPicker.value = true"
        :disabled="!editor.currentPage.value" title="添加角色到当前页面">
        + 添加角色
      </button>
      <HelpTip :text="HELP_SCRIPT.addCharacter" />
      <span class="toolbar-sep"></span>
      <span class="toolbar-info" v-if="editor.currentPage.value">
        页面 {{ editor.selectedPageIndex.value + 1 }}
        <template v-if="editor.currentPage.value.type !== 'normal'">
          ({{ editor.currentPage.value.type === 'choice' ? '选择页' : '条件页' }})
        </template>
      </span>
      <span class="toolbar-info" v-else>未选中页面</span>
    </template>
    <template v-else>
      <span class="toolbar-info preview-label">🎮 试玩中</span>
    </template>

    <span class="toolbar-spacer"></span>

    <!-- Mute toggle (per D-16) — only in preview mode -->
    <button
      v-if="editor.isPreviewMode.value"
      class="toolbar-btn"
      :title="editor.isMuted.value ? '取消静音' : '静音'"
      @click="editor.toggleMute()"
    >{{ editor.isMuted.value ? '🔇' : '🔊' }}</button>

    <!-- Play / Stop toggle (per D-13) -->
    <button
      v-if="!editor.isPreviewMode.value"
      class="toolbar-btn play-btn"
      :disabled="!editor.currentPage.value || !editor.isEngineReady.value"
      title="试玩 (从当前页面开始)"
      @click="editor.startPreview()"
    >▶ 试玩</button>
    <button
      v-else
      class="toolbar-btn stop-btn"
      title="停止试玩"
      @click="editor.stopPreview()"
    >■ 停止</button>
  </div>
</template>

<script setup>
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
