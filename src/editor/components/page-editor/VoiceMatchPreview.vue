<template>
  <Teleport to="body">
    <div v-if="visible" class="voice-match-overlay" @click="onOverlayClick">
      <div class="voice-match-modal" @click.stop>
        <div class="picker-header">
          <span class="picker-title">批量语音匹配结果</span>
          <button class="picker-close" @click="$emit('close')" title="关闭">✕</button>
        </div>

        <div class="match-summary">
          <p>共找到 <strong>{{ result.matches.length }}</strong> 条匹配</p>
          <p v-if="result.newBindings > 0">🆕 新绑定: <strong>{{ result.newBindings }}</strong> 条</p>
          <p v-if="result.alreadyBound > 0">✅ 已绑定（相同文件）: <strong>{{ result.alreadyBound }}</strong> 条</p>
          <p v-if="existingDifferent > 0">⚠️ 已有不同语音: <strong>{{ existingDifferent }}</strong> 条</p>
        </div>

        <div class="match-list">
          <div v-for="(m, idx) in result.matches" :key="idx" class="match-row"
            :class="{ 'already-bound': m.alreadyBound, 'has-existing': m.hasExistingVoice && !m.alreadyBound }">
            <span class="match-scene">{{ m.sceneName }}</span>
            <span class="match-location">P{{ m.pageIdx + 1 }}-D{{ m.dlgIdx + 1 }}</span>
            <span class="match-speaker">{{ m.speaker || '旁白' }}</span>
            <span class="match-text">{{ truncate(m.text, 20) }}</span>
            <span class="match-arrow">→</span>
            <span class="match-file">{{ m.file }}</span>
            <span v-if="m.alreadyBound" class="match-status">✅</span>
            <span v-else-if="m.hasExistingVoice" class="match-status warn">⚠️</span>
            <span v-else class="match-status new">🆕</span>
          </div>
        </div>

        <div class="picker-footer">
          <button class="picker-cancel" @click="$emit('close')" title="取消匹配">取消</button>
          <button v-if="existingDifferent > 0" class="picker-confirm overwrite"
            @click="$emit('apply', true)" title="覆盖已有语音绑定">
            覆盖全部 ({{ result.newBindings + existingDifferent }})
          </button>
          <button class="picker-confirm" @click="$emit('apply', false)"
            :disabled="result.newBindings === 0" title="仅绑定尚未绑定的语音">
            仅绑定新的 ({{ result.newBindings }})
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  result: { type: Object, default: () => ({ matches: [], alreadyBound: 0, newBindings: 0 }) },
});

defineEmits(['close', 'apply']);

const existingDifferent = computed(() => {
  return props.result.matches.filter(m => m.hasExistingVoice && !m.alreadyBound).length;
});

function truncate(text, len) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '…' : text;
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) {
    // Click on overlay background — do nothing (require explicit cancel)
  }
}
</script>

<style scoped>
.voice-match-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-match-modal {
  width: 620px;
  max-width: 90vw;
  max-height: 70vh;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.picker-title {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

.picker-close {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
}

.picker-close:hover { color: #fff; }

.match-summary {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  font-size: 13px;
  color: #ccc;
}

.match-summary p {
  margin: 4px 0;
}

.match-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.match-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #ccc;
}

.match-row:nth-child(even) { background: #252526; }
.match-row.already-bound { opacity: 0.6; }
.match-row.has-existing { background: rgba(170, 100, 0, 0.15); }

.match-scene {
  color: #007acc;
  min-width: 60px;
  font-weight: 500;
}

.match-location {
  color: #888;
  min-width: 55px;
}

.match-speaker {
  color: #aaa;
  min-width: 50px;
}

.match-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #999;
}

.match-arrow {
  color: #555;
}

.match-file {
  color: #4ec9b0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-status {
  min-width: 24px;
  text-align: center;
}

.picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #333;
}

.picker-cancel {
  background: #333;
  border: 1px solid #555;
  color: #ccc;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.picker-cancel:hover { background: #444; }

.picker-confirm {
  background: #007acc;
  border: 1px solid #007acc;
  color: #fff;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.picker-confirm:hover { background: #005a9e; }
.picker-confirm:disabled { opacity: 0.5; cursor: default; }

.picker-confirm.overwrite {
  background: #8a5c00;
  border-color: #8a5c00;
}

.picker-confirm.overwrite:hover { background: #6b4800; }
</style>
