import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useScriptStore = defineStore('script', () => {
  const data = ref(null);
  const isLoading = ref(true);

  // History tracking for Undo/Redo
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
      historyIndex.value--;
      data.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
      saveScript();
    }
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++;
      data.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
      saveScript();
    }
  }

  async function loadScript() {
    isLoading.value = true;
    if (window.ipcRenderer) {
      const script = await window.ipcRenderer.invoke('read-script');
      if (script) {
        data.value = script;
        history.value = [];
        historyIndex.value = -1;
        pushState(); // Initial state
      }
    }
    isLoading.value = false;
  }

  async function saveScript() {
    if (window.ipcRenderer && data.value) {
      const success = await window.ipcRenderer.invoke('save-script', JSON.parse(JSON.stringify(data.value)));
      if (success) {
        console.log('Script saved successfully');
      }
    }
  }

  return { 
    data, isLoading, loadScript, saveScript, 
    pushState, undo, redo, historyIndex, history 
  };
});
