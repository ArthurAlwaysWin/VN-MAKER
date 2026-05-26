import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { createHandoffReviewItemKey, parseAgentPathTarget, parseScenePath } from '../utils/agentHandoff.js';
import { createScriptDiffSummary } from '../utils/scriptDiff.js';

export const useProjectStore = defineStore('project', () => {
  const projectPath = ref(null);
  const projectData = ref(null);
  const recentProjects = ref([]);
  const agentHandoff = ref(null);
  const agentHandoffPath = ref(null);
  const agentReviewState = ref({});
  const playerProfile = ref(null);
  const playerProfileStatus = ref('idle');
  const playerProfileError = ref(null);
  const sceneNavigationRequest = ref(null);
  const agentPathNavigationRequest = ref(null);
  const hasCreatedProject = ref(false);
  const isDirty = ref(false);
  const scriptFileState = ref(null);
  const externalScriptChange = ref(null);
  const externalScriptDiff = ref(null);
  const _saving = ref(false);
  let sceneNavigationRequestCounter = 0;
  let agentPathNavigationRequestCounter = 0;

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
      clearPlayerProfile();
      projectPath.value = result.path;
      projectData.value = result.project;
      scriptFileState.value = result.scriptFileState || null;
      externalScriptChange.value = null;
      externalScriptDiff.value = null;
      await loadAgentHandoff();
      isDirty.value = false;
    }
    return result;
  }

  function clearPlayerProfile() {
    playerProfile.value = null;
    playerProfileStatus.value = 'idle';
    playerProfileError.value = null;
  }

  async function loadPlayerProfile(projectId) {
    clearPlayerProfile();
    const normalizedProjectId = typeof projectId === 'string' ? projectId.trim() : '';
    if (!window.ipcRenderer || !projectPath.value || !normalizedProjectId) {
      playerProfileStatus.value = 'unavailable';
      return null;
    }

    playerProfileStatus.value = 'loading';
    try {
      const result = await window.ipcRenderer.invoke('load-player-profile', {
        projectId: normalizedProjectId,
      });
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to load player profile');
      }

      playerProfile.value = result.data ?? null;
      playerProfileStatus.value = playerProfile.value ? 'loaded' : 'empty';
      return playerProfile.value;
    } catch (error) {
      playerProfileStatus.value = 'error';
      playerProfileError.value = error?.message || String(error);
      return null;
    }
  }

  async function loadAgentHandoff() {
    agentHandoff.value = null;
    agentHandoffPath.value = null;
    agentReviewState.value = {};
    if (!window.ipcRenderer) return null;

    const result = await window.ipcRenderer.invoke('read-agent-handoff');
    if (result?.success) {
      agentHandoff.value = result.handoff || null;
      agentHandoffPath.value = result.path || null;
      await loadAgentReviewState();
    }
    return result;
  }

  function getAgentReviewStateStorageKey() {
    if (!projectPath.value || !agentHandoff.value) {
      return null;
    }

    const handoffId = agentHandoff.value.createdAt || agentHandoffPath.value || 'current';
    return `galgame-maker:agent-review-state:${projectPath.value}:${handoffId}`;
  }

  async function loadAgentReviewState() {
    const storageKey = getAgentReviewStateStorageKey();
    if (!storageKey) {
      agentReviewState.value = {};
      return {};
    }

    if (window.ipcRenderer && agentHandoff.value) {
      const result = await window.ipcRenderer.invoke('read-agent-review-state', {
        handoffCreatedAt: agentHandoff.value.createdAt ?? null,
      });
      if (result?.success && result.state?.items) {
        agentReviewState.value = result.state.items;
        return agentReviewState.value;
      }
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      agentReviewState.value = {};
      return {};
    }

    try {
      agentReviewState.value = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    } catch {
      agentReviewState.value = {};
    }
    return agentReviewState.value;
  }

  async function saveAgentReviewState() {
    const storageKey = getAgentReviewStateStorageKey();
    if (!storageKey) {
      return;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, JSON.stringify(agentReviewState.value));
    }

    if (window.ipcRenderer && agentHandoff.value) {
      await window.ipcRenderer.invoke('write-agent-review-state', {
        handoffCreatedAt: agentHandoff.value.createdAt ?? null,
        items: agentReviewState.value,
      });
    }
  }

  async function saveProject(scriptData) {
    if (_saving.value || !window.ipcRenderer || !projectPath.value) return false;
    _saving.value = true;
    try {
      const result = await window.ipcRenderer.invoke('save-project', {
        project: JSON.parse(JSON.stringify(projectData.value)),
        script: JSON.parse(JSON.stringify(scriptData)),
        expectedScriptFileState: scriptFileState.value ? JSON.parse(JSON.stringify(scriptFileState.value)) : null,
      });
      if (result?.conflict) {
        externalScriptChange.value = {
          detectedAt: new Date().toISOString(),
          scriptFileState: result.scriptFileState || null,
          expectedScriptFileState: result.expectedScriptFileState || scriptFileState.value,
          source: 'save-project',
        };
        await loadExternalScriptDiff(scriptData);
        return false;
      }
      if (result.success) {
        scriptFileState.value = result.scriptFileState || scriptFileState.value;
        externalScriptChange.value = null;
        externalScriptDiff.value = null;
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
    agentReviewState.value = {};
    clearPlayerProfile();
    sceneNavigationRequest.value = null;
    agentPathNavigationRequest.value = null;
    scriptFileState.value = null;
    externalScriptChange.value = null;
    externalScriptDiff.value = null;
    isDirty.value = false;
    if (window.ipcRenderer) window.ipcRenderer.invoke('close-project');
  }

  function markDirty() {
    isDirty.value = true;
  }

  function isSameFileState(left, right) {
    return Boolean(left && right && left.mtimeMs === right.mtimeMs && left.size === right.size);
  }

  async function loadExternalScriptDiff(localScript = {}) {
    if (!window.ipcRenderer || !projectPath.value) {
      externalScriptDiff.value = null;
      return null;
    }

    const result = await window.ipcRenderer.invoke('read-project-script-for-conflict');
    if (!result?.success || !result.script) {
      externalScriptDiff.value = null;
      return null;
    }

    externalScriptDiff.value = createScriptDiffSummary(localScript ?? {}, result.script);
    return externalScriptDiff.value;
  }

  async function checkExternalScriptChange(localScript = {}) {
    if (!window.ipcRenderer || !projectPath.value || !scriptFileState.value) {
      return false;
    }

    const result = await window.ipcRenderer.invoke('check-project-file-state');
    if (!result?.success || !result.scriptFileState) {
      return false;
    }

    if (!isSameFileState(scriptFileState.value, result.scriptFileState)) {
      externalScriptChange.value = {
        detectedAt: new Date().toISOString(),
        scriptFileState: result.scriptFileState,
        expectedScriptFileState: scriptFileState.value,
        source: 'poll',
      };
      await loadExternalScriptDiff(localScript);
      return true;
    }

    return false;
  }

  function clearExternalScriptChange() {
    externalScriptChange.value = null;
    externalScriptDiff.value = null;
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

  function requestAgentPathNavigation(pathString) {
    const target = parseAgentPathTarget(pathString);
    if (!target) {
      return false;
    }

    if (target.kind === 'scene') {
      return requestSceneNavigation(pathString);
    }

    agentPathNavigationRequestCounter += 1;
    agentPathNavigationRequest.value = {
      nonce: agentPathNavigationRequestCounter,
      ...target,
    };
    return true;
  }

  function setAgentReviewItemStatus(item, status) {
    if (!item || !['acknowledged', 'resolved'].includes(status)) {
      return false;
    }

    const key = createHandoffReviewItemKey(item);
    agentReviewState.value = {
      ...agentReviewState.value,
      [key]: {
        status,
        updatedAt: new Date().toISOString(),
      },
    };
    void saveAgentReviewState();
    return true;
  }

  function clearAgentReviewItemStatus(item) {
    if (!item) {
      return false;
    }

    const key = createHandoffReviewItemKey(item);
    const nextState = { ...agentReviewState.value };
    delete nextState[key];
    agentReviewState.value = nextState;
    void saveAgentReviewState();
    return true;
  }

  return {
    projectPath, projectData, recentProjects, agentHandoff, agentHandoffPath, agentReviewState, playerProfile, playerProfileStatus, playerProfileError, sceneNavigationRequest, agentPathNavigationRequest, hasCreatedProject, isDirty, scriptFileState, externalScriptChange, externalScriptDiff,
    projectName,
    loadRecentProjects, createProject, openProjectDialog, loadProject, saveProject,
    loadAgentHandoff, loadAgentReviewState, loadPlayerProfile, closeProject, markDirty, loadExternalScriptDiff, checkExternalScriptChange, clearExternalScriptChange, requestSceneNavigation, requestAgentPathNavigation, setAgentReviewItemStatus, clearAgentReviewItemStatus
  };
});
