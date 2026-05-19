import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { parseScenePath } from '../utils/agentHandoff.js';

export const useProjectStore = defineStore('project', () => {
  const projectPath = ref(null);
  const projectData = ref(null);
  const recentProjects = ref([]);
  const agentHandoff = ref(null);
  const agentHandoffPath = ref(null);
  const sceneNavigationRequest = ref(null);
  const hasCreatedProject = ref(false);
  const isDirty = ref(false);
  const _saving = ref(false);
  let sceneNavigationRequestCounter = 0;

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
      await loadAgentHandoff();
      isDirty.value = false;
    }
    return result;
  }

  async function loadAgentHandoff() {
    agentHandoff.value = null;
    agentHandoffPath.value = null;
    if (!window.ipcRenderer) return null;

    const result = await window.ipcRenderer.invoke('read-agent-handoff');
    if (result?.success) {
      agentHandoff.value = result.handoff || null;
      agentHandoffPath.value = result.path || null;
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
    agentHandoff.value = null;
    agentHandoffPath.value = null;
    sceneNavigationRequest.value = null;
    isDirty.value = false;
    if (window.ipcRenderer) window.ipcRenderer.invoke('close-project');
  }

  function markDirty() {
    isDirty.value = true;
  }

  function requestSceneNavigation(pathString) {
    const parsed = parseScenePath(pathString);
    if (!parsed) {
      return false;
    }

    sceneNavigationRequestCounter += 1;
    sceneNavigationRequest.value = {
      nonce: sceneNavigationRequestCounter,
      pathString,
      sceneId: parsed.sceneId,
      pageIndex: parsed.pageIndex,
    };
    return true;
  }

  return {
    projectPath, projectData, recentProjects, agentHandoff, agentHandoffPath, sceneNavigationRequest, hasCreatedProject, isDirty,
    projectName,
    loadRecentProjects, createProject, openProjectDialog, loadProject, saveProject,
    loadAgentHandoff, closeProject, markDirty, requestSceneNavigation
  };
});
