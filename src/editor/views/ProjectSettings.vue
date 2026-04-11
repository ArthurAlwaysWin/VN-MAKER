<template>
  <div class="project-settings">
    <h2>项目设置</h2>
    <form @submit.prevent class="settings-form">
      <label>项目名称 <HelpTip :text="HELP_SETTINGS.projectName" />
        <input v-model="project.projectData.name" @input="project.markDirty()" />
      </label>
      <label>作者
        <input v-model="project.projectData.author" @input="project.markDirty()" />
      </label>
      <label>描述
        <textarea v-model="project.projectData.description" rows="3" @input="project.markDirty()"></textarea>
      </label>
      <label>分辨率 <HelpTip :text="HELP_SETTINGS.resolution" />
        <div class="resolution-group">
          <input type="number" v-model.number="project.projectData.resolution.width" @input="project.markDirty()" /> ×
          <input type="number" v-model.number="project.projectData.resolution.height" @input="project.markDirty()" />
        </div>
      </label>
      <div class="info-row">
        <span class="info-label">引擎版本</span>
        <span class="info-value">{{ project.projectData.engineVersion }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">项目路径</span>
        <span class="info-value path">{{ project.projectPath }}</span>
      </div>
    </form>
    <div class="export-section">
      <button class="export-btn" @click="showExport = true" title="打开导出设置">📦 导出游戏</button>
    </div>
    <ExportModal :visible="showExport" @close="showExport = false" />
    <DialogueBoxSettings />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useProjectStore } from '../stores/project.js';
import DialogueBoxSettings from '../components/DialogueBoxSettings.vue';
import ExportModal from '../components/ExportModal.vue';
import HelpTip from '../components/HelpTip.vue';
import { HELP_SETTINGS } from '../helpTexts.js';
const project = useProjectStore();
const showExport = ref(false);
</script>

<style scoped>
.project-settings { padding: 24px; max-width: 600px; }
.project-settings h2 { margin: 0 0 20px; font-size: 20px; color: #e0e0e0; font-weight: 500; }
.settings-form label { display: block; color: #aaa; font-size: 13px; margin-bottom: 16px; }
.settings-form input, .settings-form textarea {
  display: block; width: 100%; margin-top: 4px; padding: 8px 12px;
  background: #1e1e1e; border: 1px solid #444; border-radius: 6px;
  color: #e0e0e0; font-size: 14px; box-sizing: border-box; font-family: inherit;
}
.resolution-group { display: flex; align-items: center; gap: 8px; margin-top: 4px; color: #888; }
.resolution-group input { width: 100px; }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #333; color: #888; font-size: 13px; }
.info-value { color: #ccc; }
.info-value.path { font-size: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
.export-section {
  margin: 20px 0;
  padding-top: 16px;
  border-top: 1px solid #333;
}
.export-btn {
  padding: 10px 24px;
  background: #007acc;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}
.export-btn:hover {
  background: #0098ff;
}
</style>
