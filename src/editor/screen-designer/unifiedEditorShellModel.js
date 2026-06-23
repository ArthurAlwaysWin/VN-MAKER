import { UI_RENDERER_FIXTURE_DATA, UI_RENDERER_FIXTURE_STYLES } from '../../ui/renderer/uiRendererFixtures.js';
import { normalizeUiDocument } from '../../shared/uiDocumentContract.js';
import { normalizeUiLayout } from '../../shared/uiLayoutContract.js';

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const layout = overrides => normalizeUiLayout(overrides);
const SYNTHETIC_PATCH_PATHS = Object.freeze(new Set([
  'content.text',
  'style.color',
  'layout.anchor.minX',
  'layout.anchor.minY',
  'layout.anchor.maxX',
  'layout.anchor.maxY',
  'layout.pivot.x',
  'layout.pivot.y',
  'layout.offset.x',
  'layout.offset.y',
  'layout.size.width',
  'layout.size.height',
  'asset.path',
  'style.backgroundColor',
  'style.fontFamily',
  'style.fontSize',
  'style.borderColor',
  'style.borderWidth',
  'style.borderRadius',
  'style.opacity',
  'style.letterSpacing',
  'style.textShadow',
]));

export const UNIFIED_EDITOR_SHELL_SCREENS = Object.freeze([
  { id: 'synthetic.title', label: 'Synthetic Title', source: 'fixture' },
]);

export const UNIFIED_EDITOR_SHELL_VIEWPORTS = Object.freeze([
  { id: '1280x720', label: '1280 x 720', width: 1280, height: 720 },
  { id: '1440x900', label: '1440 x 900', width: 1440, height: 900 },
  { id: '720x1280', label: '720 x 1280', width: 720, height: 1280 },
]);

export const UNIFIED_EDITOR_SHELL_PALETTE = Object.freeze([
  { id: 'panel', label: 'Panel', family: 'primitive' },
  { id: 'text', label: 'Text', family: 'primitive' },
  { id: 'button', label: 'Button', family: 'primitive' },
  { id: 'save-slot-grid', label: 'Save Slot Grid', family: 'semantic' },
]);

export const UNIFIED_EDITOR_SHELL_DATA = UI_RENDERER_FIXTURE_DATA;
export const UNIFIED_EDITOR_SHELL_STYLES = UI_RENDERER_FIXTURE_STYLES;

export function createUnifiedEditorShellFixture() {
  return normalizeUiDocument({
    schemaVersion: 2,
    id: 'title',
    kind: 'screen',
    authority: 'canonical-active',
    rootId: 'title.root',
    viewport: { width: 1280, height: 720 },
    nodes: [
      {
        id: 'title.root',
        type: 'panel',
        parentId: null,
        order: 0,
        layout: layout(),
        parts: [],
        styleRef: 'panels.fixture',
        content: { role: 'fixture-root', label: 'Synthetic title root' },
        advanced: { source: 'agent-fixture', preserved: true },
      },
      {
        id: 'title.heading',
        type: 'text',
        parentId: 'title.root',
        order: 0,
        layout: layout({
          anchor: { minX: 0.5, maxX: 0.5, minY: 0.16, maxY: 0.16 },
          size: { width: 560, height: 80 },
        }),
        parts: [],
        content: { text: 'Unified Editor Shell', advancedLabel: 'Agent-authored heading' },
        style: { color: '#ffffff', fontSize: 34, fontWeight: 700 },
        agentMetadata: { recipeId: 'phase-4a-synthetic', locked: false },
      },
      {
        id: 'title.menu',
        type: 'stack',
        parentId: 'title.root',
        order: 1,
        layout: layout({
          anchor: { minX: 0.5, maxX: 0.5, minY: 0.42, maxY: 0.42 },
          size: { width: 320, height: 180 },
        }),
        parts: [],
        style: { gap: 12 },
        unknownFutureConfig: { responsiveRecipe: 'center-column' },
      },
      {
        id: 'title.start',
        type: 'button',
        parentId: 'title.menu',
        order: 0,
        layout: layout({
          anchor: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
          pivot: { x: 0, y: 0 },
          offset: { x: 20, y: 0 },
          size: { width: 280, height: 56 },
        }),
        parts: [],
        content: { text: 'Start diagnostic', accessibleName: 'Start diagnostic action' },
        styleRef: 'buttons.primary',
        states: { selected: { borderColor: '#ffffff', borderWidth: 2 } },
        action: { type: 'start-game' },
      },
      {
        id: 'title.persist',
        type: 'button',
        parentId: 'title.menu',
        order: 1,
        layout: layout({
          anchor: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
          pivot: { x: 0, y: 0 },
          offset: { x: 20, y: 72 },
          size: { width: 280, height: 56 },
        }),
        parts: [],
        content: { text: 'Persistent action probe', accessibleName: 'Persistent preview action probe' },
        styleRef: 'buttons.primary',
        action: { type: 'delete-slot', params: { slot: '1' } },
        advanced: { destructivePreviewPolicy: 'diagnostic-only' },
      },
      {
        id: 'title.slots',
        type: 'save-slot-grid',
        parentId: 'title.root',
        order: 2,
        layout: layout({
          anchor: { minX: 0.5, maxX: 0.5, minY: 0.74, maxY: 0.74 },
          size: { width: 420, height: 100 },
        }),
        parts: ['slots', 'pagination'],
        content: { accessibleName: 'Deterministic save slot fixture', label: 'Save slots' },
        binding: { source: 'save.slots' },
        semanticInfo: { protectedParts: ['slots', 'pagination'] },
      },
    ],
  });
}

export function createUnifiedEditorShellState() {
  const document = createUnifiedEditorShellFixture();
  return {
    screenId: UNIFIED_EDITOR_SHELL_SCREENS[0].id,
    viewportId: UNIFIED_EDITOR_SHELL_VIEWPORTS[0].id,
    zoom: 1,
    selectedNodeId: document.rootId,
    document,
    patches: [],
    history: [{ operation: 'initial', document: clone(document), selectedNodeId: document.rootId }],
    historyIndex: 0,
    transactions: [],
  };
}

export function createUnifiedEditorShellStateFromDocument(document, { screenId = 'title' } = {}) {
  const normalized = normalizeUiDocument(document);
  return {
    screenId,
    viewportId: UNIFIED_EDITOR_SHELL_VIEWPORTS[0].id,
    zoom: 1,
    selectedNodeId: normalized.rootId,
    document: normalized,
    patches: [],
    history: [{ operation: 'initial', document: clone(normalized), selectedNodeId: normalized.rootId }],
    historyIndex: 0,
    transactions: [],
  };
}

export function getNodeById(document, nodeId) {
  return document?.nodes?.find(node => node.id === nodeId) ?? null;
}

export function buildHierarchy(document) {
  const nodes = document?.nodes ?? [];
  const childrenByParent = new Map();
  for (const node of nodes) {
    const key = node.parentId ?? null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(node);
  }
  for (const children of childrenByParent.values()) {
    children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)));
  }
  const visit = (node, depth = 0) => [
    { ...node, depth, children: childrenByParent.get(node.id) ?? [] },
    ...(childrenByParent.get(node.id) ?? []).flatMap(child => visit(child, depth + 1)),
  ];
  const root = nodes.find(node => node.id === document?.rootId) ?? nodes.find(node => node.parentId == null);
  return root ? visit(root) : [];
}

export function summarizeNode(node) {
  if (!node) return null;
  const known = new Set([
    'id', 'type', 'parentId', 'order', 'layout', 'parts', 'styleRef', 'style',
    'states', 'content', 'asset', 'action', 'binding',
  ]);
  const advancedKeys = Object.keys(node).filter(key => !known.has(key));
  return {
    id: node.id,
    type: node.type,
    layout: clone(node.layout),
    style: clone(node.style ?? {}),
    styleRef: node.styleRef ?? null,
    action: clone(node.action ?? null),
    data: clone(node.binding ?? null),
    semantic: {
      parts: clone(node.parts ?? []),
      info: clone(node.semanticInfo ?? null),
    },
    advancedKeys,
    advanced: Object.fromEntries(advancedKeys.map(key => [key, clone(node[key])])),
  };
}

function setByPath(target, path, value) {
  const parts = String(path).split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor[part] ??= {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

export function applySyntheticNodePatch(document, nodeId, patch) {
  if (!SYNTHETIC_PATCH_PATHS.has(patch?.path)) {
    throw new Error(`Unsupported Phase 4b synthetic patch path: ${patch?.path ?? ''}`);
  }
  const next = clone(document);
  const node = next.nodes.find(item => item.id === nodeId);
  if (!node) throw new Error(`Cannot patch missing synthetic node: ${nodeId}`);
  if (patch.path === 'content.text') {
    node.content ??= {};
    node.content.text = String(patch.value ?? '');
  } else if (patch.path === 'asset.path') {
    node.asset ??= { kind: node.type === 'image' ? 'image' : 'image' };
    node.asset.path = String(patch.value ?? '');
  } else if (patch.path === 'style.color') {
    node.style ??= {};
    node.style.color = String(patch.value ?? '');
  } else if (patch.path.startsWith('style.')) {
    node.style ??= {};
    const property = patch.path.slice('style.'.length);
    node.style[property] = typeof patch.value === 'number' ? patch.value : String(patch.value ?? '');
  } else {
    setByPath(node, patch.path, Number(patch.value));
    node.layout = normalizeUiLayout(node.layout);
  }
  return normalizeUiDocument(next);
}

function nextSyntheticId(document, baseId) {
  const ids = new Set((document?.nodes ?? []).map(node => node.id));
  let candidate = baseId;
  let index = 2;
  while (ids.has(candidate)) {
    candidate = `${baseId}.${index}`;
    index += 1;
  }
  return candidate;
}

function childNodes(document, parentId) {
  return (document?.nodes ?? [])
    .filter(node => node.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)));
}

function collectSubtree(document, rootId) {
  const byParent = new Map();
  for (const node of document?.nodes ?? []) {
    if (!byParent.has(node.parentId)) byParent.set(node.parentId, []);
    byParent.get(node.parentId).push(node);
  }
  const result = [];
  const visit = nodeId => {
    const node = getNodeById(document, nodeId);
    if (!node) return;
    result.push(node);
    for (const child of byParent.get(nodeId) ?? []) visit(child.id);
  };
  visit(rootId);
  return result;
}

function renumberSiblings(nodes, parentId) {
  const siblings = nodes
    .filter(node => node.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)));
  siblings.forEach((node, index) => { node.order = index; });
}

export function getSyntheticNodeOperations(document, nodeId) {
  const node = getNodeById(document, nodeId);
  if (!node) return [];
  const isRoot = node.id === document.rootId || node.parentId == null;
  const siblings = childNodes(document, node.parentId);
  const siblingIndex = siblings.findIndex(item => item.id === node.id);
  return [
    { id: 'duplicate', label: 'Duplicate', enabled: !isRoot },
    { id: 'delete', label: 'Delete', enabled: !isRoot },
    { id: 'move-up', label: 'Move Up', enabled: !isRoot && siblingIndex > 0 },
    { id: 'move-down', label: 'Move Down', enabled: !isRoot && siblingIndex >= 0 && siblingIndex < siblings.length - 1 },
    { id: 'wrap', label: 'Wrap In Stack', enabled: !isRoot },
    { id: 'reset-overrides', label: 'Reset Overrides', enabled: Boolean(node.style || node.states) },
  ];
}

function duplicateSyntheticNode(document, nodeId) {
  const next = clone(document);
  const source = next.nodes.find(node => node.id === nodeId);
  if (!source || source.id === next.rootId || source.parentId == null) return { document: next, selectedNodeId: nodeId, changed: false };
  const subtree = collectSubtree(next, nodeId);
  const idMap = new Map();
  for (const node of subtree) idMap.set(node.id, nextSyntheticId({ nodes: [...next.nodes, ...[...idMap.values()].map(id => ({ id }))] }, `${node.id}.copy`));
  for (const sibling of next.nodes) {
    if (sibling.parentId === source.parentId && (sibling.order ?? 0) > (source.order ?? 0)) sibling.order += 1;
  }
  const copies = subtree.map(node => ({
    ...clone(node),
    id: idMap.get(node.id),
    parentId: node.id === source.id ? source.parentId : idMap.get(node.parentId),
    order: node.id === source.id ? (source.order ?? 0) + 1 : node.order,
  }));
  next.nodes.push(...copies);
  renumberSiblings(next.nodes, source.parentId);
  return { document: normalizeUiDocument(next), selectedNodeId: idMap.get(source.id), changed: true };
}

function deleteSyntheticNode(document, nodeId) {
  const target = getNodeById(document, nodeId);
  if (!target || target.id === document.rootId || target.parentId == null) return { document, selectedNodeId: nodeId, changed: false };
  const ids = new Set(collectSubtree(document, nodeId).map(node => node.id));
  const next = clone(document);
  next.nodes = next.nodes.filter(node => !ids.has(node.id));
  renumberSiblings(next.nodes, target.parentId);
  const fallback = childNodes(next, target.parentId)[0]?.id ?? target.parentId ?? next.rootId;
  return { document: normalizeUiDocument(next), selectedNodeId: fallback, changed: true };
}

function moveSyntheticNode(document, nodeId, direction) {
  const target = getNodeById(document, nodeId);
  if (!target || target.id === document.rootId || target.parentId == null) return { document, selectedNodeId: nodeId, changed: false };
  const next = clone(document);
  const siblings = childNodes(next, target.parentId);
  const from = siblings.findIndex(node => node.id === nodeId);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= siblings.length) return { document, selectedNodeId: nodeId, changed: false };
  [siblings[from].order, siblings[to].order] = [siblings[to].order, siblings[from].order];
  renumberSiblings(next.nodes, target.parentId);
  return { document: normalizeUiDocument(next), selectedNodeId: nodeId, changed: true };
}

function wrapSyntheticNode(document, nodeId) {
  const target = getNodeById(document, nodeId);
  if (!target || target.id === document.rootId || target.parentId == null) return { document, selectedNodeId: nodeId, changed: false };
  const next = clone(document);
  const node = next.nodes.find(item => item.id === nodeId);
  const wrapperId = nextSyntheticId(next, `${node.id}.group`);
  const wrapper = {
    id: wrapperId,
    type: 'stack',
    parentId: node.parentId,
    order: node.order ?? 0,
    layout: clone(node.layout),
    parts: [],
    style: { gap: 8 },
    content: { label: 'Synthetic group' },
  };
  for (const sibling of next.nodes) {
    if (sibling.parentId === node.parentId && (sibling.order ?? 0) >= (node.order ?? 0)) sibling.order += 1;
  }
  node.parentId = wrapperId;
  node.order = 0;
  next.nodes.push(wrapper);
  renumberSiblings(next.nodes, wrapper.parentId);
  return { document: normalizeUiDocument(next), selectedNodeId: wrapperId, changed: true };
}

function resetSyntheticOverrides(document, nodeId) {
  const next = clone(document);
  const node = next.nodes.find(item => item.id === nodeId);
  if (!node || (!node.style && !node.states)) return { document, selectedNodeId: nodeId, changed: false };
  delete node.style;
  delete node.states;
  return { document: normalizeUiDocument(next), selectedNodeId: nodeId, changed: true };
}

export function applySyntheticNodeOperation(document, nodeId, operationId) {
  if (operationId === 'duplicate') return duplicateSyntheticNode(document, nodeId);
  if (operationId === 'delete') return deleteSyntheticNode(document, nodeId);
  if (operationId === 'move-up') return moveSyntheticNode(document, nodeId, 'up');
  if (operationId === 'move-down') return moveSyntheticNode(document, nodeId, 'down');
  if (operationId === 'wrap') return wrapSyntheticNode(document, nodeId);
  if (operationId === 'reset-overrides') return resetSyntheticOverrides(document, nodeId);
  throw new Error(`Unsupported Phase 4b synthetic operation: ${operationId ?? ''}`);
}
