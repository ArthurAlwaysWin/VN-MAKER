<template>
  <div class="story-systems" v-if="script.data">
    <aside class="sidebar">
      <VariableRegistryList
        :items="filteredVariables"
        :groups="groups"
        :selected-id="script.selectedVariableId"
        :search="search"
        :type-filter="typeFilter"
        :group-filter="groupFilter"
        :is-empty="allVariables.length === 0"
        @create="onCreateVariable"
        @clear-filters="clearFilters"
        @select="script.selectVariable"
        @update:search="search = $event"
        @update:type-filter="typeFilter = $event"
        @update:group-filter="groupFilter = $event"
      />
    </aside>

    <section class="detail-pane">
      <div v-if="repairBanner" class="repair-banner">
        <strong>修复入口</strong>
        <p>{{ repairBanner }}</p>
      </div>

      <div v-if="selectedVariable" class="detail-card">
        <div class="detail-header">
          <p class="eyebrow">剧情系统</p>
          <h1>{{ selectedVariable.name }}</h1>
          <p>{{ selectedVariable.id }}</p>
        </div>
        <dl class="detail-grid">
          <div>
            <dt>类型</dt>
            <dd>{{ selectedVariable.typeLabel }}</dd>
          </div>
          <div>
            <dt>默认值</dt>
            <dd>{{ selectedVariable.defaultLabel }}</dd>
          </div>
          <div>
            <dt>分组</dt>
            <dd>{{ selectedVariable.group || '未分组' }}</dd>
          </div>
          <div>
            <dt>引用</dt>
            <dd>{{ selectedVariable.usageCount }} 处</dd>
          </div>
        </dl>
      </div>

      <div v-else class="detail-card detail-placeholder">
        <p class="eyebrow">剧情系统</p>
        <h1>选择一个变量</h1>
        <p>左侧列表会显示变量名称、内部 ID、默认值和引用次数。</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import VariableRegistryList from '../components/story-systems/VariableRegistryList.vue';
import { useScriptStore } from '../stores/script.js';
import { collectVariableReferences } from '../../shared/variableRegistry.js';

const script = useScriptStore();

const search = ref('');
const typeFilter = ref('all');
const groupFilter = ref('all');

function formatType(type) {
  return type === 'bool' ? '布尔' : '数值';
}

function formatDefaultValue(entry = {}) {
  if (entry.type === 'bool') {
    return entry.initial ? '是' : '否';
  }

  return String(entry.initial ?? 0);
}

const references = computed(() => collectVariableReferences(script.data ?? {}));

const usageCounts = computed(() => {
  const counts = new Map();
  for (const reference of references.value) {
    counts.set(reference.variableId, (counts.get(reference.variableId) ?? 0) + 1);
  }
  return counts;
});

const allVariables = computed(() => {
  const registry = script.data?.systems?.variables ?? {};
  return Object.entries(registry).map(([id, entry]) => ({
    id,
    name: entry.name || entry.label || id,
    group: entry.group || '',
    notes: entry.notes || '',
    type: entry.type || 'number',
    typeLabel: formatType(entry.type),
    defaultLabel: formatDefaultValue(entry),
    usageCount: usageCounts.value.get(id) ?? 0,
  }));
});

const groups = computed(() => {
  const uniqueGroups = new Set(
    allVariables.value
      .map((item) => item.group)
      .filter(Boolean),
  );
  return [...uniqueGroups];
});

const filteredVariables = computed(() => {
  const query = search.value.trim().toLowerCase();
  return allVariables.value.filter((item) => {
    if (typeFilter.value !== 'all' && item.type !== typeFilter.value) {
      return false;
    }

    if (groupFilter.value !== 'all' && item.group !== groupFilter.value) {
      return false;
    }

    if (!query) {
      return true;
    }

    return item.name.toLowerCase().includes(query)
      || item.id.toLowerCase().includes(query)
      || item.group.toLowerCase().includes(query);
  });
});

const selectedVariable = computed(() => {
  return filteredVariables.value.find((item) => item.id === script.selectedVariableId)
    || allVariables.value.find((item) => item.id === script.selectedVariableId)
    || null;
});

const repairBanner = computed(() => {
  if (script.storySystemsRepairRequest?.source === 'missing-variable-reference' && selectedVariable.value) {
    return `已定位到变量“${selectedVariable.value.name}”，请检查它的引用并完成修复。`;
  }

  return script.conditionPageIssues[0]?.message || '';
});

function clearFilters() {
  search.value = '';
  typeFilter.value = 'all';
  groupFilter.value = 'all';
}

function onCreateVariable() {
  if (allVariables.value[0]) {
    script.selectVariable(allVariables.value[0].id);
  }
}

watch(allVariables, (items) => {
  if (!items.length) {
    script.selectVariable(null);
    return;
  }

  if (!script.selectedVariableId || !items.some((item) => item.id === script.selectedVariableId)) {
    script.selectVariable(items[0].id);
  }
}, {
  immediate: true,
});
</script>

<style scoped>
.story-systems {
  display: flex;
  height: 100%;
  min-height: 0;
  background: #1e1e1e;
}

.sidebar {
  width: 320px;
  border-right: 1px solid #111;
  overflow: hidden;
  flex-shrink: 0;
}

.detail-pane {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.repair-banner,
.detail-card {
  background: #252526;
  border: 1px solid #2f2f2f;
  border-radius: 8px;
  padding: 24px;
}

.repair-banner {
  margin-bottom: 16px;
  border-left: 2px solid #007acc;
}

.repair-banner strong {
  display: block;
  margin-bottom: 8px;
  color: #f3f3f3;
}

.repair-banner p,
.detail-header p,
.detail-placeholder p {
  margin: 0;
  color: #9b9b9b;
  line-height: 1.6;
}

.detail-header h1,
.detail-placeholder h1 {
  margin: 8px 0;
  color: #fff;
  font-size: 20px;
}

.eyebrow {
  color: #007acc !important;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 24px 0 0;
}

.detail-grid dt {
  margin-bottom: 6px;
  color: #8e8e8e;
  font-size: 12px;
}

.detail-grid dd {
  margin: 0;
  color: #f0f0f0;
}

.detail-placeholder {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
