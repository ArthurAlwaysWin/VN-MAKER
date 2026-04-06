/**
 * Theme Editor composable — shared state for the visual theme editor.
 *
 * Provides iframe management, debounced postMessage preview,
 * token CRUD, and undo-stack integration via provide/inject.
 *
 * @module composables/useThemeEditor
 */

import { ref, provide, inject, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { DEFAULT_TOKENS } from '../../engine/tokens.js';

// ─── Symbol Key ────────────────────────────────────────
const THEME_EDITOR_KEY = Symbol('themeEditor');

// ─── Create (called once in ThemeDesigner) ─────────────

export function createThemeEditor() {
  const script = useScriptStore();

  const iframeRef = ref(null);
  const isEngineReady = ref(false);
  const showPalette = ref(false);
  const showNineSlice = ref(false);
  const showPreset = ref(false);

  let debounceTimer = null;

  // ─── Token Helpers ─────────────────────────────────

  function getMergedTokens() {
    return { ...DEFAULT_TOKENS, ...(script.getTheme()?.tokens ?? {}) };
  }

  function setToken(key, value) {
    const theme = script.getTheme();
    if (!theme) return;
    theme.tokens ??= {};
    theme.tokens[key] = value;
    sendThemeToPreview();
  }

  function setTokenBatch(partial) {
    const theme = script.getTheme();
    if (!theme) return;
    theme.tokens ??= {};
    Object.assign(theme.tokens, partial);
    sendThemeToPreview();
  }

  function commitTheme() {
    const theme = script.getTheme();
    if (!theme) return;
    const clone = JSON.parse(JSON.stringify(theme));
    script.updateTheme(clone);
    flushPreview();
  }

  function resetTheme() {
    script.updateTheme({ tokens: {} });
    sendThemeToPreview();
  }

  // ─── Preset Support (D-02) ─────────────────────────

  function previewPreset(presetTokens) {
    // Immediately send preview to iframe — no debounce, no store write
    if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
    const theme = script.getTheme();
    iframeRef.value.contentWindow.postMessage({
      type: 'update-theme',
      theme: {
        tokens: { ...presetTokens },
        nineSlice: theme?.nineSlice ?? {},
      },
    }, '*');
  }

  function applyPreset(presetTokens) {
    // Write to store + push undo (D-02, D-07, PRE-02)
    const theme = script.getTheme();
    const clone = JSON.parse(JSON.stringify({
      tokens: { ...presetTokens },
      nineSlice: theme?.nineSlice ?? {},
    }));
    script.updateTheme(clone);
    flushPreview();
  }

  function cancelPreview() {
    // Restore iframe to actual store state (Pitfall 5)
    flushPreview();
  }

  // ─── Preview Communication ─────────────────────────

  function sendThemeToPreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
      const theme = script.getTheme();
      if (!theme) return;
      iframeRef.value.contentWindow.postMessage({
        type: 'update-theme',
        theme: JSON.parse(JSON.stringify(theme)),
      }, '*');
    }, 200);
  }

  function flushPreview() {
    clearTimeout(debounceTimer);
    if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
    const theme = script.getTheme();
    if (!theme) return;
    iframeRef.value.contentWindow.postMessage({
      type: 'update-theme',
      theme: JSON.parse(JSON.stringify(theme)),
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
    showPalette,
    showNineSlice,
    showPreset,
    getMergedTokens,
    setToken,
    setTokenBatch,
    commitTheme,
    resetTheme,
    previewPreset,
    applyPreset,
    cancelPreview,
    sendThemeToPreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  };

  provide(THEME_EDITOR_KEY, editor);
  return editor;
}

// ─── Inject (called in child components) ─────────────

export function useThemeEditor() {
  const editor = inject(THEME_EDITOR_KEY);
  if (!editor) throw new Error('useThemeEditor() must be used inside ThemeDesigner');
  return editor;
}
