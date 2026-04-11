<template>
  <span class="help-tip" @mouseenter="onEnter" @mouseleave="onLeave" ref="triggerRef">
    <span class="help-tip-icon">?</span>
    <Teleport to="body">
      <Transition name="help-tip-fade">
        <div v-if="show" class="help-tip-bubble" :style="bubbleStyle">
          <template v-for="(line, i) in lines" :key="i">
            {{ line }}<br v-if="i < lines.length - 1" />
          </template>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup>
/**
 * HelpTip — Contextual help tooltip component.
 * Renders a ? icon (D-01) that shows a positioned help bubble on hover (D-03).
 * Uses position:fixed + Teleport to avoid overflow clipping in scrollable panels.
 * @module components/HelpTip
 */
import { ref, computed, nextTick } from 'vue';

const props = defineProps({
  text: { type: String, required: true },
});

const show = ref(false);
const triggerRef = ref(null);
const pos = ref({ top: 0, left: 0, flipped: false });

const lines = computed(() => props.text.split('\n'));

const bubbleStyle = computed(() => {
  const style = {
    position: 'fixed',
    top: pos.value.top + 'px',
    transform: 'translateY(-50%)',
    zIndex: 9999,
  };
  if (pos.value.flipped) {
    style.right = (window.innerWidth - pos.value.left) + 'px';
  } else {
    style.left = pos.value.left + 'px';
  }
  return style;
});

async function onEnter() {
  show.value = true;
  await nextTick();
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  const centerY = rect.top + rect.height / 2;
  const rightEdge = rect.right + 8;
  const flipped = (rightEdge + 280) > window.innerWidth;
  pos.value = {
    top: centerY,
    left: flipped ? rect.left - 8 : rightEdge,
    flipped,
  };
}

function onLeave() {
  show.value = false;
}
</script>

<style>
/* Not scoped — Teleport renders outside component tree */
.help-tip {
  display: inline-flex;
  align-items: center;
  position: relative;
  cursor: help;
  margin-left: 4px;
  vertical-align: middle;
}
.help-tip-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007acc;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.help-tip-bubble {
  background: rgba(30, 30, 30, 0.95);
  color: #ddd;
  font-size: 12px;
  line-height: 1.5;
  padding: 8px 12px;
  border-radius: 6px;
  max-width: 260px;
  width: max-content;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
.help-tip-fade-enter-active,
.help-tip-fade-leave-active {
  transition: opacity 0.15s ease;
}
.help-tip-fade-enter-from,
.help-tip-fade-leave-to {
  opacity: 0;
}
</style>
