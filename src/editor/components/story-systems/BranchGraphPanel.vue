<template>
  <div class="graph-panel">
    <header class="graph-header">
      <div>
        <p class="eyebrow">Branch Flow</p>
        <h1>剧情流程审查</h1>
        <p class="copy">检查可达性、终点结局解锁、封闭循环和 CG 解锁路径。</p>
      </div>
      <div class="stats">
        <span>{{ report.nodeCount }} 场景</span>
        <span>{{ report.edgeCount }} 连接</span>
        <span :class="{ warn: report.deadEndSceneIds.length }">{{ report.deadEndSceneIds.length }} 死路</span>
        <span :class="{ warn: report.cyclesWithoutExit.length }">{{ report.cyclesWithoutExit.length }} 封闭循环</span>
      </div>
    </header>

    <section v-if="issues.length" class="issues">
      <h2>需要检查</h2>
      <button
        v-for="issue in issues"
        :key="issue.key"
        type="button"
        class="issue"
        @click="$emit('navigate-scene', issue.sceneId)"
      >
        <strong>{{ issue.label }}</strong>
        <span>{{ issue.text }}</span>
      </button>
    </section>
    <section v-else class="clean">
      当前流程没有不可达场景、未收束终点或无出口循环。
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
          <i v-if="!node.reachable" class="badge muted">不可达</i>
          <i v-if="node.deadEnd" class="badge warn">死路</i>
          <i v-if="node.cycleWithoutExit" class="badge warn">循环</i>
          <i v-if="node.endingResolved" class="badge good">结局</i>
          <i v-if="node.unlocksCg" class="badge good">CG</i>
        </span>
        <span class="edge-count">{{ node.outgoingEdgeCount }} outgoing</span>
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
import { createBranchGraphMermaid, createBranchGraphReport } from '../../../shared/sceneGraph.js';

const props = defineProps({
  scriptData: {
    type: Object,
    required: true,
  },
});

defineEmits(['navigate-scene']);

const report = computed(() => createBranchGraphReport(props.scriptData));
const mermaid = computed(() => createBranchGraphMermaid(report.value));
const issues = computed(() => [
  ...report.value.unreachableSceneIds.map((sceneId) => ({
    key: `unreachable:${sceneId}`,
    sceneId,
    label: '不可达场景',
    text: sceneId,
  })),
  ...report.value.deadEndSceneIds.map((sceneId) => ({
    key: `dead-end:${sceneId}`,
    sceneId,
    label: '没有结局解锁的终点',
    text: sceneId,
  })),
  ...report.value.cyclesWithoutExit.map((cycle) => ({
    key: `cycle:${cycle.sceneIds.join(':')}`,
    sceneId: cycle.sceneIds[0],
    label: '无出口循环',
    text: cycle.sceneIds.join(' -> '),
  })),
]);
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
.mermaid,
.clean {
  background: #252526;
  border: 1px solid #333;
  border-radius: 8px;
  margin-top: 16px;
  padding: 18px;
}

.issue,
.node {
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
.node:hover {
  border-color: #007acc;
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
