import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useProjectStore = defineStore('project', () => {
  const projectPath = ref(null);
  const projectData = ref(null);
  const recentProjects = ref([]);
  const hasCreatedProject = ref(false);
  const isDirty = ref(false);
  const _saving = ref(false);

  const projectName = computed(() => projectData.value?.name || '');

  async function loadRecentProjects() {
    if (!window.ipcRenderer) return;
    const data = await window.ipcRenderer.invoke('get-recent-projects');
    recentProjects.value = data.projects || [];
    hasCreatedProject.value = data.hasCreatedProject || false;
  }

  async function createProject(opts) {
    if (!window.ipcRenderer) return null;
    const result = await window.ipcRenderer.invoke('create-project', opts);
    if (result.success) {
      await loadRecentProjects();
    }
    return result;
  }

  async function openProjectDialog() {
    if (!window.ipcRenderer) return null;
    return await window.ipcRenderer.invoke('open-project');
  }

  async function loadProject(projPath) {
    if (!window.ipcRenderer) return null;
    const result = await window.ipcRenderer.invoke('load-project', projPath);
    if (result.success) {
      projectPath.value = result.path;
      projectData.value = result.project;
      isDirty.value = false;
    }
    return result;
  }

  async function saveProject(scriptData) {
    if (_saving.value || !window.ipcRenderer || !projectPath.value) return false;
    _saving.value = true;
    try {
      const result = await window.ipcRenderer.invoke('save-project', {
        project: JSON.parse(JSON.stringify(projectData.value)),
        script: JSON.parse(JSON.stringify(scriptData))
      });
      if (result.success) {
        isDirty.value = false;
      }
      return result.success;
    } finally {
      _saving.value = false;
    }
  }

  function closeProject() {
    projectPath.value = null;
    projectData.value = null;
    isDirty.value = false;
    if (window.ipcRenderer) window.ipcRenderer.invoke('close-project');
  }

  function markDirty() {
    isDirty.value = true;
  }

  return {
    projectPath, projectData, recentProjects, hasCreatedProject, isDirty,
    projectName,
    loadRecentProjects, createProject, openProjectDialog, loadProject, saveProject,
    closeProject, markDirty
  };
});
