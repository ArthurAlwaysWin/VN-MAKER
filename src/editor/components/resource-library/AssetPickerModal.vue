<script setup>
/**
 * AssetPickerModal — In-app modal for selecting project assets.
 * Displays thumbnails from the asset store for a given category.
 * Used by TitleDesigner/SettingsDesigner instead of native file dialog.
 */
import { computed, onMounted } from 'vue';
import { useAssetStore } from '../../stores/assets.js';

const props = defineProps({
  category: { type: String, required: true },
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(['select', 'close']);

const assetStore = useAssetStore();
const fileList = computed(() => assetStore.files[props.category] || []);

const isAudio = computed(() => props.category === 'audio');

const categoryLabel = computed(() => {
  const map = { backgrounds: '背景图', audio: '音频', ui: 'UI 图片', characters: '角色' };
  return map[props.category] || props.category;
});

onMounted(() => {
  assetStore.loadCategory(props.category);
});

function onSelect(file) {
  emit('select', `${props.category}/${file}`);
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="picker-overlay" @click="onOverlayClick">
      <div class="picker-modal">
        <div class="picker-header">
          <span class="picker-title">选择{{ categoryLabel }}</span>
          <button class="picker-close" @click="$emit('close')" title="关闭">✕</button>
        </div>
        <div class="picker-body">
          <div v-if="fileList.length === 0" class="picker-empty">
            <p>当前分类下暂无资源</p>
            <p class="sub">请先在「素材库」中导入{{ categoryLabel }}文件</p>
          </div>
          <div v-else class="picker-grid">
            <!-- Image thumbnails -->
            <div
              v-if="!isAudio"
              v-for="file in fileList"
              :key="file"
              class="picker-card"
              @click="onSelect(file)">
              <div class="picker-thumb">
                <img :src="`asset://${category}/${file}`" :alt="file" draggable="false" />
              </div>
              <div class="picker-name">{{ file }}</div>
            </div>
            <!-- Audio list -->
            <div
              v-if="isAudio"
              v-for="file in fileList"
              :key="file"
              class="picker-audio-row"
              @click="onSelect(file)">
              <span class="audio-icon">🎵</span>
              <span class="audio-name">{{ file }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-modal {
  width: 560px;
  max-width: 90vw;
  max-height: 70vh;
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

.picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.picker-card {
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.picker-card:hover {
  border-color: #007acc;
  transform: translateY(-1px);
}

.picker-thumb {
  height: 80px;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.picker-thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.picker-name {
  padding: 6px 8px;
  font-size: 11px;
  color: #aaa;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Audio rows */
.picker-audio-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.15s;
  grid-column: 1 / -1;
}

.picker-audio-row:hover {
  border-color: #007acc;
  background: #2a2d2e;
}

.audio-icon {
  flex-shrink: 0;
}

.audio-name {
  color: #ccc;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
