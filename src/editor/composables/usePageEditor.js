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
  };

  provide(PAGE_EDITOR_KEY, editor);
  return editor;
}

export function usePageEditor() {
  const editor = inject(PAGE_EDITOR_KEY);
  if (!editor) throw new Error('usePageEditor() must be used inside PageEditor');
  return editor;
}
