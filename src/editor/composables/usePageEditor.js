import { ref, computed, provide, inject } from 'vue';
import { useScriptStore } from '../stores/script.js';

const PAGE_EDITOR_KEY = Symbol('pageEditor');

export function createPageEditor() {
  const script = useScriptStore();

  const selectedSceneId = ref(null);
  const selectedPageIndex = ref(0);
  const selectedDialogueIndex = ref(0);
  const selectedCharIndex = ref(-1);
  const showCharPicker = ref(false);
  const showBgPicker = ref(false);
  const showAudioPicker = ref(false);
  const audioPickerTab = ref('bgm');

  // ─── Preview mode state ─────────────────────────────────
  const isPreviewMode = ref(false);
  const isMuted = ref(false);
  const isEngineReady = ref(false);
  const previewIframeRef = ref(null);

  const currentScene= computed(() => {
    if (!script.data || !selectedSceneId.value) return null;
    return script.data.scenes[selectedSceneId.value] || null;
  });

  const currentPage = computed(() => {
    return currentScene.value?.pages?.[selectedPageIndex.value] || null;
  });

  const currentDialogue = computed(() => {
    return currentPage.value?.dialogues?.[selectedDialogueIndex.value] || null;
  });

  function selectPage(sceneId, pageIndex) {
    selectedSceneId.value = sceneId;
    selectedPageIndex.value = pageIndex;
    selectedDialogueIndex.value = 0;
    selectedCharIndex.value = -1;
  }

  function selectDialogue(index) {
    selectedDialogueIndex.value = index;
  }

  function selectCharacter(index) {
    selectedCharIndex.value = index;
  }

  function initSelection() {
    if (!script.data?.scenes) return;
    const entries = Object.entries(script.data.scenes);
    if (entries.length > 0) {
      const [sceneId, scene] = entries[0];
      selectedSceneId.value = sceneId;
      selectedPageIndex.value = scene.pages?.length > 0 ? 0 : -1;
    }
  }

  // ─── Preview mode methods ───────────────────────────────
  function startPreview() {
    if (!previewIframeRef.value || !isEngineReady.value) return;
    if (!script.data || !selectedSceneId.value) return;

    // Deep-copy script data to strip Vue Proxy (per D-08)
    const snapshot = JSON.parse(JSON.stringify(script.data));

    previewIframeRef.value.contentWindow.postMessage({
      type: 'start',
      script: snapshot,
      sceneId: selectedSceneId.value,
      pageIndex: selectedPageIndex.value,
      previewMode: true,
    }, '*');

    isPreviewMode.value = true;
    isMuted.value = false;
  }

  function stopPreview() {
    if (previewIframeRef.value?.contentWindow) {
      previewIframeRef.value.contentWindow.postMessage({ type: 'stop' }, '*');
    }
    isPreviewMode.value = false;
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
    if (previewIframeRef.value?.contentWindow) {
      previewIframeRef.value.contentWindow.postMessage({
        type: 'mute',
        muted: isMuted.value,
      }, '*');
    }
  }

  function onEngineMessage(event) {
    const msg = event.data;
    if (!msg || !msg.type) return;
    if (previewIframeRef.value && event.source !== previewIframeRef.value.contentWindow) return;

    switch (msg.type) {
      case 'ready':
        isEngineReady.value = true;
        // Acknowledge preview context so iframe detects 'preview' env
        event.source?.postMessage({ type: 'ack-preview' }, '*');
        break;
      case 'ended':
        stopPreview();
        break;
    }
  }

  const editor = {
    selectedSceneId,
    selectedPageIndex,
    selectedDialogueIndex,
    selectedCharIndex,
    showCharPicker,
    showBgPicker,
    showAudioPicker,
    audioPickerTab,
    currentScene,
    currentPage,
    currentDialogue,
    selectPage,
    selectDialogue,
    selectCharacter,
    initSelection,
    isPreviewMode,
    isMuted,
    isEngineReady,
    previewIframeRef,
    startPreview,
    stopPreview,
    toggleMute,
    onEngineMessage,
  };

  provide(PAGE_EDITOR_KEY, editor);
  return editor;
}

export function usePageEditor() {
  const editor = inject(PAGE_EDITOR_KEY);
  if (!editor) throw new Error('usePageEditor() must be used inside PageEditor');
  return editor;
}
