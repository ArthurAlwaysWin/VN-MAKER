<template>
  <div class="assets-view">
    <div class="toolbar">
      <h2>素材管理</h2>
      <div class="toolbar-right">
        <div class="tabs">
          <button :class="{active: currentTab === 'backgrounds'}" @click="setTab('backgrounds')">背景</button>
          <button :class="{active: currentTab === 'characters'}" @click="setTab('characters')">角色</button>
          <button :class="{active: currentTab === 'audio'}" @click="setTab('audio')">音频</button>
        </div>
        <label class="upload-btn">
          📂 导入文件
          <input type="file" multiple :accept="acceptTypes" @change="handleUpload" style="display:none" />
        </label>
      </div>
    </div>
    
    <div class="empty-state" v-if="files.length === 0">
      <div class="empty-icon">📁</div>
      <p>当前分类下暂无素材</p>
      <label class="upload-btn-lg">
        点击上传文件
        <input type="file" multiple :accept="acceptTypes" @change="handleUpload" style="display:none" />
      </label>
    </div>

    <div class="asset-grid" v-else-if="currentTab !== 'audio'">
      <div class="asset-card" v-for="file in files" :key="file.name">
        <div class="thumbnail">
          <img :src="`asset://${currentTab}/${file.name}`" :alt="file.name" />
        </div>
        <div class="filename" :title="file.name">{{ file.name }}</div>
      </div>
    </div>
    
    <div class="asset-list" v-else>
      <div class="list-item" v-for="file in files" :key="file.name">
        <span class="icon">🎵</span>
        <span class="filename">{{ file.name }}</span>
        <audio controls :src="`asset://audio/${file.name}`"></audio>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const currentTab = ref('backgrounds');
const files = ref([]);

const acceptTypes = computed(() => {
  if (currentTab.value === 'audio') return 'audio/*';
  return 'image/*';
});

async function loadFiles() {
  if (window.ipcRenderer) {
    try {
      const dirPath = `assets/${currentTab.value}`;
      const result = await window.ipcRenderer.invoke('read-dir', dirPath);
      files.value = result.filter(f => !f.isDirectory);
    } catch (e) {
      console.error(e);
      files.value = [];
    }
  }
}

async function handleUpload(e) {
  const fileList = e.target.files;
  if (!fileList || fileList.length === 0) return;

  if (window.ipcRenderer) {
    for (const file of fileList) {
      const buffer = await file.arrayBuffer();
      await window.ipcRenderer.invoke('upload-asset', {
        category: currentTab.value,
        name: file.name,
        data: Array.from(new Uint8Array(buffer)),
      });
    }
    await loadFiles();
  }

  // Reset input so the same file can be re-uploaded
  e.target.value = '';
}

function setTab(tab) {
  currentTab.value = tab;
  loadFiles();
}

onMounted(() => {
  loadFiles();
});
</script>

<style scoped>
.assets-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.toolbar h2 { margin: 0; font-weight: 500; font-size: 20px; color: #fff; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
.tabs button {
  background: #333; color: #ccc; border: 1px solid #444; padding: 6px 16px; margin-left: -1px; cursor: pointer; font-size: 13px;
}
.tabs button:first-child { border-radius: 4px 0 0 4px; border-left-color: #444; }
.tabs button:last-child { border-radius: 0 4px 4px 0; }
.tabs button.active { background: #007acc; color: #fff; border-color: #007acc; z-index: 1; position: relative; }

.upload-btn {
  background: #0e633c; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;
}
.upload-btn:hover { background: #117748; }

.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #888; gap: 12px; }
.empty-icon { font-size: 48px; }
.upload-btn-lg { background: #007acc; color: #fff; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.upload-btn-lg:hover { background: #0587d9; }

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  overflow-y: auto;
  align-content: start;
}
.asset-card {
  background: #252526; border: 1px solid #333; border-radius: 6px; overflow: hidden;
  transition: border-color 0.2s; display: flex; flex-direction: column;
}
.asset-card:hover { border-color: #007acc; }
.thumbnail { height: 100px; background: #1e1e1e; display: flex; align-items: center; justify-content: center; padding: 8px; }
.thumbnail img { max-width: 100%; max-height: 100%; object-fit: contain; }
.filename { padding: 8px; font-size: 12px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid #333; }

.asset-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.list-item { display: flex; align-items: center; gap: 12px; background: #252526; padding: 10px 16px; border-radius: 6px; border: 1px solid #333; }
.list-item audio { height: 30px; outline: none; }
.list-item .filename { border: none; padding: 0; flex: 1; text-align: left; font-size: 14px; }
</style>

