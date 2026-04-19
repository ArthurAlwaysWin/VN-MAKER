/**
 * Settings Page Editor composable — unified state for the merged settings page tab.
 *
 * Coordinates widget styles and screen layout (settingsScreen) editing
 * through a single iframe with debounced postMessage batching.
 * Theme tokens are managed by ProjectSettings — not this composable.
 *
 * @module composables/useSettingsPageEditor
 */

import { ref, provide, inject, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { WIDGET_DEFAULTS } from '../../engine/widgetDefaults.js';
import { WIDGET_STYLES_EDITOR_KEY } from './useWidgetStylesEditor.js';
import { SCREEN_LAYOUT_EDITOR_KEY } from './useScreenLayoutEditor.js';

const SETTINGS_PAGE_EDITOR_KEY = Symbol('settingsPageEditor');

export function createSettingsPageEditor() {
  const script = useScriptStore();

  const iframeRef = ref(null);
  const isEngineReady = ref(false);

  let debounceTimer = null;

  // ─── Screen Layout (settingsScreen) ────────────────

  function getScreenConfig() {
    return script.getSettingsScreen();
  }

  function setScreenField(field, value) {
    const cfg = getScreenConfig();
    if (!cfg) return;
    cfg[field] = value;
    schedulePreview();
  }

  function setScreenNestedField(group, field, value) {
    const cfg = getScreenConfig();
    if (!cfg) return;
    cfg[group] ??= {};
    cfg[group][field] = value;
    schedulePreview();
  }

  function commitScreenLayout() {
    const cfg = getScreenConfig();
    if (!cfg) return;
    script.updateSettingsScreen(JSON.parse(JSON.stringify(cfg)));
    flushPreview();
  }

  // ─── Widget Styles ─────────────────────────────────

  function setWidgetField(category, field, value) {
    const ws = script.getWidgetStyles();
    if (!ws) return;
    ws[category] ??= {};
    ws[category][field] = value;
    schedulePreview();
  }

  function commitWidgetStyles() {
    const ws = script.getWidgetStyles();
    if (!ws) return;
    script.updateWidgetStyles(JSON.parse(JSON.stringify(ws)));
    flushPreview();
  }

  // ─── Preview Communication ─────────────────────────

  function schedulePreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
      const win = iframeRef.value.contentWindow;
      // Send screen layout
      const cfg = getScreenConfig();
      if (cfg) {
        win.postMessage({
          type: 'update-screen-layout',
          screen: 'settingsScreen',
          config: JSON.parse(JSON.stringify(cfg)),
        }, '*');
      }
      // Send widget styles
      const ws = script.getWidgetStyles();
      if (ws) {
        win.postMessage({
          type: 'update-widget-styles',
          widgetStyles: JSON.parse(JSON.stringify(ws)),
        }, '*');
      }
    }, 200);
  }

  function flushPreview() {
    clearTimeout(debounceTimer);
    if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
    const win = iframeRef.value.contentWindow;
    const cfg = getScreenConfig();
    if (cfg) {
      win.postMessage({
        type: 'update-screen-layout',
        screen: 'settingsScreen',
        config: JSON.parse(JSON.stringify(cfg)),
      }, '*');
    }
    const ws = script.getWidgetStyles();
    if (ws) {
      win.postMessage({
        type: 'update-widget-styles',
        widgetStyles: JSON.parse(JSON.stringify(ws)),
      }, '*');
    }
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

  function onEngineMessage(event) {
    if (!event.data || !event.data.type) return;
    if (iframeRef.value && event.source !== iframeRef.value.contentWindow) return;

    if (event.data.type === 'ready') {
      isEngineReady.value = true;
      event.source?.postMessage({ type: 'ack-preview' }, '*');
      startEngine();
      flushPreview();
      // Show settings screen in preview
      iframeRef.value?.contentWindow?.postMessage({
        type: 'show-screen',
        screenId: 'settingsScreen',
      }, '*');
    }
  }

  function cleanup() {
    clearTimeout(debounceTimer);
  }

  onBeforeUnmount(cleanup);

  const editor = {
    iframeRef,
    isEngineReady,
    WIDGET_DEFAULTS,
    // Screen layout
    getScreenConfig,
    setScreenField,
    setScreenNestedField,
    commitScreenLayout,
    // Widget styles
    setWidgetField,
    commitWidgetStyles,
    // Preview
    schedulePreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  };

  provide(SETTINGS_PAGE_EDITOR_KEY, editor);

  // Provide widget-styles-compatible interface for TabShapeSection, etc.
  provide(WIDGET_STYLES_EDITOR_KEY, {
    iframeRef,
    isEngineReady,
    WIDGET_DEFAULTS,
    setWidgetField,
    commitWidgetStyles,
    sendWidgetStylesToPreview: schedulePreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  });

  // Provide screen-layout-compatible interface for TabCrudSection, etc.
  provide(SCREEN_LAYOUT_EDITOR_KEY, {
    iframeRef,
    isEngineReady,
    activeScreen: ref('settingsScreen'),
    SCREENS: [{ id: 'settingsScreen', label: '设置' }],
    getActiveScreenConfig: getScreenConfig,
    setScreenField,
    setScreenNestedField,
    commitScreenLayout,
    sendScreenLayoutToPreview: schedulePreview,
    flushPreview,
    startEngine,
    onEngineMessage,
    cleanup,
  });

  return editor;
}

export function useSettingsPageEditor() {
  const editor = inject(SETTINGS_PAGE_EDITOR_KEY);
  if (!editor) throw new Error('useSettingsPageEditor() must be used inside SettingsPageEditor');
  return editor;
}
