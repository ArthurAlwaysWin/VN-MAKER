import { ref, computed, provide, inject } from 'vue';
import { useScriptStore } from '../stores/script.js';

const PAGE_EDITOR_KEY = Symbol('pageEditor');

export function createPageEditor() {
  const script = useScriptStore();
  let previewRequestCounter = 0;
  const effectPreviewProvenanceByRequestId = new Map();

  const selectedSceneId = ref(null);
  const selectedPageIndex = ref(0);
  const selectedDialogueIndex = ref(0);
  const selectedCharIndex = ref(-1);
  const showCharPicker = ref(false);
  const showBgPicker = ref(false);
  const showAudioPicker = ref(false);
  const audioPickerTab = ref('bgm');

  // ─── Snap / Grid / Guides state ──────────────────────────────────
  const snapEnabled = ref(true);
  const gridVisible = ref(false);
  const gridSize = ref(16);
  const activeGuides = ref([]); // [{axis, at, kind}] — populated during drag

  // ─── Preview mode state ─────────────────────────────────
  const previewSessionType = ref(null);
  const isPreviewMode = computed(() => previewSessionType.value !== null);
  const isMuted = ref(false);
  const isEngineReady = ref(false);
  const previewIframeRef = ref(null);
  const isEffectPreviewBusy = ref(false);
  const activeEffectPreviewRequestId = ref(null);
  const activeEffectPreviewRequest = ref(null);
  const lastEffectPreviewResult = ref(null);
  const previewDisabledReason = ref(null);
  const lastEffectPreviewAttempt = ref(null);

  const previewModeLabel = computed(() => (
    previewSessionType.value === 'effect' ? '效果预览中' : '试玩中'
  ));
  const stopPreviewLabel = computed(() => (
    previewSessionType.value === 'effect' ? '停止预览' : '停止试玩'
  ));

  const currentScene = computed(() => {
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
  function buildScriptSnapshot() {
    if (!script.data) return null;
    return JSON.parse(JSON.stringify(script.data));
  }

  function getPreviewDisabledReason(effectKind, payload = {}) {
    if (!previewIframeRef.value?.contentWindow || !isEngineReady.value) {
      return 'engine-not-ready';
    }
    if (!currentPage.value || !selectedSceneId.value) {
      return 'no-page-selected';
    }
    if (effectKind === 'character' && !payload.animation) {
      return 'missing-character-animation';
    }
    if (effectKind === 'camera' && !payload.effect) {
      return 'missing-camera-config';
    }
    if (effectKind === 'transition' && !payload.type) {
      return 'missing-transition-config';
    }
    if (effectKind === 'particle' && !payload.config) {
      return 'missing-particle-config';
    }
    return null;
  }

  function nextPreviewRequestId() {
    previewRequestCounter += 1;
    return `preview-effect-${previewRequestCounter}`;
  }

  function getDefaultCharacterProvenance(payload = {}) {
    const charIndex = selectedCharIndex.value;
    const currentCharacter = currentPage.value?.characters?.[charIndex] || null;

    return {
      charIndex,
      characterId: payload.characterId ?? currentCharacter?.id ?? null,
    };
  }

  function buildEffectPreviewProvenance(effectKind, payload = {}, provenance = {}) {
    const baseProvenance = {
      sceneId: provenance.sceneId ?? selectedSceneId.value,
      pageIndex: provenance.pageIndex ?? selectedPageIndex.value,
    };

    if (effectKind === 'character') {
      const defaultCharacterProvenance = getDefaultCharacterProvenance(payload);
      return {
        ...baseProvenance,
        charIndex: provenance.charIndex ?? defaultCharacterProvenance.charIndex,
        characterId: provenance.characterId ?? defaultCharacterProvenance.characterId,
      };
    }

    return baseProvenance;
  }

  function isSameEffectPreviewProvenance(effectKind, left, right) {
    if (!left || !right) {
      return false;
    }

    if (left.sceneId !== right.sceneId || left.pageIndex !== right.pageIndex) {
      return false;
    }

    if (effectKind !== 'character') {
      return true;
    }

    return left.charIndex === right.charIndex
      && left.characterId === right.characterId;
  }

  function getTerminalEffectPreviewResult(effectKind, provenance) {
    const result = lastEffectPreviewResult.value;
    if (!result || result.effectKind !== effectKind) {
      return null;
    }

    if (!['completed', 'cancelled', 'rejected', 'failed'].includes(result.status)) {
      return null;
    }

    const resultProvenance = effectPreviewProvenanceByRequestId.get(result.requestId);
    if (!isSameEffectPreviewProvenance(effectKind, resultProvenance, provenance)) {
      return null;
    }

    return result;
  }

  function getEffectPreviewUiState(effectKind, provenance = {}) {
    const resolvedProvenance = buildEffectPreviewProvenance(effectKind, {}, provenance);
    const activeRequest = activeEffectPreviewRequest.value;
    const activeProvenance = activeEffectPreviewRequestId.value
      ? effectPreviewProvenanceByRequestId.get(activeEffectPreviewRequestId.value)
      : null;
    const isBusy = Boolean(
      isEffectPreviewBusy.value
      && activeRequest?.effectKind === effectKind
      && isSameEffectPreviewProvenance(effectKind, activeProvenance, resolvedProvenance),
    );
    const showDisabledReason = Boolean(
      previewDisabledReason.value
      && lastEffectPreviewAttempt.value?.effectKind === effectKind
      && isSameEffectPreviewProvenance(
        effectKind,
        lastEffectPreviewAttempt.value?.provenance,
        resolvedProvenance,
      ),
    );

    return {
      isBusy,
      isDisabled: showDisabledReason,
      disabledReason: showDisabledReason ? previewDisabledReason.value : null,
      result: isBusy ? null : getTerminalEffectPreviewResult(effectKind, resolvedProvenance),
    };
  }

  function startPreview() {
    if (!previewIframeRef.value || !isEngineReady.value) return;
    if (!script.data || !selectedSceneId.value) return;

    const snapshot = buildScriptSnapshot();

    previewIframeRef.value.contentWindow.postMessage({
      type: 'start',
      script: snapshot,
      sceneId: selectedSceneId.value,
      pageIndex: selectedPageIndex.value,
      previewMode: true,
    }, '*');

    previewSessionType.value = 'play';
    isMuted.value = false;
  }

  function previewEffect(request) {
    const effectKind = request?.effectKind;
    const payload = request?.payload || {};
    const provenance = buildEffectPreviewProvenance(effectKind, payload);
    const reason = getPreviewDisabledReason(effectKind, payload);
    if (reason) {
      previewDisabledReason.value = reason;
      lastEffectPreviewAttempt.value = {
        effectKind,
        provenance,
        requestId: null,
      };
      return { ok: false, reason };
    }

    const requestId = nextPreviewRequestId();
    const message = {
      type: 'preview-effect',
      requestId,
      effectKind,
      sceneId: selectedSceneId.value,
      pageIndex: selectedPageIndex.value,
      script: buildScriptSnapshot(),
      payload,
    };

    previewIframeRef.value.contentWindow.postMessage(message, '*');

    effectPreviewProvenanceByRequestId.set(requestId, provenance);
    previewDisabledReason.value = null;
    lastEffectPreviewAttempt.value = {
      effectKind,
      provenance,
      requestId,
    };
    previewSessionType.value = 'effect';
    isEffectPreviewBusy.value = true;
    activeEffectPreviewRequestId.value = requestId;
    activeEffectPreviewRequest.value = message;

    return { ok: true, requestId };
  }

  function previewCharacterEffect(payload) {
    return previewEffect({ effectKind: 'character', payload });
  }

  function previewCameraEffect(payload) {
    return previewEffect({ effectKind: 'camera', payload });
  }

  function previewTransitionEffect(payload) {
    return previewEffect({ effectKind: 'transition', payload });
  }

  function previewParticleEffect(payload) {
    return previewEffect({ effectKind: 'particle', payload });
  }

  function stopActiveEffectPreview() {
    if (!previewIframeRef.value?.contentWindow || !activeEffectPreviewRequestId.value) return;
    previewIframeRef.value.contentWindow.postMessage({
      type: 'preview-effect-stop',
      requestId: activeEffectPreviewRequestId.value,
    }, '*');
  }

  function stopPreview() {
    if (previewSessionType.value === 'effect') {
      stopActiveEffectPreview();
      return;
    }
    if (previewIframeRef.value?.contentWindow) {
      previewIframeRef.value.contentWindow.postMessage({ type: 'stop' }, '*');
    }
    previewSessionType.value = null;
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
        if (previewSessionType.value === 'play') {
          stopPreview();
        }
        break;
      case 'preview-effect-result':
        lastEffectPreviewResult.value = msg;
        if (msg.status === 'accepted') {
          isEffectPreviewBusy.value = true;
          break;
        }
        if (['completed', 'cancelled', 'rejected', 'failed'].includes(msg.status)) {
          isEffectPreviewBusy.value = false;
          activeEffectPreviewRequestId.value = null;
          activeEffectPreviewRequest.value = null;
          if (previewSessionType.value === 'effect') {
            previewSessionType.value = null;
            isMuted.value = false;
          }
        }
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
    previewSessionType,
    isPreviewMode,
    isMuted,
    isEngineReady,
    previewIframeRef,
    isEffectPreviewBusy,
    activeEffectPreviewRequestId,
    activeEffectPreviewRequest,
    lastEffectPreviewResult,
    previewDisabledReason,
    getEffectPreviewUiState,
    previewModeLabel,
    stopPreviewLabel,
    startPreview,
    previewEffect,
    previewCharacterEffect,
    previewCameraEffect,
    previewTransitionEffect,
    previewParticleEffect,
    stopPreview,
    stopActiveEffectPreview,
    toggleMute,
    onEngineMessage,
    // Snap / Grid / Guides
    snapEnabled,
    gridVisible,
    gridSize,
    activeGuides,
  };

  provide(PAGE_EDITOR_KEY, editor);
  return editor;
}

export function usePageEditor() {
  const editor = inject(PAGE_EDITOR_KEY);
  if (!editor) throw new Error('usePageEditor() must be used inside PageEditor');
  return editor;
}
