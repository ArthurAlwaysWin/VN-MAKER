<template>
  <section class="registry-list">
    <header class="registry-toolbar">
      <div class="toolbar-title">
        <span class="title-icon">📊</span>
        <div>
          <h2>变量注册表</h2>
          <p>集中查看项目里的全局变量与引用情况。</p>
        </div>
      </div>
      <button class="create-btn" type="button" @click="$emit('create')">+ 新建变量</button>
    </header>

    <div class="filters">
      <input
        data-test="variable-search"
        class="search-input"
        :value="search"
        type="search"
        placeholder="搜索变量名、ID 或分组"
        @input="$emit('update:search', $event.target.value)"
      >
      <select
        class="filter-select"
        :value="typeFilter"
        @change="$emit('update:typeFilter', $event.target.value)"
      >
        <option value="all">全部类型</option>
        <option value="bool">布尔</option>
        <option value="number">数值</option>
      </select>
      <select
        class="filter-select"
        :value="groupFilter"
        @change="$emit('update:groupFilter', $event.target.value)"
      >
        <option value="all">全部分组</option>
        <option v-for="group in groups" :key="group" :value="group">{{ group }}</option>
      </select>
    </div>

    <div v-if="isEmpty" class="state-card empty-state">
      <h3>还没有变量</h3>
      <p>先创建第一个变量，然后在选项或条件页中引用它。</p>
      <button class="empty-btn" type="button" @click="$emit('create')">新建变量</button>
    </div>

    <div v-else-if="items.length === 0" class="state-card no-results">
      <h3>没有匹配的变量</h3>
      <p>试试其他关键字，或清除筛选条件。</p>
      <button class="secondary-btn" type="button" @click="$emit('clearFilters')">清除筛选</button>
    </div>

    <div v-else class="rows">
      <button
        v-for="item in items"
        :key="item.id"
        data-test="variable-row"
        type="button"
        :class="['variable-row', { selected: item.id === selectedId }]"
        @click="$emit('select', item.id)"
      >
        <div class="row-main">
          <div class="name-line">
            <strong>{{ item.name }}</strong>
            <span class="type-badge">{{ item.typeLabel }}</span>
          </div>
          <div class="meta-line">
            <span class="variable-id">{{ item.id }}</span>
            <span class="group" v-if="item.group">{{ item.group }}</span>
          </div>
        </div>
        <div class="row-side">
          <span class="default-value">默认值 {{ item.defaultLabel }}</span>
          <span class="usage-badge">{{ item.usageCount }} 引用</span>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  search: { type: String, default: '' },
  typeFilter: { type: String, default: 'all' },
  groupFilter: { type: String, default: 'all' },
  isEmpty: { type: Boolean, default: false },
});

defineEmits([
  'clearFilters',
  'create',
  'select',
  'update:groupFilter',
  'update:search',
  'update:typeFilter',
]);
</script>

<style scoped>
.registry-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #252526;
}

.registry-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #111;
}

.toolbar-title {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.title-icon {
  font-size: 18px;
  line-height: 1;
  margin-top: 2px;
}

.toolbar-title h2 {
  margin: 0 0 4px;
  font-size: 14px;
  color: #f3f3f3;
}

.toolbar-title p {
  margin: 0;
  color: #8c8c8c;
  font-size: 12px;
}

.create-btn,
.empty-btn,
.secondary-btn {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  padding: 8px 14px;
}

.create-btn,
.empty-btn {
  background: #007acc;
  color: #fff;
}

.secondary-btn {
  background: #333;
  color: #ddd;
  border: 1px solid #444;
}

.filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px 110px;
  gap: 8px;
  padding: 0 16px 16px;
  border-bottom: 1px solid #111;
}

.search-input,
.filter-select {
  background: #1e1e1e;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  color: #ddd;
  font-size: 12px;
  outline: none;
  padding: 8px 10px;
}

.search-input:focus,
.filter-select:focus {
  border-color: #007acc;
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

.variable-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 8px 16px;
  text-align: left;
  background: #2a2a2a;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #ddd;
  cursor: pointer;
}

.variable-row:hover {
  border-color: #3b3b3b;
}

.variable-row.selected {
  background: #094771;
  border-color: #007acc;
}

.row-main {
  min-width: 0;
}

.name-line,
.meta-line,
.row-side {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.name-line strong {
  color: #fff;
}

.meta-line {
  margin-top: 4px;
  color: #8d8d8d;
  font-size: 12px;
}

.variable-id {
  font-family: Consolas, 'Courier New', monospace;
}

.type-badge,
.usage-badge,
.default-value {
  border-radius: 999px;
  font-size: 12px;
  padding: 2px 8px;
}

.type-badge {
  border: 1px solid #4b4b4b;
  color: #cfcfcf;
}

.usage-badge {
  background: rgba(255, 255, 255, 0.08);
  color: #d8d8d8;
}

.default-value {
  color: #b8d8ff;
}

.row-side {
  justify-content: flex-end;
}
</style>
