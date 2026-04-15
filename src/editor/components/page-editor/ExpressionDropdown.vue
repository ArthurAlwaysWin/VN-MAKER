<template>
  <span class="expr-dropdown-trigger" ref="triggerRef" @click.stop="toggle">
    <img v-if="props.modelValue && props.expressions[props.modelValue]"
      :src="`asset://${props.expressions[props.modelValue]}`"
      class="expr-trigger-thumb" draggable="false" />
    <span class="expr-trigger-text">{{ props.modelValue || '不變' }}</span>
    <span class="expr-trigger-arrow">▼</span>
  </span>
  <Teleport to="body">
    <div v-if="isOpen" class="expr-dropdown-overlay" @click.self="close">
      <div class="expr-dropdown-panel" :style="panelStyle">
        <div v-if="hasExpressions" class="expr-dropdown-grid">
          <!-- "不變" card for nullable mode (D-02) -->
          <div v-if="props.nullable" class="expr-dropdown-cell unchanged-cell"
            :class="{ selected: !props.modelValue }"
            @click="select('')">
            <div class="expr-unchanged-label">不變</div>
          </div>
          <!-- Expression thumbnails -->
          <div v-for="(path, name) in props.expressions" :key="name"
            class="expr-dropdown-cell"
            :class="{ selected: props.modelValue === name }"
            @click="select(name)">
            <img :src="`asset://${path}`" :alt="name" draggable="false" />
            <div class="expr-dropdown-name">{{ name }}</div>
          </div>
        </div>
        <div v-else class="expr-dropdown-empty">该角色暂无表情</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps({
  expressions: { type: Object, default: () => ({}) },
  modelValue: { type: String, default: '' },
  nullable: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const triggerRef = ref(null);
const pos = ref({ top: 0, left: 0, flipUp: false });

const hasExpressions = computed(() => Object.keys(props.expressions).length > 0);

async function open() {
  isOpen.value = true;
  await nextTick();
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const dropdownMaxHeight = 300;
  const gap = 4;
  const flipUp = (rect.bottom + gap + dropdownMaxHeight) > window.innerHeight;
  pos.value = {
    top: flipUp ? rect.top - gap : rect.bottom + gap,
    left: rect.left,
    flipUp,
  };
}

function close() {
  isOpen.value = false;
}

function toggle() {
  if (isOpen.value) close();
  else open();
}

function select(name) {
  emit('update:modelValue', name);
  close();
}

const panelStyle = computed(() => {
  const s = {
    position: 'fixed',
    left: pos.value.left + 'px',
    zIndex: 9999,
  };
  if (pos.value.flipUp) {
    s.bottom = (window.innerHeight - pos.value.top) + 'px';
  } else {
    s.top = pos.value.top + 'px';
  }
  return s;
});

// ESC handler — capture phase + stopPropagation, only when open (D-04)
function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    close();
  }
}

watch(isOpen, (val) => {
  if (val) {
    document.addEventListener('keydown', onKeyDown, true);
  } else {
    document.removeEventListener('keydown', onKeyDown, true);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown, true);
});
</script>

<style scoped>
/* Trigger — lives inside component tree, scoped is fine */
.expr-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 1px 4px;
  border: 1px solid #555;
  border-radius: 3px;
  background: #3c3c3c;
  font-size: 11px;
  color: #ccc;
}
.expr-trigger-thumb {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 2px;
}
.expr-trigger-text {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.expr-trigger-arrow {
  font-size: 9px;
  color: #888;
}
</style>

<style>
/* Unscoped — Teleported dropdown panel renders outside component tree */
.expr-dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: transparent;
}
.expr-dropdown-panel {
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  min-width: 120px;
  max-width: 360px;
}
.expr-dropdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 6px;
  padding: 8px;
  max-height: 300px;
  overflow-y: auto;
}
.expr-dropdown-cell {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  overflow: hidden;
  transition: border-color 0.15s;
}
.expr-dropdown-cell:hover {
  border-color: #555;
  background: #222;
}
.expr-dropdown-cell.selected {
  border: 2px solid #007acc;
}
.expr-dropdown-cell img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  display: block;
  margin: 4px auto 0;
}
.expr-dropdown-name {
  font-size: 10px;
  color: #aaa;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.unchanged-cell {
  background: #3c3c3c;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70px;
}
.expr-unchanged-label {
  color: #aaa;
  font-size: 12px;
}
.expr-dropdown-empty {
  padding: 16px;
  text-align: center;
  color: #888;
  font-size: 12px;
}
</style>
