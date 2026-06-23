<template>
  <section
    class="usd-shell"
    data-test="unified-editor-shell"
    tabindex="0"
    @keydown="handleShellKeydown"
    @click="closeContextMenu"
  >
    <header class="usd-toolbar">
      <label>
        <span>Screen</span>
        <select v-model="state.screenId" data-test="usd-screen-selector">
          <option v-for="screen in screens" :key="screen.id" :value="screen.id">
            {{ screen.label }}
          </option>
        </select>
      </label>
      <label>
        <span>Viewport</span>
        <select v-model="state.viewportId" data-test="usd-viewport-selector" @change="applyViewport">
          <option v-for="viewport in viewports" :key="viewport.id" :value="viewport.id">
            {{ viewport.label }}
          </option>
        </select>
      </label>
      <label>
        <span>Zoom</span>
        <select v-model.number="state.zoom" data-test="usd-zoom-selector">
          <option v-for="zoom in zoomLevels" :key="zoom.value" :value="zoom.value">
            {{ zoom.label }}
          </option>
        </select>
      </label>
      <button type="button" data-test="usd-undo" :disabled="!canUndo" @click.stop="undoSynthetic">
        Undo
      </button>
      <button type="button" data-test="usd-redo" :disabled="!canRedo" @click.stop="redoSynthetic">
        Redo
      </button>
      <span class="usd-status" data-test="usd-renderer-status">
        Shared renderer · {{ diagnostics.length }} diagnostics · {{ state.transactions.length }} transactions
      </span>
    </header>

    <div class="usd-workspace">
      <aside class="usd-panel">
        <h2>Palette</h2>
        <ul class="usd-palette" data-test="usd-palette">
          <li v-for="item in palette" :key="item.id">
            <span>{{ item.label }}</span>
            <small>{{ item.family }}</small>
          </li>
        </ul>

        <h2>Hierarchy</h2>
        <ol class="usd-hierarchy" data-test="usd-hierarchy">
          <li
            v-for="node in hierarchy"
            :key="node.id"
            :style="{ '--depth': node.depth }"
            >
            <button
              type="button"
              :aria-selected="node.id === state.selectedNodeId"
              :data-node-id="node.id"
              @click="selectNode(node.id, 'hierarchy')"
              @contextmenu.prevent.stop="openContextMenu($event, node.id)"
            >
              <span>{{ node.id }}</span>
              <small>{{ node.type }}</small>
              <b v-if="summarize(node).advancedKeys.length">Advanced</b>
            </button>
          </li>
        </ol>
      </aside>

      <main class="usd-canvas-column">
        <div ref="canvasFrameRef" class="usd-canvas-frame" :style="canvasFrameStyle" data-test="usd-canvas-frame">
          <div
            ref="canvasRef"
            class="usd-canvas-host"
            data-test="usd-canvas-host"
            @contextmenu.prevent.stop="openContextMenuFromCanvas"
          ></div>
        </div>
      </main>

      <aside class="usd-panel usd-inspector" data-test="usd-inspector">
        <h2>Inspector</h2>
        <template v-if="selectedSummary">
          <dl>
            <div><dt>ID</dt><dd data-test="usd-inspector-id">{{ selectedSummary.id }}</dd></div>
            <div><dt>Type</dt><dd data-test="usd-inspector-type">{{ selectedSummary.type }}</dd></div>
            <div><dt>Style Ref</dt><dd>{{ selectedSummary.styleRef || 'none' }}</dd></div>
            <div><dt>Action</dt><dd data-test="usd-inspector-action">{{ formatJson(selectedSummary.action) }}</dd></div>
            <div><dt>Data</dt><dd data-test="usd-inspector-data">{{ formatJson(selectedSummary.data) }}</dd></div>
            <div><dt>Semantic</dt><dd data-test="usd-inspector-semantic">{{ formatJson(selectedSummary.semantic) }}</dd></div>
          </dl>

          <label class="usd-field">
            <span>Text</span>
            <input
              :value="selectedNode?.content?.text || ''"
              data-test="usd-text-patch"
              @input="patchSelected('content.text', $event.target.value)"
            />
          </label>
          <label class="usd-field">
            <span>Color</span>
            <input
              :value="selectedNode?.style?.color || ''"
              data-test="usd-color-patch"
              @input="patchSelected('style.color', $event.target.value)"
            />
          </label>

          <section class="usd-advanced" data-test="usd-advanced-summary">
            <h3>Advanced</h3>
            <p v-if="!selectedSummary.advancedKeys.length">No unknown fields.</p>
            <ul v-else>
              <li v-for="key in selectedSummary.advancedKeys" :key="key">
                <span>{{ key }}</span>
                <code>{{ formatJson(selectedSummary.advanced[key]) }}</code>
              </li>
            </ul>
          </section>
        </template>
      </aside>
    </div>

    <div
      v-if="contextMenu.visible"
      class="usd-context-menu"
      data-test="usd-context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <button
        v-for="operation in contextMenuOperations"
        :key="operation.id"
        type="button"
        :disabled="!operation.enabled"
        :data-operation-id="operation.id"
        @click="performSyntheticOperation(operation.id)"
      >
        {{ operation.label }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { createUiPreviewHost } from '../../../ui/renderer/createUiRendererHost.js';
import { nudgeLayout } from '../../screen-designer/unifiedEditorGeometry.js';
import {
  UNIFIED_EDITOR_SHELL_DATA,
  UNIFIED_EDITOR_SHELL_PALETTE,
  UNIFIED_EDITOR_SHELL_SCREENS,
  UNIFIED_EDITOR_SHELL_STYLES,
  UNIFIED_EDITOR_SHELL_VIEWPORTS,
  applySyntheticNodeOperation,
  applySyntheticNodePatch,
  buildHierarchy,
  createUnifiedEditorShellState,
  getNodeById,
  getSyntheticNodeOperations,
  summarizeNode,
} from '../../screen-designer/unifiedEditorShellModel.js';

const screens = UNIFIED_EDITOR_SHELL_SCREENS;
const viewports = UNIFIED_EDITOR_SHELL_VIEWPORTS;
const palette = UNIFIED_EDITOR_SHELL_PALETTE;
const zoomLevels = Object.freeze([
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
]);
const state = reactive(createUnifiedEditorShellState());
const canvasRef = ref(null);
const canvasFrameRef = ref(null);
const diagnostics = ref([]);
const contextMenu = reactive({ visible: false, x: 0, y: 0, nodeId: null });
let host = null;

const hierarchy = computed(() => buildHierarchy(state.document));
const selectedNode = computed(() => getNodeById(state.document, state.selectedNodeId));
const selectedSummary = computed(() => summarizeNode(selectedNode.value));
const activeViewport = computed(() => viewports.find(item => item.id === state.viewportId) ?? viewports[0]);
const canUndo = computed(() => state.historyIndex > 0);
const canRedo = computed(() => state.historyIndex < state.history.length - 1);
const contextMenuOperations = computed(() => getSyntheticNodeOperations(state.document, contextMenu.nodeId ?? state.selectedNodeId));
const canvasFrameStyle = computed(() => ({
  aspectRatio: `${activeViewport.value.width} / ${activeViewport.value.height}`,
  width: `min(100%, ${Math.round(980 * state.zoom)}px)`,
}));

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function formatJson(value) {
  if (value == null) return 'none';
  return JSON.stringify(value);
}

function summarize(node) {
  return summarizeNode(node);
}

function syncSelectionChrome() {
  const root = host?.renderer?.root;
  if (!root) return;
  for (const element of root.querySelectorAll('[data-gm-ui-node-id]')) {
    const selected = element.dataset.gmUiNodeId === state.selectedNodeId;
    element.dataset.gmUiEditorSelected = selected ? 'true' : 'false';
  }
}

function renderDocument(operation = 'update') {
  if (!host) return;
  diagnostics.value = [];
  const result = operation === 'mount'
    ? host.mount(state.document)
    : host.update(state.document);
  diagnostics.value = result?.diagnostics ?? [];
  nextTick(syncSelectionChrome);
}

function selectNode(nodeId) {
  if (!getNodeById(state.document, nodeId)) return;
  state.selectedNodeId = nodeId;
  syncSelectionChrome();
}

function commitSyntheticTransaction(operation, nextDocument, selectedNodeId = state.selectedNodeId) {
  if (JSON.stringify(nextDocument) === JSON.stringify(state.document)) return;
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push({ operation, document: clone(nextDocument), selectedNodeId });
  state.history = history;
  state.historyIndex = history.length - 1;
  state.transactions.push({ operation, selectedNodeId });
  state.document = nextDocument;
  state.selectedNodeId = selectedNodeId;
  closeContextMenu();
  renderDocument();
}

function patchSelected(path, value) {
  const nextDocument = applySyntheticNodePatch(state.document, state.selectedNodeId, { path, value });
  state.patches.push({ nodeId: state.selectedNodeId, path, value });
  commitSyntheticTransaction(`patch:${path}`, nextDocument);
}

function performSyntheticOperation(operationId) {
  const operation = contextMenuOperations.value.find(item => item.id === operationId);
  if (!operation?.enabled) return;
  const result = applySyntheticNodeOperation(state.document, contextMenu.nodeId ?? state.selectedNodeId, operationId);
  if (!result.changed) return;
  commitSyntheticTransaction(operationId, result.document, result.selectedNodeId);
}

function undoSynthetic() {
  if (!canUndo.value) return;
  state.historyIndex -= 1;
  const entry = state.history[state.historyIndex];
  state.document = clone(entry.document);
  state.selectedNodeId = entry.selectedNodeId;
  closeContextMenu();
  renderDocument();
}

function redoSynthetic() {
  if (!canRedo.value) return;
  state.historyIndex += 1;
  const entry = state.history[state.historyIndex];
  state.document = clone(entry.document);
  state.selectedNodeId = entry.selectedNodeId;
  closeContextMenu();
  renderDocument();
}

function applyViewport() {
  state.document = {
    ...state.document,
    viewport: { width: activeViewport.value.width, height: activeViewport.value.height },
  };
  renderDocument();
}

function openContextMenu(event, nodeId) {
  selectNode(nodeId);
  contextMenu.visible = true;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.nodeId = nodeId;
}

function openContextMenuFromCanvas(event) {
  const target = event.target?.closest?.('[data-gm-ui-node-id]');
  openContextMenu(event, target?.dataset?.gmUiNodeId ?? state.selectedNodeId);
}

function closeContextMenu() {
  contextMenu.visible = false;
}

function isEditableEventTarget(target) {
  const tag = target?.tagName?.toLowerCase?.();
  return target?.isContentEditable || ['input', 'select', 'textarea'].includes(tag);
}

function nudgeSelectedNode(delta) {
  const node = selectedNode.value;
  if (!node || node.id === state.document.rootId || node.parentId == null) return;
  const nextLayout = nudgeLayout(node.layout, delta);
  const path = delta.x ? 'layout.offset.x' : 'layout.offset.y';
  const value = delta.x ? nextLayout.offset.x : nextLayout.offset.y;
  const nextDocument = applySyntheticNodePatch(state.document, node.id, { path, value });
  commitSyntheticTransaction('nudge', nextDocument, node.id);
}

function handleShellKeydown(event) {
  if (isEditableEventTarget(event.target)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault();
    undoSynthetic();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
    event.preventDefault();
    redoSynthetic();
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    contextMenu.nodeId = state.selectedNodeId;
    performSyntheticOperation('delete');
    return;
  }
  const step = event.shiftKey ? 10 : 1;
  const deltas = {
    ArrowLeft: { x: -step, y: 0 },
    ArrowRight: { x: step, y: 0 },
    ArrowUp: { x: 0, y: -step },
    ArrowDown: { x: 0, y: step },
  };
  if (deltas[event.key]) {
    event.preventDefault();
    nudgeSelectedNode(deltas[event.key]);
  }
}

onMounted(() => {
  host = createUiPreviewHost({
    container: canvasRef.value,
    dataSources: UNIFIED_EDITOR_SHELL_DATA,
    styles: UNIFIED_EDITOR_SHELL_STYLES,
    actions: {
      'start-game': () => {},
    },
    onDiagnostic: item => {
      diagnostics.value = [...diagnostics.value, item];
    },
    onSelectNode: ({ nodeId }) => selectNode(nodeId, 'canvas'),
  });
  renderDocument('mount');
});

watch(() => state.selectedNodeId, syncSelectionChrome);

onBeforeUnmount(() => {
  host?.unmount();
  host = null;
});

defineExpose({ state, getHost: () => host, selectNode, patchSelected, performSyntheticOperation, undoSynthetic, redoSynthetic });
</script>

<style scoped>
.usd-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  color: #e6eaf2;
  background: #181b20;
}

.usd-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 44px;
  padding: 8px 12px;
  border-bottom: 1px solid #303743;
  background: #20242b;
}

.usd-toolbar label,
.usd-field {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: #aeb8c8;
}

.usd-toolbar select,
.usd-field input,
.usd-toolbar button {
  min-height: 28px;
  border: 1px solid #3c4656;
  border-radius: 4px;
  background: #11151b;
  color: #f4f7fb;
}

.usd-toolbar button {
  align-self: end;
  min-width: 64px;
  cursor: pointer;
}

.usd-toolbar button:disabled {
  cursor: default;
  opacity: 0.48;
}

.usd-status {
  margin-left: auto;
  color: #96a8c0;
  font-size: 12px;
}

.usd-workspace {
  display: grid;
  grid-template-columns: 260px minmax(360px, 1fr) 320px;
  min-height: 0;
  flex: 1;
}

.usd-panel {
  min-width: 0;
  padding: 12px;
  border-right: 1px solid #303743;
  background: #1d2229;
  overflow: auto;
}

.usd-inspector {
  border-right: 0;
  border-left: 1px solid #303743;
}

.usd-panel h2 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: #f4f7fb;
}

.usd-palette,
.usd-hierarchy,
.usd-advanced ul {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
}

.usd-palette li,
.usd-hierarchy button,
.usd-advanced li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 30px;
  padding: 6px 8px;
  border: 1px solid #303743;
  border-radius: 4px;
  background: #151a20;
  color: #e6eaf2;
  font: inherit;
  text-align: left;
}

.usd-palette small,
.usd-hierarchy small,
.usd-hierarchy b {
  color: #8fa0b6;
  font-size: 11px;
}

.usd-hierarchy li {
  margin-bottom: 6px;
  padding-left: calc(var(--depth) * 14px);
}

.usd-hierarchy button {
  cursor: pointer;
}

.usd-hierarchy button[aria-selected="true"] {
  border-color: #8db6ff;
  background: #22314a;
}

.usd-canvas-column {
  min-width: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  overflow: auto;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    #101318;
  background-size: 24px 24px;
}

.usd-canvas-frame {
  width: min(100%, 980px);
  max-height: calc(100vh - 150px);
  border: 1px solid #435069;
  background: #11182c;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.34);
}

.usd-context-menu {
  position: fixed;
  z-index: 50;
  display: grid;
  min-width: 150px;
  padding: 5px;
  border: 1px solid #4b5b72;
  border-radius: 4px;
  background: #12171f;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.38);
}

.usd-context-menu button {
  min-height: 28px;
  padding: 5px 8px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #e6eaf2;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.usd-context-menu button:hover:not(:disabled) {
  background: #263449;
}

.usd-context-menu button:disabled {
  color: #6f7d90;
  cursor: default;
}

.usd-canvas-host {
  width: 100%;
  height: 100%;
}

.usd-canvas-host :deep([data-gm-ui-editor-selected="true"]) {
  outline: 2px solid #8db6ff;
  outline-offset: 2px;
}

.usd-inspector dl {
  display: grid;
  gap: 8px;
  margin: 0 0 14px;
}

.usd-inspector dl div {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 8px;
}

.usd-inspector dt {
  color: #91a0b3;
}

.usd-inspector dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.usd-field {
  margin-bottom: 10px;
}

.usd-advanced {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #303743;
}

.usd-advanced h3 {
  margin: 0 0 8px;
  font-size: 12px;
}

.usd-advanced p {
  margin: 0;
  color: #91a0b3;
}

.usd-advanced code {
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c9d8ff;
}
</style>
