<script setup>
/**
 * DropOverlay — Drag-drop file import overlay with counter-based show/hide.
 * Uses dragCounter to prevent flicker on child element boundary crossings.
 * @module components/resource-library/DropOverlay
 */
import { ref, computed } from 'vue';

const props = defineProps({
  categoryLabel: { type: String, default: '' },
});

const emit = defineEmits(['drop']);

// ─── State ──────────────────────────────────────────────────────────
const dragCounter = ref(0);
const showOverlay = computed(() => dragCounter.value > 0);

// ─── Drag Event Handlers ────────────────────────────────────────────

/**
 * Increment counter on dragenter to track nested child events.
 * @param {DragEvent} e
 */
function onDragEnter(e) {
  e.preventDefault();
  dragCounter.value++;
}

/**
 * Prevent default to allow drop.
 * @param {DragEvent} e
 */
function onDragOver(e) {
  e.preventDefault();
}

/**
 * Decrement counter on dragleave. Overlay hides when counter reaches 0.
 * @param {DragEvent} e
 */
function onDragLeave(e) {
  dragCounter.value--;
}

/**
 * Handle drop — reset counter and emit files.
 * @param {DragEvent} e
 */
function onDrop(e) {
  e.preventDefault();
  dragCounter.value = 0;
  emit('drop', Array.from(e.dataTransfer.files));
}
</script>

<template>
  <div
    class="drop-zone"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <slot />
    <div v-if="showOverlay" class="drop-overlay">
      <div class="drop-content">
        <span class="drop-text">释放以导入文件</span>
        <span class="drop-subtext">文件将导入到「{{ categoryLabel }}」</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-zone {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 122, 204, 0.15);
  border: 3px dashed #007acc;
  pointer-events: none;
  opacity: 1;
  transition: opacity 200ms ease;
}
.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.drop-text {
  font-size: 20px;
  color: #fff;
  font-weight: 500;
}
.drop-subtext {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
