import { defineStore } from 'pinia';
import { ref, nextTick } from 'vue';
import { DEFAULT_PAGE_CAMERA, copyPageCinematicFields } from '../../shared/cinematicContract.js';

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

  /** Get or initialize the ui.dialogueBox font settings */
  function getDialogueBox() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.dialogueBox = normalizeDialogueBox(data.value.ui.dialogueBox);
    return data.value.ui.dialogueBox;
  }

  /** Replace the entire dialogueBox settings and push undo state */
  function updateDialogueBox(dialogueBox) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.dialogueBox = dialogueBox;
    pushState();
  }

  /** Get or initialize the ui.theme section (D-13) */
  function getTheme() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.theme ??= { tokens: {} };
    return data.value.ui.theme;
  }

  /** Replace the entire theme and push undo state (D-05) */
  function updateTheme(theme) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.theme = theme;
    pushState();
  }

  function getWidgetStyles() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.widgetStyles ??= {};
    return data.value.ui.widgetStyles;
  }

  function updateWidgetStyles(widgetStyles) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.widgetStyles = widgetStyles;
    pushState();
  }

  function getSaveLoadScreen() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.saveLoadScreen ??= {};
    return data.value.ui.saveLoadScreen;
  }

  function updateSaveLoadScreen(config) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.saveLoadScreen = config;
    pushState();
  }

  function getBacklogScreen() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.backlogScreen ??= {};
    return data.value.ui.backlogScreen;
  }

  function updateBacklogScreen(config) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.backlogScreen = config;
    pushState();
  }

  function getGameMenu() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.gameMenu ??= {};
    return data.value.ui.gameMenu;
  }

  function updateGameMenu(config) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.gameMenu = config;
    pushState();
  }

  // --- Page CRUD helpers ---

  function createDefaultPage() {
    return {
      id: 'p' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: '',
      type: 'normal',
      background: null,
      camera: DEFAULT_PAGE_CAMERA,
      characters: [],
      bgm: null,
      se: null,
      dialogues: [{ speaker: null, text: '', expression: null, voice: null }],
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

    // D-03/D-04: PPT-style copy from previous page
    const prevPage = scene.pages[insertAt - 1];
    if (prevPage) {
      newPage.characters = JSON.parse(JSON.stringify(prevPage.characters || []));
      newPage.background = prevPage.background || null;
      newPage.bgm = prevPage.bgm ? JSON.parse(JSON.stringify(prevPage.bgm)) : null;
      copyPageCinematicFields(prevPage, newPage);
    }

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

  function convertPageType(sceneId, pageIndex) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return;
    const page = scene.pages?.[pageIndex];
    if (!page) return;

    if (page.type === 'normal' || !page.type) {
      page.type = 'choice';
      page.prompt = '';
      page.options = [
        { text: '', target: null, setVariable: null },
        { text: '', target: null, setVariable: null },
      ];
    } else if (page.type === 'choice') {
      page.type = 'normal';
      delete page.prompt;
      delete page.options;
      if (!page.dialogues || page.dialogues.length === 0) {
        page.dialogues = [{ speaker: null, text: '', expression: null, voice: null }];
      }
    }
    pushState();
  }

  function setSceneNext(sceneId, nextSceneId) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return;
    scene.next = nextSceneId || null;
    pushState();
  }

  // D-05: Find all references to a character expression across all scenes
  function findExpressionReferences(charId, exprName) {
    const refs = [];
    if (!data.value?.scenes) return refs;
    for (const [sceneId, scene] of Object.entries(data.value.scenes)) {
      for (let pageIdx = 0; pageIdx < (scene.pages || []).length; pageIdx++) {
        const page = scene.pages[pageIdx];
        for (const char of (page.characters || [])) {
          if (char.id === charId && char.expression === exprName) {
            refs.push({ sceneId, sceneName: scene.name || sceneId, pageIdx, source: 'character' });
          }
        }
        for (const dlg of (page.dialogues || [])) {
          if (dlg.speaker === charId && dlg.expression === exprName) {
            refs.push({ sceneId, sceneName: scene.name || sceneId, pageIdx, source: 'dialogue' });
          }
        }
      }
    }
    return refs;
  }

  // D-06: Replace all references from one expression to another (no pushState)
  function replaceExpressionReferences(charId, oldExpr, newExpr) {
    if (!data.value?.scenes) return 0;
    let count = 0;
    for (const scene of Object.values(data.value.scenes)) {
      for (const page of (scene.pages || [])) {
        for (const char of (page.characters || [])) {
          if (char.id === charId && char.expression === oldExpr) {
            char.expression = newExpr;
            count++;
          }
        }
        for (const dlg of (page.dialogues || [])) {
          if (dlg.speaker === charId && dlg.expression === oldExpr) {
            dlg.expression = newExpr;
            count++;
          }
        }
      }
    }
    return count;
  }

  // Temporary backward-compat shims — remove when views are rewritten in Chunk 3
  async function loadScript() {
    console.warn('loadScript() is deprecated — use loadFromData() via project store');
  }
  async function saveScript() {
    console.warn('saveScript() is deprecated — use project.saveProject()');
  }

  /**
   * Apply a built-in theme package: tokens + widgetStyles + screen layouts.
   * Each section is deep-merged so unset keys fall back to engine defaults.
   * Pushes a single undo state for the entire theme application.
   */
  function applyBuiltinTheme(theme) {
    if (!data.value) return;
    data.value.ui ??= {};

    // tokens → theme.tokens (+ colorRecipe if present)
    data.value.ui.theme = { tokens: { ...(theme.tokens ?? {}) } };
    if (theme.colorRecipe) {
      data.value.ui.theme.colorRecipe = { ...theme.colorRecipe };
    }

    // widgetStyles → flat merge per category
    const ws = {};
    for (const [cat, vals] of Object.entries(theme.widgetStyles ?? {})) {
      ws[cat] = { ...vals };
    }
    data.value.ui.widgetStyles = ws;

    // screen layouts → deep merge (1 level of nesting)
    const screenKeys = ['saveLoadScreen', 'backlogScreen', 'gameMenu', 'settingsScreen'];
    for (const key of screenKeys) {
      if (theme.screens?.[key]) {
        const src = theme.screens[key];
        const dst = {};
        for (const [k, v] of Object.entries(src)) {
          dst[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...v } : v;
        }
        data.value.ui[key] = dst;
      } else {
        data.value.ui[key] = {};
      }
    }

    pushState();
  }

  return {
    data, isLoading, _skipWatch,
    pushState, undo, redo,
    historyIndex, history,
    loadFromData, reset,
    getSettingsScreen, updateSettingsScreen,
    getTitleScreen, updateTitleScreen,
    getDialogueBox, updateDialogueBox,
    getTheme, updateTheme,
    getWidgetStyles, updateWidgetStyles,
    getSaveLoadScreen, updateSaveLoadScreen,
    getBacklogScreen, updateBacklogScreen,
    getGameMenu, updateGameMenu,
    applyBuiltinTheme,
    addScene, deleteScene, renameScene,
    addPage, deletePage, reorderPages,
    convertPageType, setSceneNext,
    findExpressionReferences, replaceExpressionReferences,
    loadScript, saveScript
  };
});
  function normalizeDialogueBox(dialogueBox) {
    const normalized = dialogueBox ?? {};
    normalized.fontSize ??= 18;
    normalized.fontFamily ??= null;
    normalized.textColor ??= null;
    normalized.nameplateFontSize ??= 20;
    normalized.nameplateFontFamily ??= null;
    normalized.nameplateColor ??= null;
    normalized.nameplateStyle ??= 'inline';
    normalized.nameplateBackgroundImage ??= null;
    normalized.decorations ??= [];
    return normalized;
  }
