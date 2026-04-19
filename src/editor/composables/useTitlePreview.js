/**
 * Title Page Preview composable — manages iframe preview for TitleDesigner.
 *
 * Provides iframe ref, engine readiness state, debounced postMessage sync,
 * and auto-show of the title screen on engine ready.
 *
 * @module composables/useTitlePreview
 */

import { ref, onBeforeUnmount } from 'vue';
import { useScriptStore } from '../stores/script.js';

export function useTitlePreview() {
  const script = useScriptStore();

  const iframeRef = ref(null);
  const isEngineReady = ref(false);

  let debounceTimer = null;

  // ─── Engine start ─────────────────────────────────

  function startEngine() {
    if (!iframeRef.value?.contentWindow || !script.data) return;
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

  // ─── Preview sync ─────────────────────────────────

  function sendTitleLayoutToPreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
      const cfg = script.getTitleScreen();
      if (!cfg) return;
      iframeRef.value.contentWindow.postMessage({
        type: 'update-screen-layout',
        screen: 'titleScreen',
        config: JSON.parse(JSON.stringify(cfg)),
      }, '*');
      iframeRef.value.contentWindow.postMessage({
        type: 'show-screen',
        screenId: 'titleScreen',
      }, '*');
    }, 200);
  }

  function flushPreview() {
    clearTimeout(debounceTimer);
    if (!iframeRef.value?.contentWindow || !isEngineReady.value) return;
    const cfg = script.getTitleScreen();
    if (!cfg) return;
    iframeRef.value.contentWindow.postMessage({
      type: 'update-screen-layout',
      screen: 'titleScreen',
      config: JSON.parse(JSON.stringify(cfg)),
    }, '*');
    iframeRef.value.contentWindow.postMessage({
      type: 'show-screen',
      screenId: 'titleScreen',
    }, '*');
  }

  // ─── Engine message handler ───────────────────────

  function onEngineMessage(event) {
    if (!event.data || !event.data.type) return;
    if (iframeRef.value && event.source !== iframeRef.value.contentWindow) return;

    if (event.data.type === 'ready') {
      isEngineReady.value = true;
      event.source?.postMessage({ type: 'ack-preview' }, '*');
      startEngine();
      // After engine starts, flush layout + show title screen
      setTimeout(() => flushPreview(), 300);
    }
  }

  window.addEventListener('message', onEngineMessage);

  // ─── Cleanup ──────────────────────────────────────

  function cleanup() {
    clearTimeout(debounceTimer);
    window.removeEventListener('message', onEngineMessage);
  }

  onBeforeUnmount(cleanup);

  return {
    iframeRef,
    isEngineReady,
    sendTitleLayoutToPreview,
    flushPreview,
    cleanup,
  };
}
