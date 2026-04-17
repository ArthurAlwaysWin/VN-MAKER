/**
 * Widget Styles Editor composable — shared state for the widget styles editor.
 *
 * Provides iframe management, debounced postMessage preview,
 * and undo-stack integration via provide/inject.
 *
 * @module composables/useWidgetStylesEditor
 */

import { ref, provide, inject, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { WIDGET_DEFAULTS } from '../../engine/widgetDefaults.js';

// ─── Symbol Key ────────────────────────────────────────
const WIDGET_STYLES_EDITOR_KEY = Symbol('widgetStylesEditor');

// ─── Create (called once in WidgetStylesEditor) ───────

export function createWidgetStylesEditor() {
  const script = useScriptStore();

  const iframeRef = ref(null);
  const isEngineReady = ref(false);

  let debounceTimer = null;

  // ─── Preview Communication ─────────────────────────

  function sendWidgetStylesToPreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
      const ws = script.getWidgetStyles();
      if (!ws) return;
      iframeRef.value.contentWindow.postMessage({
        type: 'update-widget-styles',
        widgetStyles: JSON.parse(JSON.stringify(ws)),
      }, '*');
    }, 200);
  }

  function flushPreview() {
    clearTimeout(debounceTimer);
    if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
    const ws = script.getWidgetStyles();
    if (!ws) return;
    iframeRef.value.contentWindow.postMessage({
      type: 'update-widget-styles',
      widgetStyles: JSON.parse(JSON.stringify(ws)),
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

  // ─── Widget Field Helpers ─────────────────────────

  function setWidgetField(category, field, value) {
    const ws = script.getWidgetStyles();
    if (!ws) return;
    ws[category] ??= {};
    ws[category][field] = value;
    sendWidgetStylesToPreview();
  }

  function commitWidgetStyles() {
    const ws = script.getWidgetStyles();
    if (!ws) return;
    script.updateWidgetStyles(JSON.parse(JSON.stringify(ws)));
    flushPreview();
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
    WIDGET_DEFAULTS,
    setWidgetField,
    commitWidgetStyles,
    sendWidgetStylesToPreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  };

  provide(WIDGET_STYLES_EDITOR_KEY, editor);
  return editor;
}

// ─── Inject (called in child components) ─────────────

export function useWidgetStylesEditor() {
  const editor = inject(WIDGET_STYLES_EDITOR_KEY);
  if (!editor) throw new Error('useWidgetStylesEditor() must be used inside WidgetStylesEditor');
  return editor;
}
