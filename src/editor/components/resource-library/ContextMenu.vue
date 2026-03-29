<script setup>
/**
 * ContextMenu — Custom right-click context menu.
 * Renders at mouse position with viewport clamping and dark theme styling.
 * @module components/resource-library/ContextMenu
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  items: {
    type: Array,
    default: () => [],
    // Each item: { label: String, action: String, destructive?: Boolean, separator?: Boolean }
  },
});

const emit = defineEmits(['select', 'close']);

const menuRef = ref(null);
const menuWidth = ref(160);
const menuHeight = ref(100);

// ─── Viewport Clamping ──────────────────────────────────────────────
const clampedX = computed(() => {
  if (props.x + menuWidth.value > window.innerWidth) {
    return window.innerWidth - menuWidth.value - 4;
  }
  return props.x;
});

const clampedY = computed(() => {
  if (props.y + menuHeight.value > window.innerHeight) {
    return window.innerHeight - menuHeight.value - 4;
  }
  return props.y;
});

// ─── Event Handlers ─────────────────────────────────────────────────
function onOutsideClick(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    emit('close');
  }
}

function onEscKey(e) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

function onItemClick(action) {
  emit('select', action);
  emit('close');
}

// ─── Lifecycle ──────────────────────────────────────────────────────
watch(() => props.visible, (val) => {
  if (val) {
    // Defer to next tick so the menu renders before we measure
    setTimeout(() => {
      if (menuRef.value) {
        menuWidth.value = menuRef.value.offsetWidth || 160;
        menuHeight.value = menuRef.value.offsetHeight || 100;
      }
      document.addEventListener('click', onOutsideClick, true);
      document.addEventListener('keydown', onEscKey);
    }, 0);
  } else {
    document.removeEventListener('click', onOutsideClick, true);
    document.removeEventListener('keydown', onEscKey);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onOutsideClick, true);
  document.removeEventListener('keydown', onEscKey);
});
</script>

<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="context-menu"
    :style="{ top: clampedY + 'px', left: clampedX + 'px' }"
  >
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.separator" class="separator"></div>
      <div
        v-else
        class="menu-item"
        :class="{ destructive: item.destructive }"
        @click="onItemClick(item.action)"
      >
        {{ item.label }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  background: #252526;
  border: 1px solid #444;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  padding: 4px 0;
  min-width: 140px;
}
.menu-item {
  padding: 8px 16px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
}
.menu-item:hover {
  background: #007acc;
  color: #fff;
}
.menu-item.destructive {
  color: #e66;
}
.menu-item.destructive:hover {
  background: #a22;
  color: #fff;
}
.separator {
  height: 1px;
  background: #444;
  margin: 4px 8px;
}
</style>
