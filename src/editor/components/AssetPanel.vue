<template>
  <div class="asset-panel">
    <div class="ap-header">素材面板</div>
    <div class="ap-body">
      <div class="ap-section" v-for="section in sections" :key="section.key">
        <div class="ap-section-label" @click="section.expanded = !section.expanded">
          {{ section.expanded ? '▾' : '▸' }} {{ section.icon }} {{ section.label }}
        </div>
        <div v-if="section.expanded" class="ap-items">
          <div
            v-for="file in section.files"
            :key="file.name"
            class="ap-item"
            draggable="true"
            @dragstart="onDragStart($event, section.key, file.name)"
          >
            <div v-if="section.key !== 'audio'" class="ap-thumb">
              <img :src="assetUrl(section.key, file.name)" :alt="file.name" />
            </div>
            <div v-else class="ap-audio-icon">🎵</div>
            <div class="ap-name" :title="file.name">{{ file.name }}</div>
          </div>
          <div v-if="section.files.length === 0" class="ap-empty">无素材</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, watch } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();

const sections = reactive([
  { key: 'backgrounds', icon: '📁', label: '背景', expanded: true, files: [] },
  { key: 'characters', icon: '👤', label: '角色', expanded: true, files: [] },
  { key: 'audio', icon: '🎵', label: '音频', expanded: true, files: [] },
]);

async function loadAssets() {
  if (!window.ipcRenderer) return;
  for (const s of sections) {
    try {
      const files = await window.ipcRenderer.invoke('read-dir', `assets/${s.key}`);
      s.files = files.filter(f => !f.isDirectory);
    } catch {
      s.files = [];
    }
  }
}

function assetUrl(category, filename) {
  return `asset://${category}/${filename}`;
}

function onDragStart(event, category, filename) {
  event.dataTransfer.setData('application/galgame-asset', JSON.stringify({ category, filename }));
  event.dataTransfer.effectAllowed = 'copy';
}

onMounted(loadAssets);
watch(() => project.projectPath, loadAssets);

defineExpose({ refresh: loadAssets });
</script>

<style scoped>
.asset-panel {
  width: 140px; background: #1e1e1e; border-right: 1px solid #333;
  display: flex; flex-direction: column; flex-shrink: 0;
}
.ap-header {
  padding: 8px; border-bottom: 1px solid #333; color: #888; font-size: 11px;
}
.ap-body { flex: 1; overflow-y: auto; padding: 4px; }
.ap-section { margin-bottom: 4px; }
.ap-section-label {
  color: #888; font-size: 11px; padding: 4px; cursor: pointer; user-select: none;
}
.ap-section-label:hover { color: #ccc; }
.ap-items { padding-left: 4px; }
.ap-item {
  background: #252526; border: 1px solid #333; border-radius: 4px;
  margin-bottom: 4px; cursor: grab; overflow: hidden;
}
.ap-item:hover { border-color: #555; }
.ap-thumb {
  height: 40px; background: #1a1a1a; display: flex; align-items: center; justify-content: center;
}
.ap-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
.ap-audio-icon { text-align: center; padding: 4px; font-size: 16px; }
.ap-name {
  padding: 3px 6px; font-size: 10px; color: #aaa;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ap-empty { color: #555; font-size: 10px; padding: 4px; text-align: center; }
</style>
