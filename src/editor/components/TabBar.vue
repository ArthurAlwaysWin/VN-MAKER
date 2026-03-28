<template>
  <div class="tab-bar">
    <button
      v-for="tab in tabs" :key="tab.id"
      :class="['tab', { active: modelValue === tab.id }]"
      @click="$emit('update:modelValue', tab.id)"
    >
      {{ tab.icon }} {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true }
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.tab-bar {
  display: flex; background: #252526; border-bottom: 2px solid #1e1e1e;
  padding: 0 8px; gap: 2px; flex-shrink: 0;
}
.tab {
  padding: 10px 20px; color: #888; font-size: 13px; cursor: pointer;
  background: transparent; border: none; border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0; white-space: nowrap;
}
.tab:hover { color: #ccc; background: #2a2d2e; }
.tab.active {
  color: #fff; background: #1e1e1e;
  border-bottom-color: #007acc;
}
</style>
