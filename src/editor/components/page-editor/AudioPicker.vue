<template>
  <Teleport to="body">
    <div v-if="visible" class="audio-picker-overlay" @click="onOverlayClick">
      <div class="audio-picker-modal">
        <div class="picker-header">
          <span class="picker-title">{{ mode === 'voice' ? '选择语音文件' : '选择音频' }}</span>
          <button class="picker-close" @click="$emit('close')">✕</button>
        </div>

        <div class="tab-bar" v-if="mode !== 'voice'">
          <button class="tab-btn" :class="{ active: activeTab === 'bgm' }" @click="switchTab('bgm')">BGM</button>
          <button class="tab-btn" :class="{ active: activeTab === 'se' }" @click="switchTab('se')">SE</button>
        </div>

        <div class="picker-body">
          <div v-if="fileList.length === 0" class="picker-empty">
            <p>当前项目暂无音频文件</p>
            <p class="sub">请先在「素材库」中导入音频资源</p>
          </div>
          <div v-else class="audio-list">
            <div v-for="file in fileList" :key="file"
              class="audio-row" :class="{ selected: selectedFile === file }"
              @click="selectFile(file)">
              <div class="audio-row-header">
                <span class="audio-icon">🎵</span>
                <span class="audio-name">{{ file }}</span>
                <span v-if="selectedFile === file" class="check-badge">✓</span>
              </div>
              <div class="audio-player-wrap">
                <MiniPlayer
                  :src="`asset://audio/${file}`"
                  :active="activePlayerId === file"
                  @play="activePlayerId = file"
                  @stop="activePlayerId = null"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="picker-footer">
          <button class="picker-cancel" @click="$emit('close')">取消</button>
          <button class="picker-confirm" :disabled="!selectedFile" @click="confirm">确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAssetStore } from '../../stores/assets.js';
import MiniPlayer from '../resource-library/MiniPlayer.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  defaultTab: { type: String, default: 'bgm' },
  mode: { type: String, default: 'audio' },
});

const emit = defineEmits(['select', 'close']);

const assetStore = useAssetStore();
const activeTab = ref(props.defaultTab);
const selectedFile = ref(null);
const activePlayerId = ref(null);

const fileList = computed(() => assetStore.files.audio || []);

watch(() => props.visible, (val) => {
  if (val) {
    activeTab.value = props.defaultTab;
    selectedFile.value = null;
    activePlayerId.value = null;
  }
});

onMounted(() => {
  assetStore.loadCategory('audio');
});

function selectFile(file) {
  selectedFile.value = file;
}

function switchTab(tab) {
  activeTab.value = tab;
  selectedFile.value = null;
  activePlayerId.value = null;
}

function confirm() {
  if (!selectedFile.value) return;
  emit('select', `audio/${selectedFile.value}`);
  emit('close');
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) {
    emit('close');
  }
}
</script>

<style scoped>
.audio-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-picker-modal {
  width: 520px;
  max-width: 90vw;
  max-height: 65vh;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.picker-title {
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
}

.picker-close {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
}

.picker-close:hover {
  background: #333;
  color: #ccc;
}

.tab-bar {
  display: flex;
  background: #2d2d2d;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.tab-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #888;
  font-size: 13px;
  padding: 8px 24px;
  cursor: pointer;
}

.tab-btn:hover {
  color: #ccc;
}

.tab-btn.active {
  color: #e0e0e0;
  border-bottom-color: #007acc;
  font-weight: 600;
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.picker-empty {
  text-align: center;
  color: #888;
  padding: 40px 20px;
}

.picker-empty .sub {
  font-size: 13px;
  color: #666;
  margin-top: 8px;
}

.audio-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.audio-row {
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.15s;
  position: relative;
}

.audio-row:hover {
  border-color: #555;
  background: #2a2d2e;
}

.audio-row.selected {
  border-color: #007acc;
  background: #094771;
}

.audio-row-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.audio-icon {
  flex-shrink: 0;
}

.audio-name {
  color: #ccc;
  font-size: 13px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-badge {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007acc;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.audio-player-wrap {
  margin-top: 6px;
}

.picker-footer {
  padding: 8px 16px;
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.picker-cancel {
  background: transparent;
  border: 1px solid #555;
  color: #ccc;
  padding: 4px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.picker-cancel:hover {
  background: #3c3c3c;
}

.picker-confirm {
  background: #007acc;
  border: none;
  color: #fff;
  padding: 4px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.picker-confirm:hover {
  background: #0098ff;
}

.picker-confirm:disabled {
  background: #555;
  color: #888;
  cursor: default;
}
</style>
