<template>
  <section class="ending-list">
    <header class="ending-toolbar">
      <div>
        <h2>结局注册表</h2>
        <p>管理可解锁结局、终点页进入解锁与选项解锁引用。</p>
      </div>
      <button class="create-btn" type="button" @click="$emit('create')">+ 新建结局</button>
    </header>

    <div v-if="isEmpty" class="state-card">
      <h3>还没有结局</h3>
      <p>先注册结局，再在终点普通页或选择页添加解锁效果。</p>
      <button class="empty-btn" type="button" @click="$emit('create')">新建结局</button>
    </div>

    <div v-else class="rows">
      <button
        v-for="item in items"
        :key="item.id"
        data-test="ending-row"
        type="button"
        :class="['ending-row', { selected: item.id === selectedId }]"
        @click="$emit('select', item.id)"
      >
        <div class="row-main">
          <strong>{{ item.title }}</strong>
          <span class="ending-id">{{ item.id }}</span>
        </div>
        <div class="row-side">
          <span v-if="item.category" class="pill">{{ item.category }}</span>
          <span class="pill">{{ item.unlockCount }} 解锁点</span>
          <span :class="['pill', 'progress-pill', { unlocked: Boolean(item.unlockRecord) }]">
            {{ playerProgressLabel(item) }}
          </span>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  isEmpty: { type: Boolean, default: false },
  profileStatus: { type: String, default: 'idle' },
});

defineEmits(['create', 'select']);

function playerProgressLabel(item) {
  if (!['loaded', 'empty'].includes(props.profileStatus)) {
    return '进度未加载';
  }

  return item.unlockRecord
    ? `已解锁 ${Number(item.unlockRecord.count ?? 1)} 次`
    : '未解锁';
}
</script>

<style scoped>
.ending-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #252526;
}

.ending-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #111;
}

.ending-toolbar h2 {
  margin: 0 0 4px;
  color: #f3f3f3;
  font-size: 14px;
}

.ending-toolbar p {
  margin: 0;
  color: #8c8c8c;
  font-size: 12px;
}

.create-btn,
.empty-btn {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  padding: 8px 14px;
  background: #007acc;
  color: #fff;
}

.state-card {
  margin: 24px 16px;
  padding: 32px 24px;
  text-align: center;
  background: #1f1f1f;
  border: 1px solid #2f2f2f;
  border-radius: 8px;
}

.state-card h3 {
  margin: 0 0 8px;
  color: #f3f3f3;
  font-size: 16px;
}

.state-card p {
  margin: 0 0 16px;
  color: #9a9a9a;
  line-height: 1.6;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  overflow-y: auto;
}

.ending-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  background: #2a2a2a;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #ddd;
  cursor: pointer;
}

.ending-row.selected {
  background: #094771;
  border-color: #007acc;
}

.row-main,
.row-side {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.ending-id {
  color: #8d8d8d;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
}

.pill {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #d8d8d8;
  font-size: 12px;
  padding: 2px 8px;
}

.progress-pill.unlocked {
  background: rgba(17, 119, 72, 0.32);
  color: #8de0b5;
}
</style>
