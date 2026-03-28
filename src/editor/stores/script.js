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

  return {
    data, isLoading, _skipWatch,
    pushState, undo, redo,
    historyIndex, history,
    loadFromData, reset
  };
});
