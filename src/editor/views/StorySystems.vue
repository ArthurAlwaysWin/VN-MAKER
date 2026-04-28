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

      <VariableInspector
        v-if="selectedVariable && selectedEntry"
        :variable-id="selectedVariable.id"
        :variable-entry="selectedEntry"
        :usage-count="selectedVariable.usageCount"
        :focus-token="inspectorFocusToken"
        @request-delete="openDeleteImpact"
        @request-rename="openRenameImpact"
      />

      <div v-else class="detail-card detail-placeholder">
        <p class="eyebrow">剧情系统</p>
        <h1>选择一个变量</h1>
        <p>左侧列表会显示变量名称、内部 ID、默认值和引用次数。</p>
      </div>
    </section>

    <VariableImpactModal
      :visible="impactState.visible"
      :mode="impactState.mode"
      :variable-name="impactState.variableName"
      :next-variable-id="impactState.nextVariableId"
      :references="impactState.references"
      :action-count="impactState.actionCount"
      @cancel="closeImpactModal"
      @confirm="confirmImpact"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import VariableImpactModal from '../components/story-systems/VariableImpactModal.vue';
import VariableInspector from '../components/story-systems/VariableInspector.vue';
import VariableRegistryList from '../components/story-systems/VariableRegistryList.vue';
import { useScriptStore } from '../stores/script.js';
import { collectVariableReferences } from '../../shared/variableRegistry.js';

const script = useScriptStore();
const inspectorFocusToken = ref(0);
const search = ref('');
const typeFilter = ref('all');
const groupFilter = ref('all');
const impactState = reactive({
  actionCount: 0,
  mode: 'rename',
  nextVariableId: '',
  references: [],
  variableId: null,
  variableName: '',
  visible: false,
});

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

const selectedEntry = computed(() => {
  if (!script.selectedVariableId) {
    return null;
  }

  return script.data?.systems?.variables?.[script.selectedVariableId] ?? null;
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
  const variableId = script.createVariableDraft();
  if (variableId) {
    inspectorFocusToken.value++;
  }
}

function openRenameImpact(payload) {
  const preview = script.renameVariable(payload.variableId, payload.nextVariableId, {
    previewOnly: true,
  });
  impactState.visible = true;
  impactState.mode = 'rename';
  impactState.variableId = payload.variableId;
  impactState.variableName = selectedVariable.value?.name || payload.variableId;
  impactState.nextVariableId = payload.nextVariableId;
  impactState.references = preview.references || [];
  impactState.actionCount = preview.rewriteCount || 0;
}

function openDeleteImpact(payload) {
  const preview = script.deleteVariable(payload.variableId, { previewOnly: true });
  const currentVariable = allVariables.value.find((item) => item.id === payload.variableId);
  impactState.visible = true;
  impactState.mode = 'delete';
  impactState.variableId = payload.variableId;
  impactState.variableName = currentVariable?.name || payload.variableId;
  impactState.nextVariableId = '';
  impactState.references = preview.references || [];
  impactState.actionCount = preview.cleanupCount || 0;
}

function closeImpactModal() {
  impactState.visible = false;
}

function confirmImpact() {
  if (impactState.mode === 'rename') {
    script.renameVariable(impactState.variableId, impactState.nextVariableId);
  } else {
    script.deleteVariable(impactState.variableId);
  }

  impactState.visible = false;
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
.detail-placeholder p {
  margin: 0;
  color: #9b9b9b;
  line-height: 1.6;
}

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

.detail-placeholder {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
