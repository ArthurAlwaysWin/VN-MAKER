/**
 * Screen Layout Editor composable — shared state for the layout editor.
 *
 * Provides iframe management, debounced postMessage preview,
 * active screen selection, and undo-stack integration via provide/inject.
 *
 * @module composables/useScreenLayoutEditor
 */

import { ref, provide, inject, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';

// ─── Symbol Key ────────────────────────────────────────
const SCREEN_LAYOUT_EDITOR_KEY = Symbol('screenLayoutEditor');

// ─── Screen registry ──────────────────────────────────
const SCREENS = [
  { id: 'saveLoadScreen', label: '存读档' },
  { id: 'backlogScreen', label: '回想' },
  { id: 'gameMenu', label: '游戏菜单' },
  { id: 'settingsScreen', label: '设置' },
];

// ─── Create (called once in ScreenLayoutEditor) ───────

export function createScreenLayoutEditor() {
  const script = useScriptStore();

  const iframeRef = ref(null);
  const isEngineReady = ref(false);
  const activeScreen = ref('saveLoadScreen');

  let debounceTimer = null;

  // ─── Screen data accessors ─────────────────────────

  const screenGetters = {
    saveLoadScreen: () => script.getSaveLoadScreen(),
    backlogScreen: () => script.getBacklogScreen(),
    gameMenu: () => script.getGameMenu(),
    settingsScreen: () => script.getSettingsScreen(),
  };

  function getActiveScreenConfig() {
    const getter = screenGetters[activeScreen.value];
    return getter ? getter() : null;
  }

  // ─── Preview Communication ─────────────────────────

  function sendScreenLayoutToPreview(screenId) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
      const target = screenId || activeScreen.value;
      const getter = screenGetters[target];
      const config = getter ? getter() : null;
      if (!config) return;
      iframeRef.value.contentWindow.postMessage({
        type: 'update-screen-layout',
        screen: target,
        config: JSON.parse(JSON.stringify(config)),
      }, '*');
    }, 200);
  }

  function flushPreview(screenId) {
    clearTimeout(debounceTimer);
    if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
    const target = screenId || activeScreen.value;
    const getter = screenGetters[target];
    const config = getter ? getter() : null;
    if (!config) return;
    iframeRef.value.contentWindow.postMessage({
      type: 'update-screen-layout',
      screen: target,
      config: JSON.parse(JSON.stringify(config)),
    }, '*');
  }

  function startEngine() {
    if (!iframeRef.value?.contentWindow) return;
    if (!script.data) return;
    const snapshot = JSON.parse(JSON.stringify(script.data));
    const firstSceneId = Object.keys(script.data.scenes || {})[0] || null;
    iframeRef.value.contentWindow.postMessage({
      type: 'start',
      script: snapshot,
      sceneId: firstSceneId,
      pageIndex: 0,
      previewMode: true,
    }, '*');
  }

  // ─── Engine Message Handler ────────────────────────

  function onEngineMessage(event) {
    if (!event.data || !event.data.type) return;
    if (iframeRef.value && event.source !== iframeRef.value.contentWindow) return;

    if (event.data.type === 'ready') {
      isEngineReady.value = true;
      startEngine();
      flushPreview();
    }
  }

  // ─── Cleanup ───────────────────────────────────────

  function cleanup() {
    clearTimeout(debounceTimer);
  }

  onBeforeUnmount(cleanup);

  // ─── Expose ────────────────────────────────────────

  const editor = {
    iframeRef,
    isEngineReady,
    activeScreen,
    SCREENS,
    getActiveScreenConfig,
    sendScreenLayoutToPreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  };

  provide(SCREEN_LAYOUT_EDITOR_KEY, editor);
  return editor;
}

// ─── Inject (called in child components) ─────────────

export function useScreenLayoutEditor() {
  const editor = inject(SCREEN_LAYOUT_EDITOR_KEY);
  if (!editor) throw new Error('useScreenLayoutEditor() must be used inside ScreenLayoutEditor');
  return editor;
}
