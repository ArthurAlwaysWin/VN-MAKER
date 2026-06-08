<template>
  <div class="wizard-overlay">
    <div class="quick-create">
      <h2>新建项目</h2>
      <label>项目名称
        <input v-model="name" placeholder="我的视觉小说" ref="nameInput" />
      </label>
      <label>保存位置
        <div class="path-input">
          <input v-model="location" readonly />
          <button @click="browseLocation" title="选择项目保存位置">浏览...</button>
        </div>
      </label>
      <div class="footer">
        <button class="btn-cancel" @click="$emit('cancel')" title="取消创建">取消</button>
        <button class="btn-create" @click="handleCreate" :disabled="!canCreate || creating" title="创建新项目">
          {{ creating ? '创建中...' : '✨ 创建项目' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();
const emit = defineEmits(['cancel', 'created']);
const name = ref('');
const location = ref('');
const creating = ref(false);
const nameInput = ref(null);

const canCreate = computed(() => name.value.trim() && location.value.trim());

onMounted(async () => {
  if (!project.projectLibraryDir) {
    await project.loadRecentProjects();
  }
  location.value = project.projectLibraryDir || '';
  nameInput.value?.focus();
});

async function browseLocation() {
  if (!window.ipcRenderer) return;
  const result = await project.chooseProjectLibrary();
  if (result?.success) {
    location.value = result.projectLibraryDir;
  } else if (result?.error) {
    alert(result.error);
  }
}

async function handleCreate() {
  creating.value = true;
  const result = await project.createProject({
    name: name.value.trim(),
    author: '',
    location: location.value,
    resolution: { width: 1280, height: 720 },
    template: 'blank'
  });
  creating.value = false;
  if (result.success) {
    emit('created', result.path);
  } else {
    alert('创建失败: ' + result.error);
  }
}
</script>

<style scoped>
.wizard-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.quick-create {
  background: #252526; border: 1px solid #444; border-radius: 12px;
  width: 420px; padding: 24px;
}
.quick-create h2 { margin: 0 0 20px; font-size: 18px; color: #e0e0e0; }
.quick-create label { display: block; color: #aaa; font-size: 13px; margin-bottom: 16px; }
.quick-create input {
  display: block; width: 100%; margin-top: 4px; padding: 8px 12px;
  background: #1e1e1e; border: 1px solid #444; border-radius: 6px;
  color: #e0e0e0; font-size: 14px; box-sizing: border-box;
}
.path-input { display: flex; gap: 8px; margin-top: 4px; }
.path-input input { flex: 1; }
.path-input button {
  background: #333; color: #ccc; border: 1px solid #555; padding: 8px 16px;
  border-radius: 6px; cursor: pointer;
}
.footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.btn-cancel { background: transparent; border: 1px solid #555; color: #888; padding: 8px 20px; border-radius: 6px; cursor: pointer; }
.btn-create { background: #0e633c; color: #fff; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-create:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
