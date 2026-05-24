<template>
  <div class="inspector-card" v-if="variableId && variableEntry">
    <div class="inspector-header">
      <div>
        <p class="eyebrow">变量详情</p>
        <h2>{{ variableEntry.label || variableEntry.name || variableId }}</h2>
        <p class="helper">{{ usageCount }} 处引用</p>
      </div>
      <div class="header-actions">
        <span class="id-chip">{{ variableId }}</span>
        <button
          data-test="variable-delete"
          class="delete-btn"
          type="button"
          @click="emit('requestDelete', { variableId })"
        >删除变量</button>
      </div>
    </div>

    <div class="field-grid">
      <label class="field">
        <span>显示名</span>
        <input
          ref="nameInputRef"
          data-test="variable-name-input"
          :value="variableEntry.label || variableEntry.name || ''"
          type="text"
          placeholder="例如：樱好感"
          @input="onNameInput"
        >
      </label>

      <label class="field">
        <span>内部 ID</span>
        <input
          data-test="variable-id-input"
          :value="draftIdValue"
          type="text"
          placeholder="例如：sakura_affection"
          @input="onIdInput"
        >
      </label>

      <label class="field">
        <span>类型</span>
        <select :value="variableEntry.type" @change="onTypeChange">
          <option value="bool">布尔</option>
          <option value="number">数值</option>
        </select>
      </label>

      <label class="field" v-if="variableEntry.type === 'number'">
        <span>默认值</span>
        <input
          data-test="variable-default-number"
          :value="variableEntry.initial ?? 0"
          type="number"
          step="1"
          @input="onNumberInput"
        >
      </label>

      <template v-if="variableEntry.type === 'number'">
        <label class="field">
          <span>最小值</span>
          <input
            data-test="variable-min-input"
            :value="variableEntry.min ?? ''"
            type="number"
            placeholder="可选"
            @input="onOptionalNumberInput('min', $event.target.value)"
          >
        </label>

        <label class="field">
          <span>最大值</span>
          <input
            data-test="variable-max-input"
            :value="variableEntry.max ?? ''"
            type="number"
            placeholder="可选"
            @input="onOptionalNumberInput('max', $event.target.value)"
          >
        </label>

        <label class="field">
          <span>步进</span>
          <input
            data-test="variable-step-input"
            :value="variableEntry.step ?? ''"
            type="number"
            min="0"
            step="0.1"
            placeholder="可选"
            @input="onOptionalNumberInput('step', $event.target.value)"
          >
        </label>
      </template>

      <div class="field" v-else>
        <span>默认值</span>
        <div class="bool-toggle">
          <button
            data-test="variable-bool-true"
            type="button"
            :class="{ active: variableEntry.initial === true }"
            @click="setBoolValue(true)"
          >是</button>
          <button
            data-test="variable-bool-false"
            type="button"
            :class="{ active: variableEntry.initial === false }"
            @click="setBoolValue(false)"
          >否</button>
        </div>
      </div>

      <label class="field">
        <span>分组</span>
        <input
          data-test="variable-group-input"
          :value="variableEntry.group || ''"
          type="text"
          placeholder="例如：路线"
          @input="script.updateVariableFields(variableId, { group: $event.target.value })"
        >
      </label>
    </div>

    <label class="field notes-field">
      <span>备注</span>
      <textarea
        data-test="variable-notes-input"
        :value="variableEntry.notes || ''"
        rows="4"
        placeholder="记录变量用途与注意事项"
        @input="script.updateVariableFields(variableId, { notes: $event.target.value })"
      ></textarea>
    </label>

    <p v-if="variableEntry.kind === 'affection'" class="affection-meta">
      好感度变量关联角色：{{ variableEntry.characterId || '未指定' }}
    </p>

    <p v-if="validationMessage" class="validation-error">{{ validationMessage }}</p>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import { useScriptStore } from '../../stores/script.js';

const DRAFT_PREFIX = '__draft_variable__';

const props = defineProps({
  variableId: { type: String, default: null },
  variableEntry: { type: Object, default: null },
  usageCount: { type: Number, default: 0 },
  focusToken: { type: Number, default: 0 },
});
const emit = defineEmits(['requestDelete', 'requestRename']);

const script = useScriptStore();
const nameInputRef = ref(null);
const validationMessage = ref('');
const draftIdValue = ref(props.variableId || '');
const hasCustomIdValue = ref(false);

watch(() => [props.variableId, props.variableEntry], () => {
  draftIdValue.value = props.variableId || '';
  validationMessage.value = '';
  hasCustomIdValue.value = !String(props.variableId || '').startsWith(DRAFT_PREFIX);
}, {
  immediate: true,
});

watch(() => props.focusToken, async () => {
  await nextTick();
  nameInputRef.value?.focus();
});

function slugifyVariableId(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

function onNameInput(event) {
  const value = event.target.value;
  script.updateVariableFields(props.variableId, { label: value });

  const currentId = props.variableId || '';
  if (!hasCustomIdValue.value || currentId.startsWith(DRAFT_PREFIX)) {
    const suggestedId = slugifyVariableId(value);
    if (!suggestedId) {
      return;
    }

    if (suggestedId !== currentId && script.data?.systems?.variables?.[suggestedId]) {
      validationMessage.value = '变量 ID 已存在，请改用未占用的 ID。';
      draftIdValue.value = suggestedId;
      return;
    }

    const result = script.renameVariable(currentId, suggestedId, {
      rewriteReferences: false,
    });
    if (!result.success && result.error === 'duplicate-id') {
      validationMessage.value = '变量 ID 已存在，请改用未占用的 ID。';
      draftIdValue.value = suggestedId;
      return;
    }

    if (result.success) {
      validationMessage.value = '';
      draftIdValue.value = result.variableId;
    }
  }
}

function onIdInput(event) {
  const value = event.target.value;
  hasCustomIdValue.value = true;
  draftIdValue.value = value;
  const normalizedId = slugifyVariableId(value);

  if (normalizedId !== props.variableId && script.data?.systems?.variables?.[normalizedId]) {
    validationMessage.value = '变量 ID 已存在，请改用未占用的 ID。';
    return;
  }

  if (normalizedId !== props.variableId && props.usageCount > 0) {
    validationMessage.value = '';
    emit('requestRename', {
      variableId: props.variableId,
      nextVariableId: normalizedId,
    });
    return;
  }

  const result = script.renameVariable(props.variableId, value, {
    rewriteReferences: false,
  });
  if (!result.success && result.error === 'duplicate-id') {
    validationMessage.value = '变量 ID 已存在，请改用未占用的 ID。';
    return;
  }

  if (result.success) {
    validationMessage.value = '';
    draftIdValue.value = result.variableId;
  }
}

function onTypeChange(event) {
  const nextType = event.target.value;
  script.updateVariableFields(props.variableId, {
    type: nextType,
    initial: nextType === 'bool'
      ? Boolean(props.variableEntry?.initial)
      : Number(props.variableEntry?.initial ?? 0),
  });
}

function onNumberInput(event) {
  script.updateVariableFields(props.variableId, {
    initial: Number(event.target.value || 0),
  });
}

function onOptionalNumberInput(field, value) {
  script.updateVariableFields(props.variableId, {
    [field]: value === '' ? undefined : Number(value),
  });
}

function setBoolValue(value) {
  script.updateVariableFields(props.variableId, { initial: value });
}
</script>

<style scoped>
.inspector-card {
  background: #252526;
  border: 1px solid #2f2f2f;
  border-radius: 8px;
  padding: 24px;
}

.inspector-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #007acc;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.inspector-header h2 {
  margin: 0 0 6px;
  color: #fff;
  font-size: 20px;
}

.helper {
  margin: 0;
  color: #9b9b9b;
}

.id-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(0, 122, 204, 0.12);
  color: #9fd9ff;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  padding: 6px 10px;
}

.delete-btn {
  background: transparent;
  border: 1px solid #6a2c2c;
  border-radius: 6px;
  color: #ffb3b3;
  cursor: pointer;
  font-size: 12px;
  padding: 8px 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #d0d0d0;
  font-size: 12px;
}

.field input,
.field select,
.field textarea {
  background: #1e1e1e;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  color: #e4e4e4;
  font-size: 13px;
  outline: none;
  padding: 10px 12px;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: #007acc;
}

.notes-field {
  margin-top: 16px;
}

.bool-toggle {
  display: inline-flex;
  gap: 8px;
}

.bool-toggle button {
  min-width: 64px;
  background: #1e1e1e;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  color: #d7d7d7;
  cursor: pointer;
  padding: 10px 14px;
}

.bool-toggle button.active {
  background: #094771;
  border-color: #007acc;
  color: #fff;
}

.validation-error {
  margin: 16px 0 0;
  color: #ff9d9d;
}

.affection-meta {
  margin: 16px 0 0;
  color: #9fd9ff;
  font-size: 12px;
}
</style>
