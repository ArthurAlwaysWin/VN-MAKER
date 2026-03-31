import { defineStore } from 'pinia';
import { ref, nextTick } from 'vue';

export const useScriptStore = defineStore('script', () => {
  const data = ref(null);
  const isLoading = ref(false);
  const _skipWatch = ref(false);

  // Undo/Redo history
  const history = ref([]);
  const historyIndex = ref(-1);

  function pushState() {
    if (!data.value) return;
    const snapshot = JSON.parse(JSON.stringify(data.value));
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }
    history.value.push(snapshot);
    historyIndex.value++;
    if (history.value.length > 50) {
      history.value.shift();
      historyIndex.value--;
    }
  }

  function undo() {
    if (historyIndex.value > 0) {
      _skipWatch.value = true;
      historyIndex.value--;
      data.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
      nextTick(() => { _skipWatch.value = false; });
    }
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      _skipWatch.value = true;
      historyIndex.value++;
      data.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
      nextTick(() => { _skipWatch.value = false; });
    }
  }

  function loadFromData(scriptData) {
    data.value = scriptData;
    history.value = [];
    historyIndex.value = -1;
    pushState();
  }

  function reset() {
    data.value = null;
    history.value = [];
    historyIndex.value = -1;
  }

  /** Get or initialize the ui.settingsScreen section */
  function getSettingsScreen() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.settingsScreen ??= { background: null, elements: [] };
    return data.value.ui.settingsScreen;
  }

  /** Replace the entire settingsScreen and push undo state */
  function updateSettingsScreen(settingsScreen) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.settingsScreen = settingsScreen;
    pushState();
  }

  /** Get or initialize the ui.titleScreen section */
  function getTitleScreen() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.titleScreen ??= { background: null, bgm: null, elements: [] };
    return data.value.ui.titleScreen;
  }

  /** Replace the entire titleScreen and push undo state */
  function updateTitleScreen(titleScreen) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.titleScreen = titleScreen;
    pushState();
  }

  // --- Page CRUD helpers ---

  function createDefaultPage() {
    return {
      id: 'p' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'normal',
      background: null,
      characters: [],
      bgm: null,
      se: null,
      dialogues: [{ speaker: null, text: '', expression: null }],
      transition: { type: 'fade', duration: 800 },
    };
  }

  function addScene(sceneId, sceneName) {
    if (!data.value || data.value.scenes[sceneId]) return;
    data.value.scenes[sceneId] = {
      name: sceneName,
      pages: [createDefaultPage()],
    };
    pushState();
  }

  function deleteScene(sceneId) {
    if (!data.value?.scenes?.[sceneId]) return;
    delete data.value.scenes[sceneId];
    pushState();
  }

  function renameScene(sceneId, newName) {
    if (!data.value?.scenes?.[sceneId]) return;
    data.value.scenes[sceneId].name = newName;
    pushState();
  }

  function addPage(sceneId, afterIndex = -1) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return null;
    const newPage = createDefaultPage();
    const insertAt = afterIndex >= 0 ? afterIndex + 1 : scene.pages.length;
    scene.pages.splice(insertAt, 0, newPage);
    pushState();
    return { page: newPage, index: insertAt };
  }

  function deletePage(sceneId, pageIndex) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene || pageIndex < 0 || pageIndex >= scene.pages.length) return;
    scene.pages.splice(pageIndex, 1);
    pushState();
  }

  function reorderPages(sceneId, fromIndex, toIndex) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return;
    if (fromIndex < 0 || fromIndex >= scene.pages.length) return;
    if (toIndex < 0 || toIndex >= scene.pages.length) return;
    const [moved] = scene.pages.splice(fromIndex, 1);
    scene.pages.splice(toIndex, 0, moved);
    pushState();
  }

  // Temporary backward-compat shims — remove when views are rewritten in Chunk 3
  async function loadScript() {
    console.warn('loadScript() is deprecated — use loadFromData() via project store');
  }
  async function saveScript() {
    console.warn('saveScript() is deprecated — use project.saveProject()');
  }

  return {
    data, isLoading, _skipWatch,
    pushState, undo, redo,
    historyIndex, history,
    loadFromData, reset,
    getSettingsScreen, updateSettingsScreen,
    getTitleScreen, updateTitleScreen,
    addScene, deleteScene, renameScene,
    addPage, deletePage, reorderPages,
    loadScript, saveScript
  };
});
