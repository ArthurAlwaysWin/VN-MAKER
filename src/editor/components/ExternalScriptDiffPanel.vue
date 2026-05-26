<template>
  <section class="external-change-panel" data-test="external-script-change-panel">
    <div class="external-change-summary">
      <span>检测到 script.json 已被外部工具修改。为避免覆盖外部 Agent 的更改，保存已暂停。</span>
      <button data-test="refresh-external-diff" @click="$emit('refresh')">刷新差异</button>
      <button data-test="reload-external-script" @click="$emit('reload')">重新载入项目</button>
      <button data-test="dismiss-external-change" @click="$emit('dismiss')">稍后处理</button>
    </div>
    <div v-if="diff" class="external-change-diff" data-test="external-script-diff">
      <p>磁盘版本包含 {{ diff.changedPathCount }} 处结构化变更，请在重新载入前核对：</p>
      <ul v-if="diff.entries.length">
        <li v-for="entry in diff.entries" :key="`${entry.type}:${entry.pathString}`">
          <span class="diff-kind">{{ diffLabel(entry.type) }}</span>
          <code>{{ entry.pathString }}</code>
          <span class="diff-values">{{ entry.editorValue }} -> {{ entry.diskValue }}</span>
        </li>
      </ul>
      <p v-else>文件状态已变化，但标准化脚本内容未发现结构差异。</p>
      <p v-if="diff.truncated">仅显示前 {{ diff.entries.length }} 项变更。</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  diff: {
    type: Object,
    default: null,
  },
});

defineEmits(['dismiss', 'refresh', 'reload']);

function diffLabel(type) {
  const labels = {
    'added-on-disk': '新增',
    'removed-on-disk': '移除',
    'changed-on-disk': '修改',
  };
  return labels[type] ?? type;
}
</script>

<style scoped>
.external-change-panel {
  flex-shrink: 0;
  background: #4a2f05;
  border-bottom: 1px solid #8a5a12;
  color: #ffe7b0;
  font-size: 12px;
}
.external-change-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}
.external-change-panel button {
  background: #6f470a;
  border: 1px solid #a66d15;
  color: #fff3cf;
  border-radius: 4px;
  padding: 3px 8px;
  cursor: pointer;
}
.external-change-panel button:hover { background: #83550f; }
.external-change-diff {
  border-top: 1px solid #6f470a;
  padding: 0 12px 10px;
}
.external-change-diff p {
  margin: 8px 0 4px;
}
.external-change-diff ul {
  display: grid;
  gap: 4px;
  list-style: none;
  margin: 6px 0;
  padding: 0;
}
.external-change-diff li {
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) minmax(260px, 2fr);
  gap: 8px;
  align-items: center;
}
.diff-kind {
  border: 1px solid #a66d15;
  border-radius: 3px;
  padding: 1px 4px;
}
.external-change-diff code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.diff-values {
  color: #f3cd83;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
