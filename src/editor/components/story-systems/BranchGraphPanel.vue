<template>
  <div class="graph-panel">
    <header class="graph-header">
      <div>
        <p class="eyebrow">Branch Flow</p>
        <h1>剧情流程审查</h1>
        <p class="copy">检查可达性、断裂连接、终点结局解锁、封闭循环、CG 解锁和确定性条件路线。</p>
      </div>
      <div class="stats">
        <span>{{ report.nodeCount }} 场景</span>
        <span>{{ report.edgeCount }} 连接</span>
        <span :class="{ warn: report.deadEndSceneIds.length }">{{ report.deadEndSceneIds.length }} 死路</span>
        <span :class="{ warn: report.cyclesWithoutExit.length }">{{ report.cyclesWithoutExit.length }} 封闭循环</span>
        <span :class="{ warn: report.missingTargetCount }">{{ report.missingTargetCount }} 断链</span>
        <span :class="{ warn: conditionDiagnostics.length }">{{ conditionDiagnostics.length }} 条件问题</span>
      </div>
    </header>

    <section v-if="issues.length" class="issues">
      <h2>需要检查</h2>
      <button
        v-for="issue in issues"
        :key="issue.key"
        type="button"
        class="issue"
        @click="openIssue(issue)"
      >
        <strong>{{ issue.label }}</strong>
        <span>{{ issue.text }}</span>
      </button>
    </section>
    <section v-else class="clean">
      当前流程没有断链、不可达场景、未收束终点、无出口循环、不可达解锁或确定性条件问题。
    </section>

    <section v-if="assetReviewItems.length" class="issues" data-test="graph-asset-review">
      <h2>资产审查</h2>
      <button
        v-for="item in assetReviewItems"
        :key="item.key"
        type="button"
        class="issue"
        :disabled="!item.pathString"
        @click="openReviewItem(item)"
      >
        <strong>{{ item.label }}</strong>
        <span>{{ item.assetPath || item.message }}</span>
      </button>
    </section>

    <section class="nodes">
      <h2>场景节点</h2>
      <button
        v-for="node in report.nodes"
        :key="node.id"
        type="button"
        class="node"
        @click="$emit('navigate-scene', node.id)"
      >
        <span class="node-name">{{ node.name }} <small>{{ node.id }}</small></span>
        <span class="badges">
          <i v-if="reviewCountForScene(node.id)" class="badge review">审查 {{ reviewCountForScene(node.id) }}</i>
          <i v-if="!node.reachable" class="badge muted">不可达</i>
          <i v-if="node.deadEnd" class="badge warn">死路</i>
          <i v-if="node.cycleWithoutExit" class="badge warn">循环</i>
          <i v-if="node.endingResolved" class="badge good">结局</i>
          <i v-if="node.unlocksCg" class="badge good">CG</i>
        </span>
        <span class="edge-count">{{ node.outgoingEdgeCount }} outgoing</span>
      </button>
    </section>

    <section v-if="report.edges.length" class="edges" data-test="graph-edges">
      <h2>页面与场景连接</h2>
      <button
        v-for="edge in report.edges"
        :key="edge.pathString"
        type="button"
        class="edge"
        :class="{ broken: !edge.targetExists }"
        @click="$emit('navigate-path', edge.pathString)"
      >
        <span>{{ edge.fromSceneId }}</span>
        <small>{{ edgeLabel(edge) }}</small>
        <span>{{ edge.toSceneId }}</span>
        <i v-if="!edge.targetExists">缺失</i>
      </button>
    </section>

    <details class="mermaid">
      <summary>Mermaid 流程文本</summary>
      <pre>{{ mermaid }}</pre>
    </details>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { analyzeConditionPage } from '../../../shared/conditionAnalysis.js';
import { createBranchGraphMermaid, createBranchGraphReport } from '../../../shared/sceneGraph.js';

const props = defineProps({
  scriptData: {
    type: Object,
    required: true,
  },
  reviewItems: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['navigate-scene', 'navigate-path']);

const report = computed(() => createBranchGraphReport(props.scriptData));
const mermaid = computed(() => createBranchGraphMermaid(report.value));
const assetReviewItems = computed(() => props.reviewItems
  .filter((item) => [
    'missing-asset-reference',
    'unused-asset',
    'asset-check-not-run',
  ].includes(item.code))
  .map((item, index) => ({
    ...item,
    key: `asset:${item.code}:${item.pathString || item.assetPath || index}`,
    label: {
      'missing-asset-reference': '缺失资产',
      'unused-asset': '未使用资产',
      'asset-check-not-run': '待运行资产检查',
    }[item.code],
  })));
const conditionDiagnostics = computed(() => Object.entries(props.scriptData?.scenes ?? {}).flatMap(([sceneId, scene]) => (
  (scene?.pages ?? []).flatMap((page, pageIndex) => {
    if (page?.type !== 'condition') {
      return [];
    }

    return analyzeConditionPage(page, {
      registry: props.scriptData?.systems?.variables ?? {},
    }).map((finding) => {
      const path = ['scenes', sceneId, 'pages', pageIndex];
      if (finding.conditionIndex !== undefined) {
        path.push('conditions', finding.conditionIndex);
      }
      return {
        ...finding,
        path,
        pathString: path.join('.'),
      };
    });
  })
)));
const issues = computed(() => [
  ...report.value.missingTargetEdges.map((edge) => ({
    key: `missing-target:${edge.pathString}`,
    sceneId: edge.fromSceneId,
    pathString: edge.pathString,
    label: '缺失目标',
    text: `${edge.fromSceneId} -> ${edge.toSceneId}`,
  })),
  ...report.value.unreachableSceneIds.map((sceneId) => ({
    key: `unreachable:${sceneId}`,
    sceneId,
    pathString: `scenes.${sceneId}`,
    label: '不可达场景',
    text: sceneId,
  })),
  ...report.value.deadEndSceneIds.map((sceneId) => ({
    key: `dead-end:${sceneId}`,
    sceneId,
    pathString: `scenes.${sceneId}`,
    label: '没有结局解锁的终点',
    text: sceneId,
  })),
  ...report.value.cyclesWithoutExit.map((cycle) => ({
    key: `cycle:${cycle.sceneIds.join(':')}`,
    sceneId: cycle.sceneIds[0],
    pathString: `scenes.${cycle.sceneIds[0]}`,
    label: '无出口循环',
    text: cycle.sceneIds.join(' -> '),
  })),
  ...report.value.endings.unreachableUnlockIds.map((endingId) => ({
    key: `ending-unlock:${endingId}`,
    pathString: `systems.endings.${endingId}`,
    label: '结局解锁不可达',
    text: endingId,
  })),
  ...report.value.cgs.unreachableUnlockIds.map((cgId) => ({
    key: `cg-unlock:${cgId}`,
    pathString: `systems.gallery.cg.${cgId}`,
    label: 'CG 解锁不可达',
    text: cgId,
  })),
  ...conditionDiagnostics.value.map((diagnostic) => ({
    key: `${diagnostic.code}:${diagnostic.pathString}`,
    sceneId: diagnostic.path[1],
    pathString: diagnostic.pathString,
    label: {
      'condition-always-false': '条件恒为假',
      'condition-always-true': '条件恒为真',
      'duplicate-condition-comparison': '重复条件',
      'condition-identical-targets': '相同分支目标',
    }[diagnostic.code],
    text: `${diagnostic.path[1]} / 第 ${Number(diagnostic.path[3] ?? 0) + 1} 页`,
  })),
]);

function reviewCountForScene(sceneId) {
  const paths = new Set();
  issues.value
    .filter((issue) => issue.sceneId === sceneId)
    .forEach((issue) => paths.add(issue.key));
  props.reviewItems
    .filter((item) => String(item.pathString || '').startsWith(`scenes.${sceneId}`))
    .forEach((item, index) => paths.add(`${item.code || 'review'}:${item.pathString || index}`));
  return paths.size;
}

function edgeLabel(edge) {
  return {
    'scene-next': '下一场景',
    'choice-option': '选项',
    'condition-true-target': '条件成立',
    'condition-false-target': '条件不成立',
  }[edge.kind] || edge.kind;
}

function openReviewItem(item) {
  if (item.pathString) {
    emit('navigate-path', item.pathString);
  }
}

function openIssue(issue) {
  if (issue.pathString) {
    emit('navigate-path', issue.pathString);
    return;
  }

  emit('navigate-scene', issue.sceneId);
}
</script>

<style scoped>
.graph-panel {
  color: #ddd;
  max-width: 980px;
}

.graph-header {
  background: #252526;
  border: 1px solid #333;
  border-radius: 8px;
  display: flex;
  gap: 24px;
  justify-content: space-between;
  padding: 22px;
}

.eyebrow {
  color: #4ba3dc;
  font-size: 11px;
  letter-spacing: 0.12em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

h1 {
  color: #fff;
  font-size: 21px;
  margin: 0 0 8px;
}

h2 {
  color: #efefef;
  font-size: 14px;
  margin: 0 0 12px;
}

.copy {
  color: #a9a9a9;
  font-size: 13px;
  margin: 0;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.stats span {
  align-self: flex-start;
  background: #303030;
  border-radius: 12px;
  color: #bdbdbd;
  font-size: 12px;
  padding: 6px 10px;
}

.stats span.warn {
  background: #4b3322;
  color: #ffca8a;
}

.issues,
.nodes,
.edges,
.mermaid,
.clean {
  background: #252526;
  border: 1px solid #333;
  border-radius: 8px;
  margin-top: 16px;
  padding: 18px;
}

.issue,
.node,
.edge {
  align-items: center;
  background: #2d2d2d;
  border: 1px solid #383838;
  border-radius: 6px;
  color: #ddd;
  cursor: pointer;
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding: 10px 12px;
  text-align: left;
  width: 100%;
}

.issue:hover,
.node:hover,
.edge:hover {
  border-color: #007acc;
}

.issue:disabled {
  cursor: default;
  opacity: 0.8;
}

.issue strong {
  color: #ffca8a;
  font-size: 12px;
  min-width: 120px;
}

.issue span,
.clean {
  color: #bdbdbd;
  font-size: 13px;
}

.node-name {
  flex: 1;
}

.node-name small {
  color: #888;
  margin-left: 8px;
}

.badges {
  display: flex;
  gap: 5px;
}

.badge {
  border-radius: 4px;
  font-size: 11px;
  font-style: normal;
  padding: 3px 6px;
}

.badge.warn {
  background: #4b3322;
  color: #ffca8a;
}

.badge.good {
  background: #193e31;
  color: #84d7ac;
}

.badge.muted {
  background: #393939;
  color: #aaa;
}

.badge.review {
  background: #20394c;
  color: #86c7f2;
}

.edge span:first-child {
  flex: 1;
}

.edge small {
  color: #888;
}

.edge i {
  color: #ffca8a;
  font-size: 12px;
  font-style: normal;
}

.edge.broken {
  border-color: #6a4528;
}

.edge-count {
  color: #888;
  font-size: 11px;
  min-width: 72px;
  text-align: right;
}

.mermaid summary {
  color: #ccc;
  cursor: pointer;
  font-size: 13px;
}

.mermaid pre {
  background: #1c1c1c;
  border-radius: 6px;
  color: #b6cee4;
  font-size: 12px;
  line-height: 1.6;
  margin: 12px 0 0;
  overflow-x: auto;
  padding: 12px;
}
</style>
