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

    <section class="flow-map-section">
      <div class="section-title-row">
        <h2>剧情流程图</h2>
      </div>
      <div class="flow-map-layout">
        <div class="flow-map" data-test="graph-map">
          <div
            class="flow-canvas"
            :style="{ width: `${graphLayout.width}px`, height: `${graphLayout.height}px` }"
          >
            <svg
              class="flow-edges"
              :width="graphLayout.width"
              :height="graphLayout.height"
              :viewBox="`0 0 ${graphLayout.width} ${graphLayout.height}`"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="flow-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" />
                </marker>
                <marker
                  id="flow-arrow-broken"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" />
                </marker>
              </defs>
              <g v-for="edge in graphLayout.edges" :key="edge.key">
                <path
                  class="flow-edge-hit"
                  :d="edge.path"
                  @click="openMapEdge(edge)"
                />
                <path
                  class="flow-edge"
                  :class="{ broken: edge.broken, backward: edge.backward }"
                  :d="edge.path"
                  :marker-end="edge.broken ? 'url(#flow-arrow-broken)' : 'url(#flow-arrow)'"
                />
                <g
                  class="flow-edge-label"
                  :class="{ broken: edge.broken }"
                  :transform="`translate(${edge.labelX}, ${edge.labelY})`"
                  @click="openMapEdge(edge)"
                >
                  <rect x="-38" y="-11" width="76" height="22" rx="4" />
                  <text text-anchor="middle" dominant-baseline="middle">{{ edge.label }}</text>
                </g>
              </g>
            </svg>

            <button
              v-for="node in graphLayout.nodes"
              :key="node.key"
              type="button"
              class="flow-node"
              :class="{
                entry: node.entry,
                unreachable: node.unreachable,
                missing: node.missing,
                dead: node.deadEnd,
                cycle: node.cycleWithoutExit,
                ending: node.endingResolved,
                cg: node.unlocksCg,
              }"
              :data-node-id="node.id"
              :style="{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${graphLayout.nodeWidth}px`,
                height: `${graphLayout.nodeHeight}px`,
              }"
              @click="openMapNode(node)"
            >
              <span class="flow-node-kicker">{{ node.kicker }}</span>
              <strong>{{ node.name }}</strong>
              <small>{{ node.id }}</small>
              <span class="flow-node-meta">
                <i v-if="node.pageCount !== null">{{ node.pageCount }} 页</i>
                <i v-if="node.incomingEdgeCount">{{ node.incomingEdgeCount }} 入</i>
                <i v-if="node.outgoingEdgeCount">{{ node.outgoingEdgeCount }} 出</i>
                <i v-if="node.missing">缺失目标</i>
              </span>
            </button>
          </div>
        </div>

        <aside class="flow-status-panel" data-test="graph-status-panel">
          <h2>状态</h2>
          <div
            v-for="item in statusItems"
            :key="item.key"
            class="status-row"
            :class="item.tone"
          >
            <span class="status-dot"></span>
            <span class="status-main">
              <strong>{{ item.label }}</strong>
              <small>{{ item.detail }}</small>
            </span>
            <b>{{ item.count }}</b>
          </div>
        </aside>
      </div>
    </section>

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

const NODE_WIDTH = 210;
const NODE_HEIGHT = 94;
const SIBLING_GAP = 44;
const DEPTH_GAP = 76;
const CANVAS_PADDING = 28;

const report = computed(() => createBranchGraphReport(props.scriptData));
const mermaid = computed(() => createBranchGraphMermaid(report.value));
const graphLayout = computed(() => buildGraphLayout(report.value, props.scriptData));
const statusItems = computed(() => {
  const endingSceneCount = report.value.nodes.filter((node) => node.endingResolved).length;
  const cgSceneCount = report.value.nodes.filter((node) => node.unlocksCg).length;
  return [
    {
      key: 'entry',
      label: '入口',
      count: report.value.entrySceneId ? 1 : 0,
      detail: report.value.entrySceneId || '未设置',
      tone: 'entry',
    },
    {
      key: 'unreachable',
      label: '不可达',
      count: report.value.unreachableSceneIds.length,
      detail: summarizeIds(report.value.unreachableSceneIds),
      tone: 'unreachable',
    },
    {
      key: 'broken',
      label: '断链',
      count: report.value.missingTargetCount,
      detail: summarizeIds(report.value.missingTargetEdges.map((edge) => edge.toSceneId)),
      tone: 'broken',
    },
    {
      key: 'dead',
      label: '死路',
      count: report.value.deadEndSceneIds.length,
      detail: summarizeIds(report.value.deadEndSceneIds),
      tone: 'dead',
    },
    {
      key: 'cycle',
      label: '循环',
      count: report.value.cyclesWithoutExit.length,
      detail: summarizeIds(report.value.cyclesWithoutExit.flatMap((cycle) => cycle.sceneIds)),
      tone: 'cycle',
    },
    {
      key: 'ending',
      label: '结局',
      count: endingSceneCount,
      detail: `${report.value.endings.entries.length} 个注册结局`,
      tone: 'ending',
    },
    {
      key: 'cg',
      label: 'CG',
      count: cgSceneCount,
      detail: `${report.value.cgs.entries.length} 个注册 CG`,
      tone: 'cg',
    },
  ];
});
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

function summarizeIds(ids = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return '无';
  if (uniqueIds.length <= 2) return uniqueIds.join(', ');
  return `${uniqueIds.slice(0, 2).join(', ')} +${uniqueIds.length - 2}`;
}

function edgeLabel(edge) {
  if (edge.kind === 'choice-option') {
    return edge.optionIndex !== null && edge.optionIndex !== undefined
      ? `选项 ${edge.optionIndex + 1}`
      : '选项';
  }

  return {
    'scene-next': '下一场景',
    'condition-true-target': '条件成立',
    'condition-false-target': '条件不成立',
    'input-target': '输入跳转',
  }[edge.kind] || edge.kind;
}

function statusRank(node) {
  if (node.entry) return 0;
  if (node.missing) return 4;
  if (node.unreachable || node.reachable === false) return 3;
  if (node.deadEnd || node.cycleWithoutExit) return 2;
  return 1;
}

function createNodeKicker(node) {
  if (node.missing) return '断链';
  if (node.entry) return '入口';
  if (node.unreachable) return '不可达';
  if (node.cycleWithoutExit) return '循环';
  if (node.deadEnd) return '死路';
  if (node.endingResolved) return '结局';
  if (node.unlocksCg) return 'CG';
  return '场景';
}

function edgePath(from, to) {
  const fromCenterX = from.x + NODE_WIDTH / 2;
  const toCenterX = to.x + NODE_WIDTH / 2;

  if (from.id === to.id) {
    const x = fromCenterX;
    const y = from.y + NODE_HEIGHT;
    return {
      d: `M ${x} ${y} C ${x + 74} ${y + 22}, ${x + 74} ${y + 76}, ${x + 14} ${y + 82}`,
      labelX: x + 76,
      labelY: y + 48,
      backward: true,
    };
  }

  if (to.y <= from.y) {
    const y1 = from.y;
    const y2 = to.y + NODE_HEIGHT;
    const curve = 78;
    return {
      d: `M ${fromCenterX} ${y1} C ${fromCenterX - curve} ${y1}, ${toCenterX - curve} ${y2}, ${toCenterX} ${y2}`,
      labelX: (fromCenterX + toCenterX) / 2 - curve,
      labelY: (y1 + y2) / 2,
      backward: true,
    };
  }

  const y1 = from.y + NODE_HEIGHT;
  const y2 = to.y;
  const curve = Math.max(44, (y2 - y1) / 2);
  return {
    d: `M ${fromCenterX} ${y1} C ${fromCenterX} ${y1 + curve}, ${toCenterX} ${y2 - curve}, ${toCenterX} ${y2}`,
    labelX: (fromCenterX + toCenterX) / 2,
    labelY: (y1 + y2) / 2,
    backward: false,
  };
}

function buildGraphLayout(graphReport = {}, scriptData = {}) {
  const sceneOrder = new Map((graphReport.nodes ?? []).map((node, index) => [node.id, index]));
  const scenes = scriptData?.scenes ?? {};
  const nodeMap = new Map((graphReport.nodes ?? []).map((node) => [node.id, {
    ...node,
    key: `scene:${node.id}`,
    entry: node.id === graphReport.entrySceneId,
    missing: false,
    pageCount: Array.isArray(scenes?.[node.id]?.pages) ? scenes[node.id].pages.length : 0,
    sourcePathString: null,
    sourceOrder: sceneOrder.get(node.id) ?? 0,
  }]));

  for (const edge of graphReport.missingTargetEdges ?? []) {
    if (!nodeMap.has(edge.toSceneId)) {
      nodeMap.set(edge.toSceneId, {
        id: edge.toSceneId,
        name: edge.toSceneId,
        key: `missing:${edge.toSceneId}`,
        entry: false,
        missing: true,
        reachable: false,
        unreachable: false,
        terminal: true,
        deadEnd: false,
        cycleWithoutExit: false,
        unlocksEnding: false,
        endingResolved: false,
        unlocksCg: false,
        incomingEdgeCount: (graphReport.edges ?? []).filter((item) => item.toSceneId === edge.toSceneId).length,
        outgoingEdgeCount: 0,
        pageCount: null,
        sourcePathString: edge.pathString,
        sourceOrder: sceneOrder.size + nodeMap.size,
      });
    }
  }

  const adjacency = new Map();
  for (const edge of (graphReport.edges ?? []).filter((item) => item.targetExists)) {
    if (!adjacency.has(edge.fromSceneId)) {
      adjacency.set(edge.fromSceneId, []);
    }
    adjacency.get(edge.fromSceneId).push(edge.toSceneId);
  }

  const depthById = new Map();
  const entrySceneId = graphReport.entrySceneId;
  if (entrySceneId && nodeMap.has(entrySceneId)) {
    depthById.set(entrySceneId, 0);
    const queue = [entrySceneId];
    while (queue.length) {
      const sceneId = queue.shift();
      const nextDepth = (depthById.get(sceneId) ?? 0) + 1;
      for (const targetId of adjacency.get(sceneId) ?? []) {
        if (!nodeMap.has(targetId) || depthById.has(targetId)) {
          continue;
        }
        depthById.set(targetId, nextDepth);
        queue.push(targetId);
      }
    }
  }

  const reachableMaxDepth = Math.max(0, ...[...depthById.values()]);
  const unreachableDepth = reachableMaxDepth + 1;
  for (const node of nodeMap.values()) {
    if (!node.missing && !depthById.has(node.id)) {
      depthById.set(node.id, unreachableDepth);
    }
  }

  for (const edge of graphReport.missingTargetEdges ?? []) {
    const sourceDepth = depthById.get(edge.fromSceneId) ?? unreachableDepth;
    const targetDepth = sourceDepth + 1;
    if (!depthById.has(edge.toSceneId) || targetDepth < depthById.get(edge.toSceneId)) {
      depthById.set(edge.toSceneId, targetDepth);
    }
  }

  const rows = new Map();
  for (const node of nodeMap.values()) {
    const depth = depthById.get(node.id) ?? 0;
    if (!rows.has(depth)) {
      rows.set(depth, []);
    }
    rows.get(depth).push(node);
  }

  for (const nodes of rows.values()) {
    nodes.sort((a, b) => (
      statusRank(a) - statusRank(b)
      || a.sourceOrder - b.sourceOrder
      || String(a.id).localeCompare(String(b.id))
    ));
  }

  const positionedNodes = [];
  const positionById = new Map();
  const sortedDepths = [...rows.keys()].sort((a, b) => a - b);
  const maxRowCount = Math.max(1, ...[...rows.values()].map((nodes) => nodes.length));
  const maxRowWidth = maxRowCount * NODE_WIDTH + (maxRowCount - 1) * SIBLING_GAP;
  for (const depth of sortedDepths) {
    const nodes = rows.get(depth);
    const rowWidth = nodes.length * NODE_WIDTH + (nodes.length - 1) * SIBLING_GAP;
    const rowOffset = (maxRowWidth - rowWidth) / 2;
    nodes.forEach((node, rowIndex) => {
      const x = CANVAS_PADDING + rowOffset + rowIndex * (NODE_WIDTH + SIBLING_GAP);
      const y = CANVAS_PADDING + depth * (NODE_HEIGHT + DEPTH_GAP);
      const positioned = {
        ...node,
        x,
        y,
        depth,
        rowIndex,
        unreachable: !node.missing && node.reachable === false,
        kicker: createNodeKicker({
          ...node,
          unreachable: !node.missing && node.reachable === false,
        }),
      };
      positionedNodes.push(positioned);
      positionById.set(node.id, positioned);
    });
  }

  const positionedEdges = (graphReport.edges ?? [])
    .map((edge, index) => {
      const from = positionById.get(edge.fromSceneId);
      const to = positionById.get(edge.toSceneId);
      if (!from || !to) return null;
      const path = edgePath(from, to);
      return {
        ...edge,
        key: `${edge.pathString}:${index}`,
        label: edgeLabel(edge),
        broken: !edge.targetExists,
        ...path,
      };
    })
    .filter(Boolean);

  const maxDepth = Math.max(0, ...sortedDepths);

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
    width: CANVAS_PADDING * 2 + maxRowWidth,
    height: CANVAS_PADDING * 2 + (maxDepth + 1) * NODE_HEIGHT + maxDepth * DEPTH_GAP,
  };
}

function openMapNode(node) {
  if (node.missing) {
    if (node.sourcePathString) {
      emit('navigate-path', node.sourcePathString);
    }
    return;
  }

  emit('navigate-scene', node.id);
}

function openMapEdge(edge) {
  if (edge?.pathString) {
    emit('navigate-path', edge.pathString);
  }
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
  width: 100%;
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
.flow-map-section,
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

.section-title-row {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 12px;
}

.flow-map-layout {
  align-items: start;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr) 230px;
}

.flow-map {
  background-color: #1c1d20;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 24px 24px;
  border: 1px solid #333844;
  border-radius: 6px;
  max-height: 660px;
  min-height: 520px;
  overflow: auto;
}

.flow-canvas {
  min-height: 100%;
  position: relative;
}

.flow-edges {
  inset: 0;
  overflow: visible;
  position: absolute;
}

.flow-edge {
  fill: none;
  marker-end: url("#flow-arrow");
  stroke: #62738a;
  stroke-linecap: round;
  stroke-width: 2;
}

.flow-edge.backward {
  stroke-dasharray: 5 5;
}

.flow-edge.broken {
  marker-end: url("#flow-arrow-broken");
  stroke: #d76d6d;
  stroke-dasharray: 6 5;
}

.flow-edge-hit {
  cursor: pointer;
  fill: none;
  pointer-events: stroke;
  stroke: transparent;
  stroke-width: 16;
}

.flow-edge-label {
  cursor: pointer;
  pointer-events: all;
}

.flow-edge-label rect {
  fill: #252a31;
  stroke: #3b4654;
}

.flow-edge-label text {
  fill: #b8c4d2;
  font-size: 11px;
  pointer-events: none;
}

.flow-edge-label.broken rect {
  fill: #3b2323;
  stroke: #744343;
}

.flow-edge-label.broken text {
  fill: #ffd0d0;
}

.flow-edges marker path {
  fill: #62738a;
}

.flow-edges #flow-arrow-broken path {
  fill: #d76d6d;
}

.flow-node {
  background: #292d33;
  border: 1px solid #46505c;
  border-left: 3px solid #6b7d92;
  border-radius: 7px;
  color: #e8e8e8;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  overflow: hidden;
  padding: 10px 12px;
  position: absolute;
  text-align: left;
}

.flow-node:hover {
  border-color: #007acc;
}

.flow-node.entry {
  border-left-color: #60a5fa;
}

.flow-node.unreachable {
  background: #2a2a2a;
  border-color: #464646;
  border-left-color: #888;
  color: #cfcfcf;
}

.flow-node.missing {
  background: #3a2424;
  border-color: #744343;
  border-left-color: #f97373;
}

.flow-node.dead,
.flow-node.cycle {
  border-left-color: #f59e5b;
}

.flow-node.cg {
  border-left-color: #a78bfa;
}

.flow-node.ending {
  border-left-color: #6ee7a8;
}

.flow-node-kicker {
  color: #8ebee8;
  font-size: 10px;
  letter-spacing: 0.08em;
}

.flow-node.missing .flow-node-kicker {
  color: #ffb4b4;
}

.flow-node strong {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-node small {
  color: #9a9a9a;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-node-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 18px;
}

.flow-node-meta i {
  background: rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  color: #bfc7d0;
  font-size: 10px;
  font-style: normal;
  padding: 2px 5px;
}

.flow-status-panel {
  background: #202226;
  border: 1px solid #333844;
  border-radius: 6px;
  padding: 14px;
  position: sticky;
  top: 0;
}

.flow-status-panel h2 {
  margin-bottom: 10px;
}

.status-row {
  align-items: center;
  background: #292d33;
  border: 1px solid #3a414d;
  border-radius: 6px;
  display: grid;
  gap: 9px;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  margin-top: 8px;
  min-height: 50px;
  padding: 8px 9px;
}

.status-dot {
  border-radius: 50%;
  height: 8px;
  width: 8px;
}

.status-main {
  min-width: 0;
}

.status-main strong,
.status-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-main strong {
  color: #ececec;
  font-size: 12px;
}

.status-main small {
  color: #9ca3af;
  font-size: 11px;
  margin-top: 3px;
}

.status-row b {
  color: #d9e4ef;
  font-size: 16px;
}

.status-row.entry .status-dot {
  background: #60a5fa;
}

.status-row.unreachable .status-dot {
  background: #8b8b8b;
}

.status-row.broken .status-dot {
  background: #f97373;
}

.status-row.dead .status-dot,
.status-row.cycle .status-dot {
  background: #f59e5b;
}

.status-row.ending .status-dot {
  background: #6ee7a8;
}

.status-row.cg .status-dot {
  background: #a78bfa;
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

@media (max-width: 980px) {
  .flow-map-layout {
    grid-template-columns: 1fr;
  }

  .flow-status-panel {
    position: static;
  }
}
</style>
