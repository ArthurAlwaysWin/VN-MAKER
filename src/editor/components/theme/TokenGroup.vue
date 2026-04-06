<template>
  <div class="token-group">
    <button class="group-header" @click="expanded = !expanded">
      <span class="group-arrow" :class="{ expanded }">▶</span>
      <span class="group-label">{{ label }}</span>
    </button>
    <div class="group-content" :class="{ expanded }">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  label: String,
});

const expanded = ref(true);
</script>

<style scoped>
.token-group {
  border-bottom: 1px solid #333;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: #2d2d2d;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
}
.group-header:hover {
  background: #333;
}
.group-arrow {
  font-size: 10px;
  transition: transform 200ms ease;
  display: inline-block;
}
.group-arrow.expanded {
  transform: rotate(90deg);
}
.group-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 200ms ease;
}
.group-content.expanded {
  max-height: 2000px;
}
</style>
