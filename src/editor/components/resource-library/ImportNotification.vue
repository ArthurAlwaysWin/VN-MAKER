<script setup>
/**
 * ImportNotification — Import result notification bar.
 * Displays success/partial-failure messages and auto-dismisses after 5 seconds.
 * @module components/resource-library/ImportNotification
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
  result: { type: Object, default: null },
  // Expected shape: { imported: Array, errors: Array }
});

const emit = defineEmits(['dismiss']);

// ─── State ──────────────────────────────────────────────────────────
const visible = ref(false);
let dismissTimer = null;

// ─── Computed ───────────────────────────────────────────────────────
const isSuccess = computed(() =>
  props.result && props.result.errors && props.result.errors.length === 0
);
const successCount = computed(() =>
  props.result && props.result.imported ? props.result.imported.length : 0
);
const failCount = computed(() =>
  props.result && props.result.errors ? props.result.errors.length : 0
);

// ─── Watch ──────────────────────────────────────────────────────────
watch(() => props.result, (val) => {
  if (val) {
    visible.value = true;
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
      dismiss();
    }, 5000);
  }
}, { deep: true });

/**
 * Dismiss the notification.
 */
function dismiss() {
  visible.value = false;
  clearTimeout(dismissTimer);
  emit('dismiss');
}

onBeforeUnmount(() => {
  clearTimeout(dismissTimer);
});
</script>

<template>
  <div
    v-if="visible && result"
    class="notification"
    :class="{ success: isSuccess, error: !isSuccess }"
  >
    <div class="notification-body">
      <template v-if="isSuccess">
        成功导入 {{ successCount }} 个文件
      </template>
      <template v-else>
        <div>已导入 {{ successCount }} 个文件，{{ failCount }} 个文件导入失败：</div>
        <div v-for="(err, i) in result.errors" :key="i" class="error-detail">
          — {{ err.original }}：不支持的格式
        </div>
      </template>
    </div>
    <button @click="dismiss" aria-label="关闭通知">×</button>
  </div>
</template>

<style scoped>
.notification {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.notification.success {
  background: rgba(14, 99, 60, 0.15);
  border: 1px solid rgba(14, 99, 60, 0.4);
  border-radius: 4px;
  padding: 12px 16px;
  color: #8fdf8f;
  font-size: 12px;
}
.notification.error {
  background: rgba(170, 34, 34, 0.15);
  border: 1px solid rgba(170, 34, 34, 0.4);
  border-radius: 4px;
  padding: 12px 16px;
  color: #e88;
  font-size: 12px;
}
.notification-body {
  flex: 1;
}
.notification button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  padding: 0 0 0 12px;
}
.error-detail {
  margin-left: 16px;
  margin-top: 4px;
}
</style>
