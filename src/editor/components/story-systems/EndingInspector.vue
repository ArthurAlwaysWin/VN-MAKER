<template>
  <div class="inspector-card" v-if="endingId && endingEntry">
    <div class="inspector-header">
      <div>
        <p class="eyebrow">结局详情</p>
        <h2>{{ endingEntry.title || endingId }}</h2>
        <p class="helper">{{ unlockCount }} 个解锁点</p>
      </div>
      <div class="header-actions">
        <span class="id-chip">{{ endingId }}</span>
        <button class="delete-btn" type="button" @click="emit('requestDelete', { endingId })">删除结局</button>
      </div>
    </div>

    <div class="field-grid">
      <label class="field">
        <span>标题</span>
        <input
          ref="titleInputRef"
          data-test="ending-title-input"
          :value="endingEntry.title || ''"
          type="text"
          placeholder="例如：Good End"
          @input="onTitleInput"
        >
      </label>

      <label class="field">
        <span>内部 ID</span>
        <input
          data-test="ending-id-input"
          :value="draftIdValue"
          type="text"
          placeholder="例如：good_end"
          @input="onIdInput"
        >
      </label>

      <label class="field">
        <span>分类</span>
        <input
          :value="endingEntry.category || ''"
          type="text"
          placeholder="main"
          @input="script.updateEndingFields(endingId, { category: $event.target.value })"
        >
      </label>

      <label class="field">
        <span>排序</span>
        <input
          :value="endingEntry.order ?? 0"
          type="number"
          step="1"
          @input="script.updateEndingFields(endingId, { order: Number($event.target.value || 0) })"
        >
      </label>

      <label class="field">
        <span>缩略图</span>
        <input
          :value="endingEntry.thumbnail || ''"
          type="text"
          placeholder="ui/endings/good.png"
          @input="script.updateEndingFields(endingId, { thumbnail: $event.target.value || undefined })"
        >
      </label>

      <label class="field checkbox-field">
        <input
          type="checkbox"
          :checked="endingEntry.hiddenUntilUnlocked === true"
          @change="script.updateEndingFields(endingId, { hiddenUntilUnlocked: $event.target.checked })"
        >
        <span>解锁前隐藏</span>
      </label>
    </div>

    <label class="field notes-field">
      <span>描述</span>
      <textarea
        :value="endingEntry.description || ''"
        rows="4"
        placeholder="写给结局列表和交接审查的简短说明"
        @input="script.updateEndingFields(endingId, { description: $event.target.value })"
      ></textarea>
    </label>

    <p v-if="validationMessage" class="validation-error">{{ validationMessage }}</p>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import { useScriptStore } from '../../stores/script.js';

const DRAFT_PREFIX = '__draft_ending__';

const props = defineProps({
  endingId: { type: String, default: null },
  endingEntry: { type: Object, default: null },
  unlockCount: { type: Number, default: 0 },
  focusToken: { type: Number, default: 0 },
});
const emit = defineEmits(['requestDelete', 'requestRename']);

const script = useScriptStore();
const titleInputRef = ref(null);
const validationMessage = ref('');
const draftIdValue = ref(props.endingId || '');
const hasCustomIdValue = ref(false);

watch(() => [props.endingId, props.endingEntry], () => {
  draftIdValue.value = props.endingId || '';
  validationMessage.value = '';
  hasCustomIdValue.value = !String(props.endingId || '').startsWith(DRAFT_PREFIX);
}, {
  immediate: true,
});

watch(() => props.focusToken, async () => {
  await nextTick();
  titleInputRef.value?.focus();
});

function slugifyEndingId(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

function onTitleInput(event) {
  const value = event.target.value;
  script.updateEndingFields(props.endingId, { title: value });

  const currentId = props.endingId || '';
  if (!hasCustomIdValue.value || currentId.startsWith(DRAFT_PREFIX)) {
    const suggestedId = slugifyEndingId(value);
    if (!suggestedId) return;
    const result = script.renameEnding(currentId, suggestedId);
    if (!result.success && result.error === 'duplicate-id') {
      validationMessage.value = '结局 ID 已存在，请改用未占用的 ID。';
      draftIdValue.value = suggestedId;
      return;
    }
    if (result.success) {
      validationMessage.value = '';
      draftIdValue.value = result.endingId;
    }
  }
}

function onIdInput(event) {
  const value = event.target.value;
  hasCustomIdValue.value = true;
  draftIdValue.value = value;
  const normalizedId = slugifyEndingId(value);

  if (normalizedId !== props.endingId && script.data?.systems?.endings?.[normalizedId]) {
    validationMessage.value = '结局 ID 已存在，请改用未占用的 ID。';
    return;
  }

  if (normalizedId !== props.endingId && props.unlockCount > 0) {
    validationMessage.value = '';
    emit('requestRename', {
      endingId: props.endingId,
      nextEndingId: normalizedId,
    });
    return;
  }

  const result = script.renameEnding(props.endingId, value);
  if (!result.success && result.error === 'duplicate-id') {
    validationMessage.value = '结局 ID 已存在，请改用未占用的 ID。';
    return;
  }
  if (result.success) {
    validationMessage.value = '';
    draftIdValue.value = result.endingId;
  }
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

.checkbox-field {
  flex-direction: row;
  align-items: center;
}

.field input,
.field textarea {
  background: #1e1e1e;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  color: #e4e4e4;
  font-size: 13px;
  outline: none;
  padding: 10px 12px;
}

.checkbox-field input {
  width: auto;
}

.field input:focus,
.field textarea:focus {
  border-color: #007acc;
}

.notes-field {
  margin-top: 16px;
}

.validation-error {
  margin: 16px 0 0;
  color: #ff9d9d;
}
</style>
