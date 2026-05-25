<template>
  <div class="story-systems" v-if="script.data">
    <aside class="sidebar">
      <div class="system-tabs">
        <button
          type="button"
          :class="{ active: script.storySystemsPanel === 'variables' }"
          @click="script.selectStorySystemsPanel('variables')"
        >变量</button>
        <button
          type="button"
          :class="{ active: script.storySystemsPanel === 'endings' }"
          @click="script.selectStorySystemsPanel('endings')"
        >结局</button>
        <button
          type="button"
          :class="{ active: script.storySystemsPanel === 'cgs' }"
          @click="script.selectStorySystemsPanel('cgs')"
        >CG</button>
      </div>
      <VariableRegistryList
        v-if="script.storySystemsPanel === 'variables'"
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
      <EndingRegistryList
        v-else-if="script.storySystemsPanel === 'endings'"
        :items="allEndings"
        :selected-id="script.selectedEndingId"
        :is-empty="allEndings.length === 0"
        @create="onCreateEnding"
        @select="script.selectEnding"
      />
      <CgRegistryList
        v-else
        :items="allCgs"
        :selected-id="script.selectedCgId"
        :is-empty="allCgs.length === 0"
        @create="onCreateCg"
        @select="script.selectCg"
      />
    </aside>

    <section class="detail-pane">
      <div v-if="repairBanner" class="repair-banner">
        <strong>修复入口</strong>
        <p>{{ repairBanner }}</p>
      </div>

      <VariableInspector
        v-if="script.storySystemsPanel === 'variables' && selectedVariable && selectedEntry"
        :variable-id="selectedVariable.id"
        :variable-entry="selectedEntry"
        :usage-count="selectedVariable.usageCount"
        :focus-token="inspectorFocusToken"
        @request-delete="openDeleteImpact"
        @request-rename="openRenameImpact"
      />

      <EndingInspector
        v-else-if="script.storySystemsPanel === 'endings' && selectedEnding && selectedEndingEntry"
        :ending-id="selectedEnding.id"
        :ending-entry="selectedEndingEntry"
        :unlock-count="selectedEnding.unlockCount"
        :focus-token="endingInspectorFocusToken"
        @request-delete="openEndingDeleteImpact"
        @request-rename="openEndingRenameImpact"
      />

      <CgInspector
        v-else-if="script.storySystemsPanel === 'cgs' && selectedCg && selectedCgEntry"
        :cg-id="selectedCg.id"
        :cg-entry="selectedCgEntry"
        :unlock-count="selectedCg.unlockCount"
        :focus-token="cgInspectorFocusToken"
        @request-delete="openCgDeleteImpact"
        @request-rename="openCgRenameImpact"
      />

      <div v-else class="detail-card detail-placeholder">
        <p class="eyebrow">剧情系统</p>
        <h1>{{ placeholderTitle }}</h1>
        <p>{{ placeholderCopy }}</p>
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
import CgInspector from '../components/story-systems/CgInspector.vue';
import CgRegistryList from '../components/story-systems/CgRegistryList.vue';
import EndingInspector from '../components/story-systems/EndingInspector.vue';
import EndingRegistryList from '../components/story-systems/EndingRegistryList.vue';
import VariableImpactModal from '../components/story-systems/VariableImpactModal.vue';
import VariableInspector from '../components/story-systems/VariableInspector.vue';
import VariableRegistryList from '../components/story-systems/VariableRegistryList.vue';
import { useProjectStore } from '../stores/project.js';
import { useScriptStore } from '../stores/script.js';
import { collectEndingUnlockReferences } from '../../shared/endingRegistry.js';
import { collectCgUnlockReferences } from '../../shared/cgRegistry.js';
import { collectVariableReferences } from '../../shared/variableRegistry.js';

const script = useScriptStore();
const project = useProjectStore();
const inspectorFocusToken = ref(0);
const endingInspectorFocusToken = ref(0);
const cgInspectorFocusToken = ref(0);
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
const endingReferences = computed(() => collectEndingUnlockReferences(script.data ?? {}));
const cgReferences = computed(() => collectCgUnlockReferences(script.data ?? {}));

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
    name: entry.label || entry.name || id,
    group: entry.group || '',
    notes: entry.notes || '',
    type: entry.type || 'number',
    typeLabel: formatType(entry.type),
    defaultLabel: formatDefaultValue(entry),
    usageCount: usageCounts.value.get(id) ?? 0,
  }));
});

const endingUsageCounts = computed(() => {
  const counts = new Map();
  for (const reference of endingReferences.value) {
    counts.set(reference.endingId, (counts.get(reference.endingId) ?? 0) + 1);
  }
  return counts;
});

const allEndings = computed(() => {
  const endings = script.data?.systems?.endings ?? {};
  return Object.entries(endings).map(([id, entry]) => ({
    id,
    title: entry.title || entry.name || id,
    category: entry.category || '',
    order: Number(entry.order ?? 0),
    unlockCount: endingUsageCounts.value.get(id) ?? 0,
  })).sort((left, right) => {
    const orderDelta = left.order - right.order;
    if (orderDelta !== 0) return orderDelta;
    return left.title.localeCompare(right.title);
  });
});

const cgUsageCounts = computed(() => {
  const counts = new Map();
  for (const reference of cgReferences.value) {
    counts.set(reference.cgId, (counts.get(reference.cgId) ?? 0) + 1);
  }
  return counts;
});

const allCgs = computed(() => {
  const cgs = script.data?.systems?.gallery?.cg ?? {};
  return Object.entries(cgs).map(([id, entry]) => ({
    id,
    title: entry.title || entry.name || id,
    order: Number(entry.order ?? 0),
    imageCount: (entry.images || []).length,
    unlockCount: cgUsageCounts.value.get(id) ?? 0,
  })).sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
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

const selectedEnding = computed(() => {
  return allEndings.value.find((item) => item.id === script.selectedEndingId)
    || null;
});

const selectedEndingEntry = computed(() => {
  if (!script.selectedEndingId) {
    return null;
  }

  return script.data?.systems?.endings?.[script.selectedEndingId] ?? null;
});

const selectedCg = computed(() => allCgs.value.find((item) => item.id === script.selectedCgId) || null);
const selectedCgEntry = computed(() => script.selectedCgId
  ? script.data?.systems?.gallery?.cg?.[script.selectedCgId] ?? null
  : null);
const placeholderTitle = computed(() => {
  if (script.storySystemsPanel === 'endings') return '选择一个结局';
  if (script.storySystemsPanel === 'cgs') return '选择一张 CG';
  return '选择一个变量';
});
const placeholderCopy = computed(() => {
  if (script.storySystemsPanel === 'endings') return '左侧列表会显示结局标题、内部 ID 和解锁点数量。';
  if (script.storySystemsPanel === 'cgs') return '左侧列表会显示 CG 标题、图片数量和解锁点数量。';
  return '左侧列表会显示变量名称、内部 ID、默认值和引用次数。';
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

function onCreateEnding() {
  const endingId = script.createEndingDraft();
  if (endingId) {
    endingInspectorFocusToken.value++;
  }
}

function onCreateCg() {
  const cgId = script.createCgDraft();
  if (cgId) {
    cgInspectorFocusToken.value++;
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

function openEndingRenameImpact(payload) {
  const preview = script.renameEnding(payload.endingId, payload.nextEndingId, {
    previewOnly: true,
  });
  impactState.visible = true;
  impactState.mode = 'rename-ending';
  impactState.variableId = payload.endingId;
  impactState.variableName = selectedEnding.value?.title || payload.endingId;
  impactState.nextVariableId = payload.nextEndingId;
  impactState.references = preview.references || [];
  impactState.actionCount = preview.rewriteCount || 0;
}

function openEndingDeleteImpact(payload) {
  const preview = script.deleteEnding(payload.endingId, { previewOnly: true });
  const currentEnding = allEndings.value.find((item) => item.id === payload.endingId);
  impactState.visible = true;
  impactState.mode = 'delete-ending';
  impactState.variableId = payload.endingId;
  impactState.variableName = currentEnding?.title || payload.endingId;
  impactState.nextVariableId = '';
  impactState.references = preview.references || [];
  impactState.actionCount = preview.cleanupCount || 0;
}

function openCgRenameImpact(payload) {
  const preview = script.renameCg(payload.cgId, payload.nextCgId, { previewOnly: true });
  impactState.visible = true;
  impactState.mode = 'rename-cg';
  impactState.variableId = payload.cgId;
  impactState.variableName = selectedCg.value?.title || payload.cgId;
  impactState.nextVariableId = payload.nextCgId;
  impactState.references = preview.references || [];
  impactState.actionCount = preview.rewriteCount || 0;
}

function openCgDeleteImpact(payload) {
  const preview = script.deleteCg(payload.cgId, { previewOnly: true });
  impactState.visible = true;
  impactState.mode = 'delete-cg';
  impactState.variableId = payload.cgId;
  impactState.variableName = selectedCg.value?.title || payload.cgId;
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
  } else if (impactState.mode === 'rename-ending') {
    script.renameEnding(impactState.variableId, impactState.nextVariableId);
  } else if (impactState.mode === 'delete-ending') {
    script.deleteEnding(impactState.variableId);
  } else if (impactState.mode === 'rename-cg') {
    script.renameCg(impactState.variableId, impactState.nextVariableId);
  } else if (impactState.mode === 'delete-cg') {
    script.deleteCg(impactState.variableId);
  } else {
    script.deleteVariable(impactState.variableId);
  }

  impactState.visible = false;
}

watch(allVariables, (items) => {
  if (script.storySystemsPanel !== 'variables') {
    return;
  }

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

watch(allEndings, (items) => {
  if (script.storySystemsPanel !== 'endings') {
    return;
  }

  if (!items.length) {
    script.selectEnding(null);
    return;
  }

  if (!script.selectedEndingId || !items.some((item) => item.id === script.selectedEndingId)) {
    script.selectEnding(items[0].id);
  }
}, {
  immediate: true,
});

watch(allCgs, (items) => {
  if (script.storySystemsPanel !== 'cgs') return;
  if (!items.length) {
    script.selectCg(null);
    return;
  }
  if (!script.selectedCgId || !items.some((item) => item.id === script.selectedCgId)) {
    script.selectCg(items[0].id);
  }
}, { immediate: true });

watch(() => project.agentPathNavigationRequest?.nonce, () => {
  const request = project.agentPathNavigationRequest;
  if (request?.kind === 'variable' && request.id) {
    script.selectVariable(request.id);
    inspectorFocusToken.value++;
  }
  if (request?.kind === 'ending') {
    script.selectStorySystemsPanel('endings');
    if (request.id) {
      script.selectEnding(request.id);
    }
    endingInspectorFocusToken.value++;
  }
  if (request?.kind === 'cg') {
    script.selectStorySystemsPanel('cgs');
    if (request.id) {
      script.selectCg(request.id);
    }
    cgInspectorFocusToken.value++;
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
  display: flex;
  flex-direction: column;
}

.system-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 10px;
  background: #202020;
  border-bottom: 1px solid #111;
}

.system-tabs button {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  padding: 8px 10px;
}

.system-tabs button.active {
  background: #094771;
  border-color: #007acc;
  color: #fff;
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
