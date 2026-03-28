<template>
  <div class="editor-layout">
    <header class="editor-header">
      <h1>Galgame Maker</h1>
      <div class="header-actions">
        <button
          class="icon-btn"
          title="撤销 (Ctrl+Z)"
          :disabled="!canUndo"
          @click="script.undo()">↩</button>
        <button
          class="icon-btn"
          title="重做 (Ctrl+Y)"
          :disabled="!canRedo"
          @click="script.redo()">↪</button>
      </div>
    </header>
    <div class="editor-body">
      <Sidebar />
      <main class="workspace">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import Sidebar from './components/layout/Sidebar.vue';
import { useScriptStore } from './stores/script.js';

const script = useScriptStore();

const canUndo = computed(() => script.historyIndex > 0);
const canRedo = computed(() => script.historyIndex < script.history.length - 1);

// Auto-snapshot on data changes (debounced)
let snapshotTimer = null;
watch(() => script.data, () => {
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    script.pushState();
  }, 500);
}, { deep: true });

function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    if (canUndo.value) script.undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    if (canRedo.value) script.redo();
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>
.editor-layout { display: flex; flex-direction: column; height: 100vh; }
.editor-header { height: 40px; background: #2d2d2d; border-bottom: 1px solid #111; display:flex; align-items: center; padding: 0 16px; font-size: 14px; justify-content: space-between; }
.editor-header h1 { margin: 0; font-size: 14px; font-weight: normal; color: #fff; }
.header-actions { display: flex; gap: 4px; }
.icon-btn { background: transparent; border: 1px solid transparent; color: #ccc; width: 30px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.icon-btn:hover:not(:disabled) { background: #3c3c3c; border-color: #555; }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.editor-body { display: flex; flex: 1; overflow: hidden; }
.workspace { flex: 1; background: #1e1e1e; position: relative; overflow-y: auto; }
</style>
