<template>
  <div class="variable-picker" :class="{ missing: isMissing }">
    <input
      v-model="query"
      class="field-input variable-search"
      type="search"
      placeholder="搜索变量名、ID 或分组"
      aria-label="搜索变量"
    />
    <select
      class="field-input variable-select"
      :value="modelValue || ''"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">{{ placeholder }}</option>
      <option v-if="isMissing" :value="modelValue">缺失变量：{{ modelValue }}</option>
      <option v-for="variable in filteredVariables" :key="variable.id" :value="variable.id">
        {{ optionLabel(variable) }}
      </option>
    </select>
    <p v-if="isMissing" class="missing-variable-warning">
      变量已不存在
      <button type="button" @click="$emit('goRegistry', modelValue)">前往变量表</button>
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  variables: { type: Array, default: () => [] },
  placeholder: { type: String, default: '选择变量' },
});

defineEmits(['goRegistry', 'update:modelValue']);

const query = ref('');
const isMissing = computed(() => (
  !!props.modelValue && !props.variables.some((variable) => variable.id === props.modelValue)
));
const filteredVariables = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase();
  if (!needle) return props.variables;
  return props.variables.filter((variable) => [
    variable.label,
    variable.id,
    variable.type,
    variable.group,
  ].some((value) => String(value || '').toLocaleLowerCase().includes(needle)));
});

function optionLabel(variable) {
  const group = variable.group ? ` · ${variable.group}` : '';
  return `${variable.label || variable.id} (${variable.id} · ${variable.type || 'number'}${group})`;
}
</script>

<style scoped>
.variable-picker {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.variable-search,
.variable-select {
  width: 100%;
}

.missing-variable-warning {
  color: #ff9b9b;
  font-size: 11px;
  margin: 0;
}

.missing-variable-warning button {
  background: none;
  border: none;
  color: #8bcfff;
  cursor: pointer;
  padding: 0 0 0 6px;
}
</style>
