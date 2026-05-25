<template>
  <div v-if="visible" class="impact-backdrop">
    <div class="impact-modal" data-test="variable-impact-modal">
      <p class="eyebrow">{{ isRename ? '重命名影响' : '删除影响' }}</p>
      <h2>{{ title }}</h2>
      <p class="copy">{{ message }}</p>

      <div class="reference-list" v-if="references.length > 0">
        <strong>反向引用</strong>
        <ul>
          <li v-for="reference in references" :key="reference.locationText">{{ reference.locationText }}</li>
        </ul>
      </div>

      <div class="actions">
        <button type="button" class="secondary-btn" @click="$emit('cancel')">取消</button>
        <button
          data-test="impact-confirm"
          type="button"
          :class="['confirm-btn', { danger: mode.startsWith('delete') }]"
          @click="$emit('confirm')"
        >{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: 'rename' },
  variableName: { type: String, default: '' },
  nextVariableId: { type: String, default: '' },
  references: { type: Array, default: () => [] },
  actionCount: { type: Number, default: 0 },
});

defineEmits(['cancel', 'confirm']);

const isEnding = computed(() => props.mode === 'rename-ending' || props.mode === 'delete-ending');
const isCg = computed(() => props.mode === 'rename-cg' || props.mode === 'delete-cg');
const isRename = computed(() => props.mode.startsWith('rename'));
const entityLabel = computed(() => (isEnding.value ? '结局' : isCg.value ? 'CG' : '变量'));

const title = computed(() => isRename.value
  ? `重命名${entityLabel.value}“${props.variableName}”`
  : `删除${entityLabel.value}“${props.variableName}”`);

const message = computed(() => {
  if (isRename.value) {
    return `将同步更新 ${props.actionCount} 处引用，确认改为“${props.nextVariableId}”吗？`;
  }

  if (props.actionCount > 0) {
    return `${entityLabel.value}“${props.variableName}”仍被 ${props.actionCount} 处逻辑引用。删除后将同时清除这些引用，确定继续吗？`;
  }

  return `确定删除${entityLabel.value}“${props.variableName}”吗？此操作不可撤销。`;
});

const confirmLabel = computed(() => isRename.value
  ? '应用重命名并更新引用'
  : `删除${entityLabel.value}并清除引用`);
</script>

<style scoped>
.impact-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  z-index: 20;
}

.impact-modal {
  width: min(560px, calc(100vw - 32px));
  background: #252526;
  border: 1px solid #3a3a3a;
  border-radius: 10px;
  padding: 24px;
  color: #e8e8e8;
}

.eyebrow {
  margin: 0 0 8px;
  color: #007acc;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.impact-modal h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.copy {
  margin: 0 0 16px;
  color: #c7c7c7;
  line-height: 1.6;
}

.reference-list {
  margin-bottom: 20px;
  background: #1f1f1f;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 16px;
}

.reference-list strong {
  display: block;
  margin-bottom: 10px;
}

.reference-list ul {
  margin: 0;
  padding-left: 18px;
  color: #a9d5ff;
}

.reference-list li + li {
  margin-top: 6px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.secondary-btn,
.confirm-btn {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  padding: 10px 14px;
}

.secondary-btn {
  background: #3a3a3a;
  color: #ddd;
}

.confirm-btn {
  background: #007acc;
  color: #fff;
}

.confirm-btn.danger {
  background: #a22;
}
</style>
