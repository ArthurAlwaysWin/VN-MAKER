<script setup>
/**
 * InlineEdit — Reusable inline rename component.
 * Supports double-click activation, Enter/Escape/blur, extension preservation.
 * @module components/resource-library/InlineEdit
 */
import { ref, nextTick } from 'vue';

const props = defineProps({
  value: { type: String, required: true },
  preserveExtension: { type: Boolean, default: false },
});

const emit = defineEmits(['save', 'cancel']);

const isEditing = ref(false);
const editValue = ref('');
const inputRef = ref(null);

/**
 * Extract file extension from a filename (including the dot).
 * @param {string} name - Filename
 * @returns {string} Extension with dot, or empty string
 */
function getExtension(name) {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(dotIndex) : '';
}

/**
 * Start inline editing. Can be triggered by double-click or programmatically.
 */
function startEdit() {
  if (props.preserveExtension) {
    const ext = getExtension(props.value);
    editValue.value = ext ? props.value.slice(0, -ext.length) : props.value;
  } else {
    editValue.value = props.value;
  }
  isEditing.value = true;
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus();
      inputRef.value.select();
    }
  });
}

/**
 * Confirm the edit — trim, validate, re-append extension if needed.
 */
function confirm() {
  const trimmed = editValue.value.trim();
  if (!trimmed) {
    cancel();
    return;
  }
  let finalValue = trimmed;
  if (props.preserveExtension) {
    finalValue = trimmed + getExtension(props.value);
  }
  isEditing.value = false;
  emit('save', finalValue);
}

/**
 * Cancel the edit — restore original display.
 */
function cancel() {
  isEditing.value = false;
  emit('cancel');
}

defineExpose({ startEdit });
</script>

<template>
  <span v-if="!isEditing" class="inline-edit-text" @dblclick="startEdit">{{ value }}</span>
  <input
    v-else
    ref="inputRef"
    v-model="editValue"
    class="inline-edit-input"
    @keydown.enter="confirm"
    @keydown.escape="cancel"
    @blur="confirm"
  />
</template>

<style scoped>
.inline-edit-text {
  cursor: pointer;
}
.inline-edit-input {
  background: #3c3c3c;
  border: 1px solid #007acc;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
</style>
