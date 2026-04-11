<template>
  <div class="welcome">
    <div class="welcome-content">
      <div class="brand">
        <div class="brand-icon">🎮</div>
        <h1>Galgame Maker</h1>
        <p class="tagline">可视化视觉小说制作器</p>
      </div>

      <div class="actions">
        <button class="btn-primary" @click="$emit('create-project')" title="创建一个新的视觉小说项目">✨ 新建项目</button>
        <button class="btn-secondary" @click="handleOpen" title="打开已有项目文件夹">📂 打开项目</button>
      </div>

      <div class="recent" v-if="project.recentProjects.length > 0">
        <div class="recent-label">最近打开</div>
        <div class="recent-list">
          <div
            class="recent-item"
            v-for="p in project.recentProjects"
            :key="p.path"
            @click="$emit('open-recent', p.path)"
          >
            <span class="recent-name">{{ p.name }}</span>
            <span class="recent-path">{{ p.path }}</span>
          </div>
        </div>
      </div>

      <div class="empty-recent" v-else>
        <p>还没有项目，点击上方按钮创建你的第一个视觉小说！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();

const emit = defineEmits(['create-project', 'open-recent', 'open-folder']);

onMounted(() => project.loadRecentProjects());

async function handleOpen() {
  const result = await project.openProjectDialog();
  if (result && !result.canceled && result.success) {
    emit('open-folder', result.path);
  } else if (result && result.error) {
    alert(result.error);
  }
}
</script>

<style scoped>
.welcome {
  display: flex; align-items: center; justify-content: center;
  height: 100vh; background: #1e1e1e;
}
.welcome-content {
  text-align: center; max-width: 480px; width: 100%; padding: 40px 20px;
}
.brand-icon { font-size: 56px; margin-bottom: 8px; }
.brand h1 { margin: 0; font-size: 28px; font-weight: 700; color: #e0e0e0; }
.tagline { color: #888; font-size: 14px; margin: 4px 0 32px; }

.actions { display: flex; gap: 16px; justify-content: center; margin-bottom: 32px; }
.btn-primary {
  background: #0e633c; color: #fff; border: none; padding: 12px 28px;
  border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 500;
}
.btn-primary:hover { background: #117748; }
.btn-secondary {
  background: #333; color: #ccc; border: 1px solid #555; padding: 12px 28px;
  border-radius: 8px; font-size: 15px; cursor: pointer;
}
.btn-secondary:hover { background: #3c3c3c; }

.recent-label { color: #666; font-size: 13px; margin-bottom: 8px; }
.recent-list {
  background: #252526; border: 1px solid #333; border-radius: 8px;
  overflow: hidden; text-align: left;
}
.recent-item {
  padding: 10px 16px; border-bottom: 1px solid #2a2a2a;
  cursor: pointer; display: flex; flex-direction: column; gap: 2px;
}
.recent-item:last-child { border-bottom: none; }
.recent-item:hover { background: #2a2d2e; }
.recent-name { color: #ccc; font-size: 14px; }
.recent-path { color: #555; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.empty-recent p { color: #666; font-size: 13px; }
</style>
