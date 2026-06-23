import { validateUiAction } from './uiActionContract.js';
import { normalizeUiLayout, validateUiLayout } from './uiLayoutContract.js';

export const UI_SCREEN_SCHEMA_VERSION = 2;
export const UI_SCREEN_IDS = Object.freeze(['title', 'gameplay', 'gameMenu', 'settings', 'saveLoad', 'backlog', 'gallery']);
export const UI_OVERLAY_IDS = Object.freeze(['textInput', 'confirmation', 'videoControls']);
export const UI_AUTHORITY_STATES = Object.freeze(['legacy-only', 'canonical-active', 'retired']);

export const UI_PRIMITIVE_WIDGETS = Object.freeze({
  panel: {}, stack: {}, grid: {}, text: {}, image: {}, button: {}, spacer: {}, slot: {},
});

export const UI_SEMANTIC_WIDGETS = Object.freeze({
  'dialogue-box': { requiredParts: ['text'] }, nameplate: { requiredParts: ['label'] }, 'choice-list': { requiredParts: ['options'] },
  'quick-action-bar': { requiredParts: ['actions'] }, 'settings-group': { requiredParts: ['controls'] }, 'settings-control': { requiredParts: ['control'] },
  'save-slot-grid': { requiredParts: ['slots', 'pagination'] }, 'backlog-list': { requiredParts: ['entries'] }, 'gallery-grid': { requiredParts: ['items'] },
  'tab-bar': { requiredParts: ['tabs'] }, 'story-viewport': { requiredParts: ['viewport'] },
  'text-input': { requiredParts: ['prompt', 'input', 'confirm', 'cancel', 'validation'] },
  confirmation: { requiredParts: ['title', 'body', 'confirm', 'cancel'] },
  'video-controls': { requiredParts: ['progress', 'playPause', 'skip', 'volume'] },
});

export const UI_BINDING_REGISTRY = Object.freeze([
  'save.slots', 'backlog.entries', 'gallery.items', 'settings.controls', 'choice.options', 'dialogue.current', 'input.value', 'video.state',
]);
export const UI_CONTEXT_KEYS = Object.freeze(['viewport.width', 'viewport.height', 'viewport.aspect', 'input.mode', 'screen.mode', 'player.hasSave', 'runtime.reducedMotion']);
export const UI_PREDICATE_OPERATORS = Object.freeze(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in']);
export const UI_STYLE_SCHEMA = Object.freeze({
  color: 'color', backgroundColor: 'color', opacity: 'number', fontFamily: 'string', fontSize: 'number', fontWeight: 'number',
  borderColor: 'color', borderWidth: 'number', borderRadius: 'number', gap: 'number', letterSpacing: 'number', textShadow: 'string', objectFit: 'string', visible: 'boolean',
});
export const UI_STATE_IDS = Object.freeze(['default', 'hover', 'pressed', 'focused', 'disabled', 'selected']);
export const UI_CAPABILITIES = Object.freeze({
  COMPONENT_INSTANCES: 'component-instances', RESPONSIVE_VARIANTS: 'responsive-variants', CONTEXT_PREDICATES: 'context-predicates', ANIMATION_TRACKS: 'animation-tracks',
});
export const UI_MOTION_PRECEDENCE = Object.freeze(['engine-defaults', 'ui.motion', 'node-tracks', 'runtime-widget-state', 'reduced-motion']);

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
const stableId = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*$/.test(value);
const issue = (severity, code, message, path = [], details = {}) => ({ severity, code, message, path, pathString: path.join('.'), ...details });

export function normalizeUiDocument(document) {
  if (!plain(document)) return document;
  const nodes = Array.isArray(document.nodes) ? document.nodes : [];
  return {
    schemaVersion: UI_SCREEN_SCHEMA_VERSION,
    id: document.id,
    kind: document.kind ?? 'screen',
    authority: document.authority ?? 'canonical-active',
    rootId: document.rootId,
    viewport: plain(document.viewport) ? { width: document.viewport.width ?? 1280, height: document.viewport.height ?? 720 } : { width: 1280, height: 720 },
    nodes: nodes.map((node) => ({
      ...clone(node), id: node?.id, parentId: node?.parentId ?? null,
      order: Number.isInteger(node?.order) ? node.order : 0,
      layout: normalizeUiLayout(node?.layout),
      parts: Array.isArray(node?.parts) ? [...new Set(node.parts)].sort() : [],
    })).sort((a, b) => String(a.parentId ?? '').localeCompare(String(b.parentId ?? '')) || a.order - b.order || String(a.id).localeCompare(String(b.id))),
    ...(plain(document.variants) ? { variants: clone(document.variants) } : {}),
    ...(Array.isArray(document.components) ? { components: clone(document.components) } : {}),
    ...(Array.isArray(document.tracks) ? { tracks: clone(document.tracks) } : {}),
    ...(plain(document.behavior) ? { behavior: clone(document.behavior) } : {}),
  };
}

function validateStyle(style, path, diagnostics) {
  if (!plain(style)) { diagnostics.push(issue('error', 'ui-style-invalid', 'Style must be a typed object.', path)); return; }
  for (const [key, value] of Object.entries(style)) {
    const type = UI_STYLE_SCHEMA[key];
    if (!type) { diagnostics.push(issue('error', 'ui-style-property-unknown', `Style property "${key}" is not allowed.`, [...path, key])); continue; }
    const valid = type === 'number' ? typeof value === 'number' && Number.isFinite(value)
      : type === 'boolean' ? typeof value === 'boolean'
        : type === 'color' ? typeof value === 'string' && /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([^)]*\)|hsla?\([^)]*\))$/i.test(value)
          : typeof value === 'string';
    if (!valid) diagnostics.push(issue('error', 'ui-style-value-invalid', `Style property "${key}" has an invalid ${type} value.`, [...path, key]));
  }
}

function validateAsset(asset, path, diagnostics) {
  if (!plain(asset) || !['image', 'audio', 'font', 'video', 'ui'].includes(asset.kind)) {
    diagnostics.push(issue('error', 'ui-asset-reference-invalid', 'Asset reference requires an allowlisted kind.', path)); return;
  }
  const value = asset.path ?? asset.id;
  if (typeof value !== 'string' || !value.trim() || /^(?:[a-z]+:|\/|\\)|(?:^|[\\/])\.\.(?:[\\/]|$)/i.test(value)) diagnostics.push(issue('error', 'ui-asset-reference-invalid', 'Asset reference must use a safe project-relative path or registry id.', path));
}

function validatePredicate(predicate, path, diagnostics) {
  if (!plain(predicate) || !UI_CONTEXT_KEYS.includes(predicate.key) || !UI_PREDICATE_OPERATORS.includes(predicate.operator)) {
    diagnostics.push(issue('error', 'ui-predicate-invalid', 'Predicate must use a registered context key and bounded operator.', path, { contextKeys: UI_CONTEXT_KEYS, operators: UI_PREDICATE_OPERATORS }));
  }
}

function validateAdvanced(document, path, diagnostics, capabilities) {
  const gate = (field, capability) => {
    if (document[field] !== undefined && !capabilities.has(capability)) diagnostics.push(issue('error', 'ui-capability-unregistered', `${field} requires registered capability "${capability}".`, [...path, field], { capability }));
  };
  gate('components', UI_CAPABILITIES.COMPONENT_INSTANCES);
  gate('variants', UI_CAPABILITIES.RESPONSIVE_VARIANTS);
  gate('tracks', UI_CAPABILITIES.ANIMATION_TRACKS);
  if (capabilities.has(UI_CAPABILITIES.COMPONENT_INSTANCES)) for (const [i, component] of (document.components ?? []).entries()) {
    if (!plain(component) || !stableId(component.id) || !stableId(component.componentId) || !plain(component.props ?? {})) diagnostics.push(issue('error', 'ui-component-instance-invalid', 'Component instances require stable id, componentId, and typed props object.', [...path, 'components', i]));
  }
  if (capabilities.has(UI_CAPABILITIES.RESPONSIVE_VARIANTS)) for (const [id, variant] of Object.entries(document.variants ?? {})) {
    if (!stableId(id) || !plain(variant) || !plain(variant.overrides)) diagnostics.push(issue('error', 'ui-variant-invalid', 'Responsive variants require stable ids and bounded overrides.', [...path, 'variants', id]));
    if (variant?.when) {
      if (!capabilities.has(UI_CAPABILITIES.CONTEXT_PREDICATES)) diagnostics.push(issue('error', 'ui-capability-unregistered', 'Variant predicates require registered context-predicates capability.', [...path, 'variants', id, 'when']));
      else validatePredicate(variant.when, [...path, 'variants', id, 'when'], diagnostics);
    }
  }
  if (capabilities.has(UI_CAPABILITIES.ANIMATION_TRACKS)) for (const [i, track] of (document.tracks ?? []).entries()) {
    if (!plain(track) || !stableId(track.id) || !['opacity', 'offset.x', 'offset.y', 'scale'].includes(track.property) || !['show', 'hide', 'hover', 'pressed', 'selected'].includes(track.trigger) || !(Number.isFinite(track.duration) && track.duration >= 0 && track.duration <= 10000) || !['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(track.easing)) diagnostics.push(issue('error', 'ui-animation-track-invalid', 'Animation track contains an unsupported property, trigger, duration, or easing.', [...path, 'tracks', i]));
  }
}

export function validateUiDocument(document, { path = [], screenId, kind = 'screen', capabilities = [] } = {}) {
  const diagnostics = [];
  if (!plain(document)) return [issue('error', 'ui-document-invalid', 'Canonical UI document must be an object.', path)];
  if (document.schemaVersion !== UI_SCREEN_SCHEMA_VERSION) diagnostics.push(issue('error', 'ui-schema-version-invalid', `schemaVersion must be ${UI_SCREEN_SCHEMA_VERSION}.`, [...path, 'schemaVersion']));
  if (document.id !== screenId) diagnostics.push(issue('error', 'ui-document-id-mismatch', `Document id must match registry key "${screenId}".`, [...path, 'id']));
  if (document.kind !== kind) diagnostics.push(issue('error', 'ui-document-kind-invalid', `Document kind must be "${kind}".`, [...path, 'kind']));
  if (document.authority !== 'canonical-active') diagnostics.push(issue('error', 'ui-authority-invalid', 'Persisted canonical documents must declare canonical-active authority.', [...path, 'authority']));
  if (!Array.isArray(document.nodes)) return [...diagnostics, issue('error', 'ui-nodes-invalid', 'Document nodes must be an ordered array.', [...path, 'nodes'])];
  const byId = new Map();
  for (const [index, node] of document.nodes.entries()) {
    const nodePath = [...path, 'nodes', index];
    if (!plain(node) || !stableId(node.id)) { diagnostics.push(issue('error', 'ui-node-id-invalid', 'Node id must be stable and position-independent.', [...nodePath, 'id'])); continue; }
    if (byId.has(node.id)) diagnostics.push(issue('error', 'ui-node-id-duplicate', `Duplicate node id "${node.id}".`, [...nodePath, 'id']));
    else byId.set(node.id, node);
    if (!Number.isInteger(node.order) || node.order < 0) diagnostics.push(issue('error', 'ui-node-order-invalid', 'Node order must be a non-negative integer.', [...nodePath, 'order']));
    if (!(node.type in UI_PRIMITIVE_WIDGETS) && !(node.type in UI_SEMANTIC_WIDGETS)) diagnostics.push(issue('error', 'ui-widget-type-unknown', `Unknown widget type "${node.type}".`, [...nodePath, 'type']));
    diagnostics.push(...validateUiLayout(node.layout, [...nodePath, 'layout']));
    if (node.style !== undefined) validateStyle(node.style, [...nodePath, 'style'], diagnostics);
    if (node.states !== undefined) {
      if (!plain(node.states)) diagnostics.push(issue('error', 'ui-states-invalid', 'States must be an object map.', [...nodePath, 'states']));
      else for (const [state, style] of Object.entries(node.states)) {
        if (!UI_STATE_IDS.includes(state)) diagnostics.push(issue('error', 'ui-state-unknown', `Unknown state "${state}".`, [...nodePath, 'states', state]));
        else validateStyle(style, [...nodePath, 'states', state], diagnostics);
      }
    }
    if (node.action !== undefined) diagnostics.push(...validateUiAction(node.action, { path: [...nodePath, 'action'] }));
    if (node.binding !== undefined && (!plain(node.binding) || !UI_BINDING_REGISTRY.includes(node.binding.source))) diagnostics.push(issue('error', 'ui-binding-unknown', 'Binding must use a registered semantic data source.', [...nodePath, 'binding'], { allowedValues: UI_BINDING_REGISTRY }));
    if (node.asset !== undefined) validateAsset(node.asset, [...nodePath, 'asset'], diagnostics);
    const semantic = UI_SEMANTIC_WIDGETS[node.type];
    if (semantic) for (const part of semantic.requiredParts) if (!Array.isArray(node.parts) || !node.parts.includes(part)) diagnostics.push(issue('error', 'ui-required-part-missing', `Protected widget ${node.type} requires part "${part}".`, [...nodePath, 'parts'], { part }));
  }
  if (!byId.has(document.rootId)) diagnostics.push(issue('error', 'ui-root-missing', `rootId "${document.rootId ?? ''}" does not identify a node.`, [...path, 'rootId']));
  for (const [id, node] of byId) if (id !== document.rootId && !byId.has(node.parentId)) diagnostics.push(issue('error', 'ui-node-parent-missing', `Node "${id}" has missing parent "${node.parentId}".`, [...path, 'nodes', document.nodes.indexOf(node), 'parentId']));
  if (byId.has(document.rootId) && byId.get(document.rootId).parentId != null) diagnostics.push(issue('error', 'ui-root-parent-invalid', 'Root node cannot have a parent.', [...path, 'rootId']));
  for (const id of byId.keys()) {
    const seen = new Set(); let current = id;
    while (current != null && byId.has(current)) {
      if (seen.has(current)) { diagnostics.push(issue('error', 'ui-hierarchy-cycle', `Hierarchy cycle includes node "${current}".`, [...path, 'nodes'])); break; }
      seen.add(current); current = byId.get(current).parentId;
    }
    if (id !== document.rootId && !seen.has(document.rootId)) diagnostics.push(issue('error', 'ui-node-unreachable', `Node "${id}" is unreachable from root.`, [...path, 'nodes', document.nodes.indexOf(byId.get(id))]));
  }
  validateAdvanced(document, path, diagnostics, new Set(capabilities));
  return diagnostics;
}

export function validateUiProjectContract(script, options = {}) {
  const diagnostics = [];
  const ui = script?.ui;
  if (ui?.screenSchemaVersion !== undefined && ui.screenSchemaVersion !== UI_SCREEN_SCHEMA_VERSION) diagnostics.push(issue('error', 'ui-schema-version-invalid', `ui.screenSchemaVersion must be ${UI_SCREEN_SCHEMA_VERSION}.`, ['ui', 'screenSchemaVersion']));
  const registries = [['screens', UI_SCREEN_IDS, 'screen'], ['overlays', UI_OVERLAY_IDS, 'overlay']];
  for (const [key, ids, kind] of registries) {
    const registry = ui?.[key];
    if (registry === undefined) continue;
    if (!plain(registry)) { diagnostics.push(issue('error', 'ui-registry-invalid', `ui.${key} must be an object map.`, ['ui', key])); continue; }
    for (const [id, document] of Object.entries(registry)) {
      if (!ids.includes(id)) diagnostics.push(issue('error', 'ui-registry-key-unknown', `Unknown ${kind} id "${id}".`, ['ui', key, id]));
      else diagnostics.push(...validateUiDocument(document, { path: ['ui', key, id], screenId: id, kind, capabilities: options.capabilities }));
    }
  }
  for (const id of UI_SCREEN_IDS) {
    const authority = ui?.screenAuthorities?.[id] ?? (ui?.screens?.[id] ? 'canonical-active' : 'legacy-only');
    if (!UI_AUTHORITY_STATES.includes(authority)) diagnostics.push(issue('error', 'ui-authority-invalid', `Unknown authority state "${authority}".`, ['ui', 'screenAuthorities', id]));
    if (authority === 'legacy-only' && ui?.screens?.[id]) diagnostics.push(issue('error', 'ui-authority-conflict', `${id} cannot be legacy-only while a canonical document is active.`, ['ui', 'screenAuthorities', id]));
    if (authority === 'canonical-active' && !ui?.screens?.[id]) diagnostics.push(issue('error', 'ui-authority-document-missing', `${id} is canonical-active but has no canonical document.`, ['ui', 'screens', id]));
  }
  return diagnostics;
}

export function listUiDocumentSchema() {
  return clone({ schemaVersion: UI_SCREEN_SCHEMA_VERSION, screens: UI_SCREEN_IDS, overlays: UI_OVERLAY_IDS, authorities: UI_AUTHORITY_STATES, primitives: Object.keys(UI_PRIMITIVE_WIDGETS), semanticWidgets: UI_SEMANTIC_WIDGETS, bindings: UI_BINDING_REGISTRY, states: UI_STATE_IDS, contextKeys: UI_CONTEXT_KEYS, predicateOperators: UI_PREDICATE_OPERATORS, capabilities: UI_CAPABILITIES, motionPrecedence: UI_MOTION_PRECEDENCE });
}
