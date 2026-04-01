<template>
  <div
    class="draggable-element"
    :class="{ selected: isSelected, dragging: isDragging }"
    :style="positionStyle"
    @mousedown.stop="onMouseDown"
    @click.stop="$emit('select')">
    <slot></slot>
    <!-- Resize handle (bottom-right) -->
    <div
      v-if="isSelected && resizable"
      class="resize-handle"
      @mousedown.stop="onResizeStart">
    </div>
    <!-- Scale handle (top-right corner) -->
    <div
      v-if="isSelected && scalable"
      class="scale-handle"
      @mousedown.stop="onScaleStart">
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  scale: { type: Number, default: 1 },
  isSelected: { type: Boolean, default: false },
  resizable: { type: Boolean, default: false },
  scalable: { type: Boolean, default: false },
  canvasScale: { type: Number, default: 1 },
});

const emit = defineEmits(['select', 'move', 'resize', 'scale']);

const isDragging = ref(false);
const dragStart = ref({ mx: 0, my: 0, ex: 0, ey: 0 });

const positionStyle = computed(() => {
  const s = {};
  s.left = props.x + 'px';
  s.top = props.y + 'px';
  if (props.width != null) s.width = props.width + 'px';
  if (props.height != null) s.height = props.height + 'px';
  if (props.scale !== 1) s.transform = `scale(${props.scale})`;
  return s;
});

function onMouseDown(e) {
  if (e.button !== 0) return;
  isDragging.value = true;
  dragStart.value = {
    mx: e.clientX,
    my: e.clientY,
    ex: props.x,
    ey: props.y,
  };

  const onMove = (ev) => {
    const dx = (ev.clientX - dragStart.value.mx) / props.canvasScale;
    const dy = (ev.clientY - dragStart.value.my) / props.canvasScale;
    emit('move', {
      x: Math.round(dragStart.value.ex + dx),
      y: Math.round(dragStart.value.ey + dy),
    });
  };

  const onUp = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function onResizeStart(e) {
  if (e.button !== 0) return;
  e.stopPropagation();
  const startW = props.width || 100;
  const startH = props.height || 100;
  const startX = e.clientX;
  const startY = e.clientY;
  const aspectRatio = startW / startH;

  const onMove = (ev) => {
    const dw = (ev.clientX - startX) / props.canvasScale;
    const dh = (ev.clientY - startY) / props.canvasScale;
    let newW = Math.max(50, Math.round(startW + dw));
    let newH = Math.max(30, Math.round(startH + dh));
    if (ev.shiftKey) {
      if (Math.abs(dw) >= Math.abs(dh)) {
        newH = Math.max(30, Math.round(newW / aspectRatio));
      } else {
        newW = Math.max(50, Math.round(newH * aspectRatio));
      }
    }
    emit('resize', { width: newW, height: newH });
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function onScaleStart(e) {
  if (e.button !== 0) return;
  e.stopPropagation();
  const startScale = props.scale || 1;
  const startY = e.clientY;

  const onMove = (ev) => {
    const dy = -(ev.clientY - startY) / props.canvasScale;
    const delta = dy / 200;
    const newScale = Math.min(3, Math.max(0.2, +(startScale + delta).toFixed(2)));
    emit('scale', newScale);
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

<style scoped>
.draggable-element {
  position: absolute;
  cursor: grab;
  user-select: none;
  box-sizing: border-box;
}

.draggable-element.dragging {
  cursor: grabbing;
}

.draggable-element.selected {
  outline: 2px solid #007acc;
  outline-offset: 2px;
}

.resize-handle {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background: #007acc;
  border: 1px solid #fff;
  cursor: nwse-resize;
  z-index: 10;
}

.scale-handle {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background: #e0a020;
  border: 1px solid #fff;
  border-radius: 50%;
  cursor: ns-resize;
  z-index: 10;
}
</style>
